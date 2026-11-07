"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type MultiOption = { value: string; label: string; hint?: string };

/**
 * Searchable multi-select: selected values show as removable chips, a popover
 * lists options with type-to-filter (arrow keys + Enter select, Backspace in the
 * trigger removes the last chip). `onChange` fires on every toggle, so callers can
 * auto-save. Values that are selected but missing from `options` still render.
 */
export function MultiSelect({
  value, onChange, options, placeholder = "Select…", disabled, className, max, emptyText = "No matches",
  primary, onPrimaryChange, size = "sm",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  max?: number;
  emptyText?: string;
  /** Optional primary value (first-class chip marker). Pass with onPrimaryChange to let users promote a chip. */
  primary?: string | null;
  onPrimaryChange?: (v: string) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };
  const h = size === "md" ? "min-h-8 text-[12px]" : "min-h-7 text-[11px]";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
            else if (e.key === "Backspace" && value.length) onChange(value.slice(0, -1));
          }}
          className={cn(
            "flex w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-0.5 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring/40",
            disabled && "opacity-60 cursor-not-allowed",
            h, className,
          )}
        >
          {value.length === 0 && <span className="px-0.5 text-muted-foreground">{placeholder}</span>}
          {value.map((v) => (
            <span
              key={v}
              className={cn(
                "inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-px text-[11px] leading-4",
                primary === v && "ring-1 ring-primary/50",
              )}
              title={primary === v ? "Primary" : onPrimaryChange ? "Click to make primary" : undefined}
              onClick={(e) => {
                if (onPrimaryChange && !disabled) { e.stopPropagation(); onPrimaryChange(v); }
              }}
            >
              {labelOf(v)}
              {primary === v && <span className="text-[9px] uppercase text-primary font-semibold ml-0.5">primary</span>}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${labelOf(v)}`}
                  className="rounded hover:bg-foreground/10"
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          <ChevronsUpDown className="ml-auto w-3 h-3 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[--radix-popover-trigger-width] min-w-[220px]">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-[12px]" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-[12px] text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const on = value.includes(o.value);
                return (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)} className="text-[12px]">
                    <Check className={cn("w-3.5 h-3.5", on ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="text-[10px] text-muted-foreground">{o.hint}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
