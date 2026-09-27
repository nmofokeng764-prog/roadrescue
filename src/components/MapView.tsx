import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pt = { lat: number; lng: number };

const pin = (color: string, label: string) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
      <div style="background:${color};color:#fff;font:600 11px sans-serif;padding:2px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>
      <div style="width:16px;height:16px;border-radius:999px;background:${color};border:3px solid #fff;margin-top:3px;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div></div>`,
    iconSize: [0, 0],
  });

export default function MapView({
  center,
  onChange,
  provider,
  height = 320,
}: {
  center: Pt;
  onChange?: (p: Pt) => void;
  provider?: Pt | null;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<L.Marker | null>(null);
  const prov = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView([center.lat, center.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    const mk = L.marker([center.lat, center.lng], {
      draggable: !!cb.current,
      icon: pin("#f26a0c", cb.current ? "Drag to adjust" : "You"),
    }).addTo(m);
    mk.on("dragend", () => {
      const p = mk.getLatLng();
      cb.current?.({ lat: p.lat, lng: p.lng });
    });
    if (cb.current) m.on("click", (e) => { mk.setLatLng(e.latlng); cb.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    map.current = m;
    me.current = mk;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mk = me.current;
    if (!mk) return;
    const cur = mk.getLatLng();
    if (cur.lat !== center.lat || cur.lng !== center.lng) {
      mk.setLatLng([center.lat, center.lng]);
      map.current?.setView([center.lat, center.lng]);
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!provider) { prov.current?.remove(); prov.current = null; return; }
    if (!prov.current) prov.current = L.marker([provider.lat, provider.lng], { icon: pin("#2563eb", "Provider") }).addTo(m);
    else prov.current.setLatLng([provider.lat, provider.lng]);
    m.fitBounds(L.latLngBounds([[center.lat, center.lng], [provider.lat, provider.lng]]), { padding: [50, 50], maxZoom: 15 });
  }, [provider?.lat, provider?.lng, center.lat, center.lng]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-2xl" />;
}
