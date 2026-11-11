import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ProductLinkResult {
  ok: boolean;
  error?: string;
  image_url?: string;
  title?: string;
  brand?: string;
  source_url?: string;
}

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const a = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${esc}["'][^>]*content=["']([^"']+)["']`, "i");
    const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${esc}["']`, "i");
    const m = html.match(a) ?? html.match(b);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

function jsonLdProduct(html: string): { image?: string; name?: string; brand?: string } {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const body = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed: unknown = JSON.parse(body);
      const nodes: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "@graph" in parsed
          ? ((parsed as { "@graph": unknown[] })["@graph"] ?? [])
          : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        const type = String(n["@type"] ?? "");
        if (!/product/i.test(type)) continue;
        const img = n["image"];
        const image = typeof img === "string" ? img : Array.isArray(img) ? (typeof img[0] === "string" ? img[0] : (img[0] as { url?: string })?.url) : (img as { url?: string } | undefined)?.url;
        const br = n["brand"];
        const brand = typeof br === "string" ? br : (br as { name?: string } | undefined)?.name;
        return { image, name: typeof n["name"] === "string" ? n["name"] : undefined, brand };
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return {};
}

/** Fetches a shopping page and pulls the product photo, title and brand. */
export const importProductLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ url: z.string().trim().min(4).max(2000) }).parse(data))
  .handler(async ({ data }): Promise<ProductLinkResult> => {
    let target: URL;
    try {
      target = new URL(/^https?:\/\//i.test(data.url) ? data.url : `https://${data.url}`);
    } catch {
      return { ok: false, error: "That doesn't look like a web link." };
    }
    if (!/^https?:$/.test(target.protocol) || PRIVATE_HOST.test(target.hostname)) {
      return { ok: false, error: "That link can't be imported." };
    }

    try {
      const res = await fetch(target.toString(), {
        redirect: "follow",
        signal: AbortSignal.timeout(9000),
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      const finalUrl = res.url || target.toString();
      const type = res.headers.get("content-type") ?? "";
      if (type.startsWith("image/")) {
        return { ok: true, image_url: finalUrl, source_url: target.toString() };
      }
      if (!res.ok) {
        return { ok: false, error: "That shop didn't let us read the page. Try uploading a photo instead." };
      }
      const html = (await res.text()).slice(0, 1_500_000);
      const ld = jsonLdProduct(html);
      const rawImage =
        metaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src", "image"]) ?? ld.image;
      if (!rawImage) {
        return { ok: false, error: "We couldn't find a product photo on that page. Try uploading a photo instead." };
      }
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
      const title = metaContent(html, ["og:title", "twitter:title"]) ?? ld.name ?? (titleTag ? decodeEntities(titleTag) : undefined);
      const brand = ld.brand ?? metaContent(html, ["product:brand", "og:brand", "og:site_name"]);
      return {
        ok: true,
        image_url: new URL(rawImage, finalUrl).toString(),
        title: title?.split(/\s[|–-]\s/)[0]?.slice(0, 80),
        brand: brand?.slice(0, 40),
        source_url: target.toString(),
      };
    } catch (err) {
      console.error("importProductLink failed", err);
      return { ok: false, error: "We couldn't reach that link. Check it and try again, or upload a photo." };
    }
  });
