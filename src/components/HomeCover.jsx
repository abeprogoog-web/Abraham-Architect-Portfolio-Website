import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchHomeIntro } from "@/lib/api";

const LOGO_URL = "/logo.webp";

export default function HomeCover() {
  const [bgImage, setBgImage] = useState("");
  const [bgPosition, setBgPosition] = useState("center");

  useEffect(() => {
    fetchHomeIntro()
      .then((d) => {
        setBgImage(d.bg_image || "");
        setBgPosition(d.bg_position || "center");
      })
      .catch(() => {});
  }, []);

  return (
    <section
      className="relative w-full h-[100vh] overflow-hidden bg-paper flex items-center justify-center"
      data-testid="home-cover"
    >
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          style={{ objectPosition: bgPosition }}
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          data-testid="home-cover-bg"
        />
      )}
      <motion.img
        src={LOGO_URL}
        alt="Abraham — Conceptual & Experimental"
        initial={{ opacity: 0, scale: 0.9, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[70vw] max-w-md md:max-w-3xl h-auto object-contain"
      />
      <span className="absolute bottom-8 left-1/2 -translate-x-1/2 mono text-mute">Scroll ↓</span>
    </section>
  );
}
