"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadBlogImage } from "@/lib/actions/blog";

export default function BlogImageUploader({ postId, imageUrl }: { postId: string; imageUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadBlogImage(postId, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-faint">No image</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="btn-secondary text-xs disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload image"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleSelected} className="hidden" />
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}
