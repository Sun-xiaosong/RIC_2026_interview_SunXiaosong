import { useEffect, useState } from 'react';

/** 输入防抖:value 变化后延迟 delayMs 才更新返回值,用于搜索请求降频。 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
