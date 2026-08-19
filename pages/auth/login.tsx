import React, { useState } from 'react';
import { Button, Card, Flex, Form, Input, App as AntApp, Grid } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { api } from '@/services/api';
import { API_ENDPOINTS, AUTH_TOKEN_KEY, ROUTE_PATHS, TOKEN_KEY } from '@/utils/constant';

const { useBreakpoint } = Grid;

export default function LoginPage() {
  const router = useRouter();

  const { message } = AntApp.useApp();

  const screens = useBreakpoint();
  const isMobile = (screens.xs || screens.sm) && !screens.md;

  const [loading, setLoading] = useState(false);

  const preventSpaces = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const payload = {
        username: values.username.toLowerCase().trim(),
        password: values.password,
      };

      const data = await api(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const token = data.data?.token;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        Cookies.set(AUTH_TOKEN_KEY, token, { expires: 1 });
      }

      message.success('Logged in successfully!');
      setTimeout(() => router.push(ROUTE_PATHS.dashboardEnquiry), 600);
    } catch (error: any) {
      message.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className={`login-card${isMobile ? ' login-card-mobile' : ''}`}>
        <Form
          name="login_form"
          onFinish={onFinish}
          layout="vertical"
          size="middle"
          requiredMark={false}
          validateTrigger="onChange"
        >
          <Form.Item
            name="username"
            label={<span className="login-label">Username</span>}
            validateFirst
            rules={[
              { required: true, message: 'Username cannot be empty!' },
              { min: 4, message: 'Username must be at least 4 characters!' },
              { max: 30, message: 'Username cannot exceed 30 characters!' },
              { pattern: /^[a-z0-9_]+$/, message: 'Only lowercase letters (a-z), numbers (0-9), and underscores allowed!' },
              {
                validator(_, value) {
                  if (value && value.includes('__')) return Promise.reject(new Error('Consecutive underscores are not allowed!'));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="Enter your username" className="pill-input" onKeyDown={preventSpaces} />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="login-label">Password</span>}
            className="login-password-item"
            validateFirst
            rules={[{ required: true, message: 'Please enter your password!' }]}
          >
            <Input.Password placeholder="Enter your password" className="pill-input" onKeyDown={preventSpaces} />
          </Form.Item>

          <Flex justify="center" className="login-forgot-row">
            <Link href={ROUTE_PATHS.forgotPassword} className="login-forgot-link">
              Forgot Password?
            </Link>
          </Flex>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block loading={loading} disabled={loading} className="pill-button">
              LOGIN
            </Button>
          </Form.Item>

          <Flex justify="center" gap={6} className="login-register-row">
            <span>Don&apos;t have an account?</span>
            <Link href={ROUTE_PATHS.register} className="login-register-link">
              Register
            </Link>
          </Flex>
        </Form>
      </Card>
    </div>
  );
}