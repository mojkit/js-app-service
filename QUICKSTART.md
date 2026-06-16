# Quick Start Guide

Get up and running with `@wave/app-service` in 5 minutes.

## Installation

```bash
bun install @wave/app-service
```

## Basic Usage

### 1. Import the package

```typescript
import app from '@wave/app-service';
```

### 2. Execute a command

```typescript
// Create a user
const result = await app.Users.create({
  name: 'John Doe',
  email: 'john@example.com'
});

console.log(result);
// Output:
// {
//   id: "uuid-v4",
//   namespace: "Users",
//   kind: "command",
//   name: "create",
//   payload: { name: "John Doe", email: "john@example.com" },
//   options: {}
// }
```

### 3. Execute a query

```typescript
// Find all active users
const users = await app.Users.query
  .findAll()
  .where({ active: true })
  .limit(10);

console.log(users);
// Output:
// {
//   id: "uuid-v4",
//   namespace: "Users",
//   kind: "query",
//   payload: [
//     { name: "findAll" },
//     { name: "where", args: [{ active: true }] },
//     { name: "limit", args: [10] }
//   ],
//   options: {}
// }
```

### 4. Use aggregate IDs

```typescript
// Update a specific user
await app.Users('user-123').updateProfile({
  name: 'Jane Doe'
});

// Query a specific user
await app.Users('user-123').query.getProfile();
```

### 5. Wait for events

```typescript
// Create user and wait for events
await app.Users.create({
  name: 'John Doe',
  email: 'john@example.com'
}).await('UserCreated', 'EmailSent');
```

## Set Up a Custom Dispatcher

By default, the package just returns the generated object. To actually dispatch commands/queries, set up a custom dispatcher:

```typescript
import { setDispatcher } from '@wave/app-service';

// Example: Send to a message bus
setDispatcher(async (obj) => {
  console.log('Dispatching:', obj.kind, obj.namespace);
  
  // Your dispatch logic here
  // e.g., await messageBus.publish(obj);
  // e.g., await websocket.send(JSON.stringify(obj));
  // e.g., await fetch('/api/dispatch', { method: 'POST', body: JSON.stringify(obj) });
  
  return { success: true, id: obj.id };
});

// Now all commands/queries will use your dispatcher
await app.Users.create({ name: 'John' });
```

## Common Patterns

### Command Pattern

```typescript
// Simple command
await app.Orders.create({ items: [...], total: 99.99 });

// Command with aggregate ID
await app.Orders('order-123').cancel({ reason: 'Customer request' });

// Command with event awaiting
await app.Orders.create({ items: [...] })
  .await('OrderCreated', 'PaymentProcessed');
```

### Query Pattern

```typescript
// Simple query
await app.Products.query.findAll();

// Query with filters
await app.Products.query
  .search('laptop')
  .filterBy({ category: 'electronics', inStock: true })
  .orderBy('price', 'asc')
  .limit(20);

// Query with aggregate ID
await app.Products('prod-123').query.getDetails().withReviews();
```

### Hierarchical Namespaces

```typescript
// Use dotted namespaces for domain organization
await app.Ecommerce.Orders.create({ ... });
await app.UserManagement.Profiles.update({ ... });
await app.Analytics.Reports.query.generate('sales');
```

## Next Steps

- Read the full [API Documentation](./API.md)
- Check out [Examples](./examples.ts) for real-world scenarios
- Review the [README](./README.md) for detailed specifications

## Run Tests

```bash
bun test
```

## Run Examples

```bash
bun run examples
```

## Need Help?

- Check the [API Documentation](./API.md) for detailed reference
- Review [examples.ts](./examples.ts) for usage patterns
- See [README.md](./README.md) for complete specifications
