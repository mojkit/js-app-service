import { randomUUID } from 'crypto';

/**
 * Event listener configuration for side-effect handlers.
 * These listeners receive events but don't affect RPC promise resolution.
 */
export interface EventListener {
  /** Name of the event to listen for */
  eventName: string;

  /** Handler function called when the event is received */
  handler: (payload: any) => void | Promise<void>;

  /** Optional timeout for this specific listener (in milliseconds) */
  timeoutMs?: number;
}

/**
 * Represents a command object that will be dispatched
 */
export interface CommandObject {
  id: string;
  namespace: string;
  kind: 'command';
  name: string;
  payload: object;
  options: {
    aggregateId?: string | number;
    events?: string[];
    listeners?: EventListener[];
  };
}

/**
 * Represents a query object that will be dispatched
 */
export interface QueryObject {
  id: string;
  namespace: string;
  kind: 'query';
  name: string;
  payload: Array<{
    method: string;
    args?: any[];
  }>;
  options: {
    aggregateId?: string | number;
  };
}

/**
 * Union type for all dispatchable objects
 */
export type DispatchObject = CommandObject | QueryObject;

/**
 * Internal state for building command/query objects
 */
interface BuilderState {
  namespace: string[];
  aggregateId?: string | number;
  isQuery: boolean;
  queryChain: Array<{ method: string; args?: any[] }>;
  queryName?: string;
  awaitEvents?: string[];
  listeners?: EventListener[];
}

/**
 * Symbol to mark the proxy as awaitable
 */
const AWAITABLE_COMMAND = Symbol('AWAITABLE_COMMAND');

/**
 * Interface for command result with await capability
 */
interface AwaitableCommand extends Promise<any> {
  await(...events: string[]): AwaitableCommand;
  on(eventName: string, handler: (payload: any) => void | Promise<void>, options?: { timeoutMs?: number }): AwaitableCommand;
  [AWAITABLE_COMMAND]: true;
}

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
    options: {
      ...(state.aggregateId !== undefined && { aggregateId: state.aggregateId }),
      ...(state.awaitEvents && state.awaitEvents.length > 0 && { events: state.awaitEvents }),
      ...(state.listeners && state.listeners.length > 0 && { listeners: state.listeners }),
    },
  };
}

/**
/**
 * Creates a query object from the builder state
 */
function createQueryObject(state: BuilderState): QueryObject {
  // Determine query name: explicit queryName or inferred from first method
  const queryName = state.queryName || (state.queryChain[0]?.method || '');
  
  // Validate: must have at least a query name or a method
  if (!queryName && state.queryChain.length === 0) {
    throw new Error('Query must define at least a query name or a method');
  }
  
  // Validate: first method can only have one argument
  if (state.queryChain.length > 0 && state.queryChain[0]?.args && state.queryChain[0].args.length > 1) {
    throw new Error('First method in query chain can only have one argument');
  }
  
  // Build methods array
  let methods: Array<{ method: string; args?: any[] }>;
  
  // Check if this is the inferred pattern (queryName set, but first chain item has empty method)
  if (state.queryName && state.queryChain.length > 0 && state.queryChain[0]?.method === '') {
    // Inferred pattern: queryName was called directly
    methods = state.queryChain; // Use chain as-is (first item already has method: '')
  } else if (state.queryName) {
    // Explicit query name: all chain items become methods
    methods = state.queryChain;
  } else {
    // No queryName: shouldn't happen with current logic, but handle it
    methods = [
      { method: '', args: state.queryChain[0]?.args },
      ...state.queryChain.slice(1)
    ];
  }
  
  return {
    id: randomUUID(),
    namespace: state.namespace.join('.'),
    kind: 'query',
    name: queryName,
    payload: methods,
    options: {
      ...(state.aggregateId !== undefined && { aggregateId: state.aggregateId }),
    },
  };
}

/**
 * Validates that the state is ready for command execution
 */
function validateCommandState(state: BuilderState, commandName: string): void {
  if (state.namespace.length === 0) {
    throw new Error('Cannot execute command without a namespace');
  }
  if (!commandName) {
    throw new Error('Command name is required');
  }
}

/**
 * Validates that the state is ready for query execution
 */
function validateQueryState(state: BuilderState): void {
  if (state.namespace.length === 0) {
    throw new Error('Cannot execute query without a namespace');
  }
  if (state.queryChain.length === 0) {
    throw new Error('Query chain cannot be empty');
  }
}

/**
 * Dispatcher function type - can be customized by users
 */
export type Dispatcher = (obj: DispatchObject) => Promise<any>;

/**
 * Default dispatcher that just returns the object (for testing/debugging)
 */
const defaultDispatcher: Dispatcher = async (obj: DispatchObject) => {
  return obj;
};

/**
 * Global dispatcher instance
 */
let globalDispatcher: Dispatcher = defaultDispatcher;

/**
 * Sets a custom dispatcher function
 */
export function setDispatcher(dispatcher: Dispatcher): void {
  globalDispatcher = dispatcher;
}

/**
 * Resets the dispatcher to the default
 */
export function resetDispatcher(): void {
  globalDispatcher = defaultDispatcher;
}

/**
 * Creates an awaitable command promise with .await() method
 */
function createAwaitableCommand(
  state: BuilderState,
  commandName: string,
  payload: object
): AwaitableCommand {
  // Create a lazy executor that only runs when the promise is awaited
  let executed = false;
  let executionPromise: Promise<any> | null = null;

  const getExecutionPromise = () => {
    if (!executed) {
      executed = true;
      executionPromise = (async () => {
        validateCommandState(state, commandName);
        validateEventMutualExclusivity(state.awaitEvents, state.listeners);
        const commandObj = createCommandObject(state, commandName, payload);
        return globalDispatcher(commandObj);
      })();
    }
    return executionPromise!;
  };

  // Create a thenable object that delays execution
  const promise = {
    // Make it look like a Promise to testing libraries
    [Symbol.toStringTag]: 'Promise',
    constructor: Promise,
    
    then(onFulfilled?: any, onRejected?: any) {
      return getExecutionPromise().then(onFulfilled, onRejected);
    },
    catch(onRejected?: any) {
      return getExecutionPromise().catch(onRejected);
    },
    finally(onFinally?: any) {
      return getExecutionPromise().finally(onFinally);
    },
  } as AwaitableCommand;

  // Add the await method
  promise.await = (...events: string[]): AwaitableCommand => {
    if (events.length === 0) {
      throw new Error('At least one event name is required for .await()');
    }
    state.awaitEvents = events;
    return createAwaitableCommand(state, commandName, payload);
  };

  // Add the on method
  promise.on = (eventName: string, handler: (payload: any) => void | Promise<void>, options?: { timeoutMs?: number }): AwaitableCommand => {
    if (!eventName || typeof handler !== 'function') {
      throw new Error('.on() requires an event name and a handler function');
    }

    const listener: EventListener = {
      eventName,
      handler,
      ...(options?.timeoutMs && { timeoutMs: options.timeoutMs }),
    };

    state.listeners = [...(state.listeners || []), listener];
    return createAwaitableCommand(state, commandName, payload);
  };

  // Mark as awaitable
  promise[AWAITABLE_COMMAND] = true;

  return promise;
}

/**
 * Validates that event names don't overlap between .await() and .on()
 */
function validateEventMutualExclusivity(
  awaitedEvents: string[] | undefined,
  listeners: EventListener[] | undefined
): void {
  if (!awaitedEvents || !listeners) {
    return;
  }

  const awaitedSet = new Set(awaitedEvents);
  const listenerEvents = listeners.map(l => l.eventName);

  for (const eventName of listenerEvents) {
    if (awaitedSet.has(eventName)) {
      throw new Error(
        `Event "${eventName}" cannot appear in both .await() and .on(). ` +
        `Use .await() for events that resolve the RPC promise, or .on() for side-effect listeners, but not both.`
      );
    }
  }
}

/**
 * Creates the main proxy handler for the app service
 */
function createAppProxy(state: BuilderState = { namespace: [], isQuery: false, queryChain: [], queryName: undefined }): any {
  const proxy = new Proxy(() => {}, {
    get(target, prop: string | symbol) {
      // Handle special properties
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // If we're in query mode with a chain, make it thenable
        if (state.isQuery && state.queryChain.length > 0) {
          if (prop === 'then') {
            return (resolve: (value: any) => void, reject?: (reason: any) => void) => {
              validateQueryState(state);
              const queryObj = createQueryObject(state);
              return globalDispatcher(queryObj).then(resolve, reject);
            };
          }
          if (prop === 'catch') {
            return (reject: (reason: any) => void) => {
              validateQueryState(state);
              const queryObj = createQueryObject(state);
              return globalDispatcher(queryObj).catch(reject);
            };
          }
        }
        return undefined;
      }

      if (typeof prop === 'symbol') {
        return undefined;
      }

      // Handle 'query' keyword
      if (prop === 'query') {
        if (state.namespace.length === 0) {
          throw new Error('Cannot start query without a namespace');
        }
        return createAppProxy({ ...state, isQuery: true, queryChain: [], queryName: undefined });
      }

      // Handle .on(eventName, handler, options?)
      if (prop === 'on') {
        return (eventName: string, handler: (payload: any) => void | Promise<void>, options?: { timeoutMs?: number }) => {
          if (!eventName || typeof handler !== 'function') {
            throw new Error('.on() requires an event name and a handler function');
          }

          const listener: EventListener = {
            eventName,
            handler,
            ...(options?.timeoutMs && { timeoutMs: options.timeoutMs }),
          };

          return createAppProxy({ ...state, listeners: [...(state.listeners || []), listener] });
        };
      }

      // If we're in query mode, add to query chain
      if (state.isQuery) {
        // First access after .query determines if it's a query name or method
        if (state.queryChain.length === 0 && !state.queryName) {
          // This could be either a query name or the first method
          // We'll treat it as a potential query name for now
          return createAppProxy({
            ...state,
            queryName: prop,
            queryChain: [],
          });
        }
        
        // Subsequent accesses are methods in the chain
        return createAppProxy({
          ...state,
          queryChain: [...state.queryChain, { method: prop }],
        });
      }

      // Otherwise, add to namespace
      return createAppProxy({
        ...state,
        namespace: [...state.namespace, prop],
      });
    },
    apply(target, thisArg, args: any[]) {
      // Case 1: Setting aggregateId (called with string or number)
      if (
        args.length === 1 &&
        (typeof args[0] === 'string' || typeof args[0] === 'number') &&
        !state.isQuery &&
        state.aggregateId === undefined
      ) {
        // Check if this is an illegal call (aggregateId set but nothing follows)
        // We need to return a proxy that will throw on await
        const newState = {
          ...state,
          aggregateId: args[0],
        };

        if (state.namespace.length === 0) {
          throw new Error('Cannot set aggregateId without a namespace');
        }

        // Return a proxy that checks for proper usage
        return createAggregateIdProxy(newState);
      }

      // Case 2: Executing a command (called with object payload)
      if (args.length === 1 && typeof args[0] === 'object' && !state.isQuery) {
        if (state.namespace.length === 0) {
          throw new Error('Cannot execute command without a namespace');
        }

        const commandName = state.namespace[state.namespace.length - 1];

        if (!commandName) {
          throw new Error('Invalid command name');
        }

        const namespaceWithoutCommand = state.namespace.slice(0, -1);

        if (namespaceWithoutCommand.length === 0) {
          throw new Error('Cannot execute command without a namespace');
        }

       const commandState: BuilderState = {
         namespace: namespaceWithoutCommand,
         aggregateId: state.aggregateId,
         isQuery: false,
         queryChain: [],
          queryName: undefined,
       };

        // Validate mutual exclusivity before creating command
        validateEventMutualExclusivity(state.awaitEvents, state.listeners);

        return createAwaitableCommand(commandState, commandName, args[0]);
      }

      // Case 3: Query chain method call
      if (state.isQuery) {
        // If queryName is set but no chain yet, this is the first method call
        if (state.queryName && state.queryChain.length === 0) {
          // This is the inferred query name pattern - queryName is being called directly
          // We mark it as invoked by adding a placeholder to the chain
          return createAppProxy({
            ...state,
            queryChain: [{ method: '', args: args }],
          });
        }
        
        // If no queryName and no chain, this is inferred query name pattern
        if (!state.queryName && state.queryChain.length === 0) {
          throw new Error('Invalid query chain state');
        }

        const lastQuery = state.queryChain[state.queryChain.length - 1];

        if (!lastQuery) {
          throw new Error('Invalid query chain state');
        }

        // If this is a method call with arguments, update the last query item
        if (args.length > 0) {
          const updatedChain = [...state.queryChain];
          updatedChain[updatedChain.length - 1] = {
            method: lastQuery.method,
            args: args,
          };

          return createAppProxy({
            ...state,
            queryChain: updatedChain,
          });
        }

        // If no arguments, just return the proxy for chaining
        return createAppProxy(state);
      }

      // Case 4: Illegal calls
      if (args.length === 0) {
        if (state.namespace.length === 0) {
          throw new Error('Cannot call app without a namespace');
        }
        if (state.aggregateId !== undefined) {
          throw new Error('No command or query specified after aggregateId');
        }
        throw new Error('No command specified after namespace');
      }

      throw new Error(`Invalid call pattern with ${args.length} arguments`);
    },
    // Handle await on query chains
    has(target, prop) {
      if (prop === 'then' && state.isQuery && state.queryChain.length > 0) {
        return true;
      }
      return prop in target;
    },

  });

  return proxy;
}

/**
 * Creates a special proxy for aggregateId that throws if not followed by command/query
 */
function createAggregateIdProxy(state: BuilderState): any {
  let accessed = false;

  const proxy = new Proxy(() => {}, {
    get(target, prop: string | symbol) {
      accessed = true;

      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // If awaited directly without command/query, throw error
        throw new Error('No command or query specified after aggregateId');
      }

      if (typeof prop === 'symbol') {
        return undefined;
      }

      // Handle 'query' keyword
      if (prop === 'query') {
        return createAppProxy({ ...state, isQuery: true, queryChain: [] });
      }

      // Otherwise, add to namespace for command
      return createAppProxy({
        ...state,
        namespace: [...state.namespace, prop],
      });
    },

    apply(target, thisArg, args: any[]) {
      accessed = true;
      throw new Error('No command or query specified after aggregateId');
    },
  });

  return proxy;
}

/**
 * Main app service proxy
 */
const app = createAppProxy();

export default app;
