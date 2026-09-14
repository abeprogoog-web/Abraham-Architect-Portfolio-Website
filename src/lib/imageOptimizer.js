/**
 * Client-side fast and safe image optimizer.
 * Handles single or multiple image uploads safely without freezing the browser or exhausting memory.
 */

const MAX_DIMENSION = 2400; // Optimal studio resolution
const SIZE_THRESHOLD = 1.2 * 1024 * 1024; // 1.2MB - files below this are uploaded directly

/**
 * Optimizes a single image file with strict safety timeouts and resilient fallbacks.
 * Never throws, never hangs, never blocks the main thread indefinitely.
 */
export async function preOptimizeImage(file) {
  // 1. Guard checks
  if (!file || !(file instanceof Blob) || !file.type || !file.type.startsWith("image/")) {
    return file;
  }

  // Preserve vectors, gifs, and already small files
  if (
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    file.size <= SIZE_THRESHOLD
  ) {
    return file;
  }

  return new Promise((resolve) => {
    let finished = false;
    const finish = (result) => {
      if (!finished) {
        finished = true;
        resolve(result);
      }
    };

    // Safety timeout: abort optimization after 3.5s and fallback to original file
    const timer = setTimeout(() => finish(file), 3500);

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);

        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // If dimensions are invalid or already reasonable, return original
          if (!width || !height || (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < 2.5 * 1024 * 1024)) {
            finish(file);
            return;
          }

          let targetWidth = width;
          let targetHeight = height;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width >= height) {
              targetWidth = MAX_DIMENSION;
              targetHeight = Math.round((height * MAX_DIMENSION) / width);
            } else {
              targetHeight = MAX_DIMENSION;
              targetWidth = Math.round((width * MAX_DIMENSION) / height);
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d", { alpha: file.type === "image/png" });

          if (!ctx) {
            finish(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const exportMime = file.type === "image/png" ? "image/png" : "image/jpeg";
          const quality = exportMime === "image/jpeg" ? 0.88 : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                finish(file);
                return;
              }

              const optimizedFile = new File([blob], file.name, {
                type: blob.type || exportMime,
                lastModified: Date.now(),
              });

              finish(optimizedFile);
            },
            exportMime,
            quality
          );
        } catch (e) {
          console.warn("Canvas resize skipped:", e);
          finish(file);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        finish(file);
      };

      // Set src to trigger load
      img.src = objectUrl;
    } catch (e) {
      clearTimeout(timer);
      console.warn("Pre-optimization skipped:", e);
      finish(file);
    }
  });
}

/**
 * Optimizes multiple files sequentially in queue to prevent browser memory spikes (OOM).
 */
export async function preOptimizeFiles(files) {
  if (!files || !files.length) return [];
  const list = Array.from(files);
  const results = [];

  for (const file of list) {
    try {
      const optimized = await preOptimizeImage(file);
      results.push(optimized);
    } catch {
      results.push(file);
    }
  }

  return results;
}
