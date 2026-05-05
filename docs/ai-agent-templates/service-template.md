# AI Agent Template: Service Component

> **Purpose**: Generate business logic services that delegate to the database layer.
> **Location**: `src/services/<ServiceName>.ts`  
> **Test Location**: `test/suite/<serviceName>.test.ts`

---

## Required Reading Before Implementation

1. `docs/requirements/data-model.md` - Interfaces this service will use
2. `docs/requirements/functional-requirements.md` - Specific requirements for this feature
3. `docs/testing/test-strategy.md` - Testing approach
4. `docs/architecture/layered-architecture.md` - Service layer responsibilities

---

## Service Layer Responsibilities

Services contain **business logic**:

- Validation rules
- Data transformations
- Calculations (metrics, search ranking, etc.)
- Filtering and sorting
- Aggregations

Services **do NOT**:

- Access storage directly (use Database)
- Handle UI interactions (Commands do this)
- Render webviews (Panels do this)
- Directly register VS Code APIs

---

## Template Structure

```typescript
// src/services/IssueService.ts

import type { IssueDatabase } from '../database/IssueDatabase.js';
import type { Issue, IssueInput } from '../types/issue.js';
import { logger } from '../utils/logger.js';

export class IssueService {
  constructor(private readonly database: IssueDatabase) {}
  
  // CRUD Operations
  async createIssue(input: IssueInput): Promise<Issue> {
    // 1. Validate input
    // 2. Delegate to database
    // 3. Return result
  }
  
  async getIssue(id: string): Promise<Issue | null> {
    // 1. Validate ID format
    // 2. Delegate to database
    // 3. Return result
  }
  
  async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | null> {
    // 1. Validate ID
    // 2. Validate updates
    // 3. Delegate to database
    // 4. Return result
  }
  
  async deleteIssue(id: string): Promise<boolean> {
    // 1. Validate ID
    // 2. Delegate to database
    // 3. Return result
  }
  
  // Business Logic Methods
  async filterIssues(criteria: FilterCriteria): Promise<Issue[]> {
    // 1. Get all from database
    // 2. Apply business filters
    // 3. Return filtered
  }
  
  async calculateMetrics(): Promise<Metrics> {
    // 1. Get all from database
    // 2. Calculate aggregations
    // 3. Return metrics
  }
}
```

---

## Implementation Steps

### Step 1: Define Types

Create input/output types in `src/types/`:

```typescript
// src/types/issue.ts (add if not exists)

export interface IssueInput {
  title: string;
  description?: string;
  type: IssueType;
  severity: Severity;
  urgency: Urgency;
  reporter?: string;
  assignee?: string | null;
  tags?: string[];
}

export interface FilterCriteria {
  status?: Status[];
  type?: IssueType[];
  severity?: Severity[];
  assignee?: string;
  tags?: string[];
}
```

### Step 2: Create Test File

```typescript
// test/suite/issueService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  
  describe('createIssue', () => {
    it('should create issue with required fields', async () => {
      const input = {
        title: 'Test Bug',
        type: 'bug' as const,
        severity: 'high' as const,
        urgency: 'normal' as const
      };
      
      const issue = await service.createIssue(input);
      
      expect(issue.title).toBe('Test Bug');
      expect(issue.type).toBe('bug');
      expect(issue.status).toBe('open');
      expect(issue.id).toBeDefined();
      expect(issue.createdAt).toBeDefined();
    });
    
    it('should validate required title', async () => {
      const input = {
        title: '',
        type: 'bug' as const,
        severity: 'high' as const,
        urgency: 'normal' as const
      };
      
      await expect(service.createIssue(input)).rejects.toThrow('title is required');
    });
    
    it('should validate title max length', async () => {
      const input = {
        title: 'a'.repeat(201),
        type: 'bug' as const,
        severity: 'high' as const,
        urgency: 'normal' as const
      };
      
      await expect(service.createIssue(input)).rejects.toThrow('title must not exceed 200 characters');
    });
  });
  
  describe('getIssue', () => {
    it('should return issue by ID', async () => {
      const created = await service.createIssue({
        title: 'Test',
        type: 'bug' as const,
        severity: 'medium' as const,
        urgency: 'normal' as const
      });
      
      const found = await service.getIssue(created.id);
      
      expect(found?.id).toBe(created.id);
    });
    
    it('should return null for non-existent ID', async () => {
      const found = await service.getIssue('non-existent-id');
      
      expect(found).toBeNull();
    });
  });
  
  describe('updateIssue', () => {
    it('should update specified fields', async () => {
      const created = await service.createIssue({
        title: 'Original',
        type: 'bug' as const,
        severity: 'medium' as const,
        urgency: 'normal' as const
      });
      
      const updated = await service.updateIssue(created.id, {
        title: 'Updated'
      });
      
      expect(updated?.title).toBe('Updated');
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });
    
    it('should validate update fields', async () => {
      const created = await service.createIssue({
        title: 'Test',
        type: 'bug' as const,
        severity: 'medium' as const,
        urgency: 'normal' as const
      });
      
      await expect(service.updateIssue(created.id, {
        title: 'a'.repeat(201)
      })).rejects.toThrow('title must not exceed 200 characters');
    });
  });
  
  describe('deleteIssue', () => {
    it('should delete existing issue', async () => {
      const created = await service.createIssue({
        title: 'To Delete',
        type: 'bug' as const,
        severity: 'medium' as const,
        urgency: 'normal' as const
      });
      
      const deleted = await service.deleteIssue(created.id);
      
      expect(deleted).toBe(true);
      expect(await service.getIssue(created.id)).toBeNull();
    });
    
    it('should return false for non-existent ID', async () => {
      const deleted = await service.deleteIssue('non-existent');
      
      expect(deleted).toBe(false);
    });
  });
});
```

### Step 3: Implement Service

```typescript
// src/services/IssueService.ts

import type { IssueDatabase } from '../database/IssueDatabase.js';
import type { Issue, IssueInput, FilterCriteria } from '../types/issue.js';
import { logger } from '../utils/logger.js';

export class IssueService {
  constructor(private readonly database: IssueDatabase) {}
  
  async createIssue(input: IssueInput): Promise<Issue> {
    // Validation
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('title is required');
    }
    
    if (input.title.length > 200) {
      throw new Error('title must not exceed 200 characters');
    }
    
    // Additional validation...
    
    try {
      const issue = await this.database.createIssue({
        title: input.title.trim(),
        description: input.description || '',
        type: input.type,
        severity: input.severity,
        urgency: input.urgency,
        reporter: input.reporter || 'unknown',
        assignee: input.assignee || null,
        tags: input.tags || []
      });
      
      logger.info(`created issue ${issue.id}`);
      return issue;
    } catch (error) {
      logger.error(`failed to create issue: ${error}`);
      throw error;
    }
  }
  
  async getIssue(id: string): Promise<Issue | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }
    
    try {
      return await this.database.getIssue(id);
    } catch (error) {
      logger.error(`failed to get issue ${id}: ${error}`);
      return null;
    }
  }
  
  async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | null> {
    // Validate ID
    if (!id) {
      throw new Error('id is required');
    }
    
    // Validate updates
    if (updates.title !== undefined) {
      if (updates.title.length > 200) {
        throw new Error('title must not exceed 200 characters');
      }
    }
    
    try {
      const updated = await this.database.updateIssue(id, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      if (updated) {
        logger.info(`updated issue ${id}`);
      }
      
      return updated;
    } catch (error) {
      logger.error(`failed to update issue ${id}: ${error}`);
      throw error;
    }
  }
  
  async deleteIssue(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }
    
    try {
      const deleted = await this.database.deleteIssue(id);
      
      if (deleted) {
        logger.info(`deleted issue ${id}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`failed to delete issue ${id}: ${error}`);
      return false;
    }
  }
  
  // Business logic method example
  async filterIssues(criteria: FilterCriteria): Promise<Issue[]> {
    const allIssues = await this.database.getAllIssues();
    
    return allIssues.filter(issue => {
      if (criteria.status && !criteria.status.includes(issue.status)) {
        return false;
      }
      
      if (criteria.type && !criteria.type.includes(issue.type)) {
        return false;
      }
      
      if (criteria.severity && !criteria.severity.includes(issue.severity)) {
        return false;
      }
      
      if (criteria.assignee && issue.assignee !== criteria.assignee) {
        return false;
      }
      
      if (criteria.tags && criteria.tags.length > 0) {
        const hasTag = criteria.tags.some(tag => issue.tags.includes(tag));
        if (!hasTag) return false;
      }
      
      return true;
    });
  }
}
```

---

## Key Patterns

### 1. Constructor Injection

```typescript
// GOOD: Dependencies injected via constructor
constructor(private readonly database: IssueDatabase) {}

// BAD: Creating dependencies internally
constructor() {
  this.database = new IssueDatabase(); // Don't do this
}
```

### 2. Validation First

```typescript
async createIssue(input: IssueInput): Promise<Issue> {
  // Validate BEFORE any operations
  if (!this.isValid(input)) {
    throw new ValidationError('invalid input');
  }
  
  // Then delegate to database
  return this.database.createIssue(input);
}
```

### 3. Error Handling

```typescript
try {
  const result = await this.database.operation();
  logger.info('operation succeeded');
  return result;
} catch (error) {
  logger.error(`operation failed: ${error}`);
  throw error; // Re-throw for caller to handle
}
```

### 4. Logging

```typescript
// Log significant events
logger.info(`created issue ${issue.id}`);
logger.info(`updated issue ${id}`);
logger.info(`deleted issue ${id}`);

// Log errors
logger.error(`failed to create issue: ${error}`);
```

---

## Service Checklist

Before finishing, verify:

- [ ] Test file created with failing tests first
- [ ] All tests pass (`npm test`)
- [ ] Coverage > 90% for service
- [ ] No `any` types used
- [ ] Constructor injection for dependencies
- [ ] Input validation on all public methods
- [ ] Errors logged with context
- [ ] TypeScript strict mode passes
- [ ] Uses `.js` extensions in imports (NodeNext)

---

## Example Services from Project

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| IssueService | Issue CRUD, filtering | IssueDatabase |
| SearchService | Full-text search, ranking | IssueDatabase |
| ExportService | JSON/CSV/Markdown export | IssueDatabase |
| ChangelogService | Changelog generation | IssueDatabase |
| TemplateService | Template CRUD | IssueDatabase |

---

## Testing Commands

```bash
# Run service tests only
npx vitest run test/suite/issueService.test.ts

# Watch mode for development
npx vitest test/suite/issueService.test.ts --watch

# Check coverage
npm run test:coverage -- --reporter=text --include="src/services/*"
```
