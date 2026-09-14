import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchPublished, WORLDS, pad } from "@/lib/api";

export default function World({ worldKey }) {
  const world = WORLDS[worldKey];
  const keys = Object.keys(WORLDS);
  const other = WORLDS[keys[(keys.indexOf(worldKey) + 1) % keys.length]];
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    setFilter("All");
    fetchPublished(worldKey).then(setProjects).catch(() => {});
  }, [worldKey]);

  const categories = [
    "All",
    ...new Set([...(world.categories || []), ...projects.map((p) => p.category).filter(Boolean)]),
  ];
  const visible = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div data-testid={`world-page-${worldKey}`}>
      <Seo
        title={`${world.title} — abearchitectstudio`}
        siteName="abearchitectstudio"
        description={world.description}
      />

      <section className="px-4 md:px-10 pt-40 md:pt-32">
        <div className="mono text-mute" data-testid="world-label">
          World {world.index} / 03
        </div>
        <h1 className="display text-[9vw] md:text-[9vw] mt-8 md:text-center break-words" data-testid="world-title">
          <MaskedLine delay={0.1}>{world.titleLines[0]}</MaskedLine>
          <MaskedLine delay={0.24} className="text-accent">{world.titleLines[1]}</MaskedLine>
        </h1>
        <p className="text-sm text-mute max-w-lg leading-relaxed mt-10 md:mx-auto md:text-center" data-testid="world-description">
          {world.description}
        </p>
        <div className="flex flex-col md:flex-row justify-between gap-4 mt-16 hairline-b pb-4">
          <span className="mono text-mute" data-testid="world-count">{projects.length} works</span>
          <div className="flex flex-wrap gap-6" data-testid="category-filters">
            {categories.map((c) => (
              <button
                key={c}
                data-testid={`filter-${c.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setFilter(c)}
                className={`mono transition-colors ${
                  filter === c ? "text-ink underline underline-offset-4" : "text-mute hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-10" data-testid="world-projects">
        {(worldKey === "anomaly" ? visible.slice(0, 3) : visible).map((p, i) => (
          <Reveal key={p.id} className="hairline-b py-16 md:py-24">
            <Link
              to={`/project/${p.slug}`}
              data-testid={`world-project-${p.slug}`}
              className="grid grid-cols-12 gap-6 items-end group"
            >
              <div className={`col-span-12 md:col-span-5 ${i % 2 === 1 ? "md:order-2 md:col-start-8" : ""}`}>
                <div className="relative">
                  <span className="display text-[7rem] md:text-[9rem] leading-none absolute -top-10 -left-2 select-none" style={{ color: "rgba(23,21,18,0.06)" }} aria-hidden="true">
                    {pad(i)}
                  </span>
                  <div className="relative flex justify-between">
                    <span className="mono text-mute">{pad(i)}</span>
                    <span className="mono text-mute">{p.year}</span>
                  </div>
                  <h2 className="display text-3xl md:text-5xl mt-3 relative">{p.title}</h2>
                  <p className="serif italic text-mute mt-3">{p.operations.join(". ")}.</p>
                  <p className="mono text-mute mt-4">
                    {p.category}
                    {p.location ? `  ·  ${p.location}` : ""}
                  </p>
                </div>
              </div>
              <div className={`col-span-12 md:col-span-6 ${i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-7"}`}>
                <div className="overflow-hidden">
                  <img
                    src={p.cover}
                    alt={p.title}
                    loading="lazy"
                    onError={(e) => {
                      if (p.images?.[0]?.url && e.currentTarget.src !== p.images[0].url) {
                        e.currentTarget.src = p.images[0].url;
                      }
                    }}
                    style={{ objectPosition: p.cover_position || (p.images?.[0]?.position) || "center" }}
                    className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}

        {worldKey === "anomaly" && visible.length > 3 && (
          <div className="hairline-b py-16 md:py-20" data-testid="anomaly-other-projects">
            <div className="flex items-center justify-between mb-10 hairline-b pb-4">
              <span className="mono text-mute">Other Spatial Studies & Explorations</span>
              <span className="mono text-mute">{pad(visible.length - 3)} works</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {visible.slice(3).map((p, idx) => (
                <Reveal key={p.id} delay={(idx % 4) * 0.08}>
                  <Link
                    to={`/project/${p.slug}`}
                    data-testid={`anomaly-grid-project-${p.slug}`}
                    className="group block"
                  >
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
                        style={{ objectPosition: p.cover_position || (p.images?.[0]?.position) || "center" }}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="mono text-[10px] absolute top-2 left-2 bg-paper/90 px-1.5 py-0.5 border border-line text-ink">
                        {pad(3 + idx)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline mt-3">
                      <h3 className="display text-base md:text-lg group-hover:text-accent transition-colors truncate pr-2">
                        {p.title}
                      </h3>
                      <span className="mono text-xs text-mute shrink-0">{p.year}</span>
                    </div>
                    {p.operations && p.operations.length > 0 && (
                      <p className="serif italic text-mute text-xs mt-1 truncate">
                        {p.operations.join(". ")}.
                      </p>
                    )}
                    <p className="mono text-[11px] text-mute mt-1.5">
                      {p.category}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {visible.length === 0 && (
          <div className="py-24 mono text-mute" data-testid="no-projects-message">
            No works in this category yet.
          </div>
        )}
      </section>

      <section className="px-4 md:px-10 py-20">
        <Link to={other.path} data-testid="continue-link" className="group block">
          <span className="mono text-mute">Continue — {other.index}</span>
          <span className="display text-[8vw] md:text-[6vw] block mt-4 group-hover:text-accent transition-colors break-words">
            {other.title} →
          </span>
        </Link>
      </section>
    </div>
  );
}
