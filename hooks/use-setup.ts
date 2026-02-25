"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  checkDependencies,
  installOpencode,
  installScx,
  getSetupState,
  setSetupState,
  isSetupFresh,
  type DependencyStatus,
} from "@/services/setup";

export type SetupPhase =
  | "checking"
  | "needed"
  | "installing"
  | "failed"
  | "ready"
  | "skipped";

export interface SetupHookReturn {
  phase: SetupPhase;
  dependencies: DependencyStatus | null;
  installProgress: string[];
  error: string | null;
  install: () => void;
  skip: () => void;
  retry: () => void;
}

export function useSetup(isTauri: boolean): SetupHookReturn {
  const [phase, setPhase] = useState<SetupPhase>(isTauri ? "checking" : "ready");
  const [dependencies, setDependencies] = useState<DependencyStatus | null>(null);
  const [installProgress, setInstallProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  // Initial check on mount
  useEffect(() => {
    if (!isTauri || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        // Check cached state first
        const state = await getSetupState();
        if (state && isSetupFresh(state)) {
          setDependencies({ opencode: state.opencodeInstalled, scx: state.scxInstalled });
          if (state.opencodeInstalled && state.scxInstalled) {
            setPhase("ready");
            return;
          }
        }

        // Run live dependency check
        const deps = await checkDependencies();
        setDependencies(deps);

        if (deps.opencode && deps.scx) {
          await setSetupState({
            setupComplete: true,
            lastCheckTime: Date.now(),
            opencodeInstalled: true,
            scxInstalled: true,
          });
          setPhase("ready");
        } else {
          setPhase("needed");
        }
      } catch (err) {
        console.error("[setup] Check failed:", err);
        // If we can't check, assume ready and let opencode handle failure
        setPhase("ready");
      }
    })();
  }, [isTauri]);

  const install = useCallback(async () => {
    if (!dependencies) return;
    setPhase("installing");
    setInstallProgress([]);
    setError(null);

    const addLine = (line: string) => {
      setInstallProgress((prev) => [...prev, line]);
    };

    try {
      if (!dependencies.opencode) {
        addLine("→ Installing opencode...");
        await installOpencode(addLine);
        addLine("✓ opencode installed");
      }

      if (!dependencies.scx) {
        addLine("→ Installing scx CLI...");
        await installScx(addLine);
        addLine("✓ scx installed");
      }

      // Verify
      const verified = await checkDependencies();
      setDependencies(verified);

      if (verified.opencode && verified.scx) {
        await setSetupState({
          setupComplete: true,
          lastCheckTime: Date.now(),
          opencodeInstalled: true,
          scxInstalled: true,
        });
        addLine("✓ Setup complete");
        setPhase("ready");
      } else {
        const missing = [];
        if (!verified.opencode) missing.push("opencode");
        if (!verified.scx) missing.push("scx");
        throw new Error(`Installation completed but ${missing.join(" and ")} still not found in PATH`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Installation failed";
      setError(msg);
      addLine(`✗ ${msg}`);
      setPhase("failed");
    }
  }, [dependencies]);

  const skip = useCallback(() => {
    setPhase("skipped");
  }, []);

  const retry = useCallback(() => {
    setPhase("needed");
    setInstallProgress([]);
    setError(null);
    // Re-check in case user installed manually
    checkDependencies().then((deps) => {
      setDependencies(deps);
      if (deps.opencode && deps.scx) {
        setSetupState({
          setupComplete: true,
          lastCheckTime: Date.now(),
          opencodeInstalled: true,
          scxInstalled: true,
        });
        setPhase("ready");
      }
    }).catch(() => {
      // stay on needed phase
    });
  }, []);

  return { phase, dependencies, installProgress, error, install, skip, retry };
}
