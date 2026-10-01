// ===== Page d'administration : ajouter, modifier et supprimer un film =====

const STORAGE_KEY = "films";

requireRole("admin");

const form = document.getElementById("add-movie-form");
const titleInput = document.getElementById("title");
const cinemaOnly = document.getElementById("cinema-only");
const platformsGroup = document.getElementById("platforms-group");
const submitButton = form.querySelector(".btn-submit");

// null quand on ajoute un film, l'id du film quand on le modifie.
let editingId = null;

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

function checkTitle() {
  const title = titleInput.value.trim();
  // Le film en cours de modification est ignoré : garder son propre titre
  // ne doit pas être considéré comme un doublon.
  const dejaPris = getFilms().some(
    (film) => film.id !== editingId && film.title.toLowerCase() === title.toLowerCase()
  );
  const message = title !== "" && dejaPris ? "Un film avec ce titre existe déjà." : "";

  showAlert(message);
  submitButton.disabled = message !== "";

  return message;
}

titleInput.addEventListener("input", checkTitle);

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
    id: editingId ?? crypto.randomUUID(),
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

  if (editingId) {
    // On remplace le film à sa place, en gardant son id : les favoris et
    // l'historique des clients restent valides.
    const index = films.findIndex((f) => f.id === editingId);
    if (index !== -1) films[index] = film;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(films));
    editingId = null;
    form.reset();
    togglePlatforms();
    checkTitle();
    form.querySelector(".btn-submit").textContent = "Ajouter le film";
    renderFilmsList();
    showAlert(`Film « ${film.title} » modifié.`);
    return;
  }

  films.push(film);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(films));

  form.reset();
  togglePlatforms();
  checkTitle();
  renderFilmsList();
  showAlert(`Film « ${film.title} » ajouté.`);
});

// ---------- Modifier un film ----------

// Remplit le formulaire avec les données du film, puis défile vers le haut.
function editFilm(filmId) {
  const film = getFilms().find((f) => f.id === filmId);
  if (!film) return;

  editingId = film.id;

  titleInput.value = film.title || "";
  document.getElementById("genre").value = (film.tags || []).join(", ");
  document.getElementById("release-date").value = film.release_date || "";
  document.getElementById("rating").value = film.rating ?? "";
  document.getElementById("director").value = film.director || "";
  document.getElementById("synopsis").value = film.synopsis || "";

  const acteurs = film.actors || [];
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`actor-${i}`).value = acteurs[i - 1] || "";
  }

  cinemaOnly.checked = Boolean(film.cinema_only);
  document.getElementById("cinema-room").value = film.cinema_room || "";
  form.querySelectorAll('input[name="platforms[]"]').forEach((input) => {
    input.checked = (film.platforms || []).includes(input.value);
  });

  togglePlatforms();

  form.querySelector(".btn-submit").textContent = "Enregistrer les modifications";
  showAlert(`Modification de « ${film.title} ».`);
  checkTitle();

  // Remonte vers le formulaire pour voir les champs à remplir.
  if (typeof form.scrollIntoView === "function")
    form.scrollIntoView({ behavior: "smooth" });
}

// Annule la modification en cours et remet le formulaire en mode « ajout ».
function cancelEdit() {
  editingId = null;
  form.reset();
  togglePlatforms();
  checkTitle();
  form.querySelector(".btn-submit").textContent = "Ajouter le film";
  showAlert("");
}

// ---------- Supprimer un film ----------

// Supprime le film ET son id dans les favoris / l'historique de tous les
// comptes : sans cela, les listes des clients contiendraient un film
// qui n'existe plus.
function deleteFilm(filmId) {
  const films = getFilms();
  const film = films.find((f) => f.id === filmId);
  if (!film) return { ok: false, error: "Film introuvable." };

  if (!confirm(`Supprimer le film « ${film.title} » ?\nIl sera aussi retiré des favoris et de l'historique de tous les comptes.`))
    return { ok: false };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(films.filter((f) => f.id !== filmId))
  );

  let comptesNettoyes = 0;
  for (const user of getUsers()) {
    const key = `profile_${user.id}`;
    const profil = getProfileFor(key);
    if (!profil) continue;

    const avant = profil.favorites.length + profil.watched.length;
    const favorites = profil.favorites.filter((id) => id !== filmId);
    const watched = profil.watched.filter((id) => id !== filmId);
    if (favorites.length === profil.favorites.length && watched.length === profil.watched.length)
      continue;

    localStorage.setItem(key, JSON.stringify({ favorites, watched }));
    comptesNettoyes++;
  }

  if (editingId === filmId) cancelEdit();

  renderFilmsList();
  return { ok: true, titre: film.title, comptesNettoyes };
}

// Lit le profil d'un compte sans dépendre de la session : ici on nettoie
// les comptes des autres, pas celui de l'admin connecté.
function getProfileFor(key) {
  try {
    const p = JSON.parse(localStorage.getItem(key));
    return {
      favorites: Array.isArray(p?.favorites) ? p.favorites : [],
      watched: Array.isArray(p?.watched) ? p.watched : []
    };
  } catch {
    return null;
  }
}

// ---------- Liste des films ----------

function renderFilmsList() {
  const tbody = document.getElementById("films-list");
  if (!tbody) return;

  tbody.innerHTML = "";
  const films = getFilms();

  if (films.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "Aucun film enregistré.";
    row.append(cell);
    tbody.append(row);
    return;
  }

  for (const film of films) {
    const row = document.createElement("tr");

    const titre = document.createElement("td");
    titre.textContent = film.title || "Sans titre";

    const real = document.createElement("td");
    real.textContent = film.director || "—";

    const date = document.createElement("td");
    date.textContent = film.release_date || "—";

    const actions = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-edit";
    editBtn.textContent = "Modifier";
    editBtn.addEventListener("click", () => editFilm(film.id));
    actions.append(editBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-delete";
    delBtn.textContent = "Supprimer";
    delBtn.addEventListener("click", () => {
      const result = deleteFilm(film.id);
      const box = document.getElementById("films-alert");
      box.hidden = false;
      box.textContent = result.ok
        ? `Film « ${result.titre} » supprimé (${result.comptesNettoyes} compte(s) nettoyé(s)).`
        : result.error || "Suppression annulée.";
      box.classList.toggle("success", result.ok);
    });
    actions.append(delBtn);

    row.append(titre, real, date, actions);
    tbody.append(row);
  }
}

renderFilmsList();
