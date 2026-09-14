import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 hairline-t mt-24">
      <div className="px-4 md:px-10 pt-16 pb-8">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <img
              src="https://customer-assets-lqy194kg.emergentagent.net/job_spatial-editor/artifacts/lrofb11j_LOGO%20TERBARU-01.webp"
              alt="Abraham — Conceptual & Experimental"
              data-testid="footer-wordmark"
              className="h-14 md:h-20 w-auto object-contain"
            />
            <div className="mono text-mute mt-3">
              Architecture, objects and spatial experiments
            </div>
          </div>
          <div className="col-span-6 md:col-span-2 md:col-start-9">
            <div className="mono text-mute mb-4">Index</div>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/anomaly" data-testid="footer-link-anomaly" className="hover:opacity-60 transition-opacity">Design Anomaly</Link>
              <Link to="/furniture" data-testid="footer-link-furniture" className="hover:opacity-60 transition-opacity">Design Furniture</Link>
              <Link to="/about" data-testid="footer-link-about" className="hover:opacity-60 transition-opacity">About</Link>
            </div>
          </div>
          <div className="col-span-6 md:col-span-2 md:col-start-11">
            <div className="mono text-mute mb-4">Contact</div>
            <div className="flex flex-col gap-2 text-sm">
              <a href="mailto:studio@abearchitectstudio.com" data-testid="footer-email" className="hover:opacity-60 transition-opacity">
                studio@abearchitectstudio.com
              </a>
              <a href="https://instagram.com/abearchitectstudio" target="_blank" rel="noopener noreferrer" data-testid="footer-instagram" className="hover:opacity-60 transition-opacity">
                @abearchitectstudio
              </a>
              <span>Europe</span>
            </div>
          </div>
        </div>
        <div className="hairline-t mt-12 pt-4 flex flex-col md:flex-row justify-between gap-2">
          <span className="mono text-mute">© 2026 abearchitectstudio</span>
          <span className="mono text-mute">Architecture — Objects — Spatial research</span>
        </div>
      </div>
    </footer>
  );
}
