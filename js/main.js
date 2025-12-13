const params = new URLSearchParams(window.location.search);

const name = params.get("name");
const type = params.get("type");

const title = document.getElementById("title");
const messageEl = document.getElementById("message");

if (name) {
  title.innerText = `Invitación de boda de Mariana y Enrique para ${name} 💍`;
}

let message = "Queremos compartir contigo un día muy especial para nosotros.";

if (type === "familia") {
  message = "Mensaje familia.";
}

if (type === "amigos") {
  message = "mensaje amigos.";
}

if (type === "padrinos"){
  message = "Querido padrino y acompañate/s\n
             Prueba"
}

messageEl.innerText = message;
