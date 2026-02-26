"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { useCreateCheckout } from "@/hooks/use-payments";
import { useQueryClient } from "@tanstack/react-query";
import { sileo } from "sileo";
import { ArrowRight, X, Loader2 } from "lucide-react";
import { CheckBadgeIcon } from "@heroicons/react/20/solid";

export default function SyncPaymentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: createCheckout, isPending } = useCreateCheckout();
  const queryClient = useQueryClient();
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setWaitingForPayment(false);
  }, []);

  // Clean up on unmount or close
  useEffect(() => {
    if (!open) stopPolling();
    return () => stopPolling();
  }, [open, stopPolling]);

  const startPolling = () => {
    setWaitingForPayment(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/payments/status");
        const data = await res.json();
        if (data.hasPaid) {
          stopPolling();
          queryClient.invalidateQueries({ queryKey: ["payment-status"] });
          sileo.success({ title: "Payment confirmed! You can now sync bookmarks." });
          onOpenChange(false);
        }
      } catch {
        // ignore, keep polling
      }
    }, 2000);
  };

  const handlePay = () => {
    createCheckout(undefined, {
      onSuccess: (data) => {
        // Open checkout in browser (system browser for Tauri, same tab for web)
        if (typeof window !== "undefined" && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
          import("@tauri-apps/plugin-shell").then(({ open }) => open(data.url)).catch(console.error);
        } else {
          window.open(data.url, "_blank");
        }
        startPolling();
      },
      onError: (err) => {
        sileo.error({ title: err.message || "Failed to start checkout" });
      },
    });
  };

  const handleCancel = () => {
    stopPolling();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-xs mx-4">
            {/* Button layer — sits behind and below the card */}
            {waitingForPayment ? (
              <div className="absolute bottom-0 left-0 right-0 flex cursor-default flex-col items-center gap-1 rounded-2xl bg-primary pt-20 pb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Loader2 size={16} className="animate-spin" />
                  Waiting for payment...
                </div>
                <button
                  onClick={handleCancel}
                  className="cursor-pointer text-xs text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handlePay}
                disabled={isPending}
                className="absolute bottom-0 left-0 right-0 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary pt-16 pb-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Opening checkout..." : "Pay $10"}{" "}
                <ArrowRight size={16} />
              </button>
            )}

            {/* Card layer — overlaps the button */}
            <div className={`relative rounded-2xl bg-white p-6 shadow-card ${waitingForPayment ? "mb-20" : "mb-13"}`}>
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100"
              >
                <X size={16} />
              </button>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-2xl font-medium tracking-tight">$10</span>
                <span className="text-sm text-zinc-400">one-time</span>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-semibold">Unlock Bookmark Sync</h2>
                <p className="mt-1 font-medium text-zinc-500">
                  Syncing bookmarks from X uses their paid API.
                </p>
              </div>

              <ul className="space-y-2.5 text-base font-medium text-zinc-600 mt-4">
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="size-5 mt-0.5 shrink-0 text-primary" />
                  Covers the cost of your initial sync (usually thousands of
                  bookmarks)
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="size-5 mt-0.5 shrink-0 text-primary" />
                  Future syncs are free while we&apos;re in beta
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
