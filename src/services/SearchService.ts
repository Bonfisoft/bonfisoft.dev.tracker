/**
 * SearchService - Advanced search with ranking and scoring
 * Searches across title, description, and tags with weighted results
 * @module services/SearchService
 */

import type { IssueService } from './IssueService.ts';
import type { Issue } from '../types/issue.ts';

/**
 * Match details for a search result
 */
export interface MatchDetails {
  title: boolean;
  description: boolean;
  tags: boolean;
}

/**
 * Search result with scoring
 */
export interface SearchResult {
  issue: Issue;
  score: number;
  matches: MatchDetails;
}

/**
 * QuickPick item format for VS Code
 */
export interface QuickPickItem {
  label: string;
  description: string;
  detail: string;
  issue: Issue;
}

/**
 * Scoring weights for different fields
 * Title matches are most important, then tags, then description
 */
const SCORE_WEIGHTS = {
  title: 3,
  tags: 2,
  description: 1
};

/**
 * SearchService - Provides ranked search across issues
 */
export class SearchService {
  /**
   * @param issueService - IssueService for retrieving issues
   */
  constructor(private readonly issueService: IssueService) {}

  /**
   * Search issues with ranking
   * Searches in title, description, and tags
   * @param searchTerm - Text to search for (space-separated terms = OR)
   * @returns Ranked search results
   */
  async search(searchTerm: string): Promise<SearchResult[]> {
    const term = searchTerm.toLowerCase().trim();

    if (term.length === 0) {
      return [];
    }

    const allIssues = await this.issueService.getAllIssues();
    const terms = term.split(/\s+/).filter(t => t.length > 0);

    const results: SearchResult[] = [];

    for (const issue of allIssues) {
      const result = this.scoreIssue(issue, terms);
      if (result.score > 0) {
        results.push(result);
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Score an issue against search terms
   * @param issue - Issue to score
   * @param terms - Search terms
   * @returns SearchResult with score and match details
   */
  private scoreIssue(issue: Issue, terms: string[]): SearchResult {
    const matches: MatchDetails = {
      title: false,
      description: false,
      tags: false
    };

    let score = 0;

    const titleLower = issue.title.toLowerCase();
    const descLower = issue.description.toLowerCase();
    const tagsLower = issue.tags.map((t: string) => t.toLowerCase());

    for (const term of terms) {
      // Title match (highest weight)
      if (titleLower.includes(term)) {
        matches.title = true;
        score += SCORE_WEIGHTS.title;
      }

      // Tag match (medium weight)
      if (tagsLower.some((tag: string) => tag.includes(term))) {
        matches.tags = true;
        score += SCORE_WEIGHTS.tags;
      }

      // Description match (lowest weight)
      if (descLower.includes(term)) {
        matches.description = true;
        score += SCORE_WEIGHTS.description;
      }
    }

    return {
      issue,
      score,
      matches
    };
  }

  /**
   * Convert search results to QuickPick items for VS Code
   * @param results - Search results
   * @returns QuickPick-compatible items
   */
  toQuickPickItems(results: SearchResult[]): QuickPickItem[] {
    return results.map(result => this.toQuickPickItem(result));
  }

  /**
   * Convert a single search result to QuickPick item
   * @param result - Search result
   * @returns QuickPick item
   */
  private toQuickPickItem(result: SearchResult): QuickPickItem {
    const issue = result.issue;

    // Format: [BUG] Title (icon would be added by caller)
    const label = `$(${issue.type}) ${issue.title}`;

    // Description: status and severity
    const description = `${issue.status} • ${issue.severity}`;

    // Detail: assignee and tags
    const assigneeStr = issue.assignee ? `assigned: ${issue.assignee}` : 'unassigned';
    const tagsStr = issue.tags.length > 0 ? issue.tags.join(', ') : 'no tags';
    const detail = `${assigneeStr} • ${tagsStr}`;

    return {
      label,
      description,
      detail,
      issue
    };
  }

  /**
   * Search and return QuickPick items directly
   * @param searchTerm - Text to search for
   * @returns QuickPick items
   */
  async searchForQuickPick(searchTerm: string): Promise<QuickPickItem[]> {
    const results = await this.search(searchTerm);
    return this.toQuickPickItems(results);
  }
}
