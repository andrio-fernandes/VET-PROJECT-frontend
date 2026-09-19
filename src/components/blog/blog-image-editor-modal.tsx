/* eslint-disable @next/next/no-img-element */
// Blog image crop modal: crops inserted/pasted images to a JPEG data URL.
// Crop uses normalized coordinates (0..1) for resolution independence.

import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import { App as AntApp } from 'antd';

import { EDITOR_IMAGE_MAX_BYTES } from '@/constants/blog';

const { Title, Text } = Typography;

// JPEG output type — smaller than PNG for photos.
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY_STEPS = [1, 0.8, 0.65, 0.5, 0.35, 0.2];

interface NormRect {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

interface BlogImageEditorModalProps {
  open: boolean;
  imageSrc: string; // original data URL (full image)
  contentWidth: number; // blog content max width (px) used to cap fit
  onCancel: () => void;
  onConfirm: (src: string) => void;
}

const HANDLES: ('nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w')[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

export const BlogImageEditorModal: React.FC<BlogImageEditorModalProps> = ({
  open,
  imageSrc,
  contentWidth,
  onCancel,
  onConfirm,
}) => {
  const { message } = AntApp.useApp();

  // Natural source image size.
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  // Displayed size inside the preview box.
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  // Normalized crop rect (defaults to full image).
  const [crop, setCrop] = useState<NormRect>({ x: 0, y: 0, w: 1, h: 1 });

  const previewRef = useRef<HTMLDivElement>(null);
  // Loaded source image element (intrinsic resolution).
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Drag/resize interaction state.
  const dragRef = useRef<{
    mode: 'move' | ResizeHandleMode;
    startX: number;
    startY: number;
    cropAtStart: NormRect;
  } | null>(null);

  // Load image when modal opens with new src.
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

  // --- Canvas composition

  const canvasCompose = (
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    destW: number,
    quality: number
  ): { src: string; w: number; h: number } | null => {
    if (!imgRef.current) return null;
    const destH = Math.max(1, Math.round(destW * (srcH / srcW)));
    const canvas = document.createElement('canvas');
    canvas.width = destW;
    canvas.height = destH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, destW, destH);
    return { src: canvas.toDataURL(OUTPUT_TYPE, quality), w: destW, h: destH };
  };

  const handleConfirm = () => {
    if (!img) return;

    const srcX = crop.x * img.w;
    const srcY = crop.y * img.h;
    const srcW = crop.w * img.w;
    const srcH = crop.h * img.h;

    if (srcW < 1 || srcH < 1) {
      message.error('Failed to process the image');
      return;
    }

    const baseW = Math.min(Math.round(srcW), contentWidth);
    let composed: { src: string; w: number; h: number } | null = null;
    let usedQuality = 1;

    for (const quality of OUTPUT_QUALITY_STEPS) {
      const attempt = canvasCompose(srcX, srcY, srcW, srcH, baseW, quality);
      if (!attempt) break;
      if (dataUrlBytes(attempt.src) <= EDITOR_IMAGE_MAX_BYTES) {
        composed = attempt;
        usedQuality = quality;
        break;
      }
    }

    if (!composed) {
      message.error("This image can't be compressed under 2MB. Crop a smaller region or use a smaller image.");
      return;
    }

    if (usedQuality < OUTPUT_QUALITY_STEPS[0]) {
      message.warning(`Image re-compressed to fit at ${composed.w}px wide.`);
    }
    reset();
    onConfirm(composed.src);
  };

  // --- Crop box interaction

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

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, mode: 'move' | ResizeHandleMode) => {
    if (!display) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
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

    // Convert pixel deltas to normalized deltas.
    const nx = dx / rect.width;
    const ny = dy / rect.height;

    if (drag.mode === 'move') {
      setCrop(clampRect({ x: c.x + nx, y: c.y + ny, w: c.w, h: c.h }));
      return;
    }

    // Resize handles: adjust one or more crop edges.
    const left = drag.mode === 'w' || drag.mode === 'nw' || drag.mode === 'sw';
    const right = drag.mode === 'e' || drag.mode === 'ne' || drag.mode === 'se';
    const top = drag.mode === 'n' || drag.mode === 'nw' || drag.mode === 'ne';
    const bottom = drag.mode === 's' || drag.mode === 'sw' || drag.mode === 'se';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text type="secondary">Crop the image, then insert it.</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" onClick={handleConfirm} style={{ backgroundColor: '#52c41a' }}>
              Insert image
            </Button>
          </div>
        </div>
      }
    >
      <Title level={5} style={{ marginTop: 0 }}>
        Crop image
      </Title>

      <div className="bie-box-wrap">
        <div
          ref={previewRef}
          className="bie-preview"
          style={
            display
              ? { width: display.w, height: display.h }
              : { width: '100%', height: 220 }
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
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
              />
                  <div className="bie-crop-box" style={{ left: boxPosPx().x, top: boxPosPx().y, width: boxPx().w, height: boxPx().h }} onPointerDown={(e) => onPointerDown(e, 'move')}>
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
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary">Loading image…</Text>
            </div>
          )}
        </div>
      </div>

    </Modal>
  );
};

// --- helpers

type ResizeHandleMode = (typeof HANDLES)[number];

const dataUrlBytes = (dataUrl: string): number =>
  Math.ceil((dataUrl.length * 3) / 4);

// Clamp a number between min and max.
const clampNum = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

// Fit w×h into maxW×maxH preserving aspect ratio.
const fitInto = (w: number, h: number, maxW: number, maxH: number) => {
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
};
