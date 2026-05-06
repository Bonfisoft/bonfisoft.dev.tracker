/**
 * Extension entry point - BonfiSoft Development Tracker
 * @module extension
 */

import * as vscode from 'vscode';
import { logger, setLogLevel, LogLevel } from './utils/logger.ts';

/**
 * Activate the extension
 * @param context - Extension context for registering disposables
 */
export function activate(context: vscode.ExtensionContext): void {
  logger.info('activating bonfisoft development tracker');

  // Set log level based on development mode
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  setLogLevel(isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info(`extension mode: ${isDevelopment ? 'development' : 'production'}`);

  // Phase 1 & 2 are complete - services ready
  // Phase 3 (UI) and Phase 4 (Integration) will wire up here

  logger.info('bonfisoft development tracker activated');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  logger.info('deactivating bonfisoft development tracker');
}
