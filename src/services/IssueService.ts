/**
 * IssueService - Business logic layer for issue management
 * Handles validation, events, and coordination with database
 * @module services/IssueService
 */

import type { IssuesDatabase } from '../database/IssuesDatabase.ts';
import type { Issue, IssueInput, Status, Comment } from '../types/issue.ts';
import { logger } from '../utils/logger.ts';

/**
 * Filter criteria for issue filtering
 */
export interface IssueFilterCriteria {
  status?: Status;
  type?: string;
  severity?: string;
  urgency?: string;
  assignee?: string;
}

/**
 * Simple event emitter for service events
 */
class SimpleEventEmitter<T> {
  private listeners: Set<(data: T) => void> = new Set();

  subscribe(listener: (data: T) => void): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      }
    };
  }

  emit(data: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error(`event listener failed: ${error}`);
      }
    });
  }
}

/**
 * IssueService - Main business logic service for issues
 * Provides CRUD operations with validation and events
 */
export class IssueService {
  private onDidCreateIssueEmitter = new SimpleEventEmitter<Issue>();
  private onDidUpdateIssueEmitter = new SimpleEventEmitter<Issue>();
  private onDidDeleteIssueEmitter = new SimpleEventEmitter<string>();

  /**
   * @param database - Database instance for persistence
   */
  constructor(private readonly database: IssuesDatabase) {}

  /**
   * Subscribe to issue creation events
   * @param listener - Callback invoked when issue is created
   * @returns Disposable to unsubscribe
   */
  onDidCreateIssue(listener: (issue: Issue) => void): { dispose: () => void } {
    return this.onDidCreateIssueEmitter.subscribe(listener);
  }

  /**
   * Subscribe to issue update events
   * @param listener - Callback invoked when issue is updated
   * @returns Disposable to unsubscribe
   */
  onDidUpdateIssue(listener: (issue: Issue) => void): { dispose: () => void } {
    return this.onDidUpdateIssueEmitter.subscribe(listener);
  }

  /**
   * Subscribe to issue deletion events
   * @param listener - Callback invoked with issue ID when deleted
   * @returns Disposable to unsubscribe
   */
  onDidDeleteIssue(listener: (issueId: string) => void): { dispose: () => void } {
    return this.onDidDeleteIssueEmitter.subscribe(listener);
  }

  /**
   * Subscribe to any issue change (create, update, delete)
   * @param listener - Callback invoked when any issue changes
   * @returns Disposable to unsubscribe
   */
  onDidChangeIssues(listener: () => void): { dispose: () => void } {
    const createDisposable = this.onDidCreateIssueEmitter.subscribe(() => listener());
    const updateDisposable = this.onDidUpdateIssueEmitter.subscribe(() => listener());
    const deleteDisposable = this.onDidDeleteIssueEmitter.subscribe(() => listener());

    return {
      dispose: () => {
        createDisposable.dispose();
        updateDisposable.dispose();
        deleteDisposable.dispose();
      }
    };
  }

  /**
   * Validate issue input
   * @param input - Issue input to validate
   * @throws Error if validation fails
   */
  private validateIssueInput(input: IssueInput): void {
    const trimmedTitle = input.title.trim();

    if (trimmedTitle.length === 0) {
      throw new Error('title is required');
    }

    if (trimmedTitle.length > 200) {
      throw new Error('title must be 200 characters or less');
    }
  }

  /**
   * Create a new issue
   * @param input - Issue data
   * @returns Created issue
   * @throws Error if validation fails
   */
  async createIssue(input: IssueInput): Promise<Issue> {
    this.validateIssueInput(input);

    const sanitizedInput: IssueInput = {
      ...input,
      title: input.title.trim()
    };

    const issue = await this.database.createIssue(sanitizedInput);

    logger.info(`created issue ${issue.id}: ${issue.title}`);
    this.onDidCreateIssueEmitter.emit(issue);

    return issue;
  }

  /**
   * Get issue by ID
   * @param id - Issue ID
   * @returns Issue or null if not found
   */
  async getIssue(id: string): Promise<Issue | null> {
    return this.database.getIssueById(id);
  }

  /**
   * Update an issue - CRITICAL MVP FEATURE
   * @param id - Issue ID to update
   * @param update - Fields to update
   * @returns Updated issue
   * @throws Error if issue not found or validation fails
   */
  async updateIssue(id: string, update: Partial<Pick<Issue, 'title' | 'description' | 'status' | 'type' | 'severity' | 'urgency' | 'assignee' | 'tags' | 'comments'>>): Promise<Issue> {
    // Validate title if being updated
    if (update.title !== undefined) {
      const trimmedTitle = update.title.trim();
      if (trimmedTitle.length === 0) {
        throw new Error('title cannot be empty');
      }
      if (trimmedTitle.length > 200) {
        throw new Error('title must be 200 characters or less');
      }
      update.title = trimmedTitle;
    }

    let issue: Issue;
    try {
      issue = await this.database.updateIssue(id, update);
    } catch (_error) {
      throw new Error('issue not found', { cause: _error });
    }

    logger.info(`updated issue ${id}`);
    this.onDidUpdateIssueEmitter.emit(issue);

    return issue;
  }

  /**
   * Delete an issue
   * @param id - Issue ID to delete
   * @throws Error if issue not found
   */
  async deleteIssue(id: string): Promise<void> {
    try {
      await this.database.deleteIssue(id);
    } catch (_error) {
      throw new Error('issue not found', { cause: _error });
    }

    logger.info(`deleted issue ${id}`);
    this.onDidDeleteIssueEmitter.emit(id);
  }

  /**
   * Get all issues
   * @returns Array of all issues
   */
  async getAllIssues(): Promise<Issue[]> {
    return this.database.getAllIssues();
  }

  /**
   * Filter issues by criteria
   * @param criteria - Filter criteria
   * @returns Filtered issues
   */
  async filterIssues(criteria: IssueFilterCriteria): Promise<Issue[]> {
    const allIssues = await this.database.getAllIssues();

    return allIssues.filter((issue: Issue) => {
      if (criteria.status && issue.status !== criteria.status) {
        return false;
      }
      if (criteria.type && issue.type !== criteria.type) {
        return false;
      }
      if (criteria.severity && issue.severity !== criteria.severity) {
        return false;
      }
      if (criteria.urgency && issue.urgency !== criteria.urgency) {
        return false;
      }
      if (criteria.assignee !== undefined && issue.assignee !== criteria.assignee) {
        return false;
      }
      return true;
    });
  }

  /**
   * Search issues by text
   * Searches in title, description, and tags
   * @param searchTerm - Text to search for
   * @returns Matching issues
   */
  async searchIssues(searchTerm: string): Promise<Issue[]> {
    const term = searchTerm.toLowerCase().trim();

    if (term.length === 0) {
      return [];
    }

    const allIssues = await this.database.getAllIssues();

    return allIssues.filter((issue: Issue) => {
      const inTitle = issue.title.toLowerCase().includes(term);
      const inDescription = issue.description.toLowerCase().includes(term);
      const inTags = issue.tags.some((tag: string) => tag.toLowerCase().includes(term));

      return inTitle || inDescription || inTags;
    });
  }

  // ── Comment Management ─────────────────────────────────────────────────────

  /**
   * Add a comment to an issue
   * @param issueId - Issue ID to add comment to
   * @param author - User ID of the comment author
   * @param body - Comment text
   * @returns Updated issue or null if not found
   */
  async addComment(issueId: string, author: string, body: string): Promise<Issue | null> {
    if (!body || body.trim().length === 0) {
      throw new Error('comment body cannot be empty');
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length > 5000) {
      throw new Error('comment must be 5000 characters or less');
    }

    const issue = await this.database.getIssueById(issueId);
    if (!issue) {
      return null;
    }

    const newComment = {
      id: crypto.randomUUID(),
      author,
      body: trimmedBody,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    const updatedComments = [...issue.comments, newComment];

    return this.updateIssue(issueId, { comments: updatedComments });
  }

  /**
   * Delete a comment from an issue
   * @param issueId - Issue ID
   * @param commentId - Comment ID to delete
   * @returns Updated issue or null if not found
   */
  async deleteComment(issueId: string, commentId: string): Promise<Issue | null> {
    const issue = await this.database.getIssueById(issueId);
    if (!issue) {
      return null;
    }

    const updatedComments = issue.comments.filter((c: Comment) => c.id !== commentId);

    if (updatedComments.length === issue.comments.length) {
      throw new Error('comment not found');
    }

    return this.updateIssue(issueId, { comments: updatedComments });
  }

  /**
   * Reorder comments in an issue
   * @param issueId - Issue ID
   * @param orderedIds - Array of comment IDs in new order
   * @returns Updated issue or null if not found
   */
  async reorderComments(issueId: string, orderedIds: string[]): Promise<Issue | null> {
    const issue = await this.database.getIssueById(issueId);
    if (!issue) {
      return null;
    }

    if (orderedIds.length !== issue.comments.length) {
      throw new Error('ordered ids must match comment count');
    }

    const commentMap = new Map(issue.comments.map((c: Comment) => [c.id, c]));
    const reorderedComments = orderedIds.map(id => {
      const comment = commentMap.get(id);
      if (!comment) {
        throw new Error(`invalid comment id: ${id}`);
      }
      return comment;
    });

    return this.updateIssue(issueId, { comments: reorderedComments });
  }
}
