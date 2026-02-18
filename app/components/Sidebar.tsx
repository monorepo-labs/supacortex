"use client";

import { useState, useRef, useEffect } from "react";
import { PanelLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import XIcon from "./XIcon";
import { RectangleStackIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { sileo } from "sileo";
import {
  useGroups,
  useCreateGroup,
  useRenameGroup,
  useUpdateGroup,
  useDeleteGroup,
} from "@/hooks/use-groups";
import {
  useTwitterAccount,
  useLinkTwitter,
  useSyncTwitter,
  useSyncStatus,
} from "@/hooks/use-twitter";
import GroupIconPicker, { ICON_MAP } from "./GroupIconPicker";
import UserMenu from "./UserMenu";
import { randomColor, randomGroupName } from "@/lib/group-defaults";

type Group = { id: string; name: string; color: string; icon?: string | null };

function GroupIcon({ color, iconName }: { color: string; iconName: string }) {
  const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-3 w-3 text-white" />
    </span>
  );
}

function GroupItem({
  group,
  isActive,
  onSelect,
  onDelete,
}: {
  group: Group;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: rename } = useRenameGroup();
  const { mutate: updateGroup } = useUpdateGroup();

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== group.name) {
      rename({ id: group.id, name: trimmed });
    } else {
      setName(group.name);
    }
  };

  const iconName = group.icon ?? "hash";

  if (editing) {
    return (
      <li>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <GroupIcon color={group.color} iconName={iconName} />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setName(group.name);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-sm text-zinc-900 outline-none"
          />
        </div>
      </li>
    );
  }

  return (
    <li>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            onClick={() => onSelect(group.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors cursor-pointer ${
              isActive
                ? "bg-black/6 text-zinc-900"
                : "text-zinc-600 hover:bg-black/6"
            }`}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GroupIcon color={group.color} iconName={iconName} />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" sideOffset={8}>
                <GroupIconPicker
                  color={group.color}
                  icon={iconName}
                  onColorChange={(color) =>
                    updateGroup({ id: group.id, color })
                  }
                  onIconChange={(icon) => updateGroup({ id: group.id, icon })}
                />
              </PopoverContent>
            </Popover>
            <button
              onDoubleClick={() => setEditing(true)}
              className="flex-1 text-left cursor-default"
            >
              {group.name}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Button
                variant="destructive"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group.id);
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "Escape" }),
                  );
                }}
              >
                Yes, delete
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setConfirmDelete(true);
              }}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 size={14} />
              Delete group
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}

export default function Sidebar({
  activeGroupId,
  onGroupSelect,
  collapsed,
  onCollapsedChange,
}: {
  activeGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const { data: groups } = useGroups();
  const { mutate: createGroup } = useCreateGroup();
  const { mutate: deleteGroup } = useDeleteGroup();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const { mutate: syncTwitter, isPending: isSyncing } = useSyncTwitter();
  const { data: syncStatus } = useSyncStatus(!!twitterAccount);

  const isInterrupted = syncStatus?.status === "interrupted";
  const resumeTime = syncStatus?.rateLimitResetsAt
    ? new Date(syncStatus.rateLimitResetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const handleAddGroup = () => {
    createGroup({ name: randomGroupName(), color: randomColor() });
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup(id, {
      onSuccess: () => {
        if (activeGroupId === id) onGroupSelect(null);
      },
      onError: () => sileo.error({ title: "Failed to delete group" }),
    });
  };

  return (
    <>
      {collapsed && (
        <button
          onClick={() => onCollapsedChange(false)}
          className="absolute left-3 top-3 z-20 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <PanelLeft size={18} />
        </button>
      )}
      <aside
        className="flex h-screen shrink-0 flex-col bg-background overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? 0 : 208 }}
      >
        {/* Toggle + Avatar */}
        <div className="flex w-52 items-center justify-between px-3 pt-3">
          <button
            onClick={() => onCollapsedChange(true)}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <PanelLeft size={18} />
          </button>
          <UserMenu />
        </div>

        {/* Groups */}
        <nav className="mt-4 flex-1 w-52 px-3">
          <Button
            onClick={handleAddGroup}
            variant="ghost"
            className="w-full justify-start text-zinc-500"
          >
            <Plus size={14} />
            New Group
          </Button>
          <ul className="flex flex-col gap-0.5">
            {groups && groups.length > 0 && (
              <li>
                <div
                  onClick={() => onGroupSelect(null)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors cursor-pointer ${
                    activeGroupId === null
                      ? "bg-black/6 text-zinc-900"
                      : "text-zinc-600 hover:bg-black/6"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-400">
                    <RectangleStackIcon className="h-3 w-3 text-white" />
                  </span>
                  <span>All</span>
                </div>
              </li>
            )}
            {groups?.map((group: Group) => (
              <GroupItem
                key={group.id}
                group={group}
                isActive={activeGroupId === group.id}
                onSelect={onGroupSelect}
                onDelete={handleDeleteGroup}
              />
            ))}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="w-52 px-3 pb-3 space-y-1">
          {twitterAccount ? (
            isInterrupted ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500">
                <RefreshCw size={12} className="animate-spin shrink-0" />
                <span>
                  Syncing... {resumeTime ? `next batch at ${resumeTime}` : "resuming soon"}
                </span>
              </div>
            ) : (
              <Button
                variant="link"
                onClick={() =>
                  sileo.promise(
                    new Promise((resolve, reject) => {
                      syncTwitter(undefined, {
                        onSuccess: (data) => {
                          resolve(data);
                          if (data.status === "interrupted")
                            sileo.warning({
                              title: "Rate limited by X",
                              description:
                                "Remaining bookmarks will sync automatically.",
                            });
                        },
                        onError: (err) => reject(err),
                      });
                    }),
                    {
                      loading: { title: "Syncing bookmarks from X..." },
                      success: (data) => ({
                        title: `Synced ${(data as { synced: number }).synced} bookmarks from X`,
                      }),
                      error: (err) => ({
                        title:
                          (err as Error).message || "Failed to sync bookmarks",
                      }),
                    },
                  )
                }
                disabled={isSyncing}
                className="w-full justify-start text-zinc-500 hover:text-zinc-600"
              >
                {isSyncing ? "Syncing..." : "Sync X Bookmarks"}
                <RefreshCw
                  size={14}
                  className={isSyncing ? "animate-spin" : ""}
                />
              </Button>
            )
          ) : (
            <Button
              variant="link"
              onClick={() => linkTwitter()}
              className="w-full justify-between text-zinc-500 hover:text-zinc-600"
            >
              Connect X <XIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
