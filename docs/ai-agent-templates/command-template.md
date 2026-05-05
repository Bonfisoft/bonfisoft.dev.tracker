# AI Agent Template: Command Component

> **Purpose**: Generate VS Code command handlers  
> **Location**: `src/commands/<feature>Commands.ts`  
> **Test Location**: `test/suite/<feature>Commands.test.ts`

---

## Required Reading

1. `docs/requirements/functional-requirements.md` - CMD-xxx requirements
2. `docs/use-cases/use-cases.md` - Command flows
3. `docs/architecture/layered-architecture.md` - Command layer responsibilities

---

## Command Layer Responsibilities

Commands are **thin adapters** that:

- Parse user input
- Delegate to services
- Handle VS Code UI interactions (QuickPick, dialogs)
- Show notifications
- Handle errors gracefully

Commands **do NOT**:

- Contain business logic (services do this)
- Access database directly
- Perform calculations

---

## Template Structure

```typescript
// src/commands/issueCommands.ts

import * as vscode from 'vscode';
import type { IssueService } from '../services/IssueService.js';
import { COMMANDS } from '../constants.js';
import { logger } from '../utils/logger.js';

export function registerIssueCommands(
  context: vscode.ExtensionContext,
  issueService: IssueService
): void {
  
  // Command: Create New Issue
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.CREATE_ISSUE,
      async () => createIssueHandler(issueService)
    )
  );
  
  // Command: View Issue
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.VIEW_ISSUE,
      async (issueId: string) => viewIssueHandler(issueService, issueId)
    )
  );
  
  // More commands...
}

// Individual handlers
async function createIssueHandler(issueService: IssueService): Promise<void> {
  try {
    // Step-by-step wizard
    // 1. Get type
    const type = await vscode.window.showQuickPick(
      ['Bug', 'Feature', 'Task', 'Enhancement', 'Question', 'Documentation', 'Other'],
      { placeHolder: 'Select issue type' }
    );
    
    if (!type) return; // User cancelled
    
    // 2. Get title
    const title = await vscode.window.showInputBox({
      prompt: 'Enter issue title',
      placeHolder: 'Short description of the issue',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Title is required';
        }
        if (value.length > 200) {
          return 'Title must not exceed 200 characters';
        }
        return null;
      }
    });
    
    if (!title) return; // User cancelled
    
    // 3. Get severity
    const severity = await vscode.window.showQuickPick(
      ['Critical', 'High', 'Medium', 'Low', 'Trivial'],
      { placeHolder: 'Select severity' }
    );
    
    if (!severity) return; // User cancelled
    
    // 4. Get urgency
    const urgency = await vscode.window.showQuickPick(
      ['Immediate', 'High', 'Normal', 'Low', 'Whenever'],
      { placeHolder: 'Select urgency' }
    );
    
    if (!urgency) return; // User cancelled
    
    // Create issue
    const issue = await issueService.createIssue({
      title: title.trim(),
      type: type.toLowerCase() as IssueType,
      severity: severity.toLowerCase() as Severity,
      urgency: urgency.toLowerCase() as Urgency
    });
    
    vscode.window.showInformationMessage(`Created issue: ${issue.title}`);
    
    // Open detail panel
    await vscode.commands.executeCommand(COMMANDS.VIEW_ISSUE, issue.id);
    
  } catch (error) {
    logger.error(`create issue command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
  }
}

async function viewIssueHandler(
  issueService: IssueService,
  issueId: string
): Promise<void> {
  try {
    const issue = await issueService.getIssue(issueId);
    
    if (!issue) {
      vscode.window.showErrorMessage('Issue not found');
      return;
    }
    
    // Open detail panel (implementation in IssueDetailPanel)
    // This would call the panel's show method
    
  } catch (error) {
    logger.error(`view issue command failed: ${error}`);
    vscode.window.showErrorMessage(`Failed to view issue: ${error}`);
  }
}
```

---

## Test Template

```typescript
// test/suite/issueCommands.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';

// Mock VS Code API
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
  },
  window: {
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn()
  }
}));

describe('issueCommands', () => {
  let mockIssueService: any;
  let mockContext: any;
  
  beforeEach(() => {
    mockIssueService = {
      createIssue: vi.fn(),
      getIssue: vi.fn(),
      updateIssue: vi.fn(),
      deleteIssue: vi.fn()
    };
    
    mockContext = {
      subscriptions: {
        push: vi.fn()
      }
    };
    
    vi.clearAllMocks();
  });
  
  describe('createIssue command', () => {
    it('should create issue when user completes wizard', async () => {
      // Mock user selections
      vscode.window.showQuickPick
        .mockResolvedValueOnce('Bug')      // Type
        .mockResolvedValueOnce('High')     // Severity
        .mockResolvedValueOnce('Normal');  // Urgency
      
      vscode.window.showInputBox.mockResolvedValue('Test Issue');
      
      mockIssueService.createIssue.mockResolvedValue({
        id: 'test-id',
        title: 'Test Issue',
        type: 'bug'
      });
      
      // Execute handler
      await createIssueHandler(mockIssueService);
      
      expect(mockIssueService.createIssue).toHaveBeenCalledWith({
        title: 'Test Issue',
        type: 'bug',
        severity: 'high',
        urgency: 'normal'
      });
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });
    
    it('should cancel when user escapes at any step', async () => {
      vscode.window.showQuickPick.mockResolvedValue(null);
      
      await createIssueHandler(mockIssueService);
      
      expect(mockIssueService.createIssue).not.toHaveBeenCalled();
    });
    
    it('should show error when service throws', async () => {
      vscode.window.showQuickPick
        .mockResolvedValueOnce('Bug')
        .mockResolvedValueOnce('High')
        .mockResolvedValueOnce('Normal');
      
      vscode.window.showInputBox.mockResolvedValue('Test');
      
      mockIssueService.createIssue.mockRejectedValue(new Error('Storage error'));
      
      await createIssueHandler(mockIssueService);
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create issue')
      );
    });
  });
});
```

---

## Key Patterns

### 1. Early Return on Cancel

```typescript
async function handler(): Promise<void> {
  const result = await vscode.window.showQuickPick(['A', 'B']);
  
  if (!result) {
    return; // User cancelled - exit early
  }
  
  // Continue with logic...
}
```

### 2. Validate in Input Box

```typescript
const input = await vscode.window.showInputBox({
  validateInput: (value) => {
    if (!value || value.trim().length === 0) {
      return 'This field is required';
    }
    if (value.length > 200) {
      return 'Must not exceed 200 characters';
    }
    return null; // Valid
  }
});
```

### 3. Error Handling Pattern

```typescript
try {
  const result = await service.operation();
  // Success UI
  vscode.window.showInformationMessage('Success!');
} catch (error) {
  logger.error(`command failed: ${error}`);
  vscode.window.showErrorMessage(`Operation failed: ${error}`);
}
```

### 4. Service Delegation

```typescript
// GOOD: Delegate to service
const issue = await issueService.createIssue(input);

// BAD: Business logic in command
const issue = {
  id: generateUUID(),
  createdAt: new Date().toISOString(),
  // ... more logic
};
await database.save(issue);
```

---

## Registration in extension.ts

```typescript
// src/extension.ts

import { registerIssueCommands } from './commands/issueCommands.js';

export function activate(context: vscode.ExtensionContext) {
  // ... setup database, services
  
  const issueService = new IssueService(database);
  
  // Register all command groups
  registerIssueCommands(context, issueService);
  registerMilestoneCommands(context, milestoneService);
  registerExportCommands(context, exportService);
  // ...
}
```

---

## Command Constants

```typescript
// src/constants.ts

export const COMMANDS = {
  // Issues
  CREATE_ISSUE: 'bonfisoft-issues.createIssue',
  VIEW_ISSUE: 'bonfisoft-issues.viewIssue',
  EDIT_ISSUE: 'bonfisoft-issues.editIssue',
  CLOSE_ISSUE: 'bonfisoft-issues.closeIssue',
  RESOLVE_ISSUE: 'bonfisoft-issues.resolveIssue',
  REOPEN_ISSUE: 'bonfisoft-issues.reopenIssue',
  DELETE_ISSUE: 'bonfisoft-issues.deleteIssue',
  
  // Search/Filter
  SEARCH_ISSUES: 'bonfisoft-issues.searchIssues',
  FILTER_ISSUES: 'bonfisoft-issues.filterIssues',
  CLEAR_FILTER: 'bonfisoft-issues.clearFilter',
  
  // Code Linking
  LINK_CODE_TO_ISSUE: 'bonfisoft-issues.linkCodeToIssue',
  
  // UI
  REFRESH_ISSUES: 'bonfisoft-issues.refreshIssues',
  GROUP_BY: 'bonfisoft-issues.groupBy',
  
  // Dashboard
  OPEN_DASHBOARD: 'bonfisoft-issues.openDashboard',
  
  // Export/Import
  EXPORT_ISSUES: 'bonfisoft-issues.exportIssues',
  IMPORT_ISSUES: 'bonfisoft-issues.importIssues',
  
  // Milestones
  CREATE_MILESTONE: 'bonfisoft-issues.createMilestone',
  EDIT_MILESTONE: 'bonfisoft-issues.editMilestone',
  DELETE_MILESTONE: 'bonfisoft-issues.deleteMilestone',
  
  // Sprints
  CREATE_SPRINT: 'bonfisoft-issues.createSprint',
  START_SPRINT: 'bonfisoft-issues.startSprint',
  COMPLETE_SPRINT: 'bonfisoft-issues.completeSprint',
  
  // Time
  LOG_TIME: 'bonfisoft-issues.logTime',
  
  // Changelog
  GENERATE_CHANGELOG: 'bonfisoft-issues.generateChangelog'
} as const;
```

---

## Package.json Contribution

```json
{
  "contributes": {
    "commands": [
      {
        "command": "bonfisoft-issues.createIssue",
        "title": "Create New Issue",
        "category": "Issues",
        "icon": "$(add)"
      },
      {
        "command": "bonfisoft-issues.viewIssue",
        "title": "View Issue",
        "category": "Issues"
      }
    ],
    "keybindings": [
      {
        "command": "bonfisoft-issues.createIssue",
        "key": "ctrl+alt+i",
        "when": "editorTextFocus"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "bonfisoft-issues.viewIssue",
          "when": "false"
        }
      ],
      "view/item/context": [
        {
          "command": "bonfisoft-issues.editIssue",
          "when": "view == bonfisoftIssues && viewItem == issue",
          "group": "1_modification@1"
        }
      ]
    }
  }
}
```

---

## Command Checklist

Before finishing, verify:

- [ ] Command ID added to `src/constants.ts`
- [ ] Command registered in `extension.ts`
- [ ] Entry added to `package.json` contributes.commands
- [ ] Keybinding added (if applicable)
- [ ] Menu contribution added (if applicable)
- [ ] Test coverage > 70%
- [ ] All user cancellations handled
- [ ] All errors show notification
- [ ] No business logic in command (delegated to service)
