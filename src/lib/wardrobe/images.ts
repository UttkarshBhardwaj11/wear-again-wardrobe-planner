import blackAnkleBoots from "@/assets/garments/black-ankle-boots.jpg";
import blackBlazer from "@/assets/garments/black-blazer.jpg";
import blackLoafers from "@/assets/garments/black-loafers.jpg";
import blackSatinSkirt from "@/assets/garments/black-satin-skirt.jpg";
import blackTurtleneck from "@/assets/garments/black-turtleneck.jpg";
import bretonTee from "@/assets/garments/breton-tee.jpg";
import camelCoat from "@/assets/garments/camel-coat.jpg";
import charcoalTrousers from "@/assets/garments/charcoal-trousers.jpg";
import chocolateWideLeg from "@/assets/garments/chocolate-wide-leg.jpg";
import creamCableKnit from "@/assets/garments/cream-cable-knit.jpg";
import creamTrench from "@/assets/garments/cream-trench.jpg";
import ecruDenim from "@/assets/garments/ecru-denim.jpg";
import emeraldLehenga from "@/assets/garments/emerald-lehenga.jpg";
import goldJuttis from "@/assets/garments/gold-juttis.jpg";
import indigoJeans from "@/assets/garments/indigo-jeans.jpg";
import ivoryChikankari from "@/assets/garments/ivory-chikankari.jpg";
import ivorySilkBlouse from "@/assets/garments/ivory-silk-blouse.jpg";
import maroonSaree from "@/assets/garments/maroon-saree.jpg";
import rustKurta from "@/assets/garments/rust-kurta.jpg";
import tanChelseaBoots from "@/assets/garments/tan-chelsea-boots.jpg";
import terracottaSilkCami from "@/assets/garments/terracotta-silk-cami.jpg";
import whitePoplinShirt from "@/assets/garments/white-poplin-shirt.jpg";
import whiteSneakers from "@/assets/garments/white-sneakers.jpg";

/** Sample-wardrobe photos are stored as "seed:<key>" so saved data survives rebuilds. */
const SEED_IMAGES: Record<string, string> = {
  "black-ankle-boots": blackAnkleBoots,
  "black-blazer": blackBlazer,
  "black-loafers": blackLoafers,
  "black-satin-skirt": blackSatinSkirt,
  "black-turtleneck": blackTurtleneck,
  "breton-tee": bretonTee,
  "camel-coat": camelCoat,
  "charcoal-trousers": charcoalTrousers,
  "chocolate-wide-leg": chocolateWideLeg,
  "cream-cable-knit": creamCableKnit,
  "cream-trench": creamTrench,
  "ecru-denim": ecruDenim,
  "emerald-lehenga": emeraldLehenga,
  "gold-juttis": goldJuttis,
  "indigo-jeans": indigoJeans,
  "ivory-chikankari": ivoryChikankari,
  "ivory-silk-blouse": ivorySilkBlouse,
  "maroon-saree": maroonSaree,
  "rust-kurta": rustKurta,
  "tan-chelsea-boots": tanChelseaBoots,
  "terracotta-silk-cami": terracottaSilkCami,
  "white-poplin-shirt": whitePoplinShirt,
  "white-sneakers": whiteSneakers,
};

export function resolveImage(url: string): string {
  if (url.startsWith("seed:")) return SEED_IMAGES[url.slice(5)] ?? "";
  return url;
}
