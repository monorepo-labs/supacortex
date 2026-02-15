"use client";

import { useState, useMemo } from "react";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import {
  HashtagIcon, BookmarkIcon, StarIcon, HeartIcon, FolderIcon,
  CodeBracketIcon, MusicalNoteIcon, SwatchIcon, LightBulbIcon, BoltIcon,
  GlobeAltIcon, FireIcon, CameraIcon, GiftIcon,
  RocketLaunchIcon, ShieldCheckIcon, TagIcon,
  BookOpenIcon, BriefcaseIcon, FilmIcon, MapPinIcon,
  PencilSquareIcon, FaceSmileIcon, SunIcon, TrophyIcon, UsersIcon,
  HomeIcon, BellIcon, LockClosedIcon, LockOpenIcon, EyeIcon, ClockIcon,
  CalendarIcon, CloudIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
  LinkIcon, EnvelopeIcon, PhoneIcon, ChatBubbleLeftIcon,
  PaperAirplaneIcon, Cog6ToothIcon, TrashIcon, PencilIcon,
  RectangleStackIcon, Squares2X2Icon, CommandLineIcon, CircleStackIcon,
  CpuChipIcon, WifiIcon, Battery100Icon, ComputerDesktopIcon,
  DevicePhoneMobileIcon, PrinterIcon, MicrophoneIcon, SpeakerWaveIcon,
  PlayIcon, PauseIcon, ForwardIcon, ArrowPathIcon, RadioIcon,
  SparklesIcon, CubeIcon, KeyIcon, FlagIcon, NewspaperIcon,
  HandThumbUpIcon, PhotoIcon, PuzzlePieceIcon,
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
  hash: HashtagIcon, bookmark: BookmarkIcon, star: StarIcon, heart: HeartIcon,
  folder: FolderIcon, code: CodeBracketIcon, music: MusicalNoteIcon,
  palette: SwatchIcon, lightbulb: LightBulbIcon, zap: BoltIcon,
  globe: GlobeAltIcon, flame: FireIcon, camera: CameraIcon,
  gift: GiftIcon, rocket: RocketLaunchIcon,
  shield: ShieldCheckIcon, tag: TagIcon, book: BookOpenIcon,
  briefcase: BriefcaseIcon, film: FilmIcon,
  "map-pin": MapPinIcon, pencil: PencilSquareIcon, smile: FaceSmileIcon,
  sun: SunIcon, trophy: TrophyIcon, users: UsersIcon, home: HomeIcon,
  bell: BellIcon, lock: LockClosedIcon, unlock: LockOpenIcon, eye: EyeIcon,
  clock: ClockIcon, calendar: CalendarIcon, cloud: CloudIcon,
  download: ArrowDownTrayIcon, upload: ArrowUpTrayIcon, link: LinkIcon,
  mail: EnvelopeIcon, phone: PhoneIcon, chat: ChatBubbleLeftIcon,
  send: PaperAirplaneIcon, settings: Cog6ToothIcon, trash: TrashIcon,
  edit: PencilIcon, layers: RectangleStackIcon, grid: Squares2X2Icon,
  terminal: CommandLineIcon, database: CircleStackIcon, cpu: CpuChipIcon,
  wifi: WifiIcon, battery: Battery100Icon, monitor: ComputerDesktopIcon,
  phone2: DevicePhoneMobileIcon, printer: PrinterIcon, mic: MicrophoneIcon,
  volume: SpeakerWaveIcon, play: PlayIcon, pause: PauseIcon,
  forward: ForwardIcon, refresh: ArrowPathIcon, radio: RadioIcon,
  sparkles: SparklesIcon, cube: CubeIcon, key: KeyIcon, flag: FlagIcon,
  newspaper: NewspaperIcon, like: HandThumbUpIcon, photo: PhotoIcon,
  puzzle: PuzzlePieceIcon,
};

const CURATED_KEYS = Object.keys(ICON_MAP);

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
    if (!search.trim()) return CURATED_KEYS;
    const q = search.toLowerCase().replace(/\s+/g, "-");
    return CURATED_KEYS.filter((name) => name.includes(q));
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
            {c === color && <CheckIcon className="h-2 w-2 text-white" />}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1">
        <MagnifyingGlassIcon className="h-3 w-3 text-zinc-400" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs text-zinc-700 placeholder:text-zinc-400 outline-none"
        />
      </div>

      {/* Icons */}
      <div className="grid grid-cols-7 gap-0.5 max-h-40 overflow-x-hidden overflow-y-auto [scrollbar-width:thin]">
        {displayedIcons.map((key) => {
          const Icon = ICON_MAP[key];
          const isActive = key === icon;
          return (
            <button
              key={key}
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
