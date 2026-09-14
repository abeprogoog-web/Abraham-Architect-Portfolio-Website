import { useEffect, } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import ColumnGrid from "@/components/ColumnGrid";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Home from "@/pages/Home";
import World from "@/pages/World";
import ProjectDetail from "@/pages/ProjectDetail";
import About from "@/pages/About";
import Editor from "@/pages/editor/Editor";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main className="relative z-10 w-full max-w-full overflow-x-hidden">{children}</main>
      <SiteFooter />
    </>
  );
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <div className="App min-h-screen w-full max-w-full overflow-x-hidden">
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/anomaly" element={<PublicLayout><World worldKey="anomaly" /></PublicLayout>} />
          <Route path="/furniture" element={<PublicLayout><World worldKey="furniture" /></PublicLayout>} />
          <Route path="/work" element={<PublicLayout><World worldKey="work" /></PublicLayout>} />
          <Route path="/project/:slug" element={<PublicLayout><ProjectDetail /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
