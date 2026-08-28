import React from 'react';
import type { AppProps } from 'next/app';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { Provider } from 'react-redux';
import { App, ConfigProvider } from 'antd';
import { reportsTheme } from '@/theme';
import { store } from '@/redux/store';
import '@/styles/globals.css';
import '@/styles/blog.scss';

const cache = createCache();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <StyleProvider cache={cache}>
        <ConfigProvider theme={reportsTheme}>
          <App>
            <Component {...pageProps} />
          </App>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  );
}
