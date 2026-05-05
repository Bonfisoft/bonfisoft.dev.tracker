# User Stories - BonfiSoft Development Tracker

> **Priority Legend**: 🟢 MVP | 🟡 High | 🔵 Medium | ⚪ Low  
> **Story Points**: S (Small ~2-4h), M (Medium ~4-8h), L (Large ~8-16h), XL (Extra Large ~16-24h)

---

## Epic 1: Core Issue Management

### Story 1.1: Create a New Issue

**Priority**: 🟢 MVP  
**Story Points**: M (6h)

> As a developer, I want to create a new issue so that I can track bugs, features, or tasks.

**Acceptance Criteria:**

- [ ] Command palette shows "Issues: Create New Issue" option
- [ ] Keyboard shortcut Ctrl+Alt+I triggers creation wizard
- [ ] Wizard steps: Type → Title → Severity → Urgency
- [ ] Each step allows cancel with Escape
- [ ] Title validation: 1-200 characters, required
- [ ] Current git tag auto-captures as "Reported In"
- [ ] Reporter auto-fills from git config or settings
- [ ] Issue appears in tree view immediately after creation
- [ ] Success notification shown

**Definition of Done:**

- Unit tests for creation logic pass
- E2E test creates issue and verifies in tree view
- No runtime errors in extension host

---

### Story 1.2: View Issue Details

**Priority**: 🟢 MVP  
**Story Points**: L (10h)

> As a developer, I want to view issue details so that I can see all information about a tracked item.

**Acceptance Criteria:**

- [ ] Clicking issue in sidebar opens detail panel
- [ ] Panel shows: title, description, type, severity, urgency, status
- [ ] Panel shows: reporter, assignee, createdAt, updatedAt
- [ ] Panel shows: versions (reported/fixed in), tags
- [ ] Description renders as markdown
- [ ] Only one panel per issue (singleton per ID)
- [ ] Panel updates if issue changes (event-driven)
- [ ] Panel title shows "Issue #N: <truncated-title>"

**Definition of Done:**

- Webview renders without console errors
- Panel updates when issue edited elsewhere
- Clean memory disposal on close

---

### Story 1.3: Edit Issue (CRITICAL - Lesson from Previous Project)

**Priority**: 🟢 MVP  
**Story Points**: XL (18h)

> As a developer, I want to edit any issue field after creation so that I can correct mistakes or update status.

**Acceptance Criteria:**

- [ ] Title: inline edit on click, Enter/Blur to save, Escape to cancel
- [ ] Description: edit button opens markdown editor, Save/Cancel buttons
- [ ] Type: dropdown selection, immediate save
- [ ] Severity: dropdown selection, immediate save
- [ ] Urgency: dropdown selection, immediate save
- [ ] Status: dropdown selection, immediate save
- [ ] Assignee: click-to-edit text input
- [ ] All changes update `updatedAt` timestamp
- [ ] Auto-save to storage on every change
- [ ] Tree view refreshes automatically
- [ ] Validation errors shown inline

**Technical Requirements:**

- Two-way data binding or manual state sync
- Event emitter for change notifications
- Validation before persistence

**Definition of Done:**

- All MVP fields editable
- Unit tests for each field edit type
- E2E test edits issue and verifies persistence
- No data loss on edit

---

### Story 1.4: Close/Resolve/Reopen Issue

**Priority**: 🟢 MVP  
**Story Points**: M (5h)

> As a developer, I want to change issue status so that I can track the lifecycle from open to closed.

**Acceptance Criteria:**

- [ ] "Close Issue" command sets status to Closed
- [ ] "Resolve Issue" prompts for "Fixed In" version
- [ ] Version picker shows available git tags
- [ ] Resolving sets status to Resolved + fixedInVersion
- [ ] "Reopen Issue" sets status back to Open
- [ ] Reopening clears fixedInVersion
- [ ] Context menu shows appropriate options based on current status
- [ ] Status changes reflect immediately in tree

**Definition of Done:**

- Status workflow enforced
- Unit tests for all transitions
- E2E tests verify status persistence

---

### Story 1.5: Delete Issue

**Priority**: 🟢 MVP  
**Story Points**: S (3h)

> As a developer, I want to delete an issue so that I can remove invalid or duplicate entries.

**Acceptance Criteria:**

- [ ] Right-click → Delete shows confirmation dialog
- [ ] Confirmation shows issue title and "This cannot be undone"
- [ ] Confirm removes from storage
- [ ] Cancel leaves issue intact
- [ ] Tree view refreshes immediately
- [ ] If detail panel open, it closes
- [ ] Event fired for deletion

**Definition of Done:**

- Deletion persisted to storage
- Unit test: delete removes from database
- E2E test: delete flow with confirmation

---

## Epic 2: Code Integration

### Story 2.1: Link Code Selection to Issue

**Priority**: 🟢 MVP  
**Story Points**: L (12h)

> As a developer, I want to link code lines to issues so that I can quickly navigate between code and related issues.

**Acceptance Criteria:**

- [ ] Ctrl+Alt+L triggers "Link Code to Issue"
- [ ] Command requires text selection (or uses current line)
- [ ] QuickPick shows all issues (open first, then resolved)
- [ ] Selecting issue creates CodeLink with:
  - Relative file path
  - Line start/end (1-based)
  - Code snippet context (200 chars)
- [ ] Success notification shows
- [ ] Link stored in issue.codeLinks array

**Definition of Done:**

- CodeLink model persisted
- Unit test: link creation logic
- E2E test: select code, link, verify storage

---

### Story 2.2: Show Gutter Decorations

**Priority**: 🟢 MVP  
**Story Points**: M (6h)

> As a developer, I want to see visual indicators on linked code lines so that I can identify issues at a glance.

**Acceptance Criteria:**

- [ ] 🔗 icon appears in gutter on linked lines
- [ ] Decoration shows on all linked lines in range
- [ ] Decoration persists across file reopens
- [ ] Hover shows tooltip: "Linked to Issue #N: <title>"
- [ ] Configurable: `bonfisoft-issues.decorationsEnabled`
- [ ] Disabling setting removes all decorations

**Definition of Done:**

- DecorationProvider registered
- Decorations update when links added/removed
- Performance: no lag on large files

---

### Story 2.3: Show CodeLens

**Priority**: 🟢 MVP  
**Story Points**: M (6h)

> As a developer, I want to see inline issue references above linked code so that I know what issues are related.

**Acceptance Criteria:**

- [ ] CodeLens appears above first linked line: "[🔗 Issue #N: <title>]"
- [ ] Multiple issues linked = multiple CodeLens (stacked)
- [ ] Clicking CodeLens opens issue detail panel
- [ ] Configurable: `bonfisoft-issues.codeLensEnabled`
- [ ] Disabling setting removes all CodeLens
- [ ] Title truncated if > 50 chars

**Definition of Done:**

- CodeLensProvider registered
- Click handler opens correct issue
- Unit test: CodeLens generation

---

### Story 2.4: Navigate from Issue to Code

**Priority**: 🟢 MVP  
**Story Points**: S (3h)

> As a developer, I want to click a code link in the issue panel to jump to the code location.

**Acceptance Criteria:**

- [ ] Code links in detail panel show file path + line range
- [ ] Clicking opens file at correct line
- [ ] If file doesn't exist, show error notification
- [ ] File opens in current active editor group
- [ ] Cursor positioned at lineStart

**Definition of Done:**

- File open command works
- Error handling for missing files
- E2E test: click link, verify navigation

---

## Epic 3: Search & Organization

### Story 3.1: Search Issues

**Priority**: 🟢 MVP  
**Story Points**: L (10h)

> As a developer, I want to search issues by text so that I can find relevant items quickly.

**Acceptance Criteria:**

- [ ] Ctrl+Alt+Shift+F opens search QuickPick
- [ ] Search across: title, description, tags, comments, assignee
- [ ] Results ranked by relevance (title = 3x, tags/assignee = 2x, other = 1x)
- [ ] Shows top 20 results
- [ ] Format: "#123: <title> [<status>]"
- [ ] Selecting opens detail panel
- [ ] Empty query shows all issues (recent first)

**Definition of Done:**

- SearchService with ranking algorithm
- Unit tests: search ranking
- E2E test: search flow

---

### Story 3.2: Filter Issues

**Priority**: 🟢 MVP  
**Story Points**: M (8h)

> As a developer, I want to filter issues by various criteria so that I can focus on specific subsets.

**Acceptance Criteria:**

- [ ] Filter by status (multi-select)
- [ ] Filter by type (multi-select)
- [ ] Filter by severity (multi-select)
- [ ] Filter by assignee (text match)
- [ ] Combined filters use AND logic
- [ ] Filter button in sidebar toolbar
- [ ] Active filter indicator shown
- [ ] Clear filter command/button resets all

**Definition of Done:**

- Filter logic in IssueService
- UI state management for filters
- Unit tests: filter combinations

---

### Story 3.3: Group Issues in Tree

**Priority**: 🟢 MVP  
**Story Points**: M (8h)

> As a developer, I want to group issues in the sidebar so that I can view them organized by status, type, or other criteria.

**Acceptance Criteria:**

- [ ] Default grouping: by status
- [ ] Available groupings: status, type, severity, milestone, sprint, assignee, none
- [ ] Group-by button in sidebar toolbar
- [ ] Groups show count: "Open (12)"
- [ ] Expand/collapse groups
- [ ] Setting: `bonfisoft-issues.treeGroupBy` for default
- [ ] Resolved issues hidden unless `showResolvedIssues` = true

**Definition of Done:**

- IssueTreeProvider with grouping logic
- Dynamic tree restructuring
- E2E test: change grouping

---

## Epic 4: Storage & Data

### Story 4.1: Workspace Storage

**Priority**: 🟢 MVP  
**Story Points**: L (10h)

> As a developer, I want issues stored in the workspace so that they can be shared with my team via version control.

**Acceptance Criteria:**

- [ ] Default storage: `.vscode/issues/issues.json`
- [ ] Storage location follows opened workspace folder
- [ ] JSON format readable and diffable
- [ ] Atomic writes (temp file + rename)
- [ ] Auto-create `.vscode/issues/` directory on first save
- [ ] Schema version in JSON

**Definition of Done:**

- IStorageProvider interface defined
- WorkspaceStorageProvider implementation
- Unit tests: round-trip CRUD

---

### Story 4.2: Global Storage

**Priority**: 🟡 High  
**Story Points**: M (6h)

> As a developer, I want to optionally use global storage so that I can track issues on projects I don't control.

**Acceptance Criteria:**

- [ ] Setting: `bonfisoft-issues.storageLocation` = `global`
- [ ] Global storage uses VS Code globalStorageUri
- [ ] Namespace isolation per workspace (hash-based)
- [ ] No files in project directory
- [ ] Migration command: "Move Issues to Workspace/Global"

**Definition of Done:**

- GlobalStorageProvider implementation
- Setting change triggers migration prompt
- Unit tests: isolation works

---

### Story 4.3: Export to JSON

**Priority**: 🟡 High  
**Story Points**: M (6h)

> As a developer, I want to export issues to JSON so that I can back up or migrate data.

**Acceptance Criteria:**

- [ ] Command: "Issues: Export Issues" → select JSON
- [ ] Export includes full database schema
- [ ] Schema version included
- [ ] File picker for save location
- [ ] Default filename: `issues-export-YYYY-MM-DD.json`

**Definition of Done:**

- ExportService implementation
- E2E test: export creates valid file

---

### Story 4.4: Import from JSON

**Priority**: 🟡 High  
**Story Points**: L (10h)

> As a developer, I want to import issues from JSON so that I can restore backups or merge projects.

**Acceptance Criteria:**

- [ ] Command: "Issues: Import Issues"
- [ ] File picker for JSON file
- [ ] Validate schema version
- [ ] Deduplication by UUID (skip existing)
- [ ] Import report: "Imported: X, Skipped: Y"
- [ ] UI refreshes after import
- [ ] Invalid file shows error

**Definition of Done:**

- Import with validation
- Unit tests: deduplication logic
- E2E test: import flow

---

## Epic 5: UI/UX

### Story 5.1: Status Bar Indicator

**Priority**: 🟢 MVP  
**Story Points**: S (3h)

> As a developer, I want to see issue counts in the status bar so that I know when critical items need attention.

**Acceptance Criteria:**

- [ ] Shows: "Issues: 12" (open count)
- [ ] Shows: "⚠️ 3 Critical" when critical exist
- [ ] Red background when critical issues exist
- [ ] Click opens dashboard
- [ ] Configurable: `bonfisoft-issues.showStatusBar`
- [ ] Disabling hides completely

**Definition of Done:**

- StatusBarProvider registered
- Event-driven updates
- E2E test: status bar visibility

---

### Story 5.2: Keyboard Shortcuts

**Priority**: 🟢 MVP  
**Story Points**: S (2h)

> As a developer, I want keyboard shortcuts so that I can work efficiently without using the mouse.

**Acceptance Criteria:**

- [ ] Ctrl+Alt+I: Create new issue
- [ ] Ctrl+Alt+Shift+F: Search issues
- [ ] Ctrl+Alt+L: Link code to issue
- [ ] Ctrl+Alt+D: Open dashboard
- [ ] Shortcuts configurable via VS Code keybindings
- [ ] No conflicts with default VS Code bindings

**Definition of Done:**

- package.json contributes.keybindings
- Shortcuts documented in README

---

## Epic 6: Milestones & Sprints

### Story 6.1: Create Milestone

**Priority**: 🟡 High  
**Story Points**: M (5h)

> As a developer, I want to create milestones so that I can group issues by release.

**Acceptance Criteria:**

- [ ] Command: "Issues: Create Milestone"
- [ ] Prompts for name (unique required)
- [ ] Prompts for optional due date (date picker)
- [ ] Appears in Milestones tree view
- [ ] Shows count: "v1.0.0 (5/12)"

**Definition of Done:**

- Milestone CRUD service
- Tree provider for milestones

---

### Story 6.2: Assign Issue to Milestone

**Priority**: 🟡 High  
**Story Points**: S (3h)

> As a developer, I want to assign issues to milestones so that I can plan releases.

**Acceptance Criteria:**

- [ ] Right-click issue → "Assign to Milestone"
- [ ] QuickPick shows available milestones
- [ ] Selecting updates issue.milestoneId
- [ ] Milestone counts update
- [ ] Tree view reflects assignment

**Definition of Done:**

- Assignment logic
- Tree refresh on change

---

### Story 6.3: Create Sprint

**Priority**: 🔵 Medium  
**Story Points**: M (5h)

> As a developer, I want to create sprints so that I can plan work in iterations.

**Acceptance Criteria:**

- [ ] Command: "Issues: Create Sprint"
- [ ] Prompts for name
- [ ] Prompts for start date (default: today)
- [ ] Prompts for end date (default: start + 14 days)
- [ ] Optional sprint goal field
- [ ] Appears in Sprints tree view

**Definition of Done:**

- Sprint CRUD service

---

### Story 6.4: Start/Complete Sprint

**Priority**: 🔵 Medium  
**Story Points**: M (6h)

> As a developer, I want to manage sprint lifecycle so that I can track active iterations.

**Acceptance Criteria:**

- [ ] Only one sprint can be active at a time
- [ ] "Start Sprint" moves from Planned to Active
- [ ] "Complete Sprint" moves from Active to Completed
- [ ] On complete: prompt for incomplete issues (move to next sprint or backlog)
- [ ] Status shown in tree view sections

**Definition of Done:**

- Sprint workflow state machine
- UI reflects status changes

---

## Epic 7: Advanced Features

### Story 7.1: Time Tracking

**Priority**: 🔵 Medium  
**Story Points**: M (6h)

> As a developer, I want to log time spent on issues so that I can track effort.

**Acceptance Criteria:**

- [ ] Right-click issue → "Log Time"
- [ ] Prompt for hours (decimal, 0.01-999.99)
- [ ] Optional comment field
- [ ] Stored in issue.timeLogs array
- [ ] Time Tracking tree shows totals per issue
- [ ] Logged by = current user

**Definition of Done:**

- TimeLog model and service
- TimeTrackingProvider for tree

---

### Story 7.2: Issue Templates

**Priority**: 🔵 Medium  
**Story Points**: L (10h)

> As a developer, I want to use templates so that I can quickly create common issue types.

**Acceptance Criteria:**

- [ ] Built-in templates: Bug, Feature, Task
- [ ] "Create from Template" command
- [ ] Template pre-fills: type, severity, description, tags
- [ ] Custom templates: save current issue as template
- [ ] Template stored in database.templates

**Definition of Done:**

- TemplateService implementation
- Template selection UI

---

### Story 7.3: Generate Changelog

**Priority**: 🔵 Medium  
**Story Points**: M (8h)

> As a developer, I want to generate changelogs so that I can document releases.

**Acceptance Criteria:**

- [ ] Command: "Issues: Generate Changelog"
- [ ] Filter by version (optional)
- [ ] Select format: Markdown or Plain Text
- [ ] Includes only Resolved/Closed with fixedInVersion
- [ ] Groups by version and optionally by type
- [ ] Opens in new editor tab
- [ ] Option to save as CHANGELOG.md

**Definition of Done:**

- ChangelogService implementation
- Markdown generation logic

---

### Story 7.4: Dashboard

**Priority**: 🔵 Medium  
**Story Points**: L (12h)

> As a developer, I want a dashboard so that I can see project metrics at a glance.

**Acceptance Criteria:**

- [ ] Command: "Issues: Open Dashboard" (Ctrl+Alt+D)
- [ ] KPI cards: total, open, in-progress, resolved, critical, stale
- [ ] Bar charts: issues by status, severity, type
- [ ] Milestone progress table
- [ ] Sprint burn table
- [ ] Auto-refreshes when data changes

**Definition of Done:**

- DashboardPanel webview
- Metrics calculation service
- Chart rendering (canvas or SVG)

---

## Epic 8: Quality & Polish

### Story 8.1: Stale Issue Detection

**Priority**: 🔵 Medium  
**Story Points**: S (3h)

> As a developer, I want to identify stale issues so that I can keep my backlog current.

**Acceptance Criteria:**

- [ ] Issues open > 30 days without activity flagged
- [ ] Visual indicator in tree (🕐 or different color)
- [ ] Configurable: `bonfisoft-issues.staleIssueDays`
- [ ] Filter to show only stale issues
- [ ] Stale count in dashboard

**Definition of Done:**

- Stale calculation in IssueService
- Tree decoration for stale items

---

### Story 8.2: Issue Relations

**Priority**: 🔵 Medium  
**Story Points**: L (12h)

> As a developer, I want to relate issues so that I can track dependencies and duplicates.

**Acceptance Criteria:**

- [ ] Relation types: blocks, blocked-by, duplicates, related-to, parent-of, child-of, clones
- [ ] Right-click → "Add Relation"
- [ ] QuickPick to select target issue
- [ ] Bidirectional relations auto-created
- [ ] Relations shown in detail panel
- [ ] Click relation to navigate to issue
- [ ] Prevent self-relation

**Definition of Done:**

- IssueRelation model
- Bidirectional relation logic
- Relation validation

---

## Story Point Summary by Priority

| Priority | Stories | Total Points | Est. Hours |
|----------|---------|--------------|------------|
| 🟢 MVP | 16 | 113 | ~90h |
| 🟡 High | 4 | 28 | ~20h |
| 🔵 Medium | 8 | 66 | ~60h |
| ⚪ Low | 0 | 0 | 0 |
| **Total** | **28** | **207** | **~170h** |

---

## Dependency Graph

```
Story 4.1 (Storage) ─┬─ Story 1.1 (Create)
                     ├─ Story 1.2 (View)
                     ├─ Story 1.3 (Edit)
                     ├─ Story 3.1 (Search)
                     └─ Story 3.3 (Group)

Story 1.1 ─┬─ Story 1.4 (Close/Resolve)
           ├─ Story 1.5 (Delete)
           ├─ Story 2.1 (Link Code)
           └─ Story 5.2 (Shortcuts)

Story 6.1 (Milestone) ── Story 6.2 (Assign)
Story 6.3 (Sprint) ──── Story 6.4 (Lifecycle)

Story 1.1 ─── All other stories
```
