# Contributing to LocalVocal

Thank you for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/CloudCorpRecords/yellingstop/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your OS and version

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and why it would be useful
3. Include mockups or examples if possible

### Code Contributions

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Create a branch**: `git checkout -b feature/your-feature`
5. **Make changes** and test: `npm run electron:dev`
6. **Build** to verify: `npm run build`
7. **Commit** with a clear message
8. **Push** and open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components focused and small
- Add comments for complex logic

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add voice synthesis with Piper TTS
fix: resolve model loading race condition
docs: update README with new features
refactor: optimize model filtering logic
```

## Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run build

# Build installer
npm run dist
```

## Need Help?

- Open an issue for questions
- Check existing issues for answers

Thank you for contributing! 🙏
