"use client";

import { useState, useMemo } from "react";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  AtSymbolIcon,
  BanknotesIcon,
  BeakerIcon,
  BellIcon,
  BoltIcon,
  BookmarkIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  CalculatorIcon,
  CalendarIcon,
  CameraIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleStackIcon,
  ClipboardIcon,
  ClockIcon,
  CloudIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CreditCardIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FilmIcon,
  FingerPrintIcon,
  FireIcon,
  FlagIcon,
  FolderIcon,
  FolderOpenIcon,
  GiftIcon,
  GlobeAltIcon,
  HandThumbUpIcon,
  HashtagIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  KeyIcon,
  LanguageIcon,
  LightBulbIcon,
  LinkIcon,
  ListBulletIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  MegaphoneIcon,
  MicrophoneIcon,
  MoonIcon,
  MusicalNoteIcon,
  NewspaperIcon,
  PaintBrushIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
  PlayIcon,
  PlusCircleIcon,
  PrinterIcon,
  PuzzlePieceIcon,
  QrCodeIcon,
  RadioIcon,
  RectangleStackIcon,
  RocketLaunchIcon,
  RssIcon,
  ScaleIcon,
  ServerIcon,
  ShareIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SignalIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  StarIcon,
  SunIcon,
  SwatchIcon,
  TableCellsIcon,
  TagIcon,
  TrashIcon,
  TrophyIcon,
  TvIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  VideoCameraIcon,
  WalletIcon,
  WifiIcon,
  WrenchIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import type { ComponentType, SVGProps } from "react";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

const COLORS = [
  "hsl(0, 65%, 55%)", "hsl(340, 60%, 55%)", "hsl(320, 50%, 55%)",
  "hsl(15, 70%, 55%)", "hsl(30, 65%, 55%)", "hsl(45, 60%, 55%)",
  "hsl(90, 40%, 48%)", "hsl(130, 40%, 45%)", "hsl(160, 45%, 42%)",
  "hsl(180, 45%, 45%)", "hsl(200, 60%, 50%)", "hsl(220, 60%, 55%)",
  "hsl(240, 50%, 58%)", "hsl(260, 50%, 55%)", "hsl(280, 45%, 55%)",
  "hsl(0, 0%, 45%)", "hsl(0, 0%, 25%)", "hsl(30, 10%, 55%)",
];

export const ICON_MAP: Record<string, HeroIcon> = {
  // General
  hash: HashtagIcon,
  star: StarIcon,
  heart: HeartIcon,
  sparkles: SparklesIcon,
  zap: BoltIcon,
  flame: FireIcon,
  lightbulb: LightBulbIcon,
  sun: SunIcon,
  moon: MoonIcon,
  flag: FlagIcon,
  trophy: TrophyIcon,
  gift: GiftIcon,
  cake: CakeIcon,
  smile: FaceSmileIcon,
  like: HandThumbUpIcon,
  check: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  "x-circle": XCircleIcon,

  // Content & media
  bookmark: BookmarkIcon,
  book: BookOpenIcon,
  newspaper: NewspaperIcon,
  "document-text": DocumentTextIcon,
  photo: PhotoIcon,
  camera: CameraIcon,
  film: FilmIcon,
  "video-camera": VideoCameraIcon,
  music: MusicalNoteIcon,
  play: PlayIcon,
  mic: MicrophoneIcon,
  volume: SpeakerWaveIcon,
  radio: RadioIcon,
  tv: TvIcon,
  rss: RssIcon,

  // Communication
  mail: EnvelopeIcon,
  chat: ChatBubbleLeftIcon,
  send: PaperAirplaneIcon,
  phone: PhoneIcon,
  megaphone: MegaphoneIcon,
  bell: BellIcon,
  inbox: InboxIcon,
  "at-symbol": AtSymbolIcon,

  // Navigation & actions
  search: MagnifyingGlassIcon,
  link: LinkIcon,
  share: ShareIcon,
  download: ArrowDownTrayIcon,
  upload: ArrowUpTrayIcon,
  refresh: ArrowPathIcon,
  "trending-up": ArrowTrendingUpIcon,
  "plus-circle": PlusCircleIcon,
  "list-bullet": ListBulletIcon,

  // Organization
  folder: FolderIcon,
  "folder-open": FolderOpenIcon,
  archive: ArchiveBoxIcon,
  tag: TagIcon,
  clipboard: ClipboardIcon,
  layers: RectangleStackIcon,
  grid: Squares2X2Icon,
  "table-cells": TableCellsIcon,

  // People
  user: UserIcon,
  "user-circle": UserCircleIcon,
  "user-group": UserGroupIcon,
  users: UsersIcon,

  // Places & objects
  home: HomeIcon,
  "map-pin": MapPinIcon,
  map: MapIcon,
  globe: GlobeAltIcon,
  "building-library": BuildingLibraryIcon,
  "building-storefront": BuildingStorefrontIcon,

  // Work & business
  briefcase: BriefcaseIcon,
  "academic-cap": AcademicCapIcon,
  banknotes: BanknotesIcon,
  wallet: WalletIcon,
  "credit-card": CreditCardIcon,
  "currency-dollar": CurrencyDollarIcon,
  "shopping-cart": ShoppingCartIcon,
  "chart-bar": ChartBarIcon,
  "chart-pie": ChartPieIcon,
  scale: ScaleIcon,
  calculator: CalculatorIcon,

  // Tools & editing
  pencil: PencilSquareIcon,
  edit: PencilIcon,
  "paint-brush": PaintBrushIcon,
  palette: SwatchIcon,
  wrench: WrenchIcon,
  settings: Cog6ToothIcon,
  adjustments: AdjustmentsHorizontalIcon,
  trash: TrashIcon,
  printer: PrinterIcon,
  "paper-clip": PaperClipIcon,
  "qr-code": QrCodeIcon,

  // Tech & dev
  code: CodeBracketIcon,
  terminal: CommandLineIcon,
  database: CircleStackIcon,
  server: ServerIcon,
  cpu: CpuChipIcon,
  cube: CubeIcon,
  "bug-ant": BugAntIcon,
  beaker: BeakerIcon,
  puzzle: PuzzlePieceIcon,

  // Devices & connectivity
  monitor: ComputerDesktopIcon,
  phone2: DevicePhoneMobileIcon,
  wifi: WifiIcon,
  signal: SignalIcon,
  cloud: CloudIcon,

  // Security & identity
  lock: LockClosedIcon,
  unlock: LockOpenIcon,
  shield: ShieldCheckIcon,
  key: KeyIcon,
  "finger-print": FingerPrintIcon,
  eye: EyeIcon,

  // Time & scheduling
  clock: ClockIcon,
  calendar: CalendarIcon,

  // Misc
  rocket: RocketLaunchIcon,
  language: LanguageIcon,
};

const ALL_KEYS = Object.keys(ICON_MAP);

export default function GroupIconPicker({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
}) {
  const [search, setSearch] = useState("");

  const displayedIcons = useMemo(() => {
    if (!search.trim()) return ALL_KEYS;
    const q = search.toLowerCase().replace(/\s+/g, "-");
    return ALL_KEYS.filter((name) => name.includes(q));
  }, [search]);

  return (
    <div className="flex w-52 flex-col gap-2">
      {/* Colors */}
      <div className="flex flex-wrap gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: c }}
          >
            {c === color && (
              <CheckIcon className="h-2 w-2 text-white" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1">
        <MagnifyingGlassIcon className="h-3 w-3 text-zinc-400" />
        <input
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs text-zinc-700 placeholder:text-zinc-400 outline-none"
        />
      </div>

      {/* Icons */}
      <div className="grid grid-cols-7 gap-0.5 max-h-48 overflow-x-hidden overflow-y-auto [scrollbar-width:thin]">
        {displayedIcons.map((key) => {
          const Icon = ICON_MAP[key];
          const isActive = key === icon;
          return (
            <button
              key={key}
              title={key}
              onClick={() => onIconChange(key)}
              className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors ${
                isActive
                  ? "text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
