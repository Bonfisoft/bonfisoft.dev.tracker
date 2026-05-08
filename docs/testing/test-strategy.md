# Testing Strategy - BonfiSoft Development Tracker

---

## Overview

This document outlines the comprehensive testing approach for the BonfiSoft Development Tracker VS Code extension. Following TDD methodology, every component must have tests before implementation.

**Test Pyramid:**

```text
       /\
      /  \
     / E2E \     <- Playwright (10%)
    /--------\
   /   Integ   \   <- Service + Database (20%)
  /--------------\
 /     Unit        \ <- Vitest (70%)
/--------------------\
```

---

## Testing Layers

### 1. Unit Tests (Vitest)

**Scope:** Isolated business logic, utilities, pure functions  
**Location:** `test/suite/*.test.ts`  
**Mocking:** VS Code API fully mocked  
**Target Coverage:** > 80%

| Module | Test File | Focus |
|--------|-----------|-------|
| Helpers | `helpers.test.ts` | Pure utility functions, ID generation, date formatting |
| IssueDatabase | `issueDatabase.test.ts` | CRUD operations, events, caching |
| IssueService | `issueService.test.ts` | Business logic, filtering, staleness |
| SearchService | `searchService.test.ts` | Full-text search, ranking algorithms |
| ChangelogService | `changelogService.test.ts` | Markdown generation, grouping |
| ExportService | `exportService.test.ts` | JSON/CSV/Markdown export, import validation |
| TemplateService | `templateService.test.ts` | Template CRUD, defaults |
| VersionProvider | `versionProvider.test.ts` | Git tag parsing, sorting |
| StorageProvider | `storageProvider.test.ts` | File I/O, atomic writes |
| Logger | `logger.test.ts` | Log levels, formatting |

**Unit Test Example Pattern:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IssueService } from '../../src/services/IssueService.js';
import { IssueDatabase } from '../../src/database/IssueDatabase.js';
import { InMemoryStorageProvider } from '../mocks/InMemoryStorageProvider.js';

describe('IssueService', () => {
  let database: IssueDatabase;
  let service: IssueService;
  
  beforeEach(() => {
    const storage = new InMemoryStorageProvider();
    database = new IssueDatabase(storage);
    service = new IssueService(database);
  });
  
  it('should create issue with required fields', async () => {
    const issue = await service.createIssue({
      title: 'Test bug',
      type: 'bug',
      severity: 'high',
      urgency: 'normal'
    });
    
    expect(issue.title).toBe('Test bug');
    expect(issue.status).toBe('open');
    expect(issue.id).toBeDefined();
  });
});
```

---

### 2. Integration Tests (Vitest + Temp Files)

**Scope:** Service + Database + Storage layer interaction  
**Location:** `test/suite/*.integration.test.ts`  
**Strategy:** Use real file I/O with temp directories

**Key Integration Scenarios:**

- Database persistence round-trip
- Storage provider file operations
- Event emission and subscription
- Import/export with real files

---

### 3. E2E Tests (Playwright)

**Scope:** Full user workflows with headless VS Code  
**Location:** `test/e2e/*.e2e.ts`  
**Strategy:** Test actual UI interactions

**Critical E2E Flows:**

#### E2E-001: Create Issue Flow

```typescript
// Pseudo-code
1. Open workspace in VS Code
2. Run command "Issues: Create New Issue"
3. Select type "Bug"
4. Enter title "Test Issue"
5. Select severity "High"
6. Select urgency "Immediate"
7. Confirm creation
8. Verify issue appears in sidebar
```

#### E2E-002: Edit Issue Flow

```typescript
1. Click issue in sidebar
2. Click title field
3. Change title
4. Press Enter
5. Verify title updated in detail panel
6. Verify title updated in sidebar
7. Reload window
8. Verify change persisted
```

#### E2E-003: Link Code Flow

```typescript
1. Open file at line 10
2. Select lines 10-15
3. Run "Issues: Link Code to Issue"
4. Select issue from QuickPick
5. Verify gutter icon appears
6. Verify CodeLens appears
7. Click CodeLens
8. Verify detail panel opens
```

---

## Test Environment

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
```

### Mocking Strategy

**VS Code API Mock (`test/mocks/vscode.ts`):**

```typescript
export const workspace = {
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createDirectory: vi.fn()
  },
  getConfiguration: vi.fn()
};

export const window = {
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  createWebviewPanel: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn()
};

export const commands = {
  registerCommand: vi.fn()
};
```

**In-Memory Storage Provider (`test/mocks/InMemoryStorageProvider.ts`):**

```typescript
export class InMemoryStorageProvider implements IStorageProvider {
  private manifest: string | null = null;
  private files: Map<string, Map<string, string>> = new Map();

  async readManifest(): Promise<string | null> { return this.manifest; }
  async writeManifest(content: string): Promise<void> { this.manifest = content; }

  async listFiles(collection: string): Promise<string[]> {
    return Array.from(this.files.get(collection)?.keys() ?? []);
  }
  async readFile(collection: string, id: string): Promise<string | null> {
    return this.files.get(collection)?.get(id) ?? null;
  }
  async writeFile(collection: string, id: string, content: string): Promise<void> {
    if (!this.files.has(collection)) this.files.set(collection, new Map());
    this.files.get(collection)!.set(id, content);
  }
  async deleteFile(collection: string, id: string): Promise<void> {
    this.files.get(collection)?.delete(id);
  }
}
```

---

## Testing by Phase

### Phase 1: Foundation (Types, Storage, Database)

| Component | Test Type | Test Count |
|-----------|-----------|------------|
| Types/Enums | Unit | 7 (one per enum validation) |
| IStorageProvider Interface | Contract | 1 |
| WorkspaceStorageProvider | Unit + Integration | 8 |
| GlobalStorageProvider | Unit + Integration | 6 |
| IssueDatabase | Unit | 15 |
| ID Generator | Unit | 5 |
| Logger | Unit | 4 |

**Total Phase 1 Tests: ~46**

---

### Phase 2: Core Services

| Component | Test Type | Test Count |
|-----------|-----------|------------|
| IssueService | Unit | 20 |
| SearchService | Unit | 12 |
| ExportService | Unit + Integration | 15 |

**Total Phase 2 Tests: ~47**

---

### Phase 3: Basic UI

| Component | Test Type | Test Count |
|-----------|-----------|------------|
| IssueTreeProvider | Unit (mocked) | 10 |
| IssueCodeLensProvider | Unit | 8 |
| IssueDecorationProvider | Unit | 6 |
| StatusBarProvider | Unit | 5 |
| Issue Commands | Unit + E2E | 15 |
| IssueDetailPanel | E2E | 8 |

**Total Phase 3 Tests: ~52**

---

### Phase 4: Integration

| Component | Test Type | Test Count |
|-----------|-----------|------------|
| GitVersionProvider | Unit + Integration | 10 |
| Code Linking | Unit + E2E | 12 |
| Full Workflows | E2E | 10 |

**Total Phase 4 Tests: ~32**

---

### Phase 5-8: Advanced Features

| Component | Test Type | Test Count |
|-----------|-----------|------------|
| Milestone/Sprint Services | Unit | 15 |
| Time Tracking Service | Unit | 8 |
| Template Service | Unit | 10 |
| Changelog Service | Unit | 8 |
| Dashboard | E2E | 6 |

**Total Phase 5-8 Tests: ~47**

---

## Critical Test Cases

### Must-Have Test Coverage (MVP)

#### T-001: Issue Creation

```typescript
it('creates issue with all required fields', async () => {
  // Arrange
  const input = { title: 'Bug', type: 'bug', severity: 'high', urgency: 'normal' };
  
  // Act
  const issue = await service.createIssue(input);
  
  // Assert
  expect(issue.id).toBeDefined();
  expect(issue.title).toBe('Bug');
  expect(issue.status).toBe('open');
  expect(issue.createdAt).toBeDefined();
});
```

#### T-002: Issue Edit (Critical from Previous Project)

```typescript
it('edits issue title and persists change', async () => {
  // Arrange
  const issue = await service.createIssue({...});
  const newTitle = 'Updated Title';
  
  // Act
  await service.updateIssue(issue.id, { title: newTitle });
  const updated = await service.getIssue(issue.id);
  
  // Assert
  expect(updated.title).toBe(newTitle);
  expect(updated.updatedAt).not.toBe(issue.updatedAt);
});
```

#### T-003: Storage Persistence

```typescript
it('persists each issue to its own file on create', async () => {
  // Arrange
  const storage = new InMemoryStorageProvider();
  const database = new IssuesDatabase(storage, idGenerator);
  await database.initialize();

  // Act
  const created = await database.createIssue({...});
  const saved = await storage.readFile('issues', created.id);

  // Assert
  expect(JSON.parse(saved!).title).toBe(created.title);
});
```

#### T-004: Code Linking

```typescript
it('adds code link to issue', async () => {
  // Arrange
  const issue = await service.createIssue({...});
  const link = { filePath: 'test.ts', lineStart: 1, lineEnd: 5 };
  
  // Act
  await service.addCodeLink(issue.id, link);
  const updated = await service.getIssue(issue.id);
  
  // Assert
  expect(updated.codeLinks).toHaveLength(1);
  expect(updated.codeLinks[0].filePath).toBe('test.ts');
});
```

#### T-005: Search Ranking

```typescript
it('ranks title matches higher than description', async () => {
  // Arrange
  const issue1 = await service.createIssue({ title: 'search term', description: '' });
  const issue2 = await service.createIssue({ title: 'other', description: 'search term' });
  
  // Act
  const results = await searchService.search('search term');
  
  // Assert
  expect(results[0].id).toBe(issue1.id);
  expect(results[1].id).toBe(issue2.id);
});
```

---

## Regression Tests

### From Previous Project (Vetspresso-Issues-Tracker)

| Issue | Test Added | Prevention |
|-------|------------|------------|
| Could not edit issues after creation | T-002, T-003, E2E-002 | Full CRUD test coverage |
| Storage corruption on crash | T-003, Integration | Atomic write tests |
| Search returning stale results | T-005 | Event-driven refresh tests |

---

## Test Execution

### Commands

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific file
npx vitest run test/suite/issueService.test.ts

# E2E tests
npm run test:e2e
```

### CI Pipeline

```yaml
# .github/workflows/ci.yml
- name: Unit Tests
  run: npm test
  
- name: Coverage Check
  run: npm run test:coverage
  
- name: E2E Tests
  run: npm run test:e2e
```

---

## Quality Gates

| Gate | Threshold | Enforcement |
|------|-----------|-------------|
| Unit Test Pass Rate | 100% | CI blocks merge on failure |
| Code Coverage | > 80% | CI fails if below |
| E2E Critical Paths | 100% | Manual release verification |
| TypeScript Strict | 0 errors | Build fails on any error |
| ESLint | 0 errors | Pre-commit hook |

---

## Test Data

### Fixtures

```typescript
// test/fixtures/issues.ts
export const sampleIssue = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Sample Bug',
  description: 'A test bug description',
  type: 'bug',
  severity: 'high',
  urgency: 'normal',
  status: 'open',
  reporter: 'test-user',
  assignee: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  tags: [],
  codeLinks: [],
  comments: [],
  timeLogs: [],
  relations: []
};
```

---

## Debugging Tests

### VS Code Launch Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "test/suite/issueService.test.ts"],
  "console": "integratedTerminal"
}
```

---

## Test Maintenance

### When to Add/Update Tests

| Trigger | Action |
|--------|--------|
| New feature | Add tests BEFORE implementation (TDD) |
| Bug fix | Add regression test first |
| Refactoring | Ensure existing tests pass |
| Performance change | Add performance regression test |
| API change | Update contract tests |

### Test Naming Convention

```typescript
// Pattern: should [expected behavior] when [condition]
it('should create issue with UUID when valid input provided');
it('should throw validation error when title exceeds 200 chars');
it('should update timestamp when issue modified');
it('should persist changes to storage on edit');
```
