import { scaleTime } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { timeFormatLocale } from 'd3-time-format';
import type { Status, TaskBlock } from '../lib/types';

const COLORS: Record<Status, string> = {
  todo: '#64748b',
  in_progress: '#f59e0b',
  done: '#10b981',
  frozen: '#3f3f46'
};

const LABELS: Record<Status, string> = {
  todo: 'открыта',
  in_progress: 'в работе',
  done: 'выполнена',
  frozen: 'заморожена'
};

const ruLocale = timeFormatLocale({
  dateTime: '%A, %e %B %Y г. %X',
  date: '%d.%m.%Y',
  time: '%H:%M:%S',
  periods: ['', ''],
  days: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  shortDays: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  shortMonths: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
});

type RenderState = {
  zoom: number;
};

type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>;

export function renderGanttChart(): void {
  const root = document.querySelector<HTMLElement>('#gantt-root');
  if (!root) return;

  const tasks = JSON.parse(root.dataset.tasks ?? '[]') as TaskBlock[];
  const state: RenderState = { zoom: 1 };
  const draw = () => drawChart(root, tasks, state);

  draw();
  window.addEventListener('resize', draw);

  document.querySelectorAll<HTMLButtonElement>('.gantt-zoom').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.zoom;
      if (action === 'in') state.zoom = Math.min(3, state.zoom + 0.25);
      if (action === 'out') state.zoom = Math.max(0.6, state.zoom - 0.25);
      if (action === 'fit') state.zoom = 1;
      draw();
    });
  });
}

function drawChart(root: HTMLElement, tasks: TaskBlock[], state: RenderState): void {
  root.replaceChildren();
  if (tasks.length === 0) return;

  const margin = { top: 72, right: 180, bottom: 48, left: 250 };
  const rowHeight = 44;
  const chartHeight = tasks.length * rowHeight;
  const width = Math.max(root.clientWidth, 980) * state.zoom;
  const height = Math.max(600, margin.top + chartHeight + margin.bottom);
  const dates = tasks.flatMap((task) => [new Date(`${task.start}T00:00:00`), new Date(`${task.due}T00:00:00`)]);
  const minDate = new Date(Math.min(...dates.map(Number)) - 2 * 24 * 60 * 60 * 1000);
  const maxDate = new Date(Math.max(...dates.map(Number)) + 3 * 24 * 60 * 60 * 1000);
  const x = scaleTime<number, number>().domain([minDate, maxDate]).range([margin.left, width - margin.right]);
  const svg = select(root).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

  const defs = svg.append('defs');
  Object.entries(COLORS).forEach(([status, color]) => {
    const gradient = defs.append('linearGradient').attr('id', `gradient-${status}`).attr('x1', '0%').attr('x2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', shade(color, -34));
    gradient.append('stop').attr('offset', '100%').attr('stop-color', color);
  });
  defs
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 8)
    .attr('refY', 5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', '#94a3b8');

  drawGrid(svg, x, minDate, maxDate, margin, chartHeight, width);
  drawRows(svg, tasks, x, margin, rowHeight);
  drawDependencies(svg, tasks, x, margin, rowHeight);
}

function drawGrid(svg: SvgSelection, x: ReturnType<typeof scaleTime<number, number>>, minDate: Date, maxDate: Date, margin: { top: number; bottom: number }, chartHeight: number, width: number): void {
  const format = ruLocale.format('%-d %b');
  const cursor = new Date(minDate);
  cursor.setDate(cursor.getDate() + ((1 + 7 - cursor.getDay()) % 7));
  while (cursor <= maxDate) {
    const xPos = x(cursor);
    svg.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', margin.top - 28).attr('y2', margin.top + chartHeight).attr('stroke', 'rgba(255,255,255,0.07)');
    svg.append('text').attr('x', xPos + 6).attr('y', margin.top - 38).attr('fill', '#9ca3af').attr('font-size', 12).attr('font-family', 'JetBrains Mono').text(format(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today >= minDate && today <= maxDate) {
    const xPos = x(today);
    svg.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', margin.top - 48).attr('y2', margin.top + chartHeight).attr('stroke', '#ef4444').attr('stroke-width', 1.5);
    svg.append('text').attr('x', xPos + 8).attr('y', margin.top - 54).attr('fill', '#f87171').attr('font-size', 12).attr('font-weight', 700).text('сегодня');
  }

  svg.append('line').attr('x1', 0).attr('x2', width).attr('y1', margin.top - 16).attr('y2', margin.top - 16).attr('stroke', 'rgba(255,255,255,0.08)');
}

function drawRows(svg: SvgSelection, tasks: TaskBlock[], x: ReturnType<typeof scaleTime<number, number>>, margin: { top: number; left: number }, rowHeight: number): void {
  const tooltip = document.querySelector<HTMLElement>('#gantt-tooltip');

  tasks.forEach((task, index) => {
    const y = margin.top + index * rowHeight;
    const barY = y + 8;
    const startX = x(new Date(`${task.start}T00:00:00`));
    const endX = x(new Date(`${task.due}T00:00:00`));
    const width = Math.max(18, endX - startX);
    const progressWidth = Math.max(0, width * task.progress);
    const percent = Math.round(task.progress * 100);

    svg.append('line').attr('x1', 0).attr('x2', '100%').attr('y1', y + rowHeight).attr('y2', y + rowHeight).attr('stroke', 'rgba(255,255,255,0.045)');
    svg.append('text').attr('x', 24).attr('y', y + 28).attr('fill', '#e5e7eb').attr('font-size', 13).attr('font-weight', 700).text(`Блок ${task.block}`);
    svg.append('text').attr('x', 88).attr('y', y + 28).attr('fill', '#9ca3af').attr('font-size', 12).text(truncate(task.title.replace(/^Блок \d+\.\s*/, ''), 42));

    const group = svg.append('g').attr('class', 'gantt-task').style('cursor', 'pointer');
    group
      .append('rect')
      .attr('x', startX)
      .attr('y', barY)
      .attr('width', width)
      .attr('height', 28)
      .attr('rx', 6)
      .attr('fill', `url(#gradient-${task.status})`)
      .attr('fill-opacity', task.inferred ? 0.58 : 0.9)
      .attr('stroke', COLORS[task.status])
      .attr('stroke-dasharray', task.inferred ? '5 4' : null)
      .attr('stroke-width', task.inferred ? 1.3 : 0.5);
    group.append('rect').attr('x', startX).attr('y', barY).attr('width', progressWidth).attr('height', 28).attr('rx', 6).attr('fill', shade(COLORS[task.status], -42)).attr('fill-opacity', 0.72);
    group.append('text').attr('x', startX + width + 8).attr('y', barY + 19).attr('fill', '#d1d5db').attr('font-size', 12).attr('font-family', 'JetBrains Mono').text(`${percent}%`);

    group
      .on('mouseenter', () => showTooltip(tooltip, task))
      .on('mousemove', (event: MouseEvent) => moveTooltip(tooltip, event))
      .on('mouseleave', () => hideTooltip(tooltip))
      .on('click', () => window.open(`obsidian://open?vault=Obsidian%20Vault&file=${encodeURIComponent(task.vaultPath)}`, '_blank'));
  });
}

function drawDependencies(svg: SvgSelection, tasks: TaskBlock[], x: ReturnType<typeof scaleTime<number, number>>, margin: { top: number }, rowHeight: number): void {
  const byBlock = new Map(tasks.map((task, index) => [task.block, { task, index }]));
  let offset = 0;

  tasks.forEach((task, index) => {
    task.dependsOn.forEach((dependency) => {
      const parent = byBlock.get(dependency);
      if (!parent) return;

      const x1 = x(new Date(`${parent.task.due}T00:00:00`));
      const y1 = margin.top + parent.index * rowHeight + 22 + (offset % 4) * 3;
      const x2 = x(new Date(`${task.start}T00:00:00`));
      const y2 = margin.top + index * rowHeight + 22 - (offset % 4) * 3;
      const mid = Math.max(28, Math.abs(x2 - x1) / 2);
      const path = `M${x1},${y1} C${x1 + mid},${y1} ${x2 - mid},${y2} ${x2 - 4},${y2}`;

      svg
        .append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', COLORS[task.status])
        .attr('stroke-opacity', 0.55)
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrow)');
      offset += 1;
    });
  });
}

function showTooltip(tooltip: HTMLElement | null, task: TaskBlock): void {
  if (!tooltip) return;
  tooltip.innerHTML = `
    <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(task.title)}</div>
    <div class="mono" style="font-size: 12px; color: #9ca3af;">${LABELS[task.status]} · ${Math.round(task.progress * 100)}% · ${task.start} → ${task.due}</div>
    <div style="margin-top: 8px; font-size: 12px; color: #d1d5db;">Зависимости: ${task.dependsOn.length ? task.dependsOn.map((item) => `блок ${item}`).join(', ') : 'нет'}</div>
  `;
  tooltip.dataset.visible = 'true';
}

function moveTooltip(tooltip: HTMLElement | null, event: MouseEvent): void {
  if (!tooltip) return;
  const padding = 16;
  const rect = tooltip.getBoundingClientRect();
  const left = Math.min(window.innerWidth - rect.width - padding, event.clientX + 18);
  const top = Math.min(window.innerHeight - rect.height - padding, event.clientY + 18);
  tooltip.style.left = `${Math.max(padding, left)}px`;
  tooltip.style.top = `${Math.max(padding, top)}px`;
}

function hideTooltip(tooltip: HTMLElement | null): void {
  if (!tooltip) return;
  tooltip.dataset.visible = 'false';
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function shade(hex: string, percent: number): string {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const amount = Math.round(2.55 * percent);
  const red = Math.max(0, Math.min(255, (number >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((number >> 8) & 0x00ff) + amount));
  const blue = Math.max(0, Math.min(255, (number & 0x0000ff) + amount));
  return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue).toString(16).slice(1)}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}
