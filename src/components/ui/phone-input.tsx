import * as React from "react";

import { Input } from "@/components/ui/input";

export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

function formatBRPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;

  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  // 5+10 digits total is still a landline (4+4) until the 11th digit confirms mobile (5+4).
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      onChange(formatBRPhone(event.target.value));
    }

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
