import { Cloud, CloudFog, CloudLightning, CloudRain, Snowflake, Sun } from "lucide-react";
import { describeWeather } from "@/lib/weather";

export function WeatherIcon({ code, className = "size-6" }: { code: number | undefined; className?: string }) {
  if (code === undefined) return <Sun className={className} strokeWidth={1.6} />;
  const k = describeWeather(code).kind;
  const props = { className, strokeWidth: 1.6 };
  if (k === "cloud") return <Cloud {...props} />;
  if (k === "rain") return <CloudRain {...props} />;
  if (k === "storm") return <CloudLightning {...props} />;
  if (k === "snow") return <Snowflake {...props} />;
  if (k === "fog") return <CloudFog {...props} />;
  return <Sun {...props} />;
}
