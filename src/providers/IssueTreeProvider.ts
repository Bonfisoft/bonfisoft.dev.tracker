/**
 * Tree data provider for the Issues sidebar view
 * @module providers/IssueTreeProvider
 */

import * as vscode from 'vscode';
import type { IssuesDatabase } from '../database/IssuesDatabase.ts';
import type { Issue } from '../types/issue.ts';
import { Status } from '../types/issue.ts';
import { COMMANDS } from '../constants.ts';
import { logger } from '../utils/logger.ts';

/** Group node representing a status category */
export interface GroupNode {
  type: 'group';
  status: Status;
  count: number;
}

/** Issue node representing a single issue */
export interface IssueNode {
  type: 'issue';
  issue: Issue;
}

/** Union type for all tree nodes */
export type TreeNode = GroupNode | IssueNode;

/** Display order for status groups */
const STATUS_ORDER: Status[] = [
  Status.Open,
  Status.InProgress,
  Status.InReview,
  Status.OnHold,
  Status.Resolved,
  Status.Closed,
  Status.WontFix,
];

/**
 * Provides tree data for the BonfiSoft Issues sidebar view.
 * Groups issues by status, refreshes automatically on database changes.
 */
export class IssueTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   * @param database - Issues database to read from
   */
  constructor(private readonly database: IssuesDatabase) {
    this.database.onDidChangeIssues(() => {
      this.refresh();
    });
  }

  /** Trigger a full tree refresh */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /** @inheritdoc */
  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.type === 'group') {
      return this.buildGroupItem(element);
    }
    return this.buildIssueItem(element.issue);
  }

  /** @inheritdoc */
  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    try {
      if (!element) {
        return await this.buildGroups();
      }

      if (element.type === 'group') {
        const all = await this.database.getAllIssues();
        return all
          .filter(issue => issue.status === element.status)
          .map(issue => ({ type: 'issue' as const, issue }));
      }

      return [];
    } catch (error) {
      logger.error(`IssueTreeProvider.getChildren failed: ${error}`);
      return [];
    }
  }

  private async buildGroups(): Promise<GroupNode[]> {
    const issues = await this.database.getAllIssues();
    const countByStatus = new Map<Status, number>();

    for (const issue of issues) {
      countByStatus.set(issue.status, (countByStatus.get(issue.status) ?? 0) + 1);
    }

    return STATUS_ORDER
      .filter(status => countByStatus.has(status))
      .map(status => ({
        type: 'group' as const,
        status,
        count: countByStatus.get(status)!,
      }));
  }

  private buildGroupItem(group: GroupNode): vscode.TreeItem {
    const label = `${this.formatStatus(group.status)} (${group.count})`;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Expanded);
    item.contextValue = 'issueGroup';
    item.iconPath = new vscode.ThemeIcon('folder');
    return item;
  }

  private buildIssueItem(issue: Issue): vscode.TreeItem {
    const item = new vscode.TreeItem(issue.title, vscode.TreeItemCollapsibleState.None);
    item.id = issue.id;
    item.contextValue = 'issue';
    item.tooltip = new vscode.MarkdownString(
      `**${issue.title}**\n\nType: ${issue.type} | Severity: ${issue.severity} | Urgency: ${issue.urgency}`
    );
    item.description = `[${issue.type}]`;
    item.iconPath = this.severityIcon(issue.severity);
    item.command = {
      command: COMMANDS.VIEW_ISSUE,
      title: 'View Issue',
      arguments: [issue.id],
    };
    return item;
  }

  private formatStatus(status: Status): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private severityIcon(severity: string): vscode.ThemeIcon {
    switch (severity) {
      case 'critical': return new vscode.ThemeIcon('error');
      case 'high':     return new vscode.ThemeIcon('warning');
      case 'medium':   return new vscode.ThemeIcon('info');
      default:         return new vscode.ThemeIcon('circle-outline');
    }
  }
}
