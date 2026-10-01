const STORAGE_KEY = "films";

// Les films ajoutés avant que la clé s'appelle "id" (elle s'appelait "isbn")
// sont convertis une seule fois, puis rangés avec la bonne clé.
function getFilms() {
  let films;
  try {
    films = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }

  let modifie = false;
  const corrects = films.map((film) => {
    if (film.id) return film;
    modifie = true;
    const { isbn, ...reste } = film;
    return { ...reste, id: isbn };
  });

  if (modifie) localStorage.setItem(STORAGE_KEY, JSON.stringify(corrects));

  return corrects;
}

// Les favoris et l'historique sont privés : chaque utilisateur a sa propre
// clé de stockage, nommée avec son id. Sans cela, tous les comptes partageraient
// la même liste.
function profileKey() {
  const session = getSession();
  // Sans session (page ouverte directement), on ne lit ni n'écrit de liste.
  return session ? `profile_${session.id}` : null;
}

// Les ids invalides sont ignorés, sinon un film déjà mis en favori
// ne s'afficherait plus jamais dans les filtres.
function getProfile() {
  const key = profileKey();
  if (!key) return { favorites: [], watched: [] };

  try {
    const p = JSON.parse(localStorage.getItem(key));
    return {
      favorites: Array.isArray(p?.favorites) ? p.favorites.filter(Boolean) : [],
      watched: Array.isArray(p?.watched) ? p.watched.filter(Boolean) : []
    };
  } catch {
    return { favorites: [], watched: [] };
  }
}

function toggleInProfile(list, filmId) {
  const key = profileKey();
  if (!filmId || !key) return;

  const profile = getProfile();
  const index = profile[list].indexOf(filmId);
  if (index === -1) profile[list].push(filmId);
  else profile[list].splice(index, 1);
  localStorage.setItem(key, JSON.stringify(profile));
}

const searchTitleInput = document.getElementById("search-title");
const searchActorInput = document.getElementById("search-actor");
const searchGenreInput = document.getElementById("search-genre");
const searchDirectorInput = document.getElementById("search-director");
const sortBySelect = document.getElementById("sort-by");
const sortOrderSelect = document.getElementById("sort-order");
const platformRadios = document.querySelectorAll('input[name="platform-filter"]');
const catalogContainer = document.getElementById("catalog-list");
const countContainer = document.getElementById("films-count");

function updateCatalog() {
  const queryTitle = searchTitleInput.value.trim().toLowerCase();
  const queryActor = searchActorInput.value.trim().toLowerCase();
  const queryGenre = searchGenreInput.value.trim().toLowerCase();
  const queryDirector = searchDirectorInput.value.trim().toLowerCase();
  const sortBy = sortBySelect.value;
  const sortOrder = sortOrderSelect.value;
  const selectedPlatform = document.querySelector('input[name="platform-filter"]:checked').value;

  let films = getFilms();

  if (queryTitle) {
    films = films.filter((f) => f.title && f.title.toLowerCase().includes(queryTitle));
  }

  if (queryActor) {
    films = films.filter((f) =>
      Array.isArray(f.actors) &&
      f.actors.some((actor) => actor.toLowerCase().includes(queryActor))
    );
  }

  if (queryGenre) {
    const searchTags = queryGenre
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    films = films.filter((f) =>
      Array.isArray(f.tags) &&
      searchTags.every((searchTag) =>
        f.tags.some((filmTag) => filmTag.toLowerCase().includes(searchTag))
      )
    );
  }

  if (queryDirector) {
    films = films.filter((f) =>
      f.director && f.director.toLowerCase().includes(queryDirector)
    );
  }

  if (selectedPlatform === "cinema") {
    films = films.filter((f) => f.cinema_only);
  } else if (selectedPlatform !== "all") {
    films = films.filter(
      (f) => !f.cinema_only && Array.isArray(f.platforms) && f.platforms.includes(selectedPlatform)
    );
  }

  films.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === "rating") {
      valA = valA !== null && valA !== undefined ? Number(valA) : -1;
      valB = valB !== null && valB !== undefined ? Number(valB) : -1;
    } else {
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  renderCatalog(films);
}

function renderCatalog(films) {
  catalogContainer.innerHTML = "";
  countContainer.textContent = `${films.length} film(s) trouvé(s)`;

  if (films.length === 0) {
    catalogContainer.innerHTML = "<p>Aucun film ne correspond aux critères.</p>";
    return;
  }

  const profile = getProfile();

  films.forEach((film) => {
    const card = document.createElement("article");
    card.className = "film-card";

    const body = document.createElement("div");
    body.className = "film-card-body";

    const leftCol = document.createElement("div");
    leftCol.className = "film-card-left";

    const title = document.createElement("h3");
    title.textContent = film.title ? film.title.toUpperCase() : "Sans titre";

    const meta = document.createElement("p");
    const ratingDisplay = film.rating !== null && film.rating !== undefined ? `⭐ ${film.rating}/10` : "Pas de note";
    meta.textContent = `${film.director || "Réalisateur non renseigné"} · ${film.release_date || "Date inconnue"} · ${ratingDisplay}`;

    const tagsP = document.createElement("p");
    tagsP.style.fontSize = "0.85rem";
    tagsP.style.color = "#38bdf8";
    tagsP.textContent = film.tags && film.tags.length > 0
      ? `Genres : ${film.tags.join(", ")}`
      : "Genres : Non spécifié";

    const actorsP = document.createElement("p");
    actorsP.style.fontSize = "0.85rem";
    actorsP.textContent = film.actors && film.actors.length > 0
      ? `Acteurs : ${film.actors.join(", ")}`
      : "Acteurs : Non renseigné";

    const diffusionP = document.createElement("p");
    diffusionP.style.fontSize = "0.85rem";
    if (film.cinema_only) {
      diffusionP.textContent = `Cinéma uniquement ${film.cinema_room ? `(${film.cinema_room})` : ""}`;
    } else {
      diffusionP.textContent = `Plateformes : ${film.platforms && film.platforms.length > 0 ? film.platforms.join(", ") : "Non spécifié"}`;
    }

    const actions = document.createElement("div");
    actions.style.marginTop = "0.6rem";

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.textContent = profile.favorites.includes(film.id) ? "★ Favori" : "☆ Favori";
    favBtn.addEventListener("click", () => {
      toggleInProfile("favorites", film.id);
      updateCatalog();
    });

    const watchedBtn = document.createElement("button");
    watchedBtn.type = "button";
    watchedBtn.textContent = profile.watched.includes(film.id) ? "✔ Vu" : "Marquer vu";
    watchedBtn.addEventListener("click", () => {
      toggleInProfile("watched", film.id);
      updateCatalog();
    });

    actions.append(favBtn, watchedBtn);
    leftCol.append(title, meta, tagsP, actorsP, diffusionP, actions);

    const rightCol = document.createElement("div");
    rightCol.className = "film-card-right";

    const synopsisHeading = document.createElement("h4");
    synopsisHeading.textContent = "Résumé";

    const synopsisP = document.createElement("p");
    synopsisP.textContent = film.synopsis || "Aucun résumé disponible pour ce film.";

    rightCol.append(synopsisHeading, synopsisP);

    body.append(leftCol, rightCol);
    card.appendChild(body);
    catalogContainer.appendChild(card);
  });
}

searchTitleInput.addEventListener("input", updateCatalog);
searchActorInput.addEventListener("input", updateCatalog);
searchGenreInput.addEventListener("input", updateCatalog);
searchDirectorInput.addEventListener("input", updateCatalog);
sortBySelect.addEventListener("change", updateCatalog);
sortOrderSelect.addEventListener("change", updateCatalog);
platformRadios.forEach((radio) => radio.addEventListener("change", updateCatalog));

updateCatalog();