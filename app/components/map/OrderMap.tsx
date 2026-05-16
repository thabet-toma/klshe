"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap, Marker as LMarker, Polyline as LPolyline } from "leaflet";

type Props = {
  driverLat: number;
  driverLng: number;
  destinationLat?: number;
  destinationLng?: number;
};

export default function OrderMap({ driverLat, driverLng, destinationLat, destinationLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const driverMarkerRef = useRef<LMarker | null>(null);
  const destMarkerRef = useRef<LMarker | null>(null);
  const lineRef = useRef<LPolyline | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!mounted || !containerRef.current) return;
      if (mapRef.current) {
        // map already initialised — just update
        return;
      }

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(
        [driverLat, driverLng],
        14,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const driverIcon = L.divIcon({
        html: `<div style="background:#f97316;border:3px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        className: "",
      });

      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(map)
        .bindTooltip("السائق", { permanent: false });

      if (destinationLat != null && destinationLng != null) {
        const destIcon = L.divIcon({
          html: `<div style="background:#7c3aed;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          className: "",
        });
        destMarkerRef.current = L.marker([destinationLat, destinationLng], { icon: destIcon })
          .addTo(map)
          .bindTooltip("وجهتك", { permanent: false });

        lineRef.current = L.polyline(
          [[driverLat, driverLng], [destinationLat, destinationLng]],
          { color: "#f97316", weight: 3, dashArray: "6 6", opacity: 0.7 },
        ).addTo(map);

        map.fitBounds([[driverLat, driverLng], [destinationLat, destinationLng]], { padding: [40, 40] });
      }

      mapRef.current = map;
    }

    void init();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver position on subsequent renders
  useEffect(() => {
    if (!mapRef.current || !driverMarkerRef.current) return;
    const L_LatLng = [driverLat, driverLng] as [number, number];
    driverMarkerRef.current.setLatLng(L_LatLng);
    if (lineRef.current && destinationLat != null && destinationLng != null) {
      lineRef.current.setLatLngs([L_LatLng, [destinationLat, destinationLng]]);
    }
  }, [driverLat, driverLng, destinationLat, destinationLng]);

  return (
    <div
      ref={containerRef}
      className="h-52 w-full overflow-hidden rounded-2xl ring-1 ring-black/10"
      aria-label="خريطة تتبّع السائق"
    />
  );
}
