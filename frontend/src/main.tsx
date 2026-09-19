import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import App from './App';
import { FavoritesProvider } from './context/FavoritesContext';
import './styles.css';

// 主题定制:翡翠绿主色 + 蓝绿点缀,浅绿雾面页面底色,圆润留白的呼吸感。
const theme = {
  token: {
    colorPrimary: '#059669',
    colorInfo: '#0D9488',
    colorLink: '#0D9488',
    borderRadius: 10,
    fontSize: 14,
    colorBgLayout: '#F3F9F6',
    colorTextBase: '#1C2B25',
  },
  components: {
    Table: {
      headerBg: '#F4FAF7',
      rowHoverBg: '#EDF8F2',
    },
    Card: {
      boxShadowTertiary: '0 1px 2px rgba(6, 95, 70, 0.04)',
    },
    Segmented: {
      itemSelectedBg: '#E6F6EF',
      itemSelectedColor: '#047857',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>
        <FavoritesProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FavoritesProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
