const params = new URLSearchParams(window.location.search);

const name = params.get("name");
const type = params.get("type");

const title = document.getElementById("title");
const messageEl = document.getElementById("message");

if (name) {
  title.innerText = `${name}, nos casamos 💍`;
}

let message = "Queremos compartir contigo un día muy especial para nosotros.";

if (type === "familia") {
  message = "Gracias por estar a nuestro lado desde el principio. Este día no tendría sentido sin ti.";
}

if (type === "amigos") {
  message = "Después de tantas risas y momentos inolvidables, queremos celebrarlo contigo.";
}

messageEl.innerText = message;

