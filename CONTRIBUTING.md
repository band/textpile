# Contributing to Textpile

Thank you for your interest in contributing to Textpile! This document provides guidelines for contributing code, documentation, bug reports, and feature requests.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

### Our Commitment

Textpile is designed to be **simple, focused, and low-maintenance**. We value contributions that align with these principles.

### Expected Behavior

- Be respectful and constructive in discussions
- Focus on simplicity and clarity
- Document your changes thoroughly
- Test your code before submitting
- Respect the project's design philosophy

### Unacceptable Behavior

- Proposing complex features that contradict "low-maintenance" goals
- Ignoring feedback from maintainers
- Submitting untested code
- Adding dependencies unnecessarily

---

## How Can I Contribute?

### 1. Bug Reports

Found a bug? Please report it!

**Before submitting:**
- Check existing issues to avoid duplicates
- Test on the latest version
- Gather details about your environment

**What to include:**
- Clear description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Environment (Cloudflare setup, browser, etc.)
- Screenshots or logs if applicable

**Template:**

```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Cloudflare Pages version:
- Browser:
- Textpile version/commit:

## Additional Context
Any other relevant information
```

### 2. Feature Requests

Have an idea? We'd love to hear it!

**Important**: Textpile intentionally avoids many features to stay simple. Before requesting:
- Consider if it aligns with "low-maintenance by design"
- Check if it can be achieved with configuration
- Think about trade-offs (complexity vs. benefit)

**What to include:**
- Clear use case (not just "it would be nice")
- Why it can't be solved another way
- How it fits with Textpile's philosophy
- Willingness to implement it yourself

**Features we're unlikely to add:**
- User accounts or authentication (use Cloudflare Access instead)
- Comments or discussions (use external tools)
- Post editing (creates complexity)
- Rich media (images, videos)
- Search (use browser search or external indexing)
- Themes or customization (keep it simple)

**Features we might consider:**
- Better spam prevention
- Improved admin tools
- Performance optimizations
- Security enhancements
- Better documentation

### 3. Documentation Improvements

Documentation is always welcome!

**Types of documentation:**
- Clarifications in existing docs
- New guides for common tasks
- FAQ entries
- Code comments
- Architecture explanations

**Style:**
- Clear, plain language
- Short paragraphs
- Concrete examples
- Focus on "why" not just "what"

### 4. Code Contributions

Want to write code? Great!

**Before you start:**
- Open an issue to discuss your approach
- Get feedback from maintainers
- Fork the repository
- Create a feature branch

**Types of contributions:**
- Bug fixes
- Performance improvements
- Security enhancements
- Better error messages
- Test coverage

---

## Development Setup

### Prerequisites

- **Node.js** 18+ (for Wrangler CLI)
- **Git** for version control
- **Cloudflare account** (free tier is fine)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/textpile.git
   cd textpile
   ```

2. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

4. **Create local KV namespace**
   ```bash
   wrangler kv:namespace create KV --preview
   ```

5. **Run development server**
   ```bash
   wrangler pages dev public/
   ```

6. **Test in browser**
   - Open http://localhost:8788
   - Test submit functionality
   - Check post rendering

### Testing Changes

**Manual testing checklist:**
- [ ] Homepage loads without errors
- [ ] Submit form accepts posts
- [ ] Posts appear in TOC
- [ ] Posts render correctly with Markdown
- [ ] Expiration works (test with short TTL)
- [ ] Error messages are clear
- [ ] XSS escaping is correct
- [ ] Admin removal works (if testing that)

**Test different scenarios:**
- Empty body (should reject)
- Very long title (should truncate)
- Markdown formatting
- Special characters in content
- Expired posts (manually set date in past)

### Code Quality

**Before submitting:**
- [ ] Code follows existing style
- [ ] No console.log() left in production code
- [ ] Comments explain "why" not just "what"
- [ ] No hardcoded values (use env vars)
- [ ] Error handling is robust
- [ ] HTML is properly escaped

---

## Coding Standards

### JavaScript Style

**Follow existing patterns:**
- Use `const` and `let`, avoid `var`
- Arrow functions for callbacks
- Async/await for promises
- Descriptive variable names

**Example:**
```javascript
// Good
const posts = await env.KV.get("index");
const items = posts ? JSON.parse(posts) : [];

// Avoid
var posts = await env.KV.get("index");
if (posts) {
  var items = JSON.parse(posts);
} else {
  var items = [];
}
```

### HTML/CSS Style

**Keep it simple:**
- Semantic HTML
- Minimal CSS (use existing classes)
- No frameworks or build steps
- Mobile-friendly responsive design

### Security Practices

**Always:**
- Escape user input with `escapeHtml()`
- Use timing-safe comparison for tokens
- Validate input before processing
- Return appropriate HTTP status codes
- Use HTTPS only (Cloudflare handles this)

**Never:**
- Trust user input
- Expose sensitive tokens
- Allow arbitrary code execution
- Skip input validation

### Performance Guidelines

**Optimize for:**
- Minimal KV reads (each costs money at scale)
- Fast function execution (reduce cold start impact)
- Small payload sizes (faster load times)

**Example:**
```javascript
// Good: Single KV fetch
const result = await env.KV.getWithMetadata(`post:${id}`);
const body = result.value;
const metadata = result.metadata;

// Avoid: Multiple fetches
const body = await env.KV.get(`post:${id}`);
const metadata = await env.KV.getWithMetadata(`post:${id}`);
```

---

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b fix/issue-description
   # or
   git checkout -b feature/feature-name
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Test thoroughly
   - Update documentation

3. **Commit with clear messages**
   ```bash
   git add -A
   git commit -m "Fix: Clear description of what changed"
   ```

   **Good commit messages:**
   - `Fix: Escape URL in index.html to prevent XSS`
   - `Feature: Add retention period selector to submit form`
   - `Docs: Clarify expiration behavior in User's Guide`

   **Poor commit messages:**
   - `fix bug`
   - `updates`
   - `WIP`

4. **Push to your fork**
   ```bash
   git push origin fix/issue-description
   ```

5. **Open a Pull Request**
   - Use the PR template (if available)
   - Link to related issues
   - Describe what changed and why
   - Include screenshots for UI changes

### Pull Request Template

```markdown
## Description
Brief summary of changes

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2

## Testing
How did you test this?

## Checklist
- [ ] Code follows project style
- [ ] Tested locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented if so)
```

### Review Process

1. Maintainer reviews your PR
2. Feedback provided (may request changes)
3. You address feedback
4. Maintainer approves and merges

**Timeline:**
- Initial review: Usually within 1 week
- Follow-up: Best effort (this is a volunteer project)

---

## Reporting Bugs

### Bug Report Process

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with detailed information
3. **Label appropriately** (bug, security, etc.)
4. **Wait for triage** by maintainers

### Priority Levels

**Critical (fix immediately):**
- Security vulnerabilities
- Data loss bugs
- Complete service outage

**High (fix soon):**
- Major functionality broken
- Widespread impact
- Degraded performance

**Medium (fix when possible):**
- Minor bugs
- Edge cases
- Cosmetic issues

**Low (consider for future):**
- Enhancement requests
- Documentation improvements
- Nice-to-haves

---

## Security Vulnerabilities

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

**Instead:**
1. Email the maintainer directly (see README.md for contact)
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow reasonable time for response (1-2 weeks)
4. Coordinate public disclosure after fix

### Security Scope

**In scope:**
- XSS vulnerabilities
- Token leakage
- Authentication bypasses
- Data exposure
- Timing attacks

**Out of scope:**
- Issues requiring physical access
- Social engineering
- DDoS (Cloudflare handles this)
- Theoretical attacks with no practical impact

### Responsible Disclosure

We follow responsible disclosure:
1. Report received and acknowledged
2. Issue verified and prioritized
3. Fix developed and tested
4. Fix deployed
5. Public disclosure (credit given to reporter)

**Timeline:**
- Acknowledgment: Within 48 hours
- Fix: Critical issues within 1 week, others within 30 days
- Disclosure: After fix is deployed

---

## Development Philosophy

### Core Principles

**1. Simplicity First**
- Prefer simple solutions over clever ones
- Less code is better code
- Avoid dependencies when possible

**2. Maintainability**
- Code should be easy to understand
- Future you (or someone else) should understand it in 6 months
- Comments explain "why," code shows "how"

**3. Performance Awareness**
- KV reads/writes cost money
- Function execution time affects user experience
- Optimize where it matters

**4. Security Conscious**
- Validate all input
- Escape all output
- Use safe patterns (timing-safe comparison, etc.)

### What We Value

✅ Clear, well-documented code
✅ Robust error handling
✅ Backwards compatibility
✅ Simple, focused features
✅ Good user experience

### What We Avoid

❌ Complex abstractions
❌ Unnecessary dependencies
❌ Breaking changes
❌ Feature creep
❌ Performance regressions

---

## Releasing a New Version

**For maintainers only.** This section describes how to create a new release.

### Version Numbering

Textpile follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features (backwards compatible)
- **PATCH** (0.0.X): Bug fixes

### Release Process

1. **Update version in source**
   ```bash
   # Edit public/version.js
   export const TEXTPILE_VERSION = "0.7.0";
   ```

2. **Run version sync script**
   ```bash
   npm run update-version
   ```

   This updates:
   - `README.md` - "Current Version" badge
   - `CONFIGURATION.md` - Footer example
   - `package.json` - Version field

3. **Update CHANGELOG.md**
   - Add new version section with date
   - List all changes under appropriate categories:
     - `### Added` - New features
     - `### Changed` - Changes in existing functionality
     - `### Deprecated` - Soon-to-be removed features
     - `### Removed` - Removed features
     - `### Fixed` - Bug fixes
     - `### Security` - Security updates
   - Note breaking changes prominently with `⚠️ BREAKING CHANGES`

4. **Commit and tag**
   ```bash
   git add -A
   git commit -m "Release v0.7.0"
   git tag -a v0.7.0 -m "Release v0.7.0"
   ```

5. **Push to GitHub**
   ```bash
   git push origin main --tags
   ```

6. **Verify deployment**
   - Check Cloudflare Pages deployment succeeds
   - Verify new version appears on production site
   - Test critical functionality

### Version Files

The version number appears in multiple places:
- **Source of truth**: `public/version.js` (manually edited)
- **Auto-updated**: `README.md`, `CONFIGURATION.md`, `package.json` (via script)
- **Manual**: `CHANGELOG.md` (add release notes)

**Always run `npm run update-version` after editing `public/version.js`.**

---

## Questions?

**General questions:**
- Open a GitHub Discussion
- Check existing documentation
- Ask in the community

**Specific technical questions:**
- Comment on related issues
- Open a new issue with [Question] tag

**Want to contribute but not sure how?**
- Look for "good first issue" labels
- Check documentation todos
- Ask maintainers for suggestions

---

## License

By contributing to Textpile, you agree that your contributions will be licensed under the MIT License.

## Attribution

Contributors will be credited in:
- Git commit history
- Release notes (for significant contributions)
- CONTRIBUTORS file (if we create one)

---

**Thank you for contributing to Textpile!**

Remember: We're building something simple, focused, and low-maintenance. Every contribution should support that vision.
