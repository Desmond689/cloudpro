"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage, deleteProductImage } from "@/lib/actions/admin";

type ProductImage = { id: string; url: string };

export default function ProductImageUploader({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  async function handleDelete(imageId: string) {
    const result = await deleteProductImage(imageId, productId);
    if (result.ok) router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => handleDelete(img.id)}
              className="absolute right-1 top-1 rounded-full bg-void/80 px-2 py-0.5 text-[10px] text-bad"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-mute transition hover:border-mist/50 hover:text-mist disabled:opacity-60"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-[10px]">{pending ? "Uploading…" : "Add photo"}</span>
        </button>
      </div>

      {/* capture="environment" opens the phone camera directly on mobile;
          desktop falls back to a normal file picker. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
