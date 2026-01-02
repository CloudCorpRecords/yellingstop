# LocalVocal Project Hub

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A powerful, Electron-based desktop application for managing local voice interfaces and AI models. This project serves as a central hub for your local AI experiments.

## Features
*   **Unified Dashboard**: Manage your projects and models in one place.
*   **Electron Desktop App**: Native desktop experience with auto-updates.
*   **Live Voice Interface**: Interact with your models using voice.
*   **Local Registry**: Keep track of your local AI resources.

## Quick Start

### Prerequisites
*   Node.js installed on your machine.
*   Git.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/CloudCorpRecords/yellingstop.git
    cd yellingstop
    ```

2.  Run the unified launcher:
    ```bash
    ./launcher.sh
    ```

    The launcher will automatically:
    *   Install dependencies (if needed).
    *   Check for updates (`git pull`).
    *   Launch the application in development mode with Developer Tools enabled.

## Configuration

Create a `.env.local` file in the root directory and add your API keys:

```env
GEMINI_API_KEY=your_api_key_here
```
