"use client";

import { useState, useRef, useEffect } from "react";
import { PanelLeft, Plus, RefreshCw, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useTags, useCreateTag, useRenameTag, useUpdateTag } from "@/hooks/use-tags";
import { useTwitterAccount, useLinkTwitter, useSyncTwitter } from "@/hooks/use-twitter";
import TagIconPicker, { ICON_MAP } from "./TagIconPicker";

type Tag = { id: string; name: string; color: string; icon?: string | null };

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 55%, 55%)`;
}

function TagIcon({ color, iconName }: { color: string; iconName: string }) {
  const Icon = ICON_MAP[iconName] ?? ICON_MAP.hash;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-3 w-3 text-white" />
    </span>
  );
}

function TagItem({ tag }: { tag: Tag }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: rename } = useRenameTag();
  const { mutate: updateTag } = useUpdateTag();

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== tag.name) {
      rename({ id: tag.id, name: trimmed });
    } else {
      setName(tag.name);
    }
  };

  const iconName = tag.icon ?? "hash";

  if (editing) {
    return (
      <li>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <TagIcon color={tag.color} iconName={iconName} />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setName(tag.name);
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
      <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100">
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <TagIcon color={tag.color} iconName={iconName} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" sideOffset={8}>
            <TagIconPicker
              color={tag.color}
              icon={iconName}
              onColorChange={(color) => updateTag({ id: tag.id, color })}
              onIconChange={(icon) => updateTag({ id: tag.id, icon })}
            />
          </PopoverContent>
        </Popover>
        <button
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-left cursor-default"
        >
          {tag.name}
        </button>
      </div>
    </li>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: tags } = useTags();
  const { mutate: createTag } = useCreateTag();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const { mutate: syncTwitter, isPending: isSyncing } = useSyncTwitter();

  const handleAddTag = () => {
    createTag({ name: "Untitled", color: randomColor() });
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-3 top-3 z-20 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        <PanelLeft size={18} />
      </button>
    );
  }

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col bg-background">
      {/* Toggle */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      {/* Categories */}
      <nav className="mt-4 flex-1 px-3">
        <ul className="flex flex-col gap-0.5">
          {tags?.map((tag: Tag) => (
            <TagItem key={tag.id} tag={tag} />
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-3 space-y-1">
        {twitterAccount ? (
          <Button
            variant="link"
            onClick={() =>
              syncTwitter(undefined, {
                onSuccess: (data) =>
                  toast.success(`Synced ${data.synced} bookmarks from X`),
                onError: (err) => toast.error(err.message),
              })
            }
            disabled={isSyncing}
            className="w-full justify-start text-zinc-500 hover:text-zinc-600"
          >
            {isSyncing ? "Syncing..." : "Sync X Bookmarks"}
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          </Button>
        ) : (
          <Button
            variant="link"
            onClick={() => linkTwitter()}
            className="w-full justify-start text-zinc-500 hover:text-zinc-600"
          >
            Connect X <Twitter size={14} />
          </Button>
        )}
        <Button
          variant="link"
          onClick={handleAddTag}
          className="w-full justify-start text-zinc-500 hover:text-zinc-600"
        >
          New Category <Plus size={14} />
        </Button>
      </div>
    </aside>
  );
}
