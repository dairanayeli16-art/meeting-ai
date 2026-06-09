/**
 * =============================================================================
 * DEDCAM SOFTWARE - DIGITAL EFFICIENCY & DATA MANAGEMENT [cite: 293]
 * =============================================================================
 * * © 2026 DDC REVOLUTION S.L. Todos los derechos reservados. 
 * * COAUTORÍA Y PROPIEDAD INTELECTUAL:
 * -----------------------------------------------------------------------------
 * Autora Técnica y Desarrollo de Código: 
 * Daira Nayeli de Dios Campoverde[cite: 10, 213, 294].
 * * Autora Intelectual y Diseño Lógico de Negocio: 
 * Sandra Aracely Campoverde Dominguez[cite: 11, 213, 296].
 * * REGISTROS DE PROTECCIÓN:
 * -----------------------------------------------------------------------------
 * 1. Registro de la Propiedad Intelectual (RPI) - España. 
 * Expediente: [REGAGE26e00034218233]
 * * 2. Safe Creative - Certificación de Integridad y Autoría.
 * Código de registro: [2604055174327-36S94P]
 * * AVISO LEGAL:
 * Este software, incluyendo su arquitectura de microservicios, algoritmos de IA 
 * (NLP/STT), esquemas de bases de datos y diseño de interfaz (UI/UX), es una 
 * obra protegida por las leyes internacionales de derechos de autor y 
 * tratados de propiedad intelectual[cite: 6, 205, 354].
 * * Queda estrictamente prohibida la reproducción, distribución, comunicación 
 * pública o transformación, total o parcial, de este código fuente o de sus 
 * flujos lógicos sin la autorización expresa y por escrito de las titulares.
 * =============================================================================
 */

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
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

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

// Credenciales de Supabase
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "").trim();

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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
  limits: { fileSize: 30 * 1024 * 1024 },
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
function nowIso() { return new Date().toISOString(); }
function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function normalizeName(value) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function signJwt(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" }); }
function slugify(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-").toLowerCase(); }
function safeJsonParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function unwrapN8nData(data) { if (Array.isArray(data)) return data[0] || {}; return data || {}; }
function extractActa(data) { const d = unwrapN8nData(data); return d.acta || d.summary || d.resumen || d.html || d.output?.acta || d.data?.acta || d.result?.acta || ""; }
function extractEmailInfo(data) { const d = unwrapN8nData(data); return { emailSent: d.emailSent ?? d.email_sent ?? d.sent ?? null, pdfUrl: d.pdfUrl || d.pdf_url || d.url || null, pdfFileName: d.pdfFileName || d.filename || null }; }
function buildPublicPdfUrl(req, fileName) { if (!fileName) return null; return `${req.protocol}://${req.get("host")}/pdf/${encodeURIComponent(fileName)}`; }
function getAgencyById(userId, agencyId) { return db.prepare("SELECT * FROM agencies WHERE id = ? AND user_id = ?").get(agencyId, userId); }
function getCommunityById(userId, communityId) { return db.prepare("SELECT * FROM communities WHERE id = ? AND user_id = ?").get(communityId, userId); }

function ensureAgency(userId, agencyName) {
  const cleanName = String(agencyName || "").trim();
  if (!cleanName) throw new Error("Missing agency name");
  const normalized = normalizeName(cleanName);
  let agency = db.prepare("SELECT * FROM agencies WHERE user_id = ? AND name_normalized = ?").get(userId, normalized);
  if (agency) return agency;
  const info = db.prepare("INSERT INTO agencies (user_id, name, name_normalized, created_at) VALUES (?, ?, ?, ?)").run(userId, cleanName, normalized, nowIso());
  agency = db.prepare("SELECT * FROM agencies WHERE id = ?").get(info.lastInsertRowid);
  return agency;
}

function ensureCommunity(userId, agencyId, communityName) {
  const cleanName = String(communityName || "").trim();
  if (!cleanName) throw new Error("Missing community name");
  const normalized = normalizeName(cleanName);
  let community = db.prepare("SELECT * FROM communities WHERE agency_id = ? AND name_normalized = ?").get(agencyId, normalized);
  if (community) return community;
  const info = db.prepare("INSERT INTO communities (user_id, agency_id, name, name_normalized, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, agencyId, cleanName, normalized, nowIso());
  community = db.prepare("SELECT * FROM communities WHERE id = ?").get(info.lastInsertRowid);
  return community;
}

function buildLibraryForUser(userId) {
  const agencies = db.prepare("SELECT id, name, created_at FROM agencies WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC").all(userId);
  const communities = db.prepare("SELECT id, agency_id, name, created_at FROM communities WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC").all(userId);
  const meetings = db.prepare(`SELECT id, user_id, agency_id, community_id, titulo, fecha, transcript, acta, pdf_url, email_sent, created_at FROM meetings WHERE user_id = ? ORDER BY datetime(created_at) DESC`).all(userId);

  const agenciesMap = new Map();
  for (const agency of agencies) { agenciesMap.set(agency.id, { ...agency, communities: [] }); }

  const communitiesMap = new Map();
  for (const community of communities) {
    const item = { ...community, meetings: [] };
    communitiesMap.set(community.id, item);
    const agency = agenciesMap.get(community.agency_id);
    if (agency) agency.communities.push(item);
  }

  for (const meeting of meetings) {
    const community = communitiesMap.get(meeting.community_id);
    if (community) community.meetings.push(meeting);
  }

  return Array.from(agenciesMap.values());
}

function escapeHtml(value) {
  const str = String(value ?? "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeActaObject(actaRaw, titulo, gestoria, comunidad, fecha) {
  let parsed = actaRaw;
  if (typeof parsed === "string") {
    let raw = parsed.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    parsed = safeJsonParse(raw, raw);
    if (typeof parsed === "string") parsed = safeJsonParse(parsed, parsed);
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return {
      ciudad: parsed.ciudad || "Barcelona",
      fecha_redaccion: parsed.fecha_redaccion || "",
      tipo_junta: parsed.tipo_junta || "Ordinaria",
      convocatoria: {
        hora_primera: parsed.convocatoria?.hora_primera || "",
        hora_segunda: parsed.convocatoria?.hora_segunda || "",
        lugar: parsed.convocatoria?.lugar || "Lugar indicado",
      },
      encabezado: {
        comunidad: parsed.encabezado?.comunidad || comunidad,
        gestoria: parsed.encabezado?.gestoria || gestoria,
        titulo: parsed.encabezado?.titulo || titulo,
        fecha_iso: parsed.encabezado?.fecha_iso || fecha,
      },
      asistentes: Array.isArray(parsed.asistentes) ? parsed.asistentes : [],
      orden_del_dia: Array.isArray(parsed.orden_del_dia) ? parsed.orden_del_dia : [],
      desarrollo: Array.isArray(parsed.desarrollo) ? parsed.desarrollo : [],
      acuerdos_globales: Array.isArray(parsed.acuerdos_globales) ? parsed.acuerdos_globales : [],
      tareas: Array.isArray(parsed.tareas) ? parsed.tareas : [],
      ruegos_preguntas: parsed.ruegos_preguntas || "",
      conclusiones_recomendaciones_ia: parsed.conclusiones_recomendaciones_ia || parsed.recomendaciones_ia || "",
      cierre: {
        hora_fin: parsed.cierre?.hora_fin || "",
        secretario_administrador: parsed.cierre?.secretario_administrador || "",
        presidencia: parsed.cierre?.presidencia || "",
      },
    };
  }

  return {
    ciudad: "Barcelona", fecha_redaccion: "", tipo_junta: "Ordinaria",
    convocatoria: { hora_primera: "", hora_segunda: "", lugar: "Lugar indicado" },
    encabezado: { comunidad, gestoria, titulo, fecha_iso: fecha },
    asistentes: [], orden_del_dia: [],
    desarrollo: [{ punto: 1, titulo: titulo || "Punto único", resumen: typeof actaRaw === "string" ? actaRaw : "Sin desarrollo estructurado disponible.", acuerdos: [], votos: { a_favor: "", en_contra: "", abstenciones: "", detalle: "" } }],
    acuerdos_globales: [], tareas: [], ruegos_preguntas: "", conclusiones_recomendaciones_ia: "",
    cierre: { hora_fin: "", secretario_administrador: "", presidencia: "" },
  };
}

function formatMultilineText(text) {
  if (!text) return "";
  return escapeHtml(text).replace(/\n/g, "<br>");
}

async function generateBrandedPdf(req, { actaRaw, titulo, gestoria, comunidad, fecha }) {
  const acta = normalizeActaObject(actaRaw, titulo, gestoria, comunidad, fecha);
  const fechaVisible = acta.fecha_redaccion || String(fecha || "").slice(0, 10);
  const logoUrl = FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN.replace(/\/$/, "")}/recorder-icon.png` : "";

  const ordenHtml = acta.orden_del_dia?.length ? acta.orden_del_dia.map((item, i) => `<li>${escapeHtml(item || `Punto ${i + 1}`)}</li>`).join("") : "<li>Pendiente de definir</li>";
  const asistentesHtml = acta.asistentes?.length ? acta.asistentes.map((a) => `<tr><td>${escapeHtml(a.piso || "")}</td><td>${escapeHtml(a.propietario || "")}</td><td>${escapeHtml(a.coeficiente || "")}</td><td>${escapeHtml(a.representacion || "")}</td></tr>`).join("") : `<tr><td colspan="4">Pendiente de completar</td></tr>`;

  const desarrolloHtml = acta.desarrollo?.length ? acta.desarrollo.map((p, idx) => {
    const acuerdos = Array.isArray(p.acuerdos) && p.acuerdos.length ? `<ul>${p.acuerdos.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` : "<ul><li>Sin acuerdos específicos.</li></ul>";
    return `<div class="point-card"><div class="point-header"><div class="point-number">${escapeHtml(p.punto || idx + 1)}</div><div class="point-title">${escapeHtml(p.titulo || `Punto ${idx + 1}`)}</div></div><div class="point-body"><div class="subsection"><div class="sub-title">Desarrollo</div><p class="development-text">${escapeHtml(p.resumen || "")}</p></div><div class="subsection"><div class="sub-title">Acuerdos</div>${acuerdos}</div><div class="subsection vote-box"><div class="sub-title">Votación</div><p><strong>A favor:</strong> ${escapeHtml(p.votos?.a_favor || "—")} &nbsp;&nbsp;<strong>En contra:</strong> ${escapeHtml(p.votos?.en_contra || "—")} &nbsp;&nbsp;<strong>Abstenciones:</strong> ${escapeHtml(p.votos?.abstenciones || "—")}</p></div></div></div>`;
  }).join("") : "<p>Sin desarrollo registrado.</p>";

  const acuerdosGlobalesHtml = acta.acuerdos_globales?.length ? `<ul>${acta.acuerdos_globales.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` : "<p>Sin acuerdos globales registrados.</p>";
  const tareasHtml = acta.tareas?.length ? `<ul>${acta.tareas.map((t) => `<li>${escapeHtml(typeof t === "string" ? t : JSON.stringify(t))}</li>`).join("")}</ul>` : "<p>Sin tareas pendientes registradas.</p>";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Acta ${escapeHtml(titulo)}</title>
      <style>
        @page { size: A4; margin: 20mm 14mm 18mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #161616; font-size: 12px; line-height: 1.55; margin: 0; padding: 0; background: #ffffff; }
        .topbar { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #6c4cf1; padding-bottom: 14px; margin-bottom: 24px; }
        .brand { display: flex; align-items: center; gap: 16px; }
        .brand-badge { width: 54px; height: 54px; border-radius: 16px; background: linear-gradient(135deg, #7c4dff, #b388ff); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 800; box-shadow: 0 8px 20px rgba(108, 76, 241, 0.22); }
        .brand-name { font-size: 34px; font-weight: 900; letter-spacing: 0.4px; color: #6c4cf1; line-height: 1; }
        .brand-sub { font-size: 12px; color: #6b7280; margin-top: 6px; }
        .agency-box { text-align: right; font-size: 13px; color: #111827; }
        .agency-box .agency-name { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 4px; }
        .meta-line { font-size: 13px; color: #374151; margin-bottom: 20px; }
        .main-title { font-size: 28px; font-weight: 900; text-align: center; margin: 8px 0 20px 0; letter-spacing: 0.5px; text-transform: uppercase; }
        .intro { font-size: 14px; margin-bottom: 22px; }
        .section-title { margin-top: 22px; margin-bottom: 10px; font-size: 18px; font-weight: 900; color: #111827; border-bottom: 1px solid #d6d6dc; padding-bottom: 6px; text-transform: uppercase; }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; margin-bottom: 10px; }
        .data-item { border: 1px solid #d9d9e3; border-radius: 14px; padding: 14px 16px; background: #fafafe; }
        .data-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 7px; }
        .data-value { font-size: 15px; font-weight: 700; color: #111827; word-break: break-word; }
        ol { margin: 12px 0 0 22px; padding: 0; }
        ol li { margin-bottom: 8px; font-size: 13px; }
        ul { margin: 8px 0 0 18px; padding: 0; }
        ul li { margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #3a3a3a; padding: 9px 10px; font-size: 12px; vertical-align: top; }
        th { background: #f4f5f8; font-weight: 800; text-align: center; }
        .point-card { border: 1px solid #dddddf; border-radius: 18px; overflow: hidden; margin-top: 14px; background: #fbfbfd; page-break-inside: avoid; }
        .development-text { white-space: pre-wrap; line-height: 1.75; min-height: 8.5em; }
        .point-header { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #f5f2ff; border-bottom: 1px solid #e5defe; }
        .point-number { min-width: 42px; height: 42px; border-radius: 12px; background: #ffffff; border: 1px solid #d4d4d8; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; color: #111827; }
        .point-title { font-size: 17px; font-weight: 900; color: #111827; }
        .point-body { padding: 2px 0 10px 0; }
        .subsection { padding: 14px 18px 0 18px; }
        .sub-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; font-weight: 800; margin-bottom: 6px; }
        .subsection p { margin: 0; font-size: 13px; color: #111827; }
        .vote-box { padding-bottom: 14px; }
        .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 50px; }
        .signature-box { padding-top: 18px; border-top: 1px solid #111; text-align: center; font-weight: 700; min-height: 46px; }
        .advice-box { margin-top: 10px; border: 1px solid #d8ccff; background: #f7f4ff; border-radius: 16px; padding: 16px 18px; }
        .advice-box p { margin: 0; font-size: 14px; line-height: 1.75; color: #1f2937; }
        .tiny-note { margin-top: 20px; font-size: 11px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="topbar">
        <div class="brand">
          <div class="brand-badge">D</div>
          <div><div class="brand-name">DEDCAM SOFTWARE</div><div class="brand-sub">AI recorder with transcription and PDF creation</div></div>
        </div>
        <div class="agency-box"><div class="agency-name">${escapeHtml(gestoria)}</div><div>Comunidad: ${escapeHtml(comunidad)}</div></div>
      </div>
      <div class="meta-line">En ${escapeHtml(acta.ciudad || "Barcelona")}, a ${escapeHtml(fechaVisible)}.</div>
      <div class="main-title">ACTA DE JUNTA ${escapeHtml((acta.tipo_junta || "Ordinaria").toUpperCase())}</div>
      <div class="intro">Convocados previa citación escrita, se reúne la Junta de Propietarios de <strong>${escapeHtml(comunidad)}</strong>, administrada por <strong>${escapeHtml(gestoria)}</strong>, en <strong>${escapeHtml(acta.convocatoria?.lugar || "Lugar indicado")}</strong>, para tratar los asuntos del Orden del Día.</div>
      <div class="section-title">Datos de la reunión</div>
      <div class="data-grid"><div class="data-item"><div class="data-label">Título</div><div class="data-value">${escapeHtml(titulo)}</div></div><div class="data-item"><div class="data-label">Fecha ISO</div><div class="data-value">${escapeHtml(acta.encabezado?.fecha_iso || fecha || "")}</div></div><div class="data-item"><div class="data-label">Convocatoria primera</div><div class="data-value">${escapeHtml(acta.convocatoria?.hora_primera || "—")}</div></div><div class="data-item"><div class="data-label">Convocatoria segunda</div><div class="data-value">${escapeHtml(acta.convocatoria?.hora_segunda || "—")}</div></div></div>
      <div class="section-title">Orden del día</div><ol>${ordenHtml}</ol>
      <div class="section-title">Asistentes</div><table><thead><tr><th style="width: 11%;">Piso</th><th style="width: 27%;">Propietario</th><th style="width: 12%;">Coef.</th><th>Asistencia / Representación</th></tr></thead><tbody>${asistentesHtml}</tbody></table>
      <div class="section-title">Desarrollo de la reunión</div>${desarrolloHtml}
      <div class="section-title">Acuerdos globales</div>${acuerdosGlobalesHtml}
      <div class="section-title">Tareas</div>${tareasHtml}
      <div class="section-title">Ruegos y preguntas</div><p>${formatMultilineText(acta.ruegos_preguntas || "Sin ruegos y preguntas registrados.")}</p>
      <div class="section-title">Conclusiones y Recomendaciones IA</div>
      <div class="advice-box"><div class="advice-box-title">Análisis automático de la reunión</div><div class="advice-box-content">${formatMultilineText(acta.conclusiones_recomendaciones_ia || acta.conclusiones_ia || acta.recomendaciones_ia || "Análisis no disponible.")}</div></div>
      <div class="footer-signatures"><div class="signature-box">${escapeHtml(acta.cierre?.secretario_administrador || "Administrador / Secretario")}</div><div class="signature-box">${escapeHtml(acta.cierre?.presidencia || "Presidencia")}</div></div>
      <div class="tiny-note">Documento generado automáticamente por DEDCAM SOFTWARE.</div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true, executablePath: puppeteer.executablePath(), args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const finalName = `${slugify(titulo || "acta") || "acta"}-${Date.now()}.pdf`;
    const finalPath = path.join(PDF_DIR, finalName);
    await page.pdf({ path: finalPath, format: "A4", printBackground: true, margin: { top: "12mm", right: "10mm", bottom: "14mm", left: "10mm" } });
    return { fileName: finalName, pdfUrl: buildPublicPdfUrl(req, finalName) };
  } finally { await browser.close(); }
}

/* ---------------- COOKIES ---------------- */
function setAuthCookie(res, token) { res.cookie("token", token, { httpOnly: true, sameSite: IS_PROD ? "none" : "lax", secure: IS_PROD, path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 }); }
function clearAuthCookie(res) { res.clearCookie("token", { path: "/", sameSite: IS_PROD ? "none" : "lax", secure: IS_PROD }); }

/* ---------------- AUTH MIDDLEWARE ---------------- */
function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ ok: false, error: "Not authenticated" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch { return res.status(401).json({ ok: false, error: "Invalid token" }); }
}
function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ ok: false, error: "Admin only" });
  next();
}

/* ---------------- ADMIN SEED ---------------- */
function ensureAdmin() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!adminEmail || !adminPassword) { console.log("ℹ️ Admin seed skipped"); return; }
  const existing = db.prepare("SELECT id, email, role FROM users WHERE email = ?").get(adminEmail);
  if (existing) { console.log(`✅ Admin user exists: ${existing.email}`); return; }
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)").run(adminEmail, hash, "admin", nowIso());
  console.log(`✅ Admin user created: ${adminEmail}`);
}
ensureAdmin();

/* ---------------- OPENAI ---------------- */
async function transcribeWithOpenAI(file) {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || "audio/webm" });
  form.append("file", blob, file.originalname || "meeting.webm");
  form.append("model", "gpt-4o-transcribe");
  form.append("response_format", "json");

  const r = await fetch("[https://api.openai.com/v1/audio/transcriptions](https://api.openai.com/v1/audio/transcriptions)", { method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: form });
  if (!r.ok) { const txt = await r.text(); throw new Error(`OpenAI transcription failed: ${r.status} ${txt}`); }
  const data = await r.json(); return data?.text || "";
}

/* ---------------- N8N ---------------- */
async function sendToN8N(payload) {
  if (!N8N_WEBHOOK_URL) throw new Error("Missing N8N_WEBHOOK_URL");
  const headers = { "Content-Type": "application/json" };
  if (N8N_AUTH_HEADER && N8N_AUTH_VALUE) headers[N8N_AUTH_HEADER] = N8N_AUTH_VALUE;
  
  const r = await fetch(N8N_WEBHOOK_URL, { method: "POST", headers, body: JSON.stringify(payload) });
  const rawText = await r.text();
  let parsed; try { parsed = JSON.parse(rawText); } catch { parsed = { raw: rawText }; }
  if (!r.ok) throw new Error(`n8n webhook failed: ${r.status} ${rawText}`);
  return { status: r.status, data: parsed };
}

/* ---------------- ROUTES ---------------- */
app.get("/api/health", (req, res) => { res.json({ ok: true }); });
app.get("/health", (req, res) => { res.json({ ok: true }); });

/* ---------------- AUTH ---------------- */
app.post("/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email); const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ ok: false, error: "Missing email/password" });
  const user = db.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ ok: false, error: "Invalid credentials" });
  const token = signJwt({ id: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});
app.post("/auth/logout", (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });
app.get("/auth/me", authMiddleware, (req, res) => { res.json({ ok: true, user: req.user }); });

/* ---------------- ADMIN ---------------- */
app.get("/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ ok: true, users });
});
app.post("/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const email = normalizeEmail(req.body?.email); const password = String(req.body?.password || "");
  const role = req.body?.role === "admin" ? "admin" : "user";
  if (!email || password.length < 6) return res.status(400).json({ ok: false, error: "Invalid input" });
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return res.status(409).json({ ok: false, error: "Exists" });
  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)").run(email, hash, role, nowIso());
  res.json({ ok: true, id: info.lastInsertRowid, email, role });
});

/* ---------------- AGENCIES / COMMUNITIES / LIBRARY ---------------- */
app.get("/api/library", authMiddleware, (req, res) => {
  const agencies = buildLibraryForUser(req.user.id);
  res.json({ ok: true, agencies });
});
app.post("/api/agencies", authMiddleware, (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "Missing name" });
    const agency = ensureAgency(req.user.id, name); res.json({ ok: true, agency });
  } catch (err) { res.status(500).json({ ok: false, error: err?.message }); }
});
app.post("/api/communities", authMiddleware, (req, res) => {
  try {
    const agencyId = Number(req.body?.agencyId || 0); const name = String(req.body?.name || "").trim();
    if (!agencyId || !name) return res.status(400).json({ ok: false, error: "Missing data" });
    const agency = getAgencyById(req.user.id, agencyId);
    if (!agency) return res.status(404).json({ ok: false, error: "Agency not found" });
    const community = ensureCommunity(req.user.id, agency.id, name); res.json({ ok: true, community });
  } catch (err) { res.status(500).json({ ok: false, error: err?.message }); }
});

/* ---------------- INCIDENCIAS / TICKETS ---------------- */
app.get("/api/tickets", authMiddleware, async (req, res) => {
  console.log("📥 Petición de tickets recibida");
  try {
    if (!supabase) return res.json({ ok: true, tickets: [] });

    const { data, error } = await supabase
      .from('tickets') 
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    console.log(`📦 Enviando ${data?.length} tickets a la web`);
    res.json({ ok: true, tickets: data || [] });
  } catch (err) {
    console.error("❌ Error Supabase:", err);
    res.status(500).json({ ok: false });
  }
});

/* ---------------- ACTUALIZAR ESTADO DEL TICKET + EMAIL ---------------- */
app.patch("/api/tickets/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const webhookUrl = process.env.N8N_RESOLVED_WEBHOOK;

  console.log(`🔧 Actualizando ticket ${id} a estado: ${status}`);

  try {
    if (!supabase) throw new Error("Supabase no configurado");

    // 1. Actualizamos en Supabase
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: status })
      .eq('id', id)
      .select();

    if (error) throw error;
    const ticket = data[0];

    // 2. Si marcamos como RESUELTO, enviamos señal a n8n
    if (status === 'resuelto') {
      if (webhookUrl) {
        console.log("📨 [INFO] Enviando señal a n8n:", webhookUrl);
        
        // Buscamos el email del vecino para que n8n sepa a quién escribir
        const { data: contact } = await supabase
          .from('contacts')
          .select('email, first_name')
          .eq('id', ticket.contact_id)
          .single();

        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: contact?.email || "dairadedios@hotmail.es", // Email de respaldo
            nombre: contact?.first_name || "vecino/a",
            asunto: ticket.subject,
            resumen: ticket.summary
          })
        }).catch(err => console.error("❌ [ERROR] Fallo al contactar con n8n:", err.message));
        
      } else {
        console.log("⚠️ [AVISO] No se envió email porque N8N_RESOLVED_WEBHOOK no está definida en el .env");
      }
    }

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error("❌ [ERROR] Fatal:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ---------------- PDF UPLOAD ---------------- */
function uploadPdfHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Missing PDF" });
    const rawName = String(req.body?.filename || "acta").trim();
    const safeBase = slugify(rawName.replace(/\.pdf$/i, "")) || "acta";
    const finalName = `${safeBase}-${Date.now()}.pdf`;
    const finalPath = path.join(PDF_DIR, finalName);
    fs.writeFileSync(finalPath, req.file.buffer);
    const url = buildPublicPdfUrl(req, finalName);
    res.json({ ok: true, pdfUrl: url, pdf_url: url, pdfFileName: finalName });
  } catch (err) { res.status(500).json({ ok: false, error: err?.message }); }
}
app.get("/api/upload-pdf", (req, res) => { res.status(405).json({ ok: false, error: "Use POST" }); });
app.post("/api/upload-pdf", upload.single("pdf"), uploadPdfHandler);

/* ---------------- AUDIO ---------------- */
app.post("/upload-audio", authMiddleware, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Missing audio" });
    const emails = safeJsonParse(req.body?.emails || "[]", []).map((e) => String(e || "").trim()).filter((e) => e.includes("@"));
    const titulo = String(req.body?.titulo || "Reunión automática").trim();
    const agencyIdFromBody = Number(req.body?.agencyId || 0); const communityIdFromBody = Number(req.body?.communityId || 0);
    const gestoriaBody = String(req.body?.gestoria || "").trim(); const comunidadBody = String(req.body?.comunidad || "").trim();

    let agency = null; let community = null;
    if (agencyIdFromBody) agency = getAgencyById(req.user.id, agencyIdFromBody);
    if (!agency && gestoriaBody) agency = ensureAgency(req.user.id, gestoriaBody);
    if (!agency) return res.status(400).json({ ok: false, error: "Missing agency" });

    if (communityIdFromBody) community = getCommunityById(req.user.id, communityIdFromBody);
    if (!community && comunidadBody) community = ensureCommunity(req.user.id, agency.id, comunidadBody);
    if (!community) return res.status(400).json({ ok: false, error: "Missing community" });

    const gestoria = agency.name; const comunidad = community.name; const fecha = nowIso();

    const transcript = await transcribeWithOpenAI(req.file);
    const payload = { transcript, emails, titulo, gestoria, comunidad, fecha, source: "DEDCAM Software", userEmail: req.user?.email || "" };
    const n8nResult = await sendToN8N(payload);
    const n8nData = unwrapN8nData(n8nResult.data);
    const acta = extractActa(n8nData);
    const emailInfo = extractEmailInfo(n8nData);

    let resolvedPdfUrl = emailInfo.pdfUrl || (emailInfo.pdfFileName ? buildPublicPdfUrl(req, emailInfo.pdfFileName) : null);
    let resolvedPdfFileName = emailInfo.pdfFileName || null;

    try {
      const brandedPdf = await generateBrandedPdf(req, { actaRaw: acta, titulo, gestoria, comunidad, fecha });
      resolvedPdfUrl = brandedPdf.pdfUrl; resolvedPdfFileName = brandedPdf.fileName;
    } catch (pdfErr) { console.error("❌ branded PDF failed"); }

    const info = db.prepare(`INSERT INTO meetings (user_id, agency_id, community_id, titulo, fecha, transcript, acta, pdf_url, email_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, agency.id, community.id, titulo, fecha, transcript, acta, resolvedPdfUrl, emailInfo.emailSent ? 1 : 0, nowIso());
    const meeting = db.prepare("SELECT * FROM meetings WHERE id = ?").get(info.lastInsertRowid);

    return res.json({ ok: true, emails, transcript, acta, n8nStatus: n8nResult.status, n8nResponse: n8nData, emailSent: emailInfo.emailSent, pdfUrl: resolvedPdfUrl, pdfFileName: resolvedPdfFileName, agency, community, meeting });
  } catch (err) { res.status(500).json({ ok: false, error: err?.message }); }
});

/* ---------------- STATIC ---------------- */
app.use("/pdf", express.static(PDF_DIR));
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api\/|auth\/|admin\/|upload-audio|pdf\/).*/, (req, res) => { res.sendFile(path.join(DIST_DIR, "index.html")); });
} else { console.log("ℹ️ No frontend build found, API mode only"); }

/* ---------------- FALLBACK 404 ---------------- */
app.use((req, res) => { res.status(404).json({ ok: false, error: "Not found", method: req.method, url: req.originalUrl }); });

/* ---------------- START ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});