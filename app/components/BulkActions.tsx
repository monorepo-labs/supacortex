"use client";

import { useState } from "react";
import { FolderPlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useGroups } from "@/hooks/use-groups";
import { useAddBookmarksToGroups, useRemoveBookmarksFromGroups } from "@/hooks/use-bookmark-groups";
import { useDeleteBookmark } from "@/hooks/use-bookmarks";
import { ICON_MAP } from "./GroupIconPicker";
import { sileo } from "sileo";

export default function BulkActions({
  selectedIds,
  onClear,
}: {
  selectedIds: Set<string>;
  onClear: () => void;
}) {
  const { data: groups } = useGroups();
  const { mutate: addToGroups } = useAddBookmarksToGroups();
  const { mutate: removeFromGroups } = useRemoveBookmarksFromGroups();
  const { mutate: deleteBookmark } = useDeleteBookmark();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const bookmarkIds = Array.from(selectedIds);
  const count = selectedIds.size;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    bookmarkIds.forEach((id) => {
      deleteBookmark(id, {
        onError: () => sileo.error({ title: "Failed to delete bookmark" }),
      });
    });
    onClear();
    setConfirmDelete(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-lg">
      <span className="text-sm font-medium text-zinc-700">
        {count} selected
      </span>

      <div className="h-4 w-px bg-zinc-200" />

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100">
            <FolderPlus size={14} />
            Add to Group
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" sideOffset={8} className="w-52 p-1">
          {groups?.map((group: { id: string; name: string; color: string; icon?: string | null }) => {
            const iconName = group.icon ?? "hash";
            const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
            return (
              <button
                key={group.id}
                onClick={() => {
                  addToGroups({ bookmarkIds, groupIds: [group.id] });
                  sileo.success({ title: `Added to ${group.name}` });
                  setPopoverOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: group.color }}
                >
                  <Icon className="h-2.5 w-2.5 text-white" />
                </span>
                {group.name}
              </button>
            );
          })}
          {(!groups || groups.length === 0) && (
            <div className="px-2 py-1.5 text-sm text-zinc-400">No groups yet</div>
          )}
        </PopoverContent>
      </Popover>

      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <Button
            variant="destructive"
            size="xs"
            onClick={handleDelete}
          >
            Yes, delete
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50"
        >
          <Trash2 size={14} />
          Delete
        </button>
      )}

      <div className="h-4 w-px bg-zinc-200" />

      <button
        onClick={() => { onClear(); setConfirmDelete(false); }}
        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
