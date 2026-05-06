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
});
