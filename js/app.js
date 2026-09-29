const STORAGE_KEY = "films";
const PLATFORM_LABELS = {
  netflix: "Netflix",
  prime: "Prime Video",
  disney: "Disney+",
  canal: "Canal+"
};

const form = document.getElementById("add-movie-form");
const cinemaOnly = document.getElementById("cinema-only");
const platformsGroup = document.getElementById("platforms-group");

const message = document.createElement("p");
message.className = "form-message";
form.appendChild(message);

function showMessage(text, isError) {
  message.textContent = text;
  message.dataset.state = isError ? "error" : "success";
}

function getFilms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function setPlatformsEnabled(enabled) {
  platformsGroup.hidden = !enabled;
  platformsGroup
    .querySelectorAll('input[name="platforms[]"]')
    .forEach((input) => (input.checked = enabled ? input.checked : false));
}

cinemaOnly.addEventListener("change", () => {
  setPlatformsEnabled(!cinemaOnly.checked);
  showMessage("", false);
});

setPlatformsEnabled(!cinemaOnly.checked);

function buildMovie() {
  const data = new FormData(form);
  const isCinemaOnly = cinemaOnly.checked;

  return {
    isbn: crypto.randomUUID(),
    title: data.get("title").trim(),
    tags: data.get("genre")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    release_date: data.get("release_date"),
    director: data.get("director").trim(),
    rating: data.get("rating") === "" ? null : Number(data.get("rating")),
    synopsis: data.get("synopsis").trim(),
    actors: data.getAll("actors[]")
      .map((actor) => actor.trim())
      .filter(Boolean)
      .slice(0, 3),
    cinema_only: isCinemaOnly,
    cinema_room: data.get("cinema_room").trim() || null,
    platforms: isCinemaOnly ? [] : data.getAll("platforms[]")
  };
}

function validate(movie) {
  if (!movie.title) return "Le titre du film est obligatoire.";
  if (!movie.release_date) return "La date de sortie est obligatoire.";
  if (!movie.director) return "Le réalisateur est obligatoire.";
  if (movie.rating !== null && (movie.rating < 0 || movie.rating > 10))
    return "La note doit être comprise entre 0 et 10.";

  if (!movie.cinema_only && movie.platforms.length === 0)
    return "Sélectionnez au moins une plateforme de streaming, ou cochez « Sortie exclusivement en salle ».";

  const films = getFilms();
  const sameTitle = films.find(
    (film) => film.title.toLowerCase() === movie.title.toLowerCase()
      && film.release_date === movie.release_date
  );
  if (sameTitle)
    return "Un film avec ce titre et cette date de sortie est déjà enregistré.";

  return null;
}

function describeMovie(movie) {
  const diffusion = movie.cinema_only
    ? `Salle uniquement${movie.cinema_room ? ` (${movie.cinema_room})` : ""}`
    : [
        movie.cinema_room ? `Salle (${movie.cinema_room})` : null,
        movie.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")
      ]
        .filter(Boolean)
        .join(" + ");
  return diffusion;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const movie = buildMovie();
  const error = validate(movie);
  if (error) {
    showMessage(error, true);
    return;
  }

  const films = getFilms();
  films.push(movie);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(films));

  form.reset();
  setPlatformsEnabled(true);
  showMessage(
    `« ${movie.title} » a été ajouté au catalogue. Diffusion : ${describeMovie(movie)}.`,
    false
  );
});
