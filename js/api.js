// ===== Lier MongoDB =====

const API_URL = "http://localhost:3000/api";

async function api(chemin, options = {}) {
  try {
    const reponse = await fetch(API_URL + chemin, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!reponse.ok) return null;
    return await reponse.json();
  } catch {
    
    if (!api.averti) {
      api.averti = true;
      console.error(
        "Serveur injoignable. Lancez « npm start » (et « docker compose up -d »)."
      );
    }
    return null;
  }
}

// ---------- Films ----------

function versFilm(document) {
  if (!document) return null;
  const { _id, ...reste } = document;
  return { id: _id, ...reste };
}

async function chargerFilms() {
  const liste = await api("/films");
  return liste ? liste.map(versFilm) : [];
}

async function ajouterFilm(film) {
  const document = await api("/films", {
    method: "POST",
    body: JSON.stringify(film),
  });
  return versFilm(document);
}

async function modifierFilm(id, film) {
  const resultat = await api(`/films/${id}`, {
    method: "PUT",
    body: JSON.stringify(film),
  });
  return resultat?.ok === true;
}

async function supprimerFilm(id) {
  await api(`/films/${id}/nettoyer`, { method: "POST" });
  return api(`/films/${id}`, { method: "DELETE" });
}

// ---------- Comptes ----------

async function chargerComptes() {
  return (await api("/users")) || [];
}

async function creerCompte(username, password, role, isPrincipal = false) {
  const compte = await api("/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role, isPrincipal }),
  });

  if (compte?.error) return { ok: false, error: compte.error };
  return { ok: true, compte };
}

async function supprimerCompte(id) {
  const resultat = await api(`/users/${id}`, { method: "DELETE" });
  return resultat?.ok === true;
}

async function verifierIdentifiants(username, password) {
  const resultat = await api("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return resultat?.ok === true;
}

// ---------- Profils ----------

async function chargerProfil(userId) {
  const profil = await api(`/profils/${userId}`);
  return {
    favorites: Array.isArray(profil?.favorites) ? profil.favorites : [],
    watched: Array.isArray(profil?.watched) ? profil.watched : [],
  };
}

async function basculerProfil(userId, list, filmId, profilActuel) {
  const listeActuelle = profilActuel?.[list] ?? [];

  const resultat = await api(`/profils/${userId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ list, filmId }),
  });

  if (!resultat || !Array.isArray(resultat[list]))
    return profilActuel || { favorites: [], watched: [] };

  return { ...profilActuel, [list]: resultat[list] };
}