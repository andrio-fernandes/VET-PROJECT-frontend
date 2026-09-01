import React from 'react';
import type { AppProps } from 'next/app';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { Provider } from 'react-redux';
import { App, ConfigProvider } from 'antd';
import { reportsTheme } from '@/theme';
import { store } from '@/redux/store';
import VideoUploadNotifications from '@/components/video/VideoUploadNotifications';
import { ensureVideoUploadManager } from '@/services/videoUploadManager';
import '@/styles/globals.css';
import '@/styles/blog.scss';
import '@/styles/admin-layout.css';
import '@/styles/admin-dashboard.css';
import '@/styles/faqs.scss';
import '@/styles/faqs-create.css';
import '@/styles/videos.scss';
import '@/styles/videos-create.css';
import '@/styles/blogs.scss';
import '@/styles/blogs-preview.css';

const cache = createCache();

ensureVideoUploadManager();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <StyleProvider cache={cache}>
        <ConfigProvider theme={reportsTheme}>
          <App>
            <VideoUploadNotifications />
            <Component {...pageProps} />
          </App>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  );
}
