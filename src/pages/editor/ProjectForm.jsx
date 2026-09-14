import { useRef, useState } from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Crop, ZoomIn, Move, Sliders, Sparkles } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { adminCreate, adminUpdate, adminUpload, WORLDS } from "@/lib/api";
import { SortableItem, DragHandle } from "@/components/editor/SortableItem";
import PositionPicker from "@/components/editor/PositionPicker";
import FramePanCropModal from "@/components/editor/FramePanCropModal";
import BatchAdjustImagesModal from "@/components/editor/BatchAdjustImagesModal";

const EMPTY = {
  title: "", slug: "", world: "anomaly", category: "", year: "", location: "",
  role: "", summary: "", concept: "", question: "", transformation: "",
  material: "", construction: "", status: "",
  operations: [], sections: [], images: [], cover: "",
  published: false, featured: false,
};

const Field = ({ label, children }) => (
  <div className="mb-5">
    <label className="mono text-mute block mb-2">{label}</label>
    {children}
  </div>
);

export default function ProjectForm({ initial, onSaved, onCancel, onDelete }) {
  const [p, setP] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    operationsText: (initial?.operations || []).join(", "),
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [frameModalIndex, setFrameModalIndex] = useState(null);
  const [showBatchAdjust, setShowBatchAdjust] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));
  const isEdit = Boolean(initial?.id);

  const handleBatchAdjust = ({ applyLaptop, applyMobile, laptop, mobile }) => {
    setP((s) => {
      const updatedImages = s.images.map((img) => {
        const next = { ...img };
        if (applyLaptop) {
          next.ratio = laptop.ratio;
          next.crop = laptop.crop;
          next.position = laptop.position;
          next.zoom = laptop.zoom;
        }
        if (applyMobile) {
          next.mobileRatio = mobile.mobileRatio;
          next.mobileCrop = mobile.mobileCrop;
          next.mobilePosition = mobile.mobilePosition;
          next.mobileZoom = mobile.mobileZoom;
        }
        return next;
      });

      return {
        ...s,
        images: updatedImages,
        cover_position: applyLaptop && laptop.position ? laptop.position : s.cover_position,
      };
    });

    const views = [];
    if (applyLaptop) views.push("Laptop");
    if (applyMobile) views.push("Mobile");
    toast.success(`Batch adjusted ${p.images.length} images (${views.join(" & ")})`);
  };

  const applyQuickPresetToAll = (type) => {
    setP((s) => {
      const updated = s.images.map((img) => {
        if (type === "laptop-fullscreen") {
          return {
            ...img,
            ratio: "fullscreen-laptop",
            crop: true,
            position: "center",
            zoom: 1,
          };
        }
        if (type === "mobile-fullscreen") {
          return {
            ...img,
            mobileRatio: "fullscreen-mobile",
            mobileCrop: true,
            mobilePosition: "center",
            mobileZoom: 1,
          };
        }
        if (type === "landscape-43") {
          return {
            ...img,
            ratio: "landscape",
            customRatio: undefined,
            crop: true,
            position: "center",
            zoom: 1,
            mobileRatio: "landscape",
            mobileCustomRatio: undefined,
            mobileCrop: true,
            mobilePosition: "center",
            mobileZoom: 1,
          };
        }
        if (type === "portrait-34") {
          return {
            ...img,
            ratio: "portrait",
            customRatio: undefined,
            crop: true,
            position: "center",
            zoom: 1,
            mobileRatio: "portrait",
            mobileCustomRatio: undefined,
            mobileCrop: true,
            mobilePosition: "center",
            mobileZoom: 1,
          };
        }
        if (type === "reset") {
          return {
            ...img,
            ratio: "auto",
            customRatio: undefined,
            crop: false,
            position: "center",
            zoom: 1,
            mobileRatio: "same",
            mobileCustomRatio: undefined,
            mobileCrop: false,
            mobilePosition: "center",
            mobileZoom: 1,
          };
        }
        return img;
      });
      return { ...s, images: updated };
    });
    toast.success(`Applied quick preset to all ${p.images.length} images`);
  };

  const handleSaveAllFromModal = (updatedFields, scope = "all") => {
    setP((s) => {
      const updated = s.images.map((img) => {
        const next = { ...img };
        if (scope === "all" || scope === "laptop") {
          next.ratio = updatedFields.ratio;
          next.customRatio = updatedFields.customRatio;
          next.crop = updatedFields.crop;
          next.position = updatedFields.position;
          next.zoom = updatedFields.zoom;
        }
        if (scope === "all" || scope === "mobile") {
          next.mobileRatio = updatedFields.mobileRatio;
          next.mobileCustomRatio = updatedFields.mobileCustomRatio;
          next.mobileCrop = updatedFields.mobileCrop;
          next.mobilePosition = updatedFields.mobilePosition;
          next.mobileZoom = updatedFields.mobileZoom;
        }
        return next;
      });
      return {
        ...s,
        images: updated,
        cover_position:
          (scope === "all" || scope === "laptop") && updatedFields.position
            ? updatedFields.position
            : s.cover_position,
      };
    });
    const scopeLabel =
      scope === "all"
        ? "Laptop & Mobile"
        : scope === "laptop"
        ? "Laptop View"
        : "Mobile View";
    toast.success(`Frame adjustments applied to all ${p.images.length} images (${scopeLabel})`);
  };

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fileList = Array.from(files);
      const urls = await adminUpload(fileList, (percent) => {
        setUploadProgress(percent);
      });

      if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error("No image URLs returned from server");
      }

      setP((s) => {
        const currentImages = Array.isArray(s?.images) ? s.images : [];
        const newImages = urls.map((url, idx) => ({
          id: `img_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          caption: "",
          ratio: "auto",
          crop: false,
          position: "center",
          zoom: 1,
          mobileRatio: "same",
          mobileCrop: false,
          mobilePosition: "center",
          mobileZoom: 1,
          order: currentImages.length + idx,
        }));
        const images = [...currentImages, ...newImages];
        return {
          ...s,
          images,
          cover: s?.cover || urls[0] || "",
          cover_position: s?.cover_position || "center",
        };
      });
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(err?.response?.data?.detail || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getImageItemId = (img, idx) => img.id || `${img.url || "img"}_${idx}`;

  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = p.images.findIndex((img, idx) => getImageItemId(img, idx) === active.id);
    const newIndex = p.images.findIndex((img, idx) => getImageItemId(img, idx) === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      set("images", arrayMove(p.images, oldIndex, newIndex));
    }
  };

  const save = async (publish) => {
    if (!p.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      ...p,
      published: publish === undefined ? p.published : publish,
      operations: p.operationsText.split(",").map((s) => s.trim()).filter(Boolean),
      cover: p.cover || p.images[0]?.url || "",
    };
    delete payload.operationsText;
    try {
      const saved = isEdit ? await adminUpdate(p.id, payload) : await adminCreate(payload);
      toast.success(`"${saved.title}" saved`);
      onSaved();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink" data-testid="project-form">
      <header className="hairline-b px-4 md:px-10 h-14 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <span className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</span>
          <span className="mono text-mute">{isEdit ? `Edit — ${initial.title}` : "New project"}</span>
        </div>
        <button className="e-btn" data-testid="cancel-button" onClick={onCancel}>← Back</button>
      </header>

      <div className="px-4 md:px-10 py-8 max-w-4xl grid grid-cols-12 gap-10">
        <div className="col-span-12 md:col-span-7">
          <Field label="Title *">
            <input className="e-input" data-testid="field-title" value={p.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => { if (!p.slug) set("slug", p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input className="e-input" data-testid="field-slug" value={p.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            <Field label="World">
              <select className="e-input" data-testid="field-world" value={p.world} onChange={(e) => set("world", e.target.value)}>
                {Object.values(WORLDS).map((w) => (
                  <option key={w.key} value={w.key}>{w.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <input
                className="e-input"
                data-testid="field-category"
                list="category-suggestions"
                value={p.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Architecture, Chair…"
              />
              <datalist id="category-suggestions">
                {(WORLDS[p.world]?.categories || []).map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Year">
              <input className="e-input" data-testid="field-year" value={p.year} onChange={(e) => set("year", e.target.value)} />
            </Field>
            <Field label="Location">
              <input className="e-input" data-testid="field-location" value={p.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Role">
              <input className="e-input" data-testid="field-role" value={p.role} onChange={(e) => set("role", e.target.value)} />
            </Field>
          </div>
          <Field label="Summary (one line)">
            <input className="e-input" data-testid="field-summary" value={p.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="Concept">
            <textarea className="e-input" rows={4} data-testid="field-concept" value={p.concept} onChange={(e) => set("concept", e.target.value)} />
          </Field>
          <Field label="Question (large italic line)">
            <input className="e-input" data-testid="field-question" value={p.question} onChange={(e) => set("question", e.target.value)} />
          </Field>
          <Field label="Design operations (comma separated)">
            <input className="e-input" data-testid="field-operations" value={p.operationsText} onChange={(e) => set("operationsText", e.target.value)} placeholder="Subtraction, Void, Framing" />
          </Field>
          <Field label="Transformation">
            <textarea className="e-input" rows={3} data-testid="field-transformation" value={p.transformation} onChange={(e) => set("transformation", e.target.value)} />
          </Field>

          <div className="hairline-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="mono text-mute">Text sections</span>
              <button className="e-btn" data-testid="add-section-button"
                onClick={() => set("sections", [...p.sections, { heading: "", text: "" }])}>
                + Add section
              </button>
            </div>
            {p.sections.map((s, i) => (
              <div key={i} className="border border-line p-4 mb-4" data-testid={`section-${i}`}>
                <div className="flex justify-between mb-3">
                  <span className="mono text-mute">Section {i + 1}</span>
                  <button className="mono text-accent" data-testid={`remove-section-${i}`}
                    onClick={() => set("sections", p.sections.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
                <input className="e-input mb-3" placeholder="Heading" data-testid={`section-heading-${i}`} value={s.heading}
                  onChange={(e) => set("sections", p.sections.map((x, j) => j === i ? { ...x, heading: e.target.value } : x))} />
                <textarea className="e-input" rows={3} placeholder="Text" data-testid={`section-text-${i}`} value={s.text}
                  onChange={(e) => set("sections", p.sections.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5">
          <Field label="Material">
            <input className="e-input" data-testid="field-material" value={p.material} onChange={(e) => set("material", e.target.value)} />
          </Field>
          <Field label="Construction">
            <input className="e-input" data-testid="field-construction" value={p.construction} onChange={(e) => set("construction", e.target.value)} />
          </Field>
          <Field label="Status">
            <input className="e-input" data-testid="field-status" value={p.status} onChange={(e) => set("status", e.target.value)} placeholder="Prototype, Concept study…" />
          </Field>

          <div className="hairline-t pt-6 mt-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="mono text-mute">Images ({p.images.length})</span>
              <div className="flex items-center gap-2">
                {p.images.length > 0 && (
                  <button
                    type="button"
                    className="e-btn text-xs flex items-center gap-1.5 bg-ink/5 hover:bg-ink hover:text-paper transition-colors font-medium border border-line"
                    data-testid="adjust-all-images-btn"
                    onClick={() => setShowBatchAdjust(true)}
                    title="Batch adjust frame ratios, crop, anchor, and zoom for all images (Laptop & Mobile)"
                  >
                    <Sliders size={13} />
                    Adjust All Images
                  </button>
                )}
                <button className="e-btn" data-testid="upload-images-button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading
                    ? uploadProgress !== null && uploadProgress > 0
                      ? `Uploading ${uploadProgress}%…`
                      : "Optimizing & Uploading…"
                    : "+ Upload images"}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="file-input"
                onChange={(e) => upload(e.target.files)} />
            </div>

            {/* Quick Batch Adjust Toolbar */}
            {p.images.length > 1 && (
              <div className="mb-4 p-2.5 bg-ink/[0.02] border border-line flex flex-wrap items-center justify-between gap-2" data-testid="quick-batch-toolbar">
                <div className="flex items-center gap-1.5 mono text-[11px] text-mute">
                  <Sliders size={12} className="text-ink" />
                  <span>Adjust All ({p.images.length}):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickPresetToAll("laptop-fullscreen")}
                    className="mono text-[10px] px-2 py-1 bg-paper border border-line hover:border-ink hover:text-ink transition-colors cursor-pointer"
                    title="Set all images: 16:9 Fullscreen Laptop + Center + Crop"
                    data-testid="quick-all-169-btn"
                  >
                    💻 All 16:9 Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPresetToAll("mobile-fullscreen")}
                    className="mono text-[10px] px-2 py-1 bg-paper border border-line hover:border-ink hover:text-ink transition-colors cursor-pointer"
                    title="Set all images: 9:16 Fullscreen Mobile"
                    data-testid="quick-all-916-btn"
                  >
                    📱 All 9:16 Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPresetToAll("landscape-43")}
                    className="mono text-[10px] px-2 py-1 bg-paper border border-line hover:border-ink hover:text-ink transition-colors cursor-pointer"
                    title="Set all images: 4:3 Landscape for both Laptop & Mobile"
                    data-testid="quick-all-43-btn"
                  >
                    4:3 Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPresetToAll("portrait-34")}
                    className="mono text-[10px] px-2 py-1 bg-paper border border-line hover:border-ink hover:text-ink transition-colors cursor-pointer"
                    title="Set all images: 3:4 Portrait for both Laptop & Mobile"
                    data-testid="quick-all-34-btn"
                  >
                    3:4 Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPresetToAll("reset")}
                    className="mono text-[10px] px-2 py-1 bg-paper border border-line text-mute hover:text-ink transition-colors cursor-pointer"
                    title="Reset all images to Original (uncropped, 1.0x, center)"
                    data-testid="quick-all-reset-btn"
                  >
                    Reset All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchAdjust(true)}
                    className="mono text-[10px] px-2 py-1 bg-ink text-paper border border-ink hover:opacity-90 transition-opacity font-medium ml-1 cursor-pointer"
                    data-testid="quick-all-custom-btn"
                  >
                    Custom Adjust All…
                  </button>
                </div>
              </div>
            )}
            {p.images.length === 0 && <div className="mono text-mute py-4">No images yet.</div>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
              <SortableContext items={p.images.map((img, idx) => getImageItemId(img, idx))} strategy={verticalListSortingStrategy}>
                {p.images.map((img, i) => {
                  const itemId = getImageItemId(img, i);
                  return (
                    <SortableItem key={itemId} id={itemId}>
                      {({ attributes, listeners }) => (
                      <div className="border border-line p-3 mb-3 bg-paper" data-testid={`image-row-${i}`}>
                        <div className="flex gap-3 items-start">
                          <DragHandle attributes={attributes} listeners={listeners} testid={`image-drag-handle-${i}`} />
                          <div
                            className="w-20 h-16 overflow-hidden border border-line bg-ink/5 relative flex items-center justify-center cursor-pointer group flex-shrink-0"
                            onClick={() => setFrameModalIndex(i)}
                            title="Click to open Frame, Pan & Zoom Editor"
                            data-testid={`image-thumbnail-${i}`}
                          >
                            <img
                              src={img.url}
                              alt=""
                              style={{
                                objectPosition: img.position || "center",
                                transform: img.zoom && img.zoom !== 1 ? `scale(${img.zoom})` : undefined,
                                transformOrigin: img.position || "center",
                              }}
                              className="w-full h-full object-cover transition-transform"
                            />
                            <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-paper">
                              <Move size={13} />
                              <span className="mono text-[9px] mt-0.5">Pan/Crop</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center">
                              <input className="e-input !py-1.5 text-xs flex-1" placeholder="Caption" data-testid={`image-caption-${i}`} value={img.caption}
                                onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))} />
                              <button
                                type="button"
                                className="mono text-xs px-2.5 py-1.5 border border-line bg-ink text-paper hover:bg-ink/80 flex items-center gap-1.5 transition-colors flex-shrink-0"
                                data-testid={`adjust-frame-btn-${i}`}
                                onClick={() => setFrameModalIndex(i)}
                                title="Open interactive frame pan, zoom, and crop editor"
                              >
                                <Crop size={12} />
                                Adjust Frame (Pan & Zoom)
                              </button>
                            </div>

                            {/* Laptop / Desktop View Settings */}
                            <div className="flex flex-wrap gap-2 mt-2 items-center p-2 bg-ink/[0.02] border border-line/60">
                              <span className="mono text-[11px] text-mute flex items-center gap-1 min-w-[70px]">
                                <Monitor size={12} />
                                Laptop
                              </span>
                              <select
                                className="e-input !py-1 !px-2 !w-auto text-xs"
                                data-testid={`image-ratio-${i}`}
                                value={img.ratio || "auto"}
                                onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, ratio: e.target.value } : x))}
                              >
                                <option value="auto">Original</option>
                                <option value="landscape">4:3 Landscape Fullscreen {img.ratio === "landscape" && img.customRatio ? `(${img.customRatio.toFixed(2)}:1)` : "(4:3)"}</option>
                                <option value="fullscreen-laptop">Fullscreen Laptop {img.customRatio ? `(${img.customRatio.toFixed(2)}:1)` : "(16:9)"}</option>
                                <option value="fullscreen-mobile">Fullscreen Mobile {img.mobileCustomRatio || img.customRatio ? `(${((img.mobileCustomRatio || img.customRatio)).toFixed(2)}:1)` : "(9:16)"}</option>
                                <option value="wide">Wide 16:9</option>
                                <option value="square">Square 1:1</option>
                                <option value="portrait">Portrait 3:4</option>
                                <option value="tall">Portrait 9:16</option>
                                <option value="custom">Custom {img.customRatio ? `(${img.customRatio.toFixed(2)}:1)` : ""}</option>
                              </select>
                              <label className="mono text-mute flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  data-testid={`image-crop-${i}`}
                                  checked={!!img.crop}
                                  disabled={(img.ratio || "auto") === "auto" && !img.customRatio}
                                  onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, crop: e.target.checked } : x))}
                                />
                                Crop
                              </label>
                              <PositionPicker
                                value={img.position || "center"}
                                onChange={(pos) => {
                                  const updatedImages = p.images.map((x, j) => j === i ? { ...x, position: pos } : x);
                                  const isCover = p.cover === img.url;
                                  setP((s) => ({
                                    ...s,
                                    images: updatedImages,
                                    ...(isCover ? { cover_position: pos } : {}),
                                  }));
                                }}
                                label="Anchor"
                              />

                              {/* Laptop Zoom Slider (0.1x to 10x) */}
                              <div className="flex items-center gap-1.5 ml-auto">
                                <span className="mono text-[11px] text-mute flex items-center gap-1">
                                  <ZoomIn size={11} />
                                  Zoom: {(img.zoom || 1).toFixed(2)}x
                                </span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="10"
                                  step="0.05"
                                  value={img.zoom || 1}
                                  onChange={(e) => {
                                    const z = parseFloat(e.target.value);
                                    set("images", p.images.map((x, j) => (j === i ? { ...x, zoom: z } : x)));
                                  }}
                                  className="w-20 accent-ink cursor-pointer h-1.5"
                                  title="Laptop Image Zoom Slider (0.1x - 10x)"
                                  data-testid={`image-zoom-${i}`}
                                />
                              </div>
                            </div>

                            {/* Mobile View Settings */}
                            <div className="flex flex-wrap gap-2 mt-1.5 items-center p-2 bg-ink/[0.02] border border-line/60">
                              <span className="mono text-[11px] text-mute flex items-center gap-1 min-w-[70px]">
                                <Smartphone size={12} />
                                Mobile
                              </span>
                              <select
                                className="e-input !py-1 !px-2 !w-auto text-xs"
                                data-testid={`image-mobile-ratio-${i}`}
                                value={img.mobileRatio || "same"}
                                onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, mobileRatio: e.target.value } : x))}
                              >
                                <option value="same">Same as Laptop</option>
                                <option value="auto">Original</option>
                                <option value="landscape">4:3 Landscape Fullscreen {img.mobileRatio === "landscape" && (img.mobileCustomRatio || img.customRatio) ? `(${((img.mobileCustomRatio || img.customRatio)).toFixed(2)}:1)` : "(4:3)"}</option>
                                <option value="fullscreen-mobile">Fullscreen Mobile {img.mobileCustomRatio || img.customRatio ? `(${((img.mobileCustomRatio || img.customRatio)).toFixed(2)}:1)` : "(9:16)"}</option>
                                <option value="fullscreen-laptop">Fullscreen Laptop {img.customRatio ? `(${img.customRatio.toFixed(2)}:1)` : "(16:9)"}</option>
                                <option value="tall">Portrait 9:16</option>
                                <option value="portrait">Portrait 3:4</option>
                                <option value="square">Square 1:1</option>
                                <option value="wide">Wide 16:9</option>
                                <option value="custom">Custom {img.mobileCustomRatio || img.customRatio ? `(${((img.mobileCustomRatio || img.customRatio)).toFixed(2)}:1)` : ""}</option>
                              </select>
                              <label className="mono text-mute flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  data-testid={`image-mobile-crop-${i}`}
                                  checked={
                                    img.mobileRatio === "same" || !img.mobileRatio
                                      ? !!img.crop
                                      : !!img.mobileCrop
                                  }
                                  disabled={
                                    (img.mobileRatio === "auto" ||
                                      ((!img.mobileRatio || img.mobileRatio === "same") && (img.ratio || "auto") === "auto")) &&
                                    !img.customRatio &&
                                    !img.mobileCustomRatio
                                  }
                                  onChange={(e) =>
                                    set(
                                      "images",
                                      p.images.map((x, j) =>
                                        j === i
                                          ? {
                                              ...x,
                                              mobileCrop: e.target.checked,
                                              mobileRatio:
                                                !x.mobileRatio || x.mobileRatio === "same"
                                                  ? x.ratio || "auto"
                                                  : x.mobileRatio,
                                            }
                                          : x
                                      )
                                    )
                                  }
                                />
                                Crop
                              </label>

                              <PositionPicker
                                value={img.mobilePosition || img.position || "center"}
                                onChange={(pos) => {
                                  const updatedImages = p.images.map((x, j) =>
                                    j === i ? { ...x, mobilePosition: pos } : x
                                  );
                                  setP((s) => ({
                                    ...s,
                                    images: updatedImages,
                                  }));
                                }}
                                label="Anchor"
                              />

                              {/* Mobile Zoom Slider (0.1x to 10x) */}
                              <div className="flex items-center gap-1.5 ml-auto">
                                <span className="mono text-[11px] text-mute flex items-center gap-1">
                                  <ZoomIn size={11} />
                                  Zoom: {(img.mobileZoom || img.zoom || 1).toFixed(2)}x
                                </span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="10"
                                  step="0.05"
                                  value={img.mobileZoom || img.zoom || 1}
                                  onChange={(e) => {
                                    const mz = parseFloat(e.target.value);
                                    set("images", p.images.map((x, j) => (j === i ? { ...x, mobileZoom: mz } : x)));
                                  }}
                                  className="w-20 accent-ink cursor-pointer h-1.5"
                                  title="Mobile Image Zoom Slider (0.1x - 10x)"
                                  data-testid={`image-mobile-zoom-${i}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 items-center">
                              <button
                                type="button"
                                className={`mono px-2 py-1 border ${p.cover === img.url ? "bg-ink text-paper border-transparent" : "border-line text-mute"}`}
                                data-testid={`set-cover-${i}`}
                                onClick={() => setP((s) => ({ ...s, cover: img.url, cover_position: img.position || "center" }))}
                              >
                                {p.cover === img.url ? "Cover ✓" : "Set cover"}
                              </button>
                              <button className="mono text-accent ml-auto" data-testid={`image-remove-${i}`}
                                onClick={() => setP((s) => {
                                  const images = s.images.filter((_, j) => j !== i);
                                  return { ...s, images, cover: s.cover === img.url ? images[0]?.url || "" : s.cover };
                                })}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                );
              })}
              </SortableContext>
            </DndContext>
          </div>

          <div className="hairline-t pt-6 mt-6 flex items-center gap-6">
            <label className="mono text-mute flex items-center gap-2 cursor-pointer">
              <input type="checkbox" data-testid="field-featured" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured on home
            </label>
          </div>

          <div className="flex gap-3 mt-8">
            <button className="e-btn flex-1" data-testid="save-draft-button" disabled={saving} onClick={() => save()}>
              {saving ? "Saving…" : p.published ? "Save" : "Save as draft"}
            </button>
            <button className="e-btn e-btn-solid flex-1" data-testid="save-publish-button" disabled={saving}
              onClick={() => save(true)}>
              {saving ? "Saving…" : "Save & publish"}
            </button>
          </div>
          {isEdit && (
            <a href={`/project/${p.slug}${p.published ? "" : "?preview=1"}`} target="_blank" rel="noopener noreferrer"
              className="e-btn w-full text-center block mt-3" data-testid="form-preview-button">
              Preview on site →
            </a>
          )}
          {isEdit && onDelete && (
            <button
              type="button"
              className="e-btn hover:!bg-accent hover:!border-accent w-full text-center block mt-3 text-accent"
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="form-delete-button"
            >
              Delete project
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          data-testid="form-delete-modal"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-paper border border-line p-6 sm:p-8 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold lowercase tracking-tight text-xs text-mute mb-1">abearchitectstudio</div>
            <h3 className="display text-xl mb-3 text-ink">Delete Project</h3>
            <p className="text-sm text-mute leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-ink font-semibold">"{p.title || "Untitled"}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="e-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="e-btn !bg-accent !text-paper !border-accent hover:opacity-90"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(initial.id);
                  } finally {
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                data-testid="confirm-form-delete-button"
              >
                {deleting ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {frameModalIndex !== null && p.images[frameModalIndex] && (
        <FramePanCropModal
          image={p.images[frameModalIndex]}
          index={frameModalIndex}
          totalImages={p.images.length}
          onSave={(updatedFields) => {
            const currentImg = p.images[frameModalIndex];
            const updatedImages = p.images.map((x, j) =>
              j === frameModalIndex ? { ...x, ...updatedFields } : x
            );
            const isCover = p.cover === currentImg.url;
            setP((s) => ({
              ...s,
              images: updatedImages,
              ...(isCover ? { cover_position: updatedFields.position } : {}),
            }));
            toast.success("Frame, pan & zoom adjustments applied");
          }}
          onSaveAll={handleSaveAllFromModal}
          onClose={() => setFrameModalIndex(null)}
        />
      )}

      {showBatchAdjust && p.images.length > 0 && (
        <BatchAdjustImagesModal
          totalImages={p.images.length}
          onApply={handleBatchAdjust}
          onClose={() => setShowBatchAdjust(false)}
        />
      )}
    </div>
  );
}
