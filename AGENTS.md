# Repository Guidelines

## Project Structure & Module Organization

```
app-service/
├── index.ts              # Main implementation - proxy-based fluent API
├── index.test.ts         # Comprehensive test suite (32 tests)
├── examples.ts           # Usage examples and patterns
├── package.json          # Package configuration and scripts
├── tsconfig.json         # TypeScript strict mode configuration
└── docs/
    ├── README.md         # Main documentation
    ├── API.md            # Complete API reference
    ├── QUICKSTART.md     # Quick start guide
    └── *.md              # Additional documentation
```

**Key Files:**
- `index.ts` - Core implementation (~387 lines). Contains proxy handlers, state management, and object builders.
- `index.test.ts` - Test suite covering all features, edge cases, and error scenarios.
- `examples.ts` - Runnable examples demonstrating real-world usage patterns.

## Build, Test, and Development Commands

```bash
# Run all tests
bun test

# Run tests in watch mode (for development)
bun test --watch

# Run examples to verify functionality
bun run examples

# Type check (requires TypeScript)
bun run typecheck
```

**What each does:**
- `bun test` - Executes the full test suite (32 tests, ~40ms)
- `bun test --watch` - Continuously runs tests on file changes
- `bun run examples` - Runs 10 real-world usage examples
- `bun run typecheck` - Validates TypeScript types without emitting files

## Coding Style & Naming Conventions

**TypeScript Configuration:**
- Strict mode enabled (`strict: true`)
- Target: ESNext with bundler module resolution
- No implicit any, unused locals checked

**Style Guidelines:**
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** ~100 characters (flexible)
- **Naming:**
  - `camelCase` for functions and variables
  - `PascalCase` for types and interfaces
  - `UPPER_SNAKE_CASE` for constants

**Code Organization:**
- Group related functions together
- Place type definitions before implementation
- Use JSDoc comments for public APIs
- Keep functions focused and single-purpose

**Example:**
```typescript
/**
 * Creates a command object from the builder state
 */
function createCommandObject(
  state: BuilderState,
  commandName: string,
  payload: object
): CommandObject {
  return {
    id: randomUUID(),
    namespace: state.namespace.join('.'),
    kind: 'command',
    name: commandName,
    payload,
    options: { /* ... */ },
  };
}
```

## Testing Guidelines

**Framework:** Bun's built-in test runner

**Test Structure:**
- Organized by feature area using `describe()` blocks
- Use descriptive test names: `should [expected behavior] when [condition]`
- Each test should be independent and isolated
- Use `beforeEach()` for test setup

**Coverage Requirements:**
- All public APIs must have tests
- Test both success and error paths
- Include edge cases and boundary conditions
- Maintain 100% test pass rate

**Test Naming Pattern:**
```typescript
describe('Feature Area', () => {
  test('should perform action when condition is met', async () => {
    // Arrange
    const input = { /* ... */ };
    
    // Act
    const result = await app.Namespace.command(input);
    
    // Assert
    expect(result.kind).toBe('command');
  });
});
```

**Running Specific Tests:**
```bash
# Run all tests
bun test

# Run with verbose output
bun test --verbose

# Run in watch mode
bun test --watch
```

## Commit & Pull Request Guidelines

**Commit Message Format:**
```
<type>: <short description>

<optional detailed description>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring without behavior change
- `chore:` Maintenance tasks

**Examples:**
```
feat: add support for batch operations
fix: resolve state isolation issue in query chains
docs: update API reference with new examples
test: add edge cases for aggregate ID handling
```

**Pull Request Requirements:**
1. All tests must pass (`bun test`)
2. No TypeScript errors (`bun run typecheck`)
3. Update documentation if adding/changing public APIs
4. Include examples for new features
5. Add tests for new functionality
6. Keep changes focused and atomic

**PR Description Template:**
```markdown
## Changes
- Brief description of what changed

## Testing
- How the changes were tested
- New test cases added

## Documentation
- Documentation updates made (if applicable)
```

## Architecture Overview

**Design Patterns:**
- **Proxy Pattern:** Dynamic API generation for fluent interface
- **Builder Pattern:** Immutable state construction
- **Strategy Pattern:** Pluggable dispatcher system

**Key Concepts:**
- **State Isolation:** Each call creates new state, preventing leakage
- **Immutability:** State objects are never mutated, only copied
- **Type Safety:** Full TypeScript support with exported interfaces

**Adding New Features:**
1. Update `BuilderState` interface if needed
2. Modify proxy handlers in `createAppProxy()`
3. Add corresponding object builder function
4. Export new types if public-facing
5. Add comprehensive tests
6. Update documentation

## Security & Configuration Tips

**Security Considerations:**
- Never log sensitive payload data in production
- Validate dispatcher responses before processing
- Use environment variables for configuration
- Sanitize user input in custom dispatchers

**Configuration:**
```typescript
// Set up dispatcher at application startup
import { setDispatcher } from '@wave/app-service';

setDispatcher(async (obj) => {
  // Your dispatch logic
  return await messageBus.publish(obj);
});
```

## Agent-Specific Instructions

**When modifying core logic (`index.ts`):**
- Preserve immutability patterns
- Maintain state isolation between calls
- Update all affected tests
- Verify no TypeScript errors
- Run full test suite before committing

**When adding features:**
- Follow existing patterns (proxy handlers, state management)
- Add tests first (TDD approach recommended)
- Update API.md with new functionality
- Add examples to examples.ts
- Update CHANGELOG.md

**When fixing bugs:**
- Add a failing test that reproduces the bug
- Fix the implementation
- Verify the test now passes
- Check for similar issues elsewhere
- Update documentation if behavior changed

**Performance Considerations:**
- Proxy overhead is minimal but avoid unnecessary proxy creation
- Keep state objects small and focused
- Use object spread for immutable updates
- Avoid synchronous blocking operations in dispatchers
