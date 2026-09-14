import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { pad } from "@/lib/api";

export default function HomeDesignList({ projects = [] }) {
  const [activeTab, setActiveTab] = useState("all");

  const anomalyProjects = projects.filter((p) => p.world === "anomaly").slice(0, 4);
  const furnitureProjects = projects.filter((p) => p.world === "furniture").slice(0, 4);

  return (
    <section
      className="px-4 md:px-10 pt-16 md:pt-24 w-full max-w-full overflow-hidden"
      data-testid="home-design-list-section"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 hairline-b pb-4">
        <div className="flex items-baseline gap-3">
          <span className="mono text-mute text-xs md:text-sm">
            01 — List of Design
          </span>
          <span className="hidden sm:inline mono text-mute/50 text-xs">/</span>
          <span className="mono text-mute text-xs uppercase tracking-wider hidden sm:inline">
            Curated Selection
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            data-testid="design-filter-all"
            className={`transition-colors cursor-pointer ${
              activeTab === "all"
                ? "text-ink underline underline-offset-4 font-medium"
                : "text-mute hover:text-ink"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("anomaly")}
            data-testid="design-filter-anomaly"
            className={`transition-colors cursor-pointer ${
              activeTab === "anomaly"
                ? "text-ink underline underline-offset-4 font-medium"
                : "text-mute hover:text-ink"
            }`}
          >
            01 — Anomaly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("furniture")}
            data-testid="design-filter-furniture"
            className={`transition-colors cursor-pointer ${
              activeTab === "furniture"
                ? "text-ink underline underline-offset-4 font-medium"
                : "text-mute hover:text-ink"
            }`}
          >
            02 — Furniture
          </button>
        </div>
      </div>

      {/* Content Groups */}
      <div className="mt-8 md:mt-12 space-y-14 md:space-y-18">
        <AnimatePresence mode="wait">
          {/* ANOMALY GROUP */}
          {(activeTab === "all" || activeTab === "anomaly") && (
            <motion.div
              key="anomaly-group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-1.5 mb-6 sm:mb-8 hairline-b pb-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="mono text-xs uppercase tracking-widest text-ink font-semibold">
                    01 — Anomaly Design
                  </span>
                  <span className="mono text-[11px] text-mute">
                    (Spatial Studies & Explorations)
                  </span>
                </div>
                <Link
                  to="/anomaly"
                  className="mono text-xs text-mute hover:text-accent transition-colors w-fit pt-0.5"
                >
                  Explore All Anomaly Works →
                </Link>
              </div>

              {/* 2 columns on mobile, 4 columns on desktop/tablet */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {anomalyProjects.map((p, idx) => (
                  <Reveal key={p.id || p.slug} delay={idx * 0.06}>
                    <Link
                      to={`/project/${p.slug}`}
                      data-testid={`design-card-${p.slug}`}
                      className="group block w-full min-w-0"
                    >
                      {/* Medium Icon Preview Frame */}
                      <div className="overflow-hidden bg-ink/5 border border-line aspect-[4/3] relative">
                        <img
                          src={p.cover}
                          alt={p.title}
                          loading="lazy"
                          onError={(e) => {
                            if (p.images?.[0]?.url && e.currentTarget.src !== p.images[0].url) {
                              e.currentTarget.src = p.images[0].url;
                            }
                          }}
                          style={{
                            objectPosition:
                              p.cover_position ||
                              p.images?.[0]?.position ||
                              "center",
                          }}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {/* Number badge exactly as in the reference screenshot */}
                        <span className="mono text-[10px] absolute top-2 left-2 bg-paper/90 px-1.5 py-0.5 border border-line text-ink leading-none">
                          {pad(idx + 1)}
                        </span>
                      </div>

                      {/* Info lines below medium icon */}
                      <div className="flex justify-between items-baseline mt-3">
                        <h3 className="display text-sm sm:text-base md:text-lg group-hover:text-accent transition-colors truncate pr-2 font-medium">
                          {p.title}
                        </h3>
                        <span className="mono text-xs text-mute shrink-0">
                          {p.year}
                        </span>
                      </div>

                      {p.operations && p.operations.length > 0 && (
                        <p className="serif italic text-mute text-xs mt-1 truncate">
                          {p.operations.join(". ")}.
                        </p>
                      )}

                      <p className="mono text-[10px] sm:text-[11px] text-mute mt-1.5 truncate">
                        {p.category}
                        {p.location ? ` · ${p.location}` : ""}
                      </p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </motion.div>
          )}

          {/* FURNITURE GROUP */}
          {(activeTab === "all" || activeTab === "furniture") && (
            <motion.div
              key="furniture-group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-1.5 mb-6 sm:mb-8 hairline-b pb-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="mono text-xs uppercase tracking-widest text-ink font-semibold">
                    02 — Furniture Design
                  </span>
                  <span className="mono text-[11px] text-mute">
                    (Objects, Chairs & Lighting)
                  </span>
                </div>
                <Link
                  to="/furniture"
                  className="mono text-xs text-mute hover:text-accent transition-colors w-fit pt-0.5"
                >
                  Explore All Furniture Works →
                </Link>
              </div>

              {/* 2 columns on mobile, 4 columns on desktop/tablet */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {furnitureProjects.map((p, idx) => (
                  <Reveal key={p.id || p.slug} delay={idx * 0.06}>
                    <Link
                      to={`/project/${p.slug}`}
                      data-testid={`design-card-${p.slug}`}
                      className="group block w-full min-w-0"
                    >
                      {/* Medium Icon Preview Frame */}
                      <div className="overflow-hidden bg-ink/5 border border-line aspect-[4/3] relative">
                        <img
                          src={p.cover}
                          alt={p.title}
                          loading="lazy"
                          onError={(e) => {
                            if (p.images?.[0]?.url && e.currentTarget.src !== p.images[0].url) {
                              e.currentTarget.src = p.images[0].url;
                            }
                          }}
                          style={{
                            objectPosition:
                              p.cover_position ||
                              p.images?.[0]?.position ||
                              "center",
                          }}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {/* Number badge exactly as in the reference screenshot */}
                        <span className="mono text-[10px] absolute top-2 left-2 bg-paper/90 px-1.5 py-0.5 border border-line text-ink leading-none">
                          {pad(idx + 1)}
                        </span>
                      </div>

                      {/* Info lines below medium icon */}
                      <div className="flex justify-between items-baseline mt-3">
                        <h3 className="display text-sm sm:text-base md:text-lg group-hover:text-accent transition-colors truncate pr-2 font-medium">
                          {p.title}
                        </h3>
                        <span className="mono text-xs text-mute shrink-0">
                          {p.year}
                        </span>
                      </div>

                      {p.operations && p.operations.length > 0 && (
                        <p className="serif italic text-mute text-xs mt-1 truncate">
                          {p.operations.join(". ")}.
                        </p>
                      )}

                      <p className="mono text-[10px] sm:text-[11px] text-mute mt-1.5 truncate">
                        {p.category}
                        {p.location ? ` · ${p.location}` : ""}
                      </p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
