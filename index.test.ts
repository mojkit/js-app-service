import { describe, test, expect, beforeEach } from 'bun:test';
import app, { setDispatcher, resetDispatcher, type DispatchObject } from './index';

describe('app-service', () => {
  let capturedObject: DispatchObject | null = null;

  beforeEach(() => {
    capturedObject = null;
    // Set up a test dispatcher that captures the object
    setDispatcher(async (obj: DispatchObject) => {
      capturedObject = obj;
      return obj;
    });
  });

  describe('Basic Commands', () => {
    test('should create a basic command object', async () => {
      await app.MyContext.MyAggregate.myCommand({ foo: 'bar' });

      expect(capturedObject).toBeDefined();
      expect(capturedObject?.kind).toBe('command');
      expect(capturedObject?.namespace).toBe('MyContext.MyAggregate');
      expect((capturedObject as any)?.name).toBe('myCommand');
      expect((capturedObject as any)?.payload).toEqual({ foo: 'bar' });
      expect(capturedObject?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(capturedObject?.options).toEqual({});
    });

    test('should handle simple namespace', async () => {
      await app.Users.create({ name: 'John', email: 'john@example.com' });

      expect(capturedObject?.namespace).toBe('Users');
      expect((capturedObject as any)?.name).toBe('create');
      expect((capturedObject as any)?.payload).toEqual({ name: 'John', email: 'john@example.com' });
    });

    test('should handle deep namespace', async () => {
      await app.Domain.Context.Aggregate.SubAggregate.doSomething({ data: 'test' });

      expect(capturedObject?.namespace).toBe('Domain.Context.Aggregate.SubAggregate');
      expect((capturedObject as any)?.name).toBe('doSomething');
    });
  });

  describe('Commands with Aggregate ID', () => {
    test('should handle string aggregateId', async () => {
      await app.MyContext.MyAggregate('aggregate-123').myCommand({ foo: 'bar' });

      expect(capturedObject?.namespace).toBe('MyContext.MyAggregate');
      expect((capturedObject as any)?.name).toBe('myCommand');
      expect((capturedObject as any)?.payload).toEqual({ foo: 'bar' });
      expect(capturedObject?.options.aggregateId).toBe('aggregate-123');
    });

    test('should handle numeric aggregateId', async () => {
      await app.Users(12345).updateProfile({ name: 'Jane' });

      expect(capturedObject?.namespace).toBe('Users');
      expect((capturedObject as any)?.name).toBe('updateProfile');
      expect(capturedObject?.options.aggregateId).toBe(12345);
    });

    test('should distinguish between aggregateId and command payload', async () => {
      // This is aggregateId case (string argument)
      await app.Users('user-123').updateProfile({ name: 'John' });
      expect(capturedObject?.options.aggregateId).toBe('user-123');
      expect((capturedObject as any)?.name).toBe('updateProfile');

      // This is command case (object argument)
      capturedObject = null;
      await app.Users.create({ name: 'John', email: 'john@example.com' });
      expect(capturedObject?.options.aggregateId).toBeUndefined();
      expect((capturedObject as any)?.name).toBe('create');
    });
  });

  describe('Commands with Event Awaiting', () => {
    test('should handle single event await', async () => {
      await app.MyContext.MyAggregate.myCommand({ foo: 'bar' }).await('UserCreated');

      expect(capturedObject?.kind).toBe('command');
      expect((capturedObject as any)?.name).toBe('myCommand');
      expect(capturedObject?.options.events).toEqual(['UserCreated']);
    });

    test('should handle multiple events await', async () => {
      await app.MyContext.MyAggregate.myCommand({ foo: 'bar' }).await('UserCreated', 'EmailSent');

      expect(capturedObject?.options.events).toEqual(['UserCreated', 'EmailSent']);
    });

    test('should handle await with aggregateId', async () => {
      await app.MyContext.MyAggregate('agg-123').myCommand({ foo: 'bar' }).await('EventA', 'EventB');

      expect(capturedObject?.options.aggregateId).toBe('agg-123');
      expect(capturedObject?.options.events).toEqual(['EventA', 'EventB']);
    });

    test('should throw error when await called with no events', async () => {
      const commandPromise = app.Users.create({ name: 'John' });
      
      await expect(async () => {
        await (commandPromise as any).await();
      }).toThrow('At least one event name is required');
    });
  });

  describe('Query Chains', () => {
    test('should create basic query chain with explicit query name', async () => {
      await app.MyContext.MyAggregate.query.listUsers.filterBy({ active: true }).limit(10);

      expect(capturedObject?.kind).toBe('query');
      expect(capturedObject?.namespace).toBe('MyContext.MyAggregate');
      expect((capturedObject as any)?.name).toBe('listUsers');
      expect((capturedObject as any)?.payload).toEqual([
        { method: 'filterBy', args: [{ active: true }] },
        { method: 'limit', args: [10] },
      ]);
      expect(capturedObject?.options).toEqual({});
    });

    test('should handle query without arguments', async () => {
      await app.Users.query.getAll.execute();

      expect((capturedObject as any)?.name).toBe('getAll');
      expect((capturedObject as any)?.payload).toEqual([
        { method: 'execute' },
      ]);
    });

    test('should handle query with single argument on first method', async () => {
      await app.Products.query.search('laptop');

      expect((capturedObject as any)?.name).toBe('search');
      expect((capturedObject as any)?.payload).toEqual([
        { method: '', args: ['laptop'] },
      ]);
    });

    test('should handle query with aggregateId', async () => {
      await app.MyContext.MyAggregate('aggregate-123').query.getDetails.withRelations('orders');

      expect(capturedObject?.namespace).toBe('MyContext.MyAggregate');
      expect(capturedObject?.options.aggregateId).toBe('aggregate-123');
      expect((capturedObject as any)?.name).toBe('getDetails');
      expect((capturedObject as any)?.payload).toEqual([
        { method: 'withRelations', args: ['orders'] },
      ]);
    });

    test('should handle long query chains', async () => {
      await app.Orders.query
        .findAll()
        .where({ status: 'pending' })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .offset(100);

      expect((capturedObject as any)?.name).toBe('findAll');
      expect((capturedObject as any)?.payload).toEqual([
        { method: '', args: [] },
        { method: 'where', args: [{ status: 'pending' }] },
        { method: 'orderBy', args: ['createdAt', 'desc'] },
        { method: 'limit', args: [50] },
        { method: 'offset', args: [100] },
      ]);
    });

    test('should handle query with numeric aggregateId', async () => {
      await app.Users(999).query.getProfile.withStats();

      expect(capturedObject?.options.aggregateId).toBe(999);
      expect((capturedObject as any)?.name).toBe('getProfile');
      expect((capturedObject as any)?.payload).toEqual([
        { method: 'withStats' },
      ]);
    });

    test('should infer query name from first method when called directly', async () => {
      await app.UserManagement.query.getUserInfo('user-123');

      expect((capturedObject as any)?.name).toBe('getUserInfo');
      expect((capturedObject as any)?.payload).toEqual([
        { method: '', args: ['user-123'] },
      ]);
    });

    test('should handle inferred query name with chained methods', async () => {
      await app.UserManagement.query.getUserInfo('user-123').select('mobile');

      expect((capturedObject as any)?.name).toBe('getUserInfo');
      expect((capturedObject as any)?.payload).toEqual([
        { method: '', args: ['user-123'] },
        { method: 'select', args: ['mobile'] },
      ]);
    });

    test('should throw error when first method has more than one argument', async () => {
      await expect(async () => {
        await app.UserManagement.query.getUserInfo('user-123', 'extra-arg');
      }).toThrow('First method in query chain can only have one argument');
    });
  });
  describe('Error Cases', () => {
    test('should throw error when no command after namespace', async () => {
      await expect(async () => {
        await (app.MyContext.MyAggregate as any)();
      }).toThrow();
    });

    test('should throw error when no command after aggregateId', async () => {
      await expect(async () => {
        await app.MyContext.MyAggregate('id-123');
      }).toThrow('No command or query specified after aggregateId');
    });

    test('should throw error when aggregateId called without value', async () => {
      await expect(async () => {
        await (app.MyContext.MyAggregate() as any).myCommand({ foo: 'bar' });
      }).toThrow();
    });

    test('should throw error when query started without namespace', async () => {
      expect(() => {
        (app as any).query;
      }).toThrow('Cannot start query without a namespace');
    });

    test('should throw error when command executed without namespace', async () => {
      await expect(async () => {
        await (app as any)({ foo: 'bar' });
      }).toThrow();
    });
  });

  describe('UUID Generation', () => {
    test('should generate unique UUIDs for each call', async () => {
      await app.Users.create({ name: 'User1' });
      const id1 = capturedObject?.id;

      await app.Users.create({ name: 'User2' });
      const id2 = capturedObject?.id;

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test('should generate valid UUID v4 format', async () => {
      await app.Users.create({ name: 'Test' });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(capturedObject?.id).toMatch(uuidRegex);
    });
  });

  describe('Dispatcher', () => {
    test('should use custom dispatcher', async () => {
      let customCalled = false;
      setDispatcher(async (obj) => {
        customCalled = true;
        return { success: true, data: obj };
      });

      const result = await app.Users.create({ name: 'Test' });

      expect(customCalled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data.kind).toBe('command');
    });

    test('should reset dispatcher to default', async () => {
      setDispatcher(async () => ({ custom: true }));
      resetDispatcher();

      const result = await app.Users.create({ name: 'Test' });

      expect(result.kind).toBe('command');
      expect((result as any).custom).toBeUndefined();
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle command with nested payload', async () => {
      await app.Orders.create({
        customer: { id: 123, name: 'John' },
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        metadata: { source: 'web', campaign: 'summer2024' },
      });

      expect((capturedObject as any)?.payload).toEqual({
        customer: { id: 123, name: 'John' },
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        metadata: { source: 'web', campaign: 'summer2024' },
      });
    });

    test('should handle query with complex filter arguments', async () => {
      await app.Products.query.search({
        category: 'electronics',
        priceRange: { min: 100, max: 1000 },
        tags: ['sale', 'featured'],
      });

      expect((capturedObject as any)?.payload).toEqual([
        {
          method: '',
          args: [
            {
              category: 'electronics',
              priceRange: { min: 100, max: 1000 },
              tags: ['sale', 'featured'],
            },
          ],
        },
      ]);
    });

    test('should maintain state isolation between calls', async () => {
      // First call with aggregateId
      await app.Users('user-1').update({ name: 'Alice' });
      const firstAggregateId = capturedObject?.options.aggregateId;

      // Second call without aggregateId
      await app.Users.create({ name: 'Bob' });
      const secondAggregateId = capturedObject?.options.aggregateId;

      expect(firstAggregateId).toBe('user-1');
      expect(secondAggregateId).toBeUndefined();
    });

    test('should handle await without affecting subsequent calls', async () => {
      // Call with await
      await app.Users.create({ name: 'User1' }).await('UserCreated');
      const firstEvents = capturedObject?.options.events;

      // Call without await
      await app.Users.create({ name: 'User2' });
      const secondEvents = capturedObject?.options.events;

      expect(firstEvents).toEqual(['UserCreated']);
      expect(secondEvents).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty object payload', async () => {
      await app.Users.initialize({});

      expect((capturedObject as any)?.payload).toEqual({});
    });

    test('should handle query method with array arguments', async () => {
      await app.Users.query.findByIds([1, 2, 3, 4, 5]);

      expect((capturedObject as any)?.payload).toEqual([
        { method: '', args: [[1, 2, 3, 4, 5]] },
      ]);

    });
    test('should handle special characters in namespace', async () => {
      await app.My_Context.My_Aggregate.myCommand({ test: true });

      expect(capturedObject?.namespace).toBe('My_Context.My_Aggregate');
    });
  });
});
