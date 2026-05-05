/**
 * In-memory ID generator for testing
 * @module test/mocks/InMemoryIdGenerator
 */

import type { IIdGenerator } from '../../src/utils/idGenerator.ts';

/**
 * Mock ID generator that produces predictable test IDs
 */
export class InMemoryIdGenerator implements IIdGenerator {
  private counter = 0;

  /**
   * Generate a UUID
   * Returns test-id-{counter} for predictable testing
   */
  generateUUID(): string {
    this.counter++;
    return `test-id-${this.counter}`;
  }

  /**
   * Get current counter value (for testing)
   */
  getCounter(): number {
    return this.counter;
  }

  /**
   * Reset counter (for test isolation)
   */
  reset(): void {
    this.counter = 0;
  }
}
