import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getStorage, 
  ref, 
  listAll, 
  getDownloadURL,
  getMetadata
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

let images = [];
let currentIndex = 0;

async function loadGallery() {
  status.innerText = "Cargando fotos...";

  const folderRef = ref(storage, "boda/");

  try {
    const res = await listAll(folderRef);

    if (res.items.length === 0) {
      status.innerText = "Aún no hay fotos 😄";
      return;
    }

    // Obtener URLs + fechas
    const files = await Promise.all(
      res.items.map(async (item) => {
        const [url, metadata] = await Promise.all([
          getDownloadURL(item),
          getMetadata(item)
        ]);

        return {
          url,
          time: new Date(metadata.timeCreated).getTime()
        };
      })
    );

    // Ordenar más recientes primero
    files.sort((a, b) => b.time - a.time);

    images = files.map(f => f.url);

    status.innerText = "";

    images.forEach((url, index) => {
      const card = document.createElement("div");
      card.className = "photo-card";

      const img = document.createElement("img");
      img.dataset.src = url;   // Lazy loading
      img.alt = "Foto de la boda";
      img.loading = "lazy";

      img.addEventListener("click", () => openFullscreen(index));

      card.appendChild(img);
      gallery.appendChild(card);
    });

    initLazyLoading();

  } catch (err) {
    console.error(err);
    status.innerText = "Error cargando la galería";
  }
}

function initLazyLoading() {
  const imgs = document.querySelectorAll("img[data-src]");

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        obs.unobserve(img);
      }
    });
  }, { rootMargin: "100px" });

  imgs.forEach(img => observer.observe(img));
}

function openFullscreen(index) {
  currentIndex = index;
  updateFullscreenImage();
  document.getElementById("fullscreen").classList.add("active");
}

function closeFullscreen() {
  document.getElementById("fullscreen").classList.remove("active");
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  updateFullscreenImage();
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateFullscreenImage();
}

function updateFullscreenImage() {
  document.getElementById("fullscreen-img").src = images[currentIndex];
}

document.addEventListener("keydown", (e) => {
  if (!document.getElementById("fullscreen").classList.contains("active")) return;

  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "Escape") closeFullscreen();
});

// BOTONES FULLSCREEN
document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("close-btn").addEventListener("click", closeFullscreen);
  document.getElementById("next-btn").addEventListener("click", nextImage);
  document.getElementById("prev-btn").addEventListener("click", prevImage);

  loadGallery();
});

let startX = 0;
let endX = 0;

const fullscreenEl = document.getElementById("fullscreen");

fullscreenEl.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

fullscreenEl.addEventListener("touchend", (e) => {
  endX = e.changedTouches[0].clientX;
  handleSwipe();
});

function handleSwipe() {
  const threshold = 50; // sensibilidad

  if (startX - endX > threshold) {
    nextImage(); // swipe izquierda
  }

  if (endX - startX > threshold) {
    prevImage(); // swipe derecha
  }
}

fullscreenEl.addEventListener("click", (e) => {
  if (e.target.id === "fullscreen") {
    closeFullscreen();
  }
});

