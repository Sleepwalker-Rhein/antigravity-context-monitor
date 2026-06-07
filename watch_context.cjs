const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { exec } = require('child_process');

// 1. Single Instance Lock via Port Binding
const PORT = 58120;
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(0);
  }
});
server.listen(PORT);

const brainPath = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const isZh = systemLocale.startsWith('zh');

const targetArg = process.argv[2];
const projectWorkspace = targetArg 
  ? path.resolve(targetArg) 
  : (fs.existsSync(path.resolve(__dirname, '..')) ? path.resolve(__dirname, '..') : process.cwd());

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let currentChatId = null;
let watcher = null;
let brainWatcher = null;
let debounceTimeout = null;

let state = {
  yellowTriggered: false,
  redTriggered: false,
  compressionTriggered: false
};

const translations = {
  zh: {
    yellowTitle: '🟡 Antigravity 会话过长',
    yellowMsg: (rounds) => `当前对话已达 ${rounds} 轮。上下文体积增加，AI 推理及规划精度可能下降。`,
    redTitle: '🔴 Antigravity 上下文警告',
    redMsg: (rounds) => `当前对话已达 ${rounds} 轮。AI 记忆精度严重下降，建议开启新对话！`,
    compTitle: '🟡 Antigravity 记忆已压缩',
    compMsg: '检测到历史会话已被自动压缩。部分前期细节与代码片段已丢失！'
  },
  en: {
    yellowTitle: '🟡 Antigravity Chat Getting Long',
    yellowMsg: (rounds) => `Current chat has reached ${rounds} rounds. Increased context size may degrade AI reasoning accuracy.`,
    redTitle: '🔴 Antigravity Context Warning',
    redMsg: (rounds) => `Current chat has reached ${rounds} rounds. AI memory accuracy is significantly degraded; starting a new chat is highly recommended!`,
    compTitle: '🟡 Antigravity Memory Compressed',
    compMsg: 'Conversation history has been compressed automatically. Early details and code snippets are now lost!'
  }
};

const t = isZh ? translations.zh : translations.en;

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function showNotification(title, message) {
  const escapedTitle = escapeXml(title);
  const escapedMessage = escapeXml(message);
  const appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';
  
  // 核心修复：替换为通过程序集动态反射加载的 Toast 发送逻辑，杜绝 RPC 报错
  const psCommand = `
    $xmlType = [System.Type]::GetType('Windows.Data.Xml.Dom.XmlDocument, Windows, ContentType=WindowsRuntime');
    $toastType = [System.Type]::GetType('Windows.UI.Notifications.ToastNotification, Windows, ContentType=WindowsRuntime');
    $managerType = [System.Type]::GetType('Windows.UI.Notifications.ToastNotificationManager, Windows, ContentType=WindowsRuntime');
    $xml = [Activator]::CreateInstance($xmlType);
    $xml.LoadXml('<toast activationType=''none''><visual><binding template=''ToastGeneric''><text>${escapedTitle}</text><text>${escapedMessage}</text></binding></visual></toast>');
    $toast = [Activator]::CreateInstance($toastType, $xml);
    $notifier = $managerType::CreateToastNotifier('${appId}');
    $notifier.Show($toast);
  `.replace(/\r?\n/g, ' ').trim();
  
  exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('[Notification Error]:', stderr || error.message);
    }
  });
}

function getLatestConversationDir() {
  try {
    if (!fs.existsSync(brainPath)) return null;
    const dirs = fs.readdirSync(brainPath)
      .map(name => {
        const fullPath = path.join(brainPath, name);
        try {
          const stats = fs.statSync(fullPath);
          return { name, fullPath, isDirectory: stats.isDirectory(), mtime: stats.mtimeMs };
        } catch (e) {
          return null;
        }
      })
      .filter(d => d && d.isDirectory && uuidRegex.test(d.name));

    if (dirs.length === 0) return null;
    dirs.sort((a, b) => b.mtime - a.mtime);
    return dirs[0];
  } catch (err) {
    return null;
  }
}

function isTargetProjectLog(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    
    const normalizedWorkspace = projectWorkspace.replace(/\\/g, '/').toLowerCase();
    const normalizedContent = content.replace(/\\\\/g, '/').replace(/\\/g, '/').toLowerCase();
    
    return normalizedContent.includes(normalizedWorkspace);
  } catch (e) {
    return false;
  }
}

function analyzeLogFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  if (!isTargetProjectLog(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    let userInputCount = 0;
    let hasCompression = false;

    for (const line of lines) {
      if (line.includes('"type":"USER_INPUT"')) {
        userInputCount++;
      }
      if (line.includes('"type":"COMPRESSION"') || 
          line.toLowerCase().includes('"compression"') || 
          line.toLowerCase().includes('"summarized_history"')) {
        hasCompression = true;
      }
    }

    console.log(`[${new Date().toLocaleTimeString()}] [Watcher] Rounds: ${userInputCount} | Compressed: ${hasCompression}`);

    if (userInputCount >= 24) {
      if (!state.redTriggered) {
        showNotification(t.redTitle, t.redMsg(userInputCount));
        state.redTriggered = true;
      }
    } else if (hasCompression) {
      if (!state.compressionTriggered) {
        showNotification(t.compTitle, t.compMsg);
        state.compressionTriggered = true;
      }
    } else if (userInputCount >= 12) {
      if (!state.yellowTriggered) {
        showNotification(t.yellowTitle, t.yellowMsg(userInputCount));
        state.yellowTriggered = true;
      }
    }
  } catch (err) {
    console.error('Error reading log file:', err);
  }
}

function queueAnalysis(filePath) {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    analyzeLogFile(filePath);
  }, 200);
}

function startWatching() {
  const latest = getLatestConversationDir();
  if (!latest) return;

  const logDir = path.join(latest.fullPath, '.system_generated', 'logs');
  const logFile = path.join(logDir, 'transcript.jsonl');

  if (currentChatId !== latest.name) {
    if (watcher) {
      try { watcher.close(); } catch(e) {}
      watcher = null;
    }
    currentChatId = latest.name;
    state = {
      yellowTriggered: false,
      redTriggered: false,
      compressionTriggered: false
    };

    if (fs.existsSync(logFile) && isTargetProjectLog(logFile)) {
      console.log(`[Started] Tracking Project Conversation: ${currentChatId}`);
      queueAnalysis(logFile);
    }
  }

  if (fs.existsSync(logFile) && !watcher) {
    try {
      watcher = fs.watch(logFile, (eventType) => {
        if (eventType === 'change') {
          queueAnalysis(logFile);
        }
      });
    } catch (e) {
      watcher = null;
    }
  }
}

if (fs.existsSync(brainPath)) {
  try {
    brainWatcher = fs.watch(brainPath, { recursive: true }, (eventType, filename) => {
      startWatching();
    });
    console.log(`[Event-Driven] Watching brain folder...`);
  } catch (e) {
    console.error('Failed to setup directory watch, falling back to basic check.');
  }
}

setInterval(startWatching, 30000);

startWatching();
console.log('====================================================');
console.log(`Antigravity Context Watcher Running [Locale: ${systemLocale}]`);
console.log(`Target Project Path: ${projectWorkspace}`);
console.log('====================================================');
