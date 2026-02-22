"use client";

import { useState, useEffect } from "react";

export const useIsTauri = () => {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(
      typeof window !== "undefined" &&
        !!(window as unknown as { __TAURI_INTERNALS__: unknown })
          .__TAURI_INTERNALS__,
    );
  }, []);

  return isTauri;
};
