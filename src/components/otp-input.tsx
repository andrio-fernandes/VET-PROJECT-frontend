import { forwardRef, useImperativeHandle, useRef } from "react";
import { Flex, Input } from "antd";
import { OTP_LENGTH } from "@/constants";

export interface OtpInputHandle {
  focusFirst: () => void;
}

interface OtpInputProps {
  value: string[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

// Shared group of single-digit OTP inputs. Handles auto-focus between boxes,
// backspace navigation, and paste of a full code. The page passes the current
// digits down and receives updates via `onChange`; it can focus the first box
// through the forwarded handle.
const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(
  ({ value, disabled = false, onChange }, ref) => {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useImperativeHandle(ref, () => ({
      focusFirst: () => inputRefs.current[0]?.focus(),
    }));

    const handleChange = (index: number, digit: string) => {
      if (!/^\d?$/.test(digit)) {
        return;
      }

      const next = [...value];
      next[index] = digit;
      onChange(next);

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();

      const pastedText = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);

      if (!pastedText) {
        return;
      }

      const next = Array(OTP_LENGTH).fill("");
      pastedText.split("").forEach((digit, index) => {
        next[index] = digit;
      });

      onChange(next);

      const nextIndex = Math.min(pastedText.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    };

    return (
      <Flex justify="center" gap={8} className="otp-inputs" onPaste={handlePaste}>
        {value.map((digit, index) => (
          <Input
            key={index}
            id={`otp-${index}`}
            ref={(element) => {
              inputRefs.current[index] = element?.input ?? null;
            }}
            maxLength={1}
            value={digit}
            inputMode="numeric"
            disabled={disabled}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
        ))}
      </Flex>
    );
  }
);

OtpInput.displayName = "OtpInput";

export default OtpInput;
