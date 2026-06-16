# app-service

A TypeScript package that converts fluent method chains into structured command and query objects.

## Installation

```bash
bun install @wave/app-service
```

## Overview

This package provides a proxy-based API that converts intuitive method chains into standardized command and query
objects that can be dispatched over a message bus (e.g., RabbitMQ) or websocket.

## Usage

### Basic Command

```typescript
import app from '@wave/app-service';

// Method chain
await app.MyContext.MyAggregate.myCommand({ foo: 'bar' });

// Produces:
{
  id: '550e8400-e29b-41d4-a716-446655440000', // random UUID
  namespace: 'MyContext.MyAggregate',
  kind: 'command',
  name: 'myCommand',
  payload: { foo: 'bar' },
  options: {}
}
```

### Command with Aggregate ID

```typescript
await app.MyContext.MyAggregate('aggregate-123').myCommand({ foo: 'bar' });

// Produces:
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  namespace: 'MyContext.MyAggregate',
  kind: 'command',
  name: 'myCommand',
  payload: { foo: 'bar' },
  options: {
    aggregateId: 'aggregate-123'
  }
}
```

### Command with Event Awaiting

```typescript
await app.MyContext.MyAggregate.myCommand({ foo: 'bar' }).await('UserCreated', 'EmailSent');

// Produces:
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  namespace: 'MyContext.MyAggregate',
  kind: 'command',
  name: 'myCommand',
  payload: { foo: 'bar' },
  options: {
    events: ['UserCreated', 'EmailSent']
  }
}
```

**Note:** When `.await()` is used, the command waits for the specified event(s).
Without `.await()`, it follows the RPC pattern and waits for a direct response.

### Query Chain

```typescript
await app.MyContext.MyAggregate.query.listUsers.filterBy({ active: true }).limit(10);

// Produces:
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  namespace: 'MyContext.MyAggregate',
  kind: 'query',
  payload: [
    { name: 'listUsers' },
    { name: 'filterBy', args: [{ active: true }] },
    { name: 'limit', args: [10] }
  ],
  options: {}
}
```

### Query with Aggregate ID

```typescript
await app.MyContext.MyAggregate('aggregate-123').query.getDetails.withRelations('orders');

// Produces:
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  namespace: 'MyContext.MyAggregate',
  kind: 'query',
  payload: [
    { name: 'getDetails' },
    { name: 'withRelations', args: ['orders'] }
  ],
  options: {
    aggregateId: 'aggregate-123'
  }
}
```

## API Reference

### Namespace Structure

app.<Namespace>.<Command|Query>

- **Namespace**: Can be a simple string (e.g., `Users`) or a dotted path (e.g., `MyContext.MyAggregate`). The entire path is treated as the namespace.
- **Aggregate ID**: Optional. Called as a function with a string or number argument.
- **Command**: A method call with a single object payload.
- **Query**: Starts with the literal keyword `query`, followed by a chain of method calls.

### Command Pattern

```typescript
app.<Namespace>.<commandName>(payload)
app.<Namespace>.<commandName>(payload).await(...eventNames)
app.<Namespace>(aggregateId).<commandName>(payload)
app.<Namespace>(aggregateId).<commandName>(payload).await(...eventNames)
```

**Parameters:**
- `aggregateId`: `string | number` - Optional identifier for the aggregate instance
- `payload`: `object` - Single object containing command data
- `eventNames`: `string[]` - Optional list of events to wait for

### Query Pattern

```typescript
app.<Namespace>.query.<method1>().<method2>(args)...
app.<Namespace>(aggregateId).query.<method1>().<method2>(args)...
```

**Query chains:**
- Start with the literal keyword `query`
- Each subsequent can be string or method
- Each subsequent method call is captured with its arguments
- Methods or strings without arguments are captured as `{ name: 'methodName' }` or `{ name: 'string' }`
- Methods with arguments are captured as `{ name: 'methodName', args: [...] }`

### Output Object Structure

#### Command Object

```typescript
{
  id: string;              // Auto-generated UUID
  namespace: string;       // The full namespace path
  kind: 'command';
  name: string;            // The command method name
  payload: object;         // The command payload
  options: {
    aggregateId?: string | number;
    events?: string[];
  }
}
```

#### Query Object

  ```typescript
{
  id: string;              // Auto-generated UUID
  namespace: string;       // The full namespace path
  kind: 'query';
  payload: Array<{
    name: string;
    args?: any[];
  }>;
  options: {
    aggregateId?: string | number;
  }
}
```

## Ambiguity Resolution

When a method is called with an argument immediately after the namespace:

```typescript
app.MyContext.MyAggregate(arg)
```

- If `arg` is a **string or number**: treat it as `aggregateId`, and the next method call is the command/query
- If `arg` is an **object**: treat the method name as the command name and `arg` as the payload

**Examples:**

```typescript
// aggregateId case
app.Users('user-123').updateProfile({ name: 'John' });
// → aggregateId: 'user-123', command: 'updateProfile'

// command case
app.Users.create({ name: 'John', email: 'john@example.com' });
// → command: 'create', payload: { name: 'John', email: '...' }
```

## Error Cases

The following patterns are **illegal** and will throw errors:

```typescript
// No command after namespace
app.MyContext.MyAggregate();

// No command or query after aggregateId
app.MyContext.MyAggregate('id-123');

// aggregateId without value
app.MyContext.MyAggregate().myCommand({ foo: 'bar' });
```

## TypeScript Support

Full TypeScript support with type inference for namespaces, commands, and queries (types to be defined based on your domain model).

## License

MIT
