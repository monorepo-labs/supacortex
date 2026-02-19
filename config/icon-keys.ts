/**
 * Valid icon key names for groups.
 * Must stay in sync with ICON_MAP in app/components/GroupIconPicker.tsx
 */
export const ICON_KEYS = [
  // General
  "hash", "star", "heart", "sparkles", "zap", "flame", "lightbulb", "sun", "moon",
  "flag", "trophy", "gift", "cake", "smile", "like", "check", "warning", "x-circle",
  // Content & media
  "bookmark", "book", "newspaper", "document-text", "photo", "camera", "film",
  "video-camera", "music", "play", "mic", "volume", "radio", "tv", "rss",
  // Communication
  "mail", "chat", "send", "phone", "megaphone", "bell", "inbox", "at-symbol",
  // Navigation & actions
  "search", "link", "share", "download", "upload", "refresh", "trending-up",
  "plus-circle", "list-bullet",
  // Organization
  "folder", "folder-open", "archive", "tag", "clipboard", "layers", "grid", "table-cells",
  // People
  "user", "user-circle", "user-group", "users",
  // Places & objects
  "home", "map-pin", "map", "globe", "building-library", "building-storefront",
  // Work & business
  "briefcase", "academic-cap", "banknotes", "wallet", "credit-card", "currency-dollar",
  "shopping-cart", "chart-bar", "chart-pie", "scale", "calculator",
  // Tools & editing
  "pencil", "edit", "paint-brush", "palette", "wrench", "settings", "adjustments",
  "trash", "printer", "paper-clip", "qr-code",
  // Tech & dev
  "code", "terminal", "database", "server", "cpu", "cube", "bug-ant", "beaker", "puzzle",
  // Devices & connectivity
  "monitor", "phone2", "wifi", "signal", "cloud",
  // Security & identity
  "lock", "unlock", "shield", "key", "finger-print", "eye",
  // Time & scheduling
  "clock", "calendar",
  // Misc
  "rocket", "language",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];
