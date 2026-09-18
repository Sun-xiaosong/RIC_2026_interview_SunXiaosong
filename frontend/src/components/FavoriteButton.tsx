import { App as AntApp, Button } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { useFavorites } from '../hooks/useFavorites';

interface FavoriteButtonProps {
  code: string;
  block?: boolean;
}

/** 收藏切换按钮:状态来自全局 FavoritesProvider,操作即时持久化到 localStorage。 */
export function FavoriteButton({ code, block }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const { message } = AntApp.useApp();
  const active = isFavorite(code);

  return (
    <Button
      block={block}
      icon={active ? <StarFilled /> : <StarOutlined />}
      type={active ? 'primary' : 'default'}
      onClick={() => {
        toggle(code);
        void message.success(active ? '已取消收藏' : '已加入收藏');
      }}
    >
      {active ? '已收藏' : '收藏课程'}
    </Button>
  );
}
