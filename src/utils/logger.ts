/**
 * Simple logger utility
 * In real extension, this would use VS Code output channel
 * @module utils/logger
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Current log level - can be changed at runtime
 */
let currentLogLevel = LogLevel.INFO;

/**
 * Set the current log level
 * @param level - Minimum level to log
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Log a debug message
 * @param message - Message to log
 */
export function debug(message: string): void {
  if (currentLogLevel <= LogLevel.DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Log an info message
 * @param message - Message to log
 */
export function info(message: string): void {
  if (currentLogLevel <= LogLevel.INFO) {
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Log a warning message
 * @param message - Message to log
 */
export function warn(message: string): void {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn(`[WARN] ${message}`);
  }
}

/**
 * Log an error message
 * @param message - Message to log
 */
export function error(message: string): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Logger object with all methods
 */
export const logger = {
  debug,
  info,
  warn,
  error
};
