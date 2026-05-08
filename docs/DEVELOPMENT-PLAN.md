# Master Development Plan - BonfiSoft Development Tracker

> **Project**: VS Code Extension - Project-local issue tracking  
> **Approach**: Test-Driven Development (TDD) - Services First, UI Second  
> **Lesson Applied**: Previous project failed because issues couldn't be edited; this time we start with solid foundations

---

## Executive Summary

This plan delivers an MVP extension in **4 phases** (~90 hours), followed by **4 enhancement phases** (~80 hours). Total: ~170 hours.

**Critical Success Factor**: Issue edit capability (Story 1.3) is MVP priority #1 - the primary lesson from the previous Vetspresso project.

---

## Phase Overview

| Phase | Name | Focus | Stories | Est. Hours | Priority |
|-------|------|-------|---------|------------|----------|
| 1 | Foundation | Types, Storage, Database | 6 | ~20h | 🟢 MVP |
| 2 | Core Services | Business logic, Search, Export | 5 | ~25h | 🟢 MVP |
| 3 | Basic UI | Tree view, Commands, Detail Panel | 5 | ~35h | 🟢 MVP |
| 4 | Integration | Git, Code Linking, StatusBar | 4 | ~20h | 🟢 MVP |
| 5 | Milestones | Milestone/Sprint support | 4 | ~20h | 🟡 High |
| 6 | Time & Templates | Time tracking, templates | 3 | ~18h | 🔵 Medium |
| 7 | Dashboard | Analytics view | 1 | ~12h | 🔵 Medium |
| 8 | Polish | Export formats, docs | 3 | ~18h | 🔵 Medium |

---

## Phase 1: Foundation (Week 1-2)

**Goal**: Data layer capable of CRUD operations with persistence

### 1.1 Core Types (Day 1)

**Files to Create:**

- `src/types/issue.ts` - All interfaces and enums
- `src/types/index.ts` - Barrel exports

**Requirements:**

- `docs/requirements/data-model.md` - All interfaces
- Story 1.1 - Create Issue types

**Tests:** `test/suite/types.test.ts`

**Acceptance Criteria:**

- [ ] All 7 issue type enums defined
- [ ] All 5 severity levels defined
- [ ] All 5 urgency levels defined
- [ ] All 7 status values defined
- [ ] Issue interface with all fields
- [ ] Supporting interfaces (CodeLink, Comment, TimeLog, etc.)

---

### 1.2 Storage Abstraction (Day 2-3) ✅ COMPLETE

**Files Created:**

- `src/storage/IStorageProvider.ts` - Interface
- `src/storage/WorkspaceStorageProvider.ts` - Workspace implementation
- `src/storage/GlobalStorageProvider.ts` - Global implementation _(future)_
- `src/storage/StorageProviderFactory.ts` - Factory _(future)_

**Requirements:**

- `docs/requirements/non-functional-requirements.md` - Storage requirements

**Tests:** `test/suite/storageProvider.test.ts` — 24 contract tests (run against both `WorkspaceStorageProvider` and `InMemoryStorageProvider`)

**Acceptance Criteria:**

- [x] Interface: `readManifest`, `writeManifest`, `listFiles`, `readFile`, `writeFile`, `deleteFile`
- [x] `WorkspaceStorageProvider`: manifest at `.vscode/issues/db.json`; issues at `.vscode/issues/issues/<uuid>.json`
- [x] Atomic writes (temp + rename) for every file
- [ ] `GlobalStorageProvider` — Phase 4 / Story 4.2
- [ ] Factory selects based on configuration — Phase 4

**Architecture note (2026-05-08):** Changed from single-file `issues.json` to per-issue files.
See `docs/requirements/data-model.md` § Storage Format for the full layout.

---

### 1.3 Database Layer (Day 4-6)

**Files to Create:**

- `src/database/IssueDatabase.ts` - Main data coordinator

**Requirements:**

- `docs/requirements/functional-requirements.md` - Core CRUD
- `docs/architecture/layered-architecture.md` - Database layer

**Tests:** `test/suite/issueDatabase.test.ts`

**Acceptance Criteria:**

- [ ] In-memory cache of all issues
- [ ] CRUD operations with events
- [ ] Event emitter for `onDidChangeIssues`
- [ ] Auto-load on initialization
- [ ] Auto-save on changes
- [ ] JSON serialization/deserialization

**Event System:**

```typescript
onDidChangeIssues(callback: (issues: Issue[]) => void): Disposable
onDidChangeMilestones(callback: (milestones: Milestone[]) => void): Disposable
```

---

### 1.4 ID Generator & Utilities (Day 7)

**Files to Create:**

- `src/utils/idGenerator.ts` - UUID v4, timestamps
- `src/utils/logger.ts` - Structured logging
- `src/utils/helpers.ts` - Pure helper functions

**Tests:** `test/suite/helpers.test.ts`, `test/suite/logger.test.ts`

---

### Phase 1 Verification

```bash
npm test                    # All tests pass
npm run test:coverage       # >80% coverage
npx tsc --noEmit           # No type errors
```

---

## Phase 2: Core Services (Week 3-4)

**Goal**: Business logic layer with search, export, validation

### 2.1 IssueService (Day 8-11)

**Files to Create:**

- `src/services/IssueService.ts`

**Requirements:**

- `docs/requirements/functional-requirements.md` - 1.x sections
- `docs/user-stories/user-stories.md` - Stories 1.1-1.5

**Tests:** `test/suite/issueService.test.ts` (~20 test cases)

**Acceptance Criteria:**

- [ ] `createIssue()` with validation
- [ ] `getIssue()` by ID
- [ ] `updateIssue()` - **CRITICAL MVP FEATURE**
- [ ] `deleteIssue()` with confirmation
- [ ] `filterIssues()` by criteria
- [ ] `searchIssues()` full-text search
- [ ] All validation rules enforced

**Template:** `docs/ai-agent-templates/service-template.md`

---

### 2.2 SearchService (Day 12-13)

**Files to Create:**

- `src/services/SearchService.ts`

**Requirements:**

- Story 3.1 - Search Issues

**Acceptance Criteria:**

- [ ] Search across title, description, tags, comments
- [ ] Ranked results (title = 3x, tags = 2x, description = 1x)
- [ ] QuickPick-compatible result format

---

### 2.3 ExportService (Day 14-16)

**Files to Create:**

- `src/services/ExportService.ts`

**Requirements:**

- Story UC-013 - Export Issues
- Story UC-014 - Import Issues

**Acceptance Criteria:**

- [ ] JSON export (full, re-importable)
- [ ] JSON import with validation
- [ ] UUID deduplication on import
- [ ] Import report (imported vs skipped)

---

### Phase 2 Verification

- IssueService tests all passing
- Search ranking algorithm verified
- Round-trip export/import tested

---

## Phase 3: Basic UI (Week 5-7)

**Goal**: User interface for create, view, **edit**, delete

### 3.1 IssueTreeProvider (Day 17-19) ✅ COMPLETE

**Files Created:**

- `src/providers/IssueTreeProvider.ts` ✅
- `src/constants.ts` (COMMANDS, VIEWS, VIEW_CONTAINERS) ✅
- `resources/issues.svg` (activity bar icon) ✅

**Requirements:**

- Story 3.3 - Group Issues in Tree
- SIDEBAR-001 through SIDEBAR-005

**Acceptance Criteria:**

- [x] Tree view registered as `bonfisoftIssues`
- [x] Group by status (default)
- [x] Click triggers VIEW_ISSUE command (opens detail panel - Phase 3.3)
- [x] Context menu on right-click (view, edit, delete)
- [x] Toolbar buttons (+ create, refresh)
- [x] Auto-refresh on database events

**Also completed:**

- `package.json` contributions: `viewsContainers`, `views`, `commands`, `menus`, `keybindings`
- `IssuesDatabase.onDidChangeIssues()` event system added
- `extension.ts` wired up: storage → database → tree provider + 6 commands
- `test/mocks/vscode.ts` extended: `TreeItem`, `TreeItemCollapsibleState`, `ThemeIcon`, `MarkdownString`, `EventEmitter`
- `test/suite/issueTreeProvider.test.ts` - 30 tests, all passing

**Keybindings registered:**

- `Ctrl+Alt+I` — Create Issue
- `Ctrl+Alt+Shift+F` — Search Issues

**Template:** `docs/ai-agent-templates/provider-template.md`

---

### 3.2 Issue Commands (Day 20-23) ✅ COMPLETE

**Files Created:**

- `src/commands/issueCommands.ts` ✅
- ~~`src/constants.ts` (command IDs)~~ — already created in 3.1

**Requirements:**

- CMD-001 through CMD-012
- Stories 1.1-1.5

**Acceptance Criteria:**

- [x] Create Issue wizard (Ctrl+Alt+I) — type → title → severity → urgency
- [x] View Issue command — stub, will open IssueDetailPanel in 3.3
- [x] Edit Issue command — field picker → per-field input/QuickPick
- [x] Close/Resolve/Reopen commands — single-step status transition
- [x] Delete Issue with confirmation modal
- [x] Search Issues (Ctrl+Alt+Shift+F) — live-filter `createQuickPick` backed by `SearchService`
- [x] Filter Issues command — status/severity presets via `IssueService.filterIssues`
- [ ] Link Code to Issue (Ctrl+Alt+L) — Phase 4
- [x] All commands in package.json
- [x] Keybindings registered

**Also completed:**

- `extension.ts` updated: `IssueService` + `SearchService` wired; `registerIssueCommands` replaces all stubs
- `package.json`: close, resolve, reopen, filterIssues commands + menus added
- `test/suite/issueCommands.test.ts` — 30 tests, all passing
- `test/mocks/vscode.ts`: `vi.mock`-compatible (inline factory pattern)

**Template:** `docs/ai-agent-templates/command-template.md`

---

### 3.3 IssueDetailPanel - **CRITICAL** (Day 24-29)

**Files to Create:**

- `src/panels/IssueDetailPanel.ts`

**Requirements:**

- Story 1.3 - Edit Issue (Priority #1)
- WEBVIEW-001 through WEBVIEW-004
- UC-003 - Edit Issue use case

**This is the most critical component** - it must solve the previous project's failure.

**Acceptance Criteria:**

- [x] **Title editable** - click to edit, Enter/Blur to save
- [x] **Description editable** - textarea with save on blur
- [x] **Type dropdown** - select to save
- [x] **Severity dropdown** - select to save
- [x] **Urgency dropdown** - select to save
- [x] **Status dropdown** - select to save
- [x] **Reporter display** - read-only field showing issue reporter
- [x] **Assignee combobox** - text input with datalist autocomplete from users database
- [x] **Users database** - JSON file storing all known users (reporters + assignees)
- [x] **Assignee history** - tracks previous assignees with timestamps when changing
- [x] **Comments** - add/delete with user attribution and timestamps
- [x] All changes update `updatedAt`
- [x] All changes persist to storage
- [x] Auto-refresh when issue changes externally
- [x] Single instance per issue (singleton)
- [x] CSP security on webview (nonce-based)
- [x] HTML escaping on all content (XSS prevention)

**Template:** `docs/ai-agent-templates/panel-template.md`

**E2E Test:** Create issue → Edit title → Verify persistence → Reload → Verify still changed

---

### Phase 3 Verification

- [ ] Create issue end-to-end
- [ ] Edit issue all fields
- [ ] Verify changes persist after reload
- [x] All keyboard shortcuts registered (Ctrl+Alt+I, Ctrl+Alt+Shift+F)
- [x] Sidebar icon visible in activity bar
- [x] Tree view shows issues grouped by status

---

## Phase 4: Integration (Week 8-9)

**Goal**: Git integration, code linking, status bar

### 4.1 GitVersionProvider (Day 30-32)

**Files to Create:**

- `src/version/IVersionProvider.ts`
- `src/version/GitVersionProvider.ts`
- `src/version/VersionProviderFactory.ts`

**Acceptance Criteria:**

- [ ] Get current git tag
- [ ] List all tags
- [ ] Auto-detect if git available

---

### 4.2 Code Linking (Day 33-36)

**Files to Create:**

- `src/providers/IssueCodeLensProvider.ts`
- `src/providers/IssueDecorationProvider.ts`

**Requirements:**

- Stories 2.1-2.3
- UC-004 - Link Code Selection

**Acceptance Criteria:**

- [ ] Ctrl+Alt+L prompts for issue
- [ ] CodeLink stored with file path and line range
- [ ] 🔗 gutter icon on linked lines
- [ ] CodeLens above first linked line
- [ ] Click CodeLens opens issue
- [ ] Configurable (enable/disable)

---

### 4.3 StatusBarProvider (Day 37-38)

**Files to Create:**

- `src/providers/StatusBarProvider.ts`

**Requirements:**

- Story 5.1 - Status Bar Indicator

**Acceptance Criteria:**

- [ ] Shows open issue count
- [ ] Shows critical issue count when present
- [ ] Red background when critical exist
- [ ] Click opens dashboard

---

### Phase 4 Verification (MVP Complete)

```bash
# Full MVP verification
npm test
npm run test:e2e
```

**MVP Success Criteria:**

- Create issue ✓
- View issue ✓
- **Edit issue** ✓ (Critical)
- Delete issue ✓
- Link code ✓
- Search issues ✓
- Filter issues ✓
- Status bar ✓

---

## Phase 5: Milestones & Sprints (Week 10-11)

### 5.1 MilestoneService (Day 39-41)

- CRUD operations for milestones
- Assign issues to milestones

### 5.2 SprintService (Day 42-44)

- Sprint CRUD
- Sprint lifecycle (Planned → Active → Completed)

### 5.3 MilestoneTreeProvider (Day 45-46)

- Tree view for milestones
- Progress indicators

### 5.4 SprintTreeProvider (Day 47-48)

- Tree view for sprints
- Status sections

---

## Phase 6: Time & Templates (Week 12-13)

### 6.1 TimeTrackingService (Day 49-51)

- Log time with hours + comment
- Per-issue time totals

### 6.2 TemplateService (Day 52-54)

- Built-in templates (Bug, Feature, Task)
- Custom template creation

### 6.3 TimeTrackingProvider (Day 55-56)

- Tree view showing time logs

---

## Phase 7: Dashboard (Week 14)

### 7.1 DashboardPanel (Day 57-62)

- KPI cards (open, critical, stale counts)
- Bar charts (status, severity, type distribution)
- Milestone progress table

**Command:** Ctrl+Alt+D

---

## Phase 8: Polish (Week 15-16)

### 8.1 ChangelogService (Day 63-65)

- Generate changelogs from resolved issues
- Group by version and type

### 8.2 Export Formats (Day 66-68)

- CSV export
- Markdown export
- GitHub Issues JSON export

### 8.3 Final QA (Day 69-76)

- Documentation update
- Final test coverage verification
- Performance testing
- Security review

---

## Development Workflow Per Story

### Step 1: Read Requirements (15 min)

```bash
# Read the relevant requirement doc
cat docs/requirements/functional-requirements.md | grep -A20 "FIELD-003"
```

### Step 2: Select Template (5 min)

- Service → `docs/ai-agent-templates/service-template.md`
- Provider → `docs/ai-agent-templates/provider-template.md`
- Command → `docs/ai-agent-templates/command-template.md`
- Panel → `docs/ai-agent-templates/panel-template.md`

### Step 3: Write Tests First (TDD) (30-60 min)

```bash
# Create test file following template
cat > test/suite/myComponent.test.ts << 'EOF'
// ... test cases
EOF

# Verify tests fail (RED)
npx vitest run test/suite/myComponent.test.ts
```

### Step 4: Implement Component (60-120 min)

```bash
# Implement following template
cat > src/services/MyService.ts << 'EOF'
// ... implementation
EOF

# Verify tests pass (GREEN)
npx vitest run test/suite/myComponent.test.ts
```

### Step 5: Verify (15 min)

```bash
npm test                    # All tests
npx tsc --noEmit           # Types
npm run lint                # Linting
grep -r "any" src/          # No forbidden types
```

### Step 6: Integration (15 min)

- Register in `extension.ts`
- Update `constants.ts` if needed
- Update `package.json` if commands added

---

## Quality Gates

| Gate | Criteria | Enforcement |
|------|----------|-------------|
| Phase Gate 1 | All storage tests pass, atomic writes verified | Before Phase 2 |
| Phase Gate 2 | IssueService 90% coverage, all CRUD tested | Before Phase 3 |
| Phase Gate 3 | **Edit issue E2E passes** | Before Phase 4 | _(3.1 done, 3.2 and 3.3 pending)_ |
| Phase Gate 4 | Code linking E2E passes | MVP Complete |
| Final Gate | 80% total coverage, all E2E pass | Release |

---

## Daily Standup Format

**For each AI agent session:**

1. **What story is being implemented?**
   - Reference: Story X.Y from `docs/user-stories/user-stories.md`

2. **What template is being followed?**
   - Reference: `docs/ai-agent-templates/[type]-template.md`

3. **What tests are being added?**
   - Test file: `test/suite/[component].test.ts`

4. **Verification commands run?**
   - `npm test` ✓
   - `npx tsc --noEmit` ✓

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Edit capability fails again | Dedicated 6 days in Phase 3, E2E test required |
| Storage corruption | Atomic writes, backups, validation |
| Performance issues | Lazy loading, debouncing, event-driven |
| Test coverage gaps | 80% threshold enforced in CI |
| Architecture drift | Template-based development, code reviews |

---

## Definition of Done (Per Component)

- [ ] Tests written first (TDD)
- [ ] Implementation follows template
- [ ] All tests pass
- [ ] Coverage > 80% (90% for services)
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] No `any` types
- [ ] No `console.log` (use logger)
- [ ] Integrated in extension.ts
- [ ] Documented in code (JSDoc)

---

## Post-MVP Features (Phase 5-8)

These can be implemented after MVP is stable:

- Milestones and sprints
- Time tracking
- Templates
- Dashboard
- Changelog generation
- Advanced export formats (CSV, Markdown, GitHub)
- Issue relations
- Stale detection
- Comments

**Important**: Do NOT start Phase 5 until Phase 4 (MVP) is 100% complete and verified.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | > 80% | Vitest coverage report |
| E2E Tests Pass | 100% | Playwright results |
| Type Errors | 0 | tsc --noEmit |
| Lint Errors | 0 | ESLint |
| Edit Issue Works | Yes | E2E verification |
| MVP Delivered | Week 9 | Phase 4 complete |

---

**Remember**: Start with Story 1.3 (Edit Issue) tests. This is the most critical requirement.
