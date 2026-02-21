"use client";

import { useState, useEffect } from "react";
import { StickyNote } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateBookmarkNotes } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "./BookmarkNode";

export default function NotesPopover({ bookmark }: { bookmark: BookmarkData }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(bookmark.notes ?? "");
  const updateNotes = useUpdateBookmarkNotes();

  // Sync local state when bookmark data changes (e.g. optimistic update settles)
  useEffect(() => {
    if (!open) {
      setValue(bookmark.notes ?? "");
    }
  }, [bookmark.notes, open]);

  const hasNotes = !!bookmark.notes;

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed !== (bookmark.notes ?? "")) {
      updateNotes.mutate({ id: bookmark.id, notes: trimmed });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      if (!isOpen && value.trim() !== (bookmark.notes ?? "")) {
        handleSave();
      } else {
        setOpen(isOpen);
      }
    }}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className={`rounded-lg p-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-600 ${hasNotes ? "text-amber-500" : "text-zinc-400"}`}>
                <StickyNote size={14} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>{hasNotes ? "Edit note" : "Add note"}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent side="bottom" align="end" className="w-72 p-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a note..."
          rows={4}
          className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-0"
          autoFocus
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
