import { useEffect, useReducer } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "./images";

/** Uploaded garment photos live in a private bucket and are stored on the garment as "storage:<path>". */
const BUCKET = "garment-photos";
const PREFIX = "storage:";
const SIGNED_URL_TTL = 60 * 60 * 24;

const signed = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();
let batch: Set<string> | null = null;

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
    const current = new Set<string>();
    batch = current;
    const run = new Promise<void>((resolve) => {
      queueMicrotask(async () => {
        batch = null;
        const paths = [...current];
        try {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
          for (const p of paths) {
            const hit = data?.find((d) => d.path === p);
            signed.set(p, hit?.signedUrl ?? "");
          }
        } catch {
          for (const p of paths) signed.set(p, "");
        } finally {
          for (const p of paths) inflight.delete(p);
          resolve();
        }
      });
    });
    current.add(path);
    inflight.set(path, run);
    return run;
  }
  batch.add(path);
  const run = inflight.get([...batch][0])!;
  inflight.set(path, run);
  return run;
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
