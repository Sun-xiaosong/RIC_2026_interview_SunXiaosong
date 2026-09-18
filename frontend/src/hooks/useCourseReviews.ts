import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import type { Review, ReviewsResponse, ReviewSort } from '../types/course';

interface ReviewsParams {
  page: number;
  pageSize: number;
  sort: ReviewSort;
}

/** 课程评价分页查询:排序/翻页变化时重新请求。 */
export function useCourseReviews(code: string | undefined, { page, pageSize, sort }: ReviewsParams) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
    });

    setLoading(true);
    setError(false);

    request<ReviewsResponse>(
      `/api/courses/${encodeURIComponent(code)}/reviews?${params.toString()}`,
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setReviews(data.reviews);
        setTotal(data.total);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(true);
        void requestError;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [code, page, pageSize, sort]);

  return { reviews, total, loading, error };
}
