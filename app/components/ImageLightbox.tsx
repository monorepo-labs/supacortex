"use client";

import { useState, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export function useImageLightbox(images: string[]) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = useCallback(
    (i: number) => {
      setIndex(i);
      setOpen(true);
    },
    [],
  );

  const slides = images.map((src) => ({ src }));
  const single = slides.length <= 1;

  const lightbox = open ? (
    <Lightbox
      open
      close={() => setOpen(false)}
      index={index}
      slides={slides}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      carousel={{ finite: single }}
      render={{
        buttonPrev: single ? () => null : undefined,
        buttonNext: single ? () => null : undefined,
      }}
      toolbar={{ buttons: ["close"] }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.85)" },
        slide: { padding: "4rem 3rem" },
      }}
      className="yarl-custom"
    />
  ) : null;

  return { openAt, lightbox };
}
