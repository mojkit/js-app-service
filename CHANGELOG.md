# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added

- Initial release of @wave/app-service
- Proxy-based fluent API for building command and query objects
- Support for hierarchical namespaces (e.g., `MyContext.MyAggregate`)
- Command pattern with single object payload
- Query pattern with method chaining
- Aggregate ID support for entity-specific operations
- Event awaiting pattern with `.await()` method
- Automatic UUID v4 generation for all commands and queries
- Customizable dispatcher function via `setDispatcher()`
- Default dispatcher that returns the generated object
- Full TypeScript support with exported types:
  - `CommandObject`
  - `QueryObject`
  - `DispatchObject`
  - `Dispatcher`
- Comprehensive error handling and validation:
  - Validates namespace presence
  - Validates command/query after aggregate ID
  - Validates event list in `.await()`
  - Clear error messages for common mistakes
- State isolation between calls
- Production-ready implementation with:
  - Strict TypeScript configuration
  - Comprehensive test suite (32 tests, 100% pass rate)
  - Example implementations
  - Full API documentation

### Features

#### Command Pattern
- Basic commands: `app.Namespace.command(payload)`
- Commands with aggregate ID: `app.Namespace('id').command(payload)`
- Commands with event awaiting: `app.Namespace.command(payload).await('Event1', 'Event2')`

#### Query Pattern
- Basic queries: `app.Namespace.query.method1().method2(args)`
- Queries with aggregate ID: `app.Namespace('id').query.method1().method2(args)`
- Support for methods with and without arguments
- Automatic argument capture in query chain

#### Dispatcher System
- Pluggable dispatcher architecture
- `setDispatcher()` for custom implementations
- `resetDispatcher()` to restore default behavior
- Support for message bus, WebSocket, HTTP, and other transports

### Documentation

- Comprehensive README.md with usage examples
- Detailed API.md with full API reference
- examples.ts with 10 real-world examples
- Inline code documentation with JSDoc comments
- Type definitions for all public APIs

### Testing

- 32 comprehensive test cases covering:
  - Basic commands and queries
  - Aggregate ID handling
  - Event awaiting
  - Query chains
  - Error cases
  - UUID generation
  - Custom dispatchers
  - Complex scenarios
  - Edge cases
- 100% test pass rate
- Tests for state isolation and proper cleanup

### Developer Experience

- Clean, intuitive fluent API
- Full TypeScript type safety
- Helpful error messages
- Zero runtime dependencies (except crypto for UUID)
- Works with Bun runtime
- Fast execution and testing

[1.0.0]: https://github.com/wave/app-service/releases/tag/v1.0.0
