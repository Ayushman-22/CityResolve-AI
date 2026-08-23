import { PageHeading, StatusBadge } from "@/components/CivicPrimitives";
import { RoleLayout } from "@/components/RoleLayout";
import { MapView } from "@/components/Map";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ISSUE_STATUSES, STATUS_META, type IssueStatus } from "../../../shared/civic";
import { Bell, Map, MapPinned, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const adminNav = [{ icon: ShieldCheck, label: "Operations", path: "/admin" }, { icon: Map, label: "Issue map", path: "/admin/map" }, { icon: Bell, label: "Notifications", path: "/notifications" }];
const defaultCenter = { lat: 40.7128, lng: -74.006 };

export default function IssueMap() {
  const { data: issues = [] } = trpc.admin.list.useQuery();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<"All" | IssueStatus>("All");
  const visible = issues
    .filter(issue => selectedStatus === "All" || issue.status === selectedStatus)
    .filter(issue => Boolean(issue.latitude?.trim()) && Boolean(issue.longitude?.trim()))
    .filter(issue => Number.isFinite(Number(issue.latitude)) && Number.isFinite(Number(issue.longitude)));

  const drawMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    markers.current.forEach(marker => marker.map = null);
    markers.current = [];
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    const infoWindow = new google.maps.InfoWindow();
    visible.forEach(issue => {
      const pin = document.createElement("div");
      pin.style.cssText = `width:16px;height:16px;border:3px solid white;border-radius:999px;background:${STATUS_META[issue.status].color};box-shadow:0 3px 10px rgba(16,55,42,.28);cursor:pointer;`;
      const marker = new AdvancedMarkerElement({ map, position: { lat: Number(issue.latitude), lng: Number(issue.longitude) }, title: `${issue.publicId} · ${issue.title}`, content: pin });
      marker.addListener("click", () => {
        infoWindow.setContent(`<div style="padding:4px 2px;font-family:system-ui;max-width:220px"><div style="font-size:11px;color:#6d7e74">${issue.publicId}</div><strong style="display:block;margin:3px 0;color:#183d32">${issue.title}</strong><span style="font-size:12px;color:#5f7067">${issue.status} · ${issue.locationName}</span></div>`);
        infoWindow.open({ map, anchor: marker });
      });
      markers.current.push(marker);
    });
  }, [visible]);

  useEffect(() => { drawMarkers(); }, [drawMarkers]);
  return <RoleLayout allowedRoles={["admin"]} title="City Operations" navigation={adminNav}><div className="mx-auto max-w-7xl space-y-8"><PageHeading eyebrow="Geographic operations" title="Issue map" description="Scan service conditions across the city using status-colour markers. Only reports with saved coordinates appear on the map." />
    <section className="grid gap-5 xl:grid-cols-[1fr_300px]"><Card className="overflow-hidden border-[#e1e9e3] bg-white shadow-sm"><MapView initialCenter={defaultCenter} initialZoom={12} className="h-[590px]" onMapReady={map => { mapRef.current = map; drawMarkers(); }} /></Card><aside className="space-y-4"><Card className="border-[#e1e9e3] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2 text-[#25483b]"><MapPinned className="h-4 w-4 text-[#438264]" /><h2 className="font-semibold">Map controls</h2></div><label className="mt-5 block text-xs font-semibold uppercase tracking-[.1em] text-[#7c9085]">Filter status</label><select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as "All" | IssueStatus)} className="mt-2 h-10 w-full rounded-xl border border-[#d9e5dd] bg-white px-3 text-sm text-[#3e6050]"><option>All</option>{ISSUE_STATUSES.map(status => <option key={status}>{status}</option>)}</select><p className="mt-4 text-sm leading-6 text-[#6a7b71]">{visible.length} issue{visible.length === 1 ? "" : "s"} plotted with valid coordinates.</p></CardContent></Card><Card className="border-[#dce9df] bg-[#ecf5ee] shadow-sm"><CardContent className="p-5"><h2 className="font-display text-xl text-[#21483a]">Status key</h2><div className="mt-4 space-y-3">{ISSUE_STATUSES.map(status => <div key={status} className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-[#4e685b]"><span className="h-3 w-3 rounded-full border-2 border-white shadow-sm" style={{ background: STATUS_META[status].color }} />{status}</span><StatusBadge status={status} className="scale-[.86] origin-right" /></div>)}</div></CardContent></Card></aside></section>
  </div></RoleLayout>;
}
