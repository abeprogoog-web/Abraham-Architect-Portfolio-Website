import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { pad } from "@/lib/api";

const RATIO_MAP = {
  "fullscreen-laptop": "aspect-[16/9]",
  "fullscreen-mobile": "aspect-[9/16]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
  tall: "aspect-[9/16]",
  wide: "aspect-[16/9]",
  auto: "aspect-auto",
};

const MD_RATIO_MAP = {
  "fullscreen-laptop": "md:aspect-[16/9]",
  "fullscreen-mobile": "md:aspect-[9/16]",
  square: "md:aspect-square",
  landscape: "md:aspect-[4/3]",
  portrait: "md:aspect-[3/4]",
  tall: "md:aspect-[9/16]",
  wide: "md:aspect-[16/9]",
  auto: "md:aspect-auto",
};

export function getAspectValue(ratio, customRatio) {
  if (ratio === "portrait" || ratio === "portrait-3-4") return "3 / 4";
  if (ratio === "landscape" || ratio === "landscape-4-3") return "4 / 3";
  if (ratio === "square") return "1 / 1";
  if (ratio === "fullscreen-laptop" || ratio === "fullscreen") return "16 / 9";
  if (ratio === "fullscreen-mobile") return "9 / 16";
  if (ratio === "tall" || ratio === "vertical" || ratio === "story") return "9 / 16";
  if (ratio === "wide") return "16 / 9";
  if (ratio === "custom") {
    return typeof customRatio === "number" && customRatio > 0 ? `${customRatio}` : "16 / 9";
  }
  if (!ratio || ratio === "auto") {
    return null;
  }
  return null;
}

export function getNumericAspect(ratio, customRatio) {
  if (ratio === "portrait" || ratio === "portrait-3-4") return 3 / 4;
  if (ratio === "landscape" || ratio === "landscape-4-3") return 4 / 3;
  if (ratio === "square") return 1;
  if (ratio === "fullscreen-laptop" || ratio === "fullscreen") return 16 / 9;
  if (ratio === "fullscreen-mobile") return 9 / 16;
  if (ratio === "tall" || ratio === "vertical" || ratio === "story") return 9 / 16;
  if (ratio === "wide") return 16 / 9;
  if (ratio === "custom") {
    return typeof customRatio === "number" && customRatio > 0 ? customRatio : 16 / 9;
  }
  if (ratio === "auto") {
    return null;
  }
  if (typeof customRatio === "number" && customRatio > 0) {
    return customRatio;
  }
  return null;
}

export function getStageHeight(numericAspect, isMobile, ratioKey) {
  if (!isMobile && (ratioKey === "fullscreen-laptop" || ratioKey === "fullscreen")) {
    return numericAspect ? `calc(100vw / ${numericAspect})` : "min(88vh, calc(100vh - 110px))";
  }
  if (!isMobile && ratioKey === "landscape") {
    return "min(86vh, calc(100vh - 120px))";
  }
  if (isMobile && (ratioKey === "fullscreen-mobile" || ratioKey === "fullscreen")) {
    return numericAspect ? `calc(100vw / ${numericAspect})` : "min(84vh, calc(100vh - 130px))";
  }
  if (!numericAspect || numericAspect <= 0) {
    return isMobile ? "55vh" : "75vh";
  }
  // On laptop/mobile, if ratio is portrait/vertical (aspect < 1), scale comfortably
  if (numericAspect < 1) {
    return isMobile ? "min(76vh, 560px)" : "min(82vh, 740px)";
  }
  // Adaptive height: clamp between minimum readable height and maximum viewport height
  const minH = isMobile ? "45vh" : "55vh";
  const maxH = isMobile ? "70vh" : "80vh";
  const calcVw = `${(100 / numericAspect).toFixed(2)}vw`;
  return `clamp(${minH}, ${calcVw}, ${maxH})`;
}

function getImageConfig(img) {
  const laptopRatio = img?.ratio || "auto";
  const laptopCrop = Boolean(img?.crop);

  let mobileRatio = img?.mobileRatio;
  if (!mobileRatio || mobileRatio === "same") {
    mobileRatio = laptopRatio;
  }
  if (laptopRatio === "fullscreen-mobile" && (!img?.mobileRatio || img?.mobileRatio === "same" || img?.mobileRatio === "tall")) {
    mobileRatio = "fullscreen-mobile";
  }

  const customRatio = img?.customRatio;
  const mobileCustomRatio = img?.mobileCustomRatio || customRatio;
  const mobileCrop = img?.mobileCrop !== undefined ? Boolean(img.mobileCrop) : laptopCrop;

  return {
    laptopRatio,
    laptopCrop,
    customRatio,
    mobileRatio,
    mobileCrop,
    mobileCustomRatio,
    hasRatio: mobileRatio !== "auto" || laptopRatio !== "auto" || Boolean(customRatio),
  };
}

export default function ProjectGallery({ images, title }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fullscreen Zoom & Pan state (up to 10x)
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [fullscreenPan, setFullscreenPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const imageContainerRef = useRef(null);

  useEffect(() => {
    const updateSize = () => setIsMobile(window.innerWidth < 768);
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Reset zoom & pan when image changes or fullscreen toggles
  useEffect(() => {
    setFullscreenZoom(1);
    setFullscreenPan({ x: 0, y: 0 });
  }, [selected, isFullscreen]);

  const updateZoom = useCallback((newZoom) => {
    const clamped = Math.max(1, Math.min(10, Math.round(newZoom * 100) / 100));
    setFullscreenZoom(clamped);
    if (clamped === 1) {
      setFullscreenPan({ x: 0, y: 0 });
    }
  }, []);

  const getImageStyle = (img) => {
    const pos = isMobile
      ? img.mobilePosition || img.position || "center"
      : img.position || "center";
    const zoom = isMobile
      ? (typeof img.mobileZoom === "number" ? img.mobileZoom : img.zoom || 1)
      : (typeof img.zoom === "number" ? img.zoom : 1);
    const cfg = getImageConfig(img);
    const crop = isMobile ? cfg.mobileCrop : cfg.laptopCrop;
    return {
      objectPosition: pos,
      objectFit: crop ? "cover" : "contain",
      ...(zoom && zoom !== 1
        ? {
            transform: `scale(${zoom})`,
            transformOrigin: pos,
          }
        : {}),
    };
  };

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "+" || e.key === "=") {
        updateZoom(fullscreenZoom >= 3 ? fullscreenZoom + 1 : fullscreenZoom + 0.5);
      } else if (e.key === "-") {
        updateZoom(fullscreenZoom > 3 ? fullscreenZoom - 1 : fullscreenZoom - 0.5);
      } else if (e.key === "0") {
        updateZoom(1);
      } else if (fullscreenZoom === 1 && e.key === "ArrowLeft") {
        const prev = selected > 0 ? selected - 1 : images.length - 1;
        setSelected(prev);
        emblaApi?.scrollTo(prev);
      } else if (fullscreenZoom === 1 && e.key === "ArrowRight") {
        const next = selected < images.length - 1 ? selected + 1 : 0;
        setSelected(next);
        emblaApi?.scrollTo(next);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isFullscreen, selected, images.length, emblaApi, fullscreenZoom, updateZoom]);

  // Mouse wheel zoom inside fullscreen (up to 10x)
  useEffect(() => {
    if (!isFullscreen) return;
    const el = imageContainerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.15 : 0.85;
      setFullscreenZoom((prev) => {
        const next = Math.max(1, Math.min(10, Math.round(prev * factor * 100) / 100));
        if (next === 1) setFullscreenPan({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isFullscreen]);

  const handlePointerDown = (e) => {
    if (fullscreenZoom <= 1) return;
    setIsPanning(true);
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    panStartRef.current = {
      x: clientX,
      y: clientY,
      startPanX: fullscreenPan.x,
      startPanY: fullscreenPan.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!isPanning || fullscreenZoom <= 1) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    setFullscreenPan({
      x: panStartRef.current.startPanX + dx,
      y: panStartRef.current.startPanY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleDoubleClick = () => {
    if (fullscreenZoom === 1) {
      updateZoom(3);
    } else if (fullscreenZoom < 10) {
      updateZoom(10);
    } else {
      updateZoom(1);
    }
  };

  if (!images?.length) return null;

  return (
    <section className="mt-4 md:mt-6" data-testid="project-gallery">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-start">
            {images.map((img, i) => {
              const cfg = getImageConfig(img);
              const activeRatio = isMobile ? cfg.mobileRatio : cfg.laptopRatio;
              const numericAspect = isMobile
                ? getNumericAspect(cfg.mobileRatio, img.mobileCustomRatio || img.customRatio)
                : getNumericAspect(cfg.laptopRatio, img.customRatio);
              const stageHeight = getStageHeight(numericAspect, isMobile, activeRatio);

              const isFullscreenLaptop = !isMobile && (activeRatio === "fullscreen-laptop" || activeRatio === "fullscreen");
              const isFullscreenLandscape = !isMobile && activeRatio === "landscape";
              const isFullscreenMobile = isMobile && (activeRatio === "fullscreen-mobile" || activeRatio === "fullscreen");

              let slideBoxStyle;
              if (isFullscreenLaptop) {
                slideBoxStyle = {
                  width: "100%",
                  aspectRatio: `${numericAspect || 16 / 9}`,
                  margin: "0 auto",
                  maxHeight: "min(90vh, 880px)",
                };
              } else if (isFullscreenLandscape) {
                // 4:3 Landscape Fullscreen: adapts flexibly to ANY laptop screen
                // Keeps 4:3 aspect ratio while scaling to the maximum available screen height/width
                // without heavily cropping the image
                const maxH = "min(86vh, calc(100vh - 120px))";
                slideBoxStyle = {
                  height: "auto",
                  maxHeight: maxH,
                  width: "100%",
                  maxWidth: numericAspect ? `min(100%, calc(${maxH} * ${numericAspect}))` : "min(100%, calc(86vh * 1.333))",
                  aspectRatio: `${numericAspect || 4 / 3}`,
                  margin: "0 auto",
                };
              } else if (isFullscreenMobile) {
                slideBoxStyle = {
                  width: "100%",
                  aspectRatio: `${numericAspect || 9 / 16}`,
                  margin: "0 auto",
                };
              } else if (numericAspect) {
                const isPortrait = numericAspect < 1;
                const h = isPortrait ? (isMobile ? "min(76vh, 560px)" : "min(82vh, 740px)") : stageHeight;
                slideBoxStyle = {
                  height: h,
                  maxHeight: h,
                  width: `calc(${h} * ${numericAspect})`,
                  maxWidth: "100%",
                  aspectRatio: `${numericAspect}`,
                  margin: "0 auto",
                };
              } else {
                slideBoxStyle = {
                  height: stageHeight,
                  width: "100%",
                };
              }

              return (
                <div
                  key={img.url + i}
                  className="min-w-0 flex-[0_0_100%] w-full flex justify-center overflow-hidden"
                  data-testid={`gallery-slide-${i}`}
                >
                  <div
                    className="relative overflow-hidden flex items-center justify-center bg-ink/[0.03] select-none"
                    style={slideBoxStyle}
                  >
                    <img
                      src={img.url}
                      alt={img.caption || title}
                      style={getImageStyle(img)}
                      className="w-full h-full select-none cursor-pointer transition-transform duration-100"
                      onClick={() => {
                        setSelected(i);
                        setIsFullscreen(true);
                      }}
                      data-testid={`gallery-hero-image-${i}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              data-testid="gallery-prev-button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={selected === 0}
              className="hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink disabled:opacity-30 hover:bg-ink hover:text-paper transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              data-testid="gallery-next-button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={selected === images.length - 1}
              className="hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink disabled:opacity-30 hover:bg-ink hover:text-paper transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between items-center mt-2.5 px-4 md:px-10">
        <p className="mono text-mute text-xs md:text-sm" data-testid="gallery-caption">
          {images[selected]?.caption || ""}
        </p>
        <div className="flex items-center gap-3 md:gap-4">
          {images.length > 1 && (
            <span className="mono text-mute text-xs md:text-sm" data-testid="gallery-counter">
              {pad(selected)} / {pad(images.length - 1)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="mono text-xs text-mute hover:text-ink flex items-center gap-1.5 transition-colors"
            aria-label="View fullscreen"
            data-testid="gallery-fullscreen-toggle"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-2.5 overflow-x-auto px-4 md:px-10" data-testid="gallery-thumbnails">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              data-testid={`gallery-thumb-${i}`}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`shrink-0 w-16 h-11 border overflow-hidden transition-opacity ${
                selected === i ? "border-ink opacity-100" : "border-line opacity-45 hover:opacity-80"
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-paper/98 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 select-none"
          data-testid="gallery-fullscreen-modal"
        >
          <div className="flex justify-between items-center hairline-b pb-4 gap-4 flex-wrap">
            <div className="mono text-xs text-mute uppercase tracking-widest truncate max-w-[200px] sm:max-w-md">
              {title} — Fullscreen View
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              {/* Zoom Controls (1x to 10x) */}
              <div className="flex items-center border border-line bg-paper/90 px-2 py-1 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => updateZoom(fullscreenZoom > 3 ? fullscreenZoom - 1 : fullscreenZoom - 0.5)}
                  disabled={fullscreenZoom <= 1}
                  className="p-1 text-ink hover:text-accent disabled:opacity-30 transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={fullscreenZoom}
                  onChange={(e) => updateZoom(parseFloat(e.target.value))}
                  className="w-16 sm:w-24 h-1 accent-ink cursor-pointer"
                  title="Zoom slider (1x - 10x)"
                  aria-label="Zoom slider"
                />
                <button
                  type="button"
                  onClick={() => updateZoom(fullscreenZoom >= 3 ? fullscreenZoom + 1 : fullscreenZoom + 0.5)}
                  disabled={fullscreenZoom >= 10}
                  className="p-1 text-ink hover:text-accent disabled:opacity-30 transition-colors"
                  title="Zoom In (up to 10x)"
                  aria-label="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <span className="mono text-[11px] font-bold min-w-[38px] text-right">
                  {fullscreenZoom.toFixed(1)}x
                </span>
                {fullscreenZoom > 1 && (
                  <button
                    type="button"
                    onClick={() => updateZoom(1)}
                    className="p-1 text-mute hover:text-ink transition-colors border-l border-line pl-1.5"
                    title="Reset to 1x"
                    aria-label="Reset zoom"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsFullscreen(false);
                  emblaApi?.scrollTo(selected);
                }}
                className="w-9 h-9 flex items-center justify-center border border-line hover:bg-ink hover:text-paper transition-colors"
                aria-label="Close fullscreen"
                data-testid="gallery-fullscreen-close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            ref={imageContainerRef}
            className={`relative flex-1 flex items-center justify-center my-4 overflow-hidden select-none touch-none ${
              fullscreenZoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
            }`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            title={fullscreenZoom > 1 ? "Drag to pan, double-click to reset" : "Double-click or scroll wheel to zoom (up to 10x)"}
          >
            <img
              src={images[selected]?.url}
              alt={images[selected]?.caption || title}
              style={{
                transform: `translate(${fullscreenPan.x}px, ${fullscreenPan.y}px) scale(${fullscreenZoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.15s ease-out",
              }}
              draggable={false}
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain pointer-events-none"
              data-testid="gallery-fullscreen-active-image"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const prev = selected > 0 ? selected - 1 : images.length - 1;
                    setSelected(prev);
                    emblaApi?.scrollTo(prev);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink hover:bg-ink hover:text-paper transition-colors flex items-center justify-center"
                  aria-label="Previous"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => {
                    const next = selected < images.length - 1 ? selected + 1 : 0;
                    setSelected(next);
                    emblaApi?.scrollTo(next);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink hover:bg-ink hover:text-paper transition-colors flex items-center justify-center"
                  aria-label="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-between items-center hairline-t pt-4">
            <p className="mono text-xs md:text-sm text-mute">{images[selected]?.caption || ""}</p>
            {images.length > 1 && (
              <span className="mono text-xs md:text-sm text-mute">
                {pad(selected)} / {pad(images.length - 1)}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
