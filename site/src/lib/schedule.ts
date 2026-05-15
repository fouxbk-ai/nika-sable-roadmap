import type { ParsedTaskBlock, TaskBlock } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function scheduleTasks(tasks: ParsedTaskBlock[]): TaskBlock[] {
  const byBlock = new Map(tasks.map((task) => [task.block, task]));

  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      if (!byBlock.has(dependency)) {
        throw new Error(`Блок ${task.block} зависит от несуществующего блока ${dependency}`);
      }
    }
  }

  const orderedBlocks = topologicalSort(tasks);
  const minCreated = minDate(tasks.map((task) => task.created));
  const scheduled = new Map<number, TaskBlock>();

  for (const block of orderedBlocks) {
    const task = byBlock.get(block);
    if (!task) continue;

    const hasManualDate = Boolean(task.start || task.due);
    const dependencyDueDates = task.dependsOn.map((dependency) => {
      const dependencyTask = scheduled.get(dependency);
      if (!dependencyTask?.due) throw new Error(`Не рассчитан due для блока ${dependency}`);
      return dependencyTask.due;
    });

    const duration = task.status === 'done' ? Math.max(1, daysBetween(task.created, task.modified)) : 1;
    const inferredStart = dependencyDueDates.length > 0 ? addDays(maxDate(dependencyDueDates), 1) : minCreated;
    const start = task.start ?? (task.due ? addDays(task.due, -duration) : inferredStart);
    const due = task.due ?? addDays(start, duration);

    scheduled.set(block, {
      ...task,
      start,
      due,
      inferred: !hasManualDate
    });
  }

  return [...scheduled.values()].sort((a, b) => a.block - b.block);
}

function topologicalSort(tasks: ParsedTaskBlock[]): number[] {
  const visited = new Set<number>();
  const visiting = new Set<number>();
  const result: number[] = [];
  const byBlock = new Map(tasks.map((task) => [task.block, task]));

  function visitBlock(block: number, trail: number[]) {
    if (visited.has(block)) return;
    if (visiting.has(block)) {
      const cycleStart = trail.indexOf(block);
      const cycle = [...trail.slice(cycleStart), block].join(' → ');
      throw new Error(`Цикл зависимостей между блоками: ${cycle}`);
    }

    const task = byBlock.get(block);
    if (!task) throw new Error(`Неизвестный блок ${block}`);

    visiting.add(block);
    for (const dependency of task.dependsOn) visitBlock(dependency, [...trail, block]);
    visiting.delete(block);
    visited.add(block);
    result.push(block);
  }

  for (const task of tasks.sort((a, b) => a.block - b.block)) visitBlock(task.block, []);
  return result;
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

function addDays(date: string, days: number): string {
  const next = parseDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDate(next);
}

function minDate(dates: string[]): string {
  return formatDate(new Date(Math.min(...dates.map((date) => parseDate(date).getTime()))));
}

function maxDate(dates: string[]): string {
  return formatDate(new Date(Math.max(...dates.map((date) => parseDate(date).getTime()))));
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
