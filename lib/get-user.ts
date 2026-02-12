import { headers } from "next/headers";
import { auth } from "@/services/auth";

export const getUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
};
