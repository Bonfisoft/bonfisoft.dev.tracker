import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CryptoIdGenerator, defaultIdGenerator } from '../../src/utils/idGenerator.ts';
import { logger, setLogLevel, LogLevel } from '../../src/utils/logger.ts';

describe('CryptoIdGenerator', () => {
  it('should generate valid UUID v4 format', () => {
    const generator = new CryptoIdGenerator();
    const uuid = generator.generateUUID();

    // UUID v4 regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const generator = new CryptoIdGenerator();
    const uuids = new Set<string>();

    // Generate 100 UUIDs
    for (let i = 0; i < 100; i++) {
      uuids.add(generator.generateUUID());
    }

    // All should be unique
    expect(uuids.size).toBe(100);
  });

  it('should have default singleton instance', () => {
    expect(defaultIdGenerator).toBeDefined();
    const uuid = defaultIdGenerator.generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('InMemoryIdGenerator (Mock)', () => {
  it('should generate sequential test IDs', async () => {
    const { InMemoryIdGenerator } = await import('../mocks/InMemoryIdGenerator.js');
    const generator = new InMemoryIdGenerator();

    expect(generator.generateUUID()).toBe('test-id-1');
    expect(generator.generateUUID()).toBe('test-id-2');
    expect(generator.generateUUID()).toBe('test-id-3');
  });

  it('should track counter', async () => {
    const { InMemoryIdGenerator } = await import('../mocks/InMemoryIdGenerator.js');
    const generator = new InMemoryIdGenerator();

    expect(generator.getCounter()).toBe(0);
    generator.generateUUID();
    expect(generator.getCounter()).toBe(1);
  });

  it('should reset counter', async () => {
    const { InMemoryIdGenerator } = await import('../mocks/InMemoryIdGenerator.js');
    const generator = new InMemoryIdGenerator();

    generator.generateUUID();
    generator.generateUUID();
    expect(generator.getCounter()).toBe(2);

    generator.reset();
    expect(generator.getCounter()).toBe(0);
    expect(generator.generateUUID()).toBe('test-id-1');
  });
});

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setLogLevel(LogLevel.DEBUG); // Reset to show all
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log at DEBUG level', () => {
      setLogLevel(LogLevel.DEBUG);
      logger.debug('test debug');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] test debug');
    });

    it('should not log when level is INFO', () => {
      setLogLevel(LogLevel.INFO);
      logger.debug('test debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log at INFO level', () => {
      setLogLevel(LogLevel.INFO);
      logger.info('test info');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test info');
    });

    it('should log at DEBUG level', () => {
      setLogLevel(LogLevel.DEBUG);
      logger.info('test info');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test info');
    });

    it('should not log when level is WARN', () => {
      setLogLevel(LogLevel.WARN);
      logger.info('test info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log at WARN level', () => {
      setLogLevel(LogLevel.WARN);
      logger.warn('test warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] test warn');
    });

    it('should not log when level is ERROR', () => {
      setLogLevel(LogLevel.ERROR);
      logger.warn('test warn');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log at ERROR level', () => {
      setLogLevel(LogLevel.ERROR);
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] test error');
    });

    it('should always log when ERROR is highest level', () => {
      setLogLevel(LogLevel.ERROR);
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });
});
