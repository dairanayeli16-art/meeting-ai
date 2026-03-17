import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export default function App() {
  /* ---------------- AUTH ---------------- */

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const loginEmailRef = useRef(null);
  const loginPasswordRef = useRef(null);

  /* ---------------- LIBRARY ---------------- */

  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");

  const [newAgencyName, setNewAgencyName] = useState("");
  const [newCommunityName, setNewCommunityName] = useState("");
  const [libraryStatus, setLibraryStatus] = useState("");

  /* ---------------- RECORDER ---------------- */

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [sending, setSending] = useState(false);

  const [emailsText, setEmailsText] = useState("dairadedios@hotmail.es");
  const [titulo, setTitulo] = useState("Reunión automática");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const audioUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  /* ---------------- RESULT ---------------- */

  const [resultBox, setResultBox] = useState(null);

  /* ---------------- MODAL ---------------- */

  const [modal, setModal] = useState({ open: false, title: "", text: "" });

  const openModal = (title, text) => {
    setModal({ open: true, title, text: text || "(vacío)" });
  };

  const closeModal = () => {
    setModal({ open: false, title: "", text: "" });
  };

  /* ---------------- ADMIN PANEL ---------------- */

  const [adminOpen, setAdminOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [adminStatus, setAdminStatus] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  /* ---------------- DERIVED ---------------- */

  const agencies = library || [];

  const selectedAgency =
    agencies.find((a) => String(a.id) === String(selectedAgencyId)) || null;

  const communities = selectedAgency?.communities || [];

  const selectedCommunity =
    communities.find((c) => String(c.id) === String(selectedCommunityId)) || null;

  /* ---------------- HELPERS ---------------- */

  async function downloadPdf(url, filename = "acta-reunion.pdf") {
    if (!url) return;

    try {
      const response = await fetch(url);
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

  function resetAudio() {
    setAudioBlob(null);
    setStatus("Ready");
  }

  /* ---------------- API ---------------- */

  async function fetchMe() {
    setAuthLoading(true);

    try {
      const r = await fetch(apiUrl("/auth/me"), {
        credentials: "include",
      });

      const j = await r.json();

      if (j?.ok) {
        setUser(j.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadLibrary(preferredAgencyId = null, preferredCommunityId = null) {
    setLibraryLoading(true);

    try {
      const r = await fetch(apiUrl("/api/library"), {
        credentials: "include",
      });

      const j = await r.json();

      if (!j?.ok) {
        setLibrary([]);
        return;
      }

      const agenciesData = j.agencies || [];
      setLibrary(agenciesData);

      const agencyToUse =
        agenciesData.find((a) => String(a.id) === String(preferredAgencyId)) ||
        agenciesData.find((a) => String(a.id) === String(selectedAgencyId)) ||
        agenciesData[0] ||
        null;

      const nextAgencyId = agencyToUse ? String(agencyToUse.id) : "";
      setSelectedAgencyId(nextAgencyId);

      const communitiesData = agencyToUse?.communities || [];
      const communityToUse =
        communitiesData.find((c) => String(c.id) === String(preferredCommunityId)) ||
        communitiesData.find((c) => String(c.id) === String(selectedCommunityId)) ||
        communitiesData[0] ||
        null;

      setSelectedCommunityId(communityToUse ? String(communityToUse.id) : "");
    } catch {
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (user) {
      loadLibrary();
    } else {
      setLibrary([]);
      setSelectedAgencyId("");
      setSelectedCommunityId("");
    }
  }, [user]);

  async function login() {
    setLoginError("");

    const emailFromState = loginEmail.trim();
    const passwordFromState = loginPassword;

    const email =
      emailFromState ||
      loginEmailRef.current?.value?.trim() ||
      "";

    const password =
      passwordFromState ||
      loginPasswordRef.current?.value ||
      "";

    try {
      const r = await fetch(apiUrl("/auth/login"), {
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

      setLoginEmail(email);
      setLoginPassword("");
      if (loginPasswordRef.current) loginPasswordRef.current.value = "";
      setUser(j.user);
      setAdminOpen(false);
    } catch {
      setLoginError("Backend not reachable. Is server running?");
    }
  }

  async function logout() {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    setUser(null);
    setAdminOpen(false);
    setUsers([]);
    setResultBox(null);
    setLibrary([]);
    setSelectedAgencyId("");
    setSelectedCommunityId("");
  }

  async function loadUsers() {
    setAdminStatus("Loading users...");

    try {
      const r = await fetch(apiUrl("/admin/users"), {
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
      const r = await fetch(apiUrl("/admin/users"), {
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

  async function createAgency() {
    const name = newAgencyName.trim();

    if (!name) {
      setLibraryStatus("Write the agency name first.");
      return;
    }

    setLibraryStatus("Creating agency...");

    try {
      const r = await fetch(apiUrl("/api/agencies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      const j = await r.json();

      if (!j?.ok) {
        setLibraryStatus(j?.error || "Could not create agency.");
        return;
      }

      setNewAgencyName("");
      setLibraryStatus("Agency created ✅");
      await loadLibrary(j.agency?.id, null);
    } catch {
      setLibraryStatus("Backend not reachable.");
    }
  }

  async function createCommunity() {
    const name = newCommunityName.trim();

    if (!selectedAgencyId) {
      setLibraryStatus("Select an agency first.");
      return;
    }

    if (!name) {
      setLibraryStatus("Write the community name first.");
      return;
    }

    setLibraryStatus("Creating community...");

    try {
      const r = await fetch(apiUrl("/api/communities"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agencyId: Number(selectedAgencyId),
          name,
        }),
      });

      const j = await r.json();

      if (!j?.ok) {
        setLibraryStatus(j?.error || "Could not create community.");
        return;
      }

      setNewCommunityName("");
      setLibraryStatus("Community created ✅");
      await loadLibrary(selectedAgencyId, j.community?.id);
    } catch {
      setLibraryStatus("Backend not reachable.");
    }
  }

  /* ---------------- RECORDING ---------------- */

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

    if (!selectedAgency || !selectedCommunity) {
      setResultBox({
        ok: false,
        error: "Please select an agency and a community first.",
      });
      return;
    }

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
      formData.append("agencyId", String(selectedAgency.id));
      formData.append("communityId", String(selectedCommunity.id));
      formData.append("gestoria", selectedAgency.name);
      formData.append("comunidad", selectedCommunity.name);

      const r = await fetch(apiUrl("/upload-audio"), {
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

      const pdf = data.pdf_url || data.pdfUrl || data.meeting?.pdf_url || "";

      setResultBox({
        ok: true,
        emails: data.emails || emails,
        pdf,
        transcript: data.transcript || "",
        acta: data.acta || "",
        n8nStatus: data.n8nStatus || null,
        meeting: data.meeting || null,
      });

      await loadLibrary(selectedAgency.id, selectedCommunity.id);
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

  /* ---------------- UI ---------------- */

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

          <div className="grid2">
            <input
              ref={loginEmailRef}
              className="input"
              name="email"
              autoComplete="username"
              placeholder="email@domain.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onInput={(e) => setLoginEmail(e.target.value)}
            />
            <input
              ref={loginPasswordRef}
              className="input"
              name="password"
              autoComplete="current-password"
              placeholder="password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onInput={(e) => setLoginPassword(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn btnPrimary" onClick={login}>
              Login
            </button>
          </div>

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

        {/* ---------- STRUCTURE SECTION ---------- */}

        <div style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 12 }}>Gestorías y comunidades</h3>

          <div className="grid2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Gestoría</label>
              <select
                className="input"
                value={selectedAgencyId}
                onChange={(e) => {
                  const nextAgencyId = e.target.value;
                  setSelectedAgencyId(nextAgencyId);

                  const agency =
                    agencies.find((a) => String(a.id) === String(nextAgencyId)) ||
                    null;

                  const firstCommunity = agency?.communities?.[0] || null;
                  setSelectedCommunityId(firstCommunity ? String(firstCommunity.id) : "");
                }}
              >
                <option value="">Select agency</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Comunidad</label>
              <select
                className="input"
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                disabled={!selectedAgencyId}
              >
                <option value="">Select community</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid2">
            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="input"
                placeholder="Nueva gestoría"
                value={newAgencyName}
                onChange={(e) => setNewAgencyName(e.target.value)}
              />
              <button className="btn btnDark" onClick={createAgency}>
                Add
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="input"
                placeholder="Nueva comunidad"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                disabled={!selectedAgencyId}
              />
              <button
                className="btn btnDark"
                onClick={createCommunity}
                disabled={!selectedAgencyId}
              >
                Add
              </button>
            </div>
          </div>

          {libraryStatus && (
            <div className="muted small" style={{ marginTop: 10 }}>
              {libraryStatus}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* ---------- RECORDER SECTION ---------- */}

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
              value={selectedAgency?.name || ""}
              readOnly
            />
          </div>

          <div>
            <label className="label">Community</label>
            <input
              className="input"
              value={selectedCommunity?.name || ""}
              readOnly
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
            onClick={resetAudio}
            disabled={!audioBlob || recording || sending}
          >
            Clear
          </button>

          <button
            className="btn btnDark"
            onClick={sendToServer}
            disabled={
              !audioBlob ||
              recording ||
              sending ||
              !selectedAgency ||
              !selectedCommunity
            }
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
                        `${titulo.trim().replace(/\s+/g, "-").toLowerCase() || "reunion"}.pdf`
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

                  <button
                    className="btn btnGhost"
                    onClick={() => openModal("Acta", resultBox.acta)}
                    disabled={!resultBox.acta}
                  >
                    Ver Acta
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

        {/* ---------- LIBRARY / FOLDERS ---------- */}

        <div style={{ marginTop: 22 }}>
          <div className="divider" />
          <h3 style={{ margin: "14px 0 10px" }}>Historial por gestoría y comunidad</h3>

          {libraryLoading ? (
            <div className="muted">Loading library...</div>
          ) : agencies.length === 0 ? (
            <div className="muted">No agencies yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {agencies.map((agency) => (
                <div
                  key={agency.id}
                  style={{
                    border: "1px solid rgba(108,76,241,.18)",
                    borderRadius: 18,
                    padding: 16,
                    background: "rgba(255,255,255,.28)",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 10 }}>
                    📁 {agency.name}
                  </div>

                  {agency.communities.length === 0 ? (
                    <div className="muted">No communities inside this agency yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {agency.communities.map((community) => (
                        <div
                          key={community.id}
                          style={{
                            border: "1px solid rgba(0,0,0,.08)",
                            borderRadius: 14,
                            padding: 14,
                            background: "rgba(255,255,255,.34)",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 10 }}>
                            📂 {community.name}
                          </div>

                          {community.meetings.length === 0 ? (
                            <div className="muted small">No meetings yet.</div>
                          ) : (
                            <div style={{ display: "grid", gap: 10 }}>
                              {community.meetings.map((meeting) => (
                                <div
                                  key={meeting.id}
                                  style={{
                                    padding: 12,
                                    borderRadius: 12,
                                    border: "1px solid rgba(0,0,0,.08)",
                                    background: "rgba(255,255,255,.44)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: 12,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700 }}>
                                        {meeting.titulo}
                                      </div>
                                      <div className="muted tiny">
                                        {meeting.created_at}
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <button
                                        className="btn btnGhost"
                                        onClick={() => window.open(meeting.pdf_url, "_blank")}
                                        disabled={!meeting.pdf_url}
                                      >
                                        PDF
                                      </button>

                                      <button
                                        className="btn btnGhost"
                                        onClick={() =>
                                          downloadPdf(
                                            meeting.pdf_url,
                                            `${meeting.titulo || "acta"}.pdf`
                                          )
                                        }
                                        disabled={!meeting.pdf_url}
                                      >
                                        Descargar
                                      </button>

                                      <button
                                        className="btn btnGhost"
                                        onClick={() =>
                                          openModal("Transcripción", meeting.transcript)
                                        }
                                        disabled={!meeting.transcript}
                                      >
                                        Transcripción
                                      </button>

                                      <button
                                        className="btn btnGhost"
                                        onClick={() => openModal("Acta", meeting.acta)}
                                        disabled={!meeting.acta}
                                      >
                                        Acta
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- ADMIN ---------- */}

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