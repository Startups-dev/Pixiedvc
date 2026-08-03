"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Minus, Move, Plus, Trash2, X } from "lucide-react";

import { Button } from "@pixiedvc/design-system";
import OwnerAvatar from "@/components/owner/shell/OwnerAvatar";

import { removeOwnerAvatar, uploadOwnerAvatar } from "@/app/owner/account/actions";

type OwnerAvatarEditorProps = {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  initials: string;
};

const PREVIEW_SIZE = 240;
const OUTPUT_SIZE = 512;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function OwnerAvatarEditor({ displayName, email, avatarUrl, initials }: OwnerAvatarEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const resetEditor = () => {
    setDialogOpen(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setError(null);
    setDragStart(null);
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      setSourceUrl(null);
    }
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image up to 2 MB.");
      return;
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImageSize(null);
    setError(null);
    setDialogOpen(true);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: position.x,
      originY: position.y,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    setPosition({
      x: clamp(dragStart.originX + event.clientX - dragStart.x, -120, 120),
      y: clamp(dragStart.originY + event.clientY - dragStart.y, -120, 120),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart?.pointerId === event.pointerId) setDragStart(null);
  };

  const cropToFile = async () => {
    const image = imageRef.current;
    if (!image || !sourceUrl || !imageSize) throw new Error("Image unavailable.");

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image editor unavailable.");

    const baseScale = Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height) * zoom;
    const sourceSize = PREVIEW_SIZE / baseScale;
    const sourceX = imageSize.width / 2 - (PREVIEW_SIZE / 2 + position.x) / baseScale;
    const sourceY = imageSize.height / 2 - (PREVIEW_SIZE / 2 + position.y) / baseScale;

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Image export failed.");
    return new File([blob], "owner-avatar.jpg", { type: "image/jpeg" });
  };

  const saveCroppedAvatar = () => {
    startTransition(async () => {
      let file: File;
      try {
        setError(null);
        file = await cropToFile();
      } catch {
        setError("We could not prepare that image. Try a different photo.");
        return;
      }

      const formData = new FormData();
      formData.set("avatar", file);
      await uploadOwnerAvatar(formData);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeOwnerAvatar();
    });
  };

  return (
    <div className="flex flex-col items-start gap-5">
      <OwnerAvatar displayName={displayName} avatarUrl={avatarUrl} initials={initials} size="lg" />
      <div>
        <h2 className="text-lg font-semibold text-[#10224A]">{displayName ?? "Owner profile"}</h2>
        <p className="mt-1 text-sm text-[#667085]">{email ?? "Email unavailable"}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="button" className="gap-2" onClick={openFilePicker}>
          <Camera aria-hidden="true" className="h-4 w-4" />
          {avatarUrl ? "Change photo" : "Add photo"}
        </Button>
        {avatarUrl ? (
          <Button type="button" variant="ghost" className="gap-2" onClick={handleRemove} disabled={isPending}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Remove photo
          </Button>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-[#667085]">JPG, PNG, WebP, or GIF. Maximum 2 MB.</p>
      {error ? <p className="text-sm font-medium text-[#B42318]">{error}</p> : null}

      {dialogOpen && sourceUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-avatar-editor-title"
        >
          <div className="w-full max-w-[430px] rounded-[22px] border border-white/20 bg-white p-5 shadow-[0_24px_80px_rgba(15,27,51,0.28)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 id="owner-avatar-editor-title" className="text-base font-semibold text-[#10224A]">
                  Edit profile photo
                </h3>
                <p className="mt-1 max-w-[28ch] text-xs leading-5 text-[#667085]">
                  Drag to center the photo, then adjust the zoom.
                </p>
              </div>
              <button
                type="button"
                onClick={resetEditor}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7E7E4] text-[#10224A] transition hover:bg-[#FAFAF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B451]"
                aria-label="Close photo editor"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex justify-center">
              <div
                className="relative h-[240px] w-[240px] touch-none overflow-hidden rounded-full bg-[#F4F1EA] ring-1 ring-[#D8B451]/35"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Drag photo to center it"
              >
                {(() => {
                  const displayScale = imageSize
                    ? Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height) * zoom
                    : 1;
                  const renderedWidth = imageSize ? imageSize.width * displayScale : PREVIEW_SIZE * zoom;
                  const renderedHeight = imageSize ? imageSize.height * displayScale : PREVIEW_SIZE * zoom;

                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={imageRef}
                      src={sourceUrl}
                      alt=""
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: `${renderedWidth}px`,
                        height: `${renderedHeight}px`,
                        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                      }}
                      draggable={false}
                      onLoad={(event) => {
                        setImageSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                      }}
                    />
                  );
                })()}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/70" />
                <Move
                  className="pointer-events-none absolute bottom-4 left-1/2 h-5 w-5 -translate-x-1/2 text-white drop-shadow"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <Minus className="h-4 w-4 text-[#667085]" aria-hidden="true" />
                <input
                  type="range"
                  min="1"
                  max="2.6"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-[#10224A]"
                  aria-label="Photo zoom"
                />
                <Plus className="h-4 w-4 text-[#667085]" aria-hidden="true" />
              </div>
              <p className="truncate text-center text-xs text-[#667085]">{fileName}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="ghost" onClick={resetEditor} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" className="gap-2" onClick={saveCroppedAvatar} disabled={isPending}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {isPending ? "Saving..." : "Use photo"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
