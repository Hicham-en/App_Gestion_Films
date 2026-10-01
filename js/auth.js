// ===== Authentification : inscription, connexion, déconnexion =====

const SESSION_KEY = "session";

// Compte administrateur principal, créé d'origine au démarrage.
// C'est le SEUL habilité à créer d'autres comptes administrateurs.
// Les autres admins, qu'il crée, peuvent seulement créer des clients.
const ADMIN = {
  username: "Admin",
  password: "Admin@12",
  role: "admin",
  isPrincipal: true
};

// ---------- Stockage ----------
// Les comptes vivent dans MongoDB : ils sont chargés au démarrage de la
// page puis gardés en mémoire le temps de la visite (voir demarrer()).
let comptesEnMemoire = [];

// Remplace l'ancien tableau de comptes par la liste venue du serveur.
function setUsers(utilisateurs) {
  comptesEnMemoire = utilisateurs;
}

function getUsers() {
  return comptesEnMemoire;
}

// ---------- Outil de développement ----------
// Affiche la liste des comptes dans la console du navigateur, pour
// vérifier les données pendant le TP. Les mots de passe ne sont plus
// disponibles ici : ils restent dans la base et ne descendent jamais
// dans le navigateur.
//  - afficherUsers()      : tableau lisible dans la console
//  - afficherUsers(true)  : ajoute les identifiants techniques (id)
// À appeler manuellement : ouvrir la console (F12) puis taper afficherUsers()
// Aucun bouton ne l'appelle : elle reste invisible dans l'interface.
function afficherUsers(avecIds = false) {
  const users = getUsers();

  if (!users.length) {
    console.log("Aucun compte enregistré.");
    return [];
  }

  console.table(
    users.map((u) => {
      const base = {
        identifiant: u.username,
        profil: u.role === "admin" ? "Administrateur" : "Client"
      };
      // L'id en premiere colonne quand on le demande.
      return avecIds ? { id: u.id, ...base } : base;
    })
  );

  console.log(`${users.length} compte(s) enregistré(s).`);
  return users;
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

// ---------- Mot de passe ----------
// Règle unique du projet : au moins 4 caractères, dont 1 majuscule,
// 1 minuscule, 1 chiffre et 1 caractère spécial.
// Renvoie le message d'erreur, ou null si le mot de passe est correct.
function validatePassword(password) {
  const erreurs = [];

  if (password.length < 4) erreurs.push("au moins 4 caractères");
  if (!/[A-Z]/.test(password)) erreurs.push("1 majuscule");
  if (!/[a-z]/.test(password)) erreurs.push("1 minuscule");
  if (!/[0-9]/.test(password)) erreurs.push("1 chiffre");
  if (!/[^A-Za-z0-9]/.test(password)) erreurs.push("1 caractère spécial");

  return erreurs.length ? `Mot de passe invalide — il faut : ${erreurs.join(", ")}.` : null;
}

// ---------- Inscription ----------
// Toute inscription crée un compte client. Le seul compte administrateur
// est celui défini plus haut (ADMIN), créé automatiquement au démarrage.
async function register(username, password) {
  username = username.trim();

  if (!username) return { ok: false, error: "L'identifiant est obligatoire." };

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  // Le serveur refuse aussi les doublons ; ce test local evite un aller-retour.
  if (getUsers().some((u) => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: "Cet identifiant existe déjà." };

  const resultat = await creerCompte(username, password, "client");
  if (!resultat.ok) return resultat;

  // On recharge la liste : le nouveau compte doit y figurer.
  setUsers(await chargerComptes());
  return { ok: true };
}

// ---------- Suppression d'un compte (réservée aux administrateurs) ----------
// Supprime le compte, sa session s'il était connecté, et ses favoris /
// son historique (ils sont privés à ce compte, donc inutiles sans lui).
// Deux protections : on ne supprime jamais son propre compte, ni le compte
// administrateur principal (le projet garderait plus aucun accès).
async function deleteAccount(userId) {
  const session = getSession();
  if (!session || session.role !== "admin")
    return { ok: false, error: "Seul un administrateur peut supprimer un compte." };

  const cible = getUsers().find((u) => u.id === userId);
  if (!cible) return { ok: false, error: "Ce compte n'existe pas." };

  if (cible.id === session.id)
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };

  if (cible.isPrincipal)
    return {
      ok: false,
      error: "Le compte administrateur principal ne peut pas être supprimé."
    };

  // Le serveur supprime aussi le profil : les favoris et l'historique
  // de ce compte ne serviraient plus a personne.
  const ok = await supprimerCompte(cible.id);
  if (!ok) return { ok: false, error: "La suppression a échoué." };

  setUsers(await chargerComptes());
  return { ok: true, supprime: cible.username };
}

// ---------- Création d'un compte (réservée aux administrateurs) ----------
// Les utilisateurs créent eux-mêmes leur compte client via register().
// Ici, l'administration crée des comptes : un admin pour des clients,
// et le compte principal seul peut créer un admin.
async function createAccount(username, password, role) {
  const session = getSession();
  if (!session || session.role !== "admin")
    return { ok: false, error: "Seul un administrateur peut créer un compte." };

  username = username.trim();
  if (!username) return { ok: false, error: "L'identifiant est obligatoire." };

  if (role !== "client" && role !== "admin")
    return { ok: false, error: "Le rôle doit être client ou administrateur." };

  // Créer un administrateur est réservé au compte principal.
  if (role === "admin" && !isPrincipalAdmin())
    return {
      ok: false,
      error: "Seul le compte administrateur principal peut créer un administrateur."
    };

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  // Le serveur refuse aussi les doublons ; ce test local evite un aller-retour.
  if (getUsers().some((u) => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: "Cet identifiant existe déjà." };

  const resultat = await creerCompte(username, password, role);
  if (!resultat.ok) return resultat;

  setUsers(await chargerComptes());
  return { ok: true };
}

// ---------- Création du compte administrateur ----------
// Appelé au chargement de chaque page. Sans effet si le compte existe déjà
// dans la base (il n'est donc jamais écrasé ni dupliqué) : c'est le serveur
// qui refuse un identifiant déjà pris.
async function ensureAdmin() {
  const dejaPresent = getUsers().some(
    (u) => u.username.toLowerCase() === ADMIN.username.toLowerCase()
  );
  if (dejaPresent) return;

  const resultat = await creerCompte(
    ADMIN.username,
    ADMIN.password,
    ADMIN.role,
    true
  );

  if (resultat.ok) setUsers(await chargerComptes());
}

// Vrai si l'utilisateur connecté est le compte administrateur principal.
// Le drapeau est stocké avec le compte, pas dans la session : un admin
// secondaire ne peut pas se le fabriquer en modifiant la session.
function isPrincipalAdmin() {
  const session = getSession();
  if (!session || session.role !== "admin") return false;

  const user = getUsers().find((u) => u.id === session.id);
  return user?.isPrincipal === true;
}

// ---------- Connexion / déconnexion ----------
async function login(username, password) {
  // Sur la page de connexion il n'y a pas de session, donc les comptes
  // peuvent n'avoir jamais ete charges : on s'en assure ici.
  if (!getUsers().length) setUsers(await chargerComptes());

  const user = getUsers().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  // Les mots de passe restent dans la base : la verification se fait
  // sur le serveur, qui répond par un simple ok / erreur.
  const verification = await verifierIdentifiants(username, password);

  if (!user || !verification)
    return { ok: false, error: "Identifiant ou mot de passe incorrect." };

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id: user.id, username: user.username, role: user.role })
  );
  return { ok: true, user };
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// ---------- Protection des pages ----------
// Appelée en haut de chaque page : redirige vers la connexion si
// l'utilisateur n'est pas connecté, ou s'il n'a pas le bon rôle.
//   requireRole()        -> n'importe quel utilisateur connecté
//   requireRole("admin") -> administrateurs uniquement
function requireRole(role) {
  const session = getSession();
  const autorise = session && (!role || session.role === role);

  if (!autorise) window.location.href = "login.html";
}

// ---------- Démarrage ----------
// Les comptes viennent de la base : on les charge avant de laisser
// la page fonctionner, sinon requireRole() ne verrait personne.
// Chaque page appelle demarrer() juste apres ses propres scripts.
async function chargerLaBase() {
  setUsers(await chargerComptes());
  await ensureAdmin();
}

// ---------- Messages des formulaires ----------
// Chaque formulaire possède une zone <div id="...-alert" class="alert">
// (voir login.html et register.html).
function showAuthMessage(form, text, isError) {
  const box = document.getElementById(form.id.replace("-form", "") + "-alert");

  box.hidden = false;
  box.textContent = text;
  // .alert est déjà rouge par défaut, .alert.success le rend vert.
  box.classList.toggle("success", !isError);
}

// ---------- Branchement sur les formulaires ----------

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(registerForm);

    const password = data.get("password");

    if (password !== data.get("password2"))
      return showAuthMessage(registerForm, "Les mots de passe ne correspondent pas.", true);

    const result = await register(data.get("username"), password);

    if (!result.ok) return showAuthMessage(registerForm, result.error, true);

    registerForm.reset();
    showAuthMessage(registerForm, "Compte créé. Redirection vers la connexion...", false);
    setTimeout(() => (window.location.href = "login.html"), 900);
  });
}

// Page d'administration : l'admin connecté crée les comptes,
// et la liste des comptes existants est affichée sous le formulaire.
const accountForm = document.getElementById("create-account-form");
if (accountForm) {
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(accountForm);

    const result = await createAccount(
      data.get("username"),
      data.get("password"),
      data.get("role")
    );

    if (!result.ok) return showAuthMessage(accountForm, result.error, true);

    accountForm.reset();
    showAuthMessage(accountForm, "Compte créé.", false);
    renderAccounts();
  });

  // Seul le compte principal peut choisir le rôle admin : on masque
  // l'option pour les autres administrateurs plutôt que de la laisser
  // échouer à la validation. Les comptes arrivent de la base, donc
  // ce test ne peut pas se faire avant le chargement.
  chargerLaBase().then(() => {
    if (isPrincipalAdmin()) return;

    const roleSelect = document.getElementById("account-role");
    const optionAdmin = roleSelect.querySelector('option[value="admin"]');
    if (optionAdmin) optionAdmin.remove();

    const hint = document.getElementById("accounts-hint");
    if (hint) hint.textContent = "Vous pouvez créer des comptes clients.";

    renderAccounts();
  });
}

// Affiche le tableau des comptes (jamais les mots de passe).
function renderAccounts() {
  const tbody = document.getElementById("accounts-list");
  if (!tbody) return;

  const session = getSession();
  tbody.innerHTML = "";

  for (const user of getUsers()) {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = user.username;
    const role = document.createElement("td");
    role.textContent =
      user.role === "admin"
        ? user.isPrincipal ? "Administrateur principal" : "Administrateur"
        : "Client";
    row.append(name, role);

    const actions = document.createElement("td");

    // Le compte connecté et le compte principal ne sont jamais supprimables :
    // le bouton n'est tout simplement pas affiché pour eux.
    const supprimerPossible =
      session &&
      session.role === "admin" &&
      user.id !== session.id &&
      !user.isPrincipal;

    if (supprimerPossible) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-delete";
      btn.textContent = "Supprimer";

      btn.addEventListener("click", async () => {
        // Confirmation avant une action définitive.
        const ok = confirm(
          `Supprimer le compte « ${user.username} » ?\n` +
            "Ses favoris et son historique seront aussi supprimés."
        );
        if (!ok) return;

        const result = await deleteAccount(user.id);
        showAuthMessage(
          document.getElementById("create-account-form"),
          result.ok ? `Compte « ${result.supprime} » supprimé.` : result.error,
          !result.ok
        );
        renderAccounts();
      });

      actions.append(btn);
    } else {
      actions.textContent = user.id === session?.id ? "—" : "";
    }

    row.append(actions);
    tbody.append(row);
  }
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);

    const result = await login(data.get("username"), data.get("password"));

    if (!result.ok) return showAuthMessage(loginForm, result.error, true);

    // Un admin arrive sur l'administration, un client sur son profil.
    window.location.href = result.user.role === "admin" ? "index.html" : "profil.html";
  });
}

// ---------- Barre de navigation ----------
// Écrite une seule fois ici et injectée dans le <nav class="navbar">
// de chaque page. Toutes les pages connectées sont donc reliées entre elles,
// et il n'y a qu'un seul endroit à modifier si la navigation change.
function buildNavbar() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;

  const session = getSession();
  nav.innerHTML = "";

  if (!session) return;

  // Nom de l'utilisateur + rôle, à gauche.
  const who = document.createElement("span");
  who.className = "who";

  const name = document.createElement("strong");
  name.textContent = session.username;

  const role = document.createElement("span");
  role.className = "role";
  role.textContent = session.role === "admin" ? "Administrateur" : "Client";

  who.append(name, " ", role);
  nav.append(who);

  // Liens vers les autres pages, à droite.
  const liens = [{ href: "catalogue.html", label: "Catalogue" }];

  if (session.role === "admin") {
    liens.push({ href: "profil.html", label: "Mon profil" });
    liens.push({ href: "index.html", label: "Administration" });
  } else {
    // Un client n'a pas de liste de films à gérer : ses favoris et son
    // historique sont dans le catalogue.
    liens.push({ href: "profil.html", label: "Mes films" });
  }

  for (const { href, label } of liens) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    nav.append(a);
  }

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.id = "logout-btn";
  logoutBtn.className = "btn-logout";
  logoutBtn.textContent = "Déconnexion";
  logoutBtn.addEventListener("click", () => {
    logout();
    window.location.href = "login.html";
  });
  nav.append(logoutBtn);
}

buildNavbar();

// Le compte administrateur existe dès la première visite, sans écraser
// un compte déjà présent. Sur les pages d'authentification il n'y a
// aucune session : c'est la page d'administration qui s'en charge.
if (getSession()) chargerLaBase();
