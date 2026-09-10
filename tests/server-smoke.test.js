/* server/server.js (Firebase'siz backend) için uçtan uca bir regresyon testi.
   Gerçek bir Google OAuth değişimi headless/CI ortamında yapılamayacağı için
   (gerçek bir Google Client ID/Secret ve tarayıcı onayı gerektirir), OAuth
   akışının KENDİSİ burada test edilmiyor — bunun yerine createSession()'ın
   ürettiğiyle AYNI şekilde bir oturum doğrudan sessions.json'a "tohumlanıyor"
   (gerçek OAuth geri dönüşünün yapacağı şeyin aynısı, yalnızca Google'a gerçek
   bir istek atmadan). Bu, requireAuth/oturum/veri-deposu/yedekleme mantığının
   tamamını gerçek bir Node süreci ve gerçek HTTP istekleriyle uçtan uca
   doğrular — yalnızca "3. taraf Google sunucusuyla token değişimi" adımı
   atlanır.

   Diğer testlerin aksine (Playwright sayfa testleri, "ERRORS: []" ile
   insan gözden geçirmesi bekler) bu test GERÇEK assertion'lar kullanır ve
   herhangi bir beklenmeyen sonuçta process.exit(1) ile çöker — bu,
   scripts/run-tests.js tarafından "çöktü/timeout" olarak BAŞARISIZ
   sayılır. */
"use strict";
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = 34519; // testlere özel, çakışma ihtimali düşük bir port

let failed = false;
function check(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + " — " + label);
  if (!cond) failed = true;
}

function cookieHeaderFrom(setCookieArr, name) {
  for (const c of setCookieArr || []) {
    const m = c.match(new RegExp("^" + name + "=([^;]+)"));
    if (m) return name + "=" + m[1];
  }
  return null;
}

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ev-muhasebesi-test-"));
  const env = Object.assign({}, process.env, {
    PORT: String(PORT),
    PUBLIC_URL: "http://127.0.0.1:" + PORT,
    GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-session-secret-" + crypto.randomBytes(8).toString("hex"),
    DATA_DIR: dataDir,
  });

  const proc = spawn(process.execPath, [path.join(ROOT, "server", "server.js")], {
    cwd: path.join(ROOT, "server"),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  proc.stdout.on("data", (d) => { serverOutput += d.toString(); });
  proc.stderr.on("data", (d) => { serverOutput += d.toString(); });

  const base = "http://127.0.0.1:" + PORT;

  try {
    // Sunucunun dinlemeye başlamasını bekle (basit retry).
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      try {
        await fetch(base + "/api/me");
        up = true;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    check("sunucu ayağa kalktı", up);
    if (!up) { console.log("Sunucu çıktısı:\n" + serverOutput); throw new Error("sunucu başlamadı"); }

    // 1) Giriş yapılmamış durumda /api/me ve /api/state
    const meBefore = await (await fetch(base + "/api/me")).json();
    check("giriş yapmadan /api/me -> loggedIn:false", meBefore.loggedIn === false);

    const stateNoAuth = await fetch(base + "/api/state");
    check("giriş yapmadan /api/state -> 401", stateNoAuth.status === 401);

    // 2) Gerçek Google OAuth değişimini atlayıp, resolveHousehold/createSession'ın
    //    ÜRETECEĞİYLE AYNI ŞEKİLDE bir oturum + household doğrudan veri deposuna
    //    yazılıyor (bkz. dosya başındaki not).
    const uid = "test-uid-123";
    const email = "test@ornek.com";
    const hid = "hh_test0001";
    const seedState = {
      v: 1,
      people: [{ id: uid, name: "Test Kullanıcı", approved: true, isAdmin: true }],
      categories: { expense: [], income: [] },
      accounts: [{ id: "acc_nakit", type: "cash", name: "Nakit", opening: 1234, currency: "TRY" }],
      transactions: [],
      budgets: {}, recurring: [], goals: [], templates: [],
      fxRates: { USD: null, EUR: null, ALTIN: null },
      auditLog: [], passwordVault: { salt: null, check: null, entries: [] },
      reminders: [],
      cardNetworks: [],
    };
    fs.mkdirSync(path.join(dataDir, "households"), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, "households", hid + ".json"),
      JSON.stringify({ ownerUid: uid, members: [uid], memberProfiles: { [uid]: { name: "Test Kullanıcı", email, photoURL: null } }, state: seedState, updatedAt: new Date().toISOString() })
    );
    fs.writeFileSync(path.join(dataDir, "users.json"), JSON.stringify({ [uid]: { householdId: hid, email, name: "Test Kullanıcı" } }));
    const sid = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(
      path.join(dataDir, "sessions.json"),
      JSON.stringify({ [sid]: { uid, email, name: "Test Kullanıcı", photoURL: null, householdId: hid, expiresAt: Date.now() + 180 * 24 * 60 * 60 * 1000 } })
    );
    const cookie = "sid=" + sid;

    // 3) Oturumlu /api/me ve /api/state
    const meAfter = await (await fetch(base + "/api/me", { headers: { Cookie: cookie } })).json();
    check("oturumla /api/me -> loggedIn:true", meAfter.loggedIn === true);
    check("oturumla /api/me -> doğru e-posta", meAfter.user && meAfter.user.email === email);

    const stateResp = await fetch(base + "/api/state", { headers: { Cookie: cookie } });
    check("oturumla /api/state -> 200", stateResp.status === 200);
    const stateData = await stateResp.json();
    check("dönen state doğru mu (nakit opening 1234)", stateData.state && stateData.state.accounts[0].opening === 1234);
    const firstUpdatedAt = stateData.updatedAt;

    // 4) Veri kaydetme (POST /api/state)
    const newState = JSON.parse(JSON.stringify(stateData.state));
    newState.accounts[0].opening = 9999;
    await new Promise((r) => setTimeout(r, 5)); // updatedAt'in kesin farklı olması için
    const postResp = await fetch(base + "/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ state: newState }),
    });
    check("POST /api/state -> 200", postResp.status === 200);
    const postData = await postResp.json();
    check("POST sonrası updatedAt değişti", postData.updatedAt !== firstUpdatedAt);

    const stateResp2 = await (await fetch(base + "/api/state", { headers: { Cookie: cookie } })).json();
    check("kaydedilen değer geri okunuyor (opening 9999)", stateResp2.state.accounts[0].opening === 9999);

    // 5) Otomatik günlük yedek (POST /api/state sonrası oluşmuş olmalı)
    const backupsResp = await (await fetch(base + "/api/backups", { headers: { Cookie: cookie } })).json();
    check("en az bir günlük yedek oluştu", Array.isArray(backupsResp.backups) && backupsResp.backups.length >= 1);
    if (backupsResp.backups.length) {
      const backupId = backupsResp.backups[0].id;
      const oneBackup = await (await fetch(base + "/api/backups/" + backupId, { headers: { Cookie: cookie } })).json();
      check("tekil yedek içeriği okunabiliyor", oneBackup.state && Array.isArray(oneBackup.state.accounts));
    }

    // 6) Davet (POST /api/invite)
    const inviteResp = await fetch(base + "/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email: "davetli@ornek.com" }),
    });
    check("POST /api/invite -> 200", inviteResp.status === 200);
    const invitesOnDisk = JSON.parse(fs.readFileSync(path.join(dataDir, "invites.json"), "utf8"));
    check("davet dosyaya yazıldı", !!invitesOnDisk["davetli@ornek.com"]);

    // 7) Yetkisiz erişim reddi: başka/rastgele bir cookie ile
    const badCookieResp = await fetch(base + "/api/state", { headers: { Cookie: "sid=gecersiz-bir-deger" } });
    check("geçersiz sid ile /api/state -> 401", badCookieResp.status === 401);

    // 8) Çıkış (logout)
    const logoutResp = await fetch(base + "/api/auth/logout", { method: "POST", headers: { Cookie: cookie } });
    check("POST /api/auth/logout -> 200", logoutResp.status === 200);
    const meAfterLogout = await (await fetch(base + "/api/me", { headers: { Cookie: cookie } })).json();
    check("çıkıştan sonra /api/me -> loggedIn:false", meAfterLogout.loggedIn === false);
    const stateAfterLogout = await fetch(base + "/api/state", { headers: { Cookie: cookie } });
    check("çıkıştan sonra /api/state -> 401", stateAfterLogout.status === 401);

    console.log("\nERRORS:", failed ? ["bir veya daha fazla kontrol başarısız oldu — yukarıya bakın"] : "none");
  } finally {
    proc.kill();
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) {}
  }

  if (failed) process.exit(1);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
