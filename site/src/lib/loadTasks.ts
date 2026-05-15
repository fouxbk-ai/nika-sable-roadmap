import fs from 'node:fs/promises';
import path from 'node:path';
import { parseTask } from './parseTask';
import { scheduleTasks } from './schedule';
import type { RoadmapSummary, TaskBlock } from './types';

const TASK_DIR = ['30-Проект', 'задачи-для-кодекса'];

export async function loadTasks(): Promise<TaskBlock[]> {
  const siteRoot = process.cwd();
  const vaultRoot = path.resolve(siteRoot, '..');
  const taskDir = path.resolve(vaultRoot, ...TASK_DIR);
  const entries = await fs.readdir(taskDir);
  const markdownFiles = entries
    .filter((entry) => entry.startsWith('2026-') && entry.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const parsedTasks = await Promise.all(
    markdownFiles.map(async (entry) => {
      const filePath = path.join(taskDir, entry);
      const [content, stat] = await Promise.all([fs.readFile(filePath, 'utf8'), fs.stat(filePath)]);
      return parseTask({ filePath, vaultRoot, content, modified: stat.mtime });
    })
  );

  const tasks = scheduleTasks(parsedTasks);

  console.table(
    tasks.map((task) => ({
      id: task.id,
      block: task.block,
      status: task.status,
      progress: `${Math.round(task.progress * 100)}%`,
      start: task.start,
      due: task.due,
      inferred: task.inferred
    }))
  );

  return tasks;
}

export function buildSummary(tasks: TaskBlock[]): RoadmapSummary {
  const totalCheckboxes = tasks.reduce((sum, task) => sum + task.totalCheckboxes, 0);
  const doneCheckboxes = tasks.reduce((sum, task) => sum + task.doneCheckboxes, 0);

  return {
    totalBlocks: tasks.length,
    doneBlocks: tasks.filter((task) => task.status === 'done').length,
    totalCheckboxes,
    doneCheckboxes,
    progress: totalCheckboxes === 0 ? 0 : doneCheckboxes / totalCheckboxes,
    builtAt: new Date().toISOString()
  };
}
