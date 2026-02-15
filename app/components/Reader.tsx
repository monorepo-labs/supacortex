"use client";

import { type CSSProperties, type DragEvent } from "react";
import Image from "next/image";
import { X, ExternalLink, GripVertical, FolderPlus } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useImageLightbox } from "./ImageLightbox";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import AddToGroupMenu from "./AddToGroupMenu";
import type { BookmarkData } from "./BookmarkNode";

export default function Reader({
  bookmark,
  onClose,
  style,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
  style?: CSSProperties;
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
}) {
  const isTweet = bookmark.type === "tweet";

  return (
    <div
      className="group/reader shrink-0 border border-zinc-200 rounded-xl overflow-hidden bg-white"
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="h-full flex flex-col">
        {isTweet ? (
          <TweetPanel bookmark={bookmark} onClose={onClose} />
        ) : bookmark.type === "youtube" ? (
          <YouTubePanel bookmark={bookmark} onClose={onClose} />
        ) : (
          <LinkPanel bookmark={bookmark} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ── Close button with tooltip ──────────────────────────────────────

function DragHandle() {
  return (
    <div className="cursor-grab active:cursor-grabbing rounded-lg p-1.5 text-zinc-300 hover:text-zinc-500 transition-colors">
      <GripVertical size={14} />
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>Esc to close</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Shared reader header ──────────────────────────────────────────

function ReaderHeader({
  bookmark,
  label,
  onClose,
}: {
  bookmark: BookmarkData;
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
      <div className="flex items-center gap-1">
        <DragHandle />
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <ExternalLink size={12} />
          {label}
        </a>
      </div>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
              <FolderPlus size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-56 p-0">
            <AddToGroupMenu
              bookmarkIds={[bookmark.id]}
              currentGroupIds={bookmark.groupIds ?? []}
            />
          </PopoverContent>
        </Popover>
        <CloseButton onClose={onClose} />
      </div>
    </div>
  );
}

// ── Linkify plain-text URLs in tweet content ───────────────────────

const URL_RE = /(https?:\/\/[^\s)]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700 break-all"
          >
            {part.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ── Tweet Panel — embedded tweet style ─────────────────────────────

function TweetPanel({
  bookmark,
  onClose,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
}) {
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

  // Collect all non-video image URLs for lightbox
  const imageUrls: string[] = [];
  if (media && !isVideo) imageUrls.push(media.url);
  if (quoteMedia && !quoteMediaIsVideo) imageUrls.push(quoteMedia.url);
  const { openAt, lightbox } = useImageLightbox(imageUrls);

  // Split quote/retweet from main content
  const quoteMatch = bookmark.content?.match(
    /\n\n> (Quote|Retweet) from ([\s\S]+)/,
  );
  const mainContent = quoteMatch
    ? bookmark.content!.slice(0, quoteMatch.index!)
    : bookmark.content;
  const quoteContent = quoteMatch ? quoteMatch[0] : null;

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
            className="block rounded-xl border border-zinc-200 overflow-hidden hover:bg-zinc-50/50 transition-colors no-underline"
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                {quoteAvatar ? (
                  <Image
                    src={quoteAvatar.url}
                    alt=""
                    width={18}
                    height={18}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-[18px] w-[18px] rounded-full bg-zinc-200" />
                )}
                <span className="text-sm font-medium text-zinc-900">
                  @{username ?? "unknown"}
                </span>
              </div>
              <p className="text-[14px] text-zinc-700 leading-normal whitespace-pre-wrap">
                <Linkified text={body.trim()} />
              </p>
            </div>
            {quoteMedia && (
              <div className="overflow-hidden rounded-b-xl">
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
                    width={440}
                    height={280}
                    className="w-full object-cover cursor-pointer"
                    unoptimized
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const idx = imageUrls.indexOf(quoteMedia.url);
                      if (idx !== -1) openAt(idx);
                    }}
                  />
                )}
              </div>
            )}
          </a>
        );
      })()
    : null;

  return (
    <>
      <ReaderHeader bookmark={bookmark} label="View on X" onClose={onClose} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-light">
        <div className="p-5">
          {/* Author */}
          <div className="flex items-center gap-2.5 mb-3">
            {avatar ? (
              <Image
                src={avatar.url}
                alt=""
                width={40}
                height={40}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-zinc-200" />
            )}
            {bookmark.author && (
              <a
                href={`https://x.com/${bookmark.author}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold text-zinc-900 hover:text-zinc-500 transition-colors"
              >
                @{bookmark.author}
              </a>
            )}
          </div>

          {/* Tweet content */}
          {mainContent && (
            <p
              className="text-[16px] text-zinc-900 leading-relaxed whitespace-pre-wrap break-words mb-4"
            >
              <Linkified text={mainContent} />
            </p>
          )}

          {/* Media — rounded */}
          {media && (
            <div className="overflow-hidden rounded-xl mb-4">
              {isVideo && media.videoUrl ? (
                <video
                  src={`/api/media?url=${encodeURIComponent(media.videoUrl)}`}
                  poster={media.url}
                  controls
                  playsInline
                  className="w-full"
                />
              ) : (
                <Image
                  src={media.url}
                  alt=""
                  width={440}
                  height={300}
                  className="w-full object-cover rounded-xl cursor-pointer"
                  unoptimized
                  onClick={() => {
                    const idx = imageUrls.indexOf(media.url);
                    if (idx !== -1) openAt(idx);
                  }}
                />
              )}
            </div>
          )}

          {/* Quote block */}
          {quoteBlock}
        </div>
      </div>

      {lightbox}
    </>
  );
}

// ── YouTube Panel — embedded video + transcript ─────────────────────

function YouTubePanel({
  bookmark,
  onClose,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
}) {
  const ytMedia = bookmark.mediaUrls?.find((m) => m.type === "youtube");
  const videoId = ytMedia?.videoUrl
    ? new URL(ytMedia.videoUrl).searchParams.get("v")
    : null;

  return (
    <>
      <ReaderHeader
        bookmark={bookmark}
        label="Watch on YouTube"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto scrollbar-light">
        {/* Video embed */}
        {videoId && (
          <div className="p-4 pb-0">
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={bookmark.title ?? "YouTube video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        <div className="px-5 pt-5 pb-12">
          {/* Title + channel */}
          {bookmark.title && (
            <h1
              style={{ fontFamily: "var(--font-source-serif)" }}
              className="mb-2 text-xl font-medium leading-tight text-zinc-900"
            >
              {bookmark.title}
            </h1>
          )}
          {bookmark.author && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(bookmark.author)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-6 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              {bookmark.author}
            </a>
          )}

          {/* Transcript */}
          {bookmark.content && (
            <>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Transcript
              </h2>
              <p className="text-[15px] leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {bookmark.content}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Link Panel — article/link reader ───────────────────────────────

function LinkPanel({
  bookmark,
  onClose,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
}) {
  const displayTitle = bookmark.title;
  const avatar = bookmark.mediaUrls?.find((m) => m.type === "avatar");
  const media = bookmark.mediaUrls?.find(
    (m) => m.type !== "avatar" && !m.type.startsWith("quote_"),
  );
  const isVideo = media?.type === "video" || media?.type === "animated_gif";

  // Collect image URLs for lightbox: featured image + markdown content images
  const contentImages: string[] = [];
  if (media && !isVideo) contentImages.push(media.url);
  // Extract image URLs from markdown content
  if (bookmark.content) {
    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imgRegex.exec(bookmark.content)) !== null) {
      if (match[1]) contentImages.push(match[1]);
    }
  }
  const { openAt, lightbox } = useImageLightbox(contentImages);

  const mdComponents = {
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const src = typeof props.src === "string" ? props.src : undefined;
      const idx = src ? contentImages.indexOf(src) : -1;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={props.alt ?? ""}
          className={idx !== -1 ? "cursor-pointer" : undefined}
          onClick={idx !== -1 ? () => openAt(idx) : undefined}
        />
      );
    },
  };

  return (
    <>
      <ReaderHeader
        bookmark={bookmark}
        label={new URL(bookmark.url).hostname.replace("www.", "")}
        onClose={onClose}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-light">
        <div className="px-5 pt-6 pb-12">
          {displayTitle && (
            <h1
              style={{ fontFamily: "var(--font-source-serif)" }}
              className="mb-6 text-2xl font-medium leading-tight text-zinc-900"
            >
              {displayTitle}
            </h1>
          )}

          {(bookmark.author || avatar) && (
            <div className="mb-6 flex items-center gap-2">
              {avatar && (
                <Image
                  src={avatar.url}
                  alt=""
                  width={22}
                  height={22}
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

          {media && (
            <div className="mb-6 overflow-hidden rounded-xl">
              {isVideo && media.videoUrl ? (
                <video
                  src={`/api/media?url=${encodeURIComponent(media.videoUrl)}`}
                  poster={media.url}
                  controls
                  playsInline
                  className="w-full"
                />
              ) : (
                <Image
                  src={media.url}
                  alt=""
                  width={440}
                  height={280}
                  className="w-full object-cover cursor-pointer"
                  unoptimized
                  onClick={() => {
                    const idx = contentImages.indexOf(media.url);
                    if (idx !== -1) openAt(idx);
                  }}
                />
              )}
            </div>
          )}

          {bookmark.content ? (
            <>
              <style>{`
                .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4 { font-weight: 500; letter-spacing: -0.01em; }
                .reader-content p { font-size: 16px; line-height: 1.5; }
                .reader-content ul, .reader-content ol { margin-top: 1rem; margin-bottom: 1rem; padding-left: 1.5rem; }
                .reader-content li { margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5; }
                .reader-content li > ul, .reader-content li > ol { margin-top: 0.25rem; margin-bottom: 0.25rem; }
                .reader-content img { border-radius: 0.75rem; }
                .reader-content a { color: #52525b; text-underline-offset: 3px; overflow-wrap: break-word; word-break: break-all; }
                .reader-content pre { background: #fafafa; font-size: 0.875rem; }
              `}</style>
              <div className="prose prose-zinc prose-base max-w-none reader-content">
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {bookmark.content}
                </Markdown>
              </div>
            </>
          ) : (
            <p className="text-zinc-400">No content available.</p>
          )}
        </div>
      </div>

      {lightbox}
    </>
  );
}
