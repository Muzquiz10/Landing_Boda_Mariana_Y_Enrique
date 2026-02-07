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

/* 🔥 Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyD3AXdqNjqbkOh2TGehZ2ZQrZ8ldsPOsCA",
  authDomain: "boda-mariana-y-enrique.firebaseapp.com",
  projectId: "boda-mariana-y-enrique",
  storageBucket: "boda-mariana-y-enrique.firebasestorage.app", 
  messagingSenderId: "1027797408433",
  appId: "1:1027797408433:web:cf736bf0f847c32864e090"
};

/* 🔥 Init */
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

/* 🔐 Auth anónima */
signInAnonymously(auth).catch(console.error);

/* 📦 DOM */
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const progressWrapper = document.querySelector(".progress-wrapper");
const progressBar = document.getElementById("progress-bar");

/* 👀 PREVIEW DE IMÁGENES */
input.addEventListener("change", () => {
  preview.innerHTML = "";

  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

/* ⬆️ SUBIR FOTOS CON PROGRESO */
window.upload = async () => {
  const files = input.files;

  if (!files.length) {
    status.innerText = "Selecciona al menos una foto 📷";
    return;
  }

  status.innerText = "Subiendo fotos... ⏳";
  progressWrapper.style.display = "block";
  progressBar.style.width = "0%";

  let totalBytes = 0;
  let uploadedBytes = 0;

  Array.from(files).forEach(file => totalBytes += file.size);

  try {
    for (const file of files) {

      // 📌 Metadata para que la galería pueda leer fecha y tipo
      const metadata = {
        contentType: file.type
      };

      const fileRef = ref(
        storage,
        `boda/${Date.now()}_${file.name}`
      );

      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, file, metadata);

        task.on(
          "state_changed",
          snapshot => {
            uploadedBytes += snapshot.bytesTransferred;
            const progress = Math.min(
              (uploadedBytes / totalBytes) * 100,
              100
            );
            progressBar.style.width = progress + "%";
          },
          error => reject(error),
          () => resolve()
        );
      });
    }

    status.innerText = "¡Fotos subidas! 🎉 Gracias ❤️";
    progressBar.style.width = "100%";
    input.value = "";
    preview.innerHTML = "";

  } catch (error) {
    console.error(error);
    status.innerText = "❌ Error al subir fotos";
  }
};
