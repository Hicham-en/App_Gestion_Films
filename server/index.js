import express from "express";
import { connect } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

const db = await connect();
const films = db.collection("films");

// Etat connexion
app.get("/api/films", async (req, res) => {
  try {
    const liste = await films.find({}).toArray();
    res.json(liste);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/films/:id", async (req, res) => {
  const film = await films.findOne({ _id: req.params.id });
  if (!film) return res.status(404).json({ error: "Film introuvable" });
  res.json(film);
});

// POST /api/films  { title, director, ... }
app.post("/api/films", async (req, res) => {
  if (!req.body.title || !req.body.director) {
    return res.status(400).json({ error: "Titre et realisateur obligatoires" });
  }
  const film = { ...req.body, _id: req.body.id || crypto.randomUUID() };
  await films.insertOne(film);
  res.status(201).json(film);
});

app.put("/api/films/:id", async (req, res) => {
  const { _id, ...champs } = req.body;
  const resultat = await films.updateOne(
    { _id: req.params.id },
    { $set: champs }
  );
  if (resultat.matchedCount === 0) {
    return res.status(404).json({ error: "Film introuvable" });
  }
  res.json({ ok: true, id: req.params.id });
});

app.delete("/api/films/:id", async (req, res) => {
  await films.deleteOne({ _id: req.params.id });
  res.json({ ok: true, id: req.params.id });
});

// GET /api/etat
app.get("/api/etat", async (req, res) => {
  const nombre = await films.countDocuments();
  res.json({ ok: true, base: "films", films: nombre });
});

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
  console.log(`Base MongoDB : ${process.env.MONGO_URL || "localhost:27017"}`);
});