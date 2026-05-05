/**
 * Workspace storage provider implementation
 * Stores issues in .vscode/issues/issues.json within the workspace
 * @module storage/WorkspaceStorageProvider
 */

import * as vscode from 'vscode';
import type { IStorageProvider } from './IStorageProvider.ts';
import { logger } from '../utils/logger.ts';

/**
 * Storage provider that persists to workspace .vscode directory
 * Uses atomic writes (temp file + rename) to prevent corruption
 */
export class WorkspaceStorageProvider implements IStorageProvider {
  private readonly issuesDir: vscode.Uri;
  private readonly issuesFile: vscode.Uri;

  /**
   * @param workspaceFolder - The workspace folder URI
   */
  constructor(workspaceFolder: vscode.Uri) {
    this.issuesDir = vscode.Uri.joinPath(workspaceFolder, '.vscode', 'issues');
    this.issuesFile = vscode.Uri.joinPath(this.issuesDir, 'issues.json');
  }

  /**
   * Check if issues.json exists
   */
  async exists(): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(this.issuesFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read issues.json content
   * @returns File content or null if not exists
   */
  async read(): Promise<string | null> {
    try {
      const data = await vscode.workspace.fs.readFile(this.issuesFile);
      return Buffer.from(data).toString('utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Write content to issues.json atomically
   * Uses write-to-temp + rename pattern for atomicity
   * @param content - JSON content to write
   */
  async write(content: string): Promise<void> {
    try {
      // Ensure directory exists
      await this.ensureDirectory();

      // Write to temp file first (for atomic operation)
      const tempFile = vscode.Uri.joinPath(this.issuesDir, 'issues.json.tmp');
      const contentBytes = Buffer.from(content, 'utf-8');

      await vscode.workspace.fs.writeFile(tempFile, contentBytes);

      // Atomic rename
      await vscode.workspace.fs.rename(tempFile, this.issuesFile, { overwrite: true });

      logger.debug('wrote issues to workspace storage');
    } catch (error) {
      logger.error(`failed to write issues: ${error}`);
      throw new Error('failed to write issues');
    }
  }

  /**
   * Ensure the .vscode/issues directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(this.issuesDir);
    } catch (error) {
      // Directory might already exist, which is fine
      logger.debug(`directory creation result: ${error}`);
    }
  }
}
