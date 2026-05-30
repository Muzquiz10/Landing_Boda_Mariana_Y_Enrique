const input = document.getElementById("file");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3AXdqNjqbkOh2TGehZ2ZQrZ8ldsPOsCA",
  authDomain: "boda-mariana-y-enrique.firebaseapp.com",
  projectId: "boda-mariana-y-enrique",
  storageBucket: "boda-mariana-y-enrique.firebasestorage.app",
  messagingSenderId: "1027797408433",
  appId: "1:1027797408433:web:cf736bf0f847c32864e090"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

let authPromise = startAnonymousSession();

const preview = document.getElementById("preview");
const status = document.getElementById("status");
const progressWrapper = document.querySelector(".progress-wrapper");
const progressBar = document.getElementById("progress-bar");

const STORAGE_PREFIX = "boda";
const IMAGE_MAX_SIZE = 2048;
const THUMB_MAX_SIZE = 420;
const IMAGE_QUALITY = 0.82;
const THUMB_QUALITY = 0.74;
const CACHE_CONTROL = "public,max-age=31536000,immutable";
const MAX_VIDEO_SIZE_MB = 300;

let previewUrls = [];
let isUploading = false;

input.addEventListener("change", () => {
  renderPreview(Array.from(input.files));
});

window.upload = async () => {
  if (isUploading) return;

  const files = Array.from(input.files);

  if (!files.length) {
    setStatus("Selecciona al menos una foto o video.");
    return;
  }

  const oversizedVideo = files.find(
    (file) => isVideo(file) && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024
  );

  if (oversizedVideo) {
    setStatus(`"${oversizedVideo.name}" supera ${MAX_VIDEO_SIZE_MB} MB. Mejor sube un video mas corto.`);
    return;
  }

  const signedIn = await ensureAnonymousSession();

  if (!signedIn) {
    setStatus("No se pudo conectar con Firebase. Revisa la conexion e intentalo otra vez.");
    return;
  }

  isUploading = true;
  input.disabled = true;
  progressWrapper.style.display = "block";
  setProgress(0);

  try {
    let completedFiles = 0;

    for (const file of files) {
      setStatus(`Preparando ${completedFiles + 1} de ${files.length}: ${file.name}`);

      const jobs = await createUploadJobs(file);

      for (let jobIndex = 0; jobIndex < jobs.length; jobIndex += 1) {
        const job = jobs[jobIndex];
        await uploadBlob(job, ({ bytesTransferred, totalBytes }) => {
          const taskProgress = totalBytes ? bytesTransferred / totalBytes : 0;
          const fileProgress = (jobIndex + taskProgress) / jobs.length;
          const overallProgress = ((completedFiles + fileProgress) / files.length) * 100;
          setProgress(overallProgress);
        });
      }

      completedFiles += 1;
      setProgress((completedFiles / files.length) * 100);
    }

    setStatus("Archivos subidos. Gracias por compartirlos.");
    setProgress(100);
    input.value = "";
    renderPreview([]);
  } catch (error) {
    console.error(error);
    setStatus("No se pudieron subir los archivos. Intentalo de nuevo.");
  } finally {
    isUploading = false;
    input.disabled = false;
  }
};

function renderPreview(files) {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  preview.innerHTML = "";

  files.slice(0, 18).forEach((file) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);

    const frame = document.createElement("div");
    frame.className = "preview-item";

    if (isVideo(file)) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      frame.appendChild(video);

      const badge = document.createElement("span");
      badge.className = "media-badge";
      badge.textContent = "Video";
      frame.appendChild(badge);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.decoding = "async";
      frame.appendChild(img);
    }

    preview.appendChild(frame);
  });

  if (files.length > 18) {
    const counter = document.createElement("div");
    counter.className = "preview-more";
    counter.textContent = `+${files.length - 18}`;
    preview.appendChild(counter);
  }
}

async function createUploadJobs(file) {
  const id = createUploadId(file.name);

  if (isImage(file)) {
    const [optimizedResult, thumbResult] = await Promise.allSettled([
      resizeImage(file, IMAGE_MAX_SIZE, IMAGE_QUALITY),
      resizeImage(file, THUMB_MAX_SIZE, THUMB_QUALITY)
    ]);

    const optimized = getSettledValue(optimizedResult);
    const thumb = getSettledValue(thumbResult);
    const fullBlob = optimized?.size < file.size ? optimized : file;
    const fullType = fullBlob.type || file.type || "image/jpeg";
    const fullExtension = getImageExtension(fullType, file.name);
    const jobs = [
      {
        path: `${STORAGE_PREFIX}/${id}_full.${fullExtension}`,
        blob: fullBlob,
        metadata: buildMetadata(fullType, file.name, "image")
      }
    ];

    if (thumb) {
      jobs.push({
        path: `${STORAGE_PREFIX}/${id}_thumb.jpg`,
        blob: thumb,
        metadata: buildMetadata("image/jpeg", file.name, "image-thumb")
      });
    }

    return jobs;
  }

  if (isVideo(file)) {
    const jobs = [
      {
        path: `${STORAGE_PREFIX}/${id}_video.${getExtension(file.name, "mp4")}`,
        blob: file,
        metadata: buildMetadata(file.type || "video/mp4", file.name, "video")
      }
    ];

    const thumb = await createVideoThumbnail(file).catch(() => null);

    if (thumb) {
      jobs.push({
        path: `${STORAGE_PREFIX}/${id}_video_thumb.jpg`,
        blob: thumb,
        metadata: buildMetadata("image/jpeg", file.name, "video-thumb")
      });
    }

    return jobs;
  }

  throw new Error(`Tipo de archivo no soportado: ${file.type || file.name}`);
}

function uploadBlob(job, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, job.path), job.blob, job.metadata);

    task.on(
      "state_changed",
      (snapshot) => onProgress(snapshot),
      reject,
      resolve
    );
  });
}

async function resizeImage(file, maxSize, quality) {
  const bitmap = await loadImageBitmap(file);
  const { width, height } = getContainedSize(bitmap.width, bitmap.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(bitmap, 0, 0, width, height);

  if (typeof bitmap.close === "function") {
    bitmap.close();
  }

  return canvasToBlob(canvas, "image/jpeg", quality);
}

async function loadImageBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createVideoThumbnail(file) {
  const url = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    if (Number.isFinite(video.duration) && video.duration > 0.2) {
      video.currentTime = 0.2;

      await new Promise((resolve, reject) => {
        video.onseeked = resolve;
        video.onerror = reject;
      });
    }

    const { width, height } = getContainedSize(video.videoWidth, video.videoHeight, THUMB_MAX_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(video, 0, 0, width, height);

    return canvasToBlob(canvas, "image/jpeg", THUMB_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo procesar la imagen."));
        }
      },
      type,
      quality
    );
  });
}

function getContainedSize(width, height, maxSize) {
  const ratio = Math.min(maxSize / width, maxSize / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function buildMetadata(contentType, originalName, mediaType) {
  return {
    cacheControl: CACHE_CONTROL,
    contentType,
    customMetadata: {
      originalName,
      mediaType,
      uploadedAt: new Date().toISOString()
    }
  };
}

async function ensureAnonymousSession() {
  let credential = await authPromise;

  if (!credential) {
    authPromise = startAnonymousSession();
    credential = await authPromise;
  }

  return Boolean(credential);
}

function startAnonymousSession() {
  return signInAnonymously(auth).catch((error) => {
    console.error(error);
    return null;
  });
}

function createUploadId(name) {
  const baseName = name.replace(/\.[^/.]+$/, "");
  const safeName = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "archivo";
  const random = Math.random().toString(36).slice(2, 8);

  return `${Date.now()}_${random}_${safeName}`;
}

function getExtension(name, fallback) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : fallback;
}

function getImageExtension(contentType, name) {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  if (contentType.includes("heif")) return "heif";
  return getExtension(name, "jpg");
}

function getSettledValue(result) {
  return result.status === "fulfilled" ? result.value : null;
}

function isImage(file) {
  return file.type.startsWith("image/");
}

function isVideo(file) {
  return file.type.startsWith("video/");
}

function setStatus(message) {
  status.innerText = message;
}

function setProgress(value) {
  progressBar.style.width = `${Math.min(Math.max(value, 0), 100)}%`;
}
