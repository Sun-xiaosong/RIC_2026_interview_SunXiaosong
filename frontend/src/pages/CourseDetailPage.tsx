import { Alert, Button, Card, Descriptions, Skeleton, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FavoriteButton } from '../components/FavoriteButton';
import { FeatureVotes } from '../components/FeatureVotes';
import { GradeDistBar } from '../components/GradeDistBar';
import { ReviewList } from '../components/ReviewList';
import { SubclassTable } from '../components/SubclassTable';
import { likeRate } from '../components/CourseResultsTable';
import { useCourseDetail } from '../hooks/useCourseDetail';

// 地图体积较大,按需加载(React.lazy 拆包)
const CourseVenueMap = lazy(() => import('../components/CourseVenueMap'));

/** 课程详情页:信息 / 成绩分布 / 课程特征 / 班次时间表 / 评价 + 概要与地图侧栏。 */
export default function CourseDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { course, loading, notFound, error } = useCourseDetail(code);

  if (loading) {
    return (
      <div className="page-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (notFound) {
    return (
      <Alert
        type="warning"
        showIcon
        message={`没有找到课程 ${code ?? ''}`}
        description="该课程代码不存在,可能已删除或输入有误。"
        action={
          <Link to="/">
            <Button>返回课程列表</Button>
          </Link>
        }
      />
    );
  }

  if (error || !course) {
    return (
      <Alert
        type="error"
        showIcon
        message="课程详情加载失败"
        description="请确认本地后端已启动,然后刷新页面重试。"
        action={
          <Link to="/">
            <Button>返回课程列表</Button>
          </Link>
        }
      />
    );
  }

  const rate = likeRate(course);
  const totalVotes = course.likedCount + course.dislikedCount;

  return (
    <div className="detail-page">
      <div className="detail-header">
        <Link to="/">
          <Button icon={<ArrowLeftOutlined />} type="text">
            返回列表
          </Button>
        </Link>
        <Typography.Title level={3} className="detail-title">
          <span className="course-code">{course.code}</span>
          {course.title}
        </Typography.Title>
        {course.offerDept && <Tag color="cyan">{course.offerDept}</Tag>}
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <Card title="课程信息" size="small" className="detail-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="前置要求">
                {course.requirement ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="课程简介">
                {course.description ?? (
                  <Typography.Text type="secondary">暂无简介(数据集中未提供)</Typography.Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="成绩分布" size="small" className="detail-card">
            <GradeDistBar distribution={course.gradeDistribution} />
          </Card>

          <Card title="课程特征(学生投票)" size="small" className="detail-card">
            <FeatureVotes votes={course.featureVotes} />
          </Card>

          <Card title="班次时间表" size="small" className="detail-card">
            <SubclassTable subclasses={course.subclasses} />
          </Card>

          <Card title="课程评价" size="small" className="detail-card">
            <ReviewList courseCode={course.code} />
          </Card>
        </div>

        <div className="detail-aside">
          <Card title="概要" size="small" className="detail-card">
            <div className="summary-rows">
              <div className="summary-row">
                <span>评价数</span>
                <span>{course.reviewedCount}</span>
              </div>
              <div className="summary-row">
                <span>好评率</span>
                <span>
                  {rate === null
                    ? '—'
                    : `${Math.round(rate * 100)}%(${totalVotes} 票)`}
                </span>
              </div>
            </div>
            <FavoriteButton code={course.code} block />
          </Card>

          <Card title="上课地点" size="small" className="detail-card">
            <Suspense
              fallback={
                <Skeleton.Node active style={{ width: '100%', height: 280 }}>
                  <Spin />
                </Skeleton.Node>
              }
            >
              <CourseVenueMap subclasses={course.subclasses} />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
