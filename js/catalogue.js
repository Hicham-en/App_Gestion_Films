const STORAGE_KEY = "films";
const PROFILE_KEY = "profile";

function getFilms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return {
      favorites: Array.isArray(p?.favorites) ? p.favorites : [],
      watched: Array.isArray(p?.watched) ? p.watched : []
    };
  } catch {
    return { favorites: [], watched: [] };
  }
}

function toggleInProfile(list, filmId) {
  const profile = getProfile();
  const index = profile[list].indexOf(filmId);
  if (index === -1) profile[list].push(filmId);
  else profile[list].splice(index, 1);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
    favBtn.textContent = profile.favorites.includes(film.isbn) ? "★ Favori" : "☆ Favori";
    favBtn.addEventListener("click", () => {
      toggleInProfile("favorites", film.isbn);
      updateCatalog();
    });

    const watchedBtn = document.createElement("button");
    watchedBtn.type = "button";
    watchedBtn.textContent = profile.watched.includes(film.isbn) ? "✔ Vu" : "Marquer vu";
    watchedBtn.addEventListener("click", () => {
      toggleInProfile("watched", film.isbn);
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