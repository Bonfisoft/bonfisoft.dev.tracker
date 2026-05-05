/**
 * Issues Database - coordinates all data operations
 * Handles CRUD, search, and persistence
 * @module database/IssuesDatabase
 */

import type { IStorageProvider } from '../storage/IStorageProvider.ts';
import type { IIdGenerator } from '../utils/idGenerator.ts';
import {
  Issue,
  IssueInput,
  Status,
  type IssuesDatabase as IssuesDatabaseType,
  ISO8601,
  UUID
} from '../types/issue.ts';
import { logger } from '../utils/logger.ts';

const SCHEMA_VERSION = '1.0.0';

/**
 * Search filters for issues
 */
export interface IssueSearchFilters {
  status?: Status;
  type?: string;
  severity?: string;
  urgency?: string;
  searchTerm?: string;
  assignee?: string;
  milestoneId?: string;
  sprintId?: string;
  tags?: string[];
}

/**
 * Issues Database - main data access layer
 * Coordinates between storage, types, and business logic
 */
export class IssuesDatabase {
  private data: IssuesDatabaseType | null = null;
  private loaded = false;

  /**
   * @param storage - Storage provider for persistence
   * @param idGenerator - ID generator for new issues
   */
  constructor(
    private readonly storage: IStorageProvider,
    private readonly idGenerator: IIdGenerator
  ) {}

  /**
   * Initialize or load the database
   * Creates new database if storage is empty
   */
  async initialize(): Promise<void> {
    try {
      const stored = await this.storage.read();

      if (stored) {
        this.data = JSON.parse(stored) as IssuesDatabaseType;
        logger.info(`loaded database with ${this.data.issues.length} issues`);
      } else {
        this.data = this.createEmptyDatabase();
        await this.persist();
        logger.info('created new empty database');
      }

      this.loaded = true;
    } catch (error) {
      logger.error(`failed to initialize database: ${error}`);
      throw new Error('database initialization failed');
    }
  }

  /**
   * Create a new empty database structure
   */
  private createEmptyDatabase(): IssuesDatabaseType {
    return {
      schemaVersion: SCHEMA_VERSION,
      project: {
        name: '',
        createdAt: new Date().toISOString() as ISO8601
      },
      issues: [],
      milestones: [],
      sprints: [],
      templates: [],
      metadata: {
        lastExportAt: null,
        issueCounter: 0
      }
    };
  }

  /**
   * Save current state to storage
   */
  private async persist(): Promise<void> {
    if (!this.data) {
      throw new Error('database not initialized');
    }
    await this.storage.write(JSON.stringify(this.data, null, 2));
  }

  /**
   * Ensure database is loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded || !this.data) {
      throw new Error('database not initialized - call initialize() first');
    }
  }

  /**
   * Get deep clone of data to prevent external mutations
   */
  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new issue
   * @param input - Issue data (without ID, timestamps, etc.)
   * @returns Created issue with all fields populated
   */
  async createIssue(input: IssueInput): Promise<Issue> {
    this.ensureLoaded();

    const now = new Date().toISOString() as ISO8601;
    const reporter = input.reporter || 'anonymous';

    const issue: Issue = {
      id: this.idGenerator.generateUUID() as UUID,
      title: input.title,
      description: input.description || '',
      type: input.type,
      severity: input.severity,
      urgency: input.urgency,
      status: input.status || Status.Open,
      reporter: reporter,
      assignee: input.assignee ?? null,
      createdAt: now,
      updatedAt: now,
      reportedInVersion: null,
      fixedInVersion: null,
      tags: input.tags || [],
      milestoneId: null,
      sprintId: null,
      relations: [],
      codeLinks: [],
      comments: [],
      timeLogs: []
    };

    this.data!.issues.push(issue);
    this.data!.metadata.issueCounter++;

    await this.persist();
    logger.debug(`created issue ${issue.id}: ${issue.title}`);

    return this.clone(issue);
  }

  /**
   * Get all issues
   * @returns Array of all issues
   */
  async getAllIssues(): Promise<Issue[]> {
    this.ensureLoaded();
    return this.clone(this.data!.issues);
  }

  /**
   * Get issue by ID
   * @param id - Issue ID
   * @returns Issue or null if not found
   */
  async getIssueById(id: string): Promise<Issue | null> {
    this.ensureLoaded();
    const issue = this.data!.issues.find(i => i.id === id);
    return issue ? this.clone(issue) : null;
  }

  /**
   * Update an issue
   * @param id - Issue ID to update
   * @param update - Fields to update
   * @returns Updated issue
   * @throws Error if issue not found
   */
  async updateIssue(id: string, update: Partial<Omit<Issue, 'id' | 'createdAt'>>): Promise<Issue> {
    this.ensureLoaded();

    const index = this.data!.issues.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error(`Issue not found: ${id}`);
    }

    const existing = this.data!.issues[index];
    const now = new Date().toISOString() as ISO8601;

    const updated: Issue = {
      ...existing,
      ...update,
      id: existing.id, // Ensure ID is preserved
      createdAt: existing.createdAt, // Ensure creation time is preserved
      updatedAt: now
    };

    this.data!.issues[index] = updated;
    await this.persist();

    logger.debug(`updated issue ${id}`);
    return this.clone(updated);
  }

  /**
   * Delete an issue
   * @param id - Issue ID to delete
   * @throws Error if issue not found
   */
  async deleteIssue(id: string): Promise<void> {
    this.ensureLoaded();

    const index = this.data!.issues.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error(`Issue not found: ${id}`);
    }

    this.data!.issues.splice(index, 1);
    await this.persist();

    logger.debug(`deleted issue ${id}`);
  }

  // ==================== Search Operations ====================

  /**
   * Search and filter issues
   * @param filters - Search criteria
   * @returns Filtered issues
   */
  async searchIssues(filters: IssueSearchFilters): Promise<Issue[]> {
    this.ensureLoaded();

    let results = [...this.data!.issues];

    if (filters.status) {
      results = results.filter(i => i.status === filters.status);
    }

    if (filters.type) {
      results = results.filter(i => i.type === filters.type);
    }

    if (filters.severity) {
      results = results.filter(i => i.severity === filters.severity);
    }

    if (filters.urgency) {
      results = results.filter(i => i.urgency === filters.urgency);
    }

    if (filters.assignee) {
      results = results.filter(i => i.assignee === filters.assignee);
    }

    if (filters.milestoneId) {
      results = results.filter(i => i.milestoneId === filters.milestoneId);
    }

    if (filters.sprintId) {
      results = results.filter(i => i.sprintId === filters.sprintId);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(i =>
        filters.tags!.some(tag => i.tags.includes(tag))
      );
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(i =>
        i.title.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        i.id.toLowerCase().includes(term)
      );
    }

    return this.clone(results);
  }

  // ==================== Utility ====================

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    issueCount: number;
    openCount: number;
    closedCount: number;
    issueCounter: number;
  }> {
    this.ensureLoaded();

    return {
      issueCount: this.data!.issues.length,
      openCount: this.data!.issues.filter(i => i.status === Status.Open).length,
      closedCount: this.data!.issues.filter(i => i.status === Status.Closed).length,
      issueCounter: this.data!.metadata.issueCounter
    };
  }
}
