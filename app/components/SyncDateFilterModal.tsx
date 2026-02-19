"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const quickYears = [currentYear, currentYear - 1, currentYear - 2];
const olderYears = Array.from(
  { length: currentYear - 2 - 2010 },
  (_, i) => currentYear - 3 - i,
);

type Selection = "all" | number;

export default function SyncDateFilterModal({
  open,
  onConfirm,
}: {
  open: boolean;
  onConfirm: (sinceYear: number | undefined) => void;
}) {
  const [selected, setSelected] = useState<Selection>("all");

  const chipClass = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-2 text-sm transition-colors",
      active
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-200 text-zinc-600 hover:border-zinc-400",
    );

  const isOlderYear = typeof selected === "number" && !quickYears.includes(selected);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>How far back?</DialogTitle>
          <DialogDescription>
            Pick a year to start syncing from. Older bookmarks won&apos;t be fetched — saves API credits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelected("all")} className={chipClass(selected === "all")}>
            All time
          </button>
          {quickYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelected(year)}
              className={chipClass(selected === year)}
            >
              {year}
            </button>
          ))}
          <select
            value={isOlderYear ? String(selected) : ""}
            onChange={(e) => setSelected(Number(e.target.value))}
            className={cn(
              "rounded-md border px-3 py-2 text-sm transition-colors appearance-none cursor-pointer bg-transparent",
              isOlderYear
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-400",
            )}
          >
            <option value="" disabled>
              Older...
            </option>
            {olderYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onConfirm(selected === "all" ? undefined : selected)}
            className="w-full"
          >
            Start Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
