/* Çok basit, dış veritabanı gerektirmeyen JSON-dosya-tabanlı veri deposu.
   Bu uygulama küçük bir hane defteri (birkaç kullanıcı) için tasarlandığı
   için gerçek bir veritabanı motoruna (Postgres/MySQL/SQLite native modülü
   derlemeye) ihtiyaç yok — düz JSON dosyaları, atomik yazma (geçici dosyaya
   yazıp yeniden adlandırma) ile veri bozulmasına karşı yeterince güvenli. */
"use strict";
const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

function listFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {
    return [];
  }
}

module.exports = { ensureDir, readJson, writeJsonAtomic, listFiles };
