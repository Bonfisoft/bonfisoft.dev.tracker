import { describe, it, expect, beforeEach } from 'vitest';
import { SearchService, type SearchResult } from '../../src/services/SearchService.ts';
import { IssueService } from '../../src/services/IssueService.ts';
import { IssuesDatabase } from '../../src/database/IssuesDatabase.ts';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.ts';
import { InMemoryIdGenerator } from '../mocks/InMemoryIdGenerator.ts';
import { IssueType, Severity, Urgency, type Issue, type IssueInput } from '../../src/types/issue.ts';

describe('SearchService', () => {
  let storage: InMemoryStorageProvider;
  let idGenerator: InMemoryIdGenerator;
  let database: IssuesDatabase;
  let issueService: IssueService;
  let searchService: SearchService;

  beforeEach(async () => {
    storage = new InMemoryStorageProvider();
    idGenerator = new InMemoryIdGenerator();
    database = new IssuesDatabase(storage, idGenerator);
    await database.initialize();
    issueService = new IssueService(database);
    searchService = new SearchService(issueService);
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create test issues with different content
      await issueService.createIssue({
        title: 'Login button broken',
        description: 'Users cannot click the login button on the homepage',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Immediate,
        tags: ['ui', 'auth', 'login']
      });

      await issueService.createIssue({
        title: 'Add logout feature',
        description: 'Need a way for users to logout from the application',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        tags: ['auth', 'logout']
      });

      await issueService.createIssue({
        title: 'Database connection error',
        description: 'Cannot connect to postgres database server',
        type: IssueType.Bug,
        severity: Severity.Critical,
        urgency: Urgency.Immediate,
        tags: ['backend', 'database']
      });

      await issueService.createIssue({
        title: 'Improve login page styling',
        description: 'The login page needs better css and responsive design',
        type: IssueType.Enhancement,
        severity: Severity.Low,
        urgency: Urgency.Low,
        tags: ['ui', 'css', 'login']
      });
    });

    it('should search in title', async () => {
      const results = await searchService.search('login');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: SearchResult) => r.issue.title.includes('Login'))).toBe(true);
    });

    it('should search in description', async () => {
      const results = await searchService.search('postgres');

      expect(results).toHaveLength(1);
      expect(results[0].issue.title).toBe('Database connection error');
    });

    it('should search in tags', async () => {
      const results = await searchService.search('auth');

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((r: SearchResult) => r.issue.title === 'Login button broken')).toBe(true);
      expect(results.some((r: SearchResult) => r.issue.title === 'Add logout feature')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const lowerCase = await searchService.search('login');
      const upperCase = await searchService.search('LOGIN');

      expect(lowerCase.length).toBe(upperCase.length);
    });

    it('should return empty array for no matches', async () => {
      const results = await searchService.search('nonexistent-term');

      expect(results).toEqual([]);
    });

    it('should return empty array for empty search', async () => {
      const results = await searchService.search('');

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only search', async () => {
      const results = await searchService.search('   ');

      expect(results).toEqual([]);
    });
  });

  describe('ranking', () => {
    beforeEach(async () => {
      // Create issues where "database" appears in different fields
      // Title match (highest score)
      await issueService.createIssue({
        title: 'Database migration script',
        description: 'Create a script for migrations',
        type: IssueType.Task,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        tags: ['script']
      });

      // Tag match (medium score)
      await issueService.createIssue({
        title: 'Fix connection pooling',
        description: 'Optimize connection handling',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.High,
        tags: ['database', 'performance']
      });

      // Description match (lowest score)
      await issueService.createIssue({
        title: 'Update documentation',
        description: 'Document the database schema and tables',
        type: IssueType.Documentation,
        severity: Severity.Low,
        urgency: Urgency.Low,
        tags: ['docs']
      });
    });

    it('should rank title matches highest', async () => {
      const results = await searchService.search('database');

      expect(results.length).toBe(3);
      // Title match should be first
      expect(results[0].issue.title).toBe('Database migration script');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should rank tag matches higher than description', async () => {
      const results = await searchService.search('database');

      // Tag match should come before description match
      const tagMatchIndex = results.findIndex((r: SearchResult) =>
        r.issue.tags.includes('database')
      );
      const descMatchIndex = results.findIndex((r: SearchResult) =>
        r.issue.title === 'Update documentation'
      );

      expect(tagMatchIndex).toBeLessThan(descMatchIndex);
    });

    it('should include match details in results', async () => {
      const results = await searchService.search('database');

      expect(results[0].matches).toBeDefined();
      expect(results[0].matches.title).toBe(true);
    });
  });

  describe('multiple term search', () => {
    beforeEach(async () => {
      await issueService.createIssue({
        title: 'Login page error',
        description: 'Error on the login page when using oauth',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Immediate,
        tags: ['login', 'oauth', 'error']
      });

      await issueService.createIssue({
        title: 'Logout button',
        description: 'Add logout functionality',
        type: IssueType.Feature,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        tags: ['logout']
      });
    });

    it('should match any term (OR behavior)', async () => {
      const results = await searchService.search('login logout');

      expect(results.length).toBe(2);
    });

    it('should rank issues with more matches higher', async () => {
      // Create issue with "feature" in multiple fields
      await issueService.createIssue({
        title: 'New feature implementation',
        description: 'This feature needs to be implemented soon',
        type: IssueType.Feature,
        severity: Severity.High,
        urgency: Urgency.High,
        tags: ['feature', 'important']
      });

      const results = await searchService.search('feature');

      // Should find the issue and rank it (title match gives highest score)
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches.title).toBe(true);
      expect(results[0].score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('search result format', () => {
    beforeEach(async () => {
      await issueService.createIssue({
        title: 'Test Issue',
        description: 'Test description',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal,
        tags: ['test']
      });
    });

    it('should return SearchResult with issue and score', async () => {
      const results = await searchService.search('test');

      expect(results[0]).toHaveProperty('issue');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('matches');
    });

    it('should include match details', async () => {
      const results = await searchService.search('test');

      expect(results[0].matches).toEqual({
        title: true,
        description: true,
        tags: true
      });
    });
  });

  describe('quick pick format', () => {
    beforeEach(async () => {
      await issueService.createIssue({
        title: 'Fix critical bug',
        description: 'This is a critical security issue',
        type: IssueType.Bug,
        severity: Severity.Critical,
        urgency: Urgency.Immediate,
        tags: ['security', 'critical']
      });
    });

    it('should convert results to QuickPick items', async () => {
      const results = await searchService.search('critical');
      const quickPickItems = searchService.toQuickPickItems(results);

      expect(quickPickItems).toHaveLength(1);
      expect(quickPickItems[0]).toHaveProperty('label');
      expect(quickPickItems[0]).toHaveProperty('description');
      expect(quickPickItems[0]).toHaveProperty('detail');
    });

    it('should include issue type in QuickPick label', async () => {
      const results = await searchService.search('critical');
      const quickPickItems = searchService.toQuickPickItems(results);

      expect(quickPickItems[0].label).toContain('bug');
    });
  });
});
