# Non-Functional Requirements - BonfiSoft Development Tracker

---

## 1. Performance Requirements

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| PERF-001 | Extension activation time | < 200ms | From `activate()` call to ready state |
| PERF-002 | Issue creation response time | < 500ms | From command invocation to issue appearing in tree |
| PERF-003 | Tree view refresh time | < 300ms | After any CRUD operation, tree updates within 300ms |
| PERF-004 | Search response time | < 1s | For projects with < 1000 issues |
| PERF-005 | Detail panel load time | < 300ms | From click to fully rendered webview |
| PERF-006 | Export time | < 3s | For projects with < 1000 issues |
| PERF-007 | Memory footprint | < 100MB | Extension memory usage during normal operation |
| PERF-008 | Idle CPU usage | < 1% | When extension is not actively used |

---

## 2. Reliability Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| REL-001 | No data loss on crash | All operations write to storage immediately; no in-memory-only state |
| REL-002 | Atomic write operations | Partial writes impossible; file writes use temp + rename pattern |
| REL-003 | Recovery from corrupted storage | Detect corrupted JSON; offer to restore from backup or reset |
| REL-004 | Graceful degradation | If git extension unavailable, version features disable gracefully |
| REL-005 | Auto-save on all edits | No explicit "save" button; changes persist immediately |
| REL-006 | Backup before destructive operations | Export JSON backup before bulk import or reset |

---

## 3. Security Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| SEC-001 | No external network calls | Extension must work 100% offline; no telemetry or cloud services |
| SEC-002 | No runtime npm dependencies | Only dev dependencies allowed; reduces supply chain risk |
| SEC-003 | Workspace-scoped data | Global storage uses namespace hash to prevent cross-workspace leakage |
| SEC-004 | No shell command execution | All git operations via VS Code Git extension API only |
| SEC-005 | Input sanitization | All user inputs (titles, descriptions) sanitized for HTML/script injection |
| SEC-006 | Safe file path handling | No path traversal vulnerabilities; validate all paths |

---

## 4. Compatibility Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| COMP-001 | VS Code version | >= 1.85.0 (as specified in engines.vscode) |
| COMP-002 | Cross-platform support | Windows (Win32), Linux, WSL2 |
| COMP-003 | Remote development | Works in SSH, Containers, Codespaces, WSL |
| COMP-004 | Multi-root workspaces | Supports both shared and per-folder storage modes |
| COMP-005 | Git repositories | Works with git; gracefully handles non-git projects |
| COMP-006 | No macOS-specific code | Windows and Linux are primary targets |

---

## 5. Usability Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| USA-001 | Discoverable commands | All commands appear in Command Palette with "Issues:" prefix |
| USA-002 | Consistent keyboard shortcuts | Follow VS Code conventions; no conflicts with default bindings |
| USA-003 | Contextual actions | Right-click menus show relevant actions only |
| USA-004 | Visual feedback | Progress notifications for long operations (export, import) |
| USA-005 | Error messages | Clear, actionable error messages; no technical stack traces in UI |
| USA-006 | Offline functionality | All features work without internet connection |
| USA-007 | Accessibility | Keyboard-navigable UI; screen reader compatible webviews |

---

## 6. Maintainability Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| MAINT-001 | 100% TypeScript strict mode | No `any` types; strict null checks enabled |
| MAINT-002 | Layered architecture | Commands → Services → Database → Storage; no layer bypass |
| MAINT-003 | Interface abstractions | `IStorageProvider`, `IVersionProvider` for testability |
| MAINT-004 | Constructor injection | Services receive dependencies via constructors |
| MAINT-005 | Event-driven UI | No polling; all updates via event emitters |
| MAINT-006 | Comprehensive tests | > 80% code coverage; unit tests for all services |
| MAINT-007 | No console.log | All logging via structured logger utility |
| MAINT-008 | JSDoc documentation | Every exported function, interface, class documented |

---

## 7. Scalability Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| SCALE-001 | Issues per project | Support up to 10,000 issues with acceptable performance |
| SCALE-002 | Code links per issue | Support up to 100 code links per issue |
| SCALE-003 | Comments per issue | Support unlimited comments (paginated if needed) |
| SCALE-004 | Time logs per issue | Support unlimited time logs |
| SCALE-005 | File size | JSON storage file < 50MB for normal usage |

---

## 8. Configuration Requirements

| ID | Setting | Default | Valid Values | Description |
|----|---------|---------|--------------|-------------|
| CFG-001 | `storageLocation` | `workspace` | `workspace`, `global` | Where to store issues |
| CFG-002 | `multiRootStorage` | `shared` | `shared`, `perFolder` | Multi-root workspace mode |
| CFG-003 | `author` | `""` | Any string | Reporter name (falls back to git user) |
| CFG-004 | `defaultAssignee` | `""` | Any string | Default assignee for new issues |
| CFG-005 | `defaultIssueType` | `bug` | IssueType enum | Default type in creation wizard |
| CFG-006 | `staleIssueDays` | `30` | Positive integer | Days before issue considered stale |
| CFG-007 | `treeGroupBy` | `status` | GroupBy enum | Default tree grouping strategy |
| CFG-008 | `showResolvedIssues` | `false` | `true`, `false` | Include resolved/closed in tree |
| CFG-009 | `showStatusBar` | `true` | `true`, `false` | Show status bar item |
| CFG-010 | `codeLensEnabled` | `true` | `true`, `false` | Show CodeLens decorations |
| CFG-011 | `decorationsEnabled` | `true` | `true`, `false` | Show gutter icons |
| CFG-012 | `gitIntegration` | `true` | `true`, `false` | Enable git version detection |
| CFG-013 | `changelogGroupByType` | `true` | `true`, `false` | Group changelog by issue type |
| CFG-014 | `exportDateFormat` | `iso` | `iso`, `locale`, `short` | Date format in exports |
| CFG-015 | `sprintLengthDays` | `14` | Positive integer | Default sprint duration |

---

## 9. Quality Attributes

| Attribute | Target | Measurement Method |
|-----------|--------|-------------------|
| Test Coverage | > 80% | Vitest coverage report |
| Code Duplication | < 5% | Static analysis |
| Cyclomatic Complexity | < 10 per function | ESLint complexity rule |
| Bundle Size | < 500KB | esbuild output |
| Load Time | < 200ms | Performance API |
| Error Rate | < 0.1% | Automated testing |

---

## 10. Recovery Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| REC-001 | Automatic backup | Weekly backup of issues JSON to `.vscode/issues/backup/` |
| REC-002 | Restore from backup | Command to restore from most recent backup |
| REC-003 | Export on error | If storage corruption detected, auto-export to temp location |
| REC-004 | Graceful failure | If storage unavailable, show notification but don't crash extension |
