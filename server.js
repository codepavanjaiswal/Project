require("dotenv").config();

const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "html_mongodb_app";
const collectionName = process.env.MONGODB_COLLECTION || "users";

if (!mongoUri) {
  console.error("Missing MONGODB_URI. Copy .env.example to .env and configure it.");
  process.exit(1);
}

const client = new MongoClient(mongoUri);

const allowedOrigins = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://codepavanjaiswal.github.io"
]);

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (!allowedOrigins.has(origin)) return next();

  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.vary("Origin");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let users;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  await client.connect();

  const db = client.db(dbName);
  users = db.collection(collectionName);

  console.log("Connected to MongoDB");
  console.log(`Database: ${dbName}`);
  console.log(`Collection: ${collectionName}`);

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const data = await users.find({}).sort({ createdAt: -1 }).toArray();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add a user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const user = {
      name: String(name).trim(),
      email: String(email).trim(),
      createdAt: new Date()
    };

    const result = await users.insertOne(user);

    res.status(201).json({
      message: "User saved successfully",
      user: { _id: result.insertedId, ...user }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save user" });
  }
});

startServer().catch((error) => {
  console.error("Could not start server:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});
