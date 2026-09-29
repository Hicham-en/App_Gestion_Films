const fs = require("fs");
const { JSDOM } = require("jsdom");

const dom = new JSDOM(fs.readFileSync("index.html", "utf8"), {
  runScripts: "outside-only",
  url: "https://local.test"
});
dom.window.crypto = require("crypto").webcrypto;
dom.window.eval(fs.readFileSync("js/app.js", "utf8"));

const { document, Event } = dom.window;
const form = document.getElementById("add-movie-form");
const title = document.getElementById("title");
const cinemaOnly = document.getElementById("cinema-only");
const btn = form.querySelector(".btn-submit");
const alert = form.querySelector("p");
const films = () => JSON.parse(dom.window.localStorage.getItem("films") || "[]");

function type(text) {
  title.value = text;
  title.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
function submit() {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  return { alert: alert.textContent, visible: !alert.hidden, films: films() };
}
function fill(data) {
  form.reset();
  for (const [id, v] of Object.entries(data)) {
    if (id.startsWith("__")) continue;
    const el = document.getElementById(id);
    if (el.type === "checkbox") el.checked = v;
    else el.value = v;
  }
  if (data.__p)
    form.querySelectorAll('input[name="platforms[]"]').forEach((c) => (c.checked = data.__p.includes(c.value)));
}

let fail = 0;
const check = (l, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"} — ${l}${x ? " :: " + x : ""}`); if (!c) fail++; };

const base = { title: "Inception", "release-date": "2010-07-16", director: "Nolan", "cinema-room": "Salle 2", __p: ["netflix"] };

// 1. saisie -> minuscule automatique
type("InCePtIoN");
check("titre force en minuscule", title.value === "inception", title.value);

// 2. premiere saisie sans doublon -> pas d'alerte
check("saisie libre sans alerte", alert.hidden === true);

// 3. ajout reussi
fill(base);
let r = submit();
check("ajout 1re fois", r.films.length === 1 && r.alert === "", JSON.stringify(r.films[0]?.title));

// 4. ALERTE pendant le remplissage si titre deja existant
type("INCEPTION");
check("alerte affichee a la saisie", !alert.hidden && alert.textContent === "Titre déjà existant" && alert.textContent, alert.textContent);
check("bouton desactive", btn.disabled === true);

// 5. tentative d'ajout malgre l'alerte -> refuse
fill(base);
r = submit();
check("soumission refusee", r.films.length === 1 && r.alert === "Titre déjà existant", r.alert);

// 6. titre different -> alerte disparait
type("Interstellar");
check("alerte effacee", alert.hidden === true && btn.disabled === false);

// 7. ajout film 2
fill({ ...base, title: "interstellar" });
r = submit();
check("ajout 2e film", r.films.length === 2);

// 8. plateforme obligatoire
fill({ ...base, title: "Dune", __p: [] });
r = submit();
check("plateforme obligatoire", r.films.length === 2 && r.alert.includes("plateforme"), r.alert);

// 9. salle seule
fill({ title: "Salles", "release-date": "2020-01-01", director: "X", "cinema-only": true, "cinema-room": "Salle 9", __p: ["netflix"] });
r = submit();
const s = r.films.find((f) => f.title === "salles");
check("salle seule : plateformes vides", JSON.stringify(s.platforms) === "[]", JSON.stringify(s.platforms));
check("salle seule : salle conservee", s.cinema_room === "Salle 9", s.cinema_room);

// 10. mix salle + plateformes
fill({ title: "Mixte", "release-date": "2021-01-01", director: "Y", "cinema-room": "Salle 3", "cinema-only": false, __p: ["canal", "disney"] });
r = submit();
const m = r.films.find((f) => f.title === "mixte");
check("mix : salle + 2 plateformes", m.cinema_room === "Salle 3" && m.platforms.length === 2, `${m.cinema_room} / ${JSON.stringify(m.platforms)}`);

// 11. acteurs max 3 (le HTML limite a 3 champs)
fill({ ...base, title: "Acteurs", "actor-1": "A", "actor-2": "B", "actor-3": "C" });
r = submit();
check("3 acteurs", r.films.find((f) => f.title === "acteurs").actors.length === 3);

// 12. format
const last = r.films[r.films.length - 1];
check("isbn present", typeof last.isbn === "string" && last.isbn.length > 10, last.isbn);
check("tags tableau", Array.isArray(last.tags));

console.log(fail === 0 ? "\nTOUT PASSE" : `\n${fail} ECHEC(S)`);
process.exit(fail ? 1 : 0);
