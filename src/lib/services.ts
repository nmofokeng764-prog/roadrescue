export const SERVICES = [
  { id: "battery", label: "Battery jump-start", base: 450 },
  { id: "flat_tyre", label: "Flat tyre", base: 400 },
  { id: "fuel", label: "Fuel delivery", base: 350 },
  { id: "mechanical", label: "Mechanical breakdown", base: 650 },
  { id: "towing", label: "Towing", base: 900 },
  { id: "lockout", label: "Locked out", base: 500 },
] as const;

export const VEHICLE_CATEGORIES = ["Sedan", "Hatchback", "SUV", "Bakkie", "Motorcycle", "Truck", "Van"];

export const serviceLabel = (id: string) => SERVICES.find((s) => s.id === id)?.label ?? id;

export function estimate(service: string, distanceKm: number) {
  const base = SERVICES.find((s) => s.id === service)?.base ?? 500;
  const multiplier = service === "towing" ? 25 : 12;
  return {
    cost: Math.round(base + distanceKm * multiplier),
    eta: Math.round((distanceKm / 45) * 60 + 8),
  };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const rand = (n: number | null | undefined) =>
  n == null ? "—" : `R ${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

export const STATUS_LABEL: Record<string, string> = {
  pending: "Finding a provider",
  matched: "Provider matched",
  en_route: "En route",
  arrived: "Provider arrived",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 }; // Johannesburg
