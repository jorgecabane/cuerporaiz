"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, Upload, ImagePlus } from "lucide-react";
import { AdaptiveSheet } from "@/components/ui/AdaptiveSheet";
import { optimizeImage, ImageTooLargeError } from "@/lib/client/optimize-image";
import type { ImageKind } from "@/lib/client/image-presets";

type PickerMode = "full" | "upload-only";

type SanityAsset = {
  _id: string;
  url: string;
  originalFilename: string | null;
  metadata: { dimensions: { width: number; height: number } | null } | null;
};

export type SanityImagePickerProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  mode?: PickerMode;
  uploadEndpoint?: string;
  assetsEndpoint?: string;
  aspect?: "square" | "wide" | "portrait";
  disabled?: boolean;
  imageKind?: ImageKind;
};

const DEFAULT_UPLOAD = "/api/panel/sanity-upload";
const DEFAULT_ASSETS = "/api/panel/sanity-assets";

const aspectClass: Record<NonNullable<SanityImagePickerProps["aspect"]>, string> = {
  square: "aspect-square",
  wide: "aspect-[16/9]",
  portrait: "aspect-[3/4]",
};

export function SanityImagePicker({
  value,
  onChange,
  label = "Imagen",
  mode = "full",
  uploadEndpoint = DEFAULT_UPLOAD,
  assetsEndpoint = DEFAULT_ASSETS,
  aspect = "wide",
  disabled = false,
  imageKind = "default",
}: SanityImagePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {value ? (
        <div className="flex items-start gap-3">
          <div className={`relative w-32 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ${aspectClass[aspect]}`}>
            <Image
              src={value}
              alt={label}
              fill
              sizes="128px"
              className="object-cover"
              unoptimized={!value.includes("cdn.sanity.io") && !value.includes("unsplash.com")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={disabled}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error,#dc2626)] inline-flex items-center gap-1 disabled:opacity-50"
              aria-label={`Quitar ${label}`}
            >
              <X size={12} /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-50"
        >
          <ImagePlus size={14} /> Elegir imagen
        </button>
      )}

      {open && (
        <PickerSheet
          open={open}
          onOpenChange={setOpen}
          mode={mode}
          label={label}
          uploadEndpoint={uploadEndpoint}
          assetsEndpoint={assetsEndpoint}
          imageKind={imageKind}
          onSelect={(url) => {
            onChange(url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

type SheetProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: PickerMode;
  label: string;
  uploadEndpoint: string;
  assetsEndpoint: string;
  imageKind: ImageKind;
  onSelect: (url: string) => void;
};

function PickerSheet({ open, onOpenChange, mode, label, uploadEndpoint, assetsEndpoint, imageKind, onSelect }: SheetProps) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const showLibrary = mode === "full";

  return (
    <AdaptiveSheet open={open} onOpenChange={onOpenChange} title={label} maxHeight={{ mobile: "90vh", desktop: "70vh" }}>
      <div className="flex flex-col gap-4">
        {showLibrary && (
          <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex-1 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                tab === "upload" ? "bg-[var(--color-background)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
              }`}
            >
              Subir
            </button>
            <button
              type="button"
              onClick={() => setTab("library")}
              className={`flex-1 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                tab === "library" ? "bg-[var(--color-background)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
              }`}
            >
              Mi biblioteca
            </button>
          </div>
        )}

        {tab === "upload" || !showLibrary ? (
          <UploadTab endpoint={uploadEndpoint} imageKind={imageKind} onSelect={onSelect} />
        ) : (
          <LibraryTab endpoint={assetsEndpoint} onSelect={onSelect} />
        )}
      </div>
    </AdaptiveSheet>
  );
}

type UploadStatus = "idle" | "optimizing" | "uploading";

function UploadTab({
  endpoint,
  imageKind,
  onSelect,
}: {
  endpoint: string;
  imageKind: ImageKind;
  onSelect: (url: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      try {
        setStatus("optimizing");
        const optimized = await optimizeImage(file, imageKind);
        setStatus("uploading");
        const fd = new FormData();
        fd.append("file", optimized);
        const res = await fetch(endpoint, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al subir");
        onSelect(data.url);
      } catch (err) {
        if (err instanceof ImageTooLargeError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Error al subir");
        }
      } finally {
        setStatus("idle");
      }
    },
    [endpoint, imageKind, onSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void upload(file);
    },
    [upload],
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[var(--radius-md)] px-4 py-10 cursor-pointer transition-colors ${
          dragOver
            ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]"
            : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
        } ${busy ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload size={22} className="text-[var(--color-text-muted)]" aria-hidden />
        <span className="text-sm text-[var(--color-text)]">
          {status === "optimizing"
            ? "Optimizando..."
            : status === "uploading"
              ? "Subiendo..."
              : "Arrastra una imagen o haz click para elegir"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">JPEG, PNG, WebP o AVIF</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-3 text-xs text-[var(--color-error,#dc2626)]">{error}</p>}
    </div>
  );
}

function LibraryTab({ endpoint, onSelect }: { endpoint: string; onSelect: (url: string) => void }) {
  const [assets, setAssets] = useState<SanityAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAssets(data.assets ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, [endpoint]);

  if (error) return <p className="text-xs text-[var(--color-error,#dc2626)]">{error}</p>;
  if (!assets) return <p className="text-sm text-[var(--color-text-muted)]">Cargando biblioteca...</p>;
  if (assets.length === 0)
    return <p className="text-sm text-[var(--color-text-muted)]">Aún no hay imágenes. Sube una desde la pestaña &quot;Subir&quot;.</p>;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 overflow-y-auto max-h-[55vh]">
      {assets.map((a) => (
        <button
          key={a._id}
          type="button"
          onClick={() => onSelect(a.url)}
          className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] hover:ring-2 hover:ring-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label={a.originalFilename ?? "Imagen"}
        >
          <Image
            src={`${a.url}?w=200&h=200&fit=crop`}
            alt={a.originalFilename ?? ""}
            fill
            sizes="200px"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}
