/**
 * Storage provider interface abstraction
 * Allows swapping between workspace and global storage
 * @module storage/IStorageProvider
 */

/**
 * Interface for storage providers
 * Supports a manifest file (db.json) and per-entity files within named collections.
 * Each collection maps to a sub-folder (e.g. 'issues' → issues/<id>.json).
 */
export interface IStorageProvider {
  // ── Manifest (db.json) ────────────────────────────────────────────────────

  /**
   * Read the manifest file
   * @returns Manifest content, or null if it does not exist yet
   */
  readManifest(): Promise<string | null>;

  /**
   * Write the manifest file atomically
   * @param content - JSON string to write
   */
  writeManifest(content: string): Promise<void>;

  // ── Per-entity files ──────────────────────────────────────────────────────

  /**
   * List all entity IDs present in a collection
   * @param collection - Collection name (e.g. 'issues')
   * @returns Array of IDs (file name without .json extension)
   */
  listFiles(collection: string): Promise<string[]>;

  /**
   * Read a single entity file
   * @param collection - Collection name
   * @param id - Entity ID
   * @returns File content, or null if not found
   */
  readFile(collection: string, id: string): Promise<string | null>;

  /**
   * Write a single entity file atomically
   * @param collection - Collection name
   * @param id - Entity ID
   * @param content - JSON string to write
   */
  writeFile(collection: string, id: string, content: string): Promise<void>;

  /**
   * Delete a single entity file
   * @param collection - Collection name
   * @param id - Entity ID
   * @throws if file does not exist
   */
  deleteFile(collection: string, id: string): Promise<void>;
}
