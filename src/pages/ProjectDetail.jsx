import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import ProjectGallery from "@/components/ProjectGallery";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchProject, fetchPublished, adminFetchBySlug, getToken, WORLDS, pad } from "@/lib/api";

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
  if (numericAspect < 1) {
    return isMobile ? "min(76vh, 560px)" : "min(82vh, 740px)";
  }
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

const getImgBoxStyle = (img, isMobile) => {
  const cfg = getImageConfig(img);
  const activeRatio = isMobile ? cfg.mobileRatio : cfg.laptopRatio;
  const numericAspect = isMobile
    ? getNumericAspect(cfg.mobileRatio, img.mobileCustomRatio || img.customRatio)
    : getNumericAspect(cfg.laptopRatio, img.customRatio);

  const isFullscreenLaptop = !isMobile && (activeRatio === "fullscreen-laptop" || activeRatio === "fullscreen");
  const isFullscreenLandscape = !isMobile && activeRatio === "landscape";
  const isFullscreenMobile = isMobile && (activeRatio === "fullscreen-mobile" || activeRatio === "fullscreen");

  if (isFullscreenLaptop) {
    return {
      width: "100%",
      aspectRatio: `${numericAspect || 16 / 9}`,
      margin: "0 auto",
      maxHeight: "min(90vh, 880px)",
    };
  }

  if (isFullscreenLandscape) {
    const maxH = "min(86vh, calc(100vh - 120px))";
    return {
      width: "100%",
      maxWidth: numericAspect ? `min(100%, calc(${maxH} * ${numericAspect}))` : "min(100%, calc(86vh * 1.333))",
      aspectRatio: `${numericAspect || 4 / 3}`,
      maxHeight: maxH,
      margin: "0 auto",
    };
  }

  if (isFullscreenMobile) {
    return {
      width: "100%",
      aspectRatio: `${numericAspect || 9 / 16}`,
      margin: "0 auto",
    };
  }

  const stageH = getStageHeight(numericAspect, isMobile, activeRatio);

  if (!numericAspect) {
    return {
      height: stageH,
      width: "100%",
    };
  }

  const isPortrait = numericAspect < 1;
  const h = isPortrait ? (isMobile ? "min(76vh, 560px)" : "min(82vh, 740px)") : stageH;

  return {
    height: h,
    maxHeight: h,
    width: `calc(${h} * ${numericAspect})`,
    maxWidth: "100%",
    aspectRatio: `${numericAspect}`,
    margin: "0 auto",
  };
};

const getImgBoxClass = () => {
  return "relative overflow-hidden flex items-center justify-center bg-ink/[0.03] mx-auto";
};

const getImgElementClass = () => {
  return "w-full h-full select-none cursor-pointer";
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="hairline-b py-1.5 md:py-2.5 grid grid-cols-12 gap-2 md:gap-4" data-testid={`info-${label.toLowerCase()}`}>
      <span className="mono text-mute text-[11px] md:text-sm col-span-5 md:col-span-4">{label}</span>
      <span className="text-xs md:text-sm col-span-7 md:col-span-8">{value}</span>
    </div>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isPreview = params.get("preview") === "1";
  const [project, setProject] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [missing, setMissing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const getImageStyle = (img) => {
    if (!img) return {};
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
    setProject(null);
    setMissing(false);
    fetchProject(slug)
      .then(setProject)
      .catch(async () => {
        if (isPreview && getToken()) {
          try {
            setProject(await adminFetchBySlug(slug));
            return;
          } catch {}
        }
        setMissing(true);
      });
  }, [slug, isPreview]);

  useEffect(() => {
    if (project?.world) fetchPublished(project.world).then(setSiblings).catch(() => {});
  }, [project?.world]);

  if (missing)
    return (
      <div className="px-4 md:px-10 pt-40 min-h-[70vh]" data-testid="project-not-found">
        <span className="mono text-mute">Project not found</span>
        <h1 className="display text-5xl mt-6">This work does not exist.</h1>
        <Link to="/" className="mono text-ink underline underline-offset-4 mt-8 inline-block">
          Back to index →
        </Link>
      </div>
    );

  if (!project) return <div className="min-h-[70vh]" data-testid="project-loading" />;

  const index = siblings.findIndex((p) => p.slug === project.slug);
  const next = siblings.length > 1 ? siblings[(index + 1) % siblings.length] : null;
  const images = project.images || [];
  const sections = project.sections || [];
  const restImages = images.slice(1);

  return (
    <div data-testid="project-page">
      <Seo
        title={`${project.title} — abearchitectstudio`}
        siteName="abearchitectstudio"
        description={project.summary || project.concept}
      />
      {isPreview && !project.published && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper mono px-6 py-3" data-testid="preview-banner">
          Preview — this project is unpublished
        </div>
      )}

      <section className="px-4 md:px-10 pt-16 md:pt-20">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 md:col-span-2 flex md:block items-center gap-3 mb-1 md:mb-0">
            <span className="display text-3xl sm:text-4xl md:text-[8rem] leading-none" data-testid="project-number">
              {index >= 0 ? pad(index) : "··"}
            </span>
            <div className="mono text-mute text-[11px] md:text-sm md:mt-4">{WORLDS[project.world]?.title}</div>
          </div>
          <div className="col-span-12 md:col-span-10">
            <h1 className="display text-2xl sm:text-4xl md:text-7xl break-words" data-testid="project-title">
              <MaskedLine delay={0.1}>{project.title}</MaskedLine>
            </h1>
            {project.summary && (
              <p className="serif text-xs sm:text-base md:text-xl text-mute max-w-lg mt-2 md:mt-3 leading-relaxed" data-testid="project-summary">
                {project.summary}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 hairline-t mt-4 md:mt-6 pt-3 md:pt-4" data-testid="project-meta">
          <div><div className="mono text-mute mb-0.5 md:mb-2 text-[11px] md:text-sm">Year</div><div className="text-xs md:text-sm">{project.year}</div></div>
          <div><div className="mono text-mute mb-0.5 md:mb-2 text-[11px] md:text-sm">Location</div><div className="text-xs md:text-sm">{project.location}</div></div>
          <div><div className="mono text-mute mb-0.5 md:mb-2 text-[11px] md:text-sm">Category</div><div className="text-xs md:text-sm">{project.category}</div></div>
          <div><div className="mono text-mute mb-0.5 md:mb-2 text-[11px] md:text-sm">Role</div><div className="text-xs md:text-sm">{project.role}</div></div>
        </div>
      </section>

      {images.length > 0 && <ProjectGallery images={images} title={project.title} />}

      {project.concept && (
        <section className="px-4 md:px-10 mt-4 md:mt-8 grid grid-cols-12 gap-3 md:gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute text-[11px] md:text-sm">Concept</span>
          </div>
          <Reveal className="col-span-12 md:col-span-7">
            <p className="serif text-xs sm:text-base md:text-2xl leading-relaxed text-ink/90" data-testid="project-concept">
              {project.concept}
            </p>
          </Reveal>
        </section>
      )}

      {project.question && (
        <section className="px-4 md:px-10 mt-4 md:mt-8 grid grid-cols-12">
          <Reveal className="col-span-12 md:col-span-8 md:col-start-3">
            <p className="serif italic text-sm sm:text-base md:text-4xl leading-relaxed" data-testid="project-question">
              {project.question}
            </p>
          </Reveal>
        </section>
      )}

      {project.operations?.length > 0 && (
        <section className="px-4 md:px-10 mt-4 md:mt-8 grid grid-cols-12 gap-3 md:gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute text-[11px] md:text-sm">Design operation</span>
          </div>
          <div className="col-span-12 md:col-span-7" data-testid="project-operations">
            {project.operations.map((op, i) => (
              <div key={op} className="hairline-b py-1.5 md:py-2.5 flex justify-between items-baseline">
                <span className="display text-sm sm:text-base md:text-2xl">{op}</span>
                <span className="mono text-mute text-[11px] md:text-sm">{pad(i)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {project.transformation && (
        <section className="px-4 md:px-10 mt-4 md:mt-8 grid grid-cols-12 gap-3 md:gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute text-[11px] md:text-sm">Transformation</span>
          </div>
          <Reveal className="col-span-12 md:col-span-7">
            <p className="serif text-xs sm:text-base md:text-2xl leading-relaxed text-ink/90" data-testid="project-transformation">
              {project.transformation}
            </p>
          </Reveal>
        </section>
      )}

      {sections.map((s, i) => {
        const img = restImages[i];
        const cfg = img ? getImageConfig(img) : null;
        const activeRatio = img ? (isMobile ? cfg.mobileRatio : cfg.laptopRatio) : null;
        const isFullscreen = img && (
          (isMobile && (activeRatio === "fullscreen-mobile" || activeRatio === "fullscreen")) ||
          (!isMobile && (activeRatio === "fullscreen-laptop" || activeRatio === "landscape" || activeRatio === "fullscreen"))
        );

        return (
          <div key={i}>
            {img && (
              <section className={isFullscreen ? "w-full mt-4 md:mt-7 overflow-hidden" : "px-4 md:px-10 mt-4 md:mt-7"}>
                <Reveal>
                  <div className={getImgBoxClass()} style={getImgBoxStyle(img, isMobile)}>
                    <img
                      src={img.url}
                      alt={s.heading || project.title}
                      style={getImageStyle(img)}
                      className={getImgElementClass()}
                      data-testid={`project-image-${i + 2}`}
                    />
                  </div>
                  {img.caption && (
                    <div className={isFullscreen ? "px-4 md:px-10" : ""}>
                      <p className="mono text-mute text-[11px] md:text-sm mt-2 md:mt-2.5">{img.caption}</p>
                    </div>
                  )}
                </Reveal>
              </section>
            )}
            <section className="px-4 md:px-10 mt-4 md:mt-7 grid grid-cols-12 gap-3 md:gap-6">
              <div className="col-span-12 md:col-span-3">
                {s.heading && <span className="mono text-mute text-[11px] md:text-sm">{s.heading}</span>}
              </div>
              <Reveal className="col-span-12 md:col-span-7">
                {s.text.split("\n").filter(Boolean).map((line, j) => (
                  <p key={j} className="serif text-xs sm:text-base md:text-xl leading-relaxed mb-2 md:mb-3 text-ink/90" data-testid={`project-section-${i}`}>
                    {line}
                  </p>
                ))}
              </Reveal>
            </section>
          </div>
        );
      })}

      {restImages.slice(sections.length).map((img, i) => {
        const cfg = getImageConfig(img);
        const activeRatio = isMobile ? cfg.mobileRatio : cfg.laptopRatio;
        const isFullscreen =
          (isMobile && (activeRatio === "fullscreen-mobile" || activeRatio === "fullscreen")) ||
          (!isMobile && (activeRatio === "fullscreen-laptop" || activeRatio === "landscape" || activeRatio === "fullscreen"));

        return (
          <section className={isFullscreen ? "w-full mt-4 md:mt-7 overflow-hidden" : "px-4 md:px-10 mt-4 md:mt-7"} key={i}>
            <Reveal>
              <div className={getImgBoxClass()} style={getImgBoxStyle(img, isMobile)}>
                <img
                  src={img.url}
                  alt={project.title}
                  style={getImageStyle(img)}
                  className={getImgElementClass()}
                  data-testid={`project-image-extra-${i}`}
                />
              </div>
              {img.caption && (
                <div className={isFullscreen ? "px-4 md:px-10" : ""}>
                  <p className="mono text-mute text-[11px] md:text-sm mt-2 md:mt-2.5">{img.caption}</p>
                </div>
              )}
            </Reveal>
          </section>
        );
      })}

      <section className="px-4 md:px-10 mt-5 md:mt-9 grid grid-cols-12 gap-3 md:gap-6" data-testid="project-info">
        <div className="col-span-12 md:col-span-3">
          <span className="mono text-mute text-[11px] md:text-sm">Project information</span>
        </div>
        <div className="col-span-12 md:col-span-7 hairline-t">
          <InfoRow label="Material" value={project.material} />
          <InfoRow label="Construction" value={project.construction} />
          <InfoRow label="Status" value={project.status} />
          <InfoRow label="Role" value={project.role} />
          <InfoRow label="Year" value={project.year} />
          <InfoRow label="Location" value={project.location} />
          <InfoRow label="World" value={WORLDS[project.world]?.title} />
          <InfoRow label="Category" value={project.category} />
        </div>
      </section>

      {next && (
        <section className="px-4 md:px-10 mt-8 md:mt-16 hairline-t pt-5 md:pt-10">
          <Link to={`/project/${next.slug}`} data-testid="next-project-link" className="grid grid-cols-12 gap-4 md:gap-6 items-center group">
            <div className="col-span-12 md:col-span-8">
              <span className="mono text-mute text-[11px] md:text-sm">Next — {pad(siblings.findIndex((p) => p.id === next.id))}</span>
              <h2 className="display text-2xl sm:text-3xl md:text-6xl mt-2 md:mt-4 group-hover:text-accent transition-colors">
                {next.title}
              </h2>
              <p className="mono text-mute text-[11px] md:text-sm mt-2 md:mt-3">
                {next.category} — {next.year}
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 overflow-hidden">
              <img
                src={next.cover}
                alt={next.title}
                className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
