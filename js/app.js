const STORAGE_KEY = "films";

const form = document.getElementById("add-movie-form");
const titleInput = document.getElementById("title");
const cinemaOnly = document.getElementById("cinema-only");
const platformsGroup = document.getElementById("platforms-group");
const submitButton = form.querySelector(".btn-submit");

const alert = document.createElement("p");
alert.hidden = true;
alert.style.cssText =
  "padding:10px 12px;border-radius:6px;font-weight:600;margin:0 0 12px;" +
  "background:#fde8e8;color:#b02020;border:1px solid #f0b4b4";
form.prepend(alert);

function showAlert(text) {
  alert.textContent = text;
  alert.hidden = !text;
}

function getFilms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function alreadyExists(title) {
  return getFilms().some((film) => film.title === title);
}

titleInput.addEventListener("input", () => {
  titleInput.value = titleInput.value.toLowerCase();
  checkTitle();
});

function checkTitle() {
  const duplicate = titleInput.value !== "" && alreadyExists(titleInput.value);
  showAlert(duplicate ? "Titre déjà existant" : "");
  submitButton.disabled = duplicate;
}

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

  const title = titleInput.value.trim().toLowerCase();
  titleInput.value = title;
  if (title === "") return showAlert("Le titre du film est obligatoire.");
  if (alreadyExists(title)) return showAlert("Titre déjà existant");

  if (cinemaOnly.checked) {
    platforms = [];
  } else {
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
    isbn: crypto.randomUUID(),
    title,
    tags: data.get("genre")
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
  showAlert("");
  submitButton.disabled = false;
});
