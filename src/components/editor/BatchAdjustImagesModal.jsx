import React, { useState } from "react";
import { X, Check, Monitor, Smartphone, Sliders, RotateCcw, ZoomIn, Sparkles, Layers } from "lucide-react";
import PositionPicker from "./PositionPicker";

const RATIOS = [
  { id: "auto", label: "Original (Uncropped)" },
  { id: "fullscreen-laptop", label: "Fullscreen Laptop (16:9)" },
  { id: "fullscreen-mobile", label: "Fullscreen Mobile (9:16)" },
  { id: "landscape", label: "4:3 Landscape Fullscreen" },
  { id: "wide", label: "16:9 Wide" },
  { id: "square", label: "1:1 Square" },
  { id: "portrait", label: "3:4 Portrait" },
  { id: "tall", label: "9:16 Portrait" },
];

const MOBILE_RATIOS = [
  { id: "same", label: "Same as Laptop" },
  { id: "fullscreen-mobile", label: "Fullscreen Mobile (9:16)" },
  { id: "landscape", label: "4:3 Landscape Fullscreen" },
  { id: "fullscreen-laptop", label: "Fullscreen Laptop (16:9)" },
  { id: "auto", label: "Original (Uncropped)" },
  { id: "tall", label: "9:16 Portrait" },
  { id: "portrait", label: "3:4 Portrait" },
  { id: "square", label: "1:1 Square" },
  { id: "wide", label: "16:9 Wide" },
];

const QUICK_PRESETS = [
  {
    id: "fullscreen-modern",
    name: "Fullscreen Responsive",
    desc: "16:9 on Laptop, 9:16 on Mobile (Immersive full viewport)",
    laptop: { ratio: "fullscreen-laptop", crop: true, position: "center", zoom: 1 },
    mobile: { mobileRatio: "fullscreen-mobile", mobileCrop: true, mobilePosition: "center", mobileZoom: 1 },
  },
  {
    id: "landscape-43",
    name: "Architectural 4:3",
    desc: "4:3 Landscape framing across both Laptop and Mobile",
    laptop: { ratio: "landscape", crop: true, position: "center", zoom: 1 },
    mobile: { mobileRatio: "landscape", mobileCrop: true, mobilePosition: "center", mobileZoom: 1 },
  },
  {
    id: "portrait-34",
    name: "3:4 Portrait Format",
    desc: "3:4 Vertical Portrait framing across both Laptop and Mobile",
    laptop: { ratio: "portrait", crop: true, position: "center", zoom: 1 },
    mobile: { mobileRatio: "portrait", mobileCrop: true, mobilePosition: "center", mobileZoom: 1 },
  },
  {
    id: "square-catalog",
    name: "Clean 1:1 Square",
    desc: "Square format with centered focal point",
    laptop: { ratio: "square", crop: true, position: "center", zoom: 1 },
    mobile: { mobileRatio: "square", mobileCrop: true, mobilePosition: "center", mobileZoom: 1 },
  },
  {
    id: "original-natural",
    name: "Original Uncropped",
    desc: "Preserve each image's native aspect ratio without cropping",
    laptop: { ratio: "auto", crop: false, position: "center", zoom: 1 },
    mobile: { mobileRatio: "same", mobileCrop: false, mobilePosition: "center", mobileZoom: 1 },
  },
];

export default function BatchAdjustImagesModal({
  totalImages = 0,
  onApply,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("laptop"); // "laptop" | "mobile" | "presets"

  // Laptop Settings
  const [laptopRatio, setLaptopRatio] = useState("landscape");
  const [laptopCrop, setLaptopCrop] = useState(true);
  const [laptopPosition, setLaptopPosition] = useState("center");
  const [laptopZoom, setLaptopZoom] = useState(1);

  // Mobile Settings
  const [mobileRatio, setMobileRatio] = useState("same");
  const [mobileCrop, setMobileCrop] = useState(true);
  const [mobilePosition, setMobilePosition] = useState("center");
  const [mobileZoom, setMobileZoom] = useState(1);

  // Scope switches
  const [applyLaptop, setApplyLaptop] = useState(true);
  const [applyMobile, setApplyMobile] = useState(true);

  const handleApplyPreset = (preset) => {
    setLaptopRatio(preset.laptop.ratio);
    setLaptopCrop(preset.laptop.crop);
    setLaptopPosition(preset.laptop.position);
    setLaptopZoom(preset.laptop.zoom);

    setMobileRatio(preset.mobile.mobileRatio);
    setMobileCrop(preset.mobile.mobileCrop);
    setMobilePosition(preset.mobile.mobilePosition);
    setMobileZoom(preset.mobile.mobileZoom);

    setApplyLaptop(true);
    setApplyMobile(true);
  };

  const handleSave = () => {
    onApply({
      applyLaptop,
      applyMobile,
      laptop: {
        ratio: laptopRatio,
        crop: laptopCrop,
        position: laptopPosition,
        zoom: laptopZoom,
      },
      mobile: {
        mobileRatio,
        mobileCrop,
        mobilePosition,
        mobileZoom,
      },
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6"
      data-testid="batch-adjust-modal"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-line w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-ink/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-ink text-paper">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="display text-base sm:text-lg font-semibold text-ink leading-tight">
                Adjust All Images ({totalImages} images)
              </h2>
              <p className="mono text-[11px] text-mute">
                Batch configure frame ratios, crop, anchor positions & zoom for both Laptop and Mobile.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-mute hover:text-ink hover:bg-ink/5 border border-line transition-colors"
            data-testid="close-batch-adjust"
          >
            <X size={16} />
          </button>
        </div>

        {/* View Selection Tabs */}
        <div className="flex border-b border-line px-5 pt-3 gap-2 bg-paper">
          <button
            type="button"
            onClick={() => setActiveTab("laptop")}
            className={`mono text-xs pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "laptop"
                ? "border-ink text-ink font-medium"
                : "border-transparent text-mute hover:text-ink"
            }`}
            data-testid="batch-tab-laptop"
          >
            <Monitor size={13} />
            Laptop View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={`mono text-xs pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "mobile"
                ? "border-ink text-ink font-medium"
                : "border-transparent text-mute hover:text-ink"
            }`}
            data-testid="batch-tab-mobile"
          >
            <Smartphone size={13} />
            Mobile View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`mono text-xs pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "presets"
                ? "border-ink text-ink font-medium"
                : "border-transparent text-mute hover:text-ink"
            }`}
            data-testid="batch-tab-presets"
          >
            <Sparkles size={13} />
            Quick Presets
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* LAPTOP VIEW TAB */}
          {activeTab === "laptop" && (
            <div className="space-y-5" data-testid="batch-laptop-panel">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-ink" />
                  <span className="mono text-xs font-semibold text-ink uppercase tracking-wider">
                    Laptop / Desktop Settings
                  </span>
                </div>
                <label className="mono text-xs text-mute flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyLaptop}
                    onChange={(e) => setApplyLaptop(e.target.checked)}
                    className="accent-ink cursor-pointer"
                  />
                  Include in Apply All
                </label>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="mono text-xs font-medium text-ink block mb-2">
                  Aspect Ratio for All Images
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setLaptopRatio(r.id);
                        if (r.id === "auto") setLaptopCrop(false);
                        else setLaptopCrop(true);
                      }}
                      className={`mono text-xs p-2.5 border text-left transition-colors ${
                        laptopRatio === r.id
                          ? "border-ink bg-ink text-paper font-semibold"
                          : "border-line bg-paper text-ink hover:bg-ink/5"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop & Anchor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="border border-line p-3 bg-ink/[0.01]">
                  <label className="mono text-xs font-medium text-ink block mb-2">
                    Crop Behavior
                  </label>
                  <label className="mono text-xs text-mute flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={laptopCrop}
                      onChange={(e) => setLaptopCrop(e.target.checked)}
                      className="accent-ink cursor-pointer"
                    />
                    <span>Crop images to fit frame aspect</span>
                  </label>
                  <p className="mono text-[10px] text-mute mt-2 leading-relaxed">
                    When enabled, images fill the exact frame boundary without empty borders.
                  </p>
                </div>

                <div className="border border-line p-3 bg-ink/[0.01]">
                  <label className="mono text-xs font-medium text-ink block mb-2">
                    Focal Anchor (All Images)
                  </label>
                  <PositionPicker
                    value={laptopPosition}
                    onChange={setLaptopPosition}
                    label="Anchor"
                  />
                  <p className="mono text-[10px] text-mute mt-2 leading-relaxed">
                    Specifies where the image anchors when cropped.
                  </p>
                </div>
              </div>

              {/* Zoom Setting */}
              <div className="border border-line p-3.5 bg-ink/[0.01] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="mono text-xs font-medium text-ink flex items-center gap-1.5">
                    <ZoomIn size={13} />
                    Zoom Level for All Images: {laptopZoom.toFixed(2)}x
                  </label>
                  <button
                    type="button"
                    onClick={() => setLaptopZoom(1)}
                    className="mono text-[10px] text-mute hover:text-ink underline"
                  >
                    Reset Zoom (1.0x)
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={laptopZoom}
                    onChange={(e) => setLaptopZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-ink cursor-pointer h-1.5"
                  />
                  <span className="mono text-xs text-ink w-12 text-right">
                    {laptopZoom.toFixed(2)}x
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {[1.0, 1.15, 1.25, 1.5, 2.0].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setLaptopZoom(z)}
                      className={`mono text-[10px] px-2 py-0.5 border ${
                        Math.abs(laptopZoom - z) < 0.05
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-mute hover:text-ink"
                      }`}
                    >
                      {z.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MOBILE VIEW TAB */}
          {activeTab === "mobile" && (
            <div className="space-y-5" data-testid="batch-mobile-panel">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-ink" />
                  <span className="mono text-xs font-semibold text-ink uppercase tracking-wider">
                    Mobile View Settings
                  </span>
                </div>
                <label className="mono text-xs text-mute flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyMobile}
                    onChange={(e) => setApplyMobile(e.target.checked)}
                    className="accent-ink cursor-pointer"
                  />
                  Include in Apply All
                </label>
              </div>

              {/* Mobile Aspect Ratio */}
              <div>
                <label className="mono text-xs font-medium text-ink block mb-2">
                  Mobile Ratio for All Images
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MOBILE_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setMobileRatio(r.id);
                        if (r.id === "auto") setMobileCrop(false);
                        else setMobileCrop(true);
                      }}
                      className={`mono text-xs p-2.5 border text-left transition-colors ${
                        mobileRatio === r.id
                          ? "border-ink bg-ink text-paper font-semibold"
                          : "border-line bg-paper text-ink hover:bg-ink/5"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Crop & Anchor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="border border-line p-3 bg-ink/[0.01]">
                  <label className="mono text-xs font-medium text-ink block mb-2">
                    Mobile Crop Behavior
                  </label>
                  <label className="mono text-xs text-mute flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={mobileCrop}
                      onChange={(e) => setMobileCrop(e.target.checked)}
                      className="accent-ink cursor-pointer"
                    />
                    <span>Crop images on mobile screen</span>
                  </label>
                  <p className="mono text-[10px] text-mute mt-2 leading-relaxed">
                    Locks image to mobile aspect ratio cleanly without letterboxing.
                  </p>
                </div>

                <div className="border border-line p-3 bg-ink/[0.01]">
                  <label className="mono text-xs font-medium text-ink block mb-2">
                    Mobile Focal Anchor
                  </label>
                  <PositionPicker
                    value={mobilePosition}
                    onChange={setMobilePosition}
                    label="Anchor"
                  />
                  <p className="mono text-[10px] text-mute mt-2 leading-relaxed">
                    Specifies center or alignment for vertical smartphone viewport.
                  </p>
                </div>
              </div>

              {/* Mobile Zoom Setting */}
              <div className="border border-line p-3.5 bg-ink/[0.01] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="mono text-xs font-medium text-ink flex items-center gap-1.5">
                    <ZoomIn size={13} />
                    Mobile Zoom Level: {mobileZoom.toFixed(2)}x
                  </label>
                  <button
                    type="button"
                    onClick={() => setMobileZoom(1)}
                    className="mono text-[10px] text-mute hover:text-ink underline"
                  >
                    Reset Zoom (1.0x)
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={mobileZoom}
                    onChange={(e) => setMobileZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-ink cursor-pointer h-1.5"
                  />
                  <span className="mono text-xs text-ink w-12 text-right">
                    {mobileZoom.toFixed(2)}x
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {[1.0, 1.15, 1.25, 1.5, 2.0].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setMobileZoom(z)}
                      className={`mono text-[10px] px-2 py-0.5 border ${
                        Math.abs(mobileZoom - z) < 0.05
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-mute hover:text-ink"
                      }`}
                    >
                      {z.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PRESETS TAB */}
          {activeTab === "presets" && (
            <div className="space-y-4" data-testid="batch-presets-panel">
              <div className="flex items-center gap-2 pb-3 border-b border-line">
                <Sparkles size={16} className="text-ink" />
                <span className="mono text-xs font-semibold text-ink uppercase tracking-wider">
                  One-Click Presets for Both Views
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_PRESETS.map((qp) => (
                  <button
                    key={qp.id}
                    type="button"
                    onClick={() => handleApplyPreset(qp)}
                    className="p-4 border border-line text-left hover:border-ink bg-paper transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="display text-sm font-semibold text-ink group-hover:text-accent transition-colors">
                        {qp.name}
                      </span>
                      <Layers size={14} className="text-mute group-hover:text-ink" />
                    </div>
                    <p className="mono text-[11px] text-mute mb-3">
                      {qp.desc}
                    </p>
                    <div className="flex gap-2 mono text-[10px] text-ink/80">
                      <span className="px-1.5 py-0.5 bg-ink/5 border border-line">
                        💻 {qp.laptop.ratio}
                      </span>
                      <span className="px-1.5 py-0.5 bg-ink/5 border border-line">
                        📱 {qp.mobile.mobileRatio}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line bg-ink/[0.02]">
          <div className="flex items-center gap-4">
            <label className="mono text-xs text-ink flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyLaptop}
                onChange={(e) => setApplyLaptop(e.target.checked)}
                className="accent-ink cursor-pointer"
              />
              <span>Laptop View</span>
            </label>
            <label className="mono text-xs text-ink flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyMobile}
                onChange={(e) => setApplyMobile(e.target.checked)}
                className="accent-ink cursor-pointer"
              />
              <span>Mobile View</span>
            </label>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="e-btn text-xs !py-2"
              data-testid="batch-adjust-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!applyLaptop && !applyMobile}
              className="e-btn e-btn-solid text-xs !py-2 flex items-center gap-1.5 disabled:opacity-40"
              data-testid="batch-adjust-apply-all"
            >
              <Check size={14} />
              Apply to All ({totalImages}) Images
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
