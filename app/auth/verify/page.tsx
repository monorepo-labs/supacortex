import { redirect } from "next/navigation";
import { getUser } from "@/lib/get-user";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    const { code } = await searchParams;
    const verifyPath = code ? `/auth/verify?code=${code}` : "/auth/verify";
    redirect(`/login?redirect=${encodeURIComponent(verifyPath)}`);
  }

  return <VerifyForm />;
}
