import type { CourseDetail, Subclass } from '../types/course';

/** 课表选择:一门课排入的具体分班。 */
export interface SelectionEntry {
  courseCode: string;
  subclassId: number;
}

/** 周课时段(分钟制,day 为 1-7)。 */
export interface TimeBlock {
  day: number;
  startMin: number;
  endMin: number;
}

export const HOUR_PX = 56;
export const HOUR_START = 9;
export const HOUR_END_DEFAULT = 19;
export const DAY_COLUMNS = [1, 2, 3, 4, 5, 6, 7];

export function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function blockKey(block: TimeBlock): string {
  return `${block.day}-${block.startMin}-${block.endMin}`;
}

/** 一个分班的每周课时段(按 day+起止时间去重,数据里同班会按日期段拆成多条)。 */
export function subclassBlocks(subclass: Subclass): TimeBlock[] {
  const seen = new Set<string>();
  const blocks: TimeBlock[] = [];
  for (const slot of subclass.slots) {
    const key = `${slot.day}|${slot.startTime}|${slot.endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push({
      day: slot.day,
      startMin: parseTimeToMinutes(slot.startTime),
      endMin: parseTimeToMinutes(slot.endTime),
    });
  }
  return blocks;
}

/** 多个分班的课时段合并去重(悬停整门课时展示"所有可上时间")。 */
export function uniqueBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const seen = new Set<string>();
  const result: TimeBlock[] = [];
  for (const block of blocks) {
    const key = blockKey(block);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(block);
  }
  return result;
}

/** 两个课时段是否在同一天且时间重叠(分钟级判断)。 */
export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.day === b.day && Math.max(a.startMin, b.startMin) < Math.min(a.endMin, b.endMin);
}

/** 分班所属学期:解析 semester 字段(如 "2026-27 Sem 1"),返回 1、2 或 null。 */
export function semesterOf(subclass: Subclass): 1 | 2 | null {
  const text = subclass.semester ?? '';
  if (/Sem\s*1\b/.test(text)) return 1;
  if (/Sem\s*2\b/.test(text)) return 2;
  return null;
}

/** 课时段覆盖到的小时列表(15:00-17:50 → [15,16,17];16:00-17:20 → [16,17])。 */
export function hoursOf(block: TimeBlock): number[] {
  const first = Math.floor(block.startMin / 60);
  const last = Math.ceil(block.endMin / 60) - 1;
  const hours: number[] = [];
  for (let hour = first; hour <= last; hour += 1) hours.push(hour);
  return hours;
}

/** 全部课程数据里最晚的下课时间(用于自动延长课表时间轴)。 */
export function latestEndMinute(details: Map<string, CourseDetail>): number {
  let latest = HOUR_END_DEFAULT * 60;
  for (const detail of details.values()) {
    for (const subclass of detail.subclasses) {
      for (const block of subclassBlocks(subclass)) {
        latest = Math.max(latest, block.endMin);
      }
    }
  }
  return latest;
}

// ---- 课表页渲染所需的数据形状 ----

/** 已排入课表的课程块(一门课一个条目,含其分班的全部课时段)。 */
export interface SelectedBlockInfo {
  courseCode: string;
  courseTitle: string;
  section: string;
  blocks: TimeBlock[];
}

/** 悬停预览:备选课/分班的可上时段,以及与其他已排课程冲突的时段。 */
export interface PreviewInfo {
  blocks: TimeBlock[];
  conflicts: Set<string>;
}

/** 时间覆盖模式下,某 (day, hour) 小时格的统计。 */
export interface CoverageCell {
  count: number;
  courses: { code: string; title: string; sections: string[] }[];
}
