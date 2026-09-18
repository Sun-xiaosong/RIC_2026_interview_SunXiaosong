import { CloseOutlined } from '@ant-design/icons';
import { Popover, Tooltip } from 'antd';
import { useState } from 'react';
import { dayLabel } from '../../lib/constants';
import {
  DAY_COLUMNS,
  HOUR_PX,
  blockKey,
  formatMinutes,
  type CoverageCell,
  type PreviewInfo,
  type SelectedBlockInfo,
  type TimeBlock,
} from '../../lib/timetable';

interface TimetableGridProps {
  hourStart: number;
  hourEnd: number;
  selected: SelectedBlockInfo[];
  preview: PreviewInfo | null;
  coverage: Map<string, CoverageCell> | null;
  onRemoveCourse: (courseCode: string) => void;
}

/** 时间覆盖模式下,小时格子弹层:列出可在该时段上课的课程,悬停展开具体分班。 */
function CoveragePopover({ cell }: { cell: CoverageCell }) {
  const [activeCourse, setActiveCourse] = useState<string | null>(null);

  return (
    <div className="tt-cov-list">
      <div className="tt-cov-list__title">{cell.count} 门备选课可在此时段上课</div>
      {cell.courses.map((course) => (
        <div
          key={course.code}
          className={activeCourse === course.code ? 'tt-cov-course is-active' : 'tt-cov-course'}
          onMouseEnter={() => setActiveCourse(course.code)}
          onMouseLeave={() => setActiveCourse((previous) => (previous === course.code ? null : previous))}
        >
          <div className="tt-cov-course__name">
            <span className="course-code">{course.code}</span>
            <span className="tt-cov-course__title">{course.title}</span>
          </div>
          {activeCourse === course.code && (
            <div className="tt-cov-subs">可选分班:{course.sections.join('、') || '—'}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 一周课表:纵轴小时、横轴周一到周日;渲染已排色块、悬停预览色块与覆盖模式热力。 */
export function TimetableGrid({
  hourStart,
  hourEnd,
  selected,
  preview,
  coverage,
  onRemoveCourse,
}: TimetableGridProps) {
  const hours: number[] = [];
  for (let hour = hourStart; hour < hourEnd; hour += 1) hours.push(hour);
  const gridHeight = hours.length * HOUR_PX;

  const blockPosition = (block: TimeBlock) => ({
    top: ((block.startMin - hourStart * 60) / 60) * HOUR_PX,
    height: ((block.endMin - block.startMin) / 60) * HOUR_PX - 2,
  });

  return (
    <div className="tt-grid">
      <div className="tt-head">
        <div className="tt-corner" />
        {DAY_COLUMNS.map((day) => (
          <div key={day} className="tt-day-head">
            {dayLabel(day)}
          </div>
        ))}
      </div>
      <div className="tt-body">
        <div className="tt-ruler" style={{ height: gridHeight }}>
          {hours.map((hour) => (
            <div key={hour} className="tt-hour-label" style={{ height: HOUR_PX }}>
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {DAY_COLUMNS.map((day) => {
          const daySelected = selected.filter((info) =>
            info.blocks.some((block) => block.day === day),
          );
          const dayPreview = preview
            ? preview.blocks.filter((block) => block.day === day)
            : [];
          return (
            <div key={day} className="tt-day-col" style={{ height: gridHeight }}>
              {coverage &&
                hours.map((hour) => {
                  const cell = coverage.get(`${day}-${hour}`);
                  if (!cell || cell.count === 0) return null;
                  return (
                    <Popover
                      key={hour}
                      placement="right"
                      mouseEnterDelay={0.15}
                      content={<CoveragePopover cell={cell} />}
                    >
                      <div
                        className={`tt-cov-cell tt-cov-cell--d${Math.min(cell.count, 7)}`}
                        style={{ top: (hour - hourStart) * HOUR_PX, height: HOUR_PX }}
                      >
                        {cell.count}
                      </div>
                    </Popover>
                  );
                })}
              {dayPreview.map((block) => {
                const conflict = preview ? preview.conflicts.has(blockKey(block)) : false;
                return (
                  <Tooltip
                    key={`p-${blockKey(block)}`}
                    title={conflict ? '与课表中其他课程时间冲突' : '该分班可上时段'}
                  >
                    <div
                      className={conflict ? 'tt-block is-red' : 'tt-block is-green'}
                      style={blockPosition(block)}
                    />
                  </Tooltip>
                );
              })}
              {daySelected.map((info) =>
                info.blocks
                  .filter((block) => block.day === day)
                  .map((block) => (
                    <Tooltip
                      key={`s-${info.courseCode}-${blockKey(block)}`}
                      title={
                        <div>
                          <div>
                            {info.courseCode} {info.courseTitle}
                          </div>
                          <div>
                            {info.section} · {dayLabel(block.day)}{' '}
                            {formatMinutes(block.startMin)}–{formatMinutes(block.endMin)}
                          </div>
                        </div>
                      }
                    >
                      <div className="tt-block is-selected" style={blockPosition(block)}>
                        <div className="tt-block__label">
                          <span className="tt-block__code">{info.courseCode}</span>
                          <span className="tt-block__section">{info.section}</span>
                        </div>
                        <button
                          type="button"
                          className="tt-block__remove"
                          aria-label="从课表移除"
                          title="从课表移除"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveCourse(info.courseCode);
                          }}
                        >
                          <CloseOutlined />
                        </button>
                      </div>
                    </Tooltip>
                  )),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
