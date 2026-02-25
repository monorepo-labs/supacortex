"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, RefreshCw, Trash2, PanelRight } from "lucide-react";
import XIcon from "./XIcon";
import { RectangleStackIcon } from "@heroicons/react/20/solid";
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
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type { Session } from "@opencode-ai/sdk/client";
import GroupIconPicker, { ICON_MAP } from "./GroupIconPicker";
import SyncDateFilterModal from "./SyncDateFilterModal";
import SyncPaymentModal from "./SyncPaymentModal";
import { usePaymentStatus } from "@/hooks/use-payments";
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

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onOpenInPanel,
}: {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenInPanel?: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li>
      <ContextMenu onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect(session.id)}
            className={`flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
              isActive
                ? "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <span className="truncate">{session.title || "Untitled"}</span>
          </button>
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
                  onDelete(session.id);
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
            <>
              {onOpenInPanel && (
                <>
                  <ContextMenuItem
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenInPanel(session.id);
                      document.dispatchEvent(
                        new KeyboardEvent("keydown", { key: "Escape" }),
                      );
                    }}
                  >
                    <PanelRight size={14} />
                    Open in new panel
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuItem
                variant="destructive"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 size={14} />
                Delete conversation
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}

/** Convert opencode timestamp to ms — handles both Unix seconds and milliseconds */
function toMs(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

function groupSessionsByDate(sessions: Session[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const last7Days = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Session[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  const sorted = [...sessions].sort((a, b) => b.time.updated - a.time.updated);

  for (const s of sorted) {
    const d = new Date(toMs(s.time.updated));
    if (d >= today) groups[0].items.push(s);
    else if (d >= yesterday) groups[1].items.push(s);
    else if (d >= last7Days) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter((g) => g.items.length > 0);
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
  workspaceControls,
  opencodeSessions,
  opencodeConnected,
  onDeleteSession,
  onOpenInPanel,
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
  workspaceControls?: React.ReactNode;
  opencodeSessions?: Session[];
  opencodeConnected?: boolean;
  onDeleteSession?: (id: string) => void;
  onOpenInPanel?: (sessionId: string) => void;
}) {
  const { data: groups } = useGroups();
  const { mutate: createGroup } = useCreateGroup();
  const { mutate: deleteGroup } = useDeleteGroup();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const { mutate: syncTwitter, isPending: isSyncing } = useSyncTwitter();
  const { data: syncStatus } = useSyncStatus(!!twitterAccount);

  const { data: paymentData, isLoading: isPaymentLoading } = usePaymentStatus();

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const sessions = opencodeSessions ?? [];

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
    if (isPaymentLoading) return;
    if (!paymentData?.hasPaid) {
      setShowPaymentModal(true);
      return;
    }
    // First sync → show year picker modal
    if (syncStatus?.status === "none") {
      setShowDateFilter(true);
    } else {
      // Incremental sync — show confirmation
      setShowSyncConfirm(true);
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
      <aside
        className="flex h-full shrink-0 flex-col bg-background tauri:bg-transparent overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? 0 : 208 }}
      >
        {sidebarTab === "library" ? (
          <>
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
                      {resumeTime
                        ? `next batch at ${resumeTime}`
                        : "resuming soon"}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className="w-full justify-start text-zinc-500 hover:text-zinc-600"
                  >
                    <RefreshCw
                      size={14}
                      className={isSyncing ? "animate-spin" : ""}
                    />
                    {isSyncing ? "Syncing..." : "Sync X Bookmarks"}
                  </Button>
                )
              ) : (
                <Button
                  variant="link"
                  onClick={() => linkTwitter()}
                  className="w-full justify-start text-zinc-500 hover:text-zinc-600"
                >
                  <XIcon className="h-3.5 w-3.5" /> Connect X
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Conversations */}
            <div className="relative mt-4 flex-1 w-52 min-h-0">
              <nav className="h-full px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <Button
                onClick={() => onNewConversation?.()}
                variant="link"
                className="w-full justify-start text-zinc-500 hover:text-zinc-600 no-underline hover:no-underline"
              >
                <Plus size={14} />
                New Chat
              </Button>
              {twitterAccount ? (
                isInterrupted ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500">
                    <RefreshCw size={12} className="animate-spin shrink-0" />
                    <span>
                      Syncing...{" "}
                      {resumeTime
                        ? `next batch at ${resumeTime}`
                        : "resuming soon"}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className="w-full justify-start text-zinc-500 hover:text-zinc-600 no-underline hover:no-underline"
                  >
                    <RefreshCw
                      size={14}
                      className={isSyncing ? "animate-spin" : ""}
                    />
                    {isSyncing ? "Syncing..." : "Sync X Bookmarks"}
                  </Button>
                )
              ) : (
                <Button
                  variant="link"
                  onClick={() => linkTwitter()}
                  className="w-full justify-start text-zinc-500 hover:text-zinc-600 no-underline hover:no-underline"
                >
                  <XIcon className="h-3.5 w-3.5" /> Connect X
                </Button>
              )}
              {sessions.length > 0 &&
                groupSessionsByDate(sessions).map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-medium text-zinc-400 px-2 pt-3 pb-1">
                      {group.label}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {group.items.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          isActive={activeConversationId === session.id}
                          onSelect={(id) => onConversationSelect?.(id)}
                          onDelete={(id) => onDeleteSession?.(id)}
                          onOpenInPanel={onOpenInPanel}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
            </div>
            {workspaceControls && (
              <div className="w-52 px-3 pb-3">
                {workspaceControls}
              </div>
            )}
          </>
        )}
      </aside>

      <SyncPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />

      <SyncDateFilterModal
        open={showDateFilter}
        onConfirm={handleDateFilterConfirm}
      />

      <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sync bookmarks?</DialogTitle>
            <DialogDescription>
              This will fetch new bookmarks from X since your last sync.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSyncConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSyncConfirm(false);
                triggerSync();
              }}
            >
              Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
