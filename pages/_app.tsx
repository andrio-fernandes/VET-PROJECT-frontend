import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from '../src/redux/store';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#4caf50', 
          },
        }}
      >
        <Component {...pageProps} />
      </ConfigProvider>
    </Provider>
  );
}