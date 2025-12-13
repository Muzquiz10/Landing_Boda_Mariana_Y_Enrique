const params = new URLSearchParams(window.location.search);

let name = params.get("name");
const type = params.get("type");

// Reemplazar los guiones bajos por espacios
if (name) {
  name = name.replace(/_/g, " "); 
}

const title = document.getElementById("title");
const messageEl = document.getElementById("message");

if (name) {
  
  title.innerText = `${name}`;
  // title.innerText = `Invitación de boda de Mariana y Enrique para ${name} 💍`;
  
}

let message = "Queremos compartir contigo un día muy especial para nosotros.";

if (type === "familia") {
  message = "Querido miembro de la familia,\n\nNos llena de felicidad invitarte a nuestra boda y ser parte de este momento tan significativo en nuestras vidas.\nA continuación te dejamos los detalles de nuestra boda.";
}

if (type === "amigos") {
  message = "Querido amigo/a,\n\nMuchas gracias por todas las vivencias que hemos compartido juntos y esperamos poder contar con tu presencia en el día de nuestra boda.\nA continuación te dejamos los detalles de nuestra boda.";
}

if (type === "padrino_Jhan"){
  message = "Querido padrino y acompañantes,\n\nComo persona especial, nos complace informarte a ti a Cinthia, Arely y Anita de los detalles de nuestra boda.";
}

if (type === "padrino_Luis"){
  message = "Querido padrino y acompañate,\n\nComo persona especial, nos complace informarte a ti y a Maricarmen de los detalles de nuestra boda.";
}

if (type === "mama"){
  message = "Querida mamá,\n\nComo persona especial, nos complace informarte los detalles de nuestra boda.";
}

if (type === "hermano"){
  message = "Querido hermano y Esme,\n\nComo persona especial, nos complace informarte de los detalles de nuestra boda.";
}

messageEl.innerText = message;

// NEW CODE

// document.addEventListener("DOMContentLoaded", () => {
//   const params = new URLSearchParams(window.location.search);
//   let name = params.get("name");
//   const type = params.get("type");

//   // Reemplazar guiones bajos por espacios
//   if (name) {
//     name = name.replace(/_/g, " "); 
//   }

//   const title = document.getElementById("title");
//   const messageEl = document.getElementById("message");

//   if (name) {
//     title.innerText = `${name}`;
//     // title.innerText = `Invitación de boda de Mariana y Enrique para ${name} 💍`;
//   }

//   let message = "Queremos compartir contigo un día muy especial para nosotros.";

//   if (type === "familia") {
//     message = "Querido miembro de la familia,\n\nNos llena de felicidad invitarte a nuestra boda y ser parte de este momento tan significativo en nuestras vidas.\nA continuación te dejamos los detalles de nuestra boda.";
//   }

//   if (type === "amigos") {
//     message = "Querido amigo/a,\n\nMuchas gracias por todas las vivencias que hemos compartido juntos y esperamos poder contar con tu presencia en el día de nuestra boda.\nA continuación te dejamos los detalles de nuestra boda.";
//   }

//   if (type === "padrino_Jhan") {
//     message = "Querido padrino y acompañantes,\n\nComo persona especial, nos complace informarte a ti a Cinthia, Arely y Anita de los detalles de nuestra boda.";
//   }

//   if (type === "padrino_Luis") {
//     message = "Querido padrino y acompañate,\n\nComo persona especial, nos complace informarte a ti y a Maricarmen de los detalles de nuestra boda.";
//   }

//   if (type === "mama") {
//     message = "Querida mamá,\n\nComo persona especial, nos complace informarte los detalles de nuestra boda.";
//   }

//   if (type === "hermano") {
//     message = "Querido hermano y Esme,\n\nComo persona especial, nos complace informarte de los detalles de nuestra boda.";
//   }

//   messageEl.innerText = message;
// });


