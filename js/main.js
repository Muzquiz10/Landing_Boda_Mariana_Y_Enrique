document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     1. PERSONALIZACIÓN POR URL
  =============================== */

  const params = new URLSearchParams(window.location.search);

  let name = params.get("name");
  const type = params.get("type");

  // Reemplazar guiones bajos por espacios
if (name) {
  // Paso 1: dividir por "_e_" o "_y_"
  let separator = null;

  if (name.includes("_e_")) separator = "_e_";
  if (name.includes("_y_")) separator = "_y_";

  if (separator) {
    const parts = name.split(separator);

    // Parte izquierda: personas separadas por "_"
    const people = parts[0].split("_").join(", ");

    // Parte derecha: colectivo o última persona
    const last = parts[1].replace(/_/g, " ");

    name = separator === "_e_"
      ? `${people} e ${last}`
      : `${people} y ${last}`;
  } else {
    // Caso simple (una sola persona)
    name = name.replace(/_/g, " ");
  }
}



  const title = document.getElementById("title");
  const messageEl = document.getElementById("message");

  if (name) {
    title.innerText = `${name}`;
  }

  let message = "Queremos compartir contigo un día muy especial para nosotros.";

  if (type === "familia") {
    message = "Querido miembro de la familia,\n\nNos llena de felicidad invitarte a nuestra boda y ser parte de este momento tan significativo en nuestras vidas.\nA continuación te dejamos los detalles.";
  }

  if (type === "amigos") {
    message = "Querido amigo/a,\n\nMuchas gracias por todas las vivencias que hemos compartido juntos y esperamos poder contar con tu presencia en el día de nuestra boda.\nA continuación te dejamos los detalles.";
  }

  if (type === "padrino_Jhan") {
    message = "Querido padrino y acompañantes,\n\nComo persona especial, nos complace informarte a ti, a Cinthia, Arely y Anita de los detalles de nuestra boda.";
  }

  if (type === "padrino_Luis") {
    message = "Querido padrino y acompañante,\n\nComo persona especial, nos complace informarte a ti y a Maricarmen de los detalles de nuestra boda.";
  }

  if (type === "mama") {
    message = "Querida mamá,\n\nComo persona especial, nos complace informarte los detalles de nuestra boda.";
  }

  if (type === "hermano") {
    message = "Querido Luis y Esme,\n\nComo persona especial, nos complace informarte de los detalles de nuestra boda.";
  }

  messageEl.innerText = message;


  /* ===============================
     2. ANIMACIÓN GLOBAL DE ENTRADA
  =============================== */

  const reveals = document.querySelectorAll(".reveal");

  reveals.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add("active");
    }, index * 900); // efecto en cascada
  });

});

