import { CheckBadgeIcon } from "@heroicons/react/20/solid";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <CheckBadgeIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-zinc-500">You can close this tab and return to the app.</p>
      </div>
    </div>
  );
}
