import { Button, Empty, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseResultsTable } from '../components/CourseResultsTable';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useFavorites } from '../hooks/useFavorites';

/** 我的收藏页:展示 localStorage 中收藏的全部课程。 */
export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const { courses, loading } = useCoursesQuery({ q: '', dept: '', sem: '', req: '' });
  const navigate = useNavigate();

  const favoriteCourses = useMemo(
    () => courses.filter((course) => favorites.includes(course.code)),
    [courses, favorites],
  );

  return (
    <div>
      <Typography.Title level={3} className="page-title">
        我的收藏
      </Typography.Title>
      <Typography.Text type="secondary" className="list-hint">
        收藏保存在本浏览器(localStorage),共 {favorites.length} 门课程。
      </Typography.Text>

      {!loading && favoriteCourses.length === 0 ? (
        <Empty description="还没有收藏任何课程">
          <Button type="primary" onClick={() => navigate('/')}>
            去课程列表逛逛
          </Button>
        </Empty>
      ) : (
        <CourseResultsTable
          courses={favoriteCourses}
          loading={loading}
          emptyText="收藏的课程不存在"
        />
      )}
    </div>
  );
}
