"use client";

import { useState, useRef, useEffect } from "react";
import { PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTags, useCreateTag, useRenameTag } from "@/hooks/use-tags";

type Tag = { id: string; name: string; color: string };

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 55%, 55%)`;
}

function TagItem({ tag }: { tag: Tag }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: rename } = useRenameTag();

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

  if (editing) {
    return (
      <li>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
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
      <button
        onDoubleClick={() => setEditing(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
        <span className="flex-1 text-left">{tag.name}</span>
      </button>
    </li>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: tags } = useTags();
  const { mutate: createTag } = useCreateTag();

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
        <ul>
          {tags?.map((tag: Tag) => (
            <TagItem key={tag.id} tag={tag} />
          ))}
        </ul>
      </nav>

      {/* New category button */}
      <div className="px-3 pb-3">
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
