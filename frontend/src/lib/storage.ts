// localStorage 安全读写:损坏数据降级为空数组,写入失败(隐私模式/配额)静默忽略。

export const FAVORITES_KEY = 'ric.favorites.v1';
export const TIMETABLE_KEY = 'ric.timetable.selections.v1';

export interface StoredSelection {
  courseCode: string;
  subclassId: number;
}

function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function readFavoriteCodes(): string[] {
  return readArray(FAVORITES_KEY);
}

export function writeFavoriteCodes(codes: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(codes));
  } catch {
    // 忽略写入失败
  }
}

export function readTimetableSelections(): StoredSelection[] {
  try {
    const raw = localStorage.getItem(TIMETABLE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: StoredSelection[] = [];
    for (const item of parsed) {
      if (
        item !== null &&
        typeof item === 'object' &&
        typeof (item as { courseCode: unknown }).courseCode === 'string' &&
        typeof (item as { subclassId: unknown }).subclassId === 'number'
      ) {
        result.push(item as StoredSelection);
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function writeTimetableSelections(selections: StoredSelection[]): void {
  try {
    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(selections));
  } catch {
    // 忽略写入失败
  }
}
