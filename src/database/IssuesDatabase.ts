/**
 * Issues Database - coordinates all data operations
 * Handles CRUD, search, and persistence
 * @module database/IssuesDatabase
 */

import { EventEmitter } from 'events';
import type { IStorageProvider } from '../storage/IStorageProvider.ts';
import type { IIdGenerator } from '../utils/idGenerator.ts';
import {
  Issue,
  IssueInput,
  Status,
  type Milestone,
  type Sprint,
  type Template,
  ISO8601,
  UUID
} from '../types/issue.ts';
import { logger } from '../utils/logger.ts';

const SCHEMA_VERSION = '2.0.0';
const ISSUES_COLLECTION = 'issues';

/**
 * Manifest structure stored in db.json
 * Contains everything except the issue files themselves
 */
interface Manifest {
  schemaVersion: string;
  project: {
    name: string;
    createdAt: ISO8601;
  };
  milestones: Milestone[];
  sprints: Sprint[];
  templates: Template[];
  metadata: {
    lastExportAt: ISO8601 | null;
    issueCounter: number;
  };
}

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
 * Coordinates between storage, types, and business logic.
 *
 * Storage layout:
 *   db.json                  ← manifest (project info, milestones, sprints, templates, counters)
 *   issues/<id>.json         ← one file per issue
 *
 * In-memory cache (Map<id, Issue>) is loaded at initialize() and kept
 * in sync by every mutation, so reads never hit the disk.
 */
export class IssuesDatabase {
  private manifest: Manifest | null = null;
  private issueCache: Map<string, Issue> = new Map();
  private loaded = false;
  private readonly _emitter = new EventEmitter();

  /**
   * Subscribe to any issue data change (create, update, delete)
   * @param callback - Called whenever issues change
   * @returns Disposable to remove the listener
   */
  onDidChangeIssues(callback: () => void): { dispose: () => void } {
    this._emitter.on('change', callback);
    return { dispose: () => this._emitter.off('change', callback) };
  }

  private notifyChange(): void {
    this._emitter.emit('change');
  }

  /**
   * @param storage - Storage provider for persistence
   * @param idGenerator - ID generator for new issues
   */
  constructor(
    private readonly storage: IStorageProvider,
    private readonly idGenerator: IIdGenerator
  ) {}

  /**
   * Initialize or load the database.
   * Reads the manifest and all issue files, populating the in-memory cache.
   */
  async initialize(): Promise<void> {
    try {
      const storedManifest = await this.storage.readManifest();

      if (storedManifest) {
        this.manifest = JSON.parse(storedManifest) as Manifest;
      } else {
        this.manifest = this.createEmptyManifest();
        await this.persistManifest();
        logger.info('created new empty database manifest');
      }

      // Load all issue files into the in-memory cache
      const ids = await this.storage.listFiles(ISSUES_COLLECTION);
      const loaded: Issue[] = [];
      const failed: string[] = [];

      await Promise.all(ids.map(async (id) => {
        const content = await this.storage.readFile(ISSUES_COLLECTION, id);
        if (content) {
          try {
            loaded.push(JSON.parse(content) as Issue);
          } catch {
            failed.push(id);
            logger.error(`failed to parse import json for issue ${id}`);
          }
        }
      }));

      for (const issue of loaded) {
        this.issueCache.set(issue.id, issue);
      }

      if (failed.length > 0) {
        logger.error(`failed to load ${failed.length} issue file(s): ${failed.join(', ')}`);
      }

      this.loaded = true;
      logger.info(`loaded database with ${this.issueCache.size} issues`);
    } catch (error) {
      logger.error(`failed to initialize database: ${error}`);
      throw new Error('database initialization failed', { cause: error });
    }
  }

  /**
   * Create a new empty manifest
   */
  private createEmptyManifest(): Manifest {
    return {
      schemaVersion: SCHEMA_VERSION,
      project: {
        name: '',
        createdAt: new Date().toISOString() as ISO8601
      },
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
   * Persist the manifest to storage
   */
  private async persistManifest(): Promise<void> {
    if (!this.manifest) {
      throw new Error('database not initialized');
    }
    await this.storage.writeManifest(JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Ensure database is loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded || !this.manifest) {
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
   * Create a new issue — writes one issue file and updates the manifest counter
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
      timeLogs: [],
      assigneeHistory: []
    };

    // Write the issue file first, then update the counter in the manifest
    await this.storage.writeFile(ISSUES_COLLECTION, issue.id, JSON.stringify(issue, null, 2));
    this.issueCache.set(issue.id, issue);

    this.manifest!.metadata.issueCounter++;
    await this.persistManifest();

    this.notifyChange();
    logger.debug(`created issue ${issue.id}: ${issue.title}`);

    return this.clone(issue);
  }

  /**
   * Get all issues from the in-memory cache
   * @returns Array of all issues
   */
  async getAllIssues(): Promise<Issue[]> {
    this.ensureLoaded();
    return this.clone(Array.from(this.issueCache.values()));
  }

  /**
   * Get issue by ID from the in-memory cache
   * @param id - Issue ID
   * @returns Issue or null if not found
   */
  async getIssueById(id: string): Promise<Issue | null> {
    this.ensureLoaded();
    const issue = this.issueCache.get(id);
    return issue ? this.clone(issue) : null;
  }

  /**
   * Update an issue — writes only the affected issue file
   * @param id - Issue ID to update
   * @param update - Fields to update
   * @returns Updated issue
   * @throws Error if issue not found
   */
  async updateIssue(id: string, update: Partial<Omit<Issue, 'id' | 'createdAt'>>): Promise<Issue> {
    this.ensureLoaded();

    const existing = this.issueCache.get(id);
    if (!existing) {
      throw new Error(`Issue not found: ${id}`);
    }

    const now = new Date().toISOString() as ISO8601;

    const updated: Issue = {
      ...existing,
      ...update,
      id: existing.id,           // Ensure ID is preserved
      createdAt: existing.createdAt, // Ensure creation time is preserved
      updatedAt: now
    };

    await this.storage.writeFile(ISSUES_COLLECTION, id, JSON.stringify(updated, null, 2));
    this.issueCache.set(id, updated);
    this.notifyChange();

    logger.debug(`updated issue ${id}`);
    return this.clone(updated);
  }

  /**
   * Delete an issue — deletes only the affected issue file
   * @param id - Issue ID to delete
   * @throws Error if issue not found
   */
  async deleteIssue(id: string): Promise<void> {
    this.ensureLoaded();

    if (!this.issueCache.has(id)) {
      throw new Error(`Issue not found: ${id}`);
    }

    await this.storage.deleteFile(ISSUES_COLLECTION, id);
    this.issueCache.delete(id);
    this.notifyChange();

    logger.debug(`deleted issue ${id}`);
  }

  // ==================== Search Operations ====================

  /**
   * Search and filter issues from the in-memory cache
   * @param filters - Search criteria
   * @returns Filtered issues
   */
  async searchIssues(filters: IssueSearchFilters): Promise<Issue[]> {
    this.ensureLoaded();

    let results = Array.from(this.issueCache.values());

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
    const issues = Array.from(this.issueCache.values());

    return {
      issueCount: issues.length,
      openCount: issues.filter(i => i.status === Status.Open).length,
      closedCount: issues.filter(i => i.status === Status.Closed).length,
      issueCounter: this.manifest!.metadata.issueCounter
    };
  }
}
