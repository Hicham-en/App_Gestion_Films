// ===== Page du profil : voir tous les films, favoris et déjà vus =====

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
    // On remplace l'ancienne clé "isbn" par la clé "id".
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

function renderFilms(filter = "all") {
  const container = document.getElementById("films-list");
  const profile = getProfile();
  let films = getFilms();

  if (filter === "favorites")
    films = films.filter((f) => profile.favorites.includes(f.id));
  if (filter === "watched")
    films = films.filter((f) => profile.watched.includes(f.id));

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
    favBtn.textContent = profile.favorites.includes(film.id)
      ? "★ Retirer des favoris"
      : "☆ Mettre en favori";
    favBtn.addEventListener("click", () => {
      toggleInProfile("favorites", film.id);
      renderFilms(filter);
    });

    const watchedBtn = document.createElement("button");
    watchedBtn.type = "button";
    watchedBtn.textContent = profile.watched.includes(film.id)
      ? "✔ Déjà vu"
      : "Marquer comme déjà vu";
    watchedBtn.addEventListener("click", () => {
      toggleInProfile("watched", film.id);
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
