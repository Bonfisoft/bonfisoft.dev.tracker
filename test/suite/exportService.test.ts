import { describe, it, expect, beforeEach } from 'vitest';
import { ExportService, type ExportReport, type ImportReport } from '../../src/services/ExportService.ts';
import { IssueService } from '../../src/services/IssueService.ts';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { InMemoryIdGenerator } from '../mocks/InMemoryIdGenerator.ts';
import { IssueType, Severity, Urgency, Status, type Issue, type IssueInput } from '../../src/types/issue.ts';

describe('ExportService', () => {
  let storage: InMemoryStorageProvider;
  let idGenerator: InMemoryIdGenerator;
  let database: IssuesDatabase;
  let issueService: IssueService;
  let exportService: ExportService;

  beforeEach(async () => {
    storage = new InMemoryStorageProvider();
    idGenerator = new InMemoryIdGenerator();
    database = new IssuesDatabase(storage, idGenerator);
    await database.initialize();
    issueService = new IssueService(database);
    exportService = new ExportService(issueService);
  });

  describe('exportToJson', () => {
    it('should export empty array when no issues', async () => {
      const json = await exportService.exportToJson();
      const parsed = JSON.parse(json);

      expect(parsed).toEqual([]);
    });

    it('should export all issues', async () => {
      await issueService.createIssue({
        title: 'Bug 1',
        description: 'First bug',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Immediate
      });

      await issueService.createIssue({
        title: 'Feature 1',
        description: 'First feature',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const json = await exportService.exportToJson();
      const parsed = JSON.parse(json) as Issue[];

      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('Bug 1');
      expect(parsed[1].title).toBe('Feature 1');
    });

    it('should export valid JSON', async () => {
      await issueService.createIssue({
        title: 'Test',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const json = await exportService.exportToJson();

      // Should not throw
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all issue fields', async () => {
      const created = await issueService.createIssue({
        title: 'Complete Issue',
        description: 'Full description',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        reporter: 'test-user',
        assignee: 'assignee-user',
        tags: ['bug', 'urgent']
      });

      const json = await exportService.exportToJson();
      const parsed = JSON.parse(json) as Issue[];

      expect(parsed[0].id).toBe(created.id);
      expect(parsed[0].title).toBe('Complete Issue');
      expect(parsed[0].description).toBe('Full description');
      expect(parsed[0].type).toBe(IssueType.Bug);
      expect(parsed[0].severity).toBe(Severity.High);
      expect(parsed[0].reporter).toBe('test-user');
      expect(parsed[0].assignee).toBe('assignee-user');
      expect(parsed[0].tags).toEqual(['bug', 'urgent']);
    });

    it('should pretty print JSON', async () => {
      await issueService.createIssue({
        title: 'Test',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const json = await exportService.exportToJson();

      // Should contain newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('exportReport', () => {
    it('should generate export report', async () => {
      await issueService.createIssue({
        title: 'Bug 1',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal
      });

      await issueService.createIssue({
        title: 'Bug 2',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const report = await exportService.exportReport();

      expect(report.count).toBe(2);
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('importFromJson', () => {
    it('should import issues from JSON', async () => {
      const issuesToImport: Partial<Issue>[] = [
        {
          title: 'Imported Bug',
          description: 'An imported bug',
          type: IssueType.Bug,
          severity: Severity.High,
          urgency: Urgency.Immediate,
          status: Status.Open,
          reporter: 'importer',
          tags: ['imported']
        },
        {
          title: 'Imported Feature',
          description: 'An imported feature',
          type: IssueType.Feature,
          severity: Severity.Medium,
          urgency: Urgency.Normal,
          status: Status.Open,
          reporter: 'importer'
        }
      ];

      const report = await exportService.importFromJson(JSON.stringify(issuesToImport));

      expect(report.imported).toBe(2);
      expect(report.skipped).toBe(0);

      const allIssues = await issueService.getAllIssues();
      expect(allIssues).toHaveLength(2);
    });

    it('should generate new IDs for imported issues', async () => {
      const issuesToImport: Partial<Issue>[] = [
        {
          id: 'existing-id-123',
          title: 'Imported',
          description: 'Test',
          type: IssueType.Bug,
          severity: Severity.Medium,
          urgency: Urgency.Normal,
          status: Status.Open,
          reporter: 'test'
        }
      ];

      await exportService.importFromJson(JSON.stringify(issuesToImport));

      const allIssues = await issueService.getAllIssues();
      expect(allIssues[0].id).not.toBe('existing-id-123');
      expect(allIssues[0].id).toMatch(/^test-id-/);
    });

    it('should set timestamps on import', async () => {
      const issuesToImport: Partial<Issue>[] = [
        {
          title: 'Imported',
          description: 'Test',
          type: IssueType.Bug,
          severity: Severity.Medium,
          urgency: Urgency.Normal,
          status: Status.Open,
          reporter: 'test',
          createdAt: '2020-01-01T00:00:00Z',
          updatedAt: '2020-01-01T00:00:00Z'
        }
      ];

      await exportService.importFromJson(JSON.stringify(issuesToImport));

      const allIssues = await issueService.getAllIssues();
      const now = new Date().toISOString();

      // Should have new timestamps, not the old ones
      expect(allIssues[0].createdAt).not.toBe('2020-01-01T00:00:00Z');
      expect(allIssues[0].updatedAt).not.toBe('2020-01-01T00:00:00Z');
    });

    it('should skip duplicate issues based on ID', async () => {
      // First, create an issue
      const existing = await issueService.createIssue({
        title: 'Existing Issue',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      // Then try to import it again with same ID
      const issuesToImport: Partial<Issue>[] = [
        {
          id: existing.id,
          title: 'Duplicate',
          description: 'Should be skipped',
          type: IssueType.Feature,
          severity: Severity.High,
          urgency: Urgency.Normal,
          status: Status.Open,
          reporter: 'test'
        }
      ];

      const report = await exportService.importFromJson(JSON.stringify(issuesToImport));

      expect(report.imported).toBe(0);
      expect(report.skipped).toBe(1);

      const allIssues = await issueService.getAllIssues();
      expect(allIssues).toHaveLength(1);
      expect(allIssues[0].title).toBe('Existing Issue'); // Not changed
    });

    it('should throw for invalid JSON', async () => {
      await expect(exportService.importFromJson('not valid json'))
        .rejects.toThrow('invalid json');
    });

    it('should throw if JSON is not an array', async () => {
      await expect(exportService.importFromJson('{"not": "an array"}'))
        .rejects.toThrow('expected array of issues');
    });

    it('should import with minimal fields', async () => {
      const issuesToImport = [
        {
          title: 'Minimal',
          type: 'bug',
          severity: 'medium',
          urgency: 'normal'
        }
      ];

      const report = await exportService.importFromJson(JSON.stringify(issuesToImport));

      expect(report.imported).toBe(1);

      const allIssues = await issueService.getAllIssues();
      expect(allIssues[0].title).toBe('Minimal');
    });
  });

  describe('round-trip export/import', () => {
    it('should preserve issue data through round-trip', async () => {
      // Create original issues
      const original1 = await issueService.createIssue({
        title: 'Original Bug',
        description: 'Original description',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Immediate,
        reporter: 'original-reporter',
        assignee: 'original-assignee',
        tags: ['original', 'bug']
      });

      // Export
      const json = await exportService.exportToJson();

      // Clear database
      await issueService.deleteIssue(original1.id);
      expect(await issueService.getAllIssues()).toHaveLength(0);

      // Import
      await exportService.importFromJson(json);

      // Verify
      const imported = await issueService.getAllIssues();
      expect(imported).toHaveLength(1);
      expect(imported[0].title).toBe('Original Bug');
      expect(imported[0].description).toBe('Original description');
      expect(imported[0].type).toBe(IssueType.Bug);
      expect(imported[0].severity).toBe(Severity.High);
      expect(imported[0].tags).toEqual(['original', 'bug']);
    });
  });

  describe('import report', () => {
    it('should provide detailed import report', async () => {
      // Create existing issue
      const existing = await issueService.createIssue({
        title: 'Existing',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      });

      const issuesToImport: Partial<Issue>[] = [
        {
          id: existing.id, // Will be skipped (duplicate)
          title: 'Duplicate',
          type: IssueType.Bug,
          severity: Severity.Medium,
          urgency: Urgency.Normal
        },
        {
          title: 'New Issue 1',
          type: IssueType.Feature,
          severity: Severity.High,
          urgency: Urgency.Normal
        },
        {
          title: 'New Issue 2',
          type: IssueType.Task,
          severity: Severity.Low,
          urgency: Urgency.Normal
        }
      ];

      const report = await exportService.importFromJson(JSON.stringify(issuesToImport));

      expect(report.imported).toBe(2);
      expect(report.skipped).toBe(1);
      expect(report.errors).toHaveLength(0);
      expect(report.timestamp).toBeDefined();
    });

    it('should include errors in report for invalid items', async () => {
      const issuesToImport = [
        {
          // Missing required fields
          description: 'No title'
        },
        {
          title: 'Valid Issue',
          type: 'bug',
          severity: 'medium',
          urgency: 'normal'
        }
      ];

      const report = await exportService.importFromJson(JSON.stringify(issuesToImport));

      expect(report.imported).toBe(1);
      expect(report.errors.length).toBeGreaterThan(0);
    });
  });
});
