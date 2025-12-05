# Contributing to UAOL

Thank you for your interest in contributing to UAOL! This document provides guidelines and instructions for contributing.

## 🐛 Critical Bug: PDF Parsing

We have a **critical bug** that needs community help! See [`doc/PDF_PARSING_BUG_BOUNTY.md`](doc/PDF_PARSING_BUG_BOUNTY.md) for details.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/mcpmessenger/uaol/issues)
2. If not, create a new issue using the appropriate template
3. For PDF parsing issues, use the [PDF Parsing Bug template](.github/ISSUE_TEMPLATE/pdf-parsing-bug.md)

### Suggesting Features

1. Open a new issue with the `enhancement` label
2. Clearly describe the feature and its use case
3. Discuss implementation approach if you have ideas

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/your-feature-name` or `fix/your-bug-fix`
3. **Make your changes**
4. **Test thoroughly**:
   - Run `npm test` (if tests exist)
   - Test manually in development
   - Test edge cases
5. **Commit your changes**: Use clear, descriptive commit messages
6. **Push to your fork**: `git push origin your-branch-name`
7. **Open a Pull Request**:
   - Use the PR template
   - Link to related issues
   - Describe your changes clearly
   - Include screenshots if applicable

### Code Style

- Follow existing code style
- Use TypeScript for type safety
- Add comments for complex logic
- Keep functions focused and small
- Write self-documenting code

### Testing

- Test your changes locally before submitting
- Test with different scenarios (edge cases)
- Ensure no breaking changes (unless intentional)
- Update tests if you modify functionality

## 🎯 Priority Areas

### High Priority

1. **PDF Parsing Bug** - See [`doc/PDF_PARSING_BUG_BOUNTY.md`](doc/PDF_PARSING_BUG_BOUNTY.md)
   - Critical blocker for document analysis
   - ESM/TypeScript/Class instantiation issue
   - Open for community contribution

### Medium Priority

- Performance optimizations
- Additional test coverage
- Documentation improvements
- UI/UX enhancements

## 📚 Development Setup

See [README.md](README.md) for setup instructions.

## 🔍 Finding Issues to Work On

- Check [Issues](https://github.com/mcpmessenger/uaol/issues) with `good first issue` label
- Look for `help wanted` label
- Check the [PDF Parsing Bug Bounty](doc/PDF_PARSING_BUG_BOUNTY.md)

## 💬 Getting Help

- Open a [Discussion](https://github.com/mcpmessenger/uaol/discussions) for questions
- Comment on issues for clarification
- Check existing documentation in `doc/` folder

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```
fix: resolve PDF parsing class instantiation issue
feat: add support for encrypted PDFs
docs: update PDF parsing bug bounty document
refactor: simplify file processor logic
test: add tests for PDF text extraction
```

## ✅ Checklist for PRs

- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated (if needed)
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings
- [ ] Linked to related issues

## 🙏 Thank You!

Your contributions make UAOL better for everyone. We appreciate your time and effort!
