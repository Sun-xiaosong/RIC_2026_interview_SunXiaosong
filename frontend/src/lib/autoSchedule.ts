import type { CourseDetail } from '../types/course';
import {
  blocksOverlap,
  semesterOf,
  subclassBlocks,
  type TimeBlock,
} from './timetable';

/** 排课偏好(全部为软性目标,用于给方案打分排序)。 */
export interface SchedulePrefs {
  /** 尽量少安排早上 9 点开始的课 */
  avoidEarlyNine: boolean;
  /** 课表尽量集中,腾出至少一个完整工作日 */
  concentrate: boolean;
  /** 中午 11:00-14:00 之间每天至少留出 1 小时午饭时间 */
  lunchBreak: boolean;
}

export const PREF_LABELS = ['少早九', '集中成块', '午休时间'] as const;

export interface SolutionEntryInfo {
  courseCode: string;
  subclassId: number;
}

export interface ScheduleSolution {
  entries: SolutionEntryInfo[];
  /** 三项偏好是否满足(无论是否勾选都计算,便于展示) */
  met: [boolean, boolean, boolean];
  /** 勾选的偏好中满足的数量 */
  satisfied: number;
  earlyNineCount: number;
  daysUsed: number;
  summary: string;
}

export interface GenerateResult {
  solutions: ScheduleSolution[];
  /** true 表示完整枚举;false 表示触达上限,结果为部分方案 */
  exhausted: boolean;
  /** 在该学期没有任何分班的课程(不可排) */
  emptyCourses: string[];
}

const MAX_SOLUTIONS = 500;
const MAX_NODES = 2_000_000;

const WEEKDAYS = [1, 2, 3, 4, 5];
const LUNCH_START = 11 * 60;
const LUNCH_END = 14 * 60;
const LUNCH_GAP = 60;

function earlyNineCount(blocks: TimeBlock[]): number {
  return blocks.filter((block) => block.startMin <= 9 * 60).length;
}

function daysUsedCount(blocks: TimeBlock[]): number {
  return new Set(blocks.map((block) => block.day)).size;
}

/** 周一至周五是否至少有一整天无课(腾出整块时间)。 */
function hasFreeWeekday(blocks: TimeBlock[]): boolean {
  const used = new Set(blocks.map((block) => block.day));
  return WEEKDAYS.some((day) => !used.has(day));
}

/** 每个有课日的中午 11:00-14:00 是否都留有 ≥1 小时空档。 */
function lunchBreakOk(blocks: TimeBlock[]): boolean {
  const byDay = new Map<number, TimeBlock[]>();
  for (const block of blocks) {
    const list = byDay.get(block.day) ?? [];
    list.push(block);
    byDay.set(block.day, list);
  }
  for (const dayBlocks of byDay.values()) {
    const intervals = dayBlocks
      .map((block) => ({
        start: Math.max(block.startMin, LUNCH_START),
        end: Math.min(block.endMin, LUNCH_END),
      }))
      .filter((interval) => interval.end > interval.start)
      .sort((a, b) => a.start - b.start);

    let cursor = LUNCH_START;
    let hasGap = false;
    for (const interval of intervals) {
      if (interval.start - cursor >= LUNCH_GAP) {
        hasGap = true;
        break;
      }
      cursor = Math.max(cursor, interval.end);
    }
    if (!hasGap && LUNCH_END - cursor >= LUNCH_GAP) hasGap = true;
    if (!hasGap) return false;
  }
  return true;
}

interface CandidateSubclass {
  id: number;
  section: string;
  blocks: TimeBlock[];
}

interface CandidateCourse {
  code: string;
  title: string;
  subs: CandidateSubclass[];
}

/**
 * 自动排课:为每门课选一个分班,枚举所有互不冲突的组合(DFS + 冲突剪枝),
 * 按满足偏好数排序返回。课程按分班数升序排列(少分班的先排,尽早剪枝)。
 * 触达方案数/节点数上限时停止并标记 exhausted=false(部分方案)。
 */
export function generateSchedules(
  courses: CourseDetail[],
  semester: 1 | 2,
  prefs: SchedulePrefs,
): GenerateResult {
  const perCourse: CandidateCourse[] = [];
  const emptyCourses: string[] = [];

  for (const course of courses) {
    const subs: CandidateSubclass[] = course.subclasses
      .filter((subclass) => semesterOf(subclass) === semester)
      .map((subclass) => ({
        id: subclass.id,
        section: subclass.section ?? String(subclass.id),
        blocks: subclassBlocks(subclass),
      }))
      .filter((sub) => sub.blocks.length > 0);
    if (subs.length === 0) {
      emptyCourses.push(course.code);
      continue;
    }
    perCourse.push({ code: course.code, title: course.title, subs });
  }

  if (perCourse.length === 0 || emptyCourses.length > 0) {
    // 存在无法参与排课的课程时直接判为不可行,交由上层提示
    return { solutions: [], exhausted: true, emptyCourses };
  }

  perCourse.sort((a, b) => a.subs.length - b.subs.length || a.code.localeCompare(b.code));

  const solutions: ScheduleSolution[] = [];
  const chosen: { course: CandidateCourse; sub: CandidateSubclass }[] = [];
  const assigned: TimeBlock[] = [];
  let nodes = 0;
  let exhausted = true;

  const record = () => {
    const blocks = chosen.flatMap((item) => item.sub.blocks);
    const early = earlyNineCount(blocks);
    const days = daysUsedCount(blocks);
    const met: [boolean, boolean, boolean] = [
      early === 0,
      hasFreeWeekday(blocks),
      lunchBreakOk(blocks),
    ];
    const satisfied =
      (prefs.avoidEarlyNine ? Number(met[0]) : 0) +
      (prefs.concentrate ? Number(met[1]) : 0) +
      (prefs.lunchBreak ? Number(met[2]) : 0);
    solutions.push({
      entries: chosen.map((item) => ({
        courseCode: item.course.code,
        subclassId: item.sub.id,
      })),
      met,
      satisfied,
      earlyNineCount: early,
      daysUsed: days,
      summary: chosen
        .slice()
        .sort((a, b) => a.course.code.localeCompare(b.course.code))
        .map((item) => `${item.course.code}·${item.sub.section}`)
        .join(' '),
    });
  };

  const dfs = (index: number): void => {
    if (solutions.length >= MAX_SOLUTIONS || nodes >= MAX_NODES) {
      exhausted = false;
      return;
    }
    nodes += 1;
    if (index === perCourse.length) {
      record();
      return;
    }
    for (const sub of perCourse[index].subs) {
      const conflicts = sub.blocks.some((block) =>
        assigned.some((other) => blocksOverlap(block, other)),
      );
      if (conflicts) continue;
      chosen.push({ course: perCourse[index], sub });
      assigned.push(...sub.blocks);
      dfs(index + 1);
      chosen.pop();
      assigned.length -= sub.blocks.length;
      if (!exhausted) return;
    }
  };

  dfs(0);

  solutions.sort((a, b) => {
    if (b.satisfied !== a.satisfied) return b.satisfied - a.satisfied;
    if (a.earlyNineCount !== b.earlyNineCount) return a.earlyNineCount - b.earlyNineCount;
    if (a.daysUsed !== b.daysUsed) return a.daysUsed - b.daysUsed;
    return a.summary.localeCompare(b.summary);
  });

  return { solutions, exhausted, emptyCourses };
}
