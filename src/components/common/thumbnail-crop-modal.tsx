/* eslint-disable @next/next/no-img-element */
// Thumbnail crop modal for free-form image cropping.

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { App as AntApp } from "antd";
import { THUMBNAIL_MAX_BYTES } from "@/constants/blog";

const { Text } = Typography;

const OUTPUT_TYPE = "image/jpeg";
const MIN_QUALITY = 0.65;

// Compression steps: [maxWidth, quality] pairs tried in order.
const COMPRESSION_STEPS: [number, number][] = [
  [1280, 0.92],
  [1024, 0.92],
  [1280, 0.85],
  [1024, 0.85],
  [800, 0.85],
  [800, 0.75],
  [640, 0.75],
  [640, 0.65],
];

interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ThumbnailCropModalProps {
  open: boolean;
  imageSrc: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const HANDLES: ("nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w")[] = [
  "nw", "n", "ne", "e", "se", "s", "sw", "w",
];

type ResizeHandleMode = (typeof HANDLES)[number];

const clampNum = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const fitInto = (w: number, h: number, maxW: number, maxH: number) => {
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
};

const ThumbnailCropModal: React.FC<ThumbnailCropModalProps> = ({
  open,
  imageSrc,
  title = "Crop Thumbnail",
  onCancel,
  onConfirm,
}) => {
  const { message } = AntApp.useApp();

  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<NormRect>({ x: 0, y: 0, w: 1, h: 1 });

  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: "move" | ResizeHandleMode;
    startX: number;
    startY: number;
    cropAtStart: NormRect;
  } | null>(null);

  // Load image and set initial crop.
  useEffect(() => {
    if (!open || !imageSrc) return;
    const image = new Image();
    image.onload = () => {
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      imgRef.current = image;
      setImg({ w, h });
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setDisplay(fitInto(w, h, 560, 360));
    };
    image.src = imageSrc;
    return () => {
      image.onload = null;
    };
  }, [open, imageSrc]);

  const reset = () => {
    setImg(null);
    setDisplay(null);
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  // Canvas composition

  const canvasCompose = (
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    destW: number,
    quality: number
  ): { blob: Blob; width: number; height: number } | null => {
    if (!imgRef.current) return null;
    const destH = Math.max(1, Math.round(destW * (srcH / srcW)));
    const canvas = document.createElement("canvas");
    canvas.width = destW;
    canvas.height = destH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, destW, destH);

    // Convert canvas to blob via dataURL.
    const dataUrl = canvas.toDataURL(OUTPUT_TYPE, quality);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: OUTPUT_TYPE });
    return { blob, width: destW, height: destH };
  };

  const handleConfirm = () => {
    if (!img) return;

    const srcX = crop.x * img.w;
    const srcY = crop.y * img.h;
    const srcW = crop.w * img.w;
    const srcH = crop.h * img.h;

    if (srcW < 1 || srcH < 1) {
      message.error("Failed to process the image");
      return;
    }

    // Never upscale; cap at 1280px.
    const naturalW = Math.round(srcW);
    const maxWidth = Math.min(naturalW, 1280);

    let bestResult: { blob: Blob; width: number; height: number } | null = null;

    // Try compression steps, pick first under 2MB.
    for (const [maxW, quality] of COMPRESSION_STEPS) {
      // Skip steps where target width exceeds source.
      const targetW = Math.min(maxW, naturalW);
      const attempt = canvasCompose(srcX, srcY, srcW, srcH, targetW, quality);
      if (!attempt) break;
      if (attempt.blob.size <= THUMBNAIL_MAX_BYTES) {
        bestResult = attempt;
        break;
      }
      bestResult = attempt;
    }

    // Fallback: scale down further at minimum quality.
    if (!bestResult || bestResult.blob.size > THUMBNAIL_MAX_BYTES) {
      for (const scale of [0.5, 0.35, 0.25]) {
        const scaledW = Math.max(320, Math.round(maxWidth * scale));
        const attempt = canvasCompose(srcX, srcY, srcW, srcH, scaledW, MIN_QUALITY);
        if (attempt && attempt.blob.size <= THUMBNAIL_MAX_BYTES) {
          bestResult = attempt;
          break;
        }
      }
    }

    if (!bestResult || bestResult.blob.size > THUMBNAIL_MAX_BYTES) {
      message.error("This image can't be compressed under 2MB. Try a smaller image.");
      return;
    }

    const fileName = "thumbnail.jpg";
    const file = new File([bestResult.blob], fileName, {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    });

    reset();
    onConfirm(file);
  };

  // Crop box interaction

  const clampRect = (next: NormRect): NormRect => {
    const minSize = 0.05;
    let w = Math.max(minSize, Math.min(next.w, 1));
    let h = Math.max(minSize, Math.min(next.h, 1));
    let x = Math.max(0, Math.min(next.x, 1 - w));
    let y = Math.max(0, Math.min(next.y, 1 - h));
    return { x, y, w, h };
  };

  const boxPx = (): { w: number; h: number } => {
    if (!display) return { w: 0, h: 0 };
    return { w: crop.w * display.w, h: crop.h * display.h };
  };

  const boxPosPx = (): { x: number; y: number } => {
    if (!display) return { x: 0, y: 0 };
    return { x: crop.x * display.w, y: crop.y * display.h };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, mode: "move" | ResizeHandleMode) => {
    if (!display) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      cropAtStart: { ...crop },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || !display) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const c = drag.cropAtStart;

    const nx = dx / rect.width;
    const ny = dy / rect.height;

    if (drag.mode === "move") {
      setCrop(clampRect({ x: c.x + nx, y: c.y + ny, w: c.w, h: c.h }));
      return;
    }

    // Resize handles: adjust crop edges.
    const left = drag.mode === "w" || drag.mode === "nw" || drag.mode === "sw";
    const right = drag.mode === "e" || drag.mode === "ne" || drag.mode === "se";
    const top = drag.mode === "n" || drag.mode === "nw" || drag.mode === "ne";
    const bottom = drag.mode === "s" || drag.mode === "sw" || drag.mode === "se";

    const next: NormRect = { ...c };
    const MIN = 0.05;

    if (right) next.w = clampNum(c.w + nx, MIN, 1 - c.x);
    if (bottom) next.h = clampNum(c.h + ny, MIN, 1 - c.y);

    if (left) {
      const nw = clampNum(c.w - nx, MIN, c.x + c.w);
      next.x = c.x + (c.w - nw);
      next.w = nw;
    }
    if (top) {
      const nh = clampNum(c.h - ny, MIN, c.y + c.h);
      next.y = c.y + (c.h - nh);
      next.h = nh;
    }

    setCrop(clampRect(next));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={700}
      centered
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Text type="secondary">Drag to reposition, use handles to resize.</Text>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" onClick={handleConfirm} style={{ backgroundColor: "#52c41a" }}>
              Crop & Save
            </Button>
          </div>
        </div>
      }
    >
      <Text strong style={{ fontSize: 16, display: "block", marginBottom: 12 }}>
        {title}
      </Text>

      <div className="bie-box-wrap">
        <div
          ref={previewRef}
          className="bie-preview"
          style={
            display
              ? { width: display.w, height: display.h }
              : { width: "100%", height: 220 }
          }
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {img && display ? (
            <>
              <img
                src={imageSrc}
                alt="Crop source"
                draggable={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
              />
              <div
                className="bie-crop-box"
                style={{ left: boxPosPx().x, top: boxPosPx().y, width: boxPx().w, height: boxPx().h }}
                onPointerDown={(e) => onPointerDown(e, "move")}
              >
                {HANDLES.map((h) => (
                  <span
                    key={h}
                    className={`bie-handle bie-handle-${h}`}
                    onPointerDown={(e) => onPointerDown(e, h)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Text type="secondary">Loading image...</Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ThumbnailCropModal;
