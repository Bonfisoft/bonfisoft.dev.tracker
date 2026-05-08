/**
 * Issue Detail Panel - Webview for viewing and editing issues
 * @module panels/IssueDetailPanel
 */

import * as vscode from 'vscode';
import type { IssueService } from '../services/IssueService.ts';
import type { Issue } from '../types/issue.ts';
import { Status, IssueType, Severity, Urgency } from '../types/issue.ts';
import { logger } from '../utils/logger.ts';

/**
 * Webview panel for viewing and editing a single issue
 * Implements singleton pattern - one panel per issue
 */
export class IssueDetailPanel {
  private static panels = new Map<string, IssueDetailPanel>();
  private panel: vscode.WebviewPanel;
  private issueId: string;
  private disposables: vscode.Disposable[] = [];
  private issueService: IssueService;
  private onDidChangeIssuesDisposable?: { dispose: () => void };

  /**
   * Show or reveal an issue detail panel
   * @param issueId - ID of the issue to display
   * @param issueService - Service for issue CRUD operations
   * @param extensionUri - Extension root URI for resource loading
   * @returns The IssueDetailPanel instance
   */
  public static show(
    issueId: string,
    issueService: IssueService,
    extensionUri: vscode.Uri
  ): IssueDetailPanel {
    const existing = IssueDetailPanel.panels.get(issueId);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }

    const panel = new IssueDetailPanel(issueId, issueService, extensionUri);
    IssueDetailPanel.panels.set(issueId, panel);
    return panel;
  }

  private constructor(
    issueId: string,
    issueService: IssueService,
    extensionUri: vscode.Uri
  ) {
    this.issueId = issueId;
    this.issueService = issueService;

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

    this.setupMessageHandling();
    this.loadIssue();
    this.setupExternalChangeListener();

    this.panel.onDidDispose(() => {
      this.dispose();
    }, null, this.disposables);
  }

  /**
   * Listen for external issue changes and refresh panel
   */
  private setupExternalChangeListener(): void {
    // Subscribe to all issue changes through the service
    this.onDidChangeIssuesDisposable = this.issueService.onDidChangeIssues(() => {
      this.handleExternalChange();
    });
  }

  /**
   * Handle external changes to the issue
   */
  private async handleExternalChange(): Promise<void> {
    try {
      const issue = await this.issueService.getIssue(this.issueId);
      if (issue) {
        const users = await this.issueService.getAllUsers();
        this.panel.webview.html = this.getHtmlForWebview(issue, users);
        this.panel.title = `Issue: ${issue.title.slice(0, 30)}`;
        this.panel.webview.postMessage({
          type: 'issueUpdated',
          issue: issue
        });
      }
    } catch (error) {
      logger.error(`failed to handle external change for issue ${this.issueId}: ${error}`);
    }
  }

  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'updateField':
            await this.handleUpdateField(message.field, message.value);
            break;
          case 'closePanel':
            this.panel.dispose();
            break;
          case 'addComment':
            await this.handleAddComment(message.body);
            break;
          case 'deleteComment':
            await this.handleDeleteComment(message.commentId);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async handleUpdateField(field: string, value: unknown): Promise<void> {
    try {
      const updates: Partial<Issue> = { [field]: value };
      const updated = await this.issueService.updateIssue(this.issueId, updates);

      if (updated) {
        this.panel.webview.postMessage({
          type: 'fieldUpdated',
          field,
          value,
          updatedAt: updated.updatedAt
        });

        // Update panel title if title changed
        if (field === 'title') {
          this.panel.title = `Issue: ${String(value).slice(0, 30)}`;
        }
      }
    } catch (error) {
      logger.error(`failed to update field ${field}: ${error}`);
      this.panel.webview.postMessage({
        type: 'error',
        message: `failed to update ${field}: ${error}`
      });
    }
  }

  private async handleAddComment(body: string): Promise<void> {
    try {
      // Get current user - use 'user' as default for now
      const author = 'user';

      const updated = await this.issueService.addComment(this.issueId, author, body);

      if (updated) {
        this.panel.webview.postMessage({
          type: 'commentAdded',
          issue: updated
        });

        // Refresh the entire panel to show new comment
        const users = await this.issueService.getAllUsers();
        this.panel.webview.html = this.getHtmlForWebview(updated, users);
      }
    } catch (error) {
      logger.error(`failed to add comment: ${error}`);
      this.panel.webview.postMessage({
        type: 'error',
        message: `failed to add comment: ${error}`
      });
    }
  }

  private async handleDeleteComment(commentId: string): Promise<void> {
    try {
      const updated = await this.issueService.deleteComment(this.issueId, commentId);

      if (updated) {
        this.panel.webview.postMessage({
          type: 'commentDeleted',
          commentId
        });
      }
    } catch (error) {
      logger.error(`failed to delete comment: ${error}`);
      this.panel.webview.postMessage({
        type: 'error',
        message: `failed to delete comment: ${error}`
      });
    }
  }

  private async loadIssue(): Promise<void> {
    try {
      const [issue, users] = await Promise.all([
        this.issueService.getIssue(this.issueId),
        this.issueService.getAllUsers()
      ]);

      if (!issue) {
        this.panel.webview.html = this.getErrorHtml('issue not found');
        return;
      }

      this.panel.title = `Issue: ${issue.title.slice(0, 30)}`;
      this.panel.webview.html = this.getHtmlForWebview(issue, users);
    } catch (error) {
      logger.error(`failed to load issue ${this.issueId}: ${error}`);
      this.panel.webview.html = this.getErrorHtml('failed to load issue');
    }
  }

  private getHtmlForWebview(issue: Issue, users: string[]): string {
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
      max-width: 800px;
    }
    .field {
      margin-bottom: 16px;
    }
    .field-label {
      font-weight: bold;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .field-value {
      cursor: pointer;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: 3px;
      min-height: 20px;
    }
    .field-value:hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-input-background);
    }
    .field-value.editing {
      background: var(--vscode-input-background);
      border-color: var(--vscode-focusBorder);
    }
    .field-value.readonly {
      background: var(--vscode-editor-inactiveSelectionBackground);
      cursor: default;
    }
    .field-value.readonly:hover {
      border-color: transparent;
      background: var(--vscode-editor-inactiveSelectionBackground);
    }
    input, select, textarea {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 6px 8px;
      font-family: inherit;
      font-size: inherit;
      border-radius: 3px;
      width: 100%;
      box-sizing: border-box;
    }
    select {
      cursor: pointer;
    }
    textarea {
      resize: vertical;
      min-height: 100px;
    }
    .title-field {
      font-size: 18px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .grid .field {
      min-width: 0;
      overflow: visible;
    }
    .assignee-field {
      position: relative;
    }
    #assignee::-webkit-calendar-picker-indicator {
      opacity: 0.6;
      cursor: pointer;
    }
    #assignee::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }
    .actions {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 3px;
      margin-right: 8px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .meta {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-top: 20px;
    }
    .comments-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .comment {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      position: relative;
    }
    .comment:last-child {
      border-bottom: none;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .comment-author {
      font-weight: bold;
      color: var(--vscode-foreground);
    }
    .comment-date {
      color: var(--vscode-descriptionForeground);
    }
    .comment-delete {
      margin-left: auto;
      padding: 2px 6px;
      font-size: 14px;
      line-height: 1;
      min-width: auto;
      background: transparent;
      color: var(--vscode-errorForeground);
      border: none;
      cursor: pointer;
    }
    .comment-delete:hover {
      background: var(--vscode-errorForeground);
      color: var(--vscode-button-foreground);
      border-radius: 3px;
    }
    .comment-body {
      color: var(--vscode-foreground);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .comment-input {
      width: 100%;
      min-height: 60px;
      resize: vertical;
    }
    .comments-list:empty::before {
      content: 'No comments yet';
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      display: block;
      padding: 16px;
      text-align: center;
    }
    .assignee-history {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .history-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 3px;
      font-size: 13px;
    }
    .history-assignee {
      font-weight: 500;
    }
    .history-date {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="field">
    <div class="field-label">Title</div>
    <div class="field-value title-field" id="title">${this.escapeHtml(issue.title)}</div>
  </div>

  <div class="field">
    <div class="field-label">Description</div>
    <textarea id="description">${this.escapeHtml(issue.description || '')}</textarea>
  </div>

  <div class="grid">
    <div class="field">
      <div class="field-label">Type</div>
      <select id="type">
        ${Object.values(IssueType).map(t => `<option value="${t}" ${issue.type === t ? 'selected' : ''}>${this.capitalize(t)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <div class="field-label">Status</div>
      <select id="status">
        ${Object.values(Status).map(s => `<option value="${s}" ${issue.status === s ? 'selected' : ''}>${this.formatStatus(s)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <div class="field-label">Severity</div>
      <select id="severity">
        ${Object.values(Severity).map(s => `<option value="${s}" ${issue.severity === s ? 'selected' : ''}>${this.capitalize(s)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <div class="field-label">Urgency</div>
      <select id="urgency">
        ${Object.values(Urgency).map(u => `<option value="${u}" ${issue.urgency === u ? 'selected' : ''}>${this.capitalize(u)}</option>`).join('')}
      </select>
    </div>
  </div>

  <div class="grid">
    <div class="field">
      <div class="field-label">Reported by</div>
      <div class="field-value readonly">${this.escapeHtml(issue.reporter || 'Unknown')}</div>
    </div>

    <div class="field assignee-field">
      <div class="field-label">Assignee</div>
      <input type="text" id="assignee" list="usersList" value="${this.escapeHtml(issue.assignee || '')}" placeholder="Type or select a user..." autocomplete="off">
      <datalist id="usersList">
        ${users.map(user => `<option value="${this.escapeHtml(user)}">${this.escapeHtml(user)}</option>`).join('')}
      </datalist>
    </div>
  </div>

  ${issue.assigneeHistory && issue.assigneeHistory.length > 0 ? `
  <div class="field">
    <div class="field-label">Assignee History</div>
    <div class="assignee-history">
      ${issue.assigneeHistory.map((entry) => `
        <div class="history-entry">
          <span class="history-assignee">${this.escapeHtml(entry.assignee)}</span>
          <span class="history-date">${new Date(entry.changedAt).toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="field">
    <div class="field-label">Comments (${issue.comments.length})</div>
    <div id="commentsList" class="comments-list">
      ${issue.comments.map((comment) => `
        <div class="comment" data-id="${comment.id}">
          <div class="comment-header">
            <span class="comment-author">${this.escapeHtml(comment.author)}</span>
            <span class="comment-date">${new Date(comment.createdAt).toLocaleString()}</span>
            <button class="comment-delete" data-id="${comment.id}" title="Delete comment">×</button>
          </div>
          <div class="comment-body">${this.escapeHtml(comment.body)}</div>
        </div>
      `).join('')}
    </div>
    <textarea id="newComment" class="comment-input" placeholder="Add a comment... (press Enter to save)"></textarea>
  </div>

  <div class="actions">
    <button id="closeBtn">Close Panel</button>
  </div>

  <div class="meta">
    Created: ${new Date(issue.createdAt).toLocaleString()}<br>
    Updated: ${new Date(issue.updatedAt).toLocaleString()}<br>
    ID: ${issue.id}
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
      if (el.classList.contains('editing')) return; // Already editing

      const current = el.textContent === 'Unassigned' ? '' : el.textContent;

      // Create input and replace content
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current;
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';

      // Clear and add input
      el.textContent = '';
      el.appendChild(input);
      el.classList.add('editing');

      // Focus after a short delay to ensure element is ready
      setTimeout(() => input.focus(), 0);

      // Handle save on blur
      input.addEventListener('blur', () => {
        const newValue = input.value.trim();
        el.classList.remove('editing');
        if (newValue || field === 'assignee') {
          if (newValue !== current) {
            updateField(field, field === 'assignee' && !newValue ? null : newValue);
          }
          el.textContent = newValue || (field === 'assignee' ? 'Unassigned' : current);
        } else {
          el.textContent = current || (field === 'assignee' ? 'Unassigned' : '');
        }
      });

      // Handle keyboard shortcuts
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        } else if (e.key === 'Escape') {
          el.classList.remove('editing');
          el.textContent = current || (field === 'assignee' ? 'Unassigned' : '');
        }
      });
    }

    function closePanel() {
      vscode.postMessage({ command: 'closePanel' });
    }

    // Attach event listeners after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      // Title click handler (uses inline edit)
      document.getElementById('title').addEventListener('click', () => startEdit('title'));

      // Assignee change handler (uses combobox)
      const assigneeInput = document.getElementById('assignee');
      let previousAssignee = assigneeInput.value;

      assigneeInput.addEventListener('focus', () => {
        previousAssignee = assigneeInput.value;
        assigneeInput.value = ''; // Clear to show all options
      });

      assigneeInput.addEventListener('blur', () => {
        const value = assigneeInput.value.trim();
        if (value !== previousAssignee) {
          updateField('assignee', value || null);
        }
        if (!value) {
          assigneeInput.value = previousAssignee; // Restore if empty
        }
      });

      assigneeInput.addEventListener('change', (e) => {
        const value = e.target.value.trim();
        previousAssignee = value;
        updateField('assignee', value || null);
      });

      // Description blur handler
      document.getElementById('description').addEventListener('blur', () => {
        const value = document.getElementById('description').value;
        updateField('description', value);
      });

      // Select change handlers
      document.getElementById('type').addEventListener('change', (e) => updateField('type', e.target.value));
      document.getElementById('status').addEventListener('change', (e) => updateField('status', e.target.value));
      document.getElementById('severity').addEventListener('change', (e) => updateField('severity', e.target.value));
      document.getElementById('urgency').addEventListener('change', (e) => updateField('urgency', e.target.value));

      // Close button
      document.getElementById('closeBtn').addEventListener('click', closePanel);

      // Comment input - save on blur or Ctrl+Enter
      const newCommentInput = document.getElementById('newComment');
      newCommentInput.addEventListener('blur', saveComment);
      newCommentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          saveComment();
        }
      });

      // Comment delete buttons (event delegation)
      document.getElementById('commentsList').addEventListener('click', (e) => {
        if (e.target.classList.contains('comment-delete')) {
          const commentId = e.target.dataset.id;
          if (confirm('Delete this comment?')) {
            deleteComment(commentId);
          }
        }
      });

      function saveComment() {
        const value = newCommentInput.value.trim();
        if (value) {
          vscode.postMessage({
            command: 'addComment',
            body: value
          });
          newCommentInput.value = '';
        }
      }

      function deleteComment(commentId) {
        vscode.postMessage({
          command: 'deleteComment',
          commentId: commentId
        });
      }
    });

    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.type) {
        case 'fieldUpdated':
          // Field updated successfully - could show visual feedback
          break;
        case 'error':
          alert(message.message);
          break;
        case 'issueUpdated':
          // Issue was updated externally - page refreshed
          break;
        case 'commentAdded':
          // Refresh the comments list
          location.reload();
          break;
        case 'commentDeleted':
          // Remove the deleted comment from DOM
          const commentEl = document.querySelector('.comment[data-id="' + message.commentId + '"]');
          if (commentEl) {
            commentEl.remove();
          }
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
<body style="font-family: var(--vscode-font-family); padding: 20px;">
  <h2 style="color: var(--vscode-errorForeground);">Error</h2>
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
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private formatStatus(status: Status): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  dispose(): void {
    IssueDetailPanel.panels.delete(this.issueId);

    this.onDidChangeIssuesDisposable?.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    this.panel.dispose();
  }
}
