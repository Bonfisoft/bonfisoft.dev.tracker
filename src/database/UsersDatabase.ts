/**
 * Users Database - Manages the users list
 * @module database/UsersDatabase
 */

import type { IStorageProvider } from '../storage/IStorageProvider.ts';
import { logger } from '../utils/logger.ts';

const USERS_FILE = 'users';

/**
 * Users database structure
 */
interface UsersData {
  users: string[];
  updatedAt: string;
}

/**
 * Manages the users list for autocomplete
 */
export class UsersDatabase {
  private storage: IStorageProvider;
  private userCache: Set<string> | null = null;
  private usersCollection = 'config';

  constructor(storage: IStorageProvider) {
    this.storage = storage;
  }

  /**
   * Initialize the users database
   * Loads existing users or creates empty list
   */
  async initialize(): Promise<void> {
    try {
      const data = await this.storage.readFile(this.usersCollection, USERS_FILE);
      if (data) {
        const parsed: UsersData = JSON.parse(data);
        this.userCache = new Set(parsed.users);
        logger.info(`loaded ${parsed.users.length} users from storage`);
      } else {
        this.userCache = new Set();
        await this.persist();
        logger.info('initialized empty users database');
      }
    } catch (error) {
      logger.error(`failed to initialize users database: ${error}`);
      this.userCache = new Set();
    }
  }

  /**
   * Get all users sorted alphabetically
   * @returns Array of user names
   */
  async getAllUsers(): Promise<string[]> {
    if (!this.userCache) {
      await this.initialize();
    }
    return Array.from(this.userCache!).sort();
  }

  /**
   * Add a user to the list
   * @param user - User name to add
   * @returns true if added, false if already exists
   */
  async addUser(user: string): Promise<boolean> {
    if (!this.userCache) {
      await this.initialize();
    }

    const trimmed = user.trim();
    if (!trimmed || this.userCache!.has(trimmed)) {
      return false;
    }

    this.userCache!.add(trimmed);
    await this.persist();
    logger.info(`added user: ${trimmed}`);
    return true;
  }

  /**
   * Check if user exists
   * @param user - User name to check
   * @returns true if exists
   */
  async hasUser(user: string): Promise<boolean> {
    if (!this.userCache) {
      await this.initialize();
    }
    return this.userCache!.has(user.trim());
  }

  /**
   * Save users to storage
   */
  private async persist(): Promise<void> {
    const data: UsersData = {
      users: Array.from(this.userCache!).sort(),
      updatedAt: new Date().toISOString()
    };
    await this.storage.writeFile(
      this.usersCollection,
      USERS_FILE,
      JSON.stringify(data, null, 2)
    );
  }
}
