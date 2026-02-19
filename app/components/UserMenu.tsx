"use client";

import { useState } from "react";
import {
  LogOut,
  Unplug,
  Plus,
  Copy,
  Trash2,
  Key,
  User,
  Puzzle,
} from "lucide-react";
import XIcon from "./XIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { useTwitterAccount, useLinkTwitter, useUnlinkTwitter } from "@/hooks/use-twitter";
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from "@/hooks/use-api-keys";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/services/tanstack";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { sileo } from "sileo";
import { Avatar, AvatarImage, AvatarFallback } from "facehash";

type Tab = "account" | "api-keys" | "integrations";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "Account", icon: <User size={15} /> },
  { id: "api-keys", label: "API Keys", icon: <Key size={15} /> },
  { id: "integrations", label: "Integrations", icon: <Puzzle size={15} /> },
];

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const { data: session } = useSession();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const { mutate: unlinkTwitter } = useUnlinkTwitter();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const router = useRouter();

  const { data: apiKeys } = useApiKeys();
  const { mutate: createKey } = useCreateApiKey();
  const { mutate: deleteKey } = useDeleteApiKey();
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const user = session?.user;
  if (!user) return null;

  const avatarName = user.name ?? user.email ?? "?";

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    localStorage.removeItem("supacortex-cache");
    router.push("/login");
  };

  const handleCreateKey = () => {
    const name = newKeyName.trim() || "Untitled Key";
    sileo.promise(
      new Promise((resolve, reject) => {
        createKey(
          { name },
          {
            onSuccess: (rawKey: string) => {
              setRevealedKey(rawKey);
              setNewKeyName("");
              resolve(rawKey);
            },
            onError: reject,
          },
        );
      }),
      {
        loading: { title: "Creating API key..." },
        success: { title: "API key created. It won't be shown again." },
        error: () => ({ title: "Failed to create API key" }),
      },
    );
  };

  const handleCopy = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      sileo.success({ title: "API key copied to clipboard" });
      setRevealedKey(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirmingDeleteId === id) {
      deleteKey(
        { id },
        {
          onSuccess: () => {
            sileo.success({ title: "API key deleted" });
            setConfirmingDeleteId(null);
          },
        },
      );
    } else {
      setConfirmingDeleteId(id);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="cursor-pointer">
        <Avatar className="h-7 w-7 overflow-hidden" style={{ borderRadius: "30%" }}>
          <AvatarImage src={user.image} alt={avatarName} className="h-7 w-7 object-cover" />
          <AvatarFallback name={avatarName} facehashProps={{ size: 28, showInitial: true, enableBlink: true, colorClasses: ["bg-emerald-600"], style: { borderRadius: "30%" } }} />
        </Avatar>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setRevealedKey(null);
            setConfirmingDeleteId(null);
            setConfirmingDisconnect(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="!max-w-[560px] !gap-0 !p-0 overflow-hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account, API keys, and integrations
            </DialogDescription>
          </DialogHeader>

          {revealedKey ? (
            <div className="flex flex-col items-center justify-center min-h-[360px] p-6">
              <div className="w-full max-w-sm">
                <p className="text-sm font-medium text-zinc-900 mb-3">
                  API key created. It won{"'"}t be shown again.
                </p>
                <code className="block w-full text-sm bg-zinc-50 rounded-md px-3 py-2 border border-zinc-200 text-zinc-800 font-mono break-all select-all mb-3">
                  {revealedKey}
                </code>
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="w-full"
                >
                  <Copy size={14} />
                  Copy and close
                </Button>
              </div>
            </div>
          ) : (
          <div className="flex min-h-[360px]">
            {/* Sidebar */}
            <nav className="w-[160px] shrink-0 border-r border-zinc-200 p-2 flex flex-col gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-white/50"
                  }`}
                >
                  <span className="opacity-50">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1 p-5 overflow-y-auto">
              {activeTab === "account" && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <Avatar className="h-10 w-10 shrink-0 overflow-hidden" style={{ borderRadius: "30%" }}>
                      <AvatarImage src={user.image} alt={avatarName} className="h-10 w-10 object-cover" />
                      <AvatarFallback name={avatarName} facehashProps={{ size: 40, showInitial: true, enableBlink: true, colorClasses: ["bg-emerald-600"], style: { borderRadius: "30%" } }} />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full bg-white"
                    >
                      <LogOut size={14} />
                      Log out
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "api-keys" && (
                <div>
                      <p className="text-sm font-medium text-zinc-900 mb-0.5">
                        API Keys
                      </p>
                      <p className="text-xs text-zinc-400 mb-4">
                        Keys for the Supacortex API and CLI.
                      </p>

                      <div className="flex items-center gap-2 mb-4">
                        <Input
                          type="text"
                          placeholder="Key name (e.g. CLI)"
                          className="bg-white"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCreateKey()
                          }
                        />
                        <Button
                          variant="default"
                          onClick={handleCreateKey}
                          className="shrink-0"
                        >
                          <Plus size={12} />
                          Create
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        {apiKeys?.length === 0 && (
                          <p className="text-sm text-zinc-400 py-4 text-center">
                            No API keys yet
                          </p>
                        )}
                        {apiKeys?.map(
                          (key: {
                            id: string;
                            name: string;
                            keyPrefix: string;
                            lastUsedAt: string | null;
                            createdAt: string;
                          }) => (
                            <div
                              key={key.id}
                              className="group flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 hover:border-zinc-200 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">
                                  {key.name}
                                </p>
                                <p className="text-xs text-zinc-400 font-mono">
                                  {key.keyPrefix}
                                  {"·".repeat(20)}
                                </p>
                              </div>
                              {confirmingDeleteId === key.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setConfirmingDeleteId(null)}
                                    className="text-xs font-medium text-zinc-400 hover:text-zinc-600 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDelete(key.id)}
                                    className="text-xs font-medium text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDelete(key.id)}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                </div>
              )}

              {activeTab === "integrations" && (
                <div>
                  <p className="text-sm font-medium text-zinc-900 mb-0.5">
                    Integrations
                  </p>
                  <p className="text-xs text-zinc-400 mb-4">
                    Connect external services.
                  </p>

                  {twitterAccount ? (
                    <div className="flex items-center justify-between rounded-lg border border-zinc-300 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                          <XIcon className="h-3.5 w-3.5 text-zinc-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            X (Twitter)
                          </p>
                          <p className="text-xs text-zinc-400">Connected</p>
                        </div>
                      </div>
                      {confirmingDisconnect ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConfirmingDisconnect(false)}
                            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              unlinkTwitter(undefined, {
                                onSuccess: () => {
                                  sileo.success({ title: "X disconnected" });
                                  setConfirmingDisconnect(false);
                                },
                              });
                            }}
                            className="text-xs font-medium text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingDisconnect(true)}
                          className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
                        >
                          <Unplug size={12} />
                          Disconnect
                        </button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => linkTwitter()}
                      className="gap-2"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Connect X
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
