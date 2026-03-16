import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function App() {
  // ---------- AUTH ----------
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const loginEmailRef = useRef(null);
  const loginPasswordRef = useRef(null);

  // ---------- RECORDER ----------
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [sending, setSending] = useState(false);

  const [emailsText, setEmailsText] = useState("dairadedios@hotmail.es");
  const [titulo, setTitulo] = useState("Reunión automática");
  const [gestoria, setGestoria] = useState("Gestoria Demo");
  const [comunidad, setComunidad] = useState("Comunidad Demo");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const audioUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  // ---------- RESULT BOX ----------
  const [resultBox, setResultBox] = useState(null);

  // ---------- MODAL ----------
  const [modal, setModal] = useState({ open: false, title: "", text: "" });

  const openModal = (title, text) => {
    setModal({ open: true, title, text: text || "(vacío)" });
  };

  const closeModal = () => {
    setModal({ open: false, title: "", text: "" });
  };

  async function downloadPdf(url, filename = "acta-reunion.pdf") {
    if (!url) return;

    try {
      const response = await fetch(url, {
        credentials: "include",
      });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  // ---------- ADMIN PANEL ----------
  const [adminOpen, setAdminOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [adminStatus, setAdminStatus] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  async function fetchMe() {
    setAuthLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });

      const j = await r.json();

      if (j?.ok) setUser(j.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function login(e) {
    if (e?.preventDefault) e.preventDefault();

    setLoginError("");

    const email = (loginEmailRef.current?.value || loginEmail || "").trim();
    const password = loginPasswordRef.current?.value || loginPassword || "";

    if (!email || !password) {
      setLoginError("Missing email/password");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const j = await r.json();

      if (!j?.ok) {
        setLoginError(j?.error || "Invalid credentials");
        return;
      }

      setUser(j.user);
      setLoginEmail(email);
      setLoginPassword("");

      if (loginPasswordRef.current) {
        loginPasswordRef.current.value = "";
      }

      setAdminOpen(false);
      setLoginError("");
    } catch {
      setLoginError("Backend not reachable. Is server running?");
    }
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    setUser(null);
    setAdminOpen(false);
    setUsers([]);
    setResultBox(null);
  }

  async function loadUsers() {
    setAdminStatus("Loading users...");
    try {
      const r = await fetch(`${API_BASE}/admin/users`, {
        credentials: "include",
      });

      const j = await r.json();

      if (!j?.ok) {
        setAdminStatus(j?.error || "Not allowed");
        return;
      }

      setUsers(j.users || []);
      setAdminStatus(`Loaded ${j.users?.length || 0} users`);
    } catch {
      setAdminStatus("Backend not reachable");
    }
  }

  async function createUser() {
    setAdminStatus("");
    const email = newUserEmail.trim();
    const password = newUserPassword;

    if (!email.includes("@")) {
      setAdminStatus("Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      setAdminStatus("Password must be at least 6 characters.");
      return;
    }

    setAdminStatus("Creating user...");
    try {
      const r = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          role: newUserRole,
        }),
      });

      const j = await r.json();

      if (!j?.ok) {
        setAdminStatus(j?.error || "Failed");
        return;
      }

      setAdminStatus("User created ✅");
      setNewUserEmail("");
      setNewUserPassword("");
      await loadUsers();
    } catch {
      setAdminStatus("Backend not reachable");
    }
  }

  // ---------- RECORDING ----------
  const startRecording = async () => {
    try {
      setStatus("Requesting mic permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mr = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        setAudioBlob(blob);
        setStatus("Recording ready ✅");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setStatus("Recording… 🎙️");
    } catch {
      setStatus("Mic error ❌");
      alert("Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendToServer = async () => {
    if (!audioBlob) return;

    setSending(true);
    setStatus("Uploading…");
    setResultBox(null);

    try {
      const emails = emailsText
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      if (emails.length === 0) {
        setResultBox({
          ok: false,
          error: "Añade al menos 1 email válido.",
        });
        setSending(false);
        setStatus("Error ❌");
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "meeting.webm");
      formData.append("emails", JSON.stringify(emails));
      formData.append("titulo", titulo);
      formData.append("gestoria", gestoria);
      formData.append("comunidad", comunidad);

      const r = await fetch(`${API_BASE}/upload-audio`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await r.json();

      if (!data?.ok) {
        setStatus("Failed ❌");
        setResultBox({
          ok: false,
          error: data?.error || "Error enviando al servidor.",
        });
        return;
      }

      setStatus("Sent ✅");
      setResultBox({
        ok: true,
        emails: data.emails || emails,
        pdf: data.pdf_url || data.pdfUrl || "",
        transcript: data.transcript || "",
        n8nStatus: data.n8nStatus || null,
      });
    } catch {
      setStatus("Backend not responding ❌");
      setResultBox({
        ok: false,
        error: "No pude conectar con el backend.",
      });
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <div className="card cardWide">
          <h1 className="title">DEDCAM SOFTWARE</h1>
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="card cardWide">
          <h1 className="loginTitle">Login</h1>
          <p className="muted">Use your credentials to enter.</p>

          <form onSubmit={login}>
            <div className="grid2">
              <input
                ref={loginEmailRef}
                className="input"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="email@domain.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                ref={loginPasswordRef}
                className="input"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="btn btnPrimary" type="submit">
                Login
              </button>
            </div>
          </form>

          {loginError && <div className="errorBox">{loginError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {modal.open && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">{modal.title}</div>
                <div className="tiny" style={{ opacity: 0.75 }}>
                  DEDCAM Software
                </div>
              </div>
              <button className="chip" onClick={closeModal}>
                Close
              </button>
            </div>
            <div className="modalBody">
              <pre className="modalPre">{modal.text}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="card cardWide">
        <div className="topRow">
          <div className="brandRow">
            <div className="logo">🎙️</div>
            <div>
              <div className="titleRow">
                <h1 className="title">DEDCAM SOFTWARE</h1>
                <div className="pill">{status}</div>
              </div>
              <div className="subtitle">
                AI recorder with transcription and PDF creation — 2026 version
              </div>
              <div className="muted small">
                Logged in as: {user.email} ({user.role})
              </div>
            </div>
          </div>

          <div className="actionsRow">
            {user.role === "admin" && (
              <button
                className="btn btnGhost"
                onClick={async () => {
                  const next = !adminOpen;
                  setAdminOpen(next);
                  if (next) await loadUsers();
                }}
              >
                Admin
              </button>
            )}
            <button className="btn btnGhost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="divider" />

        <div className="grid4">
          <div>
            <label className="label">Emails</label>
            <input
              className="input"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Agency</label>
            <input
              className="input"
              value={gestoria}
              onChange={(e) => setGestoria(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Community</label>
            <input
              className="input"
              value={comunidad}
              onChange={(e) => setComunidad(e.target.value)}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          {!recording ? (
            <button className="btn btnPrimary" onClick={startRecording}>
              🎙️ Start Recording
            </button>
          ) : (
            <button className="btn btnDanger" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          )}

          <button
            className="btn btnGhost"
            onClick={() => setAudioBlob(null)}
            disabled={!audioBlob || recording || sending}
          >
            Clear
          </button>

          <button
            className="btn btnDark"
            onClick={sendToServer}
            disabled={!audioBlob || recording || sending}
          >
            Send
          </button>
        </div>

        {audioUrl && (
          <div style={{ marginTop: 14 }}>
            <div className="muted small">Preview:</div>
            <audio className="audio" controls src={audioUrl} />
          </div>
        )}

        {resultBox && (
          <div className={`resultBox ${resultBox.ok ? "ok" : "bad"}`}>
            <div className="resultTop">
              <div className="resultTitle">
                {resultBox.ok ? "✅ Completed" : "❌ Error"}
              </div>
              <button className="chip" onClick={() => setResultBox(null)}>
                Clear
              </button>
            </div>

            {resultBox.ok ? (
              <>
                <div className="resultLine">
                  <b>Emails:</b>{" "}
                  {(resultBox.emails || []).length
                    ? resultBox.emails.join(", ")
                    : "—"}
                </div>

                <div className="resultActions">
                  <button
                    className="btn btnGhost"
                    onClick={() => window.open(resultBox.pdf, "_blank")}
                    disabled={!resultBox.pdf}
                  >
                    Abrir PDF
                  </button>

                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      downloadPdf(
                        resultBox.pdf,
                        `acta-${titulo.trim().replace(/\s+/g, "-").toLowerCase() || "reunion"}.pdf`
                      )
                    }
                    disabled={!resultBox.pdf}
                  >
                    Descargar PDF
                  </button>

                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      openModal("Transcripción", resultBox.transcript)
                    }
                    disabled={!resultBox.transcript}
                  >
                    Ver Transcripción
                  </button>
                </div>
              </>
            ) : (
              <div className="resultLine">
                {resultBox.error || "Error desconocido."}
              </div>
            )}
          </div>
        )}

        {user.role === "admin" && adminOpen && (
          <div style={{ marginTop: 18 }}>
            <div className="divider" />
            <h3 style={{ margin: "12px 0" }}>Admin — Users</h3>

            <div className="gridAdmin">
              <input
                className="input"
                placeholder="email@domain.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <input
                className="input"
                placeholder="password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
              <select
                className="input"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>

              <button className="btn btnDark" onClick={createUser}>
                Create user
              </button>
            </div>

            {adminStatus && (
              <div className="muted small" style={{ marginTop: 8 }}>
                {adminStatus}
              </div>
            )}

            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="muted tiny" style={{ marginTop: 12 }}>
          Tip: separate multiple emails with commas.
        </div>
      </div>
    </div>
  );
}