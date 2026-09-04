// =============================================
// BLOG IMAGE CROP + SCALE MODAL
//
// Shown automatically when an image is inserted or pasted into the rich text
// blog editor. Lets the author crop the image to the region they want and set
// its final render width (free-form) in the blog, capped to the blog content
// width so it never overflows. The composed result is a JPEG data URL inserted
// into the editor at the cursor position.
//
// Implementation notes:
//  - Crop is stored in NORMALIZED coordinates (0..1 relative to the image),
//    so it is resolution-independent and mapping to screen / source pixels is
//    trivial (multiply by the displayed or natural size).
//  - The preview box scales the image to a bounded display size; the crop box
//    is resized / dragged in that display space and converted back.
// =============================================

import React, { useEffect, useRef, useState } from 'react';
import { Button, InputNumber, Modal, Slider, Typography } from 'antd';
import { App as AntApp } from 'antd';

const { Title, Text } = Typography;

// Output image type - JPEG (smaller than PNG for photos) keeps the resulting
// data URL within the editor's 1MB inline-image ceiling for typical crops.
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.9;

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
  onConfirm: (src: string, width: number) => void;
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

  // Natural size of the source image.
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  // Size the image is drawn at inside the fixed preview box.
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  // Normalized crop rect (defaults to the full image).
  const [crop, setCrop] = useState<NormRect>({ x: 0, y: 0, w: 1, h: 1 });
  // Final output width in px.
  const [outWidth, setOutWidth] = useState<number | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  // Loaded source <img> element (intrinsic resolution) used as the canvas source.
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Drag / resize interaction state.
  const dragRef = useRef<{
    mode: 'move' | ResizeHandleMode;
    startX: number;
    startY: number;
    cropAtStart: NormRect;
  } | null>(null);

  // Load the image whenever the modal opens with new src.
  useEffect(() => {
    if (!open || !imageSrc) return;
    const image = new Image();
    image.onload = () => {
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      imgRef.current = image;
      setImg({ w, h });
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setOutWidth(mathClamp(w, 1, contentWidth));
      setDisplay(fitInto(w, h, 560, 360));
    };
    image.src = imageSrc;
    return () => {
      image.onload = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  const reset = () => {
    setImg(null);
    setDisplay(null);
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setOutWidth(null);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  // --- Canvas composition -------------------------------------------------

  const handleConfirm = () => {
    if (!img || !outWidth) return;

    // Source pixel rect from the normalized crop.
    const srcX = crop.x * img.w;
    const srcY = crop.y * img.h;
    const srcW = crop.w * img.w;
    const srcH = crop.h * img.h;

    // Output aspect keeps the crop's ratio; width is free-form.
    const destW = mathClamp(Math.round(outWidth), 10, contentWidth);
    const destH = Math.max(1, Math.round(destW * (srcH / srcW)));

    const canvas = document.createElement('canvas');
    canvas.width = destW;
    canvas.height = destH;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current) {
      message.error('Failed to process the image');
      return;
    }
    ctx.drawImage(
      imgRef.current,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      destW,
      destH
    );

    const outSrc = canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY);
    reset();
    onConfirm(outSrc, destW);
  };

  // --- Crop box interaction ------------------------------------------------

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

    // Convert pixel deltas to deltas normalized against the preview box.
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

  // --- Scale controls -------------------------------------------------------

  const handleFit = () => {
    setOutWidth(contentWidth);
  };

  const handleWidthChange = (value: number | null) => {
    if (value == null) return;
    setOutWidth(mathClamp(Math.round(value), 10, contentWidth));
  };

  // Derive the aspect-locked height preview for the chosen width.
  const outputHeight = (): number => {
    if (!img || !outWidth) return 0;
    const srcH = crop.h * img.h;
    const srcW = crop.w * img.w || 1;
    return Math.max(1, Math.round(outWidth * (srcH / srcW)));
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={700}
      centered
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text type="secondary">Crop the image, then set its width in the blog.</Text>
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
        Crop &amp; scale image
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

      <div className="bie-controls">
        <div className="bie-control-row">
          <Text className="bie-control-label">Width (px)</Text>
          <InputNumber
            min={10}
            max={contentWidth}
            value={outWidth}
            onChange={handleWidthChange}
            style={{ width: 140 }}
          />
          <Button onClick={handleFit} className="bie-fit-btn">
            Fit to blog width ({contentWidth}px)
          </Button>
        </div>
        <div className="bie-control-row">
          <Text className="bie-control-label">Output size</Text>
          <Text type="secondary">
            {outWidth} × {outputHeight()} px
          </Text>
        </div>
        <div className="bie-control-row">
          <Slider
            min={10}
            max={contentWidth}
            value={outWidth ?? 10}
            onChange={(v) => setOutWidth(mathClamp(Math.round(v as number), 10, contentWidth))}
          />
        </div>
      </div>
    </Modal>
  );
};

// --- helpers ----------------------------------------------------------------

type ResizeHandleMode = (typeof HANDLES)[number];

const mathClamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

// Clamp a number between min and max (used for normalized crop geometry).
const clampNum = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

// Fit a w×h image into maxW×maxH preserving aspect ratio.
const fitInto = (w: number, h: number, maxW: number, maxH: number) => {
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
};
