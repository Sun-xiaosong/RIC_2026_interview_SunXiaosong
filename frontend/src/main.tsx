import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import App from './App';
import { FavoritesProvider } from './context/FavoritesContext';
import './styles.css';

// 主题定制:学术蓝主色 + 浅灰页面底色,表格/卡片细节微调。
const theme = {
  token: {
    colorPrimary: '#2F54EB',
    borderRadius: 6,
    fontSize: 14,
    colorBgLayout: '#F5F7FA',
    colorTextBase: '#1F2329',
  },
  components: {
    Table: {
      headerBg: '#FAFAFA',
      rowHoverBg: '#F0F5FF',
    },
    Card: {
      boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)',
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
