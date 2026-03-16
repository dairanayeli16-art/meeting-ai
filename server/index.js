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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PDF_DIR = path.join(__dirname, "pdfs");

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

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

app.use(
  cors({
    origin: FRONTEND_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

// ---------------- DB ----------------
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

// ---------------- Cookies ----------------
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

// ---------------- Auth middleware ----------------
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

// ---------------- Helpers ----------------
function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function unwrapN8nData(data) {
  if (Array.isArray(data)) return data[0] || {};
  return data || {};
}

function extractActa(data) {
  const d = unwrapN8nData(data);
  return (
    d.acta ||
    d.summary ||
    d.resumen ||
    d.html ||
    d.output?.acta ||
    d.data?.acta ||
    d.result?.acta ||
    ""
  );
}

function extractEmailInfo(data) {
  const d = unwrapN8nData(data);
  return {
    emailSent: d.emailSent ?? d.email_sent ?? d.sent ?? null,
    pdfUrl: d.pdfUrl || d.pdf_url || null,
    pdfFileName: d.pdfFileName || d.filename || null,
  };
}

function buildPublicPdfUrl(req, fileName) {
  if (!fileName) return null;
  return `${req.protocol}://${req.get("host")}/pdf/${encodeURIComponent(fileName)}`;
}

async function transcribeWithOpenAI(file) {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const form = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "audio/webm",
  });

  form.append("file", blob, file.originalname || "meeting.webm");
  form.append("model", "gpt-4o-transcribe");
  form.append("response_format", "json");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`OpenAI transcription failed: ${r.status} ${txt}`);
  }

  const data = await r.json();
  return data?.text || "";
}

async function sendToN8N(payload) {
  if (!N8N_WEBHOOK_URL) {
    throw new Error("Missing N8N_WEBHOOK_URL");
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (N8N_AUTH_HEADER && N8N_AUTH_VALUE) {
    headers[N8N_AUTH_HEADER] = N8N_AUTH_VALUE;
  }

  const r = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await r.text();
  let parsed = null;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = { raw: rawText };
  }

  if (!r.ok) {
    throw new Error(`n8n webhook failed: ${r.status} ${rawText}`);
  }

  return {
    status: r.status,
    data: parsed,
  };
}

function uploadPdfHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Missing PDF file" });
    }

    const incomingName = String(req.body?.filename || "").trim();
    const safeBase =
      slugify(incomingName.replace(/\.pdf$/i, "")) || `acta-${Date.now()}`;
    const finalFileName = `${safeBase}-${Date.now()}.pdf`;
    const finalPath = path.join(PDF_DIR, finalFileName);

    fs.writeFileSync(finalPath, req.file.buffer);

    const pdfUrl = buildPublicPdfUrl(req, finalFileName);

    console.log("📎 PDF uploaded", {
      finalFileName,
      size: req.file.size,
      pdfUrl,
    });

    return res.json({
      ok: true,
      pdf_url: pdfUrl,
      pdfUrl,
      pdfFileName: finalFileName,
    });
  } catch (err) {
    console.error("❌ upload-pdf error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Upload PDF failed",
    });
  }
}

// ---------------- Debug / API routes ----------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/debug-routes", (req, res) => {
  res.json({
    ok: true,
    message: "debug route works",
    env: process.env.NODE_ENV || "unknown",
    pdfDir: PDF_DIR,
    time: new Date().toISOString(),
  });
});

app.get("/api/test123", (req, res) => {
  res.send("TEST123 OK");
});

// Optional legacy debug routes
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/debug-routes", (req, res) => {
  res.json({
    ok: true,
    message: "debug route works",
    env: process.env.NODE_ENV || "unknown",
    pdfDir: PDF_DIR,
    time: new Date().toISOString(),
  });
});

app.get("/test123", (req, res) => {
  res.send("TEST123 OK");
});

// -------- Auth --------
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

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

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

// -------- Upload PDF from n8n --------
// Helpful GET response so browser testing doesn't show bare Not Found
app.get("/api/upload-pdf", (req, res) => {
  res.status(405).json({
    ok: false,
    error: "Use POST with multipart/form-data. Field name must be 'pdf'.",
  });
});

app.get("/upload-pdf", (req, res) => {
  res.status(405).json({
    ok: false,
    error: "Use POST with multipart/form-data. Field name must be 'pdf'.",
  });
});

app.post("/api/upload-pdf", upload.single("pdf"), uploadPdfHandler);
app.post("/upload-pdf", upload.single("pdf"), uploadPdfHandler);

// -------- Upload audio --------
app.post(
  "/upload-audio",
  authMiddleware,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "Missing audio file" });
      }

      const emails = safeJsonParse(req.body?.emails || "[]", [])
        .map((e) => String(e || "").trim())
        .filter((e) => e.includes("@"));

      const titulo = String(req.body?.titulo || "Reunión automática").trim();
      const gestoria = String(req.body?.gestoria || "").trim();
      const comunidad = String(req.body?.comunidad || "").trim();
      const fecha = nowIso();

      console.log("🎙️ /upload-audio received", {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        user: req.user?.email,
        emails,
        titulo,
        gestoria,
        comunidad,
      });

      const transcript = await transcribeWithOpenAI(req.file);

      console.log("📝 Transcription OK", {
        transcriptLength: transcript?.length || 0,
        transcriptPreview: (transcript || "").slice(0, 180),
      });

      const n8nPayload = {
        transcript,
        emails,
        titulo,
        gestoria,
        comunidad,
        fecha,
        source: "DEDCAM Software",
        userEmail: req.user?.email || "",
      };

      console.log("📤 Sending to n8n...", {
        webhook: N8N_WEBHOOK_URL ? "configured" : "missing",
        authHeader: N8N_AUTH_HEADER || "(none)",
      });

      const n8nResult = await sendToN8N(n8nPayload);
      const n8nData = unwrapN8nData(n8nResult.data);

      console.log("📥 n8n response", JSON.stringify(n8nData).slice(0, 1000));

      const acta = extractActa(n8nData);
      const emailInfo = extractEmailInfo(n8nData);

      const resolvedPdfUrl =
        emailInfo.pdfUrl ||
        (emailInfo.pdfFileName
          ? buildPublicPdfUrl(req, emailInfo.pdfFileName)
          : null);

      console.log("📄 Parsed result", {
        hasActa: !!acta,
        actaLength: acta?.length || 0,
        emailSent: emailInfo.emailSent,
        pdfUrl: resolvedPdfUrl,
        pdfFileName: emailInfo.pdfFileName,
      });

      return res.json({
        ok: true,
        emails,
        transcript,
        acta,
        n8nStatus: n8nResult.status,
        n8nResponse: n8nData,
        emailSent: emailInfo.emailSent,
        pdfUrl: resolvedPdfUrl,
        pdfFileName: emailInfo.pdfFileName,
      });
    } catch (err) {
      console.error("❌ /upload-audio error:", err);
      return res.status(500).json({
        ok: false,
        error: err?.message || "Upload/transcription failed",
      });
    }
  }
);

// ---------------- Static files ----------------
app.use("/pdf", express.static(PDF_DIR));
app.use(express.static(path.join(__dirname, "../web/dist")));

// Serve frontend for non-API routes only
app.get(/^\/(?!api\/|auth\/|admin\/|upload-audio|upload-pdf|pdf\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

// ---------------- Start ----------------
console.log("🔐 Auth Config: JWT OK");
console.log("🌐 Frontend origin:", FRONTEND_ORIGIN || "(not set)");
console.log("📁 PDF dir:", PDF_DIR);

const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
});