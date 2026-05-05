/**
 * Issue tracking types for BonfiSoft Development Tracker
 * @module types/issue
 */

/** Issue type enumeration */
export enum IssueType {
  Bug = 'bug',
  Enhancement = 'enhancement',
  Feature = 'feature',
  Task = 'task',
  Question = 'question',
  Documentation = 'documentation',
  Other = 'other'
}

/** Severity level enumeration */
export enum Severity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Trivial = 'trivial'
}

/** Urgency level enumeration */
export enum Urgency {
  Immediate = 'immediate',
  High = 'high',
  Normal = 'normal',
  Low = 'low',
  Whenever = 'whenever'
}

/** Issue status enumeration */
export enum Status {
  Open = 'open',
  InProgress = 'in_progress',
  InReview = 'in_review',
  OnHold = 'on_hold',
  Closed = 'closed',
  Resolved = 'resolved',
  WontFix = 'wont_fix'
}

/** Sprint status enumeration */
export enum SprintStatus {
  Planned = 'planned',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

/** Relation type enumeration */
export enum RelationType {
  Blocks = 'blocks',
  BlockedBy = 'blocked_by',
  Duplicates = 'duplicates',
  RelatedTo = 'related_to',
  ParentOf = 'parent_of',
  ChildOf = 'child_of',
  Clones = 'clones'
}

/** UUID type alias */
export type UUID = string;

/** ISO 8601 timestamp type alias */
export type ISO8601 = string;

/**
 * Code link - connects an issue to a specific code location
 */
export interface CodeLink {
  id: UUID;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  context: string;
  createdAt: ISO8601;
}

/**
 * Comment on an issue
 */
export interface Comment {
  id: UUID;
  author: string;
  body: string;
  createdAt: ISO8601;
  updatedAt: ISO8601 | null;
}

/**
 * Time log entry for an issue
 */
export interface TimeLog {
  id: UUID;
  hours: number;
  comment: string;
  loggedAt: ISO8601;
  loggedBy: string;
}

/**
 * Issue relation - links two issues together
 */
export interface IssueRelation {
  id: UUID;
  targetIssueId: UUID;
  type: RelationType;
  createdAt: ISO8601;
}

/**
 * Milestone for grouping issues
 */
export interface Milestone {
  id: UUID;
  name: string;
  description: string;
  dueDate: string | null; // YYYY-MM-DD format
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Sprint for agile workflow
 */
export interface Sprint {
  id: UUID;
  name: string;
  goal: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  status: SprintStatus;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Template default values
 */
export interface TemplateDefaults {
  type?: IssueType;
  severity?: Severity;
  urgency?: Urgency;
  description?: string;
  tags?: string[];
}

/**
 * Issue template
 */
export interface Template {
  id: UUID;
  name: string;
  description: string;
  defaultValues: TemplateDefaults;
  isBuiltIn: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Input for creating a new issue
 */
export interface IssueInput {
  title: string;
  description?: string;
  type: IssueType;
  severity: Severity;
  urgency: Urgency;
  status?: Status;
  reporter?: string;
  assignee?: string | null;
  tags?: string[];
}

/**
 * Core issue entity
 */
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
  createdAt: ISO8601;
  updatedAt: ISO8601;
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

/**
 * Complete database structure
 */
export interface IssuesDatabase {
  schemaVersion: string;
  project: {
    name: string;
    createdAt: ISO8601;
  };
  issues: Issue[];
  milestones: Milestone[];
  sprints: Sprint[];
  templates: Template[];
  metadata: {
    lastExportAt: ISO8601 | null;
    issueCounter: number;
  };
}
