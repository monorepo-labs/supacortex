import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const dbSingleton = () => {
  return drizzle({
    connection: process.env.DATABASE_URL!,
    casing: "snake_case",
    schema,
  });
};

declare global {
  var db: undefined | ReturnType<typeof dbSingleton>;
}

export const db = globalThis.db ?? dbSingleton();

if (process.env.NODE_ENV !== "production") globalThis.db = db;
