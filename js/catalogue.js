// ===== Catalogue des films =====

const STORAGE_KEY = "films";

requireRole();

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

function profileKey() {
  const session = getSession();
  return session ? `profile_${session.id}` : null;
}


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
const sortBySelect = document.getElementById("sort-by");
const sortOrderSelect = document.getElementById("sort-order");
const platformRadios = document.querySelectorAll('input[name="platform-filter"]');
const catalogContainer = document.getElementById("catalog-list");
const countContainer = document.getElementById("films-count");

function updateCatalog() {
  const queryTitle = searchTitleInput.value.trim().toLowerCase();
  const queryActor = searchActorInput.value.trim().toLowerCase();
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

    // Titre et Note
    const title = document.createElement("h3");
    title.textContent = film.title ? film.title.toUpperCase() : "Sans titre";

    const meta = document.createElement("p");
    const ratingDisplay = film.rating !== null && film.rating !== undefined ? `⭐ ${film.rating}/10` : "Pas de note";
    meta.textContent = `${film.director || "Réalisateur inconnu"} · ${film.release_date || "Date inconnue"} · ${ratingDisplay}`;

    const actorsP = document.createElement("p");
    actorsP.style.fontSize = "0.85rem";
    actorsP.textContent = film.actors && film.actors.length > 0 
      ? `Acteurs : ${film.actors.join(", ")}` 
      : "Aucun acteur renseigné";

    const diffusionP = document.createElement("p");
    diffusionP.style.fontSize = "0.85rem";
    if (film.cinema_only) {
      diffusionP.textContent = `Cinéma uniquement ${film.cinema_room ? `(${film.cinema_room})` : ""}`;
    } else {
      diffusionP.textContent = `Plateformes : ${film.platforms && film.platforms.length > 0 ? film.platforms.join(", ") : "Non spécifié"}`;
    }

    const synopsisP = document.createElement("p");
    synopsisP.style.marginTop = "0.5rem";
    synopsisP.textContent = film.synopsis || "Aucun synopsis disponible.";

    // Actions Favoris / Déjà vu
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

    card.append(title, meta, actorsP, diffusionP, synopsisP, favBtn, watchedBtn);
    catalogContainer.appendChild(card);
  });
}

searchTitleInput.addEventListener("input", updateCatalog);
searchActorInput.addEventListener("input", updateCatalog);
sortBySelect.addEventListener("change", updateCatalog);
sortOrderSelect.addEventListener("change", updateCatalog);
platformRadios.forEach((radio) => radio.addEventListener("change", updateCatalog));

updateCatalog();