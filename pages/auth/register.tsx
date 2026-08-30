/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { Button, Flex, Form, Input, Typography, App as AntApp } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { register } from '@/services/authService';
import PasswordStrength from '@/components/password-strength';
import { COMMON_PASSWORDS, ROUTE_PATHS } from '@/constants';
const { Title, Paragraph } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);

  const formValues = Form.useWatch([], form);

  const isFormValid =
    formValues?.fullName?.trim() &&
    formValues?.username?.trim() &&
    formValues?.email?.trim() &&
    formValues?.password &&
    formValues?.confirm &&
    form.getFieldsError().every((field) => field.errors.length === 0);

  const preventSpaces = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  const MAX_USERNAME_LENGTH = 30;
  const SUFFIX_LENGTH = 3;

  const generateUsername = (fullName: string) => {
    const clean = fullName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_{2,}/g, '_');

    const base = clean
      .slice(0, MAX_USERNAME_LENGTH - SUFFIX_LENGTH - 1)
      .replace(/_+$/g, '');

    const random = Math.floor(Math.random() * 10 ** SUFFIX_LENGTH)
      .toString()
      .padStart(SUFFIX_LENGTH, '0');

    return base ? `${base}_${random}` : '';
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setFieldValue('username', generateUsername(e.target.value));
  };

  const handleResetUsername = () => {
    if (formValues?.fullName?.trim()) {
      form.setFieldValue('username', generateUsername(formValues.fullName));
    }
  };

  const preventCopyPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    message.warning('Copying and pasting passwords is not allowed for security reasons.');
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formattedEmail = values.email.toLowerCase().trim();

      await register({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        email: formattedEmail,
        password: values.password,
      });

      message.success('Account created successfully!');
      setTimeout(() => router.push(ROUTE_PATHS.login), 600);
    } catch (error: any) {
      message.error(error.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-left-panel">
        <div className="register-left-content">
          <Title level={2} className="register-title">
            Create Your Account
          </Title>
          <Paragraph className="register-description">
            Sign up to access training videos, FAQs, guides, and learning resources to help you get the most out of MSME
            Sales Booster.
          </Paragraph>
        </div>

        <div className="register-image-wrapper">
          <img
            src="https://static.vecteezy.com/system/resources/previews/016/900/444/non_2x/online-dating-app-login-illustration-valentine-s-day-love-match-mobile-leaves-gradient-character-illustration-vector.jpg"
            alt="Registration Illustration"
            className="register-image"
          />
        </div>
      </div>

      <div className="register-right-panel">
        <div className="register-form-wrapper">
          <Form
            form={form}
            name="register_form"
            onFinish={onFinish}
            layout="vertical"
            size="middle"
            requiredMark={false}
            validateTrigger="onChange"
          >
            <Form.Item
              name="fullName"
              label={<span className="register-label">Full Name</span>}
              className="register-form-item"
              validateFirst
              rules={[
                { required: true, message: 'Full name cannot be empty!' },
                { min: 3, message: 'Full name must be at least 3 characters!' },
                { max: 40, message: 'Full name cannot exceed 40 characters!' },
                {
                  pattern: /^[a-zA-Z][a-zA-Z ]*$/,
                  message: 'Full name can only contain letters and spaces!',
                },
              ]}
            >
              <Input placeholder="Enter your full name" className="pill-input" onChange={handleFullNameChange} />
            </Form.Item>

            <Form.Item
              name="username"
              label={<span className="register-label">Username</span>}
              className="register-form-item"
              validateFirst
              rules={[
                { required: true, message: 'Username cannot be empty!' },
                { min: 3, message: 'Username must be at least 3 characters!' },
                { max: 30, message: 'Username cannot exceed 30 characters!' },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: 'Only letters (a-z, A-Z), numbers (0-9), and underscores (_) allowed!',
                },
              ]}
              extra={
                <span className="register-extra">
                  Auto-generated from your full name.
                  {formValues?.fullName?.trim() ? (
                    <Button
                      type="link"
                      size="small"
                      className="register-username-reset"
                      onClick={handleResetUsername}
                    >
                      Regenerate
                    </Button>
                  ) : null}
                </span>
              }
            >
              <Input
                // placeholder="Enter your username"
                className="pill-input"
                readOnly
                onKeyDown={preventSpaces}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span className="register-label">Email</span>}
              className="register-form-item"
              validateFirst
              rules={[
                { required: true, message: 'Email cannot be empty!' },
                { max: 254, message: 'Email cannot exceed 254 characters!' },
                { type: 'email', message: 'Enter a valid email syntax (e.g. name@domain.com)!' },
              ]}
            >
              <Input placeholder="Enter your email" className="pill-input" onKeyDown={preventSpaces} />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="register-label">Password</span>}
              className="register-form-item"
              validateFirst
              dependencies={['username']}
              extra={<PasswordStrength password={formValues?.password || ''} />}
              rules={[
                { required: true, message: 'Password cannot be empty!' },
                { min: 8, message: 'Password must be at least 8 characters!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value && value.includes(' ')) {
                      return Promise.reject(new Error('Password cannot contain spaces!'));
                    }
                    if (value && getFieldValue('username') && value.toLowerCase() === getFieldValue('username').toLowerCase()) {
                      return Promise.reject(new Error('Password cannot be identical to username!'));
                    }
                    if (value && COMMON_PASSWORDS.includes(value.toLowerCase())) {
                      return Promise.reject(new Error('This password is too common! Choose a stronger one.'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="Enter your password"
                className="pill-input"
                onKeyDown={preventSpaces}
                onPaste={preventCopyPaste}
                onCopy={preventCopyPaste}
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              label={<span className="register-label">Confirm Password</span>}
              className="register-form-item"
              dependencies={['password']}
              validateFirst
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("The passwords don't match!"));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="Confirm your password"
                className="pill-input"
                onKeyDown={preventSpaces}
                onPaste={preventCopyPaste}
                onCopy={preventCopyPaste}
              />
            </Form.Item>

            <Form.Item className="register-submit-item">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                disabled={!isFormValid || loading}
                className={`pill-button register-submit-button${isFormValid ? ' register-submit-button-valid' : ''}`}
              >
                Sign Up
              </Button>
            </Form.Item>

            <Flex justify="center" gap={6} className="register-login-row">
              Already have an account?{' '}
              <Link href={ROUTE_PATHS.login} className="register-login-link">
                Login
              </Link>
            </Flex>
          </Form>
        </div>
      </div>
    </div>
  );
}