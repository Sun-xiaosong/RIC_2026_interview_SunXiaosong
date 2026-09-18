import { Avatar, Dropdown, Layout, Menu } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';

const { Header, Content, Footer } = Layout;

/** 全局布局:顶部导航(站名/菜单/头像)+ 页面内容 + 页脚。 */
export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites } = useFavorites();

  // 详情页 /courses/COMP3314 高亮"课程浏览",其余按路径匹配
  const selectedKey = location.pathname.startsWith('/favorites')
    ? '/favorites'
    : location.pathname.startsWith('/timetable')
      ? '/timetable'
      : '/';

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/" className="app-logo">
            <BookOutlined />
            <span>RIC 选课指南</span>
          </NavLink>
          <Menu
            className="app-nav"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => navigate(key)}
            items={[
              { key: '/', label: '课程浏览' },
              { key: '/favorites', label: '我的收藏' },
              { key: '/timetable', label: '我的课表' },
            ]}
          />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'favorites',
                  icon: <StarOutlined />,
                  label: (
                    <span>
                      我的收藏
                      {favorites.length > 0 && (
                        <span className="app-favorite-count">{favorites.length}</span>
                      )}
                    </span>
                  ),
                },
                { key: 'timetable', icon: <CalendarOutlined />, label: '我的课表' },
              ],
              onClick: ({ key }) => navigate(key === 'favorites' ? '/favorites' : '/timetable'),
            }}
          >
            <Avatar className="app-avatar" icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </Header>
      <Content className="app-content">
        <Outlet />
      </Content>
      <Footer className="app-footer">RIC 选课指南 · 课程数据仅用于本地演示</Footer>
    </Layout>
  );
}
