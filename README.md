<div align="center">

# 🎙️ LocalVocal

### Your Local AI Voice Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()

<img width="800" alt="LocalVocal Screenshot" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

**Run AI voice assistants entirely on your machine. No cloud. No subscriptions. Full privacy.**

[Getting Started](#-getting-started) •
[Features](#-features) •
[Contributing](#-contributing) •
[Roadmap](#-roadmap)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Local LLMs** | Run Llama, Mistral, Gemma, Phi-3 via Ollama |
| 🎤 **Speech-to-Text** | Whisper integration for transcription |
| 🔊 **Text-to-Speech** | Piper, XTTS, Bark voice synthesis |
| 📊 **Model Foundry** | Download, manage, load/unload models |
| 💬 **Gemini Studio** | Chat with local or cloud models |
| 🎙️ **Live Voice** | Real-time voice conversation mode |
| 🔌 **Offline First** | Works without internet after setup |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Ollama** for local LLMs ([download](https://ollama.ai))
- **Git**

### Quick Install

```bash
# Clone the repo
git clone https://github.com/CloudCorpRecords/yellingstop.git
cd yellingstop

# Install dependencies
npm install

# Run in dev mode
npm run electron:dev
```

### Build for Production

```bash
# macOS
npm run dist

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

### Launcher Scripts

| Script | Purpose |
|--------|---------|
| `Run LocalVocal.command` | Launch the app (macOS) |
| `Update.command` | Pull updates & rebuild (macOS) |
| `Run LocalVocal.bat` | Launch the app (Windows) |
| `Update.bat` | Pull updates & rebuild (Windows) |

## 🔧 Configuration

Create `.env.local` for optional cloud features:

```env
GEMINI_API_KEY=your_key_here  # For Gemini Studio cloud mode
```

## 🗂️ Project Structure

```
localvocal/
├── components/        # React UI components
│   ├── GeminiStudio.tsx    # AI chat interface
│   ├── ModelControl.tsx    # Model management
│   └── LiveVoiceInterface.tsx
├── services/          # API integrations
│   ├── ollama.ts      # Ollama API client
│   ├── huggingface.ts # HuggingFace API
│   ├── whisper.ts     # STT service
│   └── tts.ts         # TTS service
├── electron/          # Electron main process
└── dist/              # Built web assets
```

## 🤝 Contributing

We love contributions! Here's how to get started:

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/yellingstop.git
cd yellingstop
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/amazing-feature
```

### 3. Make Changes & Test

```bash
npm run electron:dev  # Test your changes
npm run build         # Make sure it builds
```

### 4. Submit a PR

Push your branch and open a Pull Request!

### Areas We Need Help

- [ ] 🎨 **UI/UX** - Better designs, animations, accessibility
- [ ] 🎤 **Whisper.cpp** - Native whisper.cpp integration
- [ ] 🔊 **Piper TTS** - Local Piper TTS integration  
- [ ] 🌐 **i18n** - Internationalization support
- [ ] 📱 **Mobile** - React Native port
- [ ] 🧪 **Tests** - Unit and E2E tests
- [ ] 📖 **Docs** - Better documentation

## 📋 Roadmap

- [x] ~~Ollama LLM integration~~
- [x] ~~Model Foundry with multi-model types~~
- [x] ~~HuggingFace model discovery~~
- [x] ~~Cross-platform builds~~
- [x] ~~Running model management~~
- [ ] Native Whisper.cpp for offline STT
- [ ] Piper TTS for offline voice synthesis
- [ ] Voice cloning with XTTS
- [ ] RAG with local documents
- [ ] Plugin system

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ by the LocalVocal community**

⭐ Star this repo if you find it useful!

</div>
