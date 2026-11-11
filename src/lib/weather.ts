import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export interface Place {
  lat: number;
  lon: number;
  label: string;
}

const DEFAULT_PLACE: Place = { lat: 28.6139, lon: 77.209, label: "New Delhi" };
const PLACE_KEY = "mobidrobe:place";

export interface DayForecast {
  date: string;
  max: number;
  min: number;
  code: number;
}

export interface Forecast {
  current: { temp: number; code: number; isDay: boolean };
  days: DayForecast[];
}

export function describeWeather(code: number): { label: string; kind: "sun" | "cloud" | "rain" | "storm" | "snow" | "fog" } {
  if (code === 0) return { label: "Clear & Sunny", kind: "sun" };
  if (code <= 2) return { label: "Mostly Sunny", kind: "sun" };
  if (code === 3) return { label: "Overcast", kind: "cloud" };
  if (code <= 48) return { label: "Hazy", kind: "fog" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Showers", kind: "rain" };
  if (code <= 77 || code === 85 || code === 86) return { label: "Snow", kind: "snow" };
  return { label: "Thunderstorms", kind: "storm" };
}

/** Short styling cue for a temperature in °C. */
export function layerAdvice(maxC: number): { layers: number; tip: string } {
  if (maxC >= 30) return { layers: 1, tip: "Breathable single layer" };
  if (maxC >= 22) return { layers: 1, tip: "Light layers" };
  if (maxC >= 14) return { layers: 2, tip: "Add a light layer" };
  return { layers: 3, tip: "Coat weather" };
}

export function usePlace() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLACE_KEY);
      if (raw) setPlace(JSON.parse(raw) as Place);
    } catch {
      // keep default
    }
  }, []);

  const locateMe = () =>
    new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Location isn't available on this device."));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Your location" };
          localStorage.setItem(PLACE_KEY, JSON.stringify(next));
          setPlace(next);
          resolve();
        },
        () => reject(new Error("Location permission was declined.")),
        { timeout: 8000 },
      );
    });

  return { place, locateMe };
}

export function useForecast(place: Place) {
  return useQuery({
    queryKey: ["forecast", place.lat.toFixed(2), place.lon.toFixed(2)],
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<Forecast> => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=16`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather unavailable");
      const j = await res.json();
      return {
        current: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, isDay: !!j.current.is_day },
        days: (j.daily.time as string[]).map((date, i) => ({
          date,
          max: Math.round(j.daily.temperature_2m_max[i]),
          min: Math.round(j.daily.temperature_2m_min[i]),
          code: j.daily.weather_code[i],
        })),
      };
    },
  });
}
