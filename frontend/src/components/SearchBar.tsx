import { Input } from 'antd';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/** 搜索输入框:输入即回调(配合上层防抖),也支持回车/点击搜索立即触发。 */
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <Input.Search
      className="course-search"
      allowClear
      placeholder="搜索课程代码或名称,如 COMP3314 / machine"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSearch={(next) => onChange(next)}
    />
  );
}
