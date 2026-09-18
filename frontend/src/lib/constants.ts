import type { FeatureKey, GradeKey } from '../types/course';

// 数据约定:slot.day 为 1-5(1=周一);越界时防御性回退。
const DAY_MAP: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

export function dayLabel(day: number): string {
  return DAY_MAP[day] ?? `Day ${day}`;
}

// 成绩档位展示顺序与中文标签
export const GRADE_KEYS: GradeKey[] = [
  'a_plus', 'a', 'a_minus',
  'b_plus', 'b', 'b_minus',
  'c_plus', 'c', 'c_minus',
  'd_plus', 'd', 'd_minus',
  'pass', 'fail',
];

export const GRADE_LABELS: Record<GradeKey, string> = {
  a_plus: 'A+', a: 'A', a_minus: 'A-',
  b_plus: 'B+', b: 'B', b_minus: 'B-',
  c_plus: 'C+', c: 'C', c_minus: 'C-',
  d_plus: 'D+', d: 'D', d_minus: 'D-',
  pass: 'P', fail: 'F',
};

export const FEATURE_ORDER: FeatureKey[] = [
  'tutorial', 'essay', 'final', 'presentation', 'project', 'attendance',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  tutorial: '导修课',
  essay: '论文',
  final: '期末考试',
  presentation: '课堂展示',
  project: '课程项目',
  attendance: '点名',
};

// "Xu,Dong" -> "Dong Xu";多教师 "; " 分隔时逐个转换。
export function formatInstructor(instructor: string | null): string {
  if (!instructor || !instructor.trim()) return 'TBA';
  return instructor
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [family, ...given] = part.split(',');
      if (given.length === 0) return family.trim();
      return `${given.join(' ').trim()} ${family.trim()}`;
    })
    .join('; ');
}
