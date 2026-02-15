"use client";

import { useState } from "react";
import { LogOut, Unplug } from "lucide-react";
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
import { useTwitterAccount, useLinkTwitter } from "@/hooks/use-twitter";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { data: twitterAccount } = useTwitterAccount();
  const { mutate: linkTwitter } = useLinkTwitter();
  const router = useRouter();

  const user = session?.user;
  if (!user) return null;

  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-300"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? "Avatar"}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[360px] gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-4">
            <DialogTitle className="text-base">Account</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your profile and connected accounts
            </DialogDescription>
          </DialogHeader>

          {/* Profile */}
          <div className="flex items-center gap-3 px-5 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>

          {/* Connected accounts */}
          <div className="border-t px-5 py-4">
            <p className="mb-3 text-xs font-medium text-zinc-400">
              Connected accounts
            </p>
            {twitterAccount ? (
              <div className="flex items-center justify-between">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Unplug size={14} />
                  Disconnect
                </Button>
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

          {/* Logout */}
          <div className="border-t px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-zinc-500 hover:text-zinc-700"
            >
              <LogOut size={14} />
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
