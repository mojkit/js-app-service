import type { EventListener } from './index';

/**
 * RPC response structure received from reply queues.
 */
export interface RPCResponse {
  type: 'event' | 'error' | 'result';
  messageId: string;
  eventName?: string;
  payload?: unknown;
  error?: { errorCode: string; message: string; data?: unknown };
}

/**
 * Manages a single RPC call's subscription to a reply queue.
 * Handles incoming responses and resolves/rejects the RPC promise.
 */
export class RPCSubscription {
  private messageId: string;
  private awaitedEvents: Set<string>;
  private listeners: Map<string, EventListener>;
  private listenerTimeouts: Map<string, NodeJS.Timeout>;
  private rpcTimeout?: NodeJS.Timeout;
  private rpcTimeoutMs: number;
  private resolve: (value: any) => void;
  private reject: (reason: any) => void;
  private isResolved: boolean = false;
  private unsubscribe?: () => void;

  constructor(
    messageId: string,
    awaitedEvents: string[],
    listeners: EventListener[],
    rpcTimeoutMs: number,
    resolve: (value: any) => void,
    reject: (reason: any) => void
  ) {
    this.messageId = messageId;
    this.awaitedEvents = new Set(awaitedEvents);
    this.listeners = new Map(listeners.map(l => [l.eventName, l]));
    this.listenerTimeouts = new Map();
    this.rpcTimeoutMs = rpcTimeoutMs;
    this.resolve = resolve;
    this.reject = reject;
  }

  /**
   * Start the RPC timeout timer.
   */
  startRPCTimeout(): void {
    if (this.rpcTimeoutMs > 0) {
      this.rpcTimeout = setTimeout(() => {
        if (!this.isResolved) {
          this.cleanup();
          this.reject(new Error(`RPC timeout after ${this.rpcTimeoutMs}ms`));
        }
      }, this.rpcTimeoutMs);
    }
  }

  /**
   * Start timeout timers for individual listeners.
   */
  startListenerTimeouts(): void {
    for (const [eventName, listener] of this.listeners.entries()) {
      if (listener.timeoutMs && listener.timeoutMs > 0) {
        const timeout = setTimeout(() => {
          // Remove this listener on timeout
          this.listeners.delete(eventName);
          this.listenerTimeouts.delete(eventName);
        }, listener.timeoutMs);
        this.listenerTimeouts.set(eventName, timeout);
      }
    }
  }

  /**
   * Set the unsubscribe function for cleanup.
   */
  setUnsubscribe(unsubscribe: () => void): void {
    this.unsubscribe = unsubscribe;
  }

  /**
   * Handle an incoming RPC response.
   */
  handleResponse(response: RPCResponse): void {
    // Ignore responses for different message IDs
    if (response.messageId !== this.messageId) {
      return;
    }

    switch (response.type) {
      case 'error':
        this.handleError(response);
        break;
      case 'event':
        this.handleEvent(response);
        break;
      case 'result':
        this.handleResult(response);
        break;
    }
  }

  /**
   * Handle an error response.
   */
  private handleError(response: RPCResponse): void {
    if (this.isResolved) {
      return;
    }

    this.cleanup();

    const error = new Error(response.error?.message || 'RPC error');
    (error as any).errorCode = response.error?.errorCode;
    (error as any).data = response.error?.data;

    this.reject(error);
  }

  /**
   * Handle an event response.
   */
  private handleEvent(response: RPCResponse): void {
    const eventName = response.eventName;
    if (!eventName) {
      return;
    }

    // Check if this event resolves the RPC promise
    if (this.awaitedEvents.has(eventName) && !this.isResolved) {
      this.cleanup();
      this.resolve(response.payload);
      return;
    }

    // Check if this event has a registered listener
    const listener = this.listeners.get(eventName);
    if (listener) {
      try {
        listener.handler(response.payload);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    }
  }

  /**
   * Handle a result response.
   */
  private handleResult(response: RPCResponse): void {
    if (this.isResolved) {
      return;
    }

    this.cleanup();
    this.resolve(response.payload);
  }

  /**
   * Clean up timers and subscriptions.
   */
  private cleanup(): void {
    this.isResolved = true;

    // Cancel RPC timeout
    if (this.rpcTimeout) {
      clearTimeout(this.rpcTimeout);
      this.rpcTimeout = undefined;
    }

    // Cancel all listener timeouts
    for (const timeout of this.listenerTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.listenerTimeouts.clear();

    // Unsubscribe from reply queue
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Force cleanup (called externally if needed).
   */
  forceCleanup(): void {
    this.cleanup();
  }
}
