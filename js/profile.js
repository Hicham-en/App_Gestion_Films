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

function renderFilms(filter = "all") {
  const container = document.getElementById("films-list");
  const profile = getProfile();
  let films = getFilms();

  if (filter === "favorites")
    films = films.filter((f) => profile.favorites.includes(f.isbn));
  if (filter === "watched")
    films = films.filter((f) => profile.watched.includes(f.isbn));

  container.innerHTML = "";
  if (films.length === 0) {
    container.textContent = "Aucun film à afficher.";
    return;
  }

  films.forEach((film) => {
    const card = document.createElement("article");
    card.className = "film-card";

    const title = document.createElement("h3");
    title.textContent = film.title;

    const info = document.createElement("p");
    info.textContent = `${film.director} · ${film.release_date}`;

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.textContent = profile.favorites.includes(film.isbn)
      ? "★ Retirer des favoris"
      : "☆ Mettre en favori";
    favBtn.addEventListener("click", () => {
      toggleInProfile("favorites", film.isbn);
      renderFilms(filter);
    });

    const watchedBtn = document.createElement("button");
    watchedBtn.type = "button";
    watchedBtn.textContent = profile.watched.includes(film.isbn)
      ? "✔ Déjà vu"
      : "Marquer comme déjà vu";
    watchedBtn.addEventListener("click", () => {
      toggleInProfile("watched", film.isbn);
      renderFilms(filter);
    });

    card.append(title, info, favBtn, watchedBtn);
    container.appendChild(card);
  });
}

document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => renderFilms(btn.dataset.filter));
});

renderFilms();
