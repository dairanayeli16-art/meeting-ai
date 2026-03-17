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
app.set("trust proxy", true);

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
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, name_normalized),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agency_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(agency_id, name_normalized),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agency_id INTEGER NOT NULL,
    community_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    fecha TEXT NOT NULL,
    transcript TEXT NOT NULL DEFAULT '',
    acta TEXT NOT NULL DEFAULT '',
    pdf_url TEXT,
    email_sent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
    FOREIGN KEY(community_id) REFERENCES communities(id) ON DELETE CASCADE
  );
`);

/* ---------------- HELPERS ---------------- */

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    pdfUrl: d.pdfUrl || d.pdf_url || d.url || null,
    pdfFileName: d.pdfFileName || d.filename || null,
  };
}

function buildPublicPdfUrl(req, fileName) {
  if (!fileName) return null;
  return `${req.protocol}://${req.get("host")}/pdf/${encodeURIComponent(fileName)}`;
}

function getAgencyById(userId, agencyId) {
  return db
    .prepare("SELECT * FROM agencies WHERE id = ? AND user_id = ?")
    .get(agencyId, userId);
}

function getCommunityById(userId, communityId) {
  return db
    .prepare("SELECT * FROM communities WHERE id = ? AND user_id = ?")
    .get(communityId, userId);
}

function ensureAgency(userId, agencyName) {
  const cleanName = String(agencyName || "").trim();
  if (!cleanName) {
    throw new Error("Missing agency name");
  }

  const normalized = normalizeName(cleanName);

  let agency = db
    .prepare(
      "SELECT * FROM agencies WHERE user_id = ? AND name_normalized = ?"
    )
    .get(userId, normalized);

  if (agency) return agency;

  const info = db
    .prepare(
      "INSERT INTO agencies (user_id, name, name_normalized, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(userId, cleanName, normalized, nowIso());

  agency = db
    .prepare("SELECT * FROM agencies WHERE id = ?")
    .get(info.lastInsertRowid);

  return agency;
}

function ensureCommunity(userId, agencyId, communityName) {
  const cleanName = String(communityName || "").trim();
  if (!cleanName) {
    throw new Error("Missing community name");
  }

  const normalized = normalizeName(cleanName);

  let community = db
    .prepare(
      "SELECT * FROM communities WHERE agency_id = ? AND name_normalized = ?"
    )
    .get(agencyId, normalized);

  if (community) return community;

  const info = db
    .prepare(
      "INSERT INTO communities (user_id, agency_id, name, name_normalized, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(userId, agencyId, cleanName, normalized, nowIso());

  community = db
    .prepare("SELECT * FROM communities WHERE id = ?")
    .get(info.lastInsertRowid);

  return community;
}

function buildLibraryForUser(userId) {
  const agencies = db
    .prepare(
      "SELECT id, name, created_at FROM agencies WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC"
    )
    .all(userId);

  const communities = db
    .prepare(
      "SELECT id, agency_id, name, created_at FROM communities WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC"
    )
    .all(userId);

  const meetings = db
    .prepare(
      `SELECT 
        id, user_id, agency_id, community_id, titulo, fecha, transcript, acta, pdf_url, email_sent, created_at
       FROM meetings
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC`
    )
    .all(userId);

  const agenciesMap = new Map();

  for (const agency of agencies) {
    agenciesMap.set(agency.id, {
      ...agency,
      communities: [],
    });
  }

  const communitiesMap = new Map();

  for (const community of communities) {
    const item = {
      ...community,
      meetings: [],
    };
    communitiesMap.set(community.id, item);

    const agency = agenciesMap.get(community.agency_id);
    if (agency) {
      agency.communities.push(item);
    }
  }

  for (const meeting of meetings) {
    const community = communitiesMap.get(meeting.community_id);
    if (community) {
      community.meetings.push(meeting);
    }
  }

  return Array.from(agenciesMap.values());
}

/* ---------------- COOKIES ---------------- */

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: IS_PROD ? "none" : "lax",
    secure: IS_PROD,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    path: "/",
    sameSite: IS_PROD ? "none" : "lax",
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

/* ---------------- OPENAI ---------------- */

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

/* ---------------- N8N ---------------- */

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

  console.log("👉 N8N URL:", N8N_WEBHOOK_URL);
  console.log("📤 Sending to n8n...");

  const r = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await r.text();

  console.log("📥 n8n status:", r.status);
  console.log("📥 n8n raw response:", rawText.slice(0, 1200));

  let parsed;
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

/* ---------------- ROUTES ---------------- */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/health", (req, res) => {
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
      "SELECT id, email, password_hash, role FROM users WHERE email = ?"
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

/* ---------------- ADMIN ---------------- */

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
    return res.status(400).json({ ok: false, error: "Password too short (min 6)" });
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

/* ---------------- AGENCIES / COMMUNITIES / LIBRARY ---------------- */

app.get("/api/library", authMiddleware, (req, res) => {
  const agencies = buildLibraryForUser(req.user.id);
  res.json({ ok: true, agencies });
});

app.post("/api/agencies", authMiddleware, (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();

    if (!name) {
      return res.status(400).json({ ok: false, error: "Missing agency name" });
    }

    const agency = ensureAgency(req.user.id, name);
    res.json({ ok: true, agency });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || "Failed to create agency",
    });
  }
});

app.post("/api/communities", authMiddleware, (req, res) => {
  try {
    const agencyId = Number(req.body?.agencyId || 0);
    const name = String(req.body?.name || "").trim();

    if (!agencyId) {
      return res.status(400).json({ ok: false, error: "Missing agencyId" });
    }

    if (!name) {
      return res.status(400).json({ ok: false, error: "Missing community name" });
    }

    const agency = getAgencyById(req.user.id, agencyId);

    if (!agency) {
      return res.status(404).json({ ok: false, error: "Agency not found" });
    }

    const community = ensureCommunity(req.user.id, agency.id, name);
    res.json({ ok: true, community });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || "Failed to create community",
    });
  }
});

/* ---------------- PDF UPLOAD ---------------- */

function uploadPdfHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Missing PDF file",
      });
    }

    const rawName = String(req.body?.filename || "acta").trim();
    const safeBase = slugify(rawName.replace(/\.pdf$/i, "")) || "acta";
    const finalName = `${safeBase}-${Date.now()}.pdf`;

    const finalPath = path.join(PDF_DIR, finalName);
    fs.writeFileSync(finalPath, req.file.buffer);

    const url = buildPublicPdfUrl(req, finalName);

    console.log("📎 PDF uploaded:", {
      finalName,
      size: req.file.size,
      url,
    });

    res.json({
      ok: true,
      pdfUrl: url,
      pdf_url: url,
      pdfFileName: finalName,
    });
  } catch (err) {
    console.error("❌ upload-pdf error:", err);
    res.status(500).json({
      ok: false,
      error: err?.message || "Upload PDF failed",
    });
  }
}

app.get("/api/upload-pdf", (req, res) => {
  res.status(405).json({
    ok: false,
    error: "Use POST with multipart/form-data and field name 'pdf'",
  });
});

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

      const emails = safeJsonParse(req.body?.emails || "[]", [])
        .map((e) => String(e || "").trim())
        .filter((e) => e.includes("@"));

      const titulo = String(req.body?.titulo || "Reunión automática").trim();

      const agencyIdFromBody = Number(req.body?.agencyId || 0);
      const communityIdFromBody = Number(req.body?.communityId || 0);
      const gestoriaBody = String(req.body?.gestoria || "").trim();
      const comunidadBody = String(req.body?.comunidad || "").trim();

      let agency = null;
      let community = null;

      if (agencyIdFromBody) {
        agency = getAgencyById(req.user.id, agencyIdFromBody);
      }
      if (!agency && gestoriaBody) {
        agency = ensureAgency(req.user.id, gestoriaBody);
      }
      if (!agency) {
        return res.status(400).json({ ok: false, error: "Missing agency" });
      }

      if (communityIdFromBody) {
        community = getCommunityById(req.user.id, communityIdFromBody);
      }
      if (!community && comunidadBody) {
        community = ensureCommunity(req.user.id, agency.id, comunidadBody);
      }
      if (!community) {
        return res.status(400).json({ ok: false, error: "Missing community" });
      }

      const gestoria = agency.name;
      const comunidad = community.name;
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
        transcriptPreview: transcript.slice(0, 180),
      });

      const payload = {
        transcript,
        emails,
        titulo,
        gestoria,
        comunidad,
        fecha,
        source: "DEDCAM Software",
        userEmail: req.user?.email || "",
      };

      const n8nResult = await sendToN8N(payload);
      const n8nData = unwrapN8nData(n8nResult.data);

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

      const info = db
        .prepare(
          `INSERT INTO meetings
           (user_id, agency_id, community_id, titulo, fecha, transcript, acta, pdf_url, email_sent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.user.id,
          agency.id,
          community.id,
          titulo,
          fecha,
          transcript,
          acta,
          resolvedPdfUrl,
          emailInfo.emailSent ? 1 : 0,
          nowIso()
        );

      const meeting = db
        .prepare("SELECT * FROM meetings WHERE id = ?")
        .get(info.lastInsertRowid);

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
        agency,
        community,
        meeting,
      });
    } catch (err) {
      console.error("❌ /upload-audio error:", err);

      return res.status(500).json({
        ok: false,
        error: err?.message || "upload failed",
      });
    }
  }
);

/* ---------------- STATIC ---------------- */

app.use("/pdf", express.static(PDF_DIR));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get(/^\/(?!api\/|auth\/|admin\/|upload-audio|pdf\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  console.log("ℹ️ No frontend build found, API mode only");
}

/* ---------------- FALLBACK 404 ---------------- */

app.use((req, res) => {
  console.log("❌ EXPRESS 404:", req.method, req.originalUrl);
  res.status(404).json({
    ok: false,
    error: "Not found",
    method: req.method,
    url: req.originalUrl,
  });
});

/* ---------------- START ---------------- */

console.log("🔐 Auth Config: JWT OK");
console.log("🌐 Frontend origin:", FRONTEND_ORIGIN);
console.log("📁 PDF dir:", PDF_DIR);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});