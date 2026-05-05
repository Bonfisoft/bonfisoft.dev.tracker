# Functional Requirements - BonfiSoft Development Tracker

> **Priority Legend**: 🟢 MVP (Must Have) | 🟡 High (Should Have) | 🔵 Medium (Could Have) | ⚪ Low (Won't Have in MVP)

---

## Table of Contents

1. [Core Issue Management](#1-core-issue-management)
2. [Issue Organization](#2-issue-organization)
3. [Developer Workflow](#3-developer-workflow)
4. [VS Code Integration](#4-vs-code-integration)
5. [Import/Export](#5-importexport)
6. [Search & Filter](#6-search--filter)

---

## 1. Core Issue Management

### 1.1 Issue Types

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| ISSUE-TYPE-001 | System must support 7 issue types: Bug, Enhancement, Feature, Task, Question, Documentation, Other | 🟢 MVP | All 7 types creatable, selectable in UI, stored in type field |
| ISSUE-TYPE-002 | Default type for new issues must be configurable | 🟡 High | Setting `bonfisoft-issues.defaultIssueType` changes pre-selected type in creation wizard |

### 1.2 Issue Severity

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| SEVERITY-001 | System must support 5 severity levels: Critical, High, Medium, Low, Trivial | 🟢 MVP | All 5 levels selectable; Critical issues trigger status bar indicator |
| SEVERITY-002 | Severity must be changeable after issue creation | 🟢 MVP | Edit flow allows severity modification; change logged in history |

### 1.3 Issue Urgency

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| URGENCY-001 | System must support 5 urgency levels: Immediate, High, Normal, Low, Whenever | 🟢 MVP | All 5 levels selectable; default is Normal |
| URGENCY-002 | Urgency must be editable after creation | 🟢 MVP | Same edit flow as severity |

### 1.4 Issue Status Workflow

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| STATUS-001 | System must support 7 statuses: Open, In Progress, In Review, On Hold, Closed, Resolved, Wont Fix | 🟢 MVP | Status transitions enforced; UI reflects current status |
| STATUS-002 | Status must be changeable via dropdown in detail panel | 🟢 MVP | Click status field → dropdown appears → select new status → auto-save |
| STATUS-003 | Resolved status requires "Fixed In" version selection | 🟢 MVP | When resolving, user picks from available git tags |
| STATUS-004 | Status change must update `updatedAt` timestamp | 🟢 MVP | Every status change records timestamp |

### 1.5 Issue Fields

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FIELD-001 | Each issue must have: id (auto), title (required), description (markdown), type, severity, urgency, status, reporter, assignee, createdAt, updatedAt | 🟢 MVP | All fields present in data model; required fields enforced |
| FIELD-002 | Optional fields: tags (array), comments (array), timeLogs (array), codeLinks (array), relations (array), reportedInVersion, fixedInVersion | 🟢 MVP | Optional fields default to empty arrays/null |
| FIELD-003 | Title must be editable after creation (Lesson from previous project) | 🟢 MVP | Detail panel has inline edit for title; changes persist |
| FIELD-004 | Description must support full Markdown with preview | 🟢 MVP | Markdown rendered in detail panel; edit mode shows raw markdown |
| FIELD-005 | Assignee must be editable via click-to-edit | 🟢 MVP | Click assignee field → text input → save on blur/enter |

### 1.6 Issue Lifecycle

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| LIFECYCLE-001 | Create issue via QuickPick wizard (Ctrl+Alt+I) | 🟢 MVP | Multi-step wizard: type → title → severity → urgency → confirm |
| LIFECYCLE-002 | Create issue captures current git tag as "Reported In" | 🟢 MVP | If git tag exists, auto-populates field; user can override |
| LIFECYCLE-003 | View issue in detail panel | 🟢 MVP | Click issue in sidebar → opens webview panel with full details |
| LIFECYCLE-004 | Edit any issue field after creation | 🟢 MVP | Every editable field has click-to-edit or explicit edit button |
| LIFECYCLE-005 | Delete issue with confirmation | 🟢 MVP | Right-click → Delete → Confirm dialog → remove from storage |
| LIFECYCLE-006 | Close issue (non-resolved terminal state) | 🟢 MVP | Status change to Closed; no version required |
| LIFECYCLE-007 | Resolve issue (requires "Fixed In" version) | 🟢 MVP | Prompts for version from git tags; updates fixedInVersion field |
| LIFECYCLE-008 | Reopen closed/resolved issue | 🟢 MVP | Sets status back to Open; clears fixedInVersion |

---

## 2. Issue Organization

### 2.1 Tags

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| TAG-001 | Free-form text tags on issues | 🟡 High | Add/remove tags in detail panel; filter by tags in sidebar |
| TAG-002 | Tag auto-suggestions based on existing tags | 🔵 Medium | When typing tag, suggest existing tags from project |

### 2.2 Milestones

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| MILESTONE-001 | Create milestone with name and optional due date | 🟡 High | Command palette: "Issues: Create Milestone" |
| MILESTONE-002 | Assign issues to milestone | 🟡 High | Dropdown in issue detail or drag-drop in tree |
| MILESTONE-003 | View milestone progress (open/total count) | 🟡 High | Milestone tree shows "5/12" format |
| MILESTONE-004 | Edit milestone name/due date | 🟡 High | Right-click milestone → Edit |
| MILESTONE-005 | Delete empty milestone | 🟡 High | Cannot delete milestone with assigned issues |

### 2.3 Sprints

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| SPRINT-001 | Create sprint with name, start date, end date | 🔵 Medium | Default end date = start + 14 days (configurable) |
| SPRINT-002 | Sprint statuses: Planned, Active, Completed, Cancelled | 🔵 Medium | Status workflow enforced |
| SPRINT-003 | Start sprint advances status to Active | 🔵 Medium | Only one sprint can be active at a time per workspace |
| SPRINT-004 | Complete sprint advances status to Completed | 🔵 Medium | On completion, prompt for incomplete issues (move to next sprint or backlog) |
| SPRINT-005 | Assign issues to sprint | 🔵 Medium | Same interaction pattern as milestones |

### 2.4 Relations

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| RELATION-001 | Support relation types: blocks, blocked-by, duplicates, related-to, parent-of, child-of, clones | 🔵 Medium | Create relation from issue context menu |
| RELATION-002 | Bidirectional relations auto-created | 🔵 Medium | Creating "blocks" also creates "blocked-by" on target |
| RELATION-003 | Navigate to related issue from detail panel | 🔵 Medium | Related issue IDs are clickable links |

---

## 3. Developer Workflow

### 3.1 Code Linking

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CODE-LINK-001 | Link code selection to issue (Ctrl+Alt+L) | 🟢 MVP | Select lines → run command → pick issue → link stored with file path and line range |
| CODE-LINK-002 | Show gutter decoration on linked lines | 🟢 MVP | 🔗 icon appears in gutter at linked lines |
| CODE-LINK-003 | Show CodeLens above linked lines | 🟢 MVP | Inline text: "[🔗 Issue #N: <title>]" above linked lines |
| CODE-LINK-004 | Click CodeLens to open issue detail | 🟢 MVP | CodeLens is clickable; opens issue panel |
| CODE-LINK-005 | Multiple code links per issue | 🟢 MVP | Issue can reference multiple file/line locations |
| CODE-LINK-006 | Remove code link from issue detail | 🟢 MVP | Each link in detail panel has "X" to remove |
| CODE-LINK-007 | Navigate from issue detail to code | 🟢 MVP | Click file path in link → opens file at line |

### 3.2 Time Tracking

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| TIME-001 | Log time with hours and optional comment | 🔵 Medium | Command: "Issues: Log Time" or right-click issue |
| TIME-002 | View time logs per issue | 🔵 Medium | Time tracking tree view shows per-issue totals |
| TIME-003 | Time log entry: date, hours, comment | 🔵 Medium | Stored in issue.timeLogs array |
| TIME-004 | View total hours in dashboard | 🔵 Medium | KPI card shows total logged hours |

### 3.3 Templates

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| TEMPLATE-001 | Pre-defined templates: Bug, Feature, Task | 🔵 Medium | Ship with 3 templates; selectable on creation |
| TEMPLATE-002 | Custom template creation | 🔵 Medium | Save current issue as template; name it |
| TEMPLATE-003 | Template applies pre-filled fields | 🔵 Medium | Selecting template pre-fills type, severity, description, tags |
| TEMPLATE-004 | Create from template command | 🔵 Medium | "Issues: Create from Template" lists available templates |

### 3.4 Changelog Generation

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CHANGELOG-001 | Generate changelog from resolved issues | 🔵 Medium | Command: "Issues: Generate Changelog" |
| CHANGELOG-002 | Group by version and optionally by type | 🔵 Medium | Configurable: `bonfisoft-issues.changelogGroupByType` |
| CHANGELOG-003 | Output formats: Markdown, plain text | 🔵 Medium | User selects format; opens in editor |
| CHANGELOG-004 | Include only Resolved/Closed with "Fixed In" | 🔵 Medium | Filters to issues with fixedInVersion set |

---

## 4. VS Code Integration

### 4.1 Sidebar Views

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| SIDEBAR-001 | Primary sidebar with 4 views: Issues, Milestones, Sprints, Time Tracking | 🟢 MVP | Views registered in package.json; visible in activity bar |
| SIDEBAR-002 | Issues tree view with grouping | 🟢 MVP | Group by: status (default), type, severity, milestone, sprint, assignee |
| SIDEBAR-003 | Tree toolbar actions | 🟢 MVP | + (create), filter, group-by, refresh icons |
| SIDEBAR-004 | Right-click context menu on issues | 🟢 MVP | View, Edit, Close, Resolve, Reopen, Delete, Link Code, Log Time, Copy ID |
| SIDEBAR-005 | Expand/collapse tree nodes | 🟢 MVP | Standard VS Code tree behavior |

### 4.2 Status Bar

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| STATUSBAR-001 | Show open issue count | 🟢 MVP | Format: "Issues: 12" |
| STATUSBAR-002 | Show critical issue count | 🟢 MVP | Format: "⚠️ 3 Critical" when critical issues exist |
| STATUSBAR-003 | Red background when critical issues exist | 🟢 MVP | Background color changes to red |
| STATUSBAR-004 | Click to open dashboard | 🟢 MVP | Click status bar item → opens dashboard panel |
| STATUSBAR-005 | Configurable visibility | 🟢 MVP | Setting: `bonfisoft-issues.showStatusBar` |

### 4.3 Commands

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CMD-001 | Create New Issue (Ctrl+Alt+I) | 🟢 MVP | Opens QuickPick wizard |
| CMD-002 | Search Issues (Ctrl+Alt+Shift+F) | 🟢 MVP | Opens QuickPick with full-text search |
| CMD-003 | Link Code to Issue (Ctrl+Alt+L) | 🟢 MVP | Requires selection; prompts for issue |
| CMD-004 | Open Dashboard (Ctrl+Alt+D) | 🟢 MVP | Opens webview dashboard |
| CMD-005 | View Issue | 🟢 MVP | Opens detail panel for selected issue |
| CMD-006 | Edit Issue | 🟢 MVP | Opens detail panel in edit mode |
| CMD-007 | Close Issue | 🟢 MVP | Sets status to Closed |
| CMD-008 | Resolve Issue | 🟢 MVP | Prompts for version; sets status to Resolved |
| CMD-009 | Reopen Issue | 🟢 MVP | Sets status to Open |
| CMD-010 | Delete Issue | 🟢 MVP | Confirmation dialog; then delete |
| CMD-011 | Filter Issues | 🟢 MVP | QuickPick with filter options |
| CMD-012 | Clear Filter | 🟢 MVP | Removes active filter |
| CMD-013 | Group By | 🟢 MVP | QuickPick to change grouping strategy |
| CMD-014 | Export Issues | 🟡 High | QuickPick for format (JSON, CSV, Markdown, GitHub) |
| CMD-015 | Import Issues | 🟡 High | File picker for JSON import |
| CMD-016 | Generate Changelog | 🔵 Medium | Opens format picker; generates changelog |
| CMD-017 | Log Time | 🔵 Medium | Prompts for issue, hours, comment |
| CMD-018 | Open Current Version Issues | 🟡 High | Filters to issues matching current git tag |
| CMD-019 | Create Milestone | 🟡 High | Prompts for name and optional due date |
| CMD-020 | Create Sprint | 🔵 Medium | Prompts for name, dates |
| CMD-021 | Start Sprint | 🔵 Medium | Advances sprint to Active status |
| CMD-022 | Complete Sprint | 🔵 Medium | Advances sprint to Completed status |

### 4.4 Webview Panels

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| WEBVIEW-001 | Issue Detail Panel | 🟢 MVP | Webview showing all issue fields; editable inline |
| WEBVIEW-002 | Dashboard Panel | 🔵 Medium | Webview with KPI cards and charts |
| WEBVIEW-003 | Single instance per issue type | 🟢 MVP | Only one detail panel per issue; updates if already open |
| WEBVIEW-004 | Real-time updates | 🟢 MVP | Changes in one panel reflect in others and tree view |

---

## 5. Import/Export

### 5.1 Export Formats

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| EXPORT-001 | Export to JSON (full, re-importable) | 🟡 High | Contains all fields; schema version included |
| EXPORT-002 | Export to CSV | 🔵 Medium | Spreadsheet-compatible; selectable fields |
| EXPORT-003 | Export to Markdown | 🔵 Medium | Formatted table + details per issue |
| EXPORT-004 | Export to GitHub Issues JSON | 🔵 Medium | Compatible with GitHub bulk import format |
| EXPORT-005 | Configurable date format in exports | 🔵 Medium | Setting: `bonfisoft-issues.exportDateFormat` |

### 5.2 Import

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| IMPORT-001 | Import from JSON export | 🟡 High | File picker; validates schema version |
| IMPORT-002 | Deduplication by UUID | 🟡 High | Existing issues (by UUID) skipped, not overwritten |
| IMPORT-003 | Import report | 🟡 High | Shows count of imported vs skipped |
| IMPORT-004 | Schema migration for older versions | ⚪ Low | If schema differs, migrate on import |

---

## 6. Search & Filter

### 6.1 Full-Text Search

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| SEARCH-001 | Search across title, description, tags, comments, assignee | 🟢 MVP | Command: "Issues: Search" opens QuickPick with ranked results |
| SEARCH-002 | Ranked results by relevance | 🟢 MVP | Title matches rank higher than description |
| SEARCH-003 | Click result to open detail | 🟢 MVP | Selecting result opens issue detail |
| SEARCH-004 | Search from QuickPick | 🟢 MVP | Type to filter results dynamically |

### 6.2 Filtering

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FILTER-001 | Filter by status | 🟢 MVP | Multi-select: include/exclude specific statuses |
| FILTER-002 | Filter by type | 🟢 MVP | Multi-select issue types |
| FILTER-003 | Filter by severity | 🟢 MVP | Multi-select severity levels |
| FILTER-004 | Filter by assignee | 🟢 MVP | Text match on assignee field |
| FILTER-005 | Filter by tags | 🔵 Medium | Multi-select from available tags |
| FILTER-006 | Filter by milestone | 🟡 High | Select from existing milestones |
| FILTER-007 | Filter by sprint | 🔵 Medium | Select from existing sprints |
| FILTER-008 | Combined filters | 🟡 High | Multiple filters apply together (AND logic) |
| FILTER-009 | Clear all filters | 🟢 MVP | Command and toolbar button to reset |
| FILTER-010 | Show resolved issues toggle | 🟢 MVP | Setting: `bonfisoft-issues.showResolvedIssues` |

### 6.3 Stale Detection

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| STALE-001 | Flag issues open > 30 days without activity | 🔵 Medium | Visual indicator in tree (e.g., 🕐 icon) |
| STALE-002 | Configurable stale threshold | 🔵 Medium | Setting: `bonfisoft-issues.staleIssueDays` |
| STALE-003 | Stale filter in sidebar | 🔵 Medium | Filter option to show only stale issues |

---

## Priority Summary

| Priority | Count | Categories |
|----------|-------|------------|
| 🟢 MVP | 48 | Core functionality for first release |
| 🟡 High | 14 | Important but not blocking |
| 🔵 Medium | 24 | Nice to have |
| ⚪ Low | 1 | Future consideration |

**Total: 87 Functional Requirements**
