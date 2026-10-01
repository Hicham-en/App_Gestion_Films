// npm run seed
import { connect } from "./db.js";

const films = [
  {
    title: "Alien",
    tags: ["Sci-Fi", "Horreur"],
    release_date: "1979-05-25",
    director: "Ridley Scott",
    rating: 9,
    synopsis:
      "L'equipage d'un cargo commercial decouvre une creature extraterrestre a bord.",
    actors: ["Sigourney Weaver", "Tom Skerritt"],
    cinema_only: false,
    cinema_room: "",
    platforms: ["netflix"],
  },
  {
    title: "Inception",
    tags: ["Science-fiction", "Thriller"],
    release_date: "2010-07-16",
    director: "Christopher Nolan",
    rating: 8.5,
    synopsis:
      "Un voleur de reves accepte une mission pour implanter une idee dans l'esprit d'un patron.",
    actors: ["Leonardo DiCaprio", "Marion Cotillard"],
    cinema_only: false,
    cinema_room: "",
    platforms: ["prime"],
  },
  {
    title: "Interstellar",
    tags: ["Science-fiction", "Drame"],
    release_date: "2014-11-05",
    director: "Christopher Nolan",
    rating: 8.7,
    synopsis:
      "Un groupe d'explorateurs utilise un trou de ver pour chercher une nouvelle terre pour l'humanite.",
    actors: ["Matthew McConaughey", "Anne Hathaway"],
    cinema_only: false,
    cinema_room: "",
    platforms: ["netflix", "prime"],
  },
];

const db = await connect();
const collection = db.collection("films");

const existantes = await collection.countDocuments();
if (existantes > 0) {
  console.log(`La base contient deja ${existantes} film(s) : rien n'est ajoute.`);
  console.log("Pour repartir de zero : docker compose down -v");
  process.exit(0);
}

const avecId = films.map((film) => ({ ...film, _id: crypto.randomUUID() }));
await collection.insertMany(avecId);

console.log(`${avecId.length} films ajoutes dans la base "films".`);
console.log("Consulte-les avec : curl http://localhost:3000/api/films");
process.exit(0);