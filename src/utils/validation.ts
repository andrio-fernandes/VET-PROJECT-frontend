import type { Rule } from "antd/es/form";

export const emailRules: Rule[] = [
  {
    required: true,
    message: "Please enter your email address.",
  },
  {
    pattern: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
    message: "Please enter a valid Gmail address.",
  },
  {
    max: 254,
    message: "Email is too long.",
  },
];

export const otpRules: Rule[] = [
  {
    required: true,
    message: "Please enter OTP.",
  },
  {
    pattern: /^[0-9]{6}$/,
    message: "OTP must contain exactly 6 digits.",
  },
];

export const passwordRules: Rule[] = [
  {
    required: true,
    message: "Please enter your password.",
  },
  {
    max: 32,
    message: "Password cannot exceed 32 characters.",
  },
];