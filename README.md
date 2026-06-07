# Antigravity Context Monitor 🌌

A lightweight, zero-dependency, event-driven context length monitor designed for the Antigravity 2.0 Agentic Coding client. It runs completely outside the AI's context window, consuming **0 tokens / 0 AI attention** to prevent AI reasoning degradation in long chats.

---

## 🌟 Features

- **Zero AI Attention & Token Overhead**: Runs natively on the host OS as a background watcher, bypassing the LLM's prompt context.
- **PowerShell Native Toast Notifications**: Slides in clean, system-themed Toast banners directly in the bottom-right corner of your screen (supports Windows light/dark modes).
- **Event-Driven Directory Watcher**: 0% CPU idle consumption. It uses file-system hooks (`fs.watch`) to listen for active chats, reacting in real-time.
- **Smart Path Filtering**: Detects which workspace a chat belongs to and only triggers alerts for your active project.
- **Single-Instance Protection**: Binds to a local port to guarantee only one watcher instance runs in the background.
- **Robust Error Handling**: Safely handles folder deletion, conversation clearing, and characters requiring XML escaping.

---

## ⚙️ How It Works

The script monitors your local Antigravity runtime directory (`~/.gemini/antigravity/brain/`).
1. **🟡 Warning (Yellow Indicator)**: Triggered when a conversation hits **12 rounds**, or when Antigravity executes **automatic history compression** (alerting you that raw details/code blocks are now summarized/lost).
2. **🔴 Warning (Red Indicator)**: Triggered when the chat hits **20 rounds**, strongly suggesting opening a new conversation to avoid reasoning decay ("Dumb Zone").

---

## 🚀 Installation & Setup (Windows)

### Prerequisites
- [Node.js](https://nodejs.org/) installed and available in your system path.

### Steps
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

## 📄 License

MIT License.
