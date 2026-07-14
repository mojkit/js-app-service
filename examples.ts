/**
 * Examples demonstrating the usage of @mojkit/app-service
 */

import app, { setDispatcher, type DispatchObject } from './index';

// Example 1: Basic Command
async function basicCommand() {
  console.log('Example 1: Basic Command');
  const result = await app.MyContext.MyAggregate.myCommand({ foo: 'bar' });
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 2: Command with Aggregate ID
async function commandWithAggregateId() {
  console.log('Example 2: Command with Aggregate ID');
  const result = await app.MyContext.MyAggregate('aggregate-123').myCommand({ foo: 'bar' });
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 3: Command with Event Awaiting
async function commandWithEventAwaiting() {
  console.log('Example 3: Command with Event Awaiting');
  const result = await app.MyContext.MyAggregate.myCommand({ foo: 'bar' }).await('UserCreated', 'EmailSent');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 4: Query Chain
async function queryChain() {
  console.log('Example 4: Query Chain');
  const result = await app.MyContext.MyAggregate.query.listUsers.filterBy({ active: true }).limit(10);
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 5: Query with Aggregate ID
async function queryWithAggregateId() {
  console.log('Example 5: Query with Aggregate ID');
  const result = await app.MyContext.MyAggregate('aggregate-123').query.getDetails.withRelations('orders');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 6: Custom Dispatcher
async function customDispatcher() {
  console.log('Example 6: Custom Dispatcher');

  // Set up a custom dispatcher that simulates sending to a message bus
  setDispatcher(async (obj: DispatchObject) => {
    console.log('Dispatching to message bus:', obj.kind, obj.namespace);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock response
    return {
      success: true,
      messageId: obj.id,
      timestamp: new Date().toISOString(),
    };
  });

  const result = await app.Users.create({ name: 'John Doe', email: 'john@example.com' });
  console.log('Response:', JSON.stringify(result, null, 2));
  console.log('');
}

// Example 7: Real-world User Management
async function userManagement() {
  console.log('Example 7: Real-world User Management');

  // Create a user
  console.log('Creating user...');
  const createResult = await app.UserManagement.Users.create({
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'admin',
  });
  console.log(JSON.stringify(createResult, null, 2));

  // Update user profile
  console.log('\nUpdating user profile...');
  const updateResult = await app.UserManagement.Users('user-123').updateProfile({
    name: 'Alice Johnson',
    phone: '+1234567890',
  });
  console.log(JSON.stringify(updateResult, null, 2));

  // Query users
  console.log('\nQuerying active users...');
  const queryResult = await app.UserManagement.Users.query
    .findAll()
    .where({ active: true, role: 'admin' })
    .orderBy('createdAt', 'desc')
    .limit(20);
  console.log(JSON.stringify(queryResult, null, 2));
  console.log('');
}

// Example 8: E-commerce Order Processing
async function orderProcessing() {
  console.log('Example 8: E-commerce Order Processing');

  // Create an order with event awaiting
  console.log('Creating order and waiting for events...');
  const orderResult = await app.Ecommerce.Orders.createOrder({
    customerId: 'cust-456',
    items: [
      { productId: 'prod-1', quantity: 2, price: 29.99 },
      { productId: 'prod-2', quantity: 1, price: 49.99 },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'Springfield',
      country: 'USA',
    },
  }).await('OrderCreated', 'PaymentProcessed', 'InventoryReserved');

  console.log(JSON.stringify(orderResult, null, 2));
  console.log('');
}

// Example 9: Complex Query with Multiple Filters
async function complexQuery() {
  console.log('Example 9: Complex Query with Multiple Filters');

  const result = await app.Analytics.Reports.query
    .generateReport('sales')
    .filterBy({
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      region: 'North America',
      productCategories: ['electronics', 'accessories'],
    })
    .groupBy('month')
    .aggregate(['sum', 'avg', 'count'])
    .format('json');

  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Example 10: Error Handling
async function errorHandling() {
  console.log('Example 10: Error Handling');

  try {
    // This will throw an error - no command after aggregateId
    await app.Users('user-123');
  } catch (error) {
    console.log('Caught expected error:', (error as Error).message);
  }

  try {
    // This will throw an error - query without namespace
    (app as any).query;
  } catch (error) {
    console.log('Caught expected error:', (error as Error).message);
  }

  console.log('');
}

// Run all examples
async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Running @mojkit/app-service Examples');
  console.log('='.repeat(60));
  console.log('');

  await basicCommand();
  await commandWithAggregateId();
  await commandWithEventAwaiting();
  await queryChain();
  await queryWithAggregateId();
  await customDispatcher();
  await userManagement();
  await orderProcessing();
  await complexQuery();
  await errorHandling();

  console.log('='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60));
}

// Run if executed directly
if (import.meta.main) {
  runAllExamples().catch(console.error);
}
