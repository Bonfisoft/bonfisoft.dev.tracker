/**
 * ExportService - Handles JSON export and import of issues
 * Supports round-trip backup/restore with validation
 * @module services/ExportService
 */

import type { IssueService } from './IssueService.ts';
import type { Issue, IssueInput } from '../types/issue.ts';
import { logger } from '../utils/logger.ts';

/**
 * Export report metadata
 */
export interface ExportReport {
  count: number;
  timestamp: string;
}

/**
 * Import report with statistics
 */
export interface ImportReport {
  imported: number;
  skipped: number;
  errors: string[];
  timestamp: string;
}

/**
 * ExportService - Handles data export and import
 */
export class ExportService {
  /**
   * @param issueService - IssueService for CRUD operations
   */
  constructor(private readonly issueService: IssueService) {}

  /**
   * Export all issues to JSON format
   * @returns JSON string of all issues
   */
  async exportToJson(): Promise<string> {
    const issues = await this.issueService.getAllIssues();
    return JSON.stringify(issues, null, 2);
  }

  /**
   * Generate export report metadata
   * @returns Export report
   */
  async exportReport(): Promise<ExportReport> {
    const issues = await this.issueService.getAllIssues();

    return {
      count: issues.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import issues from JSON
   * @param json - JSON string containing array of issues
   * @returns Import report with statistics
   * @throws Error if JSON is invalid
   */
  async importFromJson(json: string): Promise<ImportReport> {
    const report: ImportReport = {
      imported: 0,
      skipped: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };

    let issuesToImport: unknown;

    // Parse JSON
    try {
      issuesToImport = JSON.parse(json);
    } catch (_error) {
      logger.error('failed to parse import json');
      throw new Error('invalid json format', { cause: _error });
    }

    // Validate it's an array
    if (!Array.isArray(issuesToImport)) {
      throw new Error('expected array of issues');
    }

    // Get existing issues for duplicate check
    const existingIssues = await this.issueService.getAllIssues();
    const existingIds = new Set(existingIssues.map((i: Issue) => i.id));

    // Import each issue
    for (let i = 0; i < issuesToImport.length; i++) {
      const item = issuesToImport[i];

      try {
        const importResult = await this.importSingleIssue(item, existingIds);

        if (importResult.imported) {
          report.imported++;
          existingIds.add(importResult.id!);
        } else if (importResult.skipped) {
          report.skipped++;
        }
      } catch (error) {
        const errorMsg = `item ${i}: ${error}`;
        report.errors.push(errorMsg);
        logger.error(`import failed for ${errorMsg}`);
      }
    }

    logger.info(`imported ${report.imported} issues, skipped ${report.skipped}`);

    return report;
  }

  /**
   * Import a single issue
   * @param item - Issue data to import
   * @param existingIds - Set of existing issue IDs
   * @returns Import result
   */
  private async importSingleIssue(
    item: unknown,
    existingIds: Set<string>
  ): Promise<{ imported: boolean; skipped: boolean; id?: string }> {
    // Basic validation
    if (!item || typeof item !== 'object') {
      throw new Error('invalid issue data');
    }

    const issueData = item as Partial<Issue>;

    // Check for duplicate by ID
    if (issueData.id && existingIds.has(issueData.id)) {
      logger.debug(`skipping duplicate issue: ${issueData.id}`);
      return { imported: false, skipped: true };
    }

    // Validate required fields
    if (!issueData.title || typeof issueData.title !== 'string' || issueData.title.trim().length === 0) {
      throw new Error('title is required');
    }

    // Extract fields with defaults for optional ones
    const title = issueData.title.trim();
    const type = issueData.type || 'bug';
    const severity = issueData.severity || 'medium';
    const urgency = issueData.urgency || 'normal';

    // Build input
    const input: IssueInput = {
      title,
      description: issueData.description || '',
      type: type as IssueInput['type'],
      severity: severity as IssueInput['severity'],
      urgency: urgency as IssueInput['urgency'],
      reporter: issueData.reporter || 'import',
      assignee: issueData.assignee || null,
      tags: issueData.tags || []
    };

    // Create issue (this generates new ID and timestamps)
    const created = await this.issueService.createIssue(input);

    return { imported: true, skipped: false, id: created.id };
  }
}
