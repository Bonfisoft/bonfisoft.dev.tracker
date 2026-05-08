/**
 * Workspace storage provider implementation
 * Stores the manifest in .vscode/issues/db.json and each entity as
 * .vscode/issues/<collection>/<id>.json within the workspace.
 * @module storage/WorkspaceStorageProvider
 */

import * as vscode from 'vscode';
import type { IStorageProvider } from './IStorageProvider.ts';
import { logger } from '../utils/logger.ts';

/**
 * Storage provider that persists to workspace .vscode/issues directory.
 * Uses atomic writes (temp file + rename) to prevent corruption.
 *
 * Layout:
 *   .vscode/issues/db.json               ← manifest
 *   .vscode/issues/issues/<id>.json      ← per-issue files
 */
export class WorkspaceStorageProvider implements IStorageProvider {
  private readonly rootDir: vscode.Uri;
  private readonly manifestFile: vscode.Uri;

  /**
   * @param workspaceFolder - The workspace folder URI
   */
  constructor(workspaceFolder: vscode.Uri) {
    this.rootDir = vscode.Uri.joinPath(workspaceFolder, '.vscode', 'issues');
    this.manifestFile = vscode.Uri.joinPath(this.rootDir, 'db.json');
  }

  // ── Manifest ──────────────────────────────────────────────────────────────

  /**
   * Read the manifest (db.json)
   * @returns Content string or null if not found
   */
  async readManifest(): Promise<string | null> {
    try {
      const data = await vscode.workspace.fs.readFile(this.manifestFile);
      return Buffer.from(data).toString('utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Write the manifest atomically
   * @param content - JSON string to write
   */
  async writeManifest(content: string): Promise<void> {
    await this.ensureDirectory(this.rootDir);
    await this.atomicWrite(this.rootDir, this.manifestFile, content, 'db.json.tmp');
  }

  // ── Per-entity files ──────────────────────────────────────────────────────

  /**
   * List all entity IDs in a collection folder
   * @param collection - e.g. 'issues'
   * @returns Array of IDs (filename without .json)
   */
  async listFiles(collection: string): Promise<string[]> {
    const dir = this.collectionDir(collection);
    try {
      const entries = await vscode.workspace.fs.readDirectory(dir);
      return entries
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json'))
        .map(([name]) => name.slice(0, -5)); // strip .json
    } catch {
      return [];
    }
  }

  /**
   * Read a single entity file
   * @param collection - Collection name
   * @param id - Entity ID
   * @returns File content or null if not found
   */
  async readFile(collection: string, id: string): Promise<string | null> {
    const file = this.entityFile(collection, id);
    try {
      const data = await vscode.workspace.fs.readFile(file);
      return Buffer.from(data).toString('utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Write a single entity file atomically
   * @param collection - Collection name
   * @param id - Entity ID
   * @param content - JSON string to write
   */
  async writeFile(collection: string, id: string, content: string): Promise<void> {
    const dir = this.collectionDir(collection);
    await this.ensureDirectory(dir);
    const file = this.entityFile(collection, id);
    await this.atomicWrite(dir, file, content, `${id}.json.tmp`);
    logger.debug(`wrote ${collection}/${id}.json`);
  }

  /**
   * Delete a single entity file
   * @param collection - Collection name
   * @param id - Entity ID
   */
  async deleteFile(collection: string, id: string): Promise<void> {
    const file = this.entityFile(collection, id);
    try {
      await vscode.workspace.fs.delete(file);
      logger.debug(`deleted ${collection}/${id}.json`);
    } catch (error) {
      logger.error(`failed to delete ${collection}/${id}: ${error}`);
      throw new Error(`failed to delete ${collection}/${id}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectionDir(collection: string): vscode.Uri {
    return vscode.Uri.joinPath(this.rootDir, collection);
  }

  private entityFile(collection: string, id: string): vscode.Uri {
    return vscode.Uri.joinPath(this.rootDir, collection, `${id}.json`);
  }

  private async ensureDirectory(dir: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch {
      // Already exists — fine
    }
  }

  private async atomicWrite(
    dir: vscode.Uri,
    target: vscode.Uri,
    content: string,
    tmpName: string
  ): Promise<void> {
    try {
      const tempFile = vscode.Uri.joinPath(dir, tmpName);
      const bytes = Buffer.from(content, 'utf-8');
      await vscode.workspace.fs.writeFile(tempFile, bytes);
      await vscode.workspace.fs.rename(tempFile, target, { overwrite: true });
    } catch (error) {
      logger.error(`atomic write failed for ${target}: ${error}`);
      throw new Error(`failed to write ${target}`);
    }
  }
}
