import { Empty, Tooltip } from 'antd';
import { GRADE_KEYS, GRADE_LABELS } from '../lib/constants';
import type { GradeKey } from '../types/course';

// 档位对应的柱体样式(A 系最醒目,依次减弱;P 灰色,F 警示红)
const TIER_CLASS: Record<GradeKey, string> = {
  a_plus: 'a', a: 'a', a_minus: 'a',
  b_plus: 'b', b: 'b', b_minus: 'b',
  c_plus: 'c', c: 'c', c_minus: 'c',
  d_plus: 'd', d: 'd', d_minus: 'd',
  pass: 'pass', fail: 'fail',
};

interface GradeDistBarProps {
  distribution: Record<GradeKey, number>;
}

/** 成绩分布柱状图:纯 CSS 实现,无图表库依赖。 */
export function GradeDistBar({ distribution }: GradeDistBarProps) {
  const values = GRADE_KEYS.map((key) => distribution[key] ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...values);

  if (total === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成绩分布数据" />;
  }

  return (
    <div className="grade-chart">
      {GRADE_KEYS.map((key, index) => {
        const value = values[index];
        const percent = ((value / total) * 100).toFixed(1);
        return (
          <Tooltip key={key} title={`${GRADE_LABELS[key]}:${value} 人(${percent}%)`}>
            <div className="grade-column">
              <div className="grade-bar-area">
                <div
                  className={`grade-bar grade-bar--${TIER_CLASS[key]}`}
                  style={{ height: `${max > 0 ? (value / max) * 100 : 0}%` }}
                />
              </div>
              <div className="grade-label">{GRADE_LABELS[key]}</div>
              <div className="grade-value">{value > 0 ? value : ''}</div>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
