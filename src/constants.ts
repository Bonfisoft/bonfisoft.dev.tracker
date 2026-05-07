/**
 * Extension-wide constants
 * @module constants
 */

/**
 * VS Code command identifiers
 */
export const COMMANDS = {
  REFRESH_ISSUES: 'bonfisoft-issues.refreshIssues',
  CREATE_ISSUE: 'bonfisoft-issues.createIssue',
  VIEW_ISSUE: 'bonfisoft-issues.viewIssue',
  EDIT_ISSUE: 'bonfisoft-issues.editIssue',
  DELETE_ISSUE: 'bonfisoft-issues.deleteIssue',
  CLOSE_ISSUE: 'bonfisoft-issues.closeIssue',
  RESOLVE_ISSUE: 'bonfisoft-issues.resolveIssue',
  REOPEN_ISSUE: 'bonfisoft-issues.reopenIssue',
  SEARCH_ISSUES: 'bonfisoft-issues.searchIssues',
  FILTER_ISSUES: 'bonfisoft-issues.filterIssues',
  LINK_CODE: 'bonfisoft-issues.linkCode',
  OPEN_DASHBOARD: 'bonfisoft-issues.openDashboard',
} as const;

/**
 * View identifiers
 */
export const VIEWS = {
  ISSUES_TREE: 'bonfisoftIssues',
} as const;

/**
 * View container identifiers
 */
export const VIEW_CONTAINERS = {
  SIDEBAR: 'bonfisoftIssuesSidebar',
} as const;
