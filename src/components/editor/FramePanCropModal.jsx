import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Monitor, Smartphone, Check, Move, Grid, Sliders, Maximize2 } from "lucide-react";

const RATIOS = [
  { id: "auto", label: "Original", aspect: null, numeric: null },
  { id: "fullscreen-laptop", label: "Fullscreen Laptop", aspect: "aspect-[16/9]", numeric: 16 / 9 },
  { id: "fullscreen-mobile", label: "Fullscreen Mobile", aspect: "aspect-[9/16]", numeric: 9 / 16 },
  { id: "wide", label: "16:9 Wide", aspect: "aspect-[16/9]", numeric: 16 / 9 },
  { id: "landscape", label: "4:3 Landscape Fullscreen", aspect: "aspect-[4/3]", numeric: 4 / 3 },
  { id: "square", label: "1:1 Square", aspect: "aspect-square", numeric: 1 },
  { id: "portrait", label: "3:4 Portrait", aspect: "aspect-[3/4]", numeric: 3 / 4 },
  { id: "tall", label: "9:16 Portrait", aspect: "aspect-[9/16]", numeric: 9 / 16 },
  { id: "custom", label: "Custom", aspect: null, numeric: null },
];

const ANCHORS = [
  { label: "Top Left", x: 0, y: 0 },
  { label: "Top Center", x: 50, y: 0 },
  { label: "Top Right", x: 100, y: 0 },
  { label: "Center Left", x: 0, y: 50 },
  { label: "Center", x: 50, y: 50 },
  { label: "Center Right", x: 100, y: 50 },
  { label: "Bottom Left", x: 0, y: 100 },
  { label: "Bottom Center", x: 50, y: 100 },
  { label: "Bottom Right", x: 100, y: 100 },
];

function parsePos(posStr) {
  if (!posStr) return { x: 50, y: 50 };
  if (typeof posStr !== "string") return { x: 50, y: 50 };
  const lower = posStr.toLowerCase().trim();
  if (lower === "center") return { x: 50, y: 50 };
  if (lower === "top") return { x: 50, y: 0 };
  if (lower === "bottom") return { x: 50, y: 100 };
  if (lower === "left") return { x: 0, y: 50 };
  if (lower === "right") return { x: 100, y: 50 };
  if (lower === "top left" || lower === "left top") return { x: 0, y: 0 };
  if (lower === "top right" || lower === "right top") return { x: 100, y: 0 };
  if (lower === "bottom left" || lower === "left bottom") return { x: 0, y: 100 };
  if (lower === "bottom right" || lower === "right bottom") return { x: 100, y: 100 };

  const match = lower.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (match) {
    return {
      x: Math.max(0, Math.min(100, parseFloat(match[1]))),
      y: Math.max(0, Math.min(100, parseFloat(match[2]))),
    };
  }
  return { x: 50, y: 50 };
}

export default function FramePanCropModal({
  image,
  index,
  totalImages = 1,
  onSave,
  onSaveAll,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("laptop"); // "laptop" | "mobile"
  const [naturalAspect, setNaturalAspect] = useState(1.6);

  // Laptop state
  const [laptopRatio, setLaptopRatio] = useState(image.ratio || "auto");
  const [laptopCustomRatio, setLaptopCustomRatio] = useState(
    typeof image.customRatio === "number" ? image.customRatio : null
  );
  const [laptopCrop, setLaptopCrop] = useState(image.crop !== false);
  const [laptopPos, setLaptopPos] = useState(() => parsePos(image.position));
  const [laptopZoom, setLaptopZoom] = useState(typeof image.zoom === "number" ? image.zoom : 1);

  // Mobile state
  const [mobileRatio, setMobileRatio] = useState(image.mobileRatio || "same");
  const [mobileCustomRatio, setMobileCustomRatio] = useState(
    typeof image.mobileCustomRatio === "number"
      ? image.mobileCustomRatio
      : typeof image.customRatio === "number"
      ? image.customRatio
      : null
  );
  const [mobileCrop, setMobileCrop] = useState(
    image.mobileCrop !== undefined ? Boolean(image.mobileCrop) : Boolean(image.crop)
  );
  const [mobilePos, setMobilePos] = useState(() =>
    parsePos(image.mobilePosition || image.position)
  );
  const [mobileZoom, setMobileZoom] = useState(
    typeof image.mobileZoom === "number"
      ? image.mobileZoom
      : typeof image.zoom === "number"
      ? image.zoom
      : 1
  );

  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingGuide, setIsResizingGuide] = useState(false);
  const [activeGuideHandle, setActiveGuideHandle] = useState(null);

  const frameRef = useRef(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 50, startY: 50 });
  const guideDragRef = useRef(null);

  // Measure natural dimensions of image
  const handleImageLoaded = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      const asp = Math.round((naturalWidth / naturalHeight) * 100) / 100;
      setNaturalAspect(asp);
      if (!laptopCustomRatio) setLaptopCustomRatio(asp);
      if (!mobileCustomRatio) setMobileCustomRatio(asp);
    }
  };

  // Current active variables based on tab
  const isMobileTab = activeTab === "mobile";
  const currentRatio = isMobileTab
    ? mobileRatio === "same"
      ? laptopRatio
      : mobileRatio
    : laptopRatio;
  const currentCustomRatio = isMobileTab
    ? mobileRatio === "same"
      ? (laptopCustomRatio || naturalAspect)
      : (mobileCustomRatio || laptopCustomRatio || naturalAspect)
    : (laptopCustomRatio || naturalAspect);
  const currentCrop = isMobileTab
    ? mobileRatio === "same"
      ? laptopCrop
      : mobileCrop
    : laptopCrop;
  const currentPos = isMobileTab ? mobilePos : laptopPos;
  const currentZoom = isMobileTab ? mobileZoom : laptopZoom;

  const setCurrentPos = useCallback((newPos) => {
    if (isMobileTab) {
      setMobilePos(newPos);
    } else {
      setLaptopPos(newPos);
    }
  }, [isMobileTab]);

  const setCurrentZoom = useCallback((val) => {
    // Zoom range: 0.1x to 10.0x
    const clamped = Math.max(0.1, Math.min(10, Math.round(val * 100) / 100));
    if (isMobileTab) {
      setMobileZoom(clamped);
    } else {
      setLaptopZoom(clamped);
    }
  }, [isMobileTab]);

  const setCurrentRatio = useCallback((r) => {
    if (isMobileTab) {
      setMobileRatio(r);
    } else {
      setLaptopRatio(r);
    }
  }, [isMobileTab]);

  const setCurrentCustomRatio = useCallback((ratioVal) => {
    const rounded = Math.round(ratioVal * 100) / 100;
    if (isMobileTab) {
      setMobileCustomRatio(rounded);
      if (mobileRatio === "same") {
        setMobileRatio("custom");
      }
    } else {
      setLaptopCustomRatio(rounded);
    }
  }, [isMobileTab, mobileRatio]);

  const setCurrentCrop = useCallback((c) => {
    if (isMobileTab) {
      setMobileCrop(c);
    } else {
      setLaptopCrop(c);
    }
  }, [isMobileTab]);

  // Frame Pan/Drag handling
  const handlePointerDown = (e) => {
    if (isResizingGuide) return;
    if (!frameRef.current) return;
    setIsDragging(true);
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: currentPos.x,
      startY: currentPos.y,
    };
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || !frameRef.current || isResizingGuide) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const rect = frameRef.current.getBoundingClientRect();
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      // Sensitivity adjusted by zoom factor: higher zoom gives finer control
      const sensitivity = 100 / Math.max(0.2, currentZoom);
      const percentDeltaX = (dx / rect.width) * sensitivity;
      const percentDeltaY = (dy / rect.height) * sensitivity;

      const nextX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX - percentDeltaX)));
      const nextY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY - percentDeltaY)));

      setCurrentPos({ x: nextX, y: nextY });
    },
    [isDragging, isResizingGuide, currentZoom, setCurrentPos]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove);
      window.addEventListener("touchend", handlePointerUp);
    }
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Wheel zoom on frame (supports smooth zooming up to 10x)
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.12 : 0.88;
      setCurrentZoom(currentZoom * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [currentZoom, setCurrentZoom]);

  // Click directly on frame to set focal position
  const handleFrameClick = (e) => {
    if (isDragging || isResizingGuide) return;
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xPercent = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
    const yPercent = Math.max(0, Math.min(100, Math.round((clickY / rect.height) * 100)));
    setCurrentPos({ x: xPercent, y: yPercent });
  };

  // Guide / Grid Edge Drag to customize ratio
  const handleGuideStartDrag = (e, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    const baseRatio = currentCustomRatio || (rect.width / rect.height);

    guideDragRef.current = {
      handle: handleType,
      startClientX: clientX,
      startClientY: clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startRatio: baseRatio,
    };
    setIsResizingGuide(true);
    setActiveGuideHandle(handleType);
  };

  const handleGuideMove = useCallback(
    (e) => {
      if (!isResizingGuide || !guideDragRef.current) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const { handle, startClientX, startClientY, startWidth, startHeight } = guideDragRef.current;
      const dx = clientX - startClientX;
      const dy = clientY - startClientY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (handle === "right") {
        newWidth = Math.max(100, startWidth + dx * 2);
      } else if (handle === "left") {
        newWidth = Math.max(100, startWidth - dx * 2);
      } else if (handle === "bottom") {
        newHeight = Math.max(80, startHeight + dy * 2);
      } else if (handle === "top") {
        newHeight = Math.max(80, startHeight - dy * 2);
      } else if (handle === "bottom-right") {
        newWidth = Math.max(100, startWidth + dx * 2);
        newHeight = Math.max(80, startHeight + dy * 2);
      } else if (handle === "bottom-left") {
        newWidth = Math.max(100, startWidth - dx * 2);
        newHeight = Math.max(80, startHeight + dy * 2);
      } else if (handle === "top-right") {
        newWidth = Math.max(100, startWidth + dx * 2);
        newHeight = Math.max(80, startHeight - dy * 2);
      } else if (handle === "top-left") {
        newWidth = Math.max(100, startWidth - dx * 2);
        newHeight = Math.max(80, startHeight - dy * 2);
      }

      const calculated = Math.round((newWidth / newHeight) * 100) / 100;
      // Allow flexible ratios from 0.3 (tall portrait) to 3.5 (ultra-wide cinema)
      const clamped = Math.max(0.3, Math.min(3.5, calculated));

      setCurrentCustomRatio(clamped);
      if (
        currentRatio !== "custom" &&
        currentRatio !== "fullscreen-laptop" &&
        currentRatio !== "fullscreen-mobile" &&
        currentRatio !== "landscape"
      ) {
        setCurrentRatio("custom");
      }
    },
    [isResizingGuide, currentRatio, setCurrentCustomRatio, setCurrentRatio]
  );

  const handleGuideUp = useCallback(() => {
    setIsResizingGuide(false);
    setActiveGuideHandle(null);
    guideDragRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizingGuide) {
      window.addEventListener("mousemove", handleGuideMove);
      window.addEventListener("mouseup", handleGuideUp);
      window.addEventListener("touchmove", handleGuideMove);
      window.addEventListener("touchend", handleGuideUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGuideMove);
      window.removeEventListener("mouseup", handleGuideUp);
      window.removeEventListener("touchmove", handleGuideMove);
      window.removeEventListener("touchend", handleGuideUp);
    };
  }, [isResizingGuide, handleGuideMove, handleGuideUp]);

  const handleReset = () => {
    setCurrentPos({ x: 50, y: 50 });
    setCurrentZoom(1);
    setCurrentRatio("auto");
    if (naturalAspect) setCurrentCustomRatio(naturalAspect);
  };

  const handleSaveAll = (applyToAll = false, scope = "all") => {
    const posStr = `${Math.round(laptopPos.x)}% ${Math.round(laptopPos.y)}%`;
    const mobPosStr = `${Math.round(mobilePos.x)}% ${Math.round(mobilePos.y)}%`;

    const data = {
      ratio: laptopRatio,
      customRatio:
        laptopRatio === "custom"
          ? (typeof laptopCustomRatio === "number" && laptopCustomRatio > 0 ? laptopCustomRatio : undefined)
          : undefined,
      crop: laptopCrop,
      position: posStr,
      zoom: laptopZoom,
      mobileRatio,
      mobileCustomRatio:
        mobileRatio === "custom"
          ? (typeof mobileCustomRatio === "number" && mobileCustomRatio > 0 ? mobileCustomRatio : undefined)
          : undefined,
      mobileCrop,
      mobilePosition: mobPosStr,
      mobileZoom,
    };

    if (applyToAll && onSaveAll) {
      onSaveAll(data, scope);
    } else {
      onSave(data);
    }
    onClose();
  };

  // Determine stage frame aspect ratio
  const activeRatioObj = RATIOS.find((r) => r.id === currentRatio);
  const isAdjustableRatio =
    currentRatio === "auto" ||
    currentRatio === "custom" ||
    currentRatio === "fullscreen-laptop" ||
    currentRatio === "fullscreen-mobile" ||
    currentRatio === "landscape";

  let activeNumericAspect = 16 / 9;
  if (currentRatio === "custom" || currentRatio === "fullscreen-laptop") {
    activeNumericAspect =
      typeof currentCustomRatio === "number" && currentCustomRatio > 0
        ? currentCustomRatio
        : 16 / 9;
  } else if (currentRatio === "landscape") {
    activeNumericAspect =
      typeof currentCustomRatio === "number" && currentCustomRatio > 0
        ? currentCustomRatio
        : 4 / 3;
  } else if (currentRatio === "fullscreen-mobile") {
    activeNumericAspect =
      typeof currentCustomRatio === "number" && currentCustomRatio > 0
        ? currentCustomRatio
        : 9 / 16;
  } else if (currentRatio === "auto") {
    activeNumericAspect = currentCustomRatio || naturalAspect || 1.6;
  } else if (activeRatioObj?.numeric) {
    activeNumericAspect = activeRatioObj.numeric;
  } else if (typeof currentCustomRatio === "number" && currentCustomRatio > 0) {
    activeNumericAspect = currentCustomRatio;
  }

  // Calculate dynamic physical frame dimensions matching the exact aspect ratio
  const getFrameDimensions = (aspect) => {
    const num = typeof aspect === "number" && aspect > 0 ? aspect : 16 / 9;
    if (num < 1.35) {
      // Portrait, tall 9:16, 3:4, or square
      return {
        height: "min(380px, 44vh)",
        width: `calc(min(380px, 44vh) * ${num})`,
        maxWidth: "88vw",
        aspectRatio: `${num}`,
      };
    } else {
      // Landscape, wide 16:9, fullscreen laptop 16:9
      return {
        width: "min(540px, 88vw)",
        height: `calc(min(540px, 88vw) / ${num})`,
        maxHeight: "44vh",
        aspectRatio: `${num}`,
      };
    }
  };

  const frameDimensions = getFrameDimensions(activeNumericAspect);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-sm"
      data-testid="frame-pan-crop-modal"
    >
      <div
        className="bg-paper border border-line w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line bg-ink/[0.02]">
          <div className="flex items-center gap-3">
            <span className="mono text-xs uppercase tracking-widest text-ink font-semibold flex items-center gap-1.5">
              <Move size={14} className="text-accent" />
              Frame, Pan & Zoom Editor
            </span>
            <span className="mono text-mute text-xs">Image #{index + 1}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-ink/10 transition-colors text-ink/70 hover:text-ink"
            data-testid="close-frame-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* View Switcher Tabs: Laptop vs Mobile */}
        <div className="flex border-b border-line px-4 sm:px-6 bg-paper">
          <button
            type="button"
            onClick={() => setActiveTab("laptop")}
            className={`flex items-center gap-2 py-2.5 px-4 mono text-xs border-b-2 transition-colors ${
              activeTab === "laptop"
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-mute hover:text-ink"
            }`}
            data-testid="tab-laptop-frame"
          >
            <Monitor size={14} />
            Laptop / Desktop Frame
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={`flex items-center gap-2 py-2.5 px-4 mono text-xs border-b-2 transition-colors ${
              activeTab === "mobile"
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-mute hover:text-ink"
            }`}
            data-testid="tab-mobile-frame"
          >
            <Smartphone size={14} />
            Mobile Frame
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Controls: Aspect Ratio Buttons & Crop Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ink/[0.02] border border-line">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mono text-xs text-mute mr-1">Frame Ratio:</span>
              {isMobileTab && (
                <button
                  type="button"
                  onClick={() => setMobileRatio("same")}
                  className={`mono text-xs px-2.5 py-1 border transition-colors ${
                    mobileRatio === "same"
                      ? "bg-ink text-paper border-transparent font-medium"
                      : "border-line text-mute hover:text-ink hover:bg-ink/5"
                  }`}
                >
                  Same as Laptop
                </button>
              )}
              {RATIOS.map((r) => {
                const isSelected =
                  isMobileTab && mobileRatio === "same"
                    ? laptopRatio === r.id
                    : currentRatio === r.id;
                const labelText =
                  r.id === "custom"
                    ? `Custom (${currentCustomRatio.toFixed(2)}:1)`
                    : r.id === "fullscreen-laptop"
                    ? `Fullscreen Laptop (${(currentRatio === "fullscreen-laptop" ? activeNumericAspect : (laptopCustomRatio || 16 / 9)).toFixed(2)}:1)`
                    : r.id === "fullscreen-mobile"
                    ? `Fullscreen Mobile (${(currentRatio === "fullscreen-mobile" ? activeNumericAspect : (mobileCustomRatio || 9 / 16)).toFixed(2)}:1)`
                    : r.id === "landscape"
                    ? `4:3 Landscape Fullscreen (${(currentRatio === "landscape" ? activeNumericAspect : (laptopCustomRatio || 4 / 3)).toFixed(2)}:1)`
                    : r.label;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setCurrentRatio(r.id);
                      if (r.id === "auto" && naturalAspect) {
                        setCurrentCustomRatio(naturalAspect);
                      } else if (r.id === "landscape") {
                        if (!currentCustomRatio || currentCustomRatio > 2.5 || currentCustomRatio < 0.8) {
                          setCurrentCustomRatio(4 / 3);
                        }
                      } else if (r.id === "fullscreen-laptop") {
                        if (!currentCustomRatio || Math.abs(currentCustomRatio - 9 / 16) < 0.01) {
                          setCurrentCustomRatio(16 / 9);
                        }
                      } else if (r.id === "fullscreen-mobile") {
                        if (!currentCustomRatio || Math.abs(currentCustomRatio - 16 / 9) < 0.01) {
                          setCurrentCustomRatio(9 / 16);
                        }
                      }
                    }}
                    className={`mono text-xs px-2.5 py-1 border transition-colors ${
                      isSelected
                        ? "bg-ink text-paper border-transparent font-medium"
                        : "border-line text-mute hover:text-ink hover:bg-ink/5"
                    }`}
                  >
                    {labelText}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <label className="mono text-xs text-ink flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentCrop}
                  onChange={(e) => setCurrentCrop(e.target.checked)}
                  className="accent-ink"
                />
                Crop to Frame
              </label>

              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1 border text-xs transition-colors flex items-center gap-1 mono ${
                  showGrid ? "border-ink bg-ink text-paper" : "border-line text-mute hover:text-ink"
                }`}
                title="Toggle Rule-of-Thirds Grid Guides"
              >
                <Grid size={13} />
                Guides
              </button>
            </div>
          </div>

          {/* Interactive Custom / Fullscreen Ratio Helper Banner */}
          {isAdjustableRatio && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-ink/[0.03] border border-line mono text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Sliders size={13} className="text-accent" />
                  {currentRatio === "fullscreen-laptop"
                    ? "Fullscreen Laptop Ratio:"
                    : currentRatio === "landscape"
                    ? "4:3 Landscape Fullscreen:"
                    : currentRatio === "fullscreen-mobile"
                    ? "Fullscreen Mobile Ratio:"
                    : "Custom Ratio:"}
                </span>
                <span className="bg-ink text-paper px-2 py-0.5 font-bold">
                  {activeNumericAspect.toFixed(2)} : 1
                </span>
                <span className="text-mute hidden sm:inline">
                  (Bisa diatur dengan geser guide bingkai atau tombol preset)
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {currentRatio === "landscape" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(4 / 3)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 4 / 3) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="4:3 Standard Landscape (1.33:1)"
                    >
                      4:3 (1.33)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(3 / 2)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 3 / 2) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="3:2 Photography Classic (1.50:1)"
                    >
                      3:2 (1.50)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(16 / 10)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 16 / 10) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="16:10 MacBook Display (1.60:1)"
                    >
                      16:10 (1.60)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const w = window.innerWidth;
                          const h = Math.max(400, window.innerHeight - 100);
                          setCurrentCustomRatio(Math.round((w / h) * 100) / 100);
                        }
                      }}
                      className="px-2 py-0.5 border border-line hover:border-ink transition-colors"
                      title="Fleksibel pas layar browser laptop saat ini"
                    >
                      Layar Fleksibel
                    </button>
                  </>
                )}
                {currentRatio === "fullscreen-laptop" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(16 / 9)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 16 / 9) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="16:9 Standard Laptop Screen"
                    >
                      16:9 (1.78)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(16 / 10)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 16 / 10) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="16:10 MacBook / Pro Display"
                    >
                      16:10 (1.60)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const w = window.innerWidth;
                          const h = Math.max(400, window.innerHeight - 100);
                          setCurrentCustomRatio(Math.round((w / h) * 100) / 100);
                        }
                      }}
                      className="px-2 py-0.5 border border-line hover:border-ink transition-colors"
                      title="Pas dengan viewport browser laptop saat ini"
                    >
                      Layar Saat Ini
                    </button>
                  </>
                )}
                {currentRatio === "fullscreen-mobile" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(9 / 16)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 9 / 16) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="9:16 Standard Mobile"
                    >
                      9:16 (0.56)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCustomRatio(9 / 19.5)}
                      className={`px-2 py-0.5 border transition-colors ${
                        Math.abs(activeNumericAspect - 9 / 19.5) < 0.02
                          ? "bg-ink text-paper border-ink"
                          : "border-line hover:border-ink"
                      }`}
                      title="9:19.5 Modern Tall Smartphone"
                    >
                      9:19.5 (0.46)
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentCustomRatio(Math.max(0.3, activeNumericAspect - 0.05))}
                  className="px-2 py-0.5 border border-line hover:border-ink transition-colors font-bold"
                  title="Perkecil Ratio (Lebih Tinggi / Portrait)"
                >
                  -0.05
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentCustomRatio(Math.min(3.5, activeNumericAspect + 0.05))}
                  className="px-2 py-0.5 border border-line hover:border-ink transition-colors font-bold"
                  title="Perbesar Ratio (Lebih Lebar / Cinema)"
                >
                  +0.05
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentRatio === "fullscreen-laptop") {
                      setCurrentCustomRatio(16 / 9);
                    } else if (currentRatio === "landscape") {
                      setCurrentCustomRatio(4 / 3);
                    } else if (currentRatio === "fullscreen-mobile") {
                      setCurrentCustomRatio(9 / 16);
                    } else if (naturalAspect) {
                      setCurrentCustomRatio(naturalAspect);
                      setCurrentRatio("auto");
                    }
                  }}
                  className="px-2 py-0.5 border border-line text-mute hover:text-ink transition-colors flex items-center gap-1 ml-1"
                  title="Reset Ratio"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Frame Stage */}
          <div className="relative w-full flex flex-col items-center justify-center p-3 sm:p-5 bg-ink/[0.04] border border-line rounded-none min-h-[360px] overflow-hidden">
            {/* Visual Crop Container with Interactive Resizable Guides - Morphs dynamically according to chosen ratio */}
            <div
              ref={frameRef}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              onClick={handleFrameClick}
              className={`relative overflow-visible border-2 border-ink shadow-lg select-none ${
                isResizingGuide ? "" : "transition-[width,height] duration-200 ease-out"
              } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                backgroundColor: "#121212",
                ...frameDimensions,
              }}
            >
              {/* Inner clipping container for image & focal marker */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Image with Pan and Zoom applied */}
                <img
                  src={image.url}
                  alt="Frame Pan Target"
                  onLoad={handleImageLoaded}
                  draggable={false}
                  style={{
                    objectPosition: `${currentPos.x}% ${currentPos.y}%`,
                    transform: `scale(${currentZoom})`,
                    transformOrigin: `${currentPos.x}% ${currentPos.y}%`,
                  }}
                  className={`w-full h-full pointer-events-none transition-transform duration-75 ${
                    currentCrop ? "object-cover" : "object-contain"
                  }`}
                />

                {/* Rule of thirds grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div />
                  </div>
                )}

                {/* Center Focal Point Target Marker */}
                <div
                  className="absolute pointer-events-none z-20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${currentPos.x}%`,
                    top: `${currentPos.y}%`,
                  }}
                >
                  <div className="w-5 h-5 rounded-full border border-white shadow-sm flex items-center justify-center bg-ink/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  </div>
                </div>

                {/* Drag instruction overlay badge */}
                <div className="absolute bottom-2 left-2 z-20 bg-ink/80 text-paper mono text-[10px] px-2 py-0.5 rounded-none flex items-center gap-1 pointer-events-none">
                  <Move size={10} />
                  Drag image to pan
                </div>

                {/* Active ratio watermark */}
                <div className="absolute top-2 right-2 z-20 bg-ink/75 text-paper mono text-[10px] px-1.5 py-0.5 rounded-none pointer-events-none">
                  {currentRatio === "custom"
                    ? `Custom ${currentCustomRatio.toFixed(2)}:1`
                    : activeRatioObj?.label || `${activeNumericAspect.toFixed(2)}:1`}
                </div>
              </div>

              {/* ------------------------------------------------------------------- */}
              {/* INTERACTIVE GRID GUIDE HANDLES (Top, Bottom, Left, Right & Corners) */}
              {/* ------------------------------------------------------------------- */}
              {/* Top edge guide handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "top")}
                onTouchStart={(e) => handleGuideStartDrag(e, "top")}
                className={`absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center cursor-ns-resize group px-2 py-1 select-none ${
                  activeGuideHandle === "top" ? "scale-110" : ""
                }`}
                title="Geser sisi atas grid untuk atur tinggi / rasio frame"
              >
                <div className="h-2 w-12 bg-white border border-ink shadow-md flex items-center justify-center group-hover:bg-accent transition-colors">
                  <div className="h-0.5 w-6 bg-ink/50" />
                </div>
              </div>

              {/* Bottom edge guide handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "bottom")}
                onTouchStart={(e) => handleGuideStartDrag(e, "bottom")}
                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center cursor-ns-resize group px-2 py-1 select-none ${
                  activeGuideHandle === "bottom" ? "scale-110" : ""
                }`}
                title="Geser sisi bawah grid untuk atur tinggi / rasio frame"
              >
                <div className="h-2 w-12 bg-white border border-ink shadow-md flex items-center justify-center group-hover:bg-accent transition-colors">
                  <div className="h-0.5 w-6 bg-ink/50" />
                </div>
              </div>

              {/* Left edge guide handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "left")}
                onTouchStart={(e) => handleGuideStartDrag(e, "left")}
                className={`absolute top-1/2 -left-3 -translate-y-1/2 z-30 flex items-center justify-center cursor-ew-resize group py-2 px-1 select-none ${
                  activeGuideHandle === "left" ? "scale-110" : ""
                }`}
                title="Geser sisi kiri grid untuk atur lebar / rasio frame"
              >
                <div className="w-2 h-12 bg-white border border-ink shadow-md flex items-center justify-center group-hover:bg-accent transition-colors">
                  <div className="w-0.5 h-6 bg-ink/50" />
                </div>
              </div>

              {/* Right edge guide handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "right")}
                onTouchStart={(e) => handleGuideStartDrag(e, "right")}
                className={`absolute top-1/2 -right-3 -translate-y-1/2 z-30 flex items-center justify-center cursor-ew-resize group py-2 px-1 select-none ${
                  activeGuideHandle === "right" ? "scale-110" : ""
                }`}
                title="Geser sisi kanan grid untuk atur lebar / rasio frame"
              >
                <div className="w-2 h-12 bg-white border border-ink shadow-md flex items-center justify-center group-hover:bg-accent transition-colors">
                  <div className="w-0.5 h-6 bg-ink/50" />
                </div>
              </div>

              {/* Top-Left Corner Handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "top-left")}
                onTouchStart={(e) => handleGuideStartDrag(e, "top-left")}
                className="absolute -top-2.5 -left-2.5 z-30 w-5 h-5 cursor-nwse-resize flex items-center justify-center group select-none"
                title="Geser sudut untuk custom rasio"
              >
                <div className="w-3.5 h-3.5 bg-white border-2 border-ink shadow-sm group-hover:bg-accent transition-colors" />
              </div>

              {/* Top-Right Corner Handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "top-right")}
                onTouchStart={(e) => handleGuideStartDrag(e, "top-right")}
                className="absolute -top-2.5 -right-2.5 z-30 w-5 h-5 cursor-nesw-resize flex items-center justify-center group select-none"
                title="Geser sudut untuk custom rasio"
              >
                <div className="w-3.5 h-3.5 bg-white border-2 border-ink shadow-sm group-hover:bg-accent transition-colors" />
              </div>

              {/* Bottom-Left Corner Handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "bottom-left")}
                onTouchStart={(e) => handleGuideStartDrag(e, "bottom-left")}
                className="absolute -bottom-2.5 -left-2.5 z-30 w-5 h-5 cursor-nesw-resize flex items-center justify-center group select-none"
                title="Geser sudut untuk custom rasio"
              >
                <div className="w-3.5 h-3.5 bg-white border-2 border-ink shadow-sm group-hover:bg-accent transition-colors" />
              </div>

              {/* Bottom-Right Corner Handle */}
              <div
                onMouseDown={(e) => handleGuideStartDrag(e, "bottom-right")}
                onTouchStart={(e) => handleGuideStartDrag(e, "bottom-right")}
                className="absolute -bottom-2.5 -right-2.5 z-30 w-5 h-5 cursor-nwse-resize flex items-center justify-center group select-none"
                title="Geser sudut untuk custom rasio"
              >
                <div className="w-3.5 h-3.5 bg-white border-2 border-ink shadow-sm group-hover:bg-accent transition-colors" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 mono text-xs text-mute">
              <span>
                Focal Point: <strong className="text-ink">{currentPos.x}% X</strong>,{" "}
                <strong className="text-ink">{currentPos.y}% Y</strong>
              </span>
              <span>•</span>
              <span>
                Zoom: <strong className="text-ink">{currentZoom.toFixed(2)}x</strong>
              </span>
              <span>•</span>
              <span>
                Frame Ratio:{" "}
                <strong className="text-ink">
                  {currentRatio === "custom"
                    ? `Custom (${currentCustomRatio.toFixed(2)}:1)`
                    : `${activeRatioObj?.label || "Original"} (${activeNumericAspect.toFixed(2)}:1)`}
                </strong>
              </span>
            </div>
          </div>

          {/* Zoom & Alignment Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-line bg-paper">
            {/* Zoom Slider Panel (0.1x to 10.0x) */}
            <div className="md:col-span-8 space-y-2">
              <div className="flex justify-between items-center">
                <span className="mono text-xs font-semibold text-ink flex items-center gap-1">
                  <ZoomIn size={13} className="text-accent" />
                  Fungsi Zoom (Perbesaran & Perkecilan Gambar: 0.1x – 10x)
                </span>
                <span className="mono text-xs font-bold text-ink">{currentZoom.toFixed(2)}x</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const step = currentZoom > 3 ? 0.5 : currentZoom > 1 ? 0.2 : 0.1;
                    setCurrentZoom(Math.max(0.1, currentZoom - step));
                  }}
                  disabled={currentZoom <= 0.1}
                  className="p-1.5 border border-line hover:border-ink disabled:opacity-30 transition-colors"
                  title="Zoom Out (Perkecil hingga 0.1x)"
                >
                  <ZoomOut size={14} />
                </button>

                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.05"
                  value={currentZoom}
                  onChange={(e) => setCurrentZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-ink cursor-pointer h-2 bg-ink/10"
                  data-testid="zoom-slider"
                />

                <button
                  type="button"
                  onClick={() => {
                    const step = currentZoom >= 3 ? 0.5 : currentZoom >= 1 ? 0.2 : 0.1;
                    setCurrentZoom(Math.min(10.0, currentZoom + step));
                  }}
                  disabled={currentZoom >= 10.0}
                  className="p-1.5 border border-line hover:border-ink disabled:opacity-30 transition-colors"
                  title="Zoom In (Perbesar hingga 10.0x)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Quick Zoom Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="mono text-[11px] text-mute">Preset:</span>
                {[
                  { label: "0.25x", val: 0.25 },
                  { label: "0.5x", val: 0.5 },
                  { label: "1.0x (Fit)", val: 1 },
                  { label: "2.0x", val: 2 },
                  { label: "3.0x", val: 3 },
                  { label: "5.0x", val: 5 },
                  { label: "10.0x (Max)", val: 10 },
                ].map((z) => (
                  <button
                    key={z.val}
                    type="button"
                    onClick={() => setCurrentZoom(z.val)}
                    className={`mono text-[11px] px-2 py-0.5 border transition-colors ${
                      Math.abs(currentZoom - z.val) < 0.05
                        ? "border-ink bg-ink text-paper font-medium"
                        : "border-line text-mute hover:text-ink hover:bg-ink/5"
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleReset}
                  className="mono text-[11px] px-2 py-0.5 border border-line text-mute hover:text-ink flex items-center gap-1 ml-auto"
                >
                  <RotateCcw size={11} />
                  Reset All
                </button>
              </div>
            </div>

            {/* Quick 9-Point Anchor Grid */}
            <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-line md:pl-4 space-y-2">
              <span className="mono text-xs font-semibold text-ink block">Quick Anchor Presets</span>
              <div className="grid grid-cols-3 gap-1 w-32">
                {ANCHORS.map((a) => {
                  const isCur =
                    Math.abs(currentPos.x - a.x) < 8 && Math.abs(currentPos.y - a.y) < 8;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      title={a.label}
                      onClick={() => setCurrentPos({ x: a.x, y: a.y })}
                      className={`h-7 mono text-[10px] border transition-colors flex items-center justify-center ${
                        isCur
                          ? "bg-ink text-paper border-ink font-bold"
                          : "border-line bg-paper text-mute hover:text-ink hover:bg-ink/5"
                      }`}
                    >
                      {a.label.split(" ").map((w) => w[0]).join("")}
                    </button>
                  );
                })}
              </div>
              <span className="mono text-[10px] text-mute block leading-tight">
                Klik grid atau geser gambar di frame untuk ubah focal point.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-line bg-ink/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="e-btn !py-2 text-xs"
            data-testid="cancel-frame-adjust"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
            {totalImages > 1 && onSaveAll && (
              <div className="flex items-center gap-1.5 border border-line p-1 bg-paper">
                <span className="mono text-[10px] text-mute uppercase tracking-wider px-1 hidden sm:inline">
                  Adjust All ({totalImages}):
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveAll(true, "all")}
                  className="mono text-xs px-2.5 py-1.5 border border-line bg-paper text-ink hover:bg-ink hover:text-paper transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  title="Apply these laptop & mobile frame adjustments to all images in this project"
                  data-testid="save-all-both-frame-adjust"
                >
                  <Check size={12} />
                  All Images (Both Views)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAll(true, "laptop")}
                  className="mono text-[11px] px-2 py-1 border border-line/60 bg-paper text-mute hover:text-ink hover:bg-ink/5 transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
                  title="Apply only laptop view settings to all images"
                  data-testid="save-all-laptop-frame-adjust"
                >
                  <Monitor size={11} />
                  Laptop Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAll(true, "mobile")}
                  className="mono text-[11px] px-2 py-1 border border-line/60 bg-paper text-mute hover:text-ink hover:bg-ink/5 transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
                  title="Apply only mobile view settings to all images"
                  data-testid="save-all-mobile-frame-adjust"
                >
                  <Smartphone size={11} />
                  Mobile Only
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSaveAll(false)}
              className="e-btn e-btn-solid !py-2 text-xs flex items-center gap-1.5"
              data-testid="save-frame-adjust"
            >
              <Check size={14} />
              {totalImages > 1 ? "Apply (This Image Only)" : "Apply Adjustments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
