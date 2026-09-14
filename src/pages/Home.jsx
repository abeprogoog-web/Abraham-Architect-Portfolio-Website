import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import Marquee from "@/components/Marquee";
import HomeCover from "@/components/HomeCover";
import HomeDesignList from "@/components/HomeDesignList";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchPublished, WORLDS, pad } from "@/lib/api";

export default function Home() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    fetchPublished().then(setProjects).catch(() => {});
  }, []);

  const hero = projects[0];
  const featured = projects.filter((p) => p.featured);
  const byWorld = (w) => projects.filter((p) => p.world === w);
  const worldIndex = (p) => byWorld(p.world).findIndex((x) => x.id === p.id);

  return (
    <div data-testid="home-page">
      <HomeCover />
      <Seo
        title="abearchitectstudio — Architecture, objects and spatial experiments"
        siteName="abearchitectstudio"
        description="A portfolio of architectural anomalies and designed objects. Each project begins with a single operation — a cut, a fold, a displacement — and follows it until the space or object changes state."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "abearchitectstudio",
          description: "Architecture, objects and spatial experiments",
        }}
      />

      {/* Hero */}
      <section className="px-4 md:px-10 pt-28 md:pt-32 min-h-0 md:min-h-[92vh] flex flex-col justify-between w-full max-w-full overflow-hidden" data-testid="hero">
        <div className="mono text-mute text-xs md:text-sm" data-testid="hero-label">
          Architecture, objects and spatial experiments
        </div>
        <div className="grid grid-cols-12 gap-4 md:gap-6 mt-4 md:mt-8 flex-1">
          <div className="col-span-12 md:col-span-8 flex flex-col justify-between">
            <div>
              <h1 className="display text-[9vw] sm:text-5xl md:text-[6.8vw] leading-[0.95] break-words sm:whitespace-nowrap" data-testid="hero-title">
                <MaskedLine delay={0.1}>Space</MaskedLine>
                <MaskedLine delay={0.22}>Form</MaskedLine>
                <MaskedLine delay={0.34}>
                  Experiment<span className="text-accent">.</span>
                </MaskedLine>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-mute max-w-md leading-relaxed mt-4 md:mt-20" data-testid="hero-description">
              A portfolio of architectural anomalies and designed objects. Each project begins
              with a single operation — a cut, a fold, a displacement — and follows it until
              the space or object changes state.
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 md:col-start-9 mt-6 md:mt-0 flex flex-col justify-end">
            {hero && (
              <Link to={`/project/${hero.slug}`} data-testid="hero-project-link" className="block group">
                <div className="overflow-hidden border border-line/30 bg-paper">
                  <motion.img
                    src={hero.cover}
                    alt={hero.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    onError={(e) => {
                      if (hero.images?.[0]?.url && e.currentTarget.src !== hero.images[0].url) {
                        e.currentTarget.src = hero.images[0].url;
                      }
                    }}
                    style={{
                      objectPosition: hero.cover_position || (hero.images?.[0]?.position) || "center",
                    }}
                    className="w-full aspect-[4/3] max-h-[36vh] md:max-h-none object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-xs md:text-sm">
                  <span className="mono text-ink">01 — {hero.title}</span>
                  <span className="mono text-mute">{hero.location}</span>
                </div>
              </Link>
            )}
          </div>
        </div>
        <div className="flex justify-between items-end pb-4 mt-6 md:mt-10">
          <span className="mono text-mute text-xs md:text-sm" data-testid="hero-count">
            {projects.length} works — 3 design worlds
          </span>
          <span className="mono text-mute text-xs md:text-sm">Scroll ↓</span>
        </div>
      </section>

      <Marquee />

      {/* List of Design — Curated Selection with Medium Icons */}
      <HomeDesignList projects={projects} />

      {/* Selected works */}
      <section className="px-4 md:px-10 pt-20" data-testid="selected-works">
        <div className="flex justify-between items-baseline hairline-b pb-4">
          <span className="mono text-mute">02 — Selected works</span>
          <Link to="/anomaly" data-testid="full-archive-link" className="mono text-ink hover:text-accent transition-colors">
            Full archive →
          </Link>
        </div>
        <div className="grid grid-cols-12 gap-6 mt-14">
          {featured.map((p, i) => (
            <Reveal
              key={p.id}
              delay={(i % 2) * 0.1}
              className={`col-span-12 ${i % 3 === 0 ? "md:col-span-7" : "md:col-span-5"} mb-16`}
            >
              <Link to={`/project/${p.slug}`} data-testid={`project-card-${p.slug}`} className="block group">
                <div className="overflow-hidden">
                  <img
                    src={p.cover}
                    alt={p.title}
                    style={{ objectPosition: p.cover_position || (p.images?.[0]?.position) || "center" }}
                    className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <span className="mono text-mute">{pad(worldIndex(p))}</span>
                  <span className="mono text-mute">{WORLDS[p.world]?.title}</span>
                </div>
                <h2 className="display text-3xl md:text-4xl mt-2">{p.title}</h2>
                <p className="serif italic text-mute mt-2">{p.operations.join(". ")}.</p>
                <p className="mono text-mute mt-3">
                  {p.category} — {p.year}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Three bodies of work */}
      <section className="px-4 md:px-10 pt-16" data-testid="two-worlds">
        <div className="hairline-b pb-4">
          <span className="mono text-mute">03 — Three bodies of work</span>
        </div>
        <div className="grid grid-cols-12 gap-6 mt-14">
          {Object.values(WORLDS).map((w, i) => {
            const first = byWorld(w.key)[0];
            return (
              <Reveal key={w.key} delay={i * 0.12} className="col-span-12 md:col-span-4 mb-12">
                <Link to={w.path} data-testid={`world-card-${w.key}`} className="block group">
                  {first && (
                    <div className="overflow-hidden">
                      <img
                        src={first.cover}
                        alt={w.title}
                        className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex justify-between mt-4">
                    <span className="mono text-mute">{w.index}</span>
                    <span className="mono text-ink group-hover:text-accent transition-colors">Enter →</span>
                  </div>
                  <h2 className="display text-3xl md:text-4xl mt-2">{w.title}</h2>
                  <p className="text-sm text-mute max-w-md leading-relaxed mt-3">{w.description}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Practice */}
      <section className="px-4 md:px-10 pt-20" data-testid="practice-section">
        <div className="hairline-b pb-4">
          <span className="mono text-mute">04 — Practice</span>
        </div>
        <Reveal className="grid grid-cols-12 gap-6 mt-16 items-center">
          <h2 className="serif text-3xl md:text-5xl col-span-12 md:col-span-8 leading-tight">
            A studio working between architecture and the object.
          </h2>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <Link to="/about" data-testid="about-link" className="mono text-ink hover:text-accent transition-colors">
              About the studio →
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
