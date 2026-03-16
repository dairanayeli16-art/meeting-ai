import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";

const app = express();

/* ---------------- PATHS ---------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_DIR = path.join(__dirname, "pdfs");
const DIST_DIR = path.join(__dirname, "../web/dist");

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

/* ---------------- ENV ---------------- */

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "").trim();
const JWT_SECRET = (process.env.JWT_SECRET || "").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const N8N_WEBHOOK_URL = (process.env.N8N_WEBHOOK_URL || "").trim();
const N8N_AUTH_HEADER = (process.env.N8N_AUTH_HEADER || "").trim();
const N8N_AUTH_VALUE = (process.env.N8N_AUTH_VALUE || "").trim();
const IS_PROD = process.env.NODE_ENV === "production";

if (!JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET");
  process.exit(1);
}

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_ORIGIN || true,
    credentials: true,
  })
);

app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.originalUrl);
  next();
});

/* ---------------- MULTER ---------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

/* ---------------- DATABASE ---------------- */

const db = new Database("app.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role TEXT NOT NULL DEFAULT 'user',
created_at TEXT NOT NULL
);
`);

/* ---------------- HELPERS ---------------- */

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/* ---------------- COOKIES ---------------- */

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    path: "/",
    sameSite: "lax",
    secure: IS_PROD,
  });
}

/* ---------------- AUTH MIDDLEWARE ---------------- */

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

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

/* ---------------- ADMIN SEED ---------------- */

function ensureAdmin() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

  if (!adminEmail || !adminPassword) {
    console.log("ℹ️ Admin seed skipped");
    return;
  }

  const existing = db
    .prepare("SELECT id, email, role FROM users WHERE email=?")
    .get(adminEmail);

  if (existing) {
    console.log(`✅ Admin user exists: ${existing.email} (${existing.role})`);
    return;
  }

  const hash = bcrypt.hashSync(adminPassword, 12);

  db.prepare(
    "INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)"
  ).run(adminEmail, hash, "admin", nowIso());

  console.log(`✅ Admin user created: ${adminEmail}`);
}

ensureAdmin();

/* ---------------- ROUTES ---------------- */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* ---------------- AUTH ---------------- */

app.post("/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: "Missing email/password",
    });
  }

  const user = db
    .prepare(
      "SELECT id,email,password_hash,role FROM users WHERE email=?"
    )
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

/* ---------------- UPLOAD PDF ---------------- */

function buildPublicPdfUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/pdf/${fileName}`;
}

function uploadPdfHandler(req, res) {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: "Missing PDF file",
    });
  }

  const safeBase = slugify(req.body?.filename || "acta");
  const finalName = `${safeBase}-${Date.now()}.pdf`;

  const finalPath = path.join(PDF_DIR, finalName);

  fs.writeFileSync(finalPath, req.file.buffer);

  const url = buildPublicPdfUrl(req, finalName);

  res.json({
    ok: true,
    pdfUrl: url,
    pdfFileName: finalName,
  });
}

app.post("/api/upload-pdf", upload.single("pdf"), uploadPdfHandler);

/* ---------------- AUDIO ---------------- */

app.post(
  "/upload-audio",
  authMiddleware,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "Missing audio" });
      }

      const transcript = "transcript placeholder";

      res.json({
        ok: true,
        transcript,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        ok: false,
        error: "upload failed",
      });
    }
  }
);

/* ---------------- STATIC ---------------- */

app.use("/pdf", express.static(PDF_DIR));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get("*", (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  console.log("ℹ️ No frontend build found, API mode only");
}

/* ---------------- START ---------------- */

console.log("🔐 Auth Config: JWT OK");
console.log("🌐 Frontend origin:", FRONTEND_ORIGIN);
console.log("📁 PDF dir:", PDF_DIR);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});