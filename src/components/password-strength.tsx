import { Tag, Typography } from "antd";
import { PASSWORD_RULES } from "@/utils/constant";

const { Text } = Typography;

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const value = password || "";

  // Show all password requirements before the user starts typing
  if (!value) {
    return (
      <Text style={{ display: "block", marginTop: 6, color: "#54b226" }}>
        {PASSWORD_RULES.map((rule) => rule.label).join(" · ")}
      </Text>
    );
  }

  const isStrong =
    PASSWORD_RULES.every((rule) => rule.test(value)) && value.length >= 8;

  if (isStrong) {
    return (
      <Tag color="success" style={{ marginTop: 6 }}>
        Your password is strong.
      </Tag>
    );
  }

  const pendingRules = PASSWORD_RULES.filter((rule) => !rule.test(value));

  if (pendingRules.length === 0) {
    return null;
  }

  return (
    <Text type="danger" style={{ display: "block", marginTop: 6 }}>
      {pendingRules.map((rule) => rule.label).join(" · ")}
    </Text>
  );
}