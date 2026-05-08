/**
 * In-memory storage provider for testing
 * Implements IStorageProvider without file I/O
 * @module test/mocks/InMemoryStorageProvider
 */

import type { IStorageProvider } from '../../src/storage/IStorageProvider.ts';

/**
 * Mock storage provider that stores data in memory.
 * Manifest stored as a string; entity files stored in a nested Map:
 *   files[collection][id] = content
 */
export class InMemoryStorageProvider implements IStorageProvider {
  private manifest: string | null = null;
  private files: Map<string, Map<string, string>> = new Map();

  // ── Manifest ──────────────────────────────────────────────────────────────

  async readManifest(): Promise<string | null> {
    return this.manifest;
  }

  async writeManifest(content: string): Promise<void> {
    this.manifest = content;
  }

  // ── Per-entity files ──────────────────────────────────────────────────────

  async listFiles(collection: string): Promise<string[]> {
    return Array.from(this.collectionMap(collection).keys());
  }

  async readFile(collection: string, id: string): Promise<string | null> {
    return this.collectionMap(collection).get(id) ?? null;
  }

  async writeFile(collection: string, id: string, content: string): Promise<void> {
    this.collectionMap(collection).set(id, content);
  }

  async deleteFile(collection: string, id: string): Promise<void> {
    const col = this.collectionMap(collection);
    if (!col.has(id)) {
      throw new Error(`not found: ${collection}/${id}`);
    }
    col.delete(id);
  }

  // ── Test helpers ──────────────────────────────────────────────────────────

  /**
   * Reset all stored data (call in beforeEach)
   */
  clear(): void {
    this.manifest = null;
    this.files.clear();
  }

  private collectionMap(collection: string): Map<string, string> {
    if (!this.files.has(collection)) {
      this.files.set(collection, new Map());
    }
    return this.files.get(collection)!;
  }
}
