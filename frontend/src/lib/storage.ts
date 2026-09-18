// localStorage 安全读写:损坏数据降级为空数组,写入失败(隐私模式/配额)静默忽略。

export const FAVORITES_KEY = 'ric.favorites.v1';

export function readFavoriteCodes(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeFavoriteCodes(codes: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(codes));
  } catch {
    // 忽略写入失败
  }
}
