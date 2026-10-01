// ===== Page d'administration =====

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

// Les films vivent dans MongoDB : ils sont charges au demarrage de la page
// puis gardes en memoire le temps de la visite.
let filmsEnMemoire = [];

function setFilms(liste) {
    filmsEnMemoire = liste;
}

function getFilms() {
    return filmsEnMemoire;
}

function checkTitle() {
    const title = titleInput.value.trim();
    // Le film en cours de modification pas doublon.
    const dejaPris = getFilms().some(
        (film) =>
            film.id !== editingId &&
            film.title.toLowerCase() === title.toLowerCase(),
    );
    const message =
        title !== "" && dejaPris ? "Un film avec ce titre existe déjà." : "";

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

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (checkTitle()) return;

    let platforms = [];
    if (!cinemaOnly.checked) {
        platforms = [
            ...form.querySelectorAll('input[name="platforms[]"]:checked'),
        ].map((input) => input.value);
        if (platforms.length === 0)
            return showAlert(
                "Choisissez au moins une plateforme, ou cochez « Sortie exclusivement en salle ».",
            );
    }

    const data = new FormData(form);

    const film = {
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
        platforms,
    };

    if (editingId) {
        const ok = await modifierFilm(editingId, film);
        editingId = null;
        form.reset();
        togglePlatforms();
        checkTitle();
        form.querySelector(".btn-submit").textContent = "Ajouter le film";

        setFilms(await chargerFilms());
        renderFilmsList();

        return showAlert(
            ok
                ? `Film « ${film.title} » modifié.`
                : "La modification a échoué.",
        );
    }

    const nouveau = await ajouterFilm(film);

    form.reset();
    togglePlatforms();
    checkTitle();

    setFilms(await chargerFilms());
    renderFilmsList();

    showAlert(
        nouveau
            ? `Film « ${film.title} » ajouté.`
            : "L'ajout a échoué.",
    );
});

// ---------- Modifier un film ----------

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

    form.querySelector(".btn-submit").textContent =
        "Enregistrer les modifications";
    showAlert(`Modification de « ${film.title} ».`);
    checkTitle();

    if (typeof form.scrollIntoView === "function")
        form.scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
    editingId = null;
    form.reset();
    togglePlatforms();
    checkTitle();
    form.querySelector(".btn-submit").textContent = "Ajouter le film";
    showAlert("");
}

// ---------- Supprimer un film ----------

async function deleteFilm(filmId) {
    const film = getFilms().find((f) => f.id === filmId);
    if (!film) return { ok: false, error: "Film introuvable." };

    if (
        !confirm(
            `Supprimer le film « ${film.title} » ?\nIl sera aussi retiré des favoris et de l'historique de tous les comptes.`,
        )
    )
        return { ok: false };

    const resultat = await supprimerFilm(filmId);

    if (editingId === filmId) cancelEdit();

    setFilms(await chargerFilms());
    renderFilmsList();

    return {
        ok: true,
        titre: film.title,
        comptesNettoyes: resultat?.comptesNettoyes ?? 0,
    };
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
        delBtn.addEventListener("click", async () => {
            const result = await deleteFilm(film.id);
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

async function demarrerAdministration() {
    setFilms(await chargerFilms());
    renderFilmsList();
}

demarrerAdministration();
