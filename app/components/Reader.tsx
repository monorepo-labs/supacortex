"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import type { BookmarkData } from "./BookmarkNode";

export default function Reader({
  bookmark,
  onClose,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
}) {
  const displayTitle = bookmark.title;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const image = bookmark.mediaUrls?.find((m) => m.type !== "avatar");
  const [open, setOpen] = useState(false);

  // Trigger slide-up on mount
  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel — slides up from bottom */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-background shadow-2xl transition-transform duration-300 ease-out"
        style={{
          height: "calc(100vh - 2rem)",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <ExternalLink size={12} />
            {new URL(bookmark.url).hostname.replace("www.", "")}
          </a>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 pt-8 pb-16">
            {displayTitle && (
              <h1
                style={{ fontFamily: "var(--font-source-serif)" }}
                className="mb-10 text-4xl font-medium leading-tight text-zinc-900"
              >
                {displayTitle}
              </h1>
            )}

            {(bookmark.author || avatar) && (
              <div className="mb-8 flex items-center gap-2">
                {avatar && (
                  <Image
                    src={avatar.url}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                )}
                {bookmark.author && (
                  <span className="text-sm text-zinc-500">
                    @{bookmark.author}
                  </span>
                )}
              </div>
            )}

            {image && (
              <div className="mb-8 overflow-hidden rounded-xl">
                <Image
                  src={image.url}
                  alt=""
                  width={672}
                  height={400}
                  className="w-full object-cover"
                  unoptimized
                />
              </div>
            )}

            {bookmark.content ? (
              <>
                <style>{`
                  .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 { font-weight: 500; letter-spacing: -0.01em; }
                  .reader-content p { line-height: 1.8; }
                  .reader-content ul, .reader-content ol { margin-top: 1rem; margin-bottom: 1rem; padding-left: 1.5rem; }
                  .reader-content li { margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.75; }
                  .reader-content li > ul, .reader-content li > ol { margin-top: 0.25rem; margin-bottom: 0.25rem; }
                  .reader-content img { border-radius: 0.75rem; }
                  .reader-content a { color: #52525b; text-underline-offset: 3px; }
                  .reader-content pre { background: #fafafa; font-size: 0.875rem; }
                  .reader-content blockquote { border-color: #e4e4e7; color: #71717a; }
                `}</style>
                <div className="prose prose-zinc prose-lg max-w-none reader-content">
                  <Markdown>{bookmark.content}</Markdown>
                </div>
              </>
            ) : (
              <p className="text-zinc-400">No content available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
