import { Empty, Table, Tag, Typography } from 'antd';
import { dayLabel, formatInstructor } from '../lib/constants';
import type { Slot, Subclass } from '../types/course';

function SlotLine({ slot }: { slot: Slot }) {
  return (
    <div className="slot-line">
      <Tag color="blue">{dayLabel(slot.day)}</Tag>
      <span className="slot-line__time">
        {slot.startTime}–{slot.endTime}
      </span>
      <span className={slot.venue.trim() ? 'slot-line__venue' : 'slot-line__venue is-tbd'}>
        {slot.venue.trim() || '地点待定'}
      </span>
      <Typography.Text type="secondary" className="slot-line__dates">
        {slot.startDate} ~ {slot.endDate}
      </Typography.Text>
    </div>
  );
}

interface SubclassTableProps {
  subclasses: Subclass[];
}

/** 班次时间表:按学期分组,列出 Section、教师与每周上课时间地点。 */
export function SubclassTable({ subclasses }: SubclassTableProps) {
  if (subclasses.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无班次信息" />;
  }

  const groups = new Map<string, Subclass[]>();
  for (const subclass of subclasses) {
    const semester = subclass.semester ?? '未知学期';
    const bucket = groups.get(semester);
    if (bucket) bucket.push(subclass);
    else groups.set(semester, [subclass]);
  }

  return (
    <div className="subclass-groups">
      {Array.from(groups.entries()).map(([semester, items]) => (
        <div className="subclass-group" key={semester}>
          <Typography.Title level={5} className="subclass-group__title">
            {semester}
            <Typography.Text type="secondary" className="subclass-group__count">
              {items.length} 个班次
            </Typography.Text>
          </Typography.Title>
          <Table<Subclass>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={items}
            columns={[
              {
                title: 'Section',
                dataIndex: 'section',
                width: 90,
                render: (value: string | null) => value ?? '—',
              },
              {
                title: '教师',
                dataIndex: 'instructor',
                width: 220,
                render: (value: string | null) => formatInstructor(value),
              },
              {
                title: '上课时间与地点',
                render: (_, subclass) =>
                  subclass.slots.length > 0 ? (
                    <div className="slot-list">
                      {subclass.slots.map((slot, index) => (
                        <SlotLine key={`${subclass.id}-${index}`} slot={slot} />
                      ))}
                    </div>
                  ) : (
                    <Typography.Text type="secondary">时间待定</Typography.Text>
                  ),
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
