/* Yılmaz Hane Defteri — ev muhasebesi uygulaması
   İki farklı barındırma ortamını destekler (aşağıdaki BACKEND değişkenine bakınız):
   1) Claude Artifact — paylaşılan aile verisi Claude'un "artifact" runtime
      yeteneği ile HTML içine gömülü olarak saklanır.
   2) Bağımsız barındırma (ör. GitHub Pages) — window.__FIREBASE_CONFIG__
      tanımlıysa aktif olur: kimlik Google ile Giriş (Firebase Auth), veri
      Firestore'da "households/{id}" dokümanında saklanır, gerçek zamanlı
      (onSnapshot) senkronize olur, davet sistemiyle aile üyeleri eklenir. */
(function(){
  "use strict";

  /* Hangi barındırma ortamında çalıştığımızı en başta belirliyoruz; state
     yükleme, kimlik ve kaydetme mantığının tamamı buna göre dallanır. */
  var BACKEND = (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) ? 'firebase' : 'artifact';

  /* ---------------- ikonlar ---------------- */
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h13a1 1 0 011 1v3"/><path d="M3 7v11a2 2 0 002 2h14a1 1 0 001-1V10a1 1 0 00-1-1H6a2 2 0 00-2-2z"/><path d="M17 13.5h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M4 21V10"/><path d="M20 21V10"/><path d="M2 10l10-6 10 6"/><path d="M9 21v-6h6v6"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M2.5 10h19"/><path d="M6 15h4"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"/><circle cx="12" cy="14" r="7"/><path d="M9.3 12.5a2.8 2.8 0 105.4 0"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l4 4-4 4"/><path d="M7 7H21"/><path d="M17 21l-4-4 4-4"/><path d="M17 17H3"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
    handOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 15l6-6"/><path d="M9 9h6v6"/></svg>',
    handIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6"/><path d="M15 15H9V9"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 012-2h1.2l1-1.6A1 1 0 019 4h6a1 1 0 01.8.4L17 6h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M6 9l6-6 6 6"/><path d="M4 20h16"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="M6 12l6 6 6-6"/><path d="M4 20h16"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>'
  };
  function icon(name, extraClass){ return '<span class="icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">' + (ICONS[name]||'') + '</span>'; }

  /* ---------------- yardımcılar ---------------- */
  function uid(prefix){ return (prefix||'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

  /* ---------------- Şifre Kasası: uçtan uca şifreleme yardımcıları ----------------
     Ana şifre hiçbir zaman kaydedilmez/gönderilmez/persist edilmez; yalnızca
     tarayıcı belleğinde (vaultKey, bir CryptoKey nesnesi) tutulur ve sayfa
     yenilendiğinde/kilitlendiğinde kaybolur — yeniden kilit açma gerekir.
     PBKDF2 (SHA-256, 210.000 iterasyon, OWASP 2023 önerisi) ile ana şifreden
     bir AES-GCM anahtarı türetilir; her kayıt kendi rastgele IV'siyle ayrı ayrı
     şifrelenir. Firestore'a veya git'e ASLA düz metin şifre gitmez. */
  function b64FromBytes(bytes){
    var bin = '';
    for(var i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function bytesFromB64(b64){
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function randomB64(len){ return b64FromBytes(crypto.getRandomValues(new Uint8Array(len))); }
  var VAULT_CHECK_PLAINTEXT = 'hane-defteri-vault-ok-v1';
  function vaultDeriveKey(password, saltB64){
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey']).then(function(baseKey){
      return crypto.subtle.deriveKey(
        { name:'PBKDF2', salt: bytesFromB64(saltB64), iterations: 210000, hash:'SHA-256' },
        baseKey,
        { name:'AES-GCM', length:256 },
        false,
        ['encrypt','decrypt']
      );
    });
  }
  function vaultEncryptText(key, plaintext){
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var enc = new TextEncoder();
    return crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc.encode(plaintext)).then(function(cipherBuf){
      return { iv: b64FromBytes(iv), cipher: b64FromBytes(new Uint8Array(cipherBuf)) };
    });
  }
  function vaultDecryptText(key, ivB64, cipherB64){
    var dec = new TextDecoder();
    return crypto.subtle.decrypt({name:'AES-GCM', iv: bytesFromB64(ivB64)}, key, bytesFromB64(cipherB64)).then(function(plainBuf){
      return dec.decode(plainBuf);
    });
  }
  /* CryptoKey — yalnızca bellekte, asla state içine veya persist()'e girmez. */
  var vaultKey = null;
  /* ---------------- döviz cinsleri ---------------- */
  var CURRENCIES = [ ['TRY','Türk Lirası','₺'], ['USD','Dolar','$'], ['EUR','Euro','€'], ['ALTIN','Altın','gr'] ];
  var CURRENCY_MAP = {};
  CURRENCIES.forEach(function(c){ CURRENCY_MAP[c[0]] = { code:c[0], label:c[1], symbol:c[2] }; });
  function fmtCurrency(n, code){
    var info = CURRENCY_MAP[code] || CURRENCY_MAP.TRY;
    n = Number(n)||0;
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    return sign + abs.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ' + info.symbol;
  }
  function fmtTRY(n){ return fmtCurrency(n, 'TRY'); }
  /* Sadece Banka ve Nakit hesaplarının kendi döviz cinsi olabilir (varsayılan TRY);
     diğer hesap türleri (kart, kredi, harici, borç) her zaman TRY kabul edilir. */
  function accountCurrency(a){ return (a && (a.type==='bank' || a.type==='cash') && a.currency) ? a.currency : 'TRY'; }
  function isForeignCurrencyAccount(a){ return accountCurrency(a) !== 'TRY'; }
  /* Ayarlar'dan manuel girilen döviz kurları (1 birim dövizin kaç TL ettiği).
     Kur girilmemişse null döner ve o para birimi TL'ye çevrilemez sayılır. */
  function fxRateFor(code){
    if(code==='TRY') return 1;
    var r = state.fxRates && state.fxRates[code];
    return (typeof r === 'number' && r>0) ? r : null;
  }
  function toTRY(amount, code){
    var rate = fxRateFor(code);
    return rate==null ? null : amount*rate;
  }
  function fmtDate(iso){
    if(!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if(isNaN(d)) return iso;
    return d.toLocaleDateString('tr-TR', {day:'2-digit', month:'short', year:'numeric'});
  }
  /* Kayıt geçmişi / denetim kaydı (madde 7): kişi bazlı ayrıntılı yetkilendirme
     yerine (herkes tam erişimli kalır), yalnızca kim-ne-zaman-ne-yaptı bilgisini
     tutan basit bir günlük. En son 500 kayıt saklanır. */
  function logAudit(action, summary){
    if(!state.auditLog) state.auditLog = [];
    var person = localIdentity ? getPerson(localIdentity) : null;
    state.auditLog.push({
      id: uid('log'),
      ts: new Date().toISOString(),
      personId: localIdentity || null,
      personName: person ? person.name : 'Bilinmiyor',
      action: action,
      summary: summary
    });
    if(state.auditLog.length>500) state.auditLog.splice(0, state.auditLog.length-500);
  }
  function fmtDateTime(iso){
    if(!iso) return '';
    var d = new Date(iso);
    if(isNaN(d)) return iso;
    return d.toLocaleDateString('tr-TR', {day:'2-digit', month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
  }
  function todayISO(){
    var d = new Date();
    var tz = d.getTimezoneOffset();
    d = new Date(d.getTime() - tz*60000);
    return d.toISOString().slice(0,10);
  }
  /* Toplu içe aktarma (yapıştırarak) için tarih/tutar ayrıştırma yardımcıları —
     kullanıcı bir ekstreyi/Excel tablosunu doğrudan yapıştırabilsin diye hem
     ISO (2026-01-31) hem TR (31.01.2026 / 31/01/2026) tarih biçimini,
     hem "1.234,56" hem "1234.56" / "1234,56" tutar biçimini kabul eder. */
  function parseDateFlexible(raw){
    var s = (raw||'').trim();
    if(!s) return null;
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0');
    m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
    if(m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
    return null;
  }
  function parseAmountFlexible(raw){
    var s = (raw||'').trim().replace(/[₺$€\s]/g,'');
    if(!s) return NaN;
    var neg = false;
    if(/^-/.test(s)){ neg = true; s = s.slice(1); }
    if(/,/.test(s) && /\./.test(s)){
      if(s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',', '.');
      else s = s.replace(/,/g,'');
    } else if(/,/.test(s)){
      s = s.replace(',', '.');
    }
    var n = parseFloat(s);
    if(isNaN(n)) return NaN;
    return neg ? -n : n;
  }
  /* Satırı sütunlara ayırır: Excel'den kopyalanan hücreler TAB ile ayrılır;
     kullanıcı elle noktalı virgülle de ayırabilir. */
  function splitBulkRow(line){
    if(line.indexOf('\t')>-1) return line.split('\t');
    return line.split(';');
  }
  function monthKey(iso){ return (iso||'').slice(0,7); }
  function monthLabel(key){
    var parts = key.split('-'); var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, 1);
    return d.toLocaleDateString('tr-TR', {month:'short', year:'numeric'});
  }
  function addMonths(key, n){
    var parts = key.split('-'); var y = parseInt(parts[0],10), m = parseInt(parts[1],10)-1;
    var d = new Date(y, m+n, 1);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }
  function currentMonthKey(){ return todayISO().slice(0,7); }
  function monthDiff(a, b){
    var pa = a.split('-'), pb = b.split('-');
    return (parseInt(pb[0],10)-parseInt(pa[0],10))*12 + (parseInt(pb[1],10)-parseInt(pa[1],10));
  }

  /* tam tarih (YYYY-MM-DD) üzerinde ay/gün ekleme — planlı/tekrarlanan kayıt
     tarihlerini üretmek için kullanılır (addMonths yalnızca ay anahtarlarıyla çalışıyor). */
  function addMonthsToDate(iso, n){
    var parts = (iso||todayISO()).split('-');
    var y = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, day = parseInt(parts[2],10);
    var d = new Date(y, m+n, 1);
    var lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function addDaysToDate(iso, n){
    var parts = (iso||todayISO()).split('-');
    var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
    d.setDate(d.getDate()+n);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  /* Kredi ve kredi kartı ödeme günleri cumartesi/pazara denk gelirse bir sonraki
     ilk pazartesiye kaydırılır ("bütçelenir"). */
  function rollWeekendToMonday(iso){
    var parts = iso.split('-');
    var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
    var dow = d.getDay(); /* 0=Pazar, 6=Cumartesi */
    if(dow===6) d.setDate(d.getDate()+2);
    else if(dow===0) d.setDate(d.getDate()+1);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  /* Kredi kartı hesap kesim/ödeme günü mantığı: kesim tarihi ve öncesindeki
     harcamalar o dönemin ödeme gününe bütçelenir. Ödeme günü kesim gününden
     küçük/eşitse (ör. kesim 25, ödeme 5) ödeme bir sonraki ay yapılır. */
  function cardStatementKeyForDate(acct, dateISO){
    var day = parseInt((dateISO||'').slice(8,10),10) || 1;
    var mk = monthKey(dateISO);
    return day <= clamp(acct.statementDay||28,1,28) ? mk : addMonths(mk, 1);
  }
  function cardPaymentDateForStatement(acct, statementMonthKey){
    var payMonth = (acct.paymentDay||1) <= (acct.statementDay||28) ? addMonths(statementMonthKey, 1) : statementMonthKey;
    return rollWeekendToMonday(payMonth + '-' + pad2(clamp(acct.paymentDay||1,1,28)));
  }
  function cardPaymentDateForTx(acct, dateISO){
    return cardPaymentDateForStatement(acct, cardStatementKeyForDate(acct, dateISO));
  }

  /* Taksitli kredi kartı harcamalarında her taksidin, o taksidin düştüğü
     hesap dönemine karşılık gelen ÖDEME GÜNÜNE denk gelmesi için: ilk taksidin
     dönem anahtarından başlayarak birer ay ileri giderek art arda ödeme
     tarihleri üretir (her biri cardPaymentDateForStatement ile hesaplanır,
     hafta sonuna denk gelirse pazartesiye kayar). */
  function cardInstallmentDates(acct, fromStatementKey, count){
    var dates = [];
    for(var i=0;i<count;i++){
      dates.push(cardPaymentDateForStatement(acct, addMonths(fromStatementKey, i)));
    }
    return dates;
  }

  /* kart numarasını yalnızca son 4 haneyi göstererek maskeler (ör. •••• •••• •••• 1234) */
  function maskCardNumber(num){
    var digits = String(num||'').replace(/\D/g,'');
    if(digits.length<4) return esc(num||'');
    return '•••• •••• •••• ' + digits.slice(-4);
  }

  /* bir başlangıç tarihinden itibaren, verilen sıklıkta 'count' tarih üretir
     (tekrarlanan gelir/gider, taksitli kredi/kart ödemesi için ortak kullanılır). */
  function occurrenceDates(startISO, freq, count){
    var dates = [];
    for(var i=0;i<count;i++){
      if(freq==='weekly') dates.push(addDaysToDate(startISO, i*7));
      else if(freq==='yearly') dates.push(addMonthsToDate(startISO, i*12));
      else dates.push(addMonthsToDate(startISO, i));
    }
    return dates;
  }

  var SLOT_VARS = ['--slot-1','--slot-2','--slot-3','--slot-4','--slot-5','--slot-6','--slot-7','--slot-8'];
  function slotColor(i){ return 'var(' + SLOT_VARS[i % SLOT_VARS.length] + ')'; }

  /* ---------------- varsayılan durum ---------------- */
  function defaultState(){
    return {
      v: 1,
      people: [
        { id: 'p_ergin', name: 'Ergin', approved:true, isAdmin:true },
        { id: 'p_es', name: 'Eş', approved:true, isAdmin:false }
      ],
      categories: {
        expense: [
          { id:'ce1', name:'Market / Gıda', slot:0 },
          { id:'ce2', name:'Faturalar', slot:1 },
          { id:'ce3', name:'Kira / Aidat', slot:2 },
          { id:'ce4', name:'Ulaşım', slot:3 },
          { id:'ce5', name:'Sağlık', slot:4 },
          { id:'ce6', name:'Giyim', slot:5 },
          { id:'ce7', name:'Eğlence / Sosyal', slot:6 },
          { id:'ce8', name:'Diğer Gider', slot:7 }
        ],
        income: [
          { id:'ci1', name:'Maaş', slot:0 },
          { id:'ci2', name:'Ek Gelir', slot:2 },
          { id:'ci3', name:'Yatırım Geliri', slot:5 },
          { id:'ci4', name:'Diğer Gelir', slot:7 }
        ]
      },
      accounts: [
        { id:'acc_nakit', type:'cash', name:'Nakit', opening:0, currency:'TRY' }
      ],
      transactions: [],
      budgets: {},
      recurring: [],
      goals: [],
      templates: [],
      fxRates: { USD: null, EUR: null, ALTIN: null },
      auditLog: [],
      passwordVault: { salt: null, check: null, entries: [] },
      cardNetworks: [
        { id:'net_bonus', name:'Bonus' },
        { id:'net_axess', name:'Axess' },
        { id:'net_world', name:'World' },
        { id:'net_maximum', name:'Maximum' },
        { id:'net_paraf', name:'Paraf' }
      ]
    };
  }

  function migrateState(s){
    if(!s.budgets) s.budgets = {};
    if(!s.recurring) s.recurring = [];
    if(!s.goals) s.goals = [];
    if(!s.templates) s.templates = [];
    if(!s.fxRates) s.fxRates = { USD: null, EUR: null, ALTIN: null };
    else ['USD','EUR','ALTIN'].forEach(function(code){ if(s.fxRates[code]===undefined) s.fxRates[code] = null; });
    if(!s.auditLog) s.auditLog = [];
    if(!s.passwordVault) s.passwordVault = { salt: null, check: null, entries: [] };
    else if(!s.passwordVault.entries) s.passwordVault.entries = [];
    if(!s.cardNetworks || !s.cardNetworks.length){
      s.cardNetworks = [
        { id:'net_bonus', name:'Bonus' },
        { id:'net_axess', name:'Axess' },
        { id:'net_world', name:'World' },
        { id:'net_maximum', name:'Maximum' },
        { id:'net_paraf', name:'Paraf' }
      ];
    }
    if(s.people && s.people.length){
      s.people.forEach(function(p){
        if(p.approved===undefined) p.approved = true; /* önceden var olan kişiler zaten güvenilir kabul edilir */
        if(p.isAdmin===undefined) p.isAdmin = false;
      });
      if(!s.people.some(function(p){ return p.isAdmin; })) s.people[0].isAdmin = true;
    }
    if(s.transactions && s.transactions.length){
      var todayMig = todayISO();
      s.transactions.forEach(function(t){
        /* yeni "planlı işlem" modelinden önce girilmiş, ileri tarihli kayıtlar da
           artık planlı sayılmalı ki gerçekleşme sorusu/raporlama tutarlı olsun. */
        if(!t.status && t.date && t.date > todayMig && (t.type==='income'||t.type==='expense'||t.type==='transfer')){
          t.status = 'planned';
        }
      });
    }
    /* eski taksitli-kart harcaması modeli: sadece ilk taksit hemen kaydedilip
       kalan taksitler state.recurring üzerinden ay ay manuel "Ekle" ile
       eklenmesini bekliyordu — bu da Hareketler'de yalnızca o ayki kaydın
       görünüp kalan taksitlerin "kayıp" gibi görünmesine yol açıyordu. Hâlâ
       taksiti kalan böyle şablonları tekrarlanan gelir/gider ve Kredi ile
       aynı modele geçiriyoruz: kalan tüm taksitleri şimdi ileri tarihli
       ('planned') kayıtlar olarak oluşturup şablonu pasif hale getiriyoruz.
       installmentsRemaining 0'a indiği için bir daha çalışmaz (idempotent). */
    if(s.recurring && s.recurring.length){
      var todayMigInst = todayISO();
      s.recurring.forEach(function(r){
        if(r.totalInstallments && r.installmentsRemaining>0){
          var racctMig = (s.accounts||[]).find(function(a){ return a.id===r.accountId; });
          var relatedDates = (s.transactions||[]).filter(function(t){ return t.recurringId===r.id; }).map(function(t){ return t.date; }).sort();
          var lastDate = relatedDates.length ? relatedDates[relatedDates.length-1] : null;
          /* kart hesabıysa kalan taksitleri kartın kesim/ödeme günü döngüsüne
             göre (son kaydedilen taksidin dönemi baz alınarak) hizalıyoruz;
             diğer borç türlerinde (ör. alınan borç) eski takvim-bazlı yöntem
             (satın alma günü + ay) korunuyor. */
          var migDates;
          if(racctMig && racctMig.type==='card'){
            var lastStatementKey = lastDate ? cardStatementKeyForDate(racctMig, lastDate) : cardStatementKeyForDate(racctMig, todayMigInst);
            var startStatementKey = lastDate ? addMonths(lastStatementKey, 1) : lastStatementKey;
            migDates = cardInstallmentDates(racctMig, startStatementKey, r.installmentsRemaining);
          } else {
            var startDate = lastDate ? addMonthsToDate(lastDate, 1) : (todayMigInst.slice(0,7) + '-' + pad2(clamp(r.day,1,28)));
            migDates = [];
            for(var mi=0; mi<r.installmentsRemaining; mi++){ migDates.push(mi===0 ? startDate : addMonthsToDate(startDate, mi)); }
          }
          var startIdx = r.totalInstallments - r.installmentsRemaining + 1;
          var instSeriesIdMig = uid('series');
          for(var i=0;i<r.installmentsRemaining;i++){
            var dt = migDates[i];
            var occ = {
              id: uid('tx'), type:'expense', amount:r.amount, date: dt,
              accountId: r.accountId, categoryId: r.categoryId, personId: r.personId || null,
              note: r.name + ' (' + (startIdx+i) + '/' + r.totalInstallments + ' taksit)',
              tags: [], receipt: null, seriesId: instSeriesIdMig
            };
            if(dt > todayMigInst) occ.status = 'planned';
            s.transactions.push(occ);
          }
          r.active = false;
          r.installmentsRemaining = 0;
        }
      });
    }
    /* Kredi hesapları artık yalnızca "Taksit Tutarı × Taksit Sayısı" ile açılıyor;
       kaynak hesap ve otomatik ödeme takvimi kaldırıldı — ödemeler artık tek tek
       "Ödeme Yap" ile, ödemenin yapılacağı hesap o an seçilerek kaydediliyor.
       Eski modelde açılmış krediler (sourceAccountId/nextDueDate ile, önceden
       üretilmiş planlı taksit transferleri barındıran) burada yeni modele
       geçiriliyor: toplam kredi yeniden hesaplanır (taksit tutarı × sayısı),
       henüz gerçekleşmemiş ('planned') taksit transferleri silinir, kaynak
       hesap/sonraki ödeme tarihi bilgileri kaldırılır. _migratedToSimpleLoan
       bayrağı bu geçişin tekrar çalışıp elle yapılmış düzeltmeleri ezmesini
       engeller (idempotent). */
    if(s.accounts && s.accounts.length){
      s.accounts.forEach(function(a){
        if(a.type==='loan_account' && !a._migratedToSimpleLoan){
          var monthlyMig = a.monthlyPayment || 0;
          var countMig = a.totalInstallments || 0;
          if(monthlyMig>0 && countMig>0){ a.opening = Math.round(monthlyMig*countMig*100)/100; }
          delete a.sourceAccountId;
          delete a.nextDueDate;
          a._migratedToSimpleLoan = true;
          if(s.transactions && s.transactions.length){
            s.transactions = s.transactions.filter(function(t){
              return !(t.type==='transfer' && t.toAccountId===a.id && t.status==='planned');
            });
          }
        }
      });
    }
    return s;
  }

  /* ---------------- durumu yükle ----------------
     Firebase modunda state, Google ile giriş + household çözümlemesi
     tamamlanana kadar null kalır (bkz. fbResolveHousehold); o ana kadar
     renderApp() giriş/yükleniyor ekranlarını gösterir. */
  var state;
  if(BACKEND === 'firebase'){
    state = null;
  } else {
    try{
      var raw = document.getElementById('app-state').textContent.trim();
      state = raw ? JSON.parse(raw) : defaultState();
      if(!state || !state.people) state = defaultState();
      state = migrateState(state);
    } catch(e){ state = defaultState(); }
  }

  var ui = {
    tab: 'ozet',
    modal: null,        // 'tx' | 'account' | 'confirm' | 'person' | 'category'
    modalData: null,
    txFilter: { type:'all', accountId:'all', month: currentMonthKey(), q:'', dateFrom:'', dateTo:'', amountMin:'', amountMax:'' },
    reportMonth: currentMonthKey(),
    reportYear: parseInt(currentMonthKey().slice(0,4),10),
    assetExpanded: { cash:false, banka:false, banka_bank:false, banka_card:false, banka_loan_account:false, banka_external:false, borclar:false, doviz:false, net:false },
    cardNetAdding: false,
    txCatEditMode: false,
    txCatAdding: false,
    recurringForm: null,
    goalForm: null,
    txFiltersOpen: false,
    cardPeriodOpen: {},
    receiptView: null,
    templateNaming: false,
    identityRequesting: false,
    readOnly: false,
    saving: false,
    toast: null,
    txNoteSuggestion: null,
    bulkImport: null,  // { text, step:'input'|'preview', rows:[...] }
    loanImport: null,  // { text, step:'input'|'preview', rows:[...] } — kredi amortisman tablosu içe aktarma (Hesap Ekle/Düzenle formunun içinde)
    vaultUnlockError: null,
    vaultReveal: {}    // { entryId: {username,password,notes} } — geçici olarak çözülmüş kayıtlar, yalnızca bellekte
  };
  try{
    var savedTab = sessionStorage.getItem('hd_tab');
    if(savedTab) ui.tab = savedTab;
  } catch(e){}

  var artifactApi = null;
  var artifactReady = false;
  if(BACKEND === 'artifact'){
    if(window.claude && typeof window.claude.use === 'function'){
      window.claude.use('artifact').then(function(a){ artifactApi = a; artifactReady = true; });
    } else {
      artifactReady = true;
    }
  }

  /* dışa aktarma (madde 8): dosya indirme yeteneği varsa kullanılır, yoksa
     Ayarlar'daki "Dışa Aktar" butonları sessizce gizlenir/uyarı verir.
     Firebase modunda tarayıcının kendi indirme mekanizması (aşağıdaki
     downloadViaBlob()) kullanılır, bu yetenek gerekmez. */
  var downloadsApi = null;
  if(BACKEND === 'artifact' && window.claude && typeof window.claude.use === 'function'){
    window.claude.use('downloads').then(function(d){ downloadsApi = d; });
  }

  /* ---------------- bağımsız barındırma: Firebase Auth + Firestore ----------------
     Kimlik: Google ile Giriş (gerçek kimlik doğrulama). Veri: households/{id}
     dokümanı, üyeler arasında gerçek zamanlı (onSnapshot) senkronize.
     Davet akışı: household üyelerinden biri Ayarlar'dan bir e-posta davet
     eder (invites/{email} dokümanı yazılır). O e-postayla Google girişi
     yapan kişi ilk girişinde bu daveti bulup aynı household'a eklenir ve
     invite dokümanı silinir. Daveti olmayan biri girişte kendi yeni ve boş
     household'unu otomatik alır — "ailenin dışındakiler boş sistem görsün"
     isteği tam olarak böyle karşılanır. */
  var fbAuth = null, fbDb = null, fbUser = null, fbHouseholdId = null, fbHouseholdRef = null, fbUnsub = null;
  var fbBooting = true;   // Auth henüz cevap vermedi ya da household çözülüyor/state yükleniyor
  var fbError = null;

  function fbResolveHousehold(user){
    var email = (user.email || '').toLowerCase();
    fbDb.collection('users').doc(user.uid).get().then(function(userSnap){
      if(userSnap.exists){ return userSnap.data().householdId; }
      /* daha önce hiç giriş yapmamış biri: bekleyen bir davet var mı? */
      return fbDb.collection('invites').doc(email).get().then(function(inviteSnap){
        if(inviteSnap.exists){
          var hid = inviteSnap.data().householdId;
          var update = { members: firebase.firestore.FieldValue.arrayUnion(user.uid) };
          update['memberProfiles.' + user.uid] = { name: user.displayName || email, email: email, photoURL: user.photoURL || null };
          return fbDb.collection('households').doc(hid).update(update)
            .then(function(){ return inviteSnap.ref.delete(); })
            .then(function(){ return fbDb.collection('users').doc(user.uid).set({ householdId: hid, email: email, name: user.displayName || email }); })
            .then(function(){ return hid; });
        }
        /* davet yok: yepyeni ve boş bir household — bu kişi kurucusu/tek üyesi olur */
        var newHid = uid('hh');
        var seedState = defaultState();
        seedState.people = [{ id: user.uid, name: user.displayName || email, approved: true, isAdmin: true }];
        var profiles = {};
        profiles[user.uid] = { name: user.displayName || email, email: email, photoURL: user.photoURL || null };
        return fbDb.collection('households').doc(newHid).set({
          ownerUid: user.uid,
          members: [user.uid],
          memberProfiles: profiles,
          state: seedState,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
          .then(function(){ return fbDb.collection('users').doc(user.uid).set({ householdId: newHid, email: email, name: user.displayName || email }); })
          .then(function(){ return newHid; });
      });
    }).then(function(hid){
      fbHouseholdId = hid;
      fbHouseholdRef = fbDb.collection('households').doc(hid);
      fbUnsub = fbHouseholdRef.onSnapshot(function(snap){
        if(!snap.exists) return;
        var data = snap.data() || {};
        state = migrateState(data.state || defaultState());
        /* household'a Firestore tarafında (invite kabulüyle) eklenmiş ama
           state.people'da henüz karşılığı olmayan üyeyi burada tamamlıyoruz;
           bir sonraki persist() bunu kalıcı hale getirir. */
        if(!state.people.some(function(p){ return p.id === user.uid; })){
          state.people.push({ id: user.uid, name: user.displayName || email, approved: true, isAdmin: data.ownerUid === user.uid });
        }
        localIdentity = user.uid;
        fbBooting = false;
        render();
      }, function(err){
        fbError = (err && err.message) || 'Veriler alınamadı.';
        fbBooting = false;
        render();
      });
    }).catch(function(err){
      fbError = (err && err.message) || 'Giriş sonrası kurulum başarısız oldu.';
      fbBooting = false;
      render();
    });
  }

  if(BACKEND === 'firebase'){
    try{
      firebase.initializeApp(window.__FIREBASE_CONFIG__);
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
      fbAuth.onAuthStateChanged(function(user){
        if(fbUnsub){ fbUnsub(); fbUnsub = null; }
        fbUser = user;
        fbHouseholdId = null; fbHouseholdRef = null; fbError = null; state = null;
        fbBooting = true;
        render();
        if(user){ fbResolveHousehold(user); } else { fbBooting = false; render(); }
      });
    } catch(e){
      fbError = 'Firebase başlatılamadı: ' + (e && e.message ? e.message : String(e));
      fbBooting = false;
    }
  }

  function fbSignIn(){
    if(!fbAuth){ return; }
    fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function(err){
      /* açılır pencere engellenmişse yönlendirmeyle dene */
      if(err && (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request')){
        fbAuth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        return;
      }
      fbError = 'Giriş yapılamadı: ' + (err && err.message ? err.message : 'bilinmeyen hata');
      render();
    });
  }
  function fbSignOut(){
    if(!fbAuth) return;
    if(fbUnsub){ fbUnsub(); fbUnsub = null; }
    fbAuth.signOut();
  }
  /* Ayarlar'daki "Davet Et" formu bunu çağırır: household id'sini invites/{email}
     altına yazar; o e-postayla ilk kez Google girişi yapan kişi bunu bulup
     aynı household'a katılır (bkz. fbResolveHousehold). */
  function fbInvite(email){
    email = (email || '').trim().toLowerCase();
    if(!email || !fbHouseholdId || !fbDb) return Promise.reject(new Error('geçersiz e-posta'));
    return fbDb.collection('invites').doc(email).set({
      householdId: fbHouseholdId,
      invitedByUid: fbUser.uid,
      invitedByName: fbUser.displayName || fbUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  /* ---------------- cihaz-bazlı kimlik (gerçek kimlik doğrulama değildir) ----------------
     Bu sadece bir gizlilik perdesi: hangi cihazın "kim" olduğunu tarayıcının localStorage'ında
     tutar. Kriptografik değildir; artifact linkine erişimi olan biri istediği adı yazabilir.
     Asıl erişim kontrolü Claude'un kendi paylaşım izinleridir (düzenleyen/salt okunur). */
  var LOCAL_IDENTITY_KEY = 'hd_identity_person_id';
  function getLocalIdentity(){ try{ return localStorage.getItem(LOCAL_IDENTITY_KEY); }catch(e){ return null; } }
  function setLocalIdentity(id){ try{ localStorage.setItem(LOCAL_IDENTITY_KEY, id); }catch(e){} }
  function clearLocalIdentity(){ try{ localStorage.removeItem(LOCAL_IDENTITY_KEY); }catch(e){} }
  /* Firebase modunda "kim" olduğumuz localStorage'daki bir seçimden değil,
     gerçek Google girişinden (fbUser.uid) gelir — bkz. fbResolveHousehold. */
  var localIdentity = (BACKEND === 'artifact') ? getLocalIdentity() : null;

  /* ---------------- türetilmiş hesaplamalar ---------------- */
  /* 'card' ve 'loan_taken' (alınan borç) aynı mantıkla çalışır: bakiye = güncel borç,
     harcama/borç artışı borcu büyütür, ödeme borcu küçültür. */
  function isDebtType(type){ return type==='card' || type==='loan_taken' || type==='loan_account'; }
  /* Kredi kartı ve Kredi hesapları, üzerinde hareket varsa silinemez (yalnızca
     düzenlenebilir) — bu hesapların bakiyesi geçmiş harcama/taksit kayıtlarına
     dayandığından hesabı silmek geri dönüşü olmayan veri kaybına yol açar.
     Diğer hesap türleri (Nakit, Banka, Ödeme Aracı, Verilen/Alınan Borç)
     eskisi gibi hareketi olsa da silinebilir. Hareketi yoksa kredi kartı/kredi
     de serbestçe silinebilir. */
  function accountDeleteBlockedReason(acct){
    if(!acct || (acct.type!=='card' && acct.type!=='loan_account')) return null;
    var used = state.transactions.some(function(t){ return t.accountId===acct.id || t.toAccountId===acct.id; });
    if(!used) return null;
    return '"' + acct.name + '" ' + (acct.type==='card' ? 'kredi kartında' : 'kredisinde') + ' hareket olduğu için silinemez; hesabı düzenleyebilirsiniz ama silmeden önce bağlı hareketlerin silinmesi gerekir.';
  }
  /* 'planned' (henüz gerçekleşmemiş, gelecek tarihli) hareketler bakiyeleri etkilemez;
     kullanıcı Özet'teki banner'dan "Gerçekleşti" demeden hesaba işlenmez. */
  function isPlanned(t){ return t.status==='planned'; }
  function getAccount(id){ return state.accounts.find(function(a){ return a.id===id; }); }
  function getPerson(id){ return state.people.find(function(p){ return p.id===id; }); }
  function getCardNetwork(id){ return state.cardNetworks.find(function(n){ return n.id===id; }); }
  function getCategory(type, id){
    var list = type==='income' ? state.categories.income : state.categories.expense;
    return list.find(function(c){ return c.id===id; });
  }

  /* Tekrar eden harcama önerisi: aynı türde (gelir/gider), notu (boşluk/büyük-küçük
     harf farkı hariç) daha önce girilmiş bir hareket varsa, o hareketteki
     kategori/kişiyi öneri olarak döner. En sık kullanılan eşleşme tercih edilir;
     eşitlikte en yakın tarihli kazanır. Kayıt formunda "Not" alanına yazıldığında
     kullanıcıya "geçmişte böyle kullanılmıştı, uygulamak ister misiniz" diye sorulur. */
  function findNoteSuggestion(type, note, excludeId){
    var norm = (note||'').trim().toLowerCase();
    if(!norm) return null;
    var counts = {}; // key: categoryId+'|'+personId -> {categoryId, personId, count, lastDate}
    state.transactions.forEach(function(t){
      if(t.id===excludeId) return;
      if(t.type!==type) return;
      if((t.note||'').trim().toLowerCase()!==norm) return;
      if(!t.categoryId) return;
      var key = t.categoryId + '|' + (t.personId||'');
      if(!counts[key]) counts[key] = { categoryId: t.categoryId, personId: t.personId||null, count:0, lastDate: t.date };
      counts[key].count++;
      if(t.date > counts[key].lastDate) counts[key].lastDate = t.date;
    });
    var best = null;
    Object.keys(counts).forEach(function(k){
      var c = counts[k];
      if(!best || c.count>best.count || (c.count===best.count && c.lastDate>best.lastDate)) best = c;
    });
    if(!best) return null;
    var cat = getCategory(type, best.categoryId);
    if(!cat) return null;
    var person = best.personId ? getPerson(best.personId) : null;
    return { note: note, categoryId: best.categoryId, categoryName: cat.name, personId: best.personId, personName: person ? person.name : null, count: best.count };
  }

  /* Aktif ui.txNoteSuggestion, formdaki notla eşleşiyor ve zaten seçili
     kategori/kişiden FARKLI bir şey öneriyorsa kutunun HTML'ini üretir. */
  function noteSuggestionBoxHtml(d){
    var sug = ui.txNoteSuggestion;
    if(!sug || sug.note!==d.note) return '';
    if(sug.categoryId===d.categoryId && (sug.personId||'')===(d.personId||'')) return '';
    var sugText = 'Öneri: "' + esc(sug.note) + '" notuyla daha önce ' + esc(sug.categoryName) + (sug.personName ? ' · ' + esc(sug.personName) : '') + ' kullanılmış.';
    return '<div class="field suggestion-box" style="display:flex;align-items:center;gap:8px;justify-content:space-between;background:var(--surface2,#f2f2f2);padding:8px 10px;border-radius:8px">' +
      '<span class="mute2">' + sugText + '</span>' +
      '<div style="display:flex;gap:4px;flex:none">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="apply-note-suggestion">Uygula</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="dismiss-note-suggestion" aria-label="Kapat">' + icon('x') + '</button>' +
      '</div></div>';
  }

  /* Not alanı değiştikçe öneri kutusunu GÜNCELLER ama tüm formu yeniden
     render ETMEZ. Bunun nedeni: kullanıcı notu yazıp hemen ardından "Kaydet"
     butonuna tıkladığında, notun blur'u ile tetiklenen tam render() araya
     girip DOM'u yeniden oluşturursa, tıklama olayı orijinal ekran
     koordinatlarında artık FARKLI bir elemana (ör. arkadaki + butonuna)
     denk gelebilir — form yanlışlıkla kapanıp boş bir kayıt formu yeniden
     açılabilir. Sadece öneri kutusunu ekleyip/kaldırıp diğer her şeyi
     (özellikle Kaydet butonunu) olduğu gibi bırakmak bu riski ortadan kaldırır. */
  function updateNoteSuggestionBox(){
    var form = document.querySelector('.sheet form[data-action="save-tx"]');
    if(!form) return;
    var d = ui.modalData || {};
    var sug = ui.txNoteSuggestion;
    var sig = (sug && sug.note===d.note) ? [sug.note, sug.categoryId, sug.personId||''].join('|') : '';
    var existing = form.querySelector('.suggestion-box');
    /* Not alanı üzerinde art arda (ör. bir tıklamanın blur'una bağlı olarak
       kendiliğinden tekrar tetiklenen) aynı sonucu üreten "change" olayları
       kutuyu gereksiz yere kaldırıp yeniden eklemesin — bu, tam da o anda
       kutudaki "Uygula" butonuna tıklanıyorsa, tıklamanın DOM'dan az önce
       kopmuş eski düğüme denk gelip kaybolmasına yol açabilir. İçerik
       değişmediyse mevcut düğüme dokunma. */
    if(existing && existing.getAttribute('data-sig')===sig) return;
    if(existing) existing.remove();
    if(!sig) return;
    var noteInput = form.querySelector('input[name="note"]');
    if(!noteInput) return;
    var boxHtml = noteSuggestionBoxHtml(d);
    if(!boxHtml) return;
    var anchor = noteInput.closest('.field-row') || noteInput.closest('.field') || noteInput;
    var wrap = document.createElement('div');
    wrap.innerHTML = boxHtml;
    var boxEl = wrap.firstChild;
    boxEl.setAttribute('data-sig', sig);
    anchor.parentNode.insertBefore(boxEl, anchor.nextSibling);
  }

  /* Toplu kayıt girişi (madde 1): kullanıcı bir ekstreyi/Excel tablosunu satır
     satır yapıştırır. Beklenen sütun sırası: Tarih | Tür | Tutar | Kategori |
     Hesap | Kişi (ops) | Not (ops). Sütunlar TAB (Excel kopyala-yapıştır) veya
     ";" ile ayrılır. Her satır bağımsız ayrıştırılır; hatalı satırlar
     içe aktarılmadan önizlemede işaretlenir, geçerli satırlar tek seferde
     eklenir. Bakiye kuralları (nakit eksiye düşemez vb.) bilerek uygulanmaz —
     bu, geçmiş/tarihsel toplu veri girişi içindir. */
  function parseBulkImportRows(text){
    var lines = (text||'').split(/\r?\n/).map(function(l){ return l.trim(); }).filter(function(l){ return l.length>0; });
    var out = [];
    lines.forEach(function(line, idx){
      var cols = splitBulkRow(line).map(function(c){ return c.trim(); });
      if(idx===0 && !parseDateFlexible(cols[0])){
        /* başlık satırı olabilir, sessizce atla */
        return;
      }
      var row = { lineNo: idx+1, raw: line, ok: false, error: '', tx: null };
      var dateRaw = cols[0], typeRaw = (cols[1]||'').trim().toLowerCase(), amountRaw = cols[2], catRaw = (cols[3]||'').trim(), acctRaw = (cols[4]||'').trim(), personRaw = (cols[5]||'').trim(), noteRaw = cols[6]||'';

      var date = parseDateFlexible(dateRaw);
      if(!date){ row.error = 'Tarih anlaşılamadı ("' + dateRaw + '")'; out.push(row); return; }

      var amount = parseAmountFlexible(amountRaw);
      if(isNaN(amount)){ row.error = 'Tutar anlaşılamadı ("' + amountRaw + '")'; out.push(row); return; }

      var type = null;
      if(/^gider$|^expense$/.test(typeRaw)) type = 'expense';
      else if(/^gelir$|^income$/.test(typeRaw)) type = 'income';
      else if(amount<0) type = 'expense';
      else if(amount>0 && typeRaw==='') { row.error = 'Tür belirtilmedi (Gider/Gelir)'; out.push(row); return; }
      else { row.error = 'Tür anlaşılamadı ("' + typeRaw + '"), Gider veya Gelir yazın'; out.push(row); return; }
      amount = Math.abs(amount);
      if(amount<=0){ row.error = 'Tutar sıfırdan büyük olmalı'; out.push(row); return; }

      if(!catRaw){ row.error = 'Kategori boş'; out.push(row); return; }
      var catList = type==='income' ? state.categories.income : state.categories.expense;
      var cat = catList.find(function(c){ return c.name.toLowerCase()===catRaw.toLowerCase(); });
      if(!cat){ row.error = 'Kategori bulunamadı: "' + catRaw + '" (Ayarlar\'dan önce ekleyin)'; out.push(row); return; }

      if(!acctRaw){ row.error = 'Hesap boş'; out.push(row); return; }
      var acct = state.accounts.find(function(a){ return a.name.toLowerCase()===acctRaw.toLowerCase(); });
      if(!acct){ row.error = 'Hesap bulunamadı: "' + acctRaw + '"'; out.push(row); return; }
      if(acct.type==='loan_account'){ row.error = 'Kredi hesabına doğrudan gider/gelir girilemez ("' + acctRaw + '")'; out.push(row); return; }

      var person = null;
      if(personRaw){
        person = state.people.find(function(p){ return p.name.toLowerCase()===personRaw.toLowerCase(); });
        if(!person){ row.error = 'Kişi bulunamadı: "' + personRaw + '" (kişisiz eklenecek)'; }
      }

      row.ok = true;
      row.tx = {
        type: type, date: date, amount: amount,
        categoryId: cat.id, categoryName: cat.name,
        accountId: acct.id, accountName: acct.name,
        personId: person ? person.id : null, personName: person ? person.name : null,
        note: noteRaw
      };
      out.push(row);
    });
    return out;
  }

  /* Kredi amortisman tablosu yapıştırma ayrıştırıcısı (bir bankadan çekilen
     gerçek bir kredinin komple taksit tablosunu içeri aktarmak için — 3 Eylül
     2026 akşamından itibaren Kredi hesapları bu modele evrildi). Sütunlar:
     Ödeme Tarihi (zorunlu) · Taksit Tutarı (zorunlu) · Anapara (opsiyonel) ·
     Faiz (opsiyonel) · Kalan Bakiye (opsiyonel). Anapara/Faiz/Kalan Bakiye
     yalnızca bilgi amaçlı gösterilir; hesabın bakiyesi HER ZAMAN Taksit Tutarı
     toplamı üzerinden takip edilir — çünkü gerçek ödemeler de "Ödeme Yap"
     akışında tam taksit tutarı kadar bakiyeyi azaltıyor, bu yüzden bakiye
     tabloyla tutarlı kalıyor. parseBulkImportRows() ile aynı desende, bulunan
     her satır (hatalı olsa da) önizlemede satır numarasıyla (lineNo) listelenir;
     ilk satır tarih olarak ayrıştırılamıyorsa başlık satırı kabul edilip
     sessizce atlanır. */
  function parseLoanScheduleRows(text){
    var lines = (text||'').split(/\r?\n/).map(function(l){ return l.trim(); }).filter(function(l){ return l.length>0; });
    var out = [];
    lines.forEach(function(line, idx){
      var cols = splitBulkRow(line).map(function(c){ return c.trim(); });
      if(idx===0 && !parseDateFlexible(cols[0])){
        /* başlık satırı olabilir, sessizce atla */
        return;
      }
      var row = { lineNo: idx+1, raw: line, ok:false, error:'' };
      var dateRaw = cols[0], amountRaw = cols[1], principalRaw = cols[2], interestRaw = cols[3], balanceRaw = cols[4];

      var date = parseDateFlexible(dateRaw);
      if(!date){ row.error = 'Ödeme tarihi anlaşılamadı ("' + (dateRaw||'') + '")'; out.push(row); return; }

      var payment = parseAmountFlexible(amountRaw);
      if(isNaN(payment) || payment<=0){ row.error = 'Taksit tutarı anlaşılamadı ("' + (amountRaw||'') + '")'; out.push(row); return; }

      var principal = principalRaw ? parseAmountFlexible(principalRaw) : NaN;
      var interest = interestRaw ? parseAmountFlexible(interestRaw) : NaN;
      var balance = balanceRaw ? parseAmountFlexible(balanceRaw) : NaN;

      row.ok = true;
      row.date = date;
      row.payment = Math.round(payment*100)/100;
      row.principal = isNaN(principal) ? null : Math.round(principal*100)/100;
      row.interest = isNaN(interest) ? null : Math.round(interest*100)/100;
      row.balance = isNaN(balance) ? null : Math.round(balance*100)/100;
      out.push(row);
    });
    return out;
  }

  /* Ayrıştırılmış (parseLoanScheduleRows) satırlardan yalnızca geçerli
     olanları alıp tarihe göre sıralar ve taksit numarası (no) atar — bu,
     hesabın state.accounts[].schedule alanında saklanan nihai tablo. */
  function loanScheduleFromRows(rows){
    var ok = (rows||[]).filter(function(r){ return r.ok; }).slice();
    ok.sort(function(a,b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    return ok.map(function(r, i){
      return { no: i+1, date: r.date, payment: r.payment, principal: r.principal, interest: r.interest, balance: r.balance };
    });
  }

  function accountBalance(acctId, excludeTxId){
    var acct = getAccount(acctId);
    if(!acct) return 0;
    var bal = acct.opening || 0;
    state.transactions.forEach(function(t){
      if(isPlanned(t)) return; /* gerçekleşmemiş kayıtlar bakiyeyi etkilemez */
      if(excludeTxId && t.id===excludeTxId) return;
      if(t.type==='income' && t.accountId===acctId) bal += t.amount;
      else if(t.type==='expense' && t.accountId===acctId){
        if(isDebtType(acct.type)) bal += t.amount; else bal -= t.amount;
      } else if(t.type==='transfer'){
        if(t.accountId===acctId){ bal -= t.amount; }
        if(t.toAccountId===acctId){ if(isDebtType(acct.type)) bal -= t.amount; else bal += t.amount; }
      }
    });
    return bal;
  }

  /* accountBalance()'ın belirli bir ayın SONU itibarıyla ("o aya kadar")
     kümülatif bakiyesini veren hali — Net Varlık Grafiği için kullanılır.
     includePlanned=true ise henüz gerçekleşmemiş ama o aya kadar (dahil)
     tarihli planlı kayıtlar da hesaba katılır (gelecek taksitlerin projeksiyonu). */
  function accountBalanceAsOf(acctId, cutoffMonthKeyStr, includePlanned){
    var acct = getAccount(acctId);
    if(!acct) return 0;
    var bal = acct.opening || 0;
    state.transactions.forEach(function(t){
      if(monthKey(t.date) > cutoffMonthKeyStr) return;
      if(isPlanned(t) && !includePlanned) return;
      if(t.type==='income' && t.accountId===acctId) bal += t.amount;
      else if(t.type==='expense' && t.accountId===acctId){
        if(isDebtType(acct.type)) bal += t.amount; else bal -= t.amount;
      } else if(t.type==='transfer'){
        if(t.accountId===acctId){ bal -= t.amount; }
        if(t.toAccountId===acctId){ if(isDebtType(acct.type)) bal -= t.amount; else bal += t.amount; }
      }
    });
    return bal;
  }

  /* Kişinin TOPLAM VARLIĞI: nakit + banka + ödeme araçları + verilen borç
     − kredi kartı borcu − kredi borcu − alınan borç (döviz hesapları hariç,
     Net Varlık kartındaki mantıkla birebir aynı). Belirli bir ay sonu
     itibarıyla hesaplanır; Özet ekranındaki "net durum" ve Net Varlık
     Grafiği bu fonksiyonu kullanır. */
  function netWorthAsOf(cutoffMonthKeyStr, includePlanned){
    var total = 0;
    state.accounts.forEach(function(a){
      var bal = accountBalanceAsOf(a.id, cutoffMonthKeyStr, includePlanned);
      if(isForeignCurrencyAccount(a)){
        /* kur girilmemişse bu hesap Net Varlık'a hiç dahil edilmez (eskisi gibi);
           kur girilmişse güncel manuel kur ile TL karşılığı üzerinden dahil edilir
           (geçmiş aylar için de yaklaşık değer olarak aynı güncel kur kullanılır). */
        var tl = toTRY(bal, accountCurrency(a));
        if(tl==null) return;
        total += tl;
        return;
      }
      if(isDebtType(a.type)) total -= bal; else total += bal;
    });
    return total;
  }

  /* Net Varlık Grafiği'nde gösterilecek ay listesi: kayıt girilen en eski
     aydan, en yeni hareketin (planlı/gelecek dahil) ayına kadar — en az bugünün
     ayına kadar uzanır ki henüz hiç kayıt girilmemişken de mevcut ay görünsün. */
  function netWorthChartMonths(){
    var keys = state.transactions.map(function(t){ return monthKey(t.date); }).filter(Boolean);
    var cur = currentMonthKey();
    var minKey = keys.length ? keys.reduce(function(a,b){ return a<b?a:b; }) : cur;
    var maxKey = keys.length ? keys.reduce(function(a,b){ return a>b?a:b; }) : cur;
    if(maxKey < cur) maxKey = cur;
    var out = [];
    var k = minKey;
    var guard = 0;
    while(k <= maxKey && guard < 600){
      out.push(k);
      k = addMonths(k, 1);
      guard++;
    }
    return out;
  }

  function totalsForMonth(monthKeyStr){
    var income=0, expense=0;
    state.transactions.forEach(function(t){
      if(isPlanned(t)) return;
      if(monthKey(t.date)!==monthKeyStr) return;
      if(t.type==='income') income += t.amount;
      else if(t.type==='expense') expense += t.amount;
    });
    return { income:income, expense:expense, net:income-expense };
  }

  /* henüz gerçekleşmemiş (planlı, gelecek tarihli) gelir/gider toplamı — raporlarda
     "gerçekleşen"in yanında ayrıca gösterilir, bakiyeye dahil edilmez. */
  function plannedTotalsForMonth(monthKeyStr){
    var income=0, expense=0;
    state.transactions.forEach(function(t){
      if(!isPlanned(t)) return;
      if(monthKey(t.date)!==monthKeyStr) return;
      if(t.type==='income') income += t.amount;
      else if(t.type==='expense') expense += t.amount;
    });
    return { income:income, expense:expense };
  }

  function categoryBreakdown(monthKeyStr, type){
    var list = type==='income' ? state.categories.income : state.categories.expense;
    var sums = {}, plannedSums = {};
    state.transactions.forEach(function(t){
      if(t.type!==type) return;
      if(monthKey(t.date)!==monthKeyStr) return;
      var bucket = isPlanned(t) ? plannedSums : sums;
      bucket[t.categoryId] = (bucket[t.categoryId]||0) + t.amount;
    });
    var rows = list.map(function(c){ return { cat:c, amount: sums[c.id]||0, plannedAmount: plannedSums[c.id]||0 }; })
      .filter(function(r){ return r.amount>0 || r.plannedAmount>0; });
    rows.sort(function(a,b){ return (b.amount+b.plannedAmount)-(a.amount+a.plannedAmount); });
    return rows;
  }

  /* Bütçe aşımı karşılaştırması (madde 4): Ayarlar'da kategori bazlı aylık
     limit tanımlanmış her gider kategorisi için, o ayki GERÇEKLEŞEN harcamanın
     limite oranını hesaplar. level: 'ok' (<%80), 'warn' (%80-99), 'over' (>=%100).
     Yalnızca bütçesi tanımlı kategoriler döner. */
  function budgetStatusForMonth(monthKeyStr){
    var expRows = categoryBreakdown(monthKeyStr, 'expense');
    var spentByCategory = {};
    expRows.forEach(function(r){ spentByCategory[r.cat.id] = r.amount; });
    var out = [];
    state.categories.expense.forEach(function(c){
      var limit = state.budgets[c.id];
      if(!limit || limit<=0) return;
      var spent = spentByCategory[c.id] || 0;
      var pct = limit>0 ? (spent/limit*100) : 0;
      var level = pct>=100 ? 'over' : (pct>=80 ? 'warn' : 'ok');
      out.push({ cat:c, limit:limit, spent:spent, pct:pct, level:level });
    });
    out.sort(function(a,b){ return b.pct-a.pct; });
    return out;
  }

  /* Kişiye göre harcama: gerçekleşen tutarların yanında, henüz gerçekleşmemiş
     (planlı/gelecek tarihli) tutarları da ayrı alanlarda döner — Raporlar'daki
     kişi çubuklarında planlı kısım, kategori dağılımındakiyle aynı desende
     (kesikli/ayrı renkli) gösterilebilsin diye. */
  function personBreakdown(monthKeyStr){
    var sums = {};
    state.transactions.forEach(function(t){
      if(t.type==='transfer') return;
      if(monthKey(t.date)!==monthKeyStr) return;
      var pid = t.personId || '_none';
      if(!sums[pid]) sums[pid] = { expense:0, income:0, plannedExpense:0, plannedIncome:0 };
      if(isPlanned(t)) sums[pid]['planned' + (t.type==='income'?'Income':'Expense')] += t.amount;
      else sums[pid][t.type] += t.amount;
    });
    var rows = Object.keys(sums).map(function(pid){
      var person = pid==='_none' ? null : getPerson(pid);
      var s = sums[pid];
      return { name: pid==='_none' ? 'Belirtilmemiş' : (person ? person.name : 'Silinmiş kişi'), expense: s.expense, income: s.income, plannedExpense: s.plannedExpense, plannedIncome: s.plannedIncome };
    }).filter(function(r){ return r.expense>0 || r.income>0 || r.plannedExpense>0 || r.plannedIncome>0; });
    rows.sort(function(a,b){ return (b.expense+b.plannedExpense)-(a.expense+a.plannedExpense); });
    return rows;
  }

  /* Yıllık özet (madde 5): bir yılın toplam gelir/gider/net'i (yalnızca
     gerçekleşen kayıtlar), 12 ayın totalsForMonth() toplamıdır. */
  function yearTotals(year){
    var income=0, expense=0;
    for(var m=1;m<=12;m++){
      var mk = year + '-' + pad2(m);
      var t = totalsForMonth(mk);
      income += t.income; expense += t.expense;
    }
    return { income:income, expense:expense, net:income-expense };
  }

  /* Bir yıl için kategori bazlı toplam (yalnızca gerçekleşen) — YoY karşılaştırması için. */
  function categoryYearTotals(year, type){
    var list = type==='income' ? state.categories.income : state.categories.expense;
    var sums = {};
    state.transactions.forEach(function(t){
      if(t.type!==type) return;
      if(isPlanned(t)) return;
      if(t.date.slice(0,4)!==String(year)) return;
      sums[t.categoryId] = (sums[t.categoryId]||0) + t.amount;
    });
    var rows = list.map(function(c){ return { cat:c, amount: sums[c.id]||0 }; }).filter(function(r){ return r.amount>0; });
    rows.sort(function(a,b){ return b.amount-a.amount; });
    return rows;
  }

  /* Kategori bazlı yıl-üstü-yıl (YoY) karşılaştırma: her iki yılda da veya
     sadece birinde harcama/gelir olan kategoriler için değişim yüzdesi. */
  function categoryYoY(year, type){
    var thisYear = categoryYearTotals(year, type);
    var lastYearRows = categoryYearTotals(year-1, type);
    var lastMap = {};
    lastYearRows.forEach(function(r){ lastMap[r.cat.id] = r.amount; });
    var thisMap = {};
    thisYear.forEach(function(r){ thisMap[r.cat.id] = r.amount; });
    var allCatIds = {};
    thisYear.forEach(function(r){ allCatIds[r.cat.id]=r.cat; });
    lastYearRows.forEach(function(r){ allCatIds[r.cat.id]=r.cat; });
    var out = Object.keys(allCatIds).map(function(cid){
      var cur = thisMap[cid]||0, prev = lastMap[cid]||0;
      var pctChange = prev>0 ? ((cur-prev)/prev*100) : (cur>0 ? null : 0); /* null = "yeni" (geçen yıl yok) */
      return { cat: allCatIds[cid], current: cur, previous: prev, pctChange: pctChange };
    }).filter(function(r){ return r.current>0 || r.previous>0; });
    out.sort(function(a,b){ return b.current-a.current; });
    return out;
  }

  /* Nakit akışı projeksiyonu (madde 5): gelecek N ay için tahmini nakit/banka
     bakiyesi. Taksitli/tekrar sayısı belli kayıtlar zaten "planned" olarak
     state.transactions içinde önceden oluşturulduğundan doğrudan sayılır;
     süresiz düzenli ödemeler (Düzenli Ödemeler'de "taksit sayısı" olmayanlar)
     her ay için bir kez daha gerçekleşecek varsayılarak eklenir. Kart harcaması
     gibi henüz planlanmamış gelecekteki olası harcamalar tahmine dahil edilmez —
     yalnızca ZATEN bilinen/programlanmış kalemler projekte edilir. */
  function cashFlowProjection(numMonths){
    var running = cashLikeTotal();
    var curMk = currentMonthKey();
    var indefiniteRecurringNet = 0;
    state.recurring.forEach(function(r){
      if(!r.active) return;
      if(r.totalInstallments) return; /* taksitli/sınırlı olanlar zaten planned tx olarak var */
      indefiniteRecurringNet += (r.type==='income' ? r.amount : -r.amount);
    });
    var out = [];
    for(var i=1;i<=numMonths;i++){
      var targetMk = addMonths(curMk, i);
      var plannedNet = 0;
      state.transactions.forEach(function(t){
        if(!isPlanned(t)) return;
        if(monthKey(t.date)!==targetMk) return;
        var acct = getAccount(t.accountId);
        if(!acct) return;
        var isCashLike = (acct.type==='bank'||acct.type==='external'||acct.type==='cash'||acct.type==='loan_given') && !isForeignCurrencyAccount(acct);
        if(t.type==='transfer'){
          if(isCashLike) plannedNet -= t.amount;
          var toAcct = getAccount(t.toAccountId);
          if(toAcct && (toAcct.type==='bank'||toAcct.type==='external'||toAcct.type==='cash'||toAcct.type==='loan_given') && !isForeignCurrencyAccount(toAcct)) plannedNet += t.amount;
          return;
        }
        if(!isCashLike) return;
        if(t.type==='income') plannedNet += t.amount; else if(t.type==='expense') plannedNet -= t.amount;
      });
      running += plannedNet + indefiniteRecurringNet;
      out.push({ key: targetMk, label: monthLabel(targetMk), value: running });
    }
    return out;
  }

  /* en uzak planlı (gelecek tarihli, henüz gerçekleşmemiş) kaydın kaç ay ileride
     olduğunu döner (0-6 arası sınırlanır) — trend grafiğini o kadar ileri uzatmak için. */
  function maxPlannedMonthsAhead(){
    var cur = currentMonthKey();
    var maxAhead = 0;
    state.transactions.forEach(function(t){
      if(!isPlanned(t)) return;
      var diff = monthDiff(cur, monthKey(t.date));
      if(diff>maxAhead) maxAhead = diff;
    });
    return clamp(maxAhead, 0, 6);
  }

  function last6MonthsTrend(){
    var out = [];
    var cur = currentMonthKey();
    var ahead = maxPlannedMonthsAhead();
    for(var i=5;i>=(-1*ahead);i--){
      var k = addMonths(cur, -i);
      var t = totalsForMonth(k);
      var p = plannedTotalsForMonth(k);
      out.push({ key:k, label: monthLabel(k), income:t.income, expense:t.expense, plannedIncome:p.income, plannedExpense:p.expense, future: i<0 });
    }
    return out;
  }

  function pad2(n){ return String(n).length<2 ? '0'+n : ''+n; }

  /* ---------------- düzenli ödemeler / taksitler ---------------- */
  function recurringGenId(r, mk){ return 'tx_rec_' + r.id + '_' + mk; }

  /* Vadesi gelmiş ama bu ay için henüz kaydedilmemiş (ve bu ay için
     "atla" denmemiş) düzenli ödeme/taksit şablonlarını döner. */
  function dueRecurring(){
    var mk = currentMonthKey();
    var today = todayISO();
    return state.recurring.filter(function(r){
      if(!r.active) return false;
      if((r.skippedMonths||[]).indexOf(mk)!==-1) return false;
      var wantDate = mk + '-' + pad2(clamp(r.day,1,28));
      if(today < wantDate) return false;
      return !state.transactions.some(function(t){ return t.id===recurringGenId(r, mk); });
    });
  }

  /* ---------------- planlanan (gelecek tarihli, henüz gerçekleşmemiş) kayıtlar ---------------- */
  /* vadesi gelmiş (tarihi bugün veya geçmiş) ama hâlâ 'planned' durumda kalan
     kayıtlar — tekrarlanan gelir/gider ve kredi taksitleri buradan üretilir. */
  function duePlannedTx(){
    var today = todayISO();
    return state.transactions.filter(function(t){ return isPlanned(t) && t.date<=today; })
      .sort(function(a,b){ return a.date<b.date ? -1 : 1; });
  }

  function plannedTxDescription(t){
    if(t.type==='transfer'){
      var from = getAccount(t.accountId), to = getAccount(t.toAccountId);
      return { name: (to && isDebtType(to.type) ? to.name + ' ödemesi' : 'Transfer'), sub: [fmtTRY(t.amount), (from?from.name:'—') + ' → ' + (to?to.name:'—')].join(' · ') };
    }
    var info = txCategoryInfo(t);
    var acct = getAccount(t.accountId);
    return { name: info.name + (t.note ? ' · ' + t.note : ''), sub: [fmtTRY(t.amount), (acct?acct.name:'—')].join(' · ') };
  }

  /* Taksitli bir kaydın hem harcamanın gerçekten yapıldığı tarihi (işlem
     tarihi, `purchaseDate`) hem de o taksidin ödeme tarihini (`date`)
     birlikte gösterir; ikisi aynıysa (taksitsiz normal kayıtlarda olduğu
     gibi) sadece tek tarih gösterilir. */
  function txDateLabel(t){
    if(t.purchaseDate && t.purchaseDate!==t.date){
      return 'İşlem ' + fmtDate(t.purchaseDate) + ' · Ödeme ' + fmtDate(t.date);
    }
    return fmtDate(t.date);
  }

  /* bu ay henüz kaydedilmemiş düzenli gelir/gider şablonlarının net etkisi —
     "ay sonu tahmini bakiye" için kullanılır. */
  function pendingRecurringNet(){
    var due = dueRecurring();
    var net = 0;
    due.forEach(function(r){ net += (r.type==='income' ? r.amount : -r.amount); });
    return net;
  }

  /* nakit + banka + harici + verilen borç toplamı ("varlık" tarafı) — döviz cinsinden
     (TRY dışı) hesaplar TL toplamına karıştırılmaz, ayrı gösterilir. */
  function cashLikeTotal(){
    return state.accounts.filter(function(a){ return (a.type==='bank' || a.type==='external' || a.type==='cash' || a.type==='loan_given') && !isForeignCurrencyAccount(a); })
      .reduce(function(s,a){ return s + accountBalance(a.id); }, 0);
  }

  /* kredi kartlarının bu ay içine denk gelen (hesap kesim/ödeme günü tanımlıysa)
     ve henüz kullanıcı tarafından ödenmemiş dönem borcunu, "ay sonu tahmini nakit"
     tahminine dahil eder (kart borcu ödendiğinde bankadan bu kadar çıkacağı için). */
  function cardDueThisMonthNet(){
    var mk = currentMonthKey();
    var today = todayISO();
    var net = 0;
    state.accounts.filter(function(a){ return a.type==='card' && a.statementDay && a.paymentDay; }).forEach(function(a){
      var payDate = cardPaymentDateForStatement(a, mk);
      if(monthKey(payDate)===mk && payDate>=today){
        var bal = accountBalance(a.id);
        if(bal>0) net -= bal;
      }
    });
    return net;
  }

  /* ---------------- render: kök ---------------- */
  function render(){
    document.getElementById('app').innerHTML = renderApp();
    var lm = document.getElementById('modal-first-input');
    if(lm) { try{ lm.focus(); }catch(e){} }
  }

  function renderApp(){
    if(BACKEND === 'firebase'){
      if(!fbUser) return renderGoogleSignInScreen();
      if(fbBooting || !state) return renderFbLoadingScreen();
    } else {
      var me = localIdentity ? getPerson(localIdentity) : null;
      if(!me){ localIdentity = null; return renderIdentityGate(); }
      if(!me.approved) return renderWaitingScreen(me);
    }
    var html = '';
    html += renderTopbar();
    html += '<main>' + renderTab() + '</main>';
    html += renderFab();
    html += renderTabbar();
    html += renderModal();
    html += renderReceiptViewer();
    if(ui.toast) html += '<div class="toast" role="status">' + esc(ui.toast) + '</div>';
    return html;
  }

  /* ---------------- giriş perdesi (isim-bazlı, gerçek kimlik doğrulama değil) ---------------- */
  function renderIdentityGate(){
    var approvedPeople = state.people.filter(function(p){ return p.approved; });
    var html = '<div class="gate-screen">';
    html += '<div class="gate-card">';
    html += '<div class="brand" style="margin-bottom:4px">Hane Defteri</div>';
    html += '<p class="mute2">Devam etmek için kim olduğunuzu seçin.</p>';
    if(approvedPeople.length){
      html += '<div class="gate-people">';
      approvedPeople.forEach(function(p){
        html += '<button class="btn gate-person-btn" data-action="identity-pick" data-id="' + p.id + '">' + esc(p.name) + (p.isAdmin ? ' <span class="mute2">(Yönetici)</span>' : '') + '</button>';
      });
      html += '</div>';
    }
    if(!ui.identityRequesting){
      html += '<button class="btn btn-ghost" data-action="identity-request-toggle" style="margin-top:10px;width:100%">Listede yokum, yeni kişiyim</button>';
    } else {
      html += '<form data-action="identity-request-submit" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">' +
        '<input type="text" id="modal-first-input" name="name" placeholder="Adınız" required>' +
        '<div style="display:flex;gap:8px">' +
        '<button type="button" class="btn btn-ghost" data-action="identity-request-cancel" style="flex:1">Vazgeç</button>' +
        '<button type="submit" class="btn btn-primary" style="flex:1">Erişim İste</button>' +
        '</div></form>';
    }
    html += '<p class="mute2" style="margin-top:14px">Bu bir gizlilik perdesidir, gerçek kimlik doğrulama değildir; yalnızca kimin kayıt girdiğini ayırt etmeye yarar.</p>';
    html += '</div></div>';
    return html;
  }

  /* ---------------- Google ile Giriş (bağımsız barındırma) ---------------- */
  function renderGoogleSignInScreen(){
    var html = '<div class="gate-screen"><div class="gate-card">';
    html += '<div class="brand" style="margin-bottom:4px">Hane Defteri</div>';
    html += '<p class="mute2">Devam etmek için Google hesabınızla giriş yapın.</p>';
    if(fbError) html += '<p class="mute2" style="color:var(--critical);margin-top:8px">' + esc(fbError) + '</p>';
    html += '<button class="btn btn-primary btn-block" style="margin-top:14px" data-action="fb-sign-in">' + icon('handIn') + ' Google ile Giriş Yap</button>';
    html += '<p class="mute2" style="margin-top:14px">Sizi davet eden biri varsa, davet edildiğiniz e-posta ile giriş yapın — otomatik olarak aynı hane defterine katılırsınız. Davet edilmediyseniz, kendi yeni ve boş hane defterinizle başlarsınız.</p>';
    html += '</div></div>';
    return html;
  }
  function renderFbLoadingScreen(){
    var html = '<div class="gate-screen"><div class="gate-card">';
    html += '<div class="brand" style="margin-bottom:4px">Hane Defteri</div>';
    html += '<p class="mute2">Yükleniyor…</p>';
    if(fbError) html += '<p class="mute2" style="color:var(--critical);margin-top:8px">' + esc(fbError) + '</p>';
    html += '</div></div>';
    return html;
  }

  function renderWaitingScreen(me){
    var html = '<div class="gate-screen">';
    html += '<div class="gate-card">';
    html += '<div class="brand" style="margin-bottom:4px">Hane Defteri</div>';
    html += '<p>Merhaba ' + esc(me.name) + ', erişim isteğiniz aile yöneticisinin onayını bekliyor.</p>';
    html += '<p class="mute2">Onaylandığında bu sayfa otomatik olarak güncellenecek.</p>';
    html += '<button class="btn btn-ghost" data-action="identity-logout" style="margin-top:10px;width:100%">Ben bu değilim, geri dön</button>';
    html += '</div></div>';
    return html;
  }

  function renderReceiptViewer(){
    if(!ui.receiptView) return '';
    return '<div class="sheet-overlay receipt-overlay" data-action="close-receipt-view">' +
      '<img src="' + ui.receiptView + '" alt="Fiş" class="receipt-full"></div>';
  }

  function renderTopbar(){
    var titles = { ozet:'Özet', hareketler:'Hareketler', hesaplar:'Hesaplar', raporlar:'Raporlar', sifreler:'Şifreler', ayarlar:'Ayarlar' };
    return '<div class="topbar">' +
      '<div class="brand">Hane Defteri<small>' + esc(titles[ui.tab]||'') + '</small></div>' +
      (ui.readOnly ? '<span class="readonly-chip">Salt okunur</span>' : '') +
      '</div>';
  }

  function renderFab(){
    if(ui.tab!=='ozet' && ui.tab!=='hareketler') return '';
    if(ui.readOnly) return '';
    return '<button class="fab" data-action="open-tx" aria-label="Yeni hareket ekle">' + icon('plus','icon-lg') + '</button>';
  }

  function renderTabbar(){
    var tabs = [
      {id:'ozet', label:'Özet', icon:'home'},
      {id:'hareketler', label:'Hareketler', icon:'list'},
      {id:'hesaplar', label:'Hesaplar', icon:'wallet'},
      {id:'raporlar', label:'Raporlar', icon:'chart'},
      {id:'sifreler', label:'Şifreler', icon:'lock'},
      {id:'ayarlar', label:'Ayarlar', icon:'settings'}
    ];
    var items = tabs.map(function(t){
      return '<button class="tab-btn" data-action="tab" data-tab="' + t.id + '" aria-current="' + (ui.tab===t.id) + '">' +
        icon(t.icon) + '<span>' + t.label + '</span></button>';
    }).join('');
    return '<nav class="tabbar" aria-label="Ana sekmeler"><div class="tabbar-inner">' + items + '</div></nav>';
  }

  function renderTab(){
    if(ui.tab==='hareketler') return renderHareketler();
    if(ui.tab==='hesaplar') return renderHesaplar();
    if(ui.tab==='raporlar') return renderRaporlar();
    if(ui.tab==='sifreler') return renderSifreler();
    if(ui.tab==='ayarlar') return renderAyarlar();
    return renderOzet();
  }

  /* ---------------- ÖZET ---------------- */
  function renderOzet(){
    var mk = currentMonthKey();
    var t = totalsForMonth(mk);
    var html = '';

    html += renderPlannedBanner();
    html += renderRecurringBanner();
    html += renderBudgetWarningBanner();

    var netWorthNow = netWorthAsOf(mk, true);
    var nwPos = netWorthNow >= 0;
    html += '<div class="hero">';
    html += '<div><div class="label">' + esc(monthLabel(mk)) + ' net durum</div>';
    html += '<div class="figure' + (nwPos?'':' neg') + ' num">' + fmtTRY(netWorthNow) + '</div></div>';
    html += '<div class="hero-sub">';
    html += '<div>Gelir<span class="v num">' + fmtTRY(t.income) + '</span></div>';
    html += '<div>Gider<span class="v num">' + fmtTRY(t.expense) + '</span></div>';
    html += '</div></div>';

    html += renderNetWorthChart();

    html += renderForecastTile();

    html += '<div class="section-title">Varlık Durumu</div>';
    html += renderAssetBreakdownCard();

    html += '<div class="section-title">Son Hareketler</div>';
    var recent = state.transactions.slice().sort(function(a,b){ return (b.date+b.id) < (a.date+a.id) ? -1 : 1; }).slice(0,6);
    html += '<div class="card">' + (recent.length ? recent.map(renderTxRow).join('') : renderEmpty('Henüz hareket eklenmedi.')) + '</div>';
    return html;
  }

  /* Kayıt girilen en eski aydan (en azından) bugüne, varsa gelecekteki planlı
     taksitlerin ayına kadar her ayın SONU itibarıyla toplam varlığını (krediler
     ve kredi kartları düşülmüş) sıfır çizgisine göre pozitif/negatif çubuklarla
     gösteren, yatayda kaydırılabilir bir grafik. */
  function renderNetWorthChart(){
    var months = netWorthChartMonths();
    var cur = currentMonthKey();
    var pts = months.map(function(mk2){ return { key:mk2, label: monthLabel(mk2), val: netWorthAsOf(mk2, true) }; });
    var maxAbs = Math.max.apply(null, pts.map(function(p){ return Math.abs(p.val); }).concat([1]));
    var HALF = 65;
    var html = '<div class="section-title">Net Varlık Grafiği</div>';
    html += '<div class="card scroller"><div class="networth-chart">';
    pts.forEach(function(p){
      var neg = p.val < 0;
      var h = maxAbs>0 ? clamp(Math.round(Math.abs(p.val)/maxAbs*HALF), p.val!==0?2:0, HALF) : 0;
      html += '<div class="nw-col' + (p.key===cur?' nw-col-current':'') + '">' +
        '<div class="nw-bar-wrap">' +
        '<div class="nw-bar ' + (neg?'nw-neg':'nw-pos') + '" style="height:' + h + 'px" title="' + esc(p.label) + ': ' + fmtTRY(p.val) + '"></div>' +
        '</div>' +
        '<div class="nw-label">' + esc(p.label) + '</div>' +
        '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderRecurringBanner(){
    var due = dueRecurring();
    if(!due.length) return '';
    var html = '<div class="card recur-banner">';
    html += '<div class="recur-banner-head">' + icon('repeat') + '<span>Vadesi gelen düzenli ödemeler</span></div>';
    due.forEach(function(r){
      var acct = getAccount(r.accountId);
      var isInstallment = !!r.totalInstallments;
      var subParts = [fmtTRY(r.amount), (acct ? acct.name : 'Hesap silinmiş')];
      if(isInstallment) subParts.push('taksit ' + (r.totalInstallments - r.installmentsRemaining + 1) + '/' + r.totalInstallments);
      html += '<div class="recur-item">' +
        '<div class="recur-item-main"><div class="n">' + esc(r.name) + '</div><div class="s">' + subParts.join(' · ') + '</div></div>' +
        (ui.readOnly ? '' :
          '<div class="recur-item-actions">' +
          '<button class="btn btn-primary btn-sm" data-action="recurring-add-now" data-id="' + r.id + '">Ekle</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="recurring-skip" data-id="' + r.id + '">Bu ay atla</button>' +
          '</div>') +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderPlannedBanner(){
    var due = duePlannedTx();
    if(!due.length) return '';
    var html = '<div class="card recur-banner planned-banner">';
    html += '<div class="recur-banner-head">' + icon('target') + '<span>Planlanan işlemler — gerçekleşti mi?</span></div>';
    due.forEach(function(t){
      var desc = plannedTxDescription(t);
      html += '<div class="recur-item">' +
        '<div class="recur-item-main"><div class="n">' + esc(desc.name) + '</div><div class="s">' + esc(desc.sub) + ' · ' + txDateLabel(t) + '</div></div>' +
        (ui.readOnly ? '' :
          '<div class="recur-item-actions">' +
          '<button class="btn btn-primary btn-sm" data-action="realize-planned" data-id="' + t.id + '">Gerçekleşti</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="postpone-planned" data-id="' + t.id + '">Ertele</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="delete-tx" data-id="' + t.id + '" aria-label="İptal et">' + icon('trash') + '</button>' +
          '</div>') +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderForecastTile(){
    var cardNet = cardDueThisMonthNet();
    var forecast = cashLikeTotal() + pendingRecurringNet() + cardNet;
    var due = dueRecurring();
    var hasCardBudgeted = state.accounts.some(function(a){ return a.type==='card' && a.statementDay && a.paymentDay; });
    if(!due.length && !state.recurring.some(function(r){return r.active;}) && !cardNet) return '';
    return '<div class="card forecast-tile">' +
      '<div class="stack"><span>Ay sonu tahmini nakit</span><span class="mute2">Güncel bakiye + henüz işlenmemiş düzenli ödemeler' + (hasCardBudgeted ? ' ve kart ödemeleri' : '') + '</span></div>' +
      '<span class="num" style="font-weight:600;font-size:1.05rem">' + fmtTRY(forecast) + '</span>' +
      '</div>';
  }

  function txCategoryInfo(t){
    if(t.type==='transfer') return { name:'Transfer', slot:null };
    var c = getCategory(t.type, t.categoryId);
    return { name: c ? c.name : 'Diğer', slot: c ? c.slot : 7 };
  }

  function renderTxRow(t){
    var info = txCategoryInfo(t);
    var acct = getAccount(t.accountId);
    var person = getPerson(t.personId);
    var sub = [];
    if(acct) sub.push(esc(acct.name));
    if(t.type==='transfer'){ var to = getAccount(t.toAccountId); if(to) sub.push('→ ' + esc(to.name)); }
    if(person) sub.push(esc(person.name));
    sub.push(txDateLabel(t));
    var badgeBg = t.type==='transfer' ? 'var(--ink-mute)' : slotColor(info.slot);
    var initial = info.name.slice(0,1).toUpperCase();
    var amtClass = t.type==='income' ? 'income' : (t.type==='expense' ? 'expense' : '');
    var amtPrefix = t.type==='income' ? '+' : (t.type==='expense' ? '−' : '');
    return '<div class="tx-row" data-action="open-tx" data-id="' + t.id + '">' +
      '<div class="tx-badge" style="background:' + badgeBg + '">' + initial + '</div>' +
      '<div class="tx-main"><div class="t">' + esc(info.name) + (t.note ? ' · ' + esc(t.note) : '') + (t.receipt ? icon('camera','tag-camera') : '') + plannedBadge(t) + '</div>' +
      '<div class="s">' + sub.join(' · ') + '</div>' + renderTagChips(t) + '</div>' +
      '<div class="tx-amt ' + amtClass + ' num">' + amtPrefix + fmtTRY(Math.abs(t.amount)).replace('-','') + '</div>' +
      '</div>';
  }

  function renderEmpty(msg){
    return '<div class="empty">' + icon('inbox','icon-lg') + '<div>' + esc(msg) + '</div></div>';
  }

  function renderTagChips(t){
    if(!t.tags || !t.tags.length) return '';
    return '<div class="tag-chips">' + t.tags.map(function(tg){ return '<span class="tag-chip">' + esc(tg) + '</span>'; }).join('') + '</div>';
  }

  function plannedBadge(t){
    return isPlanned(t) ? ' <span class="pill pill-warning planned-pill">Planlandı</span>' : '';
  }

  /* ---------------- HAREKETLER ---------------- */
  function renderHareketler(){
    var f = ui.txFilter;
    var html = '';
    html += '<div class="chips" role="group" aria-label="Tür filtresi">';
    [['all','Hepsi'],['income','Gelir'],['expense','Gider'],['transfer','Transfer']].forEach(function(o){
      html += '<button class="chip" data-action="filter-type" data-val="' + o[0] + '" aria-pressed="' + (f.type===o[0]) + '">' + o[1] + '</button>';
    });
    html += '</div>';

    html += '<div class="field" style="margin-top:12px"><select data-action="filter-account">';
    html += '<option value="all"' + (f.accountId==='all'?' selected':'') + '>Tüm hesaplar</option>';
    state.accounts.forEach(function(a){
      html += '<option value="' + a.id + '"' + (f.accountId===a.id?' selected':'') + '>' + esc(a.name) + '</option>';
    });
    html += '</select></div>';

    var activeExtra = f.q || f.dateFrom || f.dateTo || f.amountMin || f.amountMax;
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
    html += '<button type="button" class="btn btn-ghost btn-sm" data-action="toggle-tx-filters">' + icon('chev', ui.txFiltersOpen?'chev-open':'') + ' Gelişmiş Filtreler' + (activeExtra?' •':'') + '</button>';
    if(!ui.readOnly){
      html += '<button type="button" class="btn btn-ghost btn-sm" data-action="open-bulk-import">' + icon('upload') + ' Toplu İçe Aktar</button>';
    }
    html += '</div>';
    if(ui.txFiltersOpen){
      html += '<div class="card filter-panel" style="margin-bottom:12px">';
      html += '<div class="field"><label>Metinde ara (not, etiket, kategori)</label><input type="text" data-action="filter-q" value="' + esc(f.q) + '" placeholder="ör. market"></div>';
      html += '<div class="field-row field"><div><label>Başlangıç Tarihi</label><input type="date" data-action="filter-date-from" value="' + esc(f.dateFrom) + '"></div>' +
        '<div><label>Bitiş Tarihi</label><input type="date" data-action="filter-date-to" value="' + esc(f.dateTo) + '"></div></div>';
      html += '<div class="field-row field"><div><label>Min. Tutar</label><input class="amount-input" type="number" min="0" step="0.01" data-action="filter-amount-min" value="' + esc(f.amountMin) + '"></div>' +
        '<div><label>Maks. Tutar</label><input class="amount-input" type="number" min="0" step="0.01" data-action="filter-amount-max" value="' + esc(f.amountMax) + '"></div></div>';
      if(activeExtra){ html += '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-tx-filters">Filtreleri Temizle</button>'; }
      html += '</div>';
    }

    var list = state.transactions.filter(function(t){
      if(f.type!=='all' && t.type!==f.type) return false;
      if(f.accountId!=='all' && t.accountId!==f.accountId && t.toAccountId!==f.accountId) return false;
      if(f.dateFrom && t.date < f.dateFrom) return false;
      if(f.dateTo && t.date > f.dateTo) return false;
      if(f.amountMin && Math.abs(t.amount) < parseFloat(f.amountMin)) return false;
      if(f.amountMax && Math.abs(t.amount) > parseFloat(f.amountMax)) return false;
      if(f.q){
        var q = f.q.toLowerCase();
        var info = txCategoryInfo(t);
        var hay = [t.note||'', info.name, (t.tags||[]).join(' ')].join(' ').toLowerCase();
        if(hay.indexOf(q)===-1) return false;
      }
      return true;
    }).sort(function(a,b){ return (b.date+b.id) < (a.date+a.id) ? -1 : 1; });

    html += '<div class="card">' + (list.length ? list.map(renderTxRow).join('') : renderEmpty('Filtreye uyan hareket yok.')) + '</div>';
    return html;
  }

  /* ---------------- HESAPLAR ---------------- */
  var ACC_TYPE_LABEL = { bank:'Banka Hesabı', card:'Kredi Kartı', external:'Ödeme Aracı', cash:'Nakit', loan_given:'Verilen Borç', loan_taken:'Alınan Borç', loan_account:'Kredi' };
  var ACC_TYPE_ICON = { bank:'bank', card:'card', external:'ext', cash:'wallet', loan_given:'handOut', loan_taken:'handIn', loan_account:'repeat' };

  /* Varlık Durumu kırılımı: Özet ve Raporlar sekmelerinde ortak kullanılan,
     tıklanınca altındaki banka/kredi kartı hesaplarını açıp gösteren kart. */
  /* Varlık Durumu hiyerarşisi: en üstte Nakit; altında Banka (içinde Hesaplar,
     Kredi Kartları, Krediler, Ödeme Araçları); varsa ayrıca Borçlar (Verilen/Alınan);
     en altta Net Varlık. */
  function renderAssetBreakdownCard(){
    /* döviz cinsinden (TRY dışı) nakit/banka hesapları TL toplamlarına karıştırılmaz;
       ayrı bir "Döviz Hesapları" bloğunda, kendi para birimleriyle listelenir. */
    var cashAccountsAll = state.accounts.filter(function(a){ return a.type==='cash'; });
    var cashAccounts = cashAccountsAll.filter(function(a){ return !isForeignCurrencyAccount(a); });
    var cashTotal = cashAccounts.reduce(function(s,a){ return s + accountBalance(a.id); }, 0);

    var bankSubDefs = [
      { key:'bank', label:'Hesaplar', type:'bank', addLabel:'Hesap Ekle', emptyMsg:'Henüz banka hesabı eklenmedi.' },
      { key:'card', label:'Kredi Kartları', type:'card', addLabel:'Kart Ekle', emptyMsg:'Henüz kredi kartı eklenmedi.' },
      { key:'loan_account', label:'Krediler', type:'loan_account', addLabel:'Kredi Ekle', emptyMsg:'Henüz kredi eklenmedi.' },
      { key:'external', label:'Ödeme Araçları', type:'external', addLabel:'Ödeme Aracı Ekle', emptyMsg:'Henüz ödeme aracı eklenmedi (ör. Multinet, Edenred).' }
    ];
    var bankSubGroups = bankSubDefs.map(function(g){
      var acctsAll = state.accounts.filter(function(a){ return a.type===g.type; });
      var accts = acctsAll.filter(function(a){ return !isForeignCurrencyAccount(a); });
      var total = accts.reduce(function(s,a){ return s + accountBalance(a.id); }, 0);
      return Object.assign({}, g, { accounts:accts, total:total });
    });
    var bankNet = bankSubGroups[0].total + bankSubGroups[3].total - bankSubGroups[1].total - bankSubGroups[2].total;

    var loanGivenAccounts = state.accounts.filter(function(a){ return a.type==='loan_given'; });
    var loanTakenAccounts = state.accounts.filter(function(a){ return a.type==='loan_taken'; });
    var hasBorclar = loanGivenAccounts.length>0 || loanTakenAccounts.length>0;
    var loanGivenTotal = loanGivenAccounts.reduce(function(s,a){ return s + accountBalance(a.id); }, 0);
    var loanTakenTotal = loanTakenAccounts.reduce(function(s,a){ return s + accountBalance(a.id); }, 0);
    var borclarNet = loanGivenTotal - loanTakenTotal;

    var fxAccounts = state.accounts.filter(function(a){ return (a.type==='cash'||a.type==='bank') && isForeignCurrencyAccount(a); });
    var fxConvertible = fxAccounts.filter(function(a){ return fxRateFor(accountCurrency(a))!=null; });
    var fxUnconvertible = fxAccounts.length - fxConvertible.length;
    var fxTotalTL = fxConvertible.reduce(function(s,a){ return s + toTRY(accountBalance(a.id), accountCurrency(a)); }, 0);

    var net = cashTotal + bankNet + (hasBorclar ? borclarNet : 0) + fxTotalTL;
    var netRows = [
      { label:'Nakit', amount:cashTotal },
      { label:'Banka Hesapları + Ödeme Araçları', amount: bankSubGroups[0].total + bankSubGroups[3].total },
      { label:'Kredi Kartı Borcu', amount: -bankSubGroups[1].total },
      { label:'Kredi Borcu', amount: -bankSubGroups[2].total }
    ];
    if(hasBorclar) netRows.push({ label:'Borçlar (Verilen − Alınan)', amount: borclarNet });
    if(fxConvertible.length) netRows.push({ label:'Döviz Hesapları (TL karşılığı)', amount: fxTotalTL });

    var html = '<div class="card">';
    html += renderAssetBlock('cash', 'Nakit', cashAccounts.length + ' hesap', cashTotal, 'var(--ink)', cashAccounts, 'cash', 'Hesap Ekle', 'Henüz nakit hesabı eklenmedi.');
    html += renderBankAssetBlock(bankSubGroups, bankNet);
    if(hasBorclar){
      html += renderAssetBlock('borclar', 'Borçlar (Verilen / Alınan)', null, borclarNet, borclarNet>=0?'var(--income)':'var(--expense)', loanGivenAccounts.concat(loanTakenAccounts), null, null, null);
    }
    if(fxAccounts.length){
      html += renderFxAssetBlock(fxAccounts);
    }
    html += renderAssetBlock('net', 'Net varlık', null, net, net>=0?'var(--income)':'var(--expense)', null, null, null, null, netRows);
    html += '</div>';
    if(fxUnconvertible>0){
      html += '<p class="mute2" style="margin-top:8px">' + fxUnconvertible + ' döviz hesabı için Ayarlar\'dan kur girilmediği için Net Varlık toplamına dahil edilmedi. Ayarlar → Döviz Kurları\'ndan güncel kuru girerek dahil edebilirsiniz.</p>';
    } else if(fxConvertible.length){
      html += '<p class="mute2" style="margin-top:8px">Döviz hesapları, Ayarlar\'da girdiğiniz manuel kur üzerinden TL karşılığıyla Net Varlık toplamına dahil edildi.</p>';
    }
    return html;
  }

  /* döviz cinsinden (USD/EUR/Altın) nakit ve banka hesapları — TL toplamına
     karıştırılmadan, kendi para birimleriyle ayrı bir blokta listelenir. */
  function renderFxAssetBlock(fxAccounts){
    var expanded = !!ui.assetExpanded.doviz;
    var fxTotalTL = fxAccounts.reduce(function(s,a){ var t = toTRY(accountBalance(a.id), accountCurrency(a)); return s + (t||0); }, 0);
    var allConvertible = fxAccounts.every(function(a){ return fxRateFor(accountCurrency(a))!=null; });
    var subLabel = fxAccounts.length + ' hesap' + (allConvertible ? ' · TL karşılığı: ' + fmtTRY(fxTotalTL) : ' · kur girilmemiş hesap(lar) var');
    var html = '<div class="asset-block">';
    html += '<div class="asset-row" data-action="toggle-asset" data-key="doviz" aria-expanded="' + expanded + '">' +
      '<div class="stack"><span>Döviz Hesapları</span><span class="mute2">' + subLabel + '</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' + icon('chev','chev') + '</div></div>';
    if(expanded){
      html += '<div class="asset-detail">';
      fxAccounts.forEach(function(a){
        var bal = accountBalance(a.id);
        var cur = accountCurrency(a);
        var tl = toTRY(bal, cur);
        html += '<div class="mini-acct" data-action="open-account-detail" data-id="' + a.id + '">' +
          '<div class="mi-icon">' + icon(ACC_TYPE_ICON[a.type]) + '</div>' +
          '<div class="mi-main"><div class="n">' + esc(a.name) + '</div><div class="t">' + ACC_TYPE_LABEL[a.type] + ' · ' + CURRENCY_MAP[cur].label + (tl!=null ? ' · ≈ ' + fmtTRY(tl) : ' · kur girilmemiş') + '</div></div>' +
          '<div class="mi-v num" style="color:' + (bal<0?'var(--expense)':'var(--income)') + '">' + fmtCurrency(bal, cur) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderBankAssetBlock(subGroups, bankNet){
    var expanded = !!ui.assetExpanded.banka;
    var html = '<div class="asset-block">';
    html += '<div class="asset-row" data-action="toggle-asset" data-key="banka" aria-expanded="' + expanded + '">' +
      '<div class="stack"><span>Banka</span><span class="mute2">Hesaplar, kartlar, krediler, ödeme araçları</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="num" style="font-weight:600;color:' + (bankNet>=0?'var(--income)':'var(--expense)') + '">' + fmtTRY(bankNet) + '</span>' +
      icon('chev','chev') + '</div></div>';
    if(expanded){
      html += '<div class="asset-detail asset-detail-nested">';
      subGroups.forEach(function(g){ html += renderBankSubGroup(g); });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderBankSubGroup(g){
    var subKey = 'banka_' + g.key;
    var expanded = !!ui.assetExpanded[subKey];
    var color = (g.key==='card' || g.key==='loan_account') ? 'var(--expense)' : 'var(--ink)';
    var html = '<div class="asset-subblock">';
    html += '<div class="asset-row asset-subrow" data-action="toggle-asset" data-key="' + subKey + '" aria-expanded="' + expanded + '">' +
      '<div class="stack"><span>' + esc(g.label) + '</span><span class="mute2">' + g.accounts.length + ' hesap</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="num" style="font-weight:600;color:' + color + '">' + fmtTRY(g.total) + '</span>' +
      icon('chev','chev') + '</div></div>';
    if(expanded){
      html += '<div class="asset-detail">';
      if(!g.accounts.length){
        html += renderEmpty(g.emptyMsg);
        if(!ui.readOnly){
          html += '<button class="btn btn-primary btn-sm asset-add" data-action="quick-add-account" data-type="' + g.type + '">' + icon('plus') + ' ' + g.addLabel + '</button>';
        }
      } else {
        g.accounts.forEach(function(a){ html += renderMiniAcctRow(a); });
        if(!ui.readOnly){
          html += '<button class="btn btn-ghost btn-sm asset-add" data-action="quick-add-account" data-type="' + g.type + '">' + icon('plus') + ' ' + g.addLabel + '</button>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderMiniAcctRow(a){
    var bal = accountBalance(a.id);
    var balColor = isDebtType(a.type) ? 'var(--expense)' : (bal<0?'var(--expense)':'var(--income)');
    return '<div class="mini-acct" data-action="open-account-detail" data-id="' + a.id + '">' +
      '<div class="mi-icon">' + icon(ACC_TYPE_ICON[a.type]) + '</div>' +
      '<div class="mi-main"><div class="n">' + esc(a.name) + '</div><div class="t">' + ACC_TYPE_LABEL[a.type] + '</div></div>' +
      '<div class="mi-v num" style="color:' + balColor + '">' + fmtTRY(bal) + '</div></div>';
  }

  function renderAssetBlock(key, label, sub, total, color, accounts, addType, addLabel, emptyMsg, netRows){
    var expanded = !!ui.assetExpanded[key];
    var html = '<div class="asset-block">';
    html += '<div class="asset-row" data-action="toggle-asset" data-key="' + key + '" aria-expanded="' + expanded + '">' +
      '<div class="stack"><span>' + esc(label) + '</span>' + (sub ? '<span class="mute2">' + esc(sub) + '</span>' : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="num" style="font-weight:600;color:' + color + '">' + fmtTRY(total) + '</span>' +
      icon('chev','chev') + '</div></div>';

    if(expanded){
      html += '<div class="asset-detail">';
      if(key==='net'){
        html += '<table class="kv-table">' + netRows.map(function(r){
          return '<tr><td>' + esc(r.label) + '</td><td class="num"' + (r.amount<0?' style="color:var(--expense)"':'') + '>' + (r.amount<0?'−':'') + fmtTRY(Math.abs(r.amount)) + '</td></tr>';
        }).join('') + '</table>';
      } else if(!accounts.length){
        html += renderEmpty(emptyMsg || 'Henüz eklenmedi.');
        if(!ui.readOnly && addType){
          html += '<button class="btn btn-primary btn-sm asset-add" data-action="quick-add-account" data-type="' + addType + '">' + icon('plus') + ' ' + (addLabel||'Ekle') + '</button>';
        }
      } else {
        accounts.forEach(function(a){ html += renderMiniAcctRow(a); });
        if(!ui.readOnly && addType){
          html += '<button class="btn btn-ghost btn-sm asset-add" data-action="quick-add-account" data-type="' + addType + '">' + icon('plus') + ' ' + (addLabel||'Ekle') + '</button>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderHesaplar(){
    var groups = [ ['cash','Nakit'], ['bank','Banka Hesapları'], ['card','Kredi Kartları'], ['loan_account','Krediler'], ['external','Ödeme Araçları'], ['loan_given','Verilen Borçlar'], ['loan_taken','Alınan Borçlar'] ];
    var html = '';
    groups.forEach(function(g){
      var items = state.accounts.filter(function(a){ return a.type===g[0]; });
      var isLoanGroup = g[0]==='loan_given' || g[0]==='loan_taken' || g[0]==='loan_account';
      if(isLoanGroup && !items.length) return; /* borç/kredi grupları boşken gizli, ihtiyaç olunca "Hesap Ekle"den açılır */
      html += '<div class="section-title">' + g[1] + '</div>';
      html += '<div class="card">';
      if(!items.length){
        html += renderEmpty('Henüz eklenmedi.');
      } else {
        items.forEach(function(a){ html += renderAccountRow(a); });
      }
      html += '</div>';
    });
    if(!ui.readOnly){
      html += '<button class="btn btn-primary btn-block" style="margin-top:16px" data-action="open-account">' + icon('plus') + ' Hesap Ekle</button>';
    }
    return html;
  }

  function accountValueColor(a, bal){
    if(isDebtType(a.type)) return 'var(--expense)';
    return bal < 0 ? 'var(--expense)' : 'var(--income)';
  }

  /* Hesap türüne özel ek bilgi satırları: banka için IBAN/vadeli-vadesiz/avans limiti/
     döviz cinsi; kredi kartı için kart numarası (maskeli)/banka adı/ağı/kesim-ödeme günü. */
  function accountExtraDetailsLine(a){
    var parts = [];
    if(a.type==='bank'){
      parts.push(a.termType==='vadeli' ? 'Vadeli' : 'Vadesiz');
      if(a.iban) parts.push(esc(a.iban));
      if(a.overdraftLimit!=null && a.overdraftLimit>=0) parts.push('Avans limiti ' + fmtCurrency(a.overdraftLimit, accountCurrency(a)));
      if(isForeignCurrencyAccount(a)) parts.push(CURRENCY_MAP[accountCurrency(a)].label);
    } else if(a.type==='cash'){
      if(isForeignCurrencyAccount(a)) parts.push(CURRENCY_MAP[accountCurrency(a)].label);
    } else if(a.type==='card'){
      if(a.bankName) parts.push(esc(a.bankName));
      var net = a.networkId ? getCardNetwork(a.networkId) : null;
      if(net) parts.push(esc(net.name));
      if(a.cardNumber) parts.push(maskCardNumber(a.cardNumber));
      if(a.statementDay && a.paymentDay) parts.push('Kesim ' + a.statementDay + '. gün · Ödeme ' + a.paymentDay + '. gün');
    }
    return parts.length ? '<div class="mute2" style="margin-top:2px">' + parts.join(' · ') + '</div>' : '';
  }

  /* Hesaplar sekmesindeki KOMPAKT liste satırı için kısa bir ek bilgi —
     tam ayrıntılar (IBAN, avans limiti, kesim/ödeme günü vb.) yalnızca
     hesap detay ekranında (accountExtraDetailsLine) gösterilir. */
  function accountRowExtraLine(a){
    var parts = [];
    if(a.type==='card'){
      if(a.bankName) parts.push(esc(a.bankName));
      var net = a.networkId ? getCardNetwork(a.networkId) : null;
      if(net) parts.push(esc(net.name));
    } else if((a.type==='bank' || a.type==='cash') && isForeignCurrencyAccount(a)){
      parts.push(CURRENCY_MAP[accountCurrency(a)].label);
    }
    return parts.length ? '<div class="mute2" style="margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + parts.join(' · ') + '</div>' : '';
  }

  function renderCardLimitBar(a, bal){
    var limit = a.limit || 0;
    var pct = limit>0 ? clamp(bal/limit,0,1.4) : 0;
    var barClass = pct>0.95 ? 'crit' : (pct>0.75 ? 'warn' : '');
    return '<div class="limit-bar ' + barClass + '"><div style="width:' + Math.min(pct,1)*100 + '%"></div></div>' +
      '<div class="mute2" style="margin-top:5px">Limit: <span class="num">' + fmtTRY(limit) + '</span> · Kullanılabilir: <span class="num">' + fmtTRY(Math.max(limit-bal,0)) + '</span></div>';
  }

  /* bir kredi hesabına yapılmış (planlı olmayan, yani gerçekleşmiş) ödeme
     sayısı — kayıtların kendisinden canlı hesaplanır, ayrı bir sayaç tutulmaz. */
  function loanPaidCount(a){
    return state.transactions.filter(function(t){ return t.type==='transfer' && t.toAccountId===a.id && !isPlanned(t); }).length;
  }

  /* Hesaplar listesindeki KOMPAKT satır için kısa özet (tam tablo yalnızca
     hesap detay ekranında, bkz. renderLoanScheduleTable). Yeni model (banka
     kredisi, içe aktarılmış amortisman tablosu) ve eski basit model
     (Taksit Tutarı × Sayısı) için ayrı ayrı özetler. */
  function renderLoanProgress(a){
    if(a.schedule && a.schedule.length){
      var paidNew = loanPaidCount(a);
      return '<div class="mute2" style="margin-top:5px">' + paidNew + '/' + a.schedule.length + ' taksit ödendi</div>';
    }
    if(!a.totalInstallments) return '';
    var paid = loanPaidCount(a);
    return '<div class="mute2" style="margin-top:5px">Aylık <span class="num">' + fmtTRY(a.monthlyPayment||0) + '</span> · ' + paid + '/' + a.totalInstallments + ' taksit ödendi</div>';
  }

  /* Hesap detay ekranındaki TAM amortisman tablosu (yeni banka kredisi
     modeli): her satır bir taksit — Tarih, Taksit Tutarı ve (verildiyse)
     Anapara/Faiz/Kalan Bakiye. loanPaidCount() ile gerçekten ödenmiş
     ("Ödeme Yap" ile yapılmış, planlı olmayan) taksit sayısı kadar ilk satır
     "Ödendi" olarak işaretlenir — ödemelerin tabloyla aynı sırada yapıldığı
     varsayılır (basit ama pratikte gerçekçi bir yaklaşım). */
  function renderLoanScheduleTable(a){
    var sched = a.schedule || [];
    if(!sched.length) return '';
    var paidCount = loanPaidCount(a);
    var hasBreakdown = sched.some(function(r){ return r.principal!=null || r.interest!=null || r.balance!=null; });
    var html = '<div class="mute2" style="margin-top:5px">' + paidCount + '/' + sched.length + ' taksit ödendi (tabloya göre)</div>';
    html += '<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border,#ddd);border-radius:8px;margin-top:8px">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
    html += '<thead><tr style="position:sticky;top:0;background:var(--surface)">' +
      '<th style="padding:5px 7px;text-align:left">#</th><th style="padding:5px 7px;text-align:left">Tarih</th><th style="padding:5px 7px;text-align:right">Taksit</th>' +
      (hasBreakdown ? '<th style="padding:5px 7px;text-align:right">Anapara</th><th style="padding:5px 7px;text-align:right">Faiz</th><th style="padding:5px 7px;text-align:right">Kalan Bakiye</th>' : '') +
      '<th style="padding:5px 7px"></th></tr></thead><tbody>';
    sched.forEach(function(r, i){
      var paid = i < paidCount;
      html += '<tr style="' + (paid ? 'opacity:0.55' : '') + '"><td style="padding:5px 7px">' + r.no + '</td><td style="padding:5px 7px;white-space:nowrap">' + fmtDate(r.date) + '</td><td style="padding:5px 7px;text-align:right" class="num">' + fmtTRY(r.payment) + '</td>' +
        (hasBreakdown ? '<td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.principal!=null?fmtTRY(r.principal):'—') + '</td><td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.interest!=null?fmtTRY(r.interest):'—') + '</td><td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.balance!=null?fmtTRY(r.balance):'—') + '</td>' : '') +
        '<td style="padding:5px 7px;white-space:nowrap">' + (paid ? '<span class="mute2">Ödendi</span>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /* Kredi hesabı ekleme/düzenleme formunun içine gömülü, amortisman tablosu
     yapıştırma/önizleme mini-akışı — ui.loanImport = { text, step:'input'|
     'preview', rows }. Toplu kayıt içe aktarma modalıyla (renderBulkImportForm)
     aynı iki adımlı desen; burada ayrı bir üst-düzey modal yerine hesap
     formunun İÇİNDE (nested) çalışıyor, çünkü içe aktarma tek bir hesabın
     parçası — kaydetme ("Kaydet" düğmesi) hesap formunun kendisiyle birlikte
     tek seferde oluyor. */
  function renderLoanScheduleImportWidget(li){
    li = li || { text:'', step:'input', rows:[] };
    var html = '';
    if(li.step==='input'){
      html += '<div class="field"><label>Amortisman Tablosu</label>';
      html += '<p class="mute2" style="margin:2px 0 6px">Bankanızın verdiği taksit tablosunu Excel\'den kopyalayıp aşağıya yapıştırın. Sütunlar TAB (Excel\'den kopyala-yapıştır) veya <b>;</b> ile ayrılmalı: <b>Ödeme Tarihi · Taksit Tutarı · Anapara (ops) · Faiz (ops) · Kalan Bakiye (ops)</b></p>';
      html += '<p class="mute2" style="font-family:monospace;background:var(--surface2,#f2f2f2);padding:8px;border-radius:8px;overflow-x:auto;white-space:pre">Ödeme Tarihi;Taksit Tutarı;Anapara;Faiz;Kalan Bakiye\n15.10.2026;12.500,00;10.200,00;2.300,00;487.500,00\n15.11.2026;12.500,00;10.285,00;2.215,00;477.215,00</p>';
      html += '<textarea id="loan-schedule-textarea" rows="6" placeholder="Tabloyu buraya yapıştırın..." style="width:100%;font-family:monospace;font-size:0.85rem">' + esc(li.text||'') + '</textarea></div>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-action="loan-schedule-preview">' + icon('upload') + ' Tabloyu Ayrıştır / Önizle</button>';
    } else {
      var ok = li.rows.filter(function(r){ return r.ok; });
      var bad = li.rows.filter(function(r){ return !r.ok; });
      html += '<p class="mute2">' + ok.length + ' taksit satırı bulundu' + (bad.length ? ', ' + bad.length + ' satır hata nedeniyle atlanacak' : '') + '.</p>';
      html += '<div style="max-height:220px;overflow-y:auto;border:1px solid var(--border,#ddd);border-radius:8px;margin-bottom:8px">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
      li.rows.forEach(function(r){
        var bg = !r.ok ? 'background:rgba(220,50,50,0.08)' : '';
        html += '<tr style="' + bg + '">';
        if(r.ok){
          html += '<td style="padding:5px 7px;white-space:nowrap">#' + r.lineNo + ' · ' + fmtDate(r.date) + '</td><td style="padding:5px 7px;text-align:right" class="num">' + fmtTRY(r.payment) + '</td>' +
            '<td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.principal!=null?fmtTRY(r.principal):'—') + '</td>' +
            '<td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.interest!=null?fmtTRY(r.interest):'—') + '</td>' +
            '<td style="padding:5px 7px;text-align:right" class="num mute2">' + (r.balance!=null?fmtTRY(r.balance):'—') + '</td>';
        } else {
          html += '<td colspan="4" style="padding:5px 7px"><div>#' + r.lineNo + ' · ' + esc(r.raw) + '</div><div class="mute2" style="color:var(--expense)">' + esc(r.error) + '</div></td>';
        }
        html += '</tr>';
      });
      if(!li.rows.length){ html += '<tr><td style="padding:10px">Ayrıştırılacak satır bulunamadı.</td></tr>'; }
      html += '</table></div>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-action="loan-schedule-edit">Geri / Düzenle</button>';
    }
    return html;
  }

  /* Kesim/ödeme günü tanımlı bir kredi kartının harcamalarını dönemlere (kesim
     tarihleri arası) gruplar; her dönemin toplam borcu ve (hafta sonuna denk
     gelirse pazartesiye kaydırılmış) ödeme tarihi gösterilir. */
  /* Kredi kartının tüm geçmiş dönemlerini (ekstrelerini) listeler; her dönem
     kapalı bir satır olarak görünür, tıklanınca o dönemin harcamaları açılır.
     'renderAccountTxRow' ile Hesap Hareketleri'ndeki aynı satır görünümü
     kullanılır — böylece kişi geçmiş ekstre hareketlerini dönem seçerek
     görebilir (renderAssetBlock/renderBankAssetBlock'taki genişleyen liste
     deseniyle aynı: .asset-row / .asset-detail). */
  function renderCardPeriodBreakdown(acct){
    var spends = state.transactions.filter(function(t){ return t.type==='expense' && t.accountId===acct.id && !isPlanned(t); });
    if(!spends.length) return '';
    var periods = {};
    spends.forEach(function(t){
      var key = cardStatementKeyForDate(acct, t.date);
      if(!periods[key]) periods[key] = { total:0, txs:[] };
      periods[key].total += t.amount;
      periods[key].txs.push(t);
    });
    var keys = Object.keys(periods).sort().reverse();
    var html = '<div class="section-title" style="margin-top:18px">Dönem Bazlı Borç (Ekstreler)</div><div class="card">';
    keys.forEach(function(k){
      var p = periods[k];
      var payDate = cardPaymentDateForStatement(acct, k);
      var openKey = acct.id + '_' + k;
      var expanded = !!ui.cardPeriodOpen[openKey];
      html += '<div class="asset-block">';
      html += '<div class="asset-row" data-action="toggle-card-period" data-key="' + openKey + '" aria-expanded="' + expanded + '">' +
        '<div class="stack"><span>' + esc(monthLabel(k)) + ' dönemi</span><span class="mute2">Ödeme: ' + fmtDate(payDate) + ' · ' + p.txs.length + ' işlem</span></div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span class="num" style="font-weight:600;color:var(--expense)">' + fmtTRY(p.total) + '</span>' + icon('chev','chev') + '</div></div>';
      if(expanded){
        html += '<div class="asset-detail">' +
          p.txs.slice().sort(function(a,b){ return (b.date+b.id) < (a.date+a.id) ? -1 : 1; }).map(function(t){ return renderAccountTxRow(t, acct); }).join('') +
          '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderAccountRow(a){
    var bal = accountBalance(a.id);
    var valColor = accountValueColor(a, bal);
    var extra = accountRowExtraLine(a) + (a.type==='card' ? renderCardLimitBar(a, bal) : (a.type==='loan_account' ? renderLoanProgress(a) : ''));
    var actions = ui.readOnly ? '' : (
      '<button class="btn btn-ghost btn-sm" data-action="open-account" data-id="' + a.id + '" aria-label="Düzenle">' + icon('edit') + '</button>' +
      (isDebtType(a.type) ? '<button class="btn btn-ghost btn-sm" data-action="pay-card" data-id="' + a.id + '" aria-label="Ödeme yap">' + icon('swap') + '</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-action="delete-account" data-id="' + a.id + '" aria-label="Sil">' + icon('trash') + '</button>'
    );
    return '<div class="acct-card">' +
      '<div class="acct-clickable" data-action="open-account-detail" data-id="' + a.id + '" style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer">' +
      '<div class="acct-icon">' + icon(ACC_TYPE_ICON[a.type], 'icon-lg') + '</div>' +
      '<div class="acct-main"><div class="n">' + esc(a.name) + '</div><div class="t">' + ACC_TYPE_LABEL[a.type] + '</div>' + extra + '</div>' +
      '<div class="acct-bal"><div class="v num" style="color:' + valColor + '">' + fmtCurrency(bal, accountCurrency(a)) + '</div></div>' +
      '</div>' +
      '<div style="display:flex">' + actions + '</div>' +
      '</div>';
  }

  /* ---------------- RAPORLAR ---------------- */
  /* Nakit akışı projeksiyonu kartı (madde 5): önümüzdeki 6 ay için, ZATEN
     bilinen (taksit/tekrar sayısı belli planlı kayıtlar + süresiz düzenli
     ödemeler) kalemlere göre tahmini nakit/banka bakiyesi. */
  function renderCashFlowProjectionSection(){
    var proj = cashFlowProjection(6);
    var maxAbs = Math.max.apply(null, proj.map(function(p){ return Math.abs(p.value); }).concat([1]));
    var html = '<div class="section-title">Nakit Akışı Projeksiyonu</div><div class="card scroller">';
    html += '<p class="mute2" style="margin-bottom:10px">Güncel nakit/banka bakiyeniz + bilinen düzenli ödemeler ve taksitlere göre önümüzdeki 6 ay tahmini. Henüz planlanmamış yeni harcamalar dahil değildir.</p>';
    html += '<div class="trend-chart">';
    proj.forEach(function(p){
      var h = clamp(Math.abs(p.value)/maxAbs*100, 2, 100);
      var neg = p.value<0;
      html += '<div class="trend-col"><div class="trend-bars" style="height:90px;align-items:' + (neg?'flex-start':'flex-end') + '">' +
        '<div class="trend-bar-stack"><div class="trend-bar" title="' + esc(p.label) + ': ' + fmtTRY(p.value) + '" style="height:' + h + '%;background:' + (neg?'var(--expense)':'var(--income)') + '"></div></div>' +
        '</div><div class="trend-label">' + esc(p.label) + '</div><div class="mute2 num" style="text-align:center;font-size:0.72rem">' + fmtTRY(p.value) + '</div></div>';
    });
    html += '</div></div>';
    return html;
  }

  /* Yıllık özet + kategori bazlı YoY karşılaştırma (madde 5). */
  function renderYearlySummarySection(){
    var year = ui.reportYear;
    var totals = yearTotals(year);
    var prevTotals = yearTotals(year-1);
    var netChangeText = '';
    if(prevTotals.net!==0){
      var pctNet = (totals.net-prevTotals.net)/Math.abs(prevTotals.net)*100;
      netChangeText = ' <span class="mute2">(geçen yıla göre ' + (pctNet>=0?'+':'') + pctNet.toFixed(0) + '%)</span>';
    }
    var html = '<div class="section-title">Yıllık Özet</div>';
    html += '<div class="row"><button class="btn btn-ghost btn-sm" data-action="report-year" data-dir="-1" aria-label="Önceki yıl">' + icon('chev','flip') + '</button>' +
      '<div style="font-weight:600">' + year + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-action="report-year" data-dir="1" aria-label="Sonraki yıl" style="transform:scaleX(-1)">' + icon('chev') + '</button></div>';
    html += '<div class="card" style="margin-top:12px"><table class="kv-table">' +
      '<tr><td>Toplam Gelir</td><td class="num" style="color:var(--income)">' + fmtTRY(totals.income) + '</td></tr>' +
      '<tr><td>Toplam Gider</td><td class="num" style="color:var(--expense)">' + fmtTRY(totals.expense) + '</td></tr>' +
      '<tr><td>Net</td><td class="num">' + fmtTRY(totals.net) + netChangeText + '</td></tr>' +
      '</table></div>';

    var yoy = categoryYoY(year, 'expense');
    if(yoy.length){
      html += '<div class="section-title">Kategori Bazlı Yıl-Üstü-Yıl (Gider)</div><div class="card">';
      yoy.forEach(function(r){
        var changeText;
        if(r.pctChange===null) changeText = '<span class="mute2">yeni (geçen yıl yok)</span>';
        else {
          var color = r.pctChange>0 ? 'var(--expense)' : (r.pctChange<0 ? 'var(--income)' : 'var(--mute)');
          changeText = '<span class="num" style="color:' + color + '">' + (r.pctChange>=0?'+':'') + r.pctChange.toFixed(0) + '%</span>';
        }
        html += '<div class="switch-row"><span>' + esc(r.cat.name) + '</span><span style="text-align:right">' + fmtTRY(r.current) + ' <span class="mute2">(' + (year-1) + ': ' + fmtTRY(r.previous) + ')</span> ' + changeText + '</span></div>';
      });
      html += '</div>';
    }
    return html;
  }

  function renderRaporlar(){
    var mk = ui.reportMonth;
    var t = totalsForMonth(mk);
    var pt = plannedTotalsForMonth(mk);
    var expRows = categoryBreakdown(mk, 'expense');
    var incRows = categoryBreakdown(mk, 'income');
    var maxExp = Math.max.apply(null, expRows.map(function(r){return r.amount+r.plannedAmount;}).concat([1]));
    var trend = last6MonthsTrend();
    var hasFutureTrend = trend.some(function(m){ return m.future; });
    var maxTrend = Math.max.apply(null, trend.map(function(r){return Math.max(r.income+r.plannedIncome, r.expense+r.plannedExpense);}).concat([1]));

    var html = '';
    html += '<div class="row" style="margin-top:10px">' +
      '<button class="btn btn-ghost btn-sm" data-action="report-month" data-dir="-1" aria-label="Önceki ay">' + icon('chev', 'flip') + '</button>' +
      '<div style="font-weight:600">' + esc(monthLabel(mk)) + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-action="report-month" data-dir="1" aria-label="Sonraki ay" style="transform:scaleX(-1)">' + icon('chev') + '</button>' +
      '</div>';

    html += '<div class="card" style="margin-top:12px"><table class="kv-table">' +
      '<tr><td>Toplam Gelir</td><td class="num" style="color:var(--income)">' + fmtTRY(t.income) + '</td></tr>' +
      '<tr><td>Toplam Gider</td><td class="num" style="color:var(--expense)">' + fmtTRY(t.expense) + '</td></tr>' +
      '<tr><td>Net</td><td class="num">' + fmtTRY(t.net) + '</td></tr>' +
      '</table>';
    if(pt.income>0 || pt.expense>0){
      html += '<p class="mute2" style="padding:0 14px 12px">Ayrıca planlanan (henüz gerçekleşmemiş): ' +
        (pt.income>0 ? '+' + fmtTRY(pt.income) + ' gelir' : '') + (pt.income>0 && pt.expense>0 ? ' · ' : '') +
        (pt.expense>0 ? '−' + fmtTRY(pt.expense) + ' gider' : '') + '</p>';
    }
    html += '</div>';

    var budgetByCat = {};
    budgetStatusForMonth(mk).forEach(function(b){ budgetByCat[b.cat.id] = b; });

    html += '<div class="section-title">Gider Dağılımı</div><div class="card">';
    if(!expRows.length){ html += renderEmpty('Bu ay gider kaydı yok.'); }
    else {
      expRows.forEach(function(r){
        var pct = t.expense>0 ? (r.amount/t.expense*100) : 0;
        var b = budgetByCat[r.cat.id];
        html += '<div class="bar-row"><div class="bhead"><span>' + esc(r.cat.name) + '</span><span class="num">' + fmtTRY(r.amount) + ' · %' + pct.toFixed(0) + (r.plannedAmount>0 ? ' <span class="mute2">(+' + fmtTRY(r.plannedAmount) + ' planlanan)</span>' : '') + '</span></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + (r.amount/maxExp*100) + '%;background:' + slotColor(r.cat.slot) + '"></div>' +
          (r.plannedAmount>0 ? '<div class="bar-fill bar-fill-planned" style="width:' + (r.plannedAmount/maxExp*100) + '%;background:' + slotColor(r.cat.slot) + '"></div>' : '') +
          '</div>' + renderBudgetLine(b) + '</div>';
      });
    }
    html += '</div>';

    html += '<div class="section-title">' + (hasFutureTrend ? 'Aylık Trend (geçmiş + planlanan)' : 'Son 6 Ay') + '</div><div class="card scroller">';
    html += '<div class="trend-chart">';
    trend.forEach(function(m){
      var hInc = clamp(m.income/maxTrend*100, 0, 100);
      var hExp = clamp(m.expense/maxTrend*100, 0, 100);
      var hIncP = clamp(m.plannedIncome/maxTrend*100, 0, 100);
      var hExpP = clamp(m.plannedExpense/maxTrend*100, 0, 100);
      html += '<div class="trend-col' + (m.future?' trend-col-future':'') + '"><div class="trend-bars" style="height:118px">' +
        '<div class="trend-bar-stack">' +
        (hIncP>0 ? '<div class="trend-bar trend-bar-planned" title="Planlanan gelir: ' + fmtTRY(m.plannedIncome) + '" style="height:' + hIncP + '%;background:var(--income)"></div>' : '') +
        '<div class="trend-bar" title="Gelir: ' + fmtTRY(m.income) + '" style="height:' + hInc + '%;background:var(--income)"></div>' +
        '</div>' +
        '<div class="trend-bar-stack">' +
        (hExpP>0 ? '<div class="trend-bar trend-bar-planned" title="Planlanan gider: ' + fmtTRY(m.plannedExpense) + '" style="height:' + hExpP + '%;background:var(--expense)"></div>' : '') +
        '<div class="trend-bar" title="Gider: ' + fmtTRY(m.expense) + '" style="height:' + hExp + '%;background:var(--expense)"></div>' +
        '</div>' +
        '</div><div class="trend-label">' + esc(m.label) + '</div></div>';
    });
    html += '</div>';
    html += '<div class="legend"><div class="legend-item"><span class="legend-dot" style="background:var(--income)"></span>Gelir</div>' +
      '<div class="legend-item"><span class="legend-dot" style="background:var(--expense)"></span>Gider</div>' +
      (hasFutureTrend ? '<div class="legend-item"><span class="legend-dot legend-dot-planned"></span>Planlanan</div>' : '') +
      '</div>';
    html += '</div>';

    html += '<div class="section-title">Gelir Dağılımı</div><div class="card">';
    if(!incRows.length){ html += renderEmpty('Bu ay gelir kaydı yok.'); }
    else {
      var maxInc = Math.max.apply(null, incRows.map(function(r){return r.amount;}).concat([1]));
      incRows.forEach(function(r){
        html += '<div class="bar-row"><div class="bhead"><span>' + esc(r.cat.name) + '</span><span class="num">' + fmtTRY(r.amount) + '</span></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + (r.amount/maxInc*100) + '%;background:' + slotColor(r.cat.slot) + '"></div></div></div>';
      });
    }
    html += '</div>';

    html += '<div class="section-title">Kişiye Göre Harcama</div><div class="card">';
    var personRows = personBreakdown(mk);
    if(!personRows.length){ html += renderEmpty('Bu ay kişiye bağlı hareket yok.'); }
    else {
      var maxPersonExp = Math.max.apply(null, personRows.map(function(r){return r.expense+r.plannedExpense;}).concat([1]));
      personRows.forEach(function(r, idx){
        html += '<div class="bar-row"><div class="bhead"><span>' + esc(r.name) + '</span><span class="num">Gider ' + fmtTRY(r.expense) + (r.income ? ' · Gelir ' + fmtTRY(r.income) : '') +
          (r.plannedExpense>0 ? ' <span class="mute2">(+' + fmtTRY(r.plannedExpense) + ' planlanan gider)</span>' : '') +
          (r.plannedIncome>0 ? ' <span class="mute2">(+' + fmtTRY(r.plannedIncome) + ' planlanan gelir)</span>' : '') + '</span></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + (r.expense/maxPersonExp*100) + '%;background:' + slotColor(idx) + '"></div>' +
          (r.plannedExpense>0 ? '<div class="bar-fill bar-fill-planned" style="width:' + (r.plannedExpense/maxPersonExp*100) + '%;background:' + slotColor(idx) + '"></div>' : '') +
          '</div></div>';
      });
    }
    html += '</div>';

    html += renderCashFlowProjectionSection();
    html += renderYearlySummarySection();

    html += renderGoalsSection();

    html += '<div class="section-title">Hesap Bakiyeleri</div>';
    html += renderAssetBreakdownCard();

    return html;
  }

  /* Bir kategori satırının altına, bütçe tanımlıysa "Bütçe: X ₺ · %Y kullanıldı"
     bilgisini (aşım/yaklaşma durumuna göre renkli) ekler. */
  function renderBudgetLine(b){
    if(!b) return '';
    var color = b.level==='over' ? 'var(--expense)' : (b.level==='warn' ? '#c47a00' : 'var(--mute)');
    var msg = b.level==='over'
      ? 'Bütçe aşıldı: ' + fmtTRY(b.spent) + ' / ' + fmtTRY(b.limit) + ' (%' + b.pct.toFixed(0) + ')'
      : 'Bütçe: ' + fmtTRY(b.spent) + ' / ' + fmtTRY(b.limit) + ' · %' + b.pct.toFixed(0) + ' kullanıldı';
    return '<div class="mute2 budget-line" style="margin-top:2px;color:' + color + '">' + msg + '</div>';
  }

  /* Özet ekranında, cari ay için bütçesinin %80\'ine ulaşmış veya aşmış
     kategorileri gösteren uyarı banner\'ı (madde 4). */
  function renderBudgetWarningBanner(){
    var flagged = budgetStatusForMonth(currentMonthKey()).filter(function(b){ return b.level!=='ok'; });
    if(!flagged.length) return '';
    var html = '<div class="card recur-banner budget-warning-banner">';
    html += '<div class="recur-banner-head">' + icon('target') + '<span>Bütçe Durumu — ' + esc(monthLabel(currentMonthKey())) + '</span></div>';
    flagged.forEach(function(b){
      var color = b.level==='over' ? 'var(--expense)' : '#c47a00';
      var desc = b.level==='over'
        ? 'Limit aşıldı: ' + fmtTRY(b.spent) + ' / ' + fmtTRY(b.limit)
        : '%' + b.pct.toFixed(0) + ' kullanıldı: ' + fmtTRY(b.spent) + ' / ' + fmtTRY(b.limit);
      html += '<div class="recur-item"><div class="recur-item-main"><div class="n" style="color:' + color + '">' + esc(b.cat.name) + '</div><div class="s">' + desc + '</div></div></div>';
    });
    html += '</div>';
    return html;
  }

  /* ---------------- AYARLAR ---------------- */
  /* Firebase modunda "Aile Üyeleri" bölümü: household'daki gerçek üyeler
     (state.people, Google profillerinden otomatik türetilir) + e-posta ile
     davet formu. Onay/red akışı yok — davet = doğrudan erişim, çünkü kimlik
     zaten Google ile doğrulanmış durumda. */
  function renderFbHouseholdSection(){
    var html = '';
    html += '<div class="section-title">Aile Üyeleri</div><div class="card">';
    state.people.forEach(function(p){
      var badges = '';
      if(p.isAdmin) badges += ' <span class="pill pill-neutral">Kurucu</span>';
      if(p.id===localIdentity) badges += ' <span class="mute2">(Siz)</span>';
      html += '<div class="switch-row"><span>' + esc(p.name) + badges + '</span></div>';
    });
    html += '</div>';
    html += '<form data-action="fb-invite" style="margin-top:10px;display:flex;gap:8px">' +
      '<input type="email" name="email" placeholder="davet@ornek.com" required style="flex:1">' +
      '<button class="btn btn-primary" type="submit">Davet Et</button></form>';
    html += '<p class="mute2" style="margin-top:6px">Davet ettiğiniz kişi kendi Google hesabıyla giriş yaptığında bu hane defterine otomatik katılır ve aynı verileri görür/düzenler. Davet edilmemiş biri kendi Google hesabıyla girerse, kendi ayrı ve boş bir hane defteriyle karşılaşır.</p>';
    return html;
  }

  /* ---------------- ŞİFRELER (Şifre Kasası) ----------------
     state.passwordVault = { salt, check:{iv,cipher}, entries:[{id,bank,iv,cipher,updatedAt}] }.
     Her entry'nin cipher'ı {username,password,notes} JSON'unun AES-GCM ile
     şifrelenmiş hâlidir. Ana şifre ve ondan türetilen anahtar (vaultKey)
     ASLA state'e/persist'e girmez — yalnızca bu sekme dolaşırken bellekte
     durur, sayfa yenilenince veya "Kilitle" denince kaybolur. */
  function renderSifreler(){
    var v = state.passwordVault || { salt:null, check:null, entries:[] };
    var html = '';
    if(!v.salt){
      html += '<div class="card">';
      html += '<h2 style="margin-bottom:6px">Şifre Kasası</h2>';
      html += '<p class="mute2">Banka ve site şifrelerinizi burada saklayabilirsiniz. Önce bir <b>ana şifre</b> belirleyin — bu, Google hesabınızdan tamamen bağımsızdır. Tüm şifreleriniz bu ana şifreyle cihazınızda şifrelenip öyle kaydedilir; sunucuya/veritabanına asla düz metin gitmez. <b>Ana şifreyi unutursanız kayıtlı şifrelere bir daha ulaşılamaz</b> — bir yere güvenle not edin.</p>';
      html += '<form data-action="vault-setup" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">' +
        '<div class="field"><label>Ana Şifre</label><input id="modal-first-input" type="password" name="password" minlength="6" required autocomplete="new-password"></div>' +
        '<div class="field"><label>Ana Şifre (Tekrar)</label><input type="password" name="password2" minlength="6" required autocomplete="new-password"></div>' +
        '<button type="submit" class="btn btn-primary">Kasayı Oluştur</button>' +
        '</form>';
      html += '</div>';
      return html;
    }
    if(!vaultKey){
      html += '<div class="card">';
      html += '<h2 style="margin-bottom:6px">Şifre Kasası Kilitli</h2>';
      html += '<p class="mute2">Devam etmek için ana şifrenizi girin.</p>';
      if(ui.vaultUnlockError) html += '<p class="mute2" style="color:var(--critical)">' + esc(ui.vaultUnlockError) + '</p>';
      html += '<form data-action="vault-unlock" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">' +
        '<div class="field"><label>Ana Şifre</label><input id="modal-first-input" type="password" name="password" required autocomplete="current-password"></div>' +
        '<button type="submit" class="btn btn-primary">Kilidi Aç</button>' +
        '</form>';
      html += '<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="vault-forgot">Ana şifremi unuttum</button>';
      html += '</div>';
      return html;
    }
    html += '<div class="row" style="margin-bottom:10px"><h2>Şifreleriniz</h2>' +
      '<button class="btn btn-ghost btn-sm" data-action="vault-lock">Kilitle</button></div>';
    var entries = (v.entries||[]).slice().sort(function(a,b){ return (a.bank||'').localeCompare(b.bank||'','tr'); });
    if(!entries.length){
      html += '<div class="empty-state"><p class="mute2">Henüz kayıtlı şifreniz yok.</p></div>';
    } else {
      html += '<div class="card" style="padding:0">';
      entries.forEach(function(entry){
        var revealed = ui.vaultReveal[entry.id];
        html += '<div class="row" style="padding:12px 14px;border-bottom:1px solid var(--border)">';
        html += '<div class="stack">';
        html += '<span style="font-weight:600">' + esc(entry.bank) + '</span>';
        if(revealed){
          if(revealed.username) html += '<span class="mute2">Kullanıcı: ' + esc(revealed.username) + '</span>';
          html += '<span class="mute2" style="font-family:&quot;IBM Plex Mono&quot;,monospace">' + esc(revealed.password) + '</span>';
          if(revealed.notes) html += '<span class="mute2">' + esc(revealed.notes) + '</span>';
        } else {
          html += '<span class="mute2" style="font-family:&quot;IBM Plex Mono&quot;,monospace">••••••••</span>';
        }
        html += '</div>';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">';
        html += '<button class="btn btn-ghost btn-sm" data-action="vault-toggle-reveal" data-id="' + entry.id + '">' + (revealed?'Gizle':'Göster') + '</button>';
        if(revealed) html += '<button class="btn btn-ghost btn-sm" data-action="vault-copy" data-id="' + entry.id + '">Kopyala</button>';
        html += '<button class="btn btn-ghost btn-sm" data-action="vault-edit" data-id="' + entry.id + '" aria-label="Düzenle">' + icon('edit') + '</button>';
        html += '<button class="btn btn-ghost btn-sm" data-action="vault-delete" data-id="' + entry.id + '" aria-label="Sil">' + icon('trash') + '</button>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    html += '<button class="btn btn-primary" style="margin-top:14px;width:100%" data-action="vault-add">' + icon('plus') + ' Yeni Şifre Ekle</button>';
    return html;
  }

  function renderVaultEntryForm(){
    var d = ui.modalData || {};
    var editing = !!d.id;
    var bankNames = [];
    state.accounts.forEach(function(a){ if(a.bankName && bankNames.indexOf(a.bankName)===-1) bankNames.push(a.bankName); });
    var datalist = '<datalist id="vault-bank-list">' + bankNames.map(function(n){ return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
    return '<div class="sheet-head"><h2>' + (editing ? 'Şifreyi Düzenle' : 'Yeni Şifre Ekle') + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<form data-action="vault-save">' +
      (editing ? '<input type="hidden" name="id" value="' + esc(d.id) + '">' : '') +
      '<div class="field"><label>Banka / Site Adı</label><input id="modal-first-input" type="text" name="bank" list="vault-bank-list" value="' + esc(d.bank||'') + '" required></div>' +
      datalist +
      '<div class="field"><label>Kullanıcı Adı (opsiyonel)</label><input type="text" name="username" value="' + esc(d.username||'') + '"></div>' +
      '<div class="field"><label>Şifre</label><input type="text" name="password" value="' + esc(d.password||'') + '" required style="font-family:&quot;IBM Plex Mono&quot;,monospace"></div>' +
      '<div class="field"><label>Not (opsiyonel)</label><textarea name="notes" rows="2">' + esc(d.notes||'') + '</textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Kaydet</button>' +
      '</form>';
  }

  function renderAyarlar(){
    var html = '';
    var me = localIdentity ? getPerson(localIdentity) : null;
    var isAdmin = !!(me && me.isAdmin);

    html += '<div class="section-title">Bu Cihaz</div><div class="card">';
    html += '<div class="switch-row"><span>Giriş yapan: ' + esc(me ? me.name : '—') +
      (BACKEND==='firebase' && fbUser && fbUser.email ? ' <span class="mute2">(' + esc(fbUser.email) + ')</span>' : '') + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="identity-logout">' + (BACKEND==='firebase' ? 'Çıkış Yap' : 'Kullanıcı Değiştir') + '</button></div>';
    html += '</div>';

    if(BACKEND === 'firebase'){
      html += renderFbHouseholdSection();
    } else {
      var pending = state.people.filter(function(p){ return !p.approved; });
      if(isAdmin && pending.length){
        html += '<div class="section-title">Onay Bekleyenler</div><div class="card">';
        pending.forEach(function(p){
          html += '<div class="switch-row"><span>' + esc(p.name) + ' <span class="pill pill-critical">Onay bekliyor</span></span>' +
            '<div style="display:flex;gap:4px;flex:none">' +
            '<button class="btn btn-primary btn-sm" data-action="approve-person" data-id="' + p.id + '">Onayla</button>' +
            '<button class="btn btn-ghost btn-sm" data-action="reject-person" data-id="' + p.id + '">Reddet</button>' +
            '</div></div>';
        });
        html += '</div>';
      }

      html += '<div class="section-title">Aile Üyeleri</div><div class="card">';
      if(!state.people.length) html += renderEmpty('Henüz kişi eklenmedi.');
      state.people.filter(function(p){ return p.approved; }).forEach(function(p){
        var badges = '';
        if(p.isAdmin) badges += ' <span class="pill pill-neutral">Yönetici</span>';
        if(p.id===localIdentity) badges += ' <span class="mute2">(Siz)</span>';
        html += '<div class="switch-row"><span>' + esc(p.name) + badges + '</span>';
        if(isAdmin && !ui.readOnly){
          html += '<div style="display:flex;gap:4px;flex:none">' +
            '<button class="btn btn-ghost btn-sm" data-action="toggle-admin" data-id="' + p.id + '">' + (p.isAdmin ? 'Yöneticiliği Kaldır' : 'Yönetici Yap') + '</button>' +
            '<button class="btn btn-ghost btn-sm" data-action="delete-person" data-id="' + p.id + '" aria-label="Sil">' + icon('trash') + '</button>' +
            '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
      if(isAdmin && !ui.readOnly){
        html += '<form data-action="add-person" style="margin-top:10px;display:flex;gap:8px">' +
          '<input type="text" name="name" placeholder="Yeni aile ferdi adı" required style="flex:1">' +
          '<button class="btn btn-primary" type="submit">Ekle</button></form>';
        html += '<p class="mute2" style="margin-top:6px">Buradan eklenen kişi doğrudan onaylanmış sayılır. Ailenin kendi cihazından "yeni kişiyim" diyerek erişim isteyenler yukarıda onay bekleyenler listesinde görünür.</p>';
      }
    }

    ['expense','income'].forEach(function(type){
      html += '<div class="section-title">' + (type==='expense'?'Gider Kategorileri':'Gelir Kategorileri') + '</div><div class="card">';
      var list = state.categories[type];
      list.forEach(function(c){
        html += '<div class="switch-row"><span style="display:flex;align-items:center;gap:8px"><span class="legend-dot" style="background:' + slotColor(c.slot) + '"></span>' + esc(c.name) + '</span>' +
          (ui.readOnly ? '' : '<button class="btn btn-ghost btn-sm" data-action="delete-category" data-type="' + type + '" data-id="' + c.id + '">' + icon('trash') + '</button>') +
          '</div>';
      });
      html += '</div>';
      if(!ui.readOnly){
        html += '<form data-action="add-category" data-type="' + type + '" style="margin-top:10px;display:flex;gap:8px">' +
          '<input type="text" name="name" placeholder="Yeni kategori" required style="flex:1">' +
          '<button class="btn btn-primary" type="submit">Ekle</button></form>';
      }
    });

    html += '<div class="section-title">Kart Ağları</div><div class="card">';
    if(!state.cardNetworks.length){ html += renderEmpty('Henüz kart ağı eklenmedi.'); }
    state.cardNetworks.forEach(function(n){
      var inUse = state.accounts.some(function(a){ return a.networkId===n.id; });
      html += '<div class="switch-row"><span>' + esc(n.name) + '</span>' +
        (ui.readOnly ? '' : '<button class="btn btn-ghost btn-sm" data-action="delete-card-network" data-id="' + n.id + '" data-inuse="' + (inUse?'1':'0') + '">' + icon('trash') + '</button>') +
        '</div>';
    });
    html += '</div>';
    if(!ui.readOnly){
      html += '<form data-action="add-card-network" style="margin-top:10px;display:flex;gap:8px">' +
        '<input type="text" name="name" placeholder="ör. Wings" required style="flex:1">' +
        '<button class="btn btn-primary" type="submit">Ekle</button></form>';
      html += '<p class="mute2" style="margin-top:6px">Kredi kartı eklerken bu listeden seçersiniz (Bonus, Axess, World gibi).</p>';
    }

    html += renderFxRatesSection();
    html += renderRecurringSection();
    html += renderBudgetSection();
    html += renderShareShortcutCard();

    html += '<div class="section-title">Veri</div><div class="card">';
    if(BACKEND==='firebase' && state.accounts.length<=1 && !state.transactions.length){
      html += '<div class="stack"><span>Eski sistemden veri içe aktar</span>' +
        '<span class="mute2">Claude Artifact sürümündeki Ayarlar > "Tüm veriyi yedekle" ile indirdiğiniz JSON dosyasını açıp içeriğini aşağıya yapıştırın.</span></div>' +
        '<form data-action="fb-restore-import" style="margin-top:8px;display:flex;flex-direction:column;gap:8px">' +
        '<textarea name="backup" rows="4" placeholder="Yedek JSON içeriğini buraya yapıştırın" style="font-family:&quot;IBM Plex Mono&quot;,monospace;font-size:0.76rem"></textarea>' +
        '<button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">İçe Aktar</button></form>';
    }
    if(!ui.readOnly){
      if(!state.resetPin){
        html += '<div class="row"><div class="stack"><span>Tüm verileri sıfırla</span><span class="mute2">Aktifleştirmek için önce bir PIN belirleyin.</span></div>' +
          '<button class="btn btn-sm" data-action="set-reset-pin">PIN Belirle</button>' +
          '</div>';
      } else {
        html += '<div class="row"><div class="stack"><span>Tüm verileri sıfırla</span><span class="mute2">Bu işlem geri alınamaz; PIN gerektirir.</span></div>' +
          '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-ghost btn-sm" data-action="set-reset-pin">PIN Değiştir</button>' +
          '<button class="btn btn-danger btn-sm" data-action="reset-data">Sıfırla</button>' +
          '</div></div>';
      }
    } else {
      html += '<div class="row"><div class="stack"><span>Tüm verileri sıfırla</span><span class="mute2">Bu işlem geri alınamaz.</span></div></div>';
    }
    html += '<div class="row" style="margin-top:10px"><div class="stack"><span>Hareketleri dışa aktar</span><span class="mute2">CSV — Excel\'de doğrudan açılabilir</span></div>' +
      '<button class="btn btn-sm" data-action="export-csv">' + icon('download') + ' CSV İndir</button></div>';
    html += '<div class="row" style="margin-top:10px"><div class="stack"><span>Tüm veriyi yedekle</span><span class="mute2">JSON — tüm hesap/hareket/ayarları içerir</span></div>' +
      '<button class="btn btn-sm" data-action="export-json">' + icon('download') + ' JSON İndir</button></div>';
    html += '<p class="mute2" style="margin-top:8px">Not: Bu platformda gerçek bir .xlsx (Excel ikili) dosyası üretilemiyor; CSV dosyası Excel\'de doğrudan açılır ve aynı işi görür.</p>';
    html += '</div>';

    html += renderAuditLogSection();

    html += '<p class="mute2" style="margin-top:18px;text-align:center">' +
      (BACKEND==='firebase' ? 'Hane defterinizdeki tüm üyeler aynı veriyi gerçek zamanlı paylaşır.' : 'Bu sayfa yayınlandığı andan itibaren tüm görüntüleyenler aynı veriyi paylaşır.') +
      '</p>';
    return html;
  }

  /* Kayıt geçmişi / denetim kaydı (madde 7): kişi bazlı yetkilendirme yerine,
     sadece "kim ne zaman ne yaptı" bilgisini gösteren salt-okunur bir liste.
     Herkese görünür (erişim kısıtlaması yok), en son 30 kayıt gösterilir. */
  function renderAuditLogSection(){
    var log = (state.auditLog||[]).slice().reverse();
    var html = '<div class="section-title">Kayıt Geçmişi</div><div class="card">';
    if(!log.length){
      html += renderEmpty('Henüz bir işlem kaydedilmedi.');
    } else {
      log.slice(0, 30).forEach(function(entry){
        html += '<div class="switch-row"><div class="stack"><span>' + esc(entry.summary) + '</span>' +
          '<span class="mute2">' + esc(entry.personName) + ' · ' + fmtDateTime(entry.ts) + '</span></div></div>';
      });
      if(log.length>30){ html += '<p class="mute2" style="padding-top:6px">Son 30 işlem gösteriliyor (toplam ' + log.length + ').</p>'; }
    }
    html += '</div>';
    return html;
  }

  /* ---------------- dışa aktarma (madde 8) ----------------
     Platform kısıtı: bu ortamda dosya indirme yeteneği yalnızca belirli
     uzantılara izin veriyor ve .xlsx bunların arasında DEĞİL — bu yüzden
     gerçek bir Excel (.xlsx) ikili dosyası üretilemez. Bunun yerine CSV
     üretilir (Excel'de doğrudan açılır, virgülle ayrılmış değer formatı
     zaten Excel'in kendi "farklı kaydet" seçeneklerinden biridir) ve tüm
     veri için ayrıca JSON yedeği sunulur. */
  function csvEscape(val){
    var s = (val==null ? '' : String(val));
    if(/[;"\n\r]/.test(s)) s = '"' + s.replace(/"/g,'""') + '"';
    return s;
  }
  function transactionsToCSV(){
    var header = ['Tarih','Tür','Tutar','Kategori','Hesap','Hedef Hesap','Kişi','Not','Etiketler','Durum'];
    var lines = [header.map(csvEscape).join(';')];
    state.transactions.slice().sort(function(a,b){ return a.date<b.date?-1:1; }).forEach(function(t){
      var acct = getAccount(t.accountId);
      var toAcct = t.toAccountId ? getAccount(t.toAccountId) : null;
      var cat = t.type!=='transfer' ? getCategory(t.type, t.categoryId) : null;
      var person = t.personId ? getPerson(t.personId) : null;
      var row = [
        t.date,
        t.type==='income'?'Gelir':(t.type==='expense'?'Gider':'Transfer'),
        t.amount,
        cat ? cat.name : '',
        acct ? acct.name : '',
        toAcct ? toAcct.name : '',
        person ? person.name : '',
        t.note || '',
        (t.tags||[]).join(', '),
        isPlanned(t) ? 'Planlandı' : 'Gerçekleşti'
      ];
      lines.push(row.map(csvEscape).join(';'));
    });
    return '﻿' + lines.join('\r\n');
  }
  function fullBackupJSON(){
    return JSON.stringify(state, null, 2);
  }
  /* Bağımsız siteye ilk geçişte (ya da genel olarak) eski bir sistemden
     ("Tüm veriyi yedekle" ile indirilmiş JSON dosyasının içeriği) veri
     içe aktarmak için kullanılır. Gerçek kullanıcı verisi HİÇBİR ZAMAN
     kod/kaynak dosyalarına gömülmez — kullanıcı kendi indirdiği yedeği
     kendi eliyle yapıştırır, bu yüzden git deposu/public repo hiçbir
     zaman gerçek finansal veri içermez. Kimlik (state.people) bilinçli
     olarak yedekten DEĞİL, mevcut Firebase oturumundan korunur. */
  function restoreFromBackupJSON(text){
    var parsed;
    try{ parsed = JSON.parse(text); } catch(e){ return { ok:false, error:'Geçersiz JSON — dosyanın tam içeriğini eksiksiz yapıştırdığınızdan emin olun.' }; }
    if(!parsed || typeof parsed!=='object' || !Array.isArray(parsed.accounts)){
      return { ok:false, error:'Bu bir hane defteri yedeği gibi görünmüyor ("accounts" alanı bulunamadı).' };
    }
    var restored;
    try{ restored = migrateState(JSON.parse(JSON.stringify(parsed))); }
    catch(e){ return { ok:false, error:'Yedek işlenemedi: ' + (e && e.message ? e.message : 'bilinmeyen hata') }; }
    var myPerson = state.people.find(function(p){ return p.id===localIdentity; });
    restored.people = myPerson ? [myPerson] : state.people;
    return { ok:true, state: restored };
  }
  /* Bağımsız barındırmada (Firebase modu) gerçek bir tarayıcı indirmesi
     yapılabilir (Claude Artifact'ın sandbox kısıtı burada yok) — standart
     Blob + geçici <a download> tekniği kullanılır. */
  function downloadViaBlob(filename, data, mime){
    try{
      var blob = new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch(e){ return false; }
  }
  function triggerExport(kind){
    var filename, data, mime;
    if(kind==='csv'){ filename = 'hane-defteri-hareketler-' + todayISO() + '.csv'; data = transactionsToCSV(); mime = 'text/csv;charset=utf-8'; }
    else { filename = 'hane-defteri-yedek-' + todayISO() + '.json'; data = fullBackupJSON(); mime = 'application/json;charset=utf-8'; }
    if(BACKEND === 'firebase'){
      if(downloadViaBlob(filename, data, mime)){
        showToast('İndirildi: ' + filename);
        logAudit('export', (kind==='csv'?'Hareketler CSV olarak':'Tüm veri JSON olarak') + ' dışa aktarıldı');
        persist();
      } else {
        showToast('İndirme başarısız oldu.');
      }
      return;
    }
    if(!downloadsApi){
      showToast('Dosya indirme bu görünümde kullanılamıyor. (Claude Artifact önizlemesinde veya bu sürümde desteklenmiyor olabilir.)');
      return;
    }
    downloadsApi.save({ filename: filename, data: data }).then(function(){
      showToast('İndirildi: ' + filename);
      logAudit('export', (kind==='csv'?'Hareketler CSV olarak':'Tüm veri JSON olarak') + ' dışa aktarıldı');
      persist();
    }).catch(function(err){
      if(err && err.code==='declined') return;
      showToast('İndirme başarısız: ' + (err && err.message ? err.message : 'bilinmeyen hata'));
    });
  }

  /* Döviz cinsinden (USD/EUR/Altın) hesapların TL karşılığını hesaplayabilmek
     için kullanıcının elle girdiği güncel kur — otomatik/online kur çekme yok,
     kullanıcı istediğinde burada günceller. */
  function renderFxRatesSection(){
    var html = '<div class="section-title">Döviz Kurları</div><div class="card">';
    html += '<p class="mute2" style="margin-bottom:10px">Döviz hesaplarınızın Net Varlık\'a TL karşılığıyla dahil edilebilmesi için 1 birimin kaç TL ettiğini girin. Kurlar otomatik güncellenmez, elle girdiğiniz değer sabit kalır.</p>';
    if(ui.readOnly){
      ['USD','EUR','ALTIN'].forEach(function(code){
        var r = fxRateFor(code);
        html += '<div class="switch-row"><span>1 ' + CURRENCY_MAP[code].label + '</span><span class="mute2">' + (r!=null ? fmtTRY(r) : 'Girilmemiş') + '</span></div>';
      });
    } else {
      html += '<form data-action="save-fx-rates">';
      ['USD','EUR','ALTIN'].forEach(function(code){
        var cur = state.fxRates && state.fxRates[code];
        html += '<div class="field-row field"><div><label>1 ' + CURRENCY_MAP[code].label + ' (TL)</label>' +
          '<input class="amount-input" type="number" min="0" step="0.01" name="rate_' + code + '" value="' + (cur!=null ? cur : '') + '" placeholder="ör. ' + (code==='ALTIN'?'4200':'34.50') + '"></div></div>';
      });
      html += '<button type="submit" class="btn btn-primary btn-block">Kurları Kaydet</button>';
      html += '</form>';
    }
    html += '</div>';
    return html;
  }

  function renderRecurringSection(){
    var html = '<div class="section-title">Düzenli Ödemeler</div><div class="card">';
    if(!state.recurring.length){
      html += renderEmpty('Henüz düzenli ödeme veya taksit eklenmedi.');
    } else {
      state.recurring.forEach(function(r){
        var acct = getAccount(r.accountId);
        var cat = getCategory(r.type, r.categoryId);
        var sub = [r.type==='income'?'Gelir':'Gider', fmtTRY(r.amount)];
        if(cat) sub.push(cat.name);
        sub.push('Her ayın ' + r.day + '. günü');
        sub.push(acct ? acct.name : 'Hesap silinmiş');
        if(r.totalInstallments) sub.push((r.totalInstallments - r.installmentsRemaining) + '/' + r.totalInstallments + ' taksit ödendi');
        if(!r.active) sub.push('Duraklatıldı');
        html += '<div class="switch-row"><div class="stack"><span>' + esc(r.name) + '</span><span class="mute2">' + sub.map(esc).join(' · ') + '</span></div>' +
          (ui.readOnly ? '' : '<div style="display:flex;gap:4px;flex:none">' +
            '<button class="btn btn-ghost btn-sm" data-action="toggle-recurring" data-id="' + r.id + '">' + (r.active ? 'Duraklat' : 'Etkinleştir') + '</button>' +
            '<button class="btn btn-ghost btn-sm" data-action="delete-recurring" data-id="' + r.id + '" aria-label="Sil">' + icon('trash') + '</button>' +
            '</div>') +
          '</div>';
      });
    }
    html += '</div>';
    if(!ui.readOnly){
      if(!ui.recurringForm){
        html += '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn btn-ghost btn-sm" data-action="recurring-new" data-type="expense">' + icon('plus') + ' Gider Ekle</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="recurring-new" data-type="income">' + icon('plus') + ' Gelir Ekle</button>' +
          '</div>';
      } else {
        html += renderRecurringForm();
      }
    }
    return html;
  }

  function renderRecurringForm(){
    var f = ui.recurringForm;
    var cats = f.type==='income' ? state.categories.income : state.categories.expense;
    var html = '<div class="card" style="margin-top:10px"><form data-action="save-recurring">';
    html += '<div class="field"><label>Ad</label><input id="modal-first-input" type="text" name="name" placeholder="' + (f.type==='income'?'ör. Kira Geliri':'ör. Kira') + '" value="' + esc(f.name||'') + '" required></div>';
    html += '<div class="field-row field"><div><label>Tutar</label><input class="amount-input" type="number" min="0" step="0.01" name="amount" value="' + (f.amount!=null?f.amount:'') + '" required></div>' +
      '<div><label>Ayın Günü</label><input type="number" min="1" max="28" name="day" value="' + (f.day||1) + '" required></div></div>';
    html += '<div class="field"><label>Kategori</label><select name="categoryId" required>' + cats.map(function(c){ return '<option value="' + c.id + '"' + (f.categoryId===c.id?' selected':'') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>';
    html += '<div class="field-row field"><div><label>Hesap</label><select name="accountId" required>' + accountOptions(f.accountId, null) + '</select></div>' +
      '<div><label>Kişi</label><select name="personId">' + personOptions(f.personId) + '</select></div></div>';
    html += '<input type="hidden" name="type" value="' + f.type + '">';
    html += '<div style="display:flex;gap:10px"><button type="button" class="btn" data-action="recurring-form-cancel">Vazgeç</button><button type="submit" class="btn btn-primary btn-block">Kaydet</button></div>';
    html += '</form></div>';
    return html;
  }

  function renderBudgetSection(){
    var html = '<div class="section-title">Bütçe (Gider Kategorileri)</div><div class="card">';
    if(!state.categories.expense.length){
      html += renderEmpty('Henüz gider kategorisi yok.');
    } else {
      html += '<form data-action="save-budgets">';
      state.categories.expense.forEach(function(c){
        html += '<div class="switch-row"><span style="display:flex;align-items:center;gap:8px"><span class="legend-dot" style="background:' + slotColor(c.slot) + '"></span>' + esc(c.name) + '</span>' +
          '<input class="amount-input" style="width:110px;text-align:right;flex:none" type="number" min="0" step="0.01" name="b_' + c.id + '" placeholder="Limit yok" value="' + (state.budgets[c.id]!=null?state.budgets[c.id]:'') + '"' + (ui.readOnly?' disabled':'') + '></div>';
      });
      if(!ui.readOnly) html += '<button type="submit" class="btn btn-primary btn-block" style="margin-top:10px">Bütçeleri Kaydet</button>';
      html += '</form>';
    }
    html += '</div>';
    return html;
  }

  function renderShareShortcutCard(){
    return '<div class="section-title">Paylaşım &amp; Kısayol</div><div class="card">' +
      '<p class="mute2" style="margin-bottom:8px">Eşinizin bu sayfaya erişmesi için sayfanın paylaşım menüsünden ona erişim verin — Claude hesabıyla (Google ile girişte dahil) oturum açması yeterli.</p>' +
      '<p class="mute2">Telefonun ana ekranına kısayol eklemek için: Chrome (Android) ⋮ menüsü → "Ana ekrana ekle"; Safari (iPhone) Paylaş → "Ana Ekrana Ekle".</p>' +
      '</div>';
  }

  /* ---------------- HEDEFLER ---------------- */
  function renderGoalsSection(){
    var html = '<div class="section-title">Hedefler</div><div class="card">';
    if(!state.goals.length){
      html += renderEmpty('Henüz bir birikim hedefi eklenmedi.');
    } else {
      state.goals.forEach(function(g){
        var pct = g.target>0 ? clamp(g.current/g.target,0,1) : 0;
        html += '<div class="goal-card">' +
          '<div class="goal-head"><span class="n">' + esc(g.name) + '</span>' +
          (ui.readOnly ? '' : '<div style="display:flex;gap:4px;flex:none">' +
            '<button class="btn btn-ghost btn-sm" data-action="edit-goal" data-id="' + g.id + '" aria-label="Düzenle">' + icon('edit') + '</button>' +
            '<button class="btn btn-ghost btn-sm" data-action="delete-goal" data-id="' + g.id + '" aria-label="Sil">' + icon('trash') + '</button></div>') +
          '</div>' +
          '<div class="bar-track" style="margin:8px 0"><div class="bar-fill" style="width:' + (pct*100) + '%;background:var(--income)"></div></div>' +
          '<div class="mute2">' + fmtTRY(g.current) + ' / ' + fmtTRY(g.target) + ' · %' + Math.round(pct*100) + '</div>' +
          (g.note ? '<div class="mute2" style="margin-top:2px">' + esc(g.note) + '</div>' : '') +
          '</div>';
      });
    }
    html += '</div>';
    if(!ui.readOnly){
      if(!ui.goalForm){
        html += '<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="goal-new">' + icon('target') + ' Hedef Ekle</button>';
      } else {
        html += renderGoalForm();
      }
    }
    return html;
  }

  function renderGoalForm(){
    var g = ui.goalForm || {};
    var html = '<div class="card" style="margin-top:10px"><form data-action="save-goal">';
    html += '<div class="field"><label>Hedef Adı</label><input id="modal-first-input" type="text" name="name" value="' + esc(g.name||'') + '" placeholder="ör. Yılbaşı Tatili" required></div>';
    html += '<div class="field-row field"><div><label>Hedef Tutar</label><input class="amount-input" type="number" min="0" step="0.01" name="target" value="' + (g.target!=null?g.target:'') + '" required></div>' +
      '<div><label>Mevcut Tutar</label><input class="amount-input" type="number" min="0" step="0.01" name="current" value="' + (g.current!=null?g.current:'0') + '"></div></div>';
    html += '<div class="field"><label>Not (opsiyonel)</label><input type="text" name="note" value="' + esc(g.note||'') + '"></div>';
    html += '<input type="hidden" name="id" value="' + esc(g.id||'') + '">';
    html += '<div style="display:flex;gap:10px"><button type="button" class="btn" data-action="goal-form-cancel">Vazgeç</button><button type="submit" class="btn btn-primary btn-block">Kaydet</button></div>';
    html += '</form></div>';
    return html;
  }

  /* ---------------- MODAL: hareket formu ---------------- */
  function renderModal(){
    if(!ui.modal) return '';
    var inner = '';
    if(ui.modal==='tx') inner = renderTxForm();
    else if(ui.modal==='account') inner = renderAccountForm();
    else if(ui.modal==='accountDetail') inner = renderAccountDetail();
    else if(ui.modal==='confirm') inner = renderConfirm();
    else if(ui.modal==='postpone') inner = renderPostponeForm();
    else if(ui.modal==='setResetPin') inner = renderSetResetPinForm();
    else if(ui.modal==='resetConfirm') inner = renderResetConfirm();
    else if(ui.modal==='bulkImport') inner = renderBulkImportForm();
    else if(ui.modal==='vaultEntry') inner = renderVaultEntryForm();
    return '<div class="sheet-overlay" data-action="overlay-close">' +
      '<div class="sheet" role="dialog" aria-modal="true">' + inner + '</div></div>';
  }

  /* Toplu kayıt girişi modalı — iki adım: (1) yapıştırma alanı, (2) önizleme
     ve içe aktarma. ui.bulkImport = { text, step:'input'|'preview', rows }. */
  function renderBulkImportForm(){
    var bi = ui.bulkImport || { text:'', step:'input', rows:[] };
    var html = '<div class="sheet-head"><h2>Toplu Kayıt Girişi</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>';

    if(bi.step==='input'){
      html += '<p class="mute2">Bir ekstre veya Excel tablosunu doğrudan yapıştırabilirsiniz. Her satır bir kayıt olur, sütunlar TAB (Excel\'den kopyala-yapıştır) veya <b>;</b> ile ayrılmalı:</p>';
      html += '<p class="mute2" style="font-family:monospace;background:var(--surface2,#f2f2f2);padding:8px;border-radius:8px;overflow-x:auto;white-space:pre">Tarih;Tür;Tutar;Kategori;Hesap;Kişi (ops);Not (ops)\n2026-08-15;Gider;350,00;Market / Gıda;Nakit;Ergin;Haftalık market</p>';
      html += '<p class="mute2">Tarih olarak <b>YYYY-AA-GG</b> veya <b>GG.AA.YYYY</b>; tutar olarak <b>350,00</b> veya <b>350.00</b> yazılabilir. Kategori ve hesap adları Ayarlar/Hesaplar\'da tanımlı isimlerle birebir (büyük/küçük harf önemsiz) eşleşmeli.</p>';
      html += '<div class="field"><textarea id="bulk-import-textarea" rows="8" placeholder="Verinizi buraya yapıştırın..." style="width:100%;font-family:monospace;font-size:0.85rem">' + esc(bi.text||'') + '</textarea></div>';
      html += '<div style="display:flex;gap:10px"><button type="button" class="btn" data-action="close-modal">Vazgeç</button>' +
        '<button type="button" class="btn btn-primary btn-block" data-action="bulk-import-preview">Önizle</button></div>';
    } else {
      var okRows = bi.rows.filter(function(r){ return r.ok; });
      var badRows = bi.rows.filter(function(r){ return !r.ok; });
      var warnRows = okRows.filter(function(r){ return r.error; });
      html += '<p class="mute2">' + okRows.length + ' kayıt içe aktarılacak' + (badRows.length ? ', ' + badRows.length + ' satır hata nedeniyle atlanacak' : '') + (warnRows.length ? ' (' + warnRows.length + ' tanesinde uyarı var)' : '') + '.</p>';
      html += '<div style="max-height:340px;overflow-y:auto;border:1px solid var(--border,#ddd);border-radius:8px">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.82rem">';
      bi.rows.forEach(function(r){
        var bg = !r.ok ? 'background:rgba(220,50,50,0.08)' : (r.error ? 'background:rgba(230,180,0,0.12)' : '');
        html += '<tr style="' + bg + '"><td style="padding:6px 8px;vertical-align:top;white-space:nowrap;color:var(--mute)">#' + r.lineNo + '</td>';
        if(r.ok){
          var t = r.tx;
          html += '<td style="padding:6px 8px;vertical-align:top">' + fmtDate(t.date) + ' · ' + (t.type==='income'?'Gelir':'Gider') + ' · ' + fmtTRY(t.amount) + ' · ' + esc(t.categoryName) + ' · ' + esc(t.accountName) + (t.personName ? ' · ' + esc(t.personName) : '') + (t.note ? ' · ' + esc(t.note) : '') +
            (r.error ? '<div class="mute2" style="color:#a67c00">' + esc(r.error) + '</div>' : '') + '</td>';
        } else {
          html += '<td style="padding:6px 8px;vertical-align:top"><div>' + esc(r.raw) + '</div><div class="mute2" style="color:var(--expense)">' + esc(r.error) + '</div></td>';
        }
        html += '</tr>';
      });
      if(!bi.rows.length){ html += '<tr><td style="padding:10px">Ayrıştırılacak satır bulunamadı.</td></tr>'; }
      html += '</table></div>';
      html += '<div style="display:flex;gap:10px;margin-top:12px"><button type="button" class="btn" data-action="bulk-import-back">Geri</button>' +
        '<button type="button" class="btn btn-primary btn-block" data-action="bulk-import-commit"' + (okRows.length ? '' : ' disabled') + '>' + okRows.length + ' Kaydı İçe Aktar</button></div>';
    }
    return html;
  }

  function renderConfirm(){
    var d = ui.modalData || {};
    return '<div class="confirm-card">' +
      '<h2 style="margin-bottom:8px">' + esc(d.title||'Emin misiniz?') + '</h2>' +
      '<p class="muted">' + esc(d.message||'') + '</p>' +
      '<div class="confirm-actions">' +
      '<button class="btn" data-action="close-modal">Vazgeç</button>' +
      '<button class="btn btn-danger" data-action="confirm-yes">Sil</button>' +
      '</div></div>';
  }

  /* "Tüm verileri sıfırla" bir PIN ile korunuyor: PIN belirlenmeden Sıfırla
     düğmesi hiç görünmüyor (Ayarlar'da), PIN belirlendikten sonra da her
     sıfırlama denemesinde doğru PIN'in yeniden girilmesi gerekiyor. Diğer
     isim-bazlı giriş perdesi gibi bu da gerçek bir güvenlik önlemi değil,
     yanlışlıkla tüm verinin silinmesini zorlaştıran bir sürtünme adımı. */
  function renderSetResetPinForm(){
    var editing = !!state.resetPin;
    return '<div class="sheet-head"><h2>' + (editing ? 'PIN\'i Değiştir' : 'Sıfırlama PIN\'i Belirle') + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<p class="muted" style="margin:-4px 0 14px">Bu PIN, "Tüm verileri sıfırla" işlemini onaylamak için istenecek. 4-8 haneli bir sayı belirleyin.</p>' +
      '<form data-action="save-reset-pin">' +
      '<div class="field"><label>' + (editing ? 'Yeni PIN' : 'PIN') + '</label><input id="modal-first-input" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" name="pin" required></div>' +
      '<div class="field"><label>' + (editing ? 'Yeni PIN (Tekrar)' : 'PIN (Tekrar)') + '</label><input type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" name="pinConfirm" required></div>' +
      (editing ? '<div class="field"><label>Mevcut PIN</label><input type="password" inputmode="numeric" pattern="[0-9]*" name="currentPin" required></div>' : '') +
      '<button type="submit" class="btn btn-primary btn-block">Kaydet</button>' +
      '</form>';
  }

  function renderResetConfirm(){
    var d = ui.modalData || {};
    return '<div class="sheet-head"><h2>' + esc(d.title||'Tüm verileri sıfırla') + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<p class="muted" style="margin:-4px 0 14px">' + esc(d.message||'') + '</p>' +
      '<form data-action="confirm-reset-pin">' +
      '<div class="field"><label>PIN</label><input id="modal-first-input" type="password" inputmode="numeric" pattern="[0-9]*" name="pin" required></div>' +
      '<div style="display:flex;gap:10px;margin-top:6px">' +
      '<button type="button" class="btn" data-action="close-modal">Vazgeç</button>' +
      '<button type="submit" class="btn btn-danger btn-block">Sıfırla</button>' +
      '</div></form>';
  }

  function renderPostponeForm(){
    var d = ui.modalData || {};
    return '<div class="sheet-head"><h2>Ertele</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<form data-action="save-postpone">' +
      '<div class="field"><label>Yeni Tarih</label><input id="modal-first-input" type="date" name="date" value="' + esc(d.date||todayISO()) + '" required></div>' +
      '<input type="hidden" name="id" value="' + esc(d.id||'') + '">' +
      '<button type="submit" class="btn btn-primary btn-block">Ertele</button>' +
      '</form>';
  }

  function renderTxForm(){
    var d = ui.modalData || {};
    var editing = !!d.id;
    var type = d.type || 'expense';
    var payCard = !!d.payCardMode;
    var cats = type==='income' ? state.categories.income : state.categories.expense;
    var cardAcct = payCard ? getAccount(d.toAccountId) : null;
    var title = payCard ? ((cardAcct && cardAcct.type==='loan_taken') ? 'Borç Ödemesi' : (cardAcct && cardAcct.type==='loan_account') ? 'Kredi Ödemesi' : 'Kart Ödemesi') : (editing ? 'Hareketi Düzenle' : 'Yeni Hareket');
    var html = '<div class="sheet-head"><h2>' + title + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>';

    if(!payCard){
      html += '<div class="seg field" role="group" aria-label="Hareket türü">';
      [['expense','Gider'],['income','Gelir'],['transfer','Transfer']].forEach(function(o){
        html += '<button type="button" data-action="tx-type" data-val="' + o[0] + '" aria-pressed="' + (type===o[0]) + '">' + o[1] + '</button>';
      });
      html += '</div>';
    } else {
      html += '<p class="muted" style="margin:-6px 0 16px">' + esc(cardAcct ? cardAcct.name : '') + ' için yapılacak ödeme. Ödeme yapılan hesabın bakiyesi düşer, borç aynı tutarda azalır.</p>';
    }

    if(!payCard && !editing && state.templates.length){
      html += '<div class="field"><label>Şablonlar</label><div class="tmpl-row">';
      state.templates.forEach(function(tp){
        html += '<div class="tmpl-chip-wrap"><button type="button" class="tmpl-chip" data-action="apply-template" data-id="' + tp.id + '">' + esc(tp.name) + '</button>' +
          '<button type="button" class="tmpl-del" data-action="delete-template" data-id="' + tp.id + '" aria-label="Şablonu sil">' + icon('x') + '</button></div>';
      });
      html += '</div></div>';
    }

    html += '<form data-action="save-tx">';
    html += '<div class="field"><label>Tutar</label><input id="modal-first-input" class="amount-input" type="number" min="0" step="0.01" name="amount" placeholder="0,00" value="' + (d.amount!=null?d.amount:'') + '" required></div>';

    if(type!=='transfer'){
      html += '<div class="field">';
      html += '<div class="cat-field-head"><label>Kategori</label><button type="button" class="cat-edit-toggle" data-action="tx-cat-edit-toggle">' + (ui.txCatEditMode ? 'Bitti' : 'Düzenle') + '</button></div>';
      html += '<div class="cat-grid">';
      cats.forEach(function(c){
        html += '<div class="cat-opt-wrap' + (ui.txCatEditMode ? ' editing' : '') + '">' +
          '<button type="button" class="cat-opt" data-action="tx-cat" data-val="' + c.id + '" aria-pressed="' + (d.categoryId===c.id) + '"><span style="background:' + slotColor(c.slot) + '"></span>' + esc(c.name) + '</button>' +
          (ui.txCatEditMode ? '<button type="button" class="cat-del" data-action="delete-category-inline" data-type="' + type + '" data-id="' + c.id + '" aria-label="Kategoriyi sil">' + icon('x') + '</button>' : '') +
          '</div>';
      });
      if(!ui.txCatEditMode && !ui.txCatAdding){
        html += '<button type="button" class="cat-opt cat-opt-add" data-action="tx-cat-add-toggle">' + icon('plus') + ' Yeni</button>';
      }
      html += '</div>';
      if(ui.txCatAdding){
        html += '<div class="cat-add-row"><input type="text" id="tx-cat-add-input" placeholder="Yeni kategori adı">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="tx-cat-add-save" data-type="' + type + '">Ekle</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="tx-cat-add-cancel">Vazgeç</button></div>';
      }
      html += '<input type="hidden" name="categoryId" value="' + esc(d.categoryId||'') + '"></div>';
    }

    html += '<div class="field-row field">';
    /* Krediler (loan_account) hesaplar/kartlar gibi doğrudan gider/gelir girişine
       konu olamaz — sadece "Ödeme Yap" (transfer, payCard modu) ile azalır; bu
       yüzden gider/gelir formunda Hesap seçiminden hariç tutulur. */
    html += '<div><label>' + (type==='transfer' ? (payCard ? 'Nereden Ödenecek' : 'Kaynak Hesap') : 'Hesap') + '</label><select name="accountId" required>' + accountOptions(d.accountId, payCard ? ['card','loan_taken','loan_account'] : (type!=='transfer' ? ['loan_account'] : null)) + '</select></div>';
    if(type==='transfer'){
      if(payCard){
        html += '<div><label>Hedef Hesap</label><input type="text" value="' + esc(cardAcct ? cardAcct.name : '') + '" disabled>' +
          '<input type="hidden" name="toAccountId" value="' + esc(d.toAccountId||'') + '"></div>';
      } else {
        html += '<div><label>Hedef Hesap</label><select name="toAccountId" required>' + accountOptions(d.toAccountId, null) + '</select></div>';
      }
    } else {
      html += '<div><label>Kişi</label><select name="personId">' + personOptions(d.personId) + '</select></div>';
    }
    html += '</div>';

    if(!payCard && !editing && type==='expense'){
      var selAcct = getAccount(d.accountId);
      if(selAcct && isDebtType(selAcct.type)){
        html += '<div class="field"><label class="checkbox-label"><input type="checkbox" name="installment" value="1"' + (d.installment?' checked':'') + '> Taksitli alışveriş</label></div>';
        if(d.installment){
          html += '<div class="field"><label>Taksit Sayısı</label><input type="number" min="2" max="36" name="installmentCount" value="' + (d.installmentCount||3) + '"></div>';
          var instHelp = 'Girilen tutar toplam tutar kabul edilir ve taksit sayısına bölünür. Tüm taksitler önceden oluşturulur; ilk taksit hemen kaydedilir, kalanı Hareketler\'de "Planlandı" olarak görünür ve vadesi geldiğinde Özet ekranından gerçekleşti/ertele ile onaylanır.';
          if(selAcct.type==='card'){
            instHelp += ' Her taksit, kartın hesap kesim/ödeme günü döngüsüne göre ilgili dönemin ödeme tarihine yerleştirilir (satın alma tarihine göre değil); girdiğiniz harcama tarihi de işlem tarihi olarak tüm taksitlerde ayrıca saklanır ve Hareketler\'de ödeme tarihinin yanında gösterilir.';
          }
          html += '<p class="helptext">' + instHelp + '</p>';
        }
      }
    }

    /* tekrarlanan gelir/gider: taksitli borç hesabı harcaması dışındaki tüm
       gelir/gider kayıtlarında kullanılabilir (kira, maaş, abonelik vb.). */
    if(!payCard && !editing && type!=='transfer'){
      var selAcct2 = getAccount(d.accountId);
      var eligibleForRepeat = !(type==='expense' && selAcct2 && isDebtType(selAcct2.type));
      if(eligibleForRepeat){
        html += '<div class="field"><label class="checkbox-label"><input type="checkbox" name="isRepeating" value="1"' + (d.isRepeating?' checked':'') + '> Tekrarlanan ' + (type==='income'?'gelir':'gider') + '</label></div>';
        if(d.isRepeating){
          html += '<div class="field-row field"><div><label>Sıklık</label><select name="repeatFreq">' +
            ['weekly','monthly','yearly'].map(function(f){
              var lbl = f==='weekly'?'Haftalık':(f==='yearly'?'Yıllık':'Aylık');
              return '<option value="' + f + '"' + ((d.repeatFreq||'monthly')===f?' selected':'') + '>' + lbl + '</option>';
            }).join('') + '</select></div>' +
            '<div><label>Kaç kez</label><input type="number" min="2" max="60" name="repeatCount" value="' + (d.repeatCount||10) + '"></div></div>';
          html += '<p class="helptext">Girilen tarihten başlayarak seçilen sıklıkta bu kadar kayıt önceden oluşturulur. Bugünden sonraki tarihli olanlar "planlandı" durumunda kalır; vadesi geldiğinde Özet ekranında gerçekleşti/ertele ile onaylarsınız.</p>';
        }
      }
    }

    html += '<div class="field-row field">';
    html += '<div><label>Tarih</label><input type="date" name="date" value="' + (d.date||todayISO()) + '" required></div>';
    html += '<div><label>Not (opsiyonel)</label><input type="text" name="note" value="' + esc(d.note||'') + '" placeholder="ör. market alışverişi"></div>';
    html += '</div>';

    /* tekrar eden harcama önerisi: aynı notla önceden girilmiş kayıt varsa,
       o kaydın kategori/kişisini tek tıkla uygulama imkânı sunulur. */
    if(!payCard && type!=='transfer'){
      html += noteSuggestionBoxHtml(d);
    }

    if(type!=='transfer'){
      html += '<div class="field"><label>Etiketler (virgülle ayırın, opsiyonel)</label><input type="text" name="tags" value="' + esc((d.tags||[]).join(', ')) + '" placeholder="ör. tatil, ortak harcama"></div>';
      html += '<div class="field"><label>Fiş / Fotoğraf (opsiyonel)</label>';
      if(d.receipt){
        html += '<div class="receipt-preview"><img src="' + d.receipt + '" alt="Fiş" data-action="view-receipt"><button type="button" class="btn btn-ghost btn-sm" data-action="remove-receipt" aria-label="Kaldır">' + icon('x') + '</button></div>';
      } else {
        html += '<input type="file" accept="image/*" id="receipt-input">';
      }
      html += '<input type="hidden" name="receipt" value="' + esc(d.receipt||'') + '"></div>';
    }

    if(!state.accounts.length){
      html += '<p class="helptext">Önce Hesaplar sekmesinden bir banka hesabı, kredi kartı veya ödeme sistemi eklemelisiniz.</p>';
    }

    if(!payCard && !editing){
      if(!ui.templateNaming){
        html += '<button type="button" class="btn btn-ghost btn-sm" style="margin-bottom:10px" data-action="save-template-toggle">' + icon('star') + ' Şablon Olarak Kaydet</button>';
      } else {
        html += '<div class="cat-add-row" style="margin-bottom:10px"><input type="text" id="template-name-input" placeholder="Şablon adı (ör. Market)">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="save-template-confirm">Kaydet</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="save-template-cancel">Vazgeç</button></div>';
      }
    }

    html += '<input type="hidden" name="id" value="' + esc(d.id||'') + '">';
    html += '<input type="hidden" name="type" value="' + type + '">';
    html += '<div style="display:flex;gap:10px;margin-top:6px">';
    if(editing){ html += '<button type="button" class="btn btn-danger" data-action="delete-tx" data-id="' + d.id + '">' + icon('trash') + '</button>'; }
    html += '<button type="submit" class="btn btn-primary btn-block"' + (!state.accounts.length?' disabled':'') + '>Kaydet</button>';
    html += '</div></form>';
    return html;
  }

  function accountOptions(sel, excludeTypes){
    var list = excludeTypes ? state.accounts.filter(function(a){ return excludeTypes.indexOf(a.type)===-1; }) : state.accounts;
    if(!list.length) return '<option value="">Hesap yok</option>';
    return list.map(function(a){
      return '<option value="' + a.id + '"' + (sel===a.id?' selected':'') + '>' + esc(a.name) + ' (' + ACC_TYPE_LABEL[a.type] + ')</option>';
    }).join('');
  }
  function personOptions(sel){
    var opts = '<option value="">—</option>';
    opts += state.people.map(function(p){ return '<option value="' + p.id + '"' + (sel===p.id?' selected':'') + '>' + esc(p.name) + '</option>'; }).join('');
    return opts;
  }

  function renderAccountForm(){
    var d = ui.modalData || {};
    var editing = !!d.id;
    var type = d.type || 'bank';
    var html = '<div class="sheet-head"><h2>' + (editing?'Hesabı Düzenle':'Hesap Ekle') + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>';
    html += '<div class="seg seg-scroll field" role="group" aria-label="Hesap türü">';
    [['bank','Banka Hesabı'],['cash','Nakit'],['card','Kredi Kartı'],['loan_account','Kredi'],['external','Ödeme Aracı'],['loan_given','Verilen Borç'],['loan_taken','Alınan Borç']].forEach(function(o){
      html += '<button type="button" data-action="acc-type" data-val="' + o[0] + '" aria-pressed="' + (type===o[0]) + '">' + o[1] + '</button>';
    });
    html += '</div>';
    html += '<form data-action="save-account">';
    var namePlaceholders = { card:'ör. Bonus Kart', external:'ör. Multinet, Edenred, Papara', cash:'ör. Cüzdan', bank:'ör. Ziraat Vadesiz', loan_given:'ör. Ahmete verilen borç', loan_taken:'ör. Ayşeden alınan borç', loan_account:'ör. İhtiyaç Kredisi' };
    html += '<div class="field"><label>Hesap Adı</label><input id="modal-first-input" type="text" name="name" value="' + esc(d.name||'') + '" placeholder="' + namePlaceholders[type] + '" required></div>';
    /* Yeni bir kredi (loan_account) açılırken "opening" alanı gösterilmez —
       toplam kredi, aşağıdaki Taksit Tutarı × Taksit Sayısı'ndan otomatik
       hesaplanır (bkz. save-account işleyicisi). Düzenlerken (mevcut bir
       kredinin kalan borcunu elle düzeltmek gerekebileceği için) alan yine
       gösterilir. */
    var showOpeningField = !(type==='loan_account' && !editing);
    if(showOpeningField){
      var openingLabel = type==='loan_account' ? 'Kalan Borç' : (isDebtType(type) ? 'Güncel Borç' : (type==='loan_given' ? 'Verilen Tutar' : 'Başlangıç Bakiyesi'));
      html += '<div class="field"><label>' + openingLabel + '</label><input class="amount-input" type="number" step="0.01" name="opening" value="' + (d.opening!=null?d.opening:'0') + '" required></div>';
    }

    if(type==='bank'){
      html += '<div class="field"><label>IBAN (opsiyonel)</label><input type="text" name="iban" value="' + esc(d.iban||'') + '" placeholder="TR__ ____ ____ ____ ____ ____ __"></div>';
      html += '<div class="field"><label>Hesap Türü</label><select name="termType">' +
        '<option value="vadesiz"' + (d.termType!=='vadeli'?' selected':'') + '>Vadesiz</option>' +
        '<option value="vadeli"' + (d.termType==='vadeli'?' selected':'') + '>Vadeli</option>' +
        '</select></div>';
      html += '<div class="field"><label>Avans Hesap Limiti (opsiyonel)</label><input class="amount-input" type="number" step="0.01" min="0" name="overdraftLimit" value="' + (d.overdraftLimit!=null?d.overdraftLimit:'') + '" placeholder="Sınırsız (boş bırakabilirsiniz)"></div>' +
        '<p class="helptext">Hesabın eksiye ne kadar düşebileceğini belirler; ör. 10.000 ₺ girilirse hesap en fazla −10.000 ₺\'ye kadar düşebilir. Boş bırakılırsa sınırsız eksiye düşebilir.</p>';
      html += '<div class="field"><label>Döviz Cinsi</label><select name="currency">' + CURRENCIES.map(function(c){ return '<option value="' + c[0] + '"' + ((d.currency||'TRY')===c[0]?' selected':'') + '>' + c[1] + '</option>'; }).join('') + '</select></div>';
    }
    if(type==='cash'){
      html += '<div class="field"><label>Döviz Cinsi</label><select name="currency">' + CURRENCIES.map(function(c){ return '<option value="' + c[0] + '"' + ((d.currency||'TRY')===c[0]?' selected':'') + '>' + c[1] + '</option>'; }).join('') + '</select></div>';
    }
    if(type==='card'){
      html += '<div class="field"><label>Kart Limiti</label><input class="amount-input" type="number" step="0.01" min="0" name="limit" value="' + (d.limit!=null?d.limit:'') + '"></div>';
      html += '<div class="field"><label>Banka Adı</label><input type="text" name="bankName" value="' + esc(d.bankName||'') + '" placeholder="ör. Garanti BBVA"></div>';
      html += '<div class="field"><label>Kredi Kartı Numarası (opsiyonel)</label><input type="text" name="cardNumber" value="' + esc(d.cardNumber||'') + '" placeholder="ör. 4022 xxxx xxxx 1234"></div>';
      html += '<div class="field"><label>Kart Ağı</label><select name="networkId">' +
        '<option value="">—</option>' +
        state.cardNetworks.map(function(n){ return '<option value="' + n.id + '"' + (d.networkId===n.id?' selected':'') + '>' + esc(n.name) + '</option>'; }).join('') +
        '</select></div>';
      if(!ui.cardNetAdding){
        html += '<button type="button" class="btn btn-ghost btn-sm" style="margin:-8px 0 14px" data-action="card-net-add-toggle">' + icon('plus') + ' Yeni Kart Ağı Ekle</button>';
      } else {
        html += '<div class="cat-add-row" style="margin:-8px 0 14px"><input type="text" id="card-net-add-input" placeholder="ör. Wings">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="card-net-add-save">Ekle</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="card-net-add-cancel">Vazgeç</button></div>';
      }
      html += '<div class="field-row field"><div><label>Hesap Kesim Tarihi</label><input type="number" min="1" max="28" name="statementDay" value="' + (d.statementDay||5) + '"></div>' +
        '<div><label>Ödeme Tarihi</label><input type="number" min="1" max="28" name="paymentDay" value="' + (d.paymentDay||10) + '"></div></div>';
      html += '<p class="helptext">Kesim tarihi ve öncesindeki harcamalar, ilgili dönemin ödeme gününe bütçelenir. Ödeme günü hafta sonuna denk gelirse bir sonraki pazartesiye kayar.</p>';
    }
    /* Kredi — YENİ MODEL (3 Eylül 2026 akşamından itibaren): gerçek bir banka
       kredisi gibi ele alınıyor, yalnızca taksit tutarı × sayısı değil,
       bankanın verdiği komple amortisman tablosu (Excel'den kopyala-yapıştır
       ile) içeri aktarılıyor. Kredi Tutarı alanı her iki durumda da (yeni/
       düzenleme) gösterilir; boş bırakılırsa tablodaki taksit toplamı
       kullanılır. Ödemenin hangi hesaptan yapılacağı burada sorulmaz; ödeme
       yapılacağı zaman "Ödeme Yap" ile hesap seçilir. */
    if(type==='loan_account'){
      html += '<div class="field"><label>Kredi Tutarı (opsiyonel)</label><input class="amount-input" type="number" step="0.01" min="0" name="principalOverride" value="' + (d.principalOverride!=null ? d.principalOverride : (d.principal!=null ? d.principal : '')) + '" placeholder="Boş bırakılırsa tablodaki taksit toplamı kullanılır"></div>';
    }
    if(type==='loan_account' && !editing){
      html += '<p class="helptext">Kredi artık gerçek bir banka kredisi gibi ele alınıyor: bankanızın verdiği amortisman/taksit tablosunu aşağıya yapıştırın (gerekirse önce Excel\'de hazırlayıp oradan kopyalayabilirsiniz). Kredi bir gider/gelir hesabı gibi çalışmaz; ödemenin hangi hesaptan yapılacağı burada sorulmaz, ödeme yapılacağı zaman "Ödeme Yap" ile hesap seçilir.</p>';
      html += renderLoanScheduleImportWidget(ui.loanImport);
    } else if(type==='loan_account' && editing){
      if(d.schedule && d.schedule.length){
        html += '<p class="helptext">' + loanPaidCount(d) + '/' + d.schedule.length + ' taksit ödendi (tabloya göre). Kalan borcu yukarıdaki "Kalan Borç" alanından elle düzeltebilir veya aşağıdan amortisman tablosunu yeniden içe aktarabilirsiniz — yeniden içe aktarırsanız Kalan Borç, yeni tablodaki taksit toplamına göre otomatik güncellenir.</p>';
      } else {
        html += '<p class="helptext">Bu kredi eski (basit) modelde kayıtlı' + (d.totalInstallments ? (': Taksit ' + fmtTRY(d.monthlyPayment||0) + ' · ' + loanPaidCount(d) + '/' + d.totalInstallments + ' taksit ödendi') : '') + '. Kalan borcu yukarıdaki "Kalan Borç" alanından elle düzeltebilir, ya da aşağıdan bankanızın verdiği gerçek amortisman tablosunu içe aktararak bu krediyi yeni modele yükseltebilirsiniz.</p>';
      }
      if(ui.loanImport){
        html += renderLoanScheduleImportWidget(ui.loanImport);
      } else {
        html += '<button type="button" class="btn btn-ghost btn-sm" data-action="loan-schedule-toggle">' + icon('upload') + ' Amortisman Tablosunu ' + (d.schedule && d.schedule.length ? 'Yeniden İçe Aktar' : 'İçe Aktar') + '</button>';
      }
    }
    html += '<input type="hidden" name="id" value="' + esc(d.id||'') + '">';
    html += '<input type="hidden" name="type" value="' + type + '">';
    html += '<div style="display:flex;gap:10px;margin-top:6px">';
    if(editing){ html += '<button type="button" class="btn btn-danger" data-action="delete-account" data-id="' + d.id + '">' + icon('trash') + '</button>'; }
    html += '<button type="submit" class="btn btn-primary btn-block">Kaydet</button>';
    html += '</div></form>';
    return html;
  }

  /* Bir hareketin belirli bir hesap üzerindeki etkisini (bakiyeye eklenen/
     çıkarılan tutar) hesaplar — accountBalance() içindeki mantığın hareket
     başına, o hesap özelinde tekrarı. */
  function accountTxDelta(t, acctId, acct){
    if(t.type==='income' && t.accountId===acctId) return t.amount;
    if(t.type==='expense' && t.accountId===acctId) return isDebtType(acct.type) ? t.amount : -t.amount;
    if(t.type==='transfer'){
      if(t.accountId===acctId) return -t.amount;
      if(t.toAccountId===acctId) return isDebtType(acct.type) ? -t.amount : t.amount;
    }
    return 0;
  }

  /* Bakiye kuralları: Nakit eksiye düşemez, Kredi Kartı (ve Kredi) limitin/borcun
     dışına çıkamaz, Banka hesabı serbestçe eksiye düşebilir (kural yok).
     Yalnızca YENİ gerçekleşen (planned olmayan) bir hareketin ANLIK etkisi için
     çağrılır — planlı bir kaydın ileri tarihte "gerçekleşti" ile onaylanması
     bu kontrolden geçmez (gerçek hayatta zaten olmuş bir şeyi kaydetmek engellenmez). */
  function checkBalanceRule(acct, delta, balanceBefore){
    if(!acct || !delta) return null;
    var newBal = balanceBefore + delta;
    var curCode = accountCurrency(acct);
    if(acct.type==='cash' && delta<0 && newBal < -0.004){
      return '"' + acct.name + '" nakit hesabı eksiye düşemez (bu işlemden sonra: ' + fmtCurrency(newBal, curCode) + ').';
    }
    /* Avans hesap limiti: banka hesabının ne kadar eksiye düşebileceğini sınırlar.
       Limit girilmemişse (null/undefined) eski davranış korunur: hesap serbestçe eksiye düşebilir. */
    if(acct.type==='bank' && delta<0 && acct.overdraftLimit!=null && acct.overdraftLimit>=0){
      if(newBal < -acct.overdraftLimit - 0.004){
        return '"' + acct.name + '" avans hesap limitini aşıyor (izin verilen en düşük bakiye: ' + fmtCurrency(-acct.overdraftLimit, curCode) + ').';
      }
    }
    if(isDebtType(acct.type) && acct.type!=='loan_taken' && delta>0){
      var limit = acct.limit || 0;
      if(limit>0 && newBal > limit + 0.004){
        return '"' + acct.name + '" limitinin dışında harcama yapılamaz (kullanılabilir: ' + fmtTRY(Math.max(limit-balanceBefore,0)) + ').';
      }
    }
    return null;
  }

  /* Bir kaydın (tek veya bir serinin ilk oluşan/gerçekleşen üyesinin) hesap(lar)
     üzerindeki anlık etkisini bakiye kurallarına göre doğrular. rec: {type,amount,accountId,toAccountId}. */
  function validateTxAgainstBalanceRules(rec, excludeTxId){
    if(rec.type==='income') return null; /* gelir hiçbir bakiyeyi olumsuz etkilemez */
    var acct = getAccount(rec.accountId);
    if(acct){
      var err = checkBalanceRule(acct, accountTxDelta(rec, acct.id, acct), accountBalance(acct.id, excludeTxId));
      if(err) return err;
    }
    if(rec.type==='transfer' && rec.toAccountId){
      var toAcct = getAccount(rec.toAccountId);
      if(toAcct){
        var err2 = checkBalanceRule(toAcct, accountTxDelta(rec, toAcct.id, toAcct), accountBalance(toAcct.id, excludeTxId));
        if(err2) return err2;
      }
    }
    return null;
  }

  function renderAccountTxRow(t, acct){
    var delta = accountTxDelta(t, acct.id, acct);
    var good = isDebtType(acct.type) ? delta<0 : delta>0;
    var label, sub;
    if(t.type==='transfer'){
      if(t.accountId===acct.id){
        var to = getAccount(t.toAccountId);
        label = isDebtType(acct.type) ? 'Borç artışı / transfer' : 'Transfer';
        sub = '→ ' + (to ? esc(to.name) : '—');
      } else {
        var from = getAccount(t.accountId);
        label = isDebtType(acct.type) ? 'Ödeme' : 'Transfer';
        sub = '← ' + (from ? esc(from.name) : '—');
      }
    } else {
      var info = txCategoryInfo(t);
      label = info.name;
      sub = t.note ? esc(t.note) : '';
    }
    sub = [sub, txDateLabel(t)].filter(Boolean).join(' · ');
    return '<div class="tx-row" data-action="open-tx" data-id="' + t.id + '">' +
      '<div class="tx-badge" style="background:var(--ink-mute)">' + esc(label.slice(0,1).toUpperCase()) + '</div>' +
      '<div class="tx-main"><div class="t">' + esc(label) + (t.receipt ? icon('camera','tag-camera') : '') + plannedBadge(t) + '</div><div class="s">' + sub + '</div>' + renderTagChips(t) + '</div>' +
      '<div class="tx-amt ' + (good?'income':'expense') + ' num">' + (good?'+':'−') + fmtTRY(Math.abs(delta)) + '</div>' +
      '</div>';
  }

  function renderAccountDetail(){
    var d = ui.modalData || {};
    var acct = getAccount(d.id);
    if(!acct){
      return '<div class="sheet-head"><h2>Hesap bulunamadı</h2>' +
        '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>' +
        '<p class="muted">Bu hesap silinmiş olabilir.</p>';
    }
    var bal = accountBalance(acct.id);
    var html = '<div class="sheet-head"><h2>' + esc(acct.name) + '</h2>' +
      '<button class="btn btn-ghost" data-action="close-modal" aria-label="Kapat">' + icon('x') + '</button></div>';
    html += '<span class="pill pill-neutral">' + ACC_TYPE_LABEL[acct.type] + '</span>';
    /* Kredi hesabı: Kredi Tutarı sayfanın en üstünde, bakiye figürünün
       üstünde otomatik gösterilir; figürün kendisi kalan borcu gösterir,
       altına da "Kalan Borç" açıklaması eklenir. Yeni model (schedule
       içe aktarılmış) ve eski basit model (monthlyPayment × totalInstallments)
       için ayrı hesaplanır. */
    if(acct.type==='loan_account'){
      var hasSched = acct.schedule && acct.schedule.length;
      var totalLoanAmt = hasSched
        ? (acct.principal!=null ? acct.principal : acct.schedule.reduce(function(s,r){ return s+r.payment; }, 0))
        : (acct.monthlyPayment||0) * (acct.totalInstallments||0);
      html += '<div class="mute2" style="margin-top:6px">Kredi Tutarı: <span class="num" style="font-weight:600;color:var(--ink)">' + fmtTRY(totalLoanAmt) + '</span></div>';
    }
    html += '<div class="detail-figure num" style="color:' + accountValueColor(acct, bal) + '">' + fmtCurrency(bal, accountCurrency(acct)) + '</div>';
    if(acct.type==='loan_account'){ html += '<div class="mute2" style="margin-top:-8px">Kalan Borç</div>'; }
    if(isForeignCurrencyAccount(acct)){
      var acctTL = toTRY(bal, accountCurrency(acct));
      html += '<div class="mute2" style="margin-top:-8px">' + (acctTL!=null ? '≈ ' + fmtTRY(acctTL) : 'TL karşılığı için Ayarlar\'dan kur girin') + '</div>';
    }
    html += accountExtraDetailsLine(acct);
    if(acct.type==='card'){ html += renderCardLimitBar(acct, bal); }
    if(acct.type==='loan_account'){ html += (acct.schedule && acct.schedule.length) ? renderLoanScheduleTable(acct) : renderLoanProgress(acct); }
    if(acct.type==='card' && acct.statementDay && acct.paymentDay){ html += renderCardPeriodBreakdown(acct); }

    if(!ui.readOnly){
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 4px">';
      html += '<button class="btn btn-sm" data-action="edit-account-from-detail" data-id="' + acct.id + '">' + icon('edit') + ' Düzenle</button>';
      /* Hızlı giriş: kredi kartında tek "Harcama Gir"; banka/nakit/ödeme aracında
         ayrı Gider Ekle + Gelir Ekle. Krediler (loan_account) ve Verilen/Alınan
         Borç hesaplarında doğrudan gider/gelir girişi yoktur — krediler sadece
         "Ödeme Yap" ile azalır. */
      if(acct.type==='card'){
        html += '<button class="btn btn-sm" data-action="quick-add-tx" data-type="expense" data-account-id="' + acct.id + '">' + icon('plus') + ' Harcama Gir</button>';
      } else if(acct.type==='bank' || acct.type==='cash' || acct.type==='external'){
        html += '<button class="btn btn-sm" data-action="quick-add-tx" data-type="expense" data-account-id="' + acct.id + '">' + icon('plus') + ' Gider Ekle</button>';
        html += '<button class="btn btn-sm" data-action="quick-add-tx" data-type="income" data-account-id="' + acct.id + '">' + icon('plus') + ' Gelir Ekle</button>';
      }
      if(isDebtType(acct.type)){
        html += '<button class="btn btn-primary btn-sm" data-action="pay-card" data-id="' + acct.id + '">' + icon('swap') + ' Ödeme Yap</button>';
      }
      html += '<button class="btn btn-danger btn-sm" data-action="delete-account" data-id="' + acct.id + '">' + icon('trash') + ' Sil</button>';
      html += '</div>';
    }

    html += '<div class="section-title" style="margin-top:18px">Hesap Hareketleri</div>';
    var txs = state.transactions.filter(function(t){ return t.accountId===acct.id || t.toAccountId===acct.id; })
      .sort(function(a,b){ return (b.date+b.id) < (a.date+a.id) ? -1 : 1; });
    if(!txs.length){
      html += renderEmpty('Bu hesaba ait hareket yok.');
    } else {
      html += txs.map(function(t){ return renderAccountTxRow(t, acct); }).join('');
    }
    return html;
  }

  /* ---------------- kaydetme / yayınlama ---------------- */
  function buildFullDocument(){
    var styleEl = document.getElementById('app-style');
    var scriptEl = document.getElementById('app-script');
    var linkTags = Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]'), function(l){ return l.outerHTML; }).join('\n');
    var stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
    return '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Yılmaz Hane Defteri</title>\n' +
      linkTags + '\n' + styleEl.outerHTML + '\n</head>\n<body>' +
      '<div id="app"></div>' +
      '<script id="app-state" type="application/json">' + stateJson + '<\/script>' +
      scriptEl.outerHTML +
      '</body></html>';
  }

  /* Seçilen fiş fotoğrafını küçültüp sıkıştırarak (maks. 640px genişlik,
     JPEG %60 kalite) küçük bir data URL'ye çevirir; sayfa boyutunun
     büyümemesi için gerekli. */
  function compressImageToDataUrl(file, cb){
    if(!file || !/^image\//.test(file.type)){ cb(null); return; }
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        var maxW = 640;
        var scale = Math.min(1, maxW / img.width);
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try{ cb(canvas.toDataURL('image/jpeg', 0.6)); }catch(e){ cb(null); }
      };
      img.onerror = function(){ cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function(){ cb(null); };
    reader.readAsDataURL(file);
  }

  function showToast(msg){
    ui.toast = msg;
    render();
    setTimeout(function(){ ui.toast = null; render(); }, 3200);
  }

  function persist(){
    try{ sessionStorage.setItem('hd_tab', ui.tab); }catch(e){}
    render();
    if(BACKEND === 'firebase'){
      if(!fbHouseholdRef || !state) return;
      fbHouseholdRef.update({ state: state, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function(err){
        showToast('Kaydedilemedi: ' + (err && err.message ? err.message : 'bilinmeyen hata'));
      });
      return;
    }
    if(!artifactReady){ return; }
    if(!artifactApi){
      if(!ui._noPersistWarned){ ui._noPersistWarned = true; showToast('Bu görünümde kalıcı kayıt kullanılamıyor; değişiklikler yalnızca bu oturumda tutulacak.'); }
      return;
    }
    var html = buildFullDocument();
    artifactApi.publish(html).then(function(){
      /* başarı: görünüm otomatik olarak yeni sürüme yenilenecek */
    }).catch(function(err){
      var code = err && err.code;
      if(code==='conflict'){ /* görünüm otomatik yenilenecek */ }
      else if(code==='not_writer' || code==='not_granted'){
        ui.readOnly = true;
        showToast('Bu görünüm salt okunur; değişiklikler kaydedilemiyor.');
      } else if(code==='rate_limited'){
        showToast('Çok hızlı kaydediliyor, birkaç saniye sonra tekrar deneyin.');
      } else {
        showToast('Kaydedilemedi: ' + (err && err.message ? err.message : 'bilinmeyen hata'));
      }
    });
  }

  /* ---------------- olay yönetimi ---------------- */
  function closeModal(){ ui.modal = null; ui.modalData = null; ui.txNoteSuggestion = null; render(); }

  /* bir alt-form (kategori/tür seçimi gibi) yeniden çizilmeden önce,
     kullanıcının o ana kadar girdiği alan değerlerini modalData'ya işler;
     aksi halde tam yeniden çizim daha önce yazılmış tutar/not gibi alanları siler. */
  function syncOpenFormIntoModalData(){
    var form = document.querySelector('.sheet form');
    if(!form) return;
    var fd = new FormData(form);
    var updates = {};
    fd.forEach(function(value, key){ updates[key] = value; });
    /* "tags" alanı form üzerinde virgülle ayrılmış tek bir metin girdisidir ama
       modalData'da her zaman dizi olarak tutulur (save-tx'teki nihai ayrıştırmayla
       aynı biçim) — aksi halde tags dizisi beklenen render kodları (ör. etiket
       alanı, (d.tags||[]).join(...)) string üzerinde çağrılıp hata verir. */
    if('tags' in updates){
      updates.tags = String(updates.tags||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    }
    ui.modalData = Object.assign({}, ui.modalData, updates);
  }

  document.addEventListener('DOMContentLoaded', render);
  if(document.readyState === 'complete' || document.readyState === 'interactive'){ setTimeout(render, 0); }

  /* Esc tuşu: açık fiş görüntüleyiciyi, yoksa açık olan modal/sheet'i (ör. Hesap
     Hareketleri ekranını) kapatır. */
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape' && e.keyCode!==27) return;
    if(ui.receiptView){ ui.receiptView = null; render(); return; }
    if(ui.modal){ closeModal(); return; }
  });

  document.body.addEventListener('click', function(e){
    var el = e.target.closest('[data-action]');
    if(!el) return;
    var action = el.getAttribute('data-action');

    if(action==='tab'){ ui.tab = el.getAttribute('data-tab'); render(); return; }

    /* ---- Google ile Giriş (bağımsız barındırma) ---- */
    if(action==='fb-sign-in'){ fbSignIn(); return; }

    /* ---- giriş perdesi ---- */
    if(action==='identity-pick'){
      var pickId = el.getAttribute('data-id');
      setLocalIdentity(pickId);
      localIdentity = pickId;
      ui.identityRequesting = false;
      render(); return;
    }
    if(action==='identity-request-toggle'){ ui.identityRequesting = true; render(); return; }
    if(action==='identity-request-cancel'){ ui.identityRequesting = false; render(); return; }
    if(action==='identity-logout'){
      if(BACKEND === 'firebase'){ fbSignOut(); return; }
      clearLocalIdentity();
      localIdentity = null;
      ui.identityRequesting = false;
      render(); return;
    }
    if(action==='approve-person'){
      var apId = el.getAttribute('data-id');
      var apPerson = getPerson(apId);
      if(apPerson){ apPerson.approved = true; logAudit('person-approve', apPerson.name + ' onaylandı'); persist(); }
      return;
    }
    if(action==='reject-person'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Erişim isteğini reddet', message:'Bu erişim isteği silinecek; kişi tekrar isim yazarak erişim isteyebilir.', onConfirm:{ kind:'person', id: el.getAttribute('data-id') } };
      render(); return;
    }
    if(action==='toggle-admin'){
      var taId = el.getAttribute('data-id');
      var taPerson = getPerson(taId);
      if(!taPerson) return;
      if(taPerson.isAdmin){
        var adminCount = state.people.filter(function(p){ return p.isAdmin; }).length;
        if(adminCount<=1){ showToast('En az bir yönetici kalmalı; önce başka birini yönetici yapın.'); return; }
      }
      taPerson.isAdmin = !taPerson.isAdmin;
      logAudit('person-toggle-admin', taPerson.name + (taPerson.isAdmin ? ' yönetici yapıldı' : ' yöneticilikten çıkarıldı'));
      persist(); return;
    }
    if(action==='open-tx'){
      var id = el.getAttribute('data-id');
      if(id){
        var t = state.transactions.find(function(x){ return x.id===id; });
        ui.modalData = t ? Object.assign({}, t) : { type:'expense', date: todayISO() };
      } else {
        ui.modalData = { type:'expense', date: todayISO() };
      }
      ui.txNoteSuggestion = null;
      ui.modal = 'tx'; render(); return;
    }
    if(action==='open-account'){
      var aid = el.getAttribute('data-id');
      var a = aid ? state.accounts.find(function(x){ return x.id===aid; }) : null;
      ui.modalData = a ? Object.assign({}, a) : { type:'bank' };
      ui.cardNetAdding = false;
      ui.loanImport = null;
      ui.modal = 'account'; render(); return;
    }
    if(action==='open-account-detail'){
      ui.modalData = { id: el.getAttribute('data-id') };
      ui.modal = 'accountDetail'; render(); return;
    }
    if(action==='edit-account-from-detail'){
      var editAcct = getAccount(el.getAttribute('data-id'));
      ui.modalData = editAcct ? Object.assign({}, editAcct) : { type:'bank' };
      ui.cardNetAdding = false;
      ui.loanImport = null;
      ui.modal = 'account'; render(); return;
    }
    if(action==='pay-card'){
      var cardId = el.getAttribute('data-id');
      ui.modalData = { type:'transfer', toAccountId: cardId, payCardMode:true, date: todayISO() };
      ui.txNoteSuggestion = null;
      ui.modal = 'tx'; render(); return;
    }
    if(action==='quick-add-tx'){
      ui.modalData = { type: el.getAttribute('data-type'), accountId: el.getAttribute('data-account-id'), date: todayISO() };
      ui.txNoteSuggestion = null;
      ui.modal = 'tx'; render(); return;
    }
    if(action==='open-bulk-import'){
      ui.bulkImport = { text:'', step:'input', rows:[] };
      ui.modal = 'bulkImport'; render(); return;
    }
    if(action==='bulk-import-preview'){
      var biTa = document.getElementById('bulk-import-textarea');
      var biText = biTa ? biTa.value : '';
      var rows = parseBulkImportRows(biText);
      ui.bulkImport = { text: biText, step:'preview', rows: rows };
      render(); return;
    }
    if(action==='bulk-import-back'){
      ui.bulkImport = Object.assign({}, ui.bulkImport, { step:'input' });
      render(); return;
    }
    if(action==='bulk-import-commit'){
      var okRows = (ui.bulkImport ? ui.bulkImport.rows : []).filter(function(r){ return r.ok; });
      if(!okRows.length) return;
      okRows.forEach(function(r){
        var t = r.tx;
        var rec = {
          id: uid('tx'), type: t.type, amount: t.amount, date: t.date,
          accountId: t.accountId, categoryId: t.categoryId, personId: t.personId,
          note: t.note || '', tags: [], receipt: null
        };
        if(rec.date > todayISO()) rec.status = 'planned';
        state.transactions.push(rec);
      });
      logAudit('bulk-import', okRows.length + ' kayıt toplu içe aktarıldı');
      showToast(okRows.length + ' kayıt içe aktarıldı.');
      ui.bulkImport = null;
      closeModal();
      persist();
      return;
    }

    /* ---- kredi amortisman tablosu içe aktarma (Hesap Ekle/Düzenle formunun içinde) ---- */
    if(action==='loan-schedule-toggle'){
      syncOpenFormIntoModalData();
      ui.loanImport = { text:'', step:'input', rows:[] };
      render(); return;
    }
    if(action==='loan-schedule-preview'){
      syncOpenFormIntoModalData();
      var lsTa = document.getElementById('loan-schedule-textarea');
      var lsText = lsTa ? lsTa.value : '';
      var lsRows = parseLoanScheduleRows(lsText);
      ui.loanImport = { text: lsText, step:'preview', rows: lsRows };
      render(); return;
    }
    if(action==='loan-schedule-edit'){
      syncOpenFormIntoModalData();
      ui.loanImport = Object.assign({}, ui.loanImport, { step:'input' });
      render(); return;
    }
    if(action==='overlay-close' && e.target!==el) return;
    if(action==='close-modal' || action==='overlay-close'){ closeModal(); return; }
    if(action==='close-receipt-view' && e.target!==el) return;
    if(action==='close-receipt-view'){ ui.receiptView = null; render(); return; }
    if(action==='view-receipt'){ ui.receiptView = el.getAttribute('src'); render(); return; }
    if(action==='remove-receipt'){
      syncOpenFormIntoModalData();
      ui.modalData = Object.assign({}, ui.modalData, { receipt: null });
      render(); return;
    }
    if(action==='apply-template'){
      syncOpenFormIntoModalData();
      var tp = state.templates.find(function(x){ return x.id===el.getAttribute('data-id'); });
      if(tp){
        ui.modalData = Object.assign({}, ui.modalData, { type: tp.type, categoryId: tp.categoryId, accountId: tp.accountId, personId: tp.personId, amount: tp.amount!=null?tp.amount:'' });
        ui.txCatEditMode = false; ui.txCatAdding = false;
      }
      render(); return;
    }
    if(action==='delete-template'){
      ui.modal = 'confirm';
      var returnData3 = Object.assign({}, ui.modalData);
      ui.modalData = { title:'Şablonu sil', message:'Bu şablon kalıcı olarak silinecek.', onConfirm:{ kind:'template', id: el.getAttribute('data-id'), returnModal:'tx', returnData: returnData3 } };
      render(); return;
    }
    if(action==='save-template-toggle'){
      syncOpenFormIntoModalData(); ui.templateNaming = true; render();
      var tnInput = document.getElementById('template-name-input');
      if(tnInput){ try{ tnInput.focus(); }catch(e){} }
      return;
    }
    if(action==='save-template-cancel'){ syncOpenFormIntoModalData(); ui.templateNaming = false; render(); return; }
    if(action==='save-template-confirm'){
      syncOpenFormIntoModalData();
      var tnInput2 = document.getElementById('template-name-input');
      var tname = tnInput2 ? tnInput2.value.trim() : '';
      if(!tname){ showToast('Lütfen şablon için bir ad girin.'); return; }
      var dtp = ui.modalData || {};
      state.templates.push({
        id: uid('tmpl'), name: tname, type: dtp.type||'expense',
        amount: dtp.amount ? parseFloat(dtp.amount) : null,
        categoryId: dtp.categoryId || null, accountId: dtp.accountId || null, personId: dtp.personId || null
      });
      ui.templateNaming = false;
      showToast('Şablon kaydedildi.');
      persist();
      return;
    }
    if(action==='tx-type'){ syncOpenFormIntoModalData(); ui.modalData = Object.assign({}, ui.modalData, { type: el.getAttribute('data-val'), categoryId:null }); ui.txCatEditMode=false; ui.txCatAdding=false; render(); return; }
    if(action==='acc-type'){ syncOpenFormIntoModalData(); ui.modalData = Object.assign({}, ui.modalData, { type: el.getAttribute('data-val') }); ui.cardNetAdding = false; render(); return; }
    if(action==='tx-cat'){ syncOpenFormIntoModalData(); ui.modalData = Object.assign({}, ui.modalData, { categoryId: el.getAttribute('data-val') }); render(); return; }
    if(action==='apply-note-suggestion'){
      syncOpenFormIntoModalData();
      if(ui.txNoteSuggestion){
        ui.modalData = Object.assign({}, ui.modalData, { categoryId: ui.txNoteSuggestion.categoryId, personId: ui.txNoteSuggestion.personId || '' });
      }
      ui.txNoteSuggestion = null;
      render(); return;
    }
    if(action==='dismiss-note-suggestion'){ syncOpenFormIntoModalData(); ui.txNoteSuggestion = null; render(); return; }
    if(action==='tx-cat-edit-toggle'){ syncOpenFormIntoModalData(); ui.txCatEditMode = !ui.txCatEditMode; ui.txCatAdding = false; render(); return; }
    if(action==='tx-cat-add-toggle'){
      syncOpenFormIntoModalData(); ui.txCatAdding = true; render();
      var addInputEl = document.getElementById('tx-cat-add-input');
      if(addInputEl){ try{ addInputEl.focus(); }catch(e){} }
      return;
    }
    if(action==='tx-cat-add-cancel'){ syncOpenFormIntoModalData(); ui.txCatAdding = false; render(); return; }
    if(action==='tx-cat-add-save'){
      syncOpenFormIntoModalData();
      var addInput = document.getElementById('tx-cat-add-input');
      var newName = addInput ? addInput.value.trim() : '';
      var addType = el.getAttribute('data-type');
      if(!newName){ showToast('Lütfen bir kategori adı girin.'); return; }
      var catList = state.categories[addType];
      var newCat = { id: uid('c'), name: newName, slot: catList.length % 8 };
      catList.push(newCat);
      ui.modalData = Object.assign({}, ui.modalData, { categoryId: newCat.id });
      ui.txCatAdding = false;
      persist();
      render();
      return;
    }
    if(action==='delete-category-inline'){
      syncOpenFormIntoModalData();
      var delType = el.getAttribute('data-type');
      var delId = el.getAttribute('data-id');
      var returnData = Object.assign({}, ui.modalData);
      if(returnData.categoryId===delId) returnData.categoryId = null;
      ui.modal = 'confirm';
      ui.modalData = { title:'Kategoriyi sil', message:'Kategori silinecek; bu kategoriye ait geçmiş hareketler "Diğer" olarak görünmeye devam eder.', onConfirm:{ kind:'category', type: delType, id: delId, returnModal:'tx', returnData: returnData } };
      render(); return;
    }
    if(action==='filter-type'){ ui.txFilter.type = el.getAttribute('data-val'); render(); return; }
    if(action==='toggle-tx-filters'){ ui.txFiltersOpen = !ui.txFiltersOpen; render(); return; }
    if(action==='clear-tx-filters'){ ui.txFilter.q=''; ui.txFilter.dateFrom=''; ui.txFilter.dateTo=''; ui.txFilter.amountMin=''; ui.txFilter.amountMax=''; render(); return; }
    if(action==='report-month'){ ui.reportMonth = addMonths(ui.reportMonth, parseInt(el.getAttribute('data-dir'),10)); render(); return; }
    if(action==='report-year'){ ui.reportYear += parseInt(el.getAttribute('data-dir'),10); render(); return; }
    if(action==='toggle-asset'){
      var akey = el.getAttribute('data-key');
      ui.assetExpanded[akey] = !ui.assetExpanded[akey];
      render(); return;
    }
    if(action==='toggle-card-period'){
      var pkey = el.getAttribute('data-key');
      ui.cardPeriodOpen[pkey] = !ui.cardPeriodOpen[pkey];
      render(); return;
    }
    if(action==='quick-add-account'){
      ui.modalData = { type: el.getAttribute('data-type') || 'bank' };
      ui.cardNetAdding = false;
      ui.loanImport = null;
      ui.modal = 'account'; render(); return;
    }
    if(action==='card-net-add-toggle'){
      syncOpenFormIntoModalData(); ui.cardNetAdding = true; render();
      var cnInput = document.getElementById('card-net-add-input');
      if(cnInput){ try{ cnInput.focus(); }catch(e){} }
      return;
    }
    if(action==='card-net-add-cancel'){ syncOpenFormIntoModalData(); ui.cardNetAdding = false; render(); return; }
    if(action==='card-net-add-save'){
      syncOpenFormIntoModalData();
      var cnInput2 = document.getElementById('card-net-add-input');
      var cnName = cnInput2 ? cnInput2.value.trim() : '';
      if(!cnName){ showToast('Lütfen bir kart ağı adı girin.'); return; }
      var newNet = { id: uid('net'), name: cnName };
      state.cardNetworks.push(newNet);
      ui.modalData = Object.assign({}, ui.modalData, { networkId: newNet.id });
      ui.cardNetAdding = false;
      persist();
      return;
    }

    if(action==='delete-tx'){
      var txId = el.getAttribute('data-id');
      ui.modal = 'confirm';
      ui.modalData = { title:'Hareketi sil', message:'Bu hareket kalıcı olarak silinecek.', onConfirm:{ kind:'tx', id:txId } };
      render(); return;
    }
    if(action==='delete-account'){
      var delAccId = el.getAttribute('data-id');
      var delAcct = getAccount(delAccId);
      var blockedReason = accountDeleteBlockedReason(delAcct);
      if(blockedReason){ showToast(blockedReason); return; }
      var used = state.transactions.some(function(t){ return t.accountId===delAccId || t.toAccountId===delAccId; });
      ui.modal = 'confirm';
      ui.modalData = {
        title:'Hesabı sil',
        message: used ? 'Bu hesaba bağlı hareketler var. Hesap silinirse bu hareketler de silinecek.' : 'Bu hesap kalıcı olarak silinecek.',
        onConfirm:{ kind:'account', id:delAccId }
      };
      render(); return;
    }
    if(action==='delete-person'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Kişiyi sil', message:'Kişi silinecek; bu kişiye ait geçmiş hareketler etkilenmez.', onConfirm:{ kind:'person', id: el.getAttribute('data-id') } };
      render(); return;
    }
    if(action==='delete-category'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Kategoriyi sil', message:'Kategori silinecek; bu kategoriye ait geçmiş hareketler "Diğer" olarak görünmeye devam eder.', onConfirm:{ kind:'category', type: el.getAttribute('data-type'), id: el.getAttribute('data-id') } };
      render(); return;
    }
    if(action==='delete-card-network'){
      var inUseNet = el.getAttribute('data-inuse')==='1';
      ui.modal = 'confirm';
      ui.modalData = { title:'Kart ağını sil', message: inUseNet ? 'Bu kart ağı bazı kartlarda kullanılıyor; silinirse o kartlarda ağ bilgisi boş kalır.' : 'Bu kart ağı kalıcı olarak silinecek.', onConfirm:{ kind:'cardNetwork', id: el.getAttribute('data-id') } };
      render(); return;
    }
    if(action==='set-reset-pin'){
      ui.modal = 'setResetPin';
      ui.modalData = {};
      render(); return;
    }
    if(action==='reset-data'){
      if(!state.resetPin){ showToast('Önce Ayarlar\'dan bir PIN belirleyin.'); return; }
      ui.modal = 'resetConfirm';
      ui.modalData = { title:'Tüm verileri sıfırla', message:'Tüm hesaplar, hareketler ve kategoriler silinip başlangıç durumuna dönülecek. Bu işlem geri alınamaz. Devam etmek için PIN\'i girin.' };
      render(); return;
    }
    if(action==='export-csv'){ triggerExport('csv'); return; }
    if(action==='export-json'){ triggerExport('json'); return; }

    /* ---- düzenli ödemeler ---- */
    if(action==='recurring-new'){
      ui.recurringForm = { type: el.getAttribute('data-type')||'expense', day:1 };
      render(); return;
    }
    if(action==='recurring-form-cancel'){ ui.recurringForm = null; render(); return; }
    if(action==='recurring-add-now'){
      var rId = el.getAttribute('data-id');
      var rec3 = state.recurring.find(function(x){ return x.id===rId; });
      if(!rec3) return;
      var racct = getAccount(rec3.accountId);
      if(!racct){ showToast('Bu düzenli ödemenin hesabı bulunamadı; Ayarlar\'dan kontrol edin.'); return; }
      var rmk = currentMonthKey();
      var installNote = rec3.totalInstallments ? ' (' + (rec3.totalInstallments - rec3.installmentsRemaining + 1) + '/' + rec3.totalInstallments + ' taksit)' : ' (Düzenli)';
      state.transactions.push({
        id: recurringGenId(rec3, rmk), type: rec3.type, amount: rec3.amount,
        date: rmk + '-' + pad2(clamp(rec3.day,1,28)), accountId: rec3.accountId,
        categoryId: rec3.categoryId, personId: rec3.personId || null,
        note: rec3.name + installNote, recurringId: rec3.id
      });
      if(rec3.totalInstallments){
        rec3.installmentsRemaining -= 1;
        if(rec3.installmentsRemaining<=0) rec3.active = false;
      }
      persist(); return;
    }
    if(action==='recurring-skip'){
      var skId = el.getAttribute('data-id');
      var rec4 = state.recurring.find(function(x){ return x.id===skId; });
      if(!rec4) return;
      rec4.skippedMonths = rec4.skippedMonths || [];
      rec4.skippedMonths.push(currentMonthKey());
      persist(); return;
    }
    if(action==='toggle-recurring'){
      var tgId = el.getAttribute('data-id');
      var rec5 = state.recurring.find(function(x){ return x.id===tgId; });
      if(rec5){ rec5.active = !rec5.active; persist(); }
      return;
    }
    if(action==='delete-recurring'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Düzenli ödemeyi sil', message:'Bu düzenli ödeme/taksit şablonu silinecek; geçmişte oluşmuş kayıtlar etkilenmez.', onConfirm:{ kind:'recurring', id: el.getAttribute('data-id') } };
      render(); return;
    }

    /* ---- planlanan işlemler: gerçekleşti / ertele ---- */
    if(action==='realize-planned'){
      var rpId = el.getAttribute('data-id');
      var rpTx = state.transactions.find(function(t){ return t.id===rpId; });
      if(rpTx){ delete rpTx.status; persist(); }
      return;
    }
    if(action==='postpone-planned'){
      var ppTx = state.transactions.find(function(t){ return t.id===el.getAttribute('data-id'); });
      if(!ppTx) return;
      ui.modal = 'postpone';
      ui.modalData = { id: ppTx.id, date: addMonthsToDate(ppTx.date, 1) };
      render(); return;
    }

    /* ---- hedefler ---- */
    if(action==='goal-new'){ ui.goalForm = {}; render(); return; }
    if(action==='goal-form-cancel'){ ui.goalForm = null; render(); return; }
    if(action==='edit-goal'){
      var editGoal = state.goals.find(function(x){ return x.id===el.getAttribute('data-id'); });
      ui.goalForm = editGoal ? Object.assign({}, editGoal) : {};
      render(); return;
    }
    if(action==='delete-goal'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Hedefi sil', message:'Bu birikim hedefi kalıcı olarak silinecek.', onConfirm:{ kind:'goal', id: el.getAttribute('data-id') } };
      render(); return;
    }

    /* ---- Şifre Kasası ---- */
    if(action==='vault-add'){ ui.modalData = {}; ui.modal = 'vaultEntry'; render(); return; }
    if(action==='vault-edit'){
      var veId = el.getAttribute('data-id');
      var veEntry = (state.passwordVault.entries||[]).find(function(x){ return x.id===veId; });
      if(!veEntry) return;
      var veRevealed = ui.vaultReveal[veId];
      if(veRevealed){
        ui.modalData = { id: veId, bank: veEntry.bank, username: veRevealed.username, password: veRevealed.password, notes: veRevealed.notes };
        ui.modal = 'vaultEntry'; render(); return;
      }
      vaultDecryptText(vaultKey, veEntry.iv, veEntry.cipher).then(function(json){
        var payload = JSON.parse(json);
        ui.modalData = { id: veId, bank: veEntry.bank, username: payload.username, password: payload.password, notes: payload.notes };
        ui.modal = 'vaultEntry'; render();
      }).catch(function(){ showToast('Şifre çözülemedi.'); });
      return;
    }
    if(action==='vault-delete'){
      var vdEntry = (state.passwordVault.entries||[]).find(function(x){ return x.id===el.getAttribute('data-id'); });
      ui.modal = 'confirm';
      ui.modalData = { title:'Şifreyi sil', message:'Bu kayıt (' + (vdEntry?vdEntry.bank:'') + ') kalıcı olarak silinecek.', onConfirm:{ kind:'vaultEntry', id: el.getAttribute('data-id') } };
      render(); return;
    }
    if(action==='vault-toggle-reveal'){
      var vtId = el.getAttribute('data-id');
      if(ui.vaultReveal[vtId]){ delete ui.vaultReveal[vtId]; render(); return; }
      var vtEntry = (state.passwordVault.entries||[]).find(function(x){ return x.id===vtId; });
      if(!vtEntry) return;
      vaultDecryptText(vaultKey, vtEntry.iv, vtEntry.cipher).then(function(json){
        ui.vaultReveal[vtId] = JSON.parse(json);
        render();
      }).catch(function(){ showToast('Şifre çözülemedi — ana şifre değişmiş olabilir.'); });
      return;
    }
    if(action==='vault-copy'){
      var vcRevealed = ui.vaultReveal[el.getAttribute('data-id')];
      if(!vcRevealed) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(vcRevealed.password).then(function(){ showToast('Şifre kopyalandı.'); }).catch(function(){ showToast('Kopyalanamadı.'); });
      }
      return;
    }
    if(action==='vault-lock'){ vaultKey = null; ui.vaultReveal = {}; render(); return; }
    if(action==='vault-forgot'){
      ui.modal = 'confirm';
      ui.modalData = { title:'Ana şifreyi sıfırla', message:'Ana şifrenizi unuttuysanız, kasadaki TÜM kayıtlı şifreler kurtarılamaz şekilde silinir ve yeni bir ana şifreyle sıfırdan başlarsınız. Bu işlem geri alınamaz.', onConfirm:{ kind:'vaultWipe' } };
      render(); return;
    }

    if(action==='confirm-yes'){
      var c = (ui.modalData && ui.modalData.onConfirm) || {};
      if(c.kind==='tx'){
        var delTx = state.transactions.find(function(t){ return t.id===c.id; });
        state.transactions = state.transactions.filter(function(t){ return t.id!==c.id; });
        if(delTx) logAudit('tx-delete', (delTx.type==='income'?'Gelir':delTx.type==='expense'?'Gider':'Transfer') + ' silindi: ' + fmtTRY(delTx.amount) + (delTx.note?' (' + delTx.note + ')':''));
      }
      else if(c.kind==='account'){
        var delAcct2 = getAccount(c.id);
        var blockedReason2 = accountDeleteBlockedReason(delAcct2);
        if(blockedReason2){
          showToast(blockedReason2);
          closeModal();
          return;
        }
        state.accounts = state.accounts.filter(function(a){ return a.id!==c.id; });
        state.transactions = state.transactions.filter(function(t){ return t.accountId!==c.id && t.toAccountId!==c.id; });
        if(delAcct2) logAudit('account-delete', 'Hesap silindi: ' + delAcct2.name);
      } else if(c.kind==='person'){
        var delPerson = getPerson(c.id);
        if(delPerson && delPerson.isAdmin && state.people.filter(function(p){ return p.isAdmin; }).length<=1){
          showToast('En az bir yönetici kalmalı; önce başka birini yönetici yapın.');
        } else {
          state.people = state.people.filter(function(p){ return p.id!==c.id; });
          if(localIdentity===c.id){ clearLocalIdentity(); localIdentity = null; }
          if(delPerson) logAudit('person-delete', 'Kişi silindi/reddedildi: ' + delPerson.name);
        }
      }
      else if(c.kind==='category'){ state.categories[c.type] = state.categories[c.type].filter(function(x){ return x.id!==c.id; }); }
      else if(c.kind==='cardNetwork'){
        state.cardNetworks = state.cardNetworks.filter(function(x){ return x.id!==c.id; });
        state.accounts.forEach(function(a){ if(a.networkId===c.id) a.networkId = null; });
      }
      else if(c.kind==='recurring'){
        var delRec = state.recurring.find(function(x){ return x.id===c.id; });
        state.recurring = state.recurring.filter(function(x){ return x.id!==c.id; });
        if(delRec) logAudit('recurring-delete', 'Düzenli ödeme silindi: ' + delRec.name);
      }
      else if(c.kind==='goal'){
        var delGoal = state.goals.find(function(x){ return x.id===c.id; });
        state.goals = state.goals.filter(function(x){ return x.id!==c.id; });
        if(delGoal) logAudit('goal-delete', 'Hedef silindi: ' + delGoal.name);
      }
      else if(c.kind==='template'){ state.templates = state.templates.filter(function(x){ return x.id!==c.id; }); }
      else if(c.kind==='vaultEntry'){
        var delVaultEntry = (state.passwordVault.entries||[]).find(function(x){ return x.id===c.id; });
        state.passwordVault.entries = (state.passwordVault.entries||[]).filter(function(x){ return x.id!==c.id; });
        delete ui.vaultReveal[c.id];
        if(delVaultEntry) logAudit('vault-delete', 'Şifre silindi: ' + delVaultEntry.bank);
      }
      else if(c.kind==='vaultWipe'){
        state.passwordVault = { salt:null, check:null, entries:[] };
        vaultKey = null;
        ui.vaultReveal = {};
        logAudit('vault-wipe', 'Şifre kasası sıfırlandı (ana şifre unutulmuştu)');
      }
      else if(c.kind==='reset'){ state = defaultState(); logAudit('reset', 'Tüm veriler sıfırlandı'); }
      if(c.returnModal){ ui.modal = c.returnModal; ui.modalData = c.returnData; render(); }
      else { closeModal(); }
      persist();
      return;
    }
  });

  document.body.addEventListener('change', function(e){
    if(e.target.matches('[data-action="filter-account"]')){ ui.txFilter.accountId = e.target.value; render(); }
    if(e.target.matches('[data-action="filter-q"]')){ ui.txFilter.q = e.target.value; render(); }
    if(e.target.matches('[data-action="filter-date-from"]')){ ui.txFilter.dateFrom = e.target.value; render(); }
    if(e.target.matches('[data-action="filter-date-to"]')){ ui.txFilter.dateTo = e.target.value; render(); }
    if(e.target.matches('[data-action="filter-amount-min"]')){ ui.txFilter.amountMin = e.target.value; render(); }
    if(e.target.matches('[data-action="filter-amount-max"]')){ ui.txFilter.amountMax = e.target.value; render(); }
    if(ui.modal==='tx' && e.target.matches('select[name="accountId"]')){ syncOpenFormIntoModalData(); render(); }
    if(ui.modal==='tx' && e.target.matches('input[name="installment"]')){ syncOpenFormIntoModalData(); ui.modalData.installment = e.target.checked; render(); }
    if(ui.modal==='tx' && e.target.matches('input[name="isRepeating"]')){ syncOpenFormIntoModalData(); ui.modalData.isRepeating = e.target.checked; render(); }
    if(ui.modal==='tx' && e.target.matches('input[name="note"]')){
      syncOpenFormIntoModalData();
      var noteVal = e.target.value;
      var sug = findNoteSuggestion(ui.modalData.type, noteVal, ui.modalData.id);
      ui.txNoteSuggestion = sug ? Object.assign({}, sug, { note: noteVal }) : null;
      updateNoteSuggestionBox();
    }
    if(ui.modal==='tx' && e.target.id==='receipt-input' && e.target.files && e.target.files[0]){
      syncOpenFormIntoModalData();
      compressImageToDataUrl(e.target.files[0], function(dataUrl){
        if(!dataUrl){ showToast('Görsel okunamadı, tekrar deneyin.'); return; }
        ui.modalData = Object.assign({}, ui.modalData, { receipt: dataUrl });
        render();
      });
    }
  });

  document.body.addEventListener('submit', function(e){
    var form = e.target.closest('form[data-action]');
    if(!form) return;
    e.preventDefault();
    var action = form.getAttribute('data-action');
    var fd = new FormData(form);

    if(action==='save-tx'){
      var type = fd.get('type');
      var amount = Math.abs(parseFloat(fd.get('amount'))) || 0;
      if(amount<=0){ showToast('Lütfen geçerli bir tutar girin.'); return; }
      var id = fd.get('id');
      var rec = {
        id: id || uid('tx'),
        type: type,
        amount: amount,
        date: fd.get('date') || todayISO(),
        accountId: fd.get('accountId') || null,
        note: (fd.get('note')||'').trim(),
        tags: (fd.get('tags')||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean),
        receipt: fd.get('receipt') || null
      };
      if(type==='transfer'){
        rec.toAccountId = fd.get('toAccountId') || null;
        if(!rec.accountId || !rec.toAccountId || rec.accountId===rec.toAccountId){ showToast('Kaynak ve hedef hesap farklı olmalı.'); return; }
      } else {
        rec.categoryId = fd.get('categoryId') || null;
        rec.personId = fd.get('personId') || null;
        if(!rec.categoryId){ showToast('Lütfen bir kategori seçin.'); return; }
      }
      if(!rec.accountId){ showToast('Lütfen bir hesap seçin.'); return; }
      if(rec.date > todayISO()) rec.status = 'planned'; /* gelecek tarihli kayıt: onay bekler, bakiyeyi etkilemez */

      /* taksitli kart/kredi harcaması: girilen tutar TOPLAM tutar kabul edilir,
         taksit sayısına bölünür; tekrarlanan gelir/gider ve Kredi ile aynı
         model kullanılır — TÜM taksitler oluşturma anında ileri tarihli olarak
         kaydedilir (aynı seriesId ile). İlk taksit bugüne/geçmişe denk
         geliyorsa hemen gerçekleşmiş sayılır, kalanı 'planned' olur ve
         Hareketler'de görünür; vadesi geldiğinde Özet'teki banner'dan
         gerçekleşti/ertele ile onaylanır. Kredi kartı hesabıysa taksit
         tarihleri satın alma tarihine göre değil, kartın kesim/ödeme günü
         döngüsüne göre (ilgili dönemin ödeme tarihine) hesaplanır. Harcamanın
         GERÇEKTEN yapıldığı tarih (işlem tarihi) her taksitte `purchaseDate`
         alanında sabit olarak saklanır — tek bir alışveriş olduğu için tüm
         taksitlerde aynıdır; `date` alanı ise o taksidin ödeme tarihidir. */
      var instAcct = getAccount(rec.accountId);
      var isNewInstallment = !id && type==='expense' && fd.get('installment') && isDebtType((instAcct||{}).type);
      var installmentCount = isNewInstallment ? clamp(parseInt(fd.get('installmentCount'),10) || 1, 1, 36) : 1;
      if(isNewInstallment && installmentCount>1){
        var perInstallment = Math.round((amount/installmentCount)*100)/100;
        var instSeriesId = uid('series');
        var instPurchaseDate = rec.date;
        var instDates = (instAcct && instAcct.type==='card')
          ? cardInstallmentDates(instAcct, cardStatementKeyForDate(instAcct, rec.date), installmentCount)
          : occurrenceDates(rec.date, 'monthly', installmentCount);
        var instFirst = null;
        instDates.forEach(function(dt, idx){
          var occ = Object.assign({}, rec, { id: uid('tx'), amount: perInstallment, date: dt, seriesId: instSeriesId, purchaseDate: instPurchaseDate });
          occ.note = rec.note ? (rec.note + ' (' + (idx+1) + '/' + installmentCount + ' taksit)') : ((idx+1) + '/' + installmentCount + ' taksit');
          if(dt > todayISO()) occ.status = 'planned'; else delete occ.status;
          if(idx===0) instFirst = occ;
          state.transactions.push(occ);
        });
        if(instFirst && !isPlanned(instFirst)){
          var errI = validateTxAgainstBalanceRules(instFirst);
          if(errI){
            /* kural ihlali: az önce eklenen tüm seriyi geri al */
            state.transactions = state.transactions.filter(function(t){ return t.seriesId!==instSeriesId; });
            showToast(errI);
            return;
          }
        }
        logAudit('tx-add', 'Taksitli ' + (type==='income'?'gelir':'gider') + ' eklendi: ' + fmtTRY(amount) + ' (' + installmentCount + ' taksit)');
        closeModal();
        persist();
        return;
      }

      /* tekrarlanan gelir/gider: tüm gelecek kayıtlar önceden oluşturulur;
         bugünden sonraki tarihliler 'planned' olarak işaretlenir ve o tarih
         geldiğinde Özet'teki banner'dan gerçekleşti/ertele ile onaylanır. */
      var isRepeating = !id && !isNewInstallment && type!=='transfer' && fd.get('isRepeating');
      var repeatFreq = fd.get('repeatFreq') || 'monthly';
      var repeatCount = isRepeating ? clamp(parseInt(fd.get('repeatCount'),10) || 1, 2, 60) : 1;

      if(isRepeating && repeatCount>1){
        var seriesId = uid('series');
        var dates = occurrenceDates(rec.date, repeatFreq, repeatCount);
        var firstRec = null;
        dates.forEach(function(dt, idx){
          var occ = Object.assign({}, rec, { id: uid('tx'), date: dt, seriesId: seriesId });
          occ.note = rec.note ? (rec.note + ' (' + (idx+1) + '/' + repeatCount + ')') : ((idx+1) + '/' + repeatCount + ' tekrar');
          if(dt > todayISO()) occ.status = 'planned'; else delete occ.status;
          if(idx===0) firstRec = occ;
          state.transactions.push(occ);
        });
        if(firstRec && !isPlanned(firstRec)){
          var errR = validateTxAgainstBalanceRules(firstRec);
          if(errR){
            /* kural ihlali: az önce eklenen tüm seriyi geri al */
            state.transactions = state.transactions.filter(function(t){ return t.seriesId!==seriesId; });
            showToast(errR);
            return;
          }
        }
        logAudit('tx-add', 'Tekrarlanan ' + (type==='income'?'gelir':'gider') + ' eklendi: ' + fmtTRY(amount) + ' (' + repeatCount + ' tekrar)');
        closeModal();
        persist();
        return;
      }

      if(!isPlanned(rec)){
        var err = validateTxAgainstBalanceRules(rec, id || null);
        if(err){ showToast(err); return; }
      }

      if(id){
        var idx = state.transactions.findIndex(function(t){ return t.id===id; });
        if(idx>-1) state.transactions[idx] = rec;
        logAudit('tx-edit', (type==='income'?'Gelir':type==='expense'?'Gider':'Transfer') + ' düzenlendi: ' + fmtTRY(amount));
      } else {
        state.transactions.push(rec);
        logAudit('tx-add', (type==='income'?'Gelir':type==='expense'?'Gider':'Transfer') + ' eklendi: ' + fmtTRY(amount) + (rec.note?' (' + rec.note + ')':''));
      }
      closeModal();
      persist();
      return;
    }

    if(action==='save-account'){
      var accId = fd.get('id');
      var rec2 = {
        id: accId || uid('acc'),
        type: fd.get('type'),
        name: (fd.get('name')||'').trim(),
        opening: parseFloat(fd.get('opening')) || 0
      };
      if(rec2.type==='bank'){
        rec2.iban = (fd.get('iban')||'').trim();
        rec2.termType = fd.get('termType')==='vadeli' ? 'vadeli' : 'vadesiz';
        var odRaw = fd.get('overdraftLimit');
        rec2.overdraftLimit = (odRaw!=null && odRaw!=='') ? Math.max(0, parseFloat(odRaw)||0) : null;
        rec2.currency = fd.get('currency') || 'TRY';
      }
      if(rec2.type==='cash'){
        rec2.currency = fd.get('currency') || 'TRY';
      }
      if(rec2.type==='card'){
        rec2.limit = parseFloat(fd.get('limit')) || 0;
        rec2.bankName = (fd.get('bankName')||'').trim();
        rec2.cardNumber = (fd.get('cardNumber')||'').trim();
        rec2.networkId = fd.get('networkId') || null;
        rec2.statementDay = clamp(parseInt(fd.get('statementDay'),10) || 5, 1, 28);
        rec2.paymentDay = clamp(parseInt(fd.get('paymentDay'),10) || 10, 1, 28);
      }
      if(!rec2.name){ showToast('Lütfen hesap adı girin.'); return; }

      /* Kredi hesabı — YENİ MODEL (3 Eylül 2026 akşamından itibaren): artık
         gerçek bir banka kredisi gibi ele alınıyor. Taksit tutarı × sayısı
         yerine, bankanın verdiği komple amortisman tablosu (Excel'den
         kopyala-yapıştır ile, bkz. ui.loanImport / parseLoanScheduleRows /
         loanScheduleFromRows) içeri aktarılıyor. "opening" (Kalan Borç),
         tablodaki Taksit Tutarı sütununun TOPLAMI olarak hesaplanıyor —
         gerçek ödemeler de "Ödeme Yap" akışında her zaman TAM taksit tutarı
         kadar bakiyeyi azalttığı için bakiye her zaman tabloyla tutarlı
         kalıyor. Anapara/Faiz/Kalan Bakiye sütunları yalnızca bilgi
         amaçlıdır, bakiye hesabına katılmaz. Kredi Tutarı (rec2.principal)
         ayrı bir bilgi alanı: elle girilmezse tablo toplamı kullanılır.
         Ödemenin hangi hesaptan yapılacağı burada SORULMAZ; ödeme daha sonra
         tek tek "Ödeme Yap" ile (o an hesap seçilerek) kaydedilir. */
      if(rec2.type==='loan_account' && !accId){
        var newSchedRows = (ui.loanImport && ui.loanImport.step==='preview') ? ui.loanImport.rows : [];
        var newSched = loanScheduleFromRows(newSchedRows);
        if(!newSched.length){ showToast('Lütfen önce amortisman tablosunu yapıştırıp "Tabloyu Ayrıştır / Önizle" ile önizleyin.'); return; }
        var schedSum = Math.round(newSched.reduce(function(s,r){ return s+r.payment; }, 0)*100)/100;
        var principalOverrideRaw = fd.get('principalOverride');
        var principalOverride = (principalOverrideRaw!=null && principalOverrideRaw!=='') ? parseFloat(principalOverrideRaw) : NaN;
        rec2.schedule = newSched;
        rec2.principal = isNaN(principalOverride) ? schedSum : Math.round(principalOverride*100)/100;
        rec2.opening = schedSum;
        rec2._migratedToSimpleLoan = true;
        state.accounts.push(rec2);
        logAudit('account-add', 'Kredi hesabı eklendi: ' + rec2.name + ' (' + newSched.length + ' taksitlik tablo, ' + fmtTRY(rec2.opening) + ')');
        ui.loanImport = null;
        closeModal();
        persist();
        return;
      }

      /* Mevcut bir kredi düzenlenirken amortisman tablosu (yeniden) içe
         aktarılmışsa: tablo ve Kredi Tutarı güncellenir, Kalan Borç yeni
         tablonun taksit toplamına göre YENİDEN hesaplanır (formdaki "Kalan
         Borç" alanına elle girilmiş olası bir değerin üzerine yazar — az
         önce verilen gerçek tablo daha güvenilir kabul edilir). Yapıştırılan
         tablo "BUGÜNDEN İTİBAREN kalan taksitler" anlamına geldiği için,
         hesabın "opening" alanı yeni tablo toplamına, bu hesaba daha önce
         GERÇEKTEN yapılmış (planlı olmayan) ödemelerin toplamı EKLENEREK
         ayarlanır — aksi halde accountBalance() bu geçmiş ödemeleri BİR DAHA
         düşer ve bakiye yanlış (olması gerekenden düşük) çıkar. Eski basit
         model alanları (monthlyPayment/totalInstallments) varsa temizlenir. */
      if(rec2.type==='loan_account' && accId && ui.loanImport && ui.loanImport.step==='preview'){
        var reimportSched = loanScheduleFromRows(ui.loanImport.rows);
        if(reimportSched.length){
          var reimportSum = Math.round(reimportSched.reduce(function(s,r){ return s+r.payment; }, 0)*100)/100;
          var alreadyPaidSum = state.transactions.filter(function(t){ return t.type==='transfer' && t.toAccountId===accId && !isPlanned(t); })
            .reduce(function(s,t){ return s+t.amount; }, 0);
          var principalOverrideRaw2 = fd.get('principalOverride');
          var principalOverride2 = (principalOverrideRaw2!=null && principalOverrideRaw2!=='') ? parseFloat(principalOverrideRaw2) : NaN;
          rec2.schedule = reimportSched;
          rec2.principal = isNaN(principalOverride2) ? reimportSum : Math.round(principalOverride2*100)/100;
          rec2.opening = Math.round((reimportSum + alreadyPaidSum)*100)/100;
          /* eski basit model alanları artık geçersiz — Object.assign ile
             birleştirilecek hedef nesnede üzerine 'undefined' yazılıyor ki
             (bir sonraki yayında JSON.stringify bunları zaten atacağı için)
             kalıntı olarak kalmasınlar; renderLoanProgress/renderAccountDetail
             zaten schedule varsa onu önceliklendiriyor, bu yüzden bu satırlar
             görünüşü etkilemez, yalnızca veriyi temizler. */
          rec2.monthlyPayment = undefined;
          rec2.totalInstallments = undefined;
        }
      }

      /* Kredi Tutarı, tablo yeniden içe aktarılmasa bile (yalnızca bu alan
         tek başına düzenlendiyse) ayrıca kaydedilsin. */
      if(rec2.type==='loan_account' && accId && rec2.principal===undefined){
        var principalOnlyRaw = fd.get('principalOverride');
        if(principalOnlyRaw!=null && principalOnlyRaw!==''){
          var principalOnly = parseFloat(principalOnlyRaw);
          if(!isNaN(principalOnly)) rec2.principal = Math.round(principalOnly*100)/100;
        }
      }

      if(accId){
        var aidx = state.accounts.findIndex(function(a){ return a.id===accId; });
        if(aidx>-1) state.accounts[aidx] = Object.assign({}, state.accounts[aidx], rec2);
        logAudit('account-edit', 'Hesap düzenlendi: ' + rec2.name);
      } else {
        state.accounts.push(rec2);
        logAudit('account-add', 'Hesap eklendi: ' + rec2.name + ' (' + ACC_TYPE_LABEL[rec2.type] + ')');
      }
      ui.loanImport = null;
      closeModal();
      persist();
      return;
    }

    if(action==='fb-restore-import'){
      var backupText = (fd.get('backup')||'').trim();
      if(!backupText){ return; }
      var restoreResult = restoreFromBackupJSON(backupText);
      if(!restoreResult.ok){ showToast(restoreResult.error); return; }
      state = restoreResult.state;
      logAudit('import-backup', 'Eski sistemdeki yedekten veri içe aktarıldı');
      form.reset();
      persist();
      showToast('Yedek başarıyla içe aktarıldı.');
      return;
    }
    if(action==='fb-invite'){
      var inviteEmail = (fd.get('email')||'').trim().toLowerCase();
      if(!inviteEmail){ return; }
      if(fbUser && inviteEmail === (fbUser.email||'').toLowerCase()){ showToast('Kendinizi davet edemezsiniz.'); return; }
      fbInvite(inviteEmail).then(function(){
        logAudit('invite-sent', inviteEmail + ' davet edildi');
        persist();
        showToast(inviteEmail + ' davet edildi — bu e-postayla Google girişi yaptığında otomatik katılacak.');
        form.reset();
      }).catch(function(err){
        showToast('Davet gönderilemedi: ' + (err && err.message ? err.message : 'bilinmeyen hata'));
      });
      return;
    }
    if(action==='add-person'){
      var name = (fd.get('name')||'').trim();
      if(name){ state.people.push({ id: uid('p'), name: name, approved:true, isAdmin:false }); logAudit('person-add', name + ' eklendi'); form.reset(); persist(); }
      return;
    }

    /* ---- Şifre Kasası ---- */
    if(action==='vault-setup'){
      var vsP1 = fd.get('password')||'', vsP2 = fd.get('password2')||'';
      if(vsP1.length<6){ showToast('Ana şifre en az 6 karakter olmalı.'); return; }
      if(vsP1!==vsP2){ showToast('Ana şifreler eşleşmiyor.'); return; }
      var vsSalt = randomB64(16);
      vaultDeriveKey(vsP1, vsSalt).then(function(key){
        return vaultEncryptText(key, VAULT_CHECK_PLAINTEXT).then(function(chk){
          state.passwordVault = { salt: vsSalt, check: chk, entries: [] };
          vaultKey = key;
          logAudit('vault-setup', 'Şifre kasası oluşturuldu');
          form.reset();
          persist();
          showToast('Şifre kasası oluşturuldu.');
        });
      }).catch(function(){ showToast('Kasa oluşturulamadı, tekrar deneyin.'); });
      return;
    }
    if(action==='vault-unlock'){
      var vuP = fd.get('password')||'';
      var vuVault = state.passwordVault;
      vaultDeriveKey(vuP, vuVault.salt).then(function(key){
        return vaultDecryptText(key, vuVault.check.iv, vuVault.check.cipher).then(function(plain){
          if(plain !== VAULT_CHECK_PLAINTEXT) throw new Error('yanlış ana şifre');
          vaultKey = key;
          ui.vaultUnlockError = null;
          form.reset();
          render();
        });
      }).catch(function(){ ui.vaultUnlockError = 'Yanlış ana şifre.'; render(); });
      return;
    }
    if(action==='vault-save'){
      if(!vaultKey){ showToast('Kasa kilitli.'); return; }
      var vSaveId = fd.get('id');
      var vSaveBank = (fd.get('bank')||'').trim();
      if(!vSaveBank){ showToast('Banka/site adı girin.'); return; }
      var vSavePayload = JSON.stringify({ username: (fd.get('username')||'').trim(), password: fd.get('password')||'', notes: (fd.get('notes')||'').trim() });
      vaultEncryptText(vaultKey, vSavePayload).then(function(enc){
        if(!state.passwordVault.entries) state.passwordVault.entries = [];
        if(vSaveId){
          var existingEntry = state.passwordVault.entries.find(function(x){ return x.id===vSaveId; });
          if(existingEntry){ existingEntry.bank = vSaveBank; existingEntry.iv = enc.iv; existingEntry.cipher = enc.cipher; existingEntry.updatedAt = new Date().toISOString(); }
          delete ui.vaultReveal[vSaveId];
          logAudit('vault-edit', 'Şifre güncellendi: ' + vSaveBank);
        } else {
          state.passwordVault.entries.push({ id: uid('pw'), bank: vSaveBank, iv: enc.iv, cipher: enc.cipher, updatedAt: new Date().toISOString() });
          logAudit('vault-add', 'Yeni şifre eklendi: ' + vSaveBank);
        }
        closeModal();
        persist();
        showToast('Şifre kaydedildi.');
      }).catch(function(){ showToast('Şifrelenemedi, tekrar deneyin.'); });
      return;
    }

    if(action==='identity-request-submit'){
      var reqName = (fd.get('name')||'').trim();
      if(!reqName) return;
      var newPerson = { id: uid('p'), name: reqName, approved:false, isAdmin:false };
      state.people.push(newPerson);
      setLocalIdentity(newPerson.id);
      localIdentity = newPerson.id;
      ui.identityRequesting = false;
      logAudit('person-request', reqName + ' erişim istedi');
      persist();
      return;
    }

    if(action==='add-category'){
      var catType = form.getAttribute('data-type');
      var cname = (fd.get('name')||'').trim();
      if(cname){
        var list = state.categories[catType];
        var nextSlot = list.length % 8;
        list.push({ id: uid('c'), name: cname, slot: nextSlot });
        form.reset();
        persist();
      }
      return;
    }

    if(action==='add-card-network'){
      var netName = (fd.get('name')||'').trim();
      if(netName){ state.cardNetworks.push({ id: uid('net'), name: netName }); form.reset(); persist(); }
      return;
    }

    if(action==='save-recurring'){
      var recName = (fd.get('name')||'').trim();
      var recAmount = Math.abs(parseFloat(fd.get('amount'))) || 0;
      var recDay = clamp(parseInt(fd.get('day'),10) || 1, 1, 28);
      var recAccountId = fd.get('accountId') || null;
      var recCategoryId = fd.get('categoryId') || null;
      var recPersonId = fd.get('personId') || null;
      var recType = fd.get('type') || 'expense';
      if(!recName || recAmount<=0 || !recAccountId || !recCategoryId){ showToast('Lütfen tüm zorunlu alanları doldurun.'); return; }
      state.recurring.push({
        id: uid('rec'), name: recName, type: recType, amount: recAmount,
        categoryId: recCategoryId, accountId: recAccountId, personId: recPersonId || null,
        day: recDay, active: true, skippedMonths: [], installmentsRemaining: null, totalInstallments: null
      });
      logAudit('recurring-add', 'Düzenli ödeme eklendi: ' + recName + ' (' + fmtTRY(recAmount) + ')');
      ui.recurringForm = null;
      persist();
      return;
    }

    if(action==='save-goal'){
      var goalName = (fd.get('name')||'').trim();
      var goalTarget = parseFloat(fd.get('target')) || 0;
      var goalCurrent = parseFloat(fd.get('current')) || 0;
      var goalNote = (fd.get('note')||'').trim();
      var goalId = fd.get('id');
      if(!goalName || goalTarget<=0){ showToast('Lütfen hedef adı ve tutarı girin.'); return; }
      if(goalId){
        var gidx = state.goals.findIndex(function(x){ return x.id===goalId; });
        if(gidx>-1) state.goals[gidx] = Object.assign({}, state.goals[gidx], { name:goalName, target:goalTarget, current:goalCurrent, note:goalNote });
        logAudit('goal-edit', 'Hedef güncellendi: ' + goalName);
      } else {
        state.goals.push({ id: uid('goal'), name:goalName, target:goalTarget, current:goalCurrent, note:goalNote });
        logAudit('goal-add', 'Hedef eklendi: ' + goalName + ' (' + fmtTRY(goalTarget) + ')');
      }
      ui.goalForm = null;
      persist();
      return;
    }

    if(action==='save-budgets'){
      var budgetChanges = [];
      state.categories.expense.forEach(function(c){
        var raw = fd.get('b_' + c.id);
        var val = raw==null ? NaN : parseFloat(raw);
        var newVal = (!isNaN(val) && val>0) ? val : null;
        if(newVal !== (state.budgets[c.id]||null)) budgetChanges.push(c.name + ': ' + (newVal!=null ? fmtTRY(newVal) : 'kaldırıldı'));
        if(!isNaN(val) && val>0) state.budgets[c.id] = val;
        else delete state.budgets[c.id];
      });
      if(budgetChanges.length) logAudit('budgets-save', 'Bütçe güncellendi — ' + budgetChanges.join(', '));
      showToast('Bütçeler güncellendi.');
      persist();
      return;
    }

    if(action==='save-fx-rates'){
      if(!state.fxRates) state.fxRates = { USD:null, EUR:null, ALTIN:null };
      var fxChanges = [];
      ['USD','EUR','ALTIN'].forEach(function(code){
        var raw = fd.get('rate_' + code);
        var val = raw==null || raw==='' ? NaN : parseFloat(raw);
        var newVal = (!isNaN(val) && val>0) ? val : null;
        if(newVal !== state.fxRates[code]) fxChanges.push(code + ': ' + (newVal!=null ? fmtTRY(newVal) : 'kaldırıldı'));
        state.fxRates[code] = newVal;
      });
      if(fxChanges.length) logAudit('fx-rates-save', 'Döviz kurları güncellendi — ' + fxChanges.join(', '));
      showToast('Döviz kurları güncellendi.');
      persist();
      return;
    }

    if(action==='save-postpone'){
      var poTx = state.transactions.find(function(t){ return t.id===fd.get('id'); });
      var newDate = fd.get('date');
      if(poTx && newDate){ poTx.date = newDate; poTx.status = 'planned'; closeModal(); persist(); }
      return;
    }

    if(action==='save-reset-pin'){
      var editingPin = !!state.resetPin;
      var newPin = (fd.get('pin')||'').trim();
      var newPinConfirm = (fd.get('pinConfirm')||'').trim();
      var currentPinInput = (fd.get('currentPin')||'').trim();
      if(!/^[0-9]{4,8}$/.test(newPin)){ showToast('PIN 4-8 haneli bir sayı olmalı.'); return; }
      if(newPin!==newPinConfirm){ showToast('Girdiğiniz PIN\'ler eşleşmiyor.'); return; }
      if(editingPin && currentPinInput!==state.resetPin){ showToast('Mevcut PIN yanlış.'); return; }
      state.resetPin = newPin;
      logAudit('reset-pin-save', editingPin ? 'Sıfırlama PIN\'i değiştirildi' : 'Sıfırlama PIN\'i belirlendi');
      closeModal();
      showToast(editingPin ? 'PIN güncellendi.' : 'PIN belirlendi; artık verileri sıfırlayabilirsiniz.');
      persist();
      return;
    }

    if(action==='confirm-reset-pin'){
      var enteredPin = (fd.get('pin')||'').trim();
      if(!state.resetPin){ showToast('Önce Ayarlar\'dan bir PIN belirleyin.'); closeModal(); return; }
      if(enteredPin!==state.resetPin){ showToast('PIN yanlış.'); return; }
      state = defaultState();
      closeModal();
      persist();
      return;
    }
  });

  render();
})();
