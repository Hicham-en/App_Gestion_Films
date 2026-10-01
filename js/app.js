// ===== Page d'administration : ajouter un film =====

const STORAGE_KEY = "films";

// Cette page est réservée aux administrateurs.
requireRole("admin");

const form = document.getElementById("add-movie-form");
const titleInput = document.getElementById("title");
const cinemaOnly = document.getElementById("cinema-only");
const platformsGroup = document.getElementById("platforms-group");
const submitButton = form.querySelector(".btn-submit");

// Zone de message affichée en haut du formulaire (style .alert de style.css)
const alertBox = document.createElement("p");
alertBox.className = "alert";
alertBox.hidden = true;
form.prepend(alertBox);

function showAlert(text) {
  alertBox.textContent = text;
  alertBox.hidden = text === "";
}

function getFilms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Un titre ne peut être utilisé qu'une seule fois (comparaison sans casse).
// Affiche le message si besoin, bloque le bouton, et renvoie l'erreur ("")
// pour que l'appelant puisse aussi interrompre l'enregistrement.
function checkTitle() {
  const title = titleInput.value.trim();
  const dejaPris = getFilms().some((film) => film.title.toLowerCase() === title.toLowerCase());
  const message = title !== "" && dejaPris ? "Un film avec ce titre existe déjà." : "";

  showAlert(message);
  submitButton.disabled = message !== "";

  return message;
}

titleInput.addEventListener("input", checkTitle);

// Si le film sort uniquement en salle, les plateformes de streaming
// n'ont aucun sens : on masque la liste et on décoche tout.
function togglePlatforms() {
  const cinema = cinemaOnly.checked;
  platformsGroup.hidden = cinema;
  platformsGroup
    .querySelectorAll('input[name="platforms[]"]')
    .forEach((input) => (input.checked = cinema ? false : input.checked));
}

cinemaOnly.addEventListener("change", togglePlatforms);
togglePlatforms();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (checkTitle()) return;

  let platforms = [];
  if (!cinemaOnly.checked) {
    platforms = [...form.querySelectorAll('input[name="platforms[]"]:checked')].map(
      (input) => input.value
    );
    if (platforms.length === 0)
      return showAlert(
        "Choisissez au moins une plateforme, ou cochez « Sortie exclusivement en salle »."
      );
  }

  const data = new FormData(form);

  const film = {
    id: crypto.randomUUID(),
    title: titleInput.value.trim(),
    tags: data
      .get("genre")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    release_date: data.get("release_date"),
    director: data.get("director").trim(),
    rating: data.get("rating") === "" ? null : Number(data.get("rating")),
    synopsis: data.get("synopsis").trim(),
    actors: data
      .getAll("actors[]")
      .map((actor) => actor.trim())
      .filter(Boolean),
    cinema_only: cinemaOnly.checked,
    cinema_room: data.get("cinema_room").trim(),
    platforms
  };

  const films = getFilms();
  films.push(film);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(films));

  form.reset();
  togglePlatforms();
  checkTitle();
});
