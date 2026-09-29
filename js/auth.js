// ===== Authentification : identifiant + mot de passe + rôle (client / admin) =====

const USERS_KEY = "users";
const SESSION_KEY = "session";
const ROLES = ["client", "admin"];

// ---------- Stockage ----------
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

// ---------- Mot de passe ----------
// Critères : au moins 1 spécial, 1 majuscule, 1 minuscule, 1 chiffre
function validatePassword(password) {
  const errors = [];
  if (!/[A-Z]/.test(password)) errors.push("1 majuscule");
  if (!/[a-z]/.test(password)) errors.push("1 minuscule");
  if (!/[0-9]/.test(password)) errors.push("1 chiffre");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("1 caractère spécial");

  return errors.length
    ? `Le mot de passe doit contenir au moins : ${errors.join(", ")}.`
    : null;
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
  if (!ROLES.includes(role))
    return { ok: false, error: "Le rôle doit être client ou administrateur." };

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: "Cet identifiant existe déjà." };

  users.push({
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password),
    role
  });
  saveUsers(users);

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
// Exemple : requireRole("admin") en haut de app.js, requireRole() pour profile.js
function requireRole(role, redirect = "login.html") {
  const session = getSession();
  if (!session || (role && session.role !== role)) {
    window.location.href = redirect;
    return null;
  }
  return session;
}

// ---------- Branchement sur les formulaires ----------
function showAuthMessage(form, text, isError) {
  // Prefer an existing alert container if present (register-alert / login-alert)
  const alertId = form.id ? `${form.id.replace(/-form$/, "")}-alert` : null;
  let container = null;
  if (alertId) container = document.getElementById(alertId);

  if (container) {
    container.hidden = false;
    container.textContent = text;
    container.classList.toggle("error", !!isError);
    container.classList.toggle("success", !isError);
  } else {
    let msg = form.querySelector(".form-message");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "form-message";
      form.appendChild(msg);
    }
    msg.textContent = text;
    msg.dataset.state = isError ? "error" : "success";
  }
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(registerForm);

    const username = data.get("username");
    const password = data.get("password");
    const password2 = data.get("password2");
    const role = data.get("role");

    // Confirm password
    if (password !== password2)
      return showAuthMessage(registerForm, "Les mots de passe ne correspondent pas.", true);

    // Enforce exact length if the HTML expects it
    if (password.length !== 8)
      return showAuthMessage(registerForm, "Le mot de passe doit faire exactement 8 caractères.", true);

    const result = await register(username, password, role);

    if (!result.ok) return showAuthMessage(registerForm, result.error, true);

    registerForm.reset();
    // Redirect to login page after successful registration
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

    // Successful login -> redirect according to role
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
