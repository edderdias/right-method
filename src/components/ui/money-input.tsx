import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MoneyInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() =>
      value !== undefined ? formatCentsToBRL(Math.round(value * 100)) : "",
    );

    React.useEffect(() => {
      const expected = value !== undefined ? formatCentsToBRL(Math.round(value * 100)) : "";
      setDisplay((current) => (current === expected ? current : expected));
    }, [value]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const digitsOnly = event.target.value.replace(/\D/g, "");
      if (!digitsOnly) {
        setDisplay("");
        onChange(undefined);
        return;
      }
      const cents = Number.parseInt(digitsOnly, 10);
      setDisplay(formatCentsToBRL(cents));
      onChange(cents / 100);
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="decimal"
          placeholder="0,00"
          className={cn("pl-9", className)}
          value={display}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
