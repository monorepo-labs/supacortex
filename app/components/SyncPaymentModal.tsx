"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateCheckout } from "@/hooks/use-payments";

export default function SyncPaymentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: createCheckout, isPending } = useCreateCheckout();

  const handlePay = () => {
    createCheckout(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Twitter Bookmark Sync</DialogTitle>
          <DialogDescription>
            Syncing bookmarks from X uses their paid API. A one-time payment
            covers the cost so we can keep everything else free.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-zinc-600">
          <li>Unlimited syncs, forever</li>
          <li>One-time payment, no subscription</li>
          <li>Everything else stays free</li>
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={isPending}>
            {isPending ? "Redirecting..." : "Pay $10"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
