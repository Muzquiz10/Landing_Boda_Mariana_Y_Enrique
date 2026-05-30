import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getStorage,
  ref,
  list,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

const gallery = document.getElementById("gallery");
const status = document.getElementById("status");
const loadMoreBtn = document.getElementById("load-more");
const fullscreen = document.getElementById("fullscreen");
const fullscreenImg = document.getElementById("fullscreen-img");
const fullscreenVideo = document.getElementById("fullscreen-video");

const STORAGE_PREFIX = "boda";
const LIST_PAGE_SIZE = 100;
const RENDER_PAGE_SIZE = 24;

let mediaItems = [];
let renderedCount = 0;
let currentIndex = 0;
let viewerRequestId = 0;
let thumbObserver;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartTime = 0;
let isPointerSwipe = false;
const preloadedUrls = new Set();

function initGalleryPage() {
  document.getElementById("close-btn").addEventListener("click", closeFullscreen);
  document.getElementById("next-btn").addEventListener("click", nextMedia);
  document.getElementById("prev-btn").addEventListener("click", prevMedia);
  loadMoreBtn.addEventListener("click", renderNextBatch);

  loadGallery();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGalleryPage);
} else {
  initGalleryPage();
}

document.addEventListener("keydown", (event) => {
  if (!fullscreen.classList.contains("active")) return;

  if (event.key === "ArrowRight") nextMedia();
  if (event.key === "ArrowLeft") prevMedia();
  if (event.key === "Escape") closeFullscreen();
});

fullscreen.addEventListener("pointerdown", startSwipe);
fullscreen.addEventListener("pointerup", finishSwipe);
fullscreen.addEventListener("pointercancel", cancelSwipe);
fullscreen.addEventListener("touchstart", startTouchSwipe, { passive: true });
fullscreen.addEventListener("touchend", finishTouchSwipe, { passive: true });
fullscreen.addEventListener("touchcancel", cancelSwipe, { passive: true });

fullscreen.addEventListener("click", (event) => {
  if (event.target.id === "fullscreen") {
    closeFullscreen();
  }
});

async function loadGallery() {
  status.innerText = "Cargando galeria...";
  gallery.innerHTML = "";
  loadMoreBtn.hidden = true;

  try {
    const refs = await listStorageRefs();
    mediaItems = buildMediaItems(refs);

    if (!mediaItems.length) {
      status.innerText = "Aun no hay fotos ni videos.";
      return;
    }

    status.innerText = "";
    renderedCount = 0;
    setupThumbObserver();
    renderNextBatch();
  } catch (error) {
    console.error(error);
    status.innerText = "Error cargando la galeria.";
  }
}

async function listStorageRefs() {
  const folderRef = ref(storage, `${STORAGE_PREFIX}/`);
  const refs = [];
  let pageToken;

  do {
    const page = await list(folderRef, {
      maxResults: LIST_PAGE_SIZE,
      pageToken
    });

    refs.push(...page.items);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return refs;
}

function buildMediaItems(refs) {
  const imageThumbs = new Map();
  const videoThumbs = new Map();

  refs.forEach((itemRef) => {
    const name = itemRef.name.toLowerCase();

    if (name.endsWith("_video_thumb.jpg")) {
      videoThumbs.set(name.replace(/_video_thumb\.jpg$/, ""), itemRef);
      return;
    }

    if (name.endsWith("_thumb.jpg")) {
      imageThumbs.set(name.replace(/_thumb\.jpg$/, ""), itemRef);
    }
  });

  return refs
    .map((itemRef) => createMediaItem(itemRef, imageThumbs, videoThumbs))
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function createMediaItem(itemRef, imageThumbs, videoThumbs) {
  const lowerName = itemRef.name.toLowerCase();

  if (lowerName.endsWith("_thumb.jpg") || lowerName.endsWith("_video_thumb.jpg")) {
    return null;
  }

  if (isNewImage(lowerName)) {
    const id = lowerName.replace(/_full\.[a-z0-9]+$/, "");

    return {
      type: "image",
      fullRef: itemRef,
      thumbRef: imageThumbs.get(id) || null,
      legacy: false,
      createdAt: getTimestamp(itemRef.name)
    };
  }

  if (isNewVideo(lowerName)) {
    const id = lowerName.replace(/_video\.[a-z0-9]+$/, "");

    return {
      type: "video",
      fullRef: itemRef,
      thumbRef: videoThumbs.get(id) || null,
      legacy: false,
      createdAt: getTimestamp(itemRef.name)
    };
  }

  if (isImageName(lowerName)) {
    return {
      type: "image",
      fullRef: itemRef,
      thumbRef: null,
      legacy: true,
      createdAt: getTimestamp(itemRef.name)
    };
  }

  if (isVideoName(lowerName)) {
    return {
      type: "video",
      fullRef: itemRef,
      thumbRef: null,
      legacy: true,
      createdAt: getTimestamp(itemRef.name)
    };
  }

  return null;
}

function renderNextBatch() {
  const end = Math.min(renderedCount + RENDER_PAGE_SIZE, mediaItems.length);

  for (let index = renderedCount; index < end; index += 1) {
    gallery.appendChild(createCard(mediaItems[index], index));
  }

  renderedCount = end;
  loadMoreBtn.hidden = renderedCount >= mediaItems.length;
}

function createCard(item, index) {
  const card = document.createElement("button");
  card.className = `photo-card ${item.type === "video" ? "video-card" : ""}`;
  card.type = "button";
  card.dataset.index = index;
  card.setAttribute("aria-label", item.type === "video" ? "Abrir video" : "Abrir foto");
  card.addEventListener("click", () => openFullscreen(index));

  const placeholder = document.createElement("span");
  placeholder.className = "thumb-placeholder";
  placeholder.textContent = item.type === "video" ? "Video" : "Foto";
  card.appendChild(placeholder);

  if (item.type === "video") {
    const badge = document.createElement("span");
    badge.className = "play-badge";
    badge.textContent = "Video";
    card.appendChild(badge);
  }

  thumbObserver.observe(card);
  return card;
}

function setupThumbObserver() {
  if (thumbObserver) {
    thumbObserver.disconnect();
  }

  thumbObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        observer.unobserve(entry.target);
        loadCardThumb(entry.target);
      });
    },
    { rootMargin: "250px" }
  );
}

async function loadCardThumb(card) {
  const item = mediaItems[Number(card.dataset.index)];
  if (!item || item.thumbLoaded) return;

  item.thumbLoaded = true;

  if (!item.thumbRef && (item.legacy || item.type === "video")) {
    card.classList.add("no-thumb");
    return;
  }

  try {
    const url = await getMediaUrl(item, "thumb");
    const img = document.createElement("img");
    img.src = url;
    img.alt = item.type === "video" ? "Video de la boda" : "Foto de la boda";
    img.loading = "lazy";
    img.decoding = "async";
    card.prepend(img);
    card.classList.add("loaded");
  } catch (error) {
    console.warn("No se pudo cargar la miniatura", error);
    card.classList.add("no-thumb");
  }
}

async function getMediaUrl(item, size) {
  const cacheKey = size === "thumb" ? "thumbUrl" : "fullUrl";

  if (item[cacheKey]) {
    return item[cacheKey];
  }

  if (size === "thumb" && !item.thumbRef && (item.legacy || item.type === "video")) {
    throw new Error("Este archivo no tiene miniatura ligera.");
  }

  const targetRef = size === "thumb" && item.thumbRef ? item.thumbRef : item.fullRef;
  item[cacheKey] = await getDownloadURL(targetRef);
  return item[cacheKey];
}

function openFullscreen(index) {
  currentIndex = index;
  fullscreen.classList.add("active");
  updateFullscreenMedia();
}

function closeFullscreen() {
  fullscreen.classList.remove("active");
  fullscreenVideo.pause();
  fullscreenVideo.removeAttribute("src");
  fullscreenVideo.load();
}

function nextMedia() {
  currentIndex = (currentIndex + 1) % mediaItems.length;
  updateFullscreenMedia();
}

function prevMedia() {
  currentIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
  updateFullscreenMedia();
}

async function updateFullscreenMedia() {
  const requestId = ++viewerRequestId;
  const item = mediaItems[currentIndex];
  if (!item) return;

  fullscreen.classList.add("loading");
  fullscreenImg.hidden = true;
  fullscreenVideo.hidden = true;
  fullscreenVideo.pause();
  fullscreenVideo.removeAttribute("src");

  try {
    const url = await getMediaUrl(item, "full");
    if (requestId !== viewerRequestId) return;

    if (item.type === "video") {
      fullscreenVideo.src = url;
      fullscreenVideo.hidden = false;
      fullscreenVideo.load();
    } else {
      await loadImageElement(fullscreenImg, url);
      if (requestId !== viewerRequestId) return;

      fullscreenImg.hidden = false;
      preloadAdjacentImages(currentIndex);
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (requestId === viewerRequestId) {
      fullscreen.classList.remove("loading");
    }
  }
}

function startSwipe(event) {
  if (!fullscreen.classList.contains("active") || event.pointerType === "mouse") return;
  if (event.target === fullscreenVideo) return;

  startSwipeAt(event.clientX, event.clientY);
}

function finishSwipe(event) {
  finishSwipeAt(event.clientX, event.clientY);
}

function startTouchSwipe(event) {
  if (!fullscreen.classList.contains("active")) return;
  if (event.target === fullscreenVideo || !event.touches.length) return;

  startSwipeAt(event.touches[0].clientX, event.touches[0].clientY);
}

function finishTouchSwipe(event) {
  if (!event.changedTouches.length) return;

  finishSwipeAt(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
}

function startSwipeAt(clientX, clientY) {
  pointerStartX = clientX;
  pointerStartY = clientY;
  pointerStartTime = Date.now();
  isPointerSwipe = true;
}

function finishSwipeAt(clientX, clientY) {
  if (!isPointerSwipe) return;

  const deltaX = clientX - pointerStartX;
  const deltaY = clientY - pointerStartY;
  const elapsed = Date.now() - pointerStartTime;
  const horizontalSwipe = Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

  isPointerSwipe = false;

  if (!horizontalSwipe || elapsed > 900) return;

  if (deltaX < 0) {
    nextMedia();
  } else {
    prevMedia();
  }
}

function cancelSwipe() {
  isPointerSwipe = false;
}

function preloadAdjacentImages(index) {
  [getPreviousIndex(index), getNextIndex(index)].forEach((adjacentIndex) => {
    const item = mediaItems[adjacentIndex];

    if (!item || item.type !== "image") return;

    getMediaUrl(item, "full")
      .then((url) => preloadImage(url))
      .catch(() => {});
  });
}

function preloadImage(url) {
  if (preloadedUrls.has(url)) return;

  preloadedUrls.add(url);

  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function loadImageElement(image, url) {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("No se pudo cargar la foto."));
    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      resolve();
    }
  });
}

function getPreviousIndex(index) {
  return (index - 1 + mediaItems.length) % mediaItems.length;
}

function getNextIndex(index) {
  return (index + 1) % mediaItems.length;
}

function getTimestamp(name) {
  const match = name.match(/^(\d{13})/);
  return match ? Number(match[1]) : 0;
}

function isNewImage(name) {
  return /_full\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}

function isNewVideo(name) {
  return /_video\.(mp4|mov|m4v|webm|ogg)$/i.test(name);
}

function isImageName(name) {
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name);
}

function isVideoName(name) {
  return /\.(mp4|mov|m4v|webm|ogg)$/i.test(name);
}
