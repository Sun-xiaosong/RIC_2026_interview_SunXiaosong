import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import type { CourseSummary, CoursesResponse } from '../types/course';

interface QueryParams {
  q: string;
  dept: string;
  sem: string;
  req: string;
}

/**
 * 课程列表/搜索查询。q/dept/sem/req 四个维度变化时自动重新请求并中止旧请求;
 * 请求期间保留上一次数据(表格 loading 态,不闪空)。
 */
export function useCoursesQuery({ q, dept, sem, req }: QueryParams) {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (dept) params.set('dept', dept);
    if (sem) params.set('sem', sem);
    if (req) params.set('req', req);
    const suffix = params.size > 0 ? `?${params.toString()}` : '';

    setLoading(true);
    setError(false);

    request<CoursesResponse>(`/api/courses${suffix}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourses(data.courses);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(true);
        void requestError;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [q, dept, sem, req]);

  return { courses, loading, error };
}
