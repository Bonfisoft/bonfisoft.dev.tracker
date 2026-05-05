# AI Agent Component Development Workflow

> **Purpose**: This document provides the master workflow for AI agents implementing features for the BonfiSoft Development Tracker VS Code extension.

---

## Prerequisites (READ FIRST)

Before implementing ANY component, you MUST read:

1. **Data Model** (`docs/requirements/data-model.md`) - Understand entities and interfaces
2. **Architecture** (`docs/architecture/layered-architecture.md`) - Understand layer responsibilities
3. **Test Strategy** (`docs/testing/test-strategy.md`) - Understand testing requirements
4. **Relevant Requirement Document** - The specific feature you're implementing

---

## Workflow Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: READ & ANALYZE (Always Required)                  │
│  ├── Read data-model.md (types/interfaces)                 │
│  ├── Read requirement document for feature                  │
│  └── Identify dependencies on other components              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: TEST DESIGN (TDD - Test First)                    │
│  ├── Create test file following test-strategy.md          │
│  ├── Write failing tests for ALL requirements               │
│  └── Include edge cases and error conditions                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: IMPLEMENTATION                                    │
│  ├── Create component following template guide              │
│  ├── Follow strict TypeScript (no any types)                │
│  ├── Implement to make tests pass                           │
│  └── Handle all error conditions                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: VERIFICATION                                      │
│  ├── Run tests: npm test                                    │
│  ├── Verify coverage > 80% for new code                   │
│  ├── Check for type errors                                  │
│  └── Verify no console.log (use logger)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 5: INTEGRATION                                       │
│  ├── Register in extension.ts (if applicable)               │
│  ├── Update exports in index files                          │
│  └── Verify imports use .js extensions (NodeNext)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Selection Matrix

Based on the requirement you're implementing, use the appropriate template:

| Component Type | Template File | Use When |
|----------------|---------------|----------|
| **Service** | `service-template.md` | Business logic, CRUD operations, calculations |
| **Provider** | `provider-template.md` | Tree views, CodeLens, Decorations, StatusBar |
| **Command** | `command-template.md` | Command palette actions, user-initiated workflows |
| **Panel** | `panel-template.md` | Webview panels, detail views, dashboards |
| **Storage** | `storage-template.md` | Storage backends, persistence layers |

---

## Phase 1: Read & Analyze

### Step 1.1: Identify Required Types

From `data-model.md`, list the interfaces your component will use:

```typescript
// Example checklist for IssueService:
✓ Issue interface
✓ IssueType enum
✓ Severity enum
✓ Urgency enum
✓ Status enum
✓ CodeLink interface (if linking supported)
✓ IssueRelation interface (if relations supported)
```

### Step 1.2: Identify Dependencies

Map dependencies on other components:

```text
MyComponent
├── Depends on: IssueDatabase
├── Depends on: IStorageProvider (via database)
├── Uses: Logger utility
└── May emit events to: IssueTreeProvider
```

### Step 1.3: Check Existing Code

Search for similar implementations:

```bash
# Find similar services
find src/services -name "*.ts"

# Find similar tests
grep -r "createIssue" test/
```

---

## Phase 2: Test Design (TDD)

### Step 2.1: Create Test File

Location: `test/suite/<ComponentName>.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Template for test structure
describe('<ComponentName>', () => {
  describe('constructor', () => {
    it('should initialize with valid dependencies');
    it('should throw when required dependencies missing');
  });
  
  describe('create<Feature>', () => {
    it('should create with required fields');
    it('should generate UUID automatically');
    it('should set timestamps automatically');
    it('should validate input fields');
    it('should persist to storage');
    it('should emit change event');
  });
  
  describe('get<Feature>', () => {
    it('should return entity by ID');
    it('should return null when not found');
    it('should throw on invalid ID format');
  });
  
  describe('update<Feature>', () => {
    it('should update specified fields');
    it('should update timestamp');
    it('should validate new values');
    it('should persist changes');
    it('should emit change event');
  });
  
  describe('delete<Feature>', () => {
    it('should remove entity');
    it('should return false when not found');
    it('should emit change event');
  });
  
  describe('error handling', () => {
    it('should handle storage errors gracefully');
    it('should log errors appropriately');
  });
});
```

### Step 2.2: Write Failing Tests

For each test case, write the test BEFORE implementation:

```typescript
it('should create issue with UUID', async () => {
  // Arrange
  const input = { title: 'Test', type: 'bug', severity: 'high', urgency: 'normal' };
  
  // Act
  const result = await service.createIssue(input);
  
  // Assert
  expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
```

---

## Phase 3: Implementation

### Step 3.1: Select Template

Based on component type, follow the appropriate template:

- Service → `service-template.md`
- Provider → `provider-template.md`
- Command → `command-template.md`
- Panel → `panel-template.md`

### Step 3.2: Implement Minimum Code

Write just enough code to make tests pass:

```typescript
// Don't over-engineer
// Don't add features not in tests
// Don't add premature abstractions
```

### Step 3.3: Handle Edge Cases

Ensure all error paths are covered:

```typescript
// Example: Input validation
if (!input.title || input.title.trim().length === 0) {
  throw new ValidationError('title is required');
}

if (input.title.length > 200) {
  throw new ValidationError('title must not exceed 200 characters');
}
```

---

## Phase 4: Verification

### Step 4.1: Run Tests

```bash
# Run specific test file
npx vitest run test/suite/myComponent.test.ts

# Run all tests
npm test

# Coverage check
npm run test:coverage
```

### Step 4.2: Quality Checks

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Check for any types
grep -r "any" src/your-component.ts || echo "No 'any' types found"

# Check for console.log
grep -r "console.log" src/ || echo "No console.log found"
```

### Step 4.3: Review Coverage

Coverage requirements per component type:

| Component | Minimum Coverage |
|-----------|------------------|
| Service | 90% |
| Provider | 80% |
| Command | 70% |
| Panel | 60% (E2E supplements) |
| Storage | 85% |

---

## Phase 5: Integration

### Step 5.1: Wire in extension.ts

```typescript
// Add to context.subscriptions
const myService = new MyService(database);
context.subscriptions.push(
  vscode.commands.registerCommand(
    COMMANDS.MY_COMMAND,
    () => myCommandHandler(myService)
  )
);
```

### Step 5.2: Export Public API

```typescript
// src/services/index.ts (if exists)
export { MyService } from './MyService.js';
```

### Step 5.3: Update Constants (if new commands)

```typescript
// src/constants.ts
export const COMMANDS = {
  // ... existing
  MY_COMMAND: 'bonfisoft-issues.myCommand'
} as const;
```

---

## Common Pitfalls to Avoid

| Pitfall | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Using `any` type | Breaks type safety | Use proper interfaces, `unknown` if necessary |
| Direct `fs` usage | Breaks in remote environments | Use `vscode.workspace.fs` |
| console.log | No log level control | Use logger utility |
| Skipping tests | Regression risk | TDD - tests first |
| Floating disposables | Memory leaks | Always push to context.subscriptions |
| Synchronous file I/O | Blocks extension host | Always use async/await |
| Bypassing abstractions | Architecture violation | Always use interfaces |
| Hard-coded paths | Windows/Linux incompatibility | Use `path.join` or path manipulation |

---

## Template Quick Reference

### Service Template Checklist

- [ ] Constructor injection of dependencies
- [ ] CRUD methods with validation
- [ ] Event emission on changes
- [ ] Error handling with logger
- [ ] 90%+ test coverage

### Provider Template Checklist

- [ ] Implements VS Code provider interface
- [ ] Event-driven refresh
- [ ] Proper tree item creation
- [ ] Command registration
- [ ] 80%+ test coverage

### Command Template Checklist

- [ ] Thin command handler
- [ ] Delegates to service
- [ ] User input validation
- [ ] Error notifications
- [ ] 70%+ test coverage

### Panel Template Checklist

- [ ] Singleton pattern
- [ ] Webview HTML generation
- [ ] Message passing protocol
- [ ] Resource disposal
- [ ] E2E tests for critical flows

---

## Verification Commands Summary

```bash
# After implementing ANY component, run:
npm test                    # All unit tests
npx tsc --noEmit            # Type checking
npm run lint                # Linting
grep -r "any" src/          # Check for forbidden types
grep -r "console.log" src/  # Check for forbidden logging
```

---

## Example: Implementing IssueService

```bash
# 1. Read requirements
cat docs/requirements/functional-requirements.md | grep -A5 "1.5 Issue Fields"

# 2. Create test file
cat > test/suite/issueService.test.ts << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { IssueService } from '../../src/services/IssueService.js';
// ... tests
EOF

# 3. Implement service
cat > src/services/IssueService.ts << 'EOF'
import type { IssueDatabase } from '../database/IssueDatabase.js';
// ... implementation following service-template.md
EOF

# 4. Run tests
npx vitest run test/suite/issueService.test.ts

# 5. Verify
npm run test:coverage
npx tsc --noEmit
```

---

**Remember**:

- **Tests first, implementation second**
- **Strict TypeScript, no `any`**
- **Follow templates exactly**
- **Run verification commands before finishing**
