/**
 * In-memory storage provider for testing
 * Implements IStorageProvider without file I/O
 * @module test/mocks/InMemoryStorageProvider
 */

import type { IStorageProvider } from '../../src/storage/IStorageProvider.ts';

/**
 * Mock storage provider that stores data in memory
 * Useful for unit tests to avoid file system operations
 */
export class InMemoryStorageProvider implements IStorageProvider {
  private data: string | null = null;

  /**
   * Check if storage has data
   * @returns true if data has been written
   */
  async exists(): Promise<boolean> {
    return this.data !== null;
  }

  /**
   * Read stored data
   * @returns stored content or null if nothing stored
   */
  async read(): Promise<string | null> {
    return this.data;
  }

  /**
   * Write data to memory
   * @param content - Content to store
   */
  async write(content: string): Promise<void> {
    this.data = content;
  }

  /**
   * Clear stored data (test helper)
   */
  clear(): void {
    this.data = null;
  }
}
