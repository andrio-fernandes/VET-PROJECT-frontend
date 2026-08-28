import type { Rule } from "antd/es/form";
import { DESCRIPTION_MAX_WORDS, TITLE_MAX_WORDS } from "@/constants/blog";
import { stripHtmlTags } from "@/utils/richText";

export const emailRules: Rule[] = [
  {
    required: true,
    message: "Please enter your email address.",
  },
  {
    type: "email",
    message: "Please enter a valid email address.",
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
    min: 8,
    message: "Password must be at least 8 characters.",
  },
  {
    max: 32,
    message: "Password cannot exceed 32 characters.",
  },
  {
    pattern: /^\S+$/,
    message: "Password cannot contain spaces.",
  },
];

// ---------------------------------------------------------------
// Blog form validation
// ---------------------------------------------------------------

// Count the whitespace-separated words in a value.
const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

// Reusable App count formatter ("{words}/{max}") for showCount props.
export const wordCountFormatter =
  (maxWords: number) =>
  ({ value }: { value: string }): string =>
    `${countWords(value)}/${maxWords}`;

// ---------------------------------------------------------------
// React Hook Form blog validation
// ---------------------------------------------------------------

// RHF validator that rejects a value exceeding the word limit.
// Returns a string error message (or true when valid), per RHF's contract.
export const rhfWordLimitValidator =
  (maxWords: number) =>
  (value: string | undefined): string | true => {
    if (!value || countWords(value) <= maxWords) return true;
    return `Cannot exceed ${maxWords} words`;
  };

// RHF rules equivalent to blogTitleRules
export const rhfTitleRules = {
  required: 'Please enter the blog title',
  validate: rhfWordLimitValidator(TITLE_MAX_WORDS),
};

// RHF rules equivalent to blogDescriptionRules
export const rhfDescriptionRules = {
  required: 'Please describe your blog',
  validate: rhfWordLimitValidator(DESCRIPTION_MAX_WORDS),
};

// Validates that the rich-text content has at least some visible text.
export const rhfContentRules = {
  validate: (value: string | undefined): string | true =>
    stripHtmlTags(value) ? true : 'Please write the blog content',
};