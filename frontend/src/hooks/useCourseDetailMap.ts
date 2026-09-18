import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import type { CourseDetail, CourseDetailResponse } from '../types/course';

/**
 * 批量加载课程详情(课表页为每个备选课拉取详情,获取分班数据)。
 * 单个课程加载失败不影响其他课程。
 */
export function useCourseDetailMap(codes: string[]) {
  const [details, setDetails] = useState<Map<string, CourseDetail>>(new Map());
  const [loading, setLoading] = useState(false);
  const key = codes.join(',');

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (list.length === 0) {
      setDetails(new Map());
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    Promise.all(
      list.map((code) =>
        request<CourseDetailResponse>(`/api/courses/${encodeURIComponent(code)}`, controller.signal)
          .then((data) => [code, data.course] as const)
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        const map = new Map<string, CourseDetail>();
        for (const item of results) {
          if (item) map.set(item[0], item[1]);
        }
        setDetails(map);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [key]);

  return { details, loading };
}
