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

async function loadGallery() {
  status.innerText = "Cargando fotos...";

  const folderRef = ref(storage, "boda/");

  try {
    const res = await listAll(folderRef);

    if (res.items.length === 0) {
      status.innerText = "Aún no hay fotos 😄";
      return;
    }

    status.innerText = "";

    for (const item of res.items) {
      const url = await getDownloadURL(item);
      const metadata = await getMetadata(item);

      const date = new Date(metadata.timeCreated);
      const formatted = date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const card = document.createElement("div");
      card.className = "photo-card";

      const img = document.createElement("img");
      img.src = url;

      const dateEl = document.createElement("div");
      dateEl.className = "date";
      dateEl.innerText = formatted;

      card.appendChild(img);
      card.appendChild(dateEl);
      gallery.appendChild(card);
    }

  } catch (err) {
    console.error(err);
    status.innerText = "Error cargando la galería";
  }
}

loadGallery();
