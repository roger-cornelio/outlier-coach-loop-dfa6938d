import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRange {
  from: Date;
  to: Date;
}

type PresetKey = "7d" | "30d" | "90d" | "this_month" | "last_month" | "this_year" | "custom";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateRange;
}

const presets: Preset[] = [
  { key: "7d", label: "7 dias", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { key: "30d", label: "30 dias", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { key: "90d", label: "90 dias", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { key: "this_month", label: "Este mês", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { key: "last_month", label: "Mês passado", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { key: "this_year", label: "Este ano", getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

interface PeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset.key);
    const range = preset.getRange();
    onChange(range);
  };

  const handleCustomFrom = (date: Date | undefined) => {
    if (!date) return;
    setCustomFrom(date);
    setActivePreset("custom");
    onChange({ from: date, to: customTo || value.to });
  };

  const handleCustomTo = (date: Date | undefined) => {
    if (!date) return;
    setCustomTo(date);
    setActivePreset("custom");
    onChange({ from: customFrom || value.from, to: date });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant={activePreset === preset.key ? "default" : "outline"}
          size="sm"
          onClick={() => handlePreset(preset)}
          className="text-xs"
        >
          {preset.label}
        </Button>
      ))}

      <div className="flex items-center gap-1 ml-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs gap-1", activePreset === "custom" && "border-primary")}>
              <CalendarIcon className="w-3 h-3" />
              {format(value.from, "dd/MM/yy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customFrom}
              onSelect={handleCustomFrom}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">→</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs gap-1", activePreset === "custom" && "border-primary")}>
              <CalendarIcon className="w-3 h-3" />
              {format(value.to, "dd/MM/yy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customTo}
              onSelect={handleCustomTo}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - durationMs),
    to: new Date(range.from.getTime() - 1),
  };
}
