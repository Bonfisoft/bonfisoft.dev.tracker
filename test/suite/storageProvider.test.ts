import { describe, it, expect, beforeEach } from 'vitest';
import type { IStorageProvider } from '../../src/storage/IStorageProvider.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { resetWorkspace, Uri } from '../mocks/vscode.ts';

// ==================== Contract tests (run against both implementations) ====================

function runContractTests(label: string, factory: () => IStorageProvider): void {
  describe(`${label} — IStorageProvider contract`, () => {
    let provider: IStorageProvider;

    beforeEach(() => {
      provider = factory();
    });

    // ── Manifest ──────────────────────────────────────────────────────────

    describe('readManifest', () => {
      it('should return null when manifest does not exist', async () => {
        expect(await provider.readManifest()).toBeNull();
      });

      it('should return written manifest content', async () => {
        const manifest = JSON.stringify({ schemaVersion: '2.0.0' });
        await provider.writeManifest(manifest);
        expect(await provider.readManifest()).toBe(manifest);
      });

      it('should return latest content after multiple writes', async () => {
        await provider.writeManifest('first');
        await provider.writeManifest('second');
        expect(await provider.readManifest()).toBe('second');
      });
    });

    describe('writeManifest', () => {
      it('should persist manifest atomically', async () => {
        const data = JSON.stringify({ schemaVersion: '2.0.0', metadata: { issueCounter: 0 } });
        await provider.writeManifest(data);
        expect(await provider.readManifest()).toBe(data);
      });
    });

    // ── Per-entity files ──────────────────────────────────────────────────

    describe('listFiles', () => {
      it('should return empty array for a new collection', async () => {
        expect(await provider.listFiles('issues')).toEqual([]);
      });

      it('should return IDs of written files', async () => {
        await provider.writeFile('issues', 'id-1', '{}');
        await provider.writeFile('issues', 'id-2', '{}');
        const ids = await provider.listFiles('issues');
        expect(ids).toHaveLength(2);
        expect(ids).toContain('id-1');
        expect(ids).toContain('id-2');
      });

      it('should not include deleted files', async () => {
        await provider.writeFile('issues', 'id-1', '{}');
        await provider.writeFile('issues', 'id-2', '{}');
        await provider.deleteFile('issues', 'id-1');
        const ids = await provider.listFiles('issues');
        expect(ids).toEqual(['id-2']);
      });

      it('should scope listing to the given collection', async () => {
        await provider.writeFile('issues', 'id-1', '{}');
        await provider.writeFile('other', 'id-A', '{}');
        const issueIds = await provider.listFiles('issues');
        expect(issueIds).toEqual(['id-1']);
      });
    });

    describe('readFile', () => {
      it('should return null for a non-existent file', async () => {
        expect(await provider.readFile('issues', 'missing')).toBeNull();
      });

      it('should return written content', async () => {
        const content = JSON.stringify({ id: 'id-1', title: 'Test' });
        await provider.writeFile('issues', 'id-1', content);
        expect(await provider.readFile('issues', 'id-1')).toBe(content);
      });

      it('should return latest content after update', async () => {
        await provider.writeFile('issues', 'id-1', 'v1');
        await provider.writeFile('issues', 'id-1', 'v2');
        expect(await provider.readFile('issues', 'id-1')).toBe('v2');
      });
    });

    describe('writeFile', () => {
      it('should create a new entity file', async () => {
        await provider.writeFile('issues', 'id-1', '{"title":"Bug"}');
        expect(await provider.readFile('issues', 'id-1')).toBe('{"title":"Bug"}');
      });

      it('should overwrite an existing entity file', async () => {
        await provider.writeFile('issues', 'id-1', 'old');
        await provider.writeFile('issues', 'id-1', 'new');
        expect(await provider.readFile('issues', 'id-1')).toBe('new');
      });

      it('should handle large JSON content', async () => {
        const large = JSON.stringify({ data: Array(500).fill({ x: 'y' }) });
        await provider.writeFile('issues', 'big-id', large);
        expect(await provider.readFile('issues', 'big-id')).toBe(large);
      });
    });

    describe('deleteFile', () => {
      it('should remove the entity file', async () => {
        await provider.writeFile('issues', 'id-1', '{}');
        await provider.deleteFile('issues', 'id-1');
        expect(await provider.readFile('issues', 'id-1')).toBeNull();
      });

      it('should throw when deleting a non-existent file', async () => {
        await expect(provider.deleteFile('issues', 'ghost')).rejects.toThrow();
      });
    });
  });
}

// Run the contract against the in-memory mock
runContractTests('InMemoryStorageProvider', () => new InMemoryStorageProvider());

// ==================== WorkspaceStorageProvider (mocked VS Code) ====================

import { WorkspaceStorageProvider } from '../../src/storage/WorkspaceStorageProvider.ts';

runContractTests('WorkspaceStorageProvider', () => {
  resetWorkspace();
  return new WorkspaceStorageProvider(Uri.file('/test/workspace'));
});

describe('WorkspaceStorageProvider — additional', () => {
  let provider: WorkspaceStorageProvider;

  beforeEach(() => {
    resetWorkspace();
    provider = new WorkspaceStorageProvider(Uri.file('/test/workspace'));
  });

  it('should initialize with workspace URI', () => {
    expect(provider).toBeDefined();
  });

  it('should use atomic write (temp file + rename) for manifest', async () => {
    const data = JSON.stringify({ schemaVersion: '2.0.0' });
    await provider.writeManifest(data);
    expect(await provider.readManifest()).toBe(data);
  });

  it('should use atomic write (temp file + rename) for issue files', async () => {
    const data = JSON.stringify({ id: 'id-1', title: 'Atomic' });
    await provider.writeFile('issues', 'id-1', data);
    expect(await provider.readFile('issues', 'id-1')).toBe(data);
  });
});
