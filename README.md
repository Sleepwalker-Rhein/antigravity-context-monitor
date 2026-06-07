# Antigravity Context Monitor 🌌

[English](#english) | [中文说明](#中文说明)

---

## English

A lightweight, zero-dependency, event-driven context length monitor designed for the Antigravity 2.0 Agentic Coding client. It runs completely outside the AI's context window, consuming **0 tokens / 0 AI attention** to prevent AI reasoning degradation in long chats.

![Preview](assets/context_monitor_preview.png)

### 🌟 Features

- **Zero AI Attention & Token Overhead**: Runs natively on the host OS as a background watcher, bypassing the LLM's prompt context.
- **Bilingual Adaptive Alerts**: Automatically detects OS locale to push native notifications in English or Chinese.
- **PowerShell Native Toast Notifications**: Slides in clean, system-themed Toast banners directly in the bottom-right corner of your screen (supports Windows light/dark modes).
- **Event-Driven Directory Watcher**: 0% CPU idle consumption. It uses file-system hooks (`fs.watch`) to listen for active chats, reacting in real-time.
- **Smart Path Filtering**: Detects which workspace a chat belongs to and only triggers alerts for your active project.
- **Single-Instance Protection**: Binds to a local port to guarantee only one watcher instance runs in the background.
- **Robust Error Handling**: Safely handles folder deletion, conversation clearing, and characters requiring XML escaping.

### ⚙️ How It Works

The script monitors your local Antigravity runtime directory (`~/.gemini/antigravity/brain/`).
1. **🟡 Warning (Yellow Indicator)**: Triggered when a conversation hits **12 rounds**, or when Antigravity executes **automatic history compression** (alerting you that raw details/code blocks are now summarized/lost).
2. **🔴 Warning (Red Indicator)**: Triggered when the chat hits **20 rounds**, strongly suggesting opening a new conversation to avoid reasoning decay ("Dumb Zone").

### 🚀 Installation & Setup (Windows)

#### Prerequisites
- [Node.js](https://nodejs.org/) installed and available in your system path.

#### Steps
1. Clone this repository to your machine:
   ```bash
   git clone https://github.com/Sleepwalker-Rhein/antigravity-context-monitor.git
   cd antigravity-context-monitor
   ```

2. Run the script manually in your terminal to test:
   ```bash
   node watch_context.cjs "C:/path/to/your/project/workspace"
   ```
   *(Note: replace the path with your actual target workspace directory. If left blank, it defaults to the parent folder of the script).*

3. **Set Up Autostart (Run Silently in Background)**:
   - Press `Win + R`, type `shell:startup` and press **Enter** to open the Windows Startup folder.
   - Copy `start_antigravity_watcher.vbs` (or create a shortcut pointing to it) and place it inside that folder.
   - Right-click the `.vbs` file, open with Notepad, and edit the path to point to your cloned `watch_context.cjs` file.
   - **Double-click** the VBS file to start it immediately. It will run silently in the background with no command windows shown, and will automatically start every time you log into Windows!

---

## 中文说明

一个轻量级、零依赖、事件驱动的上下文长度监视器，专为 Antigravity 2.0 智能编码客户端设计。它运行在 AI 的上下文窗口之外，消耗 **0 token / 0 AI 注意力**，以防止长对话中 AI 推理能力的衰减。

### 🌟 功能特点

- **零 AI 注意力和 Token 消耗**：原生运行于宿主系统后台，绕过大模型的 Prompt 上下文，无任何 Token 开销。
- **双语自适应通知**：自动检测 Windows 系统语言环境，自适应弹出中文或英文系统通知。
- **PowerShell 原生 Toast 通知**：在屏幕右下角滑出干净的、系统主题风格的 Toast 消息横幅（支持 Windows 深浅色主题）。
- **完全事件驱动**：0% 空闲 CPU 占用。使用文件系统钩子（`fs.watch`）动态监听活跃对话。
- **智能工作区过滤**：识别对话所属的工作区，仅对你当前正在开发的活跃项目触发通知。
- **单例锁保护**：通过本地端口防重开机制，确保后台仅常驻唯一监听实例，防止重复弹窗。
- **健壮的容错机制**：安全处理历史记录删除、清空会话以及 XML 特殊字符转义。

### ⚙️ 工作原理

脚本会监听本地 Antigravity 运行目录 (`~/.gemini/antigravity/brain/`)：
1. **🟡 黄点警告**：当对话达到 **12 轮**，或检测到 Antigravity 执行了**自动历史压缩**（提醒你前期的具体代码细节与修改历史已被总结压缩，AI 失去精确记忆）。
2. **🔴 红点警告**：当对话达到 **20 轮**，强力建议开启新对话，防止 AI 进入推理能力退化的“笨拙区”。

### 🚀 安装与自启指南 (Windows)

#### 前置条件
- 系统已安装 [Node.js](https://nodejs.org/) 并已配置环境变量。

#### 安装步骤
1. 克隆仓库到本地：
   ```bash
   git clone https://github.com/Sleepwalker-Rhein/antigravity-context-monitor.git
   cd antigravity-context-monitor
   ```

2. 在终端手动运行进行测试：
   ```bash
   node watch_context.cjs "C:/你的/项目/工作区路径"
   ```
   *(注：若不传路径，默认将监视脚本父级目录所代表的项目)*。

3. **配置开机静默自启**：
   - 按下 `Win + R` 输入 `shell:startup` 回车，打开 Windows 启动文件夹。
   - 将项目中的 `start_antigravity_watcher.vbs` 复制或创建快捷方式放入该文件夹。
   - 右键该 `.vbs` 文件，用记事本打开，修改其中的路径，指向你克隆的 `watch_context.cjs` 的绝对路径。
   - **双击运行** 该 VBS 启动脚本。它会在后台完全静默运行（无任何命令行窗口），且每次开机都会自动启动。

---

## 📄 License

MIT License.
