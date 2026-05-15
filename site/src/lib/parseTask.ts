import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { ListItem, PhrasingContent, Root } from 'mdast';
import type { ParsedTaskBlock, RawStatus, Status } from './types';

type ParseTaskOptions = {
  filePath: string;
  vaultRoot: string;
  content: string;
  modified: Date;
};

const DEPENDENCY_PATTERN = /блок-(\d+)/;

export function parseTask({ filePath, vaultRoot, content, modified }: ParseTaskOptions): ParsedTaskBlock {
  const parsed = matter(content);
  const tree = remark().use(remarkParse).use(remarkGfm).parse(parsed.content) as Root;

  const title = extractTitle(tree) ?? path.basename(filePath, '.md');
  const { totalCheckboxes, doneCheckboxes } = countCheckboxes(tree);
  const progress = totalCheckboxes === 0 ? 0 : doneCheckboxes / totalCheckboxes;
  const block = numberField(parsed.data['блок'], 'блок', filePath);
  const created = dateField(parsed.data.created, 'created', filePath);
  const rawStatus = stringField(parsed.data.status, 'status', filePath) as RawStatus;

  return {
    id: path.basename(filePath, '.md'),
    block,
    title,
    rawStatus,
    status: normalizeStatus(rawStatus, filePath),
    dependsOn: parseDependencies(parsed.data['зависит-от'], filePath),
    created,
    start: optionalDateField(parsed.data.start, 'start', filePath),
    due: optionalDateField(parsed.data.due, 'due', filePath),
    totalCheckboxes,
    doneCheckboxes,
    progress,
    vaultPath: path.relative(vaultRoot, filePath),
    modified: toIsoDate(modified)
  };
}

function extractTitle(tree: Root): string | undefined {
  let title: string | undefined;

  visit(tree, 'heading', (node) => {
    if (title || node.depth !== 1) return;
    title = node.children
      .map((child: PhrasingContent) => ('value' in child ? String(child.value) : ''))
      .join('')
      .trim();
  });

  return title;
}

function countCheckboxes(tree: Root): { totalCheckboxes: number; doneCheckboxes: number } {
  let totalCheckboxes = 0;
  let doneCheckboxes = 0;

  visit(tree, 'listItem', (node: ListItem) => {
    if (typeof node.checked !== 'boolean') return;
    totalCheckboxes += 1;
    if (node.checked) doneCheckboxes += 1;
  });

  return { totalCheckboxes, doneCheckboxes };
}

function normalizeStatus(status: string, filePath: string): Status {
  if (status === 'открыта') return 'todo';
  if (status === 'в работе') return 'in_progress';
  if (status === 'выполнена' || status === 'сделана') return 'done';
  if (status === 'заморожена') return 'frozen';
  throw new Error(`Неизвестный status "${status}" в ${filePath}`);
}

function parseDependencies(value: unknown, filePath: string): number[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Поле "зависит-от" должно быть массивом в ${filePath}`);
  }

  return value.map((item) => {
    const match = String(item).match(DEPENDENCY_PATTERN);
    if (!match) throw new Error(`Не могу распарсить зависимость "${String(item)}" в ${filePath}`);
    return Number(match[1]);
  });
}

function stringField(value: unknown, name: string, filePath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Поле "${name}" обязательно и должно быть строкой в ${filePath}`);
  }
  return value;
}

function numberField(value: unknown, name: string, filePath: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Поле "${name}" обязательно и должно быть числом в ${filePath}`);
  }
  return value;
}

function dateField(value: unknown, name: string, filePath: string): string {
  const date = optionalDateField(value, name, filePath);
  if (!date) throw new Error(`Поле "${name}" обязательно в ${filePath}`);
  return date;
}

function optionalDateField(value: unknown, name: string, filePath: string): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw new Error(`Поле "${name}" должно быть датой YYYY-MM-DD в ${filePath}`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
