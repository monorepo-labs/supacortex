"use client";

import { useState, useRef, useEffect } from "react";
import { PanelLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import XIcon from "./XIcon";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { RectangleStackIcon } from "@heroicons/react/20/solid";
import { BookOpenIcon, ChatBubbleLeftIcon } from "@heroicons/react/16/solid";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
import {
  useConversations,
  useDeleteConversation,
  type Conversation,
} from "@/hooks/use-chat";
import GroupIconPicker, { ICON_MAP } from "./GroupIconPicker";
import UserMenu from "./UserMenu";
import SyncDateFilterModal from "./SyncDateFilterModal";
import { randomColor, randomGroupName } from "@/lib/group-defaults";

type Group = { id: string; name: string; color: string; icon?: string | null };

function GroupIcon({ color, iconName }: { color: string; iconName: string }) {
  const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md shadow-card"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-2.5 w-2.5 text-white" />
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
  const [pickerOpen, setPickerOpen] = useState(false);
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
            onClick={() => {
              if (!pickerOpen) onSelect(group.id);
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors cursor-pointer ${
              isActive ? " text-zinc-900" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
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
              className="flex-1 text-left cursor-default truncate"
            >
              {group.name}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group.id);
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "Escape" }),
                  );
                }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
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
  sidebarTab = "library",
  onSidebarTabChange,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
}: {
  activeGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  sidebarTab?: "library" | "ask";
  onSidebarTabChange?: (tab: "library" | "ask") => void;
  activeConversationId?: string | null;
  onConversationSelect?: (id: string) => void;
  onNewConversation?: () => void;
}) {
  const handleDrag = useTauriDrag();
  const { data: groups } = useGroups();
  const { mutate: createGroup } = useCreateGroup();
  const { mutate: deleteGroup } = useDeleteGroup();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const { mutate: syncTwitter, isPending: isSyncing } = useSyncTwitter();
  const { data: syncStatus } = useSyncStatus(!!twitterAccount);

  const [showDateFilter, setShowDateFilter] = useState(false);
  const { data: conversations } = useConversations();
  const { mutate: deleteConversation } = useDeleteConversation();

  const isInterrupted = syncStatus?.status === "interrupted";
  const resumeTime = syncStatus?.rateLimitResetsAt
    ? new Date(syncStatus.rateLimitResetsAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Auto-trigger sync when X account is freshly connected (no sync history)
  // TODO: Re-enable once rate limit issue is resolved
  // const autoSyncTriggered = useRef(false);
  // useEffect(() => {
  //   if (twitterAccount && syncStatus?.status === "none" && !isSyncing && !autoSyncTriggered.current) {
  //     autoSyncTriggered.current = true;
  //     syncTwitter();
  //   }
  // }, [twitterAccount, syncStatus?.status, isSyncing, syncTwitter]);

  const triggerSync = (sinceYear?: number) => {
    sileo.promise(
      new Promise((resolve, reject) => {
        syncTwitter(sinceYear, {
          onSuccess: (data) => {
            resolve(data);
            if (data.status === "interrupted")
              sileo.warning({
                title: "Rate limited by X",
                description: "Remaining bookmarks will sync automatically.",
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
          title: (err as Error).message || "Failed to sync bookmarks",
        }),
      },
    );
  };

  const handleSyncClick = () => {
    // First sync → show year picker modal
    if (syncStatus?.status === "none") {
      setShowDateFilter(true);
    } else {
      // Incremental sync — no modal needed
      triggerSync();
    }
  };

  const handleDateFilterConfirm = (sinceYear: number | undefined) => {
    setShowDateFilter(false);
    triggerSync(sinceYear);
  };

  const handleAddGroup = () => {
    createGroup({ name: randomGroupName(), color: randomColor() });
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup(id, {
      onSuccess: () => {
        if (activeGroupId === id) onGroupSelect(null);
        sileo.success({ title: "Group deleted" });
      },
      onError: () => sileo.error({ title: "Failed to delete group" }),
    });
  };

  return (
    <>
      {collapsed && (
        <button
          onClick={() => onCollapsedChange(false)}
          className="absolute left-3 top-[calc(var(--titlebar-height,0px)+12px)] z-20 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <PanelLeft size={18} />
        </button>
      )}
      <aside
        className="flex h-screen shrink-0 flex-col bg-background tauri:bg-transparent overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? 0 : 208 }}
      >
        {/* Drag region for desktop app (traffic lights area) */}
        <div
          className="hidden tauri:block h-[var(--titlebar-height,0px)] w-52 shrink-0"
          onMouseDown={handleDrag}
        />

        {/* Toggle + Avatar */}
        <div className="flex w-52 items-center justify-between px-3 pt-1" onMouseDown={handleDrag}>
          <button
            onClick={() => onCollapsedChange(true)}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <PanelLeft size={18} />
          </button>
          <UserMenu />
        </div>

        {/* Tab switcher */}
        <div className="mt-6 w-52 px-3">
          <div className="flex rounded-full bg-black/5 p-0.5">
            <button
              onClick={() => onSidebarTabChange?.("library")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                sidebarTab === "library"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              Library
            </button>
            <button
              onClick={() => onSidebarTabChange?.("ask")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                sidebarTab === "ask"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
              AI
            </button>
          </div>
        </div>

        {sidebarTab === "library" ? (
          <>
            {/* Groups */}
            <nav className="mt-2 flex-1 w-52 px-3">
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
                          ? " text-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-400">
                        <RectangleStackIcon className="h-2.5 w-2.5 text-white" />
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
                      Syncing...{" "}
                      {resumeTime ? `next batch at ${resumeTime}` : "resuming soon"}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleSyncClick}
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
          </>
        ) : (
          <>
            {/* Conversations */}
            <nav className="mt-2 flex-1 w-52 px-3 overflow-y-auto">
              <Button
                onClick={() => onNewConversation?.()}
                variant="ghost"
                className="w-full justify-start text-zinc-500"
              >
                <Plus size={14} />
                New Chat
              </Button>
              <ul className="flex flex-col gap-0.5">
                {conversations?.map((conversation: Conversation) => (
                  <li key={conversation.id}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onConversationSelect?.(conversation.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                            activeConversationId === conversation.id
                              ? "text-zinc-900 bg-black/5"
                              : "text-zinc-600 hover:text-zinc-900"
                          }`}
                        >
                          <ChatBubbleLeftIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span className="truncate">{conversation.title}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem
                          variant="destructive"
                          className="gap-2"
                          onClick={() => deleteConversation(conversation.id)}
                        >
                          <Trash2 size={14} />
                          Delete conversation
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </aside>

      <SyncDateFilterModal
        open={showDateFilter}
        onConfirm={handleDateFilterConfirm}
      />
    </>
  );
}
