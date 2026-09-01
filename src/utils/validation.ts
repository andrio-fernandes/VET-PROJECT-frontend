import type { Rule } from "antd/es/form";
import {
  countWords,
  DESCRIPTION_MAX_WORDS,
  DESCRIPTION_MIN_WORDS,
  TITLE_MAX_WORDS,
  TITLE_MIN_WORDS,
} from "@/constants";
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

// Reusable App count formatter ("{words}/{max}") for showCount props.
export const wordCountFormatter =
  (maxWords: number) =>
  ({ value }: { value: string }): string =>
    `${countWords(value)}/${maxWords}`;

// ---------------------------------------------------------------
// React Hook Form blog validation
// ---------------------------------------------------------------

// RHF rules for the blog title (min/max word limits, like the video form).
export const rhfTitleRules = {
  required: 'Please enter the blog title',
  validate: (value: string | undefined): string | true => {
    if (!value) return true;
    const words = countWords(value);
    if (words < TITLE_MIN_WORDS) return `Title must contain at least ${TITLE_MIN_WORDS} words.`;
    if (words > TITLE_MAX_WORDS) return `Title must not exceed ${TITLE_MAX_WORDS} words.`;
    return true;
  },
};

// RHF rules for the blog description (min/max word limits, like the video form).
export const rhfDescriptionRules = {
  required: 'Please describe your blog',
  validate: (value: string | undefined): string | true => {
    if (!value) return true;
    const words = countWords(value);
    if (words < DESCRIPTION_MIN_WORDS)
      return `Description must contain at least ${DESCRIPTION_MIN_WORDS} words.`;
    if (words > DESCRIPTION_MAX_WORDS)
      return `Description must not exceed ${DESCRIPTION_MAX_WORDS} words.`;
    return true;
  },
};

// Validates that the rich-text content has at least some visible text.
export const rhfContentRules = {
  validate: (value: string | undefined): string | true =>
    stripHtmlTags(value) ? true : 'Please write the blog content',
};