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

// Dynamically determine the target project workspace:
// 1. Command line argument: node watch_context.cjs "C:/path/to/project"
// 2. Default to parent directory of this script (assuming it sits in a subfolder like 'scratch')
// 3. Fallback to current working directory
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
  
  const psCommand = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null;
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument;
    $xml.LoadXml('<toast activationType=''none''><visual><binding template=''ToastGeneric''><text>${escapedTitle}</text><text>${escapedMessage}</text></binding></visual></toast>');
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml;
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${appId}').Show($toast);
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

    if (userInputCount >= 20) {
      if (!state.redTriggered) {
        showNotification('🔴 Antigravity 上下文警告', `当前对话已达 ${userInputCount} 轮。AI 记忆精度严重下降，建议开启新对话！`);
        state.redTriggered = true;
      }
    } else if (hasCompression) {
      if (!state.compressionTriggered) {
        showNotification('🟡 Antigravity 记忆已压缩', `检测到历史会话已被自动压缩。部分前期细节与代码片段已丢失！`);
        state.compressionTriggered = true;
      }
    } else if (userInputCount >= 12) {
      if (!state.yellowTriggered) {
        showNotification('🟡 Antigravity 会话过长', `当前对话已达 ${userInputCount} 轮。上下文体积增加，AI 推理精度可能下降。`);
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
console.log('Antigravity Context Watcher Running...');
console.log(`Target Project Path: ${projectWorkspace}`);
console.log('====================================================');
