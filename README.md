# App_Gestion_Films

Petite application web (HTML / CSS / JavaScript pur, sans dépendance).

## Lancer l'application

Ouvre `login.html` dans ton navigateur (double-clic sur le fichier).
Crée un compte depuis `register.html`, puis connecte-toi.

- Un **client** arrive sur `profil.html` : il voit les films, ses favoris et ses films déjà vus.
- Un **administrateur** arrive sur `index.html` : il peut ajouter un film.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `login.html` / `register.html` | Connexion et création de compte |
| `index.html` + `js/app.js` | Page d'administration : ajouter un film |
| `profil.html` + `js/profile.js` | Films du catalogue, favoris, déjà vus |
| `js/auth.js` | Partagé par toutes les pages : inscription, session, protection |
| `css/style.css` | Le style de toutes les pages |

## Où sont les données ?

Tout est stocké dans le `localStorage` du navigateur :

| Clé | Contenu |
| --- | --- |
| `users` | Les comptes créés (mot de passe hashé en SHA-256) |
| `session` | Le compte connecté et son rôle |
| `films` | Le catalogue de films |
| `profile` | Les favoris et les films déjà vus |

Pour repartir de zéro, vide le localStorage des pages `local.test` dans les outils de développement du navigateur.

> Attention : c'est du JavaScript côté navigateur, ce n'est **pas sécurisé**.
> N'importe qui peut modifier le `localStorage` depuis la console.
> Un vrai site doit vérifier le rôle et le mot de passe **sur un serveur**.
