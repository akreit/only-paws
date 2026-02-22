# coding Guidelines for Agents

## Core Principles

- Keep code concise and highly modular / composable
- We care deeply about (human) maintainability
- Never execute any write commands outside the project directory

## Planning Before Implementation

Never jump straight into coding. Always:

1. Understand the problem statement fully
2. Explore the existing codebase to understand patterns and conventions
3. Identify affected components and dependencies
4. Plan the approach before writing any code
5. Consider edge cases and potential issues

## Clean Code Principles

### Code Style

- Write readable, self-documenting code
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Avoid deep nesting
- Follow existing code conventions in the repository

### Maintainability

- DRY (Don't Repeat Yourself) - extract repeated logic into reusable functions
- KISS (Keep It Simple) - prefer simple solutions over complex ones
- Document complex logic when necessary
- Keep code loosely coupled and highly cohesive

### Code Organization

- Group related functionality together
- Separate concerns clearly
- Use consistent file naming conventions
- Keep imports organized

## Modular Architecture

### Design Principles

- Break large features into smaller, independent modules
- Each module should have a single, well-defined purpose
- Minimize dependencies between modules
- Use clear interfaces for module communication

### File Structure

- Organize files by feature/domain rather than type
- Keep related files close to each other
- Use index files to simplify imports when appropriate
- Maintain a shallow directory structure

### Component Design

- Design components for reusability
- Keep components focused and composable
- Avoid tight coupling between components
- Use dependency injection when appropriate

## Testing Requirements

### Test Coverage

- Write tests for all new functionality
- Aim for high test coverage (at least 80%)
- Test both happy path and edge cases
- Test error handling and error scenarios

### Test Quality

- Write clear, descriptive test names
- Tests should be independent and isolated
- Use appropriate test fixtures and helpers
- Avoid implementation details in tests - test behavior

### Test Organization

- Keep tests close to the code they test
- Organize tests logically
- Use consistent test file naming

## Code Review Checklist

Before considering code complete:

- [ ] Code is readable and follows clean code principles
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Appropriate error handling
- [ ] Tests written and passing
- [ ] No linting or type checking errors
- [ ] Documentation updated if needed

## Repository-Specific Conventions

Check and follow:

- Existing code style patterns
- Framework-specific conventions
- Import organization
- File naming patterns
- Testing approach used in project

## When in Doubt

- Prioritize clarity over cleverness
- Ask questions when requirements are unclear
- Propose alternatives when multiple approaches are possible
- Document any significant architectural decisions
