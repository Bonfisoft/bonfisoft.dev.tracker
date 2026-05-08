/**
 * IssueDetailPanel tests - TDD for webview panel
 * @module test/suite/issueDetailPanel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { IssueService } from '../../src/services/IssueService.ts';
import type { Issue, IssueInput } from '../../src/types/issue.ts';
import { Status, IssueType, Severity, Urgency } from '../../src/types/issue.ts';
import type { IIdGenerator } from '../../src/utils/idGenerator.ts';

// Mock VS Code webview API
// Track callbacks for triggering events
let disposeCallback: (() => void) | undefined;
let messageCallback: ((message: unknown) => void) | undefined;

const mockPostMessage = vi.fn();
const mockOnDidReceiveMessage = vi.fn((callback: (message: unknown) => void) => {
  messageCallback = callback;
  return { dispose: vi.fn() };
});
const mockOnDidDispose = vi.fn((callback: () => void) => {
  disposeCallback = callback;
  return { dispose: vi.fn() };
});
const mockReveal = vi.fn();
const mockDispose = vi.fn();
const mockWebview = {
  html: '',
  postMessage: mockPostMessage,
  onDidReceiveMessage: mockOnDidReceiveMessage,
};
const mockPanel = {
  title: '',
  webview: mockWebview,
  onDidDispose: mockOnDidDispose,
  reveal: mockReveal,
  dispose: mockDispose,
};

// Mock createWebviewPanel
const mockCreateWebviewPanel = vi.fn(() => mockPanel);

// Simple Uri mock class
class MockUri {
  fsPath: string;
  scheme = 'file';
  authority = '';
  path: string;
  query = '';
  fragment = '';

  constructor(path: string) {
    this.fsPath = path;
    this.path = path;
  }

  static file(path: string): MockUri {
    return new MockUri(path);
  }

  static joinPath(base: MockUri, ...segments: string[]): MockUri {
    return new MockUri(`${base.fsPath}/${segments.join('/')}`);
  }

  toString(): string {
    return this.fsPath;
  }
}

// Mock VS Code
vi.mock('vscode', () => ({
  Uri: MockUri,
  window: {
    createWebviewPanel: mockCreateWebviewPanel,
    showTextDocument: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    openTextDocument: vi.fn(),
  },
  ViewColumn: { One: 1 },
  Disposable: class {
    dispose = vi.fn();
  },
  Position: class {
    line: number;
    character: number;
    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  },
  Selection: class {
    anchor: unknown;
    active: unknown;
    constructor(anchor: unknown, active: unknown) {
      this.anchor = anchor;
      this.active = active;
    }
  },
  Range: class {
    start: unknown;
    end: unknown;
    constructor(start: unknown, end: unknown) {
      this.start = start;
      this.end = end;
    }
  },
}));

describe('IssueDetailPanel', () => {
  let storage: InMemoryStorageProvider;
  let database: IssuesDatabase;
  let issueService: IssueService;
  let extensionUri: { fsPath: string };

  let idCounter = 0;
  const mockIdGenerator: IIdGenerator = {
    generateUUID: () => `test-id-${++idCounter}-${Date.now()}`
  };

  beforeEach(async () => {
    idCounter = 0;
    storage = new InMemoryStorageProvider();
    database = new IssuesDatabase(storage, mockIdGenerator);
    await database.initialize();
    issueService = new IssueService(database);
    extensionUri = { fsPath: '/test/extension' };

    // Reset mocks and callbacks
    vi.clearAllMocks();
    mockWebview.html = '';
    mockPostMessage.mockClear();
    disposeCallback = undefined;
    messageCallback = undefined;

    // Clear module cache to ensure fresh IssueDetailPanel singleton state
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('singleton pattern', () => {
    it('should create new panel when none exists for issue', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        description: 'Test description',
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      const panel = IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(panel).toBeDefined();
      expect(mockCreateWebviewPanel).toHaveBeenCalledOnce();
    });

    it('should return existing panel and reveal it for same issue', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      const panel1 = IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);
      const panel2 = IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(panel1).toBe(panel2);
      expect(mockReveal).toHaveBeenCalledOnce();
      expect(mockCreateWebviewPanel).toHaveBeenCalledOnce();
    });

    it('should create separate panels for different issues', async () => {
      const issue1 = await issueService.createIssue({
        title: 'Issue 1',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });
      const issue2 = await issueService.createIssue({
        title: 'Issue 2',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Immediate,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue1.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);
      IssueDetailPanel.show(issue2.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(mockCreateWebviewPanel).toHaveBeenCalledTimes(2);
    });
  });

  describe('webview initialization', () => {
    it('should load issue data and set webview HTML', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue Title',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        description: 'Test description content',
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebview.html).toContain('Test Issue Title');
      expect(mockWebview.html).toContain('Test description content');
      expect(mockPanel.title).toContain('Test Issue Title');
    });

    it('should show error HTML when issue not found', async () => {
      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show('non-existent-id', issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebview.html.toLowerCase()).toContain('error');
      expect(mockWebview.html.toLowerCase()).toContain('not found');
    });

    it('should include CSP meta tag in HTML', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebview.html).toContain('Content-Security-Policy');
      expect(mockWebview.html).toContain("script-src 'nonce-");
    });

    it('should escape HTML in issue content', async () => {
      const issue = await issueService.createIssue({
        title: '<script>alert("xss")</script>',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        description: '<img src=x>',
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Title should be escaped
      expect(mockWebview.html).not.toContain('<script>alert("xss")</script>');
      expect(mockWebview.html).toContain('&lt;script&gt;');

      // Description should be escaped
      expect(mockWebview.html).not.toContain('<img src=x>');
      expect(mockWebview.html).toContain('&lt;img src=x&gt;');
    });
  });

  describe('field updates', () => {
    it('should handle updateField message for title', async () => {
      const issue = await issueService.createIssue({
        title: 'Original Title',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Use the captured callback
      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'title',
        value: 'Updated Title',
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.title).toBe('Updated Title');
      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'fieldUpdated',
        field: 'title',
      }));
    });

    it('should handle updateField message for status', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'status',
        value: Status.InProgress,
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.status).toBe(Status.InProgress);
    });

    it('should handle updateField message for type', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'type',
        value: IssueType.Feature,
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.type).toBe(IssueType.Feature);
    });

    it('should handle updateField message for severity', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'severity',
        value: Severity.Critical,
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.severity).toBe(Severity.Critical);
    });

    it('should handle updateField message for urgency', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'urgency',
        value: Urgency.Immediate,
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.urgency).toBe(Urgency.Immediate);
    });

    it('should handle updateField message for assignee', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'assignee',
        value: 'john.doe',
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.assignee).toBe('john.doe');
    });

    it('should handle updateField message for description', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        description: 'Original description',
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'description',
        value: 'Updated description',
      });

      const updated = await issueService.getIssue(issue.id);
      expect(updated?.description).toBe('Updated description');
    });

    it('should send error message to webview on update failure', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      // Mock update to fail
      vi.spyOn(issueService, 'updateIssue').mockRejectedValueOnce(new Error('update failed'));

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();
      await (messageCallback as (message: unknown) => void)({
        command: 'updateField',
        field: 'title',
        value: 'New Title',
      });

      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('failed to update'),
      }));
    });
  });

  describe('external change synchronization', () => {
    it.skip('should update panel when issue changes externally', async () => {
      // TODO: Requires async event handling - panel subscribes to onDidChangeIssues
      // and should receive notification when issue is updated externally
    });

    it.skip('should refresh HTML content when issue updated externally', async () => {
      // TODO: Requires async event handling verification
    });
  });

  describe('comments', () => {
    it('should display comments in HTML', async () => {
      // Create issue with a comment
      const issue = await issueService.createIssue({
        title: 'Issue with Comment',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        description: 'Test description',
      });

      // Add a comment
      await issueService.addComment(issue.id, 'testuser', 'This is a test comment');

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check comment appears in HTML
      expect(mockWebview.html).toContain('Comments (1)');
      expect(mockWebview.html).toContain('testuser');
      expect(mockWebview.html).toContain('This is a test comment');
    });

    it('should handle addComment message', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();

      // Send addComment message
      await (messageCallback as (message: unknown) => void)({
        command: 'addComment',
        body: 'New comment from panel',
      });

      // Verify the issue now has the comment
      const updated = await issueService.getIssue(issue.id);
      expect(updated?.comments).toHaveLength(1);
      expect(updated?.comments[0].body).toBe('New comment from panel');
      expect(updated?.comments[0].author).toBe('user');
    });

    it('should handle deleteComment message', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      // Add a comment first
      const updated = await issueService.addComment(issue.id, 'testuser', 'Comment to delete');
      const commentId = updated?.comments[0].id;

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(messageCallback).toBeDefined();

      // Send deleteComment message
      await (messageCallback as (message: unknown) => void)({
        command: 'deleteComment',
        commentId: commentId,
      });

      // Verify comment was deleted
      const afterDelete = await issueService.getIssue(issue.id);
      expect(afterDelete?.comments).toHaveLength(0);
    });

    it('should show empty state when no comments', async () => {
      const issue = await issueService.createIssue({
        title: 'No Comments Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Wait for async loadIssue to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebview.html).toContain('Comments (0)');
      expect(mockWebview.html).toContain('No comments yet');
    });

    it('should escape HTML in comment body', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      await issueService.addComment(issue.id, 'testuser', '<script>alert("xss")</script>');

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebview.html).not.toContain('<script>alert("xss")</script>');
      expect(mockWebview.html).toContain('&lt;script&gt;');
    });
  });

  describe('disposal', () => {
    it('should remove panel from static map on dispose', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      // Use the captured callback
      expect(disposeCallback).toBeDefined();
      (disposeCallback as () => void)();

      // Creating a new panel should create a new webview panel
      mockCreateWebviewPanel.mockClear();
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);
      expect(mockCreateWebviewPanel).toHaveBeenCalledOnce();
    });

    it('should clean up all disposables on dispose', async () => {
      const issue = await issueService.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
      });

      const { IssueDetailPanel } = await import('../../src/panels/IssueDetailPanel.ts');
      IssueDetailPanel.show(issue.id, issueService, extensionUri as unknown as typeof import('vscode').Uri);

      expect(disposeCallback).toBeDefined();
      (disposeCallback as () => void)();

      expect(mockDispose).toHaveBeenCalled();
    });
  });
});
