document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     1. PERSONALIZACIÓN POR URL
  =============================== */

  const params = new URLSearchParams(window.location.search);

  let name = params.get("name");
  const type = params.get("type");

  // Detectar si es grupo ANTES de modificar el nombre
  const isGroup =
    name &&
    (name.includes("_y_") || name.includes("_e_"));

  // Formatear nombre
  if (name) {
    let separator = null;

    if (name.includes("_e_")) separator = "_e_";
    if (name.includes("_y_")) separator = "_y_";

    if (separator) {
      const parts = name.split(separator);

      // Personas a la izquierda separadas por "_"
      const people = parts[0].split("_").join(", ");

      // Parte derecha (persona o colectivo)
      const last = parts[1].replace(/_/g, " ");

      name = separator === "_e_"
        ? `${people} e ${last}`
        : `${people} y ${last}`;
    } else {
      // Caso simple (una persona)
      name = name.replace(/_/g, " ");
    }
  }

  /* ===============================
     2. PERSONALIZACIÓN MENSAJE WHATSAPP
  =============================== */

  const whatsappBtn = document.getElementById("whatsappBtn");

  if (whatsappBtn) {
    const phone = "34655148870"; // Número al que se enviarán los mensajes
    const cleanName = name ? name : "Hola";

    let text;

    if (isGroup) {
      text = `Hola Mariana y Enrique, somos ${cleanName} y tenemos una duda sobre la boda 💍`;
    } else {
      text = `Hola Mariana y Enrique, soy ${cleanName} y tengo una duda sobre la boda 💍`;
    }

    whatsappBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  /* ===============================
     3. PERSONALIZACIÓN MENSAJE INVITACIÓN
  =============================== */

  const title = document.getElementById("title");
  const messageEl = document.getElementById("message");

  if (name && title) {
    title.innerText = name;
  }

  let message = "Queremos compartir contigo un día muy especial para nosotros.";

  if (type === "familia") {
    message =
      "Querido miembro de la familia,\n\n" +
      "Nos llena de felicidad invitarte a nuestra boda y ser parte de este momento tan significativo en nuestras vidas.\n" +
      "A continuación te dejamos los detalles.";
  }

  if (type === "amigos") {
    message =
      "Querido amigo/a,\n\n" +
      "Muchas gracias por todas las vivencias que hemos compartido juntos y esperamos poder contar con tu presencia en el día de nuestra boda.\n" +
      "A continuación te dejamos los detalles.";
  }

  if (type === "padrino_Jhan") {
    message =
      "Querido padrino y acompañantes,\n\n" +
      "Como persona especial, nos complace informarte a ti, a Cinthia, Arely y Anita de los detalles de nuestra boda.";
  }

  if (type === "padrino_Luis") {
    message =
      "Querido padrino y acompañante,\n\n" +
      "Como persona especial, nos complace informarte a ti y a Maricarmen de los detalles de nuestra boda.";
  }

  if (type === "mama") {
    message =
      "Querida mamá,\n\n" +
      "Como persona especial, nos complace informarte de los detalles de nuestra boda.";
  }

  if (type === "hermano") {
    message =
      "Querido Luis y Esme,\n\n" +
      "Como persona especial, nos complace informarte de los detalles de nuestra boda.";
  }

  if (messageEl) {
    messageEl.innerText = message;
  }

// Para ver en Google Analytics  información por enlace de invitado

if (typeof gtag === "function") {
  gtag('event', 'landing_view', {
    guest_name: name || 'desconocido',
    guest_type: type || 'sin_tipo'
  });
}

  /* ===============================
     4. ANIMACIÓN GLOBAL DE ENTRADA
  =============================== */

  const reveals = document.querySelectorAll(".reveal");

  reveals.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add("active");
    }, index * 900);
  });

});
