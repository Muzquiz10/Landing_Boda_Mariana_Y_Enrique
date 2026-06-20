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
const selectionToggle = document.getElementById("selection-toggle");
const selectionToggleLabel = document.getElementById("selection-toggle-label");
const selectionActions = document.getElementById("selection-actions");
const selectionCount = document.getElementById("selection-count");
const downloadSelectedBtn = document.getElementById("download-selected");
const fullscreen = document.getElementById("fullscreen");
const fullscreenImg = document.getElementById("fullscreen-img");
const fullscreenVideo = document.getElementById("fullscreen-video");
const mediaStage = document.getElementById("media-stage");
const zoomSurface = document.getElementById("zoom-surface");
const zoomControls = document.getElementById("zoom-controls");
const zoomLevel = document.getElementById("zoom-level");
const viewerCounter = document.getElementById("viewer-counter");
const viewerDownloadBtn = document.getElementById("viewer-download");
const closeBtn = document.getElementById("close-btn");

const STORAGE_PREFIX = "boda";
const LIST_PAGE_SIZE = 100;
const RENDER_PAGE_SIZE = 24;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

let mediaItems = [];
let renderedCount = 0;
let currentIndex = 0;
let viewerRequestId = 0;
let thumbObserver;
let selectionMode = false;
let isBatchDownloading = false;
let lastFocusedElement = null;
let zoomScale = MIN_ZOOM;
let zoomX = 0;
let zoomY = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartTime = 0;
let panStartX = 0;
let panStartY = 0;
let gestureStartDistance = 0;
let gestureStartScale = MIN_ZOOM;
let gestureHadMultiplePointers = false;

const selectedIndices = new Set();
const preloadedUrls = new Set();
const activePointers = new Map();

function initGalleryPage() {
  closeBtn.addEventListener("click", closeFullscreen);
  document.getElementById("next-btn").addEventListener("click", nextMedia);
  document.getElementById("prev-btn").addEventListener("click", prevMedia);
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoomScale + ZOOM_STEP));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoomScale - ZOOM_STEP));
  document.getElementById("zoom-reset").addEventListener("click", resetZoom);
  loadMoreBtn.addEventListener("click", renderNextBatch);
  selectionToggle.addEventListener("click", () => setSelectionMode(!selectionMode));
  downloadSelectedBtn.addEventListener("click", downloadSelectedPhotos);
  viewerDownloadBtn.addEventListener("click", () => downloadItem(mediaItems[currentIndex], viewerDownloadBtn));

  mediaStage.addEventListener("pointerdown", startPointerGesture);
  mediaStage.addEventListener("pointermove", movePointerGesture);
  mediaStage.addEventListener("pointerup", finishPointerGesture);
  mediaStage.addEventListener("pointercancel", cancelPointerGesture);
  mediaStage.addEventListener("wheel", handleZoomWheel, { passive: false });
  zoomSurface.addEventListener("dblclick", toggleDoubleClickZoom);

  loadGallery();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGalleryPage);
} else {
  initGalleryPage();
}

document.addEventListener("keydown", (event) => {
  if (!fullscreen.classList.contains("active")) return;

  if (event.key === "ArrowRight" && zoomScale === MIN_ZOOM) nextMedia();
  if (event.key === "ArrowLeft" && zoomScale === MIN_ZOOM) prevMedia();
  if (event.key === "Escape") closeFullscreen();
  if (event.key === "+" || event.key === "=") setZoom(zoomScale + ZOOM_STEP);
  if (event.key === "-") setZoom(zoomScale - ZOOM_STEP);
  if (event.key === "0") resetZoom();
});

fullscreen.addEventListener("click", (event) => {
  if (event.target === fullscreen) {
    closeFullscreen();
  }
});

async function loadGallery() {
  status.innerText = "Cargando galería...";
  gallery.innerHTML = "";
  loadMoreBtn.hidden = true;
  selectionToggle.hidden = true;

  try {
    const refs = await listStorageRefs();
    mediaItems = buildMediaItems(refs);

    if (!mediaItems.length) {
      status.innerText = "Aún no hay fotos ni vídeos.";
      return;
    }

    selectionToggle.hidden = !mediaItems.some((item) => item.type === "image");
    status.innerText = "";
    renderedCount = 0;
    setupThumbObserver();
    renderNextBatch();
  } catch (error) {
    console.error(error);
    status.innerText = "Error cargando la galería.";
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
  const card = document.createElement("article");
  card.className = `photo-card ${item.type === "video" ? "video-card" : ""}`;
  card.dataset.index = index;

  const openButton = document.createElement("button");
  openButton.className = "media-open";
  openButton.type = "button";
  openButton.setAttribute("aria-label", item.type === "video" ? "Abrir vídeo" : "Abrir foto");
  openButton.addEventListener("click", () => {
    if (selectionMode && item.type === "image") {
      toggleSelected(index);
      return;
    }

    openFullscreen(index);
  });

  const placeholder = document.createElement("span");
  placeholder.className = "thumb-placeholder";
  placeholder.textContent = item.type === "video" ? "Vídeo" : "Foto";
  openButton.appendChild(placeholder);

  if (item.type === "video") {
    const badge = document.createElement("span");
    badge.className = "play-badge";
    badge.innerHTML = `${playIcon()}<span>Vídeo</span>`;
    openButton.appendChild(badge);
  }

  card.appendChild(openButton);

  if (item.type === "image") {
    const selectButton = document.createElement("button");
    selectButton.className = "card-action select-action";
    selectButton.type = "button";
    selectButton.setAttribute("aria-label", "Seleccionar foto");
    selectButton.setAttribute("aria-pressed", "false");
    selectButton.innerHTML = checkIcon();
    selectButton.addEventListener("click", () => toggleSelected(index));
    card.appendChild(selectButton);
  }

  if (item.type === "image") {
    const downloadButton = document.createElement("button");
    downloadButton.className = "card-action download-action";
    downloadButton.type = "button";
    downloadButton.setAttribute("aria-label", "Descargar foto");
    downloadButton.innerHTML = downloadIcon();
    downloadButton.addEventListener("click", () => downloadItem(item, downloadButton));
    card.appendChild(downloadButton);
  }

  if (selectedIndices.has(index)) {
    card.classList.add("selected");
    card.querySelector(".select-action")?.setAttribute("aria-pressed", "true");
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
    img.alt = item.type === "video" ? "Vídeo de la boda" : "Foto de la boda";
    img.loading = "lazy";
    img.decoding = "async";
    card.querySelector(".media-open").prepend(img);
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

function setSelectionMode(enabled) {
  if (isBatchDownloading && enabled) return;

  selectionMode = enabled;
  gallery.classList.toggle("selection-mode", enabled);
  selectionToggle.classList.toggle("active", enabled);
  selectionToggle.setAttribute("aria-pressed", String(enabled));
  selectionToggleLabel.textContent = enabled ? "Cancelar" : "Seleccionar fotos";
  selectionActions.hidden = !enabled;

  if (!enabled) {
    selectedIndices.clear();
    gallery.querySelectorAll(".photo-card.selected").forEach((card) => {
      card.classList.remove("selected");
      card.querySelector(".select-action")?.setAttribute("aria-pressed", "false");
    });
  }

  updateSelectionUI();
}

function toggleSelected(index) {
  const item = mediaItems[index];
  if (!selectionMode || !item || item.type !== "image") return;

  if (selectedIndices.has(index)) {
    selectedIndices.delete(index);
  } else {
    selectedIndices.add(index);
  }

  const card = gallery.querySelector(`.photo-card[data-index="${index}"]`);
  const selected = selectedIndices.has(index);
  card?.classList.toggle("selected", selected);
  card?.querySelector(".select-action")?.setAttribute("aria-pressed", String(selected));
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selectedIndices.size;
  selectionCount.textContent = `${count} ${count === 1 ? "seleccionada" : "seleccionadas"}`;
  downloadSelectedBtn.disabled = count === 0 || isBatchDownloading;
}

async function downloadSelectedPhotos() {
  if (!selectedIndices.size || isBatchDownloading) return;

  isBatchDownloading = true;
  selectionToggle.disabled = true;
  downloadSelectedBtn.disabled = true;

  const indices = Array.from(selectedIndices).sort((a, b) => a - b);

  try {
    setButtonLabel(downloadSelectedBtn, "Descargando...");
    status.innerText = `Descargando 0 de ${indices.length} fotos...`;

    for (let position = 0; position < indices.length; position += 1) {
      const index = indices[position];
      const item = mediaItems[index];
      const blob = await fetchMediaBlob(item);
      triggerBlobDownload(blob, buildDownloadName(item, index));
      status.innerText = `Descargando ${position + 1} de ${indices.length} fotos...`;

      if (position < indices.length - 1) {
        await wait(350);
      }
    }

    status.innerText = `${indices.length} fotos descargadas por separado.`;
    setSelectionMode(false);
  } catch (error) {
    console.error(error);
    status.innerText = "No se pudieron descargar todas las fotos. Inténtalo de nuevo.";
  } finally {
    isBatchDownloading = false;
    selectionToggle.disabled = false;
    setButtonLabel(downloadSelectedBtn, "Descargar");
    updateSelectionUI();
  }
}

async function downloadItem(item, button) {
  if (!item || button.disabled) return;

  button.disabled = true;
  button.classList.add("busy");

  const label = button.querySelector("span");
  const previousLabel = label?.textContent;
  if (label) label.textContent = "Preparando...";

  try {
    const blob = await fetchMediaBlob(item);
    const index = mediaItems.indexOf(item);
    triggerBlobDownload(blob, buildDownloadName(item, index));
  } catch (error) {
    console.error(error);
    status.innerText = "No se pudo descargar el archivo. Inténtalo de nuevo.";
  } finally {
    button.disabled = false;
    button.classList.remove("busy");
    if (label && previousLabel) label.textContent = previousLabel;
  }
}

async function fetchMediaBlob(item) {
  const url = await getMediaUrl(item, "full");
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error de descarga: ${response.status}`);
  }

  return response.blob();
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}

function buildDownloadName(item, index) {
  const extension = getFileExtension(item.fullRef.name, item.type === "video" ? "mp4" : "jpg");
  const mediaLabel = item.type === "video" ? "video" : "foto";
  const number = String(Math.max(index + 1, 1)).padStart(3, "0");
  return `${mediaLabel}-boda-${number}.${extension}`;
}

function getFileExtension(name, fallback) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : fallback;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setButtonLabel(button, text) {
  const label = button.querySelector("span");
  if (label) label.textContent = text;
}

function openFullscreen(index) {
  lastFocusedElement = document.activeElement;
  currentIndex = index;
  fullscreen.classList.add("active");
  document.body.classList.add("viewer-open");
  closeBtn.focus({ preventScroll: true });
  updateFullscreenMedia();
}

function closeFullscreen() {
  fullscreen.classList.remove("active");
  document.body.classList.remove("viewer-open");
  resetZoom();
  activePointers.clear();
  fullscreenVideo.pause();
  fullscreenVideo.removeAttribute("src");
  fullscreenVideo.load();

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus({ preventScroll: true });
  }
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

  resetZoom();
  activePointers.clear();
  viewerCounter.textContent = `${currentIndex + 1} / ${mediaItems.length}`;
  viewerDownloadBtn.hidden = item.type !== "image";
  fullscreen.classList.add("loading");
  zoomSurface.hidden = true;
  zoomControls.hidden = true;
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

      zoomSurface.hidden = false;
      zoomControls.hidden = false;
      preloadAdjacentImages(currentIndex);
    }
  } catch (error) {
    console.error(error);
    status.innerText = "No se pudo abrir este archivo.";
  } finally {
    if (requestId === viewerRequestId) {
      fullscreen.classList.remove("loading");
    }
  }
}

function setZoom(value) {
  if (zoomSurface.hidden) return;

  zoomScale = Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);

  if (zoomScale === MIN_ZOOM) {
    zoomX = 0;
    zoomY = 0;
  } else {
    clampZoomPosition();
  }

  applyZoomTransform();
}

function resetZoom() {
  zoomScale = MIN_ZOOM;
  zoomX = 0;
  zoomY = 0;
  applyZoomTransform();
}

function applyZoomTransform() {
  zoomSurface.style.transform = `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;
  zoomSurface.classList.toggle("zoomed", zoomScale > MIN_ZOOM);
  zoomLevel.textContent = `${Math.round(zoomScale * 100)}%`;
}

function clampZoomPosition() {
  const maxX = Math.max(0, (zoomSurface.offsetWidth * (zoomScale - 1)) / 2);
  const maxY = Math.max(0, (zoomSurface.offsetHeight * (zoomScale - 1)) / 2);
  zoomX = Math.min(Math.max(zoomX, -maxX), maxX);
  zoomY = Math.min(Math.max(zoomY, -maxY), maxY);
}

function handleZoomWheel(event) {
  if (zoomSurface.hidden) return;

  event.preventDefault();
  setZoom(zoomScale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
}

function toggleDoubleClickZoom(event) {
  event.preventDefault();

  if (zoomScale > MIN_ZOOM) {
    resetZoom();
  } else {
    setZoom(2);
  }
}

function startPointerGesture(event) {
  if (!fullscreen.classList.contains("active") || event.target === fullscreenVideo) return;

  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  mediaStage.setPointerCapture?.(event.pointerId);

  if (activePointers.size === 1) {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerStartTime = Date.now();
    panStartX = zoomX;
    panStartY = zoomY;
    gestureHadMultiplePointers = false;
  } else if (activePointers.size === 2) {
    gestureHadMultiplePointers = true;
    gestureStartDistance = getPointerDistance();
    gestureStartScale = zoomScale;
  }
}

function movePointerGesture(event) {
  if (!activePointers.has(event.pointerId)) return;

  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size >= 2 && !zoomSurface.hidden) {
    event.preventDefault();
    const distance = getPointerDistance();

    if (gestureStartDistance > 0) {
      setZoom(gestureStartScale * (distance / gestureStartDistance));
    }
    return;
  }

  if (zoomScale > MIN_ZOOM && activePointers.size === 1) {
    event.preventDefault();
    zoomX = panStartX + (event.clientX - pointerStartX);
    zoomY = panStartY + (event.clientY - pointerStartY);
    clampZoomPosition();
    applyZoomTransform();
  }
}

function finishPointerGesture(event) {
  if (!activePointers.has(event.pointerId)) return;

  const pointerCount = activePointers.size;
  activePointers.delete(event.pointerId);

  if (
    pointerCount === 1 &&
    !gestureHadMultiplePointers &&
    zoomScale === MIN_ZOOM &&
    event.pointerType !== "mouse"
  ) {
    finishSwipeAt(event.clientX, event.clientY);
  }

  if (activePointers.size === 1) {
    const remainingPointer = Array.from(activePointers.values())[0];
    pointerStartX = remainingPointer.x;
    pointerStartY = remainingPointer.y;
    panStartX = zoomX;
    panStartY = zoomY;
  }

  if (!activePointers.size) {
    gestureHadMultiplePointers = false;
  }
}

function cancelPointerGesture(event) {
  activePointers.delete(event.pointerId);
  if (!activePointers.size) {
    gestureHadMultiplePointers = false;
  }
}

function getPointerDistance() {
  const points = Array.from(activePointers.values());
  if (points.length < 2) return 0;

  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function finishSwipeAt(clientX, clientY) {
  const deltaX = clientX - pointerStartX;
  const deltaY = clientY - pointerStartY;
  const elapsed = Date.now() - pointerStartTime;
  const horizontalSwipe = Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

  if (!horizontalSwipe || elapsed > 900) return;

  if (deltaX < 0) {
    nextMedia();
  } else {
    prevMedia();
  }
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

function downloadIcon() {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v12"></path>
      <path d="m7 10 5 5 5-5"></path>
      <path d="M5 21h14"></path>
    </svg>
  `;
}

function checkIcon() {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 12 4 4 8-9"></path>
    </svg>
  `;
}

function playIcon() {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 7 8 5-8 5Z"></path>
    </svg>
  `;
}
