# AI Agent Template: Provider Component

> **Purpose**: Generate VS Code UI providers (Tree, CodeLens, Decorations, StatusBar)  
> **Location**: `src/providers/<ProviderName>.ts`  
> **Test Location**: `test/suite/providers.test.ts` (or dedicated file)

---

## Required Reading

1. `docs/requirements/functional-requirements.md` - UI requirements
2. `docs/architecture/layered-architecture.md` - Provider layer responsibilities
3. VS Code API docs for relevant provider type

---

## Provider Types

| Provider | Purpose | Interface |
|----------|---------|-----------|
| TreeDataProvider | Sidebar tree views | `vscode.TreeDataProvider<T>` |
| CodeLensProvider | Inline code annotations | `vscode.CodeLensProvider` |
| DecorationProvider | Gutter icons, highlights | `vscode.FileDecorationProvider` |

---

## Template: TreeDataProvider (IssueTreeProvider)

### Step 1: Test Structure

```typescript
// test/suite/issueTreeProvider.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueTreeProvider } from '../../src/providers/IssueTreeProvider.js';
import { IssueDatabase } from '../../src/database/IssueDatabase.js';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.js';

describe('IssueTreeProvider', () => {
  let database: IssueDatabase;
  let provider: IssueTreeProvider;
  
  beforeEach(() => {
    const storage = new InMemoryStorageProvider();
    database = new IssueDatabase(storage);
    provider = new IssueTreeProvider(database);
  });
  
  describe('getChildren', () => {
    it('should return grouped issues by status', async () => {
      // Create test issues
      await database.createIssue({ title: 'Bug 1', type: 'bug', severity: 'high', urgency: 'normal', status: 'open' });
      await database.createIssue({ title: 'Bug 2', type: 'bug', severity: 'high', urgency: 'normal', status: 'closed' });
      
      const children = await provider.getChildren();
      
      expect(children).toHaveLength(2); // Open and Closed groups
    });
    
    it('should return issues when group expanded', async () => {
      const issue = await database.createIssue({ title: 'Bug', type: 'bug', severity: 'high', urgency: 'normal' });
      
      const groupNode = { type: 'group', label: 'open', issues: [issue] };
      const children = await provider.getChildren(groupNode);
      
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(issue.id);
    });
  });
  
  describe('getTreeItem', () => {
    it('should create tree item for issue', async () => {
      const issue = await database.createIssue({ title: 'Test', type: 'bug', severity: 'high', urgency: 'normal' });
      
      const item = provider.getTreeItem(issue);
      
      expect(item.label).toBe('Test');
      expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
      expect(item.contextValue).toBe('issue');
    });
  });
});
```

### Step 2: Implementation

```typescript
// src/providers/IssueTreeProvider.ts

import * as vscode from 'vscode';
import type { IssueDatabase } from '../database/IssueDatabase.js';
import type { Issue, Status } from '../types/issue.js';
import { COMMANDS } from '../constants.js';
import { logger } from '../utils/logger.js';

// Tree item types
type TreeNode = GroupNode | IssueNode;

interface GroupNode {
  type: 'group';
  status: Status;
  count: number;
}

interface IssueNode {
  type: 'issue';
  issue: Issue;
}

export class IssueTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  constructor(private readonly database: IssueDatabase) {
    // Subscribe to database changes
    this.database.onDidChangeIssues(() => {
      this.refresh();
    });
  }
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.type === 'group') {
      return this.getGroupTreeItem(element);
    }
    return this.getIssueTreeItem(element.issue);
  }
  
  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      // Root level - return groups
      return this.getGroups();
    }
    
    if (element.type === 'group') {
      // Return issues in this group
      const issues = await this.database.getIssuesByStatus(element.status);
      return issues.map(issue => ({ type: 'issue', issue }));
    }
    
    // Issue has no children
    return [];
  }
  
  private async getGroups(): Promise<GroupNode[]> {
    const allIssues = await this.database.getAllIssues();
    
    // Group by status
    const byStatus = new Map<Status, number>();
    for (const issue of allIssues) {
      const count = byStatus.get(issue.status) || 0;
      byStatus.set(issue.status, count + 1);
    }
    
    // Create group nodes (sorted by status order)
    const statusOrder: Status[] = ['open', 'in_progress', 'in_review', 'on_hold', 'resolved', 'closed', 'wont_fix'];
    
    return statusOrder
      .filter(status => byStatus.has(status))
      .map(status => ({
        type: 'group' as const,
        status,
        count: byStatus.get(status)!
      }));
  }
  
  private getGroupTreeItem(group: GroupNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${this.formatStatus(group.status)} (${group.count})`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    
    item.contextValue = 'group';
    item.iconPath = new vscode.ThemeIcon('folder');
    
    return item;
  }
  
  private getIssueTreeItem(issue: Issue): vscode.TreeItem {
    const item = new vscode.TreeItem(
      issue.title,
      vscode.TreeItemCollapsibleState.None
    );
    
    item.id = issue.id;
    item.contextValue = 'issue';
    item.tooltip = `${issue.title}\nType: ${issue.type}\nSeverity: ${issue.severity}`;
    
    // Command on click
    item.command = {
      command: COMMANDS.VIEW_ISSUE,
      title: 'View Issue',
      arguments: [issue.id]
    };
    
    // Icon based on severity
    item.iconPath = this.getSeverityIcon(issue.severity);
    
    return item;
  }
  
  private formatStatus(status: Status): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  private getSeverityIcon(severity: string): vscode.ThemeIcon {
    switch (severity) {
      case 'critical': return new vscode.ThemeIcon('error');
      case 'high': return new vscode.ThemeIcon('warning');
      default: return new vscode.ThemeIcon('issue-opened');
    }
  }
}
```

### Step 3: Registration

```typescript
// src/extension.ts

import { IssueTreeProvider } from './providers/IssueTreeProvider.js';

export function activate(context: vscode.ExtensionContext) {
  // ... other setup
  
  const issueTreeProvider = new IssueTreeProvider(database);
  
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('bonfisoftIssues', issueTreeProvider)
  );
  
  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.REFRESH_ISSUES, () => {
      issueTreeProvider.refresh();
    })
  );
}
```

---

## Template: CodeLensProvider

### Implementation

```typescript
// src/providers/IssueCodeLensProvider.ts

import * as vscode from 'vscode';
import type { IssueDatabase } from '../database/IssueDatabase.js';
import { COMMANDS } from '../constants.js';

export class IssueCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  
  constructor(private readonly database: IssueDatabase) {
    this.database.onDidChangeIssues(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }
  
  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const filePath = vscode.workspace.asRelativePath(document.uri);
    
    // Find issues linked to this file
    const issues = await this.database.getIssuesWithCodeLinks();
    
    for (const issue of issues) {
      for (const link of issue.codeLinks) {
        if (link.filePath === filePath) {
          const range = new vscode.Range(
            link.lineStart - 1,  // VS Code uses 0-based
            0,
            link.lineStart - 1,
            0
          );
          
          const lens = new vscode.CodeLens(range, {
            title: `[🔗 Issue #${this.getDisplayId(issue)}: ${this.truncate(issue.title, 30)}]`,
            command: COMMANDS.VIEW_ISSUE,
            arguments: [issue.id]
          });
          
          lenses.push(lens);
        }
      }
    }
    
    return lenses;
  }
  
  private getDisplayId(issue: Issue): string {
    // Could use short ID if implemented
    return issue.id.slice(0, 8);
  }
  
  private truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}
```

### Registration

```typescript
// extension.ts

const codeLensProvider = new IssueCodeLensProvider(database);

context.subscriptions.push(
  vscode.languages.registerCodeLensProvider(
    { pattern: '**/*' },
    codeLensProvider
  )
);
```

---

## Template: DecorationProvider (Gutter)

### Implementation

```typescript
// src/providers/IssueDecorationProvider.ts

import * as vscode from 'vscode';
import type { IssueDatabase } from '../database/IssueDatabase.js';

export class IssueDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;
  
  private decorations = new Map<string, vscode.FileDecoration>();
  
  constructor(private readonly database: IssueDatabase) {
    this.database.onDidChangeIssues(() => {
      this.updateDecorations();
    });
  }
  
  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    const filePath = vscode.workspace.asRelativePath(uri);
    
    // Check if any issues link to this file
    const issues = await this.database.getIssuesWithCodeLinks();
    const hasLinks = issues.some(issue => 
      issue.codeLinks.some(link => link.filePath === filePath)
    );
    
    if (hasLinks) {
      return {
        badge: '🔗',
        tooltip: 'Linked to issues',
        color: new vscode.ThemeColor('foreground')
      };
    }
    
    return undefined;
  }
  
  private async updateDecorations(): Promise<void> {
    // Fire event to refresh all decorations
    this._onDidChangeFileDecorations.fire([]);
  }
}
```

---

## Template: StatusBarProvider

### Implementation

```typescript
// src/providers/StatusBarProvider.ts

import * as vscode from 'vscode';
import type { IssueDatabase } from '../database/IssueDatabase.js';
import { COMMANDS } from '../constants.js';
import { logger } from '../utils/logger.js';

export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor(private readonly database: IssueDatabase) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    
    this.statusBarItem.command = COMMANDS.OPEN_DASHBOARD;
    
    // Subscribe to changes
    this.database.onDidChangeIssues(() => {
      this.update();
    });
    
    this.update();
  }
  
  async update(): Promise<void> {
    try {
      const issues = await this.database.getAllIssues();
      const openCount = issues.filter(i => i.status === 'open').length;
      const criticalCount = issues.filter(i => 
        i.status === 'open' && i.severity === 'critical'
      ).length;
      
      // Build text
      let text = `$(issues) Issues: ${openCount}`;
      if (criticalCount > 0) {
        text += ` $(error) ${criticalCount} Critical`;
      }
      
      this.statusBarItem.text = text;
      
      // Warning color for critical
      if (criticalCount > 0) {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      } else {
        this.statusBarItem.backgroundColor = undefined;
      }
      
      this.statusBarItem.show();
    } catch (error) {
      logger.error(`failed to update status bar: ${error}`);
      this.statusBarItem.hide();
    }
  }
  
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
```

### Registration

```typescript
// extension.ts

const statusBarProvider = new StatusBarProvider(database);
context.subscriptions.push(statusBarProvider);
```

---

## Provider Checklist

Before finishing, verify:

- [ ] Implements correct VS Code provider interface
- [ ] Subscribes to database events for auto-refresh
- [ ] Proper EventEmitter setup for VS Code to listen
- [ ] Handles disposal correctly
- [ ] No direct storage access (only through database)
- [ ] Test coverage > 80%
- [ ] Icons use ThemeIcon for color theme compatibility
- [ ] Commands registered with proper constants

---

## Key Patterns

### Event-Driven Refresh

```typescript
// GOOD: Refresh when data changes
constructor(database: IssueDatabase) {
  database.onDidChangeIssues(() => {
    this.refresh();
  });
}
```

### Icon Theme Compatibility

```typescript
// GOOD: Use ThemeIcon
item.iconPath = new vscode.ThemeIcon('issue-opened');

// BAD: Hard-coded icon path
item.iconPath = vscode.Uri.file('/path/to/icon.png');
```

### Disposal

```typescript
// GOOD: Provider manages its own resources
dispose(): void {
  this.statusBarItem.dispose();
}

// In extension.ts
context.subscriptions.push(provider);
```
