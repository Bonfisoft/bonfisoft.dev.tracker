# Use Cases - BonfiSoft Development Tracker

---

## Use Case Diagram Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Create Issue│  │  Edit Issue │  │  View Issue │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐             │
│  │ Link to Code│  │Search Issues│  │  Add Comment│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                                                       │
│  ┌──────▼──────┐                                                │
│  │  Log Time   │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      EXTENSION SYSTEM         │
              │  ┌─────────┐  ┌──────────┐   │
              │  │Storage  │  │  Search  │   │
              │  │Provider │  │  Service │   │
              │  └─────────┘  └──────────┘   │
              │  ┌─────────┐  ┌──────────┐   │
              │  │ Issue   │  │   Git    │   │
              │  │Service  │  │ Provider │   │
              │  └─────────┘  └──────────┘   │
              └───────────────────────────────┘
```

---

## Actor Definitions

### Primary Actor: Developer

A software developer using VS Code who needs to track issues, bugs, features, and tasks related to their codebase.

**Goals:**

- Track bugs found during development
- Manage feature requests and enhancements
- Link issues to specific code locations
- Track time spent on issues
- Generate changelogs for releases

### Secondary Actor: VS Code Extension Host

The VS Code environment that hosts the extension, provides APIs, and manages lifecycle.

### Secondary Actor: Git Extension

The built-in VS Code Git extension that provides repository information.

---

## Core Use Cases

---

### UC-001: Create New Issue

**Actor:** Developer  
**Priority:** 🟢 MVP  
**Preconditions:**

- Extension is activated
- Workspace folder is open

**Trigger:** Developer runs "Issues: Create New Issue" command or clicks + button in sidebar

**Main Flow:**

1. System displays QuickPick wizard for issue type
2. Developer selects issue type (Bug, Feature, Task, etc.)
3. System prompts for issue title
4. Developer enters title (1-200 characters)
5. System prompts for severity level
6. Developer selects severity (Critical, High, Medium, Low, Trivial)
7. System prompts for urgency level
8. Developer selects urgency (Immediate, High, Normal, Low, Whenever)
9. System captures current git tag as "Reported In" version
10. System creates issue with:
    - Auto-generated UUID
    - Current timestamp
    - Reporter from git config or setting
    - Status: Open
11. System saves issue to storage
12. System fires `onIssueChanged` event
13. System refreshes tree view
14. System shows success notification

**Alternative Flows:**

**A1: Cancel at any step (steps 2-8)**

- Developer presses Escape
- System cancels creation
- No issue created

**A2: No git repository**

- At step 9, if no git tag available
- System sets `reportedInVersion` to null
- Continues with creation

**A3: Use template**

- Developer runs "Issues: Create from Template"
- System displays list of available templates
- Developer selects template
- System pre-fills fields from template defaults
- Continues at step 3

**Postconditions:**

- Issue exists in storage
- Issue appears in tree view
- Issue is searchable

---

### UC-002: View Issue Detail

**Actor:** Developer  
**Priority:** 🟢 MVP  
**Preconditions:**

- Issue exists in database

**Trigger:** Developer clicks issue in sidebar or runs "Issues: View Issue"

**Main Flow:**

1. System retrieves issue by ID
2. System opens webview panel (single instance per issue)
3. System renders issue details:
    - Title (editable on click)
    - Description (markdown rendered)
    - Type, Severity, Urgency, Status
    - Reporter, Assignee
    - Created/Updated timestamps
    - Reported In / Fixed In versions
    - Tags (clickable)
    - Code links (clickable to navigate)
    - Comments (threaded)
    - Time logs (if any)
    - Relations (if any)
4. Developer views all fields

**Alternative Flows:**

**A1: Issue not found**

- System shows error: "issue not found"
- Tree view refreshes to remove stale reference

**A2: Panel already open**

- System brings existing panel to foreground
- Updates panel content if issue changed

**Postconditions:**

- Detail panel is open and visible
- Panel auto-updates when issue changes (via events)

---

### UC-003: Edit Issue

**Actor:** Developer  
**Priority:** 🟢 MVP (Critical - lesson from previous project)  
**Preconditions:**

- Issue exists in database
- Detail panel is open OR issue selected in tree

**Trigger:** Developer clicks editable field in detail panel

**Main Flow - Edit Title:**

1. Developer clicks title field
2. System switches to edit mode (text input)
3. Developer modifies title
4. Developer presses Enter or clicks outside
5. System validates input (1-200 chars)
6. System updates issue.title
7. System updates issue.updatedAt
8. System saves to storage
9. System fires `onIssueChanged` event
10. Tree view refreshes automatically
11. Panel shows updated title

**Main Flow - Edit Status:**

1. Developer clicks status dropdown
2. System displays available statuses
3. Developer selects new status
4. If status = Resolved:
    - System prompts for "Fixed In" version from git tags
    - Developer selects version
    - System sets `fixedInVersion`
5. If status = Open (from Resolved/Closed):
    - System clears `fixedInVersion`
6. System saves changes
7. System fires event, UI refreshes

**Main Flow - Edit Description:**

1. Developer clicks "Edit" on description
2. System shows markdown editor with current content
3. Developer edits markdown
4. Developer clicks Save
5. System updates description
6. System re-renders markdown preview
7. System saves and fires events

**Main Flow - Edit Assignee:**

1. Developer clicks assignee field
2. System shows text input
3. Developer enters username
4. System updates assignee on blur
5. System saves and fires events

**Alternative Flows:**

**A1: Validation failure**

- Input exceeds max length
- System shows error message
- Field remains in edit mode

**A2: Cancel edit**

- Developer presses Escape
- System reverts to display mode with original value

**Postconditions:**

- Issue is updated in storage
- All views reflect changes
- `updatedAt` timestamp is current

---

### UC-004: Link Code Selection to Issue

**Actor:** Developer  
**Priority:** 🟢 MVP  
**Preconditions:**

- Editor has active text file open
- Developer has selected one or more lines
- Issues exist in database

**Trigger:** Developer runs "Issues: Link Code to Issue" (Ctrl+Alt+L)

**Main Flow:**

1. System captures:
    - File path (relative to workspace)
    - Selected line range (start, end)
    - Selected text snippet (context)
2. System displays QuickPick of all issues
3. Developer selects target issue
4. System creates CodeLink object:

    ```
    {
      id: UUID,
      filePath: "src/services/issueService.ts",
      lineStart: 42,
      lineEnd: 45,
      context: "function createIssue() { ... }",
      createdAt: ISO8601
    }
    ```

5. System adds CodeLink to issue.codeLinks array
6. System saves issue
7. System fires `onIssueChanged` event
8. System triggers decoration refresh
9. Gutter icon appears on linked lines
10. CodeLens appears above linked lines
11. System shows success notification

**Alternative Flows:**

**A1: No active editor**

- System shows error: "no active editor"

**A2: No text selection**

- System uses current line as lineStart and lineEnd

**A3: No issues exist**

- System shows: "create an issue first"

**A4: Cancel selection**

- Developer presses Escape in QuickPick
- No link created

**Postconditions:**

- CodeLink exists in issue
- Gutter decoration visible
- CodeLens visible on linked lines
- Clicking CodeLens opens issue detail

---

### UC-005: Search Issues

**Actor:** Developer  
**Priority:** 🟢 MVP  
**Preconditions:**

- Issues exist in database

**Trigger:** Developer runs "Issues: Search" (Ctrl+Alt+Shift+F)

**Main Flow:**

1. System opens QuickPick with search input
2. Developer types search query
3. System searches across fields:
    - Issue title (weight: 3x)
    - Description (weight: 1x)
    - Tags (weight: 2x)
    - Comments (weight: 1x)
    - Assignee (weight: 2x)
4. System calculates relevance scores
5. System displays ranked results (top 20)
    - Format: "#123: <title> [Status]"
6. Developer selects result
7. System opens issue detail panel

**Alternative Flows:**

**A1: No matches**

- System shows: "no issues found"

**A2: Empty query**

- System shows all issues sorted by updatedAt desc

**A3: Cancel search**

- Developer presses Escape
- QuickPick closes

**Postconditions:**

- Issue detail panel is open for selected issue

---

### UC-006: Filter Issues

**Actor:** Developer  
**Priority:** 🟢 MVP  
**Preconditions:**

- Issues exist in database

**Trigger:** Developer clicks filter icon in sidebar or runs "Issues: Filter"

**Main Flow:**

1. System displays filter options QuickPick:
    - By Status (multi-select)
    - By Type (multi-select)
    - By Severity (multi-select)
    - By Assignee (text input)
    - By Tags (multi-select)
2. Developer selects filter criteria
3. System applies combined filters (AND logic)
4. Tree view updates to show only filtered issues
5. Filter indicator appears in sidebar

**Alternative Flows:**

**A1: Clear filter**

- Developer runs "Issues: Clear Filter" or clicks clear button
- System removes all filters
- Tree shows all issues (respecting `showResolvedIssues` setting)

**A2: Filter returns empty**

- Tree shows: "no issues match filter"
- Filter indicator still visible

**Postconditions:**

- Tree view shows filtered subset
- Filter state persisted for session

---

### UC-007: Create Milestone

**Actor:** Developer  
**Priority:** 🟡 High  
**Preconditions:**

- Extension activated

**Trigger:** Developer runs "Issues: Create Milestone"

**Main Flow:**

1. System prompts for milestone name
2. Developer enters name (unique check)
3. System prompts for optional due date
4. Developer selects date or skips
5. System creates milestone:

    ```
    {
      id: UUID,
      name: "v1.0.0",
      description: "",
      dueDate: "2026-06-01" | null,
      createdAt: ISO8601,
      updatedAt: ISO8601
    }
    ```

6. System saves milestone
7. Milestone appears in Milestones tree view

**Alternative Flows:**

**A1: Duplicate name**

- System shows error: "milestone already exists"
- Returns to name input

**A2: Cancel**

- Esc at any step cancels creation

**Postconditions:**

- Milestone exists in database
- Can be assigned to issues

---

### UC-008: Assign Issue to Milestone

**Actor:** Developer  
**Priority:** 🟡 High  
**Preconditions:**

- Issue exists
- Milestone exists

**Trigger:** Developer right-clicks issue → "Assign to Milestone"

**Main Flow:**

1. System displays list of milestones
2. Developer selects milestone
3. System updates issue.milestoneId
4. System saves issue
5. System refreshes tree views (Issues + Milestones)
6. Milestone shows "1/5" count format

**Alternative Flows:**

**A1: Remove from milestone**

- Developer selects "None" or "Remove"
- System sets issue.milestoneId = null

**Postconditions:**

- Issue assigned to milestone
- Milestone counts updated

---

### UC-009: Create Sprint

**Actor:** Developer  
**Priority:** 🔵 Medium  
**Preconditions:**

- Extension activated

**Trigger:** Developer runs "Issues: Create Sprint"

**Main Flow:**

1. System prompts for sprint name
2. Developer enters name
3. System prompts for start date (default: today)
4. Developer confirms or changes
5. System prompts for end date (default: start + 14 days)
6. Developer confirms or changes
7. System prompts for optional sprint goal
8. Developer enters or skips
9. System creates sprint:

    ```
    {
      id: UUID,
      name: "Sprint 1",
      goal: "Complete core features",
      startDate: "2026-05-01",
      endDate: "2026-05-14",
      status: "planned",
      createdAt: ISO8601,
      updatedAt: ISO8601
    }
    ```

10. System saves sprint
11. Sprint appears in Sprints tree view

**Postconditions:**

- Sprint exists with status: planned

---

### UC-010: Start Sprint

**Actor:** Developer  
**Priority:** 🔵 Medium  
**Preconditions:**

- Sprint exists with status: planned
- No other sprint is active

**Trigger:** Developer right-clicks sprint → "Start Sprint"

**Main Flow:**

1. System validates no active sprint exists
2. System updates sprint.status = "active"
3. System updates sprint.updatedAt
4. System saves sprint
5. System moves sprint to "Active" section in tree
6. System fires `onMetaChanged` event

**Alternative Flows:**

**A1: Active sprint exists**

- System shows error: "complete active sprint first"
- Shows name of active sprint

**Postconditions:**

- Sprint status = active
- Issues can be assigned to active sprint

---

### UC-011: Log Time on Issue

**Actor:** Developer  
**Priority:** 🔵 Medium  
**Preconditions:**

- Issue exists

**Trigger:** Developer runs "Issues: Log Time" or right-clicks issue

**Main Flow:**

1. System prompts for hours (decimal, e.g., 1.5)
2. Developer enters hours
3. System validates: 0.01 - 999.99
4. System prompts for optional comment
5. Developer enters or skips
6. System creates TimeLog:

    ```
    {
      id: UUID,
      hours: 2.5,
      comment: "Debugging session",
      loggedAt: ISO8601,
      loggedBy: "developer"
    }
    ```

7. System adds to issue.timeLogs
8. System saves issue
9. Time Tracking tree view updates
10. System shows: "logged 2.5 hours on issue #123"

**Alternative Flows:**

**A1: Invalid hours**

- System shows error: "hours must be between 0.01 and 999.99"

**Postconditions:**

- TimeLog added to issue
- Totals visible in Time Tracking view

---

### UC-012: Generate Changelog

**Actor:** Developer  
**Priority:** 🔵 Medium  
**Preconditions:**

- Issues with status Resolved or Closed exist
- Issues have fixedInVersion set

**Trigger:** Developer runs "Issues: Generate Changelog"

**Main Flow:**

1. System prompts for version filter (optional)
2. Developer selects or skips (all versions)
3. System prompts for format (Markdown | Plain Text)
4. Developer selects format
5. System queries resolved/closed issues with fixedInVersion
6. System groups by version (and by type if configured)
7. System generates changelog content
8. System opens new editor tab with changelog
9. System shows: "save as CHANGELOG.md?"
10. Developer can save or close

**Alternative Flows:**

**A1: No resolved issues**

- System shows: "no resolved issues to include"

**A2: Cancel**

- Esc at any prompt cancels generation

**Postconditions:**

- Changelog content generated
- Can be saved to workspace

---

### UC-013: Export Issues

**Actor:** Developer  
**Priority:** 🟡 High  
**Preconditions:**

- Issues exist in database

**Trigger:** Developer runs "Issues: Export Issues"

**Main Flow:**

1. System prompts for format:
    - JSON (full, re-importable)
    - CSV
    - Markdown
    - GitHub Issues JSON
2. Developer selects format
3. System generates export content
4. System opens save dialog with default filename
5. Developer selects location and confirms
6. System writes file
7. System shows: "exported N issues to filename"

**Format-Specific Logic:**

**JSON:**

- Full IssuesDatabase schema
- Schema version included
- All fields preserved

**CSV:**

- Columns: id, title, type, severity, urgency, status, reporter, assignee, createdAt, updatedAt, tags
- One row per issue

**Markdown:**

- Table of issues
- Collapsible details per issue

**GitHub Issues:**

- GitHub import-compatible format
- Maps fields appropriately

**Postconditions:**

- File created at selected location

---

### UC-014: Import Issues

**Actor:** Developer  
**Priority:** 🟡 High  
**Preconditions:**

- Export file exists (JSON format)

**Trigger:** Developer runs "Issues: Import Issues"

**Main Flow:**

1. System opens file picker
2. Developer selects JSON file
3. System validates schema version
4. System parses file
5. For each issue in import:
    - If issue.id exists in current database: skip (deduplication)
    - Else: add to database
6. System generates report:
    - "Imported: N issues"
    - "Skipped (duplicates): M issues"
7. System fires events to refresh views
8. Tree shows imported issues

**Alternative Flows:**

**A1: Invalid file format**

- System shows error: "invalid or corrupted export file"

**A2: Schema version mismatch**

- System attempts migration if possible
- Or shows warning about potential data loss

**Postconditions:**

- New issues added to database
- Existing issues unchanged

---

## Use Case Priority Matrix

| Use Case | Priority | Phase |
|----------|----------|-------|
| UC-001 Create New Issue | 🟢 MVP | 1-2 |
| UC-002 View Issue Detail | 🟢 MVP | 3 |
| UC-003 Edit Issue | 🟢 MVP | 3 |
| UC-004 Link Code Selection | 🟢 MVP | 4 |
| UC-005 Search Issues | 🟢 MVP | 2 |
| UC-006 Filter Issues | 🟢 MVP | 2 |
| UC-007 Create Milestone | 🟡 High | 5 |
| UC-008 Assign to Milestone | 🟡 High | 5 |
| UC-009 Create Sprint | 🔵 Medium | 5 |
| UC-010 Start Sprint | 🔵 Medium | 5 |
| UC-011 Log Time | 🔵 Medium | 6 |
| UC-012 Generate Changelog | 🔵 Medium | 6 |
| UC-013 Export Issues | 🟡 High | 2 |
| UC-014 Import Issues | 🟡 High | 2 |

---

## Use Case Dependencies

```
UC-001 (Create Issue)
    ↓
UC-003 (Edit Issue) ←── UC-002 (View Issue)
    ↓
UC-004 (Link Code)

UC-005 (Search) ←── UC-001
UC-006 (Filter) ←── UC-001

UC-007 (Create Milestone) ←── UC-008 (Assign)
UC-009 (Create Sprint) ←── UC-010 (Start)

UC-013 (Export) ←── All other UC
UC-014 (Import) ←── UC-013 format
```
