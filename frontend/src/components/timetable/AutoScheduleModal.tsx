import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Empty, List, Modal, Segmented, Spin, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { SearchBar } from '../SearchBar';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useCoursesQuery } from '../../hooks/useCoursesQuery';
import { semesterOf } from '../../lib/timetable';
import { PREF_LABELS, type SchedulePrefs } from '../../lib/autoSchedule';
import type { CourseDetail } from '../../types/course';

interface AutoScheduleModalProps {
  open: boolean;
  onClose: () => void;
  /** 当前页面的学期(作为默认值) */
  defaultSemester: 1 | 2;
  /** 备选课程详情(收藏) */
  candidateDetails: CourseDetail[];
  onRun: (codes: string[], semester: 1 | 2, prefs: SchedulePrefs) => void;
}

/** 自动排课向导:选学期 → 选课(备选 + 搜索)→ 勾偏好 → 开始排课。 */
export function AutoScheduleModal({
  open,
  onClose,
  defaultSemester,
  candidateDetails,
  onRun,
}: AutoScheduleModalProps) {
  const [semester, setSemester] = useState<1 | 2>(defaultSemester);
  const [codes, setCodes] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    avoidEarlyNine: true,
    concentrate: true,
    lunchBreak: true,
  });
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { courses: searchResults, loading: searching } = useCoursesQuery({
    q: debouncedQuery,
    dept: '',
    sem: '',
    req: '',
  });

  useEffect(() => {
    if (open) {
      setSemester(defaultSemester);
      setCodes([]);
      setQuery('');
      setPrefs({ avoidEarlyNine: true, concentrate: true, lunchBreak: true });
    }
  }, [open, defaultSemester]);

  const known = useMemo(() => {
    const map = new Map<string, CourseDetail>();
    for (const detail of candidateDetails) map.set(detail.code, detail);
    return map;
  }, [candidateDetails]);

  const sectionCount = (code: string): number => {
    const detail = known.get(code);
    if (!detail) return -1; // 详情未知(搜索添加,提交时再拉取)
    return detail.subclasses.filter((subclass) => semesterOf(subclass) === semester).length;
  };

  const toggleCode = (code: string) => {
    setCodes((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );
  };

  return (
    <Modal
      title={
        <span>
          <ThunderboltOutlined /> 自动排课
        </span>
      }
      open={open}
      onCancel={onClose}
      width={600}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="run"
          type="primary"
          disabled={codes.length === 0}
          onClick={() => onRun(codes, semester, prefs)}
        >
          开始排课({codes.length} 门课)
        </Button>,
      ]}
    >
      <div className="auto-field">
        <Typography.Text strong>学期</Typography.Text>
        <Segmented
          value={semester}
          onChange={(value) => setSemester(value as 1 | 2)}
          options={[
            { label: 'Sem 1', value: 1 },
            { label: 'Sem 2', value: 2 },
          ]}
        />
      </div>

      <div className="auto-field">
        <Typography.Text strong>要排的课程({codes.length})</Typography.Text>
        {codes.length > 0 && (
          <div className="auto-chips">
            {codes.map((code) => {
              const count = sectionCount(code);
              return (
                <Tag
                  key={code}
                  closable
                  color={count === 0 ? 'red' : 'green'}
                  onClose={() => toggleCode(code)}
                >
                  {code}
                  {count === 0 ? '(该学期无分班)' : ''}
                </Tag>
              );
            })}
          </div>
        )}
        {codes.length === 0 && (
          <Typography.Text type="secondary">从下方备选课程或搜索结果中添加。</Typography.Text>
        )}
      </div>

      <div className="auto-field">
        <Typography.Text strong>从备选课程添加</Typography.Text>
        <div className="auto-chips">
          {candidateDetails.length === 0 && (
            <Typography.Text type="secondary">备选列表为空,可用搜索添加。</Typography.Text>
          )}
          {candidateDetails.map((detail) => {
            const count = detail.subclasses.filter(
              (subclass) => semesterOf(subclass) === semester,
            ).length;
            return (
              <Tag.CheckableTag
                key={detail.code}
                checked={codes.includes(detail.code)}
                onChange={() => toggleCode(detail.code)}
              >
                {detail.code}
                {count === 0 ? '(Sem 无分班)' : `(${count})`}
              </Tag.CheckableTag>
            );
          })}
        </div>
      </div>

      <div className="auto-field">
        <Typography.Text strong>搜索添加</Typography.Text>
        <SearchBar value={query} onChange={setQuery} />
        {searching && (
          <div className="auto-search-loading">
            <Spin size="small" />
          </div>
        )}
        {!searching && debouncedQuery && (
          <List
            size="small"
            dataSource={searchResults}
            className="auto-search-list"
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的课程" />
              ),
            }}
            renderItem={(course) =>
              codes.includes(course.code) ? null : (
                <List.Item
                  actions={[
                    <Button
                      key="add"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => toggleCode(course.code)}
                    >
                      添加
                    </Button>,
                  ]}
                >
                  <span>
                    <span className="course-code">{course.code}</span>{' '}
                    <Typography.Text type="secondary">{course.title}</Typography.Text>
                  </span>
                </List.Item>
              )
            }
          />
        )}
      </div>

      <div className="auto-field">
        <Typography.Text strong>偏好(尽力满足,不影响可行性)</Typography.Text>
        <div className="auto-prefs">
          <Checkbox
            checked={prefs.avoidEarlyNine}
            onChange={(event) => setPrefs((p) => ({ ...p, avoidEarlyNine: event.target.checked }))}
          >
            尽量少早九(不安排 9:00 开始的课)
          </Checkbox>
          <Checkbox
            checked={prefs.concentrate}
            onChange={(event) => setPrefs((p) => ({ ...p, concentrate: event.target.checked }))}
          >
            课表集中(腾出至少一个整天)
          </Checkbox>
          <Checkbox
            checked={prefs.lunchBreak}
            onChange={(event) => setPrefs((p) => ({ ...p, lunchBreak: event.target.checked }))}
          >
            午饭时间(11:00-14:00 每天留 1 小时空档)
          </Checkbox>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message="排课为每门课选一个互不冲突的分班组合;方案按满足偏好数排序,满足偏好是尽力而为,不作为过滤条件。"
      />
    </Modal>
  );
}
