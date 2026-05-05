# AI Agent Template: Panel Component (Webview)

> **Purpose**: Generate VS Code webview panels for detailed views and dashboards  
> **Location**: `src/panels/<PanelName>.ts`  
**Test**: E2E tests only (Playwright)

---

## Required Reading

1. `docs/requirements/functional-requirements.md` - WEBVIEW-xxx requirements
2. VS Code Webview API documentation
3. `docs/ai-agent-templates/command-template.md` - Panels are opened via commands

---

## Panel Types

| Type | Purpose | Example |
|------|---------|---------|
| Detail Panel | Show/edit single entity | IssueDetailPanel |
| Dashboard | Aggregate metrics | DashboardPanel |

---

## Key Concepts

### Singleton Pattern

Each panel type should be a singleton - only one instance per entity/screen.

### Message Passing

Webviews communicate with extension via `postMessage`:

- Webview → Extension: `webview.postMessage({ command: 'save', data: {...} })`
- Extension → Webview: `panel.webview.postMessage({ type: 'update', data: {...} })`

### State Management

Panel state should sync when underlying data changes via database events.

---

## Template: IssueDetailPanel

### Step 1: Implementation

```typescript
// src/panels/IssueDetailPanel.ts

import * as vscode from 'vscode';
import type { IssueService } from '../services/IssueService.js';
import type { Issue } from '../types/issue.js';
import { COMMANDS } from '../constants.js';
import { logger } from '../utils/logger.js';

export class IssueDetailPanel {
  private static panels = new Map<string, IssueDetailPanel>();
  private panel: vscode.WebviewPanel;
  private issueId: string;
  private disposables: vscode.Disposable[] = [];
  
  public static show(
    issueId: string,
    issueService: IssueService,
    extensionUri: vscode.Uri
  ): IssueDetailPanel {
    // Return existing panel if open
    const existing = IssueDetailPanel.panels.get(issueId);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }
    
    // Create new panel
    const panel = new IssueDetailPanel(issueId, issueService, extensionUri);
    IssueDetailPanel.panels.set(issueId, panel);
    return panel;
  }
  
  private constructor(
    issueId: string,
    private issueService: IssueService,
    extensionUri: vscode.Uri
  ) {
    this.issueId = issueId;
    
    // Create webview panel
    this.panel = vscode.window.createWebviewPanel(
      'issueDetail',
      `Issue: ${issueId.slice(0, 8)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );
    
    // Set up message handling
    this.setupMessageHandling();
    
    // Load initial data
    this.loadIssue();
    
    // Handle dispose
    this.panel.onDidDispose(() => {
      this.dispose();
    }, null, this.disposables);
  }
  
  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'updateField':
            await this.handleUpdateField(message.field, message.value);
            break;
            
          case 'closeIssue':
            await this.handleCloseIssue();
            break;
            
          case 'resolveIssue':
            await this.handleResolveIssue(message.version);
            break;
            
          case 'addComment':
            await this.handleAddComment(message.text);
            break;
            
          case 'openCodeLink':
            await this.handleOpenCodeLink(message.filePath, message.line);
            break;
        }
      },
      null,
      this.disposables
    );
  }
  
  private async loadIssue(): Promise<void> {
    try {
      const issue = await this.issueService.getIssue(this.issueId);
      
      if (!issue) {
        this.panel.webview.html = this.getErrorHtml('Issue not found');
        return;
      }
      
      // Update panel title
      this.panel.title = `Issue: ${issue.title.slice(0, 30)}`;
      
      // Set HTML content
      this.panel.webview.html = this.getHtmlForWebview(issue);
      
    } catch (error) {
      logger.error(`failed to load issue ${this.issueId}: ${error}`);
      this.panel.webview.html = this.getErrorHtml('Failed to load issue');
    }
  }
  
  private async handleUpdateField(field: string, value: unknown): Promise<void> {
    try {
      const updates: Partial<Issue> = { [field]: value };
      const updated = await this.issueService.updateIssue(this.issueId, updates);
      
      if (updated) {
        // Send update to webview
        this.panel.webview.postMessage({
          type: 'fieldUpdated',
          field,
          value,
          updatedAt: updated.updatedAt
        });
      }
    } catch (error) {
      logger.error(`failed to update field ${field}: ${error}`);
      this.panel.webview.postMessage({
        type: 'error',
        message: `Failed to update ${field}: ${error}`
      });
    }
  }
  
  private async handleOpenCodeLink(filePath: string, line: number): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, filePath)
      );
      
      const editor = await vscode.window.showTextDocument(doc);
      const position = new vscode.Position(line - 1, 0); // 0-based
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
      
    } catch (error) {
      vscode.window.showErrorMessage(`Cannot open file: ${filePath}`);
    }
  }
  
  private getHtmlForWebview(issue: Issue): string {
    const nonce = this.getNonce();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Issue Detail</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 20px;
    }
    
    .field {
      margin-bottom: 16px;
    }
    
    .field-label {
      font-weight: bold;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
    }
    
    .field-value {
      cursor: pointer;
      padding: 4px 8px;
      border: 1px solid transparent;
    }
    
    .field-value:hover {
      border-color: var(--vscode-focusBorder);
    }
    
    .field-value.editing {
      background: var(--vscode-input-background);
      border-color: var(--vscode-focusBorder);
    }
    
    input, select, textarea {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 8px;
      font-family: inherit;
      font-size: inherit;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
    }
    
    .status-open { background: var(--vscode-errorForeground); color: white; }
    .status-resolved { background: var(--vscode-debugIcon-startForeground); color: white; }
  </style>
</head>
<body>
  <div class="field">
    <div class="field-label">Title</div>
    <div class="field-value" id="title" onclick="startEdit('title')">${this.escapeHtml(issue.title)}</div>
  </div>
  
  <div class="field">
    <div class="field-label">Status</div>
    <select id="status" onchange="updateField('status', this.value)">
      <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
      <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
      <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
      <option value="closed" ${issue.status === 'closed' ? 'selected' : ''}>Closed</option>
    </select>
  </div>
  
  <div class="field">
    <div class="field-label">Type</div>
    <select id="type" onchange="updateField('type', this.value)">
      <option value="bug" ${issue.type === 'bug' ? 'selected' : ''}>Bug</option>
      <option value="feature" ${issue.type === 'feature' ? 'selected' : ''}>Feature</option>
      <option value="task" ${issue.type === 'task' ? 'selected' : ''}>Task</option>
    </select>
  </div>
  
  <div class="field">
    <div class="field-label">Description</div>
    <textarea id="description" rows="5" style="width: 100%;">${this.escapeHtml(issue.description)}</textarea>
    <button onclick="updateField('description', document.getElementById('description').value)">Save Description</button>
  </div>
  
  <div class="field">
    <div class="field-label">Code Links</div>
    ${issue.codeLinks.map(link => `
      <div class="code-link" onclick="openCodeLink('${link.filePath}', ${link.lineStart})">
        📄 ${link.filePath}:${link.lineStart}
      </div>
    `).join('')}
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    function updateField(field, value) {
      vscode.postMessage({
        command: 'updateField',
        field: field,
        value: value
      });
    }
    
    function startEdit(field) {
      const el = document.getElementById(field);
      const current = el.textContent;
      
      const input = document.createElement('input');
      input.value = current;
      input.onblur = () => {
        updateField(field, input.value);
        el.textContent = input.value;
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') el.textContent = current;
      };
      
      el.innerHTML = '';
      el.appendChild(input);
      el.classList.add('editing');
      input.focus();
    }
    
    function openCodeLink(filePath, line) {
      vscode.postMessage({
        command: 'openCodeLink',
        filePath: filePath,
        line: line
      });
    }
    
    // Listen for updates from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'fieldUpdated':
          // Field was updated, could show success indicator
          break;
        case 'error':
          alert(message.message);
          break;
      }
    });
  </script>
</body>
</html>`;
  }
  
  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
  <h2 style="color: #f44336;">Error</h2>
  <p>${this.escapeHtml(message)}</p>
</body>
</html>`;
  }
  
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  dispose(): void {
    IssueDetailPanel.panels.delete(this.issueId);
    
    this.panel.dispose();
    
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

### Step 2: Command Integration

```typescript
// src/commands/issueCommands.ts

import { IssueDetailPanel } from '../panels/IssueDetailPanel.js';

async function viewIssueHandler(
  issueService: IssueService,
  extensionUri: vscode.Uri,
  issueId: string
): Promise<void> {
  try {
    const issue = await issueService.getIssue(issueId);
    
    if (!issue) {
      vscode.window.showErrorMessage('Issue not found');
      return;
    }
    
    // Open or reveal panel
    IssueDetailPanel.show(issueId, issueService, extensionUri);
    
  } catch (error) {
    logger.error(`view issue failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to open issue: ${error}`);
  }
}
```

---

## Security Requirements

### Content Security Policy

All webviews must include CSP:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               style-src 'unsafe-inline'; 
               script-src 'nonce-${nonce}';">
```

### Nonce

All scripts must have matching nonce:

```html
<script nonce="${nonce}">
  // Script content
</script>
```

### HTML Escaping

All dynamic content must be escaped:

```typescript
private escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

---

## Panel Checklist

Before finishing, verify:

- [ ] Singleton pattern implemented
- [ ] CSP meta tag included
- [ ] All scripts have nonce attribute
- [ ] HTML escaping for all dynamic content
- [ ] Disposal cleanup implemented
- [ ] Post message handlers for all interactions
- [ ] E2E test for critical flow
- [ ] Uses VS Code CSS variables for theming
