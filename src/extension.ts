/**
 * Extension entry point - BonfiSoft Development Tracker
 * @module extension
 */

import * as vscode from 'vscode';
import { logger, setLogLevel, LogLevel } from './utils/logger.ts';
import { WorkspaceStorageProvider } from './storage/WorkspaceStorageProvider.ts';
import { IssuesDatabase } from './database/IssuesDatabase.ts';
import { IssueService } from './services/IssueService.ts';
import { SearchService } from './services/SearchService.ts';
import { IssueTreeProvider } from './providers/IssueTreeProvider.ts';
import { registerIssueCommands } from './commands/issueCommands.ts';
import { defaultIdGenerator } from './utils/idGenerator.ts';
import { COMMANDS, VIEWS } from './constants.ts';

/**
 * Activate the extension
 * @param context - Extension context for registering disposables
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('activating bonfisoft development tracker');

  // Set log level based on development mode
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  setLogLevel(isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info(`extension mode: ${isDevelopment ? 'development' : 'production'}`);

  // Resolve workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceFolder) {
    logger.warn('no workspace folder found - extension limited to single-folder workspaces');
    return;
  }

  // Initialise storage, database, and services
  const storage = new WorkspaceStorageProvider(workspaceFolder);
  const database = new IssuesDatabase(storage, defaultIdGenerator);
  await database.initialize();

  const issueService = new IssueService(database);
  const searchService = new SearchService(issueService);

  // Register tree view
  const issueTreeProvider = new IssueTreeProvider(database);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.ISSUES_TREE, issueTreeProvider)
  );

  // Refresh command (tree-level, not delegated to issueCommands)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.REFRESH_ISSUES, () => {
      issueTreeProvider.refresh();
    })
  );

  // VIEW_ISSUE stub — will open IssueDetailPanel in Phase 3.3
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.VIEW_ISSUE, (issueId: string) => {
      logger.info(`view issue: ${issueId}`);
      vscode.window.showInformationMessage(`View Issue: ${issueId} (IssueDetailPanel — Phase 3.3)`);
    })
  );

  // All other issue commands (create, edit, delete, close, resolve, reopen, search, filter)
  registerIssueCommands(context, issueService, searchService);

  logger.info('bonfisoft development tracker activated');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  logger.info('deactivating bonfisoft development tracker');
}
