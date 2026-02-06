import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

signInAnonymously(auth);

window.upload = async () => {
  const files = document.getElementById("file").files;
  const status = document.getElementById("status");

  if (!files.length) {
    status.innerText = "Selecciona al menos una foto 📷";
    return;
  }

  status.innerText = "Subiendo fotos... ⏳";

  for (const file of files) {
    const fileRef = ref(
      storage,
      `boda/${Date.now()}_${file.name}`
    );
    await uploadBytes(fileRef, file);
  }

  status.innerText = "¡Fotos subidas! 🎉 Gracias ❤️";
};

