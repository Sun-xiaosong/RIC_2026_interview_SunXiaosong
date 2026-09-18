import { Alert, Select, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { CourseResultsTable } from '../components/CourseResultsTable';
import { SearchBar } from '../components/SearchBar';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { request } from '../lib/api';
import type { Department, DepartmentsResponse } from '../types/course';

/** 课程列表页:防抖搜索 + 院系筛选,结果按后端排序规则展示。 */
export default function CourseListPage() {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { courses, loading, error } = useCoursesQuery({ q: debouncedQuery, dept: dept ?? '' });

  useEffect(() => {
    const controller = new AbortController();
    request<DepartmentsResponse>('/api/departments', controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDepartments(data.departments);
      })
      .catch(() => {
        // 院系下拉加载失败不阻塞课程列表
      });
    return () => controller.abort();
  }, []);

  const deptOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: department.name,
        label: `${department.name}(${department.courseCount})`,
      })),
    [departments],
  );

  return (
    <div>
      <Typography.Title level={3} className="page-title">
        课程浏览
      </Typography.Title>
      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} />
        <Select
          className="dept-select"
          allowClear
          placeholder="按院系筛选"
          value={dept}
          options={deptOptions}
          onChange={setDept}
        />
      </div>
      <Typography.Text type="secondary" className="list-hint">
        搜索只匹配课程代码:代码包含关键词即命中(不区分大小写),如 COMP、3314、ct 均可;
        结果按 代码精确 &gt; 代码前缀 &gt; 代码包含 排序。
      </Typography.Text>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="课程数据加载失败"
          description="请确认本地后端已启动(127.0.0.1:3001),然后刷新页面重试。"
        />
      ) : (
        <CourseResultsTable courses={courses} loading={loading} />
      )}
    </div>
  );
}
