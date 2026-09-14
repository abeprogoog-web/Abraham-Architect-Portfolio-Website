const WORDS = [
  "Subtraction", "Displacement", "Distortion", "Compression", "Folding",
  "Peeling", "Twisting", "Tension", "Void", "Collision", "Interruption",
  "Deformation", "Transformation",
];

export default function Marquee() {
  return (
    <div className="relative z-10 overflow-hidden hairline-t hairline-b py-5 bg-paper" data-testid="operations-marquee">
      <div className="marquee-track">
        {[0, 1].map((chunk) => (
          <div key={chunk} className="marquee-chunk">
            {WORDS.map((w) => (
              <span key={`${chunk}-${w}`} className="mono text-mute mx-8 whitespace-nowrap">
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
