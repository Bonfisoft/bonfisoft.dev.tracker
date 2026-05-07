import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import {
  createIssueHandler,
  editIssueHandler,
  deleteIssueHandler,
  changeStatusHandler,
  searchIssuesHandler,
  filterIssuesHandler,
} from '../../src/commands/issueCommands.ts';
import { IssueType, Severity, Urgency, Status } from '../../src/types/issue.ts';
import type { Issue } from '../../src/types/issue.ts';

// ==================== VS Code mock ====================
// vi.mock is hoisted — factory must not reference top-level variables

vi.mock('vscode', () => ({
  window: {
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createQuickPick: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn(),
  },
}));

// ==================== Service mocks ====================

function makeIssueService(overrides: Partial<{
  createIssue: MockedFunction<() => Promise<Issue>>;
  getIssue: MockedFunction<() => Promise<Issue | null>>;
  updateIssue: MockedFunction<() => Promise<Issue>>;
  deleteIssue: MockedFunction<() => Promise<void>>;
  getAllIssues: MockedFunction<() => Promise<Issue[]>>;
  filterIssues: MockedFunction<() => Promise<Issue[]>>;
}> = {}) {
  return {
    createIssue: vi.fn(),
    getIssue: vi.fn(),
    updateIssue: vi.fn(),
    deleteIssue: vi.fn(),
    getAllIssues: vi.fn(),
    filterIssues: vi.fn(),
    searchIssues: vi.fn(),
    ...overrides,
  } as unknown as import('../../src/services/IssueService.ts').IssueService;
}

function makeSearchService(overrides = {}) {
  return {
    search: vi.fn(),
    searchForQuickPick: vi.fn(),
    toQuickPickItems: vi.fn(),
    ...overrides,
  } as unknown as import('../../src/services/SearchService.ts').SearchService;
}

function makeIssue(partial: Partial<Issue> = {}): Issue {
  return {
    id: 'test-id-1',
    title: 'Test Bug',
    description: '',
    type: IssueType.Bug,
    severity: Severity.High,
    urgency: Urgency.Normal,
    status: Status.Open,
    reporter: 'tester',
    assignee: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reportedInVersion: null,
    fixedInVersion: null,
    tags: [],
    milestoneId: null,
    sprintId: null,
    relations: [],
    codeLinks: [],
    comments: [],
    timeLogs: [],
    ...partial,
  };
}

// ==================== Tests ====================

describe('issueCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue('bug') } as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);
  });

  // ==================== createIssueHandler ====================

  describe('createIssueHandler', () => {
    it('should create issue when user completes all wizard steps', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.createIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never)      // type
        .mockResolvedValueOnce({ label: 'High', value: 'high' } as never)    // severity
        .mockResolvedValueOnce({ label: 'Normal', value: 'normal' } as never); // urgency
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('Test Bug');                 // title

      await createIssueHandler(issueService);

      expect(issueService.createIssue).toHaveBeenCalledWith({
        title: 'Test Bug',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
      });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Issue created: Test Bug');
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('bonfisoft-issues.viewIssue', issue.id);
    });

    it('should cancel and not create when user escapes type picker', async () => {
      const issueService = makeIssueService();
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined as never);

      await createIssueHandler(issueService);

      expect(issueService.createIssue).not.toHaveBeenCalled();
    });

    it('should cancel and not create when user escapes title input', async () => {
      const issueService = makeIssueService();
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);

      await createIssueHandler(issueService);

      expect(issueService.createIssue).not.toHaveBeenCalled();
    });

    it('should cancel and not create when user escapes severity picker', async () => {
      const issueService = makeIssueService();
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never)
        .mockResolvedValueOnce(undefined as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('Title');

      await createIssueHandler(issueService);

      expect(issueService.createIssue).not.toHaveBeenCalled();
    });

    it('should cancel and not create when user escapes urgency picker', async () => {
      const issueService = makeIssueService();
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never)
        .mockResolvedValueOnce({ label: 'High', value: 'high' } as never)
        .mockResolvedValueOnce(undefined as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('Title');

      await createIssueHandler(issueService);

      expect(issueService.createIssue).not.toHaveBeenCalled();
    });

    it('should show error message when service throws', async () => {
      const issueService = makeIssueService();
      (issueService.createIssue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('storage error'));

      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never)
        .mockResolvedValueOnce({ label: 'High', value: 'high' } as never)
        .mockResolvedValueOnce({ label: 'Normal', value: 'normal' } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('Title');

      await createIssueHandler(issueService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create issue')
      );
    });

    it('should trim whitespace from title', async () => {
      const issue = makeIssue({ title: 'Trimmed' });
      const issueService = makeIssueService();
      (issueService.createIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ label: 'Bug', value: 'bug' } as never)
        .mockResolvedValueOnce({ label: 'High', value: 'high' } as never)
        .mockResolvedValueOnce({ label: 'Normal', value: 'normal' } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('  Trimmed  ');

      await createIssueHandler(issueService);

      expect((issueService.createIssue as ReturnType<typeof vi.fn>).mock.calls[0][0].title).toBe('Trimmed');
    });
  });

  // ==================== editIssueHandler ====================

  describe('editIssueHandler', () => {
    it('should show error when issue not found', async () => {
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await editIssueHandler(issueService, 'missing-id');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Issue not found');
      expect(issueService.updateIssue).not.toHaveBeenCalled();
    });

    it('should update title when user selects title field', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ ...issue, title: 'New Title' });

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({ field: 'title', label: '$(pencil) Title', description: issue.title } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('New Title');

      await editIssueHandler(issueService, issue.id);

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { title: 'New Title' });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Issue updated: ${issue.title}`);
    });

    it('should update severity when user selects severity field', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ field: 'severity', label: '$(error) Severity', description: 'high' } as never)
        .mockResolvedValueOnce({ label: 'critical' } as never);

      await editIssueHandler(issueService, issue.id);

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { severity: 'critical' });
    });

    it('should update status when user selects status field', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({ field: 'status', label: '$(git-pull-request) Status', description: 'open' } as never)
        .mockResolvedValueOnce({ label: Status.InProgress } as never);

      await editIssueHandler(issueService, issue.id);

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { status: Status.InProgress });
    });

    it('should set assignee to null when user clears the field', async () => {
      const issue = makeIssue({ assignee: 'alice' });
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({ field: 'assignee', label: '$(person) Assignee', description: 'alice' } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('');

      await editIssueHandler(issueService, issue.id);

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { assignee: null });
    });

    it('should cancel when user escapes the field picker', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined as never);

      await editIssueHandler(issueService, issue.id);

      expect(issueService.updateIssue).not.toHaveBeenCalled();
    });

    it('should show error when service throws on update', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('update failed'));
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({ field: 'title', label: '$(pencil) Title', description: issue.title } as never);
      vi.mocked(vscode.window.showInputBox).mockResolvedValue('New Title');

      await editIssueHandler(issueService, issue.id);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to edit issue')
      );
    });
  });

  // ==================== deleteIssueHandler ====================

  describe('deleteIssueHandler', () => {
    it('should delete issue when user confirms', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.deleteIssue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Delete' as never);

      await deleteIssueHandler(issueService, issue.id);

      expect(issueService.deleteIssue).toHaveBeenCalledWith(issue.id);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Issue deleted: ${issue.title}`);
    });

    it('should not delete when user cancels confirmation', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined as never);

      await deleteIssueHandler(issueService, issue.id);

      expect(issueService.deleteIssue).not.toHaveBeenCalled();
    });

    it('should show error when issue not found', async () => {
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await deleteIssueHandler(issueService, 'missing');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Issue not found');
      expect(issueService.deleteIssue).not.toHaveBeenCalled();
    });

    it('should show error when service throws', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.deleteIssue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('delete failed'));
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Delete' as never);

      await deleteIssueHandler(issueService, issue.id);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete issue')
      );
    });
  });

  // ==================== changeStatusHandler ====================

  describe('changeStatusHandler', () => {
    it('should update status and show confirmation', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ ...issue, status: Status.Closed });

      await changeStatusHandler(issueService, issue.id, Status.Closed, 'closed');

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { status: Status.Closed });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Issue closed: ${issue.title}`);
    });

    it('should show error when issue not found', async () => {
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await changeStatusHandler(issueService, 'missing', Status.Closed, 'closed');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Issue not found');
      expect(issueService.updateIssue).not.toHaveBeenCalled();
    });

    it('should handle resolve verb', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);

      await changeStatusHandler(issueService, issue.id, Status.Resolved, 'resolved');

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Issue resolved: ${issue.title}`);
    });

    it('should handle reopen verb', async () => {
      const issue = makeIssue({ status: Status.Closed });
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ ...issue, status: Status.Open });

      await changeStatusHandler(issueService, issue.id, Status.Open, 'reopened');

      expect(issueService.updateIssue).toHaveBeenCalledWith(issue.id, { status: Status.Open });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Issue reopened: ${issue.title}`);
    });

    it('should show error when service throws', async () => {
      const issue = makeIssue();
      const issueService = makeIssueService();
      (issueService.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(issue);
      (issueService.updateIssue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('update failed'));

      await changeStatusHandler(issueService, issue.id, Status.Closed, 'closed');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update issue status')
      );
    });
  });

  // ==================== searchIssuesHandler ====================

  describe('searchIssuesHandler', () => {
    it('should show info message when no issues exist', async () => {
      const issueService = makeIssueService();
      const searchService = makeSearchService();
      (issueService.getAllIssues as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await searchIssuesHandler(issueService, searchService);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No issues found in this workspace.'
      );
    });

    it('should create a QuickPick with all issues when issues exist', async () => {
      const issues = [makeIssue(), makeIssue({ id: 'test-id-2', title: 'Second Bug' })];
      const issueService = makeIssueService();
      const searchService = makeSearchService();
      (issueService.getAllIssues as ReturnType<typeof vi.fn>).mockResolvedValue(issues);

      const mockQP = {
        placeholder: '',
        title: '',
        matchOnDescription: false,
        matchOnDetail: false,
        items: [] as unknown[],
        onDidChangeValue: vi.fn(),
        onDidAccept: vi.fn(),
        onDidHide: vi.fn(),
        show: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.window.createQuickPick).mockReturnValue(mockQP as never);

      await searchIssuesHandler(issueService, searchService);

      expect(vscode.window.createQuickPick).toHaveBeenCalled();
      expect(mockQP.show).toHaveBeenCalled();
      expect(mockQP.items).toHaveLength(2);
    });

    it('should show error message when service throws', async () => {
      const issueService = makeIssueService();
      const searchService = makeSearchService();
      (issueService.getAllIssues as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));

      await searchIssuesHandler(issueService, searchService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to search issues')
      );
    });
  });

  // ==================== filterIssuesHandler ====================

  describe('filterIssuesHandler', () => {
    it('should call filterIssues with correct criteria and show count', async () => {
      const issueService = makeIssueService();
      const issues = [makeIssue(), makeIssue({ id: '2' })];
      (issueService.filterIssues as ReturnType<typeof vi.fn>).mockResolvedValue(issues);

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: '$(circle-outline) Open issues',
        filter: { status: Status.Open },
      } as never);

      await filterIssuesHandler(issueService);

      expect(issueService.filterIssues).toHaveBeenCalledWith({ status: Status.Open });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('2 issues')
      );
    });

    it('should not call filterIssues when user cancels', async () => {
      const issueService = makeIssueService();
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined as never);

      await filterIssuesHandler(issueService);

      expect(issueService.filterIssues).not.toHaveBeenCalled();
    });

    it('should use singular "issue" when count is 1', async () => {
      const issueService = makeIssueService();
      (issueService.filterIssues as ReturnType<typeof vi.fn>).mockResolvedValue([makeIssue()]);

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: '$(error) Critical severity',
        filter: { severity: 'critical' },
      } as never);

      await filterIssuesHandler(issueService);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('1 issue')
      );
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalledWith(
        expect.stringContaining('1 issues')
      );
    });

    it('should show error message when service throws', async () => {
      const issueService = makeIssueService();
      (issueService.filterIssues as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('filter error'));

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: '$(circle-outline) Open issues',
        filter: { status: Status.Open },
      } as never);

      await filterIssuesHandler(issueService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to filter issues')
      );
    });
  });
});
