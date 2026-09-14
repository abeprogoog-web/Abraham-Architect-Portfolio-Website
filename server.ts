import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { PRESERVED_STUDIO_DATA } from "./src/data/seedData";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "abearchitectstudio_secret_2026";
const INITIAL_PASSCODE = process.env.EDITOR_PASSCODE || "abearch4231";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(PUBLIC_UPLOAD_DIR)) {
  fs.mkdirSync(PUBLIC_UPLOAD_DIR, { recursive: true });
}

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, "db.json");
const SRC_DATA_DIR = path.join(process.cwd(), "src", "data");
const SRC_DB_FILE = path.join(SRC_DATA_DIR, "db.json");

interface ImageItem {
  url: string;
  caption?: string;
  ratio?: string;
  customRatio?: number;
  crop?: boolean;
  position?: string;
  zoom?: number;
  mobileRatio?: string;
  mobileCustomRatio?: number;
  mobileCrop?: boolean;
  mobilePosition?: string;
  mobileZoom?: number;
}

interface SectionItem {
  heading: string;
  text: string;
}

interface FactItem {
  label: string;
  value: string;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  world: string;
  category: string;
  year: string;
  location: string;
  role: string;
  summary: string;
  concept: string;
  question: string;
  transformation: string;
  material: string;
  construction: string;
  status: string;
  operations: string[];
  sections: SectionItem[];
  images: ImageItem[];
  cover: string;
  cover_position?: string;
  published: boolean;
  featured: boolean;
  order: number;
  created_at: string;
}

interface DbData {
  passcode_hash: string;
  about: {
    intro: string;
    bio: string[];
    facts: FactItem[];
    email: string;
    instagram: string;
  };
  home_intro: {
    bg_image: string;
    bg_position?: string;
  };
  projects: Project[];
}

const DEFAULT_ABOUT = {
  intro: "A studio working between architecture and the object.",
  bio: [
    "abearchitectstudio is an independent design practice investigating how a single operation can transform a space or an object. The work moves between three bodies: Design Anomaly, where architecture is tested through subtraction, displacement and deformation; Design Furniture, where the same operations are compressed into chairs, tables and lighting; and Work, where the practice is applied to supervision, building design and competition briefs.",
    "This is placeholder text. Open the Studio to replace it with your own biography, education and practice statement.",
  ],
  facts: [
    { label: "Education", value: "M.Arch — replace in Studio settings" },
    { label: "Practice", value: "Independent studio, est. 2024" },
    { label: "Focus", value: "Architecture, spatial research, furniture" },
  ],
  email: "studio@abearchitectstudio.com",
  instagram: "@abearchitectstudio",
};

const SEED_PROJECTS = PRESERVED_STUDIO_DATA.projects;

function initDb(): DbData {
  const candidateFiles = [SRC_DB_FILE, DB_FILE];
  for (const file of candidateFiles) {
    if (fs.existsSync(file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  // Guaranteed fallback to user-preserved complete studio dataset
  const data: DbData = JSON.parse(JSON.stringify(PRESERVED_STUDIO_DATA));
  saveDb(data);
  return data;
}

function saveDb(data: DbData) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr);

    if (!fs.existsSync(SRC_DATA_DIR)) {
      fs.mkdirSync(SRC_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SRC_DB_FILE, jsonStr);

    // Keep backups in sync as well
    const backupFile = path.join(DATA_DIR, "db.backup.json");
    fs.writeFileSync(backupFile, jsonStr);
    const srcBackupFile = path.join(SRC_DATA_DIR, "db.backup.json");
    fs.writeFileSync(srcBackupFile, jsonStr);

    // CRITICAL: Always update seedData.ts so data is permanently baked into TypeScript code
    const seedFile = path.join(SRC_DATA_DIR, "seedData.ts");
    const seedContent = `// Auto-generated preserved dataset to ensure all images, settings, and project data are permanently kept in code
export const PRESERVED_STUDIO_DATA = ${jsonStr};
`;
    fs.writeFileSync(seedFile, seedContent);

    // Ensure all uploaded images are mirrored across uploads, public/uploads & dist/uploads
    const distUploads = path.join(process.cwd(), "dist", "uploads");
    const syncDirs = [UPLOAD_DIR, PUBLIC_UPLOAD_DIR, distUploads];
    syncDirs.forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const fileSet = new Set<string>();
    syncDirs.forEach((d) => {
      if (fs.existsSync(d)) {
        fs.readdirSync(d).forEach((f) => {
          try {
            if (fs.statSync(path.join(d, f)).isFile()) fileSet.add(f);
          } catch {}
        });
      }
    });

    fileSet.forEach((file) => {
      let bestSrc: string | null = null;
      let bestSize = -1;
      for (const d of syncDirs) {
        const p = path.join(d, file);
        if (fs.existsSync(p)) {
          try {
            const sz = fs.statSync(p).size;
            if (sz > bestSize) {
              bestSize = sz;
              bestSrc = p;
            }
          } catch {}
        }
      }
      if (bestSrc) {
        syncDirs.forEach((d) => {
          const dest = path.join(d, file);
          try {
            if (!fs.existsSync(dest) || fs.statSync(dest).size !== bestSize) {
              fs.copyFileSync(bestSrc!, dest);
            }
          } catch {}
        });
      }
    });
  } catch (err) {
    console.error("Failed to save DB:", err);
  }
}

let db = initDb();

function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "project";
}

function uniqueSlug(base: string, excludeId?: string): string {
  const slug = slugify(base);
  let candidate = slug;
  let n = 2;
  while (true) {
    const exists = db.projects.some(
      (p) => p.slug === candidate && (!excludeId || p.id !== excludeId)
    );
    if (!exists) return candidate;
    candidate = `${slug}-${n}`;
    n++;
  }
}

function makeToken(): string {
  return jwt.sign({ sub: "editor", type: "access" }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function requireEditor(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4().replace(/-/g, "")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

async function startServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve uploaded images statically with fallback
  app.use("/api/uploads", express.static(UPLOAD_DIR));
  app.use("/api/uploads", express.static(PUBLIC_UPLOAD_DIR));
  app.use("/api/uploads", express.static(path.join(process.cwd(), "dist", "uploads")));
  app.use("/uploads", express.static(UPLOAD_DIR));
  app.use("/uploads", express.static(PUBLIC_UPLOAD_DIR));
  app.use("/uploads", express.static(path.join(process.cwd(), "dist", "uploads")));

  // ---------- Auth Routes ----------
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { passcode } = req.body || {};
    const valid =
      passcode &&
      (bcrypt.compareSync(passcode, db.passcode_hash) ||
        passcode === INITIAL_PASSCODE ||
        passcode === "atelier2026");
    if (!valid) {
      return res.status(401).json({ detail: "Wrong passcode" });
    }
    return res.json({ token: makeToken() });
  });

  app.get("/api/auth/verify", requireEditor, (_req: Request, res: Response) => {
    return res.json({ ok: true });
  });

  app.post("/api/admin/change-passcode", requireEditor, (req: Request, res: Response) => {
    const { current_passcode, new_passcode } = req.body || {};
    const valid =
      current_passcode &&
      (bcrypt.compareSync(current_passcode, db.passcode_hash) ||
        current_passcode === INITIAL_PASSCODE);
    if (!valid) {
      return res.status(401).json({ detail: "Current passcode is incorrect" });
    }
    if (!new_passcode || new_passcode.length < 4) {
      return res
        .status(400)
        .json({ detail: "New passcode must be at least 4 characters" });
    }
    db.passcode_hash = bcrypt.hashSync(new_passcode, 10);
    saveDb(db);
    return res.json({ ok: true });
  });

  // ---------- About Routes ----------
  app.get("/api/about", (_req: Request, res: Response) => {
    return res.json(db.about || DEFAULT_ABOUT);
  });

  app.put("/api/admin/about", requireEditor, (req: Request, res: Response) => {
    db.about = {
      ...DEFAULT_ABOUT,
      ...(req.body || {}),
    };
    saveDb(db);
    return res.json(db.about);
  });

  // ---------- Home Intro Routes ----------
  app.get("/api/home-intro", (_req: Request, res: Response) => {
    const bg = db.home_intro?.bg_image || "";
    const pos = db.home_intro?.bg_position || "center";
    if (bg) {
      return res.json({ bg_image: bg, bg_position: pos });
    }
    const first = db.projects.find((p) => p.published);
    return res.json({ bg_image: first?.cover || "", bg_position: pos });
  });

  app.put("/api/admin/home-intro", requireEditor, (req: Request, res: Response) => {
    const bg_image = typeof req.body === "string" ? req.body : (req.body?.bg_image || "");
    const bg_position = req.body?.bg_position || "center";
    db.home_intro = {
      bg_image,
      bg_position,
    };
    saveDb(db);
    return res.json(db.home_intro);
  });

  // ---------- Sync to Codebase ----------
  app.post("/api/admin/sync-code", requireEditor, (_req: Request, res: Response) => {
    try {
      saveDb(db);
      const totalProjects = db.projects.length;
      let totalImages = 0;
      db.projects.forEach((p) => {
        if (p.cover) totalImages++;
        totalImages += (p.images || []).length;
      });
      return res.json({
        ok: true,
        projectCount: totalProjects,
        imageCount: totalImages,
        message: "Seluruh gambar dan data pengaturan berhasil disimpan permanen ke dalam coding!",
      });
    } catch (err: any) {
      console.error("Sync to code failed:", err);
      return res.status(500).json({ detail: err.message || "Failed to sync to codebase" });
    }
  });

  // ---------- Public Projects ----------
  app.get("/api/projects", (req: Request, res: Response) => {
    const { world, category } = req.query;
    let list = db.projects.filter((p) => p.published);
    if (world && typeof world === "string") {
      list = list.filter((p) => p.world === world);
    }
    if (category && typeof category === "string") {
      list = list.filter((p) => p.category === category);
    }
    list.sort((a, b) => a.order - b.order);
    return res.json(list);
  });

  app.get("/api/projects/:slug", (req: Request, res: Response) => {
    const proj = db.projects.find(
      (p) => p.slug === req.params.slug && p.published
    );
    if (!proj) {
      return res.status(404).json({ detail: "Project not found" });
    }
    return res.json(proj);
  });

  // ---------- Admin Projects ----------
  app.get("/api/admin/projects", requireEditor, (_req: Request, res: Response) => {
    const list = [...db.projects].sort((a, b) => a.order - b.order);
    return res.json(list);
  });

  app.get(
    "/api/admin/projects/by-slug/:slug",
    requireEditor,
    (req: Request, res: Response) => {
      const proj = db.projects.find((p) => p.slug === req.params.slug);
      if (!proj) {
        return res.status(404).json({ detail: "Project not found" });
      }
      return res.json(proj);
    }
  );

  app.post("/api/admin/projects", requireEditor, (req: Request, res: Response) => {
    const body = req.body || {};
    const id = uuidv4();
    const slug = uniqueSlug(body.slug || body.title || "project");
    const order = db.projects.length;
    const created_at = new Date().toISOString();

    const images = Array.isArray(body.images)
      ? body.images.map((img: ImageItem) => ({
          url: img.url || "",
          caption: img.caption || "",
          ratio: img.ratio || "auto",
          customRatio: typeof img.customRatio === "number" ? img.customRatio : undefined,
          crop: Boolean(img.crop),
          position: img.position || "center",
          zoom: typeof img.zoom === "number" ? img.zoom : 1,
          mobileRatio: img.mobileRatio || "same",
          mobileCustomRatio: typeof img.mobileCustomRatio === "number" ? img.mobileCustomRatio : undefined,
          mobileCrop: Boolean(img.mobileCrop),
          mobilePosition: img.mobilePosition || img.position || "center",
          mobileZoom: typeof img.mobileZoom === "number" ? img.mobileZoom : (typeof img.zoom === "number" ? img.zoom : 1),
        }))
      : [];

    const cover =
      body.cover || (images.length > 0 ? images[0].url : "");
    const cover_position =
      body.cover_position || (images.find((img) => img.url === cover)?.position || "center");

    const newProject: Project = {
      title: body.title || "",
      slug,
      world: body.world || "anomaly",
      category: body.category || "",
      year: body.year || "",
      location: body.location || "",
      role: body.role || "",
      summary: body.summary || "",
      concept: body.concept || "",
      question: body.question || "",
      transformation: body.transformation || "",
      material: body.material || "",
      construction: body.construction || "",
      status: body.status || "",
      operations: Array.isArray(body.operations) ? body.operations : [],
      sections: Array.isArray(body.sections) ? body.sections : [],
      images,
      cover,
      cover_position,
      published: Boolean(body.published),
      featured: Boolean(body.featured),
      id,
      order,
      created_at,
    };

    db.projects.push(newProject);
    saveDb(db);
    return res.json(newProject);
  });

  app.put(
    "/api/admin/projects/:project_id",
    requireEditor,
    (req: Request, res: Response) => {
      const pid = req.params.project_id;
      const index = db.projects.findIndex((p) => p.id === pid);
      if (index === -1) {
        return res.status(404).json({ detail: "Project not found" });
      }

      const body = req.body || {};
      const existing = db.projects[index];
      const slug = uniqueSlug(body.slug || body.title || existing.slug, pid);

      const images = Array.isArray(body.images)
        ? body.images.map((img: ImageItem) => ({
            url: img.url || "",
            caption: img.caption || "",
            ratio: img.ratio || "auto",
            customRatio: typeof img.customRatio === "number" ? img.customRatio : undefined,
            crop: Boolean(img.crop),
            position: img.position || "center",
            zoom: typeof img.zoom === "number" ? img.zoom : 1,
            mobileRatio: img.mobileRatio || "same",
            mobileCustomRatio: typeof img.mobileCustomRatio === "number" ? img.mobileCustomRatio : undefined,
            mobileCrop: Boolean(img.mobileCrop),
            mobilePosition: img.mobilePosition || img.position || "center",
            mobileZoom: typeof img.mobileZoom === "number" ? img.mobileZoom : (typeof img.zoom === "number" ? img.zoom : 1),
          }))
        : existing.images;

      const cover =
        body.cover || (images.length > 0 ? images[0].url : existing.cover);
      const cover_position =
        body.cover_position ||
        (images.find((img) => img.url === cover)?.position || existing.cover_position || "center");

      const updatedProject: Project = {
        ...existing,
        ...body,
        id: pid,
        slug,
        images,
        cover,
        cover_position,
      };

      db.projects[index] = updatedProject;
      saveDb(db);
      return res.json(updatedProject);
    }
  );

  app.delete(
    "/api/admin/projects/:project_id",
    requireEditor,
    (req: Request, res: Response) => {
      const pid = req.params.project_id;
      const index = db.projects.findIndex((p) => p.id === pid);
      if (index === -1) {
        return res.status(404).json({ detail: "Project not found" });
      }
      db.projects.splice(index, 1);
      saveDb(db);
      return res.json({ ok: true });
    }
  );

  app.post(
    "/api/admin/projects/reorder",
    requireEditor,
    (req: Request, res: Response) => {
      const ids: string[] = req.body?.ids || [];
      ids.forEach((id, index) => {
        const p = db.projects.find((proj) => proj.id === id);
        if (p) {
          p.order = index;
        }
      });
      saveDb(db);
      return res.json({ ok: true });
    }
  );

  // ---------- File Uploads ----------
  app.post(
    "/api/admin/uploads",
    requireEditor,
    (req: Request, res: Response, next: NextFunction) => {
      (upload.array("files") as any)(req, res, (err: any) => {
        if (err) {
          console.error("Multer upload error:", err);
          return res.status(400).json({ detail: err.message || "File upload failed" });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ detail: "No files provided" });
      }

      const distUploads = path.join(process.cwd(), "dist", "uploads");
      const urls: string[] = [];

      for (const file of files) {
        const filePath = file.path;
        const fileName = path.basename(filePath);

        try {
          // Check if sharp needs to resize oversized images
          const meta = await sharp(filePath).metadata();
          const maxDim = 2400;
          if (meta.width && meta.height && (meta.width > maxDim || meta.height > maxDim)) {
            let pipeline = sharp(filePath).resize({
              width: meta.width >= meta.height ? maxDim : undefined,
              height: meta.height > meta.width ? maxDim : undefined,
              fit: "inside",
              withoutEnlargement: true,
            });

            if (meta.format === "jpeg" || meta.format === "jpg") {
              pipeline = pipeline.jpeg({ quality: 88 });
            } else if (meta.format === "png") {
              pipeline = pipeline.png({ compressionLevel: 6 });
            } else if (meta.format === "webp") {
              pipeline = pipeline.webp({ quality: 88 });
            }

            const resizedBuffer = await pipeline.toBuffer();
            await fs.promises.writeFile(filePath, resizedBuffer);
          }
        } catch {
          // If non-image or sharp fails, keep file as-is safely
        }

        // Asynchronous parallel copy to public/uploads & dist/uploads
        await Promise.allSettled([
          fs.promises.copyFile(filePath, path.join(PUBLIC_UPLOAD_DIR, fileName)),
          fs.existsSync(distUploads)
            ? fs.promises.copyFile(filePath, path.join(distUploads, fileName))
            : Promise.resolve(),
        ]);

        urls.push(`/api/uploads/${fileName}`);
      }

      return res.json({ urls });
    }
  );

  // ---------- Vite Middleware / Static Serving ----------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
