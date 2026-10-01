//   npm run bd              -> tout afficher
//   npm run bd films        -> seulement les films
//   npm run bd comptes     -> seulement les comptes
//   npm run bd favoris     -> seulement les favoris

import { connect } from "./db.js";

const db = await connect();
const quoi = process.argv[2] || "tout";

const films = db.collection("films");
const users = db.collection("users");
const profiles = db.collection("profiles");

function titre(texte) {
  console.log("\n=== " + texte + " ===");
}

async function nomDe(userId) {
  const user = await users.findOne({ _id: userId });
  return user ? user.username : userId + " (compte introuvable)";
}

function afficherFilms(filmsTrouves) {
  if (filmsTrouves.length === 0) {
    console.log("  Aucun film.");
    return;
  }
  for (const f of filmsTrouves.sort((a, b) => a.title.localeCompare(b.title))) {
    console.log(`  • ${f.title} — ${f.director} (${f.release_date})`);
    console.log(`    note ${f.rating ?? "—"} | genres : ${(f.tags || []).join(", ") || "—"}`);
    console.log(
      `    plateformes : ${(f.platforms || []).join(", ") || (f.cinema_only ? "salle uniquement" : "—")}`
    );
    if (f.actors?.length) console.log(`    acteurs : ${f.actors.join(", ")}`);
    if (f.synopsis) console.log(`    résumé : ${f.synopsis}`);
    if (f.cinema_room) console.log(`    salle : ${f.cinema_room}`);
  }
}

if (quoi === "tout" || quoi === "films") {
  titre(`FILMS (${await films.countDocuments()})`);
  afficherFilms(await films.find({}).toArray());
}

if (quoi === "tout" || quoi === "comptes") {
  const liste = await users.find({}).toArray();
  titre(`COMPTES (${liste.length})`);
  if (liste.length === 0) console.log("  Aucun compte.");
  // Les mots de passe sont volontairement affiches
  for (const u of liste.sort((a, b) => a.username.localeCompare(b.username))) {
    const role = u.role === "admin" ? "administrateur" : "client";
    const principal = u.isPrincipal ? " (principal)" : "";
    console.log(`  • ${u.username} — ${role}${principal}`);
    console.log(`    mot de passe : ${u.password}`);
  }
}

if (quoi === "tout" || quoi === "favoris") {
  const liste = await profiles.find({}).toArray();
  titre(`FAVORIS ET HISTORIQUE (${liste.length} profil(s))`);
  if (liste.length === 0) console.log("  Aucun profil.");
  for (const p of liste) {
    console.log(`  ${await nomDe(p.userId)}`);
    const tous = [...(p.favorites || []), ...(p.watched || [])];
    if (tous.length === 0) {
      console.log("    aucun favori, aucun film vu");
      continue;
    }
    for (const id of tous) {
      const f = await films.findOne({ _id: id });
      const kind = (p.favorites || []).includes(id) ? "favori" : "vu";
      console.log(`    ${kind} : ${f ? f.title : id + " (film supprimé)"}`);
    }
  }
}

console.log("");
process.exit(0);