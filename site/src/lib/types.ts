export type Status = 'todo' | 'in_progress' | 'done' | 'frozen';

export type RawStatus = 'открыта' | 'в работе' | 'выполнена' | 'сделана' | 'заморожена' | string;

export type Dependency = {
  from: number;
  to: number;
};

export type TaskBlock = {
  id: string;
  block: number;
  title: string;
  rawStatus: RawStatus;
  status: Status;
  dependsOn: number[];
  created: string;
  start?: string;
  due?: string;
  inferred: boolean;
  totalCheckboxes: number;
  doneCheckboxes: number;
  progress: number;
  vaultPath: string;
  modified: string;
};

export type ParsedTaskBlock = Omit<TaskBlock, 'start' | 'due' | 'inferred'> & {
  start?: string;
  due?: string;
};

export type RoadmapSummary = {
  totalBlocks: number;
  doneBlocks: number;
  totalCheckboxes: number;
  doneCheckboxes: number;
  progress: number;
  builtAt: string;
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'открыта',
  in_progress: 'в работе',
  done: 'выполнена',
  frozen: 'заморожена'
};

export const STATUS_COLORS: Record<Status, string> = {
  todo: '#64748b',
  in_progress: '#f59e0b',
  done: '#10b981',
  frozen: '#3f3f46'
};
