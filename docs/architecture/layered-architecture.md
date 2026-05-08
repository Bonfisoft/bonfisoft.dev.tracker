# Layered Architecture - BonfiSoft Development Tracker

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         VS CODE API                                  │
│   (Commands, TreeViews, Webviews, StatusBar, CodeLens, etc.)        │
├─────────────────────────────────────────────────────────────────────┤
│                         PRESENTATION LAYER                            │
│  src/commands/        - Command handlers (thin adapters)              │
│  src/providers/       - Tree providers, CodeLens, Decorations         │
│  src/panels/          - Webview panels                                │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                                 │
│  src/services/        - Business logic, validation, calculations      │
│    ├─ IssueService.ts - Issue CRUD operations                       │
│    ├─ SearchService.ts - Full-text search & ranking                   │
│    ├─ ExportService.ts - Export/import operations                    │
│    ├─ ChangelogService.ts - Changelog generation                    │
│    └─ TemplateService.ts - Template management                      │
├─────────────────────────────────────────────────────────────────────┤
│                         DATABASE LAYER                                │
│  src/database/        - Data access abstraction                       │
│    └─ IssueDatabase.ts - In-memory cache + storage I/O               │
├─────────────────────────────────────────────────────────────────────┤
│                         INFRASTRUCTURE LAYER                          │
│  src/storage/         - Storage providers (Workspace, Global)         │
│  src/version/         - Version providers (Git, etc.)                │
│  src/utils/           - Utilities (logger, idGenerator, helpers)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Presentation Layer (Commands, Providers, Panels)

**Purpose**: User interface adapters

**Contains**:

- Command handlers that parse user input
- Tree providers for sidebar views
- CodeLens providers for inline annotations
- Decoration providers for gutter icons
- Panel classes for webviews

**Rules**:

- Must be thin - delegate to services immediately
- Can use VS Code APIs directly
- Handle UI state only
- No business logic

**Example**:

```typescript
// GOOD: Command is thin
async function createIssueHandler() {
  const input = await getUserInput(); // UI interaction
  await issueService.createIssue(input); // Delegate to service
}

// BAD: Command contains business logic
async function createIssueHandler() {
  const issue = {
    id: generateUUID(), // Logic should be in service
    createdAt: new Date().toISOString(),
    // ... more logic
  };
  await database.save(issue); // Direct storage access
}
```

---

### 2. Service Layer

**Purpose**: Business logic, validation, calculations

**Contains**:

- IssueService: CRUD operations, filtering
- SearchService: Full-text search, ranking algorithms
- ExportService: Format conversions (JSON, CSV, Markdown)
- ChangelogService: Changelog generation logic
- TemplateService: Template CRUD and defaults

**Rules**:

- Contains all business logic
- Validates inputs
- Performs calculations and aggregations
- Delegates persistence to Database layer
- No direct storage access

**Example**:

```typescript
// GOOD: Service validates and delegates
class IssueService {
  async createIssue(input: IssueInput): Promise<Issue> {
    // Validation (business rule)
    if (!input.title || input.title.length > 200) {
      throw new Error('Invalid title');
    }
    
    // Delegate to database
    return this.database.createIssue({
      ...input,
      id: generateUUID(),
      createdAt: now()
    });
  }
}
```

---

### 3. Database Layer

**Purpose**: Data access coordination, caching, events

**Contains**:

- IssueDatabase: Central data coordinator

**Responsibilities**:

- In-memory cache of all data
- Coordinates reads/writes to storage
- Emits change events for UI updates
- Handles data consistency

**Rules**:

- Single source of truth
- Caches all data in memory
- Broadcasts events on changes
- No business logic

**Example**:

```typescript
class IssuesDatabase {
  private issueCache: Map<string, Issue> = new Map();
  private manifest: Manifest | null = null;

  async initialize(): Promise<void> {
    this.manifest = JSON.parse(await this.storage.readManifest() ?? '{}');
    const ids = await this.storage.listFiles('issues');
    for (const id of ids) {
      const content = await this.storage.readFile('issues', id);
      if (content) this.issueCache.set(id, JSON.parse(content));
    }
  }

  async createIssue(data: IssueInput): Promise<Issue> {
    const issue = { ...data, id: generateUUID() };
    await this.storage.writeFile('issues', issue.id, JSON.stringify(issue)); // one file
    this.issueCache.set(issue.id, issue);                                    // update cache
    this.manifest!.metadata.issueCounter++;
    await this.storage.writeManifest(JSON.stringify(this.manifest));          // update counter
    this._emitter.emit('change');
    return issue;
  }
}
```

Key invariant: **reads always serve from the in-memory cache** — no disk I/O on queries.

---

### 4. Infrastructure Layer (Storage, Version, Utils)

**Purpose**: External system adapters and utilities

**Contains**:

- Storage providers: IStorageProvider, WorkspaceStorageProvider, GlobalStorageProvider
- Version providers: IVersionProvider, GitVersionProvider
- Utilities: Logger, ID generator, Date helpers

**Rules**:

- Abstract external dependencies
- Swappable implementations
- No business logic
- Pure technical concerns

---

## Dependency Flow

```text
Commands ──┐
           ├──┐
Providers ─┘  │
              ├──┐
Panels ───────┘  │
                 │
              Service ── Database ── Storage
                            │
                         Version
```

**Dependency Rule**: A layer can only depend on the layer directly below it.

---

## Interface Definitions

### IStorageProvider

```typescript
// src/storage/IStorageProvider.ts

export interface IStorageProvider {
  // Manifest (db.json)
  readManifest(): Promise<string | null>;
  writeManifest(content: string): Promise<void>;

  // Per-entity files (e.g. collection='issues', id='<uuid>')
  listFiles(collection: string): Promise<string[]>;
  readFile(collection: string, id: string): Promise<string | null>;
  writeFile(collection: string, id: string, content: string): Promise<void>;
  deleteFile(collection: string, id: string): Promise<void>;
}
```

Each `collection` maps to a sub-folder (`issues/`, `milestones/`, etc.).
Atomicity is preserved via a write-to-temp + rename pattern per file.

### IVersionProvider

```typescript
// src/version/IVersionProvider.ts

export interface IVersionProvider {
  getCurrentVersion(): Promise<string | null>;
  getAllVersions(): Promise<string[]>;
  isAvailable(): boolean;
}
```

---

## Event System

All UI updates are event-driven:

```text
Database (onChange) 
    ↓
Service (optional transform)
    ↓
Provider/Panel (refresh)
    ↓
UI updates
```

**Benefits**:

- No polling
- Real-time updates
- Decoupled components
- Easy to test

---

## Testing Strategy by Layer

| Layer | Test Type | Mock Strategy |
|-------|-----------|---------------|
| Commands | Unit + E2E | Mock VS Code API |
| Providers | Unit | Mock Database |
| Panels | E2E | Full integration |
| Services | Unit | Mock Database |
| Database | Unit + Integration | Mock Storage |
| Storage | Integration | Real temp files |

---

## File Organization

```text
src/
├── constants.ts              # All string constants
├── extension.ts              # Entry point, wiring
├── types/
│   ├── issue.ts              # Issue interfaces, enums
│   └── index.ts              # Barrel export
├── utils/
│   ├── idGenerator.ts        # UUID, timestamps
│   ├── logger.ts             # Structured logging
│   └── helpers.ts            # Pure functions
├── storage/
│   ├── IStorageProvider.ts   # Interface
│   ├── WorkspaceStorageProvider.ts
│   ├── GlobalStorageProvider.ts
│   └── StorageProviderFactory.ts
├── version/
│   ├── IVersionProvider.ts   # Interface
│   ├── GitVersionProvider.ts
│   └── VersionProviderFactory.ts
├── database/
│   └── IssueDatabase.ts      # Main data coordinator
├── services/
│   ├── IssueService.ts
│   ├── SearchService.ts
│   ├── ExportService.ts
│   ├── ChangelogService.ts
│   └── TemplateService.ts
├── providers/
│   ├── IssueTreeProvider.ts
│   ├── MilestoneTreeProvider.ts
│   ├── SprintTreeProvider.ts
│   ├── TimeTrackingProvider.ts
│   ├── IssueCodeLensProvider.ts
│   ├── IssueDecorationProvider.ts
│   └── StatusBarProvider.ts
├── panels/
│   ├── IssueDetailPanel.ts
│   └── DashboardPanel.ts
└── commands/
    ├── issueCommands.ts
    ├── milestoneCommands.ts
    └── exportCommands.ts
```

---

## Key Design Principles

### 1. Dependency Inversion

```typescript
// GOOD: Depend on abstractions
constructor(
  private readonly database: IssueDatabase,
  private readonly storage: IStorageProvider
) {}

// BAD: Depend on concrete implementations
constructor() {
  this.database = new IssueDatabase();
  this.storage = new WorkspaceStorageProvider();
}
```

### 2. Single Responsibility

- Service: Business logic only
- Database: Data coordination only
- Provider: UI presentation only
- Command: Input handling only

### 3. Open/Closed

Extend via:

- New storage providers implementing IStorageProvider
- New version providers implementing IVersionProvider
- New commands using existing services

### 4. Interface Segregation

Small, focused interfaces:

- IStorageProvider (6 methods — manifest + per-entity file operations)
- IVersionProvider (3 methods)

Not large "god" interfaces.

---

## Common Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|----------------|
| Layer bypass | Breaks architecture | Always go through proper layer |
| God class | Unmaintainable | Split into focused classes |
| Direct fs access | Breaks remote support | Use vscode.workspace.fs |
| console.log | No log levels | Use logger utility |
| Any type | Loses type safety | Define proper interfaces |
| Synchronous I/O | Blocks extension host | Always use async |
| Service knows about UI | Wrong direction | Commands handle UI, services handle logic |

---

## Extension Startup Flow

```text
extension.activate()
    ↓
StorageProviderFactory.create()
    ↓
VersionProviderFactory.create()
    ↓
IssueDatabase(storage)
    ↓
Services(database)
    ↓
Providers(services)
    ↓
Commands(context, services)
    ↓
Register all disposables
```

---

## Memory Management

All disposable resources must be tracked:
  
```typescript
export function activate(context: ExtensionContext) {
  // Every created disposable goes to context.subscriptions
  
  const database = new IssueDatabase(storage);
  context.subscriptions.push(database);
  
  const service = new IssueService(database);
  
  const provider = new IssueTreeProvider(database);
  context.subscriptions.push(provider);
  
  context.subscriptions.push(
    commands.registerCommand(...)
  );
}
```

---

## Cross-Platform Compatibility

| Concern | Solution |
|---------|----------|
| File paths | Use `path.join()` and `vscode.Uri` |
| Line endings | Let VS Code handle normalization |
| FS operations | Use `vscode.workspace.fs` only |
| OS detection | Avoid OS-specific code |

---

## Performance Guidelines

1. **Lazy loading**: Load data only when needed
2. **Caching**: Database keeps data in memory
3. **Event-driven**: No polling for updates
4. **Debouncing**: Batch rapid changes
5. **Streaming**: Large exports in chunks

---

## Security Considerations

1. **No shell execution**: Use VS Code APIs
2. **No eval()**: Never execute dynamic code
3. **HTML escaping**: All webview content escaped
4. **CSP headers**: All webviews have CSP
5. **Input validation**: All user input validated
6. **No secrets**: Don't store credentials
