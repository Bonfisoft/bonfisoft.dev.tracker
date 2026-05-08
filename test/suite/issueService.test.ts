import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueService } from '../../src/services/IssueService.ts';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { InMemoryIdGenerator } from '../mocks/InMemoryIdGenerator.ts';
import { IssueType, Severity, Urgency, Status, type Issue, type IssueInput } from '../../src/types/issue.ts';

describe('IssueService', () => {
  let storage: InMemoryStorageProvider;
  let idGenerator: InMemoryIdGenerator;
  let database: IssuesDatabase;
  let service: IssueService;

  beforeEach(async () => {
    storage = new InMemoryStorageProvider();
    idGenerator = new InMemoryIdGenerator();
    database = new IssuesDatabase(storage, idGenerator);
    await database.initialize();
    service = new IssueService(database);
  });

  describe('createIssue', () => {
    it('should create issue with valid input', async () => {
      const input: IssueInput = {
        title: 'Test Bug',
        description: 'A test description',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        reporter: 'test-user'
      };

      const issue = await service.createIssue(input);

      expect(issue.title).toBe('Test Bug');
      expect(issue.type).toBe(IssueType.Bug);
      expect(issue.status).toBe(Status.Open);
      expect(issue.reporter).toBe('test-user');
    });

    it('should throw if title is empty', async () => {
      const input: IssueInput = {
        title: '',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      await expect(service.createIssue(input))
        .rejects.toThrow('title is required');
    });

    it('should throw if title exceeds 200 characters', async () => {
      const input: IssueInput = {
        title: 'a'.repeat(201),
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      await expect(service.createIssue(input))
        .rejects.toThrow('title must be 200 characters or less');
    });

    it('should trim whitespace from title', async () => {
      const input: IssueInput = {
        title: '  Trimmed Title  ',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const issue = await service.createIssue(input);
      expect(issue.title).toBe('Trimmed Title');
    });

    it('should set default status to Open', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const issue = await service.createIssue(input);
      expect(issue.status).toBe(Status.Open);
    });

    it('should emit onDidCreateIssue event', async () => {
      const handler = vi.fn();
      service.onDidCreateIssue(handler);

      const input: IssueInput = {
        title: 'Event Test',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const issue = await service.createIssue(input);

      expect(handler).toHaveBeenCalledWith(issue);
    });
  });

  describe('getIssue', () => {
    it('should return issue by id', async () => {
      const created = await service.createIssue({
        title: 'Find Me',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const found = await service.getIssue(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const found = await service.getIssue('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('updateIssue - CRITICAL MVP FEATURE', () => {
    it('should update issue fields', async () => {
      const created = await service.createIssue({
        title: 'Original Title',
        type: IssueType.Bug,
        severity: Severity.Low,
        urgency: Urgency.Normal
      });

      const updated = await service.updateIssue(created.id, {
        title: 'Updated Title',
        status: Status.InProgress
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe(Status.InProgress);
    });

    it('should not modify unspecified fields', async () => {
      const created = await service.createIssue({
        title: 'Original',
        description: 'Original Desc',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        tags: ['tag1']
      });

      const updated = await service.updateIssue(created.id, {
        title: 'New Title'
      });

      expect(updated.description).toBe('Original Desc');
      expect(updated.type).toBe(IssueType.Bug);
      expect(updated.severity).toBe(Severity.High);
      expect(updated.tags).toEqual(['tag1']);
    });

    it('should trim whitespace from updated title', async () => {
      const created = await service.createIssue({
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const updated = await service.updateIssue(created.id, {
        title: '  Updated  '
      });

      expect(updated.title).toBe('Updated');
    });

    it('should throw if title is empty after trim', async () => {
      const created = await service.createIssue({
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await expect(service.updateIssue(created.id, { title: '   ' }))
        .rejects.toThrow('title cannot be empty');
    });

    it('should throw for non-existent issue', async () => {
      await expect(service.updateIssue('non-existent', { title: 'New' }))
        .rejects.toThrow('issue not found');
    });

    it('should emit onDidUpdateIssue event', async () => {
      const handler = vi.fn();
      service.onDidUpdateIssue(handler);

      const created = await service.createIssue({
        title: 'Original',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const updated = await service.updateIssue(created.id, { title: 'Updated' });

      expect(handler).toHaveBeenCalledWith(updated);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await service.createIssue({
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await new Promise(r => setTimeout(r, 10));

      const updated = await service.updateIssue(created.id, { title: 'New' });

      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe('deleteIssue', () => {
    it('should delete existing issue', async () => {
      const created = await service.createIssue({
        title: 'To Delete',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await service.deleteIssue(created.id);

      const found = await service.getIssue(created.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent issue', async () => {
      await expect(service.deleteIssue('non-existent'))
        .rejects.toThrow('issue not found');
    });

    it('should emit onDidDeleteIssue event', async () => {
      const handler = vi.fn();
      service.onDidDeleteIssue(handler);

      const created = await service.createIssue({
        title: 'To Delete',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await service.deleteIssue(created.id);

      expect(handler).toHaveBeenCalledWith(created.id);
    });
  });

  describe('getAllIssues', () => {
    it('should return empty array when no issues', async () => {
      const issues = await service.getAllIssues();
      expect(issues).toEqual([]);
    });

    it('should return all created issues', async () => {
      await service.createIssue({
        title: 'Issue 1',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await service.createIssue({
        title: 'Issue 2',
        type: IssueType.Feature,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const issues = await service.getAllIssues();
      expect(issues).toHaveLength(2);
    });

    it('should return cloned data (not references)', async () => {
      await service.createIssue({
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const issues = await service.getAllIssues();
      issues[0].title = 'Modified';

      const issues2 = await service.getAllIssues();
      expect(issues2[0].title).toBe('Original');
    });
  });

  describe('filterIssues', () => {
    beforeEach(async () => {
      await service.createIssue({
        title: 'Open Bug',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        status: Status.Open
      });

      await service.createIssue({
        title: 'Closed Bug',
        type: IssueType.Bug,
        severity: Severity.Low,
        urgency: Urgency.Normal,
        status: Status.Closed
      });

      await service.createIssue({
        title: 'Open Feature',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.High,
        status: Status.Open
      });
    });

    it('should filter by status', async () => {
      const openIssues = await service.filterIssues({ status: Status.Open });
      expect(openIssues).toHaveLength(2);
      expect(openIssues.every((i: Issue) => i.status === Status.Open)).toBe(true);
    });

    it('should filter by type', async () => {
      const bugs = await service.filterIssues({ type: IssueType.Bug });
      expect(bugs).toHaveLength(2);
      expect(bugs.every((i: Issue) => i.type === IssueType.Bug)).toBe(true);
    });

    it('should filter by severity', async () => {
      const highSeverity = await service.filterIssues({ severity: Severity.High });
      expect(highSeverity).toHaveLength(1);
      expect(highSeverity[0].title).toBe('Open Bug');
    });

    it('should combine filters', async () => {
      const openBugs = await service.filterIssues({
        status: Status.Open,
        type: IssueType.Bug
      });
      expect(openBugs).toHaveLength(1);
      expect(openBugs[0].title).toBe('Open Bug');
    });
  });

  describe('searchIssues', () => {
    beforeEach(async () => {
      await service.createIssue({
        title: 'Login button broken',
        description: 'Users cannot click the login button',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Immediate,
        tags: ['ui', 'auth']
      });

      await service.createIssue({
        title: 'Add logout feature',
        description: 'Need a way for users to logout',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        tags: ['auth']
      });

      await service.createIssue({
        title: 'Database connection error',
        description: 'Cannot connect to postgres',
        type: IssueType.Bug,
        severity: Severity.Critical,
        urgency: Urgency.Immediate,
        tags: ['backend']
      });
    });

    it('should search in title', async () => {
      const results = await service.searchIssues('login');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Login button broken');
    });

    it('should search in description', async () => {
      const results = await service.searchIssues('postgres');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Database connection error');
    });

    it('should search in tags', async () => {
      const results = await service.searchIssues('auth');
      expect(results).toHaveLength(2);
    });

    it('should be case-insensitive', async () => {
      const results = await service.searchIssues('LOGIN');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await service.searchIssues('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('Event system', () => {
    it('should support multiple event listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      service.onDidCreateIssue(handler1);
      service.onDidCreateIssue(handler2);

      await service.createIssue({
        title: 'Test',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should return disposable from event registration', () => {
      const handler = vi.fn();
      const disposable = service.onDidCreateIssue(handler);

      expect(disposable).toHaveProperty('dispose');
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('comment management', () => {
    it('should add comment to issue', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const updated = await service.addComment(issue.id, 'user1', 'This is a comment');

      expect(updated).not.toBeNull();
      expect(updated?.comments).toHaveLength(1);
      expect(updated?.comments[0].body).toBe('This is a comment');
      expect(updated?.comments[0].author).toBe('user1');
      expect(updated?.comments[0].id).toBeDefined();
      expect(updated?.comments[0].createdAt).toBeDefined();
    });

    it('should reject empty comment body', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await expect(service.addComment(issue.id, 'user1', ''))
        .rejects.toThrow('comment body cannot be empty');
      await expect(service.addComment(issue.id, 'user1', '   '))
        .rejects.toThrow('comment body cannot be empty');
    });

    it('should reject comment exceeding max length', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const longBody = 'a'.repeat(5001);
      await expect(service.addComment(issue.id, 'user1', longBody))
        .rejects.toThrow('comment must be 5000 characters or less');
    });

    it('should return null when adding comment to non-existent issue', async () => {
      const result = await service.addComment('non-existent-id', 'user1', 'Comment');
      expect(result).toBeNull();
    });

    it('should delete comment from issue', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const updated = await service.addComment(issue.id, 'user1', 'Comment to delete');
      const commentId = updated?.comments[0].id;

      const afterDelete = await service.deleteComment(issue.id, commentId!);

      expect(afterDelete).not.toBeNull();
      expect(afterDelete?.comments).toHaveLength(0);
    });

    it('should throw when deleting non-existent comment', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await expect(service.deleteComment(issue.id, 'fake-comment-id'))
        .rejects.toThrow('comment not found');
    });

    it('should return null when deleting comment from non-existent issue', async () => {
      const result = await service.deleteComment('non-existent-id', 'comment-id');
      expect(result).toBeNull();
    });

    it('should reorder comments', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await service.addComment(issue.id, 'user1', 'First comment');
      await service.addComment(issue.id, 'user1', 'Second comment');
      await service.addComment(issue.id, 'user1', 'Third comment');

      let updated = await service.getIssue(issue.id);
      const originalOrder = updated!.comments.map(c => c.id);

      // Reverse the order
      const newOrder = [...originalOrder].reverse();
      updated = await service.reorderComments(issue.id, newOrder);

      expect(updated?.comments[0].body).toBe('Third comment');
      expect(updated?.comments[1].body).toBe('Second comment');
      expect(updated?.comments[2].body).toBe('First comment');
    });

    it('should throw when reordering with wrong count', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await service.addComment(issue.id, 'user1', 'Comment 1');
      await service.addComment(issue.id, 'user1', 'Comment 2');

      await expect(service.reorderComments(issue.id, ['only-one-id']))
        .rejects.toThrow('ordered ids must match comment count');
    });

    it('should throw when reordering with invalid comment id', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await service.addComment(issue.id, 'user1', 'Comment 1');
      await service.addComment(issue.id, 'user1', 'Comment 2');

      const updated = await service.getIssue(issue.id);
      const realId = updated?.comments[0].id;

      await expect(service.reorderComments(issue.id, [realId!, 'fake-id']))
        .rejects.toThrow('invalid comment id');
    });

    it('should emit event when comment is added', async () => {
      const handler = vi.fn();
      service.onDidUpdateIssue(handler);

      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await service.addComment(issue.id, 'user1', 'New comment');

      expect(handler).toHaveBeenCalled();
    });

    it('should trim comment body', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      const updated = await service.addComment(issue.id, 'user1', '  Trimmed comment  ');

      expect(updated?.comments[0].body).toBe('Trimmed comment');
    });
  });

  describe('user management', () => {
    it('should get unique assignees', async () => {
      await service.createIssue({
        title: 'Issue 1',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alice'
      });
      await service.createIssue({
        title: 'Issue 2',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Bob'
      });
      await service.createIssue({
        title: 'Issue 3',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alice' // Duplicate
      });
      await service.createIssue({
        title: 'Issue 4',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
        // No assignee
      });

      const assignees = await service.getUniqueAssignees();

      expect(assignees).toHaveLength(2);
      expect(assignees).toContain('Alice');
      expect(assignees).toContain('Bob');
      expect(assignees[0]).toBe('Alice'); // Sorted
      expect(assignees[1]).toBe('Bob');
    });

    it('should get unique reporters', async () => {
      await service.createIssue({
        title: 'Issue 1',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        reporter: 'Charlie'
      });
      await service.createIssue({
        title: 'Issue 2',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        reporter: 'Diana'
      });

      const reporters = await service.getUniqueReporters();

      expect(reporters).toHaveLength(2);
      expect(reporters).toContain('Charlie');
      expect(reporters).toContain('Diana');
    });

    it('should get all users (assignees + reporters combined)', async () => {
      await service.createIssue({
        title: 'Issue 1',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alice',
        reporter: 'Bob'
      });
      await service.createIssue({
        title: 'Issue 2',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Charlie',
        reporter: 'Alice' // Alice is both assignee and reporter
      });

      const users = await service.getAllUsers();

      expect(users).toHaveLength(3); // Alice, Bob, Charlie (no duplicates)
      expect(users).toContain('Alice');
      expect(users).toContain('Bob');
      expect(users).toContain('Charlie');
    });

    it('should return empty array when no users exist', async () => {
      const assignees = await service.getUniqueAssignees();
      const reporters = await service.getUniqueReporters();
      const users = await service.getAllUsers();

      expect(assignees).toEqual([]);
      expect(reporters).toEqual([]);
      expect(users).toEqual([]);
    });
  });

  describe('assignee history', () => {
    it('should track assignee changes in history', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alberto'
      });

      expect(issue.assigneeHistory).toEqual([]);

      // Change assignee to Mark
      const updated1 = await service.updateIssue(issue.id, { assignee: 'Mark' });
      expect(updated1.assignee).toBe('Mark');
      expect(updated1.assigneeHistory).toHaveLength(1);
      expect(updated1.assigneeHistory![0].assignee).toBe('Alberto');
      expect(updated1.assigneeHistory![0].changedAt).toBeDefined();

      // Change assignee to Carol
      const updated2 = await service.updateIssue(issue.id, { assignee: 'Carol' });
      expect(updated2.assignee).toBe('Carol');
      expect(updated2.assigneeHistory).toHaveLength(2);
      expect(updated2.assigneeHistory![0].assignee).toBe('Mark');
      expect(updated2.assigneeHistory![1].assignee).toBe('Alberto');
    });

    it('should not add history entry when assignee unchanged', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alberto'
      });

      // Update other field
      const updated = await service.updateIssue(issue.id, { title: 'New Title' });
      expect(updated.assignee).toBe('Alberto');
      expect(updated.assigneeHistory).toEqual([]);

      // Update to same assignee
      const updated2 = await service.updateIssue(issue.id, { assignee: 'Alberto' });
      expect(updated2.assigneeHistory).toEqual([]);
    });

    it('should track unassigned in history when clearing assignee', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        assignee: 'Alberto'
      });

      const updated = await service.updateIssue(issue.id, { assignee: null });
      expect(updated.assignee).toBeNull();
      expect(updated.assigneeHistory).toHaveLength(1);
      expect(updated.assigneeHistory![0].assignee).toBe('Alberto');
    });

    it('should track unassigned to assignee in history', async () => {
      const issue = await service.createIssue({
        title: 'Test Issue',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
        // No assignee
      });

      const updated = await service.updateIssue(issue.id, { assignee: 'Mark' });
      expect(updated.assignee).toBe('Mark');
      expect(updated.assigneeHistory).toHaveLength(1);
      expect(updated.assigneeHistory![0].assignee).toBe('Unassigned');
    });
  });
});
