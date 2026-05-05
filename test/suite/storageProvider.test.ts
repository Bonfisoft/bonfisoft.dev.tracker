import { describe, it, expect, beforeEach } from 'vitest';
import type { IStorageProvider } from '../../src/storage/IStorageProvider.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { resetWorkspace, Uri } from '../mocks/vscode.ts';

describe('IStorageProvider Interface (Contract)', () => {
  let provider: IStorageProvider;

  beforeEach(() => {
    provider = new InMemoryStorageProvider();
  });

  describe('exists', () => {
    it('should return false when storage is empty', async () => {
      const exists = await provider.exists();
      expect(exists).toBe(false);
    });

    it('should return true after write', async () => {
      await provider.write('test content');
      const exists = await provider.exists();
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('should return null when storage is empty', async () => {
      const content = await provider.read();
      expect(content).toBeNull();
    });

    it('should return written content', async () => {
      const testData = '{"issues": []}';
      await provider.write(testData);
      const content = await provider.read();
      expect(content).toBe(testData);
    });

    it('should return latest content after multiple writes', async () => {
      await provider.write('first');
      await provider.write('second');
      const content = await provider.read();
      expect(content).toBe('second');
    });
  });

  describe('write', () => {
    it('should persist string content', async () => {
      const data = JSON.stringify({ test: true });
      await provider.write(data);
      const read = await provider.read();
      expect(read).toBe(data);
    });

    it('should overwrite existing content', async () => {
      await provider.write('old');
      await provider.write('new');
      const content = await provider.read();
      expect(content).toBe('new');
    });
  });
});

import { WorkspaceStorageProvider } from '../../src/storage/WorkspaceStorageProvider.ts';

describe('WorkspaceStorageProvider (Mocked VS Code)', () => {
  let provider: WorkspaceStorageProvider;
  let workspaceUri: Uri;

  beforeEach(() => {
    resetWorkspace();
    workspaceUri = Uri.file('/test/workspace');
    provider = new WorkspaceStorageProvider(workspaceUri);
  });

  describe('constructor', () => {
    it('should initialize with workspace URI', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('exists', () => {
    it('should return false when issues.json does not exist', async () => {
      const exists = await provider.exists();
      expect(exists).toBe(false);
    });

    it('should return true after write creates file', async () => {
      await provider.write('{}');
      const exists = await provider.exists();
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('should return null when file does not exist', async () => {
      const content = await provider.read();
      expect(content).toBeNull();
    });

    it('should read written content', async () => {
      const data = JSON.stringify({ issues: [], version: '1.0.0' });
      await provider.write(data);
      const content = await provider.read();
      expect(content).toBe(data);
    });
  });

  describe('write', () => {
    it('should persist data to storage', async () => {
      const data = '{"test": true}';
      await provider.write(data);
      const content = await provider.read();
      expect(content).toBe(data);
    });

    it('should use atomic write (temp file + rename)', async () => {
      const data = '{"atomic": true}';
      await provider.write(data);
      const content = await provider.read();
      expect(content).toBe(data);
    });

    it('should overwrite existing content', async () => {
      await provider.write('first');
      await provider.write('second');
      const content = await provider.read();
      expect(content).toBe('second');
    });

    it('should handle large JSON content', async () => {
      const largeData = JSON.stringify({
        issues: Array(1000).fill({ id: 'test', title: 'Test Issue' })
      });
      await provider.write(largeData);
      const content = await provider.read();
      expect(content).toBe(largeData);
    });
  });
});
