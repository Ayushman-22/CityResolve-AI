import { PageHeading } from "@/components/CivicPrimitives";
import { RoleLayout } from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, type IssueCategory, type IssuePriority } from "../../../shared/civic";
import { photoAnalysisToEditableFields } from "../../../shared/photoAutofill";
import { requestDeviceCoordinates } from "../../../shared/deviceLocation";
import * as exifr from "exifr";
import { AlertCircle, Bell, BrainCircuit, CheckCircle2, ClipboardList, ImagePlus, Loader2, MapPin, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLocation } from "wouter";

const citizenNav = [{ icon: ClipboardList, label: "My reports", path: "/citizen" }, { icon: Plus, label: "Report an issue", path: "/citizen/report" }, { icon: Bell, label: "Notifications", path: "/notifications" }];
type FormData = { title: string; description: string; category: IssueCategory; priority: IssuePriority; ward: string; locationName: string; latitude?: string; longitude?: string };
type LocalPhoto = { name: string; type: "image/jpeg" | "image/png" | "image/webp"; dataUrl: string; file: File };

export default function NewIssue() {
  const [, setLocation] = useLocation();
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ defaultValues: { category: "Other", priority: "Medium" } });
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [suggestion, setSuggestion] = useState<{ category: IssueCategory; priority: IssuePriority; reasoning: string; source: "ai" | "guided" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createIssue = trpc.issue.create.useMutation();
  const uploadAttachment = trpc.issue.uploadAttachment.useMutation();
  const analyzePhoto = trpc.issue.analyzePhoto.useMutation();
  const resolvePhotoLocation = trpc.issue.resolvePhotoLocation.useMutation();
  const suggest = trpc.issue.suggest.useMutation({ onSuccess: result => { setSuggestion(result); setValue("category", result.category); setValue("priority", result.priority); } });
  const [photoAnalysis, setPhotoAnalysis] = useState<{ title: string; description: string; category: IssueCategory; priority: IssuePriority; confidence: "High" | "Medium" | "Low"; note: string; source: "photo-ai" | "guided" } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "checking-photo" | "checking-device" | "filled-photo" | "filled-device" | "denied">("idle");
  const description = watch("description");
  const applyPhotoAnalysis = async (photo: LocalPhoto) => {
    try {
      const result = await analyzePhoto.mutateAsync({ mimeType: photo.type, dataUrl: photo.dataUrl });
      const editableFields = photoAnalysisToEditableFields(result);
      setValue("title", editableFields.title, { shouldValidate: true });
      setValue("description", editableFields.description, { shouldValidate: true });
      setValue("category", editableFields.category, { shouldValidate: true });
      setValue("priority", editableFields.priority, { shouldValidate: true });
      setPhotoAnalysis(result);
      toast.success(result.source === "photo-ai" ? "Photo analysis filled the issue details. Please review them." : "Photo added. Please complete the issue details manually.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "We could not analyze this photo."); }
  };
  const applyCoordinates = async (latitude: number, longitude: number, source: "photo" | "device") => {
    try {
      const result = await resolvePhotoLocation.mutateAsync({ latitude, longitude });
      const current = getValues();
      if (!current.latitude) setValue("latitude", result.latitude, { shouldValidate: true });
      if (!current.longitude) setValue("longitude", result.longitude, { shouldValidate: true });
      if (!current.locationName && result.locationName) setValue("locationName", result.locationName, { shouldValidate: true });
      if (!current.ward && result.ward) setValue("ward", result.ward, { shouldValidate: true });
      setLocationStatus(source === "photo" ? "filled-photo" : "filled-device");
      toast.success(source === "photo" ? "Embedded photo location was added. Please confirm it before submitting." : "Current device location was added. Please confirm it before submitting.");
    } catch {
      setLocationStatus("denied");
    }
  };
  const applyDeviceLocation = async () => {
    setLocationStatus("checking-device");
    try {
      const coordinates = await requestDeviceCoordinates(navigator.geolocation);
      await applyCoordinates(coordinates.latitude, coordinates.longitude, "device");
    } catch {
      setLocationStatus("denied");
    }
  };
  const applyPhotoLocation = async (file: File) => {
    setLocationStatus("checking-photo");
    try {
      const gps = await exifr.gps(file);
      if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) {
        await applyDeviceLocation();
        return;
      }
      await applyCoordinates(gps.latitude, gps.longitude, "photo");
    } catch {
      await applyDeviceLocation();
    }
  };
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    let shouldAnalyze = photos.length === 0;
    let shouldLocate = photos.length === 0;
    Array.from(files).slice(0, 4 - photos.length).forEach(file => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Please choose JPG, PNG, or WebP photos.");
      if (file.size > 5 * 1024 * 1024) return toast.error("Each photo must be 5 MB or less.");
      const reader = new FileReader();
      reader.onload = () => {
        const photo = { name: file.name, type: file.type as LocalPhoto["type"], dataUrl: String(reader.result), file };
        setPhotos(current => [...current, photo]);
        if (shouldLocate) {
          shouldLocate = false;
          void applyPhotoLocation(file);
        }
        if (shouldAnalyze) {
          shouldAnalyze = false;
          void applyPhotoAnalysis(photo);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  const onSubmit = async (data: FormData) => {
    try {
      const issue = await createIssue.mutateAsync(data);
      await Promise.all(photos.map(photo => uploadAttachment.mutateAsync({ publicId: issue!.publicId, fileName: photo.name, mimeType: photo.type, dataUrl: photo.dataUrl })));
      toast.success("Your civic issue has been submitted.");
      setLocation("/citizen");
    } catch (error) { toast.error(error instanceof Error ? error.message : "We could not submit your report."); }
  };
  const useSuggestion = () => { if (!description || description.trim().length < 20) return toast.error("Add at least a short description before requesting a suggestion."); suggest.mutate({ description }); };
  return <RoleLayout allowedRoles={["citizen"]} title="CityResolve" navigation={citizenNav}>
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeading eyebrow="New service request" title="Report a civic issue" description="Clear details help your city direct the right team and respond with confidence." />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6 rounded-[1.5rem] border border-[#e1e9e3] bg-white p-6 shadow-sm sm:p-8">
          <div><Label htmlFor="title" className="text-sm font-semibold text-[#244439]">Issue title</Label><Input id="title" placeholder="What needs attention?" className="mt-2 h-11 rounded-xl border-[#d6e1da]" {...register("title", { required: "Please add a concise title.", minLength: { value: 5, message: "Use at least 5 characters." } })} />{errors.title && <p className="mt-2 text-xs text-[#b54430]">{errors.title.message}</p>}</div>
          <div><div className="flex items-center justify-between"><Label htmlFor="description" className="text-sm font-semibold text-[#244439]">What happened?</Label><button type="button" onClick={useSuggestion} disabled={suggest.isPending} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#267455] hover:text-[#104f3a] disabled:opacity-50"><BrainCircuit className="h-3.5 w-3.5" />{suggest.isPending ? "Reviewing…" : "Suggest category & priority"}</button></div><Textarea id="description" rows={7} placeholder="Describe the issue, its impact, and anything the responding team should know." className="mt-2 resize-none rounded-xl border-[#d6e1da] leading-6" {...register("description", { required: "Please describe the issue.", minLength: { value: 20, message: "Include at least 20 characters." } })} />{errors.description && <p className="mt-2 text-xs text-[#b54430]">{errors.description.message}</p>}{suggestion && <div className="mt-3 flex gap-3 rounded-xl border border-[#cfe6d7] bg-[#f1faf4] p-3 text-sm text-[#315c49]"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#2d885f]" /><p><strong>{suggestion.source === "ai" ? "AI suggestion" : "Guided suggestion"}:</strong> {suggestion.reasoning}</p></div>}</div>
          <div className="grid gap-5 sm:grid-cols-2"><div><Label className="text-sm font-semibold text-[#244439]">Category</Label><select className="mt-2 h-11 w-full rounded-xl border border-[#d6e1da] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#78b79a]" {...register("category")}>{ISSUE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></div><div><Label className="text-sm font-semibold text-[#244439]">Priority</Label><select className="mt-2 h-11 w-full rounded-xl border border-[#d6e1da] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#78b79a]" {...register("priority")}>{ISSUE_PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></div></div>
          <div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="ward" className="text-sm font-semibold text-[#244439]">Ward or neighborhood</Label><Input id="ward" placeholder="e.g. Ward 12" className="mt-2 h-11 rounded-xl border-[#d6e1da]" {...register("ward", { required: "Please add your ward or neighborhood." })} />{errors.ward && <p className="mt-2 text-xs text-[#b54430]">{errors.ward.message}</p>}</div><div><Label htmlFor="locationName" className="text-sm font-semibold text-[#244439]">Location</Label><Input id="locationName" placeholder="Street, landmark, or address" className="mt-2 h-11 rounded-xl border-[#d6e1da]" {...register("locationName", { required: "Please add a location." })} />{errors.locationName && <p className="mt-2 text-xs text-[#b54430]">{errors.locationName.message}</p>}</div></div>
          <div className="grid gap-5 sm:grid-cols-2"><div><Label className="text-sm font-semibold text-[#244439]">Latitude <span className="font-normal text-[#84928b]">(optional)</span></Label><Input placeholder="e.g. 40.7128" className="mt-2 h-11 rounded-xl border-[#d6e1da]" {...register("latitude")} /></div><div><Label className="text-sm font-semibold text-[#244439]">Longitude <span className="font-normal text-[#84928b]">(optional)</span></Label><Input placeholder="e.g. -74.0060" className="mt-2 h-11 rounded-xl border-[#d6e1da]" {...register("longitude")} /></div></div>
          <div><div className="flex items-center justify-between"><Label className="text-sm font-semibold text-[#244439]">Photos <span className="font-normal text-[#84928b]">(optional)</span></Label><span className="text-xs text-[#809087]">Up to 4 · 5 MB each</span></div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => addPhotos(event.target.files)} /><button type="button" onClick={() => fileRef.current?.click()} className="mt-2 flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#bdd2c4] bg-[#f7fbf8] text-[#4a715c] transition-colors hover:bg-[#eef7f0]"><ImagePlus className="h-5 w-5" /><span className="mt-2 text-sm font-semibold">Add supporting photos</span><span className="mt-1 text-xs text-[#7f9387]">JPG, PNG, or WebP · uses photo GPS or asks for device location</span></button>{(analyzePhoto.isPending || locationStatus === "checking-photo" || locationStatus === "checking-device") && <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#cfe5d7] bg-[#eff8f2] p-3 text-sm text-[#31654c]"><Loader2 className="h-4 w-4 animate-spin" />{locationStatus === "checking-device" ? "Requesting the device’s current location…" : locationStatus === "checking-photo" ? "Checking the photo for embedded GPS location…" : "Analyzing the first photo and preparing your report…"}</div>}{locationStatus === "filled-photo" && <div className="mt-3 rounded-xl border border-[#cfe5d7] bg-[#eff8f2] p-3 text-xs leading-5 text-[#3d6b53]">Embedded GPS was found and used to suggest your ward, location, latitude, and longitude. Please review these editable details before submitting.</div>}{locationStatus === "filled-device" && <div className="mt-3 rounded-xl border border-[#cfe5d7] bg-[#eff8f2] p-3 text-xs leading-5 text-[#3d6b53]">Your device location was approved and used to suggest ward, location, latitude, and longitude. Please review these editable details before submitting.</div>}{locationStatus === "denied" && <div className="mt-3 rounded-xl border border-[#e6dfc8] bg-[#fffbf2] p-3 text-xs leading-5 text-[#796a46]">Photo GPS was unavailable and device location was not shared. You can add the location manually or retry the permission request.<button type="button" onClick={() => void applyDeviceLocation()} className="ml-1 font-semibold text-[#8a6116] underline underline-offset-2">Use this device’s location</button></div>}{photoAnalysis && <div className="mt-3 rounded-xl border border-[#cfe5d7] bg-[#eff8f2] p-4"><div className="flex items-center justify-between gap-3"><p className="inline-flex items-center gap-2 text-sm font-semibold text-[#286047]"><WandSparkles className="h-4 w-4" />Photo details applied</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#498168]">{photoAnalysis.confidence} confidence</span></div><p className="mt-2 text-xs leading-5 text-[#59766a]">{photoAnalysis.note} Location is taken only from embedded photo GPS or a device permission prompt—please confirm it yourself.</p>{photos.length > 1 && <button type="button" disabled={analyzePhoto.isPending} onClick={() => applyPhotoAnalysis(photos[photos.length - 1])} className="mt-3 text-xs font-semibold text-[#267455] hover:text-[#104f3a]">Analyze latest photo again</button>}</div>}{photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="group relative overflow-hidden rounded-xl border border-[#dce7df]"><img src={photo.dataUrl} alt="Issue attachment preview" className="h-20 w-full object-cover" /><button type="button" onClick={() => setPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#163c31]/80 text-white"><X className="h-3.5 w-3.5" /></button><p className="truncate px-2 py-1.5 text-[10px] text-[#627168]">{photo.name}</p></div>)}</div>}</div>
        </section>
        <aside className="h-fit rounded-[1.5rem] border border-[#dce8df] bg-[#eaf4ed] p-6"><MapPin className="h-5 w-5 text-[#267455]" /><h2 className="mt-4 font-display text-2xl tracking-[-.04em] text-[#21483a]">A better report, a faster start.</h2><p className="mt-3 text-sm leading-6 text-[#5f7669]">Include visible landmarks, what makes the issue urgent, and a photo where safe to do so.</p><div className="mt-6 rounded-xl bg-white/70 p-4 text-xs leading-5 text-[#5d7266]"><AlertCircle className="mb-2 h-4 w-4 text-[#b47a13]" />Do not include personal information or place yourself in danger to document an issue.</div><Button type="submit" disabled={isSubmitting || createIssue.isPending || uploadAttachment.isPending} className="mt-6 h-11 w-full rounded-xl bg-[#146c50] hover:bg-[#0e583f]">{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Submit report</>}</Button></aside>
      </form>
    </div>
  </RoleLayout>;
}
