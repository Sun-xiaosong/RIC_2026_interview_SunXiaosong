import { Card, Empty, Grid, Progress, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { CourseSummary } from '../types/course';

/** 好评率:无投票返回 null(展示为 —)。 */
export function likeRate(course: CourseSummary): number | null {
  const votes = course.likedCount + course.dislikedCount;
  if (votes === 0) return null;
  return course.likedCount / votes;
}

interface CourseResultsTableProps {
  courses: CourseSummary[];
  loading: boolean;
  emptyText?: string;
}

/**
 * 课程结果展示:桌面端表格、窄屏(<768px)卡片列表。
 * 课程列表页与收藏页共用。
 */
export function CourseResultsTable({ courses, loading, emptyText = '没有找到匹配的课程' }: CourseResultsTableProps) {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const columns: ColumnsType<CourseSummary> = [
    {
      title: '课程',
      dataIndex: 'code',
      render: (_, course) => (
        <div>
          <span className="course-code">{course.code}</span>
          <Typography.Text type="secondary" className="course-title">
            {course.title}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '开课院系',
      dataIndex: 'offerDept',
      width: 260,
      render: (value: string | null) =>
        value ? (
          <Tooltip title={value}>
            <span className="dept-cell">{value}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: '好评率',
      key: 'likeRate',
      width: 170,
      render: (_, course) => {
        const rate = likeRate(course);
        if (rate === null) {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        const percent = Math.round(rate * 100);
        return (
          <div className="like-rate">
            <Progress
              percent={percent}
              showInfo={false}
              size="small"
              strokeColor={rate >= 0.6 ? '#52C41A' : rate >= 0.4 ? '#FAAD14' : '#FF4D4F'}
            />
            <span className="like-rate__text">
              {percent}%
              <Typography.Text type="secondary" className="like-rate__votes">
                ({course.likedCount + course.dislikedCount} 票)
              </Typography.Text>
            </span>
          </div>
        );
      },
    },
    {
      title: '评价数',
      dataIndex: 'reviewedCount',
      width: 90,
      align: 'right',
    },
  ];

  if (isMobile) {
    if (loading) {
      return (
        <div className="course-cards">
          {[0, 1, 2].map((key) => (
            <Card key={key} loading />
          ))}
        </div>
      );
    }
    if (courses.length === 0) {
      return <Empty description={emptyText} />;
    }
    return (
      <div className="course-cards">
        {courses.map((course) => {
          const rate = likeRate(course);
          return (
            <Card
              key={course.code}
              size="small"
              hoverable
              onClick={() => navigate(`/courses/${course.code}`)}
            >
              <div className="course-card__head">
                <span className="course-code">{course.code}</span>
                {rate !== null && (
                  <span className="course-card__rate">{Math.round(rate * 100)}% 好评</span>
                )}
              </div>
              <Typography.Text type="secondary">{course.title}</Typography.Text>
              <div className="course-card__meta">
                <span>{course.offerDept ?? '—'}</span>
                <span>{course.reviewedCount} 条评价</span>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Table<CourseSummary>
      columns={columns}
      dataSource={courses}
      rowKey="code"
      loading={loading}
      pagination={false}
      locale={{ emptyText }}
      onRow={(course) => ({
        onClick: () => navigate(`/courses/${course.code}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
