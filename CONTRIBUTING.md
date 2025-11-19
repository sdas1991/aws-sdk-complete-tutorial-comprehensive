# Contributing to AWS SDK Complete Tutorial

Thank you for your interest in contributing to this comprehensive AWS SDK tutorial! This document provides guidelines for contributing.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Development Setup](#development-setup)
4. [Contribution Guidelines](#contribution-guidelines)
5. [Style Guide](#style-guide)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful, inclusive, and professional in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (Node.js version, AWS SDK version, OS)
- **Code samples** if applicable
- **Error messages and logs**

### Suggesting Enhancements

Enhancement suggestions are welcome! Include:

- **Clear use case** for the enhancement
- **Current limitations** you're experiencing
- **Proposed solution** (if you have one)
- **Alternative approaches** you've considered

### Adding New Examples

We welcome new examples! Follow these guidelines:

1. **Check if the example already exists**
2. **Follow the example template** (see below)
3. **Include comprehensive documentation**
4. **Add tests** where applicable
5. **Update the relevant README** with your example

---

## Development Setup

### Prerequisites

```bash
# Node.js 16+
node --version

# npm 8+
npm --version

# AWS CLI configured
aws --version
aws configure
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aws-sdk-complete-tutorial-comprehensive.git
cd aws-sdk-complete-tutorial-comprehensive

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### Local Development

```bash
# Watch mode for development
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

---

## Contribution Guidelines

### Example Template

When creating a new example, use this template:

```typescript
/**
 * Service Example XX: Title
 *
 * This example demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * @complexity: ⭐ Basic | ⭐⭐ Intermediate | ⭐⭐⭐ Advanced
 */

import { ServiceClient, CommandName } from '@aws-sdk/client-service';

const client = new ServiceClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Clear function description
 */
async function exampleFunction(param: string): Promise<void> {
  console.log(`\n📝 Description of what we're doing...`);

  try {
    // Implementation
    const command = new CommandName({ /* params */ });
    const response = await client.send(command);

    console.log('✅ Success message');
    console.log(`   Detail: ${response.Detail}`);

    return response;
  } catch (error: any) {
    // Specific error handling
    if (error.name === 'SpecificError') {
      console.error('❌ Specific error message');
    } else {
      console.error('❌ General error:', error.message);
    }
    throw error;
  }
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 Example Title');
  console.log('==================\n');

  try {
    // Step-by-step demonstration
    await exampleFunction('test');

    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

// Export for use in other modules
export { exampleFunction };
```

### Documentation Standards

#### README Files

Each service should have:

1. **Overview** - What the service does
2. **Core Concepts** - Key terminology and concepts
3. **Examples Index** - Table of all examples with complexity ratings
4. **Best Practices** - Production-ready guidelines
5. **Quick Start** - Rapid reference guide
6. **System Design** - Real-world architecture patterns

#### Code Comments

- Use JSDoc for functions and classes
- Explain the "why", not just the "what"
- Include usage examples in comments
- Document all parameters and return types

### Testing

```typescript
// tests/example.test.ts
import { exampleFunction } from '../examples/01-example';

describe('Example Function', () => {
  it('should perform expected operation', async () => {
    // Mock AWS SDK calls
    const mockSend = jest.fn().mockResolvedValue({ /* mock response */ });

    // Test implementation
    const result = await exampleFunction('test');

    expect(result).toBeDefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should handle errors correctly', async () => {
    // Error handling test
    await expect(exampleFunction('invalid')).rejects.toThrow();
  });
});
```

---

## Style Guide

### TypeScript

- Use **TypeScript strict mode**
- Prefer `const` over `let`
- Use arrow functions where appropriate
- Type all function parameters and return values
- Use interfaces for complex types
- Avoid `any` type (use `unknown` if needed)

### Formatting

We use Prettier with the following configuration:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

Run `npm run format` before committing.

### Naming Conventions

- **Files**: kebab-case (`01-example-name.ts`)
- **Functions**: camelCase (`createBucket`)
- **Classes**: PascalCase (`S3Manager`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with descriptive names (`UserConfig`)

### Error Handling

Always include comprehensive error handling:

```typescript
try {
  // Operation
} catch (error: any) {
  // Specific AWS errors
  if (error.name === 'NoSuchBucket') {
    console.error('Bucket does not exist');
  } else if (error.name === 'AccessDenied') {
    console.error('Access denied - check IAM permissions');
  } else {
    // Generic error
    console.error('Operation failed:', error.message);
  }
  throw error;
}
```

---

## Commit Messages

Follow the Conventional Commits specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(s3): add multipart upload example

Implement comprehensive multipart upload example with:
- Progress tracking
- Parallel part uploads
- Resume capability
- Error handling

Closes #123
```

```
fix(iam): correct policy simulation parameters

The policy simulator was using incorrect parameter names
for the resource ARN field.

Fixes #456
```

```
docs(lambda): update best practices section

Add information about:
- Lambda layers optimization
- Cold start reduction
- Memory configuration guidelines
```

---

## Pull Request Process

### Before Submitting

1. **Update documentation** for any changed functionality
2. **Add or update tests** for new code
3. **Run linter and formatter**: `npm run lint && npm run format`
4. **Test your changes**: `npm test`
5. **Update CHANGELOG** if applicable

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test addition/modification

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested these changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] README updated if needed

## Related Issues
Closes #XXX
```

### Review Process

1. **Automated checks** must pass (lint, tests, build)
2. **At least one reviewer** must approve
3. **All comments** must be resolved
4. **Documentation** must be updated
5. **No merge conflicts** with main branch

### After Approval

- Squash commits if requested
- Maintainer will merge the PR
- Delete your branch after merge

---

## Recognition

Contributors will be recognized in:

- README contributors section
- Release notes
- Project documentation

---

## Questions?

- **Open an issue** for questions
- **Join discussions** in GitHub Discussions
- **Email**: maintainers@example.com

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to make this the most comprehensive AWS SDK tutorial!** 🚀
