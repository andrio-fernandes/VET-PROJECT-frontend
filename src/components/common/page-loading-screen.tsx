import React from 'react';
import { Spin } from 'antd';

const PageLoadingScreen = ({ leaving = false }: { leaving?: boolean }) => (
  <div className={`page-loading-screen${leaving ? ' page-loading-screen--leaving' : ''}`}>
    <Spin size="large" />
  </div>
);

export default PageLoadingScreen;