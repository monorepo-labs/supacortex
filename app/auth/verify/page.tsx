import { redirect } from "next/navigation";
import { getUser } from "@/lib/get-user";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return <VerifyForm />;
}
