import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { Provider } from 'react-redux';
import { App, ConfigProvider } from 'antd';
import { reportsTheme } from '@/theme';
import { store } from '@/redux/store';
import { PageLoadingProvider } from '@/components/common/LoadingProvider';
import PageLoading from '@/components/common/PageLoading';
import '@/styles/globals.css';
import '@/styles/blog.scss';
import '@/styles/admin-layout.css';
import '@/styles/admin-dashboard.css';
import '@/styles/faqs.scss';
import '@/styles/create-base.css';
import '@/styles/faqs-create.css';
import '@/styles/videos.scss';
import '@/styles/videos-create.css';
import '@/styles/blogs.scss';
import '@/styles/blogs-preview.css';
import '@/styles/user-layout.css';
import '@/styles/search.scss';

const cache = createCache();

const AppChrome = ({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) => {
  const router = useRouter();
  const [firstLoad, setFirstLoad] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);

  // Initial page load / refresh: keep the loading screen visible until the
  // router is ready. No artificial delay — the loader hides the moment the
  // page is ready to render.
  useEffect(() => {
    let alive = true;
    let onReady: (() => void) | undefined;

    const ready = router.isReady
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const handler = () => {
            router.events.off('routeChangeComplete', handler);
            resolve();
          };
          onReady = handler;
          router.events.on('routeChangeComplete', handler);
        });
    ready.then(() => {
      if (alive) setFirstLoad(false);
    });
    return () => {
      alive = false;
      if (onReady) router.events.off('routeChangeComplete', onReady);
    };
  }, [router]);

  // Client-side navigation: load the page transition.
  useEffect(() => {
    const start = () => setRouteLoading(true);
    const stop = () => setRouteLoading(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', stop);
    router.events.on('routeChangeError', stop);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', stop);
      router.events.off('routeChangeError', stop);
    };
  }, [router]);

  return (
    <>
      <Component {...pageProps} />
      {(firstLoad || routeLoading) && <PageLoading />}
    </>
  );
};

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <StyleProvider cache={cache}>
        <ConfigProvider theme={reportsTheme}>
          <App>
            <PageLoadingProvider>
              <AppChrome Component={Component} pageProps={pageProps} />
            </PageLoadingProvider>
          </App>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  );
}
