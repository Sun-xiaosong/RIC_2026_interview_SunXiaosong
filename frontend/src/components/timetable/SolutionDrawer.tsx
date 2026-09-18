import { CheckOutlined, LockFilled } from '@ant-design/icons';
import { Button, Drawer, Empty, Tag, Typography } from 'antd';
import { useState } from 'react';
import { PREF_LABELS, type GenerateResult, type SchedulePrefs } from '../../lib/autoSchedule';

interface SolutionDrawerProps {
  open: boolean;
  onClose: () => void;
  result: GenerateResult;
  prefs: SchedulePrefs;
  hovered: number | null;
  locked: number | null;
  onHover: (index: number | null) => void;
  onLock: (index: number) => void;
  onApply: (index: number) => void;
}

const PAGE_SIZE = 5;

/** 排课方案抽屉:悬停预览、单击锁定、对勾应用;初始展示 5 个,可展开更多。 */
export function SolutionDrawer({
  open,
  onClose,
  result,
  prefs,
  hovered,
  locked,
  onHover,
  onLock,
  onApply,
}: SolutionDrawerProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedCount =
    Number(prefs.avoidEarlyNine) + Number(prefs.concentrate) + Number(prefs.lunchBreak);
  const shown = result.solutions.slice(0, visibleCount);

  return (
    <Drawer
      title="排课方案"
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
      mask={false}
      destroyOnHidden
    >
      {result.solutions.length === 0 ? (
        <Empty
          description={
            <span>
              没有可行的排课方案
              <br />
              <Typography.Text type="secondary">
                所选课程的分班时间存在不可避免冲突,无法共存。
              </Typography.Text>
            </span>
          }
        />
      ) : (
        <>
          <Typography.Paragraph type="secondary" className="sol-sub">
            共 {result.solutions.length} 个可行方案
            {!result.exhausted && '(组合较多,仅展示部分,已按偏好优先排序)'}
            。悬停预览,单击锁定,点 ✓ 应用到课表。
          </Typography.Paragraph>
          <div className="sol-list">
            {shown.map((solution, index) => {
              const isLocked = locked === index;
              return (
                <div
                  key={solution.summary}
                  className={
                    hovered === index
                      ? 'sol-row is-hover'
                      : isLocked
                        ? 'sol-row is-locked'
                        : 'sol-row'
                  }
                  onMouseEnter={() => onHover(index)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onLock(index)}
                >
                  <div className="sol-row__head">
                    <span className="sol-row__title">
                      方案 {index + 1}
                      {isLocked && <LockFilled className="sol-row__lock" />}
                    </span>
                    <span className="sol-row__score">
                      满足 {solution.satisfied}/{selectedCount} 偏好
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      aria-label="应用此方案"
                      title="应用此方案到课表"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApply(index);
                      }}
                    />
                  </div>
                  <div className="sol-row__prefs">
                    {prefs.avoidEarlyNine && (
                      <Tag color={solution.met[0] ? 'green' : 'default'}>
                        {solution.met[0] ? '✓' : '✗'} {PREF_LABELS[0]}
                      </Tag>
                    )}
                    {prefs.concentrate && (
                      <Tag color={solution.met[1] ? 'green' : 'default'}>
                        {solution.met[1] ? '✓' : '✗'} {PREF_LABELS[1]}
                      </Tag>
                    )}
                    {prefs.lunchBreak && (
                      <Tag color={solution.met[2] ? 'green' : 'default'}>
                        {solution.met[2] ? '✓' : '✗'} {PREF_LABELS[2]}
                      </Tag>
                    )}
                  </div>
                  <div className="sol-row__summary">{solution.summary}</div>
                </div>
              );
            })}
          </div>
          {visibleCount < result.solutions.length && (
            <Button block onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              显示更多(剩余 {result.solutions.length - visibleCount} 个)
            </Button>
          )}
        </>
      )}
    </Drawer>
  );
}
