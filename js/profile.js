// ===== Page du profil =====

requireRole();

let filmsEnMemoire = [];
let profilEnMemoire = { favorites: [], watched: [] };

function setFilms(liste) {
    filmsEnMemoire = liste;
}

function getFilms() {
    return filmsEnMemoire;
}

function setProfil(profil) {
    profilEnMemoire = profil;
}

function profileKey() {
    const session = getSession();
    return session ? session.id : null;
}

function getProfile() {
    return profilEnMemoire;
}

async function toggleInProfile(list, filmId) {
    const userId = profileKey();
    if (!filmId || !userId) return;

    setProfil(await basculerProfil(userId, list, filmId, getProfile()));
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
        favBtn.addEventListener("click", async () => {
            await toggleInProfile("favorites", film.id);
            renderFilms(filter);
        });

        const watchedBtn = document.createElement("button");
        watchedBtn.type = "button";
        watchedBtn.textContent = profile.watched.includes(film.id)
            ? "✔ Déjà vu"
            : "Marquer comme déjà vu";
        watchedBtn.addEventListener("click", async () => {
            await toggleInProfile("watched", film.id);
            renderFilms(filter);
        });

        card.append(title, info, favBtn, watchedBtn);
        container.appendChild(card);
    });
}

document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => renderFilms(btn.dataset.filter));
});

async function demarrerProfil() {
    setFilms(await chargerFilms());

    const userId = profileKey();
    if (userId) setProfil(await chargerProfil(userId));

    renderFilms();
}

demarrerProfil();
