import React from 'react';
import type { AppProps } from 'next/app';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { App, ConfigProvider } from 'antd';
import { reportsTheme } from '@/theme';
import '@/styles/globals.css';

const cache = createCache();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <StyleProvider cache={cache}>
      <ConfigProvider theme={reportsTheme}>
        <App>
          <Component {...pageProps} />
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}
