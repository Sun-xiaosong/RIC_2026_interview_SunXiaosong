import { Empty, List, Pagination, Radio, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useCourseReviews } from '../hooks/useCourseReviews';
import type { ReviewSort } from '../types/course';

const PAGE_SIZE = 5;

interface ReviewListProps {
  courseCode: string;
}

/** 课程评价列表:最新/最热排序 + 服务端分页。 */
export function ReviewList({ courseCode }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('latest');
  const { reviews, total, loading, error } = useCourseReviews(courseCode, {
    page,
    pageSize: PAGE_SIZE,
    sort,
  });

  return (
    <div>
      <div className="review-toolbar">
        <Typography.Text type="secondary">共 {total} 条评价</Typography.Text>
        <Radio.Group
          value={sort}
          optionType="button"
          buttonStyle="solid"
          size="small"
          onChange={(event) => {
            setSort(event.target.value as ReviewSort);
            setPage(1);
          }}
          options={[
            { value: 'latest', label: '最新' },
            { value: 'hot', label: '最热' },
          ]}
        />
      </div>

      {error ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="评价加载失败,请稍后重试" />
      ) : (
        <>
          <List
            loading={loading}
            dataSource={reviews}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无评价" /> }}
            renderItem={(review) => (
              <List.Item>
                <div className="review-item">
                  <div className="review-item__meta">
                    {review.yearTaken && <Tag>{review.yearTaken}</Tag>}
                    {review.semTaken && <Tag>{review.semTaken}</Tag>}
                    {review.instructor && <Tag>{review.instructor}</Tag>}
                    <span className="review-item__feedback">
                      👍 {review.likedCount} · 👎 {review.dislikedCount}
                    </span>
                  </div>
                  <Typography.Paragraph className="review-item__content" style={{ marginBottom: 0 }}>
                    {review.content}
                  </Typography.Paragraph>
                </div>
              </List.Item>
            )}
          />
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
            showSizeChanger={false}
            size="small"
            align="end"
            showTotal={(count) => `共 ${count} 条`}
          />
        </>
      )}
    </div>
  );
}
