import { describe, it, expect, beforeEach } from 'vitest';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { InMemoryIdGenerator } from '../mocks/InMemoryIdGenerator.ts';
import { IssueType, Severity, Urgency, Status, type Issue, type IssueInput } from '../../src/types/issue.ts';

describe('IssuesDatabase', () => {
  let storage: InMemoryStorageProvider;
  let idGenerator: InMemoryIdGenerator;
  let database: IssuesDatabase;

  beforeEach(() => {
    storage = new InMemoryStorageProvider();
    idGenerator = new InMemoryIdGenerator();
    database = new IssuesDatabase(storage, idGenerator);
  });

  describe('initialize', () => {
    it('should create new database when storage is empty', async () => {
      await database.initialize();
      const data = await database.getAllIssues();
      expect(data).toEqual([]);
    });

    it('should load existing database from storage', async () => {
      const existingDb = {
        schemaVersion: '1.0.0',
        project: { name: 'Test', createdAt: '2026-01-01T00:00:00Z' },
        issues: [{ id: '1', title: 'Existing' }],
        milestones: [],
        sprints: [],
        templates: [],
        metadata: { lastExportAt: null, issueCounter: 1 }
      };
      await storage.write(JSON.stringify(existingDb));

      await database.initialize();
      const issues = await database.getAllIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Existing');
    });

    it('should set schema version to 1.0.0', async () => {
      await database.initialize();
      const raw = await storage.read();
      const parsed = JSON.parse(raw!);
      expect(parsed.schemaVersion).toBe('1.0.0');
    });
  });

  describe('createIssue', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should create issue with required fields', async () => {
      const input: IssueInput = {
        title: 'Test Bug',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      };

      const issue = await database.createIssue(input);

      expect(issue.title).toBe('Test Bug');
      expect(issue.type).toBe(IssueType.Bug);
      expect(issue.id).toBeDefined();
      expect(issue.status).toBe(Status.Open);
    });

    it('should assign generated UUID', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const issue = await database.createIssue(input);

      expect(issue.id).toMatch(/^test-id-\d+$/);
    });

    it('should set timestamps', async () => {
      const before = Date.now();
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const issue = await database.createIssue(input);
      const after = Date.now();

      const createdAtTime = new Date(issue.createdAt).getTime();
      expect(createdAtTime).toBeGreaterThanOrEqual(before);
      expect(createdAtTime).toBeLessThanOrEqual(after);
      expect(issue.updatedAt).toBe(issue.createdAt);
    });

    it('should persist to storage', async () => {
      const input: IssueInput = {
        title: 'Persisted',
        type: IssueType.Feature,
        severity: Severity.Low,
        urgency: Urgency.Low
      };

      await database.createIssue(input);

      const raw = await storage.read();
      const parsed = JSON.parse(raw!);
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.issues[0].title).toBe('Persisted');
    });

    it('should increment issue counter', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      await database.createIssue(input);
      await database.createIssue(input);

      const raw = await storage.read();
      const parsed = JSON.parse(raw!);
      expect(parsed.metadata.issueCounter).toBe(2);
    });
  });

  describe('getAllIssues', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should return empty array when no issues', async () => {
      const issues = await database.getAllIssues();
      expect(issues).toEqual([]);
    });

    it('should return all created issues', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      await database.createIssue(input);
      await database.createIssue(input);

      const issues = await database.getAllIssues();
      expect(issues).toHaveLength(2);
    });

    it('should return cloned data (not references)', async () => {
      const input: IssueInput = {
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      await database.createIssue(input);
      const issues = await database.getAllIssues();
      issues[0].title = 'Modified';

      const issues2 = await database.getAllIssues();
      expect(issues2[0].title).toBe('Original');
    });
  });

  describe('getIssueById', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should return null for non-existent id', async () => {
      const issue = await database.getIssueById('non-existent');
      expect(issue).toBeNull();
    });

    it('should return issue by id', async () => {
      const input: IssueInput = {
        title: 'Find Me',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      const found = await database.getIssueById(created.id);

      expect(found).toBeDefined();
      expect(found!.title).toBe('Find Me');
    });

    it('should return cloned data', async () => {
      const input: IssueInput = {
        title: 'Original',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      const found = await database.getIssueById(created.id);
      found!.title = 'Modified';

      const found2 = await database.getIssueById(created.id);
      expect(found2!.title).toBe('Original');
    });
  });

  describe('updateIssue', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should throw for non-existent issue', async () => {
      const update = { title: 'Updated' };
      await expect(database.updateIssue('non-existent', update))
        .rejects.toThrow('Issue not found');
    });

    it('should update issue fields', async () => {
      const input: IssueInput = {
        title: 'Original',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      const updated = await database.updateIssue(created.id, {
        title: 'Updated',
        status: Status.InProgress
      });

      expect(updated.title).toBe('Updated');
      expect(updated.status).toBe(Status.InProgress);
    });

    it('should not modify unspecified fields', async () => {
      const input: IssueInput = {
        title: 'Original',
        description: 'Desc',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      const updated = await database.updateIssue(created.id, {
        title: 'New Title'
      });

      expect(updated.description).toBe('Desc');
      expect(updated.type).toBe(IssueType.Bug);
      expect(updated.severity).toBe(Severity.High);
    });

    it('should update updatedAt timestamp', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      await new Promise(r => setTimeout(r, 10)); // Small delay
      const updated = await database.updateIssue(created.id, { title: 'New' });

      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should persist changes', async () => {
      const input: IssueInput = {
        title: 'Test',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      await database.updateIssue(created.id, { title: 'Persisted' });

      // Reload database
      const db2 = new IssuesDatabase(storage, idGenerator);
      await db2.initialize();
      const found = await db2.getIssueById(created.id);

      expect(found!.title).toBe('Persisted');
    });
  });

  describe('deleteIssue', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should throw for non-existent issue', async () => {
      await expect(database.deleteIssue('non-existent'))
        .rejects.toThrow('Issue not found');
    });

    it('should delete existing issue', async () => {
      const input: IssueInput = {
        title: 'To Delete',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      await database.deleteIssue(created.id);

      const found = await database.getIssueById(created.id);
      expect(found).toBeNull();
    });

    it('should persist deletion', async () => {
      const input: IssueInput = {
        title: 'To Delete',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      const created = await database.createIssue(input);
      await database.deleteIssue(created.id);

      const raw = await storage.read();
      const parsed = JSON.parse(raw!);
      expect(parsed.issues).toHaveLength(0);
    });
  });

  describe('searchIssues', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should filter by status', async () => {
      await database.createIssue({
        title: 'Open Issue',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        status: Status.Open
      });

      await database.createIssue({
        title: 'Closed Issue',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        status: Status.Closed
      });

      const openIssues = await database.searchIssues({ status: Status.Open });
      expect(openIssues).toHaveLength(1);
      expect(openIssues[0].title).toBe('Open Issue');
    });

    it('should filter by type', async () => {
      await database.createIssue({
        title: 'Bug',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await database.createIssue({
        title: 'Feature',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const bugs = await database.searchIssues({ type: IssueType.Bug });
      expect(bugs).toHaveLength(1);
      expect(bugs[0].title).toBe('Bug');
    });

    it('should filter by search term in title', async () => {
      await database.createIssue({
        title: 'Login button broken',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      await database.createIssue({
        title: 'Logout not working',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const results = await database.searchIssues({ searchTerm: 'login' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Login button broken');
    });

    it('should combine multiple filters', async () => {
      await database.createIssue({
        title: 'Critical Bug',
        type: IssueType.Bug,
        severity: Severity.Critical,
        urgency: Urgency.Normal,
        status: Status.Open
      });

      await database.createIssue({
        title: 'Minor Bug',
        type: IssueType.Bug,
        severity: Severity.Low,
        urgency: Urgency.Normal,
        status: Status.Open
      });

      const results = await database.searchIssues({
        type: IssueType.Bug,
        status: Status.Open,
        severity: Severity.Critical
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Critical Bug');
    });
  });
});
