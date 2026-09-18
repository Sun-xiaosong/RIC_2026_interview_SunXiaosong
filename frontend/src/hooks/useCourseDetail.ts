import { useEffect, useState } from 'react';
import { ApiError, request } from '../lib/api';
import type { CourseDetail, CourseDetailResponse } from '../types/course';

/**
 * 课程详情查询。区分三种失败:
 * notFound(404,展示"课程不存在")/ error(网络或服务异常,可重试)/ loading。
 */
export function useCourseDetail(code: string | undefined) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setError(false);
    setCourse(null);

    request<CourseDetailResponse>(`/api/courses/${encodeURIComponent(code)}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourse(data.course);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        if (requestError instanceof ApiError && requestError.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [code]);

  return { course, loading, notFound, error };
}
