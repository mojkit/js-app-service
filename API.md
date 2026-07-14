# API Documentation

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Type Definitions](#type-definitions)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)

## Installation

```bash
bun install @mojkit/app-service
```

## Core Concepts

### Command Pattern

Commands represent actions that modify state. They follow this structure:

```typescript
app.<Namespace>.<commandName>(payload)
```

### Query Pattern

Queries represent read operations. They start with the `query` keyword and support method chaining:

```typescript
app.<Namespace>.query.<method1>().<method2>(args)...
```

### Namespace

A namespace is a hierarchical identifier for your domain context. It can be:
- Simple: `Users`, `Orders`, `Products`
- Hierarchical: `MyContext.MyAggregate`, `Ecommerce.Orders`

### Aggregate ID

An optional identifier for a specific aggregate instance:

```typescript
app.<Namespace>('aggregate-id').<command|query>
```

## API Reference

### Default Export: `app`

The main proxy object that provides the fluent API.

```typescript
import app from '@mojkit/app-service';
```

### Commands

#### Basic Command

```typescript
await app.Users.create({ name: 'John', email: 'john@example.com' });
```

**Output:**
```json
{
  "id": "uuid-v4",
  "namespace": "Users",
  "kind": "command",
  "name": "create",
  "payload": { "name": "John", "email": "john@example.com" },
  "options": {}
}
```

#### Command with Aggregate ID

```typescript
await app.Users('user-123').updateProfile({ name: 'Jane' });
```

**Output:**
```json
{
  "id": "uuid-v4",
  "namespace": "Users",
  "kind": "command",
  "name": "updateProfile",
  "payload": { "name": "Jane" },
  "options": {
    "aggregateId": "user-123"
  }
}
```

#### Command with Event Awaiting

```typescript
await app.Users.create({ name: 'John' }).await('UserCreated', 'EmailSent');
```

**Output:**
```json
{
  "id": "uuid-v4",
  "namespace": "Users",
  "kind": "command",
  "name": "create",
  "payload": { "name": "John" },
  "options": {
    "events": ["UserCreated", "EmailSent"]
  }
}
```

**Note:** When `.await()` is used, the command waits for the specified event(s). Without `.await()`, it follows the RPC pattern and waits for a direct response.

### Queries

#### Basic Query Chain

```typescript
await app.Users.query.findAll().where({ active: true }).limit(10);
```

**Output:**
```json
{
  "id": "uuid-v4",
  "namespace": "Users",
  "kind": "query",
  "payload": [
    { "name": "findAll" },
    { "name": "where", "args": [{ "active": true }] },
    { "name": "limit", "args": [10] }
  ],
  "options": {}
}
```

#### Query with Aggregate ID

```typescript
await app.Users('user-123').query.getProfile().withRelations('orders');
```

**Output:**
```json
{
  "id": "uuid-v4",
  "namespace": "Users",
  "kind": "query",
  "payload": [
    { "name": "getProfile" },
    { "name": "withRelations", "args": ["orders"] }
  ],
  "options": {
    "aggregateId": "user-123"
  }
}
```

### Dispatcher Functions

#### `setDispatcher(dispatcher: Dispatcher)`

Sets a custom dispatcher function that will be called with the generated command/query object.

```typescript
import { setDispatcher } from '@mojkit/app-service';

setDispatcher(async (obj) => {
  // Send to message bus, websocket, etc.
  await messageBus.publish(obj);
  return { success: true };
});
```

**Parameters:**
- `dispatcher`: A function that takes a `DispatchObject` and returns a `Promise<any>`

#### `resetDispatcher()`

Resets the dispatcher to the default (which just returns the object).

```typescript
import { resetDispatcher } from '@mojkit/app-service';

resetDispatcher();
```

## Type Definitions

### `CommandObject`

```typescript
interface CommandObject {
  id: string;              // Auto-generated UUID v4
  namespace: string;       // The full namespace path
  kind: 'command';
  name: string;            // The command method name
  payload: object;         // The command payload
  options: {
    aggregateId?: string | number;
    events?: string[];
  };
}
```

### `QueryObject`

```typescript
interface QueryObject {
  id: string;              // Auto-generated UUID v4
  namespace: string;       // The full namespace path
  kind: 'query';
  payload: Array<{
    name: string;
    args?: any[];
  }>;
  options: {
    aggregateId?: string | number;
  };
}
```

### `DispatchObject`

```typescript
type DispatchObject = CommandObject | QueryObject;
```

### `Dispatcher`

```typescript
type Dispatcher = (obj: DispatchObject) => Promise<any>;
```

## Advanced Usage

### Custom Dispatcher with RabbitMQ

```typescript
import { setDispatcher } from '@mojkit/app-service';
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

setDispatcher(async (obj) => {
  const routingKey = `${obj.namespace}.${obj.kind}`;
  const message = Buffer.from(JSON.stringify(obj));
  
  channel.publish('app-exchange', routingKey, message, {
    persistent: true,
    messageId: obj.id,
  });
  
  // Wait for response if not using event awaiting
  if (obj.kind === 'command' && !obj.options.events) {
    return await waitForResponse(obj.id);
  }
  
  return { dispatched: true, id: obj.id };
});
```

### Custom Dispatcher with WebSocket

```typescript
import { setDispatcher } from '@mojkit/app-service';

const ws = new WebSocket('ws://localhost:8080');

setDispatcher(async (obj) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000);
    
    const handler = (event: MessageEvent) => {
      const response = JSON.parse(event.data);
      if (response.id === obj.id) {
        clearTimeout(timeout);
        ws.removeEventListener('message', handler);
        resolve(response);
      }
    };
    
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify(obj));
  });
});
```

### Type-Safe Namespaces (Optional)

You can create type-safe wrappers for your specific domain:

```typescript
import app from '@mojkit/app-service';

// Define your domain types
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
}

// Create typed wrappers
const Users = {
  create: (payload: CreateUserPayload) => 
    app.Users.create(payload),
  
  update: (id: string, payload: Partial<CreateUserPayload>) =>
    app.Users(id).updateProfile(payload),
  
  query: {
    findAll: () => app.Users.query.findAll(),
    findById: (id: string) => app.Users(id).query.getProfile(),
  },
};

// Usage with type safety
await Users.create({ name: 'John', email: 'john@example.com' });
await Users.update('user-123', { name: 'Jane' });
```

## Error Handling

### Common Errors

#### No Command After Namespace

```typescript
// ❌ Error: No command specified after namespace
await app.Users();
```

#### No Command After Aggregate ID

```typescript
// ❌ Error: No command or query specified after aggregateId
await app.Users('user-123');
```

#### Query Without Namespace

```typescript
// ❌ Error: Cannot start query without a namespace
app.query;
```

#### Empty Event List in await()

```typescript
// ❌ Error: At least one event name is required for .await()
await app.Users.create({ name: 'John' }).await();
```

### Best Practices

1. **Always provide a namespace**: Commands and queries must have at least one namespace segment.

2. **Use aggregate IDs for entity-specific operations**: When operating on a specific entity, use the aggregate ID pattern.

3. **Choose between RPC and event-driven patterns**: Use `.await()` for event-driven patterns, omit it for RPC.

4. **Handle dispatcher errors**: Always wrap dispatcher calls in try-catch blocks.

```typescript
try {
  const result = await app.Users.create({ name: 'John' });
  console.log('Success:', result);
} catch (error) {
  console.error('Failed to create user:', error);
}
```

5. **Set up dispatcher early**: Configure your dispatcher at application startup.

```typescript
// At app initialization
setDispatcher(myCustomDispatcher);

// Later in your code
await app.Users.create({ name: 'John' });
```

## Examples

See `examples.ts` for comprehensive usage examples including:
- Basic commands and queries
- Aggregate ID usage
- Event awaiting
- Custom dispatchers
- Real-world scenarios (user management, e-commerce)
- Error handling

Run examples:
```bash
bun run examples
```
