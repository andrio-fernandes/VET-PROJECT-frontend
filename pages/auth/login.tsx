import React, { useState } from 'react';
import { Button, Card, Flex, Form, Input, App as AntApp, Grid } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { login } from '@/services/authService';
import { storeSession } from '@/hooks/useAuth';
import { ROUTE_PATHS } from '@/constants';
import { preventSpaces } from '@/utils/input';

const { useBreakpoint } = Grid;

export default function LoginPage() {
  const router = useRouter();

  const { message } = AntApp.useApp();

  const screens = useBreakpoint();
  const isMobile = (screens.xs || screens.sm) && !screens.md;

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const data = await login({
        username: values.username.trim(),
        password: values.password,
      });

      const token = data.data?.token;
      const refreshToken = data.data?.refreshToken;
      const user = data.data?.user;
      storeSession({ token, refreshToken, user });

      message.success('Logged in successfully!');
      setTimeout(
        () =>
          router.push(
            data.data?.user?.role === 'admin'
              ? ROUTE_PATHS.adminDashboard
              : ROUTE_PATHS.userDashboard
          ),
        600
      );
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
          onFinishFailed={() => setSubmitted(true)}
          layout="vertical"
          size="middle"
          validateTrigger={submitted ? 'onChange' : 'onSubmit'}
        >
          <Form.Item
            name="username"
            label={<span className="login-label">Username/Email</span>}
            required
            validateFirst
            rules={[
              { required: true, message: 'Username or email cannot be empty!' },
              { max: 254, message: 'Cannot exceed 254 characters!' },
              {
                validator(_, value) {
                  const inputValue = (value || '').trim();
                  if (!inputValue) return Promise.resolve();
                  if (inputValue.includes('@')) {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue)) {
                      return Promise.reject(new Error('Enter a valid email syntax (e.g. name@domain.com)!'));
                    }
                    return Promise.resolve();
                  }
                  if (inputValue.length < 3) return Promise.reject(new Error('Username must be at least 3 characters!'));
                  if (inputValue.length > 30) return Promise.reject(new Error('Username cannot exceed 30 characters!'));
                  if (!/^[a-zA-Z0-9_]+$/.test(inputValue)) {
                    return Promise.reject(new Error('Only letters (a-z, A-Z), numbers (0-9), and underscores allowed!'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="Enter your username or email" className="pill-input" onKeyDown={preventSpaces} />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="login-label">Password</span>}
            className="login-password-item"
            required
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