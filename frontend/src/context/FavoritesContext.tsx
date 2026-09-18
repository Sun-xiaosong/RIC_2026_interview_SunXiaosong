import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { FAVORITES_KEY, readFavoriteCodes, writeFavoriteCodes } from '../lib/storage';

interface FavoritesContextValue {
  /** 已收藏的课程代码列表 */
  favorites: string[];
  isFavorite: (code: string) => boolean;
  toggle: (code: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * 收藏的全局状态:内存中的数组 + localStorage 持久化。
 * 监听 storage 事件实现跨标签页同步(同页修改不触发,故 toggle 直接 setFavorites)。
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => readFavoriteCodes());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY) {
        setFavorites(readFavoriteCodes());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((code: string) => {
    setFavorites((previous) => {
      const next = previous.includes(code)
        ? previous.filter((item) => item !== code)
        : [...previous, code];
      writeFavoriteCodes(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      isFavorite: (code: string) => favorites.includes(code),
      toggle,
    }),
    [favorites, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites 必须在 FavoritesProvider 内使用');
  }
  return context;
}
