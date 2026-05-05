/**
 * ID generation utilities
 * @module utils/idGenerator
 */

import { randomUUID } from 'crypto';

/**
 * Interface for ID generation
 * Allows for mocking in tests
 */
export interface IIdGenerator {
  /**
   * Generate a UUID v4
   * @returns UUID string
   */
  generateUUID(): string;
}

/**
 * Default ID generator using crypto.randomUUID
 */
export class CryptoIdGenerator implements IIdGenerator {
  /**
   * Generate a cryptographically secure UUID v4
   */
  generateUUID(): string {
    return randomUUID();
  }
}

/**
 * Singleton instance for production use
 */
export const defaultIdGenerator = new CryptoIdGenerator();
