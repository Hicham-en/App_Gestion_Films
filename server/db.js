import { MongoClient } from "mongodb";

export const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb://admin:admin123@localhost:27017/?authSource=admin";

export const DB_NAME = process.env.MONGO_DB || "films";

const client = new MongoClient(MONGO_URL);

export async function connect() {
  await client.connect();
  return client.db(DB_NAME);
}