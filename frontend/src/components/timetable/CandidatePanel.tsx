import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Empty, List, Modal, Spin, Tag, Typography } from 'antd';
import { useState } from 'react';
import { SearchBar } from '../SearchBar';
import { useFavorites } from '../../hooks/useFavorites';
import { useCoursesQuery } from '../../hooks/useCoursesQuery';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { dayLabel, formatInstructor } from '../../lib/constants';
import {
  blocksOverlap,
  formatMinutes,
  semesterOf,
  subclassBlocks,
  type TimeBlock,
} from '../../lib/timetable';
import type { CourseDetail, Subclass } from '../../types/course';

/** 添加课程弹窗:搜索课程(走后端搜索 API)后加入备选列表。 */
function AddCourseModal({
  open,
  onClose,
  existingCodes,
}: {
  open: boolean;
  onClose: () => void;
  existingCodes: string[];
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { courses, loading } = useCoursesQuery({ q: debouncedQuery, dept: '', sem: '', req: '' });
  const { isFavorite, toggle } = useFavorites();

  return (
    <Modal
      title="添加课程到备选列表"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
      <div className="tt-add-search">
        <SearchBar value={query} onChange={setQuery} />
      </div>
      <List
        size="small"
        loading={loading}
        dataSource={courses}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的课程" />,
        }}
        renderItem={(course) => {
          const added = existingCodes.includes(course.code) || isFavorite(course.code);
          return (
            <List.Item
              actions={[
                added ? (
                  <Button key="added" size="small" disabled>
                    已在备选
                  </Button>
                ) : (
                  <Button
                    key="add"
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => toggle(course.code)}
                  >
                    加入备选
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <span className="course-code">{course.code}</span>{' '}
                    <Typography.Text type="secondary">{course.title}</Typography.Text>
                  </span>
                }
              />
            </List.Item>
          );
        }}
      />
    </Modal>
  );
}

interface CandidatePanelProps {
  candidates: CourseDetail[];
  loading: boolean;
  /** courseCode -> 已排 subclassId(不分学期,面板自行判断是否属于当前学期) */
  selectionByCourse: Map<string, number>;
  /** 当前学期已排课程的时段(按课程分组),用于冲突判断 */
  selectedBlockList: SelectedBlocks[];
  /** 当前查看的学期 */
  semester: 1 | 2;
  /** 当前悬停的课程(控制分班展开) */
  hoverCourse: string | null;
  onHoverCourse: (code: string | null) => void;
  onHoverSubclass: (info: { courseCode: string; subclassId: number } | null) => void;
  onSelectSubclass: (courseCode: string, subclassId: number) => void;
}

interface SelectedBlocks {
  code: string;
  blocks: TimeBlock[];
}

/** 分班是否与课表中"其他课程"的已排时段冲突(永远排除本课程自己,与悬停无关)。 */
function subclassConflicts(
  subclass: Subclass,
  courseCode: string,
  selectedBlockList: SelectedBlocks[],
): boolean {
  const blocks = subclassBlocks(subclass);
  const otherBlocks = selectedBlockList
    .filter((item) => item.code !== courseCode)
    .flatMap((item) => item.blocks);
  return blocks.some((block) => otherBlocks.some((other) => blocksOverlap(block, other)));
}

function SubclassRow({
  detail,
  subclass,
  isSelected,
  conflict,
  onHoverSubclass,
  onSelectSubclass,
}: {
  detail: CourseDetail;
  subclass: Subclass;
  isSelected: boolean;
  conflict: boolean;
  onHoverSubclass: (info: { courseCode: string; subclassId: number } | null) => void;
  onSelectSubclass: (courseCode: string, subclassId: number) => void;
}) {
  const blocks = subclassBlocks(subclass);
  const className = isSelected
    ? 'cand-sub is-selected'
    : conflict
      ? 'cand-sub is-conflict'
      : 'cand-sub';

  return (
    <div
      className={className}
      onMouseEnter={() =>
        onHoverSubclass({ courseCode: detail.code, subclassId: subclass.id })
      }
      onMouseLeave={() => onHoverSubclass(null)}
      onClick={() => onSelectSubclass(detail.code, subclass.id)}
    >
      <div className="cand-sub__head">
        <span className="cand-sub__section">{subclass.section ?? '—'}</span>
        <span className="cand-sub__instructor">{formatInstructor(subclass.instructor)}</span>
        {isSelected && <Tag color="cyan">在课表</Tag>}
        {conflict && <Tag color="red">时间冲突</Tag>}
      </div>
      {blocks.map((block, index) => (
        <div key={index} className="cand-sub__time">
          {dayLabel(block.day)} {formatMinutes(block.startMin)}–{formatMinutes(block.endMin)}
        </div>
      ))}
    </div>
  );
}

/** 课表页右侧备选课程列表:悬停课程展开本学期分班,点击分班排入课表。 */
export function CandidatePanel({
  candidates,
  loading,
  selectionByCourse,
  selectedBlockList,
  semester,
  hoverCourse,
  onHoverCourse,
  onHoverSubclass,
  onSelectSubclass,
}: CandidatePanelProps) {
  const { toggle } = useFavorites();
  const [addOpen, setAddOpen] = useState(false);
  const otherSemester = semester === 1 ? 2 : 1;

  return (
    <aside className="tt-side">
      <div className="tt-side__head">
        <Typography.Title level={5} style={{ margin: 0 }}>
          备选课程
        </Typography.Title>
        <Typography.Text type="secondary">
          (Sem {semester} · {candidates.length})
        </Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" className="tt-side__hint">
        悬停课程展开本学期分班与可上时间,点击分班排入课表;再点其他分班可更换。
      </Typography.Paragraph>

      <div className="tt-cands">
        {loading && candidates.length === 0 && (
          <div className="tt-side__loading">
            <Spin />
          </div>
        )}
        {!loading && candidates.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`Sem ${semester} 没有备选课程开课`}
          />
        )}
        {candidates.map((detail) => {
          const selectedSubId = selectionByCourse.get(detail.code);
          const selectedSub =
            selectedSubId === undefined
              ? undefined
              : detail.subclasses.find((subclass) => subclass.id === selectedSubId);
          const selectedInThisSem = selectedSub !== undefined && semesterOf(selectedSub) === semester;

          const subsCurrent = detail.subclasses.filter(
            (subclass) => semesterOf(subclass) === semester,
          );
          const subsOther = detail.subclasses.filter(
            (subclass) => semesterOf(subclass) === otherSemester,
          );
          const conflictBySubclass = new Map(
            subsCurrent.map((subclass) => [
              subclass.id,
              subclassConflicts(subclass, detail.code, selectedBlockList),
            ]),
          );
          // 本学期所有分班都与课表其他课程冲突 → 课程整体标注(已排的不算)
          const courseAllConflict =
            !selectedInThisSem &&
            subsCurrent.length > 0 &&
            subsCurrent.every((subclass) => conflictBySubclass.get(subclass.id));

          // 悬停时展开本学期全部分班;未悬停时只钉住已排的当前学期分班
          const expanded = hoverCourse === detail.code;
          const visibleSubs = expanded
            ? subsCurrent
            : selectedInThisSem && selectedSub
              ? [selectedSub]
              : [];

          return (
            <div
              key={detail.code}
              className={courseAllConflict ? 'cand-item is-conflict' : 'cand-item'}
              onMouseEnter={() => onHoverCourse(detail.code)}
              onMouseLeave={() => onHoverCourse(null)}
            >
              <div className="cand-item__head">
                <span className="course-code">{detail.code}</span>
                {selectedInThisSem && <span className="cand-stamp">已排</span>}
                {selectedSub && !selectedInThisSem && (
                  <span className="cand-cross-sem">已排于 Sem {semesterOf(selectedSub)}</span>
                )}
                {courseAllConflict && <Tag color="red">时间冲突</Tag>}
                <Button
                  type="text"
                  size="small"
                  danger
                  aria-label="从备选列表移除"
                  title="从备选列表移除(同时移出课表)"
                  icon={<MinusCircleOutlined />}
                  onClick={() => toggle(detail.code)}
                />
              </div>
              <Typography.Text type="secondary" className="cand-item__title">
                {detail.title}
              </Typography.Text>
              {visibleSubs.length > 0 && (
                <div className="cand-subs">
                  {visibleSubs.map((subclass) => (
                    <SubclassRow
                      key={subclass.id}
                      detail={detail}
                      subclass={subclass}
                      isSelected={selectedSubId === subclass.id}
                      conflict={conflictBySubclass.get(subclass.id) ?? false}
                      onHoverSubclass={onHoverSubclass}
                      onSelectSubclass={onSelectSubclass}
                    />
                  ))}
                </div>
              )}
              {subsOther.length > 0 && (
                <div className="cand-other-note">
                  另在 Sem {otherSemester} 开设:
                  {subsOther.map((subclass) => subclass.section ?? subclass.id).join('、')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
        添加课程
      </Button>
      <AddCourseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingCodes={candidates.map((candidate) => candidate.code)}
      />
    </aside>
  );
}
