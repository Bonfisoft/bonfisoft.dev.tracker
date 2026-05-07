import { describe, it, expect, beforeEach } from 'vitest';
import { IssueTreeProvider, type GroupNode, type IssueNode } from '../../src/providers/IssueTreeProvider.ts';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { InMemoryIdGenerator } from '../mocks/InMemoryIdGenerator.ts';
import { IssueType, Severity, Urgency, Status } from '../../src/types/issue.ts';
import { TreeItemCollapsibleState } from '../mocks/vscode.ts';

describe('IssueTreeProvider', () => {
  let storage: InMemoryStorageProvider;
  let idGenerator: InMemoryIdGenerator;
  let database: IssuesDatabase;
  let provider: IssueTreeProvider;

  beforeEach(async () => {
    storage = new InMemoryStorageProvider();
    idGenerator = new InMemoryIdGenerator();
    database = new IssuesDatabase(storage, idGenerator);
    await database.initialize();
    provider = new IssueTreeProvider(database);
  });

  // ==================== getChildren (root) ====================

  describe('getChildren - root level', () => {
    it('should return empty array when there are no issues', async () => {
      const groups = await provider.getChildren();
      expect(groups).toEqual([]);
    });

    it('should return one group node per distinct status', async () => {
      await database.createIssue({ title: 'Open Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      await database.createIssue({ title: 'Closed Bug', type: IssueType.Bug, severity: Severity.Low, urgency: Urgency.Low, status: Status.Closed });

      const groups = await provider.getChildren();

      expect(groups).toHaveLength(2);
      expect(groups.every(g => g.type === 'group')).toBe(true);
    });

    it('should count issues per group correctly', async () => {
      await database.createIssue({ title: 'Bug 1', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      await database.createIssue({ title: 'Bug 2', type: IssueType.Bug, severity: Severity.Medium, urgency: Urgency.Normal });
      await database.createIssue({ title: 'Closed', type: IssueType.Bug, severity: Severity.Low, urgency: Urgency.Low, status: Status.Closed });

      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open) as GroupNode | undefined;
      const closedGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Closed) as GroupNode | undefined;

      expect(openGroup?.count).toBe(2);
      expect(closedGroup?.count).toBe(1);
    });

    it('should respect STATUS_ORDER: Open before InProgress before Closed', async () => {
      await database.createIssue({ title: 'Closed', type: IssueType.Bug, severity: Severity.Low, urgency: Urgency.Low, status: Status.Closed });
      await database.createIssue({ title: 'In Progress', type: IssueType.Task, severity: Severity.Medium, urgency: Urgency.Normal, status: Status.InProgress });
      await database.createIssue({ title: 'Open', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.High });

      const groups = await provider.getChildren();
      const statuses = (groups as GroupNode[]).map(g => g.status);

      expect(statuses.indexOf(Status.Open)).toBeLessThan(statuses.indexOf(Status.InProgress));
      expect(statuses.indexOf(Status.InProgress)).toBeLessThan(statuses.indexOf(Status.Closed));
    });

    it('should not include a status group when no issues have that status', async () => {
      await database.createIssue({ title: 'Open Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      const groups = await provider.getChildren();

      expect(groups).toHaveLength(1);
      expect((groups[0] as GroupNode).status).toBe(Status.Open);
    });
  });

  // ==================== getChildren (group) ====================

  describe('getChildren - group level', () => {
    it('should return issue nodes for the given status group', async () => {
      await database.createIssue({ title: 'Open Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      await database.createIssue({ title: 'Closed Bug', type: IssueType.Bug, severity: Severity.Low, urgency: Urgency.Low, status: Status.Closed });

      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open)! as GroupNode;
      const issueNodes = await provider.getChildren(openGroup);

      expect(issueNodes).toHaveLength(1);
      expect(issueNodes[0].type).toBe('issue');
      expect((issueNodes[0] as IssueNode).issue.title).toBe('Open Bug');
    });

    it('should return all issues in the group when multiple exist', async () => {
      await database.createIssue({ title: 'Bug A', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      await database.createIssue({ title: 'Bug B', type: IssueType.Feature, severity: Severity.Medium, urgency: Urgency.Low });

      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open)! as GroupNode;
      const issueNodes = await provider.getChildren(openGroup);

      expect(issueNodes).toHaveLength(2);
    });

    it('should return empty array for an issue node (leaf nodes have no children)', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open)! as GroupNode;
      const issueNodes = await provider.getChildren(openGroup);

      const children = await provider.getChildren(issueNodes[0]);
      expect(children).toEqual([]);
    });
  });

  // ==================== getTreeItem ====================

  describe('getTreeItem - group node', () => {
    it('should set label with formatted status and count', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open)! as GroupNode;

      const item = provider.getTreeItem(openGroup);

      expect(item.label).toBe('Open (1)');
    });

    it('should format multi-word status labels correctly', async () => {
      await database.createIssue({ title: 'WIP', type: IssueType.Task, severity: Severity.Medium, urgency: Urgency.Normal, status: Status.InProgress });
      const groups = await provider.getChildren();
      const inProgressGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.InProgress)! as GroupNode;

      const item = provider.getTreeItem(inProgressGroup);

      expect(item.label).toBe('In Progress (1)');
    });

    it('should be expanded by default', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const groups = await provider.getChildren();
      const item = provider.getTreeItem(groups[0] as GroupNode);

      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Expanded);
    });

    it('should set contextValue to issueGroup', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const groups = await provider.getChildren();
      const item = provider.getTreeItem(groups[0] as GroupNode);

      expect(item.contextValue).toBe('issueGroup');
    });
  });

  describe('getTreeItem - issue node', () => {
    async function getFirstIssueNode() {
      const groups = await provider.getChildren();
      const openGroup = groups.find(g => g.type === 'group' && (g as GroupNode).status === Status.Open)! as GroupNode;
      const issueNodes = await provider.getChildren(openGroup);
      return issueNodes[0] as IssueNode;
    }

    it('should set label to issue title', async () => {
      await database.createIssue({ title: 'Fix login bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect(item.label).toBe('Fix login bug');
    });

    it('should set contextValue to issue', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect(item.contextValue).toBe('issue');
    });

    it('should set collapsibleState to None (leaf node)', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
    });

    it('should set item id to issue id', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect(item.id).toBe(node.issue.id);
    });

    it('should set description to [type]', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect(item.description).toBe('[bug]');
    });

    it('should set VIEW_ISSUE command with issue id as argument', async () => {
      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      const cmd = item.command as { command: string; arguments: string[] };
      expect(cmd.command).toBe('bonfisoft-issues.viewIssue');
      expect(cmd.arguments[0]).toBe(node.issue.id);
    });

    it('should use error icon for critical severity', async () => {
      await database.createIssue({ title: 'Critical', type: IssueType.Bug, severity: Severity.Critical, urgency: Urgency.Immediate });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect((item.iconPath as { id: string }).id).toBe('error');
    });

    it('should use warning icon for high severity', async () => {
      await database.createIssue({ title: 'High', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.High });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect((item.iconPath as { id: string }).id).toBe('warning');
    });

    it('should use info icon for medium severity', async () => {
      await database.createIssue({ title: 'Medium', type: IssueType.Task, severity: Severity.Medium, urgency: Urgency.Normal });
      const node = await getFirstIssueNode();
      const item = provider.getTreeItem(node);
      expect((item.iconPath as { id: string }).id).toBe('info');
    });
  });

  // ==================== refresh / onDidChangeTreeData ====================

  describe('refresh', () => {
    it('should fire onDidChangeTreeData event when refresh() is called', () => {
      let fired = false;
      provider.onDidChangeTreeData!(() => { fired = true; });
      provider.refresh();
      expect(fired).toBe(true);
    });

    it('should fire onDidChangeTreeData when an issue is created in the database', async () => {
      let fired = false;
      provider.onDidChangeTreeData!(() => { fired = true; });

      await database.createIssue({ title: 'New Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      expect(fired).toBe(true);
    });

    it('should fire onDidChangeTreeData when an issue is updated', async () => {
      const issue = await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      let fired = false;
      provider.onDidChangeTreeData!(() => { fired = true; });

      await database.updateIssue(issue.id, { title: 'Updated Bug' });

      expect(fired).toBe(true);
    });

    it('should fire onDidChangeTreeData when an issue is deleted', async () => {
      const issue = await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      let fired = false;
      provider.onDidChangeTreeData!(() => { fired = true; });

      await database.deleteIssue(issue.id);

      expect(fired).toBe(true);
    });
  });

  // ==================== IssuesDatabase.onDidChangeIssues ====================

  describe('IssuesDatabase.onDidChangeIssues', () => {
    it('should call listener on createIssue', async () => {
      let callCount = 0;
      database.onDidChangeIssues(() => { callCount++; });

      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      expect(callCount).toBe(1);
    });

    it('should call listener on updateIssue', async () => {
      const issue = await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      let callCount = 0;
      database.onDidChangeIssues(() => { callCount++; });

      await database.updateIssue(issue.id, { title: 'Updated' });

      expect(callCount).toBe(1);
    });

    it('should call listener on deleteIssue', async () => {
      const issue = await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });
      let callCount = 0;
      database.onDidChangeIssues(() => { callCount++; });

      await database.deleteIssue(issue.id);

      expect(callCount).toBe(1);
    });

    it('should support multiple listeners', async () => {
      let a = 0, b = 0;
      database.onDidChangeIssues(() => { a++; });
      database.onDidChangeIssues(() => { b++; });

      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      expect(a).toBe(1);
      expect(b).toBe(1);
    });

    it('should stop calling listener after dispose()', async () => {
      let callCount = 0;
      const disposable = database.onDidChangeIssues(() => { callCount++; });
      disposable.dispose();

      await database.createIssue({ title: 'Bug', type: IssueType.Bug, severity: Severity.High, urgency: Urgency.Normal });

      expect(callCount).toBe(0);
    });
  });
});
