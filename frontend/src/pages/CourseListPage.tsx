import { Alert, Select, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { CourseResultsTable } from '../components/CourseResultsTable';
import { SearchBar } from '../components/SearchBar';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { request } from '../lib/api';
import type { Department, DepartmentsResponse } from '../types/course';

interface ToggleSelectProps {
  className: string;
  placeholder: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onValueChange: (value: string | undefined) => void;
}

/**
 * 可切换的筛选下拉:再次点击已选中的选项 = 取消该筛选;
 * 选项右侧的 ×(allowClear)同样可清除。
 */
function ToggleSelect({ className, placeholder, value, options, onValueChange }: ToggleSelectProps) {
  return (
    <Select
      className={className}
      allowClear
      placeholder={placeholder}
      value={value}
      options={options}
      onSelect={(selected) => onValueChange(selected === value ? undefined : selected)}
      onChange={(changed) => {
        if (changed === undefined) onValueChange(undefined);
      }}
    />
  );
}

/** 课程列表页:防抖搜索 + 院系/学期/前置要求三维筛选,可同时生效,再点选项即取消。 */
export default function CourseListPage() {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string | undefined>(undefined);
  const [sem, setSem] = useState<string | undefined>(undefined);
  const [req, setReq] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { courses, loading, error } = useCoursesQuery({
    q: debouncedQuery,
    dept: dept ?? '',
    sem: sem ?? '',
    req: req ?? '',
  });

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
        <ToggleSelect
          className="dept-select"
          placeholder="按院系筛选"
          value={dept}
          options={deptOptions}
          onValueChange={setDept}
        />
        <ToggleSelect
          className="sem-select"
          placeholder="按学期筛选"
          value={sem}
          options={[
            { value: '1', label: 'Sem 1(2026-27)' },
            { value: '2', label: 'Sem 2(2026-27)' },
          ]}
          onValueChange={setSem}
        />
        <ToggleSelect
          className="req-select"
          placeholder="按前置要求筛选"
          value={req}
          options={[
            { value: 'yes', label: '有前置要求' },
            { value: 'no', label: '无前置要求' },
          ]}
          onValueChange={setReq}
        />
      </div>
      <Typography.Text type="secondary" className="list-hint">
        搜索只匹配课程代码:代码包含关键词即命中(不区分大小写),如 COMP、3314、ct 均可;结果按
        代码精确 &gt; 代码前缀 &gt; 代码包含 排序;院系/学期/前置要求筛选可同时叠加,
        再次点击已选中的选项即可取消该筛选。
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
