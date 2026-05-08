import { describe, it, expect, beforeEach } from 'vitest';
import { UsersDatabase } from '../../src/database/UsersDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';

describe('UsersDatabase', () => {
  let storage: InMemoryStorageProvider;
  let usersDb: UsersDatabase;

  beforeEach(async () => {
    storage = new InMemoryStorageProvider();
    usersDb = new UsersDatabase(storage);
    await usersDb.initialize();
  });

  describe('initialization', () => {
    it('should start with empty user list', async () => {
      const users = await usersDb.getAllUsers();
      expect(users).toEqual([]);
    });

    it('should load existing users from storage', async () => {
      // Pre-populate storage
      await storage.writeFile('config', 'users', JSON.stringify({
        users: ['Alice', 'Bob', 'Charlie'],
        updatedAt: new Date().toISOString()
      }, null, 2));

      const newDb = new UsersDatabase(storage);
      await newDb.initialize();

      const users = await newDb.getAllUsers();
      expect(users).toHaveLength(3);
      expect(users).toContain('Alice');
      expect(users).toContain('Bob');
      expect(users).toContain('Charlie');
    });
  });

  describe('addUser', () => {
    it('should add a new user', async () => {
      const added = await usersDb.addUser('Alberto');
      expect(added).toBe(true);

      const users = await usersDb.getAllUsers();
      expect(users).toContain('Alberto');
    });

    it('should not add duplicate users', async () => {
      await usersDb.addUser('Alberto');
      const addedAgain = await usersDb.addUser('Alberto');
      expect(addedAgain).toBe(false);

      const users = await usersDb.getAllUsers();
      expect(users).toHaveLength(1);
    });

    it('should trim whitespace from user names', async () => {
      await usersDb.addUser('  Alberto  ');
      const hasUser = await usersDb.hasUser('Alberto');
      expect(hasUser).toBe(true);
    });

    it('should not add empty user names', async () => {
      const added = await usersDb.addUser('   ');
      expect(added).toBe(false);
    });

    it('should persist users to storage', async () => {
      await usersDb.addUser('Alberto');
      await usersDb.addUser('Mark');

      // Create new instance to reload from storage
      const newDb = new UsersDatabase(storage);
      await newDb.initialize();

      const users = await newDb.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users).toContain('Alberto');
      expect(users).toContain('Mark');
    });
  });

  describe('getAllUsers', () => {
    it('should return users sorted alphabetically', async () => {
      await usersDb.addUser('Charlie');
      await usersDb.addUser('Alberto');
      await usersDb.addUser('Bob');

      const users = await usersDb.getAllUsers();
      expect(users).toEqual(['Alberto', 'Bob', 'Charlie']);
    });
  });

  describe('hasUser', () => {
    it('should return true for existing user', async () => {
      await usersDb.addUser('Alberto');
      const hasUser = await usersDb.hasUser('Alberto');
      expect(hasUser).toBe(true);
    });

    it('should return false for non-existing user', async () => {
      const hasUser = await usersDb.hasUser('Unknown');
      expect(hasUser).toBe(false);
    });
  });
});
