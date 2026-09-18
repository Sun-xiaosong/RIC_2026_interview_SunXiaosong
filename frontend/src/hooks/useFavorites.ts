export { FavoritesProvider } from '../context/FavoritesContext';

import { useFavoritesContext } from '../context/FavoritesContext';

/** 详情页/收藏页共用的收藏操作 hook(状态由 FavoritesProvider 全局持有)。 */
export function useFavorites() {
  return useFavoritesContext();
}
