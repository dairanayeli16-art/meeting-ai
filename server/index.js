import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").trim();
const JWT_SECRET = (process.env.JWT_SECRET || "").trim();

if (!JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET in .env");
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// ---------------- DB ----------------
const db = new Database("app.db");

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );
`);

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// ---------------- Cookies ----------------
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", { path: "/" });
}

// ---------------- Auth middleware ----------------
function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ ok: false, error: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }
  next();
}

// ---------------- Seed admin ----------------
function ensureAdmin() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

  if (!adminEmail || !adminPassword) {
    console.log("ℹ️ Admin seed skipped");
    return;
  }

  const existing = db
    .prepare("SELECT id, email, role FROM users WHERE email = ?")
    .get(adminEmail);

  if (existing) {
    console.log(`✅ Admin user exists: ${existing.email} (${existing.role})`);
    return;
  }

  const hash = bcrypt.hashSync(adminPassword, 12);

  db.prepare(
    "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)"
  ).run(adminEmail, hash, "admin", nowIso());

  console.log(`✅ Admin user created: ${adminEmail}`);
}

ensureAdmin();

// ---------------- Routes ----------------

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Missing email/password" });
  }

  const user = db
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const token = signJwt({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  setAuthCookie(res, token);

  res.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

app.post("/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// -------- Admin users --------

app.get("/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const users = db
    .prepare(
      "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC"
    )
    .all();

  res.json({ ok: true, users });
});

app.post("/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const role = req.body?.role === "admin" ? "admin" : "user";

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Missing email/password" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ ok: false, error: "Password too short (min 6)" });
  }

  const exists = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);

  if (exists) {
    return res.status(409).json({ ok: false, error: "User already exists" });
  }

  const hash = bcrypt.hashSync(password, 12);

  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(email, hash, role, nowIso());

  res.json({
    ok: true,
    id: info.lastInsertRowid,
    email,
    role,
  });
});

// ---------------- Serve frontend (production) ----------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../web/dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

// ---------------- Start ----------------

console.log("🔐 Auth Config: JWT OK");
console.log("🌐 Frontend origin:", FRONTEND_ORIGIN);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});