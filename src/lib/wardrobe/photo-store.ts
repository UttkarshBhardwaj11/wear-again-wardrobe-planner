import { useEffect, useReducer } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "./images";

/** Uploaded garment photos live in a private bucket and are stored on the garment as "storage:<path>". */
const BUCKET = "garment-photos";
const PREFIX = "storage:";
const SIGNED_URL_TTL = 60 * 60 * 24;

const signed = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();
let batch: { paths: Set<string>; done: Promise<void> } | null = null;

export function isStorageRef(src: string): boolean {
  return src.startsWith(PREFIX);
}

function pathOf(ref: string): string {
  return ref.slice(PREFIX.length);
}

/** Show a just-uploaded photo from memory instead of fetching it again. */
export function primePhoto(ref: string, url: string) {
  signed.set(pathOf(ref), url);
}

export async function uploadPhoto(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (error) throw error;
  const ref = `${PREFIX}${path}`;
  primePhoto(ref, dataUrl);
  return ref;
}

export async function removePhoto(ref: string) {
  if (!isStorageRef(ref)) return;
  await supabase.storage.from(BUCKET).remove([pathOf(ref)]);
  signed.delete(pathOf(ref));
}

function requestSigned(path: string): Promise<void> {
  const existing = inflight.get(path);
  if (existing) return existing;
  if (!batch) {
    const paths = new Set<string>();
    const done = new Promise<void>((resolve) => {
      // Collect every photo requested in the same render pass into one signing call.
      queueMicrotask(async () => {
        batch = null;
        const list = [...paths];
        try {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrls(list, SIGNED_URL_TTL);
          for (const p of list) signed.set(p, data?.find((d) => d.path === p)?.signedUrl ?? "");
        } catch {
          for (const p of list) signed.set(p, "");
        } finally {
          for (const p of list) inflight.delete(p);
          resolve();
        }
      });
    });
    batch = { paths, done };
  }
  batch.paths.add(path);
  inflight.set(path, batch.done);
  return batch.done;
}

/** Resolves any garment image reference (sample, uploaded or web) to a displayable URL. */
export function useResolvedImage(src: string): { url: string; pending: boolean } {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const storage = isStorageRef(src);
  const cached = storage ? signed.get(pathOf(src)) : undefined;

  useEffect(() => {
    if (!storage || signed.has(pathOf(src))) return;
    let alive = true;
    requestSigned(pathOf(src)).then(() => alive && rerender());
    return () => {
      alive = false;
    };
  }, [src, storage]);

  if (!storage) return { url: resolveImage(src), pending: false };
  return { url: cached ?? "", pending: cached === undefined };
}
