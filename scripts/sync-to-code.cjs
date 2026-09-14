const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PUBLIC_UPLOAD_DIR = path.join(ROOT, "public", "uploads");
const DIST_UPLOAD_DIR = path.join(ROOT, "dist", "uploads");
const SRC_DATA_DIR = path.join(ROOT, "src", "data");
const DATA_DIR = path.join(ROOT, "data");

const SRC_DB_FILE = path.join(SRC_DATA_DIR, "db.json");
const DB_FILE = path.join(DATA_DIR, "db.json");
const SEED_FILE = path.join(SRC_DATA_DIR, "seedData.ts");

console.log("=== SINKRONISASI DATA & GAMBAR KE CODEBASE ===");

// 1. Ensure directories exist
[PUBLIC_UPLOAD_DIR, DIST_UPLOAD_DIR, SRC_DATA_DIR, DATA_DIR, UPLOAD_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Load latest DB
let currentDb = null;
const candidateFiles = [SRC_DB_FILE, DB_FILE, path.join(DATA_DIR, "db.backup.json"), path.join(SRC_DATA_DIR, "db.backup.json")];
for (const file of candidateFiles) {
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        currentDb = parsed;
        console.log(`Loaded database from: ${file} (${parsed.projects.length} projects)`);
        break;
      }
    } catch {}
  }
}

if (!currentDb) {
  console.error("Database file not found!");
  process.exit(1);
}

// 3. Pool and synchronize all files across uploads, public/uploads, and dist/uploads
const allUploadDirs = [UPLOAD_DIR, PUBLIC_UPLOAD_DIR, DIST_UPLOAD_DIR];
const allFilesSet = new Set();

allUploadDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((f) => {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isFile()) {
        allFilesSet.add(f);
      }
    });
  }
});

let syncedFiles = 0;
allFilesSet.forEach((fileName) => {
  // Find a valid source file that has non-zero size if possible
  let bestSrc = null;
  let bestSize = -1;

  for (const dir of allUploadDirs) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      const size = fs.statSync(candidate).size;
      if (size > bestSize) {
        bestSize = size;
        bestSrc = candidate;
      }
    }
  }

  if (bestSrc) {
    allUploadDirs.forEach((dir) => {
      const target = path.join(dir, fileName);
      try {
        if (!fs.existsSync(target) || fs.statSync(target).size !== bestSize) {
          fs.copyFileSync(bestSrc, target);
        }
      } catch (err) {
        console.warn(`Could not sync ${fileName} to ${dir}:`, err.message);
      }
    });
    syncedFiles++;
  }
});

console.log(`Synchronized ${syncedFiles} unique files across uploads, public/uploads, and dist/uploads.`);

// 4. Save DB JSON to all locations
const jsonStr = JSON.stringify(currentDb, null, 2);
fs.writeFileSync(SRC_DB_FILE, jsonStr);
fs.writeFileSync(DB_FILE, jsonStr);
fs.writeFileSync(path.join(DATA_DIR, "db.backup.json"), jsonStr);
fs.writeFileSync(path.join(SRC_DATA_DIR, "db.backup.json"), jsonStr);

// 5. Update seedData.ts to ensure permanent TypeScript inclusion
const seedContent = `// Auto-generated preserved dataset to ensure all images, settings, and project data are permanently kept in code
export const PRESERVED_STUDIO_DATA = ${jsonStr};
`;
fs.writeFileSync(SEED_FILE, seedContent);

console.log(`Updated seedData.ts with ${currentDb.projects.length} projects.`);
console.log("=== SINKRONISASI SUKSES 100% ===");
