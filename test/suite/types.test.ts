import { describe, it, expect } from 'vitest';
import {
  IssueType,
  Severity,
  Urgency,
  Status,
  SprintStatus,
  RelationType
} from '../../src/types/issue.ts';

describe('Enums', () => {
  describe('IssueType', () => {
    it('should have all 7 issue types', () => {
      expect(IssueType.Bug).toBe('bug');
      expect(IssueType.Enhancement).toBe('enhancement');
      expect(IssueType.Feature).toBe('feature');
      expect(IssueType.Task).toBe('task');
      expect(IssueType.Question).toBe('question');
      expect(IssueType.Documentation).toBe('documentation');
      expect(IssueType.Other).toBe('other');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(IssueType);
      expect(values).toHaveLength(7);
    });
  });

  describe('Severity', () => {
    it('should have all 5 severity levels', () => {
      expect(Severity.Critical).toBe('critical');
      expect(Severity.High).toBe('high');
      expect(Severity.Medium).toBe('medium');
      expect(Severity.Low).toBe('low');
      expect(Severity.Trivial).toBe('trivial');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(Severity);
      expect(values).toHaveLength(5);
    });
  });

  describe('Urgency', () => {
    it('should have all 5 urgency levels', () => {
      expect(Urgency.Immediate).toBe('immediate');
      expect(Urgency.High).toBe('high');
      expect(Urgency.Normal).toBe('normal');
      expect(Urgency.Low).toBe('low');
      expect(Urgency.Whenever).toBe('whenever');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(Urgency);
      expect(values).toHaveLength(5);
    });
  });

  describe('Status', () => {
    it('should have all 7 status values', () => {
      expect(Status.Open).toBe('open');
      expect(Status.InProgress).toBe('in_progress');
      expect(Status.InReview).toBe('in_review');
      expect(Status.OnHold).toBe('on_hold');
      expect(Status.Closed).toBe('closed');
      expect(Status.Resolved).toBe('resolved');
      expect(Status.WontFix).toBe('wont_fix');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(Status);
      expect(values).toHaveLength(7);
    });
  });

  describe('SprintStatus', () => {
    it('should have all 4 sprint status values', () => {
      expect(SprintStatus.Planned).toBe('planned');
      expect(SprintStatus.Active).toBe('active');
      expect(SprintStatus.Completed).toBe('completed');
      expect(SprintStatus.Cancelled).toBe('cancelled');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(SprintStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('RelationType', () => {
    it('should have all 7 relation types', () => {
      expect(RelationType.Blocks).toBe('blocks');
      expect(RelationType.BlockedBy).toBe('blocked_by');
      expect(RelationType.Duplicates).toBe('duplicates');
      expect(RelationType.RelatedTo).toBe('related_to');
      expect(RelationType.ParentOf).toBe('parent_of');
      expect(RelationType.ChildOf).toBe('child_of');
      expect(RelationType.Clones).toBe('clones');
    });

    it('should have correct enum values count', () => {
      const values = Object.values(RelationType);
      expect(values).toHaveLength(7);
    });
  });
});

import type {
  Issue,
  IssueInput,
  CodeLink,
  Comment,
  TimeLog,
  IssueRelation,
  Milestone,
  Sprint,
  Template
} from '../../src/types/issue.ts';

describe('Interfaces', () => {
  describe('Issue', () => {
    it('should accept valid issue object', () => {
      const issue: Issue = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Issue',
        description: 'A test description',
        type: IssueType.Bug,
        severity: Severity.High,
        urgency: Urgency.Normal,
        status: Status.Open,
        reporter: 'test-user',
        assignee: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        reportedInVersion: null,
        fixedInVersion: null,
        tags: [],
        milestoneId: null,
        sprintId: null,
        relations: [],
        codeLinks: [],
        comments: [],
        timeLogs: []
      };

      expect(issue.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(issue.title).toBe('Test Issue');
      expect(issue.type).toBe(IssueType.Bug);
      expect(issue.tags).toEqual([]);
    });

    it('should accept issue with optional fields populated', () => {
      const issue: Issue = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Complete Issue',
        description: 'Full description',
        type: IssueType.Feature,
        severity: Severity.Critical,
        urgency: Urgency.Immediate,
        status: Status.InProgress,
        reporter: 'developer',
        assignee: 'assignee-user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        reportedInVersion: 'v1.0.0',
        fixedInVersion: null,
        tags: ['bug', 'urgent'],
        milestoneId: 'milestone-1',
        sprintId: 'sprint-1',
        relations: [],
        codeLinks: [],
        comments: [],
        timeLogs: []
      };

      expect(issue.assignee).toBe('assignee-user');
      expect(issue.tags).toHaveLength(2);
      expect(issue.reportedInVersion).toBe('v1.0.0');
    });
  });

  describe('IssueInput', () => {
    it('should accept minimal input', () => {
      const input: IssueInput = {
        title: 'New Issue',
        type: IssueType.Bug,
        severity: Severity.Medium,
        urgency: Urgency.Normal
      };

      expect(input.title).toBe('New Issue');
      expect(input.description).toBeUndefined();
      expect(input.reporter).toBeUndefined();
    });

    it('should accept complete input', () => {
      const input: IssueInput = {
        title: 'Complete Input',
        description: 'Description',
        type: IssueType.Task,
        severity: Severity.Low,
        urgency: Urgency.Low,
        reporter: 'user',
        assignee: 'other-user',
        tags: ['tag1', 'tag2']
      };

      expect(input.tags).toHaveLength(2);
    });
  });

  describe('CodeLink', () => {
    it('should have required fields', () => {
      const link: CodeLink = {
        id: 'link-id',
        filePath: 'src/file.ts',
        lineStart: 10,
        lineEnd: 15,
        context: 'function test() {}',
        createdAt: '2026-01-01T00:00:00Z'
      };

      expect(link.filePath).toBe('src/file.ts');
      expect(link.lineStart).toBe(10);
      expect(link.lineEnd).toBe(15);
    });
  });

  describe('Comment', () => {
    it('should have required fields', () => {
      const comment: Comment = {
        id: 'comment-id',
        author: 'user',
        body: 'This is a comment',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null
      };

      expect(comment.author).toBe('user');
      expect(comment.updatedAt).toBeNull();
    });

    it('should accept with updatedAt', () => {
      const comment: Comment = {
        id: 'comment-id',
        author: 'user',
        body: 'Edited comment',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z'
      };

      expect(comment.updatedAt).toBe('2026-01-02T00:00:00Z');
    });
  });

  describe('TimeLog', () => {
    it('should have required fields', () => {
      const log: TimeLog = {
        id: 'log-id',
        hours: 2.5,
        comment: 'Work done',
        loggedAt: '2026-01-01T00:00:00Z',
        loggedBy: 'developer'
      };

      expect(log.hours).toBe(2.5);
      expect(log.loggedBy).toBe('developer');
    });
  });

  describe('IssueRelation', () => {
    it('should have required fields', () => {
      const relation: IssueRelation = {
        id: 'relation-id',
        targetIssueId: 'target-issue-id',
        type: RelationType.Blocks,
        createdAt: '2026-01-01T00:00:00Z'
      };

      expect(relation.type).toBe(RelationType.Blocks);
      expect(relation.targetIssueId).toBe('target-issue-id');
    });
  });

  describe('Milestone', () => {
    it('should have required fields', () => {
      const milestone: Milestone = {
        id: 'milestone-id',
        name: 'v1.0.0',
        description: 'First release',
        dueDate: '2026-06-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      };

      expect(milestone.name).toBe('v1.0.0');
      expect(milestone.dueDate).toBe('2026-06-01');
    });

    it('should accept null dueDate', () => {
      const milestone: Milestone = {
        id: 'milestone-id',
        name: 'Backlog',
        description: '',
        dueDate: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      };

      expect(milestone.dueDate).toBeNull();
    });
  });

  describe('Sprint', () => {
    it('should have required fields', () => {
      const sprint: Sprint = {
        id: 'sprint-id',
        name: 'Sprint 1',
        goal: 'Complete core features',
        startDate: '2026-01-01',
        endDate: '2026-01-14',
        status: SprintStatus.Planned,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      };

      expect(sprint.status).toBe(SprintStatus.Planned);
    });
  });

  describe('Template', () => {
    it('should have required fields', () => {
      const template: Template = {
        id: 'template-id',
        name: 'Bug Report',
        description: 'Standard bug template',
        defaultValues: {
          type: IssueType.Bug,
          severity: Severity.High
        },
        isBuiltIn: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      };

      expect(template.isBuiltIn).toBe(true);
      expect(template.defaultValues.type).toBe(IssueType.Bug);
    });
  });
});
