import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true, re-clicking the already-selected day keeps it selected instead of clearing it —
   * react-day-picker's single mode toggles a re-clicked day off by default, which silently empties
   * required date fields whose default value is today (e.g. clicking "today" to confirm it). */
  required?: boolean;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled,
  className,
  required,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start rounded-md border border-input bg-transparent text-left font-normal shadow-sm",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
          {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (date === undefined && required) {
              setOpen(false);
              return;
            }
            onChange(date);
            setOpen(false);
          }}
          locale={ptBR}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
