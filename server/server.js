/* Yılmaz Hane Defteri — Firebase'siz backend.
   ----------------------------------------------------------------------
   Bu küçük sunucu, bağımsız sitenin daha önce Firebase Auth + Firestore'dan
   aldığı iki şeyi verir:
     1) Kimlik doğrulama: Google ile Giriş — ama Firebase Auth SDK'sı yerine
        DOĞRUDAN Google'ın kendi OAuth 2.0 (Authorization Code) akışı.
     2) Veri deposu: households/{id}.state — Firestore yerine düz JSON
        dosyaları (bkz. lib/store.js), aynı "bir household = bir state JSON
        blob'u" modeli.
   Ön yüz (src/app.js, BACKEND==='selfhosted' dalı) bu API'yi kullanır;
   gerçek zamanlı senkron için Firestore'un onSnapshot'ı yerine basit bir
   periyodik "GET /api/state" polling'i yapar (küçük bir hane defteri için
   fazlasıyla yeterli).
   ---------------------------------------------------------------------- */
"use strict";
require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const { OAuth2Client } = require("google-auth-library");
const store = require("./lib/store");

const PORT = parseInt(process.env.PORT || "3001", 10);
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const REDIRECT_URI = PUBLIC_URL + "/api/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET || !PUBLIC_URL) {
  console.error(
    "HATA: .env eksik/boş görünüyor. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET ve PUBLIC_URL doldurulmalı (bkz. .env.example)."
  );
  process.exit(1);
}

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

/* ---------------- veri dosyası yolları ---------------- */
const usersFile = path.join(DATA_DIR, "users.json");
const invitesFile = path.join(DATA_DIR, "invites.json");
const sessionsFile = path.join(DATA_DIR, "sessions.json");
function householdFile(hid) {
  return path.join(DATA_DIR, "households", hid + ".json");
}
function backupFile(hid, dateKey) {
  return path.join(DATA_DIR, "backups", hid, dateKey + ".json");
}
function backupDir(hid) {
  return path.join(DATA_DIR, "backups", hid);
}

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 gün

/* ---------------- yardımcılar ---------------- */
function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function defaultState() {
  /* src/app.js'teki defaultState() ile AYNI şekil — yalnızca people alanı
     burada boş bırakılıp çağıran tarafından (yeni household kurucusuyla)
     dolduruluyor. */
  return {
    v: 1,
    people: [],
    categories: {
      expense: [
        { id: "ce1", name: "Market / Gıda", slot: 0 },
        { id: "ce2", name: "Faturalar", slot: 1 },
        { id: "ce3", name: "Kira / Aidat", slot: 2 },
        { id: "ce4", name: "Ulaşım", slot: 3 },
        { id: "ce5", name: "Sağlık", slot: 4 },
        { id: "ce6", name: "Giyim", slot: 5 },
        { id: "ce7", name: "Eğlence / Sosyal", slot: 6 },
        { id: "ce8", name: "Diğer Gider", slot: 7 },
      ],
      income: [
        { id: "ci1", name: "Maaş", slot: 0 },
        { id: "ci2", name: "Ek Gelir", slot: 2 },
        { id: "ci3", name: "Yatırım Geliri", slot: 5 },
        { id: "ci4", name: "Diğer Gelir", slot: 7 },
      ],
    },
    accounts: [{ id: "acc_nakit", type: "cash", name: "Nakit", opening: 0, currency: "TRY" }],
    transactions: [],
    budgets: {},
    recurring: [],
    goals: [],
    templates: [],
    fxRates: { USD: null, EUR: null, ALTIN: null },
    auditLog: [],
    passwordVault: { salt: null, check: null, entries: [] },
    reminders: [],
    cardNetworks: [
      { id: "net_bonus", name: "Bonus" },
      { id: "net_axess", name: "Axess" },
      { id: "net_world", name: "World" },
      { id: "net_maximum", name: "Maximum" },
      { id: "net_paraf", name: "Paraf" },
    ],
  };
}

/* ---------------- household çözümleme (Firestore'daki fbResolveHousehold'un eşdeğeri) ----------------
   1) Bu Google hesabı (uid) daha önce giriş yaptıysa -> zaten bildiğimiz household.
   2) İlk giriş ama bekleyen bir davet varsa (invites[email]) -> o household'a katıl.
   3) İkisi de yoksa -> yepyeni, boş, kendi household'unu kur (kurucu = admin). */
function resolveHousehold(profile) {
  const uid = profile.sub;
  const email = (profile.email || "").toLowerCase();
  const name = profile.name || email;
  const picture = profile.picture || null;

  const users = store.readJson(usersFile, {});
  if (users[uid] && users[uid].householdId) {
    touchMemberProfile(users[uid].householdId, uid, { name, email, photoURL: picture });
    return users[uid].householdId;
  }

  const invites = store.readJson(invitesFile, {});
  if (invites[email]) {
    const hid = invites[email].householdId;
    const hh = store.readJson(householdFile(hid), null);
    if (hh) {
      if (!hh.members.includes(uid)) hh.members.push(uid);
      hh.memberProfiles = hh.memberProfiles || {};
      hh.memberProfiles[uid] = { name, email, photoURL: picture };
      store.writeJsonAtomic(householdFile(hid), hh);
      delete invites[email];
      store.writeJsonAtomic(invitesFile, invites);
      users[uid] = { householdId: hid, email, name };
      store.writeJsonAtomic(usersFile, users);
      return hid;
    }
  }

  /* yeni, boş household */
  const hid = "hh_" + crypto.randomBytes(6).toString("hex");
  const seedState = defaultState();
  seedState.people = [{ id: uid, name, approved: true, isAdmin: true }];
  const hh = {
    ownerUid: uid,
    members: [uid],
    memberProfiles: { [uid]: { name, email, photoURL: picture } },
    state: seedState,
    updatedAt: new Date().toISOString(),
  };
  store.writeJsonAtomic(householdFile(hid), hh);
  users[uid] = { householdId: hid, email, name };
  store.writeJsonAtomic(usersFile, users);
  return hid;
}

function touchMemberProfile(hid, uid, profile) {
  const hh = store.readJson(householdFile(hid), null);
  if (!hh) return;
  hh.memberProfiles = hh.memberProfiles || {};
  hh.memberProfiles[uid] = profile;
  store.writeJsonAtomic(householdFile(hid), hh);
}

/* ---------------- günlük otomatik yedekleme ---------------- */
function saveDailyBackupIfNeeded(hid, state) {
  const key = todayKey();
  const file = backupFile(hid, key);
  if (require("fs").existsSync(file)) return; // bugün için zaten var
  store.writeJsonAtomic(file, { state, savedAt: new Date().toISOString() });
  pruneOldBackups(hid);
}
function pruneOldBackups(hid) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dir = backupDir(hid);
  store.listFiles(dir).forEach((f) => {
    const id = f.replace(/\.json$/, "");
    if (id < cutoff) {
      try {
        require("fs").unlinkSync(path.join(dir, f));
      } catch (e) {}
    }
  });
}

/* ---------------- oturumlar ----------------
   sessions.json: { [sessionId]: { uid, email, name, photoURL, householdId, expiresAt } } */
function loadSessions() {
  return store.readJson(sessionsFile, {});
}
function saveSessions(s) {
  store.writeJsonAtomic(sessionsFile, s);
}
function createSession(profile, hid) {
  const sessions = loadSessions();
  const sid = crypto.randomBytes(32).toString("hex");
  sessions[sid] = {
    uid: profile.sub,
    email: (profile.email || "").toLowerCase(),
    name: profile.name || profile.email,
    photoURL: profile.picture || null,
    householdId: hid,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  saveSessions(sessions);
  return sid;
}
function getSession(sid) {
  if (!sid) return null;
  const sessions = loadSessions();
  const s = sessions[sid];
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    delete sessions[sid];
    saveSessions(sessions);
    return null;
  }
  return s;
}
function destroySession(sid) {
  if (!sid) return;
  const sessions = loadSessions();
  delete sessions[sid];
  saveSessions(sessions);
}

/* ---------------- express app ---------------- */
const app = express();
app.set("trust proxy", 1); // nginx arkasında çalışıyoruz
app.use(express.json({ limit: "5mb" })); // tüm household state'i tek JSON gövdesi olarak gelir
app.use(cookieParser(SESSION_SECRET));

function requireAuth(req, res, next) {
  const sid = req.signedCookies.sid || req.cookies.sid;
  const session = getSession(sid);
  if (!session) return res.status(401).json({ error: "unauthenticated" });
  req.session2 = session; // Express'in kendi req.session'ıyla karışmasın diye
  next();
}

/* ---- OAuth: giriş başlat ---- */
app.get("/api/auth/google/start", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });
  const url = oauthClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
  res.redirect(url);
});

/* ---- OAuth: geri dönüş ---- */
app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const expectedState = req.cookies.oauth_state;
    res.clearCookie("oauth_state");
    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect("/?login_error=state");
    }
    const { tokens } = await oauthClient.getToken({ code, redirect_uri: REDIRECT_URI });
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload(); // { sub, email, name, picture, ... }
    if (!profile || !profile.email) return res.redirect("/?login_error=profile");

    const hid = resolveHousehold(profile);
    const sid = createSession(profile, hid);
    res.cookie("sid", sid, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      signed: false,
    });
    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback hatası:", err);
    res.redirect("/?login_error=exchange");
  }
});

app.post("/api/auth/logout", (req, res) => {
  const sid = req.cookies.sid;
  destroySession(sid);
  res.clearCookie("sid");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const sid = req.cookies.sid;
  const session = getSession(sid);
  if (!session) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    user: { uid: session.uid, email: session.email, name: session.name, photoURL: session.photoURL },
  });
});

app.get("/api/state", requireAuth, (req, res) => {
  const hh = store.readJson(householdFile(req.session2.householdId), null);
  if (!hh) return res.status(404).json({ error: "household_not_found" });
  res.json({ state: hh.state, updatedAt: hh.updatedAt });
});

app.post("/api/state", requireAuth, (req, res) => {
  const newState = req.body && req.body.state;
  if (!newState || typeof newState !== "object") {
    return res.status(400).json({ error: "invalid_state" });
  }
  const hid = req.session2.householdId;
  const hh = store.readJson(householdFile(hid), null);
  if (!hh) return res.status(404).json({ error: "household_not_found" });
  hh.state = newState;
  hh.updatedAt = new Date().toISOString();
  store.writeJsonAtomic(householdFile(hid), hh);
  try {
    saveDailyBackupIfNeeded(hid, newState);
  } catch (e) {
    console.error("Günlük yedek alınamadı:", e);
  }
  res.json({ ok: true, updatedAt: hh.updatedAt });
});

app.post("/api/invite", requireAuth, (req, res) => {
  const email = ((req.body && req.body.email) || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "invalid_email" });
  const invites = store.readJson(invitesFile, {});
  invites[email] = {
    householdId: req.session2.householdId,
    invitedByUid: req.session2.uid,
    invitedByName: req.session2.name,
    createdAt: new Date().toISOString(),
  };
  store.writeJsonAtomic(invitesFile, invites);
  res.json({ ok: true });
});

app.get("/api/backups", requireAuth, (req, res) => {
  const dir = backupDir(req.session2.householdId);
  const files = store
    .listFiles(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort()
    .reverse()
    .slice(0, 30);
  res.json({ backups: files.map((id) => ({ id })) });
});

app.get("/api/backups/:id", requireAuth, (req, res) => {
  const id = req.params.id.replace(/[^0-9-]/g, ""); // yalnızca YYYY-MM-DD karakterleri
  const data = store.readJson(backupFile(req.session2.householdId, id), null);
  if (!data) return res.status(404).json({ error: "backup_not_found" });
  res.json({ state: data.state });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log("Ev Muhasebesi backend " + PORT + " portunda dinliyor (yalnızca localhost, nginx üzerinden erişilir).");
});
