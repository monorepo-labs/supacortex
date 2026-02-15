"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BookmarkData } from "./BookmarkNode";

export default function Reader({
  bookmark,
  onClose,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
}) {
  const displayTitle = bookmark.title;
  const isQuoteType = (t: string) => t.startsWith("quote_");
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const quoteAvatar = bookmark.mediaUrls?.find(
    (m) => m.type === "quote_avatar",
  );
  const quoteMedia = bookmark.mediaUrls?.find(
    (m) => isQuoteType(m.type) && m.type !== "quote_avatar",
  );
  const quoteMediaIsVideo =
    quoteMedia?.type === "quote_video" ||
    quoteMedia?.type === "quote_animated_gif";
  const media = bookmark.mediaUrls?.find(
    (m) => !isQuoteType(m.type) && m.type !== "avatar",
  );
  const isVideo = media?.type === "video" || media?.type === "animated_gif";
  const isTweet = bookmark.type === "tweet" || bookmark.type === "article";
  const [open, setOpen] = useState(false);

  // Split quote/retweet from main content
  const quoteMatch = bookmark.content?.match(
    /\n\n> (Quote|Retweet) from ([\s\S]+)/,
  );
  const mainContent = quoteMatch
    ? bookmark.content!.slice(0, quoteMatch.index!)
    : bookmark.content;
  const quoteContent = quoteMatch ? quoteMatch[0] : null;

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

  const mdComponents = {
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  };

  const contentBlock = mainContent ? (
    <>
      <style>{`
        .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 { font-weight: 500; letter-spacing: -0.01em; }
        .reader-content p { line-height: 1.5; }
        .reader-content ul, .reader-content ol { margin-top: 1rem; margin-bottom: 1rem; padding-left: 1.5rem; }
        .reader-content li { margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5; }
        .reader-content li > ul, .reader-content li > ol { margin-top: 0.25rem; margin-bottom: 0.25rem; }
        .reader-content img { border-radius: 0.75rem; }
        .reader-content a { color: #52525b; text-underline-offset: 3px; overflow-wrap: break-word; word-break: break-all; }
        .reader-content pre { background: #fafafa; font-size: 0.875rem; }
      `}</style>
      <div className="prose prose-zinc prose-lg max-w-none reader-content mb-8">
        <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {mainContent}
        </Markdown>
      </div>
    </>
  ) : (
    <p className="text-zinc-400">No content available.</p>
  );

  const quoteBlock = quoteContent
    ? (() => {
        const lines = quoteContent
          .trim()
          .split("\n")
          .map((l) => l.replace(/^> ?/, ""));
        const headerLine = lines[0];
        const body = lines.slice(1).join("\n");
        const linkMatch = headerLine.match(/\[(@\w+)\]\((https?:\/\/[^)]+)\)/);
        const username = linkMatch?.[1]?.replace("@", "");
        const tweetUrl = linkMatch?.[2];
        return (
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 rounded-2xl border border-zinc-200 overflow-hidden hover:bg-zinc-50/50 transition-colors no-underline"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                {quoteAvatar ? (
                  <Image
                    src={quoteAvatar.url}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-zinc-200" />
                )}
                <span className="text-sm font-medium text-zinc-900">
                  @{username ?? "unknown"}
                </span>
              </div>
              <p className="text-[15px] text-zinc-800 leading-normal whitespace-pre-wrap">
                {body.trim()}
              </p>
            </div>
            {quoteMedia && (
              <div className="border-t border-zinc-100">
                {quoteMediaIsVideo && quoteMedia.videoUrl ? (
                  <video
                    src={`/api/media?url=${encodeURIComponent(quoteMedia.videoUrl)}`}
                    poster={quoteMedia.url}
                    controls
                    playsInline
                    className="w-full"
                  />
                ) : (
                  <Image
                    src={quoteMedia.url}
                    alt=""
                    width={672}
                    height={400}
                    className="w-full object-cover"
                    unoptimized
                  />
                )}
              </div>
            )}
          </a>
        );
      })()
    : null;

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
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-card shadow-2xl transition-transform duration-300 ease-out"
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
                  <a
                    href={`https://x.com/${bookmark.author}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-900 hover:text-zinc-500 transition-colors"
                  >
                    @{bookmark.author}
                  </a>
                )}
              </div>
            )}

            {/* For tweets: content first, then media. For others: media first. */}
            {isTweet && contentBlock}

            {media && (
              <div className="mb-8 overflow-hidden rounded-xl">
                {isVideo && media.videoUrl ? (
                  <video
                    src={`/api/media?url=${encodeURIComponent(media.videoUrl)}`}
                    poster={media.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full"
                  />
                ) : (
                  <Image
                    src={media.url}
                    alt=""
                    width={672}
                    height={400}
                    className="w-full object-cover"
                    unoptimized
                  />
                )}
              </div>
            )}

            {quoteBlock}

            {!isTweet && contentBlock}
          </div>
        </div>
      </div>
    </div>
  );
}
