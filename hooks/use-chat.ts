export type FileAttachment = {
  url: string;
  filename?: string;
  mediaType?: string;
};

export type BookmarkAttachment = {
  bookmarkId: string;
  bookmarkTitle: string | null;
  bookmarkUrl: string;
  bookmarkType: string;
};

export type ChatAttachment = FileAttachment | BookmarkAttachment;

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
};
