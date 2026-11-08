"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TrainerAvatar } from "./trainer-photo";

/**
 * Drop-in replacement for a native <select> of trainer names. Native options can't show
 * images, so this lists every trainer with their thumbnail, searchable.
 */
export function TrainerSelect({
  value,
  onChange,
  options,
  placeholder = "Select trainer...",
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const list = React.useMemo(
    () => options.filter((n) => !q || n.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-10 px-2.5 flex items-center gap-2 text-[12px] rounded-lg border border-border bg-card text-left hover:bg-muted/40 focus:outline-none focus:border-violet-500",
            className,
          )}
        >
          {value ? <TrainerAvatar name={value} size={24} /> : null}
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[--radix-popover-trigger-width] min-w-[240px]">
        <div className="flex items-center gap-2 px-2.5 border-b border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search trainers"
            className="h-9 flex-1 bg-transparent text-[12px] outline-none"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto iris-scrollbar p-1">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:bg-muted text-left"
            >
              Clear selection
            </button>
          )}
          {list.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[12px] text-left hover:bg-muted",
                value === name && "bg-primary/10 text-primary font-medium",
              )}
            >
              <TrainerAvatar name={name} size={28} />
              <span className="flex-1 truncate">{name}</span>
              {value === name && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
          {!list.length && <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">No trainers match</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
