import path from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import os from "os";

const homeDir = os.homedir();
const configDir = path.join(homeDir, ".supacortex");
const configPath = path.join(configDir, "config.json");

type Config = { endpoint?: string; appUrl?: string; apiKey?: string };

export const getConfig = (): Config => {
  try {
    const content = readFileSync(configPath, "utf-8");
    const data = JSON.parse(content);
    return data;
  } catch {
    return {};
  }
};

export const setConfig = (updates: Config): void => {
  mkdirSync(configDir, { recursive: true });
  const existing = getConfig();
  const data = { ...existing, ...updates };
  writeFileSync(configPath, JSON.stringify(data, null, 2));
};
