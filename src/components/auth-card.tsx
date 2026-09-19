import type { ReactNode } from "react";
import { Card, Flex } from "antd";

interface AuthCardProps {
  children: ReactNode;
}

// Shared shell used by the standalone auth pages (forgot-password, OTP and
// reset-password). It wraps the page content in the centered Flex and the
// bordered Card that the stylesheet targets, so every auth page keeps the
// exact same layout.
export default function AuthCard({ children }: AuthCardProps) {
  return (
    <Flex justify="center" align="center" className="auth-page">
      <Card className="auth-card">{children}</Card>
    </Flex>
  );
}
