# Data Model Specification - BonfiSoft Development Tracker

> **Schema Version**: 1.0.0  
> **Last Updated**: 2026-05-05

---

## Entity Relationship Diagram

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Project   │────<│   Issue     │>────│   Sprint    │
│  (implicit) │     │             │     │             │
└─────────────┘     │  - type     │     │  - name     │
                    │  - severity │     │  - dates    │
┌─────────────┐     │  - status   │     │  - status   │
│  Milestone  │<────│  - links    │     └─────────────┘
│             │     │  - timeLogs │
│  - name     │     └─────────────┘
│  - dueDate  │            │
└─────────────┘            │
                           v
                    ┌─────────────┐
                    │  CodeLink   │
                    │             │
                    │  - filePath │
                    │  - lineRange│
                    └─────────────┘
```

---

## Core Types

### Enums

```typescript
// IssueType.ts
enum IssueType {
  Bug = 'bug',
  Enhancement = 'enhancement',
  Feature = 'feature',
  Task = 'task',
  Question = 'question',
  Documentation = 'documentation',
  Other = 'other'
}

// Severity.ts
enum Severity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Trivial = 'trivial'
}

// Urgency.ts
enum Urgency {
  Immediate = 'immediate',
  High = 'high',
  Normal = 'normal',
  Low = 'low',
  Whenever = 'whenever'
}

// Status.ts
enum Status {
  Open = 'open',
  InProgress = 'in_progress',
  InReview = 'in_review',
  OnHold = 'on_hold',
  Closed = 'closed',
  Resolved = 'resolved',
  WontFix = 'wont_fix'
}

// SprintStatus.ts
enum SprintStatus {
  Planned = 'planned',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

// RelationType.ts
enum RelationType {
  Blocks = 'blocks',
  BlockedBy = 'blocked_by',
  Duplicates = 'duplicates',
  RelatedTo = 'related_to',
  ParentOf = 'parent_of',
  ChildOf = 'child_of',
  Clones = 'clones'
}
```

---

## Entities

### Issue (Core Entity)

```typescript
interface Issue {
  // Identification
  id: string;                    // UUID v4, immutable
  
  // Required Fields
  title: string;                   // Max 200 chars, required
  description: string;             // Markdown supported, max 10000 chars
  type: IssueType;                 // Enum, default: Bug
  severity: Severity;              // Enum, default: Medium
  urgency: Urgency;                // Enum, default: Normal
  status: Status;                  // Enum, default: Open
  
  // People
  reporter: string;                // Username, defaults to git user or setting
  assignee: string | null;         // Username, nullable
  
  // Timestamps
  createdAt: string;               // ISO 8601 format
  updatedAt: string;               // ISO 8601, auto-updated on change
  
  // Version Tracking
  reportedInVersion: string | null;  // Git tag when created
  fixedInVersion: string | null;     // Git tag when resolved
  
  // Organization
  tags: string[];                  // Free-form labels, max 20 per issue
  milestoneId: string | null;      // Reference to milestone
  sprintId: string | null;         // Reference to sprint
  
  // Relationships
  relations: IssueRelation[];      // Links to other issues
  
  // Code Context
  codeLinks: CodeLink[];           // File/line references
  
  // Activity
  comments: Comment[];             // Discussion thread
  timeLogs: TimeLog[];             // Hours logged
}
```

**Field Specifications:**

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | UUID | Yes | Auto-generated | RFC 4122 v4 |
| title | string | Yes | - | 1-200 chars, trimmed |
| description | string | No | "" | Max 10000 chars |
| type | IssueType | Yes | bug | One of 7 enum values |
| severity | Severity | Yes | medium | One of 5 enum values |
| urgency | Urgency | Yes | normal | One of 5 enum values |
| status | Status | Yes | open | One of 7 enum values |
| reporter | string | Yes | git user | 1-100 chars |
| assignee | string\|null | No | null | 1-100 chars or null |
| createdAt | ISO8601 | Yes | now() | Auto-generated |
| updatedAt | ISO8601 | Yes | now() | Auto-updated |
| reportedInVersion | string\|null | No | null | Git tag or null |
| fixedInVersion | string\|null | No | null | Git tag or null |
| tags | string[] | Yes | [] | Max 20 items, unique |
| milestoneId | UUID\|null | No | null | References milestone |
| sprintId | UUID\|null | No | null | References sprint |
| relations | IssueRelation[] | Yes | [] | Max 50 relations |
| codeLinks | CodeLink[] | Yes | [] | Max 100 links |
| comments | Comment[] | Yes | [] | Unlimited |
| timeLogs | TimeLog[] | Yes | [] | Unlimited |

---

### Milestone

```typescript
interface Milestone {
  id: string;                      // UUID v4
  name: string;                    // Required, unique within project
  description: string;             // Optional markdown
  dueDate: string | null;          // ISO 8601 date (no time), optional
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

**Constraints:**

- Name must be unique within project
- Cannot delete milestone with assigned issues
- Due date is date-only (YYYY-MM-DD format)

---

### Sprint

```typescript
interface Sprint {
  id: string;                      // UUID v4
  name: string;                    // Required, unique within project
  goal: string;                    // Optional sprint goal/description
  startDate: string;               // ISO 8601 date
  endDate: string;                 // ISO 8601 date
  status: SprintStatus;            // Enum, default: Planned
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

**Constraints:**

- Only one sprint can be `active` at a time per workspace
- End date must be >= start date
- Name must be unique within project

---

### CodeLink

```typescript
interface CodeLink {
  id: string;                      // UUID v4
  filePath: string;                // Relative path from workspace root
  lineStart: number;               // 1-based line number
  lineEnd: number;                 // 1-based, >= lineStart
  context: string;                 // Snippet of code at location (optional)
  createdAt: string;               // ISO 8601
}
```

**Constraints:**

- File path is relative to workspace root
- Line numbers are 1-based (matching VS Code UI)
- Context is auto-captured snippet (max 200 chars)

---

### Comment

```typescript
interface Comment {
  id: string;                      // UUID v4
  author: string;                  // Username
  body: string;                    // Markdown content
  createdAt: string;               // ISO 8601
  updatedAt: string | null;        // Set if edited
}
```

**Constraints:**

- Body required, max 5000 chars
- Supports full markdown rendering

---

### TimeLog

```typescript
interface TimeLog {
  id: string;                      // UUID v4
  hours: number;                   // Decimal hours (e.g., 1.5)
  comment: string;                 // Optional description
  loggedAt: string;                // ISO 8601
  loggedBy: string;                // Username
}
```

**Constraints:**

- Hours: 0.01 - 999.99, max 2 decimal places
- Comment optional, max 500 chars

---

### IssueRelation

```typescript
interface IssueRelation {
  id: string;                      // UUID v4
  targetIssueId: string;           // UUID of related issue
  type: RelationType;              // Enum
  createdAt: string;               // ISO 8601
}
```

**Constraints:**

- Cannot relate issue to itself
- Bidirectional relations auto-created (e.g., blocks ↔ blocked-by)
- Duplicate relations prevented

---

### Template

```typescript
interface Template {
  id: string;                      // UUID v4
  name: string;                    // User-defined name
  description: string;             // Template description
  defaultValues: {                 // Pre-filled issue fields
    type?: IssueType;
    severity?: Severity;
    urgency?: Urgency;
    description?: string;
    tags?: string[];
  };
  isBuiltIn: boolean;              // True for shipped templates
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

**Built-in Templates:**

1. **Bug**: type=bug, severity=high, description=Bug report template
2. **Feature**: type=feature, severity=medium, description=Feature request template
3. **Task**: type=task, severity=low, description=Task template

---

## Storage Format

### JSON Schema

```typescript
interface IssuesDatabase {
  schemaVersion: string;           // "1.0.0"
  project: {
    name: string;                  // Workspace folder name
    createdAt: string;             // First issue creation date
  };
  issues: Issue[];
  milestones: Milestone[];
  sprints: Sprint[];
  templates: Template[];
  metadata: {
    lastExportAt: string | null;
    issueCounter: number;          // For display IDs (optional)
  };
}
```

### File Structure (Workspace Storage)

```text
.vscode/
└── issues/
    ├── issues.json          # Main database file
    ├── backup/
    │   ├── issues-2026-01-15.json
    │   └── issues-2026-01-08.json
    └── templates/
        └── custom-templates.json
```

### File Structure (Global Storage)

```text
~/.config/Code/User/globalStorage/bonfisoft.development.tracker/
└── <workspace-hash>/
    └── issues.json
```

---

## TypeScript Interfaces Summary

```typescript
// src/types/issue.ts

export type UUID = string;

export interface Issue {
  id: UUID;
  title: string;
  description: string;
  type: IssueType;
  severity: Severity;
  urgency: Urgency;
  status: Status;
  reporter: string;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  reportedInVersion: string | null;
  fixedInVersion: string | null;
  tags: string[];
  milestoneId: UUID | null;
  sprintId: UUID | null;
  relations: IssueRelation[];
  codeLinks: CodeLink[];
  comments: Comment[];
  timeLogs: TimeLog[];
}

export interface CodeLink {
  id: UUID;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  context: string;
  createdAt: string;
}

export interface Comment {
  id: UUID;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface TimeLog {
  id: UUID;
  hours: number;
  comment: string;
  loggedAt: string;
  loggedBy: string;
}

export interface IssueRelation {
  id: UUID;
  targetIssueId: UUID;
  type: RelationType;
  createdAt: string;
}

export interface Milestone {
  id: UUID;
  name: string;
  description: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: UUID;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: UUID;
  name: string;
  description: string;
  defaultValues: TemplateDefaults;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDefaults {
  type?: IssueType;
  severity?: Severity;
  urgency?: Urgency;
  description?: string;
  tags?: string[];
}
```

---

## Validation Rules

### Issue Validation

| Rule | Error Message |
|------|---------------|
| Title required | "title is required" |
| Title max length | "title must not exceed 200 characters" |
| Description max length | "description must not exceed 10000 characters" |
| Valid type | "type must be a valid IssueType" |
| Valid severity | "severity must be a valid Severity" |
| Valid urgency | "urgency must be a valid Urgency" |
| Valid status | "status must be a valid Status" |
| Tags max count | "issue cannot have more than 20 tags" |
| Tags unique | "duplicate tags are not allowed" |

### Storage Validation

| Rule | Action |
|------|--------|
| Schema version mismatch | Attempt migration or show error |
| Corrupted JSON | Offer to restore from backup |
| Missing required fields | Skip invalid records, log warnings |
| Unknown enum values | Revert to default for that enum |

---

## Migration Notes

### Schema Version 1.0.0

- Initial release
- All entities as specified above

### Future Migrations (Reserved)

- 1.1.0: Add custom fields support
- 1.2.0: Add workflow rules
- 2.0.0: Breaking changes (if ever needed)
