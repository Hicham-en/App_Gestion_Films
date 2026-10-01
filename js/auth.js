// ===== Authentification : inscription, connexion, déconnexion =====

const USERS_KEY = "users";
const SESSION_KEY = "session";

// ---------- Stockage ----------

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

// ---------- Mot de passe ----------
// Règle unique du projet : exactement 8 caractères, dont 1 majuscule,
// 1 minuscule, 1 chiffre et 1 caractère spécial.
// Renvoie le message d'erreur, ou null si le mot de passe est correct.
function validatePassword(password) {
  const erreurs = [];

  if (password.length !== 8) erreurs.push("exactement 8 caractères");
  if (!/[A-Z]/.test(password)) erreurs.push("1 majuscule");
  if (!/[a-z]/.test(password)) erreurs.push("1 minuscule");
  if (!/[0-9]/.test(password)) erreurs.push("1 chiffre");
  if (!/[^A-Za-z0-9]/.test(password)) erreurs.push("1 caractère spécial");

  return erreurs.length ? `Mot de passe invalide — il faut : ${erreurs.join(", ")}.` : null;
}

// Hash SHA-256 pour ne pas stocker le mot de passe en clair
async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- Inscription ----------
async function register(username, password, role) {
  username = username.trim();

  if (!username) return { ok: false, error: "L'identifiant est obligatoire." };

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  // Le <select> de register.html ne propose que ces deux valeurs,
  // on revérifie quand même pour ne pas créer de compte avec un rôle inconnu.
  if (role !== "client" && role !== "admin")
    return { ok: false, error: "Le rôle doit être client ou administrateur." };

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: "Cet identifiant existe déjà." };

  users.push({
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password),
    role
  });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  return { ok: true };
}

// ---------- Connexion / déconnexion ----------
async function login(username, password) {
  const user = getUsers().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  const hash = await hashPassword(password);

  if (!user || user.passwordHash !== hash)
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

    const result = await register(data.get("username"), password, data.get("role"));

    if (!result.ok) return showAuthMessage(registerForm, result.error, true);

    registerForm.reset();
    showAuthMessage(registerForm, "Compte créé. Redirection vers la connexion...", false);
    setTimeout(() => (window.location.href = "login.html"), 900);
  });
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

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logout();
    window.location.href = "login.html";
  });
}

// ---------- Affichage selon les droits ----------
// Remplit la barre de session et masque les liens réservés aux administrateurs
function applyPermissions() {
  const session = getSession();
  if (!session) return;

  const who = document.querySelector(".top-bar .who");
  if (who) {
    who.innerHTML = "";
    const name = document.createElement("strong");
    name.textContent = session.username;
    const role = document.createElement("span");
    role.className = "role";
    role.textContent = session.role === "admin" ? "Administrateur" : "Client";
    who.append(name, " ", role);
  }

  if (session.role === "admin") return;

  document.querySelectorAll("[data-admin-only]").forEach((el) => el.remove());
}

applyPermissions();
