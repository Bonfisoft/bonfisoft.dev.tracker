/**
 * Issue command handlers - thin adapters between VS Code UI and IssueService
 * @module commands/issueCommands
 */

import * as vscode from 'vscode';
import type { IssueService } from '../services/IssueService.ts';
import type { SearchService } from '../services/SearchService.ts';
import { IssueType, Severity, Urgency, Status } from '../types/issue.ts';
import { COMMANDS } from '../constants.ts';
import { logger } from '../utils/logger.ts';
import type { IssueNode } from '../providers/IssueTreeProvider.ts';

/** QuickPick item that carries an issue id */
interface IssueQuickPickItem extends vscode.QuickPickItem {
  issueId: string;
}

/**
 * Extract issue ID from context menu argument (IssueNode) or direct string
 */
function extractIssueId(node: IssueNode | string): string {
  if (typeof node === 'string') {
    return node;
  }
  // IssueNode from context menu
  if (node && typeof node === 'object' && 'issue' in node) {
    return node.issue.id;
  }
  throw new Error('invalid issue reference');
}

/**
 * Register all issue-related commands with the extension context.
 * Commands are thin adapters — no business logic here.
 */
export function registerIssueCommands(
  context: vscode.ExtensionContext,
  issueService: IssueService,
  searchService: SearchService
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CREATE_ISSUE, () =>
      createIssueHandler(issueService)
    ),
    vscode.commands.registerCommand(COMMANDS.EDIT_ISSUE, (node: IssueNode | string) =>
      editIssueHandler(issueService, extractIssueId(node))
    ),
    vscode.commands.registerCommand(COMMANDS.DELETE_ISSUE, (node: IssueNode | string) =>
      deleteIssueHandler(issueService, extractIssueId(node))
    ),
    vscode.commands.registerCommand(COMMANDS.CLOSE_ISSUE, (node: IssueNode | string) =>
      changeStatusHandler(issueService, extractIssueId(node), Status.Closed, 'closed')
    ),
    vscode.commands.registerCommand(COMMANDS.RESOLVE_ISSUE, (node: IssueNode | string) =>
      changeStatusHandler(issueService, extractIssueId(node), Status.Resolved, 'resolved')
    ),
    vscode.commands.registerCommand(COMMANDS.REOPEN_ISSUE, (node: IssueNode | string) =>
      changeStatusHandler(issueService, extractIssueId(node), Status.Open, 'reopened')
    ),
    vscode.commands.registerCommand(COMMANDS.SEARCH_ISSUES, () =>
      searchIssuesHandler(issueService, searchService)
    ),
    vscode.commands.registerCommand(COMMANDS.FILTER_ISSUES, () =>
      filterIssuesHandler(issueService)
    )
  );
}

// ==================== Handlers (exported for testing) ====================

/**
 * Multi-step wizard: type → title → severity → urgency → [description]
 */
export async function createIssueHandler(issueService: IssueService): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('bonfisoft-issues');
    const defaultType = config.get<string>('defaultIssueType', 'bug');

    const typeItems = Object.values(IssueType).map(t => ({
      label: t.charAt(0).toUpperCase() + t.slice(1),
      value: t,
      picked: t === defaultType,
    }));

    const typeItem = await vscode.window.showQuickPick(typeItems, {
      placeHolder: 'Select issue type',
      title: 'New Issue (1/4)',
    });
    if (!typeItem) { return; }

    const title = await vscode.window.showInputBox({
      prompt: 'Issue title',
      placeHolder: 'Short description of the issue',
      title: 'New Issue (2/4)',
      validateInput: (v) => {
        if (!v || v.trim().length === 0) { return 'Title is required'; }
        if (v.length > 200) { return 'Title must be 200 characters or less'; }
        return null;
      },
    });
    if (!title) { return; }

    const severityItems = Object.values(Severity).map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      value: s,
    }));
    const severityItem = await vscode.window.showQuickPick(severityItems, {
      placeHolder: 'Select severity',
      title: 'New Issue (3/4)',
    });
    if (!severityItem) { return; }

    const urgencyItems = Object.values(Urgency).map(u => ({
      label: u.charAt(0).toUpperCase() + u.slice(1),
      value: u,
    }));
    const urgencyItem = await vscode.window.showQuickPick(urgencyItems, {
      placeHolder: 'Select urgency',
      title: 'New Issue (4/4)',
    });
    if (!urgencyItem) { return; }

    const issue = await issueService.createIssue({
      title: title.trim(),
      type: typeItem.value as IssueType,
      severity: severityItem.value as Severity,
      urgency: urgencyItem.value as Urgency,
    });

    logger.info(`created issue via command: ${issue.id}`);
    vscode.window.showInformationMessage(`Issue created: ${issue.title}`);
    await vscode.commands.executeCommand(COMMANDS.VIEW_ISSUE, issue.id);
  } catch (error) {
    logger.error(`createIssue command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
  }
}

/**
 * Edit any field of an existing issue via QuickPick field selector.
 */
export async function editIssueHandler(
  issueService: IssueService,
  issueId: string
): Promise<void> {
  try {
    const issue = await issueService.getIssue(issueId);
    if (!issue) {
      vscode.window.showErrorMessage('Issue not found');
      return;
    }

    const fieldItems = [
      { label: '$(pencil) Title', field: 'title', current: issue.title },
      { label: '$(symbol-enum) Type', field: 'type', current: issue.type },
      { label: '$(error) Severity', field: 'severity', current: issue.severity },
      { label: '$(clock) Urgency', field: 'urgency', current: issue.urgency },
      { label: '$(git-pull-request) Status', field: 'status', current: issue.status },
      { label: '$(person) Assignee', field: 'assignee', current: issue.assignee ?? 'unassigned' },
    ];

    const fieldItem = await vscode.window.showQuickPick(
      fieldItems.map(f => ({ ...f, description: f.current })),
      { placeHolder: `Editing: ${issue.title}`, title: 'Edit Issue — Select field' }
    );
    if (!fieldItem) { return; }

    let update: Parameters<typeof issueService.updateIssue>[1] = {};

    switch (fieldItem.field) {
      case 'title': {
        const newTitle = await vscode.window.showInputBox({
          prompt: 'New title',
          value: issue.title,
          validateInput: (v) => {
            if (!v || v.trim().length === 0) { return 'Title is required'; }
            if (v.length > 200) { return 'Title must be 200 characters or less'; }
            return null;
          },
        });
        if (!newTitle) { return; }
        update = { title: newTitle.trim() };
        break;
      }
      case 'type': {
        const item = await vscode.window.showQuickPick(
          Object.values(IssueType).map(t => ({ label: t, picked: t === issue.type })),
          { placeHolder: 'Select new type' }
        );
        if (!item) { return; }
        update = { type: item.label as IssueType };
        break;
      }
      case 'severity': {
        const item = await vscode.window.showQuickPick(
          Object.values(Severity).map(s => ({ label: s, picked: s === issue.severity })),
          { placeHolder: 'Select new severity' }
        );
        if (!item) { return; }
        update = { severity: item.label as Severity };
        break;
      }
      case 'urgency': {
        const item = await vscode.window.showQuickPick(
          Object.values(Urgency).map(u => ({ label: u, picked: u === issue.urgency })),
          { placeHolder: 'Select new urgency' }
        );
        if (!item) { return; }
        update = { urgency: item.label as Urgency };
        break;
      }
      case 'status': {
        const item = await vscode.window.showQuickPick(
          Object.values(Status).map(s => ({ label: s, picked: s === issue.status })),
          { placeHolder: 'Select new status' }
        );
        if (!item) { return; }
        update = { status: item.label as Status };
        break;
      }
      case 'assignee': {
        const newAssignee = await vscode.window.showInputBox({
          prompt: 'Assignee (leave empty to unassign)',
          value: issue.assignee ?? '',
        });
        if (newAssignee === undefined) { return; }
        update = { assignee: newAssignee.trim() || null };
        break;
      }
    }

    await issueService.updateIssue(issueId, update);
    vscode.window.showInformationMessage(`Issue updated: ${issue.title}`);
  } catch (error) {
    logger.error(`editIssue command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to edit issue: ${error}`);
  }
}

/**
 * Delete an issue after confirmation.
 */
export async function deleteIssueHandler(
  issueService: IssueService,
  issueId: string
): Promise<void> {
  try {
    const issue = await issueService.getIssue(issueId);
    if (!issue) {
      vscode.window.showErrorMessage('Issue not found');
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      `Delete "${issue.title}"? This cannot be undone.`,
      { modal: true },
      'Delete'
    );
    if (choice !== 'Delete') { return; }

    await issueService.deleteIssue(issueId);
    logger.info(`deleted issue via command: ${issueId}`);
    vscode.window.showInformationMessage(`Issue deleted: ${issue.title}`);
  } catch (error) {
    logger.error(`deleteIssue command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to delete issue: ${error}`);
  }
}

/**
 * Change the status of an issue (close / resolve / reopen).
 */
export async function changeStatusHandler(
  issueService: IssueService,
  issueId: string,
  newStatus: Status,
  verb: string
): Promise<void> {
  try {
    const issue = await issueService.getIssue(issueId);
    if (!issue) {
      vscode.window.showErrorMessage('Issue not found');
      return;
    }

    await issueService.updateIssue(issueId, { status: newStatus });
    logger.info(`issue ${issueId} ${verb}`);
    vscode.window.showInformationMessage(`Issue ${verb}: ${issue.title}`);
  } catch (error) {
    logger.error(`changeStatus command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to update issue status: ${error}`);
  }
}

/**
 * Search issues with live-filter QuickPick using SearchService.
 */
export async function searchIssuesHandler(
  issueService: IssueService,
  searchService: SearchService
): Promise<void> {
  try {
    const allIssues = await issueService.getAllIssues();

    if (allIssues.length === 0) {
      vscode.window.showInformationMessage('No issues found in this workspace.');
      return;
    }

    const quickPick = vscode.window.createQuickPick<IssueQuickPickItem>();
    quickPick.placeholder = 'Search issues by title, description, or tags…';
    quickPick.title = 'Search Issues';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    const allItems: IssueQuickPickItem[] = allIssues.map(issue => ({
      label: `$(issues) ${issue.title}`,
      description: `${issue.status} • ${issue.severity}`,
      detail: `${issue.type}${issue.assignee ? ' • ' + issue.assignee : ''}${issue.tags.length ? ' • ' + issue.tags.join(', ') : ''}`,
      issueId: issue.id,
    }));

    quickPick.items = allItems;

    quickPick.onDidChangeValue(async (value) => {
      if (!value.trim()) {
        quickPick.items = allItems;
        return;
      }
      const results = await searchService.searchForQuickPick(value);
      quickPick.items = results.map(r => ({
        label: `$(issues) ${r.issue.title}`,
        description: `${r.issue.status} • ${r.issue.severity}`,
        detail: `${r.issue.type}${r.issue.assignee ? ' • ' + r.issue.assignee : ''}${r.issue.tags.length ? ' • ' + r.issue.tags.join(', ') : ''}`,
        issueId: r.issue.id,
      }));
    });

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      quickPick.dispose();
      if (selected) {
        vscode.commands.executeCommand(COMMANDS.VIEW_ISSUE, selected.issueId);
      }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
  } catch (error) {
    logger.error(`searchIssues command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to search issues: ${error}`);
  }
}

/**
 * Filter issues in the tree by status, type, or severity.
 */
export async function filterIssuesHandler(issueService: IssueService): Promise<void> {
  try {
    const filterItems = [
      { label: '$(circle-outline) Open issues', filter: { status: Status.Open } },
      { label: '$(sync) In Progress', filter: { status: Status.InProgress } },
      { label: '$(check) Resolved', filter: { status: Status.Resolved } },
      { label: '$(error) Critical severity', filter: { severity: 'critical' } },
      { label: '$(warning) High severity', filter: { severity: 'high' } },
      { label: '$(list-unordered) Show all', filter: {} },
    ];

    const selected = await vscode.window.showQuickPick(filterItems, {
      placeHolder: 'Filter issues by…',
      title: 'Filter Issues',
    });
    if (!selected) { return; }

    const issues = await issueService.filterIssues(selected.filter);
    const count = issues.length;
    const label = selected.label.replace(/^\$\([^)]+\)\s*/, '');
    vscode.window.showInformationMessage(
      `Filter "${label}": ${count} issue${count !== 1 ? 's' : ''} (tree view filter coming in Phase 3.3)`
    );
  } catch (error) {
    logger.error(`filterIssues command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to filter issues: ${error}`);
  }
}
