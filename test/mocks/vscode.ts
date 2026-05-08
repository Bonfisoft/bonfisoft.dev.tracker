/**
 * VS Code API mock for unit tests
 * Vitest will use this instead of the real vscode module
 * @module test/mocks/vscode
 */

import { vi } from 'vitest';

// Mock URI - matches vscode.Uri interface
export class Uri {
  fsPath: string;
  scheme: string = 'file';
  authority: string = '';
  path: string;
  query: string = '';
  fragment: string = '';

  constructor(path: string) {
    this.fsPath = path;
    this.path = path;
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const joined = pathSegments.join('/');
    return new Uri(`${base.fsPath}/${joined}`);
  }

  static file(path: string): Uri {
    return new Uri(path);
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
    const uri = new Uri(change.path ?? this.path);
    uri.scheme = change.scheme ?? this.scheme;
    uri.authority = change.authority ?? this.authority;
    uri.query = change.query ?? this.query;
    uri.fragment = change.fragment ?? this.fragment;
    return uri;
  }

  toString(): string {
    return this.fsPath;
  }

  toJSON(): unknown {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
      fsPath: this.fsPath
    };
  }
}

// Mock FileType enum
export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64
}

// Mock FileSystem
class MockFileSystem {
  private files = new Map<string, Uint8Array>();
  private dirs = new Set<string>();

  async readFile(uri: Uri): Promise<Uint8Array> {
    const content = this.files.get(uri.fsPath);
    if (content === undefined) {
      throw new Error(`File not found: ${uri.fsPath}`);
    }
    return content;
  }

  async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    this.files.set(uri.fsPath, content);
  }

  async rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void> {
    const content = this.files.get(source.fsPath);
    if (content === undefined) {
      throw new Error(`Source file not found: ${source.fsPath}`);
    }
    if (this.files.has(target.fsPath) && !options?.overwrite) {
      throw new Error(`Target file exists: ${target.fsPath}`);
    }
    this.files.set(target.fsPath, content);
    this.files.delete(source.fsPath);
  }

  async stat(uri: Uri): Promise<{ type: number }> {
    if (this.files.has(uri.fsPath)) {
      return { type: 1 }; // File
    }
    if (this.dirs.has(uri.fsPath)) {
      return { type: 2 }; // Directory
    }
    throw new Error(`Path not found: ${uri.fsPath}`);
  }

  async createDirectory(uri: Uri): Promise<void> {
    this.dirs.add(uri.fsPath);
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    if (!this.dirs.has(uri.fsPath)) {
      throw new Error(`Directory not found: ${uri.fsPath}`);
    }
    const prefix = uri.fsPath + '/';
    const results: [string, FileType][] = [];
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.slice(prefix.length);
        if (!rest.includes('/')) {
          results.push([rest, FileType.File]);
        }
      }
    }
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix)) {
        const rest = dirPath.slice(prefix.length);
        if (!rest.includes('/')) {
          results.push([rest, FileType.Directory]);
        }
      }
    }
    return results;
  }

  async delete(uri: Uri): Promise<void> {
    if (!this.files.has(uri.fsPath)) {
      throw new Error(`File not found: ${uri.fsPath}`);
    }
    this.files.delete(uri.fsPath);
  }

  // Test helper methods
  clear(): void {
    this.files.clear();
    this.dirs.clear();
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.dirs.has(path);
  }
}

export const workspace = {
  fs: new MockFileSystem()
};

// Reset workspace.fs before each test
export function resetWorkspace(): void {
  workspace.fs.clear();
}

// Mock TreeItemCollapsibleState enum
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

// Mock TreeItem
export class TreeItem {
  label?: string;
  id?: string;
  contextValue?: string;
  tooltip?: unknown;
  description?: string;
  iconPath?: unknown;
  command?: unknown;
  collapsibleState: TreeItemCollapsibleState;

  constructor(label: string, collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

// Mock ThemeIcon
export class ThemeIcon {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

// Mock MarkdownString
export class MarkdownString {
  value: string;
  constructor(value: string = '') {
    this.value = value;
  }
}

// Mock EventEmitter (VS Code style)
export class EventEmitter<T = void> {
  private listeners: Array<(e: T) => unknown> = [];

  get event(): (listener: (e: T) => unknown) => { dispose: () => void } {
    return (listener: (e: T) => unknown) => {
      this.listeners.push(listener);
      return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
    };
  }

  fire(data?: T): void {
    this.listeners.forEach(l => l(data as T));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// Export everything as the vscode module
export default {
  Uri,
  workspace,
  FileType,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  MarkdownString,
  EventEmitter
};
