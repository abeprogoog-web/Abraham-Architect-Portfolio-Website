import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchAbout } from "@/lib/api";

export default function About() {
  const [about, setAbout] = useState(null);

  useEffect(() => {
    fetchAbout().then(setAbout).catch(() => {});
  }, []);

  const bio = about?.bio || [];
  const facts = about?.facts || [];

  return (
    <div data-testid="about-page">
      <Seo
        title="About — abearchitectstudio"
        siteName="abearchitectstudio"
        description="abearchitectstudio is an independent design practice investigating how a single operation can transform a space or an object."
      />
      <section className="px-4 md:px-10 pt-40 md:pt-32">
        <div className="mono text-mute">04 / About</div>
        <h1 className="display lowercase text-[9vw] md:text-[7.5vw] mt-10 break-words" data-testid="about-title">
          <MaskedLine delay={0.1}>abearchitectstudio</MaskedLine>
        </h1>
        <Reveal className="grid grid-cols-12 gap-6 mt-16">
          <p className="serif text-2xl md:text-4xl col-span-12 md:col-span-8 leading-snug" data-testid="about-intro">
            {about?.intro}
          </p>
        </Reveal>
        <Reveal className="grid grid-cols-12 gap-6 mt-16">
          <div className="col-span-12 md:col-span-6 md:col-start-4">
            {bio.map((para, i) => (
              <p
                key={i}
                className={`text-sm leading-relaxed text-mute ${i > 0 ? "mt-6" : ""}`}
                data-testid={`about-bio-${i}`}
              >
                {para}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-12 gap-6 mt-20">
          <div className="col-span-12 md:col-span-6 md:col-start-4 hairline-t" data-testid="about-facts">
            {facts.map((f, i) => (
              <div key={i} className="hairline-b py-4 grid grid-cols-12 gap-4" data-testid={`about-fact-${i}`}>
                <span className="mono text-mute col-span-4">{f.label}</span>
                <span className="text-sm col-span-8">{f.value}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-12 gap-6 mt-20">
          <div className="col-span-12 md:col-span-6 md:col-start-4">
            <div className="mono text-mute mb-4">Contact</div>
            <div className="flex flex-col gap-2 text-sm">
              <a href={`mailto:${about?.email}`} data-testid="about-email" className="hover:opacity-60 transition-opacity">
                {about?.email}
              </a>
              <a
                href={`https://instagram.com/${(about?.instagram || "").replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="about-instagram"
                className="hover:opacity-60 transition-opacity"
              >
                {about?.instagram}
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
