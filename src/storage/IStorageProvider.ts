/**
 * Storage provider interface abstraction
 * Allows swapping between workspace and global storage
 * @module storage/IStorageProvider
 */

/**
 * Interface for storage providers
 * Implementations handle the actual file I/O or storage mechanism
 */
export interface IStorageProvider {
  /**
   * Check if storage exists and has data
   * @returns Promise resolving to true if storage exists
   */
  exists(): Promise<boolean>;

  /**
   * Read data from storage
   * @returns Promise resolving to stored string content, or null if not exists
   */
  read(): Promise<string | null>;

  /**
   * Write data to storage atomically
   * @param content - String content to write
   * @returns Promise that resolves when write is complete
   */
  write(content: string): Promise<void>;
}
