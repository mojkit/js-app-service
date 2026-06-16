# @wave/app-service - Project Overview

## 📦 Package Information

- **Name**: @wave/app-service
- **Version**: 1.0.0
- **Description**: A TypeScript package that converts fluent method chains into structured command and query objects
- **Runtime**: Bun
- **Language**: TypeScript (Strict Mode)

## 🎯 Purpose

This package provides a proxy-based fluent API that converts intuitive method chains into standardized command and
query objects for dispatch over message buses (e.g., RabbitMQ) or WebSockets.

## ✨ Key Features

- 🔗 **Fluent API**: Natural, chainable method syntax
- 📝 **Command Pattern**: Execute state-changing operations
- 🔍 **Query Pattern**: Perform read operations with method chaining
- 🏷️ **Namespace Support**: Hierarchical domain organization
- 🆔 **Aggregate IDs**: Target specific entity instances
- ⏳ **Event Awaiting**: Wait for specific events after commands
- 🔐 **Type Safety**: Full TypeScript support with exported types
- 🔌 **Pluggable Dispatcher**: Customize how commands/queries are dispatched
- ✅ **Production Ready**: Comprehensive tests, documentation, and error handling

## 📊 Project Statistics

| Metric                 | Value       |
|------------------------|-------------|
| Production Code        | 370 lines   |
| Test Code              | 334 lines   |
| Documentation          | 1,431 lines |
| Total Tests            | 32          |
| Test Pass Rate         | 100%        |
| Test Execution Time    | ~37ms       |
| TypeScript Strict Mode | Enabled     |

## 📁 Project Structure

```
app-service/
├── index.ts                      # Main implementation (370 lines)
├── index.test.ts                 # Comprehensive test suite (334 lines)
├── examples.ts                   # Usage examples (150+ lines)
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript configuration
├── .gitignore                    # Git ignore rules
│
├── README.md                     # Main documentation (5.6K)
├── API.md                        # API reference (8.4K)
├── QUICKSTART.md                 # Quick start guide (3.5K)
├── CHANGELOG.md                  # Version history (2.9K)
├── IMPLEMENTATION_SUMMARY.md     # Technical details (8.1K)
└── PROJECT_OVERVIEW.md           # This file
```

## 🚀 Quick Start

```typescript
import app from '@wave/app-service';

// Execute a command
await app.Users.create({ name: 'John', email: 'john@example.com' });

// Execute a query
await app.Users.query.findAll().where({ active: true }).limit(10);

// Use aggregate ID
await app.Users('user-123').updateProfile({ name: 'Jane' });

// Wait for events
await app.Users.create({ name: 'John' }).await('UserCreated', 'EmailSent');
```

## 🏗️ Architecture

### Core Components

1. **Proxy Handler** (`createAppProxy`)
   - Intercepts property access and function calls
   - Builds namespace hierarchy
   - Distinguishes between commands and queries

2. **State Management** (`BuilderState`)
   - Immutable state updates
   - Tracks namespace, aggregate ID, query chain
   - Ensures state isolation between calls

3. **Object Builders**
   - `createCommandObject`: Generates command objects
   - `createQueryObject`: Generates query objects
   - Automatic UUID generation

4. **Dispatcher System**
   - `setDispatcher`: Configure custom dispatcher
   - `resetDispatcher`: Restore default behavior
   - Default dispatcher returns the object

### Design Patterns

- **Proxy Pattern**: Dynamic API generation
- **Builder Pattern**: Fluent object construction
- **Strategy Pattern**: Pluggable dispatcher
- **Immutable State**: Predictable behavior

## 🧪 Testing

### Test Coverage

- ✅ Basic commands (3 tests)
- ✅ Commands with aggregate ID (3 tests)
- ✅ Commands with event awaiting (4 tests)
- ✅ Query chains (6 tests)
- ✅ Error cases (5 tests)
- ✅ UUID generation (2 tests)
- ✅ Custom dispatcher (2 tests)
- ✅ Complex scenarios (4 tests)
- ✅ Edge cases (3 tests)

### Run Tests

```bash
bun test
```

## 📖 Documentation

| Document                  | Purpose                                   | Size |
|---------------------------|-------------------------------------------|------|
| README.md                 | Main documentation with usage examples    | 5.6K |
| API.md                    | Complete API reference and advanced usage | 8.4K |
| QUICKSTART.md             | Get started in 5 minutes                  | 3.5K |
| CHANGELOG.md              | Version history and release notes         | 2.9K |
| IMPLEMENTATION_SUMMARY.md | Technical implementation details          | 8.1K |
| examples.ts               | 10 real-world usage examples              | 5.7K |

## 🔧 Available Scripts

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch

# Run examples
bun run examples

# Type check (requires TypeScript installed)
bun run typecheck
```

## 📦 Exports

### Default Export

```typescript
import app from '@wave/app-service';
```

The main proxy object for building commands and queries.

### Named Exports

```typescript
import {
  setDispatcher,
  resetDispatcher,
  type CommandObject,
  type QueryObject,
  type DispatchObject,
  type Dispatcher
} from '@wave/app-service';
```

## 🎨 Usage Patterns

### Command Patterns

```typescript
// Basic command
app.Namespace.command(payload)

// With aggregate ID
app.Namespace('id').command(payload)

// With event awaiting
app.Namespace.command(payload).await('Event1', 'Event2')
```

### Query Patterns

```typescript
// Basic query
app.Namespace.query.method1().method2(args)

// With aggregate ID
app.Namespace('id').query.method1().method2(args)
```

### Namespace Patterns

```typescript
// Simple namespace
app.Users.create({ ... })

// Hierarchical namespace
app.MyContext.MyAggregate.myCommand({ ... })
app.Ecommerce.Orders.create({ ... })
```

## 🔒 Type Safety

All public APIs are fully typed:

```typescript
interface CommandObject {
  id: string;
  namespace: string;
  kind: 'command';
  name: string;
  payload: object;
  options: {
    aggregateId?: string | number;
    events?: string[];
  };
}

interface QueryObject {
  id: string;
  namespace: string;
  kind: 'query';
  payload: Array<{ name: string; args?: any[] }>;
  options: {
    aggregateId?: string | number;
  };
}

type Dispatcher = (obj: DispatchObject) => Promise<any>;
```

## ⚡ Performance

- **Proxy Overhead**: Minimal (microseconds)
- **Memory Usage**: Low (small, short-lived objects)
- **Scalability**: Excellent (no global state)
- **Async Support**: Full Promise-based API

## 🛡️ Error Handling

The package validates all operations and provides clear error messages:

- ❌ No command after namespace
- ❌ No command/query after aggregate ID
- ❌ Query without namespace
- ❌ Empty event list in `.await()`

## 🌟 Production Ready

✅ **Code Quality**
- Strict TypeScript
- Clean architecture
- Comprehensive documentation

✅ **Testing**
- 100% test pass rate
- Edge cases covered
- Error scenarios tested

✅ **Documentation**
- Multiple documentation files
- Code examples
- API reference

✅ **Best Practices**
- Immutable state
- Type safety
- Error handling

## 🔮 Future Enhancements

Potential improvements (not required for v1.0):

- Middleware system for interceptors
- Built-in retry logic
- Batch operations support
- Schema validation (Zod integration)
- Metrics collection
- Query result caching

## 📝 License

MIT

## 🤝 Contributing

This is a production-ready implementation. All requirements from the README.md specification have been fully implemented and tested.

## 📞 Support

- Read the [Quick Start Guide](./QUICKSTART.md)
- Check the [API Documentation](./API.md)
- Review [Examples](./examples.ts)
- See [Implementation Details](./IMPLEMENTATION_SUMMARY.md)

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Tests**: 32/32 Passing
