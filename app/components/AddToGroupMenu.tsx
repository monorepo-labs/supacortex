"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useGroups, useCreateGroup } from "@/hooks/use-groups";
import {
  useAddBookmarksToGroups,
  useRemoveBookmarksFromGroups,
} from "@/hooks/use-bookmark-groups";
import { ICON_MAP } from "./GroupIconPicker";
import { randomColor, randomGroupName } from "@/lib/group-defaults";

export default function AddToGroupMenu({
  bookmarkIds,
  currentGroupIds,
  onAction,
}: {
  bookmarkIds: string[];
  currentGroupIds: string[];
  onAction?: () => void;
}) {
  const { data: groups } = useGroups();
  const { mutate: createGroup } = useCreateGroup();
  const { mutate: addToGroups } = useAddBookmarksToGroups();
  const { mutate: removeFromGroups } = useRemoveBookmarksFromGroups();
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const isInGroup = (groupId: string) => {
    if (removedIds.has(groupId)) return false;
    return optimisticIds.has(groupId) || currentGroupIds.includes(groupId);
  };

  const toggle = (groupId: string) => {
    if (isInGroup(groupId)) {
      removeFromGroups({ bookmarkIds, groupIds: [groupId] });
      setRemovedIds((prev) => new Set(prev).add(groupId));
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    } else {
      addToGroups({ bookmarkIds, groupIds: [groupId] });
      setOptimisticIds((prev) => new Set(prev).add(groupId));
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
    onAction?.();
  };

  const handleNewGroup = () => {
    const name = randomGroupName();
    const color = randomColor();
    createGroup(
      { name, color },
      {
        onSuccess: (newGroup: { id: string }) => {
          addToGroups({ bookmarkIds, groupIds: [newGroup.id] });
          setOptimisticIds((prev) => new Set(prev).add(newGroup.id));
        },
      },
    );
    onAction?.();
  };

  return (
    <div className="flex flex-col py-1">
      <button
        onClick={handleNewGroup}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <Plus size={14} />
        Create new and add
      </button>
      <div className="mx-1 my-1 h-px bg-zinc-200" />
      {groups?.map(
        (group: {
          id: string;
          name: string;
          color: string;
          icon?: string | null;
        }) => {
          const inGroup = isInGroup(group.id);
          const iconName = group.icon ?? "hash";
          const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
          return (
            <button
              key={group.id}
              onClick={() => toggle(group.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-100 transition-colors justify-between"
            >
              <span className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: group.color }}
                >
                  <Icon className="h-2.5 w-2.5 text-white" />
                </span>
                {group.name}
              </span>
              {inGroup && <Check size={14} className="text-zinc-600" />}
            </button>
          );
        },
      )}
      {(!groups || groups.length === 0) && (
        <div className="px-3 py-1.5 text-sm text-zinc-400">No groups yet</div>
      )}
    </div>
  );
}
