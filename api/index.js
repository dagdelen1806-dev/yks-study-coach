var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// server/resourceCatalog/normalizers/turkishText.ts
var turkishLowerCase, DIACRITIC_MAP, foldTurkishDiacritics, normalizeForComparison, ALLOWED_LETTER_CLASS, normalizeKeepingTurkish, slugify2, tokenize;
var init_turkishText = __esm({
  "server/resourceCatalog/normalizers/turkishText.ts"() {
    "use strict";
    turkishLowerCase = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase();
    DIACRITIC_MAP = {
      \u00E7: "c",
      \u011F: "g",
      \u0131: "i",
      \u00F6: "o",
      \u015F: "s",
      \u00FC: "u"
    };
    foldTurkishDiacritics = (value) => value.replace(/[çğıöşü]/g, (char) => DIACRITIC_MAP[char] ?? char);
    normalizeForComparison = (value) => foldTurkishDiacritics(turkishLowerCase(value)).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    ALLOWED_LETTER_CLASS = "a-z\xE7\u011F\u0131\xF6\u015F\xFC\xE2\xEE\xFB";
    normalizeKeepingTurkish = (value) => turkishLowerCase(value).replace(/['’‘"“”]/g, "").replace(new RegExp(`[^${ALLOWED_LETTER_CLASS}0-9\\s]`, "g"), " ").replace(/\s+/g, " ").trim();
    slugify2 = (value) => {
      const folded = normalizeForComparison(value);
      return folded.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    };
    tokenize = (value) => normalizeKeepingTurkish(value).split(" ").filter(Boolean);
  }
});

// server/resourceCatalog/normalizers/publisherNormalizer.ts
var publisherNormalizer_exports = {};
__export(publisherNormalizer_exports, {
  normalizePublisherName: () => normalizePublisherName
});
function normalizePublisherName(rawName) {
  const trimmed = rawName.trim();
  const comparisonKey = normalizeForComparison(trimmed);
  const canonicalName = PUBLISHER_ALIASES[comparisonKey] ?? suffixTitleCase(trimmed);
  const normalizedName = normalizeForComparison(canonicalName);
  return {
    canonicalName,
    slug: slugify2(canonicalName),
    normalizedName
  };
}
var PUBLISHER_ALIASES, suffixTitleCase;
var init_publisherNormalizer = __esm({
  "server/resourceCatalog/normalizers/publisherNormalizer.ts"() {
    "use strict";
    init_turkishText();
    PUBLISHER_ALIASES = {
      "3d": "3D Yay\u0131nlar\u0131",
      "3d yayinlari": "3D Yay\u0131nlar\u0131",
      "ucdortbes": "\xDC\xE7D\xF6rtBe\u015F",
      "345": "\xDC\xE7D\xF6rtBe\u015F",
      "uc dort bes": "\xDC\xE7D\xF6rtBe\u015F",
      "bilgi sarmal": "Bilgi Sarmal",
      "bilgi sarmal yayincilik": "Bilgi Sarmal",
      "pegem": "Pegem Akademi",
      "pegem akademi": "Pegem Akademi",
      "pegem yayincilik": "Pegem Akademi",
      "karekok": "Karek\xF6k",
      "karekok yayincilik": "Karek\xF6k",
      "paraf": "Paraf Yay\u0131nlar\u0131",
      "paraf yayinlari": "Paraf Yay\u0131nlar\u0131",
      "rasyonel": "Rasyonel Yay\u0131nlar\u0131",
      "rasyonel yayinlari": "Rasyonel Yay\u0131nlar\u0131",
      "aydin": "Ayd\u0131n Yay\u0131nlar\u0131",
      "aydin yayinlari": "Ayd\u0131n Yay\u0131nlar\u0131",
      "orijinal": "Orijinal Yay\u0131nlar\u0131",
      "orijinal yayinlari": "Orijinal Yay\u0131nlar\u0131",
      "hiz ve renk": "H\u0131z ve Renk Yay\u0131nlar\u0131",
      "hiz ve renk yayinlari": "H\u0131z ve Renk Yay\u0131nlar\u0131"
    };
    suffixTitleCase = (value) => value.split(" ").filter(Boolean).map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR")).join(" ");
  }
});

// server/_core/vercelHandler.ts
import "dotenv/config";

// server/_core/timezone.ts
var DEFAULT_TIMEZONE = "Europe/Istanbul";
function resolveTimezone(requested) {
  const value = requested?.trim();
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    console.warn(`[timezone] APP_TIMEZONE="${value}" ge\xE7ersiz; ${DEFAULT_TIMEZONE} kullan\u0131l\u0131yor.`);
    return DEFAULT_TIMEZONE;
  }
}
process.env.TZ = resolveTimezone(process.env.APP_TIMEZONE);

// server/_core/app.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var APPROVAL_PENDING_ERR_MSG = "Account approval pending (10003)";
var APPROVAL_REJECTED_ERR_MSG = "Account approval rejected (10004)";
var PREMIUM_REQUIRED_ERR_MSG = "Premium subscription required (10005)";
var RATE_LIMITED_ERR_MSG = "Too many requests (10006)";
var EMAIL_UNVERIFIED_ERR_MSG = "Email verification required (10007)";
var EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 6e4;
var EMAIL_VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1e3;
var needsEmailVerification = (user) => user.loginMethod === "dev_email" && !user.emailVerifiedAt;

// server/_core/localAuth.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq as eq3 } from "drizzle-orm";

// drizzle/schema.ts
import { sql } from "drizzle-orm";
import { customType, decimal, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// shared/exams.ts
var EXAM_TRACKS = ["YKS", "LGS", "KPSS", "DGS", "MEB_AGS", "KPSS_A"];
var EXAM_KINDS = ["TYT", "AYT", "LGS", "KPSS_GYGK", "DGS", "MEB_AGS", "KPSS_A"];
var CATALOG_EXAM_SCOPES = [...EXAM_KINDS, "TYT_AYT", "YKS", "GENEL"];
var GRADE_LEVELS = ["7", "8", "9", "10", "11", "12", "mezun", "onlisans", "onlisans_mezun", "lisans", "lisans_mezun", "ortaogretim_mezun"];
var EXAM_KIND_DEFS = {
  TYT: {
    kind: "TYT",
    track: "YKS",
    label: "TYT",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "dershaneTemplate",
    subjects: [
      { name: "T\xFCrk\xE7e", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 20, weight: 1 },
      { name: "Sosyal", questions: 20, weight: 1 }
    ]
  },
  AYT: {
    kind: "AYT",
    track: "YKS",
    label: "AYT",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "studentTopics",
    subjects: [
      { name: "T\xFCrk\xE7e", questions: 40, weight: 1 },
      { name: "Matematik", questions: 40, weight: 1 },
      { name: "Fen", questions: 40, weight: 1 },
      { name: "Sosyal", questions: 46, weight: 1 }
    ]
  },
  // MEB LGS: sözel oturum 50 soru / 75 dk, sayısal oturum 40 soru / 80 dk.
  LGS: {
    kind: "LGS",
    track: "LGS",
    label: "LGS",
    optionCount: 4,
    wrongsPerCorrect: 3,
    formRows: "curriculum",
    scoreEstimate: { label: "Tahmini LGS puan\u0131", min: 100, max: 500 },
    subjects: [
      { name: "T\xFCrk\xE7e", questions: 20, weight: 4, session: "S\xF6zel" },
      { name: "\u0130nk\u0131lap Tarihi", questions: 10, weight: 1, session: "S\xF6zel" },
      { name: "Din K\xFClt\xFCr\xFC", questions: 10, weight: 1, session: "S\xF6zel" },
      { name: "\u0130ngilizce", questions: 10, weight: 1, session: "S\xF6zel" },
      { name: "Matematik", questions: 20, weight: 4, session: "Say\u0131sal" },
      { name: "Fen Bilimleri", questions: 20, weight: 4, session: "Say\u0131sal" }
    ]
  },
  // ÖSYM KPSS Genel Yetenek–Genel Kültür: 120 soru / 130 dk. Puan (P1, P3, P93…) standart puanla
  // hesaplandığı için tahmini puan yok.
  KPSS_GYGK: {
    kind: "KPSS_GYGK",
    track: "KPSS",
    label: "KPSS GY-GK",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "curriculum",
    subjects: [
      { name: "T\xFCrk\xE7e", questions: 30, weight: 1, session: "Genel Yetenek" },
      { name: "Matematik", questions: 30, weight: 1, session: "Genel Yetenek" },
      { name: "Tarih", questions: 27, weight: 1, session: "Genel K\xFClt\xFCr" },
      { name: "Co\u011Frafya", questions: 18, weight: 1, session: "Genel K\xFClt\xFCr" },
      { name: "Vatanda\u015Fl\u0131k", questions: 9, weight: 1, session: "Genel K\xFClt\xFCr" },
      { name: "G\xFCncel Bilgiler", questions: 6, weight: 1, session: "Genel K\xFClt\xFCr" }
    ]
  },
  // ÖSYM DGS: 100 soru / 135 dk, sayısal ve sözel bölüm eşit. Puan standart puanla; tahmini puan yok.
  DGS: {
    kind: "DGS",
    track: "DGS",
    label: "DGS",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "curriculum",
    subjects: [
      { name: "Say\u0131sal", questions: 50, weight: 1 },
      { name: "S\xF6zel", questions: 50, weight: 1 }
    ]
  },
  // ÖSYM MEB-AGS: 80 soru / 110 dk. Puan standart puanla; tahmini puan yok.
  MEB_AGS: {
    kind: "MEB_AGS",
    track: "MEB_AGS",
    label: "MEB-AGS",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "curriculum",
    subjects: [
      { name: "E\u011Fitim Bilimleri", questions: 30, weight: 1 },
      { name: "S\xF6zel Yetenek", questions: 15, weight: 1 },
      { name: "Say\u0131sal Yetenek", questions: 15, weight: 1 },
      { name: "Mevzuat", questions: 8, weight: 1 },
      { name: "Tarih", questions: 6, weight: 1 },
      { name: "T\xFCrkiye Co\u011Frafyas\u0131", questions: 6, weight: 1 }
    ]
  },
  // ÖSYM KPSS A grubu alan bilgisi: her test 40 soru (istatistik 60 dk, diğerleri 50 dk). Aday
  // yalnızca girdiği testleri seçer; deneme ve konu haritası seçilen alanlarla sınırlanır.
  KPSS_A: {
    kind: "KPSS_A",
    track: "KPSS_A",
    label: "KPSS A grubu",
    optionCount: 5,
    wrongsPerCorrect: 4,
    formRows: "curriculum",
    subjects: [
      { name: "Hukuk", questions: 40, weight: 1 },
      { name: "\u0130ktisat", questions: 40, weight: 1 },
      { name: "Maliye", questions: 40, weight: 1 },
      { name: "Muhasebe", questions: 40, weight: 1 },
      { name: "\u0130\u015Fletme", questions: 40, weight: 1 },
      { name: "\xC7al\u0131\u015Fma Ekonomisi", questions: 40, weight: 1 },
      { name: "\u0130statistik", questions: 40, weight: 1 },
      { name: "Kamu Y\xF6netimi", questions: 40, weight: 1 },
      { name: "Uluslararas\u0131 \u0130li\u015Fkiler", questions: 40, weight: 1 }
    ]
  }
};
var EXAM_TRACK_DEFS = {
  YKS: {
    track: "YKS",
    label: "YKS",
    authority: { name: "\xD6SYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi \xD6SYM TYT/AYT kapsam\u0131na ve MEB program\u0131na dayan\u0131r",
    onboarding: { title: "YKS", description: "\xDCniversite s\u0131nav\u0131 (TYT + AYT) \xB7 lise \xF6\u011Frencisi ya da mezun" },
    gradeLevels: ["9", "10", "11", "12", "mezun"],
    gradeQuestion: "S\u0131n\u0131f d\xFCzeyin",
    asksScoreType: true,
    goal: { kind: "university" },
    currentNet: { kind: "tytAyt" },
    studentNoun: "Bir YKS \xF6\u011Frencisi",
    studentPhrase: "Bir YKS \xF6\u011Frencisinin",
    promptContext: "\xD6\u011Frenci YKS'ye (\xD6SYM; TYT ve AYT oturumlar\u0131) haz\u0131rlan\u0131yor. Sorular 5 \u015F\u0131kl\u0131 (A-E), 4 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; \xD6SYM tarz\u0131.",
    questionStyle: "YKS (\xD6SYM) \xFCslubunda",
    dailyPlanRule: "Her g\xFCn toplam 60-150 dakika ve 2-4 oturum planla.",
    schoolKind: "lise",
    catalogBroadScopes: ["TYT_AYT", "YKS", "GENEL"]
  },
  LGS: {
    track: "LGS",
    label: "LGS",
    authority: { name: "MEB", url: "https://www.meb.gov.tr" },
    scopeNote: "Konu listesi MEB 8. s\u0131n\u0131f \xF6\u011Fretim program\u0131na dayan\u0131r",
    onboarding: { title: "LGS", description: "Liselere ge\xE7i\u015F s\u0131nav\u0131 \xB7 7. ya da 8. s\u0131n\u0131f" },
    gradeLevels: ["7", "8"],
    gradeQuestion: "S\u0131n\u0131f d\xFCzeyin",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef lise", placeholder: "\xD6rn. Kabata\u015F Erkek Lisesi", options: ["Fen Lisesi", "Sosyal Bilimler Lisesi", "Anadolu Lisesi", "Proje Okulu", "Mesleki ve Teknik Anadolu Lisesi", "\u0130mam Hatip Lisesi", "Hen\xFCz karar vermedim"], emptyText: "Hedef liseni hen\xFCz yazmad\u0131n." },
    targetScore: { label: "Hedef LGS puan\u0131n", placeholder: "\xD6rn. 450", min: 100, max: 500 },
    currentNet: { kind: "single", hint: "90 soru \xFCzerinden yakla\u015F\u0131k bir say\u0131 ya da aral\u0131k yazabilirsin (\xF6rn. 60-65).", placeholder: "\xD6rn. 60-65" },
    studentNoun: "LGS'ye haz\u0131rlanan bir ortaokul \xF6\u011Frencisi",
    studentPhrase: "LGS'ye haz\u0131rlanan bir ortaokul \xF6\u011Frencisinin",
    promptContext: "\xD6\u011Frenci LGS'ye (MEB Liselere Ge\xE7i\u015F Sistemi, 8. s\u0131n\u0131f) haz\u0131rlan\u0131yor; 13-14 ya\u015F\u0131nda. Dersler: T\xFCrk\xE7e, Matematik, Fen Bilimleri, T.C. \u0130nk\u0131lap Tarihi ve Atat\xFCrk\xE7\xFCl\xFCk, Din K\xFClt\xFCr\xFC ve Ahlak Bilgisi, \u0130ngilizce. Sorular 4 \u015F\u0131kl\u0131 (A-D), 3 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; MEB \xF6rnek soru tarz\u0131, beceri temelli. K\u0131sa ve a\xE7\u0131k c\xFCmleler kur, sakin ve cesaretlendirici ol, s\u0131nav kayg\u0131s\u0131n\u0131 art\u0131racak dil kullanma.",
    questionStyle: "LGS (MEB) \xFCslubunda, beceri temelli",
    dailyPlanRule: "Her g\xFCn toplam 45-120 dakika ve 2-4 k\u0131sa oturum planla (okul ve \xF6devlerle birlikte yorucu olmas\u0131n).",
    schoolKind: "ortaokul",
    catalogBroadScopes: []
  },
  KPSS: {
    track: "KPSS",
    label: "KPSS",
    authority: { name: "\xD6SYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi \xD6SYM KPSS Genel Yetenek\u2013Genel K\xFClt\xFCr kapsam\u0131na dayan\u0131r",
    onboarding: { title: "KPSS", description: "Kamu personel se\xE7me s\u0131nav\u0131 \xB7 Genel Yetenek\u2013Genel K\xFClt\xFCr" },
    gradeLevels: ["lisans", "lisans_mezun", "onlisans_mezun", "ortaogretim_mezun"],
    gradeQuestion: "E\u011Fitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef kadro", placeholder: "\xD6rn. Vergi m\xFCfetti\u015F yard\u0131mc\u0131l\u0131\u011F\u0131", options: ["Memurluk (B grubu)", "A grubu kadro", "S\xF6zle\u015Fmeli personel", "Hen\xFCz karar vermedim"], emptyText: "Hedef kadronu hen\xFCz yazmad\u0131n." },
    targetScore: { label: "Hedef KPSS puan\u0131n", placeholder: "\xD6rn. 85", min: 40, max: 100 },
    currentNet: { kind: "single", hint: "120 soru \xFCzerinden (Genel Yetenek + Genel K\xFClt\xFCr) yakla\u015F\u0131k bir say\u0131 ya da aral\u0131k yazabilirsin (\xF6rn. 70-75).", placeholder: "\xD6rn. 70-75" },
    studentNoun: "Bir KPSS aday\u0131",
    studentPhrase: "Bir KPSS aday\u0131n\u0131n",
    promptContext: "Aday KPSS Genel Yetenek\u2013Genel K\xFClt\xFCr'e (\xD6SYM) haz\u0131rlan\u0131yor; yeti\u015Fkin, \xE7o\u011Fu zaman \xE7al\u0131\u015F\u0131yor ya da okuyor. Dersler: T\xFCrk\xE7e ve Matematik (Genel Yetenek), Tarih, Co\u011Frafya, Vatanda\u015Fl\u0131k ve G\xFCncel Bilgiler (Genel K\xFClt\xFCr). Sorular 5 \u015F\u0131kl\u0131 (A-E), 4 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; \xD6SYM tarz\u0131. Bir yeti\u015Fkine hitap et; ger\xE7ek\xE7i, i\u015F/okul temposuna uyan \xF6neriler ver.",
    questionStyle: "KPSS (\xD6SYM) \xFCslubunda",
    dailyPlanRule: "Her g\xFCn toplam 60-180 dakika ve 2-4 oturum planla; aday\u0131n i\u015F/okul saatlerini zorlamayan, hafta sonu daha yo\u011Fun bir tempo kur.",
    schoolKind: "kurs",
    catalogBroadScopes: []
  },
  DGS: {
    track: "DGS",
    label: "DGS",
    authority: { name: "\xD6SYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi \xD6SYM DGS say\u0131sal ve s\xF6zel b\xF6l\xFCm kapsam\u0131na dayan\u0131r",
    onboarding: { title: "DGS", description: "Dikey ge\xE7i\u015F s\u0131nav\u0131 \xB7 \xF6nlisans \xF6\u011Frencisi ya da mezun" },
    gradeLevels: ["onlisans", "onlisans_mezun"],
    gradeQuestion: "E\u011Fitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef lisans b\xF6l\xFCm\xFC", placeholder: "\xD6rn. Bilgisayar M\xFChendisli\u011Fi", options: [], emptyText: "Hedef lisans b\xF6l\xFCm\xFCn\xFC hen\xFCz yazmad\u0131n." },
    targetScore: { label: "Hedef DGS puan\u0131n", placeholder: "\xD6rn. 300", min: 100, max: 500 },
    currentNet: { kind: "single", hint: "100 soru \xFCzerinden (say\u0131sal + s\xF6zel) yakla\u015F\u0131k bir say\u0131 ya da aral\u0131k yazabilirsin (\xF6rn. 55-60).", placeholder: "\xD6rn. 55-60" },
    studentNoun: "Bir DGS aday\u0131",
    studentPhrase: "Bir DGS aday\u0131n\u0131n",
    promptContext: "Aday DGS'ye (\xD6SYM Dikey Ge\xE7i\u015F S\u0131nav\u0131; \xF6nlisanstan lisansa ge\xE7i\u015F) haz\u0131rlan\u0131yor. B\xF6l\xFCmler: Say\u0131sal (matematik, geometri, say\u0131sal mant\u0131k) ve S\xF6zel (T\xFCrk\xE7e, paragraf, s\xF6zel mant\u0131k), 50'\u015Fer soru. Sorular 5 \u015F\u0131kl\u0131 (A-E), 4 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; \xD6SYM tarz\u0131. Bir yeti\u015Fkine hitap et.",
    questionStyle: "DGS (\xD6SYM) \xFCslubunda",
    dailyPlanRule: "Her g\xFCn toplam 60-150 dakika ve 2-4 oturum planla; \xF6nlisans dersleri ve s\u0131navlar\u0131yla \xE7ak\u0131\u015Fmayan bir tempo kur.",
    schoolKind: "\xF6nlisans",
    catalogBroadScopes: []
  },
  MEB_AGS: {
    track: "MEB_AGS",
    label: "MEB-AGS",
    authority: { name: "\xD6SYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi \xD6SYM MEB Akademi Giri\u015F S\u0131nav\u0131 kapsam\u0131na dayan\u0131r",
    onboarding: { title: "MEB-AGS", description: "\xD6\u011Fretmen adaylar\u0131 \xB7 Mill\xEE E\u011Fitim Akademisi Giri\u015F S\u0131nav\u0131 (KPSS ile birlikte)" },
    gradeLevels: ["lisans", "lisans_mezun"],
    gradeQuestion: "E\u011Fitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "\xD6\u011Fretmenlik alan\u0131n", placeholder: "\xD6rn. \u0130lk\xF6\u011Fretim Matematik \xD6\u011Fretmenli\u011Fi", options: ["S\u0131n\u0131f \xD6\u011Fretmenli\u011Fi", "Okul \xD6ncesi", "T\xFCrk\xE7e", "Matematik", "Fen Bilimleri", "\u0130ngilizce", "Rehberlik"], emptyText: "\xD6\u011Fretmenlik alan\u0131n\u0131 hen\xFCz yazmad\u0131n." },
    targetScore: { label: "Hedef AGS puan\u0131n", placeholder: "\xD6rn. 80", min: 40, max: 100 },
    currentNet: { kind: "single", hint: "80 soru \xFCzerinden yakla\u015F\u0131k bir say\u0131 ya da aral\u0131k yazabilirsin (\xF6rn. 55-60).", placeholder: "\xD6rn. 55-60" },
    studentNoun: "Bir \xF6\u011Fretmen aday\u0131 (MEB-AGS)",
    studentPhrase: "Bir \xF6\u011Fretmen aday\u0131n\u0131n (MEB-AGS)",
    promptContext: "Aday MEB-AGS'ye (\xD6SYM, Mill\xEE E\u011Fitim Akademisi Giri\u015F S\u0131nav\u0131) haz\u0131rlanan bir \xF6\u011Fretmen aday\u0131; KPSS'ye de giriyor olabilir. Alt testler: E\u011Fitim Bilimleri ve T\xFCrk Mill\xEE E\u011Fitim Sistemi (30), S\xF6zel Yetenek (15), Say\u0131sal Yetenek (15), Mevzuat (8), Tarih (6), T\xFCrkiye Co\u011Frafyas\u0131 (6). Sorular 5 \u015F\u0131kl\u0131 (A-E), 4 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; \xD6SYM tarz\u0131. Bir yeti\u015Fkine hitap et.",
    questionStyle: "MEB-AGS (\xD6SYM) \xFCslubunda",
    dailyPlanRule: "Her g\xFCn toplam 60-180 dakika ve 2-4 oturum planla; E\u011Fitim Bilimleri'ne a\u011F\u0131rl\u0131k ver, aday\u0131n okul/staj ya da i\u015F temposunu zorlama.",
    schoolKind: "\xFCniversite",
    catalogBroadScopes: [],
    addonOf: "KPSS"
  },
  KPSS_A: {
    track: "KPSS_A",
    label: "KPSS A grubu",
    authority: { name: "\xD6SYM", url: "https://www.osym.gov.tr" },
    scopeNote: "Konu listesi \xD6SYM KPSS A grubu alan bilgisi testlerinin kapsam\u0131na dayan\u0131r",
    onboarding: { title: "KPSS A grubu", description: "Alan bilgisi testleri \xB7 hukuk, iktisat, maliye\u2026 (KPSS ile birlikte)" },
    gradeLevels: ["lisans", "lisans_mezun"],
    gradeQuestion: "E\u011Fitim durumun",
    asksScoreType: false,
    goal: { kind: "custom", label: "Hedef kadro", placeholder: "\xD6rn. Say\u0131\u015Ftay denet\xE7i yard\u0131mc\u0131l\u0131\u011F\u0131", options: ["Kaymakaml\u0131k", "M\xFCfetti\u015F yard\u0131mc\u0131l\u0131\u011F\u0131", "Uzman yard\u0131mc\u0131l\u0131\u011F\u0131", "Denet\xE7i yard\u0131mc\u0131l\u0131\u011F\u0131", "Hen\xFCz karar vermedim"], emptyText: "Hedef kadronu hen\xFCz yazmad\u0131n." },
    targetScore: { label: "Hedef A grubu puan\u0131n", placeholder: "\xD6rn. 85", min: 40, max: 100 },
    currentNet: { kind: "single", hint: "Girdi\u011Fin alan testlerinin toplam netini yakla\u015F\u0131k yazabilirsin (her test 40 soru).", placeholder: "\xD6rn. 25-30 / test" },
    studentNoun: "Bir KPSS A grubu aday\u0131",
    studentPhrase: "Bir KPSS A grubu aday\u0131n\u0131n",
    promptContext: "Aday KPSS A grubu alan bilgisi testlerine (\xD6SYM) haz\u0131rlan\u0131yor; her test 40 soru. Yaln\u0131zca aday\u0131n se\xE7ti\u011Fi alan testlerine (ders listesindekiler) odaklan. Sorular 5 \u015F\u0131kl\u0131 (A-E), 4 yanl\u0131\u015F 1 do\u011Fruyu g\xF6t\xFCr\xFCr; \xD6SYM tarz\u0131, kavram ve mevzuat a\u011F\u0131rl\u0131kl\u0131. Bir yeti\u015Fkine hitap et.",
    questionStyle: "KPSS A grubu (\xD6SYM) \xFCslubunda",
    dailyPlanRule: "Her g\xFCn toplam 90-240 dakika ve 2-4 oturum planla; se\xE7ilen alan testleri aras\u0131nda dengeli da\u011F\u0131t, aday\u0131n i\u015F temposunu zorlama.",
    schoolKind: "kurs",
    catalogBroadScopes: [],
    addonOf: "KPSS",
    chooseSubjects: { label: "Girece\u011Fin alan testleri", hint: "Konu haritan, denemelerin ve AI plan\u0131n yaln\u0131zca se\xE7ti\u011Fin testlere g\xF6re kurulur." }
  }
};
var EXAM_TRACK_LABELS = Object.fromEntries(EXAM_TRACKS.map((track) => [track, EXAM_TRACK_DEFS[track].label]));
var trackOf = (kind) => EXAM_KIND_DEFS[kind].track;
var kindsOf = (track) => EXAM_KINDS.filter((kind) => EXAM_KIND_DEFS[kind].track === track);
var defaultKindOf = (track) => kindsOf(track)[0];
var subjectNamesOf = (kind) => EXAM_KIND_DEFS[kind].subjects.map((subject2) => subject2.name);
function estimateScore(kind, nets) {
  const def = kind ? EXAM_KIND_DEFS[kind] : null;
  if (!def?.scoreEstimate) return null;
  const { min, max } = def.scoreEstimate;
  const ceiling = def.subjects.reduce((sum, subject2) => sum + subject2.questions * subject2.weight, 0);
  const weighted = def.subjects.reduce((sum, subject2) => sum + Math.min(subject2.questions, Math.max(0, Number(nets[subject2.name]) || 0)) * subject2.weight, 0);
  return Math.round((min + (max - min) * weighted / ceiling) * 100) / 100;
}
var scoredKindOf = (track) => kindsOf(track).find((kind) => EXAM_KIND_DEFS[kind].scoreEstimate) ?? null;
var examStudentPhrase = (track) => EXAM_TRACK_DEFS[track].studentPhrase;
var optionCountOf = (track) => EXAM_KIND_DEFS[defaultKindOf(track)].optionCount;
var examPromptContext = (track) => EXAM_TRACK_DEFS[track].promptContext;
var catalogScopeCovers = (scope, kind) => scope === kind || EXAM_TRACK_DEFS[trackOf(kind)].catalogBroadScopes.includes(scope);

// drizzle/schema.ts
var users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Yalnızca yerel giriş (`loginMethod` "dev" / "dev_email" / "dev_phone", bkz. server/_core/localAuth.ts)
  // kullanan hesaplarda dolu olur (scrypt `salt:hash`).
  passwordHash: varchar("passwordHash", { length: 255 }),
  // E-posta doğrulaması (bkz. server/_core/emailVerification.ts). Yalnızca
  // `loginMethod = "dev_email"` hesaplar için zorunlu; NULL = doğrulanmadı.
  // `emailVerificationSentAt` tekrar gönderme bekleme süresini sunucusuz
  // ortamda da (her instance ayrı bellek) güvenilir kılmak için DB'de tutulur.
  emailVerifiedAt: timestamp("emailVerifiedAt", { withTimezone: true }),
  emailVerificationSentAt: timestamp("emailVerificationSentAt", { withTimezone: true }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  // Manuel üyelik onayı (PHASE 2 spec §admin-approval). Sütun varsayılanı
  // "approved" — bu, migration uygulandığında MEVCUT tüm hesapların
  // (bu oturumda test edilen gerçek hesap dahil) kilitlenmemesi içindir.
  // Yeni hesap oluşturma kodu (server/db.ts upsertUser'ın INSERT dalı)
  // bunu bilerek "pending" olarak GEÇERSİZ KILAR — yani sütun varsayılanı
  // yalnızca "geçmiş" kayıtlar için güvenli bir taban, uygulama mantığı her
  // zaman kazanır.
  approvalStatus: text("approvalStatus", { enum: ["pending", "approved", "rejected"] }).default("approved").notNull(),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  approvedBy: integer("approvedBy"),
  rejectedAt: timestamp("rejectedAt", { withTimezone: true }),
  rejectionReason: varchar("rejectionReason", { length: 300 }),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAMALI (spec §23).
  accountStatus: text("accountStatus", { enum: ["active", "suspended", "deleted"] }).default("active").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull()
});
var yksTopics = pgTable("yks_topics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  exam: text("exam", { enum: EXAM_KINDS }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  unit: varchar("unit", { length: 120 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  /** Yönetim Paneli → Konular'da gizlenen konu yeni listelere/şablonlara girmez; öğrencinin eski verisi kalır, tohum geri eklemez. */
  hidden: integer("hidden").default(0).notNull(),
  /** Yeniden adlandırılan konunun eski adları (JSON dizi): eski adla gelen veri (TYT şablonu, eski kayıtlar) aynı konuya bağlanır. */
  previousNames: text("previousNames").default("[]").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var topicProgress = pgTable("topic_progress", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  topicId: integer("topicId").notNull(),
  progress: integer("progress").default(0).notNull(),
  status: text("status", { enum: ["weak", "medium", "good"] }).default("medium").notNull(),
  lastReviewedAt: timestamp("lastReviewedAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var mockExams = pgTable("mock_exams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: text("exam", { enum: EXAM_KINDS }).default("TYT").notNull(),
  examDate: timestamp("examDate", { withTimezone: true }).notNull(),
  turkceNet: integer("turkceNet").default(0).notNull(),
  matematikNet: integer("matematikNet").default(0).notNull(),
  fenNet: integer("fenNet").default(0).notNull(),
  sosyalNet: integer("sosyalNet").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var userMockExams = pgTable("user_mock_exams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  exam: text("exam", { enum: EXAM_KINDS }).notNull(),
  examDate: timestamp("examDate", { withTimezone: true }).notNull(),
  net: decimal("net", { precision: 6, scale: 2 }).notNull(),
  delta: decimal("delta", { precision: 6, scale: 2 }).default("0").notNull(),
  subjectsJson: text("subjectsJson").notNull(),
  timeSpentJson: text("timeSpentJson").notNull(),
  topicNetsJson: text("topicNetsJson").notNull(),
  topicDetailsJson: text("topicDetailsJson").notNull(),
  importedFrom: text("importedFrom", { enum: ["manual", "ocr", "pdf", "csv", "xlsx"] }).default("manual").notNull(),
  // Karşılaştırılabilirlik (Novara Rehber): yayınevi, kurumun deneme kodu, tam/branş denemesi. Boşsa tam deneme sayılır.
  publisher: varchar("publisher", { length: 120 }),
  examCode: varchar("examCode", { length: 60 }),
  scope: text("scope", { enum: ["full", "branch"] }),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var studySessions = pgTable("study_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  topicId: integer("topicId"),
  mode: text("mode", { enum: ["review", "practice", "analysis"] }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }).defaultNow().notNull()
});
var resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  level: text("level", { enum: ["beginner", "medium", "advanced"] }).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 })
});
var userResourceBooks = pgTable("user_resource_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  exam: text("exam", { enum: EXAM_KINDS }).notNull(),
  level: text("level", { enum: ["Kolay", "Orta", "Zor"] }).notNull(),
  format: varchar("format", { length: 120 }).notNull(),
  reason: text("reason").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  pageCount: integer("pageCount"),
  tone: varchar("tone", { length: 20 }).default("blue").notNull(),
  // Kapak OCR'ından (öğrenci onayladıktan sonra). ISBN varsa mükerrer kitap
  // tespitinde en güçlü kimliktir; yoksa yayınevi + normalize ad + yazar.
  authors: varchar("authors", { length: 300 }),
  isbn: varchar("isbn", { length: 32 }),
  // Ortak kitap kaydındaki karşılığı (shared_books); eski ve elle eklenmiş kitaplarda boş.
  sharedBookId: integer("sharedBookId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var sharedBooks = pgTable("shared_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 180 }).notNull(),
  publisher: varchar("publisher", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  exam: text("exam", { enum: EXAM_KINDS }).notNull(),
  authors: varchar("authors", { length: 300 }),
  isbn: varchar("isbn", { length: 32 }),
  edition: varchar("edition", { length: 120 }),
  /** normalizeBookText(title) / (publisher): arama ve eşleştirme anahtarı. */
  titleKey: varchar("titleKey", { length: 200 }).notNull(),
  publisherKey: varchar("publisherKey", { length: 140 }).notNull(),
  ownerCount: integer("ownerCount").default(1).notNull(),
  createdByUserId: integer("createdByUserId"),
  /** Onaylanmış içindekiler (SaveContentInput[] JSON); yoksa null. */
  contentsJson: text("contentsJson"),
  contentsItemCount: integer("contentsItemCount").default(0).notNull(),
  contentsTopicCount: integer("contentsTopicCount").default(0).notNull(),
  contentsSource: text("contentsSource", { enum: ["ocr", "manual"] }),
  contentsByUserId: integer("contentsByUserId"),
  contentsUpdatedAt: timestamp("contentsUpdatedAt", { withTimezone: true }),
  contentsReuseCount: integer("contentsReuseCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  isbnIdx: index("shared_books_isbn_idx").on(table.isbn),
  titleKeyIdx: index("shared_books_title_key_idx").on(table.titleKey)
}));
var bookInventory = pgTable("book_inventory", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  addedAt: timestamp("addedAt", { withTimezone: true }).defaultNow().notNull(),
  removedAt: timestamp("removedAt", { withTimezone: true })
});
var bookStudyLogs = pgTable("book_study_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }),
  sessionDate: timestamp("sessionDate", { withTimezone: true }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  questions: integer("questions").default(0).notNull(),
  correct: integer("correct").default(0).notNull(),
  wrong: integer("wrong").default(0).notNull(),
  blank: integer("blank").default(0).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  testStart: integer("testStart"),
  testEnd: integer("testEnd"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var bookTopicMappings = pgTable("book_topic_mappings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  testStart: integer("testStart"),
  testEnd: integer("testEnd"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var userBookContents = pgTable("user_book_contents", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  bookId: varchar("bookId", { length: 120 }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
  unitNumber: integer("unitNumber"),
  unitTitle: varchar("unitTitle", { length: 300 }).notNull(),
  contentType: text("contentType", { enum: ["topic_test", "osym_type", "review", "simulation", "topic"] }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  testNumber: integer("testNumber"),
  title: varchar("title", { length: 300 }).notNull(),
  pageStart: integer("pageStart"),
  pageEnd: integer("pageEnd"),
  topicId: integer("topicId"),
  mappingStatus: text("mappingStatus", { enum: ["confirmed", "unmatched", "not_applicable"] }).notNull(),
  mappingMethod: text("mappingMethod", { enum: ["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"] }).default("none").notNull(),
  mappingConfidence: decimal("mappingConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  source: text("source", { enum: ["ocr", "manual"] }).default("ocr").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userBookIdx: index("user_book_contents_user_book_idx").on(table.userId, table.bookId),
  userTopicIdx: index("user_book_contents_user_topic_idx").on(table.userId, table.topicId)
}));
var mediumBlob = customType({ dataType: () => "bytea" });
var notes = pgTable("notes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  // Çevrimdışı/yeniden gönderilen kayıtta aynı notun ikinci kez oluşmaması için istemcinin ürettiği kimlik.
  clientId: varchar("clientId", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  plainText: text("plainText").notNull(),
  // Liste önizlemesi: {"images":2,"voice":1,"voiceSeconds":32,"formulas":1,"drawings":0,...}
  stats: varchar("stats", { length: 500 }).notNull(),
  noteDate: timestamp("noteDate", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["active", "archived"] }).default("active").notNull(),
  visibility: text("visibility", { enum: ["private"] }).default("private").notNull(),
  isFavorite: integer("isFavorite").default(0).notNull(),
  isPinned: integer("isPinned").default(0).notNull(),
  reviewAt: timestamp("reviewAt", { withTimezone: true }),
  templateKey: varchar("templateKey", { length: 40 }),
  subject: varchar("subject", { length: 80 }),
  topicId: integer("topicId"),
  bookId: varchar("bookId", { length: 120 }),
  bookContentId: integer("bookContentId"),
  studySessionId: integer("studySessionId"),
  mockExamId: integer("mockExamId"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  userClientUnique: uniqueIndex("notes_user_client_unique").on(table.userId, table.clientId),
  userDateIdx: index("notes_user_date_idx").on(table.userId, table.noteDate),
  userTopicIdx: index("notes_user_topic_idx").on(table.userId, table.topicId),
  userBookIdx: index("notes_user_book_idx").on(table.userId, table.bookId),
  userSessionIdx: index("notes_user_session_idx").on(table.userId, table.studySessionId),
  userReviewIdx: index("notes_user_review_idx").on(table.userId, table.reviewAt)
}));
var noteTags = pgTable("note_tags", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  noteId: integer("noteId").notNull(),
  userId: integer("userId").notNull(),
  tag: varchar("tag", { length: 40 }).notNull()
}, (table) => ({
  noteTagUnique: uniqueIndex("note_tags_note_tag_unique").on(table.noteId, table.tag),
  userTagIdx: index("note_tags_user_tag_idx").on(table.userId, table.tag)
}));
var noteAttachments = pgTable("note_attachments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  noteId: integer("noteId"),
  kind: text("kind", { enum: ["image", "audio"] }).notNull(),
  mimeType: varchar("mimeType", { length: 60 }).notNull(),
  byteSize: integer("byteSize").notNull(),
  // Baytlar ya burada (Supabase ayarı yoksa) ya da Supabase Storage'da `storageKey` altında.
  data: mediumBlob("data"),
  storageKey: varchar("storageKey", { length: 200 }),
  // Ek bir deftere notuna ya da bir Duvarım kaydına bağlıdır; ikisi de boşsa yetimdir (süre sonunda silinir).
  wallPostId: integer("wallPostId"),
  durationSec: integer("durationSec"),
  ocrText: text("ocrText"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userNoteIdx: index("note_attachments_user_note_idx").on(table.userId, table.noteId),
  userWallPostIdx: index("note_attachments_user_wall_post_idx").on(table.userId, table.wallPostId)
}));
var wallPosts = pgTable("wall_posts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  kind: text("kind", { enum: ["note", "link", "quote"] }).default("note").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  plainText: text("plainText").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1e3 }),
  sourceTitle: varchar("sourceTitle", { length: 300 }),
  sourceDescription: varchar("sourceDescription", { length: 500 }),
  sourceSite: varchar("sourceSite", { length: 120 }),
  tags: varchar("tags", { length: 300 }).default("").notNull(),
  subject: varchar("subject", { length: 80 }),
  topicId: integer("topicId"),
  readLater: integer("readLater").default(0).notNull(),
  readAt: timestamp("readAt", { withTimezone: true }),
  isPinned: integer("isPinned").default(0).notNull(),
  visibility: text("visibility", { enum: ["private"] }).default("private").notNull(),
  postedAt: timestamp("postedAt", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  userPostedIdx: index("wall_posts_user_posted_idx").on(table.userId, table.postedAt),
  userTopicIdx: index("wall_posts_user_topic_idx").on(table.userId, table.topicId)
}));
var notebookQuestions = pgTable("notebook_questions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  noteId: integer("noteId").notNull(),
  subject: varchar("subject", { length: 80 }),
  topicId: integer("topicId"),
  questionImageId: integer("questionImageId"),
  solutionImageId: integer("solutionImageId"),
  voiceAttachmentId: integer("voiceAttachmentId"),
  voiceDuration: integer("voiceDuration"),
  stuckPoint: text("stuckPoint"),
  solutionText: text("solutionText"),
  // Hata türü: AI önerirse "ai", öğrenci seçer ya da onaylarsa "student".
  errorType: varchar("errorType", { length: 30 }),
  errorTypeSource: text("errorTypeSource", { enum: ["student", "ai"] }),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }),
  // AI'ın önerdiği konu (öğrenci düzelttiyse topicId'den farklı kalır: öneri isabeti ölçülebilsin).
  aiTopicId: integer("aiTopicId"),
  // ✨ Adım adım çöz: AI çözümü (JSON, AiSolution). Kartta saklanır; tekrar açmak yeniden ücret ödetmez.
  aiSolution: text("aiSolution"),
  aiSolutionAt: timestamp("aiSolutionAt", { withTimezone: true }),
  // Çözümü hangi kademe/model yazdı ("strong:gemini-…", üst kademeye çıkıldıysa sonu "↑"): maliyet ve isabet takibi.
  aiSolutionModel: varchar("aiSolutionModel", { length: 100 }),
  status: text("status", { enum: ["unsolved", "learning", "mastered"] }).default("unsolved").notNull(),
  reviewStage: integer("reviewStage").default(0).notNull(),
  nextReviewAt: timestamp("nextReviewAt", { withTimezone: true }),
  attemptCount: integer("attemptCount").default(0).notNull(),
  lastResult: text("lastResult", { enum: ["solved", "partial", "failed"] }),
  lastAttemptAt: timestamp("lastAttemptAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  noteUnique: uniqueIndex("notebook_questions_note_unique").on(table.noteId),
  userReviewIdx: index("notebook_questions_user_review_idx").on(table.userId, table.nextReviewAt),
  userTopicIdx: index("notebook_questions_user_topic_idx").on(table.userId, table.topicId)
}));
var questionAttempts = pgTable("question_attempts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  result: text("result", { enum: ["solved", "partial", "failed"] }).notNull(),
  sawSolution: integer("sawSolution").default(0).notNull(),
  // Kademeli ipucu: 0 yok, 1 ipucu, 2 ilk adım, 3 tam çözüm (HINT_LEVELS).
  hintLevel: integer("hintLevel").default(0).notNull(),
  seconds: integer("seconds"),
  stageBefore: integer("stageBefore").notNull(),
  attemptedAt: timestamp("attemptedAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userQuestionIdx: index("question_attempts_user_question_idx").on(table.userId, table.questionId)
}));
var ocrPageCache = pgTable("ocr_page_cache", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  imageHash: varchar("imageHash", { length: 64 }).notNull(),
  pipelineVersion: varchar("pipelineVersion", { length: 16 }).notNull(),
  resultJson: text("resultJson").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userHashUnique: uniqueIndex("ocr_page_cache_user_hash_unique").on(table.userId, table.imageHash, table.pipelineVersion)
}));
var sourceSwitches = pgTable("source_switches", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  fromBookId: varchar("fromBookId", { length: 120 }),
  toBookId: varchar("toBookId", { length: 120 }).notNull(),
  reason: varchar("reason", { length: 300 }).notNull(),
  switchedAt: timestamp("switchedAt", { withTimezone: true }).defaultNow().notNull()
});
var studyPlans = pgTable("study_plans", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  weekStart: timestamp("weekStart", { withTimezone: true }).notNull(),
  weekEnd: timestamp("weekEnd", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  source: text("source", { enum: ["ai", "manual"] }).default("ai").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var studyPlanSessions = pgTable("study_plan_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  planId: integer("planId").notNull(),
  userId: integer("userId").notNull(),
  sessionDate: timestamp("sessionDate", { withTimezone: true }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  plannedMinutes: integer("plannedMinutes").default(0).notNull(),
  targetQuestions: integer("targetQuestions"),
  targetPages: varchar("targetPages", { length: 80 }),
  targetTests: varchar("targetTests", { length: 80 }),
  // Kitaptan üretilmiş görevde öğrencinin kitabı (bkz. userBookContents).
  // Tamamlanınca performans ayrıca bookStudyLogs'a da yazılır: kitap çözümü
  // ile konu/soru takibi ayrı veri olarak kalır ama bu alanla ilişkilenir.
  sourceBookId: varchar("sourceBookId", { length: 120 }),
  status: text("status", { enum: ["planned", "completed", "skipped"] }).default("planned").notNull(),
  rescheduledFrom: timestamp("rescheduledFrom", { withTimezone: true }),
  rescheduledAt: timestamp("rescheduledAt", { withTimezone: true }),
  rescheduleCount: integer("rescheduleCount").default(0).notNull(),
  // Kurum öğretmeninin atadığı görev (bkz. organization_*); öğrencinin kendi görevlerinde boş.
  assignedByUserId: integer("assignedByUserId"),
  assignedOrgId: integer("assignedOrgId"),
  // Akademik takip dosyasından gelen görev ve öğrencinin geri bildirimi (Tamamladım / Zorlandım / Tekrar etmeliyim).
  caseActionId: integer("caseActionId"),
  studentFeedback: text("studentFeedback", { enum: ["done", "struggled", "needs_review"] }),
  studentFeedbackAt: timestamp("studentFeedbackAt", { withTimezone: true }),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  actualMinutes: integer("actualMinutes"),
  actualQuestions: integer("actualQuestions"),
  correct: integer("correct"),
  wrong: integer("wrong"),
  blank: integer("blank"),
  actualPages: integer("actualPages"),
  note: text("note"),
  // Oturum hatırlatma bildirimi gönderildiyse (server/push/sessionReminders.ts): aynı oturuma ikinci bildirim gitmez.
  reminderSentAt: timestamp("reminderSentAt", { withTimezone: true }),
  // Bu oturumdan açılan odak süre dolmadan bırakıldıysa (topics.markForReview): takvimde
  // "Yarım kaldı" görünür; oturum planlı kalır, yeniden başlatılıp tamamlanabilir.
  abandonedAt: timestamp("abandonedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var pushSubscriptions = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  endpoint: varchar("endpoint", { length: 600 }).notNull(),
  p256dh: varchar("p256dh", { length: 200 }).notNull(),
  auth: varchar("auth", { length: 100 }).notNull(),
  userAgent: varchar("userAgent", { length: 300 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  lastSentAt: timestamp("lastSentAt", { withTimezone: true })
}, (table) => ({
  endpointIdx: uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
  userIdx: index("push_subscriptions_user_idx").on(table.userId)
}));
var classScheduleBlocks = pgTable("class_schedule_blocks", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  source: text("source", { enum: ["school", "course", "tutor", "other"] }).default("school").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  subject: varchar("subject", { length: 80 }),
  label: varchar("label", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userDayIdx: index("class_schedule_blocks_user_day_idx").on(table.userId, table.dayOfWeek)
}));
var organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] }).default("active").notNull(),
  // Kurum bilgileri (Ayarlar → Kurum bilgileri; kurum yöneticisi düzenler).
  kind: text("kind", { enum: ["dershane", "okul", "etut", "kocluk", "diger"] }).default("dershane").notNull(),
  city: varchar("city", { length: 80 }),
  district: varchar("district", { length: 80 }),
  address: varchar("address", { length: 300 }),
  phone: varchar("phone", { length: 40 }),
  contactEmail: varchar("contactEmail", { length: 160 }),
  // Üyelik (platform yöneticisi tanımlar): paket, süre ve aylık AI kredi havuzu.
  plan: text("plan", { enum: ["trial", "standard", "pro"] }).default("trial").notNull(),
  membershipStartsAt: timestamp("membershipStartsAt", { withTimezone: true }),
  membershipEndsAt: timestamp("membershipEndsAt", { withTimezone: true }),
  aiCreditsMonthly: integer("aiCreditsMonthly").default(0).notNull(),
  // Kurum yöneticisinin öğrenci başına aylık üst sınırı (boş = sınırsız).
  perStudentCreditCap: integer("perStudentCreditCap"),
  // KVKK: boşsa platform şablonu kullanılır; her düzenlemede sürüm artar.
  kvkkNotice: text("kvkkNotice"),
  kvkkConsent: text("kvkkConsent"),
  kvkkVersion: integer("kvkkVersion").default(1).notNull(),
  kvkkUpdatedAt: timestamp("kvkkUpdatedAt", { withTimezone: true }),
  // Akademik takip dosyaları (Novara Rehber) kurum bazında açılır; pilotta tek kurum.
  academicCasesEnabled: integer("academicCasesEnabled").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var organizationUpgradeRequests = pgTable("organization_upgrade_requests", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  requestedBy: integer("requestedBy").notNull(),
  currentPlan: text("currentPlan", { enum: ["trial", "standard", "pro"] }).notNull(),
  requestedPlan: text("requestedPlan", { enum: ["trial", "standard", "pro"] }).notNull(),
  note: varchar("note", { length: 300 }),
  status: text("status", { enum: ["pending", "approved", "rejected", "canceled"] }).default("pending").notNull(),
  resolvedBy: integer("resolvedBy"),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgStatusIdx: index("organization_upgrade_requests_org_status_idx").on(table.orgId, table.status)
}));
var organizationCreditUsage = pgTable("organization_credit_usage", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  userId: integer("userId").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  credits: integer("credits").notNull(),
  usedAt: timestamp("usedAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgUsedIdx: index("organization_credit_usage_org_used_idx").on(table.orgId, table.usedAt),
  orgUserUsedIdx: index("organization_credit_usage_org_user_used_idx").on(table.orgId, table.userId, table.usedAt)
}));
var organizationMembers = pgTable("organization_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  userId: integer("userId").notNull(),
  role: text("role", { enum: ["owner", "admin", "coordinator", "teacher", "student"] }).notNull(),
  status: text("status", { enum: ["active", "left", "removed"] }).default("active").notNull(),
  // Öğrencinin "kurumun verilerimi görmesine izin veriyorum" onayı (personelde boş).
  consentAt: timestamp("consentAt", { withTimezone: true }),
  joinedAt: timestamp("joinedAt", { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp("leftAt", { withTimezone: true }),
  invitedBy: integer("invitedBy"),
  // Personelin branşı (ör. Matematik); öğrencide boş.
  subject: varchar("subject", { length: 60 }),
  // Öğrencinin onayladığı KVKK metin sürümü (organizations.kvkkVersion).
  kvkkVersion: integer("kvkkVersion"),
  // Personelin pazar akşamı aldığı sınıf özeti (server/digest/teacherDigest.ts): üyelik başına,
  // varsayılan AÇIK. Son gönderim, cron tekrar çalışırsa aynı haftaya ikinci mail gitmesin diye.
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true })
}, (table) => ({
  orgUserUnique: uniqueIndex("organization_members_org_user_unique").on(table.orgId, table.userId),
  userStatusIdx: index("organization_members_user_status_idx").on(table.userId, table.status)
}));
var organizationInvitations = pgTable("organization_invitations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  role: text("role", { enum: ["admin", "coordinator", "teacher", "student"] }).notNull(),
  // Kodun kendisi saklanmaz; yalnızca sha256 özeti (kod oluşturulurken bir kez gösterilir).
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  note: varchar("note", { length: 160 }),
  // Öğretmen tanımlarken girilen branş; kabulde üyeliğe yazılır.
  subject: varchar("subject", { length: 60 }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  maxUses: integer("maxUses").default(1).notNull(),
  usedCount: integer("usedCount").default(0).notNull(),
  createdBy: integer("createdBy").notNull(),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgIdx: index("organization_invitations_org_idx").on(table.orgId)
}));
var organizationClasses = pgTable("organization_classes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  gradeLevel: varchar("gradeLevel", { length: 20 }),
  // Alan (SAY/EA/SÖZ/DİL/TYT) ve danışman (rehber) öğretmen.
  track: varchar("track", { length: 20 }),
  advisorUserId: integer("advisorUserId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgIdx: index("organization_classes_org_idx").on(table.orgId)
}));
var classStudents = pgTable("class_students", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  classId: integer("classId").notNull(),
  studentUserId: integer("studentUserId").notNull()
}, (table) => ({
  classStudentUnique: uniqueIndex("class_students_class_student_unique").on(table.classId, table.studentUserId)
}));
var classTimetableSlots = pgTable("class_timetable_slots", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  classId: integer("classId").notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  subject: varchar("subject", { length: 60 }).notNull(),
  teacherUserId: integer("teacherUserId"),
  room: varchar("room", { length: 40 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgClassIdx: index("class_timetable_slots_org_class_idx").on(table.orgId, table.classId),
  orgTeacherIdx: index("class_timetable_slots_org_teacher_idx").on(table.orgId, table.teacherUserId)
}));
var teacherAssignments = pgTable("teacher_assignments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  teacherUserId: integer("teacherUserId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  pairUnique: uniqueIndex("teacher_assignments_pair_unique").on(table.orgId, table.teacherUserId, table.studentUserId)
}));
var counselingNotes = pgTable("counseling_notes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
  authorUserId: integer("authorUserId").notNull(),
  body: text("body").notNull(),
  // Notlar mahremdir: yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür (koordinatör/yönetici/veli görmez).
  // staff: öğrenci görmez; student: öğrenciye geri bildirim olarak da gösterilir.
  visibility: text("visibility", { enum: ["staff", "student"] }).default("staff").notNull(),
  // Akademik takip dosyasına ait not ise dosya.
  caseId: integer("caseId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  orgStudentIdx: index("counseling_notes_org_student_idx").on(table.orgId, table.studentUserId)
}));
var orgPlanPrices = pgTable("org_plan_prices", {
  plan: varchar("plan", { length: 20 }).primaryKey(),
  monthlyPriceTry: integer("monthlyPriceTry"),
  yearlyPriceTry: integer("yearlyPriceTry"),
  /** Fiyatın birimi / açıklaması (ör. "öğrenci başına, aylık"). */
  priceNote: varchar("priceNote", { length: 160 }),
  updatedByUserId: integer("updatedByUserId"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  valueJson: text("valueJson").notNull(),
  updatedByUserId: integer("updatedByUserId"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var orgQuotes = pgTable("org_quotes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  contactName: varchar("contactName", { length: 120 }),
  contactEmail: varchar("contactEmail", { length: 160 }),
  plan: text("plan", { enum: ["trial", "standard", "pro"] }).notNull(),
  months: integer("months").default(12).notNull(),
  studentCount: integer("studentCount"),
  /** JSON: [{ description, quantity, unitPriceTry }] */
  linesJson: text("linesJson").notNull(),
  discountPercent: integer("discountPercent").default(0).notNull(),
  vatRate: integer("vatRate").default(20).notNull(),
  subtotalTry: integer("subtotalTry").notNull(),
  totalTry: integer("totalTry").notNull(),
  validUntil: timestamp("validUntil", { withTimezone: true }),
  note: text("note"),
  status: text("status", { enum: ["draft", "sent", "accepted", "rejected"] }).default("draft").notNull(),
  appliedAt: timestamp("appliedAt", { withTimezone: true }),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  orgIdx: index("org_quotes_org_idx").on(table.orgId)
}));
var academicCases = pgTable("academic_cases", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  studentUserId: integer("studentUserId").notNull(),
  ownerUserId: integer("ownerUserId"),
  examKind: text("examKind", { enum: EXAM_KINDS }),
  ruleKey: varchar("ruleKey", { length: 40 }).notNull(),
  comparabilityKey: varchar("comparabilityKey", { length: 120 }).default("").notNull(),
  confidence: text("confidence", { enum: ["high", "medium", "low"] }).default("medium").notNull(),
  status: text("status", { enum: ["open", "in_progress", "evaluating", "closed"] }).default("open").notNull(),
  outcome: text("outcome", { enum: ["completed", "ongoing", "reassess"] }),
  openedByUserId: integer("openedByUserId"),
  openedAt: timestamp("openedAt", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closedAt", { withTimezone: true }),
  reopenedFromId: integer("reopenedFromId"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  openUnique: uniqueIndex("academic_cases_open_unique").on(table.orgId, table.studentUserId, table.ruleKey, table.comparabilityKey).where(sql`${table.status} <> 'closed'`),
  orgStatusIdx: index("academic_cases_org_status_idx").on(table.orgId, table.status),
  orgOwnerIdx: index("academic_cases_org_owner_idx").on(table.orgId, table.ownerUserId, table.status)
}));
var caseEvidence = pgTable("case_evidence", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  caseId: integer("caseId").notNull(),
  orgId: integer("orgId").notNull(),
  kind: text("kind", { enum: ["exam", "study", "topic", "book", "question"] }).notNull(),
  refId: integer("refId"),
  snapshotJson: text("snapshotJson").notNull(),
  capturedAt: timestamp("capturedAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  caseIdx: index("case_evidence_case_idx").on(table.caseId)
}));
var caseActions = pgTable("case_actions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  caseId: integer("caseId").notNull(),
  orgId: integer("orgId").notNull(),
  type: text("type", { enum: ["review", "meeting", "resource", "plan", "note"] }).notNull(),
  payloadJson: text("payloadJson").notNull(),
  bookId: varchar("bookId", { length: 120 }),
  bookContentId: integer("bookContentId"),
  status: text("status", { enum: ["planned", "done", "cancelled"] }).default("done").notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  idempotencyUnique: uniqueIndex("case_actions_idempotency_unique").on(table.caseId, table.idempotencyKey),
  caseIdx: index("case_actions_case_idx").on(table.caseId)
}));
var caseEvaluations = pgTable("case_evaluations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  caseId: integer("caseId").notNull(),
  orgId: integer("orgId").notNull(),
  baselineExamId: integer("baselineExamId"),
  followupExamId: integer("followupExamId"),
  netChange: decimal("netChange", { precision: 6, scale: 2 }),
  tasksDone: integer("tasksDone").default(0).notNull(),
  tasksTotal: integer("tasksTotal").default(0).notNull(),
  studentSignalsJson: text("studentSignalsJson").notNull(),
  limitedEvidence: integer("limitedEvidence").default(0).notNull(),
  uncertaintyNote: text("uncertaintyNote"),
  teacherOutcome: text("teacherOutcome", { enum: ["completed", "ongoing", "reassess"] }).notNull(),
  evaluatedByUserId: integer("evaluatedByUserId").notNull(),
  evaluatedAt: timestamp("evaluatedAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  caseIdx: index("case_evaluations_case_idx").on(table.caseId)
}));
var organizationAuditLogs = pgTable("organization_audit_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("orgId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  action: varchar("action", { length: 60 }).notNull(),
  targetType: varchar("targetType", { length: 40 }),
  targetId: integer("targetId"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  orgCreatedIdx: index("organization_audit_logs_org_created_idx").on(table.orgId, table.createdAt)
}));
var readingBooks = pgTable("reading_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  author: varchar("author", { length: 120 }),
  totalPages: integer("totalPages"),
  pagesRead: integer("pagesRead").default(0).notNull(),
  status: text("status", { enum: ["reading", "finished"] }).default("reading").notNull(),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  userIdx: index("reading_books_user_idx").on(table.userId)
}));
var topicStudyLogs = pgTable("topic_study_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  sessionId: integer("sessionId"),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 180 }).notNull(),
  studyDate: timestamp("studyDate", { withTimezone: true }).notNull(),
  minutes: integer("minutes").default(0).notNull(),
  questions: integer("questions").default(0).notNull(),
  correct: integer("correct").default(0).notNull(),
  wrong: integer("wrong").default(0).notNull(),
  blank: integer("blank").default(0).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var planAdherenceReports = pgTable("plan_adherence_reports", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  periodType: text("periodType", { enum: ["day", "week", "month"] }).notNull(),
  periodStart: timestamp("periodStart", { withTimezone: true }).notNull(),
  periodEnd: timestamp("periodEnd", { withTimezone: true }).notNull(),
  overallScore: integer("overallScore").default(0).notNull(),
  sessionScore: integer("sessionScore").default(0).notNull(),
  timeScore: integer("timeScore").default(0).notNull(),
  questionScore: integer("questionScore").default(0).notNull(),
  punctualityScore: integer("punctualityScore").default(0).notNull(),
  plannedSessions: integer("plannedSessions").default(0).notNull(),
  completedSessions: integer("completedSessions").default(0).notNull(),
  plannedMinutes: integer("plannedMinutes").default(0).notNull(),
  actualMinutes: integer("actualMinutes").default(0).notNull(),
  targetQuestions: integer("targetQuestions").default(0).notNull(),
  actualQuestions: integer("actualQuestions").default(0).notNull(),
  rescheduledSessions: integer("rescheduledSessions").default(0).notNull(),
  summary: text("summary").notNull(),
  decision: varchar("decision", { length: 80 }).notNull(),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var studentExamTracks = pgTable("student_exam_tracks", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  track: text("track", { enum: EXAM_TRACKS }).notNull(),
  gradeLevel: text("gradeLevel", { enum: GRADE_LEVELS }),
  examYear: integer("examYear"),
  targetScoreType: text("targetScoreType", { enum: ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"] }),
  currentTytNet: varchar("currentTytNet", { length: 40 }),
  currentAytNet: varchar("currentAytNet", { length: 40 }),
  currentNet: varchar("currentNet", { length: 40 }),
  targetUniversity: varchar("targetUniversity", { length: 180 }),
  targetDepartment: varchar("targetDepartment", { length: 180 }),
  targetRanking: varchar("targetRanking", { length: 60 }),
  targetGoal: varchar("targetGoal", { length: 180 }),
  targetScore: varchar("targetScore", { length: 20 }),
  selectedSubjectsJson: text("selectedSubjectsJson"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  userTrackIdx: uniqueIndex("student_exam_tracks_user_track_idx").on(table.userId, table.track)
}));
var parentLinks = pgTable("parent_links", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  studentUserId: integer("studentUserId").notNull(),
  parentUserId: integer("parentUserId"),
  // Kodun kendisi saklanmaz; yalnızca sha256 özeti (öğrenciye bir kez gösterilir).
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  status: text("status", { enum: ["invited", "pending", "active", "revoked"] }).default("invited").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  parentConsentAt: timestamp("parentConsentAt", { withTimezone: true }),
  parentConsentVersion: integer("parentConsentVersion"),
  studentApprovedAt: timestamp("studentApprovedAt", { withTimezone: true }),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  // Velinin haftalık özet e-postası (bağlantı başına; varsayılan açık).
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  studentIdx: index("parent_links_student_idx").on(table.studentUserId),
  parentIdx: index("parent_links_parent_idx").on(table.parentUserId)
}));
var studentProfiles = pgTable("student_profiles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  onboardingCompleted: integer("onboardingCompleted").default(0).notNull(),
  // 0 = kullanıcı tanımlama, 1..4 = koçluk bilgisi adımları (bkz. shared/onboarding.ts STEP_ORDER).
  onboardingStep: integer("onboardingStep").default(0).notNull(),
  // 1) Kullanıcı tanımlama
  preferredName: varchar("preferredName", { length: 120 }),
  // Arayüz avatarı (öğrencinin seçimi; boşsa nötr tasarım). Bkz. shared/onboarding.ts AVATAR_STYLES.
  avatarStyle: text("avatarStyle", { enum: ["girl", "boy"] }),
  // Hazırlandığı sınav (bkz. shared/exams.ts): YKS (TYT+AYT) ya da LGS (8. sınıf).
  examTrack: text("examTrack", { enum: EXAM_TRACKS }).default("YKS").notNull(),
  gradeLevel: text("gradeLevel", { enum: GRADE_LEVELS }),
  examYear: integer("examYear"),
  targetScoreType: text("targetScoreType", { enum: ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"] }),
  // 2) Akademik durum — free text: "yaklaşık net aralığı" veya "Bilmiyorum" gibi
  // metinsel değerlere izin vermek için sayısal değil varchar.
  currentTytNet: varchar("currentTytNet", { length: 40 }),
  currentAytNet: varchar("currentAytNet", { length: 40 }),
  currentNet: varchar("currentNet", { length: 40 }),
  mockExamFrequency: varchar("mockExamFrequency", { length: 60 }),
  // Ders seçtiren sınavda (KPSS A grubu) adayın girdiği alan testleri (JSON dizi).
  selectedSubjectsJson: text("selectedSubjectsJson"),
  strongSubjectsJson: text("strongSubjectsJson"),
  weakSubjectsJson: text("weakSubjectsJson"),
  hasPriorStudyPlan: integer("hasPriorStudyPlan"),
  // 3) Hedefler
  targetUniversity: varchar("targetUniversity", { length: 180 }),
  targetDepartment: varchar("targetDepartment", { length: 180 }),
  targetRanking: varchar("targetRanking", { length: 60 }),
  // Üniversite dışı sınavların hedefi (LGS: lise; ileride KPSS: kadro…) ve hedef puanı;
  // etiketleri ve puan aralığı shared/exams.ts EXAM_TRACK_DEFS'ten.
  targetGoal: varchar("targetGoal", { length: 180 }),
  targetScore: varchar("targetScore", { length: 20 }),
  mainGoal: text("mainGoal"),
  shortTermGoal: text("shortTermGoal"),
  longTermGoal: text("longTermGoal"),
  // 4) Çalışma düzeni
  dailyStudyDuration: integer("dailyStudyDuration"),
  // "HH:mm" — öğrencinin genelde ders çalışmaya başladığı saat; Pusula Odak
  // günlük planının gerçek saat dilimlerini (16:00–16:40, 16:50–17:30...)
  // buradan türetir (bkz. shared/focusPlan.ts generateDailyFocusPlan).
  preferredStudyStartTime: varchar("preferredStudyStartTime", { length: 5 }),
  // Ders programım'daki okul ders saatleri ([{start,end}], "HH:mm") — tablo düzenleyicinin satırları.
  schoolPeriodsJson: text("schoolPeriodsJson"),
  availableStudyDaysJson: text("availableStudyDaysJson"),
  preferredStudyTimesJson: text("preferredStudyTimesJson"),
  preferredStudyMethodsJson: text("preferredStudyMethodsJson"),
  studyObstacles: text("studyObstacles"),
  // 5) Koçluk tercihleri
  coachingExpectationsJson: text("coachingExpectationsJson"),
  notificationPreference: varchar("notificationPreference", { length: 60 }),
  coachingStyle: text("coachingStyle", { enum: ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"] }),
  additionalNotes: text("additionalNotes"),
  // "Zayıf konular için kitapları otomatik planla" — varsayılan KAPALI: kitap
  // görevleri yalnızca önerilir, öğrenci açıkça seçmeden plana girmez.
  autoScheduleBookTasks: integer("autoScheduleBookTasks").default(0).notNull(),
  // Pazar akşamı giden haftalık ilerleme özeti: varsayılan AÇIK, maildeki bağlantı
  // ya da profil menüsü kapatır. Son gönderim, cron tekrar çalışırsa aynı haftaya ikinci mail gitmesin diye.
  weeklyDigestOptOut: integer("weeklyDigestOptOut").default(0).notNull(),
  weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var publishers = pgTable("publishers", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  // Deterministic normalization key (lowercase, Turkish-folded, punctuation
  // stripped) used to detect "3D Yayınları" === "3D YAYINLARI" === "3D Yayinlari".
  normalizedName: varchar("normalizedName", { length: 200 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  normalizedNameIdx: index("publishers_normalized_name_idx").on(table.normalizedName)
}));
var catalogBooks = pgTable("catalog_books", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  publisherId: integer("publisherId"),
  name: varchar("name", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  isbn: varchar("isbn", { length: 32 }),
  editionYear: integer("editionYear"),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  bookType: text("bookType", { enum: [
    "question_bank",
    "topic_explanation",
    "topic_explanation_question_bank",
    "mock_exam",
    "fasikul",
    "past_questions",
    "camp",
    "test_book",
    "reference",
    "other"
  ] }).default("other").notNull(),
  examScope: text("examScope", { enum: CATALOG_EXAM_SCOPES }).default("GENEL").notNull(),
  // Free-text subject label kept consistent with `yks_topics.subject` /
  // `resources.subject` conventions (e.g. "Matematik", "Türkçe") — no parallel
  // subject table is introduced. Null means multi-subject/general product.
  subject: varchar("subject", { length: 80 }),
  difficultyScore: integer("difficultyScore").default(50).notNull(),
  difficultyLabel: text("difficultyLabel", { enum: ["easy", "medium", "hard"] }).default("medium").notNull(),
  difficultyConfidence: decimal("difficultyConfidence", { precision: 4, scale: 3 }).default("0").notNull(),
  classificationMethod: text("classificationMethod", { enum: ["rule", "ai", "hybrid", "manual"] }).default("rule").notNull(),
  manualOverride: integer("manualOverride").default(0).notNull(),
  needsReview: integer("needsReview").default(0).notNull(),
  classifiedAt: timestamp("classifiedAt", { withTimezone: true }),
  active: integer("active").default(1).notNull(),
  // Free-form JSON bag for source-specific extras that don't warrant their own column.
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  publisherIdx: index("catalog_books_publisher_idx").on(table.publisherId),
  isbnIdx: index("catalog_books_isbn_idx").on(table.isbn),
  bookTypeIdx: index("catalog_books_book_type_idx").on(table.bookType),
  examScopeIdx: index("catalog_books_exam_scope_idx").on(table.examScope),
  subjectIdx: index("catalog_books_subject_idx").on(table.subject),
  difficultyLabelIdx: index("catalog_books_difficulty_label_idx").on(table.difficultyLabel),
  activeIdx: index("catalog_books_active_idx").on(table.active),
  needsReviewIdx: index("catalog_books_needs_review_idx").on(table.needsReview),
  createdAtIdx: index("catalog_books_created_at_idx").on(table.createdAt)
}));
var externalBookSources = pgTable("external_book_sources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  source: varchar("source", { length: 60 }).notNull(),
  sourceProductId: varchar("sourceProductId", { length: 160 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  rawName: varchar("rawName", { length: 320 }),
  rawDescription: text("rawDescription"),
  rawPrice: decimal("rawPrice", { precision: 10, scale: 2 }),
  rawCurrency: varchar("rawCurrency", { length: 8 }).default("TRY"),
  rawImageUrl: varchar("rawImageUrl", { length: 500 }),
  rawPublisher: varchar("rawPublisher", { length: 200 }),
  rawCategory: varchar("rawCategory", { length: 200 }),
  rawIsbn: varchar("rawIsbn", { length: 32 }),
  rawMetadata: text("rawMetadata"),
  firstSeenAt: timestamp("firstSeenAt", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  syncStatus: text("syncStatus", { enum: ["pending", "processed", "needs_review", "failed"] }).default("pending").notNull(),
  matchedBookId: integer("matchedBookId"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  sourceProductUnique: uniqueIndex("external_book_sources_source_product_unique").on(table.source, table.sourceProductId),
  syncStatusIdx: index("external_book_sources_sync_status_idx").on(table.syncStatus),
  matchedBookIdx: index("external_book_sources_matched_book_idx").on(table.matchedBookId),
  rawIsbnIdx: index("external_book_sources_raw_isbn_idx").on(table.rawIsbn)
}));
var bookOffers = pgTable("book_offers", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  bookId: integer("bookId").notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  stockStatus: text("stockStatus", { enum: ["in_stock", "out_of_stock", "unknown"] }).default("unknown").notNull(),
  productUrl: varchar("productUrl", { length: 500 }),
  affiliateUrl: varchar("affiliateUrl", { length: 500 }),
  affiliateEnabled: integer("affiliateEnabled").default(0).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  bookSourceUnique: uniqueIndex("book_offers_book_source_unique").on(table.bookId, table.source),
  bookIdx: index("book_offers_book_idx").on(table.bookId)
}));
var bookCurriculumTopics = pgTable("book_curriculum_topics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  bookId: integer("bookId").notNull(),
  topicId: integer("topicId").notNull(),
  mappingMethod: text("mappingMethod", { enum: ["rule", "ai", "manual"] }).default("rule").notNull(),
  confidence: decimal("confidence", { precision: 4, scale: 3 }).default("0").notNull(),
  isVerified: integer("isVerified").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  bookTopicUnique: uniqueIndex("book_curriculum_topics_book_topic_unique").on(table.bookId, table.topicId),
  topicIdx: index("book_curriculum_topics_topic_idx").on(table.topicId)
}));
var resourceCatalogSyncLogs = pgTable("resource_catalog_sync_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  source: varchar("source", { length: 60 }).notNull(),
  startedAt: timestamp("startedAt", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
  dryRun: integer("dryRun").default(0).notNull(),
  fetched: integer("fetched").default(0).notNull(),
  created: integer("created").default(0).notNull(),
  updated: integer("updated").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  failed: integer("failed").default(0).notNull(),
  needsReview: integer("needsReview").default(0).notNull(),
  statsJson: text("statsJson"),
  errorLog: text("errorLog"),
  triggeredBy: integer("triggeredBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  sourceIdx: index("resource_catalog_sync_logs_source_idx").on(table.source),
  startedAtIdx: index("resource_catalog_sync_logs_started_at_idx").on(table.startedAt)
}));
var coachAlerts = pgTable("coach_alerts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  reportId: integer("reportId"),
  level: text("level", { enum: ["info", "success", "warning", "action"] }).notNull(),
  ruleKey: varchar("ruleKey", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  actionLabel: varchar("actionLabel", { length: 120 }),
  actionJson: text("actionJson"),
  isRead: integer("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var subscriptionPlans = pgTable("subscription_plans", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  // basic = Temel, premium = Premium, premium_plus = Pro (bkz. shared/entitlements.ts).
  tier: text("tier", { enum: ["free", "basic", "premium", "premium_plus"] }).default("free").notNull(),
  // Planın sınavı (her sınavın ayrı aboneliği vardır). FREE planı tüm sınavlarda ortaktır (null).
  track: text("track", { enum: EXAM_TRACKS }),
  billingPeriod: text("billingPeriod", { enum: ["none", "monthly", "yearly"] }).default("none").notNull(),
  // Kuruş cinsinden (minor unit) — ondalık/float fiyat yuvarlama hatalarından kaçınmak için.
  price: integer("price").default(0).notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  trialDays: integer("trialDays").default(0).notNull(),
  storeProductId: varchar("storeProductId", { length: 180 }),
  provider: varchar("provider", { length: 40 }),
  isActive: integer("isActive").default(1).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  // Kullanıcı başına sınav başına TEK satır (bkz. aşağıdaki user_track tekil indeksi).
  track: text("track", { enum: EXAM_TRACKS }).default("YKS").notNull(),
  planId: integer("planId").notNull(),
  status: text("status", { enum: ["trialing", "active", "past_due", "grace_period", "canceled", "expired", "paused", "incomplete"] }).default("active").notNull(),
  trialStartedAt: timestamp("trialStartedAt", { withTimezone: true }),
  trialEndsAt: timestamp("trialEndsAt", { withTimezone: true }),
  currentPeriodStart: timestamp("currentPeriodStart", { withTimezone: true }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
  canceledAt: timestamp("canceledAt", { withTimezone: true }),
  cancelAtPeriodEnd: integer("cancelAtPeriodEnd").default(0).notNull(),
  gracePeriodEndsAt: timestamp("gracePeriodEndsAt", { withTimezone: true }),
  provider: varchar("provider", { length: 40 }),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 180 }),
  providerCustomerId: varchar("providerCustomerId", { length: 180 }),
  latestPaymentId: integer("latestPaymentId"),
  // Admin'in elle verdiği erişim (spec §24: "manual entitlement ile provider
  // subscription birbirinden ayrı tutulmalı") — provider alanları boş kalır,
  // yalnızca bu bayrak + subscription_audit_logs kaydı ile iz sürülür.
  isManualOverride: integer("isManualOverride").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  statusIdx: index("subscriptions_status_idx").on(table.status),
  periodEndIdx: index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  providerSubIdx: index("subscriptions_provider_subscription_idx").on(table.providerSubscriptionId),
  userTrackIdx: uniqueIndex("subscriptions_user_track_idx").on(table.userId, table.track)
}));
var payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  subscriptionId: integer("subscriptionId"),
  // Ödemenin sınavı (paket ödemesinde her sınav ayrı satır; metadata.checkoutId ortak).
  track: text("track", { enum: EXAM_TRACKS }),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerPaymentId: varchar("providerPaymentId", { length: 180 }),
  providerTransactionId: varchar("providerTransactionId", { length: 180 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default("TRY").notNull(),
  status: text("status", { enum: ["pending", "authorized", "paid", "failed", "refunded", "partially_refunded", "canceled"] }).default("pending").notNull(),
  paymentType: varchar("paymentType", { length: 40 }),
  paidAt: timestamp("paidAt", { withTimezone: true }),
  failedAt: timestamp("failedAt", { withTimezone: true }),
  refundedAt: timestamp("refundedAt", { withTimezone: true }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
  userIdx: index("payments_user_idx").on(table.userId),
  subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId),
  statusIdx: index("payments_status_idx").on(table.status)
}));
var paymentEvents = pgTable("payment_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  provider: varchar("provider", { length: 40 }).notNull(),
  eventId: varchar("eventId", { length: 180 }).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  // Redaction uygulanmış payload (bkz. server/services/payments/webhookRedaction.ts) — ham kart/secret verisi asla yazılmaz.
  payload: text("payload").notNull(),
  signature: varchar("signature", { length: 500 }),
  processedAt: timestamp("processedAt", { withTimezone: true }),
  status: text("status", { enum: ["received", "processed", "failed", "ignored"] }).default("received").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  providerEventUnique: uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.eventId)
}));
var subscriptionAuditLogs = pgTable("subscription_audit_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  adminId: integer("adminId"),
  action: varchar("action", { length: 80 }).notNull(),
  oldState: text("oldState"),
  newState: text("newState"),
  reason: text("reason"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("subscription_audit_logs_user_idx").on(table.userId),
  createdAtIdx: index("subscription_audit_logs_created_at_idx").on(table.createdAt)
}));
var featureUsageLogs = pgTable("feature_usage_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  // Kota sınav başına: her aboneliğin kendi yapay zekâ hakları (kullanım o anki aktif sınava yazılır).
  track: text("track", { enum: EXAM_TRACKS }).default("YKS").notNull(),
  featureKey: varchar("featureKey", { length: 60 }).notNull(),
  usedAt: timestamp("usedAt", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userFeatureIdx: index("feature_usage_logs_user_feature_idx").on(table.userId, table.track, table.featureKey, table.usedAt)
}));
var testimonials = pgTable("testimonials", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  displayName: varchar("displayName", { length: 60 }).notNull(),
  detail: varchar("detail", { length: 80 }),
  rating: integer("rating").notNull(),
  body: varchar("body", { length: 600 }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
  reviewedBy: integer("reviewedBy")
}, (table) => ({
  userIdx: uniqueIndex("testimonials_user_idx").on(table.userId),
  statusIdx: index("testimonials_status_idx").on(table.status, table.updatedAt)
}));
var appErrors = pgTable("app_errors", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
  source: text("source", { enum: ["client", "server"] }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  stack: text("stack"),
  path: varchar("path", { length: 300 }),
  lastUserId: integer("lastUserId"),
  userAgent: varchar("userAgent", { length: 300 }),
  count: integer("count").default(1).notNull(),
  firstSeenAt: timestamp("firstSeenAt", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true })
}, (table) => ({
  fingerprintIdx: uniqueIndex("app_errors_fingerprint_idx").on(table.fingerprint),
  lastSeenIdx: index("app_errors_last_seen_idx").on(table.lastSeenAt)
}));

// server/db.ts
import { and, desc, eq, gte, inArray, isNull, lt, sql as sql2 } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/planAdherence.ts
var cap = (value) => Math.max(0, Math.min(100, Math.round(value)));
function dedupeAlerts(alerts, existingRuleKeys) {
  const known = new Set(existingRuleKeys);
  return alerts.filter((alert) => !known.has(alert.ruleKey));
}
function calculatePlanAdherence(sessions, averageAccuracy = 0) {
  const plannedSessions = sessions.length;
  const completed = sessions.filter((session) => session.status === "completed");
  const completedSessions = completed.length;
  const plannedMinutes = sessions.reduce((sum, session) => sum + Math.max(0, session.plannedMinutes || 0), 0);
  const actualMinutes = completed.reduce((sum, session) => sum + Math.max(0, session.actualMinutes ?? 0), 0);
  const targetQuestions = sessions.reduce((sum, session) => sum + Math.max(0, session.targetQuestions ?? 0), 0);
  const actualQuestions = completed.reduce((sum, session) => sum + Math.max(0, session.actualQuestions ?? 0), 0);
  const rescheduledSessions = sessions.filter((session) => Boolean(session.rescheduledFrom)).length;
  const sessionScore = plannedSessions ? cap(completedSessions / plannedSessions * 100) : 0;
  const timeScore = plannedMinutes ? cap(actualMinutes / plannedMinutes * 100) : 0;
  const questionScore = targetQuestions ? cap(actualQuestions / targetQuestions * 100) : 0;
  const punctualityScore = plannedSessions ? cap((plannedSessions - rescheduledSessions) / plannedSessions * 100) : 0;
  const overallScore = plannedSessions ? cap(sessionScore * 0.35 + timeScore * 0.25 + questionScore * 0.25 + punctualityScore * 0.15) : 0;
  let decision = "veri_topla";
  if (plannedSessions < 2) decision = "veri_topla";
  else if (overallScore < 55) decision = "plan\u0131_k\xFC\xE7\xFClt";
  else if (overallScore >= 80 && averageAccuracy >= 85) decision = "seviyeyi_art\u0131r";
  else if (timeScore >= 75 && averageAccuracy < 55) decision = "y\xF6ntemi_de\u011Fi\u015Ftir";
  else decision = "ritmi_koru";
  const alerts = [];
  if (plannedSessions < 2) alerts.push({ level: "info", ruleKey: "no_plan_data", title: "\xD6nce ritmini kaydedelim", message: "Bu d\xF6nem i\xE7in yeterli plan verisi yok. En az iki oturum tamamla; ko\xE7un daha g\xFCvenilir \xF6neriler versin.", actionLabel: "\u0130lk oturumu ba\u015Flat" });
  if (overallScore < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_adherence", title: "Plan\u0131 k\xFC\xE7\xFCltelim", message: `Plan uyumun %${overallScore}. \xD6n\xFCm\xFCzdeki \xFC\xE7 g\xFCn i\xE7in oturumlar\u0131 %25 k\u0131salt\u0131p tek ana konuya odaklanal\u0131m.`, actionLabel: "Plan\u0131 hafiflet" });
  if (rescheduledSessions >= 2) alerts.push({ level: "action", ruleKey: "repeated_reschedule", title: "Erteleme paterni olu\u015Fuyor", message: `${rescheduledSessions} oturum ertelendi. G\xFCnl\xFCk oturum say\u0131s\u0131n\u0131 azalt\u0131p ilk oturumu g\xFCn\xFCn daha erken saatine ta\u015F\u0131yal\u0131m.`, actionLabel: "Takvimi d\xFCzenle" });
  if (timeScore >= 75 && averageAccuracy < 55 && plannedSessions >= 2) alerts.push({ level: "warning", ruleKey: "low_accuracy_high_time", title: "\xC7al\u0131\u015Fma y\xF6ntemini de\u011Fi\u015Ftirelim", message: "S\xFCreyi koruyorsun; ancak do\u011Fruluk d\xFC\u015F\xFCk. Bir sonraki oturuma k\u0131sa konu tekrar\u0131 ve daha kolay test ekleyelim.", actionLabel: "Tekrar oturumu ekle" });
  if (overallScore >= 80 && averageAccuracy >= 85) alerts.push({ level: "success", ruleKey: "ready_for_next_level", title: "Bir \xFCst seviyeye haz\u0131rs\u0131n", message: "Plan uyumun ve do\u011Frulu\u011Fun g\xFC\xE7l\xFC. En iyi giden konularda bir \xFCst seviye kayna\u011Fa ge\xE7ebiliriz.", actionLabel: "Kaynak \xF6nerilerini a\xE7" });
  if (!alerts.length) alerts.push({ level: "success", ruleKey: "keep_rhythm", title: "Ritmini koru", message: `Plan uyumun %${overallScore}. K\xFC\xE7\xFCk ama d\xFCzenli oturumlarla ayn\u0131 \xE7izgiyi s\xFCrd\xFCr.`, actionLabel: "Bug\xFCnk\xFC plana devam et" });
  const summary = decision === "plan\u0131_k\xFC\xE7\xFClt" ? "Uygulanabilirli\u011Fi art\u0131rmak i\xE7in plan\u0131 hafiflet." : decision === "y\xF6ntemi_de\u011Fi\u015Ftir" ? "S\xFCre korunuyor; konu \xE7al\u0131\u015Fma y\xF6ntemini de\u011Fi\u015Ftir." : decision === "seviyeyi_art\u0131r" ? "Uyum ve do\u011Fruluk g\xFC\xE7l\xFC; uygun konularda seviyeyi art\u0131r." : decision === "ritmi_koru" ? "Plan\u0131 b\xFCy\xFCk de\u011Fi\u015Fiklik yapmadan s\xFCrd\xFCr." : "Daha g\xFCvenilir karar i\xE7in birka\xE7 oturum daha kaydet.";
  return { overallScore, sessionScore, timeScore, questionScore, punctualityScore, plannedSessions, completedSessions, plannedMinutes, actualMinutes, targetQuestions, actualQuestions, rescheduledSessions, decision, summary, alerts };
}

// shared/calendarLogic.ts
function rescheduleOverdueSessions(sessions, today, tomorrow, now) {
  return sessions.filter((session) => session.sessionDate < today).map((session) => {
    const sessionDate = new Date(tomorrow);
    sessionDate.setHours(session.sessionDate.getHours(), session.sessionDate.getMinutes(), 0, 0);
    return { id: session.id, sessionDate, rescheduledFrom: session.sessionDate, rescheduledAt: now };
  });
}
function buildSessionCompletion(session, input, completedAt) {
  return {
    sessionUpdate: { status: "completed", completedAt, ...input },
    topicLog: { sessionId: session.id, subject: session.subject, topic: session.topic, studyDate: completedAt, ...input }
  };
}

// shared/bookIdentity.ts
function normalizeIsbn(value) {
  const compact = (value ?? "").toUpperCase().replace(/ISBN(-1[03])?:?/g, "").replace(/[^0-9X]/g, "");
  if (compact.length === 13 && /^\d{13}$/.test(compact)) {
    const sum = compact.split("").reduce((total, digit, index2) => total + Number(digit) * (index2 % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0 ? compact : null;
  }
  if (compact.length === 10 && /^\d{9}[\dX]$/.test(compact)) {
    const sum = compact.split("").reduce((total, char, index2) => total + (char === "X" ? 10 : Number(char)) * (10 - index2), 0);
    if (sum % 11 !== 0) return null;
    const body = `978${compact.slice(0, 9)}`;
    const check2 = (10 - body.split("").reduce((total, digit, index2) => total + Number(digit) * (index2 % 2 === 0 ? 1 : 3), 0) % 10) % 10;
    return `${body}${check2}`;
  }
  return null;
}
var normalizeBookText = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/[çğıöşüâîû]/g, (char) => ({ \u00E7: "c", \u011F: "g", \u0131: "i", \u00F6: "o", \u015F: "s", \u00FC: "u", \u00E2: "a", \u00EE: "i", \u00FB: "u" })[char] ?? char).replace(/[^a-z0-9]+/g, " ").trim();
function isSameBook(a, b) {
  const isbnA = normalizeIsbn(a.isbn);
  const isbnB = normalizeIsbn(b.isbn);
  if (isbnA && isbnB) return isbnA === isbnB;
  if (normalizeBookText(a.title) !== normalizeBookText(b.title) || normalizeBookText(a.publisher) !== normalizeBookText(b.publisher)) return false;
  const authorsA = normalizeBookText(a.authors ?? "");
  const authorsB = normalizeBookText(b.authors ?? "");
  return !authorsA || !authorsB || authorsA === authorsB;
}

// shared/curriculum.ts
var TYT = {
  T\u00FCrk\u00E7e: {
    "S\xF6zc\xFCk ve C\xFCmle Anlam\u0131": [
      { topic: "S\xF6zc\xFCkte Anlam", aliases: ["s\xF6zc\xFCk anlam\u0131", "s\xF6z \xF6beklerinde anlam", "deyim ve atas\xF6zleri"] },
      { topic: "C\xFCmlede Anlam", aliases: ["c\xFCmle anlam\u0131", "c\xFCmle yorumu"] }
    ],
    Paragraf: [
      { topic: "Paragrafta Anlat\u0131m Bi\xE7imleri ve D\xFC\u015F\xFCnceyi Geli\u015Ftirme Yollar\u0131", aliases: ["paragrafta anlat\u0131m", "par\xE7ada anlat\u0131m", "anlat\u0131m bi\xE7imleri", "anlat\u0131m teknikleri", "d\xFC\u015F\xFCnceyi geli\u015Ftirme yollar\u0131"] },
      { topic: "Paragrafta Konu ve Ana D\xFC\u015F\xFCnce", aliases: ["paragrafta konu", "paragrafta ana d\xFC\u015F\xFCnce", "ana d\xFC\u015F\xFCnce", "ana fikir", "par\xE7ada konu", "konu ba\u015Fl\u0131k soru"] },
      { topic: "Paragrafta Yard\u0131mc\u0131 D\xFC\u015F\xFCnce", aliases: ["yard\u0131mc\u0131 d\xFC\u015F\xFCnce", "yard\u0131mc\u0131 fikir", "par\xE7ada yard\u0131mc\u0131 d\xFC\u015F\xFCnce"] },
      { topic: "Paragraf\u0131n Yap\u0131s\u0131", aliases: ["paragrafta yap\u0131", "paragraf\u0131n ak\u0131\u015F\u0131", "ak\u0131\u015F\u0131 bozan c\xFCmle", "paragraf olu\u015Fturma", "c\xFCmle yerle\u015Ftirme", "giri\u015F geli\u015Fme sonu\xE7"] },
      { topic: "Paragrafta Anlam ve Yorum", legacySlug: "tyt-tr-paragraf", aliases: ["paragrafta anlam", "par\xE7ada anlam", "ki\u015Fi \xF6zellikleri", "paragraf\u0131 par\xE7alara b\xF6lerek anlama", "par\xE7alara b\xF6lerek anlama", "yeni nesil anlam", "metin yorumlama", "paragraftan \xE7\u0131kar\u0131m"] }
    ],
    "Dil Bilgisi": [
      "Ses Bilgisi",
      { topic: "Yaz\u0131m Kurallar\u0131", aliases: ["imla kurallar\u0131"] },
      { topic: "Noktalama \u0130\u015Faretleri", aliases: ["noktalama"] },
      { topic: "S\xF6zc\xFCkte Yap\u0131", aliases: ["k\xF6k ve ekler", "yap\u0131m ekleri", "\xE7ekim ekleri"] },
      { topic: "\u0130simler", aliases: ["adlar", "isim tamlamalar\u0131"] },
      { topic: "S\u0131fatlar", aliases: ["\xF6nadlar", "s\u0131fat tamlamalar\u0131"] },
      { topic: "Zamirler", aliases: ["ad\u0131llar"] },
      { topic: "Zarflar", aliases: ["belirte\xE7ler"] },
      { topic: "Edat, Ba\u011Fla\xE7 ve \xDCnlem", aliases: ["edatlar", "ba\u011Fla\xE7lar", "\xFCnlemler"] },
      { topic: "Fiiller", aliases: ["fiilde anlam", "fiil kip ve ki\u015Fi", "kip ve ki\u015Fi ekleri"] },
      { topic: "Ek Fiil", aliases: ["ek eylem"] },
      { topic: "Fiilimsiler", aliases: ["eylemsiler", "fiilimsi"] },
      { topic: "Fiilde \xC7at\u0131", aliases: ["eylemde \xE7at\u0131", "\xE7at\u0131"] },
      { topic: "C\xFCmlenin \xD6geleri", aliases: ["c\xFCmle \xF6geleri", "\xF6\u011Feler"] },
      { topic: "C\xFCmle T\xFCrleri", aliases: ["c\xFCmle \xE7e\u015Fitleri"] },
      { topic: "Anlat\u0131m Bozukluklar\u0131", aliases: ["anlat\u0131m bozuklu\u011Fu"] }
    ]
  },
  Matematik: {
    "Say\u0131lar": [
      // Başlangıç kitapları konuları daha ince böler ("Toplama ve Çıkarma İşlemi", "Ondalık Gösterim"…); takma adlar onları doğru üst konuya bağlar.
      { topic: "Temel Kavramlar", aliases: ["toplama ve \xE7\u0131karma i\u015Flemi", "\xE7arpma ve b\xF6lme i\u015Flemi", "d\xF6rt i\u015Flem", "i\u015Flem \xF6nceli\u011Fi", "say\u0131 k\xFCmeleri", "say\u0131lar"] },
      "Say\u0131 Basamaklar\u0131",
      { topic: "B\xF6lme ve B\xF6l\xFCnebilme", aliases: ["b\xF6l\xFCnebilme kurallar\u0131"] },
      { topic: "EBOB - EKOK", aliases: ["ebob ekok", "obeb okek"] },
      { topic: "Rasyonel Say\u0131lar", aliases: ["ondal\u0131k g\xF6sterim", "ondal\u0131k say\u0131lar", "kesirler", "kesirli say\u0131lar"] },
      "Basit E\u015Fitsizlikler",
      "Mutlak De\u011Fer",
      { topic: "\xDCsl\xFC Say\u0131lar", aliases: ["\xFCsl\xFC ifadeler"] },
      { topic: "K\xF6kl\xFC Say\u0131lar", aliases: ["k\xF6kl\xFC ifadeler"] },
      "\xC7arpanlara Ay\u0131rma",
      { topic: "Oran - Orant\u0131", aliases: ["oran orant\u0131", "oran ve orant\u0131"] },
      { topic: "Denklem \xC7\xF6zme", aliases: ["basit denklem \xE7\xF6z\xFCm\xFC", "birinci dereceden denklemler", "rasyonel denklemlerin \xE7\xF6z\xFCm\xFC", "iki bilinmeyenli denklemler", "harfli ifadeler", "cebirsel ifadeler"] }
    ],
    Problemler: [
      "Say\u0131 Problemleri",
      "Kesir Problemleri",
      "Ya\u015F Problemleri",
      "Y\xFCzde Problemleri",
      { topic: "K\xE2r - Zarar Problemleri", aliases: ["kar zarar problemleri"] },
      "Kar\u0131\u015F\u0131m Problemleri",
      "Hareket Problemleri",
      "\u0130\u015F\xE7i Problemleri",
      { topic: "Tablo ve Grafik Problemleri", aliases: ["grafik problemleri"] },
      { topic: "Rutin Olmayan Problemler", aliases: ["yeni nesil problemler", "mant\u0131ksal ak\u0131l y\xFCr\xFCtme"] }
    ],
    "Cebir ve Veri": [
      "K\xFCmeler",
      "Mant\u0131k",
      { topic: "Fonksiyonlar (TYT)", aliases: ["fonksiyon"] },
      "Polinomlar",
      { topic: "\u0130kinci Dereceden Denklemler", aliases: ["2. dereceden denklemler"] },
      "Perm\xFCtasyon",
      "Kombinasyon",
      "Olas\u0131l\u0131k",
      { topic: "Veri ve \u0130statistik", aliases: ["istatistik", "veri analizi"] }
    ]
  },
  Geometri: {
    "\xDC\xE7genler": [
      { topic: "Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar", aliases: ["\xFC\xE7gende a\xE7\u0131lar", "do\u011Fruda a\xE7\u0131lar"] },
      "Dik \xDC\xE7gen",
      "\u0130kizkenar ve E\u015Fkenar \xDC\xE7gen",
      "\xDC\xE7gende Alan",
      "\xDC\xE7gende Benzerlik",
      "A\xE7\u0131ortay",
      "Kenarortay"
    ],
    "\xC7okgenler ve D\xF6rtgenler": ["\xC7okgenler", "D\xF6rtgenler", "Yamuk", "Paralelkenar", "E\u015Fkenar D\xF6rtgen", "Dikd\xF6rtgen", "Kare"],
    "\xC7ember ve Analitik": ["\xC7ember ve Daire", { topic: "Noktan\u0131n ve Do\u011Frunun Analiti\u011Fi", aliases: ["analitik geometri"] }, "Kat\u0131 Cisimler"]
  },
  Fizik: {
    "Fizik": [
      "Fizik Bilimine Giri\u015F",
      "Madde ve \xD6zellikleri",
      "Hareket ve Kuvvet",
      "\u0130\u015F, G\xFC\xE7 ve Enerji",
      { topic: "Is\u0131, S\u0131cakl\u0131k ve Genle\u015Fme", aliases: ["\u0131s\u0131 ve s\u0131cakl\u0131k"] },
      "Elektrostatik",
      { topic: "Elektrik Ak\u0131m\u0131 ve Devreler", aliases: ["elektrik devreleri", "elektrik ak\u0131m\u0131"] },
      "Manyetizma",
      { topic: "Bas\u0131n\xE7 ve Kald\u0131rma Kuvveti", aliases: ["bas\u0131n\xE7", "kald\u0131rma kuvveti"] },
      "Dalgalar",
      "Optik"
    ]
  },
  Kimya: {
    "Kimya": [
      "Kimya Bilimi",
      { topic: "Atom ve Periyodik Sistem", aliases: ["periyodik sistem", "atom modelleri"] },
      "Kimyasal T\xFCrler Aras\u0131 Etkile\u015Fimler",
      "Maddenin Halleri",
      "Do\u011Fa ve Kimya",
      "Kimyan\u0131n Temel Kanunlar\u0131",
      "Mol Kavram\u0131",
      "Kimyasal Tepkimeler",
      "Kar\u0131\u015F\u0131mlar",
      { topic: "Asitler, Bazlar ve Tuzlar", aliases: ["asit baz tuz"] },
      "Kimya Her Yerde"
    ]
  },
  Biyoloji: {
    "Biyoloji": [
      "Canl\u0131lar\u0131n Ortak \xD6zellikleri",
      "Canl\u0131lar\u0131n Temel Bile\u015Fenleri",
      { topic: "H\xFCcre ve Organeller", aliases: ["h\xFCcre"] },
      "H\xFCcre Zar\u0131ndan Madde Ge\xE7i\u015Fi",
      "Canl\u0131lar\u0131n S\u0131n\u0131fland\u0131r\u0131lmas\u0131",
      { topic: "H\xFCcre B\xF6l\xFCnmeleri", aliases: ["mitoz", "mayoz", "mitoz ve mayoz"] },
      { topic: "Kal\u0131t\u0131m", aliases: ["kal\u0131t\u0131m\u0131n genel ilkeleri"] },
      "Ekosistem Ekolojisi",
      "G\xFCncel \xC7evre Sorunlar\u0131"
    ]
  },
  Tarih: {
    "Tarih": [
      "Tarih ve Zaman",
      "\u0130nsanl\u0131\u011F\u0131n \u0130lk D\xF6nemleri",
      "Orta \xC7a\u011F'da D\xFCnya",
      "\u0130lk ve Orta \xC7a\u011Flarda T\xFCrk D\xFCnyas\u0131",
      "\u0130slam Medeniyetinin Do\u011Fu\u015Fu",
      "\u0130lk T\xFCrk-\u0130slam Devletleri",
      "Sel\xE7uklu T\xFCrkiyesi",
      "Beylikten Devlete Osmanl\u0131",
      "D\xFCnya G\xFCc\xFC Osmanl\u0131",
      "De\u011Fi\u015Fen D\xFCnya Dengeleri Kar\u015F\u0131s\u0131nda Osmanl\u0131",
      "Uluslararas\u0131 \u0130li\u015Fkilerde Denge Stratejisi (1774-1914)",
      "XX. Y\xFCzy\u0131l Ba\u015Flar\u0131nda Osmanl\u0131 ve D\xFCnya",
      { topic: "Milli M\xFCcadele", aliases: ["kurtulu\u015F sava\u015F\u0131"] },
      { topic: "Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131", aliases: ["atat\xFCrk ilke ve ink\u0131laplar\u0131", "ink\u0131lap tarihi"] }
    ]
  },
  Co\u011Frafya: {
    "Co\u011Frafya": [
      "Do\u011Fa ve \u0130nsan",
      "D\xFCnya'n\u0131n \u015Eekli ve Hareketleri",
      "Co\u011Frafi Konum",
      "Harita Bilgisi",
      { topic: "Atmosfer ve \u0130klim", aliases: ["iklim bilgisi"] },
      "\u0130\xE7 ve D\u0131\u015F Kuvvetler",
      "Su, Toprak ve Bitkiler",
      "N\xFCfus",
      "G\xF6\xE7",
      "Yerle\u015Fme",
      "Ekonomik Faaliyetler",
      "B\xF6lgeler",
      "Uluslararas\u0131 Ula\u015F\u0131m Hatlar\u0131",
      "Do\u011Fal Afetler",
      "\xC7evre ve Toplum"
    ]
  },
  Felsefe: {
    "Felsefe": [
      "Felsefeye Giri\u015F",
      "Bilgi Felsefesi",
      "Varl\u0131k Felsefesi",
      "Ahlak Felsefesi",
      "Sanat Felsefesi",
      "Din Felsefesi",
      "Siyaset Felsefesi",
      "Bilim Felsefesi",
      { topic: "Felsefe Tarihi", aliases: ["m\xF6 6 y\xFCzy\u0131l ms 2 y\xFCzy\u0131l felsefesi", "ms 2 y\xFCzy\u0131l ms 15 y\xFCzy\u0131l felsefesi", "15 17 y\xFCzy\u0131l felsefesi", "18 19 y\xFCzy\u0131l felsefesi", "20 y\xFCzy\u0131l felsefesi"] }
    ]
  },
  "Din K\xFClt\xFCr\xFC": {
    "Din K\xFClt\xFCr\xFC": ["Bilgi ve \u0130nan\xE7", "Din ve \u0130slam", "\u0130slam ve \u0130badet", "Gen\xE7lik ve De\u011Ferler", "Allah \u0130nsan \u0130li\u015Fkisi", "Hz. Muhammed", "Vahiy ve Ak\u0131l", "\u0130slam D\xFC\u015F\xFCncesinde Yorumlar"]
  }
};
var AYT = {
  Matematik: {
    "Cebir": [
      { topic: "Fonksiyonlar", legacySlug: "ayt-mat-fonksiyon", aliases: ["fonksiyon"] },
      "Polinomlar",
      { topic: "\u0130kinci Dereceden Denklemler ve E\u015Fitsizlikler", aliases: ["e\u015Fitsizlikler"] },
      "Parabol",
      "Karma\u015F\u0131k Say\u0131lar",
      "Logaritma",
      "Diziler",
      { topic: "Perm\xFCtasyon, Kombinasyon ve Binom", aliases: ["binom"] },
      "Olas\u0131l\u0131k"
    ],
    "Trigonometri": ["Trigonometri"],
    "Analiz": [{ topic: "Limit ve S\xFCreklilik", aliases: ["limit"] }, "T\xFCrev", { topic: "\u0130ntegral", legacySlug: "ayt-mat-integral" }]
  },
  Geometri: {
    "Geometri": ["D\xF6n\xFC\u015F\xFCm Geometrisi", { topic: "Do\u011Frunun Analitik \u0130ncelenmesi", aliases: ["analitik geometri"] }, "\xC7emberin Analitik \u0130ncelenmesi", "\xC7ember ve Daire", "Kat\u0131 Cisimler"]
  },
  Fizik: {
    "Mekanik": [
      "Vekt\xF6rler",
      "Ba\u011F\u0131l Hareket",
      "Newton'un Hareket Yasalar\u0131",
      "Bir Boyutta Sabit \u0130vmeli Hareket",
      "At\u0131\u015Flar",
      { topic: "\u0130\u015F, Enerji ve Momentum", aliases: ["itme ve momentum"] },
      "Tork ve Denge",
      "K\xFCtle Merkezi",
      "Basit Makineler",
      { topic: "\xC7embersel Hareket", aliases: ["d\xFCzg\xFCn \xE7embersel hareket"] },
      "Basit Harmonik Hareket"
    ],
    "Elektrik ve Manyetizma": [
      "Elektrik Alan ve Potansiyel",
      { topic: "Paralel Levhalar ve S\u0131\u011Fa", aliases: ["s\u0131\u011Fa\xE7lar"] },
      { topic: "Manyetizma ve Elektromanyetik \u0130nd\xFCksiyon", aliases: ["ind\xFCksiyon"] },
      "Alternatif Ak\u0131m ve Transformat\xF6rler"
    ],
    "Dalgalar ve Modern Fizik": ["Dalga Mekani\u011Fi", "Atom Fizi\u011Fi ve Radyoaktivite", "Modern Fizik"]
  },
  Kimya: {
    "Kimya": [
      "Modern Atom Teorisi",
      "Gazlar",
      { topic: "S\u0131v\u0131 \xC7\xF6zeltiler ve \xC7\xF6z\xFCn\xFCrl\xFCk", aliases: ["\xE7\xF6zeltiler"] },
      "Kimyasal Tepkimelerde Enerji",
      "Kimyasal Tepkimelerde H\u0131z",
      "Kimyasal Denge",
      "Asit-Baz Dengesi",
      "\xC7\xF6z\xFCn\xFCrl\xFCk Dengesi",
      { topic: "Kimya ve Elektrik", aliases: ["elektrokimya"] },
      "Karbon Kimyas\u0131na Giri\u015F",
      "Organik Bile\u015Fikler",
      "Enerji Kaynaklar\u0131 ve Bilimsel Geli\u015Fmeler"
    ]
  },
  Biyoloji: {
    "\u0130nsan Fizyolojisi": [
      "Sinir Sistemi",
      { topic: "Endokrin Sistem", aliases: ["hormonlar"] },
      "Duyu Organlar\u0131",
      "Destek ve Hareket Sistemi",
      "Sindirim Sistemi",
      "Dola\u015F\u0131m ve Ba\u011F\u0131\u015F\u0131kl\u0131k Sistemi",
      "Solunum Sistemi",
      "Bo\u015Falt\u0131m Sistemi",
      "\xDCreme Sistemi ve Embriyonik Geli\u015Fim"
    ],
    "Genetik ve Enerji": [
      "N\xFCkleik Asitler ve Genetik \u015Eifre",
      "Protein Sentezi",
      { topic: "Canl\u0131l\u0131k ve Enerji", aliases: ["fotosentez", "h\xFCcresel solunum", "kemosentez"] },
      "Bitki Biyolojisi"
    ],
    "Ekoloji": ["Kom\xFCnite ve Pop\xFClasyon Ekolojisi", "Canl\u0131lar ve \xC7evre"]
  },
  Edebiyat: {
    "Edebiyat Bilgisi": ["G\xFCzel Sanatlar ve Edebiyat", "Metinlerin S\u0131n\u0131fland\u0131r\u0131lmas\u0131", { topic: "\u015Eiir Bilgisi", aliases: ["naz\u0131m birimi", "\xF6l\xE7\xFC", "uyak", "redif"] }, "Edebi Sanatlar", "Edebi Ak\u0131mlar"],
    "T\xFCrk Edebiyat\u0131 D\xF6nemleri": [
      "\u0130slamiyet \xD6ncesi T\xFCrk Edebiyat\u0131",
      "Ge\xE7i\u015F D\xF6nemi T\xFCrk Edebiyat\u0131",
      { topic: "Divan Edebiyat\u0131", aliases: ["klasik t\xFCrk edebiyat\u0131"] },
      "Halk Edebiyat\u0131",
      "Tanzimat Edebiyat\u0131",
      "Servet-i F\xFCnun Edebiyat\u0131",
      "Fecr-i Ati Edebiyat\u0131",
      "Milli Edebiyat",
      "Cumhuriyet D\xF6nemi T\xFCrk Edebiyat\u0131",
      "D\xFCnya Edebiyat\u0131"
    ]
  },
  Tarih: {
    "Tarih": [
      "Osmanl\u0131 K\xFClt\xFCr ve Medeniyeti",
      "XX. Y\xFCzy\u0131lda D\xFCnya",
      "\u0130kinci D\xFCnya Sava\u015F\u0131",
      "So\u011Fuk Sava\u015F D\xF6nemi",
      "Yumu\u015Fama D\xF6nemi ve Sonras\u0131",
      "K\xFCreselle\u015Fen D\xFCnya",
      "T\xFCrk D\u0131\u015F Politikas\u0131"
    ]
  },
  Co\u011Frafya: {
    "Co\u011Frafya": ["Ekosistem", "N\xFCfus Politikalar\u0131", "T\xFCrkiye'de Ekonomi", "T\xFCrkiye'nin \u0130\u015Flevsel B\xF6lgeleri", "K\xFCresel Ticaret", "\xDClkeler ve B\xF6lgeler", "\xC7evre Sorunlar\u0131"]
  },
  Felsefe: {
    "Felsefe Grubu": ["Mant\u0131k", "Psikoloji", "Sosyoloji"]
  }
};
var LGS = {
  T\u00FCrk\u00E7e: {
    "S\xF6zc\xFCk ve C\xFCmle Anlam\u0131": [
      { topic: "S\xF6zc\xFCkte Anlam", aliases: ["s\xF6zc\xFCk anlam\u0131", "deyimler ve atas\xF6zleri", "deyim ve atas\xF6zleri"] },
      { topic: "C\xFCmlede Anlam", aliases: ["c\xFCmle anlam\u0131", "c\xFCmle yorumu", "neden sonu\xE7 ama\xE7 sonu\xE7 ko\u015Ful"] },
      { topic: "S\xF6z Sanatlar\u0131", aliases: ["s\xF6z sanat\u0131", "benzetme", "ki\u015File\u015Ftirme", "abartma"] }
    ],
    Paragraf: [
      { topic: "Paragrafta Konu ve Ana D\xFC\u015F\xFCnce", aliases: ["paragrafta konu", "ana d\xFC\u015F\xFCnce", "ana fikir"] },
      { topic: "Paragrafta Yard\u0131mc\u0131 D\xFC\u015F\xFCnce", aliases: ["yard\u0131mc\u0131 d\xFC\u015F\xFCnce", "yard\u0131mc\u0131 fikir"] },
      { topic: "Paragraf\u0131n Yap\u0131s\u0131", aliases: ["paragrafta yap\u0131", "ak\u0131\u015F\u0131 bozan c\xFCmle", "paragraf olu\u015Fturma"] },
      { topic: "Metin T\xFCrleri ve Anlat\u0131m Bi\xE7imleri", aliases: ["metin t\xFCrleri", "anlat\u0131m bi\xE7imleri", "d\xFC\u015F\xFCnceyi geli\u015Ftirme yollar\u0131"] },
      { topic: "G\xF6rsel ve Grafik Okuma", aliases: ["g\xF6rsel okuma", "grafik yorumlama", "tablo okuma"] },
      { topic: "S\xF6zel Mant\u0131k", aliases: ["s\xF6zel mant\u0131k sorular\u0131", "mant\u0131k muhakeme"] }
    ],
    "Dil Bilgisi": [
      { topic: "Fiilimsiler", aliases: ["eylemsiler", "isim fiil", "s\u0131fat fiil", "zarf fiil"] },
      { topic: "C\xFCmlenin \xD6geleri", aliases: ["c\xFCmle \xF6geleri", "\xF6\u011Feler"] },
      { topic: "Fiilde \xC7at\u0131", aliases: ["fiillerde \xE7at\u0131", "eylemde \xE7at\u0131"] },
      { topic: "C\xFCmle T\xFCrleri", aliases: ["c\xFCmle \xE7e\u015Fitleri", "anlam\u0131na g\xF6re c\xFCmleler", "yap\u0131s\u0131na g\xF6re c\xFCmleler"] },
      { topic: "Yaz\u0131m Kurallar\u0131", aliases: ["imla kurallar\u0131"] },
      { topic: "Noktalama \u0130\u015Faretleri", aliases: ["noktalama"] },
      { topic: "Anlat\u0131m Bozukluklar\u0131", aliases: ["anlat\u0131m bozuklu\u011Fu"] }
    ]
  },
  Matematik: {
    "Say\u0131lar ve \u0130\u015Flemler": [
      { topic: "\xC7arpanlar ve Katlar", aliases: ["ebob ekok", "asal \xE7arpanlar", "aralar\u0131nda asal"] },
      { topic: "\xDCsl\xFC \u0130fadeler", aliases: ["\xFCsl\xFC say\u0131lar", "bilimsel g\xF6sterim"] },
      { topic: "Karek\xF6kl\xFC \u0130fadeler", aliases: ["karek\xF6k", "k\xF6kl\xFC ifadeler", "k\xF6kl\xFC say\u0131lar"] }
    ],
    "Veri ve Olas\u0131l\u0131k": [
      { topic: "Veri Analizi", aliases: ["grafikler", "\xE7izgi grafi\u011Fi", "s\xFCtun grafi\u011Fi"] },
      { topic: "Basit Olaylar\u0131n Olma Olas\u0131l\u0131\u011F\u0131", aliases: ["olas\u0131l\u0131k"] }
    ],
    "Cebir": [
      { topic: "Cebirsel \u0130fadeler ve \xD6zde\u015Flikler", aliases: ["\xF6zde\u015Flikler", "\xE7arpanlara ay\u0131rma", "cebirsel ifadeler"] },
      { topic: "Do\u011Frusal Denklemler", aliases: ["denklemler", "e\u011Fim", "do\u011Fru grafi\u011Fi"] },
      { topic: "E\u015Fitsizlikler", aliases: ["do\u011Frusal e\u015Fitsizlikler"] }
    ],
    "Geometri ve \xD6l\xE7me": [
      { topic: "\xDC\xE7genler", aliases: ["pisagor ba\u011F\u0131nt\u0131s\u0131", "\xFC\xE7gen e\u015Fitsizli\u011Fi", "kenarortay a\xE7\u0131ortay y\xFCkseklik"] },
      { topic: "E\u015Flik ve Benzerlik", aliases: ["benzerlik", "e\u015Flik"] },
      { topic: "D\xF6n\xFC\u015F\xFCm Geometrisi", aliases: ["\xF6teleme", "yans\u0131ma", "\xF6teleme ve yans\u0131ma"] },
      { topic: "Geometrik Cisimler", aliases: ["prizmalar", "silindir", "piramit", "koni"] }
    ]
  },
  "Fen Bilimleri": {
    "Fen Bilimleri": [
      { topic: "Mevsimler ve \u0130klim", aliases: ["mevsimlerin olu\u015Fumu", "iklim ve hava hareketleri"] },
      { topic: "DNA ve Genetik Kod", aliases: ["dna", "kal\u0131t\u0131m", "mutasyon ve modifikasyon", "adaptasyon", "biyoteknoloji"] },
      { topic: "Bas\u0131n\xE7", aliases: ["kat\u0131 bas\u0131nc\u0131", "s\u0131v\u0131 bas\u0131nc\u0131", "gaz bas\u0131nc\u0131"] },
      { topic: "Madde ve End\xFCstri", aliases: ["periyodik sistem", "kimyasal tepkimeler", "asitler ve bazlar", "fiziksel ve kimyasal de\u011Fi\u015Fimler"] },
      { topic: "Basit Makineler", aliases: ["kald\u0131ra\xE7", "makara", "e\u011Fik d\xFCzlem"] },
      { topic: "Enerji D\xF6n\xFC\u015F\xFCmleri ve \xC7evre Bilimi", aliases: ["besin zinciri", "fotosentez", "solunum", "madde d\xF6ng\xFCleri"] },
      { topic: "Elektrik Y\xFCkleri ve Elektrik Enerjisi", aliases: ["elektriklenme", "elektrik enerjisi"] }
    ]
  },
  "\u0130nk\u0131lap Tarihi": {
    "T.C. \u0130nk\u0131lap Tarihi ve Atat\xFCrk\xE7\xFCl\xFCk": [
      { topic: "Bir Kahraman Do\u011Fuyor", aliases: ["avrupa'daki geli\u015Fmeler", "mustafa kemal'in \xE7ocuklu\u011Fu"] },
      { topic: "Mill\xEE Uyan\u0131\u015F: Ba\u011F\u0131ms\u0131zl\u0131k Yolunda At\u0131lan Ad\u0131mlar", aliases: ["milli uyan\u0131\u015F", "birinci d\xFCnya sava\u015F\u0131", "mondros", "kongreler"] },
      { topic: "Mill\xEE Bir Destan: Ya \u0130stiklal Ya \xD6l\xFCm!", aliases: ["milli bir destan", "kurtulu\u015F sava\u015F\u0131", "milli m\xFCcadele", "cepheler"] },
      { topic: "Atat\xFCrk\xE7\xFCl\xFCk ve \xC7a\u011Fda\u015Fla\u015Fan T\xFCrkiye", aliases: ["atat\xFCrk ilkeleri", "ink\u0131laplar", "\xE7a\u011Fda\u015Fla\u015Fan t\xFCrkiye"] },
      { topic: "Demokratikle\u015Fme \xC7abalar\u0131", aliases: ["\xE7ok partili hayat", "demokratikle\u015Fme"] },
      { topic: "Atat\xFCrk D\xF6nemi T\xFCrk D\u0131\u015F Politikas\u0131", aliases: ["d\u0131\u015F politika"] },
      { topic: "Atat\xFCrk'\xFCn \xD6l\xFCm\xFC ve Sonras\u0131", aliases: ["atat\xFCrk'\xFCn \xF6l\xFCm\xFC", "ikinci d\xFCnya sava\u015F\u0131"] }
    ]
  },
  "Din K\xFClt\xFCr\xFC": {
    "Din K\xFClt\xFCr\xFC ve Ahlak Bilgisi": [
      { topic: "Kader \u0130nanc\u0131", aliases: ["kader ve kaza"] },
      { topic: "Zek\xE2t ve Sadaka", aliases: ["zekat", "sadaka", "infak"] },
      { topic: "Din ve Hayat", aliases: ["din ve aile", "din ve \xE7evre"] },
      { topic: "Hz. Muhammed'in \xD6rnekli\u011Fi", aliases: ["peygamberimizin \xF6rnekli\u011Fi"] },
      { topic: "Kur'an-\u0131 Kerim ve \xD6zellikleri", aliases: ["kuran'\u0131n ana konular\u0131"] }
    ]
  },
  \u0130ngilizce: {
    "English": [
      "Friendship",
      "Teen Life",
      "In the Kitchen",
      "On the Phone",
      "The Internet",
      "Adventures",
      "Tourism",
      "Chores",
      "Science",
      "Natural Forces"
    ]
  }
};
var slugPart = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/[çğıöşüâîû]/g, (char) => ({ \u00E7: "c", \u011F: "g", \u0131: "i", \u00F6: "o", \u015F: "s", \u00FC: "u", \u00E2: "a", \u00EE: "i", \u00FB: "u" })[char] ?? char).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function flatten(exam, tree) {
  return Object.entries(tree).flatMap(
    ([subject2, units]) => Object.entries(units).flatMap(
      ([unit, entries]) => entries.map((entry) => {
        const def = typeof entry === "string" ? { topic: entry } : entry;
        return {
          slug: def.legacySlug ?? `cur-${exam.toLowerCase()}-${slugPart(subject2)}-${slugPart(def.topic)}`.slice(0, 120),
          exam,
          subject: subject2,
          unit,
          topic: def.topic,
          aliases: def.aliases ?? []
        };
      })
    )
  );
}
var KPSS_GYGK = {
  T\u00FCrk\u00E7e: {
    "S\xF6zc\xFCk ve C\xFCmle Anlam\u0131": [
      { topic: "S\xF6zc\xFCkte Anlam", aliases: ["s\xF6zc\xFCk anlam\u0131", "deyim ve atas\xF6zleri"] },
      { topic: "C\xFCmlede Anlam", aliases: ["c\xFCmle anlam\u0131", "c\xFCmle yorumu"] }
    ],
    Paragraf: [
      { topic: "Paragrafta Anlam", aliases: ["paragraf", "paragrafta ana d\xFC\u015F\xFCnce", "paragrafta yard\u0131mc\u0131 d\xFC\u015F\xFCnce", "paragraf\u0131n yap\u0131s\u0131", "anlat\u0131m bi\xE7imleri"] }
    ],
    "Dil Bilgisi": [
      "Ses Bilgisi",
      { topic: "Yap\u0131 Bilgisi", aliases: ["s\xF6zc\xFCkte yap\u0131", "k\xF6k ve ekler"] },
      { topic: "S\xF6zc\xFCk T\xFCrleri", aliases: ["isimler", "s\u0131fatlar", "zamirler", "zarflar", "edat ba\u011Fla\xE7 \xFCnlem", "fiiller", "fiilimsiler"] },
      { topic: "C\xFCmle Bilgisi", aliases: ["c\xFCmlenin \xF6geleri", "c\xFCmle t\xFCrleri", "c\xFCmle \xE7e\u015Fitleri"] },
      { topic: "Yaz\u0131m Kurallar\u0131", aliases: ["imla kurallar\u0131"] },
      { topic: "Noktalama \u0130\u015Faretleri", aliases: ["noktalama"] },
      { topic: "Anlat\u0131m Bozukluklar\u0131", aliases: ["anlat\u0131m bozuklu\u011Fu"] }
    ],
    "S\xF6zel Mant\u0131k": [{ topic: "S\xF6zel Mant\u0131k", aliases: ["s\xF6zel ak\u0131l y\xFCr\xFCtme"] }]
  },
  Matematik: {
    "Temel Matematik": [
      { topic: "Temel Kavramlar", aliases: ["say\u0131lar", "d\xF6rt i\u015Flem"] },
      "Say\u0131 Basamaklar\u0131",
      { topic: "B\xF6lme ve B\xF6l\xFCnebilme", aliases: ["b\xF6l\xFCnebilme kurallar\u0131"] },
      { topic: "EBOB - EKOK", aliases: ["ebob ekok", "obeb okek"] },
      { topic: "Rasyonel ve Ondal\u0131k Say\u0131lar", aliases: ["rasyonel say\u0131lar", "ondal\u0131k say\u0131lar", "kesirler"] },
      "Basit E\u015Fitsizlikler",
      "Mutlak De\u011Fer",
      { topic: "\xDCsl\xFC Say\u0131lar", aliases: ["\xFCsl\xFC ifadeler"] },
      { topic: "K\xF6kl\xFC Say\u0131lar", aliases: ["k\xF6kl\xFC ifadeler"] },
      "\xC7arpanlara Ay\u0131rma",
      { topic: "Oran - Orant\u0131", aliases: ["oran orant\u0131"] },
      { topic: "Denklem \xC7\xF6zme", aliases: ["birinci dereceden denklemler"] }
    ],
    Problemler: [
      "Say\u0131 Problemleri",
      "Kesir Problemleri",
      "Ya\u015F Problemleri",
      "\u0130\u015F\xE7i Problemleri",
      "Hareket Problemleri",
      { topic: "Y\xFCzde, K\xE2r - Zarar Problemleri", aliases: ["y\xFCzde problemleri", "kar zarar problemleri"] },
      "Kar\u0131\u015F\u0131m Problemleri",
      { topic: "Tablo ve Grafik Yorumlama", aliases: ["grafik problemleri", "tablo grafik"] }
    ],
    "Cebir ve Sayma": ["K\xFCmeler", "Fonksiyonlar", { topic: "Perm\xFCtasyon, Kombinasyon ve Olas\u0131l\u0131k", aliases: ["perm\xFCtasyon", "kombinasyon", "olas\u0131l\u0131k"] }],
    "Say\u0131sal Mant\u0131k": [{ topic: "Say\u0131sal Mant\u0131k", aliases: ["say\u0131sal ak\u0131l y\xFCr\xFCtme", "mant\u0131k muhakeme"] }],
    Geometri: [
      { topic: "A\xE7\u0131lar ve \xDC\xE7genler", aliases: ["\xFC\xE7genler", "a\xE7\u0131lar", "\xFC\xE7gende alan"] },
      { topic: "D\xF6rtgenler ve \xC7okgenler", aliases: ["d\xF6rtgenler", "\xE7okgenler"] },
      { topic: "\xC7ember ve Daire", aliases: ["\xE7ember", "daire"] },
      { topic: "Analitik Geometri", aliases: ["noktan\u0131n analiti\u011Fi", "do\u011Frunun analiti\u011Fi"] },
      "Kat\u0131 Cisimler"
    ]
  },
  Tarih: {
    "T\xFCrk Tarihi": [
      { topic: "\u0130slamiyet \xD6ncesi T\xFCrk Tarihi", aliases: ["ilk t\xFCrk devletleri"] },
      { topic: "\u0130lk T\xFCrk-\u0130slam Devletleri", aliases: ["t\xFCrk islam devletleri"] },
      { topic: "Osmanl\u0131 Devleti Kurulu\u015F ve Y\xFCkselme", aliases: ["osmanl\u0131 kurulu\u015F", "osmanl\u0131 y\xFCkselme"] },
      { topic: "Osmanl\u0131 K\xFClt\xFCr ve Medeniyeti", aliases: ["osmanl\u0131 k\xFClt\xFCr"] },
      { topic: "Osmanl\u0131 Duraklama, Gerileme ve Da\u011F\u0131lma", aliases: ["osmanl\u0131 duraklama", "osmanl\u0131 gerileme", "osmanl\u0131 da\u011F\u0131lma"] },
      "XX. Y\xFCzy\u0131l Ba\u015Flar\u0131nda Osmanl\u0131"
    ],
    "\u0130nk\u0131lap Tarihi": [
      { topic: "Kurtulu\u015F Sava\u015F\u0131 Haz\u0131rl\u0131k D\xF6nemi", aliases: ["milli m\xFCcadele haz\u0131rl\u0131k", "kongreler"] },
      { topic: "Kurtulu\u015F Sava\u015F\u0131 Cepheleri", aliases: ["cepheler", "milli m\xFCcadele"] },
      { topic: "Atat\xFCrk \u0130lke ve \u0130nk\u0131laplar\u0131", aliases: ["ink\u0131laplar", "atat\xFCrk ilkeleri"] },
      { topic: "Atat\xFCrk D\xF6nemi \u0130\xE7 ve D\u0131\u015F Politika", aliases: ["atat\xFCrk d\xF6nemi d\u0131\u015F politika"] },
      { topic: "\xC7a\u011Fda\u015F T\xFCrk ve D\xFCnya Tarihi", aliases: ["\xE7a\u011Fda\u015F t\xFCrk tarihi", "yak\u0131n d\xF6nem"] }
    ]
  },
  Co\u011Frafya: {
    "T\xFCrkiye Co\u011Frafyas\u0131": [
      { topic: "T\xFCrkiye'nin Co\u011Frafi Konumu", aliases: ["co\u011Frafi konum"] },
      { topic: "T\xFCrkiye'nin Yer \u015Eekilleri", aliases: ["yer \u015Fekilleri"] },
      { topic: "\u0130klim ve Bitki \xD6rt\xFCs\xFC", aliases: ["iklim", "bitki \xF6rt\xFCs\xFC"] },
      { topic: "N\xFCfus ve Yerle\u015Fme", aliases: ["n\xFCfus", "yerle\u015Fme"] },
      { topic: "Tar\u0131m, Hayvanc\u0131l\u0131k ve Ormanc\u0131l\u0131k", aliases: ["tar\u0131m", "hayvanc\u0131l\u0131k"] },
      { topic: "Madenler ve Enerji Kaynaklar\u0131", aliases: ["madenler", "enerji kaynaklar\u0131"] },
      "Sanayi",
      { topic: "Ula\u015F\u0131m, Ticaret ve Turizm", aliases: ["ula\u015F\u0131m", "ticaret", "turizm"] },
      { topic: "T\xFCrkiye'nin B\xF6lgeleri", aliases: ["b\xF6lgeler", "b\xF6lgesel kalk\u0131nma projeleri"] }
    ]
  },
  Vatanda\u015Fl\u0131k: {
    "Hukuk ve Anayasa": [
      { topic: "Temel Hukuk Kavramlar\u0131", aliases: ["hukukun temel kavramlar\u0131"] },
      { topic: "Anayasa Hukuku ve 1982 Anayasas\u0131", aliases: ["1982 anayasas\u0131", "anayasa hukuku"] },
      { topic: "Temel Hak ve \xD6zg\xFCrl\xFCkler", aliases: ["temel haklar"] },
      { topic: "Yasama", aliases: ["tbmm"] },
      { topic: "Y\xFCr\xFCtme", aliases: ["cumhurba\u015Fkan\u0131"] },
      "Yarg\u0131",
      { topic: "\u0130dare Hukuku", aliases: ["idari te\u015Fkilat"] },
      { topic: "Uluslararas\u0131 Kurulu\u015Flar", aliases: ["uluslararas\u0131 \xF6rg\xFCtler"] }
    ]
  },
  "G\xFCncel Bilgiler": {
    "G\xFCncel Bilgiler": [{ topic: "G\xFCncel Bilgiler", aliases: ["g\xFCncel olaylar", "k\xFClt\xFCrel ve bilimsel geli\u015Fmeler"] }]
  }
};
var DGS = {
  Say\u0131sal: {
    "Temel Matematik": [
      { topic: "Temel Kavramlar ve Say\u0131lar", aliases: ["temel kavramlar", "say\u0131lar"] },
      { topic: "B\xF6l\xFCnebilme, EBOB - EKOK", aliases: ["b\xF6l\xFCnebilme", "ebob ekok"] },
      { topic: "Rasyonel ve Ondal\u0131k Say\u0131lar", aliases: ["rasyonel say\u0131lar", "ondal\u0131k say\u0131lar"] },
      { topic: "\xDCsl\xFC ve K\xF6kl\xFC Say\u0131lar", aliases: ["\xFCsl\xFC say\u0131lar", "k\xF6kl\xFC say\u0131lar"] },
      { topic: "E\u015Fitsizlik ve Mutlak De\u011Fer", aliases: ["e\u015Fitsizlikler", "mutlak de\u011Fer"] },
      { topic: "\xC7arpanlara Ay\u0131rma ve Oran - Orant\u0131", aliases: ["\xE7arpanlara ay\u0131rma", "oran orant\u0131"] }
    ],
    Problemler: [{ topic: "Say\u0131, Kesir ve Ya\u015F Problemleri", aliases: ["say\u0131 problemleri", "ya\u015F problemleri"] }, { topic: "Y\xFCzde, K\xE2r - Zarar ve Kar\u0131\u015F\u0131m Problemleri", aliases: ["y\xFCzde problemleri", "kar zarar"] }, { topic: "Hareket ve \u0130\u015F\xE7i Problemleri", aliases: ["hareket problemleri", "i\u015F\xE7i problemleri"] }, { topic: "Tablo ve Grafik Problemleri", aliases: ["grafik problemleri"] }],
    "Cebir ve Sayma": ["K\xFCmeler", "Fonksiyonlar", { topic: "Perm\xFCtasyon, Kombinasyon ve Olas\u0131l\u0131k", aliases: ["olas\u0131l\u0131k"] }],
    "Say\u0131sal Mant\u0131k": [{ topic: "Say\u0131sal Mant\u0131k", aliases: ["say\u0131sal ak\u0131l y\xFCr\xFCtme"] }],
    Geometri: [{ topic: "A\xE7\u0131lar ve \xDC\xE7genler", aliases: ["\xFC\xE7genler"] }, { topic: "D\xF6rtgenler ve \xC7okgenler", aliases: ["d\xF6rtgenler"] }, { topic: "\xC7ember ve Daire", aliases: ["\xE7ember"] }, { topic: "Analitik Geometri", aliases: ["analitik"] }, "Kat\u0131 Cisimler"]
  },
  S\u00F6zel: {
    "S\xF6zc\xFCk ve C\xFCmle Anlam\u0131": [{ topic: "S\xF6zc\xFCkte Anlam", aliases: ["s\xF6zc\xFCk anlam\u0131"] }, { topic: "C\xFCmlede Anlam", aliases: ["c\xFCmle anlam\u0131"] }],
    Paragraf: [{ topic: "Paragrafta Anlam", aliases: ["paragraf", "ana d\xFC\u015F\xFCnce", "paragraf\u0131n yap\u0131s\u0131"] }],
    "Dil Bilgisi": [{ topic: "Dil Bilgisi", aliases: ["s\xF6zc\xFCk t\xFCrleri", "c\xFCmle bilgisi", "yaz\u0131m kurallar\u0131", "noktalama"] }, { topic: "Anlat\u0131m Bozukluklar\u0131", aliases: ["anlat\u0131m bozuklu\u011Fu"] }],
    "S\xF6zel Mant\u0131k": [{ topic: "S\xF6zel Mant\u0131k", aliases: ["s\xF6zel ak\u0131l y\xFCr\xFCtme"] }]
  }
};
var MEB_AGS = {
  "E\u011Fitim Bilimleri": {
    "E\u011Fitim Bilimleri ve T\xFCrk Mill\xEE E\u011Fitim Sistemi": [
      { topic: "Geli\u015Fim Psikolojisi", aliases: ["geli\u015Fim"] },
      { topic: "\xD6\u011Frenme Psikolojisi", aliases: ["\xF6\u011Frenme kuramlar\u0131"] },
      { topic: "\xD6\u011Fretim \u0130lke ve Y\xF6ntemleri", aliases: ["\xF6\u011Fretim y\xF6ntem ve teknikleri", "\xF6\u011Fretim stratejileri"] },
      { topic: "Program Geli\u015Ftirme", aliases: ["e\u011Fitimde program geli\u015Ftirme"] },
      { topic: "\xD6l\xE7me ve De\u011Ferlendirme", aliases: ["\xF6l\xE7me de\u011Ferlendirme"] },
      { topic: "Rehberlik ve \xD6zel E\u011Fitim", aliases: ["rehberlik", "\xF6zel e\u011Fitim"] },
      { topic: "S\u0131n\u0131f Y\xF6netimi", aliases: ["s\u0131n\u0131f y\xF6netimi"] },
      { topic: "T\xFCrk Mill\xEE E\u011Fitim Sistemi", aliases: ["t\xFCrk e\u011Fitim sistemi", "e\u011Fitim tarihi"] }
    ]
  },
  "S\xF6zel Yetenek": {
    "S\xF6zel Yetenek": [{ topic: "S\xF6zc\xFCk ve C\xFCmlede Anlam", aliases: ["s\xF6zc\xFCkte anlam", "c\xFCmlede anlam"] }, { topic: "Paragraf", aliases: ["paragrafta anlam"] }, { topic: "S\xF6zel Mant\u0131k", aliases: ["s\xF6zel ak\u0131l y\xFCr\xFCtme"] }]
  },
  "Say\u0131sal Yetenek": {
    "Say\u0131sal Yetenek": [{ topic: "Temel Matematik", aliases: ["say\u0131lar", "temel kavramlar"] }, { topic: "Problemler", aliases: ["say\u0131 problemleri", "y\xFCzde problemleri"] }, { topic: "Tablo ve Grafik Yorumlama", aliases: ["grafik"] }, { topic: "Say\u0131sal Mant\u0131k", aliases: ["mant\u0131ksal muhakeme"] }]
  },
  Mevzuat: {
    Mevzuat: [
      { topic: "Anayasa'n\u0131n E\u011Fitimle \u0130lgili H\xFCk\xFCmleri", aliases: ["anayasa"] },
      { topic: "1739 Say\u0131l\u0131 Mill\xEE E\u011Fitim Temel Kanunu", aliases: ["milli e\u011Fitim temel kanunu", "1739"] },
      { topic: "222 Say\u0131l\u0131 \u0130lk\xF6\u011Fretim ve E\u011Fitim Kanunu", aliases: ["ilk\xF6\u011Fretim ve e\u011Fitim kanunu", "222"] },
      { topic: "7528 Say\u0131l\u0131 \xD6\u011Fretmenlik Mesle\u011Fi Kanunu", aliases: ["\xF6\u011Fretmenlik mesle\u011Fi kanunu", "7528"] }
    ]
  },
  Tarih: {
    Tarih: [{ topic: "Osmanl\u0131 ve T\xFCrk Tarihi", aliases: ["osmanl\u0131 tarihi", "t\xFCrk tarihi"] }, { topic: "Kurtulu\u015F Sava\u015F\u0131 ve Atat\xFCrk \u0130lkeleri", aliases: ["milli m\xFCcadele", "atat\xFCrk ilke ve ink\u0131laplar\u0131"] }]
  },
  "T\xFCrkiye Co\u011Frafyas\u0131": {
    "T\xFCrkiye Co\u011Frafyas\u0131": [{ topic: "Fiziki Co\u011Frafya", aliases: ["yer \u015Fekilleri", "iklim"] }, { topic: "Be\u015Feri ve Ekonomik Co\u011Frafya", aliases: ["n\xFCfus", "ekonomik faaliyetler"] }]
  }
};
var KPSS_A = {
  Hukuk: { Hukuk: ["Anayasa Hukuku", "\u0130dare Hukuku", "Ceza Hukuku", "Medeni Hukuk", "Bor\xE7lar Hukuku", "Ticaret Hukuku", "\u0130cra ve \u0130flas Hukuku"] },
  \u0130ktisat: { \u0130ktisat: [{ topic: "Mikro \u0130ktisat", aliases: ["mikroekonomi"] }, { topic: "Makro \u0130ktisat", aliases: ["makroekonomi"] }, "Para, Banka ve Kredi", "Uluslararas\u0131 \u0130ktisat", "B\xFCy\xFCme ve Kalk\u0131nma", "\u0130ktisadi D\xFC\u015F\xFCnceler Tarihi", "T\xFCrkiye Ekonomisi"] },
  Maliye: { Maliye: ["Maliye Teorisi", "Kamu Harcamalar\u0131", "Kamu Gelirleri", { topic: "B\xFCt\xE7e", aliases: ["5018 say\u0131l\u0131 kanun"] }, "Maliye Politikas\u0131", "Vergi Hukuku", "T\xFCrk Vergi Sistemi"] },
  Muhasebe: { Muhasebe: ["Genel Muhasebe", "Bilan\xE7o Analizi", { topic: "Mali Tablolar Analizi", aliases: ["mali analiz"] }, "Maliyet Muhasebesi", "Muhasebe Denetimi", "\u015Eirketler Muhasebesi"] },
  \u0130\u015Fletme: { \u0130\u015Fletme: ["\u0130\u015Fletme Y\xF6netimi", "\xDCretim Y\xF6netimi", "Pazarlama", "Finansal Y\xF6netim", "\u0130nsan Kaynaklar\u0131 Y\xF6netimi", "\xD6rg\xFCtsel Davran\u0131\u015F"] },
  "\xC7al\u0131\u015Fma Ekonomisi": { "\xC7al\u0131\u015Fma Ekonomisi": ["\xC7al\u0131\u015Fma Ekonomisi", "End\xFCstri \u0130li\u015Fkileri", "\u0130\u015F Hukuku", "Sosyal G\xFCvenlik Hukuku"] },
  \u0130statistik: { \u0130statistik: ["Tan\u0131mlay\u0131c\u0131 \u0130statistik", "Olas\u0131l\u0131k", "Olas\u0131l\u0131k Da\u011F\u0131l\u0131mlar\u0131", "Tahmin ve Hipotez Testleri", "Regresyon ve Korelasyon"] },
  "Kamu Y\xF6netimi": { "Kamu Y\xF6netimi": ["Siyaset Bilimi", "Y\xF6netim Bilimleri", "T\xFCrk Y\xF6netim Tarihi", "Y\xF6netim Hukuku", "Kentle\u015Fme ve \xC7evre Sorunlar\u0131", "T\xFCrk Siyasal Hayat\u0131"] },
  "Uluslararas\u0131 \u0130li\u015Fkiler": { "Uluslararas\u0131 \u0130li\u015Fkiler": ["Uluslararas\u0131 \u0130li\u015Fkiler Teorisi", "Siyasi Tarih", "Uluslararas\u0131 Hukuk", "Uluslararas\u0131 \xD6rg\xFCtler", "T\xFCrk D\u0131\u015F Politikas\u0131", "G\xFCncel Uluslararas\u0131 Sorunlar"] }
};
var TREES = { TYT, AYT, LGS, KPSS_GYGK, DGS, MEB_AGS, KPSS_A };
var CURRICULUM = Object.keys(TREES).flatMap((exam) => flatten(exam, TREES[exam]));
var isCurriculumOnlySlug = (slug) => slug.startsWith("cur-");
var ADMIN_TOPIC_SLUG_PREFIX = "cur-adm-";
var isAdminTopicSlug = (slug) => slug.startsWith(ADMIN_TOPIC_SLUG_PREFIX);

// shared/topicStatus.ts
var TOPIC_STATUS_THRESHOLDS = { weak: 55, good: 85 };
var MIN_RELIABLE_QUESTION_COUNT = 8;
function deriveTopicStatus(accuracy, questionCount) {
  const clamped = Math.max(0, Math.min(100, accuracy));
  const status = clamped < TOPIC_STATUS_THRESHOLDS.weak ? "Zay\u0131f" : clamped < TOPIC_STATUS_THRESHOLDS.good ? "Orta" : "\u0130yi";
  return { status, insufficientData: questionCount < MIN_RELIABLE_QUESTION_COUNT };
}
function statusAfterAbandonedSession(current) {
  return current === null || current === "\u0130yi" ? "Orta" : current;
}

// shared/palette.ts
var palette = {
  paper: "#f3f6f5",
  surface: "#ffffff",
  ink: "#18202a",
  ink2: "#3f4753",
  ink3: "#5f6671",
  ink4: "#7b818b",
  ruleStrong: "#c5ccd0",
  rule: "#e3e9e7",
  brand: "#17625f",
  brandStrong: "#0f4a48",
  brandSoft: "#e3f0ee",
  pencil: "#f2b934",
  pencilStrong: "#e0a514",
  pencilInk: "#7a5600",
  pencilSoft: "#fdf3d8",
  danger: "#bf3a2b",
  dangerStrong: "#962c20",
  dangerSoft: "#fae6e2",
  success: "#2b7a4b",
  successSoft: "#e3f1e7",
  warn: "#9a6400",
  warnFill: "#d99a1e",
  warnSoft: "#fbf0d6",
  violet: "#6a4fb0",
  violetSoft: "#efebfa"
};
var subjectPalette = {
  T\u00FCrk\u00E7e: "#8a4fb0",
  Matematik: "#2a5db0",
  Fen: "#2e8b6e",
  Sosyal: "#b8741a",
  Fizik: "#b0476e",
  Kimya: "#4a8f9c",
  Biyoloji: "#5e8a2e",
  // LGS dersleri
  "Fen Bilimleri": "#2e8b6e",
  "\u0130nk\u0131lap Tarihi": "#b8741a",
  "Din K\xFClt\xFCr\xFC": "#8a6a3a",
  \u0130ngilizce: "#3a7ab8",
  // KPSS / DGS dersleri
  Tarih: "#b8741a",
  Co\u011Frafya: "#4a8f9c",
  Vatanda\u015Fl\u0131k: "#6a4fb0",
  "G\xFCncel Bilgiler": "#8a6a3a",
  Say\u0131sal: "#2a5db0",
  S\u00F6zel: "#8a4fb0"
};

// shared/dates.ts
var toLocalDateKey = (value = /* @__PURE__ */ new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// shared/yksData.ts
var trackedTopics = [
  { topic: "Paragrafta anlam", subject: "T\xFCrk\xE7e", max: 12, color: subjectPalette.T\u00FCrk\u00E7e },
  { topic: "Problemler", subject: "Matematik", max: 12, color: subjectPalette.Matematik },
  { topic: "Maddenin halleri", subject: "Fen", max: 6, color: subjectPalette.Fen },
  { topic: "Milli M\xFCcadele", subject: "Sosyal", max: 6, color: subjectPalette.Sosyal },
  { topic: "Fonksiyonlar", subject: "Matematik", max: 10, color: palette.violet }
];
var topicSeeds = [
  { id: "tyt-tr-paragraf", exam: "TYT", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", unit: "Anlam bilgisi", progress: 38, status: "Zay\u0131f", accent: "coral" },
  { id: "tyt-tr-dilbilgisi", exam: "TYT", subject: "T\xFCrk\xE7e", topic: "Fiilimsi ve c\xFCmlenin \xF6geleri", unit: "Dil bilgisi", progress: 64, status: "Orta", accent: "coral" },
  { id: "tyt-mat-problem", exam: "TYT", subject: "Matematik", topic: "Problemler", unit: "Temel matematik", progress: 31, status: "Zay\u0131f", accent: "blue" },
  { id: "tyt-mat-sayilar", exam: "TYT", subject: "Matematik", topic: "Say\u0131lar ve b\xF6l\xFCnebilme", unit: "Temel matematik", progress: 78, status: "Orta", accent: "blue" },
  { id: "tyt-fen-kimya", exam: "TYT", subject: "Fen", topic: "Maddenin halleri", unit: "Kimya", progress: 71, status: "Orta", accent: "mint" },
  { id: "tyt-sos-tarih", exam: "TYT", subject: "Sosyal", topic: "Milli M\xFCcadele", unit: "Tarih", progress: 88, status: "\u0130yi", accent: "yellow" },
  { id: "ayt-mat-fonksiyon", exam: "AYT", subject: "Matematik", topic: "Fonksiyonlar", unit: "Cebir", progress: 46, status: "Zay\u0131f", accent: "blue" },
  { id: "ayt-mat-integral", exam: "AYT", subject: "Matematik", topic: "\u0130ntegral", unit: "Analiz", progress: 22, status: "Zay\u0131f", accent: "blue" },
  { id: "ayt-fizik-elektrik", exam: "AYT", subject: "Fizik", topic: "Elektrik ve manyetizma", unit: "Elektrik", progress: 58, status: "Orta", accent: "lilac" },
  { id: "ayt-biyo-sistem", exam: "AYT", subject: "Biyoloji", topic: "Sistemler", unit: "\u0130nsan fizyolojisi", progress: 67, status: "Orta", accent: "mint" }
];
var statusMeta = {
  Zay\u0131f: { color: palette.danger, bg: palette.dangerSoft, description: "\xD6ncelikli tekrar" },
  Orta: { color: palette.warn, bg: palette.warnSoft, description: "Bir tur daha" },
  \u0130yi: { color: palette.success, bg: palette.successSoft, description: "Koruma turu" }
};
var topicCounts = {
  total: topicSeeds.length,
  weak: topicSeeds.filter((topic) => topic.status === "Zay\u0131f").length,
  medium: topicSeeds.filter((topic) => topic.status === "Orta").length,
  good: topicSeeds.filter((topic) => topic.status === "\u0130yi").length
};
var focusTopics = topicSeeds.filter((topic) => topic.status === "Zay\u0131f");
var averageProgress = Math.round(topicSeeds.reduce((sum, topic) => sum + topic.progress, 0) / topicSeeds.length);
var targetNet = 85;
var formatMinutes = (minutes) => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} dk`;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
};
var localStorageKeys = { exams: "pusula-yks-exams", topics: "pusula-yks-topics", studyHistory: "pusula-yks-study-history", bookInventory: "pusula-yks-book-inventory", bookLogs: "pusula-yks-book-logs", sourceSwitches: "pusula-yks-source-switches", customBooks: "pusula-yks-custom-books", calendarSessions: "pusula-yks-calendar-sessions", onboardingDraft: "pusula-yks-onboarding-draft" };
var perAccountCacheKeys = [localStorageKeys.exams, localStorageKeys.topics, localStorageKeys.studyHistory, localStorageKeys.bookInventory, localStorageKeys.bookLogs, localStorageKeys.sourceSwitches, localStorageKeys.customBooks, localStorageKeys.calendarSessions, localStorageKeys.onboardingDraft];
var statusLegend = [
  { label: "Zay\u0131f", copy: "\xD6ncelikli tekrar", color: palette.danger },
  { label: "Orta", copy: "Peki\u015Ftir", color: palette.warn },
  { label: "\u0130yi", copy: "Koru", color: palette.success }
];
var todayLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(/* @__PURE__ */ new Date());

// shared/questionNotebook.ts
var QUESTION_TEMPLATE_KEY = "question";
var ERROR_TYPES = {
  concept: { label: "Kavram eksi\u011Fi", icon: "\u{1F9E9}" },
  method: { label: "Form\xFCl / y\xF6ntem se\xE7imi", icon: "\u{1F9ED}" },
  calculation: { label: "\u0130\u015Flem hatas\u0131", icon: "\u270F\uFE0F" },
  reading: { label: "Soruyu yanl\u0131\u015F okuma", icon: "\u{1F440}" },
  time: { label: "S\xFCre bask\u0131s\u0131", icon: "\u23F1\uFE0F" },
  forgot: { label: "Bilgiyi unutma", icon: "\u{1F4AD}" }
};
var ERROR_TYPE_KEYS = Object.keys(ERROR_TYPES);
var DIFFICULTIES = { easy: "Kolay", medium: "Orta", hard: "Zor" };
var DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);
var ATTEMPT_RESULT_KEYS = ["solved", "partial", "failed"];
var REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
var NOTEBOOK_REVIEW_TASK_KIND = "Defter Tekrar\u0131";
var DAY_MS = 864e5;
function reviewDateAfter(days, now) {
  const date = new Date(now);
  date.setHours(6, 0, 0, 0);
  return new Date(date.getTime() + days * DAY_MS);
}
var firstReviewAt = (now) => reviewDateAfter(REVIEW_INTERVALS_DAYS[0], now);
var HINT_LEVELS = { none: 0, hint: 1, firstStep: 2, solution: 3 };
function scheduleAfterAttempt(current, result, sawSolution, now, hintLevel = 0) {
  const stage = Math.min(Math.max(current.reviewStage, 0), REVIEW_INTERVALS_DAYS.length - 1);
  const helped = sawSolution || hintLevel >= HINT_LEVELS.firstStep;
  const effective = result === "solved" && helped ? "partial" : result;
  if (effective === "failed") return { reviewStage: 0, status: "unsolved", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[0], now) };
  if (effective === "partial") return { reviewStage: stage, status: "learning", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[stage], now) };
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS_DAYS.length) return { reviewStage: REVIEW_INTERVALS_DAYS.length, status: "mastered", nextReviewAt: null };
  return { reviewStage: next, status: "learning", nextReviewAt: reviewDateAfter(REVIEW_INTERVALS_DAYS[next], now) };
}
var reviewTaskMinutes = (questionCount) => Math.min(60, Math.max(10, questionCount * 5));
var MAX_QUESTIONS_PER_REVIEW = 8;
var isErrorType = (value) => value !== null && value in ERROR_TYPES;
function buildErrorMap(rows) {
  const topics = /* @__PURE__ */ new Map();
  const errorTypes = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const subject2 = row.subject ?? "Genel";
    const key = row.topicId !== null ? `t${row.topicId}` : `s${subject2}`;
    const entry = topics.get(key) ?? { subject: subject2, topic: row.topicId !== null ? row.topic : null, topicId: row.topicId, count: 0, open: 0, errors: /* @__PURE__ */ new Map() };
    entry.count += 1;
    if (row.status !== "mastered") entry.open += 1;
    if (isErrorType(row.errorType)) {
      entry.errors.set(row.errorType, (entry.errors.get(row.errorType) ?? 0) + 1);
      errorTypes.set(row.errorType, (errorTypes.get(row.errorType) ?? 0) + 1);
    }
    topics.set(key, entry);
  }
  return {
    total: rows.length,
    open: rows.filter((row) => row.status !== "mastered").length,
    topics: Array.from(topics.entries()).map(([key, entry]) => ({ key, subject: entry.subject, topic: entry.topic, topicId: entry.topicId, count: entry.count, open: entry.open, topErrorType: Array.from(entry.errors.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null })).sort((a, b) => b.open - a.open || b.count - a.count),
    errorTypes: Array.from(errorTypes.entries()).map(([type, count4]) => ({ type, count: count4 })).sort((a, b) => b.count - a.count)
  };
}
function describeErrorMapForPlan(map, limit = 5) {
  const focus = map.topics.filter((item) => item.open > 0).slice(0, limit);
  if (!focus.length) return null;
  return focus.map((item) => `${item.subject}${item.topic ? ` / ${item.topic}` : ""}: ${item.open} \xE7\xF6z\xFClemeyen soru${item.topErrorType ? ` (en s\u0131k i\u015Faretlenen hata t\xFCr\xFC: ${ERROR_TYPES[item.topErrorType].label})` : ""}`).join("\n");
}
var paragraph = (text4) => text4?.trim() ? { type: "paragraph", content: [{ type: "text", text: text4.trim() }] } : { type: "paragraph" };
var heading = (text4) => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: text4 }] });
function buildQuestionDoc(input) {
  const content = [];
  if (input.questionImageId) content.push({ type: "noteImage", attrs: { attachmentId: input.questionImageId, ...input.questionOcrText ? { ocrText: input.questionOcrText } : {} } });
  content.push(heading("\u2753 Tak\u0131ld\u0131\u011F\u0131m yer"));
  if (input.voiceAttachmentId) content.push({ type: "voiceClip", attrs: { attachmentId: input.voiceAttachmentId, duration: input.voiceDuration ?? 0 } });
  content.push(paragraph(input.stuckPoint));
  content.push(heading("\u{1F5E3}\uFE0F \xC7\xF6z\xFCm notum"));
  if (input.solutionImageId) content.push({ type: "noteImage", attrs: { attachmentId: input.solutionImageId } });
  content.push(paragraph(input.solutionText));
  return { type: "doc", content };
}
function questionTitle(subject2, topic, createdAt) {
  if (subject2 || topic) return `\u2753 ${[subject2, topic].filter(Boolean).join(" \xB7 ")}`.slice(0, 200);
  return `\u2753 Soru \xB7 ${createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
}
var clip = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
function parseAiSolution(raw) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const input = value;
  const steps = (Array.isArray(input.steps) ? input.steps : []).map((step) => step && typeof step === "object" ? { work: clip(step.work, 600), why: clip(step.why, 600) } : null).filter((step) => Boolean(step && (step.work || step.why))).slice(0, 12);
  if (!steps.length) return null;
  return { method: clip(input.method, 400), steps, answer: clip(input.answer, 400), check: clip(input.check, 600), hint: clip(input.hint, 400), ...typeof input.verified === "boolean" ? { verified: input.verified } : {} };
}
var OPTION_LETTERS = ["A", "B", "C", "D", "E"];
function parseSimilarQuestion(raw, optionCount = 5) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const input = value;
  const question = clip(input.question, 3e3);
  const options = (Array.isArray(input.options) ? input.options : []).slice(0, optionCount).map((option) => clip(option, 400).replace(/^[A-Ea-e][).:-]\s*/, ""));
  const answer = clip(input.answer, 5).toUpperCase().charAt(0);
  if (!question || options.length !== optionCount || options.some((option) => !option) || !OPTION_LETTERS.slice(0, optionCount).includes(answer)) return null;
  const steps = (Array.isArray(input.steps) ? input.steps : []).map((step) => step && typeof step === "object" ? { work: clip(step.work, 600), why: clip(step.why, 600) } : null).filter((step) => Boolean(step && (step.work || step.why))).slice(0, 10);
  return { question, options, answer, steps, hint: clip(input.hint, 400) };
}

// server/db.ts
var _db = null;
var DB_POOL_OPTIONS = {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 20,
  prepare: false
};
function createDb(url) {
  return drizzle({ client: postgres(url, DB_POOL_OPTIONS) });
}
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = createDb(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId,
      approvalStatus: "pending"
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
var defaultStudentProfileView = {
  onboardingCompleted: false,
  onboardingStep: 0,
  preferredName: null,
  avatarStyle: null,
  examTrack: "YKS",
  gradeLevel: null,
  examYear: null,
  targetScoreType: null,
  currentTytNet: null,
  currentAytNet: null,
  currentNet: null,
  mockExamFrequency: null,
  selectedSubjects: [],
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: null,
  targetUniversity: null,
  targetDepartment: null,
  targetRanking: null,
  targetGoal: null,
  targetScore: null,
  mainGoal: null,
  shortTermGoal: null,
  longTermGoal: null,
  dailyStudyDuration: null,
  preferredStudyStartTime: null,
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: null,
  coachingExpectations: [],
  notificationPreference: null,
  coachingStyle: null,
  additionalNotes: null,
  updatedAt: null
};
var toStudentProfileView = (row) => ({
  onboardingCompleted: row.onboardingCompleted === 1,
  onboardingStep: row.onboardingStep,
  preferredName: row.preferredName,
  avatarStyle: row.avatarStyle,
  examTrack: row.examTrack,
  gradeLevel: row.gradeLevel,
  examYear: row.examYear,
  targetScoreType: row.targetScoreType,
  currentTytNet: row.currentTytNet,
  currentAytNet: row.currentAytNet,
  currentNet: row.currentNet,
  mockExamFrequency: row.mockExamFrequency,
  selectedSubjects: parseJsonArray(row.selectedSubjectsJson),
  strongSubjects: parseJsonArray(row.strongSubjectsJson),
  weakSubjects: parseJsonArray(row.weakSubjectsJson),
  hasPriorStudyPlan: row.hasPriorStudyPlan === null ? null : row.hasPriorStudyPlan === 1,
  targetUniversity: row.targetUniversity,
  targetDepartment: row.targetDepartment,
  targetRanking: row.targetRanking,
  targetGoal: row.targetGoal,
  targetScore: row.targetScore,
  mainGoal: row.mainGoal,
  shortTermGoal: row.shortTermGoal,
  longTermGoal: row.longTermGoal,
  dailyStudyDuration: row.dailyStudyDuration,
  preferredStudyStartTime: row.preferredStudyStartTime,
  availableStudyDays: parseJsonArray(row.availableStudyDaysJson),
  preferredStudyTimes: parseJsonArray(row.preferredStudyTimesJson),
  preferredStudyMethods: parseJsonArray(row.preferredStudyMethodsJson),
  studyObstacles: row.studyObstacles,
  coachingExpectations: parseJsonArray(row.coachingExpectationsJson),
  notificationPreference: row.notificationPreference,
  coachingStyle: row.coachingStyle,
  additionalNotes: row.additionalNotes,
  updatedAt: row.updatedAt
});
async function getStudentProfile(userId) {
  const db = await getDb();
  if (!db) return defaultStudentProfileView;
  const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return rows[0] ? toStudentProfileView(rows[0]) : defaultStudentProfileView;
}
var patchToRowValues = (patch) => {
  const values = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === void 0) continue;
    if (key === "selectedSubjects") values.selectedSubjectsJson = JSON.stringify(value);
    else if (key === "strongSubjects") values.strongSubjectsJson = JSON.stringify(value);
    else if (key === "weakSubjects") values.weakSubjectsJson = JSON.stringify(value);
    else if (key === "availableStudyDays") values.availableStudyDaysJson = JSON.stringify(value);
    else if (key === "preferredStudyTimes") values.preferredStudyTimesJson = JSON.stringify(value);
    else if (key === "preferredStudyMethods") values.preferredStudyMethodsJson = JSON.stringify(value);
    else if (key === "coachingExpectations") values.coachingExpectationsJson = JSON.stringify(value);
    else if (key === "hasPriorStudyPlan") values.hasPriorStudyPlan = value === null ? null : value ? 1 : 0;
    else values[key] = value;
  }
  return values;
};
async function upsertStudentProfileStep(userId, step, patch) {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingStep: step };
  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const rowValues = patchToRowValues(patch);
  const nextStep = Math.max(step + 1, existing[0]?.onboardingStep ?? 0);
  if (existing[0]) {
    await db.update(studentProfiles).set({ ...rowValues, onboardingStep: nextStep }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingStep: nextStep, ...rowValues });
  }
  return getStudentProfile(userId);
}
async function setStudentAvatarStyle(userId, avatarStyle) {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, avatarStyle };
  const existing = await db.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (existing[0]) await db.update(studentProfiles).set({ avatarStyle }).where(eq(studentProfiles.id, existing[0].id));
  else await db.insert(studentProfiles).values({ userId, avatarStyle });
  return getStudentProfile(userId);
}
async function completeOnboarding(userId) {
  const db = await getDb();
  if (!db) return { ...defaultStudentProfileView, onboardingCompleted: true };
  const existing = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(studentProfiles).set({ onboardingCompleted: 1 }).where(eq(studentProfiles.id, existing[0].id));
  } else {
    await db.insert(studentProfiles).values({ userId, onboardingCompleted: 1 });
  }
  return getStudentProfile(userId);
}
async function getBookInventory(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), isNull(bookInventory.removedAt))).orderBy(desc(bookInventory.addedAt));
}
async function addBookToInventory(userId, bookId) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(bookInventory).values({ userId, bookId }).returning({ id: bookInventory.id });
  return { id: Number(result[0].id), userId, bookId, addedAt: /* @__PURE__ */ new Date(), removedAt: null };
}
async function removeBookFromInventory(userId, bookId) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookInventory).set({ removedAt: /* @__PURE__ */ new Date() }).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt)));
}
async function getBookStudyLogs(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookStudyLogs).where(eq(bookStudyLogs.userId, userId)).orderBy(desc(bookStudyLogs.sessionDate));
}
async function addBookStudyLog(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(bookStudyLogs).values({ ...input, userId }).returning({ id: bookStudyLogs.id });
  return { id: Number(result[0].id), ...input, userId, createdAt: /* @__PURE__ */ new Date() };
}
async function getBookTopicMappings(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookTopicMappings).where(eq(bookTopicMappings.userId, userId)).orderBy(desc(bookTopicMappings.updatedAt));
}
async function upsertBookTopicMapping(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(bookTopicMappings).where(and(eq(bookTopicMappings.userId, userId), eq(bookTopicMappings.bookId, input.bookId), eq(bookTopicMappings.topic, input.topic))).limit(1);
  if (existing[0]) {
    await db.update(bookTopicMappings).set({ ...input, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookTopicMappings.id, existing[0].id));
    return { ...existing[0], ...input, updatedAt: /* @__PURE__ */ new Date() };
  }
  const result = await db.insert(bookTopicMappings).values({ ...input, userId }).returning({ id: bookTopicMappings.id });
  return { id: Number(result[0].id), ...input, userId, updatedAt: /* @__PURE__ */ new Date() };
}
async function getSourceSwitches(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceSwitches).where(eq(sourceSwitches.userId, userId)).orderBy(desc(sourceSwitches.switchedAt));
}
async function addSourceSwitch(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(sourceSwitches).values({ ...input, userId }).returning({ id: sourceSwitches.id });
  return { id: Number(result[0].id), ...input, userId };
}
var parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
var serializeUserMockExam = (row) => ({
  id: String(row.id),
  title: row.title,
  date: toLocalDateKey(row.examDate),
  exam: row.exam,
  net: Number(row.net),
  delta: Number(row.delta),
  subjects: parseJson(row.subjectsJson, {}),
  timeSpent: parseJson(row.timeSpentJson, {}),
  topicNets: parseJson(row.topicNetsJson, {}),
  topicDetails: parseJson(row.topicDetailsJson, []),
  importedFrom: row.importedFrom
});
async function getUserMockExams(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userMockExams).where(eq(userMockExams.userId, userId)).orderBy(desc(userMockExams.examDate));
  return rows.map(serializeUserMockExam);
}
async function addUserMockExams(userId, inputs) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userMockExams).values(inputs.map((input) => ({
    userId,
    title: input.title,
    exam: input.exam,
    examDate: input.examDate,
    net: input.net.toFixed(2),
    delta: input.delta.toFixed(2),
    subjectsJson: JSON.stringify(input.subjects),
    timeSpentJson: JSON.stringify(input.timeSpent),
    topicNetsJson: JSON.stringify(input.topicNets),
    topicDetailsJson: JSON.stringify(input.topicDetails),
    importedFrom: input.importedFrom,
    notes: input.notes ?? null
  })));
  return getUserMockExams(userId);
}
async function getUserResourceBooks(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userResourceBooks).where(eq(userResourceBooks.userId, userId)).orderBy(desc(userResourceBooks.createdAt));
  return rows.map((row) => ({ id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl || "", pageCount: row.pageCount ?? void 0, tone: row.tone, authors: row.authors ?? void 0, isbn: row.isbn ?? void 0 }));
}
async function addUserResourceBooks(userId, inputs) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  await db.insert(userResourceBooks).values(inputs.map((book) => ({ userId, bookId: book.id, title: book.title, publisher: book.publisher, subject: book.subject, exam: book.exam, level: book.level, format: book.format, reason: book.reason, sourceUrl: book.sourceUrl ?? null, pageCount: book.pageCount ?? null, tone: book.tone, authors: book.authors?.trim() || null, isbn: normalizeIsbn(book.isbn) })));
  return getUserResourceBooks(userId);
}
async function getStudyCalendar(userId) {
  const db = await getDb();
  if (!db) return { plans: [], sessions: [], logs: [] };
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const overdue = await db.select({ id: studyPlanSessions.id, sessionDate: studyPlanSessions.sessionDate }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), lt(studyPlanSessions.sessionDate, today)));
  const reschedules = rescheduleOverdueSessions(overdue, today, tomorrow, /* @__PURE__ */ new Date());
  for (const instruction of reschedules) {
    await db.update(studyPlanSessions).set({ sessionDate: instruction.sessionDate, rescheduledFrom: instruction.rescheduledFrom, rescheduledAt: instruction.rescheduledAt, abandonedAt: null, rescheduleCount: sql2`${studyPlanSessions.rescheduleCount} + 1` }).where(eq(studyPlanSessions.id, instruction.id));
  }
  const [plans, sessions, logs] = await Promise.all([
    db.select().from(studyPlans).where(eq(studyPlans.userId, userId)).orderBy(desc(studyPlans.weekStart)),
    db.select().from(studyPlanSessions).where(eq(studyPlanSessions.userId, userId)).orderBy(studyPlanSessions.sessionDate),
    db.select().from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)).orderBy(desc(topicStudyLogs.studyDate))
  ]);
  return { plans, sessions, logs };
}
async function saveStudyPlan(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  if (input.replacePrevious) {
    const previous = await db.select({ id: studyPlans.id }).from(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.title, input.title)));
    if (previous.length) await db.delete(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), inArray(studyPlanSessions.planId, previous.map((plan) => plan.id))));
  }
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: input.weekStart, weekEnd: input.weekEnd, summary: input.summary, source: input.source ?? "ai" }).returning({ id: studyPlans.id });
  const planId = Number(planResult[0].id);
  if (input.sessions.length) await db.insert(studyPlanSessions).values(input.sessions.map((session) => ({ ...session, userId, planId, targetPages: session.targetPages ?? null, targetTests: session.targetTests ?? null })));
  return getStudyCalendar(userId);
}
async function fallbackExamFor(userId) {
  return defaultKindOf((await getStudentProfile(userId)).examTrack);
}
function topicLogRow(userId, log) {
  return { userId, sessionId: log.sessionId, subject: log.subject, topic: log.topic, studyDate: log.studyDate, minutes: log.actualMinutes, questions: log.actualQuestions, correct: log.correct, wrong: log.wrong, blank: log.blank, note: log.note ?? null };
}
async function completeStudySession(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.id, input.sessionId), eq(studyPlanSessions.userId, userId))).limit(1);
  if (!existing[0]) throw new Error("\xC7al\u0131\u015Fma oturumu bulunamad\u0131");
  const completedAt = /* @__PURE__ */ new Date();
  const { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note } = input;
  const plan = buildSessionCompletion(existing[0], { actualMinutes, actualQuestions, correct, wrong, blank, actualPages, note }, completedAt);
  await db.update(studyPlanSessions).set({ ...plan.sessionUpdate, actualPages: plan.sessionUpdate.actualPages ?? null, note: plan.sessionUpdate.note ?? null }).where(eq(studyPlanSessions.id, input.sessionId));
  await db.insert(topicStudyLogs).values(topicLogRow(userId, plan.topicLog));
  if (existing[0].sourceBookId) {
    const pages2 = existing[0].targetPages?.match(/(\d+)\s*[-–]\s*(\d+)/);
    const tests = existing[0].targetTests?.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
    await db.insert(bookStudyLogs).values({
      userId,
      bookId: existing[0].sourceBookId,
      topic: existing[0].topic,
      sessionDate: completedAt,
      minutes: actualMinutes,
      questions: actualQuestions,
      correct,
      wrong,
      blank,
      pageStart: pages2 ? Number(pages2[1]) : null,
      pageEnd: pages2 ? Number(pages2[2]) : null,
      testStart: tests ? Number(tests[1]) : null,
      testEnd: tests ? Number(tests[2] ?? tests[1]) : null
    });
  }
  if (actualQuestions > 0 && existing[0].kind !== NOTEBOOK_REVIEW_TASK_KIND) {
    await upsertTopicProgress(userId, { exam: await fallbackExamFor(userId), subject: plan.topicLog.subject, topic: plan.topicLog.topic, accuracy: correct / actualQuestions * 100, questionCount: actualQuestions, studyDate: completedAt });
  }
  return getStudyCalendar(userId);
}
async function logCompletedRoutineSession(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const sessionDate = /* @__PURE__ */ new Date();
  const dayStart = new Date(sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const planResult = await db.insert(studyPlans).values({ userId, title: input.title, weekStart: dayStart, weekEnd: dayEnd, summary: input.title, source: "manual" }).returning({ id: studyPlans.id });
  const planId = Number(planResult[0].id);
  const completedAt = /* @__PURE__ */ new Date();
  const sessionValues = {
    userId,
    planId,
    sessionDate,
    title: input.title,
    subject: input.subject,
    topic: input.topic,
    kind: input.kind,
    plannedMinutes: input.plannedMinutes,
    status: "completed",
    completedAt,
    actualMinutes: input.actualMinutes,
    actualQuestions: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
    actualPages: input.actualPages ?? null,
    note: input.note ?? null
  };
  const sessionResult = await db.insert(studyPlanSessions).values(sessionValues).returning({ id: studyPlanSessions.id });
  const sessionId = Number(sessionResult[0].id);
  await db.insert(topicStudyLogs).values({ userId, sessionId, subject: input.subject, topic: input.topic, studyDate: completedAt, minutes: input.actualMinutes, questions: 0, correct: 0, wrong: 0, blank: 0, note: input.note ?? null });
  return getStudyCalendar(userId);
}
async function addTopicStudyLog(userId, input) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(topicStudyLogs).values({ ...input, userId }).returning({ id: topicStudyLogs.id });
  const questionCount = input.questions ?? 0;
  if (questionCount > 0) {
    await upsertTopicProgress(userId, { exam: await fallbackExamFor(userId), subject: input.subject, topic: input.topic, accuracy: (input.correct ?? 0) / questionCount * 100, questionCount, studyDate: input.studyDate });
  }
  return { id: Number(result[0].id), ...input, userId, createdAt: /* @__PURE__ */ new Date() };
}
async function getPlanAdherenceInputs(userId, periodStart, periodEnd) {
  const db = await getDb();
  if (!db) return { sessions: [], averageAccuracy: 0 };
  const sessions = await db.select().from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), gte(studyPlanSessions.sessionDate, periodStart), lt(studyPlanSessions.sessionDate, periodEnd)));
  const logs = await db.select().from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), gte(topicStudyLogs.studyDate, periodStart), lt(topicStudyLogs.studyDate, periodEnd)));
  const questions = logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = logs.reduce((sum, log) => sum + log.correct, 0);
  return { sessions, averageAccuracy: questions ? Math.round(correct / questions * 100) : 0 };
}
async function savePlanAdherence(userId, periodStart, periodEnd) {
  const db = await getDb();
  if (!db) return void 0;
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const result = calculatePlanAdherence(sessions, averageAccuracy);
  const inserted = await db.insert(planAdherenceReports).values({ userId, periodType: "week", periodStart, periodEnd, overallScore: result.overallScore, sessionScore: result.sessionScore, timeScore: result.timeScore, questionScore: result.questionScore, punctualityScore: result.punctualityScore, plannedSessions: result.plannedSessions, completedSessions: result.completedSessions, plannedMinutes: result.plannedMinutes, actualMinutes: result.actualMinutes, targetQuestions: result.targetQuestions, actualQuestions: result.actualQuestions, rescheduledSessions: result.rescheduledSessions, summary: result.summary, decision: result.decision, snapshotJson: JSON.stringify({ averageAccuracy, alerts: result.alerts }) }).returning({ id: planAdherenceReports.id });
  const reportId = Number(inserted[0].id);
  const existingAlerts = await db.select({ ruleKey: coachAlerts.ruleKey }).from(coachAlerts).where(eq(coachAlerts.userId, userId));
  const newAlerts = dedupeAlerts(result.alerts, existingAlerts.map((alert) => alert.ruleKey));
  if (newAlerts.length) await db.insert(coachAlerts).values(newAlerts.map((alert) => ({ userId, reportId, level: alert.level, ruleKey: alert.ruleKey, title: alert.title, message: alert.message, actionLabel: alert.actionLabel, actionJson: JSON.stringify({ decision: result.decision }) })));
  return { ...result, averageAccuracy, reportId };
}
async function getCoachAlerts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachAlerts).where(and(eq(coachAlerts.userId, userId), eq(coachAlerts.isRead, 0))).orderBy(desc(coachAlerts.createdAt)).limit(10);
}
async function markCoachAlertRead(userId, alertId) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachAlerts).set({ isRead: 1 }).where(and(eq(coachAlerts.id, alertId), eq(coachAlerts.userId, userId)));
}
var statusToDb = { Zay\u0131f: "weak", Orta: "medium", \u0130yi: "good" };
var statusFromDb = { weak: "Zay\u0131f", medium: "Orta", good: "\u0130yi" };
var slugify = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var topicCatalogSeeded = false;
async function ensureTopicCatalogSeeded() {
  if (topicCatalogSeeded) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: yksTopics.id }).from(yksTopics).limit(1);
  if (existing.length === 0 && topicSeeds.length > 0) {
    await db.insert(yksTopics).values(topicSeeds.map((seed) => ({ slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit }))).onConflictDoNothing({ target: yksTopics.slug });
  }
  await ensureCurriculumSeeded(db);
  topicCatalogSeeded = true;
}
async function ensureCurriculumSeeded(db) {
  const present = new Set((await db.select({ slug: yksTopics.slug }).from(yksTopics)).map((row) => row.slug));
  const missing = CURRICULUM.filter((def) => !present.has(def.slug));
  if (missing.length === 0) return;
  await db.insert(yksTopics).values(missing.map((def) => ({ slug: def.slug, exam: def.exam, subject: def.subject, topic: def.topic, unit: def.unit }))).onConflictDoNothing({ target: yksTopics.slug });
}
async function findOrCreateTopic(db, exam, subject2, topic) {
  const existing = await db.select().from(yksTopics).where(and(eq(yksTopics.subject, subject2), eq(yksTopics.topic, topic))).orderBy(sql2`${yksTopics.exam} = ${exam} DESC`, yksTopics.id).limit(1);
  if (existing[0]) return existing[0];
  const renamed = await db.select().from(yksTopics).where(and(eq(yksTopics.subject, subject2), sql2`${yksTopics.previousNames} LIKE ${`%${JSON.stringify(topic)}%`}`)).orderBy(sql2`${yksTopics.exam} = ${exam} DESC`, yksTopics.id).limit(1);
  if (renamed[0]) return renamed[0];
  const slug = `${exam}-${slugify(subject2)}-${slugify(topic)}` || `topic-${Date.now()}`;
  const result = await db.insert(yksTopics).values({ slug, exam, subject: subject2, topic, unit: subject2 }).onConflictDoUpdate({ target: yksTopics.slug, set: { subject: subject2 } }).returning({ id: yksTopics.id });
  const inserted = await db.select().from(yksTopics).where(eq(yksTopics.slug, slug)).limit(1);
  return inserted[0] ?? { id: Number(result[0].id), slug, exam, subject: subject2, topic, unit: subject2, sourceUrl: null, createdAt: /* @__PURE__ */ new Date() };
}
async function getTopicCatalog(options = {}) {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return topicSeeds.map((seed, index2) => ({ id: -1 - index2, slug: seed.id, exam: seed.exam, subject: seed.subject, topic: seed.topic, unit: seed.unit, sourceUrl: null, hidden: 0, previousNames: "[]", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }));
  return options.includeHidden ? db.select().from(yksTopics) : db.select().from(yksTopics).where(eq(yksTopics.hidden, 0));
}
async function getLiveCurriculum() {
  const catalog = await getTopicCatalog();
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  const rows = [];
  for (const def of CURRICULUM) {
    const row = bySlug.get(def.slug);
    if (row) rows.push({ exam: row.exam, subject: row.subject, unit: row.unit, topic: row.topic });
  }
  for (const added of catalog.filter((row) => isAdminTopicSlug(row.slug)).sort((a, b) => a.id - b.id)) {
    const entry = { exam: added.exam, subject: added.subject, unit: added.unit, topic: added.topic };
    const sameUnit = rows.map((row, index2) => ({ row, index: index2 })).filter(({ row }) => row.exam === added.exam && row.subject === added.subject && row.unit === added.unit).pop();
    const sameSubject = rows.map((row, index2) => ({ row, index: index2 })).filter(({ row }) => row.exam === added.exam && row.subject === added.subject).pop();
    const at = (sameUnit ?? sameSubject)?.index;
    if (at === void 0) rows.push(entry);
    else rows.splice(at + 1, 0, entry);
  }
  return rows;
}
async function getUserTopicProgress(userId) {
  const catalog = await getTopicCatalog({ includeHidden: true });
  const db = await getDb();
  if (!db) return catalog.map((topic) => ({ ...topic, progress: 0, status: "Zay\u0131f", insufficientData: true, lastReviewedAt: null }));
  const rows = await db.select().from(topicProgress).where(eq(topicProgress.userId, userId));
  const byTopicId = new Map(rows.map((row) => [row.topicId, row]));
  const visible = catalog.filter((topic) => !topic.hidden || byTopicId.has(topic.id));
  return visible.filter((topic) => !isCurriculumOnlySlug(topic.slug) || byTopicId.has(topic.id)).map((topic) => {
    const row = byTopicId.get(topic.id);
    if (!row) return { ...topic, progress: 0, status: "Zay\u0131f", insufficientData: true, lastReviewedAt: null };
    return { ...topic, progress: row.progress, status: statusFromDb[row.status], insufficientData: false, lastReviewedAt: row.lastReviewedAt };
  });
}
async function upsertTopicProgress(userId, input) {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return void 0;
  const topicRow = await findOrCreateTopic(db, input.exam, input.subject, input.topic);
  const { status, insufficientData } = deriveTopicStatus(input.accuracy, input.questionCount);
  const existing = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicRow.id))).limit(1);
  const dbStatus = statusToDb[status];
  if (existing[0]) {
    await db.update(topicProgress).set({ progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(topicProgress.id, existing[0].id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: topicRow.id, progress: Math.round(input.accuracy), status: dbStatus, lastReviewedAt: input.studyDate });
  }
  return { slug: topicRow.slug, exam: topicRow.exam, subject: topicRow.subject, topic: topicRow.topic, unit: topicRow.unit, progress: Math.round(input.accuracy), status, insufficientData, lastReviewedAt: input.studyDate };
}
async function markTopicForReview(userId, input) {
  await ensureTopicCatalogSeeded();
  const db = await getDb();
  if (!db) return void 0;
  if (input.sessionId) await db.update(studyPlanSessions).set({ abandonedAt: /* @__PURE__ */ new Date() }).where(and(eq(studyPlanSessions.id, input.sessionId), eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned")));
  const topicRow = await findOrCreateTopic(db, input.exam, input.subject, input.topic);
  const [existing] = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicRow.id))).limit(1);
  const status = statusAfterAbandonedSession(existing ? statusFromDb[existing.status] : null);
  if (!existing) await db.insert(topicProgress).values({ userId, topicId: topicRow.id, progress: 0, status: statusToDb[status] });
  else if (statusToDb[status] !== existing.status) await db.update(topicProgress).set({ status: statusToDb[status], updatedAt: /* @__PURE__ */ new Date() }).where(eq(topicProgress.id, existing.id));
  return { slug: topicRow.slug, status };
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    // Uygulama ve API aynı kökende (ör. yks-study-coach.vercel.app) çalışır;
    // çerezin başka sitelerden gelen isteklere eklenmesine gerek yok. `Lax`
    // CSRF'e karşı da koruma sağlar ve http'de (yerel geliştirme) de kabul edilir.
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/emailVerification.ts
import { eq as eq2 } from "drizzle-orm";
import { SignJWT as SignJWT2, errors as joseErrors, jwtVerify as jwtVerify2 } from "jose";

// server/_core/emails/verifyEmail.ts
var escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function buildVerifyEmail({ to, name: name2, verifyUrl, expiresInMinutes }) {
  const greeting = name2 ? `Merhaba ${name2},` : "Merhaba,";
  const subject2 = "Pusula YKS hesab\u0131n\u0131 do\u011Frula";
  const text4 = [
    greeting,
    "",
    "Pusula YKS'ye ho\u015F geldin! Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini do\u011Frulaman gerekiyor.",
    "",
    `E-postam\u0131 do\u011Frula: ${verifyUrl}`,
    "",
    `Bu ba\u011Flant\u0131 ${expiresInMinutes} dakika ge\xE7erlidir. S\xFCresi dolarsa uygulamadan yeni bir do\u011Frulama maili isteyebilirsin.`,
    "",
    "Bu hesab\u0131 sen olu\u015Fturmad\u0131ysan bu maili g\xF6rmezden gelebilirsin; adresin onays\u0131z bir hesaba ba\u011Flanmaz.",
    "",
    "\u2014 Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u"
  ].join("\n");
  const safeUrl = escapeHtml(verifyUrl);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject2)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2333;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini do\u011Frula.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#1f2333;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#1f2333;">Pusula YKS</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;border:1px solid #ebe8df;">
        <h1 style="margin:0 0 12px 0;font-size:21px;line-height:1.3;font-weight:700;color:#1f2333;">Hesab\u0131n\u0131 do\u011Frula</h1>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#4a4c57;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#4a4c57;">Pusula YKS'ye ho\u015F geldin! Hesab\u0131n\u0131 kullanmaya ba\u015Flamak i\xE7in e-posta adresini (<strong style="color:#1f2333;">${escapeHtml(to)}</strong>) do\u011Frulaman gerekiyor.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
          <a href="${safeUrl}" style="display:inline-block;background:#3b5ccc;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">E-postam\u0131 Do\u011Frula</a>
        </td></tr></table>
        <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Bu ba\u011Flant\u0131 <strong>${expiresInMinutes} dakika</strong> ge\xE7erlidir. S\xFCresi dolarsa uygulamadan yeni bir do\u011Frulama maili isteyebilirsin.</p>
        <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#8b8c95;">Buton \xE7al\u0131\u015Fmazsa bu adresi taray\u0131c\u0131na yap\u0131\u015Ft\u0131r:<br><a href="${safeUrl}" style="color:#3b5ccc;word-break:break-all;">${safeUrl}</a></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
          <td style="background:#f7f5ef;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.6;color:#6b6d77;">\u{1F512} Bu hesab\u0131 sen olu\u015Fturmad\u0131ysan bu maili g\xF6rmezden gelebilirsin; adresin onays\u0131z bir hesaba ba\u011Flanmaz. Pusula YKS senden asla \u015Fifreni e-postayla istemez.</td>
        </tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#9a9ba3;">Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u<br>Bu mail, hesab\u0131n olu\u015Fturuldu\u011Fu i\xE7in otomatik g\xF6nderildi.</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return { to, subject: subject2, html, text: text4 };
}

// server/_core/env.ts
var ENV = {
  // Oturum çerezlerini imzalar (server/_core/session.ts) — production'da uzun, rastgele olmalı.
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Virgülle ayrılmış e-posta/telefon listesi (ör. "ben@ornek.com,05551234567").
  // Bu tanımlayıcılarla kayıt olan/giriş yapan hesap (e-postası doğrulanınca)
  // otomatik admin + onaylı olur (bkz. server/_core/localAuth.ts).
  adminLogins: (process.env.ADMIN_LOGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  // E-posta doğrulaması (bkz. server/_core/mailer.ts, emailVerification.ts).
  // APP_URL: doğrulama linklerinin kök adresi (ör. https://yks-study-coach.vercel.app).
  // Production'da set edilmeli — yoksa istekteki Host başlığına düşülür.
  appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, ""),
  // Mail sağlayıcısı: hangi anahtar tanımlıysa o kullanılır (ikisi birden varsa Brevo).
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
  // Yapay zekâ (kitap/deneme fotoğrafı okuma, AI plan, not AI, ses → metin):
  // OpenAI uyumlu herhangi bir sağlayıcı (bkz. server/_core/llm.ts).
  //   LLM_API_KEY (ya da OPENAI_API_KEY) — zorunlu
  //   LLM_API_URL — varsayılan https://api.openai.com/v1
  //     (Gemini: https://generativelanguage.googleapis.com/v1beta/openai)
  //   LLM_MODEL — görsel okuyabilen bir model; varsayılan gpt-4o-mini
  //   TRANSCRIBE_MODEL — ses → metin modeli; varsayılan whisper-1 (Gemini'de yok)
  //   GEMINI_API_KEY — tanımlıysa LLM_API_KEY yerine kullanılır (Google AI Studio anahtarı)
  llmApiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmApiUrl: (process.env.LLM_API_URL ?? "").replace(/\/+$/, ""),
  llmModel: process.env.LLM_MODEL ?? "",
  //   LLM_MODEL_LIGHT / LLM_MODEL_STRONG — soru çözümünde kolay / zor sorular için (boşsa LLM_MODEL)
  llmModelLight: process.env.LLM_MODEL_LIGHT ?? "",
  llmModelStrong: process.env.LLM_MODEL_STRONG ?? "",
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? "",
  // --- Subscription / Payment (PHASE 2) — bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md ---
  // "mock" (sandbox, varsayılan) | "apple" | "google" | gerçek bir web sağlayıcısı seçildiğinde onun adı.
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  paymentMockWebhookSecret: process.env.PAYMENT_MOCK_WEBHOOK_SECRET ?? "",
  appleIapKeyId: process.env.APPLE_IAP_KEY_ID ?? "",
  appleIapIssuerId: process.env.APPLE_IAP_ISSUER_ID ?? "",
  appleIapPrivateKey: process.env.APPLE_IAP_PRIVATE_KEY ?? "",
  appleIapBundleId: process.env.APPLE_IAP_BUNDLE_ID ?? "",
  googlePlayServiceAccountJson: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? "",
  googlePlayPackageName: process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "",
  webhookIngestSecret: process.env.WEBHOOK_INGEST_SECRET ?? "",
  // Medya (defter ve Duvarım fotoğraf/ses dosyaları) — Supabase Storage (bkz. server/storage/supabaseStorage.ts).
  //   SUPABASE_URL — https://<proje>.supabase.co
  //   SUPABASE_SERVICE_ROLE_KEY — yalnızca sunucuda; tarayıcıya asla gönderilmez
  //   SUPABASE_MEDIA_BUCKET — özel (public olmayan) bucket adı; varsayılan "pusula-media"
  // İkisi de boşsa dosyalar eskisi gibi veritabanında tutulur (yerel geliştirme/test).
  supabaseUrl: (process.env.SUPABASE_URL ?? "").replace(/\/+$/, ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseMediaBucket: process.env.SUPABASE_MEDIA_BUCKET || "pusula-media"
};

// server/_core/loginIdentifier.ts
import { createHash } from "node:crypto";
var DEV_OPEN_ID_PREFIX = "dev_local_";
var DEV_EMAIL_OPEN_ID_PREFIX = "dev_email_";
var DEV_PHONE_OPEN_ID_PREFIX = "dev_phone_";
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}
var slugifyName = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function parseIdentifier(raw) {
  const trimmed = raw.trim().slice(0, 320);
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return null;
    const hash = createHash("sha256").update(email).digest("hex").slice(0, 40);
    return { kind: "email", value: email, openId: `${DEV_EMAIL_OPEN_ID_PREFIX}${hash}` };
  }
  if (/^[\d\s()+-]+$/.test(trimmed)) {
    const phone = normalizePhone(trimmed);
    if (!phone) return null;
    return { kind: "phone", value: phone, openId: `${DEV_PHONE_OPEN_ID_PREFIX}${phone}` };
  }
  const name2 = trimmed.slice(0, 120);
  return { kind: "legacyName", value: name2, openId: `${DEV_OPEN_ID_PREFIX}${slugifyName(name2) || "ogrenci"}` };
}
function phoneFromOpenId(openId) {
  return openId.startsWith(DEV_PHONE_OPEN_ID_PREFIX) ? `+${openId.slice(DEV_PHONE_OPEN_ID_PREFIX.length)}` : null;
}
function isAdminLogin(openId, adminLogins = ENV.adminLogins) {
  return adminLogins.some((login) => {
    const parsed = parseIdentifier(login);
    return parsed !== null && parsed.kind !== "legacyName" && parsed.openId === openId;
  });
}

// server/_core/mailer.ts
var MailNotConfiguredError = class extends Error {
  constructor(detail = "") {
    super(`MAIL_NOT_CONFIGURED${detail ? `: ${detail}` : ""}`);
    this.name = "MailNotConfiguredError";
  }
};
function parseMailFrom(value) {
  const trimmed = value.trim();
  const withName = trimmed.match(/^(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  if (withName) return { ...withName[1].trim() ? { name: withName[1].trim().replace(/^"|"$/g, "") } : {}, email: withName[2] };
  return /^[^\s@<>]+@[^\s@<>]+$/.test(trimmed) ? { email: trimmed } : null;
}
async function assertOk(provider, response) {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(`${provider} send failed (${response.status}): ${detail.slice(0, 300)}`);
}
async function sendWithBrevo(mail) {
  const sender = parseMailFrom(ENV.mailFrom);
  if (!sender) throw new MailNotConfiguredError("MAIL_FROM must be Brevo's verified sender, e.g. Pusula YKS <ben@gmail.com>");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": ENV.brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: mail.to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text })
  });
  await assertOk("Brevo", response);
}
async function sendWithResend(mail) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.mailFrom || "Pusula YKS <onboarding@resend.dev>", to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text })
  });
  await assertOk("Resend", response);
}
async function sendMail(mail) {
  if (ENV.brevoApiKey) return sendWithBrevo(mail);
  if (ENV.resendApiKey) return sendWithResend(mail);
  if (ENV.isProduction) throw new MailNotConfiguredError("set BREVO_API_KEY or RESEND_API_KEY");
  console.info(`[Mail:dev] To: ${mail.to}
Subject: ${mail.subject}

${mail.text}`);
}

// server/_core/rateLimit.ts
var buckets = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of Array.from(buckets)) {
    if (now - bucket.windowStartedAt > 10 * 60 * 1e3) buckets.delete(key);
  }
}, 5 * 60 * 1e3).unref?.();
var RateLimitExceededError = class extends Error {
  constructor(retryAfterMs) {
    super("RATE_LIMITED");
    this.retryAfterMs = retryAfterMs;
    this.name = "RateLimitExceededError";
  }
};
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  if (bucket.count >= maxRequests) {
    throw new RateLimitExceededError(windowMs - (now - bucket.windowStartedAt));
  }
  bucket.count += 1;
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/session.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var SESSION_ISSUER_TAG = "pusula";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var secretKey = () => new TextEncoder().encode(ENV.cookieSecret);
async function createSessionToken(openId, options = {}) {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  return new SignJWT({ openId, appId: SESSION_ISSUER_TAG, name: options.name || "" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1e3)).sign(secretKey());
}
async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { openId, name: name2 } = payload;
    if (!isNonEmptyString(openId) || !isNonEmptyString(name2)) return null;
    return { openId, name: name2 };
  } catch {
    return null;
  }
}
function readSessionToken(req) {
  const fromCookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie)[COOKIE_NAME] : void 0;
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : void 0;
}
async function authenticateRequest(req) {
  const session = await verifySession(readSessionToken(req));
  if (!session) throw ForbiddenError("Invalid session cookie");
  const user = await getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");
  await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
  return user;
}

// server/_core/emailVerification.ts
var TOKEN_AUDIENCE = "email-verify";
var TOKEN_PURPOSE = "email_verify";
var RESEND_HOURLY_MAX = 5;
var secretKey2 = () => new TextEncoder().encode(ENV.cookieSecret);
async function createVerificationToken(user, ttlMs = EMAIL_VERIFICATION_TOKEN_TTL_MS) {
  return new SignJWT2({ purpose: TOKEN_PURPOSE, uid: user.id, email: user.email }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setAudience(TOKEN_AUDIENCE).setIssuedAt().setExpirationTime(Math.floor((Date.now() + ttlMs) / 1e3)).sign(secretKey2());
}
async function readVerificationToken(token) {
  try {
    const { payload } = await jwtVerify2(token, secretKey2(), { algorithms: ["HS256"], audience: TOKEN_AUDIENCE });
    if (payload.purpose !== TOKEN_PURPOSE || typeof payload.uid !== "number" || typeof payload.email !== "string") return { status: "invalid" };
    return { status: "valid", userId: payload.uid, email: payload.email };
  } catch (error) {
    return { status: error instanceof joseErrors.JWTExpired ? "expired" : "invalid" };
  }
}
async function verifyEmailToken(token) {
  const check2 = await readVerificationToken(token);
  if (check2.status !== "valid") return check2.status;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select().from(users).where(eq2(users.id, check2.userId)).limit(1);
  if (!user || user.loginMethod !== "dev_email" || user.email !== check2.email) return "invalid";
  if (user.emailVerifiedAt) return "already";
  const grantAdmin = isAdminLogin(user.openId);
  await db.update(users).set({ emailVerifiedAt: /* @__PURE__ */ new Date(), ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: user.approvedAt ?? /* @__PURE__ */ new Date() } : {} }).where(eq2(users.id, user.id));
  return "success";
}
function appBaseUrl(req) {
  if (ENV.appUrl) return ENV.appUrl;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim() || req.protocol;
  return `${proto}://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
}
async function sendVerificationEmail(user, req) {
  if (user.loginMethod !== "dev_email" || !user.email) return { status: "not_required" };
  if (user.emailVerifiedAt) return { status: "already_verified" };
  const sinceLast = user.emailVerificationSentAt ? Date.now() - new Date(user.emailVerificationSentAt).getTime() : Infinity;
  if (sinceLast < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) return { status: "cooldown", retryAfterMs: EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - sinceLast };
  try {
    checkRateLimit(`email-verify:${user.id}`, RESEND_HOURLY_MAX, 60 * 60 * 1e3);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { status: "cooldown", retryAfterMs: error.retryAfterMs };
    throw error;
  }
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ emailVerificationSentAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
  try {
    const token = await createVerificationToken(user);
    const verifyUrl = `${appBaseUrl(req)}/api/email/verify?token=${encodeURIComponent(token)}`;
    await sendMail(buildVerifyEmail({ to: user.email, name: user.name, verifyUrl, expiresInMinutes: Math.round(EMAIL_VERIFICATION_TOKEN_TTL_MS / 6e4) }));
  } catch (error) {
    await db.update(users).set({ emailVerificationSentAt: user.emailVerificationSentAt }).where(eq2(users.id, user.id));
    throw error;
  }
  return { status: "sent" };
}
function registerEmailVerificationRoutes(app2) {
  app2.get("/api/email/verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    let outcome;
    try {
      outcome = token ? await verifyEmailToken(token) : "invalid";
    } catch (error) {
      console.error("[EmailVerification] verify failed:", error instanceof Error ? error.message : error);
      outcome = "error";
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(302, `${appBaseUrl(req)}/?emailVerification=${outcome}`);
  });
  app2.post("/api/email/change", async (req, res) => {
    try {
      let user;
      try {
        user = await authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Oturumun sona ermi\u015F. L\xFCtfen tekrar giri\u015F yap." });
        return;
      }
      if (user.loginMethod !== "dev_email" || user.emailVerifiedAt) {
        res.status(400).json({ error: "Do\u011Frulanm\u0131\u015F bir hesab\u0131n e-posta adresi buradan de\u011Fi\u015Ftirilemez." });
        return;
      }
      try {
        checkRateLimit(`email-change:${user.id}`, 5, 60 * 60 * 1e3);
      } catch {
        res.status(429).json({ error: "\xC7ok fazla deneme yapt\u0131n. Biraz sonra tekrar dener misin?" });
        return;
      }
      const identifier = parseIdentifier(typeof req.body?.email === "string" ? req.body.email : "");
      if (!identifier || identifier.kind !== "email") {
        res.status(400).json({ error: "Ge\xE7erli bir e-posta adresi yaz (\xF6r. ece@ornek.com)." });
        return;
      }
      if (identifier.openId === user.openId) {
        res.status(400).json({ error: "Bu zaten kay\u0131tl\u0131 e-posta adresin." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok." });
        return;
      }
      const [taken] = await db.select({ id: users.id }).from(users).where(eq2(users.openId, identifier.openId)).limit(1);
      if (taken) {
        res.status(409).json({ error: "Bu e-posta adresi ba\u015Fka bir hesapta kay\u0131tl\u0131." });
        return;
      }
      await db.update(users).set({ openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null }).where(eq2(users.id, user.id));
      const updated = { ...user, openId: identifier.openId, email: identifier.value, emailVerificationSentAt: null };
      const sessionToken = await createSessionToken(updated.openId, { name: updated.name ?? identifier.value, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      const sent = await sendVerificationEmail(updated, req).catch((error) => {
        console.error("[EmailVerification] send after change failed:", error instanceof Error ? error.message : error);
        return null;
      });
      res.json({ success: true, email: identifier.value, mailSent: sent?.status === "sent" });
    } catch (error) {
      console.error("[EmailVerification] change failed:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "E-posta adresi de\u011Fi\u015Ftirilemedi, tekrar dener misin?" });
    }
  });
}

// server/_core/localAuth.ts
var SCRYPT_KEY_LENGTH = 64;
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}
var MIN_NEW_PASSWORD_LENGTH = 8;
var PasswordChangeError = class extends Error {
};
async function changeLocalPassword(userId, currentPassword, newPassword) {
  if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) throw new PasswordChangeError(`Yeni \u015Fifre en az ${MIN_NEW_PASSWORD_LENGTH} karakter olmal\u0131.`);
  if (newPassword === currentPassword) throw new PasswordChangeError("Yeni \u015Fifre mevcut \u015Fifreyle ayn\u0131 olamaz.");
  const db = await getDb();
  if (!db) throw new PasswordChangeError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq3(users.id, userId)).limit(1);
  if (!user?.passwordHash) throw new PasswordChangeError("Bu hesap \u015Fifreyle giri\u015F yapm\u0131yor; \u015Fifresi buradan de\u011Fi\u015Ftirilemez.");
  if (!verifyPassword(currentPassword, user.passwordHash)) throw new PasswordChangeError("Mevcut \u015Fifre hatal\u0131.");
  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq3(users.id, userId));
}
function registerLocalAuthRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const rawIdentifier = typeof req.body?.identifier === "string" ? req.body.identifier : "";
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const mode = req.body?.mode === "register" ? "register" : "login";
      if (!rawIdentifier.trim()) {
        res.status(400).json({ error: "E-posta adresini veya telefon numaran\u0131 yazmal\u0131s\u0131n." });
        return;
      }
      if (password.length < 4) {
        res.status(400).json({ error: "\u015Eifre en az 4 karakter olmal\u0131." });
        return;
      }
      const identifier = parseIdentifier(rawIdentifier);
      if (!identifier || mode === "register" && identifier.kind === "legacyName") {
        res.status(400).json({ error: "Ge\xE7erli bir e-posta adresi (\xF6r. ece@ornek.com) ya da telefon numaras\u0131 (\xF6r. 0555 123 45 67) yaz." });
        return;
      }
      if (mode === "register" && !rawName) {
        res.status(400).json({ error: "Ad\u0131n\u0131 yazmal\u0131s\u0131n." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok." });
        return;
      }
      const { openId } = identifier;
      const existing = await db.select().from(users).where(eq3(users.openId, openId)).limit(1);
      const identifierLabel = identifier.kind === "phone" ? "telefon numaras\u0131" : "e-posta adresi";
      if (mode === "register" && existing[0]) {
        res.status(409).json({ error: `Bu ${identifierLabel} zaten kay\u0131tl\u0131. "Giri\u015F yap" sekmesini kullan\u0131r m\u0131s\u0131n?` });
        return;
      }
      if (mode === "login" && !existing[0]) {
        res.status(404).json({ error: `Bu ${identifierLabel} ile bir hesap bulunamad\u0131. \xD6nce "Kay\u0131t ol" sekmesinden hesap olu\u015Ftur.` });
        return;
      }
      const grantAdmin = isAdminLogin(openId) && (identifier.kind === "phone" || Boolean(existing[0]?.emailVerifiedAt));
      let displayName = rawName;
      if (existing[0]) {
        if (!existing[0].passwordHash || !verifyPassword(password, existing[0].passwordHash)) {
          res.status(401).json({ error: "E-posta/telefon veya \u015Fifre hatal\u0131." });
          return;
        }
        displayName = existing[0].name ?? identifier.value;
        await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: existing[0].approvedAt ?? /* @__PURE__ */ new Date() } : {} }).where(eq3(users.id, existing[0].id));
      } else {
        await db.insert(users).values({
          openId,
          name: rawName,
          email: identifier.kind === "email" ? identifier.value : null,
          loginMethod: identifier.kind === "phone" ? "dev_phone" : "dev_email",
          passwordHash: hashPassword(password),
          ...grantAdmin ? { role: "admin", approvalStatus: "approved", approvedAt: /* @__PURE__ */ new Date() } : { approvalStatus: "pending" },
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      }
      const sessionToken = await createSessionToken(openId, { name: displayName, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      let verificationMailSent = false;
      if (!existing[0] && identifier.kind === "email") {
        const [created] = await db.select().from(users).where(eq3(users.openId, openId)).limit(1);
        if (created) {
          verificationMailSent = await sendVerificationEmail(created, req).then((outcome) => outcome.status === "sent").catch((error) => {
            console.error("[Auth] Verification mail failed:", error instanceof Error ? error.message : error);
            return false;
          });
        }
      }
      res.json({ success: true, name: displayName, isNewAccount: !existing[0], verificationMailSent });
    } catch (error) {
      console.error("[Auth] Sign-in failed:", error);
      res.status(500).json({ error: "Giri\u015F yap\u0131lamad\u0131, tekrar dener misin?" });
    }
  });
}

// server/notes/attachmentStorage.ts
import { randomUUID } from "node:crypto";
import { and as and2, eq as eq4, inArray as inArray2, isNull as isNull2, lt as lt2, sql as sql3 } from "drizzle-orm";

// server/storage/supabaseStorage.ts
var BlobStoreError = class extends Error {
};
function createSupabaseBlobStore(config, fetchImpl = fetch) {
  const base = `${config.url}/storage/v1`;
  const headers = { Authorization: `Bearer ${config.serviceRoleKey}`, apikey: config.serviceRoleKey };
  const objectPath = (key) => `${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  let bucketReady = null;
  const fail = async (response, action) => {
    const body = await response.text().catch(() => "");
    throw new BlobStoreError(`Supabase Storage ${action} ${response.status}: ${body.slice(0, 200)}`);
  };
  const ensureBucket = () => {
    bucketReady ??= (async () => {
      const response = await fetchImpl(`${base}/bucket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: config.bucket, name: config.bucket, public: false }) });
      if (!response.ok && response.status !== 409) {
        const body = await response.text().catch(() => "");
        if (!/already exists|Duplicate/i.test(body)) {
          bucketReady = null;
          throw new BlobStoreError(`Supabase Storage bucket ${response.status}: ${body.slice(0, 200)}`);
        }
      }
    })();
    return bucketReady;
  };
  return {
    async put(key, mimeType, data) {
      await ensureBucket();
      const response = await fetchImpl(`${base}/object/${objectPath(key)}`, { method: "POST", headers: { ...headers, "Content-Type": mimeType, "x-upsert": "false", "Cache-Control": "private, max-age=3600" }, body: new Uint8Array(data) });
      if (!response.ok) await fail(response, "upload");
    },
    async signedUrl(key, expiresInSec) {
      const response = await fetchImpl(`${base}/object/sign/${objectPath(key)}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: expiresInSec }) });
      if (!response.ok) await fail(response, "sign");
      const { signedURL } = await response.json();
      if (!signedURL) throw new BlobStoreError("Supabase Storage sign: yan\u0131tta ba\u011Flant\u0131 yok");
      return signedURL.startsWith("http") ? signedURL : `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
    },
    async get(key) {
      const response = await fetchImpl(`${base}/object/${objectPath(key)}`, { headers });
      if (!response.ok) await fail(response, "download");
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(keys) {
      if (!keys.length) return;
      const response = await fetchImpl(`${base}/object/${encodeURIComponent(config.bucket)}`, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: keys }) });
      if (!response.ok) await fail(response, "delete");
    }
  };
}
var cached;
function getMediaBlobStore() {
  if (cached !== void 0) return cached;
  cached = ENV.supabaseUrl && ENV.supabaseServiceRoleKey ? createSupabaseBlobStore({ url: ENV.supabaseUrl, serviceRoleKey: ENV.supabaseServiceRoleKey, bucket: ENV.supabaseMediaBucket }) : null;
  return cached;
}

// server/notes/config.ts
var notesConfig = {
  content: {
    /** Tek bir notun JSON içeriğinin en büyük boyutu (çizim noktaları dahil). */
    maxContentBytes: 900 * 1024,
    maxTitleLength: 200,
    maxTagsPerNote: 12
  },
  attachments: {
    /** İstemci fotoğrafı ~1600 px JPEG'e küçültür; sunucu yine de sınırlar. */
    imageMaxBytes: 900 * 1024,
    /** ~10 dk Opus/WebM ses kaydı. */
    audioMaxBytes: 3 * 1024 * 1024,
    /** Kullanıcı başına toplam ek boyutu (veritabanında tutulduğu için sıkı). */
    perUserQuotaBytes: 60 * 1024 * 1024,
    /** Hiçbir nota bağlanmamış (kaydedilmeden bırakılmış) ek bu süreden sonra silinir. */
    orphanTtlMs: 24 * 60 * 60 * 1e3,
    imageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    audioMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]
  },
  speech: {
    /** "whisper": sağlayıcının /audio/transcriptions uç noktası. İstemci, sunucu kullanılamazsa tarayıcının kendi dikte özelliğine düşebilir. */
    provider: "whisper",
    language: "tr",
    prompt: "T\xFCrk\xE7e bir \xF6\u011Frencinin ders notu. Noktalama i\u015Faretlerini do\u011Fru kullan.",
    maxAudioSeconds: 600
  },
  ai: {
    /** AI'ya gönderilen not metninin üst sınırı (gizlilik + maliyet: yalnızca gerekenden fazlası gitmesin). */
    maxInputChars: 6e3
  },
  list: {
    pageSize: 30,
    snippetLength: 160
  },
  review: {
    /** "Tekrar tarihi" hızlı seçenekleri (gün). */
    presetsDays: [0, 3, 7, 14]
  },
  task: {
    defaultMinutes: 30
  }
};

// server/notes/attachmentStorage.ts
var SIGNED_URL_TTL_SEC = 600;
var AttachmentError = class extends Error {
};
var ascii = (bytes, start, end) => bytes.subarray(start, end).toString("ascii");
var SIGNATURES = [
  { mime: "image/jpeg", test: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255 },
  { mime: "image/png", test: (b) => b[0] === 137 && ascii(b, 1, 4) === "PNG" },
  { mime: "image/webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { mime: "audio/webm", test: (b) => b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163 },
  { mime: "audio/ogg", test: (b) => ascii(b, 0, 4) === "OggS" },
  { mime: "audio/mp4", test: (b) => ascii(b, 4, 8) === "ftyp" },
  { mime: "audio/mpeg", test: (b) => ascii(b, 0, 3) === "ID3" || b[0] === 255 && (b[1] & 224) === 224 },
  { mime: "audio/wav", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" }
];
function decodeAttachment(dataUrl, kind) {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new AttachmentError("Ge\xE7ersiz dosya bi\xE7imi.");
  const mimeType = match[1].toLowerCase();
  const allowed = kind === "image" ? notesConfig.attachments.imageMimeTypes : notesConfig.attachments.audioMimeTypes;
  if (!allowed.includes(mimeType)) throw new AttachmentError(kind === "image" ? "Yaln\u0131zca JPG, PNG veya WEBP foto\u011Fraf eklenebilir." : "Bu ses bi\xE7imi desteklenmiyor.");
  const data = Buffer.from(match[2], "base64");
  if (data.byteLength === 0) throw new AttachmentError("Dosya bo\u015F.");
  const maxBytes = kind === "image" ? notesConfig.attachments.imageMaxBytes : notesConfig.attachments.audioMaxBytes;
  if (data.byteLength > maxBytes) throw new AttachmentError(kind === "image" ? "Foto\u011Fraf \xE7ok b\xFCy\xFCk; daha k\xFC\xE7\xFCk bir foto\u011Fraf dener misin?" : "Ses kayd\u0131 \xE7ok uzun; daha k\u0131sa bir kay\u0131t dener misin?");
  const signature = SIGNATURES.find((item) => item.mime === mimeType);
  if (!signature || !signature.test(data)) throw new AttachmentError("Dosya i\xE7eri\u011Fi bildirilen t\xFCrle e\u015Fle\u015Fmiyor.");
  return { mimeType, data };
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new AttachmentError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" };
async function deleteRows(where) {
  const db = await requireDb();
  const removed = await db.delete(noteAttachments).where(where).returning({ storageKey: noteAttachments.storageKey });
  const keys = removed.map((row) => row.storageKey).filter((key) => Boolean(key));
  const store = getMediaBlobStore();
  if (keys.length && store) await store.remove(keys).catch((error) => console.error("[Attachments] storage delete failed:", error instanceof Error ? error.message : error));
}
var databaseAttachmentStorage = {
  async put(userId, input) {
    const db = await requireDb();
    const used = await this.usageBytes(userId);
    if (used + input.data.byteLength > notesConfig.attachments.perUserQuotaBytes) {
      throw new AttachmentError("Ek alan\u0131n doldu. Eski not ya da duvar kay\u0131tlar\u0131ndaki baz\u0131 foto\u011Fraf/ses kay\u0131tlar\u0131n\u0131 silip tekrar dener misin?");
    }
    const store = getMediaBlobStore();
    let storageKey = null;
    if (store) {
      storageKey = `u${userId}/${input.kind}/${randomUUID()}.${EXTENSIONS[input.mimeType] ?? "bin"}`;
      try {
        await store.put(storageKey, input.mimeType, input.data);
      } catch (error) {
        console.error("[Attachments] storage upload failed:", error instanceof Error ? error.message : error);
        throw new AttachmentError("Dosya y\xFCklenemedi. Biraz sonra tekrar dener misin?");
      }
    }
    const result = await db.insert(noteAttachments).values({ userId, kind: input.kind, mimeType: input.mimeType, byteSize: input.data.byteLength, data: storageKey ? null : input.data, storageKey, durationSec: input.durationSec ?? null }).returning({ id: noteAttachments.id });
    return { id: Number(result[0].id) };
  },
  async get(userId, id8) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, storageKey: noteAttachments.storageKey, kind: noteAttachments.kind, noteId: noteAttachments.noteId }).from(noteAttachments).where(and2(eq4(noteAttachments.id, id8), eq4(noteAttachments.userId, userId))).limit(1);
    if (!row) return null;
    const store = getMediaBlobStore();
    const data = row.data ?? (row.storageKey && store ? await store.get(row.storageKey) : null);
    if (!data) return null;
    return { mimeType: row.mimeType, data, kind: row.kind, noteId: row.noteId };
  },
  async locate(userId, id8) {
    const db = await requireDb();
    const [row] = await db.select({ mimeType: noteAttachments.mimeType, data: noteAttachments.data, storageKey: noteAttachments.storageKey }).from(noteAttachments).where(and2(eq4(noteAttachments.id, id8), eq4(noteAttachments.userId, userId))).limit(1);
    if (!row) return null;
    if (row.data) return { mimeType: row.mimeType, data: row.data };
    const store = getMediaBlobStore();
    if (!row.storageKey || !store) return null;
    return { mimeType: row.mimeType, url: await store.signedUrl(row.storageKey, SIGNED_URL_TTL_SEC) };
  },
  async setOcrText(userId, id8, text4) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ ocrText: text4 }).where(and2(eq4(noteAttachments.id, id8), eq4(noteAttachments.userId, userId)));
  },
  async syncNoteLinks(userId, noteId, referencedIds) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ noteId: null }).where(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.noteId, noteId)));
    if (referencedIds.length) {
      await db.update(noteAttachments).set({ noteId }).where(and2(eq4(noteAttachments.userId, userId), inArray2(noteAttachments.id, referencedIds)));
    }
  },
  async deleteForNote(userId, noteId) {
    await deleteRows(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.noteId, noteId)));
  },
  async syncWallPostLinks(userId, wallPostId, referencedIds) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ wallPostId: null }).where(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.wallPostId, wallPostId)));
    if (referencedIds.length) {
      await db.update(noteAttachments).set({ wallPostId }).where(and2(eq4(noteAttachments.userId, userId), inArray2(noteAttachments.id, referencedIds)));
    }
  },
  async deleteForWallPost(userId, wallPostId) {
    const db = await requireDb();
    await db.update(noteAttachments).set({ wallPostId: null }).where(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.wallPostId, wallPostId), sql3`${noteAttachments.noteId} IS NOT NULL`));
    await deleteRows(and2(eq4(noteAttachments.userId, userId), eq4(noteAttachments.wallPostId, wallPostId)));
  },
  async usageBytes(userId) {
    const db = await requireDb();
    const [row] = await db.select({ total: sql3`COALESCE(SUM(${noteAttachments.byteSize}), 0)` }).from(noteAttachments).where(eq4(noteAttachments.userId, userId));
    return Number(row?.total ?? 0);
  },
  async cleanupOrphans(userId) {
    await deleteRows(and2(eq4(noteAttachments.userId, userId), isNull2(noteAttachments.noteId), isNull2(noteAttachments.wallPostId), lt2(noteAttachments.createdAt, new Date(Date.now() - notesConfig.attachments.orphanTtlMs))));
  }
};
var getAttachmentStorage = () => databaseAttachmentStorage;

// server/notes/attachmentRoutes.ts
function registerNoteAttachmentRoutes(app2) {
  app2.get("/api/notes/attachments/:id", async (req, res) => {
    const id8 = Number(req.params.id);
    if (!Number.isInteger(id8) || id8 <= 0) {
      res.status(400).end();
      return;
    }
    let userId;
    try {
      userId = (await authenticateRequest(req)).id;
    } catch {
      res.status(401).end();
      return;
    }
    try {
      const attachment = await getAttachmentStorage().locate(userId, id8);
      if (!attachment) {
        res.status(404).end();
        return;
      }
      if ("url" in attachment) {
        res.setHeader("Cache-Control", `private, max-age=${Math.floor(SIGNED_URL_TTL_SEC / 2)}`);
        res.redirect(302, attachment.url);
        return;
      }
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Length", String(attachment.data.byteLength));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
      res.end(attachment.data);
    } catch (error) {
      console.error("[Notes] attachment read failed:", error instanceof Error ? error.message : error);
      res.status(500).end();
    }
  });
}

// server/digest/weeklyDigest.ts
import { and as and12, asc as asc3, desc as desc9, eq as eq15, gte as gte9, isNotNull as isNotNull5, isNull as isNull9, lt as lt9, or as or4 } from "drizzle-orm";

// shared/weeklyDigest.ts
var DAY_MS2 = 24 * 60 * 60 * 1e3;
var ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1e3;
var dayKey = (date) => Math.floor((date.getTime() + ISTANBUL_OFFSET_MS) / DAY_MS2);
function weeklyDigestWindow(now) {
  const startOfToday3 = dayKey(now) * DAY_MS2 - ISTANBUL_OFFSET_MS;
  return { start: new Date(startOfToday3 - 6 * DAY_MS2), end: now };
}
var inWindow = (date, start, end) => date >= start && date < end;
function buildWeeklyDigest(input) {
  const sessions = input.sessions.filter((session) => inWindow(session.sessionDate, input.start, input.end) && session.status !== "skipped");
  const logs = input.logs.filter((log) => inWindow(log.studyDate, input.start, input.end));
  const plannedSessions = sessions.length;
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const completionRate = plannedSessions ? Math.round(completedSessions / plannedSessions * 100) : null;
  const minutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const questions = logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = logs.reduce((sum, log) => sum + log.correct, 0);
  const accuracy = questions ? Math.round(correct / questions * 100) : null;
  const activeDays = new Set(logs.filter((log) => log.minutes > 0).map((log) => dayKey(log.studyDate))).size;
  const bySubject = /* @__PURE__ */ new Map();
  for (const log of logs) bySubject.set(log.subject, (bySubject.get(log.subject) ?? 0) + log.minutes);
  const top = Array.from(bySubject).sort((a, b) => b[1] - a[1])[0];
  const topSubject = top && top[1] > 0 ? { subject: top[0], minutes: top[1] } : null;
  const weakTopics = input.weakTopics.slice(0, 3);
  const idle = minutes === 0 && completedSessions === 0;
  const headline = idle ? "Bu hafta Pusula'da kay\u0131tl\u0131 bir \xE7al\u0131\u015Fman yok." : completionRate !== null && completionRate >= 80 ? `Harika bir hafta: plan\u0131n\u0131n %${completionRate}'ini tamamlad\u0131n.` : `Bu hafta ${activeDays} g\xFCn \xE7al\u0131\u015Ft\u0131n, toplam ${formatMinutes(minutes)}.`;
  const suggestion = idle ? "K\xFC\xE7\xFCk ba\u015Fla: AI Plan\u0131m'dan haftal\u0131k plan\u0131n\u0131 olu\u015Ftur ve her g\xFCn tek bir k\u0131sa odak oturumu tamamla." : plannedSessions >= 3 && completionRate !== null && completionRate < 50 && activeDays <= 3 ? `Plan\u0131n bu hafta a\u011F\u0131r gelmi\u015F olabilir. Takvim'deki "Plan\u0131 hafiflet" ile oturumlar\u0131 k\u0131salt; d\xFCzenli k\xFC\xE7\xFCk ad\u0131mlar daha \xE7ok kazand\u0131r\u0131r.` : weakTopics[0] ? `${weakTopics[0].topic} (${weakTopics[0].subject}) i\xE7in en az iki k\u0131sa oturum ay\u0131r.` : input.dueReviews > 0 ? `Tekrar listende ${input.dueReviews} soru bekliyor; haftaya onlarla ba\u015Fla.` : "Ayn\u0131 ritmi koru ve haftada bir deneme \xE7\xF6z\xFCp sonucunu ekle.";
  return { plannedSessions, completedSessions, completionRate, minutes, questions, accuracy, activeDays, topSubject, weakTopics, dueReviews: input.dueReviews, headline, suggestion };
}

// server/_core/emails/weeklyDigestEmail.ts
var escapeHtml2 = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
var rangeLabel = (start, end) => {
  const last = new Date(end.getTime() - 1);
  const fmt = (date, withMonth) => date.toLocaleDateString("tr-TR", withMonth ? { day: "numeric", month: "long", timeZone: "Europe/Istanbul" } : { day: "numeric", timeZone: "Europe/Istanbul" });
  const sameMonth = start.toLocaleDateString("tr-TR", { month: "long", timeZone: "Europe/Istanbul" }) === last.toLocaleDateString("tr-TR", { month: "long", timeZone: "Europe/Istanbul" });
  return `${fmt(start, !sameMonth)} \u2013 ${fmt(last, true)}`;
};
function buildWeeklyDigestEmail({ to, name: name2, digest, start, end, appUrl, unsubscribeUrl }) {
  const greeting = name2 ? `Merhaba ${name2},` : "Merhaba,";
  const range = rangeLabel(start, end);
  const subject2 = `Haftal\u0131k \xF6zetin \xB7 ${range}`;
  const stats = [
    ["Tamamlanan oturum", digest.plannedSessions ? `${digest.completedSessions} / ${digest.plannedSessions}` : String(digest.completedSessions)],
    ["\xC7al\u0131\u015Fma s\xFCresi", formatMinutes(digest.minutes)],
    ["\xC7\xF6z\xFClen soru", digest.accuracy !== null ? `${digest.questions} \xB7 %${digest.accuracy} do\u011Fru` : String(digest.questions)],
    ["\xC7al\u0131\u015Ft\u0131\u011F\u0131n g\xFCn", `${digest.activeDays} / 7`]
  ];
  const text4 = [
    greeting,
    "",
    `${range} haftan: ${digest.headline}`,
    "",
    ...stats.map(([label, value]) => `\u2022 ${label}: ${value}`),
    ...digest.topSubject ? [`\u2022 En \xE7ok \xE7al\u0131\u015Ft\u0131\u011F\u0131n ders: ${digest.topSubject.subject} (${formatMinutes(digest.topSubject.minutes)})`] : [],
    ...digest.weakTopics.length ? ["", "G\xFC\xE7lendirmen gereken konular:", ...digest.weakTopics.map((topic) => `\u2022 ${topic.topic} (${topic.subject}) \xB7 %${topic.progress}`)] : [],
    ...digest.dueReviews > 0 ? ["", `Tekrar listende ${digest.dueReviews} soru seni bekliyor.`] : [],
    "",
    `Gelecek hafta i\xE7in \xF6nerim: ${digest.suggestion}`,
    "",
    `Pusula'y\u0131 a\xE7: ${appUrl}`,
    "",
    `Bu \xF6zeti her pazar al\u0131yorsun. Almak istemiyorsan: ${unsubscribeUrl}`,
    "\u2014 Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u"
  ].join("\n");
  const statCell = ([label, value]) => `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml2(label)}</div><div style="margin-top:4px;font-size:18px;font-weight:700;color:#18202a;">${escapeHtml2(value)}</div></td>`;
  const weakRows = digest.weakTopics.map((topic) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;color:#18202a;">${escapeHtml2(topic.topic)} <span style="color:#5d6670;">\xB7 ${escapeHtml2(topic.subject)}</span></td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:13px;font-weight:700;color:#b42318;">%${topic.progress}</td></tr>`).join("");
  const safeApp = escapeHtml2(appUrl);
  const safeUnsub = escapeHtml2(unsubscribeUrl);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml2(subject2)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml2(digest.headline)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#17625f;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#18202a;">Pusula YKS</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:28px 22px;border:1px solid #e6ebe9;">
        <div style="font-size:13px;font-weight:600;color:#17625f;">Haftal\u0131k \xF6zet \xB7 ${escapeHtml2(range)}</div>
        <h1 style="margin:6px 0 10px 0;font-size:21px;line-height:1.3;font-weight:700;color:#18202a;">${escapeHtml2(digest.headline)}</h1>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4852;">${escapeHtml2(greeting)} ge\xE7en yedi g\xFCn\xFCn k\u0131sa \xF6zeti a\u015Fa\u011F\u0131da.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;width:calc(100% + 16px);">
          <tr>${statCell(stats[0])}${statCell(stats[1])}</tr>
          <tr>${statCell(stats[2])}${statCell(stats[3])}</tr>
        </table>
        ${digest.topSubject ? `<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#5d6670;">En \xE7ok \xE7al\u0131\u015Ft\u0131\u011F\u0131n ders: <strong style="color:#18202a;">${escapeHtml2(digest.topSubject.subject)}</strong> (${escapeHtml2(formatMinutes(digest.topSubject.minutes))})</p>` : ""}
        ${weakRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">G\xFC\xE7lendirmen gereken konular</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weakRows}</table>` : ""}
        ${digest.dueReviews > 0 ? `<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#5d6670;">Tekrar listende <strong style="color:#18202a;">${digest.dueReviews} soru</strong> seni bekliyor.</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>
          <td style="background:#fdf3d9;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#18202a;"><strong>Gelecek hafta i\xE7in \xF6nerim:</strong> ${escapeHtml2(digest.suggestion)}</td>
        </tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;"><tr><td align="center">
          <a href="${safeApp}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">Pusula'y\u0131 a\xE7</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">Pusula YKS \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u<br>Bu \xF6zeti her pazar al\u0131yorsun. <a href="${safeUnsub}" style="color:#7c858e;">Almak istemiyorum</a></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return { to, subject: subject2, html, text: text4 };
}

// server/notes/questionsDb.ts
import { and as and5, asc, desc as desc3, eq as eq7, gte as gte4, isNotNull as isNotNull2, isNull as isNull4, lt as lt4, lte as lte3, ne as ne2, sql as sql5 } from "drizzle-orm";

// server/studyPlan/planTasks.ts
import { and as and3, eq as eq5, gte as gte2, lte } from "drizzle-orm";

// server/bookContent/config.ts
var bookContentConfig = {
  mapping: {
    /** Bu güvenin üstü: eşleşme otomatik önerilir (öğrenci yine görür, değiştirebilir). */
    autoSuggestMin: 0.9,
    /** Bu aralık: öğrencinin açıkça onaylaması istenir. Altı: manuel eşleştirme gerekli. */
    confirmMin: 0.7,
    /** Eşleşme adımlarının verdiği güven (tam eşleşme > alias > kapsama > benzerlik). */
    scores: { exactTopic: 1, exactAlias: 0.95, containsTopic: 0.88, containsAlias: 0.85, fuzzyMax: 0.8 },
    /** Kelime kökü yaklaşımı: Türkçe ekleri tolere etmek için kelimenin ilk N harfi karşılaştırılır. */
    stemLength: 5,
    maxAlternatives: 3
  },
  aiMapping: {
    /** Deterministik eşleştirme belirsiz kaldığında (onay/manuel) AI'ya aday listesinden seçtirilsin mi. */
    enabled: true,
    /** AI'ya gösterilecek en fazla aday konu (ilgili dersin konuları). */
    maxCandidates: 60,
    /** AI önerisinin güveni bu değeri AŞAMAZ: otomatik öneri eşiğinin altında kalır, öğrenci her zaman onaylar. */
    maxConfidence: 0.85,
    /** Bu güvenin altındaki AI önerisi hiç gösterilmez (manuel eşleştirme kalır). */
    minConfidence: 0.6
  },
  ocr: {
    /** Tek istekte gönderilebilecek en büyük görsel (Vercel istek gövdesi sınırı ~4.5 MB). */
    maxImageBytes: 3.5 * 1024 * 1024,
    /** Bir kitap için en fazla içindekiler sayfası. */
    maxTocPages: 8,
    /** İsteğin tamamı için süre bütçesi (Vercel fonksiyonu 300 sn; güçlü model yavaştır, yanıt + eşleştirme payı bırakılır). */
    requestBudgetMs: 15e4,
    /** Aynı anda okunan sayfa sayısı bunu aşarsa sayfa başına geçiş sayısı kısılır (hız sınırı + süre). */
    manyPagesThreshold: 3,
    maxPassesWhenManyPages: 2
  },
  confidence: {
    /** Nihai güven = ağırlıklı ortalama (görüntü, okuma, yapı, eşleştirme). */
    weights: { image: 0.15, ocr: 0.35, structure: 0.25, mapping: 0.25 },
    /** Bunun altındaki satır / sayfa "kontrol et" olarak işaretlenir. */
    needsReviewBelow: 0.7
  },
  allocation: {
    /** Zayıflık (0-1) → önerilen çalışma süresi (dk). Aralık alt sınırı dahil; ilk eşleşen kullanılır. */
    weaknessMinutes: [
      { min: 0.85, minutes: 60 },
      { min: 0.7, minutes: 45 },
      { min: 0.5, minutes: 30 },
      { min: 0.3, minutes: 20 }
    ],
    /** Bu doğruluğun (%) altındaki "Orta" konular için de TEKRAR önerisi yapılır (Zayıf eşiği shared/topicStatus.ts'te). */
    reviewMaxAccuracy: 70,
    /** Bir kitap testinin ortalama çözüm süresi (dk) — öneride kaç test verileceğini belirler. */
    minutesPerTest: 15,
    /** Bir günde kitap görevlerine ayrılabilecek en fazla süre (dk). */
    maxDailyBookMinutes: 90,
    /** Öğrencinin tercihi yoksa varsayılan: kitap görevleri otomatik planlanmaz, yalnızca önerilir. */
    autoScheduleDefault: false
  }
};

// server/bookContent/bookStudyAllocation.ts
var weaknessFromAccuracy = (accuracy) => Math.round((1 - Math.max(0, Math.min(100, accuracy)) / 100) * 100) / 100;
function minutesForWeakness(weakness, bands = bookContentConfig.allocation.weaknessMinutes) {
  const band = [...bands].sort((a, b) => b.min - a.min).find((item) => weakness >= item.min);
  return band ? band.minutes : null;
}
var overlaps = (row, ranges) => row.pageStart !== null && ranges.some((range) => row.pageStart >= range.pageStart && row.pageStart <= range.pageEnd);
var PRACTICE_TYPES = /* @__PURE__ */ new Set(["topic_test", "topic", "osym_type"]);
function buildBookRecommendations(input) {
  const { minutesPerTest, weaknessMinutes } = bookContentConfig.allocation;
  const recommendations = [];
  for (const weak of input.weakTopics) {
    const weakness = weaknessFromAccuracy(weak.accuracy);
    const minutes = minutesForWeakness(weakness, weaknessMinutes);
    if (minutes === null) continue;
    const byBook = /* @__PURE__ */ new Map();
    for (const row of input.contents) {
      if (row.topicId !== weak.topicId || !PRACTICE_TYPES.has(row.contentType)) continue;
      byBook.set(row.bookId, [...byBook.get(row.bookId) ?? [], row]);
    }
    const purpose = weak.accuracy < TOPIC_STATUS_THRESHOLDS.weak ? "practice" : "review";
    for (const [bookId, rows] of Array.from(byBook)) {
      const skip = [...input.donePages[bookId] ?? [], ...input.scheduledPages[bookId] ?? []];
      const open = rows.sort((a, b) => a.sortOrder - b.sortOrder).filter((row) => !overlaps(row, skip));
      if (open.length === 0) continue;
      if (purpose === "review") open.sort((a, b) => Number(b.contentType === "osym_type") - Number(a.contentType === "osym_type") || a.sortOrder - b.sortOrder);
      const first = open[0];
      const count4 = Math.max(1, Math.floor(minutes / minutesPerTest));
      const picked = open.filter((row) => row.unitNumber === first.unitNumber && row.unitTitle === first.unitTitle).slice(0, count4);
      const numbers = picked.map((row) => row.testNumber).filter((value) => value !== null);
      const allTopicTests = picked.every((row) => row.contentType === "topic_test");
      recommendations.push({
        purpose,
        topicId: weak.topicId,
        topic: weak.topic,
        subject: weak.subject,
        exam: weak.exam,
        weakness,
        minutes,
        bookId,
        unitNumber: first.unitNumber,
        unitTitle: first.unitTitle,
        contentIds: picked.map((row) => row.id),
        labels: picked.map((row) => row.label),
        testRange: allTopicTests && numbers.length ? numbers.length === 1 ? String(numbers[0]) : `${Math.min(...numbers)}-${Math.max(...numbers)}` : null,
        pageStart: picked[0].pageStart,
        pageEnd: picked[picked.length - 1].pageEnd ?? picked[picked.length - 1].pageStart,
        match: Math.min(...picked.map((row) => row.mappingConfidence)) >= bookContentConfig.mapping.autoSuggestMin ? "HIGH" : "MEDIUM",
        remainingTests: open.length
      });
    }
  }
  return recommendations.sort((a, b) => b.weakness - a.weakness || a.bookId.localeCompare(b.bookId));
}
function computeBookCompletion(input) {
  const ranges = input.logs.filter((log) => log.pageStart !== null).map((log) => ({ pageStart: log.pageStart, pageEnd: Math.max(log.pageStart, log.pageEnd ?? log.pageStart) }));
  const questions = input.logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = input.logs.reduce((sum, log) => sum + log.correct, 0);
  const accuracy = questions > 0 ? Math.round(correct / questions * 100) : null;
  const isDone = (row) => row.pageStart !== null && ranges.some((range) => row.pageStart >= range.pageStart && row.pageStart <= range.pageEnd);
  if (input.contents.length > 0) {
    const units = [];
    for (const row of input.contents) {
      let unit = units[units.length - 1];
      if (!unit || unit.unitNumber !== row.unitNumber || unit.unitTitle !== row.unitTitle) {
        unit = { unitNumber: row.unitNumber, unitTitle: row.unitTitle, done: 0, total: 0 };
        units.push(unit);
      }
      unit.total += 1;
      if (isDone(row)) unit.done += 1;
    }
    const total = input.contents.length;
    const done = units.reduce((sum, unit) => sum + unit.done, 0);
    return { percent: Math.round(done / total * 100), basis: "contents", done, total, accuracy, questions, units };
  }
  if (input.pageCount && input.pageCount > 0) {
    const covered2 = /* @__PURE__ */ new Set();
    for (const range of ranges) for (let page2 = range.pageStart; page2 <= Math.min(range.pageEnd, input.pageCount); page2++) covered2.add(page2);
    return { percent: Math.min(100, Math.round(covered2.size / input.pageCount * 100)), basis: "pages", done: covered2.size, total: input.pageCount, accuracy, questions, units: [] };
  }
  return { percent: null, basis: "none", done: 0, total: 0, accuracy, questions, units: [] };
}
function pickStudyDay(input) {
  const { maxDailyBookMinutes } = bookContentConfig.allocation;
  const start = /* @__PURE__ */ new Date(`${input.today}T00:00:00Z`);
  for (let offset = 0; offset < (input.horizonDays ?? 7); offset++) {
    const date = new Date(start.getTime() + offset * 864e5).toISOString().slice(0, 10);
    const dayLoad = input.load.filter((item) => item.date === date);
    const total = dayLoad.reduce((sum, item) => sum + item.minutes, 0);
    const bookTotal = dayLoad.filter((item) => item.isBook).reduce((sum, item) => sum + item.minutes, 0);
    if (total + input.minutes <= input.dailyCapacity && bookTotal + input.minutes <= maxDailyBookMinutes) return date;
  }
  return null;
}

// server/studyPlan/planTasks.ts
var PlanTaskError = class extends Error {
};
var isoDate = (date) => date.toISOString().slice(0, 10);
async function pickDayForTask(userId, minutes, when2) {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const today = /* @__PURE__ */ new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (when2 === "today") return isoDate(today);
  const horizonEnd = new Date(today.getTime() + 7 * 864e5);
  const [profile] = await db.select({ daily: studentProfiles.dailyStudyDuration }).from(studentProfiles).where(eq5(studentProfiles.userId, userId)).limit(1);
  const sessions = await db.select({ sessionDate: studyPlanSessions.sessionDate, minutes: studyPlanSessions.plannedMinutes, sourceBookId: studyPlanSessions.sourceBookId }).from(studyPlanSessions).where(and3(eq5(studyPlanSessions.userId, userId), eq5(studyPlanSessions.status, "planned"), gte2(studyPlanSessions.sessionDate, today), lte(studyPlanSessions.sessionDate, horizonEnd)));
  const picked = pickStudyDay({ today: isoDate(today), minutes, dailyCapacity: profile?.daily ?? 120, load: sessions.map((session) => ({ date: isoDate(new Date(session.sessionDate)), minutes: session.minutes, isBook: Boolean(session.sourceBookId) })) });
  if (!picked) throw new PlanTaskError('\xD6n\xFCm\xFCzdeki 7 g\xFCnde bu g\xF6rev i\xE7in yer yok \u2014 plan\u0131n dolu. "Bug\xFCn \xE7al\u0131\u015F" ile yine de ekleyebilirsin.');
  return picked;
}
async function insertPlanTask(userId, input) {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const noon = /* @__PURE__ */ new Date(`${input.date}T12:00:00Z`);
  const sessionDate = input.date === isoDate(/* @__PURE__ */ new Date()) ? new Date(Math.max(noon.getTime(), Date.now() + 5 * 6e4)) : noon;
  const [plan] = await db.select({ id: studyPlans.id }).from(studyPlans).where(and3(eq5(studyPlans.userId, userId), lte(studyPlans.weekStart, sessionDate), gte2(studyPlans.weekEnd, sessionDate))).orderBy(studyPlans.createdAt).limit(1);
  let planId = plan?.id;
  if (!planId) {
    const weekStart = /* @__PURE__ */ new Date(`${input.date}T00:00:00Z`);
    const weekEnd = new Date(weekStart.getTime() + 6 * 864e5 + 86399e3);
    const result2 = await db.insert(studyPlans).values({ userId, title: input.planTitle, weekStart, weekEnd, summary: input.planSummary, source: "manual" }).returning({ id: studyPlans.id });
    planId = Number(result2[0].id);
  }
  const result = await db.insert(studyPlanSessions).values({
    planId,
    userId,
    sessionDate,
    title: input.title.slice(0, 180),
    subject: input.subject,
    // Tam konu adı: tamamlanınca completeStudySession → upsertTopicProgress aynı
    // konu satırını günceller; zayıflık mevcut sistem tarafından yeniden hesaplanır.
    topic: input.topic,
    kind: input.kind,
    plannedMinutes: input.minutes,
    targetPages: input.targetPages ?? null,
    targetTests: input.targetTests ?? null,
    sourceBookId: input.sourceBookId ?? null
  }).returning({ id: studyPlanSessions.id });
  return { sessionId: Number(result[0].id), date: input.date };
}

// server/notes/notesDb.ts
import { and as and4, desc as desc2, eq as eq6, gte as gte3, inArray as inArray3, isNotNull, isNull as isNull3, ilike, lt as lt3, lte as lte2, ne, or, sql as sql4 } from "drizzle-orm";

// shared/noteContent.ts
var BLOCK_TYPES = /* @__PURE__ */ new Set(["paragraph", "heading", "listItem", "taskItem", "blockquote", "formula", "noteImage", "voiceClip", "drawing", "horizontalRule"]);
function extractPlainText(doc) {
  const parts = [];
  const walk = (node) => {
    if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    else if (node.type === "formula" && typeof node.attrs?.latex === "string") parts.push(` ${node.attrs.latex} `);
    else if (node.type === "noteImage" && typeof node.attrs?.ocrText === "string") parts.push(node.attrs.ocrText);
    for (const child of node.content ?? []) walk(child);
    if (BLOCK_TYPES.has(node.type)) parts.push("\n");
  };
  walk(doc);
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function computeNoteStats(doc) {
  const stats = { images: 0, voice: 0, voiceSeconds: 0, formulas: 0, drawings: 0, checklist: 0, checklistDone: 0, firstFormula: null };
  const walk = (node) => {
    if (node.type === "noteImage") stats.images += 1;
    if (node.type === "voiceClip") {
      stats.voice += 1;
      stats.voiceSeconds += Number(node.attrs?.duration) || 0;
    }
    if (node.type === "formula") {
      stats.formulas += 1;
      if (!stats.firstFormula && typeof node.attrs?.latex === "string") stats.firstFormula = node.attrs.latex.slice(0, 60);
    }
    if (node.type === "drawing") stats.drawings += 1;
    if (node.type === "taskItem") {
      stats.checklist += 1;
      if (node.attrs?.checked) stats.checklistDone += 1;
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return stats;
}
function deriveNoteTitle(title, plainText, noteDate) {
  const clean2 = title.trim();
  if (clean2) return clean2.slice(0, 200);
  const firstLine = plainText.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.length > 60 ? `${firstLine.slice(0, 57)}\u2026` : firstLine;
  return `Not \xB7 ${noteDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
}
function normalizeTag(value) {
  const tag = value.trim().replace(/^#+/, "").replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9çğıöşü_-]/g, "").slice(0, 40);
  return tag.length >= 2 ? tag : null;
}
function isValidNoteDoc(value, limits = { maxNodes: 2e4, maxDepth: 30 }) {
  if (!value || typeof value !== "object" || value.type !== "doc" || !Array.isArray(value.content)) return false;
  let count4 = 0;
  const check2 = (node, depth) => {
    if (!node || typeof node !== "object" || typeof node.type !== "string") return false;
    if (++count4 > limits.maxNodes || depth > limits.maxDepth) return false;
    const children = node.content;
    if (children !== void 0 && !Array.isArray(children)) return false;
    return (children ?? []).every((child) => check2(child, depth + 1));
  };
  return check2(value, 0);
}
var NOTE_AI_ACTIONS = {
  summarize: { label: "\xD6zet", menu: "\xD6zetle" },
  keypoints: { label: "\xD6nemli noktalar", menu: "\xD6nemli noktalar\u0131 \xE7\u0131kar" },
  questions: { label: "Sorular", menu: "Soru olu\u015Ftur" },
  flashcards: { label: "Flashcard", menu: "Flashcard olu\u015Ftur" },
  simplify: { label: "Basitle\u015Ftirilmi\u015F", menu: "Basitle\u015Ftir" },
  review: { label: "Tekrar etmem gerekenler", menu: "Tekrar etmem gerekenleri bul" }
};
function aiResultToNodes(action, items) {
  const text4 = (value) => value.trim() ? [{ type: "text", text: value.trim() }] : [];
  const listType = action === "questions" ? "orderedList" : "bulletList";
  const list = {
    type: listType,
    content: items.map((item) => ({
      type: "listItem",
      content: action === "flashcards" && item.back ? [{ type: "paragraph", content: [{ type: "text", text: "S: ", marks: [{ type: "bold" }] }, ...text4(item.front)] }, { type: "paragraph", content: [{ type: "text", text: "C: ", marks: [{ type: "bold" }] }, ...text4(item.back)] }] : [{ type: "paragraph", content: text4(item.front) }]
    }))
  };
  return [{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: `\u2728 AI \xB7 ${NOTE_AI_ACTIONS[action].label}`, marks: [{ type: "bold" }] }] }, list] }];
}

// server/notes/notesDb.ts
var NoteError = class extends Error {
};
async function requireDb2() {
  const db = await getDb();
  if (!db) throw new NoteError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
function referencedAttachmentIds(doc) {
  const ids = /* @__PURE__ */ new Set();
  const walk = (node) => {
    if ((node.type === "noteImage" || node.type === "voiceClip") && Number.isInteger(node.attrs?.attachmentId)) ids.add(Number(node.attrs.attachmentId));
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return Array.from(ids);
}
async function resolveLinks(db, userId, links) {
  let subject2 = links.subject?.trim() || null;
  const topicId = links.topicId ?? null;
  if (topicId !== null) {
    const [topic] = await db.select({ subject: yksTopics.subject }).from(yksTopics).where(eq6(yksTopics.id, topicId)).limit(1);
    if (!topic) throw new NoteError("Se\xE7ilen konu bulunamad\u0131.");
    subject2 = subject2 ?? topic.subject;
  }
  const bookId = links.bookId?.trim() || null;
  if (bookId) {
    const [owned] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and4(eq6(bookInventory.userId, userId), eq6(bookInventory.bookId, bookId))).limit(1);
    if (!owned) throw new NoteError("Bu kitap k\xFCt\xFCphanende bulunmuyor.");
  }
  const bookContentId = links.bookContentId ?? null;
  if (bookContentId !== null) {
    const [content] = await db.select({ bookId: userBookContents.bookId }).from(userBookContents).where(and4(eq6(userBookContents.id, bookContentId), eq6(userBookContents.userId, userId))).limit(1);
    if (!content || bookId && content.bookId !== bookId) throw new NoteError("Se\xE7ilen kitap b\xF6l\xFCm\xFC ge\xE7ersiz.");
  }
  const studySessionId = links.studySessionId ?? null;
  if (studySessionId !== null) {
    const [session] = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(and4(eq6(studyPlanSessions.id, studySessionId), eq6(studyPlanSessions.userId, userId))).limit(1);
    if (!session) throw new NoteError("\xC7al\u0131\u015Fma oturumu bulunamad\u0131.");
  }
  const mockExamId = links.mockExamId ?? null;
  if (mockExamId !== null) {
    const [exam] = await db.select({ id: userMockExams.id }).from(userMockExams).where(and4(eq6(userMockExams.id, mockExamId), eq6(userMockExams.userId, userId))).limit(1);
    if (!exam) throw new NoteError("Deneme bulunamad\u0131.");
  }
  return { subject: subject2?.slice(0, 80) ?? null, topicId, bookId, bookContentId, studySessionId, mockExamId };
}
async function saveNote(userId, input) {
  const db = await requireDb2();
  if (!isValidNoteDoc(input.content)) throw new NoteError("Not i\xE7eri\u011Fi okunamad\u0131.");
  const contentJson = JSON.stringify(input.content);
  if (Buffer.byteLength(contentJson) > notesConfig.content.maxContentBytes) throw new NoteError("Not \xE7ok b\xFCy\xFCk. Baz\u0131 \xE7izim ya da g\xF6rselleri ayr\u0131 bir nota ta\u015F\u0131r m\u0131s\u0131n?");
  const plainText = extractPlainText(input.content);
  const stats = computeNoteStats(input.content);
  const links = await resolveLinks(db, userId, input);
  const title = deriveNoteTitle(input.title, plainText, input.noteDate);
  const tags = Array.from(new Set(input.tags.map(normalizeTag).filter((tag) => Boolean(tag)))).slice(0, notesConfig.content.maxTagsPerNote);
  const values = {
    title,
    content: contentJson,
    plainText,
    stats: JSON.stringify(stats),
    noteDate: input.noteDate,
    subject: links.subject,
    topicId: links.topicId,
    bookId: links.bookId,
    bookContentId: links.bookContentId,
    studySessionId: links.studySessionId,
    mockExamId: links.mockExamId,
    reviewAt: input.reviewAt ?? null,
    templateKey: input.templateKey ?? null,
    ...input.isFavorite !== void 0 ? { isFavorite: input.isFavorite ? 1 : 0 } : {},
    ...input.isPinned !== void 0 ? { isPinned: input.isPinned ? 1 : 0 } : {}
  };
  await db.insert(notes).values({ userId, clientId: input.clientId, ...values, isFavorite: input.isFavorite ? 1 : 0, isPinned: input.isPinned ? 1 : 0 }).onConflictDoUpdate({ target: [notes.userId, notes.clientId], set: { ...values, version: sql4`${notes.version} + 1` } });
  const [saved] = await db.select({ id: notes.id, version: notes.version, updatedAt: notes.updatedAt, title: notes.title }).from(notes).where(and4(eq6(notes.userId, userId), eq6(notes.clientId, input.clientId))).limit(1);
  if (!saved) throw new NoteError("Not kaydedilemedi.");
  await db.delete(noteTags).where(and4(eq6(noteTags.userId, userId), eq6(noteTags.noteId, saved.id)));
  if (tags.length) await db.insert(noteTags).values(tags.map((tag) => ({ noteId: saved.id, userId, tag })));
  await getAttachmentStorage().syncNoteLinks(userId, saved.id, referencedAttachmentIds(input.content));
  return { id: saved.id, clientId: input.clientId, version: saved.version, title: saved.title, updatedAt: saved.updatedAt };
}
async function describeLinks(db, userId, rows) {
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id8) => id8 !== null)));
  const bookIds = Array.from(new Set(rows.map((row) => row.bookId).filter((id8) => Boolean(id8))));
  const numeric = bookIds.filter((id8) => /^\d+$/.test(id8)).map(Number);
  const [topics, custom, catalog] = await Promise.all([
    topicIds.length ? db.select({ id: yksTopics.id, topic: yksTopics.topic, unit: yksTopics.unit }).from(yksTopics).where(inArray3(yksTopics.id, topicIds)) : Promise.resolve([]),
    bookIds.length ? db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and4(eq6(userResourceBooks.userId, userId), inArray3(userResourceBooks.bookId, bookIds))) : Promise.resolve([]),
    numeric.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray3(catalogBooks.id, numeric)) : Promise.resolve([])
  ]);
  const topicById = new Map(topics.map((row) => [row.id, row]));
  const bookTitle = new Map([...custom.map((row) => [row.bookId, row.title]), ...catalog.map((row) => [String(row.id), row.name])]);
  return { topicById, bookTitle };
}
var parseStats = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return computeNoteStats({ type: "doc", content: [] });
  }
};
async function getNote(userId, id8) {
  const db = await requireDb2();
  const [row] = await db.select().from(notes).where(and4(eq6(notes.id, id8), eq6(notes.userId, userId))).limit(1);
  if (!row) return null;
  const [tags, links] = await Promise.all([
    db.select({ tag: noteTags.tag }).from(noteTags).where(and4(eq6(noteTags.userId, userId), eq6(noteTags.noteId, id8))),
    describeLinks(db, userId, [row])
  ]);
  return {
    ...row,
    content: JSON.parse(row.content),
    stats: parseStats(row.stats),
    isFavorite: row.isFavorite === 1,
    isPinned: row.isPinned === 1,
    tags: tags.map((item) => item.tag),
    topic: row.topicId !== null ? links.topicById.get(row.topicId) ?? null : null,
    bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null
  };
}
var escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
async function keywordCondition(db, userId, q) {
  const term = `%${escapeLike(q.trim().slice(0, 100))}%`;
  const [topics, books] = await Promise.all([
    db.select({ id: yksTopics.id }).from(yksTopics).where(ilike(yksTopics.topic, term)).limit(50),
    db.select({ bookId: userResourceBooks.bookId }).from(userResourceBooks).where(and4(eq6(userResourceBooks.userId, userId), ilike(userResourceBooks.title, term))).limit(50)
  ]);
  const conditions = [
    ilike(notes.title, term),
    ilike(notes.plainText, term),
    ilike(notes.subject, term),
    sql4`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} ILIKE ${term})`
  ];
  if (topics.length) conditions.push(inArray3(notes.topicId, topics.map((row) => row.id)));
  if (books.length) conditions.push(inArray3(notes.bookId, books.map((row) => row.bookId)));
  return or(...conditions);
}
async function listNotes(userId, filters) {
  const db = await requireDb2();
  const limit = Math.min(Math.max(filters.limit ?? notesConfig.list.pageSize, 1), 100);
  const conditions = [eq6(notes.userId, userId), eq6(notes.status, "active")];
  if (filters.from) conditions.push(gte3(notes.noteDate, filters.from));
  if (filters.to) conditions.push(lte2(notes.noteDate, filters.to));
  if (filters.subject) conditions.push(eq6(notes.subject, filters.subject));
  if (filters.noSubject) conditions.push(isNull3(notes.subject));
  if (filters.topicId) conditions.push(eq6(notes.topicId, filters.topicId));
  if (filters.bookId) conditions.push(eq6(notes.bookId, filters.bookId));
  if (filters.studySessionId) conditions.push(eq6(notes.studySessionId, filters.studySessionId));
  if (filters.favorite) conditions.push(eq6(notes.isFavorite, 1));
  if (filters.pinned) conditions.push(eq6(notes.isPinned, 1));
  if (filters.reviewDue) conditions.push(and4(isNotNull(notes.reviewAt), lte2(notes.reviewAt, endOfToday())));
  if (filters.questions === "exclude") conditions.push(or(isNull3(notes.templateKey), ne(notes.templateKey, QUESTION_TEMPLATE_KEY)));
  if (filters.questions === "only") conditions.push(eq6(notes.templateKey, QUESTION_TEMPLATE_KEY));
  if (filters.tag) {
    const tag = normalizeTag(filters.tag);
    if (tag) conditions.push(sql4`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} = ${tag})`);
  }
  if (filters.kind) {
    const statKey = { voice: "voice", image: "images", formula: "formulas", drawing: "drawings" };
    if (filters.kind === "text") conditions.push(sql4`CHAR_LENGTH(${notes.plainText}) > 0`);
    else conditions.push(sql4`COALESCE((${notes.stats}::jsonb ->> ${statKey[filters.kind]})::int, 0) > 0`);
  }
  if (filters.q?.trim()) conditions.push(await keywordCondition(db, userId, filters.q));
  if (filters.cursor) {
    const [time2, id8] = filters.cursor.split("_").map(Number);
    if (Number.isFinite(time2) && Number.isFinite(id8)) conditions.push(or(lt3(notes.noteDate, new Date(time2)), and4(eq6(notes.noteDate, new Date(time2)), lt3(notes.id, id8))));
  }
  const rows = await db.select({
    id: notes.id,
    clientId: notes.clientId,
    title: notes.title,
    plainText: notes.plainText,
    stats: notes.stats,
    noteDate: notes.noteDate,
    subject: notes.subject,
    topicId: notes.topicId,
    bookId: notes.bookId,
    studySessionId: notes.studySessionId,
    isFavorite: notes.isFavorite,
    isPinned: notes.isPinned,
    reviewAt: notes.reviewAt,
    templateKey: notes.templateKey,
    updatedAt: notes.updatedAt,
    // Soru kartıysa ders defteri akışında kart olarak çizilebilsin diye özet bilgisi.
    question: { id: notebookQuestions.id, status: notebookQuestions.status, nextReviewAt: notebookQuestions.nextReviewAt, errorType: notebookQuestions.errorType, questionImageId: notebookQuestions.questionImageId, stuckPoint: notebookQuestions.stuckPoint }
  }).from(notes).leftJoin(notebookQuestions, and4(eq6(notebookQuestions.noteId, notes.id), eq6(notebookQuestions.userId, userId))).where(and4(...conditions)).orderBy(desc2(notes.noteDate), desc2(notes.id)).limit(limit + 1);
  const page2 = rows.slice(0, limit);
  const ids = page2.map((row) => row.id);
  const [tags, links] = await Promise.all([
    ids.length ? db.select({ noteId: noteTags.noteId, tag: noteTags.tag }).from(noteTags).where(and4(eq6(noteTags.userId, userId), inArray3(noteTags.noteId, ids))) : Promise.resolve([]),
    describeLinks(db, userId, page2)
  ]);
  const last = page2[page2.length - 1];
  return {
    items: page2.map(({ plainText, stats, ...row }) => ({
      ...row,
      snippet: plainText.replace(/\s+/g, " ").slice(0, notesConfig.list.snippetLength),
      stats: parseStats(stats),
      isFavorite: row.isFavorite === 1,
      isPinned: row.isPinned === 1,
      tags: tags.filter((item) => item.noteId === row.id).map((item) => item.tag),
      topic: row.topicId !== null ? links.topicById.get(row.topicId)?.topic ?? null : null,
      bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null,
      question: row.question?.id ? { ...row.question, errorType: row.question.errorType } : null
    })),
    nextCursor: rows.length > limit && last ? `${new Date(last.noteDate).getTime()}_${last.id}` : null
  };
}
var endOfToday = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};
async function updateNoteFlags(userId, id8, flags) {
  const db = await requireDb2();
  const set = {
    ...flags.isFavorite !== void 0 ? { isFavorite: flags.isFavorite ? 1 : 0 } : {},
    ...flags.isPinned !== void 0 ? { isPinned: flags.isPinned ? 1 : 0 } : {},
    ...flags.reviewAt !== void 0 ? { reviewAt: flags.reviewAt } : {},
    ...flags.archived !== void 0 ? { status: flags.archived ? "archived" : "active" } : {}
  };
  const [row] = await db.select({ id: notes.id }).from(notes).where(and4(eq6(notes.id, id8), eq6(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamad\u0131.");
  if (Object.keys(set).length === 0) return;
  await db.update(notes).set(set).where(and4(eq6(notes.id, id8), eq6(notes.userId, userId)));
}
async function deleteNote(userId, id8) {
  const db = await requireDb2();
  const [row] = await db.select({ id: notes.id }).from(notes).where(and4(eq6(notes.id, id8), eq6(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamad\u0131.");
  await getAttachmentStorage().deleteForNote(userId, id8);
  const [question] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).where(and4(eq6(notebookQuestions.userId, userId), eq6(notebookQuestions.noteId, id8))).limit(1);
  if (question) {
    await db.delete(questionAttempts).where(and4(eq6(questionAttempts.userId, userId), eq6(questionAttempts.questionId, question.id)));
    await db.delete(notebookQuestions).where(eq6(notebookQuestions.id, question.id));
  }
  await db.delete(noteTags).where(and4(eq6(noteTags.userId, userId), eq6(noteTags.noteId, id8)));
  await db.delete(notes).where(and4(eq6(notes.id, id8), eq6(notes.userId, userId)));
}
async function getNoteCalendar(userId, from, to) {
  const db = await requireDb2();
  const [written, reviews] = await Promise.all([
    db.select({ noteDate: notes.noteDate }).from(notes).where(and4(eq6(notes.userId, userId), eq6(notes.status, "active"), gte3(notes.noteDate, from), lte2(notes.noteDate, to))),
    db.select({ reviewAt: notes.reviewAt }).from(notes).where(and4(eq6(notes.userId, userId), eq6(notes.status, "active"), gte3(notes.reviewAt, from), lte2(notes.reviewAt, to)))
  ]);
  return { notes: written.map((row) => row.noteDate), reviews: reviews.map((row) => row.reviewAt).filter((value) => value !== null) };
}
async function listTags(userId) {
  const db = await requireDb2();
  const rows = await db.select({ tag: noteTags.tag, count: sql4`COUNT(*)::int` }).from(noteTags).where(eq6(noteTags.userId, userId)).groupBy(noteTags.tag).orderBy(desc2(sql4`COUNT(*)`)).limit(50);
  return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
}
async function getNoteStatsForAdmin(userId) {
  const db = await requireDb2();
  const rows = await db.select({ stats: notes.stats, updatedAt: notes.updatedAt }).from(notes).where(eq6(notes.userId, userId));
  const parsed = rows.map((row) => parseStats(row.stats));
  return {
    notes: rows.length,
    voiceNotes: parsed.filter((stats) => stats.voice > 0).length,
    imageNotes: parsed.filter((stats) => stats.images > 0).length,
    lastActivity: rows.reduce((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null)
  };
}
async function createTaskFromNote(userId, noteId, input) {
  const db = await requireDb2();
  const [note] = await db.select({ id: notes.id, title: notes.title, topicId: notes.topicId }).from(notes).where(and4(eq6(notes.id, noteId), eq6(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Not bulunamad\u0131.");
  const topicId = input.topicId ?? note.topicId;
  if (!topicId) throw new NoteError("G\xF6rev olu\u015Fturmak i\xE7in \xF6nce notu bir konuya ba\u011Fla.");
  const [topic] = await db.select({ topic: yksTopics.topic, subject: yksTopics.subject }).from(yksTopics).where(eq6(yksTopics.id, topicId)).limit(1);
  if (!topic) throw new NoteError("Se\xE7ilen konu bulunamad\u0131.");
  const minutes = Math.min(Math.max(input.minutes ?? notesConfig.task.defaultMinutes, 10), 240);
  const date = await pickDayForTask(userId, minutes, input.when);
  const title = `${topic.subject} \xB7 ${topic.topic} (nottan: ${note.title})`;
  await insertPlanTask(userId, { date, title, subject: topic.subject, topic: topic.topic, kind: "Tekrar", minutes, planTitle: "Defter g\xF6revleri", planSummary: "Ak\u0131ll\u0131 Defter'deki notlardan olu\u015Fturulan \xE7al\u0131\u015Fma g\xF6revleri." });
  return { date, title: title.slice(0, 180), minutes };
}

// server/notes/questionsDb.ts
async function requireDb3() {
  const db = await getDb();
  if (!db) throw new NoteError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var startOfToday = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
var endOfToday2 = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};
var clean = (value, max) => value?.trim() ? value.trim().slice(0, max) : null;
async function assertAttachment(userId, id8, kind) {
  if (!id8) return;
  const attachment = await getAttachmentStorage().get(userId, id8);
  if (!attachment || attachment.kind !== kind) throw new NoteError(kind === "image" ? "Foto\u011Fraf bulunamad\u0131." : "Ses kayd\u0131 bulunamad\u0131.");
}
async function resolveTopic(db, topicId) {
  if (!topicId) return null;
  const [topic] = await db.select({ id: yksTopics.id, subject: yksTopics.subject, topic: yksTopics.topic }).from(yksTopics).where(eq7(yksTopics.id, topicId)).limit(1);
  if (!topic) throw new NoteError("Se\xE7ilen konu bulunamad\u0131.");
  return topic;
}
function ocrTextOf(content, attachmentId) {
  if (!attachmentId) return null;
  try {
    const doc = JSON.parse(content);
    const image = doc.content.find((node) => node.type === "noteImage" && Number(node.attrs?.attachmentId) === attachmentId);
    return typeof image?.attrs?.ocrText === "string" ? image.attrs.ocrText : null;
  } catch {
    return null;
  }
}
async function createQuestion(userId, input) {
  const db = await requireDb3();
  const [existing] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).innerJoin(notes, eq7(notes.id, notebookQuestions.noteId)).where(and5(eq7(notebookQuestions.userId, userId), eq7(notes.userId, userId), eq7(notes.clientId, input.clientId))).limit(1);
  if (existing) return await getQuestion(userId, existing.id);
  const stuckPoint = clean(input.stuckPoint, 4e3);
  if (!input.questionImageId && !stuckPoint) throw new NoteError("Sorunun foto\u011Fraf\u0131n\u0131 ekle ya da nerede tak\u0131ld\u0131\u011F\u0131n\u0131 yaz.");
  await assertAttachment(userId, input.questionImageId, "image");
  await assertAttachment(userId, input.solutionImageId, "image");
  await assertAttachment(userId, input.voiceAttachmentId, "audio");
  const topic = await resolveTopic(db, input.topicId);
  const subject2 = clean(input.subject, 80) ?? topic?.subject ?? null;
  const now = /* @__PURE__ */ new Date();
  const fields2 = {
    subject: subject2,
    topicId: topic?.id ?? null,
    questionImageId: input.questionImageId ?? null,
    solutionImageId: input.solutionImageId ?? null,
    voiceAttachmentId: input.voiceAttachmentId ?? null,
    voiceDuration: input.voiceAttachmentId ? Math.round(input.voiceDuration ?? 0) : null,
    stuckPoint,
    solutionText: clean(input.solutionText, 4e3),
    errorType: input.errorType ?? null,
    errorTypeSource: input.errorType ? input.errorTypeSource ?? "student" : null,
    difficulty: input.difficulty ?? null
  };
  const saved = await saveNote(userId, {
    clientId: input.clientId,
    title: questionTitle(subject2, topic?.topic ?? null, now),
    content: buildQuestionDoc({ ...fields2, questionOcrText: clean(input.questionOcrText, 5e3) }),
    noteDate: now,
    tags: ["soru"],
    templateKey: QUESTION_TEMPLATE_KEY,
    subject: subject2,
    topicId: topic?.id ?? null,
    bookId: input.bookId ?? null,
    studySessionId: input.studySessionId ?? null
  });
  await db.insert(notebookQuestions).values({ userId, noteId: saved.id, ...fields2, aiTopicId: input.aiTopicId ?? null, nextReviewAt: firstReviewAt(now) }).onConflictDoUpdate({ target: notebookQuestions.noteId, set: fields2 });
  const [row] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).where(and5(eq7(notebookQuestions.userId, userId), eq7(notebookQuestions.noteId, saved.id))).limit(1);
  if (!row) throw new NoteError("Soru kaydedilemedi.");
  return await getQuestion(userId, row.id);
}
async function updateQuestion(userId, id8, patch) {
  const db = await requireDb3();
  const [row] = await db.select().from(notebookQuestions).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamad\u0131.");
  const [note] = await db.select({ clientId: notes.clientId, content: notes.content, noteDate: notes.noteDate, bookId: notes.bookId, studySessionId: notes.studySessionId, isFavorite: notes.isFavorite, isPinned: notes.isPinned }).from(notes).where(and5(eq7(notes.id, row.noteId), eq7(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Soru bulunamad\u0131.");
  if (patch.solutionImageId !== void 0) await assertAttachment(userId, patch.solutionImageId, "image");
  const topicChanged = patch.topicId !== void 0;
  const topic = await resolveTopic(db, topicChanged ? patch.topicId : row.topicId);
  const subject2 = patch.subject !== void 0 ? clean(patch.subject, 80) ?? topic?.subject ?? null : topicChanged && topic ? topic.subject : row.subject;
  const errorType = patch.errorType !== void 0 ? patch.errorType : row.errorType;
  const next = {
    subject: subject2,
    topicId: topic?.id ?? null,
    stuckPoint: patch.stuckPoint !== void 0 ? clean(patch.stuckPoint, 4e3) : row.stuckPoint,
    solutionText: patch.solutionText !== void 0 ? clean(patch.solutionText, 4e3) : row.solutionText,
    solutionImageId: patch.solutionImageId !== void 0 ? patch.solutionImageId : row.solutionImageId,
    errorType,
    errorTypeSource: errorType ? patch.errorType !== void 0 ? patch.errorTypeSource ?? "student" : row.errorTypeSource : null,
    difficulty: patch.difficulty !== void 0 ? patch.difficulty : row.difficulty
  };
  if (!row.questionImageId && !next.stuckPoint) throw new NoteError("Foto\u011Frafs\u0131z bir soruda tak\u0131ld\u0131\u011F\u0131n yer bo\u015F b\u0131rak\u0131lamaz.");
  await saveNote(userId, {
    clientId: note.clientId,
    title: questionTitle(next.subject, topic?.topic ?? null, row.createdAt),
    content: buildQuestionDoc({ ...row, ...next, questionOcrText: ocrTextOf(note.content, row.questionImageId) }),
    noteDate: note.noteDate,
    tags: ["soru"],
    templateKey: QUESTION_TEMPLATE_KEY,
    subject: next.subject,
    topicId: next.topicId,
    bookId: note.bookId,
    studySessionId: note.studySessionId,
    isFavorite: note.isFavorite === 1,
    isPinned: note.isPinned === 1
  });
  await db.update(notebookQuestions).set(next).where(eq7(notebookQuestions.id, id8));
  return await getQuestion(userId, id8);
}
var questionColumns = {
  id: notebookQuestions.id,
  noteId: notebookQuestions.noteId,
  subject: notebookQuestions.subject,
  topicId: notebookQuestions.topicId,
  topic: yksTopics.topic,
  questionImageId: notebookQuestions.questionImageId,
  solutionImageId: notebookQuestions.solutionImageId,
  voiceAttachmentId: notebookQuestions.voiceAttachmentId,
  voiceDuration: notebookQuestions.voiceDuration,
  stuckPoint: notebookQuestions.stuckPoint,
  solutionText: notebookQuestions.solutionText,
  errorType: notebookQuestions.errorType,
  errorTypeSource: notebookQuestions.errorTypeSource,
  difficulty: notebookQuestions.difficulty,
  status: notebookQuestions.status,
  reviewStage: notebookQuestions.reviewStage,
  nextReviewAt: notebookQuestions.nextReviewAt,
  attemptCount: notebookQuestions.attemptCount,
  lastResult: notebookQuestions.lastResult,
  lastAttemptAt: notebookQuestions.lastAttemptAt,
  aiSolution: notebookQuestions.aiSolution,
  aiSolutionAt: notebookQuestions.aiSolutionAt,
  aiSolutionModel: notebookQuestions.aiSolutionModel,
  createdAt: notebookQuestions.createdAt
};
var shape = (row) => ({ ...row, errorType: row.errorType, aiSolution: row.aiSolution ? parseAiSolution(row.aiSolution) : null });
async function getQuestion(userId, id8) {
  const db = await requireDb3();
  const [row] = await db.select(questionColumns).from(notebookQuestions).leftJoin(yksTopics, eq7(yksTopics.id, notebookQuestions.topicId)).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId))).limit(1);
  if (!row) return null;
  const attempts = await db.select({ result: questionAttempts.result, sawSolution: questionAttempts.sawSolution, hintLevel: questionAttempts.hintLevel, attemptedAt: questionAttempts.attemptedAt }).from(questionAttempts).where(and5(eq7(questionAttempts.userId, userId), eq7(questionAttempts.questionId, id8))).orderBy(desc3(questionAttempts.attemptedAt), desc3(questionAttempts.id)).limit(20);
  return { ...shape(row), attempts: attempts.map((attempt) => ({ ...attempt, sawSolution: attempt.sawSolution === 1 })) };
}
async function getSolveContext(userId, id8) {
  const db = await requireDb3();
  const [row] = await db.select({ questionImageId: notebookQuestions.questionImageId, stuckPoint: notebookQuestions.stuckPoint, subject: notebookQuestions.subject, topic: yksTopics.topic, exam: yksTopics.exam, content: notes.content, aiSolution: notebookQuestions.aiSolution, aiSolutionModel: notebookQuestions.aiSolutionModel, difficulty: notebookQuestions.difficulty, lastResult: notebookQuestions.lastResult }).from(notebookQuestions).innerJoin(notes, eq7(notes.id, notebookQuestions.noteId)).leftJoin(yksTopics, eq7(yksTopics.id, notebookQuestions.topicId)).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamad\u0131.");
  return { questionImageId: row.questionImageId, ocrText: ocrTextOf(row.content, row.questionImageId), stuckPoint: row.stuckPoint, subject: row.subject, topic: row.topic, aiSolution: parseAiSolution(row.aiSolution), aiSolutionModel: row.aiSolutionModel, exam: row.exam, difficulty: row.difficulty, lastResult: row.lastResult };
}
async function saveAiSolution(userId, id8, solution, aiSolutionModel = null) {
  const db = await requireDb3();
  const aiSolutionAt = /* @__PURE__ */ new Date();
  await db.update(notebookQuestions).set({ aiSolution: JSON.stringify(solution), aiSolutionAt, aiSolutionModel }).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId)));
  return { aiSolution: solution, aiSolutionAt, aiSolutionModel };
}
async function getQuestionIdByNote(userId, noteId) {
  const db = await requireDb3();
  const [row] = await db.select({ id: notebookQuestions.id }).from(notebookQuestions).where(and5(eq7(notebookQuestions.userId, userId), eq7(notebookQuestions.noteId, noteId))).limit(1);
  return row?.id ?? null;
}
async function listQuestions(userId, filters) {
  const db = await requireDb3();
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);
  const conditions = [eq7(notebookQuestions.userId, userId)];
  if (filters.status === "open" || filters.due) conditions.push(ne2(notebookQuestions.status, "mastered"));
  if (filters.status === "mastered") conditions.push(eq7(notebookQuestions.status, "mastered"));
  if (filters.due) conditions.push(and5(isNotNull2(notebookQuestions.nextReviewAt), lte3(notebookQuestions.nextReviewAt, endOfToday2())));
  conditions.push(...questionSubject(filters.subject));
  if (filters.topicId) conditions.push(eq7(notebookQuestions.topicId, filters.topicId));
  if (!filters.due && filters.cursor) conditions.push(lt4(notebookQuestions.id, filters.cursor));
  const rows = await db.select(questionColumns).from(notebookQuestions).leftJoin(yksTopics, eq7(yksTopics.id, notebookQuestions.topicId)).where(and5(...conditions)).orderBy(...filters.due ? [asc(notebookQuestions.nextReviewAt), asc(notebookQuestions.id)] : [desc3(notebookQuestions.id)]).limit(limit + 1);
  const page2 = rows.slice(0, limit).map(shape);
  return { items: page2, nextCursor: !filters.due && rows.length > limit ? page2[page2.length - 1]?.id ?? null : null };
}
async function deleteQuestion(userId, id8) {
  const db = await requireDb3();
  const [row] = await db.select({ noteId: notebookQuestions.noteId }).from(notebookQuestions).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamad\u0131.");
  await deleteNote(userId, row.noteId);
}
async function recordAttempt(userId, id8, input) {
  const db = await requireDb3();
  const [row] = await db.select({ reviewStage: notebookQuestions.reviewStage }).from(notebookQuestions).where(and5(eq7(notebookQuestions.id, id8), eq7(notebookQuestions.userId, userId))).limit(1);
  if (!row) throw new NoteError("Soru bulunamad\u0131.");
  const now = /* @__PURE__ */ new Date();
  const hintLevel = Math.min(Math.max(Math.round(input.hintLevel ?? 0), 0), HINT_LEVELS.solution);
  const next = scheduleAfterAttempt(row, input.result, input.sawSolution, now, hintLevel);
  await db.insert(questionAttempts).values({ userId, questionId: id8, result: input.result, sawSolution: input.sawSolution ? 1 : 0, hintLevel, seconds: input.seconds ? Math.min(Math.round(input.seconds), 7200) : null, stageBefore: row.reviewStage, attemptedAt: now });
  await db.update(notebookQuestions).set({ ...next, attemptCount: sql5`${notebookQuestions.attemptCount} + 1`, lastResult: input.result, lastAttemptAt: now }).where(eq7(notebookQuestions.id, id8));
  return next;
}
var questionSubject = (subject2) => subject2 === void 0 ? [] : [subject2 === null ? isNull4(notebookQuestions.subject) : eq7(notebookQuestions.subject, subject2)];
async function getErrorMap(userId, days, subject2) {
  const db = await requireDb3();
  const conditions = [eq7(notebookQuestions.userId, userId), ...questionSubject(subject2)];
  if (days) conditions.push(gte4(notebookQuestions.createdAt, new Date(Date.now() - days * 864e5)));
  const rows = await db.select({ subject: notebookQuestions.subject, topicId: notebookQuestions.topicId, topic: yksTopics.topic, errorType: notebookQuestions.errorType, status: notebookQuestions.status }).from(notebookQuestions).leftJoin(yksTopics, eq7(yksTopics.id, notebookQuestions.topicId)).where(and5(...conditions));
  return buildErrorMap(rows.map((row) => ({ ...row, status: row.status })));
}
async function getNotebookPlanSignal(userId) {
  return describeErrorMapForPlan(await getErrorMap(userId, 60));
}
async function todaysReviewTask(db, userId) {
  const [task] = await db.select({ id: studyPlanSessions.id, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes, title: studyPlanSessions.title }).from(studyPlanSessions).where(and5(eq7(studyPlanSessions.userId, userId), eq7(studyPlanSessions.kind, NOTEBOOK_REVIEW_TASK_KIND), gte4(studyPlanSessions.sessionDate, startOfToday()), lte3(studyPlanSessions.sessionDate, endOfToday2()))).orderBy(desc3(studyPlanSessions.id)).limit(1);
  return task ?? null;
}
var dueCondition = () => and5(ne2(notebookQuestions.status, "mastered"), isNotNull2(notebookQuestions.nextReviewAt), lte3(notebookQuestions.nextReviewAt, endOfToday2()));
async function countDue(db, userId, subject2) {
  const [row] = await db.select({ count: sql5`COUNT(*)::int` }).from(notebookQuestions).where(and5(eq7(notebookQuestions.userId, userId), dueCondition(), ...questionSubject(subject2)));
  return Number(row?.count ?? 0);
}
async function getReviewSummary(userId, subject2) {
  const db = await requireDb3();
  const [due, task, totals] = await Promise.all([
    countDue(db, userId, subject2),
    todaysReviewTask(db, userId),
    db.select({ status: notebookQuestions.status, count: sql5`COUNT(*)::int` }).from(notebookQuestions).where(and5(eq7(notebookQuestions.userId, userId), ...questionSubject(subject2))).groupBy(notebookQuestions.status)
  ]);
  const byStatus = Object.fromEntries(totals.map((row) => [row.status, Number(row.count)]));
  const reviewCount = Math.min(due, MAX_QUESTIONS_PER_REVIEW);
  return {
    due,
    reviewCount,
    minutes: reviewTaskMinutes(reviewCount),
    task,
    totals: { unsolved: byStatus.unsolved ?? 0, learning: byStatus.learning ?? 0, mastered: byStatus.mastered ?? 0 }
  };
}
async function addReviewTask(userId) {
  const db = await requireDb3();
  const existing = await todaysReviewTask(db, userId);
  if (existing) return { created: false, task: existing };
  const due = Math.min(await countDue(db, userId), MAX_QUESTIONS_PER_REVIEW);
  if (due === 0) throw new NoteError("Bug\xFCn tekrar bekleyen soru yok.");
  const minutes = reviewTaskMinutes(due);
  const date = await pickDayForTask(userId, minutes, "today");
  await insertPlanTask(userId, { date, title: `\u{1F4D3} Defterim \xB7 ${due} soru tekrar\u0131`, subject: "Defterim", topic: "Soru tekrar\u0131", kind: NOTEBOOK_REVIEW_TASK_KIND, minutes, planTitle: "Defter g\xF6revleri", planSummary: "Ak\u0131ll\u0131 Defter'deki notlardan ve sorulardan olu\u015Fturulan \xE7al\u0131\u015Fma g\xF6revleri." });
  return { created: true, task: await todaysReviewTask(db, userId) };
}
async function finishReviewSession(userId, input) {
  const db = await requireDb3();
  const task = await todaysReviewTask(db, userId);
  if (!task || task.status !== "planned") return { taskCompleted: false };
  const total = input.solved + input.partial + input.failed;
  await db.update(studyPlanSessions).set({ status: "completed", completedAt: /* @__PURE__ */ new Date(), actualMinutes: Math.max(1, Math.round(input.minutes)), actualQuestions: total, correct: input.solved, wrong: input.failed, blank: input.partial }).where(and5(eq7(studyPlanSessions.id, task.id), eq7(studyPlanSessions.userId, userId)));
  return { taskCompleted: true };
}
async function getSubjectSummary(userId) {
  const db = await requireDb3();
  const isQuestion = sql5`(${notes.templateKey} IS NOT DISTINCT FROM ${sql5.raw(`'${QUESTION_TEMPLATE_KEY}'`)})::int`;
  const [noteRows, dueRows] = await Promise.all([
    db.select({ subject: notes.subject, isQuestion, count: sql5`COUNT(*)::int` }).from(notes).where(and5(eq7(notes.userId, userId), eq7(notes.status, "active"))).groupBy(notes.subject, isQuestion),
    db.select({ subject: notebookQuestions.subject, count: sql5`COUNT(*)::int` }).from(notebookQuestions).where(and5(eq7(notebookQuestions.userId, userId), dueCondition())).groupBy(notebookQuestions.subject)
  ]);
  const bySubject = /* @__PURE__ */ new Map();
  const entry = (subject2) => {
    const key = subject2?.trim() || null;
    const found = bySubject.get(key) ?? { subject: key, notes: 0, questions: 0, due: 0 };
    bySubject.set(key, found);
    return found;
  };
  for (const row of noteRows) {
    const item = entry(row.subject);
    if (Number(row.isQuestion) === 1) item.questions += Number(row.count);
    else item.notes += Number(row.count);
  }
  for (const row of dueRows) entry(row.subject).due += Number(row.count);
  return Array.from(bySubject.values());
}
async function moveNoteToSubject(userId, noteId, subject2) {
  const db = await requireDb3();
  const target = clean(subject2, 80);
  const [note] = await db.select({ id: notes.id, topicId: notes.topicId, templateKey: notes.templateKey }).from(notes).where(and5(eq7(notes.id, noteId), eq7(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Not bulunamad\u0131.");
  const topic = note.topicId ? await resolveTopic(db, note.topicId).catch(() => null) : null;
  const keepTopic = Boolean(topic && target && topic.subject === target);
  if (note.templateKey === QUESTION_TEMPLATE_KEY) {
    const questionId = await getQuestionIdByNote(userId, noteId);
    if (questionId) {
      await updateQuestion(userId, questionId, { subject: target, topicId: keepTopic ? topic.id : null });
      return { subject: target };
    }
  }
  await db.update(notes).set({ subject: target, ...keepTopic ? {} : { topicId: null } }).where(and5(eq7(notes.id, noteId), eq7(notes.userId, userId)));
  return { subject: target };
}

// server/digest/teacherDigest.ts
import { and as and9, desc as desc6, eq as eq12, inArray as inArray7, isNotNull as isNotNull3, isNull as isNull7, lt as lt7, or as or2 } from "drizzle-orm";

// shared/org.ts
var ORG_ROLES = ["owner", "admin", "coordinator", "teacher", "student"];
var STAFF_ROLES = ["owner", "admin", "coordinator", "teacher"];
var INVITABLE_ROLES = ["admin", "coordinator", "teacher", "student"];
var ROLE_RANK = { student: 0, teacher: 1, coordinator: 2, admin: 3, owner: 4 };
var ORG_KINDS = ["dershane", "okul", "etut", "kocluk", "diger"];
var CLASS_GRADES = ["7", "8", "9", "10", "11", "12", "Mezun", "\xD6nlisans", "Lisans"];
var YKS_CLASS_TRACKS = ["SAY", "EA", "S\xD6Z", "D\u0130L", "TYT"];
var CLASS_TRACKS = [...YKS_CLASS_TRACKS, ...EXAM_TRACKS.filter((track) => track !== "YKS")];
var CLASS_TRACK_LABELS = { SAY: "Say\u0131sal", EA: "E\u015Fit A\u011F\u0131rl\u0131k", "S\xD6Z": "S\xF6zel", "D\u0130L": "Dil", TYT: "TYT (ortak)", ...EXAM_TRACK_LABELS };
var TEACHER_SUBJECT_GROUPS = [
  { label: "YKS ve ortak dersler", subjects: ["T\xFCrk\xE7e", "Edebiyat", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Co\u011Frafya", "Felsefe", "Din K\xFClt\xFCr\xFC", "\u0130ngilizce"] },
  { label: "LGS", subjects: ["Fen Bilimleri", "\u0130nk\u0131lap Tarihi"] },
  { label: "KPSS ve MEB-AGS", subjects: ["Vatanda\u015Fl\u0131k", "G\xFCncel Bilgiler", "E\u011Fitim Bilimleri", "Mevzuat"] },
  { label: "KPSS A grubu", subjects: ["Hukuk", "\u0130ktisat", "Maliye", "Muhasebe", "\u0130\u015Fletme", "\xC7al\u0131\u015Fma Ekonomisi", "\u0130statistik", "Kamu Y\xF6netimi", "Uluslararas\u0131 \u0130li\u015Fkiler"] },
  { label: "Di\u011Fer", subjects: ["Rehberlik"] }
];
var TEACHER_SUBJECTS = TEACHER_SUBJECT_GROUPS.flatMap((group) => group.subjects);
var isStaffRole = (role) => role !== "student";
var hasRole = (role, minimum) => ROLE_RANK[role] >= ROLE_RANK[minimum];
var seesAllStudents = (role) => hasRole(role, "coordinator");
function canAssignRole(actor, targetCurrent, targetNext) {
  if (!hasRole(actor, "admin")) return false;
  if (targetNext === "owner") return false;
  return ROLE_RANK[targetCurrent] < ROLE_RANK[actor] && ROLE_RANK[targetNext] < ROLE_RANK[actor];
}
function canInviteRole(actor, role) {
  if (role === "student") return hasRole(actor, "teacher");
  return hasRole(actor, "admin") && ROLE_RANK[role] < ROLE_RANK[actor];
}
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateInviteCode(random) {
  let code = "";
  for (let index2 = 0; index2 < 8; index2++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
var normalizeInviteCode = (code) => code.toLocaleUpperCase("en-US").replace(/[^A-Z0-9]/g, "");
function invitationProblem(invitation, now = /* @__PURE__ */ new Date()) {
  if (invitation.revokedAt) return "Bu davet kodu iptal edilmi\u015F.";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "Bu davet kodunun s\xFCresi dolmu\u015F.";
  if (invitation.usedCount >= invitation.maxUses) return "Bu davet kodu kullan\u0131m s\u0131n\u0131r\u0131na ula\u015Fm\u0131\u015F.";
  return null;
}
var ORG_PLANS = ["trial", "standard", "pro"];
var ORG_PLAN_LABELS = { trial: "Deneme", standard: "Standart", pro: "Pro" };
var ORG_PLAN_DEFAULT_CREDITS = { trial: 500, standard: 5e3, pro: 2e4 };
var ORG_PLAN_RANK = { trial: 0, standard: 1, pro: 2 };
function canRequestPlan(current, requested) {
  if (requested === "trial") return false;
  return ORG_PLAN_RANK[requested] >= ORG_PLAN_RANK[current];
}
function renewedMembershipEnd(currentEnd, now = /* @__PURE__ */ new Date(), months = 12) {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? new Date(currentEnd) : new Date(now);
  base.setMonth(base.getMonth() + months);
  return base;
}
var ORG_CREDIT_COSTS = {
  NOTE_VOICE: 1,
  NOTE_OCR: 2,
  NOTE_AI: 2,
  OCR_EXAM_IMPORT: 3,
  OCR_BOOK_IMPORT: 3,
  AI_STUDY_PLAN: 5
};
function membershipState(org, now = /* @__PURE__ */ new Date()) {
  if (org.membershipStartsAt && new Date(org.membershipStartsAt).getTime() > now.getTime()) return "not_started";
  if (org.membershipEndsAt) {
    const end = new Date(org.membershipEndsAt);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < now.getTime()) return "expired";
  }
  return "active";
}
function creditPeriodStart(now = /* @__PURE__ */ new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function creditDecision(input) {
  if (input.monthly <= 0) return { ok: false, reason: "no_pool" };
  if (input.usedByOrg + input.cost > input.monthly) return { ok: false, reason: "pool_empty" };
  if (input.cap !== null && input.usedByStudent + input.cost > input.cap) return { ok: false, reason: "student_cap" };
  return { ok: true };
}
var RISK_RULES = { inactiveDays: 7, lowAdherence: 40, netDrop: 5 };
var RISK_LABELS = { inactive: "7 g\xFCnd\xFCr etkinlik yok", low_adherence: "Plan uyumu d\xFC\u015F\xFCk", net_drop: "Net d\xFC\u015F\xFC\u015F\xFC" };
var DAY = 24 * 60 * 60 * 1e3;
function latestOf(exams, kind) {
  const sorted = exams.filter((exam) => exam.exam === kind).sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
  if (!sorted[0]) return null;
  return { net: sorted[0].net, delta: sorted[1] ? Number((sorted[0].net - sorted[1].net).toFixed(2)) : null, date: sorted[0].examDate };
}
function summarizeStudent(signals, now = /* @__PURE__ */ new Date()) {
  const lastByKind = {};
  for (const kind of EXAM_KINDS) {
    const last = latestOf(signals.exams, kind);
    if (last) lastByKind[kind] = last;
  }
  const lastTyt = lastByKind.TYT ?? null;
  const lastAyt = lastByKind.AYT ?? null;
  const weekMinutes = signals.logs.filter((log) => now.getTime() - log.studyDate.getTime() <= 7 * DAY).reduce((sum, log) => sum + log.minutes, 0);
  const due = signals.weekSessions.filter((session) => new Date(session.sessionDate).getTime() <= now.getTime());
  const adherence = due.length ? calculatePlanAdherence(due).overallScore : null;
  const lastLog = signals.logs.reduce((latest, log) => !latest || log.studyDate > latest ? log.studyDate : latest, null);
  const candidates = [lastLog, signals.lastSignedIn].filter((value) => Boolean(value));
  const lastActivityAt = candidates.length ? new Date(Math.max(...candidates.map((value) => value.getTime()))) : null;
  const risks = [];
  if (!lastActivityAt || now.getTime() - lastActivityAt.getTime() > RISK_RULES.inactiveDays * DAY) risks.push("inactive");
  if (adherence !== null && adherence < RISK_RULES.lowAdherence) risks.push("low_adherence");
  if (Object.values(lastByKind).some((exam) => exam.delta !== null && exam.delta <= -RISK_RULES.netDrop)) risks.push("net_drop");
  return { lastTyt, lastAyt, lastByKind, weekMinutes, adherence, plannedThisWeek: due.length, weakTopicCount: signals.weakTopicCount, lastActivityAt, risks };
}

// shared/teacherDigest.ts
var MAX_FOLLOW_UPS = 10;
var MAX_SUGGESTIONS = 10;
function buildTeacherDigest(students, academic = null) {
  const total = students.length;
  const activeCount = students.filter((student) => student.summary.weekMinutes > 0).length;
  const totalMinutes = students.reduce((sum, student) => sum + student.summary.weekMinutes, 0);
  const adherences = students.map((student) => student.summary.adherence).filter((value) => value !== null);
  const averageAdherence = adherences.length ? Math.round(adherences.reduce((sum, value) => sum + value, 0) / adherences.length) : null;
  const followUps = students.filter((student) => student.summary.risks.length > 0).sort((a, b) => b.summary.risks.length - a.summary.risks.length || a.summary.weekMinutes - b.summary.weekMinutes).slice(0, MAX_FOLLOW_UPS).map((student) => ({ name: student.name, reasons: student.summary.risks.map((risk) => RISK_LABELS[risk]) }));
  const topStudents = students.filter((student) => student.summary.weekMinutes > 0).sort((a, b) => b.summary.weekMinutes - a.summary.weekMinutes).slice(0, 3).map((student) => ({ name: student.name, minutes: student.summary.weekMinutes }));
  const followUpCount = students.filter((student) => student.summary.risks.length > 0).length;
  const headline = total === 0 ? "Hen\xFCz takip etti\u011Fin \xF6\u011Frenci yok." : followUpCount === 0 ? `Bu hafta ${total} \xF6\u011Frencinin ${activeCount}'i \xE7al\u0131\u015Ft\u0131; takip gerektiren \xF6\u011Frenci yok.` : `Bu hafta ${total} \xF6\u011Frencinin ${activeCount}'i \xE7al\u0131\u015Ft\u0131; ${followUpCount} \xF6\u011Frenci takip bekliyor.`;
  const academicPart = academic && (academic.suggestions.length || academic.openCases) ? { ...academic, suggestions: academic.suggestions.slice(0, MAX_SUGGESTIONS) } : null;
  return { total, activeCount, totalMinutes, averageAdherence, followUps, topStudents, headline, academic: academicPart };
}

// server/_core/emails/teacherDigestEmail.ts
var escapeHtml3 = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function buildTeacherDigestEmail({ to, name: name2, orgName, digest, rangeLabel: rangeLabel2, panelUrl, unsubscribeUrl, casesUrl }) {
  const academic = digest.academic;
  const academicLines = academic ? [
    "",
    "Akademik takip:",
    ...academic.suggestions.length ? [`${academic.suggestions.length} yeni inceleme \xF6nerisi:`, ...academic.suggestions.map((item) => `\u2022 ${item.name}: ${item.description}`)] : [],
    `A\xE7\u0131k takip dosyalar\u0131n: ${academic.openCases}${academic.staleCases ? ` (${academic.staleCases} dosya 7 g\xFCnden uzun s\xFCredir i\u015Flem bekliyor)` : ""}`,
    ...casesUrl ? [`Akademik takip: ${casesUrl}`] : []
  ] : [];
  const greeting = name2 ? `Merhaba ${name2},` : "Merhaba,";
  const subject2 = `${orgName} \xB7 haftal\u0131k s\u0131n\u0131f \xF6zeti \xB7 ${rangeLabel2}`;
  const stats = [
    ["Bu hafta \xE7al\u0131\u015Fan", `${digest.activeCount} / ${digest.total}`],
    ["Toplam \xE7al\u0131\u015Fma", formatMinutes(digest.totalMinutes)],
    ["Ortalama plan uyumu", digest.averageAdherence !== null ? `%${digest.averageAdherence}` : "\u2014"],
    ["Takip bekleyen", String(digest.followUps.length)]
  ];
  const text4 = [
    greeting,
    "",
    `${orgName} \xB7 ${rangeLabel2}: ${digest.headline}`,
    "",
    ...stats.map(([label, value]) => `\u2022 ${label}: ${value}`),
    ...digest.followUps.length ? ["", "Takip bekleyen \xF6\u011Frenciler:", ...digest.followUps.map((student) => `\u2022 ${student.name}: ${student.reasons.join(", ")}`)] : [],
    ...digest.topStudents.length ? ["", "Haftan\u0131n en \xE7ok \xE7al\u0131\u015Fanlar\u0131:", ...digest.topStudents.map((student) => `\u2022 ${student.name} (${formatMinutes(student.minutes)})`)] : [],
    ...academicLines,
    "",
    `Kurum Paneli: ${panelUrl}`,
    "",
    `Bu \xF6zeti her pazar al\u0131yorsun. Almak istemiyorsan: ${unsubscribeUrl}`,
    "\u2014 Pusula YKS \xB7 Kurum Paneli"
  ].join("\n");
  const statCell = ([label, value]) => `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml3(label)}</div><div style="margin-top:4px;font-size:18px;font-weight:700;color:#18202a;">${escapeHtml3(value)}</div></td>`;
  const followRows = digest.followUps.map((student) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;font-weight:600;color:#18202a;">${escapeHtml3(student.name)}</td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:12px;color:#b42318;">${escapeHtml3(student.reasons.join(" \xB7 "))}</td></tr>`).join("");
  const topRows = digest.topStudents.map((student) => `<tr><td style="padding:6px 0;font-size:14px;color:#18202a;">${escapeHtml3(student.name)}</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#17625f;">${escapeHtml3(formatMinutes(student.minutes))}</td></tr>`).join("");
  const academicHtml = academic ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Akademik takip</div>
        ${academic.suggestions.length ? `<p style="margin:0 0 6px 0;font-size:13px;color:#3f4852;">${academic.suggestions.length} yeni inceleme \xF6nerisi (te\u015Fhis de\u011Fildir; incelemek sana kalm\u0131\u015F):</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${academic.suggestions.map((item) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;font-weight:600;color:#18202a;">${escapeHtml3(item.name)}</td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:12px;color:#9a6400;">${escapeHtml3(item.description)}</td></tr>`).join("")}</table>` : ""}
        <p style="margin:10px 0 0 0;font-size:13px;color:#3f4852;">A\xE7\u0131k takip dosyalar\u0131n: <b>${academic.openCases}</b>${academic.staleCases ? ` \xB7 7 g\xFCnden uzun s\xFCredir i\u015Flem bekleyen: <b>${academic.staleCases}</b>` : ""}${casesUrl ? ` \xB7 <a href="${escapeHtml3(casesUrl)}" style="color:#17625f;">Akademik takibi a\xE7</a>` : ""}</p>` : "";
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml3(subject2)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml3(digest.headline)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#17625f;color:#ffffff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">P</td>
          <td style="padding-left:10px;font-size:15px;font-weight:700;color:#18202a;">${escapeHtml3(orgName)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:28px 22px;border:1px solid #e6ebe9;">
        <div style="font-size:13px;font-weight:600;color:#17625f;">Haftal\u0131k s\u0131n\u0131f \xF6zeti \xB7 ${escapeHtml3(rangeLabel2)}</div>
        <h1 style="margin:6px 0 10px 0;font-size:21px;line-height:1.3;font-weight:700;color:#18202a;">${escapeHtml3(digest.headline)}</h1>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4852;">${escapeHtml3(greeting)} takip etti\u011Fin \xF6\u011Frencilerin ge\xE7en yedi g\xFCn\xFC a\u015Fa\u011F\u0131da.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;width:calc(100% + 16px);">
          <tr>${statCell(stats[0])}${statCell(stats[1])}</tr>
          <tr>${statCell(stats[2])}${statCell(stats[3])}</tr>
        </table>
        ${followRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Takip bekleyen \xF6\u011Frenciler</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${followRows}</table>` : ""}
        ${topRows ? `<div style="margin:22px 0 4px 0;font-size:14px;font-weight:700;color:#18202a;">Haftan\u0131n en \xE7ok \xE7al\u0131\u015Fanlar\u0131</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topRows}</table>` : ""}
        ${academicHtml}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;"><tr><td align="center">
          <a href="${escapeHtml3(panelUrl)}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">Kurum Paneli'ni a\xE7</a>
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">Pusula YKS \xB7 Kurum Paneli<br>Bu \xF6zeti her pazar al\u0131yorsun. <a href="${escapeHtml3(unsubscribeUrl)}" style="color:#7c858e;">Almak istemiyorum</a></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  return { to, subject: subject2, html, text: text4 };
}

// server/org/caseDb.ts
import { and as and8, desc as desc5, eq as eq11, gte as gte6, inArray as inArray6, isNull as isNull6, lt as lt6, sql as sql7 } from "drizzle-orm";

// shared/academicCase.ts
var ACADEMIC_CASE_RULES = {
  /** Karşılaştırılan son deneme sayısı. */
  examsCompared: 3,
  /** Son denemeler en fazla bu kadar gün içine yayılmış olmalı. */
  windowDays: 75,
  /** Toplam düşüş eşiği (net). Sınav türünde tanım yoksa varsayılan. */
  minTotalDrop: { default: 5, LGS: 3 },
  /** Hazırlık dönemi bu ayda başlar (0 = Ocak; 7 = Ağustos): Ağustos–Temmuz arası aynı dönem. */
  seasonStartMonth: 7
};
var DAY2 = 24 * 60 * 60 * 1e3;
var normalizePublisher = (value) => (value ?? "").trim().toLocaleLowerCase("tr").replace(/\s+yay[ıi]nlar[ıi]$/, "").replace(/\s+/g, " ") || null;
var round2 = (value) => Math.round(value * 100) / 100;
function seasonOf(date, rules = ACADEMIC_CASE_RULES) {
  return date.getMonth() >= rules.seasonStartMonth ? date.getFullYear() : date.getFullYear() - 1;
}
var minTotalDropFor = (kind, rules = ACADEMIC_CASE_RULES) => rules.minTotalDrop[kind] ?? rules.minTotalDrop.default ?? 5;
function comparabilityKey(exam) {
  return [exam.examKind, exam.scope ?? "full", normalizePublisher(exam.publisher) ?? "*"].join("|");
}
function trendDecline(exams, examKind2, rules = ACADEMIC_CASE_RULES) {
  const recent = exams.filter((exam) => exam.examKind === examKind2 && exam.scope !== "branch" && Number.isFinite(exam.net)).sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id).slice(0, rules.examsCompared).reverse();
  const evidence = recent.map(({ id: id8, date, net }) => ({ id: id8, date, net }));
  if (recent.length < rules.examsCompared) return { status: "insufficient", examKind: examKind2, reason: "not_enough_exams", evidence };
  if (recent.at(-1).date.getTime() - recent[0].date.getTime() > rules.windowDays * DAY2) return { status: "insufficient", examKind: examKind2, reason: "too_spread_out", evidence };
  if (new Set(recent.map((exam) => seasonOf(exam.date, rules))).size > 1) return { status: "insufficient", examKind: examKind2, reason: "different_season", evidence };
  const publishers2 = new Set(recent.map((exam) => normalizePublisher(exam.publisher)).filter((value) => Boolean(value)));
  if (publishers2.size > 1) return { status: "insufficient", examKind: examKind2, reason: "mixed_publishers", evidence };
  const steps = recent.slice(1).map((exam, index2) => round2(exam.net - recent[index2].net));
  const totalChange = round2(recent.at(-1).net - recent[0].net);
  const declining = steps.every((step) => step <= 0) && -totalChange >= minTotalDropFor(examKind2, rules);
  if (!declining) return { status: "no_signal", examKind: examKind2, evidence, totalChange, steps };
  const allKnown = recent.every((exam) => normalizePublisher(exam.publisher));
  const confidence = recent.every((exam) => exam.source === "org") && allKnown ? "high" : "medium";
  return { status: "signal", examKind: examKind2, confidence, evidence, totalChange, steps };
}
function trendSignals(exams, rules = ACADEMIC_CASE_RULES) {
  const kinds = Array.from(new Set(exams.map((exam) => exam.examKind)));
  return kinds.map((kind) => trendDecline(exams, kind, rules));
}
var ACADEMIC_REVIEW_TITLE = "Akademik inceleme \xF6nerisi";
var ACADEMIC_REVIEW_TEXT = "\xD6\u011Frencinin son \xFC\xE7 kar\u015F\u0131la\u015Ft\u0131r\u0131labilir denemesinde netleri d\xFC\u015F\xFC\u015F e\u011Filimindedir. \xC7al\u0131\u015Fma kay\u0131tlar\u0131 ve ders bazl\u0131 sonu\xE7lar incelenerek rehberlik g\xF6r\xFC\u015Fmesi de\u011Ferlendirilmesi \xF6nerilir.";
var INSUFFICIENT_REASON_TEXT = {
  not_enough_exams: "Kar\u015F\u0131la\u015Ft\u0131rma i\xE7in bu s\u0131nav t\xFCr\xFCnde en az \xFC\xE7 tam deneme gerekli.",
  mixed_publishers: "Son denemeler farkl\u0131 yay\u0131nevlerine ait; netler do\u011Frudan kar\u015F\u0131la\u015Ft\u0131r\u0131lamaz.",
  different_season: "Son denemeler farkl\u0131 haz\u0131rl\u0131k d\xF6nemlerine ait.",
  too_spread_out: "Son denemeler aras\u0131nda \xE7ok uzun s\xFCre var; e\u011Filim g\xFCvenilir de\u011Fil."
};
var CONFIDENCE_TEXT = {
  high: "Y\xFCksek g\xFCven: kurumdan aktar\u0131lan, ayn\u0131 yay\u0131nevine ait denemeler.",
  medium: "Orta g\xFCven: denemelerin bir k\u0131sm\u0131 \xF6\u011Frencinin kendi giri\u015Fi ya da yay\u0131nevi bilinmiyor."
};
function describeTrend(result) {
  const label = EXAM_KIND_DEFS[result.examKind]?.label ?? result.examKind;
  const chain = result.evidence.map((exam) => String(round2(exam.net)).replace(".", ",")).join(" \u2192 ");
  if (result.status === "insufficient") return `${label}: inceleme i\xE7in yetersiz veri. ${INSUFFICIENT_REASON_TEXT[result.reason]}`;
  const change = String(Math.abs(result.totalChange)).replace(".", ",");
  return `${label}: ${chain} (${result.totalChange < 0 ? "\u2212" : "+"}${change} net)`;
}

// shared/classSchedule.ts
var SCHEDULE_SOURCES = ["school", "course", "tutor", "other"];
var DAY_LABELS = ["Pazartesi", "Sal\u0131", "\xC7ar\u015Famba", "Per\u015Fembe", "Cuma", "Cumartesi", "Pazar"];
var YKS_SUBJECTS = ["T\xFCrk\xE7e", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Edebiyat", "Tarih", "Co\u011Frafya", "Felsefe"];
var NON_YKS_PRESETS = ["Din K\xFClt\xFCr\xFC", "Yabanc\u0131 Dil", "Rehberlik", "Beden E\u011Fitimi", "Sanat / M\xFCzik", "Di\u011Fer ders"];
var LGS_SUBJECTS = ["T\xFCrk\xE7e", "Matematik", "Fen Bilimleri", "\u0130nk\u0131lap Tarihi", "Din K\xFClt\xFCr\xFC", "\u0130ngilizce"];
var NON_LGS_PRESETS = ["Teknoloji ve Tasar\u0131m", "Bili\u015Fim Teknolojileri", "Rehberlik", "Beden E\u011Fitimi", "Sanat / M\xFCzik", "Di\u011Fer ders"];
var SCHEDULE_SUBJECTS_BY_TRACK = {
  YKS: { subjects: YKS_SUBJECTS, nonExamPresets: NON_YKS_PRESETS },
  LGS: { subjects: LGS_SUBJECTS, nonExamPresets: NON_LGS_PRESETS },
  // Yetişkin adaylar: programdaki bloklar çoğunlukla iş/kurs saatleri; ders olarak KPSS dersleri.
  KPSS: { subjects: ["T\xFCrk\xE7e", "Matematik", "Tarih", "Co\u011Frafya", "Vatanda\u015Fl\u0131k", "G\xFCncel Bilgiler"], nonExamPresets: ["\u0130\u015F", "Kurs / dershane", "\xDCniversite dersi", "Di\u011Fer"] },
  DGS: { subjects: ["Say\u0131sal", "S\xF6zel"], nonExamPresets: ["\xD6nlisans dersi", "\u0130\u015F", "Kurs / dershane", "Di\u011Fer"] },
  MEB_AGS: { subjects: ["E\u011Fitim Bilimleri", "S\xF6zel Yetenek", "Say\u0131sal Yetenek", "Mevzuat", "Tarih", "T\xFCrkiye Co\u011Frafyas\u0131"], nonExamPresets: ["\xDCniversite dersi", "Staj / okul uygulamas\u0131", "\u0130\u015F", "Kurs / dershane", "Di\u011Fer"] },
  KPSS_A: { subjects: ["Hukuk", "\u0130ktisat", "Maliye", "Muhasebe", "\u0130\u015Fletme", "\xC7al\u0131\u015Fma Ekonomisi", "\u0130statistik", "Kamu Y\xF6netimi", "Uluslararas\u0131 \u0130li\u015Fkiler"], nonExamPresets: ["\u0130\u015F", "Kurs / dershane", "Di\u011Fer"] }
};
var SCHEDULE_SUBJECTS = Array.from(new Set(Object.values(SCHEDULE_SUBJECTS_BY_TRACK).flatMap((entry) => entry.subjects)));
var scheduleSubjectsFor = (track) => SCHEDULE_SUBJECTS_BY_TRACK[track].subjects;
var nonExamPresetsFor = (track) => SCHEDULE_SUBJECTS_BY_TRACK[track].nonExamPresets;
var AFTER_CLASS_BUFFER_MINUTES = 30;
var PLAN_DAY_END = "23:30";
var MAX_SCHEDULE_BLOCKS = 120;
var MAX_SCHOOL_PERIODS = 12;
var DEFAULT_SCHOOL_PERIODS = [
  { start: "08:30", end: "09:10" },
  { start: "09:20", end: "10:00" },
  { start: "10:10", end: "10:50" },
  { start: "11:00", end: "11:40" },
  { start: "13:00", end: "13:40" },
  { start: "13:50", end: "14:30" },
  { start: "14:40", end: "15:20" },
  { start: "15:30", end: "16:10" }
];
var TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
var isValidTime = (value) => TIME_PATTERN.test(value);
var toMinutes = (value) => {
  const match = TIME_PATTERN.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};
var fromMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
var weekdayOf = (date) => (date.getDay() + 6) % 7 + 1;
var isYksBlock = (block) => block.subject !== null;
function blocksOn(blocks, date) {
  const day2 = weekdayOf(date);
  return blocks.filter((block) => block.dayOfWeek === day2).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}
function validateSchedule(schedule) {
  for (const period of schedule.periods) {
    if (!isValidTime(period.start) || !isValidTime(period.end) || toMinutes(period.start) >= toMinutes(period.end)) return `Ders saati ${period.start}\u2013${period.end} ge\xE7ersiz: ba\u015Flang\u0131\xE7 biti\u015Ften \xF6nce olmal\u0131.`;
  }
  for (const block of schedule.blocks) {
    if (!isValidTime(block.startTime) || !isValidTime(block.endTime) || toMinutes(block.startTime) >= toMinutes(block.endTime)) return `${block.label} (${block.startTime}\u2013${block.endTime}) ge\xE7ersiz: ba\u015Flang\u0131\xE7 biti\u015Ften \xF6nce olmal\u0131.`;
  }
  for (let day2 = 1; day2 <= 7; day2++) {
    const sorted = schedule.blocks.filter((block) => block.dayOfWeek === day2).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let index2 = 1; index2 < sorted.length; index2++) {
      const previous = sorted[index2 - 1];
      const current = sorted[index2];
      if (toMinutes(current.startTime) < toMinutes(previous.endTime)) return `${DAY_LABELS[day2 - 1]}: ${previous.label} (${previous.startTime}\u2013${previous.endTime}) ile ${current.label} (${current.startTime}\u2013${current.endTime}) \xE7ak\u0131\u015F\u0131yor.`;
    }
  }
  return null;
}
function computeFreeSlots(blocks, date, options) {
  const from = toMinutes(options.from);
  const to = toMinutes(options.to ?? PLAN_DAY_END);
  const buffer = options.buffer ?? AFTER_CLASS_BUFFER_MINUTES;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return [];
  const busy = blocksOn(blocks, date).map((block) => ({ start: toMinutes(block.startTime), end: toMinutes(block.endTime) + buffer }));
  const slots = [];
  let cursor = from;
  for (const interval of busy) {
    if (interval.end <= cursor) continue;
    if (interval.start > cursor) slots.push({ start: cursor, end: Math.min(interval.start, to) });
    cursor = Math.max(cursor, interval.end);
    if (cursor >= to) break;
  }
  if (cursor < to) slots.push({ start: cursor, end: to });
  return slots.filter((slot) => slot.end > slot.start);
}
var freeMinutes = (slots) => slots.reduce((sum, slot) => sum + slot.end - slot.start, 0);
function describeWeekForPlan(blocks, weekStart, from) {
  if (blocks.length === 0) return null;
  const lines = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const slots = computeFreeSlots(blocks, date, { from });
    const subjects = Array.from(new Set(blocksOn(blocks, date).filter(isYksBlock).map((block) => block.subject)));
    const slotText = slots.filter((slot) => slot.end - slot.start >= 30).map((slot) => `${fromMinutes(slot.start)}\u2013${fromMinutes(slot.end)}`).join(", ") || "yok";
    const isoDate2 = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    lines.push(`${DAY_LABELS[weekdayOf(date) - 1]} (${isoDate2}): bo\u015F zaman ${freeMinutes(slots)} dk (${slotText})${subjects.length ? `; okulda/dershanede i\u015Flenen dersler: ${subjects.join(", ")}` : ""}`);
  }
  return lines.join("\n");
}

// shared/planPlacement.ts
var TASK_EARLIEST = "08:00";
var TASK_GAP_MINUTES = 10;
var sameLocalDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function busyOn(date, input) {
  const fromBlocks = (blocks, kind) => blocksOn(blocks, date).map((block) => ({ start: toMinutes(block.startTime), end: toMinutes(block.endTime), label: block.label, kind }));
  const sessions = (input.sessions ?? []).filter((session) => (session.status ?? "planned") === "planned").map((session) => ({ session, at: new Date(session.sessionDate) })).filter(({ at }) => sameLocalDay(at, date)).map(({ session, at }) => {
    const start = at.getHours() * 60 + at.getMinutes();
    return { start, end: start + Math.max(0, session.plannedMinutes), label: session.title?.trim() || "Planl\u0131 \xE7al\u0131\u015Fma", kind: "session" };
  });
  return [...fromBlocks(input.blocks, "class"), ...fromBlocks(input.courseBlocks ?? [], "course"), ...sessions].sort((a, b) => a.start - b.start || a.end - b.end);
}
function findTaskConflict(busy, start, minutes) {
  const end = start + minutes;
  return busy.find((interval) => start < interval.end && end > interval.start) ?? null;
}
function suggestStart(busy, minutes, options = {}) {
  const gap = options.gap ?? TASK_GAP_MINUTES;
  const to = options.to ?? toMinutes(PLAN_DAY_END);
  let cursor = options.from ?? toMinutes(TASK_EARLIEST);
  for (const interval of busy) {
    if (cursor + minutes + gap <= interval.start) break;
    cursor = Math.max(cursor, interval.end + gap);
  }
  return cursor + minutes <= to ? cursor : null;
}
function placePlanItems(items, from, days, busyFor, options = {}) {
  const perDay = options.perDay ?? 1;
  const earliest = toMinutes(options.earliest ?? TASK_EARLIEST);
  const latest = toMinutes(options.latest ?? PLAN_DAY_END);
  const dates = Array.from({ length: Math.max(1, days) }, (_, offset) => {
    const date = new Date(from);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  });
  const placedByDay = dates.map(() => []);
  let dayCursor = 0;
  return items.map((item, index2) => {
    for (let attempt = 0; attempt < dates.length; attempt += 1) {
      const dayIndex = (dayCursor + attempt) % dates.length;
      if (placedByDay[dayIndex].length >= perDay) continue;
      const busy = [...busyFor(dates[dayIndex]), ...placedByDay[dayIndex]].sort((a, b) => a.start - b.start);
      const start = suggestStart(busy, item.minutes, { from: earliest, to: latest, gap: options.gap });
      if (start === null) continue;
      placedByDay[dayIndex].push({ start, end: start + item.minutes, label: "Yeni g\xF6rev", kind: "session" });
      dayCursor = dayIndex + 1;
      return { index: index2, date: dates[dayIndex], start };
    }
    return { index: index2, date: null, reason: "no_slot" };
  });
}
var describeInterval = (interval) => `${interval.label} (${fromMinutes(interval.start)}\u2013${fromMinutes(interval.end)})`;

// server/push/push.ts
import { and as and6, eq as eq8, inArray as inArray4 } from "drizzle-orm";
import webpush from "web-push";
var publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
var privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
var subject = process.env.VAPID_SUBJECT || process.env.APP_URL || "https://yks-study-coach.vercel.app";
var pushConfigured = () => Boolean(publicKey && privateKey);
var pushPublicKey = () => pushConfigured() ? publicKey : null;
var vapidSet = false;
var ensureVapid = () => {
  if (!vapidSet) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidSet = true;
  }
};
async function saveSubscription(userId, subscription, userAgent) {
  const db = await getDb();
  if (!db) return;
  const values = { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null };
  await db.insert(pushSubscriptions).values(values).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: values.p256dh, auth: values.auth, userAgent: values.userAgent } });
}
async function removeSubscription(userId, endpoint) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and6(eq8(pushSubscriptions.userId, userId), eq8(pushSubscriptions.endpoint, endpoint)));
}
async function hasSubscription(userId, endpoint) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(and6(eq8(pushSubscriptions.userId, userId), eq8(pushSubscriptions.endpoint, endpoint))).limit(1);
  return rows.length > 0;
}
async function sendToUser(userId, payload) {
  const result = { delivered: 0, removed: 0, failed: 0 };
  const db = await getDb();
  if (!db || !pushConfigured()) return result;
  ensureVapid();
  const subscriptions2 = await db.select().from(pushSubscriptions).where(eq8(pushSubscriptions.userId, userId));
  const gone = [];
  const delivered = [];
  await Promise.all(subscriptions2.map(async (row) => {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 15 * 60, urgency: "high" });
      delivered.push(row.id);
    } catch (error) {
      const status = error.statusCode;
      if (status === 404 || status === 410) gone.push(row.id);
      else {
        result.failed++;
        console.error(`[Push] subscription ${row.id} failed (${status ?? "?"}):`, error instanceof Error ? error.message : error);
      }
    }
  }));
  if (gone.length) await db.delete(pushSubscriptions).where(inArray4(pushSubscriptions.id, gone));
  if (delivered.length) await db.update(pushSubscriptions).set({ lastSentAt: /* @__PURE__ */ new Date() }).where(inArray4(pushSubscriptions.id, delivered));
  result.delivered = delivered.length;
  result.removed = gone.length;
  return result;
}

// server/schedule/classScheduleDb.ts
import { asc as asc2, eq as eq10 } from "drizzle-orm";

// server/org/orgDb.ts
import { and as and7, desc as desc4, eq as eq9, gte as gte5, inArray as inArray5, isNull as isNull5, lt as lt5, sql as sql6 } from "drizzle-orm";
var OrgError = class extends Error {
};
async function requireDb4() {
  const db = await getDb();
  if (!db) throw new OrgError("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  return db;
}
var membershipColumns = { orgId: organizationMembers.orgId, orgName: organizations.name, role: organizationMembers.role, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt };
var toMembership = (row) => ({ orgId: row.orgId, orgName: row.orgName, role: row.role, state: membershipState(row) });
async function getActiveMembership(userId, orgId) {
  const db = await requireDb4();
  const [row] = await db.select(membershipColumns).from(organizationMembers).innerJoin(organizations, eq9(organizations.id, organizationMembers.orgId)).where(and7(eq9(organizationMembers.userId, userId), eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.status, "active"), eq9(organizations.status, "active"))).limit(1);
  return row ? toMembership(row) : null;
}
async function listMyMemberships(userId) {
  const db = await requireDb4();
  const rows = await db.select({ ...membershipColumns, kvkkVersion: organizationMembers.kvkkVersion, consentAt: organizationMembers.consentAt }).from(organizationMembers).innerJoin(organizations, eq9(organizations.id, organizationMembers.orgId)).where(and7(eq9(organizationMembers.userId, userId), eq9(organizationMembers.status, "active"), eq9(organizations.status, "active")));
  return rows.map((row) => ({ ...toMembership(row), kvkkVersion: row.kvkkVersion, consentAt: row.consentAt }));
}
async function teacherStudentIds(orgId, teacherUserId) {
  const db = await requireDb4();
  const [assigned, advised] = await Promise.all([
    db.select({ studentUserId: teacherAssignments.studentUserId }).from(teacherAssignments).where(and7(eq9(teacherAssignments.orgId, orgId), eq9(teacherAssignments.teacherUserId, teacherUserId), eq9(teacherAssignments.active, 1))),
    db.select({ studentUserId: classStudents.studentUserId }).from(classStudents).innerJoin(organizationClasses, eq9(organizationClasses.id, classStudents.classId)).where(and7(eq9(organizationClasses.orgId, orgId), eq9(organizationClasses.advisorUserId, teacherUserId)))
  ]);
  return Array.from(new Set([...assigned, ...advised].map((row) => row.studentUserId)));
}
async function hasActiveAssignment(orgId, teacherUserId, studentUserId) {
  return (await teacherStudentIds(orgId, teacherUserId)).includes(studentUserId);
}
async function isActiveStudent(orgId, studentUserId) {
  const db = await requireDb4();
  const [row] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.userId, studentUserId), eq9(organizationMembers.role, "student"), eq9(organizationMembers.status, "active"))).limit(1);
  return Boolean(row);
}
async function listMembers(orgId, options = {}) {
  const db = await requireDb4();
  const conditions = [eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.status, "active")];
  if (options.role) conditions.push(eq9(organizationMembers.role, options.role));
  if (options.teacherUserId) {
    const visible = await teacherStudentIds(orgId, options.teacherUserId);
    if (!visible.length) return [];
    conditions.push(inArray5(organizationMembers.userId, visible));
  }
  const rows = await db.select({ userId: organizationMembers.userId, preferredName: studentProfiles.preferredName, name: users.name, email: users.email, role: organizationMembers.role, subject: organizationMembers.subject, joinedAt: organizationMembers.joinedAt, consentAt: organizationMembers.consentAt, lastSignedIn: users.lastSignedIn }).from(organizationMembers).innerJoin(users, eq9(users.id, organizationMembers.userId)).leftJoin(studentProfiles, eq9(studentProfiles.userId, organizationMembers.userId)).where(and7(...conditions)).orderBy(users.name);
  return rows.map((row) => ({ userId: row.userId, name: row.preferredName || row.name || "\u0130simsiz", email: row.email, role: row.role, subject: row.subject, joinedAt: row.joinedAt, consentAt: row.consentAt, lastSignedIn: row.lastSignedIn }));
}
async function getMemberRole(orgId, userId) {
  const db = await requireDb4();
  const [row] = await db.select({ role: organizationMembers.role }).from(organizationMembers).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.userId, userId), eq9(organizationMembers.status, "active"))).limit(1);
  return row?.role ?? null;
}
async function setMemberRole(orgId, userId, role) {
  const db = await requireDb4();
  await db.update(organizationMembers).set({ role }).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.userId, userId), eq9(organizationMembers.status, "active")));
}
async function setMemberSubject(orgId, userId, subject2) {
  const db = await requireDb4();
  const result = await db.update(organizationMembers).set({ subject: subject2 }).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.userId, userId), eq9(organizationMembers.status, "active"), sql6`${organizationMembers.role} <> 'student'`)).returning();
  return result.length > 0;
}
async function endMembership(orgId, userId, status) {
  const db = await requireDb4();
  await db.update(organizationMembers).set({ status, leftAt: /* @__PURE__ */ new Date() }).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.userId, userId), eq9(organizationMembers.status, "active")));
  await db.update(teacherAssignments).set({ active: 0 }).where(and7(eq9(teacherAssignments.orgId, orgId), sql6`(${teacherAssignments.studentUserId} = ${userId} OR ${teacherAssignments.teacherUserId} = ${userId})`));
  const classes = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(eq9(organizationClasses.orgId, orgId));
  if (classes.length) await db.delete(classStudents).where(and7(eq9(classStudents.studentUserId, userId), inArray5(classStudents.classId, classes.map((row) => row.id))));
  await db.update(organizationClasses).set({ advisorUserId: null }).where(and7(eq9(organizationClasses.orgId, orgId), eq9(organizationClasses.advisorUserId, userId)));
  await db.update(classTimetableSlots).set({ teacherUserId: null }).where(and7(eq9(classTimetableSlots.orgId, orgId), eq9(classTimetableSlots.teacherUserId, userId)));
}
async function listUserOrgMemberships(userId) {
  const db = await requireDb4();
  return db.select({ orgId: organizations.id, orgName: organizations.name, orgStatus: organizations.status, role: organizationMembers.role, status: organizationMembers.status, subject: organizationMembers.subject, joinedAt: organizationMembers.joinedAt, leftAt: organizationMembers.leftAt }).from(organizationMembers).innerJoin(organizations, eq9(organizations.id, organizationMembers.orgId)).where(eq9(organizationMembers.userId, userId)).orderBy(desc4(organizationMembers.joinedAt));
}
async function findUserByEmail(email) {
  const db = await requireDb4();
  const [row] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(sql6`lower(${users.email}) = ${email.trim().toLocaleLowerCase("en-US")}`).limit(1);
  return row ?? null;
}
async function countActiveOrgAdmins(orgId) {
  const db = await requireDb4();
  const [row] = await db.select({ count: sql6`count(*)::int` }).from(organizationMembers).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.status, "active"), inArray5(organizationMembers.role, ["owner", "admin"])));
  return Number(row?.count ?? 0);
}
async function addStaffMember(input) {
  const db = await requireDb4();
  const now = /* @__PURE__ */ new Date();
  await db.insert(organizationMembers).values({ orgId: input.orgId, userId: input.userId, role: input.role, status: "active", subject: input.subject, invitedBy: input.invitedBy, joinedAt: now }).onConflictDoUpdate({ target: [organizationMembers.orgId, organizationMembers.userId], set: { role: input.role, status: "active", subject: input.subject, invitedBy: input.invitedBy, joinedAt: now, leftAt: null } });
}
async function listOrgPlanPrices() {
  const db = await requireDb4();
  const rows = await db.select().from(orgPlanPrices);
  return new Map(rows.map((row) => [row.plan, row]));
}
async function upsertOrgPlanPrice(input) {
  const db = await requireDb4();
  const values = { monthlyPriceTry: input.monthlyPriceTry, yearlyPriceTry: input.yearlyPriceTry, priceNote: input.priceNote, updatedByUserId: input.updatedByUserId };
  await db.insert(orgPlanPrices).values({ plan: input.plan, ...values }).onConflictDoUpdate({ target: orgPlanPrices.plan, set: values });
}
async function createInvitation(input) {
  const db = await requireDb4();
  const result = await db.insert(organizationInvitations).values(input).returning({ id: organizationInvitations.id });
  return Number(result[0].id);
}
async function listInvitations(orgId) {
  const db = await requireDb4();
  return db.select({ id: organizationInvitations.id, role: organizationInvitations.role, note: organizationInvitations.note, subject: organizationInvitations.subject, expiresAt: organizationInvitations.expiresAt, maxUses: organizationInvitations.maxUses, usedCount: organizationInvitations.usedCount, revokedAt: organizationInvitations.revokedAt, createdAt: organizationInvitations.createdAt }).from(organizationInvitations).where(eq9(organizationInvitations.orgId, orgId)).orderBy(desc4(organizationInvitations.createdAt)).limit(100);
}
async function revokeInvitation(orgId, id8) {
  const db = await requireDb4();
  const result = await db.update(organizationInvitations).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and7(eq9(organizationInvitations.orgId, orgId), eq9(organizationInvitations.id, id8), isNull5(organizationInvitations.revokedAt))).returning();
  return result.length > 0;
}
async function findInvitationByHash(codeHash) {
  const db = await requireDb4();
  const [row] = await db.select({ id: organizationInvitations.id, orgId: organizationInvitations.orgId, orgName: organizations.name, orgStatus: organizations.status, role: organizationInvitations.role, expiresAt: organizationInvitations.expiresAt, maxUses: organizationInvitations.maxUses, usedCount: organizationInvitations.usedCount, revokedAt: organizationInvitations.revokedAt, createdBy: organizationInvitations.createdBy, subject: organizationInvitations.subject, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt }).from(organizationInvitations).innerJoin(organizations, eq9(organizations.id, organizationInvitations.orgId)).where(eq9(organizationInvitations.codeHash, codeHash)).limit(1);
  return row ?? null;
}
async function acceptInvitation(input) {
  const db = await requireDb4();
  const now = /* @__PURE__ */ new Date();
  const consentAt = input.role === "student" ? now : null;
  const subject2 = input.role === "student" ? null : input.subject ?? null;
  const kvkkVersion = input.role === "student" ? input.kvkkVersion ?? null : null;
  const [existing] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and7(eq9(organizationMembers.orgId, input.orgId), eq9(organizationMembers.userId, input.userId))).limit(1);
  if (existing) await db.update(organizationMembers).set({ role: input.role, status: "active", consentAt, subject: subject2, kvkkVersion, joinedAt: now, leftAt: null, invitedBy: input.invitedBy }).where(eq9(organizationMembers.id, existing.id));
  else await db.insert(organizationMembers).values({ orgId: input.orgId, userId: input.userId, role: input.role, status: "active", consentAt, subject: subject2, kvkkVersion, joinedAt: now, invitedBy: input.invitedBy });
  await db.update(organizationInvitations).set({ usedCount: sql6`${organizationInvitations.usedCount} + 1` }).where(eq9(organizationInvitations.id, input.invitationId));
}
async function listClasses(orgId) {
  const db = await requireDb4();
  const classes = await db.select({ id: organizationClasses.id, name: organizationClasses.name, gradeLevel: organizationClasses.gradeLevel, track: organizationClasses.track, advisorUserId: organizationClasses.advisorUserId }).from(organizationClasses).where(eq9(organizationClasses.orgId, orgId)).orderBy(organizationClasses.name);
  const links = classes.length ? await db.select({ classId: classStudents.classId, studentUserId: classStudents.studentUserId }).from(classStudents).where(inArray5(classStudents.classId, classes.map((row) => row.id))) : [];
  return classes.map((row) => ({ ...row, studentUserIds: links.filter((link) => link.classId === row.id).map((link) => link.studentUserId) }));
}
async function createClass(orgId, fields2) {
  const db = await requireDb4();
  const result = await db.insert(organizationClasses).values({ orgId, ...fields2 }).returning({ id: organizationClasses.id });
  return Number(result[0].id);
}
async function updateClass(orgId, classId, fields2) {
  const db = await requireDb4();
  const result = await db.update(organizationClasses).set(fields2).where(and7(eq9(organizationClasses.orgId, orgId), eq9(organizationClasses.id, classId))).returning();
  return result.length > 0;
}
async function deleteClass(orgId, classId) {
  const db = await requireDb4();
  const [row] = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and7(eq9(organizationClasses.orgId, orgId), eq9(organizationClasses.id, classId))).limit(1);
  if (!row) return false;
  await db.delete(classStudents).where(eq9(classStudents.classId, classId));
  await db.delete(classTimetableSlots).where(and7(eq9(classTimetableSlots.orgId, orgId), eq9(classTimetableSlots.classId, classId)));
  await db.delete(organizationClasses).where(eq9(organizationClasses.id, classId));
  return true;
}
async function setClassStudents(orgId, classId, studentUserIds) {
  const db = await requireDb4();
  const [row] = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and7(eq9(organizationClasses.orgId, orgId), eq9(organizationClasses.id, classId))).limit(1);
  if (!row) return false;
  const valid = studentUserIds.length ? (await listMembers(orgId, { role: "student" })).map((member) => member.userId).filter((id8) => studentUserIds.includes(id8)) : [];
  await db.delete(classStudents).where(eq9(classStudents.classId, classId));
  if (valid.length) await db.insert(classStudents).values(valid.map((studentUserId) => ({ classId, studentUserId })));
  return true;
}
async function listAssignments(orgId) {
  const db = await requireDb4();
  return db.select({ teacherUserId: teacherAssignments.teacherUserId, studentUserId: teacherAssignments.studentUserId }).from(teacherAssignments).where(and7(eq9(teacherAssignments.orgId, orgId), eq9(teacherAssignments.active, 1)));
}
async function setTeacherStudents(orgId, teacherUserId, studentUserIds) {
  const db = await requireDb4();
  const valid = studentUserIds.length ? (await listMembers(orgId, { role: "student" })).map((member) => member.userId).filter((id8) => studentUserIds.includes(id8)) : [];
  await db.update(teacherAssignments).set({ active: 0 }).where(and7(eq9(teacherAssignments.orgId, orgId), eq9(teacherAssignments.teacherUserId, teacherUserId)));
  for (const studentUserId of valid) {
    await db.insert(teacherAssignments).values({ orgId, teacherUserId, studentUserId, active: 1 }).onConflictDoUpdate({ target: [teacherAssignments.orgId, teacherAssignments.teacherUserId, teacherAssignments.studentUserId], set: { active: 1 } });
  }
  return valid;
}
var slotColumns = { id: classTimetableSlots.id, classId: classTimetableSlots.classId, dayOfWeek: classTimetableSlots.dayOfWeek, startTime: classTimetableSlots.startTime, endTime: classTimetableSlots.endTime, subject: classTimetableSlots.subject, teacherUserId: classTimetableSlots.teacherUserId, room: classTimetableSlots.room };
async function listOrgTimetable(orgId) {
  const db = await requireDb4();
  return db.select(slotColumns).from(classTimetableSlots).where(eq9(classTimetableSlots.orgId, orgId)).orderBy(classTimetableSlots.dayOfWeek, classTimetableSlots.startTime);
}
async function replaceClassTimetables(orgId, plans) {
  const db = await requireDb4();
  const classIds = plans.map((plan) => plan.classId);
  if (!classIds.length) return true;
  const rows = await db.select({ id: organizationClasses.id }).from(organizationClasses).where(and7(eq9(organizationClasses.orgId, orgId), inArray5(organizationClasses.id, classIds)));
  if (rows.length !== new Set(classIds).size) return false;
  await db.transaction(async (tx) => {
    await tx.delete(classTimetableSlots).where(and7(eq9(classTimetableSlots.orgId, orgId), inArray5(classTimetableSlots.classId, classIds)));
    const values = plans.flatMap((plan) => plan.slots.map((slot) => ({ ...slot, orgId, classId: plan.classId })));
    if (values.length) await tx.insert(classTimetableSlots).values(values);
  });
  return true;
}
async function listStudentTimetable(studentUserId) {
  const db = await requireDb4();
  return db.select({ orgName: organizations.name, className: organizationClasses.name, dayOfWeek: classTimetableSlots.dayOfWeek, startTime: classTimetableSlots.startTime, endTime: classTimetableSlots.endTime, subject: classTimetableSlots.subject, room: classTimetableSlots.room, teacherName: users.name }).from(classStudents).innerJoin(organizationClasses, eq9(organizationClasses.id, classStudents.classId)).innerJoin(organizationMembers, and7(eq9(organizationMembers.orgId, organizationClasses.orgId), eq9(organizationMembers.userId, classStudents.studentUserId), eq9(organizationMembers.role, "student"), eq9(organizationMembers.status, "active"))).innerJoin(organizations, eq9(organizations.id, organizationClasses.orgId)).innerJoin(classTimetableSlots, eq9(classTimetableSlots.classId, organizationClasses.id)).leftJoin(users, eq9(users.id, classTimetableSlots.teacherUserId)).where(eq9(classStudents.studentUserId, studentUserId)).orderBy(classTimetableSlots.dayOfWeek, classTimetableSlots.startTime);
}
async function listNotes2(orgId, studentUserId) {
  const db = await requireDb4();
  return db.select({ id: counselingNotes.id, body: counselingNotes.body, visibility: counselingNotes.visibility, authorUserId: counselingNotes.authorUserId, authorName: users.name, createdAt: counselingNotes.createdAt }).from(counselingNotes).innerJoin(users, eq9(users.id, counselingNotes.authorUserId)).where(and7(eq9(counselingNotes.orgId, orgId), eq9(counselingNotes.studentUserId, studentUserId))).orderBy(desc4(counselingNotes.createdAt)).limit(200);
}
async function createNote(input) {
  const db = await requireDb4();
  const result = await db.insert(counselingNotes).values(input).returning({ id: counselingNotes.id });
  return Number(result[0].id);
}
async function getNote2(orgId, id8) {
  const db = await requireDb4();
  const [row] = await db.select({ id: counselingNotes.id, studentUserId: counselingNotes.studentUserId, authorUserId: counselingNotes.authorUserId }).from(counselingNotes).where(and7(eq9(counselingNotes.orgId, orgId), eq9(counselingNotes.id, id8))).limit(1);
  return row ?? null;
}
async function deleteNote2(orgId, id8) {
  const db = await requireDb4();
  await db.delete(counselingNotes).where(and7(eq9(counselingNotes.orgId, orgId), eq9(counselingNotes.id, id8)));
}
async function listStudentFeedback(studentUserId) {
  const db = await requireDb4();
  return db.select({ id: counselingNotes.id, body: counselingNotes.body, orgName: organizations.name, authorName: users.name, createdAt: counselingNotes.createdAt }).from(counselingNotes).innerJoin(organizationMembers, and7(eq9(organizationMembers.orgId, counselingNotes.orgId), eq9(organizationMembers.userId, studentUserId), eq9(organizationMembers.status, "active"))).innerJoin(organizations, eq9(organizations.id, counselingNotes.orgId)).innerJoin(users, eq9(users.id, counselingNotes.authorUserId)).where(and7(eq9(counselingNotes.studentUserId, studentUserId), eq9(counselingNotes.visibility, "student"))).orderBy(desc4(counselingNotes.createdAt)).limit(20);
}
async function writeAudit(input) {
  const db = await requireDb4();
  await db.insert(organizationAuditLogs).values({ orgId: input.orgId, actorUserId: input.actorUserId, action: input.action, targetType: input.targetType ?? null, targetId: input.targetId ?? null, metadataJson: input.metadata ? JSON.stringify(input.metadata) : null });
}
async function listAudit(orgId) {
  const db = await requireDb4();
  return db.select({ id: organizationAuditLogs.id, action: organizationAuditLogs.action, targetType: organizationAuditLogs.targetType, targetId: organizationAuditLogs.targetId, metadataJson: organizationAuditLogs.metadataJson, actorName: users.name, createdAt: organizationAuditLogs.createdAt }).from(organizationAuditLogs).innerJoin(users, eq9(users.id, organizationAuditLogs.actorUserId)).where(eq9(organizationAuditLogs.orgId, orgId)).orderBy(desc4(organizationAuditLogs.createdAt)).limit(200);
}
async function loadStudentSignals(studentUserIds, weekStart, weekEnd, logsSince) {
  const signals = new Map(studentUserIds.map((id8) => [id8, { exams: [], logs: [], weekSessions: [], weakTopicCount: 0, lastSignedIn: null }]));
  if (!studentUserIds.length) return signals;
  const db = await requireDb4();
  const [exams, logs, sessions, weak, signins] = await Promise.all([
    db.select({ userId: userMockExams.userId, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net }).from(userMockExams).where(inArray5(userMockExams.userId, studentUserIds)),
    db.select({ userId: topicStudyLogs.userId, studyDate: topicStudyLogs.studyDate, minutes: topicStudyLogs.minutes }).from(topicStudyLogs).where(and7(inArray5(topicStudyLogs.userId, studentUserIds), gte5(topicStudyLogs.studyDate, logsSince))),
    db.select({ userId: studyPlanSessions.userId, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes, actualMinutes: studyPlanSessions.actualMinutes, targetQuestions: studyPlanSessions.targetQuestions, actualQuestions: studyPlanSessions.actualQuestions, sessionDate: studyPlanSessions.sessionDate, rescheduledFrom: studyPlanSessions.rescheduledFrom }).from(studyPlanSessions).where(and7(inArray5(studyPlanSessions.userId, studentUserIds), gte5(studyPlanSessions.sessionDate, weekStart), lt5(studyPlanSessions.sessionDate, weekEnd))),
    db.select({ userId: topicProgress.userId, count: sql6`COUNT(*)::int` }).from(topicProgress).where(and7(inArray5(topicProgress.userId, studentUserIds), eq9(topicProgress.status, "weak"))).groupBy(topicProgress.userId),
    db.select({ id: users.id, lastSignedIn: users.lastSignedIn }).from(users).where(inArray5(users.id, studentUserIds))
  ]);
  for (const row of exams) signals.get(row.userId)?.exams.push({ exam: row.exam, examDate: row.examDate, net: Number(row.net) });
  for (const row of logs) signals.get(row.userId)?.logs.push({ studyDate: row.studyDate, minutes: row.minutes });
  for (const row of sessions) signals.get(row.userId)?.weekSessions.push({ ...row, status: row.status });
  for (const row of weak) {
    const entry = signals.get(row.userId);
    if (entry) entry.weakTopicCount = Number(row.count);
  }
  for (const row of signins) {
    const entry = signals.get(row.id);
    if (entry) entry.lastSignedIn = row.lastSignedIn;
  }
  return signals;
}
async function getStudentCalendarReadOnly(studentUserId, since) {
  const db = await requireDb4();
  const [sessions, logs] = await Promise.all([
    db.select().from(studyPlanSessions).where(and7(eq9(studyPlanSessions.userId, studentUserId), gte5(studyPlanSessions.sessionDate, since))).orderBy(studyPlanSessions.sessionDate).limit(300),
    db.select().from(topicStudyLogs).where(and7(eq9(topicStudyLogs.userId, studentUserId), gte5(topicStudyLogs.studyDate, since))).orderBy(desc4(topicStudyLogs.studyDate)).limit(300)
  ]);
  return { sessions, logs };
}
async function listPlannedSessionsOn(studentUserId, day2) {
  const db = await requireDb4();
  const start = new Date(day2);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return db.select({ sessionDate: studyPlanSessions.sessionDate, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, title: studyPlanSessions.title }).from(studyPlanSessions).where(and7(eq9(studyPlanSessions.userId, studentUserId), eq9(studyPlanSessions.status, "planned"), gte5(studyPlanSessions.sessionDate, start), lt5(studyPlanSessions.sessionDate, end)));
}
async function insertAssignedTask(input) {
  const db = await requireDb4();
  const dayStart = new Date(input.sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const plan = await db.insert(studyPlans).values({ userId: input.studentUserId, title: "\xD6\u011Fretmenin atad\u0131\u011F\u0131 g\xF6revler", weekStart: dayStart, weekEnd: dayEnd, summary: input.summary, source: "manual" }).returning({ id: studyPlans.id });
  const session = await db.insert(studyPlanSessions).values({ userId: input.studentUserId, planId: Number(plan[0].id), sessionDate: input.sessionDate, title: input.title, subject: input.subject, topic: input.topic, kind: input.kind, plannedMinutes: input.plannedMinutes, targetQuestions: input.targetQuestions, assignedByUserId: input.teacherUserId, assignedOrgId: input.orgId, caseActionId: input.caseActionId ?? null, targetPages: input.targetPages ?? null, sourceBookId: input.sourceBookId ?? null }).returning({ id: studyPlanSessions.id });
  return Number(session[0].id);
}
async function getOrganization(orgId) {
  const db = await requireDb4();
  const [row] = await db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    status: organizations.status,
    kind: organizations.kind,
    city: organizations.city,
    district: organizations.district,
    address: organizations.address,
    phone: organizations.phone,
    contactEmail: organizations.contactEmail,
    createdAt: organizations.createdAt,
    plan: organizations.plan,
    membershipStartsAt: organizations.membershipStartsAt,
    membershipEndsAt: organizations.membershipEndsAt,
    aiCreditsMonthly: organizations.aiCreditsMonthly,
    perStudentCreditCap: organizations.perStudentCreditCap,
    kvkkNotice: organizations.kvkkNotice,
    kvkkConsent: organizations.kvkkConsent,
    kvkkVersion: organizations.kvkkVersion,
    kvkkUpdatedAt: organizations.kvkkUpdatedAt
  }).from(organizations).where(eq9(organizations.id, orgId)).limit(1);
  return row ?? null;
}
async function updateOrgMembership(orgId, input) {
  const db = await requireDb4();
  await db.update(organizations).set(input).where(eq9(organizations.id, orgId));
}
async function setPerStudentCreditCap(orgId, cap3) {
  const db = await requireDb4();
  await db.update(organizations).set({ perStudentCreditCap: cap3 }).where(eq9(organizations.id, orgId));
}
async function updateKvkk(orgId, notice, consent) {
  const db = await requireDb4();
  await db.update(organizations).set({ kvkkNotice: notice, kvkkConsent: consent, kvkkVersion: sql6`${organizations.kvkkVersion} + 1`, kvkkUpdatedAt: /* @__PURE__ */ new Date() }).where(eq9(organizations.id, orgId));
}
async function listStudentKvkkVersions(orgId) {
  const db = await requireDb4();
  const rows = await db.select({ kvkkVersion: organizationMembers.kvkkVersion }).from(organizationMembers).where(and7(eq9(organizationMembers.orgId, orgId), eq9(organizationMembers.role, "student"), eq9(organizationMembers.status, "active")));
  return rows.map((row) => row.kvkkVersion);
}
async function updateOrganization(orgId, profile) {
  const db = await requireDb4();
  await db.update(organizations).set(profile).where(eq9(organizations.id, orgId));
}
async function createOrganization(name2, slug) {
  const db = await requireDb4();
  const result = await db.insert(organizations).values({ name: name2, slug }).returning({ id: organizations.id });
  return Number(result[0].id);
}
async function listOrganizations() {
  const db = await requireDb4();
  const rows = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status, createdAt: organizations.createdAt, plan: organizations.plan, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt, aiCreditsMonthly: organizations.aiCreditsMonthly }).from(organizations).orderBy(desc4(organizations.createdAt));
  const counts = rows.length ? await db.select({ orgId: organizationMembers.orgId, role: organizationMembers.role, count: sql6`COUNT(*)::int` }).from(organizationMembers).where(and7(inArray5(organizationMembers.orgId, rows.map((row) => row.id)), eq9(organizationMembers.status, "active"))).groupBy(organizationMembers.orgId, organizationMembers.role) : [];
  return rows.map((row) => ({ ...row, students: Number(counts.find((count4) => count4.orgId === row.id && count4.role === "student")?.count ?? 0), staff: counts.filter((count4) => count4.orgId === row.id && count4.role !== "student").reduce((sum, count4) => sum + Number(count4.count), 0) }));
}
async function setOrganizationStatus(orgId, status) {
  const db = await requireDb4();
  await db.update(organizations).set({ status }).where(eq9(organizations.id, orgId));
}
var upgradeColumns = { id: organizationUpgradeRequests.id, orgId: organizationUpgradeRequests.orgId, currentPlan: organizationUpgradeRequests.currentPlan, requestedPlan: organizationUpgradeRequests.requestedPlan, note: organizationUpgradeRequests.note, status: organizationUpgradeRequests.status, createdAt: organizationUpgradeRequests.createdAt, resolvedAt: organizationUpgradeRequests.resolvedAt, requestedBy: organizationUpgradeRequests.requestedBy };
async function createUpgradeRequest(input) {
  const db = await requireDb4();
  const result = await db.insert(organizationUpgradeRequests).values(input).returning({ id: organizationUpgradeRequests.id });
  return Number(result[0].id);
}
async function listOrgUpgradeRequests(orgId) {
  const db = await requireDb4();
  return db.select(upgradeColumns).from(organizationUpgradeRequests).where(eq9(organizationUpgradeRequests.orgId, orgId)).orderBy(desc4(organizationUpgradeRequests.createdAt)).limit(10);
}
async function cancelUpgradeRequest(orgId, requestId) {
  const db = await requireDb4();
  const result = await db.update(organizationUpgradeRequests).set({ status: "canceled", resolvedAt: /* @__PURE__ */ new Date() }).where(and7(eq9(organizationUpgradeRequests.orgId, orgId), eq9(organizationUpgradeRequests.id, requestId), eq9(organizationUpgradeRequests.status, "pending"))).returning();
  return result.length > 0;
}
async function listPendingUpgradeRequests() {
  const db = await requireDb4();
  return db.select({ ...upgradeColumns, orgName: organizations.name, requesterName: users.name, requesterEmail: users.email, membershipEndsAt: organizations.membershipEndsAt }).from(organizationUpgradeRequests).innerJoin(organizations, eq9(organizations.id, organizationUpgradeRequests.orgId)).innerJoin(users, eq9(users.id, organizationUpgradeRequests.requestedBy)).where(eq9(organizationUpgradeRequests.status, "pending")).orderBy(organizationUpgradeRequests.createdAt);
}
async function getUpgradeRequest(requestId) {
  const db = await requireDb4();
  const [row] = await db.select(upgradeColumns).from(organizationUpgradeRequests).where(eq9(organizationUpgradeRequests.id, requestId)).limit(1);
  return row ?? null;
}
async function resolveUpgradeRequest(requestId, status, resolvedBy) {
  const db = await requireDb4();
  const result = await db.update(organizationUpgradeRequests).set({ status, resolvedBy, resolvedAt: /* @__PURE__ */ new Date() }).where(and7(eq9(organizationUpgradeRequests.id, requestId), eq9(organizationUpgradeRequests.status, "pending"))).returning();
  return result.length > 0;
}

// server/schedule/classScheduleDb.ts
var ScheduleError = class extends Error {
};
function parsePeriods(raw) {
  if (!raw) return DEFAULT_SCHOOL_PERIODS;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return DEFAULT_SCHOOL_PERIODS;
    return value.filter((item) => typeof item?.start === "string" && typeof item?.end === "string").map((item) => ({ start: item.start, end: item.end }));
  } catch {
    return DEFAULT_SCHOOL_PERIODS;
  }
}
async function getClassSchedule(userId) {
  const db = await getDb();
  if (!db) return { periods: DEFAULT_SCHOOL_PERIODS, blocks: [] };
  const [profile] = await db.select({ schoolPeriodsJson: studentProfiles.schoolPeriodsJson }).from(studentProfiles).where(eq10(studentProfiles.userId, userId)).limit(1);
  const rows = await db.select({ source: classScheduleBlocks.source, dayOfWeek: classScheduleBlocks.dayOfWeek, startTime: classScheduleBlocks.startTime, endTime: classScheduleBlocks.endTime, subject: classScheduleBlocks.subject, label: classScheduleBlocks.label }).from(classScheduleBlocks).where(eq10(classScheduleBlocks.userId, userId)).orderBy(asc2(classScheduleBlocks.dayOfWeek), asc2(classScheduleBlocks.startTime));
  return { periods: parsePeriods(profile?.schoolPeriodsJson), blocks: rows };
}
async function getPlanScheduleContext(userId, startDate) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select({ start: studentProfiles.preferredStudyStartTime }).from(studentProfiles).where(eq10(studentProfiles.userId, userId)).limit(1);
  const { blocks } = await getClassSchedule(userId);
  return describeWeekForPlan([...blocks, ...await getCourseBlocks(userId)], startDate, profile?.start && isValidTime(profile.start) ? profile.start : "16:00");
}
async function getCourseBlocks(userId) {
  const rows = await listStudentTimetable(userId).catch(() => []);
  return rows.map((slot) => ({ source: "course", dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, subject: slot.subject, label: `${slot.className} \xB7 ${slot.subject}`, orgName: slot.orgName, teacherName: slot.teacherName, room: slot.room }));
}
async function saveClassSchedule(userId, schedule) {
  const problem = validateSchedule(schedule);
  if (problem) throw new ScheduleError(problem);
  const db = await getDb();
  if (!db) throw new ScheduleError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  const blocks = schedule.blocks.map((block) => ({ ...block, label: block.label.trim() || block.subject || "Ders" }));
  const periodsJson = JSON.stringify(schedule.periods);
  await db.transaction(async (tx) => {
    await tx.delete(classScheduleBlocks).where(eq10(classScheduleBlocks.userId, userId));
    if (blocks.length) await tx.insert(classScheduleBlocks).values(blocks.map((block) => ({ ...block, userId })));
    await tx.insert(studentProfiles).values({ userId, schoolPeriodsJson: periodsJson }).onConflictDoUpdate({ target: studentProfiles.userId, set: { schoolPeriodsJson: periodsJson } });
  });
  return getClassSchedule(userId);
}

// server/org/caseDb.ts
var CaseError = class extends Error {
  constructor(message, code = "BAD_REQUEST") {
    super(message);
    this.code = code;
  }
};
async function requireDb5() {
  const db = await getDb();
  if (!db) throw new CaseError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var DAY3 = 24 * 60 * 60 * 1e3;
async function isCasesEnabled(orgId) {
  const db = await requireDb5();
  const [row] = await db.select({ enabled: organizations.academicCasesEnabled }).from(organizations).where(eq11(organizations.id, orgId)).limit(1);
  return row?.enabled === 1;
}
async function setCasesEnabled(orgId, enabled) {
  const db = await requireDb5();
  await db.update(organizations).set({ academicCasesEnabled: enabled ? 1 : 0 }).where(eq11(organizations.id, orgId));
}
async function responsibleTeacherIds(orgId, studentUserId) {
  const db = await requireDb5();
  const [advisors, assigned] = await Promise.all([
    db.select({ userId: organizationClasses.advisorUserId }).from(classStudents).innerJoin(organizationClasses, eq11(organizationClasses.id, classStudents.classId)).where(and8(eq11(organizationClasses.orgId, orgId), eq11(classStudents.studentUserId, studentUserId))),
    db.select({ userId: teacherAssignments.teacherUserId }).from(teacherAssignments).where(and8(eq11(teacherAssignments.orgId, orgId), eq11(teacherAssignments.studentUserId, studentUserId), eq11(teacherAssignments.active, 1)))
  ]);
  return Array.from(new Set([...advisors, ...assigned].map((row) => row.userId).filter((id8) => typeof id8 === "number")));
}
async function canReadNotes(orgId, viewerUserId, studentUserId) {
  return (await responsibleTeacherIds(orgId, studentUserId)).includes(viewerUserId);
}
function filterPrivateNotes(notes2, viewerUserId, viewerIsResponsible) {
  return viewerIsResponsible ? notes2 : notes2.filter((note) => note.authorUserId === viewerUserId);
}
async function comparableExamsOf(studentUserId) {
  const db = await requireDb5();
  const rows = await db.select({ id: userMockExams.id, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net, publisher: userMockExams.publisher, scope: userMockExams.scope }).from(userMockExams).where(eq11(userMockExams.userId, studentUserId));
  return rows.map((row) => ({ id: row.id, examKind: row.exam, date: new Date(row.examDate), net: Number(row.net), source: "student", publisher: row.publisher, scope: row.scope }));
}
var keyOfTrend = (exams, result) => {
  const latest = exams.filter((exam) => result.evidence.some((item) => item.id === exam.id)).at(-1);
  return latest ? comparabilityKey(latest) : comparabilityKey({ examKind: result.examKind, scope: null, publisher: null });
};
async function listSignals(orgId, studentUserIds) {
  if (!studentUserIds.length) return [];
  const db = await requireDb5();
  const open = await db.select({ studentUserId: academicCases.studentUserId, ruleKey: academicCases.ruleKey, comparabilityKey: academicCases.comparabilityKey, id: academicCases.id }).from(academicCases).where(and8(eq11(academicCases.orgId, orgId), inArray6(academicCases.studentUserId, studentUserIds), sql7`${academicCases.status} <> 'closed'`));
  const result = [];
  for (const studentUserId of studentUserIds) {
    const exams = await comparableExamsOf(studentUserId);
    for (const trend of trendSignals(exams)) {
      if (trend.status === "no_signal") continue;
      const key = keyOfTrend(exams, trend);
      const existing = open.find((row) => row.studentUserId === studentUserId && row.ruleKey === "trend_decline" && row.comparabilityKey === key);
      result.push({ studentUserId, examKind: trend.examKind, status: trend.status, confidence: trend.status === "signal" ? trend.confidence : null, description: describeTrend(trend), openCaseId: existing?.id ?? null });
    }
  }
  return result.sort((a, b) => Number(b.status === "signal") - Number(a.status === "signal"));
}
var isUniqueViolation = (error) => {
  const value = error;
  return value?.code === "23505" || value?.cause?.code === "23505";
};
async function openCase(input) {
  const db = await requireDb5();
  const exams = await comparableExamsOf(input.studentUserId);
  let trend = null;
  let key = "";
  let confidence = "medium";
  if (input.ruleKey === "trend_decline") {
    if (!input.examKind) throw new CaseError("S\u0131nav t\xFCr\xFC gerekli.");
    trend = trendDecline(exams, input.examKind);
    if (trend.status !== "signal") throw new CaseError(trend.status === "insufficient" ? describeTrend(trend) : "Bu s\u0131nav t\xFCr\xFCnde d\xFC\u015F\xFC\u015F e\u011Filimi g\xF6r\xFClm\xFCyor; inceleme \xF6nerisi yok.");
    key = keyOfTrend(exams, trend);
    confidence = trend.confidence;
  } else {
    key = `manual|${input.examKind ?? "*"}`;
  }
  const owners = await responsibleTeacherIds(input.orgId, input.studentUserId);
  const ownerUserId = owners.includes(input.actorUserId) ? input.actorUserId : owners[0] ?? input.actorUserId;
  let created;
  try {
    [created] = await db.insert(academicCases).values({ orgId: input.orgId, studentUserId: input.studentUserId, ownerUserId, examKind: input.examKind, ruleKey: input.ruleKey, comparabilityKey: key, confidence, openedByUserId: input.actorUserId }).returning();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existing] = await db.select({ id: academicCases.id }).from(academicCases).where(and8(eq11(academicCases.orgId, input.orgId), eq11(academicCases.studentUserId, input.studentUserId), eq11(academicCases.ruleKey, input.ruleKey), eq11(academicCases.comparabilityKey, key), sql7`${academicCases.status} <> 'closed'`)).limit(1);
    return { caseId: existing.id, created: false };
  }
  await captureEvidence(db, created, exams, trend);
  return { caseId: created.id, created: true };
}
async function captureEvidence(db, row, exams, trend) {
  const examIds = trend ? trend.evidence.map((item) => item.id) : exams.filter((exam) => !row.examKind || exam.examKind === row.examKind).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3).map((exam) => exam.id);
  const examRows = examIds.length ? await db.select({ id: userMockExams.id, title: userMockExams.title, exam: userMockExams.exam, examDate: userMockExams.examDate, net: userMockExams.net, subjectsJson: userMockExams.subjectsJson }).from(userMockExams).where(and8(eq11(userMockExams.userId, row.studentUserId), inArray6(userMockExams.id, examIds))) : [];
  const since = new Date(Date.now() - 28 * DAY3);
  const logs = await db.select({ studyDate: topicStudyLogs.studyDate, minutes: topicStudyLogs.minutes, questions: topicStudyLogs.questions }).from(topicStudyLogs).where(and8(eq11(topicStudyLogs.userId, row.studentUserId), gte6(topicStudyLogs.studyDate, since)));
  const weeks = [0, 1, 2, 3].map((index2) => {
    const end = Date.now() - index2 * 7 * DAY3;
    const inWeek = logs.filter((log) => {
      const at = new Date(log.studyDate).getTime();
      return at <= end && at > end - 7 * DAY3;
    });
    return { weeksAgo: index2, minutes: inWeek.reduce((sum, log) => sum + log.minutes, 0), questions: inWeek.reduce((sum, log) => sum + log.questions, 0) };
  }).reverse();
  const topics = (await getUserTopicProgress(row.studentUserId)).filter((topic) => !topic.insufficientData && topic.status === "Zay\u0131f" && (!row.examKind || topic.exam === row.examKind));
  const values = [
    ...examRows.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).map((exam) => ({ caseId: row.id, orgId: row.orgId, kind: "exam", refId: exam.id, snapshotJson: JSON.stringify({ title: exam.title, exam: exam.exam, date: exam.examDate, net: Number(exam.net), subjects: safeJson(exam.subjectsJson) }) })),
    { caseId: row.id, orgId: row.orgId, kind: "study", refId: null, snapshotJson: JSON.stringify({ weeks }) },
    { caseId: row.id, orgId: row.orgId, kind: "topic", refId: null, snapshotJson: JSON.stringify({ weak: topics.slice(0, 12).map((topic) => ({ topicId: topic.id, subject: topic.subject, topic: topic.topic, progress: topic.progress })) }) }
  ];
  if (trend) values.unshift({ caseId: row.id, orgId: row.orgId, kind: "exam", refId: null, snapshotJson: JSON.stringify({ summary: describeTrend(trend), totalChange: trend.status !== "insufficient" ? trend.totalChange : null, confidence: row.confidence }) });
  await db.insert(caseEvidence).values(values);
}
var safeJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
async function requireCase(db, orgId, caseId) {
  const [row] = await db.select().from(academicCases).where(and8(eq11(academicCases.id, caseId), eq11(academicCases.orgId, orgId))).limit(1);
  if (!row) throw new CaseError("Takip dosyas\u0131 bulunamad\u0131.", "NOT_FOUND");
  return row;
}
async function getCaseRow(orgId, caseId) {
  return requireCase(await requireDb5(), orgId, caseId);
}
async function listCases(orgId, options = {}) {
  const db = await requireDb5();
  if (options.studentUserIds && !options.studentUserIds.length) return [];
  const conditions = [eq11(academicCases.orgId, orgId)];
  if (options.studentUserIds) conditions.push(inArray6(academicCases.studentUserId, options.studentUserIds));
  if (options.status) conditions.push(eq11(academicCases.status, options.status));
  const rows = await db.select({ case: academicCases, studentName: users.name }).from(academicCases).innerJoin(users, eq11(users.id, academicCases.studentUserId)).where(and8(...conditions)).orderBy(desc5(academicCases.openedAt)).limit(200);
  const ids = rows.map((row) => row.case.id);
  const lastActions = ids.length ? await db.select({ caseId: caseActions.caseId, at: sql7`max(${caseActions.createdAt})` }).from(caseActions).where(inArray6(caseActions.caseId, ids)).groupBy(caseActions.caseId) : [];
  return rows.map((row) => ({ ...row.case, studentName: row.studentName, lastActionAt: lastActions.find((item) => item.caseId === row.case.id)?.at ?? null }));
}
async function getCaseDetail(orgId, caseId) {
  const db = await requireDb5();
  const row = await requireCase(db, orgId, caseId);
  const [evidence, actions, evaluations, notes2] = await Promise.all([
    db.select().from(caseEvidence).where(eq11(caseEvidence.caseId, caseId)).orderBy(caseEvidence.id),
    db.select().from(caseActions).where(eq11(caseActions.caseId, caseId)).orderBy(caseActions.createdAt),
    db.select().from(caseEvaluations).where(eq11(caseEvaluations.caseId, caseId)).orderBy(caseEvaluations.evaluatedAt),
    db.select({ id: counselingNotes.id, body: counselingNotes.body, visibility: counselingNotes.visibility, authorUserId: counselingNotes.authorUserId, authorName: users.name, createdAt: counselingNotes.createdAt }).from(counselingNotes).innerJoin(users, eq11(users.id, counselingNotes.authorUserId)).where(and8(eq11(counselingNotes.orgId, orgId), eq11(counselingNotes.caseId, caseId))).orderBy(desc5(counselingNotes.createdAt))
  ]);
  const actionIds = actions.map((action) => action.id);
  const tasks = actionIds.length ? await db.select({ id: studyPlanSessions.id, caseActionId: studyPlanSessions.caseActionId, sessionDate: studyPlanSessions.sessionDate, title: studyPlanSessions.title, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, studentFeedback: studyPlanSessions.studentFeedback, actualQuestions: studyPlanSessions.actualQuestions, correct: studyPlanSessions.correct, wrong: studyPlanSessions.wrong }).from(studyPlanSessions).where(and8(eq11(studyPlanSessions.userId, row.studentUserId), inArray6(studyPlanSessions.caseActionId, actionIds))).orderBy(studyPlanSessions.sessionDate) : [];
  return {
    case: row,
    evidence: evidence.map((item) => ({ ...item, snapshot: safeJson(item.snapshotJson) })),
    actions: actions.map((item) => ({ ...item, payload: safeJson(item.payloadJson) })),
    evaluations: evaluations.map((item) => ({ ...item, netChange: item.netChange === null ? null : Number(item.netChange), studentSignals: safeJson(item.studentSignalsJson) })),
    notes: notes2,
    tasks
  };
}
async function addCaseAction(input) {
  const db = await requireDb5();
  const row = await requireCase(db, input.orgId, input.caseId);
  if (row.status === "closed") throw new CaseError("Dosya kapal\u0131. \xD6nce yeniden a\xE7.");
  const [inserted] = await db.insert(caseActions).values({ caseId: row.id, orgId: row.orgId, type: input.type, payloadJson: JSON.stringify(input.payload), bookId: input.bookId ?? null, bookContentId: input.bookContentId ?? null, status: input.status ?? "done", createdByUserId: input.actorUserId, idempotencyKey: input.idempotencyKey }).onConflictDoNothing({ target: [caseActions.caseId, caseActions.idempotencyKey] }).returning({ id: caseActions.id });
  if (!inserted) {
    const [existing] = await db.select({ id: caseActions.id }).from(caseActions).where(and8(eq11(caseActions.caseId, row.id), eq11(caseActions.idempotencyKey, input.idempotencyKey))).limit(1);
    return { actionId: existing.id, created: false };
  }
  if (row.status === "open") await db.update(academicCases).set({ status: "in_progress" }).where(eq11(academicCases.id, row.id));
  return { actionId: inserted.id, created: true };
}
async function addCaseNote(input) {
  const db = await requireDb5();
  const row = await requireCase(db, input.orgId, input.caseId);
  const [note] = await db.insert(counselingNotes).values({ orgId: row.orgId, studentUserId: row.studentUserId, authorUserId: input.authorUserId, body: input.body, visibility: input.visibility, caseId: row.id }).returning({ id: counselingNotes.id });
  return note.id;
}
async function suggestOwnedResources(studentUserId, topicIds) {
  const db = await requireDb5();
  if (!topicIds.length) return { owned: [], missingTopicIds: [], catalog: [] };
  const rows = await db.select({ bookId: userBookContents.bookId, contentId: userBookContents.id, topicId: userBookContents.topicId, label: userBookContents.label, title: userBookContents.title, unitTitle: userBookContents.unitTitle, testNumber: userBookContents.testNumber, pageStart: userBookContents.pageStart, pageEnd: userBookContents.pageEnd, bookTitle: userResourceBooks.title }).from(userBookContents).innerJoin(bookInventory, and8(eq11(bookInventory.userId, userBookContents.userId), eq11(bookInventory.bookId, userBookContents.bookId), isNull6(bookInventory.removedAt))).leftJoin(userResourceBooks, and8(eq11(userResourceBooks.userId, userBookContents.userId), eq11(userResourceBooks.bookId, userBookContents.bookId))).where(and8(eq11(userBookContents.userId, studentUserId), inArray6(userBookContents.topicId, topicIds))).orderBy(userBookContents.bookId, userBookContents.sortOrder);
  const byBook = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const entry = byBook.get(row.bookId) ?? { bookId: row.bookId, title: row.bookTitle ?? "Kitab\u0131m", items: [] };
    entry.items.push({ bookContentId: row.contentId, topicId: row.topicId, label: row.label, title: row.title || row.unitTitle, pageStart: row.pageStart, pageEnd: row.pageEnd });
    byBook.set(row.bookId, entry);
  }
  const covered2 = new Set(rows.map((row) => row.topicId));
  const missingTopicIds = topicIds.filter((id8) => !covered2.has(id8));
  const catalog = missingTopicIds.length ? await db.selectDistinct({ catalogBookId: catalogBooks.id, title: catalogBooks.name, topicId: bookCurriculumTopics.topicId }).from(bookCurriculumTopics).innerJoin(catalogBooks, eq11(catalogBooks.id, bookCurriculumTopics.bookId)).where(and8(inArray6(bookCurriculumTopics.topicId, missingTopicIds), eq11(catalogBooks.active, 1))).limit(3) : [];
  return { owned: Array.from(byBook.values()), missingTopicIds, catalog };
}
async function busyProvider(studentUserId, from, days) {
  const db = await requireDb5();
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days + 1);
  const [schedule, courseBlocks, sessions] = await Promise.all([
    getClassSchedule(studentUserId),
    getCourseBlocks(studentUserId).catch(() => []),
    db.select({ sessionDate: studyPlanSessions.sessionDate, plannedMinutes: studyPlanSessions.plannedMinutes, status: studyPlanSessions.status, title: studyPlanSessions.title }).from(studyPlanSessions).where(and8(eq11(studyPlanSessions.userId, studentUserId), eq11(studyPlanSessions.status, "planned"), gte6(studyPlanSessions.sessionDate, start), lt6(studyPlanSessions.sessionDate, end)))
  ]);
  return (date) => busyOn(date, { blocks: schedule.blocks, courseBlocks, sessions });
}
async function previewCasePlan(studentUserId, items, from, days) {
  const busyFor = await busyProvider(studentUserId, from, days);
  return placePlanItems(items.map((item) => ({ minutes: item.minutes })), from, days, busyFor, { earliest: "16:00" });
}
async function assignCasePlan(input) {
  const db = await requireDb5();
  const row = await requireCase(db, input.orgId, input.caseId);
  const placements = await previewCasePlan(row.studentUserId, input.items, input.from, input.days);
  const { actionId, created } = await addCaseAction({ orgId: input.orgId, caseId: input.caseId, type: "plan", payload: { items: input.items, from: input.from, days: input.days }, actorUserId: input.actorUserId, idempotencyKey: input.idempotencyKey, status: "planned" });
  if (!created) {
    const existing = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(and8(eq11(studyPlanSessions.userId, row.studentUserId), eq11(studyPlanSessions.caseActionId, actionId)));
    return { actionId, sessionIds: existing.map((session) => session.id), skipped: [], duplicate: true };
  }
  const sessionIds = [];
  const skipped = [];
  const placedDates = [];
  for (const placement of placements) {
    const item = input.items[placement.index];
    if (!placement.date) {
      skipped.push({ itemIndex: placement.index, reason: "no_slot" });
      continue;
    }
    const at = new Date(placement.date);
    at.setHours(Math.floor(placement.start / 60), placement.start % 60, 0, 0);
    sessionIds.push(await insertAssignedTask({ orgId: input.orgId, studentUserId: row.studentUserId, teacherUserId: input.actorUserId, sessionDate: at, title: `${item.subject} \xB7 ${item.topic}`, subject: item.subject, topic: item.topic, kind: "Konu tekrar\u0131", plannedMinutes: item.minutes, targetQuestions: item.targetQuestions ?? null, summary: "Akademik takip dosyas\u0131ndan \xF6\u011Fretmenin \xF6nerdi\u011Fi \xE7al\u0131\u015Fma.", caseActionId: actionId, targetPages: item.pages ?? null, sourceBookId: item.bookId ?? null }));
    placedDates.push(at);
  }
  const [teacher] = await db.select({ name: users.name }).from(users).where(eq11(users.id, input.actorUserId)).limit(1);
  await notifyStudentOfTasks({ studentUserId: row.studentUserId, teacherName: teacher?.name ?? null, sessionDates: placedDates }).catch((error) => console.warn("[cases] notify failed:", error instanceof Error ? error.message : error));
  return { actionId, sessionIds, skipped, duplicate: false };
}
async function evaluateCase(input) {
  const db = await requireDb5();
  const detail = await getCaseDetail(input.orgId, input.caseId);
  const row = detail.case;
  if (row.status === "closed") throw new CaseError("Dosya kapal\u0131. \xD6nce yeniden a\xE7.");
  const examEvidence = detail.evidence.filter((item) => item.kind === "exam" && item.refId !== null);
  const baseline = examEvidence.at(-1) ?? null;
  const baselineDate = baseline ? new Date(baseline.snapshot.date) : row.openedAt;
  const exams = (await comparableExamsOf(row.studentUserId)).filter((exam) => (!row.examKind || exam.examKind === row.examKind) && exam.scope !== "branch" && exam.date.getTime() > Math.max(baselineDate.getTime(), new Date(row.openedAt).getTime() - DAY3));
  const followup = exams.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const baselineNet = baseline ? Number(baseline.snapshot.net) : null;
  const netChange = followup && baselineNet !== null ? Math.round((followup.net - baselineNet) * 100) / 100 : null;
  const signals = { done: 0, struggled: 0, needs_review: 0 };
  for (const task of detail.tasks) if (task.studentFeedback) signals[task.studentFeedback] += 1;
  const tasksDone = detail.tasks.filter((task) => task.status === "completed" || task.studentFeedback === "done").length;
  const limited = !followup;
  const uncertaintyNote = limited ? "Kar\u015F\u0131la\u015Ft\u0131r\u0131labilir yeni deneme yok; de\u011Ferlendirme yaln\u0131zca g\xF6rev tamamlama ve \xF6\u011Frencinin geri bildirimine dayan\u0131yor." : "Net de\u011Fi\u015Fimi tek ba\u015F\u0131na m\xFCdahalenin etkisini g\xF6stermez; deneme zorlu\u011Fu ve ba\u015Fka etkenler de rol oynar.";
  const [evaluation] = await db.insert(caseEvaluations).values({ caseId: row.id, orgId: row.orgId, baselineExamId: baseline?.refId ?? null, followupExamId: followup?.id ?? null, netChange: netChange === null ? null : netChange.toFixed(2), tasksDone, tasksTotal: detail.tasks.length, studentSignalsJson: JSON.stringify(signals), limitedEvidence: limited ? 1 : 0, uncertaintyNote, teacherOutcome: input.outcome, evaluatedByUserId: input.actorUserId }).returning({ id: caseEvaluations.id });
  await db.update(academicCases).set(input.outcome === "completed" ? { status: "closed", outcome: "completed", closedAt: /* @__PURE__ */ new Date() } : { status: "in_progress", outcome: input.outcome }).where(eq11(academicCases.id, row.id));
  if (input.note?.trim()) await addCaseNote({ orgId: input.orgId, caseId: row.id, authorUserId: input.actorUserId, body: input.note.trim(), visibility: "staff" });
  return { evaluationId: evaluation.id, limitedEvidence: limited, netChange, tasksDone, tasksTotal: detail.tasks.length };
}
async function reopenCase(input) {
  const db = await requireDb5();
  const row = await requireCase(db, input.orgId, input.caseId);
  if (row.status !== "closed") throw new CaseError("Dosya zaten a\xE7\u0131k.");
  try {
    await db.update(academicCases).set({ status: "in_progress", outcome: null, closedAt: null }).where(eq11(academicCases.id, row.id));
  } catch (error) {
    if (isUniqueViolation(error)) throw new CaseError("Bu \xF6\u011Frenci i\xE7in ayn\u0131 konuda a\xE7\u0131k bir dosya var.", "CONFLICT");
    throw error;
  }
  await addCaseAction({ orgId: input.orgId, caseId: row.id, type: "review", payload: { reopened: true, reason: input.reason }, actorUserId: input.actorUserId, idempotencyKey: `reopen-${Date.now()}` });
}
async function caseSummary(orgId, now = /* @__PURE__ */ new Date()) {
  const cases = await listCases(orgId);
  const stale = (row) => row.status !== "closed" && now.getTime() - new Date(row.lastActionAt ?? row.openedAt).getTime() > 7 * DAY3;
  return {
    open: cases.filter((row) => row.status === "open").length,
    inProgress: cases.filter((row) => row.status === "in_progress").length,
    evaluating: cases.filter((row) => row.status === "evaluating").length,
    closedLast30: cases.filter((row) => row.status === "closed" && row.closedAt && now.getTime() - new Date(row.closedAt).getTime() <= 30 * DAY3).length,
    overdue: cases.filter(stale).length
  };
}
async function listStudentAssignedTasks(studentUserId, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb5();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return db.select({ id: studyPlanSessions.id, sessionDate: studyPlanSessions.sessionDate, title: studyPlanSessions.title, subject: studyPlanSessions.subject, topic: studyPlanSessions.topic, plannedMinutes: studyPlanSessions.plannedMinutes, targetPages: studyPlanSessions.targetPages, status: studyPlanSessions.status, studentFeedback: studyPlanSessions.studentFeedback, assignedBy: users.name }).from(studyPlanSessions).leftJoin(users, eq11(users.id, studyPlanSessions.assignedByUserId)).where(and8(eq11(studyPlanSessions.userId, studentUserId), sql7`${studyPlanSessions.assignedByUserId} IS NOT NULL`, gte6(studyPlanSessions.sessionDate, start), lt6(studyPlanSessions.sessionDate, end))).orderBy(studyPlanSessions.sessionDate);
}
async function setStudentFeedback(studentUserId, sessionId, feedback) {
  const db = await requireDb5();
  const now = /* @__PURE__ */ new Date();
  const rows = await db.update(studyPlanSessions).set({ studentFeedback: feedback, studentFeedbackAt: now, ...feedback === "done" ? { status: "completed", completedAt: now } : {} }).where(and8(eq11(studyPlanSessions.id, sessionId), eq11(studyPlanSessions.userId, studentUserId), sql7`${studyPlanSessions.assignedByUserId} IS NOT NULL`)).returning({ id: studyPlanSessions.id });
  return rows.length > 0;
}
async function academicDigestFor(orgId, students, now = /* @__PURE__ */ new Date()) {
  if (!students.length || !await isCasesEnabled(orgId)) return null;
  const ids = students.map((student) => student.userId);
  const names = new Map(students.map((student) => [student.userId, student.name]));
  const signals = await listSignals(orgId, ids);
  const cases = (await listCases(orgId, { studentUserIds: ids })).filter((row) => row.status !== "closed");
  return {
    suggestions: signals.filter((signal) => signal.status === "signal" && !signal.openCaseId).map((signal) => ({ name: names.get(signal.studentUserId) ?? "\xD6\u011Frenci", description: signal.description })),
    openCases: cases.length,
    staleCases: cases.filter((row) => now.getTime() - new Date(row.lastActionAt ?? row.openedAt).getTime() > 7 * DAY3).length
  };
}
async function notifyStudentOfTasks(input) {
  if (!input.sessionDates.length) return;
  const db = await requireDb5();
  const first = [...input.sessionDates].sort((a, b) => a.getTime() - b.getTime())[0];
  const when2 = first.toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  const who = input.teacherName?.trim() || "\xD6\u011Fretmenin";
  const count4 = input.sessionDates.length;
  const title = count4 > 1 ? `${who} ${count4} \xE7al\u0131\u015Fma \xF6nerdi` : `${who} bir \xE7al\u0131\u015Fma \xF6nerdi`;
  const message = `Takvimine eklendi; ilki ${when2}. Genel Bak\u0131\u015F'taki "Bu haftaki \xE7al\u0131\u015Fmalar"dan durumunu bildirebilirsin.`;
  await db.insert(coachAlerts).values({ userId: input.studentUserId, level: "action", ruleKey: "teacher_tasks", title, message });
  if (pushConfigured()) await sendToUser(input.studentUserId, { title, body: message, url: "/", tag: "teacher-tasks" }).catch(() => void 0);
}

// server/digest/unsubscribeToken.ts
import { SignJWT as SignJWT3, jwtVerify as jwtVerify3 } from "jose";
var AUDIENCE = "weekly-digest-unsubscribe";
var secretKey3 = () => new TextEncoder().encode(ENV.cookieSecret);
async function createUnsubscribeToken(kind, id8) {
  return new SignJWT3({ k: kind }).setProtectedHeader({ alg: "HS256" }).setSubject(String(id8)).setAudience(AUDIENCE).setIssuedAt().sign(secretKey3());
}
var unsubscribeUrlFor = async (appUrl, kind, id8) => `${appUrl}/api/email/weekly-digest/unsubscribe?token=${encodeURIComponent(await createUnsubscribeToken(kind, id8))}`;
async function readUnsubscribeToken(token) {
  try {
    const { payload } = await jwtVerify3(token, secretKey3(), { audience: AUDIENCE, algorithms: ["HS256"] });
    const id8 = Number(payload.sub);
    if (!Number.isInteger(id8) || id8 <= 0) return null;
    return { kind: payload.k === "staff" ? "staff" : payload.k === "parent" ? "parent" : "student", id: id8 };
  } catch {
    return null;
  }
}

// server/digest/teacherDigest.ts
var DAY_MS3 = 24 * 60 * 60 * 1e3;
var RESEND_AFTER_MS = 6 * DAY_MS3;
var TIME_BUDGET_MS = 12e4;
async function getStaffDigestEnabled(userId, orgId) {
  const db = await getDb();
  if (!db) return true;
  const [row] = await db.select({ optOut: organizationMembers.weeklyDigestOptOut }).from(organizationMembers).where(and9(eq12(organizationMembers.userId, userId), eq12(organizationMembers.orgId, orgId))).limit(1);
  return !row || row.optOut === 0;
}
async function setStaffDigestEnabled(userId, orgId, enabled) {
  const db = await getDb();
  if (!db) return enabled;
  await db.update(organizationMembers).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(and9(eq12(organizationMembers.userId, userId), eq12(organizationMembers.orgId, orgId)));
  return enabled;
}
async function setStaffDigestEnabledByMemberId(memberId, enabled) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizationMembers).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(eq12(organizationMembers.id, memberId));
}
async function runTeacherDigest(options) {
  const result = { candidates: 0, sent: 0, skipped: 0, failed: 0, stoppedEarly: false, ...options.dryRun ? { previews: [] } : {} };
  const db = await getDb();
  if (!db || options.maxPerRun <= 0) return result;
  const now = options.now ?? /* @__PURE__ */ new Date();
  const { start } = weeklyDigestWindow(now);
  const weekEnd = new Date(start.getTime() + 7 * DAY_MS3);
  const startedAt = Date.now();
  const rows = await db.select({ memberId: organizationMembers.id, userId: users.id, email: users.email, name: users.name, role: organizationMembers.role, orgId: organizations.id, orgName: organizations.name, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt }).from(organizationMembers).innerJoin(users, eq12(users.id, organizationMembers.userId)).innerJoin(organizations, eq12(organizations.id, organizationMembers.orgId)).where(and9(
    inArray7(organizationMembers.role, [...STAFF_ROLES]),
    eq12(organizationMembers.status, "active"),
    eq12(organizationMembers.weeklyDigestOptOut, 0),
    or2(isNull7(organizationMembers.weeklyDigestLastSentAt), lt7(organizationMembers.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS))),
    eq12(organizations.status, "active"),
    isNotNull3(users.email),
    isNotNull3(users.emailVerifiedAt),
    eq12(users.approvalStatus, "approved"),
    eq12(users.accountStatus, "active")
  )).orderBy(desc6(users.lastSignedIn)).limit(options.maxPerRun);
  const targets = rows.filter((row) => membershipState(row, now) === "active" && (!options.onlyMemberIds || options.onlyMemberIds.includes(row.memberId)));
  result.candidates = targets.length;
  for (const member of targets) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      result.stoppedEarly = true;
      break;
    }
    try {
      const students = await listMembers(member.orgId, seesAllStudents(member.role) ? { role: "student" } : { role: "student", teacherUserId: member.userId });
      if (!students.length) {
        result.skipped++;
        continue;
      }
      const signals = await loadStudentSignals(students.map((student) => student.userId), start, weekEnd, new Date(now.getTime() - 30 * DAY_MS3));
      const academic = await academicDigestFor(member.orgId, students.map((student) => ({ userId: student.userId, name: student.name })), now).catch(() => null);
      const digest = buildTeacherDigest(students.map((student) => ({ name: student.name, summary: summarizeStudent(signals.get(student.userId), now) })), academic);
      const mail = buildTeacherDigestEmail({
        to: member.email,
        name: member.name?.split(" ")[0] || null,
        orgName: member.orgName,
        digest,
        rangeLabel: rangeLabel(start, now),
        panelUrl: `${options.appUrl}/kurum`,
        casesUrl: academic ? `${options.appUrl}/kurum/akademik-takip` : void 0,
        unsubscribeUrl: await unsubscribeUrlFor(options.appUrl, "staff", member.memberId)
      });
      if (options.dryRun) {
        result.previews.push(mail);
        continue;
      }
      await sendMail(mail);
      await db.update(organizationMembers).set({ weeklyDigestLastSentAt: now }).where(eq12(organizationMembers.id, member.memberId));
      result.sent++;
    } catch (error) {
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[TeacherDigest] member ${member.memberId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

// server/digest/parentDigest.ts
import { and as and10, desc as desc7, eq as eq13, gte as gte7, isNotNull as isNotNull4, isNull as isNull8, lt as lt8, or as or3 } from "drizzle-orm";

// server/_core/emails/parentEmails.ts
var escapeHtml4 = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
var shell = (subject2, preheader, body, footer) => `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml4(subject2)}</title></head>
<body style="margin:0;padding:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml4(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6ebe9;border-radius:20px;">
      <tr><td style="padding:28px 28px 8px 28px;font-size:15px;font-weight:700;color:#18202a;">Pusula \xB7 Veli eri\u015Fimi</td></tr>
      <tr><td style="padding:8px 28px 28px 28px;">${body}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td align="center" style="padding:20px 8px 0 8px;font-size:11px;line-height:1.6;color:#7c858e;">${footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
var button = (href, label) => `<a href="${escapeHtml4(href)}" style="display:inline-block;background:#17625f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:12px;">${escapeHtml4(label)}</a>`;
function buildParentInviteEmail({ to, studentName, code, joinUrl, expiresAt }) {
  const subject2 = `${studentName} seni Pusula'da veli olarak ekledi`;
  const until = expiresAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
  const text4 = [
    "Merhaba,",
    "",
    `${studentName}, s\u0131nav haz\u0131rl\u0131\u011F\u0131n\u0131 Pusula'da takip ediyor ve seni veli olarak eklemek istiyor. Ba\u011Fland\u0131\u011F\u0131nda \xE7al\u0131\u015Fma s\xFCresini, plan\u0131n\u0131, deneme sonu\xE7lar\u0131n\u0131 ve zay\u0131f konular\u0131n\u0131 g\xF6rebilirsin; notlar\u0131n\u0131 ve soru defterini g\xF6remezsin.`,
    "",
    `Ba\u011Flanmak i\xE7in: ${joinUrl}`,
    `Veli kodu: ${code} (${until} tarihine kadar ge\xE7erli)`,
    "",
    "Pusula hesab\u0131n yoksa ba\u011Flant\u0131dan \xFCcretsiz hesap a\xE7abilirsin. Kodu girdikten sonra \xF6\u011Frencinin de onaylamas\u0131 gerekir.",
    "",
    "Bu daveti beklemiyorsan bu e-postay\u0131 g\xF6rmezden gelebilirsin."
  ].join("\n");
  const body = `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">Merhaba,</p>
<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#3f4753;"><strong>${escapeHtml4(studentName)}</strong>, s\u0131nav haz\u0131rl\u0131\u011F\u0131n\u0131 Pusula'da takip ediyor ve seni veli olarak eklemek istiyor. Ba\u011Fland\u0131\u011F\u0131nda \xE7al\u0131\u015Fma s\xFCresini, plan\u0131n\u0131, deneme sonu\xE7lar\u0131n\u0131 ve zay\u0131f konular\u0131n\u0131 g\xF6rebilirsin; notlar\u0131n\u0131 ve soru defterini g\xF6remezsin.</p>
<p style="margin:0 0 18px 0;">${button(joinUrl, "Veli olarak ba\u011Flan")}</p>
<p style="margin:0 0 6px 0;font-size:13px;color:#5d6670;">Veli kodu: <strong style="font-size:16px;color:#18202a;letter-spacing:1px;">${escapeHtml4(code)}</strong> \xB7 ${escapeHtml4(until)} tarihine kadar ge\xE7erli</p>
<p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#7c858e;">Pusula hesab\u0131n yoksa ba\u011Flant\u0131dan \xFCcretsiz hesap a\xE7abilirsin. Kodu girdikten sonra \xF6\u011Frencinin de onaylamas\u0131 gerekir. Bu daveti beklemiyorsan bu e-postay\u0131 g\xF6rmezden gelebilirsin.</p>`;
  return { to, subject: subject2, text: text4, html: shell(subject2, `${studentName} seni veli olarak eklemek istiyor.`, body, "Pusula \xB7 Ki\u015Fisel \xE7al\u0131\u015Fma ko\xE7u") };
}
function buildParentDigestEmail({ to, studentName, digest, start, end, appUrl, unsubscribeUrl, lastExam }) {
  const range = rangeLabel(start, end);
  const subject2 = `${studentName} \xB7 haftal\u0131k \xF6zet \xB7 ${range}`;
  const stats = [
    ["Tamamlanan oturum", digest.plannedSessions ? `${digest.completedSessions} / ${digest.plannedSessions}` : String(digest.completedSessions)],
    ["\xC7al\u0131\u015Fma s\xFCresi", formatMinutes(digest.minutes)],
    ["\xC7\xF6z\xFClen soru", digest.accuracy !== null ? `${digest.questions} \xB7 %${digest.accuracy} do\u011Fru` : String(digest.questions)],
    ["\xC7al\u0131\u015Ft\u0131\u011F\u0131 g\xFCn", `${digest.activeDays} / 7`]
  ];
  const examLine = lastExam ? `Son deneme: ${lastExam.title} (${lastExam.exam}) \xB7 ${lastExam.net.toFixed(2)} net${lastExam.estimatedScore !== null ? ` \xB7 tahmini ~${lastExam.estimatedScore.toFixed(0)} puan (resm\xEE de\u011Fil)` : ""}` : null;
  const text4 = [
    "Merhaba,",
    "",
    `${studentName} i\xE7in ${range} haftas\u0131n\u0131n \xF6zeti:`,
    "",
    ...stats.map(([label, value]) => `\u2022 ${label}: ${value}`),
    ...digest.topSubject ? [`\u2022 En \xE7ok \xE7al\u0131\u015Ft\u0131\u011F\u0131 ders: ${digest.topSubject.subject} (${formatMinutes(digest.topSubject.minutes)})`] : [],
    ...examLine ? [`\u2022 ${examLine}`] : [],
    ...digest.weakTopics.length ? ["", "G\xFC\xE7lendirmesi gereken konular:", ...digest.weakTopics.map((topic) => `\u2022 ${topic.topic} (${topic.subject}) \xB7 %${topic.progress}`)] : [],
    "",
    `Ayr\u0131nt\u0131lar i\xE7in Pusula'y\u0131 a\xE7: ${appUrl}/veli`,
    "",
    `Bu \xF6zeti her pazar al\u0131yorsun. Almak istemiyorsan: ${unsubscribeUrl}`
  ].join("\n");
  const statCell = ([label, value]) => `<td width="50%" valign="top" style="background:#f3f6f5;border-radius:12px;padding:12px 14px;"><div style="font-size:12px;color:#5d6670;">${escapeHtml4(label)}</div><div style="margin-top:4px;font-size:17px;font-weight:700;color:#18202a;">${escapeHtml4(value)}</div></td>`;
  const weakRows = digest.weakTopics.map((topic) => `<tr><td style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;">${escapeHtml4(topic.topic)} <span style="color:#5d6670;">\xB7 ${escapeHtml4(topic.subject)}</span></td><td align="right" style="padding:8px 0;border-top:1px solid #e6ebe9;font-size:14px;font-weight:700;color:#bf3a2b;">%${topic.progress}</td></tr>`).join("");
  const body = `<p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;">Merhaba,</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#3f4753;"><strong>${escapeHtml4(studentName)}</strong> i\xE7in ${escapeHtml4(range)} haftas\u0131n\u0131n \xF6zeti:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:0 -8px;"><tr>${statCell(stats[0])}${statCell(stats[1])}</tr><tr>${statCell(stats[2])}${statCell(stats[3])}</tr></table>
${digest.topSubject ? `<p style="margin:14px 0 0 0;font-size:14px;color:#3f4753;">En \xE7ok \xE7al\u0131\u015Ft\u0131\u011F\u0131 ders: <strong>${escapeHtml4(digest.topSubject.subject)}</strong> (${escapeHtml4(formatMinutes(digest.topSubject.minutes))})</p>` : ""}
${examLine ? `<p style="margin:8px 0 0 0;font-size:14px;color:#3f4753;">${escapeHtml4(examLine)}</p>` : ""}
${weakRows ? `<p style="margin:18px 0 4px 0;font-size:14px;font-weight:700;">G\xFC\xE7lendirmesi gereken konular</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weakRows}</table>` : ""}
<p style="margin:22px 0 0 0;">${button(`${appUrl}/veli`, "Ayr\u0131nt\u0131lar\u0131 g\xF6r")}</p>`;
  const footer = `Pusula \xB7 Veli eri\u015Fimi<br>Bu \xF6zeti her pazar al\u0131yorsun. <a href="${escapeHtml4(unsubscribeUrl)}" style="color:#7c858e;">Almak istemiyorum</a>`;
  return { to, subject: subject2, text: text4, html: shell(subject2, `${studentName} bu hafta ${formatMinutes(digest.minutes)} \xE7al\u0131\u015Ft\u0131.`, body, footer) };
}

// server/digest/parentDigest.ts
var DAY_MS4 = 24 * 60 * 60 * 1e3;
var RESEND_AFTER_MS2 = 6 * DAY_MS4;
var TIME_BUDGET_MS2 = 6e4;
async function runParentDigest(options) {
  const db = await getDb();
  if (!db || options.maxPerRun <= 0) return { candidates: 0, sent: 0, failed: 0, stoppedEarly: false };
  const now = options.now ?? /* @__PURE__ */ new Date();
  const { start } = weeklyDigestWindow(now);
  const startedAt = Date.now();
  const rows = await db.select({ linkId: parentLinks.id, studentUserId: parentLinks.studentUserId, email: users.email }).from(parentLinks).innerJoin(users, eq13(users.id, parentLinks.parentUserId)).where(and10(
    eq13(parentLinks.status, "active"),
    eq13(parentLinks.weeklyDigestOptOut, 0),
    or3(isNull8(parentLinks.weeklyDigestLastSentAt), lt8(parentLinks.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS2))),
    isNotNull4(users.email),
    isNotNull4(users.emailVerifiedAt),
    eq13(users.approvalStatus, "approved"),
    eq13(users.accountStatus, "active")
  )).limit(options.maxPerRun);
  const result = { candidates: rows.length, sent: 0, failed: 0, stoppedEarly: false, ...options.dryRun ? { previews: [] } : {} };
  for (const row of rows) {
    if (Date.now() - startedAt > TIME_BUDGET_MS2) {
      result.stoppedEarly = true;
      break;
    }
    try {
      const [student] = await db.select({ name: users.name, preferredName: studentProfiles.preferredName }).from(users).leftJoin(studentProfiles, eq13(studentProfiles.userId, users.id)).where(eq13(users.id, row.studentUserId)).limit(1);
      const studentName = student?.preferredName || student?.name?.split(" ")[0] || "\xD6\u011Frenci";
      const digest = await collectDigest(row.studentUserId, start, now);
      const [exam] = await db.select({ title: userMockExams.title, exam: userMockExams.exam, net: userMockExams.net, subjectsJson: userMockExams.subjectsJson }).from(userMockExams).where(and10(eq13(userMockExams.userId, row.studentUserId), gte7(userMockExams.examDate, new Date(now.getTime() - 30 * DAY_MS4)))).orderBy(desc7(userMockExams.examDate)).limit(1);
      const lastExam = exam ? { title: exam.title, exam: exam.exam, net: Number(exam.net), estimatedScore: estimateScore(exam.exam, safeJson2(exam.subjectsJson)) } : null;
      const unsubscribeUrl = await unsubscribeUrlFor(options.appUrl, "parent", row.linkId);
      const mail = buildParentDigestEmail({ to: row.email, studentName, digest, start, end: now, appUrl: options.appUrl, unsubscribeUrl, lastExam });
      if (options.dryRun) {
        result.previews.push(mail);
        continue;
      }
      await sendMail(mail);
      await db.update(parentLinks).set({ weeklyDigestLastSentAt: now }).where(eq13(parentLinks.id, row.linkId));
      result.sent++;
    } catch (error) {
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[ParentDigest] link ${row.linkId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}
function safeJson2(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// server/parent/parentDb.ts
import { and as and11, desc as desc8, eq as eq14, gte as gte8, inArray as inArray8, ne as ne3 } from "drizzle-orm";

// shared/parent.ts
var MAX_PARENTS_PER_STUDENT = 3;
var PARENT_INVITE_DAYS = 7;
function parentInviteProblem(link, now = /* @__PURE__ */ new Date()) {
  if (!link) return "Bu kod ge\xE7erli de\u011Fil. \xD6\u011Frencinin verdi\u011Fi kodu kontrol eder misin?";
  if (link.status === "revoked") return "Bu kod iptal edilmi\u015F. \xD6\u011Frenciden yeni bir kod isteyebilirsin.";
  if (link.status !== "invited" || link.parentUserId !== null) return "Bu kod daha \xF6nce kullan\u0131lm\u0131\u015F. \xD6\u011Frenciden yeni bir kod isteyebilirsin.";
  if (new Date(link.expiresAt).getTime() <= now.getTime()) return "Bu kodun s\xFCresi dolmu\u015F. \xD6\u011Frenciden yeni bir kod isteyebilirsin.";
  return null;
}
var PARENT_CONSENT_VERSION = 1;
var PARENT_CONSENT_TEXT = `VEL\u0130 ER\u0130\u015E\u0130M\u0130 A\xC7IK RIZA METN\u0130 (TASLAK)

Bu kodu girerek, kodu bana veren \xF6\u011Frencinin velisi ya da yasal temsilcisi oldu\u011Fumu beyan ederim.

\xD6\u011Frenci iste\u011Fimi onaylad\u0131\u011F\u0131nda Pusula uygulamas\u0131nda \u015Fu bilgileri salt okunur olarak g\xF6rebilece\u011Fimi biliyorum: s\u0131nav\u0131 ve hedefi, s\u0131n\u0131f\u0131, \xE7al\u0131\u015Fma s\xFCresi, takvimdeki plan\u0131 ve plan uyumu, deneme sonu\xE7lar\u0131 ve konu ilerlemesi. \xD6\u011Frencinin notlar\u0131n\u0131, soru defterini, foto\u011Fraflar\u0131n\u0131, ses kay\u0131tlar\u0131n\u0131 ve ileti\u015Fim bilgilerini g\xF6remem.

Bu bilgilerin yaln\u0131zca \xF6\u011Frencinin e\u011Fitimini desteklemek amac\u0131yla kullan\u0131laca\u011F\u0131n\u0131, \xFC\xE7\xFCnc\xFC ki\u015Filerle payla\u015F\u0131lmayaca\u011F\u0131n\u0131 ve \xF6\u011Frencinin ya da benim bu eri\u015Fimi istedi\u011Fimiz an sonland\u0131rabilece\u011Fimizi kabul ediyorum. Haftal\u0131k \xF6zet e-postas\u0131n\u0131 istedi\u011Fim an kapatabilirim.

6698 say\u0131l\u0131 Ki\u015Fisel Verilerin Korunmas\u0131 Kanunu kapsam\u0131ndaki haklar\u0131m (bilgi talep etme, d\xFCzeltme, silme vb.) i\xE7in Pusula ile ileti\u015Fime ge\xE7ebilirim.`;

// server/parent/parentDb.ts
var ParentLinkError = class extends Error {
};
var DAY_MS5 = 24 * 60 * 60 * 1e3;
var MAX_INVITES_PER_DAY = 5;
async function requireDb6() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var displayNameOf = (row) => row.preferredName || row.name?.split(" ")[0] || "\xD6\u011Frenci";
async function createParentInvite(studentUserId, codeHash, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb6();
  const open = await db.select({ id: parentLinks.id, status: parentLinks.status }).from(parentLinks).where(and11(eq14(parentLinks.studentUserId, studentUserId), inArray8(parentLinks.status, ["pending", "active"])));
  if (open.length >= MAX_PARENTS_PER_STUDENT) throw new ParentLinkError(`En fazla ${MAX_PARENTS_PER_STUDENT} veli ba\u011Flanabilir. Yeni kod i\xE7in \xF6nce bir veli eri\u015Fimini kald\u0131r.`);
  const recent = await db.select({ id: parentLinks.id }).from(parentLinks).where(and11(eq14(parentLinks.studentUserId, studentUserId), gte8(parentLinks.createdAt, new Date(now.getTime() - DAY_MS5))));
  if (recent.length >= MAX_INVITES_PER_DAY) throw new ParentLinkError("Bug\xFCn yeterince kod \xFCrettin; yar\u0131n yeniden deneyebilirsin.");
  await db.update(parentLinks).set({ status: "revoked", revokedAt: now }).where(and11(eq14(parentLinks.studentUserId, studentUserId), eq14(parentLinks.status, "invited")));
  const expiresAt = new Date(now.getTime() + PARENT_INVITE_DAYS * DAY_MS5);
  const [row] = await db.insert(parentLinks).values({ studentUserId, codeHash, status: "invited", expiresAt }).returning({ id: parentLinks.id });
  return { id: row.id, expiresAt };
}
async function redeemParentInvite(parentUserId, codeHash, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb6();
  const [link] = await db.select().from(parentLinks).where(eq14(parentLinks.codeHash, codeHash)).limit(1);
  const problem = parentInviteProblem(link, now);
  if (problem) throw new ParentLinkError(problem);
  if (link.studentUserId === parentUserId) throw new ParentLinkError("Kendi kodunu veli olarak kullanamazs\u0131n; kodu velinle payla\u015F.");
  const [existing] = await db.select({ id: parentLinks.id }).from(parentLinks).where(and11(eq14(parentLinks.studentUserId, link.studentUserId), eq14(parentLinks.parentUserId, parentUserId), inArray8(parentLinks.status, ["pending", "active"]))).limit(1);
  if (existing) throw new ParentLinkError("Bu \xF6\u011Frenciye zaten ba\u011Fl\u0131s\u0131n ya da iste\u011Fin onay bekliyor.");
  const updated = await db.update(parentLinks).set({ parentUserId, status: "pending", parentConsentAt: now, parentConsentVersion: PARENT_CONSENT_VERSION }).where(and11(eq14(parentLinks.id, link.id), eq14(parentLinks.status, "invited"))).returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu kod daha \xF6nce kullan\u0131lm\u0131\u015F. \xD6\u011Frenciden yeni bir kod isteyebilirsin.");
  return { linkId: link.id, studentUserId: link.studentUserId };
}
async function decideParentRequest(studentUserId, linkId, approve, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb6();
  const updated = await db.update(parentLinks).set(approve ? { status: "active", studentApprovedAt: now } : { status: "revoked", revokedAt: now }).where(and11(eq14(parentLinks.id, linkId), eq14(parentLinks.studentUserId, studentUserId), eq14(parentLinks.status, "pending"))).returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu istek bulunamad\u0131 ya da zaten yan\u0131tland\u0131.");
}
async function revokeParentLink(actor, linkId, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb6();
  const owner = actor.side === "student" ? eq14(parentLinks.studentUserId, actor.userId) : eq14(parentLinks.parentUserId, actor.userId);
  const updated = await db.update(parentLinks).set({ status: "revoked", revokedAt: now }).where(and11(eq14(parentLinks.id, linkId), owner, ne3(parentLinks.status, "revoked"))).returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu ba\u011Flant\u0131 bulunamad\u0131.");
}
async function listLinksForStudent(studentUserId, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb6();
  const rows = await db.select({ id: parentLinks.id, status: parentLinks.status, expiresAt: parentLinks.expiresAt, createdAt: parentLinks.createdAt, parentConsentAt: parentLinks.parentConsentAt, studentApprovedAt: parentLinks.studentApprovedAt, parentName: users.name, parentEmail: users.email }).from(parentLinks).leftJoin(users, eq14(users.id, parentLinks.parentUserId)).where(and11(eq14(parentLinks.studentUserId, studentUserId), ne3(parentLinks.status, "revoked"))).orderBy(desc8(parentLinks.createdAt));
  return rows.filter((row) => row.status !== "invited" || row.expiresAt.getTime() > now.getTime()).map((row) => ({ ...row, parentName: row.parentName ?? null, parentEmail: row.parentEmail ?? null }));
}
async function listLinksForParent(parentUserId) {
  const db = await requireDb6();
  const rows = await db.select({ id: parentLinks.id, studentUserId: parentLinks.studentUserId, status: parentLinks.status, weeklyDigestOptOut: parentLinks.weeklyDigestOptOut, name: users.name, preferredName: studentProfiles.preferredName }).from(parentLinks).innerJoin(users, eq14(users.id, parentLinks.studentUserId)).leftJoin(studentProfiles, eq14(studentProfiles.userId, parentLinks.studentUserId)).where(and11(eq14(parentLinks.parentUserId, parentUserId), inArray8(parentLinks.status, ["pending", "active"]))).orderBy(desc8(parentLinks.createdAt));
  return rows.map((row) => ({ id: row.id, studentUserId: row.studentUserId, status: row.status, weeklyDigest: row.weeklyDigestOptOut === 0, studentName: displayNameOf({ preferredName: row.preferredName ?? null, name: row.name }) }));
}
async function findActiveLink(parentUserId, studentUserId) {
  const db = await requireDb6();
  const [row] = await db.select({ id: parentLinks.id, status: parentLinks.status }).from(parentLinks).where(and11(eq14(parentLinks.parentUserId, parentUserId), eq14(parentLinks.studentUserId, studentUserId), eq14(parentLinks.status, "active"))).limit(1);
  return row ?? null;
}
async function studentDisplayName(studentUserId) {
  const db = await requireDb6();
  const [row] = await db.select({ name: users.name, preferredName: studentProfiles.preferredName }).from(users).leftJoin(studentProfiles, eq14(studentProfiles.userId, users.id)).where(eq14(users.id, studentUserId)).limit(1);
  return row ? displayNameOf({ preferredName: row.preferredName ?? null, name: row.name }) : "\xD6\u011Frenci";
}
async function setParentDigestEnabled(parentUserId, linkId, enabled) {
  const db = await requireDb6();
  const updated = await db.update(parentLinks).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(and11(eq14(parentLinks.id, linkId), eq14(parentLinks.parentUserId, parentUserId))).returning({ id: parentLinks.id });
  if (!updated.length) throw new ParentLinkError("Bu ba\u011Flant\u0131 bulunamad\u0131.");
  return enabled;
}
async function disableParentDigestByLinkId(linkId) {
  const db = await requireDb6();
  await db.update(parentLinks).set({ weeklyDigestOptOut: 1 }).where(eq14(parentLinks.id, linkId));
}

// server/digest/weeklyDigest.ts
var DAY_MS6 = 24 * 60 * 60 * 1e3;
var ACTIVE_WITHIN_MS = 30 * DAY_MS6;
var RESEND_AFTER_MS3 = 6 * DAY_MS6;
var DEFAULT_MAX_PER_RUN = Number(process.env.WEEKLY_DIGEST_MAX_PER_RUN) || 90;
var TIME_BUDGET_MS3 = 24e4;
var WEEKLY_DIGEST_MAX_PER_RUN = DEFAULT_MAX_PER_RUN;
async function getWeeklyDigestEnabled(userId) {
  const db = await getDb();
  if (!db) return true;
  const [row] = await db.select({ optOut: studentProfiles.weeklyDigestOptOut }).from(studentProfiles).where(eq15(studentProfiles.userId, userId)).limit(1);
  return !row || row.optOut === 0;
}
async function setWeeklyDigestEnabled(userId, enabled) {
  const db = await getDb();
  if (!db) return enabled;
  await db.update(studentProfiles).set({ weeklyDigestOptOut: enabled ? 0 : 1 }).where(eq15(studentProfiles.userId, userId));
  return enabled;
}
async function collectDigest(userId, start, end) {
  const db = await getDb();
  const [sessions, logs, weakTopics, review] = await Promise.all([
    db.select({ sessionDate: studyPlanSessions.sessionDate, status: studyPlanSessions.status, plannedMinutes: studyPlanSessions.plannedMinutes }).from(studyPlanSessions).where(and12(eq15(studyPlanSessions.userId, userId), gte9(studyPlanSessions.sessionDate, start), lt9(studyPlanSessions.sessionDate, end))),
    db.select({ studyDate: topicStudyLogs.studyDate, subject: topicStudyLogs.subject, minutes: topicStudyLogs.minutes, questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(and12(eq15(topicStudyLogs.userId, userId), gte9(topicStudyLogs.studyDate, start), lt9(topicStudyLogs.studyDate, end))),
    db.select({ subject: yksTopics.subject, topic: yksTopics.topic, progress: topicProgress.progress }).from(topicProgress).innerJoin(yksTopics, eq15(yksTopics.id, topicProgress.topicId)).where(and12(eq15(topicProgress.userId, userId), eq15(topicProgress.status, "weak"))).orderBy(asc3(topicProgress.progress)).limit(3),
    getReviewSummary(userId).catch(() => ({ due: 0 }))
  ]);
  return buildWeeklyDigest({ sessions, logs, weakTopics, dueReviews: review.due, start, end });
}
async function runWeeklyDigest(options) {
  const db = await getDb();
  if (!db) return { candidates: 0, sent: 0, failed: 0, stoppedEarly: false };
  const now = options.now ?? /* @__PURE__ */ new Date();
  const { start } = weeklyDigestWindow(now);
  const startedAt = Date.now();
  const recipients = await db.select({ id: users.id, email: users.email, name: users.name, preferredName: studentProfiles.preferredName }).from(users).innerJoin(studentProfiles, eq15(studentProfiles.userId, users.id)).where(and12(
    isNotNull5(users.email),
    isNotNull5(users.emailVerifiedAt),
    eq15(users.approvalStatus, "approved"),
    eq15(users.accountStatus, "active"),
    gte9(users.lastSignedIn, new Date(now.getTime() - ACTIVE_WITHIN_MS)),
    eq15(studentProfiles.onboardingCompleted, 1),
    eq15(studentProfiles.weeklyDigestOptOut, 0),
    or4(isNull9(studentProfiles.weeklyDigestLastSentAt), lt9(studentProfiles.weeklyDigestLastSentAt, new Date(now.getTime() - RESEND_AFTER_MS3)))
  )).orderBy(desc9(users.lastSignedIn)).limit(options.maxPerRun ?? DEFAULT_MAX_PER_RUN);
  const targets = options.onlyUserIds ? recipients.filter((user) => options.onlyUserIds.includes(user.id)) : recipients;
  const result = { candidates: targets.length, sent: 0, failed: 0, stoppedEarly: false, ...options.dryRun ? { previews: [] } : {} };
  for (const user of targets) {
    if (Date.now() - startedAt > TIME_BUDGET_MS3) {
      result.stoppedEarly = true;
      break;
    }
    try {
      const digest = await collectDigest(user.id, start, now);
      const unsubscribeUrl = await unsubscribeUrlFor(options.appUrl, "student", user.id);
      const mail = buildWeeklyDigestEmail({ to: user.email, name: user.preferredName || user.name?.split(" ")[0] || null, digest, start, end: now, appUrl: options.appUrl, unsubscribeUrl });
      if (options.dryRun) {
        result.previews.push(mail);
        continue;
      }
      await sendMail(mail);
      await db.update(studentProfiles).set({ weeklyDigestLastSentAt: now }).where(eq15(studentProfiles.userId, user.id));
      result.sent++;
    } catch (error) {
      if (error instanceof MailNotConfiguredError) throw error;
      result.failed++;
      console.error(`[WeeklyDigest] user ${user.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}
var page = (title, body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f3f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18202a;">
<div style="max-width:440px;margin:64px auto;padding:0 16px;"><div style="background:#fff;border:1px solid #e6ebe9;border-radius:20px;padding:28px 24px;text-align:center;">${body}</div></div></body></html>`;
var button2 = "display:inline-block;margin-top:18px;background:#17625f;color:#fff;border:0;text-decoration:none;font-size:15px;font-weight:700;padding:12px 24px;border-radius:12px;cursor:pointer;";
function registerWeeklyDigestRoutes(app2) {
  app2.get("/api/cron/weekly-digest", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (ENV.isProduction && !secret) {
      res.status(503).json({ ok: false, error: "CRON_SECRET not set" });
      return;
    }
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    try {
      const appUrl = appBaseUrl(req);
      const students = await runWeeklyDigest({ appUrl });
      const staff = await runTeacherDigest({ appUrl, maxPerRun: Math.max(0, WEEKLY_DIGEST_MAX_PER_RUN - students.sent - students.failed) });
      const parents = await runParentDigest({ appUrl, maxPerRun: Math.max(0, WEEKLY_DIGEST_MAX_PER_RUN - students.sent - students.failed - staff.sent - staff.failed) });
      const result = { students, staff, parents };
      console.info("[WeeklyDigest]", JSON.stringify(result));
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });
  app2.get("/api/email/weekly-digest/unsubscribe", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (!await readUnsubscribeToken(token)) {
      res.status(400).send(page("Ba\u011Flant\u0131 ge\xE7ersiz", `<h1 style="font-size:20px;margin:0 0 8px;">Ba\u011Flant\u0131 ge\xE7ersiz</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Haftal\u0131k \xF6zet ayar\u0131n\u0131 uygulamada profil men\xFCs\xFCnden de\u011Fi\u015Ftirebilirsin.</p><a href="${appBaseUrl(req)}" style="${button2}">Pusula'y\u0131 a\xE7</a>`));
      return;
    }
    res.send(page("Haftal\u0131k \xF6zet", `<h1 style="font-size:20px;margin:0 0 8px;">Haftal\u0131k \xF6zet e-postalar\u0131</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Her pazar gelen \xF6zeti art\u0131k almak istemiyor musun?</p><form method="post"><input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}"><button type="submit" style="${button2}">Evet, almak istemiyorum</button></form>`));
  });
  app2.post("/api/email/weekly-digest/unsubscribe", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : typeof req.query.token === "string" ? req.query.token : "";
    const target = await readUnsubscribeToken(token);
    res.setHeader("Cache-Control", "no-store");
    if (!target) {
      res.status(400).send(page("Ba\u011Flant\u0131 ge\xE7ersiz", `<h1 style="font-size:20px;margin:0;">Ba\u011Flant\u0131 ge\xE7ersiz</h1>`));
      return;
    }
    if (target.kind === "staff") await setStaffDigestEnabledByMemberId(target.id, false);
    else if (target.kind === "parent") await disableParentDigestByLinkId(target.id);
    else await setWeeklyDigestEnabled(target.id, false);
    const where = target.kind === "staff" ? "Kurum Paneli'nde sol alttaki <strong>Haftal\u0131k s\u0131n\u0131f \xF6zeti</strong> se\xE7ene\u011Fiyle" : target.kind === "parent" ? "veli sayfas\u0131ndaki <strong>Haftal\u0131k \xF6zet e-postas\u0131</strong> se\xE7ene\u011Fiyle" : "uygulamada profil men\xFCs\xFCndeki <strong>Haftal\u0131k \xF6zet e-postas\u0131</strong> se\xE7ene\u011Fiyle";
    res.send(page("Abonelikten \xE7\u0131kt\u0131n", `<h1 style="font-size:20px;margin:0 0 8px;">Tamam, art\u0131k g\xF6ndermeyece\u011Fiz</h1><p style="font-size:14px;color:#5d6670;line-height:1.6;">Fikrini de\u011Fi\u015Ftirirsen ${where} yeniden a\xE7abilirsin.</p><a href="${appBaseUrl(req)}${target.kind === "staff" ? "/kurum" : ""}" style="${button2}">Pusula'y\u0131 a\xE7</a>`));
  });
}

// server/errors/errorLog.ts
import { createHash as createHash2 } from "node:crypto";
import { and as and13, desc as desc10, eq as eq16, isNotNull as isNotNull6, isNull as isNull10, sql as sql8 } from "drizzle-orm";
import { z } from "zod";

// shared/errorLog.ts
var MAX_MESSAGE = 500;
var MAX_STACK = 6e3;
var clampMessage = (message) => message.trim().slice(0, MAX_MESSAGE) || "(mesajs\u0131z hata)";
var clampStack = (stack) => stack ? stack.slice(0, MAX_STACK) : null;
var normalizeMessage = (message) => clampMessage(message).replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>").replace(/\d+/g, "#");
function firstStackFrame(stack) {
  if (!stack) return "";
  const line = stack.split("\n").map((item) => item.trim()).find((item) => item.startsWith("at ") || item.includes("@")) ?? "";
  return line.replace(/https?:\/\/[^/\s)]+/g, "").replace(/\?[^\s):]*/g, "").replace(/-[A-Za-z0-9_]{8}(\.m?js)/g, "$1").replace(/:\d+(:\d+)?/g, "");
}
var errorFingerprintKey = (source, message, stack) => `${source}|${normalizeMessage(message)}|${firstStackFrame(stack)}`;
var IGNORED_MESSAGES = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i,
  // Ağ kopmaları kod hatası değildir (tRPC/fetch kendi hata mesajını zaten gösterir).
  /^(TypeError: )?(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?)$/i,
  /^AbortError/i
];
function isIgnoredClientError(message, stack) {
  if (IGNORED_MESSAGES.some((pattern) => pattern.test(message.trim()))) return true;
  return Boolean(stack && /(chrome|moz|safari(-web)?)-extension:\/\//.test(stack));
}

// server/errors/errorLog.ts
async function recordAppError(input) {
  try {
    const db = await getDb();
    if (!db) return;
    const message = clampMessage(input.message);
    const stack = clampStack(input.stack);
    const fingerprint = createHash2("sha256").update(errorFingerprintKey(input.source, message, stack)).digest("hex");
    const now = /* @__PURE__ */ new Date();
    const latest = { message, stack, path: input.path?.slice(0, 300) ?? null, lastUserId: input.userId ?? null, userAgent: input.userAgent?.slice(0, 300) ?? null };
    await db.insert(appErrors).values({ fingerprint, source: input.source, ...latest, firstSeenAt: now, lastSeenAt: now }).onConflictDoUpdate({ target: appErrors.fingerprint, set: { ...latest, count: sql8`${appErrors.count} + 1`, lastSeenAt: now, resolvedAt: null } });
  } catch (error) {
    console.error("[ErrorLog] could not record:", error instanceof Error ? error.message : error);
  }
}
async function listAppErrors(status, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appErrors).where(status === "open" ? isNull10(appErrors.resolvedAt) : isNotNull6(appErrors.resolvedAt)).orderBy(desc10(appErrors.lastSeenAt)).limit(limit);
}
async function resolveAppError(id8) {
  const db = await getDb();
  if (!db) return;
  await db.update(appErrors).set({ resolvedAt: /* @__PURE__ */ new Date() }).where(and13(eq16(appErrors.id, id8), isNull10(appErrors.resolvedAt)));
}
var clientReport = z.object({
  message: z.string().min(1).max(2e3),
  stack: z.string().max(2e4).nullish(),
  path: z.string().max(300).nullish()
});
var clientIp = (req) => typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : req.socket.remoteAddress ?? "unknown";
function registerErrorLogRoutes(app2) {
  app2.post("/api/errors", async (req, res) => {
    try {
      checkRateLimit(`client-error:${clientIp(req)}`, 30, 10 * 60 * 1e3);
    } catch {
      res.status(429).end();
      return;
    }
    const parsed = clientReport.safeParse(req.body);
    if (!parsed.success || isIgnoredClientError(parsed.data.message, parsed.data.stack)) {
      res.status(204).end();
      return;
    }
    const user = await authenticateRequest(req).catch(() => null);
    await recordAppError({ source: "client", message: parsed.data.message, stack: parsed.data.stack, path: parsed.data.path, userId: user?.id ?? null, userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null });
    res.status(204).end();
  });
}
function errorLogMiddleware(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = error?.status ?? error?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: "Ge\xE7ersiz istek." });
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[Express] ${req.method} ${req.path}:`, err.message);
  void recordAppError({ source: "server", message: err.message, stack: err.stack, path: `${req.method} ${req.path}` });
  res.status(500).json({ error: "Beklenmeyen bir hata olu\u015Ftu." });
}

// server/push/sessionReminders.ts
import { and as and14, eq as eq17, gte as gte10, isNull as isNull11, lte as lte4 } from "drizzle-orm";

// shared/sessionReminder.ts
var REMINDER_MIN_LEAD_MS = 2 * 60 * 1e3;
var REMINDER_MAX_LEAD_MS = 20 * 60 * 1e3;
function buildReminderMessage(session, now) {
  const minutes = Math.max(1, Math.round((session.sessionDate.getTime() - now.getTime()) / 6e4));
  const review = session.kind === NOTEBOOK_REVIEW_TASK_KIND;
  return {
    title: review ? `${minutes} dk sonra: soru defteri tekrar\u0131` : `${minutes} dk sonra: ${session.topic}`,
    body: review ? "Tekrar listendeki sorular seni bekliyor. Haz\u0131rsan ba\u015Flayal\u0131m." : `${session.subject} \xB7 ${session.plannedMinutes} dk. Telefonunu u\xE7ak moduna al, oda\u011Fa haz\u0131rlan.`,
    // Bildirime dokununca bu oturumun odak ekranı açılır (Home.tsx `?odak=`).
    url: `/?odak=${session.id}`,
    tag: `session-${session.id}`
  };
}

// server/push/sessionReminders.ts
async function runSessionReminders(now = /* @__PURE__ */ new Date()) {
  const result = { due: 0, sent: 0, delivered: 0, removed: 0, failed: 0 };
  const db = await getDb();
  if (!db || !pushConfigured()) return result;
  const sessions = await db.selectDistinct({ id: studyPlanSessions.id, userId: studyPlanSessions.userId, sessionDate: studyPlanSessions.sessionDate, subject: studyPlanSessions.subject, topic: studyPlanSessions.topic, kind: studyPlanSessions.kind, plannedMinutes: studyPlanSessions.plannedMinutes }).from(studyPlanSessions).innerJoin(pushSubscriptions, eq17(pushSubscriptions.userId, studyPlanSessions.userId)).where(and14(
    eq17(studyPlanSessions.status, "planned"),
    isNull11(studyPlanSessions.reminderSentAt),
    gte10(studyPlanSessions.sessionDate, new Date(now.getTime() + REMINDER_MIN_LEAD_MS)),
    lte4(studyPlanSessions.sessionDate, new Date(now.getTime() + REMINDER_MAX_LEAD_MS))
  )).limit(500);
  result.due = sessions.length;
  for (const session of sessions) {
    const [claim] = await db.update(studyPlanSessions).set({ reminderSentAt: now }).where(and14(eq17(studyPlanSessions.id, session.id), isNull11(studyPlanSessions.reminderSentAt))).returning({ id: studyPlanSessions.id });
    if (!claim) continue;
    const outcome = await sendToUser(session.userId, buildReminderMessage(session, now));
    result.sent++;
    result.delivered += outcome.delivered;
    result.removed += outcome.removed;
    result.failed += outcome.failed;
  }
  return result;
}
var authorized = (header) => {
  const secrets = [process.env.CRON_SECRET, process.env.REMINDER_CRON_SECRET].filter((value) => Boolean(value));
  return secrets.some((secret) => header === `Bearer ${secret}`);
};
function registerSessionReminderRoutes(app2) {
  app2.post("/api/cron/session-reminders", async (req, res) => {
    const anySecret = Boolean(process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET);
    if (ENV.isProduction && !anySecret) {
      res.status(503).json({ ok: false, error: "CRON secret not set" });
      return;
    }
    if (anySecret && !authorized(req.headers.authorization)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    try {
      const result = await runSessionReminders();
      if (result.due) console.info("[SessionReminders]", JSON.stringify(result));
      res.json({ ok: true, configured: pushConfigured(), result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });
}

// server/_core/webhooks.ts
import express from "express";

// server/subscriptions/paymentProviders/types.ts
var ProviderConfigRequiredError = class extends Error {
  constructor(provider, method) {
    super(`CONFIG_REQUIRED: "${provider}" sa\u011Flay\u0131c\u0131s\u0131 i\xE7in "${method}" hen\xFCz ger\xE7ek credential'larla yap\u0131land\u0131r\u0131lmad\u0131 \u2014 bkz. docs/subscription/SUBSCRIPTION-ARCHITECTURE.md`);
    this.name = "ProviderConfigRequiredError";
  }
};

// server/subscriptions/paymentProviders/appleProvider.ts
var AppleAppStoreProvider = class {
  name = "apple";
  assertConfigured(method) {
    throw new ProviderConfigRequiredError("apple", method);
  }
  async createCheckout() {
    this.assertConfigured("createCheckout (StoreKit istemci taraf\u0131nda ba\u015Flat\u0131l\u0131r)");
  }
  async createSubscription() {
    this.assertConfigured("createSubscription");
  }
  async cancelSubscription() {
    this.assertConfigured("cancelSubscription (Apple abonelikleri yaln\u0131zca kullan\u0131c\u0131 taraf\u0131ndan iptal edilebilir)");
  }
  async restorePurchase() {
    this.assertConfigured("restorePurchase");
  }
  async verifyPurchase() {
    this.assertConfigured("verifyPurchase (App Store Server API JWT + transaction lookup gerekir)");
  }
  async handleWebhook() {
    this.assertConfigured("handleWebhook (App Store Server Notifications V2 JWS zincir do\u011Frulamas\u0131 gerekir)");
  }
  async refund() {
    this.assertConfigured("refund (Apple'da refund App Store/Apple taraf\u0131ndan tetiklenir, sunucu yaln\u0131zca bildirimi dinler)");
  }
  async getSubscription() {
    this.assertConfigured("getSubscription");
  }
};

// server/subscriptions/paymentProviders/googleProvider.ts
var GooglePlayProvider = class {
  name = "google";
  assertConfigured(method) {
    throw new ProviderConfigRequiredError("google", method);
  }
  async createCheckout() {
    this.assertConfigured("createCheckout (Play Billing istemci taraf\u0131nda ba\u015Flat\u0131l\u0131r)");
  }
  async createSubscription() {
    this.assertConfigured("createSubscription");
  }
  async cancelSubscription() {
    this.assertConfigured("cancelSubscription");
  }
  async restorePurchase() {
    this.assertConfigured("restorePurchase");
  }
  async verifyPurchase() {
    this.assertConfigured("verifyPurchase (Play Developer API purchaseToken do\u011Frulamas\u0131 gerekir)");
  }
  async handleWebhook() {
    this.assertConfigured("handleWebhook (Real-time Developer Notifications / Pub/Sub do\u011Frulamas\u0131 gerekir)");
  }
  async refund() {
    this.assertConfigured("refund");
  }
  async getSubscription() {
    this.assertConfigured("getSubscription");
  }
};

// server/subscriptions/paymentProviders/mockProvider.ts
import { createHmac, randomUUID as randomUUID2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function getMockSecret() {
  return ENV.paymentMockWebhookSecret || "mock-payment-secret-dev-only";
}
function sign(payload) {
  return createHmac("sha256", getMockSecret()).update(payload).digest("hex");
}
var MockPaymentProvider = class {
  name = "web";
  async createCheckout(input) {
    const providerSessionId = `mock_checkout_${randomUUID2()}`;
    console.log(`[MockPaymentProvider] (SANDBOX, ger\xE7ek para YOK) checkout olu\u015Fturuldu: user=${input.userId} plan=${input.planCode} session=${providerSessionId}`);
    return { checkoutUrl: `${input.successUrl}?mock_session=${providerSessionId}`, providerSessionId };
  }
  async createSubscription(input) {
    const providerSubscriptionId = `mock_sub_${randomUUID2()}`;
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);
    console.log(`[MockPaymentProvider] (SANDBOX) subscription olu\u015Fturuldu: ${providerSubscriptionId} \u2014 ger\xE7ek aktivasyon yaln\u0131zca webhook geldi\u011Finde olur.`);
    return { providerSubscriptionId, providerCustomerId: `mock_customer_${input.userId}`, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }
  async cancelSubscription(providerSubscriptionId) {
    console.log(`[MockPaymentProvider] (SANDBOX) iptal edildi: ${providerSubscriptionId}`);
  }
  async restorePurchase(input) {
    if (!input.providerToken) return { valid: false, reason: "Bo\u015F token" };
    return { valid: true, providerSubscriptionId: input.providerToken, providerCustomerId: `mock_customer_${input.userId}` };
  }
  async verifyPurchase(providerToken) {
    if (!providerToken.startsWith("mock_")) return { valid: false, reason: "Tan\u0131nmayan sandbox token format\u0131" };
    return { valid: true, providerSubscriptionId: providerToken };
  }
  /** Test yardımcı fonksiyonu — gerçek bir sağlayıcı asla böyle bir "imzala" fonksiyonu sunmaz, yalnızca mock'a özgü. */
  signTestPayload(payload) {
    return sign(payload);
  }
  async handleWebhook(input) {
    const raw = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const signatureHeader = input.headers["x-mock-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) return { valid: false, reason: "\u0130mza ba\u015Fl\u0131\u011F\u0131 eksik (x-mock-signature)" };
    const expected = sign(raw);
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual2(signatureBuffer, expectedBuffer)) {
      return { valid: false, reason: "\u0130mza do\u011Frulanamad\u0131" };
    }
    try {
      const payload = JSON.parse(raw);
      if (!payload.eventId || !payload.eventType) return { valid: false, reason: "eventId/eventType eksik" };
      return { valid: true, eventId: payload.eventId, eventType: payload.eventType, payload };
    } catch {
      return { valid: false, reason: "Ge\xE7ersiz JSON payload" };
    }
  }
  async refund(providerPaymentId) {
    console.log(`[MockPaymentProvider] (SANDBOX) iade edildi: ${providerPaymentId}`);
  }
  async getSubscription(providerSubscriptionId) {
    if (!providerSubscriptionId.startsWith("mock_sub_")) return null;
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);
    return { providerSubscriptionId, providerCustomerId: null, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false };
  }
};

// server/subscriptions/paymentProviders/factory.ts
function paymentProviderFactory(providerName = ENV.paymentProvider) {
  switch (providerName) {
    case "apple":
      return new AppleAppStoreProvider();
    case "google":
      return new GooglePlayProvider();
    case "mock":
    case "web":
    default:
      return new MockPaymentProvider();
  }
}

// shared/subscriptionStateMachine.ts
var ALLOWED_TRANSITIONS = {
  incomplete: ["active", "canceled", "expired"],
  trialing: ["active", "canceled", "expired"],
  // "active" hem "ücretsiz plan, süresiz aktif" hem "premium, ödeme
  // döngüsünde aktif" durumunu temsil eder — FREE'den PREMIUM trial'ına
  // geçiş (spec §10/§11) bu yüzden active->trialing'i içerir.
  active: ["trialing", "past_due", "canceled", "paused", "expired"],
  past_due: ["active", "grace_period", "canceled", "expired"],
  grace_period: ["active", "expired", "canceled"],
  paused: ["active", "canceled"],
  canceled: ["active"],
  // resume — yalnızca dönem bitmeden önce (bkz. resolveCancellation)
  expired: ["active", "trialing"]
  // trialing yalnızca hiç trial kullanmamış (yeni) bir abonelik satırı içindir; gerçek "restart" application katmanında engellenir
};
function canTransitionSubscriptionStatus(from, to) {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
function assertValidSubscriptionTransition(from, to) {
  if (!canTransitionSubscriptionStatus(from, to)) {
    throw new Error(`Ge\xE7ersiz abonelik durum ge\xE7i\u015Fi: ${from} -> ${to}`);
  }
}
function resolveEffectiveStatus(snapshot, now) {
  const { status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt } = snapshot;
  if (status === "trialing" && trialEndsAt && now >= trialEndsAt) return "expired";
  if (status === "grace_period" && gracePeriodEndsAt && now >= gracePeriodEndsAt) return "expired";
  if (status === "active" && cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "expired";
  if (status === "active" && !cancelAtPeriodEnd && currentPeriodEnd && now >= currentPeriodEnd) return "past_due";
  return status;
}
var PREMIUM_ACCESS_STATUSES = ["trialing", "active", "grace_period"];
function statusGrantsPremiumAccess(status) {
  return PREMIUM_ACCESS_STATUSES.includes(status);
}

// shared/yksCalendar.ts
var YKS_EXAMS = [
  { year: 2026, firstDay: "2026-06-20", lastDay: "2026-06-21" },
  { year: 2027, firstDay: "2027-06-19", lastDay: "2027-06-20" }
];
var LGS_EXAMS = [
  { year: 2026, firstDay: "2026-06-13", lastDay: "2026-06-13" }
];
var KPSS_EXAMS = [
  { year: 2026, firstDay: "2026-09-06", lastDay: "2026-09-06" }
];
var DGS_EXAMS = [
  { year: 2026, firstDay: "2026-07-19", lastDay: "2026-07-19" }
];
var MEB_AGS_EXAMS = [
  { year: 2026, firstDay: "2026-07-26", lastDay: "2026-07-26" }
];
var KPSS_A_EXAMS = [
  { year: 2026, firstDay: "2026-09-12", lastDay: "2026-09-13" }
];
var EXAMS_BY_TRACK = { YKS: YKS_EXAMS, LGS: LGS_EXAMS, KPSS: KPSS_EXAMS, DGS: DGS_EXAMS, MEB_AGS: MEB_AGS_EXAMS, KPSS_A: KPSS_A_EXAMS };
var EXAM_CYCLE_YEARS = { YKS: 1, LGS: 1, KPSS: 2, DGS: 1, MEB_AGS: 1, KPSS_A: 2 };
function cycleYearFrom(year, track) {
  const cycle = EXAM_CYCLE_YEARS[track];
  const anchor = EXAMS_BY_TRACK[track][0].year;
  const offset = ((year - anchor) % cycle + cycle) % cycle;
  return offset === 0 ? year : year + (cycle - offset);
}
var DAY_MS7 = 24 * 60 * 60 * 1e3;
var endOfIstanbulDay = (isoDate2) => /* @__PURE__ */ new Date(`${isoDate2}T23:59:59.999+03:00`);
function examEndOf(requestedYear, track = "YKS") {
  const exams = EXAMS_BY_TRACK[track];
  const year = cycleYearFrom(requestedYear, track);
  const known = exams.find((exam) => exam.year === year);
  if (known) return { year, endsAt: endOfIstanbulDay(known.lastDay), estimated: false };
  const last = exams[exams.length - 1];
  return { year, endsAt: endOfIstanbulDay(`${year}${last.lastDay.slice(4)}`), estimated: true };
}
function nextExamEnd(now, examYear, track = "YKS") {
  if (examYear) {
    const chosen = examEndOf(examYear, track);
    if (chosen.endsAt.getTime() > now.getTime()) return chosen;
  }
  let year = Math.min(...EXAMS_BY_TRACK[track].map((exam) => exam.year));
  let end = examEndOf(year, track);
  while (end.endsAt.getTime() <= now.getTime()) {
    year = end.year + EXAM_CYCLE_YEARS[track];
    end = examEndOf(year, track);
  }
  return end;
}
function planPeriodEnd(billingPeriod, now, examYear, track = "YKS") {
  return billingPeriod === "yearly" ? nextExamEnd(now, examYear, track).endsAt : new Date(now.getTime() + 30 * DAY_MS7);
}
var YKS_TERM_DISCOUNT = 0.2;
function yksTermPrice(input) {
  const yks = nextExamEnd(input.now, input.examYear, input.track ?? "YKS");
  const months = Math.max(1, Math.ceil((yks.endsAt.getTime() - input.now.getTime()) / (30 * DAY_MS7)));
  const monthlyTotal = input.monthlyPrice * months;
  const discountedLira = monthlyTotal * (1 - YKS_TERM_DISCOUNT) / 100;
  let price = (Math.round((discountedLira + 1) / 100) * 100 - 1) * 100;
  if (price <= 0 || price >= monthlyTotal) price = Math.floor(monthlyTotal * (1 - YKS_TERM_DISCOUNT));
  return { price, months, monthlyTotal, yks };
}

// server/subscriptions/subscriptionDb.ts
import { and as and15, desc as desc11, eq as eq18, gte as gte11, sql as sql9 } from "drizzle-orm";
async function listActivePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq18(subscriptionPlans.isActive, 1));
}
async function getStudentExamYearFor(userId, track) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select({ examTrack: studentProfiles.examTrack, examYear: studentProfiles.examYear }).from(studentProfiles).where(eq18(studentProfiles.userId, userId)).limit(1);
  if (profile?.examTrack === track) return profile.examYear ?? null;
  const [row] = await db.select({ examYear: studentExamTracks.examYear }).from(studentExamTracks).where(and15(eq18(studentExamTracks.userId, userId), eq18(studentExamTracks.track, track))).limit(1);
  return row?.examYear ?? null;
}
async function getStudentExamTrack(userId) {
  const db = await getDb();
  if (!db) return "YKS";
  const [row] = await db.select({ examTrack: studentProfiles.examTrack }).from(studentProfiles).where(eq18(studentProfiles.userId, userId)).limit(1);
  return row?.examTrack ?? "YKS";
}
async function getPlanByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq18(subscriptionPlans.code, code)).limit(1);
  return rows[0];
}
async function getPlanById(id8) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptionPlans).where(eq18(subscriptionPlans.id, id8)).limit(1);
  return rows[0];
}
async function upsertPlan(input, options = {}) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPlanByCode(input.code);
  if (existing) {
    const priceFields = options.keepPrice ? {} : { price: input.price, trialDays: input.trialDays ?? 0 };
    await db.update(subscriptionPlans).set({ name: input.name, description: input.description ?? null, tier: input.tier, track: input.track ?? null, billingPeriod: input.billingPeriod, currency: input.currency ?? "TRY", storeProductId: input.storeProductId ?? null, provider: input.provider ?? null, ...priceFields }).where(eq18(subscriptionPlans.id, existing.id));
    return;
  }
  await db.insert(subscriptionPlans).values({ code: input.code, name: input.name, description: input.description ?? null, tier: input.tier, track: input.track ?? null, billingPeriod: input.billingPeriod, price: input.price, currency: input.currency ?? "TRY", trialDays: input.trialDays ?? 0, storeProductId: input.storeProductId ?? null, provider: input.provider ?? null });
}
async function listAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.code);
}
async function updatePlanPricing(id8, patch) {
  const db = await getDb();
  if (!db) return void 0;
  await db.update(subscriptionPlans).set({ ...patch.price !== void 0 ? { price: patch.price } : {}, ...patch.trialDays !== void 0 ? { trialDays: patch.trialDays } : {}, ...patch.isActive !== void 0 ? { isActive: patch.isActive ? 1 : 0 } : {} }).where(eq18(subscriptionPlans.id, id8));
  return getPlanById(id8);
}
async function getSubscriptionByUserId(userId, track) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(subscriptions).where(and15(eq18(subscriptions.userId, userId), eq18(subscriptions.track, track))).limit(1);
  return rows[0];
}
async function listSubscriptionsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq18(subscriptions.userId, userId));
}
async function ensureFreeSubscription(userId, track) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  const existing = await getSubscriptionByUserId(userId, track);
  if (existing) return existing;
  const freePlan = await getPlanByCode("FREE");
  if (!freePlan) throw new Error("FREE plan\u0131 bulunamad\u0131 \u2014 \xF6nce seedSubscriptionPlans() \xE7al\u0131\u015Ft\u0131r\u0131lmal\u0131");
  await db.insert(subscriptions).values({ userId, track, planId: freePlan.id, status: "active", provider: null }).onConflictDoUpdate({ target: [subscriptions.userId, subscriptions.track], set: { updatedAt: /* @__PURE__ */ new Date() } });
  const created = await getSubscriptionByUserId(userId, track);
  if (!created) throw new Error("Free subscription olu\u015Fturulamad\u0131");
  return created;
}
async function listAllSubscriptionsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    userId: subscriptions.userId,
    track: subscriptions.track,
    userName: users.name,
    userEmail: users.email,
    status: subscriptions.status,
    planCode: subscriptionPlans.code,
    planName: subscriptionPlans.name,
    trialEndsAt: subscriptions.trialEndsAt,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    isManualOverride: subscriptions.isManualOverride,
    provider: subscriptions.provider,
    updatedAt: subscriptions.updatedAt
  }).from(subscriptions).innerJoin(users, eq18(users.id, subscriptions.userId)).innerJoin(subscriptionPlans, eq18(subscriptionPlans.id, subscriptions.planId)).orderBy(desc11(subscriptions.updatedAt));
}
async function updateSubscription(userId, track, patch) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  await db.update(subscriptions).set(patch).where(and15(eq18(subscriptions.userId, userId), eq18(subscriptions.track, track)));
  const updated = await getSubscriptionByUserId(userId, track);
  if (!updated) throw new Error("Abonelik bulunamad\u0131");
  return updated;
}
async function createPayment(input) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok");
  const result = await db.insert(payments).values(input).returning({ id: payments.id });
  return Number(result[0].id);
}
async function updatePaymentStatus(paymentId, patch) {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(patch).where(eq18(payments.id, paymentId));
}
async function listPaymentsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq18(payments.userId, userId)).orderBy(desc11(payments.createdAt));
}
async function listAllPaymentsForAdmin(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: payments.id, userId: payments.userId, userName: users.name, userEmail: users.email, amount: payments.amount, currency: payments.currency, provider: payments.provider, status: payments.status, paymentType: payments.paymentType, providerPaymentId: payments.providerPaymentId, createdAt: payments.createdAt, paidAt: payments.paidAt }).from(payments).innerJoin(users, eq18(users.id, payments.userId)).orderBy(desc11(payments.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}
async function isDuplicateEvent(provider, eventId) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: paymentEvents.id, status: paymentEvents.status }).from(paymentEvents).where(and15(eq18(paymentEvents.provider, provider), eq18(paymentEvents.eventId, eventId))).limit(1);
  return rows.length > 0 && rows[0].status === "processed";
}
async function recordEventReceived(input) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paymentEvents).values(input).returning({ id: paymentEvents.id });
    return Number(result[0].id);
  } catch {
    const rows = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(and15(eq18(paymentEvents.provider, input.provider), eq18(paymentEvents.eventId, input.eventId))).limit(1);
    return rows[0]?.id ?? null;
  }
}
async function markEventProcessed(id8, status, errorMessage) {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentEvents).set({ status, processedAt: /* @__PURE__ */ new Date(), errorMessage: errorMessage ?? null }).where(eq18(paymentEvents.id, id8));
}
async function writeAuditLog(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptionAuditLogs).values({
    userId: input.userId,
    adminId: input.adminId ?? null,
    action: input.action,
    oldState: input.oldState !== void 0 ? JSON.stringify(input.oldState) : null,
    newState: input.newState !== void 0 ? JSON.stringify(input.newState) : null,
    reason: input.reason ?? null,
    metadata: input.metadata !== void 0 ? JSON.stringify(input.metadata) : null
  });
}
async function listAuditLogsForUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).where(eq18(subscriptionAuditLogs.userId, userId)).orderBy(desc11(subscriptionAuditLogs.createdAt));
}
async function listAllAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionAuditLogs).orderBy(desc11(subscriptionAuditLogs.createdAt)).limit(Math.min(500, Math.max(1, limit)));
}
async function recordFeatureUsage(userId, featureKey, track) {
  const db = await getDb();
  if (!db) return;
  await db.insert(featureUsageLogs).values({ userId, featureKey, track });
}
async function countFeatureUsage(userId, featureKey, windowDays, track) {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1e3);
  const rows = await db.select({ id: featureUsageLogs.id }).from(featureUsageLogs).where(and15(eq18(featureUsageLogs.userId, userId), eq18(featureUsageLogs.track, track), eq18(featureUsageLogs.featureKey, featureKey), gte11(featureUsageLogs.usedAt, since)));
  return rows.length;
}
async function resetFeatureUsage(userId, featureKey, windowDays, adminId, track) {
  const db = await getDb();
  if (!db) return;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1e3);
  await db.delete(featureUsageLogs).where(and15(eq18(featureUsageLogs.userId, userId), eq18(featureUsageLogs.featureKey, featureKey), gte11(featureUsageLogs.usedAt, since), ...track ? [eq18(featureUsageLogs.track, track)] : []));
  await writeAuditLog({ userId, adminId, action: "usage_reset", newState: { featureKey, windowDays, track: track ?? "all" } });
}
async function listPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(users).where(eq18(users.approvalStatus, "pending")).orderBy(desc11(users.createdAt));
  return rows.map(({ passwordHash: _passwordHash, ...safeUser }) => ({ ...safeUser, phone: phoneFromOpenId(safeUser.openId) }));
}
async function approveUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "approved", approvedAt: /* @__PURE__ */ new Date(), approvedBy: adminId, rejectedAt: null, rejectionReason: null }).where(eq18(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_approved", newState: { approvalStatus: "approved" } });
}
async function rejectUser(userId, adminId, reason) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approvalStatus: "rejected", rejectedAt: /* @__PURE__ */ new Date(), rejectionReason: reason ?? null }).where(eq18(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_rejected", newState: { approvalStatus: "rejected" }, reason });
}

// server/subscriptions/webhookRedaction.ts
var SENSITIVE_KEYS = /* @__PURE__ */ new Set(["card_number", "cardNumber", "cvv", "cvc", "password", "secret", "token", "access_token", "refresh_token", "authorization"]);
function redactSensitivePayload(value) {
  if (Array.isArray(value)) return value.map(redactSensitivePayload);
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, val]) => {
      if (SENSITIVE_KEYS.has(key)) return [key, "[REDACTED]"];
      return [key, redactSensitivePayload(val)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}
function redactAndStringify(payload) {
  return JSON.stringify(redactSensitivePayload(payload));
}

// server/subscriptions/webhookProcessor.ts
async function processWebhookEvent(input) {
  const alreadyProcessed = await isDuplicateEvent(input.provider, input.eventId);
  if (alreadyProcessed) {
    return { status: "ignored", reason: "Bu event daha \xF6nce i\u015Flendi (idempotency)" };
  }
  const eventRowId = await recordEventReceived({
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    payload: redactAndStringify(input.rawPayloadForAudit)
  });
  try {
    await applyCanonicalEvent(input.eventType, input.payload);
    if (eventRowId) await markEventProcessed(eventRowId, "processed");
    return { status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (eventRowId) await markEventProcessed(eventRowId, "failed", message);
    return { status: "failed", reason: message };
  }
}
async function applyCanonicalEvent(eventType, payload) {
  if (!payload?.userId) throw new Error("payload.userId eksik");
  switch (eventType) {
    case "checkout.completed":
      return handleCheckoutCompleted(payload);
    case "subscription.renewed":
      return handleSubscriptionRenewed(payload);
    case "subscription.payment_failed":
      return handlePaymentFailed(payload);
    case "subscription.grace_period_started":
      return handleGracePeriodStarted(payload);
    case "subscription.canceled":
      return handleSubscriptionCanceled(payload);
    case "payment.refunded":
      return handleRefund(payload);
    default:
      throw new Error(`Bilinmeyen event tipi: ${eventType}`);
  }
}
async function trackOfEvent(payload, plan) {
  if (payload.track) return payload.track;
  if (plan?.track) return plan.track;
  if (payload.planCode) {
    const byCode = await getPlanByCode(payload.planCode);
    if (byCode?.track) return byCode.track;
  }
  return "YKS";
}
async function chargeAmountFor(plan, now, examYear, track) {
  if (plan.billingPeriod !== "yearly") return plan.price;
  const monthly = await getPlanByCode(plan.code.replace(/_YEARLY$/, "_MONTHLY"));
  return monthly ? yksTermPrice({ monthlyPrice: monthly.price, now, examYear, track }).price : plan.price;
}
async function handleCheckoutCompleted(payload) {
  if (!payload.planCode) throw new Error("payload.planCode eksik");
  const plan = await getPlanByCode(payload.planCode);
  if (!plan) throw new Error(`Plan bulunamad\u0131: ${payload.planCode}`);
  const track = await trackOfEvent(payload, plan);
  const existing = await ensureFreeSubscription(payload.userId, track);
  const now = /* @__PURE__ */ new Date();
  const examYear = await getStudentExamYearFor(payload.userId, track);
  const periodEnd = payload.periodDays ? new Date(now.getTime() + payload.periodDays * 24 * 60 * 60 * 1e3) : planPeriodEnd(plan.billingPeriod, now, examYear, track);
  const eligibleForTrial = plan.trialDays > 0 && !existing?.trialStartedAt;
  const nextStatus = eligibleForTrial ? "trialing" : "active";
  const trialEndsAt = eligibleForTrial ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1e3) : existing?.trialEndsAt ?? null;
  if (existing) assertValidSubscriptionTransition(existing.status, nextStatus);
  const paymentId = await createPayment({
    userId: payload.userId,
    subscriptionId: existing?.id ?? null,
    provider: "web",
    providerPaymentId: payload.providerPaymentId ?? null,
    amount: payload.amount ?? await chargeAmountFor(plan, now, examYear, track),
    currency: payload.currency ?? plan.currency,
    status: eligibleForTrial ? "authorized" : "paid",
    paymentType: eligibleForTrial ? "trial_start" : "initial",
    paidAt: eligibleForTrial ? null : now,
    track,
    metadata: payload.checkoutId ? JSON.stringify({ checkoutId: payload.checkoutId, discountReason: payload.discountReason ?? null }) : null
  });
  const oldState = existing ? { status: existing.status } : null;
  await updateSubscription(payload.userId, track, {
    planId: plan.id,
    status: nextStatus,
    trialStartedAt: eligibleForTrial ? now : existing?.trialStartedAt ?? null,
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: 0,
    canceledAt: null,
    provider: "web",
    providerSubscriptionId: payload.providerSubscriptionId ?? null,
    providerCustomerId: payload.providerCustomerId ?? null,
    latestPaymentId: paymentId
  });
  await writeAuditLog({ userId: payload.userId, action: "checkout_completed", oldState, newState: { status: nextStatus, planCode: plan.code, track }, metadata: { paymentId, checkoutId: payload.checkoutId ?? null } });
}
async function handleSubscriptionRenewed(payload) {
  const plan = await getPlanByCode(payload.planCode ?? "");
  const track = await trackOfEvent(payload, plan);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Yenilenecek abonelik bulunamad\u0131");
  assertValidSubscriptionTransition(existing.status, "active");
  const now = /* @__PURE__ */ new Date();
  const examYear = await getStudentExamYearFor(payload.userId, track);
  const periodEnd = payload.periodDays ? new Date(now.getTime() + payload.periodDays * 24 * 60 * 60 * 1e3) : planPeriodEnd(plan?.billingPeriod ?? "monthly", now, examYear, track);
  const paymentId = await createPayment({ userId: payload.userId, subscriptionId: existing.id, provider: "web", providerPaymentId: payload.providerPaymentId ?? null, amount: payload.amount ?? (plan ? await chargeAmountFor(plan, now, examYear, track) : 0), currency: payload.currency ?? plan?.currency ?? "TRY", status: "paid", paymentType: "renewal", paidAt: now, track });
  await updateSubscription(payload.userId, track, { status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, latestPaymentId: paymentId });
  await writeAuditLog({ userId: payload.userId, action: "subscription_renewed", oldState: { status: existing.status }, newState: { status: "active" }, metadata: { paymentId } });
}
async function handlePaymentFailed(payload) {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  assertValidSubscriptionTransition(existing.status, "past_due");
  await updateSubscription(payload.userId, track, { status: "past_due" });
  await writeAuditLog({ userId: payload.userId, action: "payment_failed", oldState: { status: existing.status }, newState: { status: "past_due" } });
}
async function handleGracePeriodStarted(payload) {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  assertValidSubscriptionTransition(existing.status, "grace_period");
  const days = payload.gracePeriodDays ?? 3;
  const gracePeriodEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1e3);
  await updateSubscription(payload.userId, track, { status: "grace_period", gracePeriodEndsAt });
  await writeAuditLog({ userId: payload.userId, action: "grace_period_started", oldState: { status: existing.status }, newState: { status: "grace_period", gracePeriodEndsAt } });
}
async function handleSubscriptionCanceled(payload) {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  const nextStatus = payload.immediate ? "canceled" : existing.status;
  if (payload.immediate) assertValidSubscriptionTransition(existing.status, "canceled");
  await updateSubscription(payload.userId, track, { status: nextStatus, cancelAtPeriodEnd: payload.immediate ? 0 : 1, canceledAt: /* @__PURE__ */ new Date() });
  await writeAuditLog({ userId: payload.userId, action: "subscription_canceled", oldState: { status: existing.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !payload.immediate } });
}
async function handleRefund(payload) {
  const track = await trackOfEvent(payload);
  const existing = await getSubscriptionByUserId(payload.userId, track);
  if (!existing) throw new Error("Abonelik bulunamad\u0131");
  if (existing.latestPaymentId) await updatePaymentStatus(existing.latestPaymentId, { status: "refunded", refundedAt: /* @__PURE__ */ new Date() });
  assertValidSubscriptionTransition(existing.status, "canceled");
  await updateSubscription(payload.userId, track, { status: "canceled", canceledAt: /* @__PURE__ */ new Date(), cancelAtPeriodEnd: 0 });
  await writeAuditLog({ userId: payload.userId, action: "payment_refunded", oldState: { status: existing.status }, newState: { status: "canceled" } });
}

// server/_core/webhooks.ts
function registerWebhookRoutes(app2) {
  app2.post("/api/webhooks/:provider", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
    const providerName = req.params.provider;
    const provider = paymentProviderFactory(providerName);
    try {
      const verification = await provider.handleWebhook({ rawBody: req.body, headers: req.headers });
      if (!verification.valid) {
        console.warn(`[Webhook] ${providerName} imza do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z: ${verification.reason}`);
        res.status(401).json({ error: "invalid_signature" });
        return;
      }
      if (!verification.eventId || !verification.eventType || !verification.payload || typeof verification.payload !== "object") {
        res.status(400).json({ error: "invalid_payload" });
        return;
      }
      const result = await processWebhookEvent({
        provider: providerName,
        eventId: verification.eventId,
        eventType: verification.eventType,
        payload: verification.payload,
        rawPayloadForAudit: verification.payload
      });
      console.log(`[Webhook] ${providerName}/${verification.eventType} -> ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
      res.status(200).json({ received: true, status: result.status });
    } catch (error) {
      console.error(`[Webhook] ${providerName} i\u015Flenirken hata:`, error);
      res.status(500).json({ error: "processing_failed" });
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError20 } from "@trpc/server";

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// shared/entitlements.ts
var FEATURE_KEYS = [
  "AI_STUDY_PLAN",
  "OCR_EXAM_IMPORT",
  "OCR_BOOK_IMPORT",
  "ADVANCED_ANALYTICS",
  "PLAN_ADHERENCE",
  "RESOURCE_RECOMMENDATIONS",
  "ADVANCED_REPORTS",
  "FOCUS_AURA_PREMIUM",
  "MOCK_EXAM_ANALYTICS",
  // Akıllı Defter: ses → metin, fotoğraftan metin, AI araçları (özet/flashcard...).
  "NOTE_VOICE",
  "NOTE_OCR",
  "NOTE_AI"
];
var PAID_TIERS = ["basic", "premium", "premium_plus"];
var TIER_LABELS = { free: "\xDCcretsiz", basic: "Temel", premium: "Premium", premium_plus: "Pro" };
var ALL_PAID_FEATURES = [...FEATURE_KEYS];
var TIER_FEATURES = {
  free: [],
  basic: ALL_PAID_FEATURES,
  premium: ALL_PAID_FEATURES,
  premium_plus: ALL_PAID_FEATURES
};
function featuresForTier(tier) {
  return TIER_FEATURES[tier] ?? [];
}
var USAGE_WINDOW_DAYS = 30;
var per30 = (maxUses) => ({ windowDays: USAGE_WINDOW_DAYS, maxUses });
var FREE_TIER_LIMITS = {
  AI_STUDY_PLAN: per30(3),
  OCR_EXAM_IMPORT: per30(2),
  OCR_BOOK_IMPORT: per30(3),
  // Defter herkesin temel aracı: ses → metin ücretsizde de makul ölçüde açık.
  NOTE_VOICE: per30(30),
  NOTE_OCR: per30(10),
  NOTE_AI: per30(5)
};
var TIER_USAGE_LIMITS = {
  basic: { AI_STUDY_PLAN: per30(8), OCR_EXAM_IMPORT: per30(8), OCR_BOOK_IMPORT: per30(8), NOTE_VOICE: per30(100), NOTE_OCR: per30(40), NOTE_AI: per30(30) },
  premium: { AI_STUDY_PLAN: per30(60), OCR_EXAM_IMPORT: per30(40), OCR_BOOK_IMPORT: per30(40), NOTE_VOICE: per30(300), NOTE_OCR: per30(150), NOTE_AI: per30(100) },
  premium_plus: { AI_STUDY_PLAN: per30(150), OCR_EXAM_IMPORT: per30(100), OCR_BOOK_IMPORT: per30(100), NOTE_VOICE: per30(1e3), NOTE_OCR: per30(400), NOTE_AI: per30(300) }
};
function usageLimitFor(tier, feature) {
  return tier === "free" ? FREE_TIER_LIMITS[feature] : TIER_USAGE_LIMITS[tier][feature];
}

// server/subscriptions/entitlementService.ts
async function getCurrentSubscription(userId, track) {
  const subscription = await ensureFreeSubscription(userId, track);
  const now = /* @__PURE__ */ new Date();
  const effectiveStatus = resolveEffectiveStatus(
    {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      gracePeriodEndsAt: subscription.gracePeriodEndsAt
    },
    now
  );
  if (effectiveStatus !== subscription.status) {
    const oldState = { status: subscription.status };
    const updated = await updateSubscription(userId, track, { status: effectiveStatus });
    await writeAuditLog({ userId, action: "status_auto_transitioned", oldState, newState: { status: effectiveStatus, track }, reason: "resolveEffectiveStatus (zaman bazl\u0131 otomatik ge\xE7i\u015F)" });
    return updated;
  }
  return subscription;
}
async function getEntitlements(userId, track) {
  const subscription = await getCurrentSubscription(userId, track);
  const plan = await getPlanById(subscription.planId);
  const tier = plan?.tier ?? "free";
  const status = subscription.status;
  const isPremium = tier !== "free" && statusGrantsPremiumAccess(status);
  return {
    track,
    tier,
    planCode: plan?.code ?? "FREE",
    status,
    isPremium,
    isTrial: status === "trialing",
    trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    gracePeriodEndsAt: subscription.gracePeriodEndsAt ? subscription.gracePeriodEndsAt.toISOString() : null,
    entitlements: isPremium ? featuresForTier(tier) : []
  };
}
var PremiumRequiredError = class extends Error {
  constructor(feature) {
    super(`PREMIUM_REQUIRED: ${feature}`);
    this.name = "PremiumRequiredError";
  }
};
var UsageLimitExceededError = class extends Error {
  constructor(feature, limit, windowDays) {
    super(`USAGE_LIMIT_EXCEEDED: ${feature} (son ${windowDays} g\xFCnde en fazla ${limit} kullan\u0131m)`);
    this.name = "UsageLimitExceededError";
  }
};
function limitForSnapshot(feature, snapshot) {
  return usageLimitFor(snapshot.isPremium ? snapshot.tier : "free", feature);
}
async function assertUsageAvailable(userId, feature, track) {
  const snapshot = await getEntitlements(userId, track);
  if (!snapshot.isPremium && !FREE_TIER_LIMITS[feature]) {
    throw new PremiumRequiredError(feature);
  }
  const limit = limitForSnapshot(feature, snapshot);
  if (limit) {
    const used = await countFeatureUsage(userId, feature, limit.windowDays, track);
    if (used >= limit.maxUses) throw new UsageLimitExceededError(feature, limit.maxUses, limit.windowDays);
  }
  return { isPremium: snapshot.isPremium };
}
async function getUsageSummaryForUser(userId, track) {
  const snapshot = await getEntitlements(userId, track);
  const summaries = [];
  for (const feature of FEATURE_KEYS) {
    const limit = limitForSnapshot(feature, snapshot);
    if (!limit) {
      const hasAccess = snapshot.isPremium ? snapshot.entitlements.includes(feature) : Boolean(FREE_TIER_LIMITS[feature]);
      if (!hasAccess) continue;
      summaries.push({ feature, used: 0, limit: null, remaining: null, windowDays: null, periodStart: null, periodEnd: null });
      continue;
    }
    const used = await countFeatureUsage(userId, feature, limit.windowDays, track);
    const periodStart = new Date(Date.now() - limit.windowDays * 24 * 60 * 60 * 1e3);
    summaries.push({ feature, used, limit: limit.maxUses, remaining: Math.max(0, limit.maxUses - used), windowDays: limit.windowDays, periodStart: periodStart.toISOString(), periodEnd: (/* @__PURE__ */ new Date()).toISOString() });
  }
  return summaries;
}

// server/org/orgCredits.ts
import { and as and16, desc as desc12, eq as eq19, gte as gte12, sql as sql10 } from "drizzle-orm";
async function sumCredits(orgId, since, userId) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq19(organizationCreditUsage.orgId, orgId), gte12(organizationCreditUsage.usedAt, since)];
  if (userId) conditions.push(eq19(organizationCreditUsage.userId, userId));
  const [row] = await db.select({ total: sql10`COALESCE(SUM(${organizationCreditUsage.credits}), 0)`.mapWith(Number) }).from(organizationCreditUsage).where(and16(...conditions));
  return Number(row?.total ?? 0);
}
async function findOrgCreditSource(userId, feature, now = /* @__PURE__ */ new Date()) {
  const cost = ORG_CREDIT_COSTS[feature];
  if (!cost) return null;
  const db = await getDb();
  if (!db) return null;
  const [org] = await db.select({ orgId: organizations.id, monthly: organizations.aiCreditsMonthly, cap: organizations.perStudentCreditCap, membershipStartsAt: organizations.membershipStartsAt, membershipEndsAt: organizations.membershipEndsAt }).from(organizationMembers).innerJoin(organizations, eq19(organizations.id, organizationMembers.orgId)).where(and16(eq19(organizationMembers.userId, userId), eq19(organizationMembers.role, "student"), eq19(organizationMembers.status, "active"), eq19(organizations.status, "active"))).limit(1);
  if (!org || org.monthly <= 0 || membershipState(org, now) !== "active") return null;
  const since = creditPeriodStart(now);
  const [usedByOrg, usedByStudent] = await Promise.all([sumCredits(org.orgId, since), org.cap === null ? Promise.resolve(0) : sumCredits(org.orgId, since, userId)]);
  return creditDecision({ monthly: org.monthly, usedByOrg, cap: org.cap, usedByStudent, cost }).ok ? { orgId: org.orgId, cost } : null;
}
async function recordOrgCredit(source, userId, feature) {
  const db = await getDb();
  if (!db) return;
  await db.insert(organizationCreditUsage).values({ orgId: source.orgId, userId, featureKey: feature, credits: source.cost });
}
async function orgCreditReport(orgId, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) return { periodStart: creditPeriodStart(now), used: 0, byFeature: [], byStudent: [] };
  const since = creditPeriodStart(now);
  const scope = and16(eq19(organizationCreditUsage.orgId, orgId), gte12(organizationCreditUsage.usedAt, since));
  const total = sql10`SUM(${organizationCreditUsage.credits})`.mapWith(Number);
  const count4 = sql10`COUNT(*)::int`;
  const [byFeature, byStudent] = await Promise.all([
    db.select({ featureKey: organizationCreditUsage.featureKey, credits: total, uses: count4 }).from(organizationCreditUsage).where(scope).groupBy(organizationCreditUsage.featureKey),
    db.select({ userId: organizationCreditUsage.userId, name: users.name, preferredName: studentProfiles.preferredName, credits: total, uses: count4 }).from(organizationCreditUsage).innerJoin(users, eq19(users.id, organizationCreditUsage.userId)).leftJoin(studentProfiles, eq19(studentProfiles.userId, organizationCreditUsage.userId)).where(scope).groupBy(organizationCreditUsage.userId, users.name, studentProfiles.preferredName).orderBy(desc12(total)).limit(20)
  ]);
  return {
    periodStart: since,
    used: byFeature.reduce((sum, row) => sum + Number(row.credits), 0),
    byFeature: byFeature.map((row) => ({ featureKey: row.featureKey, credits: Number(row.credits), uses: Number(row.uses) })),
    byStudent: byStudent.map((row) => ({ userId: row.userId, name: row.preferredName || row.name || "\xD6\u011Frenci", credits: Number(row.credits), uses: Number(row.uses) }))
  };
}
async function creditsUsedThisMonth(orgIds, now = /* @__PURE__ */ new Date()) {
  const result = /* @__PURE__ */ new Map();
  for (const orgId of orgIds) result.set(orgId, await sumCredits(orgId, creditPeriodStart(now)));
  return result;
}

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var APPROVAL_GATE_ALLOWLIST = /* @__PURE__ */ new Set(["auth.me", "auth.logout", "auth.resendVerificationEmail"]);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next, path: path2 } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!APPROVAL_GATE_ALLOWLIST.has(path2) && needsEmailVerification(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: EMAIL_UNVERIFIED_ERR_MSG });
  }
  if (!APPROVAL_GATE_ALLOWLIST.has(path2) && ctx.user.approvalStatus !== "approved") {
    const message = ctx.user.approvalStatus === "rejected" ? APPROVAL_REJECTED_ERR_MSG : APPROVAL_PENDING_ERR_MSG;
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin" || needsEmailVerification(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);
function metredFeatureProcedure(feature, rateLimit = { maxRequests: 5, windowMs: 6e4 }) {
  return protectedProcedure.use(
    t.middleware(async (opts) => {
      const { ctx, next, path: path2 } = opts;
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      try {
        checkRateLimit(`${ctx.user.id}:${path2}`, rateLimit.maxRequests, rateLimit.windowMs);
      } catch (error) {
        if (error instanceof RateLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: RATE_LIMITED_ERR_MSG });
        throw error;
      }
      const orgCredit = await findOrgCreditSource(ctx.user.id, feature).catch(() => null);
      const track = await getStudentExamTrack(ctx.user.id);
      if (!orgCredit) try {
        await assertUsageAvailable(ctx.user.id, feature, track);
      } catch (error) {
        if (error instanceof PremiumRequiredError) throw new TRPCError({ code: "FORBIDDEN", message: PREMIUM_REQUIRED_ERR_MSG });
        if (error instanceof UsageLimitExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message });
        throw error;
      }
      const result = await next({ ctx });
      if (result.ok) await (orgCredit ? recordOrgCredit(orgCredit, ctx.user.id, feature) : recordFeatureUsage(ctx.user.id, feature, track));
      return result;
    })
  );
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage2 = (message) => {
  const { role, name: name2, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name: name2,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name: name2,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name: name2,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var LlmUnavailableError = class extends Error {
  constructor(reason, message, status) {
    super(message);
    this.reason = reason;
    this.status = status;
    this.name = "LlmUnavailableError";
  }
};
var DEFAULT_LLM_API_URL = "https://api.openai.com/v1";
var DEFAULT_LLM_MODEL = "gpt-4o-mini";
var GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
var DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
function normalizeLlmSettings(rawUrl, rawModel, key) {
  let baseUrl = (rawUrl || "").trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "").replace(/\/+$/, "");
  let model = (rawModel || "").trim().replace(/^models\//, "");
  const geminiKey = key.trim().startsWith("AIza");
  if (!baseUrl) baseUrl = geminiKey ? GEMINI_OPENAI_BASE_URL : DEFAULT_LLM_API_URL;
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    baseUrl = GEMINI_OPENAI_BASE_URL;
    if (!model.startsWith("gemini") || /^gemini-(1\.0|1\.5|pro(-vision)?$)/.test(model)) model = DEFAULT_GEMINI_MODEL;
  }
  return { baseUrl, model: model || DEFAULT_LLM_MODEL };
}
var resolveLlmTarget = () => {
  if (!ENV.llmApiKey) return null;
  const { baseUrl, model } = normalizeLlmSettings(ENV.llmApiUrl, ENV.llmModel, ENV.llmApiKey);
  return { baseUrl, chatUrl: `${baseUrl}/chat/completions`, modelsUrl: `${baseUrl}/models`, key: ENV.llmApiKey.trim(), model };
};
function modelForTier(tier) {
  const target = resolveLlmTarget();
  if (!target) return void 0;
  const raw = tier === "light" ? ENV.llmModelLight : tier === "strong" ? ENV.llmModelStrong : "";
  if (!raw.trim()) return target.model;
  return normalizeLlmSettings(target.baseUrl, raw, target.key).model;
}
async function invokeLLMWithTier(params, tier, invoke = invokeLLM, pickModel = modelForTier) {
  const model = pickModel(tier);
  const fallback = pickModel("medium");
  try {
    return await invoke({ ...params, ...model ? { model } : {} });
  } catch (error) {
    const retryable = error instanceof LlmUnavailableError && (error.reason === "quota" || error.status === 404);
    if (!retryable || !fallback || fallback === model) throw error;
    console.warn(`[LLM] ${tier} model ${model} unavailable (${error.status ?? error.reason}), falling back to ${fallback}`);
    return invoke({ ...params, model: fallback });
  }
}
var requireTarget = () => {
  const target = resolveLlmTarget();
  if (!target) throw new LlmUnavailableError("not_configured", "LLM is not configured (set LLM_API_KEY or OPENAI_API_KEY)");
  return target;
};
function llmUnavailableMessage(error) {
  if (!(error instanceof LlmUnavailableError)) return null;
  switch (error.reason) {
    case "not_configured":
      return "Foto\u011Fraf okuma (yapay zek\xE2) servisi sunucuda hen\xFCz a\xE7\u0131lmam\u0131\u015F. Sorun foto\u011Fraf\u0131nda de\u011Fil \u2014 y\xF6netici LLM_API_KEY ayar\u0131n\u0131 yap\u0131nca \xE7al\u0131\u015Facak. \u015Eimdilik bilgileri elle girebilirsin.";
    case "auth":
      return "Foto\u011Fraf okuma servisinin anahtar\u0131 ge\xE7ersiz. Sorun foto\u011Fraf\u0131nda de\u011Fil; y\xF6neticiye haber ver.";
    case "quota":
      return "Foto\u011Fraf okuma servisi \u015Fu an yo\u011Fun ya da kotas\u0131 doldu. Birka\xE7 dakika sonra tekrar dener misin?";
    case "too_large":
      return "Foto\u011Fraf servis i\xE7in \xE7ok b\xFCy\xFCk. Daha k\xFC\xE7\xFCk bir foto\u011Frafla ya da k\u0131rparak tekrar dener misin?";
    default:
      if (error.status === 400 || error.status === 404 || error.status === 422) return `Yapay zek\xE2 sa\u011Flay\u0131c\u0131s\u0131 iste\u011Fi reddetti (kod ${error.status}). Sorun foto\u011Fraf\u0131nda de\u011Fil; y\xF6netici LLM_MODEL / LLM_API_URL ayar\u0131n\u0131 kontrol etmeli (Admin \u2192 Yapay zek\xE2 ba\u011Flant\u0131 testi).`;
      return `Foto\u011Fraf okuma servisine \u015Fu an ula\u015F\u0131lam\u0131yor${error.status ? ` (kod ${error.status})` : ""}. Sorun foto\u011Fraf\u0131nda de\u011Fil; biraz sonra tekrar dener misin?`;
  }
}
var errorForStatus = (status, detail) => {
  const reason = status === 401 || status === 403 ? "auth" : status === 402 || status === 429 ? "quota" : status === 413 ? "too_large" : "provider";
  const safeDetail = detail.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");
  return new LlmUnavailableError(reason, `LLM invoke failed: ${status} \u2013 ${safeDetail.slice(0, 500)}`, status);
};
var GEMINI_UNSUPPORTED_SCHEMA_KEYS = /* @__PURE__ */ new Set(["additionalProperties", "$schema", "strict", "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "pattern", "format"]);
function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (GEMINI_UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
    if (key === "type" && Array.isArray(value)) {
      const types = value.filter((type) => type !== "null");
      result.type = types[0] ?? "string";
      if (types.length < value.length) result.nullable = true;
      continue;
    }
    result[key] = key === "properties" && value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([name2, child]) => [name2, toGeminiSchema(child)])) : toGeminiSchema(value);
  }
  return result;
}
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap3 = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap3 / 2 + Math.random() * (cap3 / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
      if (response.ok || !transient || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  const target = requireTarget();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    reasoningEffort,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage2)
  };
  payload.model = model || target.model;
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  if (reasoningEffort && /^gemini-(?!1\.|2\.0)/.test(String(payload.model))) {
    payload.reasoning_effort = reasoningEffort;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  const isGemini = target.baseUrl.includes("generativelanguage.googleapis.com");
  if (normalizedResponseFormat) {
    payload.response_format = isGemini && normalizedResponseFormat.type === "json_schema" ? { type: "json_schema", json_schema: { name: normalizedResponseFormat.json_schema.name, schema: toGeminiSchema(normalizedResponseFormat.json_schema.schema) } } : normalizedResponseFormat;
  }
  const send = async (body) => {
    try {
      return await fetchWithBackoff(target.chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${target.key}`
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      throw new LlmUnavailableError("provider", `LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  let response = await send(payload);
  let lastPayload = payload;
  const format = payload.response_format;
  if (response.status === 400 && format?.type === "json_schema") {
    const firstError = await response.text().catch(() => "");
    console.warn(`[LLM] json_schema rejected (400), retrying with json_object: ${firstError.slice(0, 800).replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,})/g, "[redacted]")}`);
    const schemaHint = { role: "system", content: `Yan\u0131t\u0131 YALNIZCA \u015Fu JSON \u015Femas\u0131na uyan ge\xE7erli bir JSON nesnesi olarak ver; alan adlar\u0131n\u0131 aynen kullan (a\xE7\u0131klama, kod blo\u011Fu yok): ${JSON.stringify(format.json_schema?.schema ?? {})}` };
    lastPayload = { ...payload, messages: [schemaHint, ...payload.messages], response_format: { type: "json_object" } };
    response = await send(lastPayload);
  }
  if (response.status === 400 && "reasoning_effort" in lastPayload) {
    console.warn("[LLM] still 400 with reasoning_effort, retrying without it");
    const { reasoning_effort: _dropped, ...withoutEffort } = lastPayload;
    response = await send(withoutEffort);
  }
  if (!response.ok) {
    throw errorForStatus(response.status, await response.text().catch(() => ""));
  }
  const result = await response.json();
  if (payload.response_format) {
    for (const choice of result.choices ?? []) {
      const content = choice.message?.content;
      if (typeof content === "string") choice.message.content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
  }
  return result;
}
async function listLLMModels() {
  const target = requireTarget();
  const response = await fetchWithBackoff(target.modelsUrl, {
    headers: { authorization: `Bearer ${target.key}` }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/_core/fileValidation.ts
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
var MAGIC_BYTES = {
  "application/pdf": [[37, 80, 68, 70]],
  // %PDF
  "image/png": [[137, 80, 78, 71, 13, 10, 26, 10]],
  "image/jpeg": [[255, 216, 255]],
  "image/webp": [[82, 73, 70, 70]]
  // "RIFF" — WEBP kontrolü ayrıca byte 8-11 "WEBP" olmalı
};
function validateDataUrl(dataUrl, declaredMimeType) {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return { valid: false, reason: "Ge\xE7ersiz data URL format\u0131." };
  const [, encodedMime, base64] = match;
  if (encodedMime !== declaredMimeType) {
    return { valid: false, reason: "data URL'deki MIME t\xFCr\xFC, bildirilen mimeType ile uyu\u015Fmuyor." };
  }
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { valid: false, reason: "Base64 \xE7\xF6z\xFClemedi." };
  }
  if (buffer.byteLength === 0) return { valid: false, reason: "Bo\u015F dosya." };
  if (buffer.byteLength > MAX_UPLOAD_BYTES) return { valid: false, reason: `Dosya ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB s\u0131n\u0131r\u0131n\u0131 a\u015F\u0131yor.` };
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return { valid: false, reason: "Desteklenmeyen dosya t\xFCr\xFC." };
  const matchesSignature = signatures.some((signature) => signature.every((byte, index2) => buffer[index2] === byte));
  if (!matchesSignature) return { valid: false, reason: "Dosya i\xE7eri\u011Fi, bildirilen t\xFCrle e\u015Fle\u015Fmiyor (magic bytes do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z)." };
  if (declaredMimeType === "image/webp") {
    const webpMarker = buffer.subarray(8, 12).toString("ascii");
    if (webpMarker !== "WEBP") return { valid: false, reason: "Ge\xE7erli bir WEBP dosyas\u0131 de\u011Fil." };
  }
  return { valid: true, buffer };
}

// server/routers.ts
import { z as z33 } from "zod";

// server/routers/topics.ts
import { z as z3 } from "zod";
var topicsRouter = router({
  catalog: publicProcedure.query(() => getTopicCatalog()),
  // Müfredat tabanlı deneme şablonu (LGS, KPSS, DGS, AGS): Yönetim Paneli'nde eklenen/yeniden adlandırılan konularla.
  curriculum: publicProcedure.query(() => getLiveCurriculum()),
  // Yalnızca öğrencinin sınavının konuları (sınav değiştiren öğrencinin eski verisi silinmez, gizlenir).
  progress: protectedProcedure.query(async ({ ctx }) => {
    const [progress, profile] = await Promise.all([getUserTopicProgress(ctx.user.id), getStudentProfile(ctx.user.id)]);
    const kinds = kindsOf(profile.examTrack);
    return progress.filter((topic) => kinds.includes(topic.exam));
  }),
  logResult: protectedProcedure.input(
    z3.object({
      exam: z3.enum(EXAM_KINDS),
      subject: z3.string().min(1).max(80),
      topic: z3.string().min(1).max(180),
      accuracy: z3.number().min(0).max(100),
      questionCount: z3.number().int().min(0).max(2e3),
      studyDate: z3.string().min(8).max(30)
    })
  ).mutation(({ ctx, input }) => upsertTopicProgress(ctx.user.id, { ...input, studyDate: new Date(input.studyDate) })),
  // Odak oturumu süresi dolmadan bırakıldı: konu tekrar gerektiren konulara eklenir.
  markForReview: protectedProcedure.input(z3.object({ exam: z3.enum(EXAM_KINDS), subject: z3.string().min(1).max(80), topic: z3.string().min(1).max(180), sessionId: z3.number().int().positive().optional() })).mutation(({ ctx, input }) => markTopicForReview(ctx.user.id, input))
});

// server/routers/bookContent.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z4 } from "zod";

// server/bookContent/bookContentDb.ts
import { and as and17, eq as eq20, inArray as inArray9, isNull as isNull12 } from "drizzle-orm";

// shared/examTopicLinks.ts
var examTopicKey = (value) => value.replace(/İ/g, "i").replace(/I/g, "\u0131").toLowerCase().replace(/[çğıöşüâîû]/g, (char) => ({ \u00E7: "c", \u011F: "g", \u0131: "i", \u00F6: "o", \u015F: "s", \u00FC: "u", \u00E2: "a", \u00EE: "i", \u00FB: "u" })[char] ?? char).replace(/[^a-z0-9]+/g, " ").trim();
var TR = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "T\xFCrk\xE7e", topic }));
var MAT = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Matematik", topic }));
var GEO = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Geometri", topic }));
var FIZ = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Fizik", topic }));
var KIM = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Kimya", topic }));
var TAR = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Tarih", topic }));
var COG = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Co\u011Frafya", topic }));
var FEL = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Felsefe", topic }));
var DIN = (...topics) => topics.map((topic) => ({ exam: "TYT", subject: "Din K\xFClt\xFCr\xFC", topic }));
var LINKS = [
  // Türkçe
  ["C\xFCmlede Yorum", TR("C\xFCmlede Anlam")],
  ["Anlam\u0131na G\xF6re S\xF6zc\xFCkler", TR("S\xF6zc\xFCkte Anlam")],
  ["Anlam \u0130li\u015Fkisine G\xF6re S\xF6zc\xFCkler", TR("S\xF6zc\xFCkte Anlam")],
  ["\u0130sim Tamlamalar\u0131, C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar), Fiilimsi Bulma, S\xF6zc\xFCk T\xFCrleri", TR("\u0130simler", "C\xFCmlenin \xD6geleri", "Fiilimsiler")],
  ["S\u0131fat Tamlamalar\u0131", TR("S\u0131fatlar")],
  ["Yaz\u0131m Kurallar\u0131", TR("Yaz\u0131m Kurallar\u0131")],
  ["Noktalama \u0130\u015Faretleri", TR("Noktalama \u0130\u015Faretleri")],
  ["C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar)", TR("C\xFCmlenin \xD6geleri")],
  ["Ses Bilgisi", TR("Ses Bilgisi")],
  ["C\xFCmlenin \xD6geleri (Temel \xD6geler), C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar), \u0130sim Tamlamalar\u0131, S\u0131fat Tamlamalar\u0131", TR("C\xFCmlenin \xD6geleri", "\u0130simler", "S\u0131fatlar")],
  ["Par\xE7ada Anlam (Ana D\xFC\u015F\xFCnce-Yard\u0131mc\u0131 D\xFC\u015F\xFCnce)", TR("Paragrafta Konu ve Ana D\xFC\u015F\xFCnce", "Paragrafta Yard\u0131mc\u0131 D\xFC\u015F\xFCnce")],
  ["Par\xE7ada Konu-Ba\u015Fl\u0131k-Soru", TR("Paragrafta Konu ve Ana D\xFC\u015F\xFCnce")],
  ["Ek Fiil - Fiilde Yap\u0131, C\xFCmle T\xFCrleri (Yap\u0131s\u0131na G\xF6re C\xFCmleler), S\xF6zc\xFCk T\xFCrleri, \xC7ekim Ekleri", TR("Ek Fiil", "C\xFCmle T\xFCrleri", "S\xF6zc\xFCkte Yap\u0131")],
  ["C\xFCmlenin \xD6geleri (Temel \xD6geler), C\xFCmlenin \xD6geleri (Nesne), C\xFCmlenin \xD6geleri (Tamlay\u0131c\u0131lar)", TR("C\xFCmlenin \xD6geleri")],
  ["Ek Fiil - Fiilde Yap\u0131, \u0130sim Tamlamalar\u0131, S\xF6zc\xFCk T\xFCrleri", TR("Ek Fiil", "\u0130simler")],
  ["Par\xE7ada Anlat\u0131m", TR("Paragrafta Anlat\u0131m Bi\xE7imleri ve D\xFC\u015F\xFCnceyi Geli\u015Ftirme Yollar\u0131")],
  ["Paragrafta Yap\u0131", TR("Paragraf\u0131n Yap\u0131s\u0131")],
  // Matematik-1 (sayı/cebir/problem → Matematik; açı/şekil → Geometri)
  ["Fonksiyonda D\xF6rt \u0130\u015Flem", MAT("Fonksiyonlar (TYT)")],
  ["Bir Bilinmeyenli E\u015Fitsizlikler", MAT("Basit E\u015Fitsizlikler")],
  ["Mutlak De\u011Ferli E\u015Fitsizlikler", MAT("Mutlak De\u011Fer")],
  ["\xDCsl\xFC \u0130fadeler", MAT("\xDCsl\xFC Say\u0131lar")],
  ["Fakt\xF6riyel", MAT("Perm\xFCtasyon")],
  ["Say\u0131 Basamaklar\u0131", MAT("Say\u0131 Basamaklar\u0131")],
  ["Ondal\u0131kl\u0131 Say\u0131lar", MAT("Rasyonel Say\u0131lar")],
  ["Tek-\xC7ift Say\u0131lar", MAT("Temel Kavramlar")],
  ["Do\u011Fal Say\u0131lar", MAT("Temel Kavramlar")],
  ["G\xFCncel Y\xFCzde Problemleri", MAT("Y\xFCzde Problemleri")],
  ["Kar Zarar Problemleri", MAT("K\xE2r - Zarar Problemleri")],
  ["Polinomlarda D\xF6rt \u0130\u015Flem", MAT("Polinomlar")],
  ["Merkezi E\u011Filim \xD6l\xE7\xFCleri", MAT("Veri ve \u0130statistik")],
  ["Bile\u015Fik \xD6nermeler", MAT("Mant\u0131k")],
  ["Ard\u0131\u015F\u0131k Say\u0131lar", MAT("Temel Kavramlar")],
  ["B\xF6l\xFCnebilme Kurallar\u0131", MAT("B\xF6lme ve B\xF6l\xFCnebilme")],
  ["Periyodik Tekrar Eden Durumlar", MAT("Rutin Olmayan Problemler")],
  ["\u0130ki Bilinmeyenli Denklemler", MAT("Denklem \xC7\xF6zme")],
  ["Kombinasyon Problemleri", MAT("Kombinasyon")],
  ["Basit Olaylar\u0131n Olas\u0131l\u0131\u011F\u0131", MAT("Olas\u0131l\u0131k")],
  ["G\xFCncel Hareket Problemleri", MAT("Hareket Problemleri")],
  ["G\xFCncel Kar\u0131\u015F\u0131m Problemleri", MAT("Kar\u0131\u015F\u0131m Problemleri")],
  ["Orant\u0131 Problemleri", MAT("Oran - Orant\u0131")],
  ["G\xFCncel Say\u0131 Problemleri", MAT("Say\u0131 Problemleri")],
  ["K\xFCme Tan\u0131m\u0131 ve G\xF6sterimi", MAT("K\xFCmeler")],
  ["Tablo Grafik Problemleri", MAT("Tablo ve Grafik Problemleri")],
  ["G\xFCncel Ya\u015F Problemleri", MAT("Ya\u015F Problemleri")],
  ["Paralel \u0130ki Do\u011Frunun Kesenle Yapt\u0131\u011F\u0131 A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["Do\u011Fruda A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["\xDC\xE7gende A\xE7\u0131lar", GEO("Do\u011Fruda ve \xDC\xE7gende A\xE7\u0131lar")],
  ["K\xFCp\xFCn Alan\u0131", GEO("Kat\u0131 Cisimler")],
  ["D\xFCzg\xFCn \xC7okgende A\xE7\u0131", GEO("\xC7okgenler")],
  ["D\xF6rtgen \xD6zellikleri", GEO("D\xF6rtgenler")],
  ["Karede Uzunluk \xD6zellikleri", GEO("Kare")],
  ["Dik \xDC\xE7gende Trigonometrik Oranlar", GEO("Dik \xDC\xE7gen")],
  ["Yamukta Alan \xD6zellikleri", GEO("Yamuk")],
  ["A\xE7\u0131lar\u0131na G\xF6re \xD6zel \xDC\xE7genler", GEO("Dik \xDC\xE7gen", "\u0130kizkenar ve E\u015Fkenar \xDC\xE7gen")],
  // Fen — Fizik / Kimya
  ["Ortam Derinli\u011Fi ile Su Dalgalar\u0131n\u0131n Yay\u0131lma H\u0131z\u0131 \u0130li\u015Fkisi", FIZ("Dalgalar")],
  ["Elektroskop", FIZ("Elektrostatik")],
  ["Cisimlerin S\u0131v\u0131 \u0130\xE7indeki Denge Durumlar\u0131", FIZ("Bas\u0131n\xE7 ve Kald\u0131rma Kuvveti")],
  ["I\u015F\u0131k \u015Eiddeti, I\u015F\u0131k Ak\u0131s\u0131 ve Ayd\u0131nlanma \u015Eiddeti", FIZ("Optik")],
  ["\xD6zk\xFCtle, Suyun Genle\u015Fmesi", FIZ("Madde ve \xD6zellikleri", "Is\u0131, S\u0131cakl\u0131k ve Genle\u015Fme")],
  ["Verim", FIZ("\u0130\u015F, G\xFC\xE7 ve Enerji")],
  ["Temel ve T\xFCretilmi\u015F B\xFCy\xFCkl\xFCkler", FIZ("Fizik Bilimine Giri\u015F")],
  ["Deri\u015Fik Seyreltik", KIM("Kar\u0131\u015F\u0131mlar")],
  ["Asitlerin ve Bazlar\u0131n Metallerle Tepkimeleri", KIM("Asitler, Bazlar ve Tuzlar")],
  ["G\xFCvenlik \u0130\u015Faretleri", KIM("Kimya Bilimi")],
  ["Element, Bile\u015Fik", KIM("Kimya Bilimi")],
  ["G\xFC\xE7l\xFC Etkile\u015Fimler T\xFCrleri (Kovalent Ba\u011F), Lewis Form\xFClleri", KIM("Kimyasal T\xFCrler Aras\u0131 Etkile\u015Fimler")],
  ["Periyodik \xD6zelliklerin De\u011Fi\u015Fimleri", KIM("Atom ve Periyodik Sistem")],
  ["Tepkimeli Miktar Ge\xE7i\u015F Problemleri", KIM("Kimyasal Tepkimeler")],
  // Sosyal — Tarih / Coğrafya / Felsefe / Din Kültürü
  ["Toplumsal Alanda Yap\u0131lan \u0130nk\u0131laplar", TAR("Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131")],
  ["E\u011Fitim ve K\xFClt\xFCr Alan\u0131nda Yap\u0131lan \u0130nk\u0131laplar", TAR("Atat\xFCrk\xE7\xFCl\xFCk ve T\xFCrk \u0130nk\u0131lab\u0131")],
  ["Osmanl\u0131da Sanayile\u015Fme \xC7abalar\u0131", TAR("Uluslararas\u0131 \u0130li\u015Fkilerde Denge Stratejisi (1774-1914)")],
  ["B\xFCy\xFCk Sel\xE7uklu Devleti", TAR("\u0130lk T\xFCrk-\u0130slam Devletleri")],
  ["Avrasya'da \u0130lk T\xFCrk \u0130zleri", TAR("\u0130lk ve Orta \xC7a\u011Flarda T\xFCrk D\xFCnyas\u0131")],
  ["Afetlerin Da\u011F\u0131l\u0131\u015Flar\u0131", COG("Do\u011Fal Afetler")],
  ["Y\u0131ll\u0131k Hareket (Grafikler)", COG("D\xFCnya'n\u0131n \u015Eekli ve Hareketleri")],
  ["T\xFCrkiye \u0130klimi (T\xFCrkiye'de S\u0131cakl\u0131k)", COG("Atmosfer ve \u0130klim")],
  ["T\xFCrkiye'deki G\xF6\xE7lerin Sebep ve Sonu\xE7lar\u0131", COG("G\xF6\xE7")],
  ["B\xF6lge Kavram\u0131 ve T\xFCrlerinin S\u0131n\u0131fland\u0131r\u0131lmas\u0131", COG("B\xF6lgeler")],
  ["20. Y\xFCzy\u0131l Felsefesinin Temel Problemleri ve Baz\u0131 Ana Ak\u0131mlar\u0131", FEL("Felsefe Tarihi")],
  ["Sanat Nedir?", FEL("Sanat Felsefesi")],
  ["G\xFCzel Nedir?", FEL("Sanat Felsefesi")],
  ["Bilimin De\u011Feri Nedir?", FEL("Bilim Felsefesi")],
  ["\xD6rnek Felsefi Metinlerinden Hareketle 18-19. Y\xFCzy\u0131l Filozoflar\u0131n\u0131n G\xF6r\xFC\u015Flerini Analiz Eder", FEL("Felsefe Tarihi")],
  ["M\xD6 6. Y\xFCzy\u0131l - MS 2. Y\xFCzy\u0131l Felsefesinin Karakteristik \xD6zelliklerini A\xE7\u0131klar", FEL("Felsefe Tarihi")],
  ["Varl\u0131k Felsefesi Nedir?", FEL("Varl\u0131k Felsefesi")],
  ["Varl\u0131\u011F\u0131n Mahiyeti Nedir?", FEL("Varl\u0131k Felsefesi")],
  ["Dogmatizm", FEL("Bilgi Felsefesi")],
  ["Hz. Muhammed'in \u015Eahsiyeti", DIN("Hz. Muhammed")],
  ["Allah'\u0131n Varl\u0131\u011F\u0131 ve Birli\u011Fi Konusunda Akli ve Nakli Delilleri Analiz Eder", DIN("Allah \u0130nsan \u0130li\u015Fkisi")],
  ["\u0130nan\xE7", DIN("Bilgi ve \u0130nan\xE7")]
];
var bySlugKey = new Map(CURRICULUM.map((def) => [`${def.exam}|${def.subject}|${def.topic}`, def]));
var EXAM_TOPIC_LINKS = new Map(
  LINKS.map(([raw, refs]) => [
    examTopicKey(raw),
    refs.map((ref) => {
      const def = bySlugKey.get(`${ref.exam}|${ref.subject}|${ref.topic}`);
      if (!def) throw new Error(`examTopicLinks: m\xFCfredatta olmayan konu: ${ref.exam} ${ref.subject} ${ref.topic}`);
      return def;
    })
  ])
);
function curriculumSubjectsFor(subject2, category) {
  const key = examTopicKey(category || subject2);
  if (key.startsWith("fizik")) return ["Fizik"];
  if (key.startsWith("kimya")) return ["Kimya"];
  if (key.startsWith("biyoloji")) return ["Biyoloji"];
  if (key.startsWith("tarih")) return ["Tarih"];
  if (key.startsWith("cografya")) return ["Co\u011Frafya"];
  if (key.startsWith("felsefe") || key.startsWith("mantik") || key.startsWith("psikoloji") || key.startsWith("sosyoloji")) return ["Felsefe"];
  if (key.startsWith("din")) return ["Din K\xFClt\xFCr\xFC"];
  if (key.startsWith("geometri")) return ["Geometri"];
  if (key.startsWith("matematik")) return ["Matematik", "Geometri"];
  if (key.startsWith("turkce")) return ["T\xFCrk\xE7e"];
  if (key.startsWith("edebiyat") || key.startsWith("turk dili")) return ["Edebiyat"];
  if (key === "fen" || key.startsWith("fen ")) return ["Fizik", "Kimya", "Biyoloji"];
  if (key === "sosyal" || key.startsWith("sosyal ")) return ["Tarih", "Co\u011Frafya", "Felsefe", "Din K\xFClt\xFCr\xFC"];
  return [subject2];
}

// server/bookContent/curriculumMatcher.ts
init_turkishText();
var STOPWORDS = /* @__PURE__ */ new Set(["ve", "ile", "de", "da", "test", "testi", "testleri", "soru", "sorulari", "konu", "konulari", "unite", "bolum", "tyt", "ayt", "yks", "yeni", "nesil"]);
var contentTokens = (text4) => normalizeForComparison(text4).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token));
var stems = (text4, length) => new Set(contentTokens(text4).map((token) => token.slice(0, length)));
function dice(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of Array.from(a)) if (b.has(item)) shared += 1;
  return 2 * shared / (a.size + b.size);
}
var containsPhrase = (haystack, needle) => needle.length >= 4 && ` ${haystack} `.includes(` ${needle} `);
var tierFor = (confidence) => confidence >= bookContentConfig.mapping.autoSuggestMin ? "auto" : confidence >= bookContentConfig.mapping.confirmMin ? "confirm" : "manual";
function matchTopic(title, topics, filter = {}) {
  const { scores, stemLength, maxAlternatives } = bookContentConfig.mapping;
  const normalizedTitle = normalizeForComparison(title);
  if (!normalizedTitle) return { best: null, alternatives: [], tier: "manual" };
  const subjectKey = filter.subject ? normalizeForComparison(filter.subject) : null;
  const pool = topics.filter((topic) => (!subjectKey || normalizeForComparison(topic.subject) === subjectKey) && (!filter.exam || topic.exam === filter.exam));
  const titleStems = stems(title, stemLength);
  const scored = pool.map((topic) => {
    const names = [{ text: topic.topic, isAlias: false }, ...topic.aliases.map((alias) => ({ text: alias, isAlias: true }))];
    let best2 = { topicId: topic.id, confidence: 0, method: "fuzzy", matchedText: topic.topic };
    for (const name2 of names) {
      const normalizedName = normalizeForComparison(name2.text);
      let candidate;
      if (normalizedName === normalizedTitle) {
        candidate = { topicId: topic.id, confidence: name2.isAlias ? scores.exactAlias : scores.exactTopic, method: name2.isAlias ? "exact_alias" : "exact_topic", matchedText: name2.text };
      } else if (containsPhrase(normalizedTitle, normalizedName)) {
        candidate = { topicId: topic.id, confidence: name2.isAlias ? scores.containsAlias : scores.containsTopic, method: name2.isAlias ? "contains_alias" : "contains_topic", matchedText: name2.text };
      } else {
        candidate = { topicId: topic.id, confidence: Math.round(dice(titleStems, stems(name2.text, stemLength)) * scores.fuzzyMax * 1e3) / 1e3, method: "fuzzy", matchedText: name2.text };
      }
      if (candidate.confidence > best2.confidence) best2 = candidate;
    }
    return best2;
  });
  const ranked = scored.filter((match) => match.confidence > 0).sort((a, b) => b.confidence - a.confidence);
  const best = ranked[0] ?? null;
  const ambiguous = Boolean(best && ranked[1] && ranked[1].confidence === best.confidence && ranked[1].topicId !== best.topicId);
  const tier = !best ? "manual" : ambiguous ? tierFor(best.confidence) === "auto" ? "confirm" : tierFor(best.confidence) : tierFor(best.confidence);
  return { best, alternatives: ranked.slice(1, 1 + maxAlternatives), tier };
}

// server/bookContent/examTopicResolver.ts
var CURRICULUM_SET = new Set(CURRICULUM.map((def) => def.slug));
var CURRICULUM_SLUGS = { has: (slug) => CURRICULUM_SET.has(slug) || isAdminTopicSlug(slug) };
function resolveToCurriculumTopicIds(row, topics) {
  const idBySlug = new Map(topics.map((topic) => [topic.slug, topic.id]));
  if (CURRICULUM_SLUGS.has(row.slug)) {
    const id8 = idBySlug.get(row.slug);
    return id8 === void 0 ? [] : [id8];
  }
  const linked = EXAM_TOPIC_LINKS.get(examTopicKey(row.topic));
  if (linked) return Array.from(new Set(linked.map((def) => idBySlug.get(def.slug)).filter((id8) => id8 !== void 0)));
  const curriculumTopics = topics.filter((topic) => CURRICULUM_SLUGS.has(topic.slug));
  const subjects = curriculumSubjectsFor(row.subject, row.category);
  const parts = [row.topic, ...row.topic.split(/[,()]/).map((part) => part.trim()).filter((part) => part.length >= 4)];
  const ids = /* @__PURE__ */ new Set();
  for (const part of Array.from(new Set(parts))) {
    for (const subject2 of subjects) {
      const result = matchTopic(part, curriculumTopics, { subject: subject2, exam: row.exam });
      if (result.best && result.tier === "auto") ids.add(result.best.topicId);
    }
    if (part === row.topic && ids.size > 0) break;
  }
  return Array.from(ids);
}
var DAY_MS8 = 864e5;
function deriveCurriculumWeakTopics(rows, topics) {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const signals = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.insufficientData) continue;
    const at = row.lastReviewedAt ? new Date(row.lastReviewedAt).getTime() : 0;
    for (const id8 of resolveToCurriculumTopicIds(row, topics)) signals.set(id8, [...signals.get(id8) ?? [], { accuracy: row.progress, at }]);
  }
  const weak = [];
  for (const [id8, list] of Array.from(signals)) {
    const latestDay = Math.floor(Math.max(...list.map((signal) => signal.at)) / DAY_MS8);
    const latest = list.filter((signal) => Math.floor(signal.at / DAY_MS8) === latestDay);
    const accuracy = Math.round(latest.reduce((sum, signal) => sum + signal.accuracy, 0) / latest.length);
    const topic = topicById.get(id8);
    if (!topic || accuracy >= bookContentConfig.allocation.reviewMaxAccuracy) continue;
    weak.push({ topicId: id8, topic: topic.topic, subject: topic.subject, exam: topic.exam, accuracy });
  }
  return weak;
}

// server/bookContent/bookContentDb.ts
async function requireDb7() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
async function getMatchableTopics(track = "YKS") {
  const catalog = await getTopicCatalog();
  const aliasesBySlug = new Map(CURRICULUM.map((def) => [def.slug, def.aliases]));
  const kinds = kindsOf(track);
  return catalog.filter((row) => kinds.includes(row.exam)).map((row) => ({ id: row.id, slug: row.slug, exam: row.exam, subject: row.subject, unit: row.unit, topic: row.topic, aliases: aliasesBySlug.get(row.slug) ?? [] }));
}
async function getMatchableTopicsFor(userId) {
  return getMatchableTopics((await getStudentProfile(userId)).examTrack);
}
async function userOwnsBook(userId, bookId) {
  const db = await requireDb7();
  const [row] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and17(eq20(bookInventory.userId, userId), eq20(bookInventory.bookId, bookId), isNull12(bookInventory.removedAt))).limit(1);
  return Boolean(row);
}
async function replaceBookContents(userId, bookId, subject2, items, source) {
  const db = await requireDb7();
  const topicIds = Array.from(new Set(items.map((item) => item.topicId).filter((id8) => id8 !== null)));
  const validTopics = topicIds.length ? await db.select().from(yksTopics).where(inArray9(yksTopics.id, topicIds)) : [];
  const topicById = new Map(validTopics.map((row) => [row.id, row]));
  const unknown = topicIds.filter((id8) => !topicById.has(id8));
  if (unknown.length) throw new Error("Ge\xE7ersiz m\xFCfredat konusu se\xE7ildi. Sayfay\u0131 yenileyip tekrar dener misin?");
  const mixed = (type) => type === "review" || type === "simulation";
  const rows = items.map((item, index2) => ({
    userId,
    bookId,
    sortOrder: index2 + 1,
    unitNumber: item.unitNumber,
    unitTitle: item.unitTitle.slice(0, 300),
    contentType: item.contentType,
    label: item.label.slice(0, 120),
    testNumber: item.testNumber,
    title: item.title.slice(0, 300),
    pageStart: item.pageStart,
    pageEnd: item.pageEnd,
    topicId: item.topicId,
    mappingStatus: item.topicId !== null ? "confirmed" : mixed(item.contentType) ? "not_applicable" : "unmatched",
    mappingMethod: item.topicId !== null ? item.mappingMethod : "none",
    mappingConfidence: (item.topicId !== null ? Math.max(0, Math.min(1, item.mappingConfidence)) : 0).toFixed(3),
    source
  }));
  await db.transaction(async (tx) => {
    await tx.delete(userBookContents).where(and17(eq20(userBookContents.userId, userId), eq20(userBookContents.bookId, bookId)));
    if (rows.length) await tx.insert(userBookContents).values(rows);
  });
  for (const topicId of topicIds) {
    const topicRows = rows.filter((row) => row.topicId === topicId);
    const pages2 = topicRows.flatMap((row) => [row.pageStart, row.pageEnd]).filter((value) => value !== null);
    const tests = topicRows.filter((row) => row.contentType === "topic_test").map((row) => row.testNumber).filter((value) => value !== null);
    const singleUnit = new Set(topicRows.map((row) => `${row.unitNumber}|${row.unitTitle}`)).size === 1;
    const topic = topicById.get(topicId);
    await upsertBookTopicMapping(userId, {
      bookId,
      topic: topic.topic,
      subject: topic.subject || subject2,
      pageStart: pages2.length ? Math.min(...pages2) : null,
      pageEnd: pages2.length ? Math.max(...pages2) : null,
      testStart: singleUnit && tests.length ? Math.min(...tests) : null,
      testEnd: singleUnit && tests.length ? Math.max(...tests) : null
    });
  }
  return getBookContents(userId, bookId);
}
async function getBookContents(userId, bookId) {
  const db = await requireDb7();
  const rows = await db.select().from(userBookContents).where(and17(eq20(userBookContents.userId, userId), eq20(userBookContents.bookId, bookId))).orderBy(userBookContents.sortOrder);
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id8) => id8 !== null)));
  const topics = topicIds.length ? await db.select({ id: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, unit: yksTopics.unit }).from(yksTopics).where(inArray9(yksTopics.id, topicIds)) : [];
  const topicById = new Map(topics.map((row) => [row.id, row]));
  return rows.map((row) => ({ ...row, mappingConfidence: Number(row.mappingConfidence), topic: row.topicId !== null ? topicById.get(row.topicId) ?? null : null }));
}
async function getBookContentSummaries(userId) {
  const db = await requireDb7();
  const activeBooks = (await db.select({ bookId: bookInventory.bookId }).from(bookInventory).where(and17(eq20(bookInventory.userId, userId), isNull12(bookInventory.removedAt)))).map((row) => row.bookId);
  if (activeBooks.length === 0) return [];
  const [contentRows, logs, customBooks] = await Promise.all([
    db.select({ bookId: userBookContents.bookId, topicId: userBookContents.topicId, unitNumber: userBookContents.unitNumber, unitTitle: userBookContents.unitTitle, pageStart: userBookContents.pageStart }).from(userBookContents).where(and17(eq20(userBookContents.userId, userId), inArray9(userBookContents.bookId, activeBooks))).orderBy(userBookContents.sortOrder),
    db.select({ bookId: bookStudyLogs.bookId, pageStart: bookStudyLogs.pageStart, pageEnd: bookStudyLogs.pageEnd, questions: bookStudyLogs.questions, correct: bookStudyLogs.correct }).from(bookStudyLogs).where(and17(eq20(bookStudyLogs.userId, userId), inArray9(bookStudyLogs.bookId, activeBooks))),
    db.select({ bookId: userResourceBooks.bookId, pageCount: userResourceBooks.pageCount }).from(userResourceBooks).where(and17(eq20(userResourceBooks.userId, userId), inArray9(userResourceBooks.bookId, activeBooks)))
  ]);
  const pageCountByBook = new Map(customBooks.map((row) => [row.bookId, row.pageCount]));
  return activeBooks.map((bookId) => {
    const contents = contentRows.filter((row) => row.bookId === bookId);
    return {
      bookId,
      entries: contents.length,
      topicIds: Array.from(new Set(contents.map((row) => row.topicId).filter((id8) => id8 !== null))),
      completion: computeBookCompletion({ contents, logs: logs.filter((log) => log.bookId === bookId), pageCount: pageCountByBook.get(bookId) ?? null })
    };
  });
}
var parseRange = (value) => {
  const match = value?.match(/(\d+)\s*[-–]\s*(\d+)/) ?? value?.match(/^(\d+)$/);
  if (!match) return null;
  const start = Number(match[1]);
  return { pageStart: start, pageEnd: Number(match[2] ?? match[1]) };
};
async function getWeakTopicBookRecommendations(userId) {
  const db = await requireDb7();
  const [progress, topics] = await Promise.all([getUserTopicProgress(userId), getMatchableTopicsFor(userId)]);
  const weakTopics = deriveCurriculumWeakTopics(progress, topics);
  if (weakTopics.length === 0) return [];
  const activeBooks = (await db.select({ bookId: bookInventory.bookId }).from(bookInventory).where(and17(eq20(bookInventory.userId, userId), isNull12(bookInventory.removedAt)))).map((row) => row.bookId);
  if (activeBooks.length === 0) return [];
  const [contentRows, logs, planned] = await Promise.all([
    db.select().from(userBookContents).where(and17(eq20(userBookContents.userId, userId), eq20(userBookContents.mappingStatus, "confirmed"), inArray9(userBookContents.bookId, activeBooks), inArray9(userBookContents.topicId, weakTopics.map((topic) => topic.topicId)))),
    db.select({ bookId: bookStudyLogs.bookId, pageStart: bookStudyLogs.pageStart, pageEnd: bookStudyLogs.pageEnd }).from(bookStudyLogs).where(and17(eq20(bookStudyLogs.userId, userId), inArray9(bookStudyLogs.bookId, activeBooks))),
    db.select({ bookId: studyPlanSessions.sourceBookId, targetPages: studyPlanSessions.targetPages }).from(studyPlanSessions).where(and17(eq20(studyPlanSessions.userId, userId), eq20(studyPlanSessions.status, "planned"), inArray9(studyPlanSessions.sourceBookId, activeBooks)))
  ]);
  const donePages = {};
  for (const log of logs) if (log.pageStart !== null) (donePages[log.bookId] ??= []).push({ pageStart: log.pageStart, pageEnd: log.pageEnd ?? log.pageStart });
  const scheduledPages = {};
  for (const session of planned) {
    const range = parseRange(session.targetPages);
    if (session.bookId && range) (scheduledPages[session.bookId] ??= []).push(range);
  }
  const contents = contentRows.map((row) => ({ id: row.id, bookId: row.bookId, sortOrder: row.sortOrder, unitNumber: row.unitNumber, unitTitle: row.unitTitle, contentType: row.contentType, label: row.label, testNumber: row.testNumber, pageStart: row.pageStart, pageEnd: row.pageEnd, topicId: row.topicId, mappingConfidence: Number(row.mappingConfidence) }));
  return buildBookRecommendations({ weakTopics, contents, donePages, scheduledPages });
}
async function getAutoSchedule(userId) {
  const db = await requireDb7();
  const [row] = await db.select({ value: studentProfiles.autoScheduleBookTasks }).from(studentProfiles).where(eq20(studentProfiles.userId, userId)).limit(1);
  return row?.value === 1;
}
async function setAutoSchedule(userId, enabled) {
  const db = await requireDb7();
  await db.insert(studentProfiles).values({ userId, autoScheduleBookTasks: enabled ? 1 : 0 }).onConflictDoUpdate({ target: studentProfiles.userId, set: { autoScheduleBookTasks: enabled ? 1 : 0 } });
  return enabled;
}
async function runAutoSchedule(userId, bookTitles, maxTasks = 3) {
  if (!await getAutoSchedule(userId)) return { added: 0 };
  let added = 0;
  for (let index2 = 0; index2 < maxTasks; index2++) {
    const [next] = await getWeakTopicBookRecommendations(userId);
    if (!next) break;
    try {
      await addRecommendationToPlan(userId, { topicId: next.topicId, bookId: next.bookId, bookTitle: bookTitles[next.bookId] ?? "", when: "auto" });
      added += 1;
    } catch {
      break;
    }
  }
  return { added };
}
async function resolveBookTitle(db, userId, bookId, fallback) {
  const [custom] = await db.select({ title: userResourceBooks.title }).from(userResourceBooks).where(and17(eq20(userResourceBooks.userId, userId), eq20(userResourceBooks.bookId, bookId))).limit(1);
  if (custom) return custom.title;
  if (/^\d+$/.test(bookId)) {
    const [catalogBook] = await db.select({ name: catalogBooks.name }).from(catalogBooks).where(eq20(catalogBooks.id, Number(bookId))).limit(1);
    if (catalogBook) return catalogBook.name;
  }
  return fallback.slice(0, 120) || "Kitap";
}
async function addRecommendationToPlan(userId, input) {
  const db = await requireDb7();
  if (!await userOwnsBook(userId, input.bookId)) throw new Error("Bu kitap k\xFCt\xFCphanende bulunmuyor.");
  const recommendation = (await getWeakTopicBookRecommendations(userId)).find((rec) => rec.topicId === input.topicId && rec.bookId === input.bookId);
  if (!recommendation) throw new Error("Bu \xF6neri art\u0131k ge\xE7erli de\u011Fil (testler \xE7\xF6z\xFClm\xFC\u015F ya da zaten planlanm\u0131\u015F olabilir).");
  const date = await pickDayForTask(userId, recommendation.minutes, input.when);
  const bookTitle = await resolveBookTitle(db, userId, input.bookId, input.bookTitle);
  const unitPart = recommendation.unitNumber !== null ? `\xDCnite ${recommendation.unitNumber}` : recommendation.unitTitle;
  const testPart = recommendation.testRange ? `Test ${recommendation.testRange}` : recommendation.labels.join(", ");
  const title = `${bookTitle} \u2014 ${unitPart} \u2014 ${testPart}`.slice(0, 180);
  const targetPages = recommendation.pageStart !== null ? `${recommendation.pageStart}-${recommendation.pageEnd ?? recommendation.pageStart}` : null;
  await insertPlanTask(userId, {
    date,
    title,
    subject: recommendation.subject,
    topic: recommendation.topic,
    kind: recommendation.purpose === "review" ? "Tekrar" : "Soru",
    minutes: recommendation.minutes,
    targetPages,
    targetTests: recommendation.testRange,
    sourceBookId: input.bookId,
    planTitle: "Kitap g\xF6revleri",
    planSummary: "Zay\u0131f konular i\xE7in kitaplar\u0131ndan \xF6nerilen g\xF6revler."
  });
  return { date, title, minutes: recommendation.minutes };
}

// server/bookContent/sharedBooks.ts
import { and as and18, desc as desc13, eq as eq21, isNull as isNull13, or as or5, sql as sql11, ilike as ilike2 } from "drizzle-orm";
async function requireDb8() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var SHARED_CONTENTS_MIN_ITEMS = 3;
var MATCH_MIN_SCORE = 0.6;
var SEARCH_MIN_SCORE = 0.5;
var tokensOf = (value) => normalizeBookText(value).split(" ").filter((token) => token.length >= 2);
var sameToken = (a, b) => a === b || a.length >= 4 && b.length >= 4 && a.slice(0, 5) === b.slice(0, 5);
var covered = (tokens, pool) => tokens.filter((token) => pool.some((other) => sameToken(token, other))).length;
var GENERIC_PUBLISHER_WORDS = /* @__PURE__ */ new Set(["yayin", "yayinlari", "yayinevi", "yayincilik", "yayinlar", "yay", "kitap", "kitaplari", "akademi"]);
var publisherTokens = (value) => tokensOf(value).filter((token) => !GENERIC_PUBLISHER_WORDS.has(token));
var numbersOf = (tokens) => tokens.filter((token) => /^\d+$/.test(token));
var sameNumbers = (a, b) => {
  const x = numbersOf(a), y = numbersOf(b);
  return x.length === y.length && x.every((value) => y.includes(value));
};
function scoreSharedBook(draft, row) {
  const isbnA = normalizeIsbn(draft.isbn), isbnB = normalizeIsbn(row.isbn);
  if (isbnA && isbnB) return isbnA === isbnB ? 1 : 0;
  const a = tokensOf(draft.title), b = tokensOf(row.title);
  if (!a.length || !b.length || !sameNumbers(a, b)) return 0;
  const dice2 = (covered(a, b) + covered(b, a)) / (a.length + b.length);
  const publisherA = publisherTokens(draft.publisher), publisherB = publisherTokens(row.publisher);
  const publisher = !publisherA.length || !publisherB.length ? 0 : covered(publisherA, publisherB) > 0 ? 0.15 : -0.2;
  return Math.max(0, Math.min(1, dice2 + publisher));
}
var toMatch = (row, score, exact) => ({ id: row.id, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, authors: row.authors, isbn: row.isbn, edition: row.edition, ownerCount: row.ownerCount, contentsItemCount: row.contentsItemCount, contentsTopicCount: row.contentsTopicCount, score: Math.round(score * 100) / 100, exact });
async function candidatesFor(db, title, isbn) {
  const tokens = tokensOf(title).filter((token) => token.length >= 3).sort((a, b) => b.length - a.length).slice(0, 3);
  const conditions = [...tokens.map((token) => ilike2(sharedBooks.titleKey, `%${token.slice(0, 5)}%`)), ...isbn ? [eq21(sharedBooks.isbn, isbn)] : []];
  if (!conditions.length) return [];
  return db.select().from(sharedBooks).where(or5(...conditions)).orderBy(desc13(sharedBooks.ownerCount)).limit(100);
}
async function findSharedBookMatches(draft, limit = 3) {
  const db = await requireDb8();
  const rows = await candidatesFor(db, draft.title, normalizeIsbn(draft.isbn));
  return rows.map((row) => ({ row, score: scoreSharedBook(draft, row), exact: isSameBook(draft, row) })).filter((item) => item.exact || item.score >= MATCH_MIN_SCORE).sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || b.row.ownerCount - a.row.ownerCount).slice(0, limit).map((item) => toMatch(item.row, item.exact ? Math.max(item.score, 0.95) : item.score, item.exact));
}
async function searchSharedBooks(query, limit = 8) {
  const db = await requireDb8();
  const queryTokens = tokensOf(query);
  if (!queryTokens.length) return [];
  const isbn = normalizeIsbn(query);
  const rows = await candidatesFor(db, query, isbn);
  return rows.map((row) => {
    if (isbn && row.isbn === isbn) return { row, score: 1 };
    const pool = [...tokensOf(row.title), ...tokensOf(row.publisher)];
    if (numbersOf(queryTokens).some((value) => !pool.includes(value))) return { row, score: 0 };
    return { row, score: covered(queryTokens, pool) / queryTokens.length };
  }).filter((item) => item.score >= SEARCH_MIN_SCORE).sort((a, b) => b.score - a.score || b.row.ownerCount - a.row.ownerCount).slice(0, limit).map((item) => toMatch(item.row, item.score, item.score === 1));
}
async function registerSharedBook(db, userId, draft) {
  const isbn = normalizeIsbn(draft.isbn);
  const existing = (await candidatesFor(db, draft.title, isbn)).find((row) => isSameBook({ ...draft, isbn }, row));
  if (existing) return existing;
  const [created] = await db.insert(sharedBooks).values({
    title: draft.title.trim().slice(0, 180),
    publisher: draft.publisher.trim().slice(0, 120) || "Yay\u0131nevi belirtilmemi\u015F",
    subject: draft.subject.trim().slice(0, 80) || "Genel",
    exam: draft.exam,
    authors: draft.authors?.trim().slice(0, 300) || null,
    isbn,
    edition: draft.edition?.trim().slice(0, 120) || null,
    titleKey: normalizeBookText(draft.title).slice(0, 200),
    publisherKey: normalizeBookText(draft.publisher).slice(0, 140),
    ownerCount: 0,
    createdByUserId: userId
  }).returning();
  return created;
}
async function addBookToLibrary(userId, input) {
  const db = await requireDb8();
  let shared;
  if (input.sharedBookId) {
    const [row2] = await db.select().from(sharedBooks).where(eq21(sharedBooks.id, input.sharedBookId)).limit(1);
    if (!row2) throw new Error("Se\xE7ilen kitap bulunamad\u0131. Kapa\u011F\u0131 foto\u011Frafla ekleyebilirsin.");
    shared = row2;
  } else {
    shared = await registerSharedBook(db, userId, input.draft);
  }
  const [owned] = await db.select().from(userResourceBooks).innerJoin(bookInventory, and18(eq21(bookInventory.userId, userResourceBooks.userId), eq21(bookInventory.bookId, userResourceBooks.bookId), isNull13(bookInventory.removedAt))).where(and18(eq21(userResourceBooks.userId, userId), eq21(userResourceBooks.sharedBookId, shared.id))).limit(1);
  if (owned) return { book: asAddedBook(owned.user_resource_books, shared.id), contentsCopied: 0, topicCount: 0, alreadyOwned: true };
  const identity = input.sharedBookId ? { title: shared.title, publisher: shared.publisher, subject: shared.subject, exam: shared.exam, authors: shared.authors, isbn: shared.isbn, edition: shared.edition } : input.draft;
  const edition = identity.edition?.trim();
  const bookId = `photo-book-${Date.now()}`;
  const [row] = await db.insert(userResourceBooks).values({
    userId,
    bookId,
    title: identity.title.trim().slice(0, 180),
    publisher: identity.publisher.trim().slice(0, 120) || "Yay\u0131nevi belirtilmemi\u015F",
    subject: identity.subject.trim().slice(0, 80) || "Genel",
    exam: identity.exam,
    level: input.draft.level,
    format: "Kaynak",
    reason: `\xD6\u011Frencinin kendi k\xFCt\xFCphanesinden${input.sharedBookId ? ", ortak kitap kayd\u0131ndan" : ", foto\u011Frafla"} eklendi.${edition ? ` Bask\u0131: ${edition}.` : ""}`,
    tone: "blue",
    authors: identity.authors?.trim() || null,
    isbn: normalizeIsbn(identity.isbn),
    sharedBookId: shared.id
  }).returning();
  await addBookToInventory(userId, bookId);
  await db.update(sharedBooks).set({ ownerCount: sql11`${sharedBooks.ownerCount} + 1` }).where(eq21(sharedBooks.id, shared.id));
  let contentsCopied = 0, topicCount = 0;
  if (input.useSharedContents && shared.contentsJson) {
    try {
      const stored = JSON.parse(shared.contentsJson);
      await replaceBookContents(userId, bookId, stored.subject || row.subject, stored.items, shared.contentsSource ?? "ocr");
      contentsCopied = stored.items.length;
      topicCount = shared.contentsTopicCount;
      await db.update(sharedBooks).set({ contentsReuseCount: sql11`${sharedBooks.contentsReuseCount} + 1` }).where(eq21(sharedBooks.id, shared.id));
    } catch (error) {
      console.warn("[shared books] contents reuse failed:", error instanceof Error ? error.message : error);
    }
  }
  return { book: asAddedBook(row, shared.id), contentsCopied, topicCount, alreadyOwned: false };
}
function asAddedBook(row, sharedBookId) {
  return { id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl ?? "", tone: row.tone, authors: row.authors ?? void 0, isbn: row.isbn ?? void 0, sharedBookId };
}
async function shareBookContents(userId, bookId, subject2, items, source) {
  const topicCount = new Set(items.map((item) => item.topicId).filter((id8) => id8 !== null)).size;
  if (items.length < SHARED_CONTENTS_MIN_ITEMS || topicCount === 0) return false;
  const db = await requireDb8();
  const [own] = await db.select({ sharedBookId: userResourceBooks.sharedBookId }).from(userResourceBooks).where(and18(eq21(userResourceBooks.userId, userId), eq21(userResourceBooks.bookId, bookId))).limit(1);
  if (!own?.sharedBookId) return false;
  const contentsJson = JSON.stringify({ subject: subject2, items });
  const updated = await db.update(sharedBooks).set({ contentsJson, contentsItemCount: items.length, contentsTopicCount: topicCount, contentsSource: source, contentsByUserId: userId, contentsUpdatedAt: /* @__PURE__ */ new Date() }).where(and18(eq21(sharedBooks.id, own.sharedBookId), eq21(sharedBooks.contentsItemCount, 0))).returning({ id: sharedBooks.id });
  return updated.length > 0;
}

// server/bookContent/aiMapper.ts
async function suggestTopicsWithAi(titles, candidates, invoke = invokeLLM) {
  const { enabled, maxCandidates, maxConfidence, minConfidence } = bookContentConfig.aiMapping;
  if (!enabled || titles.length === 0 || candidates.length === 0) return [];
  const pool = candidates.slice(0, maxCandidates);
  const allowed = new Set(pool.map((topic) => topic.id));
  try {
    const response = await invoke({
      messages: [
        { role: "system", content: "Bir s\u0131nav haz\u0131rl\u0131k (YKS ya da LGS) kitab\u0131n\u0131n i\xE7indekiler ba\u015Fl\u0131klar\u0131n\u0131, verilen m\xFCfredat konu listesindeki EN UYGUN konuyla e\u015Fle\u015Ftiriyorsun. Yaln\u0131zca listedeki id'lerden birini se\xE7; hi\xE7biri ger\xE7ekten uymuyorsa candidateTopicId null ver. Yeni konu \xF6nerme. confidence 0-1 aras\u0131, emin de\u011Filsen d\xFC\u015F\xFCk ver. reason tek k\u0131sa T\xFCrk\xE7e c\xFCmle." },
        { role: "user", content: JSON.stringify({ topics: pool.map((topic) => ({ id: topic.id, subject: topic.subject, unit: topic.unit, topic: topic.topic })), titles: titles.map((title) => ({ key: title.key, title: title.text, unit: title.unitTitle })) }) }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "yks_topic_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: { answers: { type: "array", items: { type: "object", properties: { key: { type: "integer" }, candidateTopicId: { type: ["integer", "null"] }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["key", "candidateTopicId", "confidence", "reason"], additionalProperties: false } } },
            required: ["answers"],
            additionalProperties: false
          }
        }
      }
    });
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
    if (!jsonText) return [];
    const parsed = JSON.parse(jsonText);
    const keys = new Set(titles.map((title) => title.key));
    return (parsed.answers ?? []).filter((answer) => keys.has(answer.key) && answer.candidateTopicId !== null && allowed.has(answer.candidateTopicId) && Number.isFinite(answer.confidence)).map((answer) => ({ key: answer.key, topicId: answer.candidateTopicId, confidence: Math.min(maxConfidence, Math.max(0, answer.confidence)), reason: String(answer.reason ?? "").slice(0, 200) })).filter((answer) => answer.confidence >= minConfidence);
  } catch (error) {
    console.warn("[BookContent] AI mapping skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}

// server/bookContent/tocPostprocess.ts
init_turkishText();

// server/bookContent/ocrText.ts
init_turkishText();
var DIGIT_LOOKALIKES = { I: "1", l: "1", "|": "1", i: "1", "!": "1", O: "0", o: "0", D: "0", Z: "2", z: "2", S: "5", s: "5", B: "8", G: "6", b: "6", q: "9", g: "9" };
function parsePageNumber(raw) {
  if (raw === null || raw === void 0) return { value: null, corrected: false, raw: "" };
  if (typeof raw === "number") return { value: Number.isInteger(raw) && raw > 0 && raw < 2e3 ? raw : null, corrected: false, raw: String(raw) };
  const text4 = raw.trim();
  const inParens = /\(\s*([^)]{1,6})\s*\)/.exec(text4)?.[1];
  const token = (inParens ?? text4.split(/[\s.…·_-]+/).filter(Boolean).pop() ?? "").trim();
  if (!token || token.length > 4) return { value: null, corrected: false, raw: text4 };
  if (/^\d+$/.test(token)) {
    const value2 = Number(token);
    return { value: value2 > 0 && value2 < 2e3 ? value2 : null, corrected: false, raw: text4 };
  }
  const letters = token.replace(/\d/g, "");
  if (!/\d/.test(token) || letters.length > token.length - letters.length) return { value: null, corrected: false, raw: text4 };
  const mapped = token.split("").map((char) => /\d/.test(char) ? char : DIGIT_LOOKALIKES[char] ?? "?").join("");
  if (!/^\d+$/.test(mapped)) return { value: null, corrected: false, raw: text4 };
  const value = Number(mapped);
  return { value: value > 0 && value < 2e3 ? value : null, corrected: true, raw: text4 };
}
function splitTrailingPage(title) {
  const match = /^(.*?)[\s.…·_]{3,}\s*\(?\s*([0-9IlOoZS|]{1,4})\s*\)?\s*$/.exec(title);
  if (!match || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(match[1])) return { title, pageText: null };
  return { title: match[1].trim(), pageText: match[2] };
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index2) => index2);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}
function textSimilarity(a, b) {
  const left = normalizeForComparison(a), right = normalizeForComparison(b);
  if (!left && !right) return 1;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
}
var TURKISH_LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/;
var TURKISH_SPECIFIC = /[ÇĞİÖŞÜçğıöşü]/g;
var VOWELS = /[AEIİOÖUÜaeıioöuüâîû]/;
function turkishPlausibility(text4) {
  const compact = text4.replace(/\s+/g, "");
  if (!compact) return 0;
  const letters = compact.split("").filter((char) => TURKISH_LETTERS.test(char)).length;
  const digits = compact.split("").filter((char) => /\d/.test(char)).length;
  const symbols = compact.length - letters - digits - (compact.match(/[.,;:()'’\-–—/&]/g)?.length ?? 0);
  const words = text4.split(/\s+/).filter((word) => word.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").length >= 2);
  const wordsWithVowel = words.filter((word) => VOWELS.test(word)).length;
  const letterRatio = letters / Math.max(1, compact.length - digits);
  const vowelRatio = words.length ? wordsWithVowel / words.length : 0.5;
  return Math.max(0, Math.min(1, 0.6 * letterRatio + 0.4 * vowelRatio - 0.15 * Math.max(0, symbols)));
}
var turkishCharCount = (text4) => text4.match(TURKISH_SPECIFIC)?.length ?? 0;

// server/bookContent/tocPostprocess.ts
var HEADING_WORDS = /* @__PURE__ */ new Set(["icindekiler", "icerik", "icerikler", "kitap bitirme plani", "konular", "konu listesi", "konu takip cizelgesi", "sayfa", "test", "unite"]);
function noiseReason(item, context) {
  const text4 = `${item.label ?? ""} ${item.title}`.trim();
  const normalized = normalizeForComparison(text4);
  if (!normalized) return "decorative";
  if (/\bisbn\b/.test(normalized) || /\b97[89][\d\s-]{10,}/.test(text4)) return "isbn";
  if (/\d{8,}/.test(text4.replace(/[\s-]/g, "")) && !/[a-zçğıöşü]{3,}/i.test(text4)) return "barcode";
  if (/(www\.|https?:\/\/|\.com\b|\.com\.tr\b|@)/i.test(text4)) return "url";
  if (/©|\bcopyright\b|tum haklari|yayin hakki|baski\s*:|matbaa/.test(`${text4} ${normalized}`.toLowerCase())) return "copyright";
  if (HEADING_WORDS.has(normalized)) return "heading";
  if (context.publisher && normalizeForComparison(context.publisher) === normalized) return "publisher";
  if (context.title && item.type !== "unit" && normalizeForComparison(context.title) === normalized) return "book_title";
  if (!/[a-zçğıöşü]/i.test(text4) && item.page === null) return "decorative";
  return null;
}
function repairPageNumbers(items) {
  return items.map((item) => {
    if (item.type !== "entry") return item;
    let title = item.title;
    let pageText = item.pageText ?? null;
    if (!pageText && item.page === null) {
      const split = splitTrailingPage(title);
      if (split.pageText) {
        title = split.title;
        pageText = split.pageText;
      }
    }
    if (pageText === null || pageText === void 0) return { ...item, title, review: { ...item.review, page: item.review?.page || item.page === null } };
    const parsed = parsePageNumber(pageText);
    const conflict = item.page !== null && parsed.value !== null && parsed.value !== item.page;
    return { ...item, title, pageText, page: parsed.value ?? (parsed.raw ? null : item.page), review: { ...item.review, page: Boolean(item.review?.page) || parsed.corrected || parsed.value === null || conflict } };
  });
}
function filterTocNoise(pages2, context = {}) {
  const removed = [];
  const repeated = /* @__PURE__ */ new Set();
  if (pages2.length > 1) {
    const seen = /* @__PURE__ */ new Map();
    for (const page2 of pages2) {
      const onPage = new Set(page2.items.filter((item) => item.page === null && item.type !== "unit").map((item) => normalizeForComparison(`${item.label ?? ""} ${item.title}`)).filter(Boolean));
      for (const key of Array.from(onPage)) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count4] of Array.from(seen.entries())) if (count4 >= 2) repeated.add(key);
  }
  const cleaned = pages2.map((page2) => ({
    ...page2,
    items: page2.items.filter((item) => {
      const reason = noiseReason(item, context) ?? (item.page === null && item.type !== "unit" && repeated.has(normalizeForComparison(`${item.label ?? ""} ${item.title}`)) ? "repeated_header" : null);
      if (reason) removed.push({ text: `${item.label ?? ""} ${item.title}`.trim(), reason });
      return !reason;
    })
  }));
  return { pages: cleaned, removed };
}
function rawTextOf(page2) {
  return page2.items.map((item) => [item.type === "unit" && item.unitNumber !== null && !/ünite|unite/i.test(item.title) ? `${item.unitNumber}. \xDCN\u0130TE` : "", item.label ?? "", item.title, item.pageText ?? (item.page !== null ? String(item.page) : "")].filter(Boolean).join(" ")).join("\n");
}

// server/bookContent/ocrProvider.ts
var tocItemSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["unit", "section", "entry"] },
    unitNumber: { type: ["integer", "null"] },
    title: { type: "string" },
    label: { type: ["string", "null"] },
    pageText: { type: ["string", "null"] },
    confidence: { type: "number" }
  },
  required: ["type", "unitNumber", "title", "label", "pageText", "confidence"],
  additionalProperties: false
};
var SYSTEM_PROMPT = [
  "Sen bir T\xFCrk\xE7e s\u0131nav haz\u0131rl\u0131k (YKS ya da LGS) kaynak kitab\u0131n\u0131n \u0130\xC7\u0130NDEK\u0130LER (konu listesi) sayfas\u0131n\u0131 sat\u0131r sat\u0131r okuyan bir OCR asistan\u0131s\u0131n.",
  "G\xF6rseldeki her sat\u0131r\u0131 yukar\u0131dan a\u015Fa\u011F\u0131ya, sayfadaki s\u0131ras\u0131yla d\xF6nd\xFCr. Yorum yapma, \xF6zetleme, eksik sat\u0131r\u0131 tahminle doldurma.",
  "type: numaral\u0131 \xFCnite ba\u015Fl\u0131\u011F\u0131 (\xF6r. '1. \xDCN\u0130TE') i\xE7in 'unit' (unitNumber dolu); \xFCnite ad\u0131 ayr\u0131 sat\u0131rdaysa veya numaras\u0131z grup ba\u015Fl\u0131\u011F\u0131ysa (\xF6r. 'S\u0130M\xDCLASYON DENEMELER\u0130') 'section'; sayfa numaras\u0131 olan her sat\u0131r i\xE7in 'entry'.",
  "entry sat\u0131rlar\u0131nda: label = sat\u0131r ba\u015F\u0131ndaki etiket ('Test 1', '\xD6SYM Tipi', 'Sarmal Test \u2013 2', 'Sim\xFClasyon 3', '\xD6SYM Tipi - E\u011Fitim Kontrol Testi - 1'); title = etiketten sonraki konu ad\u0131 (yoksa bo\u015F string); pageText = sat\u0131r\u0131n sa\u011F\u0131ndaki sayfa numaras\u0131n\u0131 G\xD6RD\xDC\u011E\xDCN G\u0130B\u0130 yaz (\xF6r. '12'; '1' ile 'I' ay\u0131rt edilemiyorsa g\xF6rd\xFC\u011F\xFCn\xFC yaz, d\xFCzeltme yapma), yoksa null.",
  "Foto\u011Fraf e\u011Fik \xE7ekilmi\u015F olabilir: sayfa numaras\u0131, noktal\u0131 \xE7izginin (.....) ba\u011Flad\u0131\u011F\u0131 sat\u0131ra aittir, hizas\u0131 yar\u0131m sat\u0131r kaym\u0131\u015F g\xF6r\xFCnse bile. Bir \xFCnite ba\u015Fl\u0131\u011F\u0131na sayfa numaras\u0131 atama; numaralar test sat\u0131rlar\u0131na aittir.",
  "Kitaplar\u0131n i\xE7indekiler d\xFCzeni farkl\u0131d\u0131r. \xDCnite/test yoksa ve sayfa numaral\u0131 bir KONU L\u0130STES\u0130 varsa (\xF6r. 'K\u0130TAP B\u0130T\u0130RME PLANI', 'KONULAR', 'Konu Takip \xC7izelgesi'; '1. TOPLAMA VE \xC7IKARMA \u0130\u015ELEM\u0130' ba\u015Fl\u0131\u011F\u0131 ve alt\u0131nda 'Sayfa (3)'), her konu bir 'entry'dir: label = null, title = numaras\u0131z konu ad\u0131 (iki sat\u0131ra b\xF6l\xFCnm\xFC\u015Fse birle\u015Ftir; harfleri kitaptaki gibi, b\xFCy\xFCk harfse b\xFCy\xFCk), pageText = o konunun sayfa numaras\u0131 ('Sayfa (3)' \u2192 '3'). 'Sayfa' kelimesini ve onay kutular\u0131n\u0131 ba\u015Fl\u0131\u011Fa katma.",
  "Sayfa \u0130K\u0130 ya da daha \xE7ok S\xDCTUNLUYSA \xF6nce sol s\xFCtunu yukar\u0131dan a\u015Fa\u011F\u0131ya, sonra sa\u011F s\xFCtunu oku; sat\u0131rlar\u0131 s\xFCtunlar aras\u0131nda kar\u0131\u015Ft\u0131rma. Konu numaralar\u0131 (1, 2, 3\u2026) okuma s\u0131ras\u0131n\u0131 do\u011Frulamana yard\u0131m eder.",
  "Foto\u011Fraf yan (90\xB0) ya da ters \xE7ekilmi\u015F, sayfa kadraj\u0131n k\xFC\xE7\xFCk bir k\u0131sm\u0131nda, arka sayfan\u0131n yaz\u0131s\u0131 soluk bi\xE7imde g\xF6r\xFCn\xFCr olabilir: yaz\u0131y\u0131 d\xF6nd\xFCrerek oku, soluk arka sayfa yaz\u0131s\u0131n\u0131 yok say.",
  "Okuyamad\u0131\u011F\u0131n sayfa numaras\u0131n\u0131 null b\u0131rak, uydurma. Metni kitaptaki gibi, T\xFCrk\xE7e karakterleriyle (\xE7 \u011F \u0131 \u0130 \xF6 \u015F \xFC) yaz; karakteri net g\xF6remiyorsan en olas\u0131 harfi yaz ama o sat\u0131r\u0131n confidence de\u011Ferini d\xFC\u015F\xFCr. confidence: o sat\u0131r\u0131 ne kadar net okudu\u011Fun (0\u20131); bulan\u0131k, g\xF6lgeli, kesik ya da tahmin i\xE7eren sat\u0131rlarda 0.6'n\u0131n alt\u0131nda ver. ISBN, barkod, web adresi, yay\u0131nevi logosu, telif yaz\u0131s\u0131 ve sayfa \xFCst/alt bilgisi i\xE7indekiler sat\u0131r\u0131 DE\u011E\u0130LD\u0130R, items'a ekleme.",
  "pageKind: g\xF6rsel konular\u0131 sayfa numaralar\u0131yla listeleyen herhangi bir sayfaysa (i\xE7indekiler, kitap bitirme plan\u0131, konu listesi) 'table_of_contents'; kitap kapa\u011F\u0131ysa 'cover'; ba\u015Fka bir \u015Feyse 'other' (bu iki durumda items bo\u015F olabilir)."
].join(" ");
var llmVisionOcrProvider = {
  name: "llm-vision",
  async extractTableOfContentsPage(imageDataUrl, hint) {
    const instruction = hint ? `Bu i\xE7indekiler sayfas\u0131n\u0131 yeniden, dikkatle oku. \u0130lk okumada \u015Fu tutars\u0131zl\u0131klar bulundu: ${hint.issues.join(" | ")}. \u0130lk okuma: ${JSON.stringify(hint.previous.items).slice(0, 6e3)}. G\xF6rselde noktal\u0131 \xE7izgileri takip ederek her sayfa numaras\u0131n\u0131 do\u011Fru sat\u0131ra e\u015Fle; g\xF6rselde olmayan bir \u015Feyi ekleme.` : "Bu i\xE7indekiler sayfas\u0131n\u0131 oku.";
    const response = await invokeLLMWithTier({
      reasoningEffort: "low",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text", text: instruction }, { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }] }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "yks_book_toc_page", strict: true, schema: { type: "object", properties: { pageKind: { type: "string", enum: ["table_of_contents", "cover", "other"] }, items: { type: "array", items: tocItemSchema } }, required: ["pageKind", "items"], additionalProperties: false } }
      }
    }, "strong", invokeLLM);
    const raw = response.choices[0]?.message?.content;
    const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
    if (!jsonText) throw new Error("OCR yan\u0131t\u0131 bo\u015F d\xF6nd\xFC");
    const parsed = JSON.parse(jsonText);
    const items = repairPageNumbers((parsed.items ?? []).filter(
      (item) => Boolean(item) && ["unit", "section", "entry"].includes(item.type) && typeof item.title === "string"
    ).map((item) => ({
      type: item.type,
      unitNumber: Number.isInteger(item.unitNumber) ? item.unitNumber : null,
      title: item.title.slice(0, 300),
      label: typeof item.label === "string" ? item.label.slice(0, 120) : null,
      // Sayfa numarası sağlayıcının ham metninden deterministik olarak çözülür (bkz. repairPageNumbers).
      page: null,
      pageText: typeof item.pageText === "string" ? item.pageText.slice(0, 20) : null,
      confidence: typeof item.confidence === "number" && Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.7
    })));
    const pageKind = parsed.pageKind === "cover" || parsed.pageKind === "other" ? parsed.pageKind : "table_of_contents";
    return { items, pageKind };
  }
};
var getOcrProvider = () => llmVisionOcrProvider;
async function extractPlainTextFromImage(imageDataUrl) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "G\xF6rseldeki yaz\u0131y\u0131 oldu\u011Fu gibi, T\xFCrk\xE7e karakterleriyle ve sat\u0131r yap\u0131s\u0131n\u0131 koruyarak metne d\xF6k. Matematiksel ifadeleri d\xFCz yaz\u0131yla (\xF6r. x^2 + y^2 = z^2) yaz. Yorum ekleme, \xF6zetleme, \xE7evirme. G\xF6rselde okunabilir yaz\u0131 yoksa bo\u015F string d\xF6nd\xFCr." },
      { role: "user", content: [{ type: "text", text: "Bu g\xF6rseldeki metni \xE7\u0131kar." }, { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }] }
    ],
    response_format: { type: "json_schema", json_schema: { name: "note_image_text", strict: true, schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } } }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("OCR yan\u0131t\u0131 bo\u015F d\xF6nd\xFC");
  return String(JSON.parse(jsonText).text ?? "").slice(0, 2e4).trim();
}

// server/bookContent/ocrCache.ts
import { createHash as createHash3 } from "node:crypto";
import { and as and19, eq as eq22, lt as lt10 } from "drizzle-orm";
var OCR_PIPELINE_VERSION = "toc-2.0";
var CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var disabledReason = null;
var imageHash = (buffer) => createHash3("sha256").update(buffer).digest("hex");
function disable(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!disabledReason) console.warn(`[OCR cache] disabled: ${message.slice(0, 200)}`);
  disabledReason = message;
}
async function readOcrCache(userId, hash) {
  if (disabledReason) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select({ resultJson: ocrPageCache.resultJson, createdAt: ocrPageCache.createdAt }).from(ocrPageCache).where(and19(eq22(ocrPageCache.userId, userId), eq22(ocrPageCache.imageHash, hash), eq22(ocrPageCache.pipelineVersion, OCR_PIPELINE_VERSION))).limit(1);
    if (!row || Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return JSON.parse(row.resultJson);
  } catch (error) {
    disable(error);
    return null;
  }
}
async function writeOcrCache(userId, hash, result) {
  if (disabledReason) return;
  try {
    const db = await getDb();
    if (!db) return;
    const resultJson = JSON.stringify(result);
    await db.insert(ocrPageCache).values({ userId, imageHash: hash, pipelineVersion: OCR_PIPELINE_VERSION, resultJson }).onConflictDoUpdate({ target: [ocrPageCache.userId, ocrPageCache.imageHash, ocrPageCache.pipelineVersion], set: { resultJson, createdAt: /* @__PURE__ */ new Date() } });
    await db.delete(ocrPageCache).where(and19(eq22(ocrPageCache.userId, userId), lt10(ocrPageCache.createdAt, new Date(Date.now() - CACHE_TTL_MS))));
  } catch (error) {
    disable(error);
  }
}

// server/bookContent/ocrOrchestrator.ts
import fs from "node:fs";
import path from "node:path";

// shared/imaging/image.ts
var createGray = (width, height, fill = 0) => {
  const data = new Float32Array(width * height);
  if (fill) data.fill(fill);
  return { width, height, data };
};
function toGray(image) {
  const out = createGray(image.width, image.height);
  const source = image.data;
  for (let index2 = 0, offset = 0; index2 < out.data.length; index2++, offset += 4) {
    out.data[index2] = 0.299 * source[offset] + 0.587 * source[offset + 1] + 0.114 * source[offset + 2];
  }
  return out;
}
function grayToRgba(image) {
  const out = new Uint8ClampedArray(image.width * image.height * 4);
  for (let index2 = 0, offset = 0; index2 < image.data.length; index2++, offset += 4) {
    const value = image.data[index2];
    out[offset] = out[offset + 1] = out[offset + 2] = value;
    out[offset + 3] = 255;
  }
  return out;
}
var sample = (image, x, y, fill) => {
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) return fill;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1), y1 = Math.min(image.height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const row0 = y0 * image.width, row1 = y1 * image.width;
  const top = image.data[row0 + x0] * (1 - tx) + image.data[row0 + x1] * tx;
  const bottom = image.data[row1 + x0] * (1 - tx) + image.data[row1 + x1] * tx;
  return top * (1 - ty) + bottom * ty;
};
function resizeGray(image, width, height) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const out = createGray(width, height);
  const scaleX = image.width / width, scaleY = image.height / height;
  if (scaleX <= 1 && scaleY <= 1) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out.data[y * width + x] = sample(image, (x + 0.5) * scaleX - 0.5, (y + 0.5) * scaleY - 0.5, 255);
    return out;
  }
  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * scaleY), sy1 = Math.max(sy0 + 1, Math.min(image.height, Math.floor((y + 1) * scaleY)));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * scaleX), sx1 = Math.max(sx0 + 1, Math.min(image.width, Math.floor((x + 1) * scaleX)));
      let sum = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) sum += image.data[sy * image.width + sx];
      out.data[y * width + x] = sum / ((sy1 - sy0) * (sx1 - sx0));
    }
  }
  return out;
}
function limitSize(image, maxDimension) {
  const longest = Math.max(image.width, image.height);
  if (longest <= maxDimension) return image;
  const scale = maxDimension / longest;
  return resizeGray(image, image.width * scale, image.height * scale);
}
function rotateQuarter(image, degrees) {
  if (degrees === 0) return image;
  const { width, height, data } = image;
  const swap = degrees !== 180;
  const out = createGray(swap ? height : width, swap ? width : height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      let nx, ny;
      if (degrees === 90) {
        nx = height - 1 - y;
        ny = x;
      } else if (degrees === 180) {
        nx = width - 1 - x;
        ny = height - 1 - y;
      } else {
        nx = y;
        ny = width - 1 - x;
      }
      out.data[ny * out.width + nx] = value;
    }
  }
  return out;
}
function rotateSmall(image, degrees, fill = 255) {
  if (Math.abs(degrees) < 1e-3) return image;
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const cx = (image.width - 1) / 2, cy = (image.height - 1) / 2;
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const dx = x - cx, dy = y - cy;
      out.data[y * image.width + x] = sample(image, cx + dx * cos + dy * sin, cy - dx * sin + dy * cos, fill);
    }
  }
  return out;
}
function percentileOf(values, fraction, maxSamples = 2e5) {
  const length = values.length;
  if (!length) return 0;
  const step = Math.max(1, Math.floor(length / maxSamples));
  const picked = [];
  for (let index2 = 0; index2 < length; index2 += step) picked.push(values[index2]);
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.max(0, Math.floor(picked.length * fraction)))];
}

// shared/imaging/enhance.ts
function estimateBackground(image) {
  const { width, height, data } = image;
  const block = Math.max(16, Math.round(Math.max(width, height) / 60));
  const gw = Math.ceil(width / block), gh = Math.ceil(height / block);
  const raw = new Float32Array(gw * gh);
  const values = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      values.length = 0;
      for (let y = gy * block; y < Math.min(height, (gy + 1) * block); y += 2) for (let x = gx * block; x < Math.min(width, (gx + 1) * block); x += 2) values.push(data[y * width + x]);
      values.sort((a, b) => a - b);
      raw[gy * gw + gx] = values.length ? values[Math.floor(values.length * 0.95)] : 255;
    }
  }
  const grid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let sum = 0, count4 = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx, y = gy + dy;
      if (x >= 0 && y >= 0 && x < gw && y < gh) {
        sum += raw[y * gw + x];
        count4++;
      }
    }
    grid[gy * gw + gx] = sum / count4;
  }
  const at = (x, y) => {
    const fx = Math.min(gw - 1, Math.max(0, x / block - 0.5)), fy = Math.min(gh - 1, Math.max(0, y / block - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const top = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx;
    const bottom = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return { block, gw, gh, grid, at };
}
function flattenIllumination(image, background = estimateBackground(image)) {
  const out = createGray(image.width, image.height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const index2 = y * image.width + x;
    out.data[index2] = Math.min(255, image.data[index2] / Math.max(24, background.at(x, y)) * 255);
  }
  return out;
}
function stretchContrast(image, options = {}) {
  const low = percentileOf(image.data, options.lowPct ?? 0.01);
  const high = Math.max(low + 30, percentileOf(image.data, options.highPct ?? 0.9));
  const knee = options.knee ?? 0.8;
  const gamma = options.gamma ?? 1.6;
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) {
    const normalized = Math.min(1, Math.max(0, (image.data[index2] - low) / (high - low) / knee));
    out.data[index2] = 255 * normalized ** gamma;
  }
  return out;
}
function otsuThreshold(image) {
  const histogram = new Float64Array(256);
  for (let index2 = 0; index2 < image.data.length; index2++) histogram[Math.max(0, Math.min(255, Math.round(image.data[index2])))]++;
  const total = image.data.length;
  let sumAll = 0;
  for (let value = 0; value < 256; value++) sumAll += value * histogram[value];
  let sumBackground = 0, weightBackground = 0, best = 0, threshold = 127;
  for (let value = 0; value < 256; value++) {
    weightBackground += histogram[value];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const between = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (between > best) {
      best = between;
      threshold = value;
    }
  }
  return threshold;
}
function binarizeGlobal(image, threshold) {
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) out.data[index2] = image.data[index2] > threshold ? 255 : 0;
  return out;
}
function binarizeSauvola(image, options = {}) {
  const { width, height, data } = image;
  const radius = Math.max(4, Math.floor((options.window ?? Math.max(15, Math.round(Math.min(width, height) / 40))) / 2));
  const k = options.k ?? 0.2;
  const stride = width + 1;
  const sum = new Float64Array(stride * (height + 1));
  const sumSq = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0, rowSq = 0;
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x];
      rowSum += value;
      rowSq += value * value;
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + rowSum;
      sumSq[(y + 1) * stride + x + 1] = sumSq[y * stride + x + 1] + rowSq;
    }
  }
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const count4 = (y1 - y0) * (x1 - x0);
      const s = sum[y1 * stride + x1] - sum[y0 * stride + x1] - sum[y1 * stride + x0] + sum[y0 * stride + x0];
      const sq = sumSq[y1 * stride + x1] - sumSq[y0 * stride + x1] - sumSq[y1 * stride + x0] + sumSq[y0 * stride + x0];
      const mean2 = s / count4;
      const std = Math.sqrt(Math.max(0, sq / count4 - mean2 * mean2));
      const threshold = mean2 * (1 + k * (std / 128 - 1));
      out.data[y * width + x] = data[y * width + x] > threshold ? 255 : 0;
    }
  }
  return out;
}
function median3(image) {
  const { width, height, data } = image;
  const out = createGray(width, height);
  const window2 = new Float32Array(9);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let count4 = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const sx = Math.min(width - 1, Math.max(0, x + dx)), sy = Math.min(height - 1, Math.max(0, y + dy));
      window2[count4++] = data[sy * width + sx];
    }
    window2.sort();
    out.data[y * width + x] = window2[4];
  }
  return out;
}
function boxBlur3(image) {
  const { width, height, data } = image;
  const out = createGray(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += data[Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))];
    out.data[y * width + x] = sum / 9;
  }
  return out;
}
function unsharpMask(image, amount = 0.6) {
  const blurred = boxBlur3(image);
  const out = createGray(image.width, image.height);
  for (let index2 = 0; index2 < image.data.length; index2++) out.data[index2] = Math.max(0, Math.min(255, image.data[index2] + amount * (image.data[index2] - blurred.data[index2])));
  return out;
}

// shared/imaging/geometry.ts
function inkPoints(image, options = {}) {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  let total = 0;
  for (let index2 = 0; index2 < flat.data.length; index2++) if (flat.data[index2] < threshold) total++;
  const { width, height } = flat;
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += flat.data[y * width + x] < threshold ? 1 : 0;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(6, Math.round(Math.max(width, height) / 70));
  const density = (x, y) => {
    const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1), y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    return (integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const step = Math.max(1, Math.ceil(total / (options.maxPoints ?? 6e4)));
  const xs = new Float32Array(Math.ceil(total / step) + 1), ys = new Float32Array(xs.length);
  let seen = 0, count4 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (flat.data[y * width + x] >= threshold) continue;
    if (seen++ % step !== 0) continue;
    if (options.textOnly && density(x, y) > 0.35) continue;
    xs[count4] = x;
    ys[count4] = y;
    count4++;
  }
  return { xs, ys, count: count4, ratio: total / flat.data.length };
}
function projectionPeakiness(values, count4, bins, offset, shear, shearFactor) {
  const histogram = new Float64Array(bins);
  for (let index2 = 0; index2 < count4; index2++) {
    const bin = Math.round(values[index2] - (shear ? shear[index2] * shearFactor : 0)) + offset;
    if (bin >= 0 && bin < bins) histogram[bin]++;
  }
  let sumSq = 0;
  for (let bin = 0; bin < bins; bin++) sumSq += histogram[bin] * histogram[bin];
  return sumSq / (count4 * count4 / bins);
}
function estimateSkew(image, options = {}) {
  const work = limitSize(image, 900);
  const points = inkPoints(work, { textOnly: true });
  if (points.count < 200 || points.ratio > 0.45) return { angle: 0, confidence: 0 };
  const maxAngle = options.maxAngle ?? 8, step = options.step ?? 0.25;
  const margin = Math.ceil(work.width * Math.tan(maxAngle * Math.PI / 180)) + 2;
  const bins = work.height + 2 * margin;
  const scores = [];
  for (let angle = -maxAngle; angle <= maxAngle + 1e-9; angle += step) {
    scores.push({ angle, score: projectionPeakiness(points.ys, points.count, bins, margin, points.xs, Math.tan(angle * Math.PI / 180)) });
  }
  const best = scores.reduce((a, b) => b.score > a.score ? b : a);
  const sorted = scores.map((item) => item.score).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const confidence = Math.max(0, Math.min(1, (best.score / Math.max(1e-9, median) - 1) / 0.6));
  return { angle: Math.round(best.angle * 100) / 100, confidence: Math.round(confidence * 100) / 100 };
}
function detectOrientation(image) {
  const work = limitSize(image, 900);
  const points = inkPoints(work);
  if (points.count < 200) return { sideways: false, confidence: 0, horizontalScore: 1, verticalScore: 1 };
  const best = (values, other, length, otherLength) => {
    let top = 0;
    for (let angle = -6; angle <= 6; angle += 1) {
      const margin = Math.ceil(otherLength * Math.tan(6 * Math.PI / 180)) + 2;
      top = Math.max(top, projectionPeakiness(values, points.count, length + 2 * margin, margin, other, Math.tan(angle * Math.PI / 180)));
    }
    return top;
  };
  const horizontalScore = best(points.ys, points.xs, work.height, work.width);
  const verticalScore = best(points.xs, points.ys, work.width, work.height);
  const ratio = verticalScore / Math.max(1e-9, horizontalScore);
  return { sideways: ratio > 1.25, confidence: Math.max(0, Math.min(1, Math.abs(Math.log(ratio)) / Math.log(2))), horizontalScore, verticalScore };
}
var quadArea = (quad) => {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let area = 0;
  for (let index2 = 0; index2 < 4; index2++) {
    const a = points[index2], b = points[(index2 + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
};
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function perspectiveDistortionOf(quad) {
  const top = distance(quad.topLeft, quad.topRight), bottom = distance(quad.bottomLeft, quad.bottomRight);
  const left = distance(quad.topLeft, quad.bottomLeft), right = distance(quad.topRight, quad.bottomRight);
  const horizontal = 1 - Math.min(top, bottom) / Math.max(top, bottom, 1e-9);
  const vertical = 1 - Math.min(left, right) / Math.max(left, right, 1e-9);
  return Math.round(Math.min(1, (horizontal + vertical) * 2) * 100) / 100;
}
function detectDocument(image) {
  const work = limitSize(image, 320);
  const { width, height, data } = work;
  const scale = image.width / width;
  const threshold = otsuThreshold(work);
  const total = width * height;
  const label = new Int32Array(total).fill(-1);
  const stack = new Int32Array(total);
  let bestLabel = -1, bestCount = 0, current = 0;
  for (let start = 0; start < total; start++) {
    if (label[start] !== -1 || data[start] <= threshold) continue;
    let top2 = 0, count4 = 0;
    stack[top2++] = start;
    label[start] = current;
    while (top2) {
      const index2 = stack[--top2];
      count4++;
      const x = index2 % width, y = (index2 - x) / width;
      const neighbours = [x > 0 ? index2 - 1 : -1, x < width - 1 ? index2 + 1 : -1, y > 0 ? index2 - width : -1, y < height - 1 ? index2 + width : -1];
      for (const next of neighbours) if (next >= 0 && label[next] === -1 && data[next] > threshold) {
        label[next] = current;
        stack[top2++] = next;
      }
    }
    if (count4 > bestCount) {
      bestCount = count4;
      bestLabel = current;
    }
    current++;
  }
  const none = { quad: null, coverage: 1, confidence: 0, perspectiveDistortion: 0, touchesEdges: 0 };
  if (bestLabel < 0 || bestCount < total * 0.05) return none;
  const outside = new Uint8Array(total);
  let top = 0;
  const pushOutside = (index2) => {
    if (!outside[index2] && label[index2] !== bestLabel) {
      outside[index2] = 1;
      stack[top++] = index2;
    }
  };
  for (let x = 0; x < width; x++) {
    pushOutside(x);
    pushOutside((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushOutside(y * width);
    pushOutside(y * width + width - 1);
  }
  while (top) {
    const index2 = stack[--top];
    const x = index2 % width, y = (index2 - x) / width;
    if (x > 0) pushOutside(index2 - 1);
    if (x < width - 1) pushOutside(index2 + 1);
    if (y > 0) pushOutside(index2 - width);
    if (y < height - 1) pushOutside(index2 + width);
  }
  let filled = 0;
  let tl = { x: 0, y: 0, v: Infinity }, br = { x: 0, y: 0, v: -Infinity }, tr = { x: 0, y: 0, v: -Infinity }, bl = { x: 0, y: 0, v: Infinity };
  let touchLeft = false, touchRight = false, touchTop = false, touchBottom = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (outside[y * width + x]) continue;
    filled++;
    if (x === 0) touchLeft = true;
    if (x === width - 1) touchRight = true;
    if (y === 0) touchTop = true;
    if (y === height - 1) touchBottom = true;
    const sum = x + y, diff = x - y;
    if (sum < tl.v) tl = { x, y, v: sum };
    if (sum > br.v) br = { x, y, v: sum };
    if (diff > tr.v) tr = { x, y, v: diff };
    if (diff < bl.v) bl = { x, y, v: diff };
  }
  const quadSmall = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
  const area = quadArea(quadSmall);
  const coverage = Math.min(1, area / total);
  const rectangularity = area > 0 ? Math.min(1, filled / area) : 0;
  const touchesEdges = [touchLeft, touchRight, touchTop, touchBottom].filter(Boolean).length;
  const quad = {
    topLeft: { x: tl.x * scale, y: tl.y * scale },
    topRight: { x: (tr.x + 1) * scale, y: tr.y * scale },
    bottomRight: { x: (br.x + 1) * scale, y: (br.y + 1) * scale },
    bottomLeft: { x: bl.x * scale, y: (bl.y + 1) * scale }
  };
  let confidence = Math.max(0, (rectangularity - 0.8) / 0.18);
  if (coverage > 0.93 || coverage < 0.15) confidence = 0;
  confidence *= touchesEdges >= 3 ? 0.3 : touchesEdges === 2 ? 0.7 : 1;
  return { quad, coverage: Math.round(coverage * 100) / 100, confidence: Math.round(Math.min(1, confidence) * 100) / 100, perspectiveDistortion: perspectiveDistortionOf(quad), touchesEdges };
}
function solveHomography(from, to) {
  const matrix = [];
  for (let index2 = 0; index2 < 4; index2++) {
    const { x, y } = from[index2], { x: u, y: v } = to[index2];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error("degenerate quad");
    for (let k = column; k < 9; k++) matrix[column][k] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let k = column; k < 9; k++) matrix[row][k] -= factor * matrix[column][k];
    }
  }
  return [...matrix.map((row) => row[8]), 1];
}
function warpPerspective(image, quad, maxDimension = 2600) {
  const widthTop = distance(quad.topLeft, quad.topRight), widthBottom = distance(quad.bottomLeft, quad.bottomRight);
  const heightLeft = distance(quad.topLeft, quad.bottomLeft), heightRight = distance(quad.topRight, quad.bottomRight);
  let outWidth = Math.max(widthTop, widthBottom), outHeight = Math.max(heightLeft, heightRight);
  const scale = Math.min(1, maxDimension / Math.max(outWidth, outHeight));
  outWidth = Math.max(1, Math.round(outWidth * scale));
  outHeight = Math.max(1, Math.round(outHeight * scale));
  const h = solveHomography(
    [{ x: 0, y: 0 }, { x: outWidth - 1, y: 0 }, { x: outWidth - 1, y: outHeight - 1 }, { x: 0, y: outHeight - 1 }],
    [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  );
  const out = createGray(outWidth, outHeight);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const w = h[6] * x + h[7] * y + h[8];
    out.data[y * outWidth + x] = sample(image, (h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, 255);
  }
  return out;
}

// shared/imaging/pipeline.ts
var preprocessingConfig = {
  /** Kalite seviyesine göre en fazla okuma geçişi (ilk dalga + ikinci dalga). */
  passBudget: { GOOD: 2, ACCEPTABLE: 4, POOR: 6 },
  perspective: { minConfidence: 0.7, maxCoverage: 0.9 },
  deskew: { minAngle: 0.5, minConfidence: 0.35, maxAngle: 8 },
  /** Satır yüksekliği bunun altındaysa büyüt (1.5x); yarısının altındaysa 2x. */
  upscaleBelowTextPx: 18,
  maxOutputDimension: 2600,
  /** Bu değerlerin üstü ilgili düzeltmeyi tetikler. */
  triggers: { illuminationShadow: 0.25, illuminationBrightness: 0.5, lowContrast: 0.55, denoiseNoise: 0.5, sharpenBlur: 0.3 }
};
function planPreprocessing(quality, config = preprocessingConfig) {
  const perspective = quality.documentConfidence >= config.perspective.minConfidence && quality.documentCoverage <= config.perspective.maxCoverage && quality.documentQuad !== null;
  const sideways = quality.orientation === "sideways";
  const deskew = sideways || Math.abs(quality.skew) >= config.deskew.minAngle && quality.skewConfidence >= config.deskew.minConfidence;
  const geometry = [...perspective ? ["perspective"] : [], ...sideways ? ["rotate"] : [], ...deskew ? ["deskew"] : []];
  const photometric = ["grayscale"];
  if (quality.noise >= config.triggers.denoiseNoise) photometric.push("denoise");
  const needsIllumination = quality.shadow >= config.triggers.illuminationShadow || quality.brightness < config.triggers.illuminationBrightness || quality.glare > 0;
  if (needsIllumination) photometric.push("illumination");
  photometric.push(needsIllumination || quality.contrast < config.triggers.lowContrast ? "contrast" : "contrast_mild");
  const textHeight = quality.estimatedTextHeight;
  const upscale = textHeight !== null && textHeight < config.upscaleBelowTextPx ? textHeight < config.upscaleBelowTextPx / 2 ? 2 : 1.5 : 1;
  if (upscale > 1) photometric.push("upscale");
  if (quality.blur >= config.triggers.sharpenBlur || upscale > 1) photometric.push("sharpen");
  const rotation = sideways ? "auto" : 0;
  const variants = [{ id: "A_original", kind: "original", rotate: 0, steps: [], upscale: 1, wave: 1 }];
  if (sideways) {
    variants.push({ id: "B_enhanced_r90", kind: "enhanced", rotate: 90, steps: [...geometry, ...photometric], upscale, wave: 1 });
    variants.push({ id: "B_enhanced_r270", kind: "enhanced", rotate: 270, steps: [...geometry, ...photometric], upscale, wave: 1 });
  } else {
    variants.push({ id: "B_enhanced", kind: "enhanced", rotate: 0, steps: [...geometry, ...photometric], upscale, wave: 1 });
  }
  const binarizeBase = [...geometry, "grayscale", ...photometric.includes("denoise") ? ["denoise"] : [], "illumination", ...upscale > 1 ? ["upscale"] : []];
  variants.push({ id: "C_adaptive", kind: "adaptive", rotate: rotation, steps: [...binarizeBase, "sauvola"], upscale, wave: quality.level === "POOR" && !sideways ? 1 : 2 });
  variants.push({ id: "D_otsu", kind: "otsu", rotate: rotation, steps: [...binarizeBase, "otsu"], upscale, wave: 2 });
  if (geometry.length) variants.push({ id: "E_geometry_gray", kind: "geometry_gray", rotate: rotation, steps: [...geometry, "grayscale"], upscale: 1, wave: 2 });
  const budget = config.passBudget[quality.level] + (sideways ? 1 : 0);
  return { level: quality.level, variants: variants.slice(0, budget), geometry: { perspective, deskew, sideways } };
}
function renderVariant(source, spec, quality, rotation = spec.rotate === "auto" ? 0 : spec.rotate, config = preprocessingConfig) {
  let image = source;
  const applied = [];
  const has = (step) => spec.steps.includes(step);
  if (has("perspective") && quality.documentQuad) {
    try {
      image = warpPerspective(image, quality.documentQuad, config.maxOutputDimension);
      applied.push("perspective");
    } catch {
    }
  }
  if (rotation) {
    image = rotateQuarter(image, rotation);
    applied.push(`rotate${rotation}`);
  }
  if (has("deskew")) {
    const skew = estimateSkew(image, { maxAngle: config.deskew.maxAngle });
    if (Math.abs(skew.angle) >= config.deskew.minAngle && skew.confidence >= config.deskew.minConfidence) {
      image = rotateSmall(image, -skew.angle);
      applied.push(`deskew(${skew.angle}\xB0)`);
    }
  }
  if (has("grayscale")) applied.push("grayscale");
  if (has("denoise")) {
    image = median3(image);
    applied.push("denoise");
  }
  if (has("illumination")) {
    image = flattenIllumination(image);
    applied.push("illumination");
  }
  if (has("contrast")) {
    image = stretchContrast(image);
    applied.push("contrast");
  } else if (has("contrast_mild")) {
    image = stretchContrast(image, { lowPct: 5e-3, highPct: 0.97, knee: 0.95, gamma: 1.15 });
    applied.push("contrast_mild");
  }
  if (has("upscale") && spec.upscale > 1) {
    const factor = Math.min(spec.upscale, config.maxOutputDimension / Math.max(image.width, image.height));
    if (factor > 1.05) {
      image = resizeGray(image, image.width * factor, image.height * factor);
      applied.push(`upscale(${Math.round(factor * 10) / 10}x)`);
    }
  }
  if (has("sharpen")) {
    image = unsharpMask(image, 0.5);
    applied.push("sharpen");
  }
  if (has("sauvola")) {
    image = binarizeSauvola(image);
    applied.push("sauvola");
  }
  if (has("otsu")) {
    image = binarizeGlobal(image, otsuThreshold(image));
    applied.push("otsu");
  }
  return { image: limitSize(image, config.maxOutputDimension), applied };
}

// shared/imaging/quality.ts
var qualityThresholds = {
  resolution: { goodLongSide: 1600, lowLongSide: 900 },
  blur: { warning: 0.45, critical: 0.75 },
  brightness: { dark: 0.3, veryDark: 0.18 },
  contrast: { low: 0.35, veryLow: 0.2 },
  shadow: { warning: 0.45, critical: 0.7 },
  glare: { warning: 0.04, critical: 0.12 },
  skew: { warning: 3, critical: 8 },
  perspective: { warning: 0.12, critical: 0.3 },
  noise: { warning: 0.5 },
  /** Bu satır yüksekliğinin altı "küçük yazı" (büyütme yararlı). */
  smallTextPx: 18
};
var clamp01 = (value) => Math.max(0, Math.min(1, value));
var round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
function blurScore(image) {
  const { width, height, data } = image;
  let sum = 0, sumSq = 0, count4 = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index2 = y * width + x;
    const laplacian = 4 * data[index2] - data[index2 - 1] - data[index2 + 1] - data[index2 - width] - data[index2 + width];
    sum += laplacian;
    sumSq += laplacian * laplacian;
    count4++;
  }
  const variance = sumSq / Math.max(1, count4) - (sum / Math.max(1, count4)) ** 2;
  return clamp01((Math.log(600) - Math.log(Math.max(1, variance))) / (Math.log(600) - Math.log(30)));
}
function noiseScore(image) {
  const filtered = median3(image);
  const diffs = new Float32Array(image.data.length);
  for (let index2 = 0; index2 < diffs.length; index2++) diffs[index2] = Math.abs(image.data[index2] - filtered.data[index2]);
  return clamp01(percentileOf(diffs, 0.5) / 6);
}
function textLineHeight(image) {
  const flat = flattenIllumination(image);
  const threshold = Math.min(200, otsuThreshold(flat));
  const rows = new Float32Array(flat.height);
  for (let y = 0; y < flat.height; y++) {
    let ink = 0;
    for (let x = 0; x < flat.width; x++) if (flat.data[y * flat.width + x] < threshold) ink++;
    rows[y] = ink / flat.width;
  }
  const runs = [];
  let run = 0;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] > 0.01) run++;
    else {
      if (run >= 2) runs.push(run);
      run = 0;
    }
  }
  if (run >= 2) runs.push(run);
  if (runs.length < 3) return null;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}
function analyzeImageQuality(image, thresholds = qualityThresholds) {
  const work = limitSize(image, 1e3);
  const scale = image.width / work.width;
  const longSide = Math.max(image.width, image.height);
  const document = detectDocument(image);
  const orientation = detectOrientation(work);
  const skew = orientation.sideways ? { angle: 0, confidence: 0 } : estimateSkew(work);
  const brightness = clamp01(percentileOf(work.data, 0.5) / 255);
  const contrast = clamp01((percentileOf(work.data, 0.98) - percentileOf(work.data, 0.02)) / 255);
  const background = estimateBackground(work);
  const cells = [];
  const inside = (gx, gy) => {
    if (!document.quad || document.confidence < 0.5) return true;
    const x = (gx + 0.5) * background.block * scale, y = (gy + 0.5) * background.block * scale;
    const q = document.quad;
    return x >= Math.max(q.topLeft.x, q.bottomLeft.x) && x <= Math.min(q.topRight.x, q.bottomRight.x) && y >= Math.max(q.topLeft.y, q.topRight.y) && y <= Math.min(q.bottomLeft.y, q.bottomRight.y);
  };
  for (let gy = 0; gy < background.gh; gy++) for (let gx = 0; gx < background.gw; gx++) if (inside(gx, gy)) cells.push(background.grid[gy * background.gw + gx]);
  cells.sort((a, b) => a - b);
  const bgLow = cells[Math.floor(cells.length * 0.1)] ?? 255, bgHigh = cells[Math.floor(cells.length * 0.9)] ?? 255, bgMedian = cells[Math.floor(cells.length / 2)] ?? 255;
  const shadow = clamp01(1 - bgLow / Math.max(1, bgHigh));
  const glare = cells.length ? cells.filter((value) => value >= 250 && value >= bgMedian + 18).length / cells.length : 0;
  const blur = blurScore(work);
  const noise = noiseScore(work);
  const lineHeight = orientation.sideways ? null : textLineHeight(work);
  const estimatedTextHeight = lineHeight === null ? null : Math.round(lineHeight * scale);
  const issues = [];
  const add = (code, severity, message) => issues.push({ code, severity, message });
  if (longSide < thresholds.resolution.lowLongSide) add("low_resolution", "critical", "Foto\u011Fraf\u0131n \xE7\xF6z\xFCn\xFCrl\xFC\u011F\xFC \xE7ok d\xFC\u015F\xFCk. Sayfaya biraz daha yakla\u015F\u0131p tekrar \xE7eker misin?");
  else if (longSide < thresholds.resolution.goodLongSide) add("low_resolution", "warning", "Foto\u011Fraf\u0131n \xE7\xF6z\xFCn\xFCrl\xFC\u011F\xFC d\xFC\u015F\xFCk; k\xFC\xE7\xFCk yaz\u0131lar zor okunabilir.");
  if (blur >= thresholds.blur.critical) add("blurry", "critical", "Foto\u011Fraf bulan\u0131k. Telefonu sabit tutup netle\u015Fmesini bekleyerek tekrar \xE7eker misin?");
  else if (blur >= thresholds.blur.warning) add("blurry", "warning", "Foto\u011Fraf biraz bulan\u0131k.");
  if (brightness < thresholds.brightness.veryDark) add("dark", "critical", "Sayfa \xE7ok karanl\u0131k. Daha ayd\u0131nl\u0131k bir yerde \xE7eker misin?");
  else if (brightness < thresholds.brightness.dark) add("dark", "warning", "Sayfa yeterince ayd\u0131nl\u0131k de\u011Fil.");
  if (contrast < thresholds.contrast.veryLow) add("low_contrast", "critical", "Yaz\u0131lar zeminden ay\u0131rt edilemiyor (kontrast \xE7ok d\xFC\u015F\xFCk).");
  else if (contrast < thresholds.contrast.low) add("low_contrast", "warning", "Kontrast d\xFC\u015F\xFCk; yaz\u0131lar soluk g\xF6r\xFCn\xFCyor.");
  if (shadow >= thresholds.shadow.critical) add("shadow", "critical", "Sayfada yo\u011Fun g\xF6lge var. I\u015F\u0131\u011F\u0131 sayfan\u0131n kar\u015F\u0131s\u0131na al\u0131p tekrar \xE7eker misin?");
  else if (shadow >= thresholds.shadow.warning) add("shadow", "warning", "Sayfan\u0131n bir k\u0131sm\u0131 g\xF6lgede.");
  if (glare >= thresholds.glare.critical) add("glare", "critical", "Foto\u011Frafta parlama var. Sayfay\u0131 biraz farkl\u0131 a\xE7\u0131dan \xE7ekmen daha iyi sonu\xE7 verebilir.");
  else if (glare >= thresholds.glare.warning) add("glare", "warning", "Foto\u011Frafta hafif parlama var.");
  if (orientation.sideways) add("sideways", "info", "Foto\u011Fraf yan \xE7ekilmi\u015F g\xF6r\xFCn\xFCyor; otomatik d\xF6nd\xFCr\xFClecek.");
  if (Math.abs(skew.angle) >= thresholds.skew.critical && skew.confidence > 0.3) add("skewed", "warning", "Sayfa \xE7ok e\u011Fik g\xF6r\xFCn\xFCyor.");
  else if (Math.abs(skew.angle) >= thresholds.skew.warning && skew.confidence > 0.2) add("skewed", "info", "Sayfa biraz e\u011Fik; otomatik d\xFCzeltilecek.");
  if (document.confidence >= 0.7 && document.perspectiveDistortion >= thresholds.perspective.critical) add("perspective", "warning", "Sayfa yandan \xE7ekilmi\u015F; telefonu sayfaya paralel tutarsan daha iyi okunur.");
  if (document.confidence >= 0.5 && document.touchesEdges >= 2 && document.coverage > 0.6) add("partial_page", "warning", "Sayfan\u0131n bir k\u0131sm\u0131 kadraj d\u0131\u015F\u0131nda olabilir.");
  if (noise >= thresholds.noise.warning) add("noisy", "info", "Foto\u011Frafta gren (g\xFCr\xFClt\xFC) var.");
  if (estimatedTextHeight !== null && estimatedTextHeight < thresholds.smallTextPx) add("small_text", "info", "Yaz\u0131lar k\xFC\xE7\xFCk; b\xFCy\xFCt\xFClerek okunacak.");
  const criticals = issues.filter((issue) => issue.severity === "critical").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const level = criticals > 0 || warnings >= 3 ? "POOR" : warnings > 0 ? "ACCEPTABLE" : "GOOD";
  const score = clamp01(1 - 0.28 * criticals - 0.1 * warnings - 0.25 * Math.max(0, blur - 0.4) - 0.5 * glare);
  return {
    width: image.width,
    height: image.height,
    megapixels: round(image.width * image.height / 1e6),
    resolution: longSide >= thresholds.resolution.goodLongSide ? "good" : longSide >= thresholds.resolution.lowLongSide ? "low" : "very_low",
    brightness: round(brightness),
    contrast: round(contrast),
    blur: round(blur),
    noise: round(noise),
    shadow: round(shadow),
    glare: round(glare, 3),
    skew: skew.angle,
    skewConfidence: skew.confidence,
    perspective: document.perspectiveDistortion,
    documentCoverage: document.coverage,
    documentConfidence: document.confidence,
    documentQuad: document.quad,
    orientation: orientation.sideways ? "sideways" : "upright",
    orientationConfidence: round(orientation.confidence),
    estimatedTextHeight,
    level,
    score: round(score),
    issues
  };
}

// server/bookContent/ocrOrchestrator.ts
init_turkishText();

// server/bookContent/imageCodec.ts
import jpeg from "jpeg-js";
var ocrCodecLimits = { maxResolutionInMP: 16, maxMemoryUsageInMB: 512 };
function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}
function decodeJpegToGray(buffer) {
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: ocrCodecLimits.maxResolutionInMP, maxMemoryUsageInMB: ocrCodecLimits.maxMemoryUsageInMB });
  return toGray({ width: decoded.width, height: decoded.height, data: decoded.data });
}
function encodeGrayToJpegDataUrl(image, quality = 85) {
  const encoded = jpeg.encode({ width: image.width, height: image.height, data: Buffer.from(grayToRgba(image).buffer) }, quality);
  return `data:image/jpeg;base64,${Buffer.from(encoded.data).toString("base64")}`;
}

// server/bookContent/ocrConsensus.ts
init_turkishText();
var ocrScoringConfig = {
  weights: {
    ocrConfidence: 0.2,
    completeness: 0.2,
    language: 0.1,
    structure: 0.15,
    numberConsistency: 0.15,
    layout: 0.05,
    agreement: 0.15
  },
  /** İki satırın "aynı satır" sayılması için etiket+başlık benzerliği (normalize). */
  matchSimilarity: 0.8,
  /** Bu güvenin altındaki satır öğrenciye "kontrol et" diye gösterilir. */
  needsReviewBelow: 0.7,
  /** Tek okuma varsa (doğrulanamaz) satır güveni bu katsayıyla düşürülür. */
  singlePassPenalty: 0.85,
  /** İlk dalganın uzlaşısı bunun üstündeyse ikinci dalga çalıştırılmaz (maliyet). */
  earlyStopAgreement: 0.85,
  earlyStopScore: 0.8
};
var clamp012 = (value) => Math.max(0, Math.min(1, value));
var mean = (values, fallback = 0) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
var entriesOf = (page2) => page2.items.filter((item) => item.type === "entry");
var lineText = (item) => `${item.label ?? ""} ${item.title}`.trim();
function itemsMatch(a, b, config = ocrScoringConfig) {
  if (a.type !== b.type) return false;
  if (a.type === "unit" && a.unitNumber !== null && a.unitNumber === b.unitNumber) return true;
  return textSimilarity(lineText(a), lineText(b)) >= config.matchSimilarity;
}
function structureScore(page2) {
  const entries = entriesOf(page2);
  if (!entries.length) return 0;
  const usable = entries.filter((item) => (item.label || item.title) && item.page !== null).length / entries.length;
  const units = page2.items.filter((item) => item.type === "unit" && item.unitNumber !== null).map((item) => item.unitNumber);
  let unitBreaks = 0;
  for (let index2 = 1; index2 < units.length; index2++) if (units[index2] !== units[index2 - 1] + 1) unitBreaks++;
  let testPairs = 0, testBreaks = 0, lastTest = null;
  for (const item of page2.items) {
    if (item.type === "unit") {
      lastTest = null;
      continue;
    }
    const match = item.type === "entry" ? /^test\s*(\d+)/.exec(normalizeForComparison(item.label ?? "")) : null;
    if (!match) continue;
    const number = Number(match[1]);
    if (lastTest !== null) {
      testPairs++;
      if (number !== lastTest + 1 && number !== 1) testBreaks++;
    }
    lastTest = number;
  }
  const sequence = 1 - (unitBreaks + testBreaks) / Math.max(1, units.length - 1 + testPairs);
  return clamp012(0.6 * usable + 0.4 * sequence);
}
function numberConsistency(page2) {
  const entries = entriesOf(page2);
  if (!entries.length) return 0;
  const withPage = entries.filter((item) => item.page !== null);
  let decreasing = 0;
  for (let index2 = 1; index2 < withPage.length; index2++) if (withPage[index2].page < withPage[index2 - 1].page) decreasing++;
  return clamp012(withPage.length / entries.length * (1 - decreasing / Math.max(1, withPage.length - 1)));
}
function languageScore(page2) {
  const texts = page2.items.map((item) => item.title).filter((title) => title.trim());
  return mean(texts.map(turkishPlausibility), 0);
}
function layoutScore(page2) {
  if (!page2.items.length) return 0;
  if (page2.pageKind === "table_of_contents" || page2.pageKind === void 0) return 1;
  return entriesOf(page2).filter((item) => item.page !== null).length >= 3 ? 0.7 : 0.2;
}
function agreementScores(passes, config) {
  return passes.map((pass, index2) => {
    const others = passes.filter((_, other) => other !== index2);
    if (!others.length) return 0.5;
    const entries = pass.page.items;
    if (!entries.length) return 0;
    return mean(entries.map((item) => others.filter((other) => other.page.items.some((candidate) => itemsMatch(item, candidate, config))).length / others.length));
  });
}
function scorePasses(passes, config = ocrScoringConfig) {
  const maxEntries = Math.max(1, ...passes.map((pass) => entriesOf(pass.page).length));
  const agreement = agreementScores(passes, config);
  return passes.map((pass, index2) => {
    const breakdown = {
      ocrConfidence: mean(pass.page.items.map((item) => item.confidence ?? 0.7), 0),
      completeness: entriesOf(pass.page).length / maxEntries,
      language: languageScore(pass.page),
      structure: structureScore(pass.page),
      numberConsistency: numberConsistency(pass.page),
      layout: layoutScore(pass.page),
      agreement: agreement[index2]
    };
    const total = Object.keys(config.weights).reduce((sum, key) => sum + config.weights[key] * breakdown[key], 0);
    return { variantId: pass.variantId, total: Math.round(total * 1e3) / 1e3, breakdown, entries: entriesOf(pass.page).length };
  });
}
function voteText(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || turkishCharCount(b[0]) - turkishCharCount(a[0]));
  const normalizedTop = normalizeForComparison(ranked[0][0]);
  const agreeing = values.filter((value) => normalizeForComparison(value) === normalizedTop).length;
  return { value: ranked[0][0], agreement: agreeing / values.length };
}
function buildConsensus(passes, scores, config = ocrScoringConfig) {
  const order = scores.map((score, index2) => ({ score, index: index2 })).sort((a, b) => b.score.total - a.score.total);
  const backbone = passes[order[0].index];
  const others = passes.filter((pass) => pass !== backbone && pass.page.items.length > 0);
  const passCount = 1 + others.length;
  const used = others.map(() => /* @__PURE__ */ new Set());
  const merged = backbone.page.items.map((item) => {
    const matches = [];
    others.forEach((other, otherIndex) => {
      let bestIndex = -1, bestSimilarity = 0;
      other.page.items.forEach((candidate, candidateIndex) => {
        if (used[otherIndex].has(candidateIndex) || !itemsMatch(item, candidate, config)) return;
        const similarity2 = textSimilarity(lineText(item), lineText(candidate));
        if (similarity2 > bestSimilarity) {
          bestSimilarity = similarity2;
          bestIndex = candidateIndex;
        }
      });
      if (bestIndex >= 0) {
        used[otherIndex].add(bestIndex);
        matches.push(other.page.items[bestIndex]);
      }
    });
    const group = [item, ...matches];
    const support = group.length / passCount;
    const title = voteText(group.map((member) => member.title));
    const label = item.label === null && matches.every((member) => member.label === null) ? { value: null, agreement: 1 } : voteText(group.map((member) => member.label ?? ""));
    const pages2 = group.map((member) => member.page).filter((page2) => page2 !== null);
    const pageVotes = /* @__PURE__ */ new Map();
    for (const page2 of pages2) pageVotes.set(page2, (pageVotes.get(page2) ?? 0) + 1);
    const topPage = Array.from(pageVotes.entries()).sort((a, b) => b[1] - a[1] || (a[0] === item.page ? -1 : b[0] === item.page ? 1 : 0))[0];
    const pageAgreement = topPage ? topPage[1] / group.length : 0;
    const selfConfidence = mean(group.map((member) => member.confidence ?? 0.7));
    const confidence = clamp012(passCount === 1 ? selfConfidence * config.singlePassPenalty : selfConfidence * (0.45 + 0.55 * support) * (0.7 + 0.3 * title.agreement));
    const pageFlag = item.type === "entry" && (topPage === void 0 || pageAgreement < 0.5 || passCount > 1 && pageVotes.size > 1 || group.some((member) => member.review?.page && member.page === (topPage?.[0] ?? null)));
    return {
      ...item,
      title: title.value,
      label: label.value === "" ? null : label.value,
      page: topPage ? topPage[0] : null,
      pageText: group.find((member) => member.page === (topPage?.[0] ?? null))?.pageText ?? item.pageText ?? null,
      confidence: Math.round(confidence * 100) / 100,
      support: Math.round(support * 100) / 100,
      review: { title: confidence < config.needsReviewBelow || title.agreement < 0.5, page: Boolean(pageFlag) }
    };
  });
  const majority = Math.ceil(passCount / 2);
  others.forEach((other, otherIndex) => {
    other.page.items.forEach((item, itemIndex) => {
      if (used[otherIndex].has(itemIndex)) return;
      const seenIn = 1 + others.filter((third, thirdIndex) => thirdIndex !== otherIndex && third.page.items.some((candidate, candidateIndex) => !used[thirdIndex].has(candidateIndex) && itemsMatch(item, candidate, config))).length;
      if (seenIn < majority || passCount < 3 || merged.some((existing) => itemsMatch(existing, item, config))) return;
      const previous = other.page.items[itemIndex - 1];
      const anchor = previous ? merged.findIndex((existing) => itemsMatch(existing, previous, config)) : -1;
      const support = seenIn / passCount;
      merged.splice(anchor + 1, 0, { ...item, confidence: Math.round(clamp012((item.confidence ?? 0.7) * support) * 100) / 100, support: Math.round(support * 100) / 100, review: { title: true, page: item.type === "entry" } });
    });
  });
  const agreement = mean(merged.map((item) => item.support ?? 0), 0);
  return { page: { ...backbone.page, items: merged }, backboneVariant: backbone.variantId, agreement: Math.round(agreement * 100) / 100, passCount };
}

// server/bookContent/tocParser.ts
init_turkishText();
function pageIssues(page2) {
  const issues = [];
  const entries = page2.items.filter((item) => item.type === "entry");
  const missing = entries.filter((item) => item.page === null).map((item) => `${item.label ?? ""} ${item.title}`.trim());
  if (missing.length) issues.push(`\u015Eu sat\u0131rlar\u0131n sayfa numaras\u0131 okunamad\u0131: ${missing.slice(0, 6).join("; ")}`);
  let previous = null;
  for (const item of entries) {
    if (item.page === null) continue;
    if (previous && previous.page !== null && item.page < previous.page) issues.push(`"${previous.label ?? previous.title}" (${previous.page}) sat\u0131r\u0131ndan sonra "${item.label ?? item.title}" (${item.page}) geliyor; sayfa numaralar\u0131 artmal\u0131.`);
    previous = item;
  }
  return issues;
}
function looksLikeTopicList(page2) {
  return page2.items.filter((item) => item.type === "entry" && item.page !== null && item.title.trim()).length >= 3;
}
var UNIT_ONLY = /^\d+\s*\.?\s*unite$/;
function classify(label, title) {
  if (label && /^\d+\s*[.)]?$/.test(label.trim())) return { contentType: "topic", testNumber: null };
  const text4 = normalizeForComparison(`${label ?? ""} ${label ? "" : title}`);
  const lastNumber = (() => {
    const all = text4.match(/\d+/g);
    return all ? Number(all[all.length - 1]) : null;
  })();
  const testMatch = text4.match(/^test\s*(\d+)/);
  if (testMatch) return { contentType: "topic_test", testNumber: Number(testMatch[1]) };
  if (text4.includes("egitim kontrol") || text4.startsWith("osym")) return { contentType: "osym_type", testNumber: lastNumber };
  if (text4.includes("sarmal") || text4.includes("karma") || text4.includes("genel tekrar")) return { contentType: "review", testNumber: lastNumber };
  if (text4.includes("simulasyon") || text4.includes("deneme")) return { contentType: "simulation", testNumber: lastNumber };
  return { contentType: label ? "topic_test" : "topic", testNumber: lastNumber };
}
var cleanTitle = (value) => value.replace(/\s+/g, " ").replace(/^[\s\-–—:.]+|[\s\-–—:.]+$/g, "").trim();
function parseTableOfContents(pages2) {
  const warnings = [];
  const entries = [];
  let unitNumber = null;
  let unitTitle = "";
  let awaitingUnitTitle = false;
  for (const page2 of pages2) {
    for (const item of page2.items) {
      const title = cleanTitle(item.title ?? "");
      if (item.type === "unit") {
        unitNumber = item.unitNumber;
        const normalized = normalizeForComparison(title);
        awaitingUnitTitle = !title || UNIT_ONLY.test(normalized);
        unitTitle = awaitingUnitTitle ? "" : title;
        continue;
      }
      if (item.type === "section") {
        const unitHasEntries = entries.some((entry) => entry.unitNumber === unitNumber && entry.unitTitle === unitTitle);
        if (awaitingUnitTitle) {
          unitTitle = title;
          awaitingUnitTitle = false;
        } else if (unitNumber !== null && !unitHasEntries) {
          unitTitle = unitTitle ? `${unitTitle} ${title}` : title;
        } else {
          unitNumber = null;
          unitTitle = title;
        }
        continue;
      }
      awaitingUnitTitle = false;
      const label = cleanTitle(item.label ?? "");
      const { contentType, testNumber } = classify(label || null, title);
      const isMixed = contentType === "review" || contentType === "simulation";
      entries.push({
        order: entries.length + 1,
        unitNumber,
        unitTitle,
        contentType,
        label: label || title,
        testNumber,
        title,
        pageStart: item.page ?? null,
        pageEnd: null,
        // Konu testi kendi başlığıyla, ÖSYM tipi/başlıksız satır ünite adıyla eşlenir.
        // Konu listesi satırı da kendi başlığıyla eşlenir ("KİTAP BİTİRME PLANI" gibi bir sayfa başlığıyla değil).
        matchText: isMixed ? null : (contentType === "topic_test" || contentType === "topic") && title ? title : unitTitle || title || null,
        readConfidence: typeof item.confidence === "number" ? item.confidence : null,
        review: { title: Boolean(item.review?.title), page: Boolean(item.review?.page) }
      });
    }
  }
  for (let index2 = 0; index2 < entries.length; index2++) {
    const entry = entries[index2];
    if (entry.pageStart === null) {
      warnings.push(`"${entry.unitTitle} \u2014 ${entry.label}" sat\u0131r\u0131nda sayfa numaras\u0131 okunamad\u0131.`);
      continue;
    }
    const next = entries.slice(index2 + 1).find((candidate) => candidate.pageStart !== null);
    if (!next) continue;
    if (next.pageStart < entry.pageStart) {
      warnings.push(`Sayfa s\u0131ras\u0131 tutars\u0131z: "${entry.label}" (${entry.pageStart}) sonras\u0131nda "${next.label}" (${next.pageStart}) geliyor. Foto\u011Fraf\u0131 d\xFCz ve net \xE7ekip tekrar dener misin?`);
      continue;
    }
    entry.pageEnd = Math.max(entry.pageStart, next.pageStart - 1);
  }
  return { entries, warnings };
}

// server/bookContent/ocrOrchestrator.ts
var ocrOrchestratorConfig = {
  /** Tek bir fotoğraf için toplam süre bütçesi (istek bütçesi 150 sn; okuma güçlü modelle yapılır). */
  timeBudgetMs: 14e4,
  /** Tek bir okuma geçişinin zaman aşımı (güçlü model yoğun bir sayfada 30 sn'yi aşabilir). */
  passTimeoutMs: 7e4,
  /** Yeni bir dalga başlatmak için kalması gereken en az süre. */
  minRemainingForWaveMs: 35e3,
  maxWorkingDimension: 2400,
  jpegQuality: 85,
  /** Düzeltme okuması (sayfa numarası tutarsızlığı ipucuyla) yapılsın mı. */
  correctiveReread: true
};
var PassTimeoutError = class extends Error {
};
var withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new PassTimeoutError(`timeout after ${ms}ms`)), ms);
  promise.then((value) => {
    clearTimeout(timer);
    resolve(value);
  }, (error) => {
    clearTimeout(timer);
    reject(error);
  });
});
var isPermanent = (error) => error instanceof LlmUnavailableError && error.reason !== "provider";
function debugDir() {
  if (ENV.isProduction || process.env.OCR_DEBUG !== "1") return null;
  const dir = path.join(process.cwd(), ".ocr-debug", (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
async function readTocImage(dataUrl, options) {
  const config = options.config ?? ocrOrchestratorConfig;
  const scoring = options.scoring ?? ocrScoringConfig;
  const started = Date.now();
  const deadline = Math.min(options.deadline ?? Infinity, started + config.timeBudgetMs);
  const notes2 = [];
  const debug = debugDir();
  let gray = null;
  let quality = null;
  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mimeType === "image/jpeg") {
    try {
      gray = limitSize(decodeJpegToGray(parsed.buffer), config.maxWorkingDimension);
      quality = analyzeImageQuality(gray);
    } catch (error) {
      notes2.push("G\xF6r\xFCnt\xFC \xE7\xF6z\xFClemedi; \xF6n i\u015Fleme yap\u0131lmadan okundu.");
      console.warn("[OCR] decode failed:", error instanceof Error ? error.message : error);
    }
  }
  const fullPlan = quality ? planPreprocessing(quality) : { level: "ACCEPTABLE", variants: [{ id: "A_original", kind: "original", rotate: 0, steps: [], upscale: 1, wave: 1 }], geometry: { perspective: false, deskew: false, sideways: false } };
  const plan = options.maxPasses ? { ...fullPlan, variants: fullPlan.variants.slice(0, Math.max(options.maxPasses, fullPlan.variants.filter((variant) => variant.wave === 1).length)) } : fullPlan;
  const passes = [];
  const reports = [];
  let chosenRotation = 0;
  let lastError = null;
  const runVariants = async (variants) => {
    await Promise.all(variants.map(async (spec) => {
      const rotation = spec.rotate === "auto" ? chosenRotation : spec.rotate;
      const passStart = Date.now();
      let url = dataUrl, applied = [];
      try {
        if (spec.kind !== "original" && gray && quality) {
          const rendered = renderVariant(gray, spec, quality, rotation);
          applied = rendered.applied;
          url = encodeGrayToJpegDataUrl(rendered.image, config.jpegQuality);
          if (debug) fs.writeFileSync(path.join(debug, `${spec.id}.jpg`), Buffer.from(url.split(",")[1], "base64"));
        }
        const remaining = deadline - Date.now();
        if (remaining < 3e3) {
          reports.push({ variantId: spec.id, applied, rotation, status: "skipped", elapsedMs: 0 });
          return;
        }
        const page2 = await withTimeout(options.provider.extractTableOfContentsPage(url), Math.min(config.passTimeoutMs, remaining));
        passes.push({ variantId: spec.id, page: page2, applied, rotation, elapsedMs: Date.now() - passStart });
        reports.push({ variantId: spec.id, applied, rotation, status: "ok", elapsedMs: Date.now() - passStart });
      } catch (error) {
        if (isPermanent(error)) throw error;
        lastError = error;
        reports.push({ variantId: spec.id, applied, rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - passStart, error: error instanceof Error ? error.message.slice(0, 160) : "error" });
      }
    }));
  };
  const waveOne = plan.variants.filter((variant) => variant.wave === 1);
  await runVariants(waveOne);
  let waves = 1;
  let scores = scorePasses(passes, scoring);
  if (plan.geometry.sideways) {
    const byRotation = (rotation) => Math.max(0, ...scores.filter((score, index2) => passes[index2].rotation === rotation).map((score) => score.total));
    chosenRotation = byRotation(270) > byRotation(90) ? 270 : 90;
    notes2.push(`Foto\u011Fraf yan \xE7ekilmi\u015F; ${chosenRotation}\xB0 d\xF6nd\xFCr\xFClerek okundu.`);
  }
  const waveTwo = plan.variants.filter((variant) => variant.wave === 2);
  if (waveTwo.length && passes.length) {
    const consensus2 = buildConsensus(passes, scores, scoring);
    const best = Math.max(...scores.map((score) => score.total));
    const confident = passes.length >= 2 && consensus2.agreement >= scoring.earlyStopAgreement && best >= scoring.earlyStopScore;
    if (confident) notes2.push("\u0130lk okumalar birbirini do\u011Frulad\u0131; ek okuma gerekmedi.");
    else if (deadline - Date.now() >= config.minRemainingForWaveMs) {
      await runVariants(waveTwo);
      waves = 2;
      scores = scorePasses(passes, scoring);
    } else waveTwo.forEach((variant) => reports.push({ variantId: variant.id, applied: [], rotation: chosenRotation, status: "skipped", elapsedMs: 0 }));
  } else if (waveTwo.length && !passes.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    await runVariants(waveTwo);
    waves = 2;
    scores = scorePasses(passes, scoring);
  }
  if (!passes.length) throw lastError instanceof Error ? lastError : new Error("OCR okumas\u0131 ba\u015Far\u0131s\u0131z oldu");
  let consensus = buildConsensus(passes, scores, scoring);
  const issues = pageIssues(consensus.page);
  if (config.correctiveReread && issues.length && deadline - Date.now() >= config.minRemainingForWaveMs) {
    const backbone = passes.find((pass) => pass.variantId === consensus.backboneVariant);
    const spec = plan.variants.find((variant) => variant.id === backbone.variantId);
    const url = spec.kind === "original" || !gray || !quality ? dataUrl : encodeGrayToJpegDataUrl(renderVariant(gray, spec, quality, backbone.rotation).image, config.jpegQuality);
    const rereadStart = Date.now();
    try {
      const page2 = await withTimeout(options.provider.extractTableOfContentsPage(url, { previous: consensus.page, issues }), Math.min(config.passTimeoutMs, deadline - Date.now()));
      passes.push({ variantId: `${backbone.variantId}_reread`, page: page2, applied: backbone.applied, rotation: backbone.rotation, elapsedMs: Date.now() - rereadStart });
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: "ok", elapsedMs: Date.now() - rereadStart });
      scores = scorePasses(passes, scoring);
      const rebuilt = buildConsensus(passes, scores, scoring);
      if (pageIssues(rebuilt.page).length < issues.length) {
        consensus = rebuilt;
        notes2.push("Sayfa numaras\u0131 tutars\u0131zl\u0131\u011F\u0131 yeniden okunarak d\xFCzeltildi.");
      }
    } catch (error) {
      if (isPermanent(error)) throw error;
      reports.push({ variantId: `${backbone.variantId}_reread`, applied: backbone.applied, rotation: backbone.rotation, status: error instanceof PassTimeoutError ? "timeout" : "failed", elapsedMs: Date.now() - rereadStart });
    }
  }
  for (const report of reports) {
    const index2 = passes.findIndex((pass) => pass.variantId === report.variantId);
    if (index2 >= 0) Object.assign(report, { score: scores[index2].total, breakdown: scores[index2].breakdown, entries: scores[index2].entries });
  }
  const backboneScore = scores[passes.findIndex((pass) => pass.variantId === consensus.backboneVariant)];
  const rawText = rawTextOf(passes.find((pass) => pass.variantId === consensus.backboneVariant).page);
  const { documentQuad: _quad, ...qualitySummary } = quality ?? {};
  return {
    page: consensus.page,
    rawText,
    normalizedText: normalizeForComparison(rawText),
    quality: quality ? qualitySummary : null,
    plan: { level: plan.level, variants: plan.variants.map((variant) => variant.id), geometry: plan.geometry },
    passes: reports,
    chosenVariant: consensus.backboneVariant,
    agreement: consensus.agreement,
    confidence: {
      image: quality ? quality.score : 0.75,
      ocr: backboneScore.total,
      structure: Math.round((backboneScore.breakdown.structure + backboneScore.breakdown.numberConsistency) / 2 * 100) / 100
    },
    waves,
    elapsedMs: Date.now() - started,
    notes: notes2
  };
}

// server/routers/bookContent.ts
var bookIdInput = z4.string().min(1).max(120);
var examInput = z4.enum(EXAM_KINDS).nullable().optional();
var imageInput = z4.object({
  dataUrl: z4.string().min(20).max(Math.ceil(bookContentConfig.ocr.maxImageBytes * 1.4)),
  mimeType: z4.enum(["image/png", "image/jpeg", "image/webp"])
});
var contentTypeInput = z4.enum(["topic_test", "osym_type", "review", "simulation", "topic"]);
async function matchEntries(userId, entries, subject2) {
  const topics = await getMatchableTopicsFor(userId);
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const describe = (match, reason) => {
    const topic = topicById.get(match.topicId);
    return { ...match, topic: topic.topic, subject: topic.subject, unit: topic.unit, ...reason ? { reason } : {} };
  };
  const matched = entries.map((entry) => {
    if (!entry.matchText) return { ...entry, suggestion: null, alternatives: [], tier: "not_applicable" };
    let result = matchTopic(entry.matchText, topics, { subject: subject2 });
    if (!result.best && subject2) result = matchTopic(entry.matchText, topics, {});
    return { ...entry, suggestion: result.best && result.tier !== "manual" ? describe(result.best) : null, alternatives: [result.best, ...result.alternatives].filter((item) => Boolean(item)).map((item) => describe(item)), tier: result.tier };
  });
  const unresolvedTexts = Array.from(new Set(matched.filter((entry) => entry.tier === "manual" && entry.matchText).map((entry) => entry.matchText)));
  if (unresolvedTexts.length > 0) {
    const candidates = topics.filter((topic) => !subject2 || topic.subject === subject2);
    const ai = await suggestTopicsWithAi(unresolvedTexts.map((text4, key) => ({ key, text: text4, unitTitle: matched.find((entry) => entry.matchText === text4)?.unitTitle ?? "" })), candidates);
    const byText = new Map(ai.map((answer) => [unresolvedTexts[answer.key], answer]));
    for (const entry of matched) {
      const answer = entry.tier === "manual" && entry.matchText ? byText.get(entry.matchText) : void 0;
      if (!answer) continue;
      entry.suggestion = describe({ topicId: answer.topicId, confidence: answer.confidence, method: "ai", matchedText: entry.matchText }, answer.reason);
      entry.tier = "confirm";
    }
  }
  return matched;
}
function summarizeConfidence(entries, reports) {
  const average2 = (values, fallback) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  const round3 = (value) => Math.round(value * 100) / 100;
  const matchable = entries.filter((entry) => entry.matchText);
  const imageConfidence = round3(average2(reports.map((report) => report.confidence.image), 0.75));
  const ocrConfidence = round3(average2(reports.map((report) => report.confidence.ocr), 0));
  const structureConfidence = round3(average2(reports.map((report) => report.confidence.structure), 0));
  const mappingConfidence = round3(average2(matchable.map((entry) => entry.suggestion?.confidence ?? 0), 1));
  const weights = bookContentConfig.confidence.weights;
  const finalConfidence = round3(weights.image * imageConfidence + weights.ocr * ocrConfidence + weights.structure * structureConfidence + weights.mapping * mappingConfidence);
  const flagged = entries.filter((entry) => entry.review.title || entry.review.page).length;
  return { imageConfidence, ocrConfidence, structureConfidence, mappingConfidence, finalConfidence, flaggedEntries: flagged, needsReview: finalConfidence < bookContentConfig.confidence.needsReviewBelow || flagged > entries.length * 0.25 };
}
async function assertOwnsBook(userId, bookId) {
  if (!await userOwnsBook(userId, bookId)) throw new TRPCError2({ code: "FORBIDDEN", message: "Bu kitap k\xFCt\xFCphanende bulunmuyor. \xD6nce kitab\u0131 raf\u0131na ekle." });
}
var bookContentRouter = router({
  // Fotoğrafları okur ve bir ÖNİZLEME döner — hiçbir şey kaydetmez.
  // Kota: bir kitap taraması (en fazla 8 sayfa) = 1 kullanım.
  readTableOfContents: metredFeatureProcedure("OCR_BOOK_IMPORT").input(z4.object({
    bookId: bookIdInput,
    subject: z4.string().max(80).nullable().optional(),
    exam: examInput,
    images: z4.array(imageInput).min(1).max(bookContentConfig.ocr.maxTocPages),
    /** Gürültü filtresi için (kitap adı/yayınevi satırı içerik sayılmaz). */
    book: z4.object({ title: z4.string().max(180).optional(), publisher: z4.string().max(120).optional() }).optional()
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED" });
    const userId = ctx.user.id;
    await assertOwnsBook(userId, input.bookId);
    for (let index2 = 0; index2 < input.images.length; index2++) {
      const image = input.images[index2];
      const check2 = validateDataUrl(image.dataUrl, image.mimeType);
      if (!check2.valid) throw new TRPCError2({ code: "BAD_REQUEST", message: `${index2 + 1}. foto\u011Fraf: ${check2.reason}` });
      if (check2.buffer.byteLength > bookContentConfig.ocr.maxImageBytes) throw new TRPCError2({ code: "BAD_REQUEST", message: `${index2 + 1}. foto\u011Fraf \xE7ok b\xFCy\xFCk. Daha d\xFC\u015F\xFCk \xE7\xF6z\xFCn\xFCrl\xFCkle tekrar dener misin?` });
    }
    const provider = getOcrProvider();
    const deadline = Date.now() + bookContentConfig.ocr.requestBudgetMs;
    const maxPasses = input.images.length > bookContentConfig.ocr.manyPagesThreshold ? bookContentConfig.ocr.maxPassesWhenManyPages : void 0;
    const reports = await Promise.all(input.images.map(async (image, index2) => {
      const hash = imageHash(image.dataUrl);
      const cached2 = await readOcrCache(userId, hash);
      if (cached2) return { ...cached2, cached: true };
      try {
        const report = await readTocImage(image.dataUrl, { provider, deadline, maxPasses });
        if (report.page.items.length) void writeOcrCache(userId, hash, report);
        return { ...report, cached: false };
      } catch (error) {
        console.warn(`[BookContent] OCR failed on page ${index2 + 1}:`, error instanceof Error ? error.message : error);
        throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: llmUnavailableMessage(error) ?? `${index2 + 1}. sayfa okunamad\u0131. Daha net, d\xFCz ve \u0131\u015F\u0131kl\u0131 bir foto\u011Frafla tekrar dener misin?` });
      }
    }));
    const notes2 = [];
    const tocReports = reports.map((report, index2) => ({ report, index: index2 })).filter(({ report, index: index2 }) => {
      if (looksLikeTopicList(report.page)) return true;
      if (report.page.pageKind && report.page.pageKind !== "table_of_contents") {
        notes2.push(`${index2 + 1}. foto\u011Fraf ${report.page.pageKind === "cover" ? "kitap kapa\u011F\u0131" : "i\xE7indekiler sayfas\u0131 de\u011Fil"} gibi g\xF6r\xFCn\xFCyor; atland\u0131.`);
        return false;
      }
      return true;
    });
    if (tocReports.length === 0) {
      const allCovers = reports.every((report) => report.page.pageKind === "cover");
      throw new TRPCError2({ code: "UNPROCESSABLE_CONTENT", message: allCovers ? "Bu foto\u011Fraf kitab\u0131n kapa\u011F\u0131. Burada kitab\u0131n \u0130\xC7\u0130NDEK\u0130LER sayfas\u0131n\u0131 \xE7ekmelisin." : "Ekledi\u011Fin foto\u011Fraflar i\xE7indekiler sayfas\u0131 gibi g\xF6r\xFCnm\xFCyor. \xDCnite ve test listesinin oldu\u011Fu sayfay\u0131 \xE7eker misin?" });
    }
    tocReports.forEach(({ report, index: index2 }) => report.notes.forEach((note) => notes2.push(`${index2 + 1}. sayfa: ${note}`)));
    const { pages: cleanPages, removed } = filterTocNoise(tocReports.map(({ report }) => report.page), input.book ?? {});
    const { entries, warnings } = parseTableOfContents(cleanPages);
    if (entries.length === 0) throw new TRPCError2({ code: "UNPROCESSABLE_CONTENT", message: "Foto\u011Fraflarda i\xE7indekiler sat\u0131r\u0131 bulunamad\u0131. \u0130\xE7indekiler sayfas\u0131n\u0131n tamam\u0131 g\xF6r\xFCnecek \u015Fekilde tekrar \xE7eker misin?" });
    const matched = await matchEntries(ctx.user.id, entries, input.subject || null);
    const confidence = summarizeConfidence(matched, tocReports.map(({ report }) => report));
    const withReview = matched.map((entry) => {
      const mapping = entry.matchText ? entry.suggestion?.confidence ?? 0 : 1;
      const finalConfidence = Math.round((entry.readConfidence ?? 0.75) * (entry.matchText ? 0.5 + 0.5 * mapping : 1) * 100) / 100;
      return { ...entry, finalConfidence, needsReview: entry.review.title || entry.review.page || finalConfidence < bookContentConfig.confidence.needsReviewBelow };
    });
    if (confidence.needsReview) notes2.unshift("Bu sayfan\u0131n baz\u0131 b\xF6l\xFCmlerini net okuyamad\u0131k. \u0130\u015Faretli sat\u0131rlar\u0131 kontrol et ya da foto\u011Fraf\u0131 tekrar \xE7ek.");
    return {
      warnings: [...notes2, ...warnings],
      entries: withReview,
      confidence,
      report: {
        pages: reports.map((report, index2) => ({
          index: index2,
          cached: report.cached,
          quality: report.quality ? { level: report.quality.level, score: report.quality.score, issues: report.quality.issues, orientation: report.quality.orientation, skew: report.quality.skew, blur: report.quality.blur, glare: report.quality.glare, shadow: report.quality.shadow } : null,
          plan: report.plan,
          passes: report.passes.map(({ variantId, applied, status, score, entries: passEntries, elapsedMs }) => ({ variantId, applied, status, score: score ?? null, entries: passEntries ?? null, elapsedMs })),
          chosenVariant: report.chosenVariant,
          agreement: report.agreement,
          waves: report.waves,
          elapsedMs: report.elapsedMs,
          rawText: report.rawText
        })),
        removed
      }
    };
  }),
  // Elle eşleştirme listesi (öğrenci "Değiştir" dediğinde).
  topicOptions: protectedProcedure.input(z4.object({ subject: z4.string().max(80).nullable().optional() }).optional()).query(async ({ ctx, input }) => {
    const topics = await getMatchableTopicsFor(ctx.user.id);
    const subject2 = input?.subject?.trim();
    return topics.filter((topic) => !subject2 || topic.subject === subject2).map(({ id: id8, exam, subject: topicSubject, unit, topic }) => ({ id: id8, exam, subject: topicSubject, unit, topic })).sort((a, b) => a.exam.localeCompare(b.exam) || a.subject.localeCompare(b.subject, "tr") || a.unit.localeCompare(b.unit, "tr") || a.topic.localeCompare(b.topic, "tr"));
  }),
  // Öğrencinin onayladığı içerik (OCR'dan ya da tamamen elle).
  save: protectedProcedure.input(z4.object({
    bookId: bookIdInput,
    subject: z4.string().max(80),
    source: z4.enum(["ocr", "manual"]),
    items: z4.array(z4.object({
      unitNumber: z4.number().int().min(0).max(200).nullable(),
      unitTitle: z4.string().max(300),
      contentType: contentTypeInput,
      label: z4.string().min(1).max(120),
      testNumber: z4.number().int().min(0).max(1e3).nullable(),
      title: z4.string().max(300),
      pageStart: z4.number().int().min(1).max(5e3).nullable(),
      pageEnd: z4.number().int().min(1).max(5e3).nullable(),
      topicId: z4.number().int().positive().nullable(),
      mappingMethod: z4.enum(["exact_topic", "exact_alias", "contains_topic", "contains_alias", "fuzzy", "ai", "manual", "none"]),
      mappingConfidence: z4.number().min(0).max(1)
    })).max(400)
  })).mutation(async ({ ctx, input }) => {
    await assertOwnsBook(ctx.user.id, input.bookId);
    for (const item of input.items) {
      if (item.pageStart !== null && item.pageEnd !== null && item.pageEnd < item.pageStart) throw new TRPCError2({ code: "BAD_REQUEST", message: `"${item.label}" sat\u0131r\u0131nda biti\u015F sayfas\u0131 ba\u015Flang\u0131\xE7tan k\xFC\xE7\xFCk.` });
    }
    try {
      const saved = await replaceBookContents(ctx.user.id, input.bookId, input.subject, input.items, input.source);
      await shareBookContents(ctx.user.id, input.bookId, input.subject, input.items, input.source).catch((error) => console.warn("[shared books] share failed:", error));
      return saved;
    } catch (error) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u0130\xE7erik kaydedilemedi." });
    }
  }),
  contents: protectedProcedure.input(z4.object({ bookId: bookIdInput })).query(async ({ ctx, input }) => {
    await assertOwnsBook(ctx.user.id, input.bookId);
    return getBookContents(ctx.user.id, input.bookId);
  }),
  summaries: protectedProcedure.query(({ ctx }) => getBookContentSummaries(ctx.user.id)),
  recommendations: protectedProcedure.query(({ ctx }) => getWeakTopicBookRecommendations(ctx.user.id)),
  autoSchedule: protectedProcedure.query(({ ctx }) => getAutoSchedule(ctx.user.id)),
  setAutoSchedule: protectedProcedure.input(z4.object({ enabled: z4.boolean() })).mutation(({ ctx, input }) => setAutoSchedule(ctx.user.id, input.enabled)),
  // İstemci günde bir kez çağırır (tercih kapalıysa hiçbir şey yapmaz).
  runAutoSchedule: protectedProcedure.input(z4.object({ bookTitles: z4.record(z4.string().max(120), z4.string().max(180)) })).mutation(({ ctx, input }) => runAutoSchedule(ctx.user.id, input.bookTitles)),
  addToPlan: protectedProcedure.input(z4.object({ topicId: z4.number().int().positive(), bookId: bookIdInput, bookTitle: z4.string().max(180), when: z4.enum(["today", "auto"]) })).mutation(async ({ ctx, input }) => {
    try {
      return await addRecommendationToPlan(ctx.user.id, input);
    } catch (error) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "G\xF6rev plana eklenemedi." });
    }
  })
});

// server/routers/notes.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z5 } from "zod";

// server/notes/noteAi.ts
var INSTRUCTIONS = {
  summarize: "Notu 3-6 maddelik k\u0131sa bir \xF6zete \xE7evir.",
  keypoints: "Nottaki s\u0131nav i\xE7in \xF6nemli bilgileri madde madde \xE7\u0131kar (en fazla 8).",
  questions: "Nottaki bilgiyi yoklayan 3-6 k\u0131sa, \xF6\u011Frencinin s\u0131nav\u0131 tarz\u0131nda soru yaz (cevaps\u0131z, yaln\u0131z soru).",
  flashcards: "Nottan 3-8 flashcard \xFCret: front = k\u0131sa soru, back = k\u0131sa net cevap.",
  simplify: "Notu \xF6\u011Frencinin hemen anlayaca\u011F\u0131 sade c\xFCmlelerle, madde madde yeniden anlat.",
  review: "Nottan \xF6\u011Frencinin tekrar etmesi gereken kavram/konular\u0131 madde madde \xE7\u0131kar (en fazla 6)."
};
async function runNoteAi(action, plainText, invoke = invokeLLM, track = "YKS") {
  const input = plainText.trim().slice(0, notesConfig.ai.maxInputChars);
  if (!input) throw new Error("Bu notta i\u015Flenecek yaz\u0131 yok.");
  const response = await invoke({
    messages: [
      { role: "system", content: `Sen ${examStudentPhrase(track).replace(/^Bir /, "bir ")} kendi ders notunu i\u015Fleyen yard\u0131mc\u0131 bir asistans\u0131n. ${examPromptContext(track)} Yaln\u0131zca nottaki bilgiye dayan, not d\u0131\u015F\u0131 bilgi uydurma; T\xFCrk\xE7e yaz. ${INSTRUCTIONS[action]} Her maddeyi 'front' alan\u0131na yaz; yaln\u0131zca flashcard'larda 'back' doldur, di\u011Ferlerinde bo\u015F string b\u0131rak.` },
      { role: "user", content: input }
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "note_ai_items", strict: true, schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { front: { type: "string" }, back: { type: "string" } }, required: ["front", "back"], additionalProperties: false } } }, required: ["items"], additionalProperties: false } }
    }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("AI yan\u0131t\u0131 bo\u015F d\xF6nd\xFC.");
  const items = (JSON.parse(jsonText).items ?? []).map((item) => ({ front: String(item.front ?? "").trim().slice(0, 500), back: String(item.back ?? "").trim().slice(0, 500) })).filter((item) => item.front).slice(0, 10);
  if (items.length === 0) throw new Error("AI bu nottan bir sonu\xE7 \xE7\u0131karamad\u0131.");
  return items.map((item) => action === "flashcards" && item.back ? item : { front: item.front });
}

// server/_core/voiceTranscription.ts
var MAX_AUDIO_BYTES = 16 * 1024 * 1024;
var EXTENSIONS2 = {
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a"
};
async function transcribeWithGemini(audio, mimeType, key, model, options, fetchImpl = fetch) {
  const language = options.language === "tr" || !options.language ? "T\xFCrk\xE7e" : options.language;
  const instruction = [
    `Bu ses kayd\u0131n\u0131 dinle. \u0130\xE7inde anla\u015F\u0131l\u0131r ${language} konu\u015Fma varsa kelimesi kelimesine yaz\u0131ya d\xF6k.`,
    "Yaln\u0131zca ger\xE7ekten duydu\u011Fun s\xF6zleri yaz; tahmin etme, tamamlama, \xF6zetleme. Matematik ifadelerini d\xFCz yaz\u0131yla yaz (\xF6r. x kare \u2192 x^2).",
    "Kay\u0131tta konu\u015Fma yoksa (sessizlik, g\xFCr\xFClt\xFC, m\xFCzik, bip sesi) hasSpeech=false ve text bo\u015F olsun."
  ].join(" ");
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }, { inline_data: { mime_type: mimeType, data: audio.toString("base64") } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { hasSpeech: { type: "BOOLEAN" }, text: { type: "STRING" } }, required: ["hasSpeech", "text"] }
      }
    })
  });
  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).replace(/AIza[0-9A-Za-z_\-]{10,}/g, "[redacted]");
    return { error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${response.statusText}${errorText ? `: ${errorText.slice(0, 300)}` : ""}` };
  }
  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
  }
  const text4 = parsed.hasSpeech === true && typeof parsed.text === "string" ? parsed.text.trim() : "";
  return { task: "transcribe", language: options.language, text: text4 };
}
async function transcribeAudioBuffer(audio, mimeType, options = {}, fetchImpl = fetch) {
  const target = resolveLlmTarget();
  if (!target) return { error: "Voice transcription service is not configured", code: "SERVICE_ERROR", details: "LLM_API_KEY is not set" };
  if (audio.length > MAX_AUDIO_BYTES) return { error: "Audio file exceeds maximum size limit", code: "FILE_TOO_LARGE" };
  if (target.baseUrl.includes("generativelanguage.googleapis.com")) {
    try {
      return await transcribeWithGemini(audio, mimeType.split(";")[0].trim() || "audio/webm", target.key, ENV.transcribeModel?.startsWith("gemini") ? ENV.transcribeModel : target.model, options, fetchImpl);
    } catch (error) {
      return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  try {
    const baseMime = mimeType.split(";")[0].trim();
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audio)], { type: baseMime }), `audio.${EXTENSIONS2[baseMime] ?? "webm"}`);
    const model = ENV.transcribeModel || "whisper-1";
    formData.append("model", model);
    formData.append("response_format", model === "whisper-1" ? "verbose_json" : "json");
    if (options.language) formData.append("language", options.language);
    if (options.prompt) formData.append("prompt", options.prompt);
    const response = await fetchImpl(`${target.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${target.key}` },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${response.statusText}${errorText ? `: ${errorText.slice(0, 300)}` : ""}` };
    }
    const result = await response.json();
    if (typeof result.text !== "string") return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
    return result;
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unknown error" };
  }
}

// server/notes/speechProvider.ts
var SpeechToTextError = class extends Error {
  constructor(message, retryable) {
    super(message);
    this.retryable = retryable;
  }
};
var whisperSpeechProvider = {
  name: "whisper",
  async transcribe(audio, mimeType) {
    const result = await transcribeAudioBuffer(audio, mimeType, { language: notesConfig.speech.language, prompt: notesConfig.speech.prompt });
    if ("error" in result) {
      console.warn(`[Notes] Transcription failed: ${result.code}${result.details ? ` \u2013 ${result.details.slice(0, 300)}` : ""}`);
      if (result.code === "SERVICE_ERROR" && /not configured|not set/i.test(`${result.error} ${result.details ?? ""}`)) throw new SpeechToTextError("Ses \u2192 metin servisi \u015Fu an yap\u0131land\u0131r\u0131lmam\u0131\u015F.", false);
      throw new SpeechToTextError("Ses metne \xE7evrilemedi. Tekrar dener misin?", true);
    }
    return { text: result.text.trim(), durationSec: typeof result.duration === "number" && Number.isFinite(result.duration) ? Math.round(result.duration) : null };
  }
};
var getSpeechProvider = () => notesConfig.speech.provider === "whisper" ? whisperSpeechProvider : null;

// server/routers/notes.ts
var optionalId = z5.number().int().positive().nullable().optional();
var linksInput = {
  subject: z5.string().max(80).nullable().optional(),
  topicId: optionalId,
  bookId: z5.string().max(120).nullable().optional(),
  bookContentId: optionalId,
  studySessionId: optionalId,
  mockExamId: optionalId
};
async function userFacing(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoteError || error instanceof AttachmentError || error instanceof PlanTaskError) throw new TRPCError3({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
var requireUserId = (ctx) => {
  if (!ctx.user) throw new TRPCError3({ code: "UNAUTHORIZED" });
  return ctx.user.id;
};
var notesRouter = router({
  list: protectedProcedure.input(z5.object({
    from: z5.string().datetime().nullable().optional(),
    to: z5.string().datetime().nullable().optional(),
    subject: z5.string().max(80).nullable().optional(),
    noSubject: z5.boolean().optional(),
    topicId: optionalId,
    bookId: z5.string().max(120).nullable().optional(),
    tag: z5.string().max(40).nullable().optional(),
    kind: z5.enum(["text", "voice", "image", "formula", "drawing"]).nullable().optional(),
    q: z5.string().max(100).nullable().optional(),
    favorite: z5.boolean().optional(),
    pinned: z5.boolean().optional(),
    studySessionId: optionalId,
    reviewDue: z5.boolean().optional(),
    questions: z5.enum(["exclude", "only"]).optional(),
    cursor: z5.string().max(40).nullable().optional(),
    limit: z5.number().int().min(1).max(100).optional()
  })).query(({ ctx, input }) => userFacing(() => listNotes(ctx.user.id, { ...input, from: input.from ? new Date(input.from) : null, to: input.to ? new Date(input.to) : null }))),
  get: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).query(async ({ ctx, input }) => {
    const note = await getNote(ctx.user.id, input.id);
    if (!note) throw new TRPCError3({ code: "NOT_FOUND", message: "Not bulunamad\u0131." });
    return note;
  }),
  // Otomatik kayıt da bu uçtan yapılır (istemci 800 ms debounce ile çağırır).
  save: protectedProcedure.input(z5.object({
    clientId: z5.string().min(8).max(40).regex(/^[A-Za-z0-9_-]+$/),
    title: z5.string().max(notesConfig.content.maxTitleLength),
    content: z5.unknown(),
    noteDate: z5.string().datetime(),
    tags: z5.array(z5.string().max(40)).max(notesConfig.content.maxTagsPerNote),
    isFavorite: z5.boolean().optional(),
    isPinned: z5.boolean().optional(),
    reviewAt: z5.string().datetime().nullable().optional(),
    templateKey: z5.string().max(40).nullable().optional(),
    ...linksInput
  })).mutation(({ ctx, input }) => userFacing(() => saveNote(ctx.user.id, { ...input, noteDate: new Date(input.noteDate), reviewAt: input.reviewAt ? new Date(input.reviewAt) : null }))),
  updateFlags: protectedProcedure.input(z5.object({ id: z5.number().int().positive(), isFavorite: z5.boolean().optional(), isPinned: z5.boolean().optional(), reviewAt: z5.string().datetime().nullable().optional(), archived: z5.boolean().optional() })).mutation(({ ctx, input }) => userFacing(() => updateNoteFlags(ctx.user.id, input.id, { isFavorite: input.isFavorite, isPinned: input.isPinned, archived: input.archived, reviewAt: input.reviewAt === void 0 ? void 0 : input.reviewAt ? new Date(input.reviewAt) : null }))),
  delete: protectedProcedure.input(z5.object({ id: z5.number().int().positive() })).mutation(({ ctx, input }) => userFacing(() => deleteNote(ctx.user.id, input.id))),
  calendar: protectedProcedure.input(z5.object({ from: z5.string().datetime(), to: z5.string().datetime() })).query(({ ctx, input }) => getNoteCalendar(ctx.user.id, new Date(input.from), new Date(input.to))),
  tags: protectedProcedure.query(({ ctx }) => listTags(ctx.user.id)),
  createTask: protectedProcedure.input(z5.object({ id: z5.number().int().positive(), topicId: optionalId, minutes: z5.number().int().min(10).max(240).optional(), when: z5.enum(["today", "auto"]) })).mutation(({ ctx, input }) => userFacing(() => createTaskFromNote(ctx.user.id, input.id, input))),
  // Fotoğraf ekleme (ücretsiz). İstemci fotoğrafı küçültüp gönderir; sunucu tür/boyut/kota doğrular.
  uploadImage: protectedProcedure.input(z5.object({ dataUrl: z5.string().min(20).max(Math.ceil(notesConfig.attachments.imageMaxBytes * 1.4)) })).mutation(({ ctx, input }) => userFacing(async () => {
    const storage = getAttachmentStorage();
    await storage.cleanupOrphans(ctx.user.id);
    const { mimeType, data } = decodeAttachment(input.dataUrl, "image");
    return storage.put(ctx.user.id, { kind: "image", mimeType, data });
  })),
  // Yalnızca ses kaydı (metne çevirmeden, ücretsiz) — Duvarım'daki sesli kayıtlar için.
  uploadAudio: protectedProcedure.input(z5.object({ dataUrl: z5.string().min(20).max(Math.ceil(notesConfig.attachments.audioMaxBytes * 1.4)), durationSec: z5.number().min(0).max(notesConfig.speech.maxAudioSeconds + 5) })).mutation(({ ctx, input }) => userFacing(async () => {
    const storage = getAttachmentStorage();
    await storage.cleanupOrphans(ctx.user.id);
    const { mimeType, data } = decodeAttachment(input.dataUrl, "audio");
    return storage.put(ctx.user.id, { kind: "audio", mimeType, data, durationSec: Math.round(input.durationSec) });
  })),
  // Ses → metin. İsterse ses kaydı da nota eklenir (keepAudio).
  transcribe: metredFeatureProcedure("NOTE_VOICE", { maxRequests: 10, windowMs: 6e4 }).input(z5.object({ dataUrl: z5.string().min(20).max(Math.ceil(notesConfig.attachments.audioMaxBytes * 1.4)), durationSec: z5.number().min(0).max(notesConfig.speech.maxAudioSeconds + 5), keepAudio: z5.boolean() })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const provider = getSpeechProvider();
    if (!provider) throw new NoteError("Ses \u2192 metin \u015Fu an kapal\u0131.");
    const { mimeType, data } = decodeAttachment(input.dataUrl, "audio");
    let text4;
    try {
      ({ text: text4 } = await provider.transcribe(data, mimeType));
    } catch (error) {
      if (error instanceof SpeechToTextError) throw new NoteError(error.message);
      throw error;
    }
    if (!text4) throw new NoteError("Kay\u0131tta konu\u015Fma alg\u0131lanamad\u0131. Mikrofona biraz daha yak\u0131n konu\u015Fup tekrar dener misin?");
    const durationSec = Math.round(input.durationSec);
    const attachment = input.keepAudio ? await getAttachmentStorage().put(userId, { kind: "audio", mimeType, data, durationSec }) : null;
    return { text: text4, durationSec, attachmentId: attachment?.id ?? null };
  })),
  // Fotoğraftaki metni çıkar (kitap OCR'ıyla aynı sağlayıcı).
  extractText: metredFeatureProcedure("NOTE_OCR").input(z5.object({ attachmentId: z5.number().int().positive() })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const storage = getAttachmentStorage();
    const attachment = await storage.get(userId, input.attachmentId);
    if (!attachment || attachment.kind !== "image") throw new NoteError("Foto\u011Fraf bulunamad\u0131.");
    let text4;
    try {
      text4 = await extractPlainTextFromImage(`data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`);
    } catch (error) {
      console.warn("[Notes] OCR failed:", error instanceof Error ? error.message : error);
      throw new NoteError(llmUnavailableMessage(error) ?? "Foto\u011Fraftaki metin okunamad\u0131. Daha net bir foto\u011Frafla tekrar dener misin?");
    }
    if (!text4) throw new NoteError("Foto\u011Frafta okunabilir bir yaz\u0131 bulunamad\u0131.");
    await storage.setOcrText(userId, input.attachmentId, text4);
    return { text: text4 };
  })),
  // AI araçları: sonuç notun ÜZERİNE YAZILMAZ; eklenecek blok olarak döner.
  ai: metredFeatureProcedure("NOTE_AI").input(z5.object({ id: z5.number().int().positive(), action: z5.enum(Object.keys(NOTE_AI_ACTIONS)) })).mutation(({ ctx, input }) => userFacing(async () => {
    const userId = requireUserId(ctx);
    const note = await getNote(userId, input.id);
    if (!note) throw new NoteError("Not bulunamad\u0131.");
    try {
      const items = await runNoteAi(input.action, note.plainText, void 0, (await getStudentProfile(userId)).examTrack);
      return { items, nodes: aiResultToNodes(input.action, items) };
    } catch (error) {
      console.warn("[Notes] AI failed:", error instanceof Error ? error.message : error);
      throw new NoteError(error instanceof Error && /yazı yok|çıkaramadı/.test(error.message) ? error.message : "AI \u015Fu an yan\u0131t veremedi. Biraz sonra tekrar dener misin?");
    }
  }))
});

// server/routers/wall.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z6 } from "zod";

// server/wall/linkPreview.ts
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
var linkPreviewConfig = { timeoutMs: 5e3, maxBytes: 512 * 1024, maxRedirects: 3 };
var LinkPreviewError = class extends Error {
};
function isBlockedAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19) || a >= 224;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isBlockedAddress(mapped[1]);
    return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff") || lower.startsWith("64:ff9b") || lower.startsWith("2001:db8");
  }
  return true;
}
function parsePublicUrl(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new LinkPreviewError("Ge\xE7erli bir ba\u011Flant\u0131 de\u011Fil.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new LinkPreviewError("Yaln\u0131zca http ve https ba\u011Flant\u0131lar\u0131 eklenebilir.");
  if (url.username || url.password) throw new LinkPreviewError("Kullan\u0131c\u0131 ad\u0131 i\xE7eren ba\u011Flant\u0131 eklenemez.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new LinkPreviewError("Bu ba\u011Flant\u0131n\u0131n \xF6nizlemesi al\u0131nam\u0131yor.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || isIP(host) && isBlockedAddress(host)) throw new LinkPreviewError("Bu ba\u011Flant\u0131n\u0131n \xF6nizlemesi al\u0131nam\u0131yor.");
  return url;
}
async function assertPublicHost(url, resolve) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return;
  const addresses = await resolve(host, { all: true }).catch(() => []);
  if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address))) throw new LinkPreviewError("Bu ba\u011Flant\u0131n\u0131n \xF6nizlemesi al\u0131nam\u0131yor.");
}
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
var decode = (value) => value.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&([a-z]+);/gi, (match, name2) => ENTITIES[name2.toLowerCase()] ?? match).replace(/\s+/g, " ").trim();
function parseLinkMeta(html, url) {
  const head = html.slice(0, 2e5);
  const meta = (key) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      const name2 = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
      if (name2 !== key) continue;
      const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
      const value = decode(content?.[1] ?? content?.[2] ?? "");
      if (value) return value;
    }
    return null;
  };
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const clip2 = (value, max) => value ? value.slice(0, max) : null;
  return {
    title: clip2(meta("og:title") ?? meta("twitter:title") ?? (titleTag ? decode(titleTag) || null : null), 300),
    description: clip2(meta("og:description") ?? meta("description") ?? meta("twitter:description"), 500),
    site: clip2(meta("og:site_name") ?? url.hostname.replace(/^www\./, ""), 120)
  };
}
async function fetchLinkPreview(raw, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolve = deps.resolve ?? lookup;
  let url = parsePublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), linkPreviewConfig.timeoutMs);
  try {
    for (let hop = 0; ; hop += 1) {
      await assertPublicHost(url, resolve);
      const response = await fetchImpl(url, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "PusulaBot/1.0 (+ba\u011Flant\u0131 \xF6nizlemesi)", Accept: "text/html,application/xhtml+xml" } });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (hop >= linkPreviewConfig.maxRedirects) throw new LinkPreviewError("Ba\u011Flant\u0131 \xE7ok fazla y\xF6nlendiriyor.");
        url = parsePublicUrl(new URL(response.headers.get("location"), url).toString());
        continue;
      }
      if (!response.ok || !/text\/html|application\/xhtml/i.test(response.headers.get("content-type") ?? "")) {
        return { url: url.toString(), title: null, description: null, site: url.hostname.replace(/^www\./, "") };
      }
      const html = await readLimited(response, linkPreviewConfig.maxBytes);
      return { url: url.toString(), ...parseLinkMeta(html, url) };
    }
  } catch (error) {
    if (error instanceof LinkPreviewError) throw error;
    throw new LinkPreviewError("Ba\u011Flant\u0131n\u0131n \xF6nizlemesi al\u0131namad\u0131; d\xFCz ba\u011Flant\u0131 olarak kaydedebilirsin.");
  } finally {
    clearTimeout(timer);
  }
}
async function readLimited(response, maxBytes) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => void 0);
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks).subarray(0, maxBytes));
}

// server/wall/wallDb.ts
import { and as and20, desc as desc14, eq as eq23, ilike as ilike3, inArray as inArray10, isNull as isNull14, lt as lt11, or as or6, sql as sql12 } from "drizzle-orm";
var WallError = class extends Error {
};
var WALL_PAGE_SIZE = 20;
var WALL_MAX_TAGS = 8;
async function requireDb9() {
  const db = await getDb();
  if (!db) throw new WallError("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
var tagList = (tags) => tags.split(",").filter(Boolean);
var toPost = (row, topic) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  content: JSON.parse(row.content),
  plainText: row.plainText,
  sourceUrl: row.sourceUrl,
  sourceTitle: row.sourceTitle,
  sourceDescription: row.sourceDescription,
  sourceSite: row.sourceSite,
  tags: tagList(row.tags),
  subject: row.subject,
  topicId: row.topicId,
  topic: topic?.topic ?? null,
  readLater: row.readLater === 1,
  readAt: row.readAt,
  isPinned: row.isPinned === 1,
  postedAt: row.postedAt,
  updatedAt: row.updatedAt
});
function deriveWallTitle(input, plainText) {
  const explicit = input.title.trim();
  if (explicit) return explicit.slice(0, 200);
  if (input.sourceTitle?.trim()) return input.sourceTitle.trim().slice(0, 200);
  const firstLine = plainText.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.length > 80 ? `${firstLine.slice(0, 77)}\u2026` : firstLine;
  if (input.sourceUrl) {
    try {
      return new URL(input.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
    }
  }
  return input.kind === "quote" ? "Al\u0131nt\u0131" : input.kind === "link" ? "Ba\u011Flant\u0131" : "Yaz\u0131";
}
async function prepare(db, input) {
  if (!isValidNoteDoc(input.content)) throw new WallError("Kay\u0131t i\xE7eri\u011Fi okunamad\u0131.");
  const contentJson = JSON.stringify(input.content);
  if (Buffer.byteLength(contentJson) > notesConfig.content.maxContentBytes) throw new WallError("Kay\u0131t \xE7ok b\xFCy\xFCk. Baz\u0131 \xE7izim ya da g\xF6rselleri ayr\u0131 bir kayda ta\u015F\u0131r m\u0131s\u0131n?");
  const plainText = extractPlainText(input.content);
  if (input.kind === "link" && !input.sourceUrl) throw new WallError("Ba\u011Flant\u0131 kayd\u0131 i\xE7in adres gerekli.");
  if (input.kind !== "link" && !plainText.trim() && !referencedAttachmentIds(input.content).length && !contentJson.includes('"formula"') && !contentJson.includes('"drawing"')) throw new WallError("Bo\u015F kay\u0131t eklenemez.");
  let subject2 = null;
  if (input.topicId) {
    const [topic] = await db.select({ subject: yksTopics.subject }).from(yksTopics).where(eq23(yksTopics.id, input.topicId)).limit(1);
    if (!topic) throw new WallError("Se\xE7ilen konu bulunamad\u0131.");
    subject2 = topic.subject;
  }
  const tags = Array.from(new Set(input.tags.map(normalizeTag).filter((tag) => Boolean(tag) && !tag.includes(",")))).slice(0, WALL_MAX_TAGS);
  return {
    kind: input.kind,
    title: deriveWallTitle(input, plainText),
    content: contentJson,
    plainText,
    sourceUrl: input.sourceUrl?.slice(0, 1e3) || null,
    sourceTitle: input.sourceTitle?.trim().slice(0, 300) || null,
    sourceDescription: input.sourceDescription?.trim().slice(0, 500) || null,
    sourceSite: input.sourceSite?.trim().slice(0, 120) || null,
    tags: tags.join(",").slice(0, 300),
    subject: subject2,
    topicId: input.topicId ?? null,
    readLater: input.readLater ? 1 : 0
  };
}
async function withTopics(db, rows) {
  const ids = Array.from(new Set(rows.map((row) => row.topicId).filter((id8) => id8 !== null)));
  const topics = ids.length ? await db.select({ id: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject }).from(yksTopics).where(inArray10(yksTopics.id, ids)) : [];
  const byId = new Map(topics.map((row) => [row.id, row]));
  return rows.map((row) => toPost(row, row.topicId !== null ? byId.get(row.topicId) ?? null : null));
}
async function createWallPost(userId, input) {
  const db = await requireDb9();
  const values = await prepare(db, input);
  const [row] = await db.insert(wallPosts).values({ userId, ...values }).returning();
  await getAttachmentStorage().syncWallPostLinks(userId, row.id, referencedAttachmentIds(input.content));
  return (await withTopics(db, [row]))[0];
}
async function updateWallPost(userId, id8, input) {
  const db = await requireDb9();
  const values = await prepare(db, input);
  const [row] = await db.update(wallPosts).set({ ...values, ...values.readLater ? {} : { readAt: null } }).where(and20(eq23(wallPosts.id, id8), eq23(wallPosts.userId, userId))).returning();
  if (!row) throw new WallError("Kay\u0131t bulunamad\u0131.");
  await getAttachmentStorage().syncWallPostLinks(userId, row.id, referencedAttachmentIds(input.content));
  return (await withTopics(db, [row]))[0];
}
async function deleteWallPost(userId, id8) {
  const db = await requireDb9();
  const [row] = await db.delete(wallPosts).where(and20(eq23(wallPosts.id, id8), eq23(wallPosts.userId, userId))).returning({ id: wallPosts.id });
  if (!row) return false;
  await getAttachmentStorage().deleteForWallPost(userId, id8);
  return true;
}
async function setWallPostFlags(userId, id8, flags) {
  const db = await requireDb9();
  const set = {};
  if (flags.read !== void 0) set.readAt = flags.read ? /* @__PURE__ */ new Date() : null;
  if (flags.pinned !== void 0) set.isPinned = flags.pinned ? 1 : 0;
  if (flags.readLater !== void 0) {
    set.readLater = flags.readLater ? 1 : 0;
    if (flags.readLater) set.readAt = null;
  }
  if (!Object.keys(set).length) return true;
  const rows = await db.update(wallPosts).set(set).where(and20(eq23(wallPosts.id, id8), eq23(wallPosts.userId, userId))).returning({ id: wallPosts.id });
  return rows.length > 0;
}
async function listWallPosts(userId, options = {}) {
  const db = await requireDb9();
  const limit = Math.min(50, options.limit ?? WALL_PAGE_SIZE);
  const conditions = [eq23(wallPosts.userId, userId)];
  if (options.filter === "unread") conditions.push(eq23(wallPosts.readLater, 1), isNull14(wallPosts.readAt));
  if (options.filter === "pinned") conditions.push(eq23(wallPosts.isPinned, 1));
  const tag = options.tag ? normalizeTag(options.tag) : null;
  if (tag) conditions.push(sql12`(',' || ${wallPosts.tags} || ',') LIKE ${`%,${tag.replace(/[%_]/g, "")},%`}`);
  if (options.topicId) conditions.push(eq23(wallPosts.topicId, options.topicId));
  const q = options.q?.trim().replace(/[%_\\]/g, "").slice(0, 100);
  if (q) conditions.push(or6(ilike3(wallPosts.title, `%${q}%`), ilike3(wallPosts.plainText, `%${q}%`), ilike3(wallPosts.sourceTitle, `%${q}%`), ilike3(wallPosts.sourceUrl, `%${q}%`)));
  if (options.cursor) conditions.push(or6(lt11(wallPosts.postedAt, options.cursor.postedAt), and20(eq23(wallPosts.postedAt, options.cursor.postedAt), lt11(wallPosts.id, options.cursor.id))));
  const rows = await db.select().from(wallPosts).where(and20(...conditions)).orderBy(desc14(wallPosts.postedAt), desc14(wallPosts.id)).limit(limit + 1);
  const page2 = rows.slice(0, limit);
  const last = page2.at(-1);
  return { posts: await withTopics(db, page2), nextCursor: rows.length > limit && last ? { postedAt: last.postedAt, id: last.id } : null };
}
async function getWallPost(userId, id8) {
  const db = await requireDb9();
  const [row] = await db.select().from(wallPosts).where(and20(eq23(wallPosts.id, id8), eq23(wallPosts.userId, userId))).limit(1);
  return row ? (await withTopics(db, [row]))[0] : null;
}
async function wallSummary(userId) {
  const db = await requireDb9();
  const [counts] = await db.select({
    total: sql12`COUNT(*)`,
    unread: sql12`COUNT(*) FILTER (WHERE ${wallPosts.readLater} = 1 AND ${wallPosts.readAt} IS NULL)`,
    pinned: sql12`COUNT(*) FILTER (WHERE ${wallPosts.isPinned} = 1)`
  }).from(wallPosts).where(eq23(wallPosts.userId, userId));
  const tagRows = await db.select({ tags: wallPosts.tags }).from(wallPosts).where(and20(eq23(wallPosts.userId, userId), sql12`${wallPosts.tags} <> ''`)).orderBy(desc14(wallPosts.postedAt)).limit(300);
  const tagCounts = /* @__PURE__ */ new Map();
  for (const row of tagRows) for (const tag of tagList(row.tags)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  return {
    total: Number(counts?.total ?? 0),
    unread: Number(counts?.unread ?? 0),
    pinned: Number(counts?.pinned ?? 0),
    tags: Array.from(tagCounts, ([tag, count4]) => ({ tag, count: count4 })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "tr")).slice(0, 20)
  };
}

// server/routers/wall.ts
var postInput = z6.object({
  kind: z6.enum(["note", "link", "quote"]),
  title: z6.string().max(200),
  content: z6.unknown(),
  sourceUrl: z6.string().trim().max(1e3).nullable().optional(),
  sourceTitle: z6.string().max(300).nullable().optional(),
  sourceDescription: z6.string().max(500).nullable().optional(),
  sourceSite: z6.string().max(120).nullable().optional(),
  tags: z6.array(z6.string().max(40)).max(20),
  topicId: z6.number().int().positive().nullable().optional(),
  readLater: z6.boolean()
});
function toInput(input) {
  let sourceUrl = null;
  if (input.sourceUrl) {
    try {
      sourceUrl = parsePublicUrl(input.sourceUrl).toString();
    } catch (error) {
      throw new TRPCError4({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Ge\xE7erli bir ba\u011Flant\u0131 de\u011Fil." });
    }
  }
  return { ...input, content: input.content, sourceUrl };
}
var wallCall = async (work) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof WallError) throw new TRPCError4({ code: error.message === "Kay\u0131t bulunamad\u0131." ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
    throw error;
  }
};
var wallRouter = router({
  list: protectedProcedure.input(z6.object({ filter: z6.enum(["all", "unread", "pinned"]).default("all"), tag: z6.string().max(40).nullable().optional(), topicId: z6.number().int().positive().nullable().optional(), q: z6.string().max(100).nullable().optional(), cursor: z6.object({ postedAt: z6.coerce.date(), id: z6.number().int().positive() }).nullable().optional() })).query(({ ctx, input }) => listWallPosts(ctx.user.id, input)),
  summary: protectedProcedure.query(({ ctx }) => wallSummary(ctx.user.id)),
  get: protectedProcedure.input(z6.object({ id: z6.number().int().positive() })).query(async ({ ctx, input }) => {
    const post = await getWallPost(ctx.user.id, input.id);
    if (!post) throw new TRPCError4({ code: "NOT_FOUND", message: "Kay\u0131t bulunamad\u0131." });
    return post;
  }),
  create: protectedProcedure.input(postInput).mutation(({ ctx, input }) => wallCall(() => createWallPost(ctx.user.id, toInput(input)))),
  update: protectedProcedure.input(postInput.extend({ id: z6.number().int().positive() })).mutation(({ ctx, input }) => wallCall(() => updateWallPost(ctx.user.id, input.id, toInput(input)))),
  delete: protectedProcedure.input(z6.object({ id: z6.number().int().positive() })).mutation(async ({ ctx, input }) => ({ ok: await deleteWallPost(ctx.user.id, input.id) })),
  setFlags: protectedProcedure.input(z6.object({ id: z6.number().int().positive(), read: z6.boolean().optional(), pinned: z6.boolean().optional(), readLater: z6.boolean().optional() })).mutation(async ({ ctx, input }) => {
    if (!await setWallPostFlags(ctx.user.id, input.id, input)) throw new TRPCError4({ code: "NOT_FOUND", message: "Kay\u0131t bulunamad\u0131." });
    return { ok: true };
  }),
  // Bağlantı önizlemesi: dakikada 20 istek (sunucunun dışarıya istek atmasını kötüye kullanmayı sınırlar).
  linkPreview: protectedProcedure.input(z6.object({ url: z6.string().trim().min(4).max(1e3) })).mutation(async ({ ctx, input }) => {
    try {
      checkRateLimit(`wall-link-preview:${ctx.user.id}`, 20, 6e4);
      return await fetchLinkPreview(input.url);
    } catch (error) {
      if (error instanceof LinkPreviewError) throw new TRPCError4({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  })
});

// server/routers/orgCases.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z8 } from "zod";

// server/org/orgAccess.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z7 } from "zod";
var notFound = (message = "Bulunamad\u0131.") => new TRPCError5({ code: "NOT_FOUND", message });
function orgProcedure(minRole, options = {}) {
  return protectedProcedure.input(z7.object({ orgId: z7.number().int().positive() })).use(async ({ ctx, input, next, type }) => {
    const membership = await getActiveMembership(ctx.user.id, input.orgId);
    if (!membership || !hasRole(membership.role, minRole)) throw notFound("Kurum bulunamad\u0131.");
    if (type === "mutation" && !options.allowInactive && membership.state && membership.state !== "active") {
      throw new TRPCError5({ code: "FORBIDDEN", message: membership.state === "expired" ? "Kurum \xFCyeli\u011Finin s\xFCresi doldu; panel salt okunur. Yenilemek i\xE7in platform y\xF6neticisiyle g\xF6r\xFC\u015F\xFCn." : "Kurum \xFCyeli\u011Fi hen\xFCz ba\u015Flamad\u0131." });
    }
    return next({ ctx: { ...ctx, membership } });
  });
}
async function assertCanViewStudent(ctx, studentUserId) {
  const { orgId, role } = ctx.membership;
  if (!await isActiveStudent(orgId, studentUserId)) throw notFound("\xD6\u011Frenci bulunamad\u0131.");
  if (seesAllStudents(role)) return;
  if (role === "teacher" && await hasActiveAssignment(orgId, ctx.user.id, studentUserId)) return;
  throw notFound("\xD6\u011Frenci bulunamad\u0131.");
}
function audit(ctx, action, target, metadata) {
  return writeAudit({ orgId: ctx.membership.orgId, actorUserId: ctx.user.id, action, targetType: target?.type, targetId: target?.id, metadata });
}

// server/routers/orgCases.ts
var id = z8.number().int().positive();
var examKind = z8.enum(EXAM_KINDS);
var planItem = z8.object({ subject: z8.string().trim().min(1).max(80), topicId: id.nullable(), topic: z8.string().trim().min(1).max(180), minutes: z8.number().int().min(10).max(180), targetQuestions: z8.number().int().min(0).max(200).optional(), bookId: z8.string().max(120).optional(), bookContentId: id.optional(), pages: z8.string().max(80).optional() });
var planInput = z8.object({ caseId: id, items: z8.array(planItem).min(1).max(14), from: z8.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z8.number().int().min(1).max(14) });
var dayOf = (value) => /* @__PURE__ */ new Date(`${value}T12:00:00`);
async function wrap(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CaseError) throw new TRPCError6({ code: error.code, message: error.message });
    throw error;
  }
}
async function requireEnabled(orgId) {
  if (!await isCasesEnabled(orgId)) throw new TRPCError6({ code: "FORBIDDEN", message: "Akademik takip dosyalar\u0131 bu kurumda a\xE7\u0131k de\u011Fil." });
}
async function caseFor(ctx, caseId) {
  const row = await wrap(() => getCaseRow(ctx.membership.orgId, caseId));
  await assertCanViewStudent(ctx, row.studentUserId);
  return row;
}
async function visibleStudentIds(ctx) {
  if (seesAllStudents(ctx.membership.role)) return void 0;
  return teacherStudentIds(ctx.membership.orgId, ctx.user.id);
}
var orgCasesRouter = router({
  status: orgProcedure("teacher").query(async ({ ctx }) => ({ enabled: await isCasesEnabled(ctx.membership.orgId), title: ACADEMIC_REVIEW_TITLE, text: ACADEMIC_REVIEW_TEXT, confidenceText: CONFIDENCE_TEXT })),
  setEnabled: orgProcedure("admin").input(z8.object({ enabled: z8.boolean() })).mutation(async ({ ctx, input }) => {
    await setCasesEnabled(ctx.membership.orgId, input.enabled);
    await audit(ctx, "cases.enable", { type: "organization", id: ctx.membership.orgId }, { enabled: input.enabled });
    return { enabled: input.enabled };
  }),
  /** Kural önerileri: düşüş eğilimi ya da "inceleme için yetersiz" (dosyası olmayanlar ve açık dosyası olanlar). */
  signals: orgProcedure("teacher").query(async ({ ctx }) => {
    await requireEnabled(ctx.membership.orgId);
    const scoped = await visibleStudentIds(ctx);
    const students = scoped ?? (await listMembers(ctx.membership.orgId, { role: "student" })).map((member) => member.userId);
    const names = new Map((await listMembers(ctx.membership.orgId, { role: "student" })).map((member) => [member.userId, member.name]));
    return (await listSignals(ctx.membership.orgId, students)).map((signal) => ({ ...signal, studentName: names.get(signal.studentUserId) ?? "\xD6\u011Frenci" }));
  }),
  queue: orgProcedure("teacher").input(z8.object({ status: z8.enum(["open", "in_progress", "evaluating", "closed"]).optional() })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    return listCases(ctx.membership.orgId, { studentUserIds: await visibleStudentIds(ctx), status: input.status });
  }),
  open: orgProcedure("teacher").input(z8.object({ studentUserId: id, ruleKey: z8.enum(["trend_decline", "manual"]), examKind: examKind.nullable() })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await assertCanViewStudent(ctx, input.studentUserId);
    const result = await wrap(() => openCase({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, ruleKey: input.ruleKey, examKind: input.examKind, actorUserId: ctx.user.id }));
    if (result.created) await audit(ctx, "case.open", { type: "case", id: result.caseId }, { studentUserId: input.studentUserId, ruleKey: input.ruleKey, examKind: input.examKind });
    return result;
  }),
  get: orgProcedure("teacher").input(z8.object({ caseId: id })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    const detail = await wrap(() => getCaseDetail(ctx.membership.orgId, input.caseId));
    const responsible = await canReadNotes(ctx.membership.orgId, ctx.user.id, row.studentUserId);
    return { ...detail, notes: filterPrivateNotes(detail.notes, ctx.user.id, responsible), canReadNotes: responsible };
  }),
  addAction: orgProcedure("teacher").input(z8.object({ caseId: id, type: z8.enum(["review", "meeting"]), note: z8.string().trim().max(2e3).optional(), meetingAt: z8.string().max(40).optional(), place: z8.string().trim().max(120).optional(), idempotencyKey: z8.string().min(8).max(64) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const payload = input.type === "meeting" ? { meetingAt: input.meetingAt ?? null, place: input.place ?? null } : {};
    const result = await wrap(() => addCaseAction({ orgId: ctx.membership.orgId, caseId: input.caseId, type: input.type, payload, actorUserId: ctx.user.id, idempotencyKey: input.idempotencyKey, status: input.type === "meeting" ? "planned" : "done" }));
    if (input.note) await addCaseNote({ orgId: ctx.membership.orgId, caseId: input.caseId, authorUserId: ctx.user.id, body: input.note, visibility: "staff" });
    if (result.created) await audit(ctx, `case.${input.type}`, { type: "case", id: input.caseId }, { actionId: result.actionId });
    return result;
  }),
  addNote: orgProcedure("teacher").input(z8.object({ caseId: id, body: z8.string().trim().min(1).max(4e3), visibility: z8.enum(["staff", "student"]) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const noteId = await wrap(() => addCaseNote({ orgId: ctx.membership.orgId, caseId: input.caseId, authorUserId: ctx.user.id, body: input.body, visibility: input.visibility }));
    await audit(ctx, "case.note", { type: "case", id: input.caseId }, { noteId, visibility: input.visibility });
    return { noteId };
  }),
  suggestResources: orgProcedure("teacher").input(z8.object({ caseId: id, topicIds: z8.array(id).min(1).max(10) })).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    return suggestOwnedResources(row.studentUserId, input.topicIds);
  }),
  previewPlan: orgProcedure("teacher").input(planInput).query(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    const row = await caseFor(ctx, input.caseId);
    const placements = await previewCasePlan(row.studentUserId, input.items, dayOf(input.from), input.days);
    return placements.map((placement) => placement.date ? { itemIndex: placement.index, date: placement.date, start: placement.start } : { itemIndex: placement.index, date: null, reason: placement.reason });
  }),
  assignPlan: orgProcedure("teacher").input(planInput.extend({ idempotencyKey: z8.string().min(8).max(64) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const result = await wrap(() => assignCasePlan({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, items: input.items, from: dayOf(input.from), days: input.days, idempotencyKey: input.idempotencyKey }));
    if (!result.duplicate) await audit(ctx, "case.plan", { type: "case", id: input.caseId }, { actionId: result.actionId, sessions: result.sessionIds.length, skipped: result.skipped.length });
    return result;
  }),
  evaluate: orgProcedure("teacher").input(z8.object({ caseId: id, outcome: z8.enum(["completed", "ongoing", "reassess"]), note: z8.string().trim().max(2e3).optional() })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    const result = await wrap(() => evaluateCase({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, outcome: input.outcome, note: input.note }));
    await audit(ctx, input.outcome === "completed" ? "case.close" : "case.evaluate", { type: "case", id: input.caseId }, { outcome: input.outcome, limitedEvidence: result.limitedEvidence });
    return result;
  }),
  reopen: orgProcedure("teacher").input(z8.object({ caseId: id, reason: z8.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
    await requireEnabled(ctx.membership.orgId);
    await caseFor(ctx, input.caseId);
    await wrap(() => reopenCase({ orgId: ctx.membership.orgId, caseId: input.caseId, actorUserId: ctx.user.id, reason: input.reason }));
    await audit(ctx, "case.reopen", { type: "case", id: input.caseId });
    return { ok: true };
  }),
  /** Yönetici özeti: yalnızca sayılar; not ya da kanıt içeriği yok. */
  summary: orgProcedure("coordinator").query(async ({ ctx }) => {
    await requireEnabled(ctx.membership.orgId);
    return caseSummary(ctx.membership.orgId);
  })
});
var studyTasksRouter = router({
  thisWeek: protectedProcedure.query(({ ctx }) => listStudentAssignedTasks(ctx.user.id)),
  feedback: protectedProcedure.input(z8.object({ sessionId: id, feedback: z8.enum(["done", "struggled", "needs_review"]) })).mutation(async ({ ctx, input }) => {
    if (!await setStudentFeedback(ctx.user.id, input.sessionId, input.feedback)) throw new TRPCError6({ code: "NOT_FOUND", message: "G\xF6rev bulunamad\u0131." });
    return { ok: true };
  })
});

// server/routers/questions.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { z as z9 } from "zod";

// server/notes/questionAi.ts
async function suggestQuestionDetails(input, invoke = invokeLLM) {
  if (!input.imageDataUrl && !input.stuckPoint?.trim()) throw new Error("\xD6nerilecek bir \u015Fey yok: foto\u011Fraf ya da a\xE7\u0131klama ekle.");
  const topicList = input.topics.map((topic2) => `${topic2.id}|${topic2.subject}|${topic2.unit}|${topic2.topic}`).join("\n");
  const errorList = ERROR_TYPE_KEYS.map((key) => `${key} = ${ERROR_TYPES[key].label}`).join("; ");
  const system = [
    `${examStudentPhrase(input.track ?? "YKS")} \xE7\xF6zemedi\u011Fi soruyu s\u0131n\u0131fland\u0131ran yard\u0131mc\u0131s\u0131n. T\xFCrk\xE7e \xE7al\u0131\u015F.`,
    "1) G\xF6rselde soru varsa metnini oldu\u011Fu gibi \xE7\u0131kar (matemati\u011Fi d\xFCz yaz\u0131yla, \xF6r. x^2). G\xF6rsel yoksa ocrText bo\u015F string.",
    "2) Sorunun konusunu YALNIZCA a\u015Fa\u011F\u0131daki listeden se\xE7 ve topicId olarak o sat\u0131r\u0131n numaras\u0131n\u0131 yaz. Emin de\u011Filsen topicId = 0.",
    `3) Zorluk: ${DIFFICULTY_KEYS.join(", ")} (emin de\u011Filsen medium).`,
    `4) \xD6\u011Frencinin tak\u0131ld\u0131\u011F\u0131 yeri anlatan metinden OLASI hata t\xFCr\xFCn\xFC se\xE7: ${errorList}. Metin yoksa ya da a\xE7\u0131k de\u011Filse "none". Te\u015Fhis koyma; yaln\u0131zca \xF6\u011Frencinin s\xF6yledi\u011Fine dayan.`,
    "Konu listesi (id|ders|\xFCnite|konu):",
    topicList
  ].join("\n");
  const userText = input.stuckPoint?.trim() ? `\xD6\u011Frencinin tak\u0131ld\u0131\u011F\u0131 yer: "${input.stuckPoint.trim().slice(0, 1500)}"` : "\xD6\u011Frenci tak\u0131ld\u0131\u011F\u0131 yeri yazmad\u0131.";
  const response = await invoke({
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text", text: userText }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }] : userText }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ocrText: { type: "string" },
            topicId: { type: "integer" },
            difficulty: { type: "string", enum: [...DIFFICULTY_KEYS] },
            errorType: { type: "string", enum: [...ERROR_TYPE_KEYS, "none"] }
          },
          required: ["ocrText", "topicId", "difficulty", "errorType"],
          additionalProperties: false
        }
      }
    }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("AI yan\u0131t\u0131 bo\u015F d\xF6nd\xFC.");
  const parsed = JSON.parse(jsonText);
  const topic = input.topics.find((item) => item.id === Number(parsed.topicId)) ?? null;
  return {
    ocrText: String(parsed.ocrText ?? "").trim().slice(0, 5e3),
    topicId: topic?.id ?? null,
    subject: topic?.subject ?? null,
    difficulty: DIFFICULTY_KEYS.includes(String(parsed.difficulty)) ? parsed.difficulty : null,
    errorType: ERROR_TYPE_KEYS.includes(String(parsed.errorType)) ? parsed.errorType : null
  };
}

// shared/solveRouting.ts
var MODEL_TIERS = ["light", "medium", "strong"];
var NUMERIC_SUBJECT = /matematik|geometri|fizik|kimya/;
var isNumericSubject = (subject2) => NUMERIC_SUBJECT.test((subject2 ?? "").toLocaleLowerCase("tr-TR"));
function chooseSolveTier(signals) {
  if (signals.escalate) return "strong";
  const numeric = isNumericSubject(signals.subject);
  let score = signals.difficulty === "easy" ? 0 : signals.difficulty === "hard" ? 2 : 1;
  if (numeric) score += 1;
  if (numeric && signals.exam === "AYT") score += 1;
  if (signals.lastResult === "failed") score += 1;
  if (score >= 3) return "strong";
  if (score === 0 && !numeric) return "light";
  return "medium";
}
var nextTier = (tier) => tier === "light" ? "medium" : tier === "medium" ? "strong" : null;
var atLeastMedium = (tier) => tier === "light" ? "medium" : tier;
function tierOfTag(tag) {
  const tier = tag?.split(":")[0];
  return MODEL_TIERS.includes(tier) ? tier : null;
}

// server/notes/questionSolver.ts
function subjectGuidance(subject2) {
  const name2 = (subject2 ?? "").toLocaleLowerCase("tr-TR");
  if (/geometri/.test(name2)) return "\u015Eekildeki verileri \xF6nce listele, hangi teoremi/ba\u011F\u0131nt\u0131y\u0131 neden kulland\u0131\u011F\u0131n\u0131 s\xF6yle, en sonda sonucu sa\u011Fla.";
  if (/matematik/.test(name2)) return "Bilinmeyeni ve verilenleri yaz, denklemi kur, her i\u015Flemin nedenini s\xF6yle; en sonda buldu\u011Fun de\u011Feri yerine koyarak sa\u011Fla.";
  if (/fizik/.test(name2)) return "Verilenleri birimleriyle yaz, do\u011Fru form\xFCl\xFC NEDEN se\xE7ti\u011Fini s\xF6yle, birim kontrol\xFC yap.";
  if (/kimya/.test(name2)) return "Mol / k\xFCtle / deri\u015Fim ili\u015Fkisini kur, gerekiyorsa denklemi denkle\u015Ftir, birim ve korunum kontrol\xFC yap.";
  if (/biyoloji/.test(name2)) return "Sorunun hangi kavram\u0131 \xF6l\xE7t\xFC\u011F\xFCn\xFC s\xF6yle, do\u011Fru se\xE7ene\u011Fin gerek\xE7esini ve en g\xFC\xE7l\xFC \xE7eldiricinin neden yanl\u0131\u015F oldu\u011Funu a\xE7\u0131kla.";
  if (subject2) return "Sorunun neyi \xF6l\xE7t\xFC\u011F\xFCn\xFC s\xF6yle, metinden/bilgiden kan\u0131tla do\u011Fru se\xE7ene\u011Fe ula\u015F ve en g\xFC\xE7l\xFC \xE7eldiricinin neden yanl\u0131\u015F oldu\u011Funu a\xE7\u0131kla.";
  return "Sorunun t\xFCr\xFCn\xFC belirle ve ona uygun y\xF6ntemle \xE7\xF6z; say\u0131sal ise sa\u011Fla, s\xF6zel ise \xE7eldiricileri a\xE7\u0131kla.";
}
async function solveQuestion(input, invoke = invokeLLM, options = {}) {
  const questionText = input.ocrText?.trim();
  if (!input.imageDataUrl && !questionText) throw new Error("\xC7\xF6z\xFClecek soru yok: kartta soru foto\u011Fraf\u0131 olmal\u0131.");
  const system = [
    `${examStudentPhrase(input.track ?? "YKS")} \xE7\xF6zemedi\u011Fi soruyu sab\u0131rl\u0131 bir \xF6\u011Fretmen gibi ADIM ADIM T\xFCrk\xE7e \xE7\xF6z\xFCyorsun. Ama\xE7 cevab\u0131 de\u011Fil y\xF6ntemi \xF6\u011Fretmek.`,
    examPromptContext(input.track ?? "YKS"),
    `Ders: ${input.subject ?? "belirtilmemi\u015F"}${input.topic ? ` \xB7 Konu: ${input.topic}` : ""}. ${subjectGuidance(input.subject)}`,
    "Kurallar:",
    "- method: bu soru tipinde kullan\u0131lacak y\xF6ntemi tek c\xFCmleyle s\xF6yle.",
    "- steps: 2\u20138 ad\u0131m. work = o ad\u0131mda yap\u0131lan i\u015Flem (matemati\u011Fi d\xFCz yaz\u0131yla, \xF6r. x^2, \u221A, \u03C0); why = bunu NEDEN yapt\u0131\u011F\u0131n, tek k\u0131sa c\xFCmle.",
    "- answer: k\u0131sa sonu\xE7 (\xE7oktan se\xE7meliyse \u015F\u0131k + de\u011Fer).",
    "- check: sa\u011Flama ya da kontrol, tek c\xFCmle.",
    "- hint: cevab\u0131 ve sonucu ELE VERMEYEN, \xF6\u011Frenciyi do\u011Fru y\xF6nteme y\xF6nelten tek c\xFCmle ipucu.",
    "- \xD6\u011Frenci tak\u0131ld\u0131\u011F\u0131 yeri yazd\u0131ysa o ad\u0131m\u0131 \xF6zellikle a\xE7\u0131k anlat.",
    "- Soru okunam\u0131yorsa ya da eksikse uydurma: steps i\xE7ine tek ad\u0131m olarak neyin okunamad\u0131\u011F\u0131n\u0131 yaz, answer bo\u015F string.",
    "- verified: sa\u011Flama tuttuysa ve soruyu do\u011Fru okudu\u011Fundan eminsen true; \u015F\xFCphen varsa d\xFCr\xFCst\xE7e false."
  ].join("\n");
  const userText = [
    questionText ? `Sorunun metni (OCR, hatal\u0131 olabilir; g\xF6rsel varsa g\xF6rsel esast\u0131r):
${questionText.slice(0, 4e3)}` : null,
    input.stuckPoint?.trim() ? `\xD6\u011Frencinin tak\u0131ld\u0131\u011F\u0131 yer: "${input.stuckPoint.trim().slice(0, 1500)}"` : null
  ].filter(Boolean).join("\n\n") || "Soruyu g\xF6rselden oku ve \xE7\xF6z.";
  const response = await invoke({
    ...options.model ? { model: options.model } : {},
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text", text: userText }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }] : userText }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_solution",
        strict: true,
        schema: {
          type: "object",
          properties: {
            method: { type: "string" },
            steps: { type: "array", items: { type: "object", properties: { work: { type: "string" }, why: { type: "string" } }, required: ["work", "why"], additionalProperties: false } },
            answer: { type: "string" },
            check: { type: "string" },
            hint: { type: "string" },
            verified: { type: "boolean" }
          },
          required: ["method", "steps", "answer", "check", "hint", "verified"],
          additionalProperties: false
        }
      }
    }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("AI yan\u0131t\u0131 bo\u015F d\xF6nd\xFC.");
  const solution = parseAiSolution(jsonText.replace(/```json|```/g, "").trim());
  if (!solution) throw new Error("AI \xE7\xF6z\xFCm\xFC okunamad\u0131.");
  return solution;
}
var worthEscalating = (error) => !(error instanceof LlmUnavailableError) || error.reason === "quota" || error.status === 404;
async function solveWithRouting(input, tier, invoke = invokeLLM, pickModel = modelForTier) {
  const model = pickModel(tier);
  const upper = nextTier(tier);
  const upperModel = upper ? pickModel(upper) : void 0;
  const canEscalate = upper !== null && upperModel !== model;
  let first = null;
  try {
    first = await solveQuestion(input, invoke, { model });
  } catch (error) {
    if (!worthEscalating(error)) throw error;
    if (!canEscalate) {
      const fallbackModel = pickModel("medium");
      if (tier === "medium" || fallbackModel === model) throw error;
      console.warn(`[Questions] ${tier} solve failed, falling back to medium:`, error instanceof Error ? error.message : error);
      return { solution: await solveQuestion(input, invoke, { model: fallbackModel }), tier: "medium", model: fallbackModel, escalated: false };
    }
    console.warn(`[Questions] ${tier} solve failed, escalating:`, error instanceof Error ? error.message : error);
  }
  const confident = first !== null && Boolean(first.answer) && first.verified !== false;
  if (first && (confident || !canEscalate)) return { solution: first, tier, model, escalated: false };
  try {
    return { solution: await solveQuestion(input, invoke, { model: upperModel }), tier: upper, model: upperModel, escalated: true };
  } catch (error) {
    if (first) return { solution: first, tier, model, escalated: false };
    throw error;
  }
}

// server/notes/similarQuestion.ts
async function generateSimilarQuestion(input, invoke = invokeLLM, options = {}) {
  const questionText = input.ocrText?.trim();
  if (!input.imageDataUrl && !questionText) throw new Error("Benzer soru i\xE7in kartta soru foto\u011Fraf\u0131 olmal\u0131.");
  const track = input.track ?? "YKS";
  const optionCount = optionCountOf(track);
  const letters = OPTION_LETTERS.slice(0, optionCount);
  const style = EXAM_TRACK_DEFS[track].questionStyle;
  const system = [
    `${examStudentPhrase(track)} \xE7\xF6zemedi\u011Fi soruya BENZER yeni bir al\u0131\u015Ft\u0131rma sorusu yaz\u0131yorsun (T\xFCrk\xE7e).`,
    examPromptContext(track),
    `Ders: ${input.subject ?? "belirtilmemi\u015F"}${input.topic ? ` \xB7 Konu: ${input.topic}` : ""}.`,
    "Kurallar:",
    "- Ayn\u0131 kazan\u0131m\u0131 ve ayn\u0131 \xE7\xF6z\xFCm y\xF6ntemini \xF6l\xE7s\xFCn; say\u0131lar, isimler ve ba\u011Flam FARKLI olsun. Orijinal soruyu kopyalama.",
    `- Zorluk orijinale yak\u0131n olsun; ${style}, tek do\u011Fru cevapl\u0131, ${optionCount} \u015F\u0131kl\u0131 (${letters[0]}\u2013${letters[optionCount - 1]}).`,
    "- question: soru metni (matemati\u011Fi d\xFCz yaz\u0131yla, \xF6r. x^2, \u221A, \u03C0). \u015Eekil gerekiyorsa \u015Fekli kelimelerle eksiksiz tarif et.",
    `- options: tam ${optionCount} \u015F\u0131k, harfsiz (yaln\u0131zca \u015F\u0131k i\xE7eri\u011Fi). \xC7eldiriciler tipik \xF6\u011Frenci hatalar\u0131ndan gelsin.`,
    `- answer: do\u011Fru \u015F\u0131kk\u0131n harfi (${letters.join(", ")}). Cevab\u0131 yazmadan \xF6nce soruyu kendin \xE7\xF6z\xFCp do\u011Frula.`,
    `- steps: 2\u20136 ad\u0131m \xE7\xF6z\xFCm; work = i\u015Flem, why = neden. ${subjectGuidance(input.subject)}`,
    "- hint: cevab\u0131 ele vermeyen tek c\xFCmle ipucu."
  ].join("\n");
  const userText = [
    questionText ? `Orijinal soru (OCR, hatal\u0131 olabilir; g\xF6rsel varsa g\xF6rsel esast\u0131r):
${questionText.slice(0, 4e3)}` : null,
    input.solution ? `Orijinal sorunun \xE7\xF6z\xFCm y\xF6ntemi: ${input.solution.method}
${input.solution.steps.map((step, index2) => `${index2 + 1}) ${step.work}`).join("\n")}` : null,
    input.stuckPoint?.trim() ? `\xD6\u011Frencinin tak\u0131ld\u0131\u011F\u0131 yer: "${input.stuckPoint.trim().slice(0, 1e3)}" \u2014 yeni soru bu ad\u0131m\u0131 da \xE7al\u0131\u015Ft\u0131rs\u0131n.` : null
  ].filter(Boolean).join("\n\n") || "Orijinal soruyu g\xF6rselden oku ve ona benzer yeni bir soru yaz.";
  const response = await invoke({
    ...options.model ? { model: options.model } : {},
    messages: [
      { role: "system", content: system },
      { role: "user", content: input.imageDataUrl ? [{ type: "text", text: userText }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }] : userText }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "similar_question",
        strict: true,
        schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer: { type: "string", enum: letters },
            steps: { type: "array", items: { type: "object", properties: { work: { type: "string" }, why: { type: "string" } }, required: ["work", "why"], additionalProperties: false } },
            hint: { type: "string" }
          },
          required: ["question", "options", "answer", "steps", "hint"],
          additionalProperties: false
        }
      }
    }
  });
  const raw = response.choices[0]?.message?.content;
  const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
  if (!jsonText) throw new Error("AI yan\u0131t\u0131 bo\u015F d\xF6nd\xFC.");
  const similar = parseSimilarQuestion(jsonText.replace(/```json|```/g, "").trim(), optionCount);
  if (!similar) throw new Error("Benzer soru okunamad\u0131.");
  return similar;
}

// server/routers/questions.ts
async function userFacing2(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoteError || error instanceof AttachmentError || error instanceof PlanTaskError) throw new TRPCError7({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
var id2 = z9.number().int().positive();
async function loadQuestionForAi(userId, questionId) {
  const context = await getSolveContext(userId, questionId);
  let imageDataUrl = null;
  if (context.questionImageId) {
    const attachment = await getAttachmentStorage().get(userId, context.questionImageId);
    if (attachment?.kind === "image") imageDataUrl = `data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`;
  }
  if (!imageDataUrl && !context.ocrText?.trim()) throw new NoteError("Bu kartta soru foto\u011Fraf\u0131 yok.");
  const { examTrack: track } = await getStudentProfile(userId);
  return { context, imageDataUrl, track };
}
var subjectScope = z9.string().max(80).nullable().optional();
var optionalId2 = id2.nullable().optional();
var fields = {
  subject: z9.string().max(80).nullable().optional(),
  topicId: optionalId2,
  stuckPoint: z9.string().max(4e3).nullable().optional(),
  solutionText: z9.string().max(4e3).nullable().optional(),
  solutionImageId: optionalId2,
  errorType: z9.enum(ERROR_TYPE_KEYS).nullable().optional(),
  errorTypeSource: z9.enum(["student", "ai"]).nullable().optional(),
  difficulty: z9.enum(DIFFICULTY_KEYS).nullable().optional()
};
var questionsRouter = router({
  list: protectedProcedure.input(z9.object({ status: z9.enum(["open", "mastered", "all"]).optional(), due: z9.boolean().optional(), subject: subjectScope, topicId: optionalId2, cursor: optionalId2, limit: z9.number().int().min(1).max(100).optional() })).query(({ ctx, input }) => userFacing2(() => listQuestions(ctx.user.id, input))),
  get: protectedProcedure.input(z9.object({ id: id2 })).query(async ({ ctx, input }) => {
    const question = await getQuestion(ctx.user.id, input.id);
    if (!question) throw new TRPCError7({ code: "NOT_FOUND", message: "Soru bulunamad\u0131." });
    return question;
  }),
  byNote: protectedProcedure.input(z9.object({ noteId: id2 })).query(({ ctx, input }) => userFacing2(async () => ({ id: await getQuestionIdByNote(ctx.user.id, input.noteId) }))),
  create: protectedProcedure.input(z9.object({
    clientId: z9.string().min(8).max(40).regex(/^[A-Za-z0-9_-]+$/),
    questionImageId: optionalId2,
    questionOcrText: z9.string().max(5e3).nullable().optional(),
    voiceAttachmentId: optionalId2,
    voiceDuration: z9.number().min(0).max(700).nullable().optional(),
    aiTopicId: optionalId2,
    bookId: z9.string().max(120).nullable().optional(),
    studySessionId: optionalId2,
    ...fields
  })).mutation(({ ctx, input }) => userFacing2(() => createQuestion(ctx.user.id, input))),
  update: protectedProcedure.input(z9.object({ id: id2, ...fields })).mutation(({ ctx, input }) => userFacing2(() => {
    const { id: questionId, ...patch } = input;
    return updateQuestion(ctx.user.id, questionId, patch);
  })),
  delete: protectedProcedure.input(z9.object({ id: id2 })).mutation(({ ctx, input }) => userFacing2(() => deleteQuestion(ctx.user.id, input.id))),
  attempt: protectedProcedure.input(z9.object({ id: id2, result: z9.enum(ATTEMPT_RESULT_KEYS), sawSolution: z9.boolean(), hintLevel: z9.number().int().min(HINT_LEVELS.none).max(HINT_LEVELS.solution).optional(), seconds: z9.number().min(0).max(7200).nullable().optional() })).mutation(({ ctx, input }) => userFacing2(() => recordAttempt(ctx.user.id, input.id, input))),
  // subject: verilmezse tüm dersler, null ise derssiz ("Genel"), metinse o dersin defteri.
  summary: protectedProcedure.input(z9.object({ subject: subjectScope }).optional()).query(({ ctx, input }) => userFacing2(() => getReviewSummary(ctx.user.id, input?.subject))),
  errorMap: protectedProcedure.input(z9.object({ days: z9.number().int().min(1).max(365).nullable(), subject: subjectScope })).query(({ ctx, input }) => userFacing2(() => getErrorMap(ctx.user.id, input.days, input.subject))),
  /** Ders sekmeleri: ders başına not / soru / tekrar bekleyen sayısı. */
  subjectSummary: protectedProcedure.query(({ ctx }) => userFacing2(() => getSubjectSummary(ctx.user.id))),
  /** Notu ya da soru kartını bir ders defterine koy (null: "Genel"e döndür). */
  moveToSubject: protectedProcedure.input(z9.object({ noteId: id2, subject: z9.string().trim().min(1).max(80).nullable() })).mutation(({ ctx, input }) => userFacing2(() => moveNoteToSubject(ctx.user.id, input.noteId, input.subject))),
  addReviewTask: protectedProcedure.mutation(({ ctx }) => userFacing2(() => addReviewTask(ctx.user.id))),
  finishReview: protectedProcedure.input(z9.object({ minutes: z9.number().min(0).max(600), solved: z9.number().int().min(0).max(100), partial: z9.number().int().min(0).max(100), failed: z9.number().int().min(0).max(100) })).mutation(({ ctx, input }) => userFacing2(() => finishReviewSession(ctx.user.id, input))),
  // ✨ Adım adım çöz: kartı AI ile çözer ve karta kaydeder (AI not araçları kotasından sayılır).
  // İstemci kayıtlı çözümü `get` ile zaten alır; bu uç yalnızca ilk çözüm ya da "Yeniden çöz" için çağrılır.
  // Model kademesi kartın zorluk/ders/sınav sinyallerinden seçilir; `escalate` = öğrenci "daha güçlü modelle çöz" dedi.
  solve: metredFeatureProcedure("NOTE_AI").input(z9.object({ id: id2, escalate: z9.boolean().optional() })).mutation(({ ctx, input }) => userFacing2(async () => {
    const { context, imageDataUrl, track } = await loadQuestionForAi(ctx.user.id, input.id);
    const tier = chooseSolveTier({ difficulty: context.difficulty, subject: context.subject, exam: context.exam, lastResult: context.lastResult, escalate: input.escalate });
    let routed;
    try {
      routed = await solveWithRouting({ imageDataUrl, ocrText: context.ocrText, stuckPoint: context.stuckPoint, subject: context.subject, topic: context.topic, track }, tier);
    } catch (error) {
      console.warn("[Questions] solve failed:", error instanceof Error ? error.message : error);
      throw new NoteError(llmUnavailableMessage(error) ?? "\xC7\xF6z\xFCm \u015Fu an haz\u0131rlanamad\u0131. Biraz sonra tekrar dene.");
    }
    console.info("[Questions] solve", { chosen: tier, tier: routed.tier, model: routed.model, escalated: routed.escalated, requested: Boolean(input.escalate) });
    const tag = `${routed.tier}:${routed.model ?? "default"}${routed.escalated ? "\u2191" : ""}`.slice(0, 100);
    return saveAiSolution(ctx.user.id, input.id, routed.solution, tag);
  })),
  // 🔁 Benzer soru: aynı yöntemi ölçen yeni alıştırma (YKS 5, LGS 4 şıklı); kaydedilmez, her üretim AI not hakkından sayılır.
  similar: metredFeatureProcedure("NOTE_AI").input(z9.object({ id: id2 })).mutation(({ ctx, input }) => userFacing2(async () => {
    const { context, imageDataUrl, track } = await loadQuestionForAi(ctx.user.id, input.id);
    try {
      const tier = atLeastMedium(tierOfTag(context.aiSolutionModel) ?? chooseSolveTier({ difficulty: context.difficulty, subject: context.subject, exam: context.exam, lastResult: context.lastResult }));
      return await generateSimilarQuestion({ imageDataUrl, ocrText: context.ocrText, stuckPoint: context.stuckPoint, subject: context.subject, topic: context.topic, solution: context.aiSolution, track }, void 0, { model: modelForTier(tier) });
    } catch (error) {
      console.warn("[Questions] similar failed:", error instanceof Error ? error.message : error);
      throw new NoteError(llmUnavailableMessage(error) ?? "Benzer soru \u015Fu an haz\u0131rlanamad\u0131. Biraz sonra tekrar dene.");
    }
  })),
  // ✨ Öner: fotoğrafı okur, müfredattan konu + zorluk + olası hata türü önerir (fotoğraf okuma kotasından sayılır).
  suggest: metredFeatureProcedure("NOTE_OCR").input(z9.object({ attachmentId: optionalId2, stuckPoint: z9.string().max(4e3).nullable().optional() })).mutation(({ ctx, input }) => userFacing2(async () => {
    let imageDataUrl = null;
    if (input.attachmentId) {
      const attachment = await getAttachmentStorage().get(ctx.user.id, input.attachmentId);
      if (!attachment || attachment.kind !== "image") throw new NoteError("Foto\u011Fraf bulunamad\u0131.");
      imageDataUrl = `data:${attachment.mimeType};base64,${attachment.data.toString("base64")}`;
    }
    const { examTrack: track } = await getStudentProfile(ctx.user.id);
    const topics = (await getMatchableTopics(track)).map((topic) => ({ id: topic.id, subject: topic.subject, unit: topic.unit, topic: topic.topic }));
    try {
      const suggestion = await suggestQuestionDetails({ imageDataUrl, stuckPoint: input.stuckPoint ?? null, topics, track });
      if (input.attachmentId && suggestion.ocrText) await getAttachmentStorage().setOcrText(ctx.user.id, input.attachmentId, suggestion.ocrText);
      return suggestion;
    } catch (error) {
      console.warn("[Questions] suggest failed:", error instanceof Error ? error.message : error);
      throw new NoteError(llmUnavailableMessage(error) ?? "\xD6neri \u015Fu an haz\u0131rlanamad\u0131. Ders ve konuyu kendin se\xE7ebilirsin.");
    }
  }))
});

// server/routers/classSchedule.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
import { z as z10 } from "zod";

// server/schedule/scheduleImport.ts
var LESSON_RULES = {
  // 8. sınıf: din kültürü ve İngilizce LGS dersidir; seçmeli/uygulama dersleri plana girmez.
  LGS: [
    [/SE[ÇC]MEL[İI]|REHBERL[İI]K|BEDEN|SPOR|G[ÖO]RSEL SANAT|M[ÜU]Z[İI]K|TEKNOLOJ[İI]|B[İI]L[İI][ŞS][İI]M|PEYGAMBER|KUR.?AN|PROJE/, null],
    [/D[İI]N K[ÜU]LT[ÜU]R|AHLAK/, "Din K\xFClt\xFCr\xFC"],
    [/YABANCI D[İI]L|[İI]NG[İI]L[İI]ZCE/, "\u0130ngilizce"],
    [/[İI]NKILAP|TAR[İI]H/, "\u0130nk\u0131lap Tarihi"],
    [/FEN/, "Fen Bilimleri"],
    [/MATEMAT[İI]K/, "Matematik"],
    [/T[ÜU]RK[ÇC]E/, "T\xFCrk\xE7e"]
  ],
  // KPSS kursu programı: Genel Yetenek–Genel Kültür dersleri.
  KPSS: [
    [/MATEMAT[İI]K|GEOMETR[İI]|SAYISAL/, "Matematik"],
    [/T[ÜU]RK[ÇC]E|S[ÖO]ZEL/, "T\xFCrk\xE7e"],
    [/TAR[İI]H|[İI]NKILAP/, "Tarih"],
    [/CO[ĞG]RAFYA/, "Co\u011Frafya"],
    [/VATANDA[ŞS]LIK|ANAYASA|HUKUK/, "Vatanda\u015Fl\u0131k"],
    [/G[ÜU]NCEL/, "G\xFCncel Bilgiler"]
  ],
  // Önlisans programındaki bölüm dersleri DGS'ye girmez; tanınmayan ad modelin seçimine kalır.
  DGS: [
    [/MATEMAT[İI]K|GEOMETR[İI]|SAYISAL/, "Say\u0131sal"],
    [/T[ÜU]RK[ÇC]E|T[ÜU]RK D[İI]L[İI]|S[ÖO]ZEL|PARAGRAF/, "S\xF6zel"]
  ],
  MEB_AGS: [
    [/E[ĞG][İI]T[İI]M B[İI]L|GEL[İI][ŞS][İI]M|[ÖO][ĞG]RENME PS[İI]KOLOJ|PROGRAM GEL[İI][ŞS]T|[ÖO]L[ÇC]ME|REHBERL[İI]K|S[İI]N[İI]F Y[ÖO]NET|[ÖO]ZEL E[ĞG][İI]T[İI]M|[ÖO][ĞG]RET[İI]M Y[ÖO]NTEM/, "E\u011Fitim Bilimleri"],
    [/MEVZUAT|M[İI]LL[İI] E[ĞG][İI]T[İI]M TEMEL|KANUN/, "Mevzuat"],
    [/MATEMAT[İI]K|SAYISAL/, "Say\u0131sal Yetenek"],
    [/T[ÜU]RK[ÇC]E|S[ÖO]ZEL|PARAGRAF/, "S\xF6zel Yetenek"],
    [/CO[ĞG]RAFYA/, "T\xFCrkiye Co\u011Frafyas\u0131"],
    [/TAR[İI]H|[İI]NKILAP/, "Tarih"]
  ],
  KPSS_A: [
    [/HUKUK|ANAYASA|[İI]DARE/, "Hukuk"],
    [/MAL[İI]YE|VERG[İI]|B[ÜU]T[ÇC]E/, "Maliye"],
    [/MUHASEBE/, "Muhasebe"],
    [/[İI]STAT[İI]ST[İI]K/, "\u0130statistik"],
    [/[ÇC]ALI[ŞS]MA EKONOM/, "\xC7al\u0131\u015Fma Ekonomisi"],
    [/[İI]KT[İI]SAT|EKONOM[İI]/, "\u0130ktisat"],
    [/[İI][ŞS]LETME/, "\u0130\u015Fletme"],
    [/KAMU Y[ÖO]NET/, "Kamu Y\xF6netimi"],
    [/ULUSLARARASI/, "Uluslararas\u0131 \u0130li\u015Fkiler"]
  ],
  YKS: [
    [/D[İI]N K[ÜU]LT[ÜU]R|AHLAK|YABANCI D[İI]L|[İI]NG[İI]L[İI]ZCE|ALMANCA|FRANSIZCA|REHBERL[İI]K|BEDEN|SPOR|G[ÖO]RSEL SANAT|M[ÜU]Z[İI]K|SA[ĞG]LIK B[İI]LG|TRAF[İI]K|PEYGAMBER|KUR.?AN|H[İI]TABET|PROJE/, null],
    [/GEOMETR[İI]/, "Geometri"],
    [/MATEMAT[İI]K/, "Matematik"],
    [/F[İI]Z[İI]K/, "Fizik"],
    [/K[İI]MYA/, "Kimya"],
    [/B[İI]YOLOJ[İI]/, "Biyoloji"],
    [/EDEB[İI]YAT/, "Edebiyat"],
    [/T[ÜU]RK D[İI]L[İI]|T[ÜU]RK[ÇC]E/, "T\xFCrk\xE7e"],
    [/TAR[İI]H|[İI]NKILAP/, "Tarih"],
    [/CO[ĞG]RAFYA/, "Co\u011Frafya"],
    [/FELSEFE|MANTIK|PS[İI]KOLOJ[İI]|SOSYOLOJ[İI]/, "Felsefe"]
  ]
};
function classifyLesson(name2, track = "YKS") {
  const value = name2.toLocaleUpperCase("tr-TR");
  for (const [pattern, subject2] of LESSON_RULES[track]) if (pattern.test(value)) return { known: true, subject: subject2 };
  return { known: false, subject: null };
}
function lessonLabel(name2, code, subject2) {
  const cleaned = name2.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return subject2 ?? (code.trim() || "Ders");
  const titled = cleaned.toLocaleLowerCase("tr-TR").split(" ").map((word) => {
    const index2 = word.search(/[a-zçğıöşü]/);
    return index2 < 0 ? word : word.slice(0, index2) + word[index2].toLocaleUpperCase("tr-TR") + word.slice(index2 + 1);
  }).join(" ");
  return titled.slice(0, 80);
}
var normalizeTime = (value) => {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const time2 = `${match[1].padStart(2, "0")}:${match[2]}`;
  return isValidTime(time2) ? time2 : null;
};
function parseScheduleImport(raw, track = "YKS") {
  const examSubjects = scheduleSubjectsFor(track);
  const value = raw && typeof raw === "object" ? raw : {};
  const periods = (Array.isArray(value.periods) ? value.periods : []).flatMap((item) => {
    const period = item;
    const start = normalizeTime(period?.start);
    const end = normalizeTime(period?.end);
    return start && end && toMinutes(start) < toMinutes(end) ? [{ start, end }] : [];
  }).slice(0, 12);
  let skipped = 0;
  const seen = /* @__PURE__ */ new Set();
  const blocks = [];
  for (const item of Array.isArray(value.lessons) ? value.lessons : []) {
    const lesson = item ?? {};
    const day2 = Number(lesson.day);
    const periodIndex = Number(lesson.period) - 1;
    const period = periods[periodIndex];
    const key = `${day2}-${periodIndex}`;
    if (!Number.isInteger(day2) || day2 < 1 || day2 > 7 || !period || seen.has(key)) {
      skipped += 1;
      continue;
    }
    const name2 = String(lesson.name ?? "").slice(0, 120);
    const code = String(lesson.code ?? "").slice(0, 20);
    if (!name2.trim() && !code.trim()) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    const byName = classifyLesson(name2 || code, track);
    const fromModel = examSubjects.includes(lesson.subject) ? lesson.subject : null;
    const subject2 = byName.known ? byName.subject : fromModel;
    blocks.push({ source: "school", dayOfWeek: day2, startTime: period.start, endTime: period.end, subject: subject2, label: subject2 && !/SE[ÇC]MEL[İI]|HTDE/i.test(name2) ? subject2 : lessonLabel(name2, code, subject2) });
  }
  return { periods, blocks, skipped };
}
var SCHEMA = {
  type: "object",
  properties: {
    periods: { type: "array", items: { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"], additionalProperties: false } },
    lessons: { type: "array", items: { type: "object", properties: { day: { type: "integer" }, period: { type: "integer" }, code: { type: "string" }, name: { type: "string" }, subject: { type: "string" } }, required: ["day", "period", "code", "name", "subject"], additionalProperties: false } }
  },
  required: ["periods", "lessons"],
  additionalProperties: false
};
async function readScheduleFromImage(dataUrl, invoke = invokeLLM, track = "YKS") {
  const examSubjects = scheduleSubjectsFor(track);
  const response = await invoke({
    messages: [
      {
        role: "system",
        content: `Sen T\xFCrk ${EXAM_TRACK_DEFS[track].schoolKind}/dershane haftal\u0131k ders program\u0131 okuyucususun. Yaln\u0131zca g\xF6rselde g\xF6r\xFCleni \xE7\u0131kar, uydurma.
- periods: ders saatleri s\u0131ras\u0131yla (1. ders, 2. ders...), ba\u015Flang\u0131\xE7/biti\u015F "SS:dd".
- lessons: dolu her h\xFCcre i\xE7in bir kay\u0131t. day: 1=Pazartesi \u2026 7=Pazar. period: ders saatinin s\u0131ra numaras\u0131 (1'den ba\u015Flar).
- code: h\xFCcredeki k\u0131saltma (\xF6r. F\u0130ZF4). name: dersin tam ad\u0131 \u2014 program\u0131n alt\u0131ndaki ders listesinden (Ders \u2192 Dersin Ad\u0131) bul; liste yoksa k\u0131saltmadan anla.
- subject: dersin ${track} kar\u015F\u0131l\u0131\u011F\u0131, yaln\u0131zca \u015Fu listeden biri: ${examSubjects.join(", ")}. Bu s\u0131navda sorulmayan dersler (\xF6r. ${nonExamPresetsFor(track).filter((label) => label !== "Di\u011Fer ders").join(", ").toLocaleLowerCase("tr")}, se\xE7meli dersler) i\xE7in "${EXAM_TRACK_DEFS[track].label} d\u0131\u015F\u0131" yaz.
\xD6\u011Fretmen adlar\u0131n\u0131 yazma.`
      },
      { role: "user", content: [{ type: "text", text: "Bu haftal\u0131k ders program\u0131n\u0131 oku." }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] }
    ],
    response_format: { type: "json_schema", json_schema: { name: "class_schedule", strict: true, schema: SCHEMA } }
  });
  const content = response.choices[0]?.message?.content;
  const text4 = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("") ?? "";
  const result = parseScheduleImport(JSON.parse(text4.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") || "{}"), track);
  if (!result.periods.length || !result.blocks.length) throw new Error("Programdan ders saati ya da ders okunamad\u0131.");
  return result;
}

// server/routers/classSchedule.ts
var time = z10.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:dd bi\xE7iminde olmal\u0131.");
var classScheduleRouter = router({
  // `courseBlocks`: kurumun (dershane) sınıf programı; salt okunur, kaydedilen programa girmez.
  get: protectedProcedure.query(async ({ ctx }) => {
    const [schedule, courseBlocks] = await Promise.all([getClassSchedule(ctx.user.id), getCourseBlocks(ctx.user.id)]);
    return { ...schedule, courseBlocks };
  }),
  save: protectedProcedure.input(z10.object({
    periods: z10.array(z10.object({ start: time, end: time })).max(MAX_SCHOOL_PERIODS),
    blocks: z10.array(z10.object({
      source: z10.enum(SCHEDULE_SOURCES),
      dayOfWeek: z10.number().int().min(1).max(7),
      startTime: time,
      endTime: time,
      subject: z10.enum(SCHEDULE_SUBJECTS).nullable(),
      label: z10.string().max(80)
    })).max(MAX_SCHEDULE_BLOCKS)
  })).mutation(async ({ ctx, input }) => {
    try {
      return await saveClassSchedule(ctx.user.id, input);
    } catch (error) {
      if (error instanceof ScheduleError) throw new TRPCError8({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),
  // 📷 Fotoğraftan aktar: program okunur ama KAYDEDİLMEZ; düzenleyiciye dolar, öğrenci kontrol edip kaydeder.
  // Kota: fotoğraf okuma (NOTE_OCR); yalnızca başarılı okumada sayılır.
  importPhoto: metredFeatureProcedure("NOTE_OCR").input(z10.object({ dataUrl: z10.string().max(12e6).regex(/^data:image\/(jpeg|png|webp);base64,/, "Foto\u011Fraf JPEG, PNG ya da WEBP olmal\u0131.") })).mutation(async ({ ctx, input }) => {
    try {
      const examTrack = ctx.user ? (await getStudentProfile(ctx.user.id)).examTrack : "YKS";
      return await readScheduleFromImage(input.dataUrl, void 0, examTrack);
    } catch (error) {
      console.warn("[Class Schedule] Photo import failed:", error);
      throw new TRPCError8({ code: "BAD_REQUEST", message: llmUnavailableMessage(error) ?? "Program\u0131 foto\u011Fraftan okuyamad\u0131m. Tablonun tamam\u0131 g\xF6r\xFCnecek \u015Fekilde, d\xFCz ve net bir foto\u011Frafla tekrar dener misin? \u0130stersen tabloya elle de girebilirsin." });
    }
  })
});

// server/routers/push.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z11 } from "zod";
var subscriptionInput = z11.object({
  endpoint: z11.string().url().max(600),
  keys: z11.object({ p256dh: z11.string().min(1).max(200), auth: z11.string().min(1).max(100) })
});
var pushRouter = router({
  // VAPID anahtarı yoksa null: istemci hatırlatma seçeneğini hiç göstermez.
  config: publicProcedure.query(() => ({ publicKey: pushPublicKey() })),
  // Bu cihazın aboneliği sunucuda kayıtlı mı (tarayıcıda abonelik olup sunucuda silinmiş olabilir).
  status: protectedProcedure.input(z11.object({ endpoint: z11.string().max(600) })).query(async ({ ctx, input }) => ({ subscribed: await hasSubscription(ctx.user.id, input.endpoint) })),
  subscribe: protectedProcedure.input(subscriptionInput).mutation(async ({ ctx, input }) => {
    if (!pushPublicKey()) throw new TRPCError9({ code: "PRECONDITION_FAILED", message: "Bildirimler \u015Fu an kullan\u0131lam\u0131yor." });
    await saveSubscription(ctx.user.id, input, ctx.req.headers["user-agent"] ?? null);
    return { subscribed: true };
  }),
  unsubscribe: protectedProcedure.input(z11.object({ endpoint: z11.string().max(600) })).mutation(async ({ ctx, input }) => {
    await removeSubscription(ctx.user.id, input.endpoint);
    return { subscribed: false };
  }),
  test: protectedProcedure.mutation(async ({ ctx }) => {
    const outcome = await sendToUser(ctx.user.id, { title: "Hat\u0131rlatmalar a\xE7\u0131k", body: "Plan\u0131ndaki her oturumdan birka\xE7 dakika \xF6nce burada haber verece\u011Fim.", url: "/takvim", tag: "test" });
    if (!outcome.delivered) throw new TRPCError9({ code: "BAD_REQUEST", message: "Bildirim g\xF6nderilemedi. Bildirim iznini kontrol edip tekrar dener misin?" });
    return outcome;
  })
});

// server/routers/reading.ts
import { TRPCError as TRPCError10 } from "@trpc/server";
import { z as z12 } from "zod";

// server/reading/readingDb.ts
import { and as and21, count, desc as desc15, eq as eq24 } from "drizzle-orm";

// shared/reading.ts
var MAX_READING_BOOKS = 50;
function applyReadingProgress(book, pages2) {
  const added = Math.max(0, Math.round(pages2));
  const raw = book.pagesRead + added;
  const pagesRead = book.totalPages ? Math.min(book.totalPages, raw) : raw;
  const finished = book.status === "finished" || book.totalPages !== null && book.totalPages > 0 && pagesRead >= book.totalPages;
  return { pagesRead, status: finished ? "finished" : "reading", justFinished: finished && book.status !== "finished" };
}

// server/reading/readingDb.ts
var ReadingError = class extends Error {
};
var columns = { id: readingBooks.id, title: readingBooks.title, author: readingBooks.author, totalPages: readingBooks.totalPages, pagesRead: readingBooks.pagesRead, status: readingBooks.status, finishedAt: readingBooks.finishedAt };
async function listReadingBooks(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select(columns).from(readingBooks).where(eq24(readingBooks.userId, userId)).orderBy(desc15(readingBooks.updatedAt));
  return [...rows.filter((row) => row.status === "reading"), ...rows.filter((row) => row.status === "finished")];
}
async function addReadingBook(userId, input) {
  const db = await getDb();
  if (!db) throw new ReadingError("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  const [{ total }] = await db.select({ total: count() }).from(readingBooks).where(eq24(readingBooks.userId, userId));
  if (total >= MAX_READING_BOOKS) throw new ReadingError(`En fazla ${MAX_READING_BOOKS} okuma kitab\u0131 eklenebilir.`);
  const result = await db.insert(readingBooks).values({ userId, title: input.title.trim(), author: input.author?.trim() || null, totalPages: input.totalPages || null }).returning({ id: readingBooks.id });
  const [row] = await db.select(columns).from(readingBooks).where(and21(eq24(readingBooks.id, Number(result[0].id)), eq24(readingBooks.userId, userId))).limit(1);
  return row;
}
async function updateReadingBook(userId, id8, patch) {
  const db = await getDb();
  if (!db) throw new ReadingError("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  const values = {};
  if (patch.totalPages !== void 0) values.totalPages = patch.totalPages || null;
  if (patch.status) {
    values.status = patch.status;
    values.finishedAt = patch.status === "finished" ? /* @__PURE__ */ new Date() : null;
  }
  if (Object.keys(values).length) await db.update(readingBooks).set(values).where(and21(eq24(readingBooks.id, id8), eq24(readingBooks.userId, userId)));
  const [row] = await db.select(columns).from(readingBooks).where(and21(eq24(readingBooks.id, id8), eq24(readingBooks.userId, userId))).limit(1);
  if (!row) throw new ReadingError("Kitap bulunamad\u0131.");
  return row;
}
async function removeReadingBook(userId, id8) {
  const db = await getDb();
  if (!db) return;
  await db.delete(readingBooks).where(and21(eq24(readingBooks.id, id8), eq24(readingBooks.userId, userId)));
}
async function recordReadingPages(userId, id8, pages2) {
  const db = await getDb();
  if (!db) return null;
  const [book] = await db.select(columns).from(readingBooks).where(and21(eq24(readingBooks.id, id8), eq24(readingBooks.userId, userId))).limit(1);
  if (!book) return null;
  const next = applyReadingProgress(book, pages2);
  await db.update(readingBooks).set({ pagesRead: next.pagesRead, status: next.status, ...next.justFinished ? { finishedAt: /* @__PURE__ */ new Date() } : {} }).where(and21(eq24(readingBooks.id, id8), eq24(readingBooks.userId, userId)));
  return { ...book, pagesRead: next.pagesRead, status: next.status, justFinished: next.justFinished };
}

// server/routers/reading.ts
var id3 = z12.number().int().positive();
var pages = z12.number().int().min(1).max(1e4).nullable().optional();
async function userFacing3(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ReadingError) throw new TRPCError10({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
var readingRouter = router({
  list: protectedProcedure.query(({ ctx }) => listReadingBooks(ctx.user.id)),
  add: protectedProcedure.input(z12.object({ title: z12.string().trim().min(1, "Kitap ad\u0131n\u0131 yaz.").max(180), author: z12.string().trim().max(120).nullable().optional(), totalPages: pages })).mutation(({ ctx, input }) => userFacing3(() => addReadingBook(ctx.user.id, input))),
  update: protectedProcedure.input(z12.object({ id: id3, status: z12.enum(["reading", "finished"]).optional(), totalPages: pages })).mutation(({ ctx, input }) => userFacing3(() => updateReadingBook(ctx.user.id, input.id, { status: input.status, totalPages: input.totalPages }))),
  remove: protectedProcedure.input(z12.object({ id: id3 })).mutation(({ ctx, input }) => removeReadingBook(ctx.user.id, input.id))
});

// server/routers/org.ts
import { TRPCError as TRPCError11 } from "@trpc/server";
import { createHash as createHash4, randomInt } from "node:crypto";
import { z as z13 } from "zod";

// shared/kvkk.ts
var DEFAULT_KVKK_NOTICE = `K\u0130\u015E\u0130SEL VER\u0130LER\u0130N \u0130\u015ELENMES\u0130NE \u0130L\u0130\u015EK\u0130N AYDINLATMA METN\u0130

1. Veri sorumlusu
Bu metin, 6698 say\u0131l\u0131 Ki\u015Fisel Verilerin Korunmas\u0131 Kanunu ("KVKK") kapsam\u0131nda veri sorumlusu s\u0131fat\u0131yla {{KURUM_ADI}} ("Kurum") taraf\u0131ndan haz\u0131rlanm\u0131\u015Ft\u0131r. Pusula uygulamas\u0131, Kurum ad\u0131na veri i\u015Fleyen olarak hizmet verir.

2. \u0130\u015Flenen ki\u015Fisel veriler
Kuruma kat\u0131lmanla birlikte Pusula uygulamas\u0131ndaki \u015Fu verilerin Kurum'un yetkili personeli (y\xF6netici, koordinat\xF6r ve sana atanan \xF6\u011Fretmen) taraf\u0131ndan g\xF6r\xFCnt\xFClenebilir:
- Kimlik: uygulamadaki ad\u0131n
- E\u011Fitim: s\u0131n\u0131f seviyen, puan t\xFCr\xFCn, hedef \xFCniversite ve b\xF6l\xFCm\xFCn, s\u0131nav y\u0131l\u0131n
- Akademik performans: deneme sonu\xE7lar\u0131n (netler, konu baz\u0131nda do\u011Fru/yanl\u0131\u015F/bo\u015F), konu ilerlemen
- \xC7al\u0131\u015Fma d\xFCzeni: takvimdeki plan\u0131n, tamamlad\u0131\u011F\u0131n g\xF6revler, \xE7al\u0131\u015Fma s\xFCren ve son etkinlik zaman\u0131n
- Kurum i\xE7i kay\u0131tlar: \xF6\u011Fretmenlerinin sana atad\u0131\u011F\u0131 g\xF6revler ve hakk\u0131nda yazd\u0131\u011F\u0131 g\xF6r\xFC\u015Fme notlar\u0131
Notlar\u0131n, soru defterin, foto\u011Fraflar\u0131n, ses kay\u0131tlar\u0131n, e-posta adresin ve telefon numaran Kurum ile payla\u015F\u0131lmaz.

3. \u0130\u015Fleme ama\xE7lar\u0131
Verilerin; e\u011Fitim ve ko\xE7luk hizmetinin y\xFCr\xFCt\xFClmesi, \xE7al\u0131\u015Fma plan\u0131n\u0131n takibi, akademik geli\u015Fiminin izlenmesi, sana uygun g\xF6rev ve geri bildirim verilmesi ve Kurum i\xE7i rehberlik faaliyetlerinin planlanmas\u0131 ama\xE7lar\u0131yla i\u015Flenir.

4. Hukuki sebep ve toplama y\xF6ntemi
Verilerin, Pusula uygulamas\u0131nda kendi girdi\u011Fin ve uygulaman\u0131n \xFCretti\u011Fi kay\u0131tlardan elektronik ortamda toplan\u0131r. KVKK m.5/2-c (s\xF6zle\u015Fmenin kurulmas\u0131 ve ifas\u0131) ve m.5/2-f (veri sorumlusunun me\u015Fru menfaati) ile ayr\u0131ca verece\u011Fin a\xE7\u0131k r\u0131zaya dayan\u0131larak i\u015Flenir.

5. Aktar\u0131m
Verilerin \xFC\xE7\xFCnc\xFC ki\u015Filere sat\u0131lmaz ve pazarlama amac\u0131yla kullan\u0131lmaz. Hizmetin sunulmas\u0131 i\xE7in gereken bar\u0131nd\u0131rma ve altyap\u0131 hizmet sa\u011Flay\u0131c\u0131lar\u0131na, yaln\u0131zca bu ama\xE7la s\u0131n\u0131rl\u0131 olarak aktar\u0131labilir; bu sa\u011Flay\u0131c\u0131lar\u0131n bir k\u0131sm\u0131n\u0131n sunucular\u0131 yurt d\u0131\u015F\u0131nda bulunabilir. Yasal zorunluluk h\xE2linde yetkili kamu kurumlar\u0131yla payla\u015F\u0131labilir.

6. Saklama s\xFCresi
Kurum ile payla\u015F\u0131m, Kurum'dan ayr\u0131ld\u0131\u011F\u0131n anda sona erer; ayr\u0131ld\u0131ktan sonra Kurum personeli verilerini g\xF6remez. Kurum i\xE7i i\u015Flem kay\u0131tlar\u0131 yasal y\xFCk\xFCml\xFCl\xFCkler i\xE7in gerekli s\xFCre boyunca saklan\u0131r.

7. Haklar\u0131n
KVKK m.11 uyar\u0131nca; verilerinin i\u015Flenip i\u015Flenmedi\u011Fini \xF6\u011Frenme, bilgi talep etme, i\u015Fleme amac\u0131n\u0131 \xF6\u011Frenme, aktar\u0131ld\u0131\u011F\u0131 ki\u015Fileri bilme, eksik veya yanl\u0131\u015F i\u015Flenmi\u015Fse d\xFCzeltilmesini, silinmesini veya yok edilmesini isteme, itiraz etme ve zarara u\u011Framan h\xE2linde giderilmesini talep etme haklar\u0131na sahipsin. Ba\u015Fvurular\u0131n\u0131 {{KURUM_EPOSTA}} adresine ya da {{KURUM_ADRESI}} adresine yaz\u0131l\u0131 olarak iletebilirsin. Telefon: {{KURUM_TELEFON}}.

18 ya\u015F\u0131ndan k\xFC\xE7\xFCksen bu metni velinle birlikte okuman\u0131 \xF6neririz.`;
var DEFAULT_KVKK_CONSENT = `A\xC7IK RIZA METN\u0130

{{KURUM_ADI}} taraf\u0131ndan haz\u0131rlanan Ayd\u0131nlatma Metni'ni okudum. Pusula uygulamas\u0131ndaki deneme sonu\xE7lar\u0131m\u0131n, konu ilerlememin, \xE7al\u0131\u015Fma plan\u0131m\u0131n ve hedef bilgilerimin, e\u011Fitim ve ko\xE7luk hizmeti amac\u0131yla Kurum'un yetkili personeli taraf\u0131ndan g\xF6r\xFCnt\xFClenmesine ve i\u015Flenmesine a\xE7\u0131k r\u0131za veriyorum. Bu r\u0131zam\u0131 istedi\u011Fim zaman uygulamadaki "Kurumum" b\xF6l\xFCm\xFCnden kurumdan ayr\u0131larak geri alabilece\u011Fimi biliyorum.`;
function renderKvkk(template, org) {
  const address = [org.address, org.district, org.city].filter(Boolean).join(", ");
  const values = {
    KURUM_ADI: org.name,
    KURUM_ADRESI: address || "kurumun adresi",
    KURUM_EPOSTA: org.contactEmail || "kurumun ileti\u015Fim e-postas\u0131",
    KURUM_TELEFON: org.phone || "belirtilmedi"
  };
  return template.replace(/\{\{(KURUM_[A-Z]+)\}\}/g, (match, key) => key in values ? values[key] : match);
}
function effectiveKvkk(org) {
  return {
    version: org.kvkkVersion,
    isCustom: Boolean(org.kvkkNotice || org.kvkkConsent),
    notice: renderKvkk(org.kvkkNotice || DEFAULT_KVKK_NOTICE, org),
    consent: renderKvkk(org.kvkkConsent || DEFAULT_KVKK_CONSENT, org)
  };
}

// shared/orgTimetable.ts
var MAX_TIMETABLE_SLOTS_PER_CLASS = 80;
var overlaps2 = (a, b) => a.dayOfWeek === b.dayOfWeek && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
var when = (slot) => `${DAY_LABELS[slot.dayOfWeek - 1]} ${slot.startTime}\u2013${slot.endTime}`;
function validateClassTimetable(slots) {
  if (slots.length > MAX_TIMETABLE_SLOTS_PER_CLASS) return `Bir s\u0131n\u0131fa en fazla ${MAX_TIMETABLE_SLOTS_PER_CLASS} ders eklenebilir.`;
  for (const slot of slots) {
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 1 || slot.dayOfWeek > 7) return "Ge\xE7ersiz g\xFCn.";
    if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) return "Saatler SS:DD bi\xE7iminde olmal\u0131.";
    if (toMinutes(slot.endTime) <= toMinutes(slot.startTime)) return `${when(slot)}: biti\u015F saati ba\u015Flang\u0131\xE7tan sonra olmal\u0131.`;
    if (!slot.subject.trim()) return `${when(slot)}: ders ad\u0131 bo\u015F olamaz.`;
  }
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (overlaps2(slots[i], slots[j])) return `${when(slots[i])} saatinde s\u0131n\u0131f\u0131n iki dersi \xE7ak\u0131\u015F\u0131yor (${slots[i].subject}, ${slots[j].subject}).`;
    }
  }
  return null;
}
function findCrossClassConflicts(classId, slots, others) {
  const conflicts = [];
  for (const slot of slots) {
    for (const other of others) {
      if (other.classId === classId || !overlaps2(slot, other)) continue;
      if (slot.teacherUserId && slot.teacherUserId === other.teacherUserId) conflicts.push({ kind: "teacher", slot, other });
      else if (slot.room && other.room && slot.room.trim().toLocaleLowerCase("tr") === other.room.trim().toLocaleLowerCase("tr")) conflicts.push({ kind: "room", slot, other });
    }
  }
  return conflicts;
}
function describeConflict(conflict, names) {
  const target = conflict.kind === "teacher" ? `${names.teacher(conflict.slot.teacherUserId)} ayn\u0131 saatte ${names.className(conflict.other.classId)} s\u0131n\u0131f\u0131nda ${conflict.other.subject} dersinde` : `${conflict.slot.room} dersli\u011Fi ayn\u0131 saatte ${names.className(conflict.other.classId)} s\u0131n\u0131f\u0131na verilmi\u015F`;
  return `${when(conflict.slot)}: ${target}.`;
}
var branchMismatch = (subject2, teacherBranch) => Boolean(teacherBranch && teacherBranch !== "Rehberlik" && !sameBranch(subject2, teacherBranch));
var BRANCH_FAMILIES = [["Matematik", "Geometri", "Say\u0131sal Yetenek", "Say\u0131sal"], ["T\xFCrk\xE7e", "Edebiyat", "S\xF6zel Yetenek", "S\xF6zel"], ["Fen Bilimleri", "Fizik", "Kimya", "Biyoloji", "Fen"], ["Tarih", "\u0130nk\u0131lap Tarihi"], ["Co\u011Frafya", "T\xFCrkiye Co\u011Frafyas\u0131"], ["Vatanda\u015Fl\u0131k", "Mevzuat"]];
function sameBranch(subject2, branch) {
  if (subject2 === branch) return true;
  return BRANCH_FAMILIES.some((family) => family.includes(subject2) && family.includes(branch));
}
var sortSlots = (slots) => slots.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime));

// server/routers/org.ts
var id4 = z13.number().int().positive();
var hashCode = (code) => createHash4("sha256").update(normalizeInviteCode(code)).digest("hex");
var DAY4 = 24 * 60 * 60 * 1e3;
async function userFacing4(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof OrgError) throw new TRPCError11({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
function currentWeek(now = /* @__PURE__ */ new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
async function visibleStudentsWithSummary(ctx) {
  const { orgId, role } = ctx.membership;
  const students = await listMembers(orgId, seesAllStudents(role) ? { role: "student" } : { role: "student", teacherUserId: ctx.user.id });
  const { start, end } = currentWeek();
  const signals = await loadStudentSignals(students.map((student) => student.userId), start, end, new Date(Date.now() - 30 * DAY4));
  return students.map((student) => ({ ...student, summary: summarizeStudent(signals.get(student.userId)) }));
}
var optionalText = (max) => z13.string().trim().max(max).optional().transform((value) => value || null);
var classInput = z13.object({ name: z13.string().trim().min(1).max(80), gradeLevel: z13.enum(CLASS_GRADES).nullable().optional(), track: z13.enum(CLASS_TRACKS).nullable().optional(), advisorUserId: id4.nullable().optional() });
async function classFields(orgId, input) {
  if (input.advisorUserId) {
    const role = await getMemberRole(orgId, input.advisorUserId);
    if (!role || !isStaffRole(role)) throw new TRPCError11({ code: "NOT_FOUND", message: "Sorumlu \xF6\u011Fretmen bulunamad\u0131." });
  }
  return { name: input.name, gradeLevel: input.gradeLevel ?? null, track: input.track ?? null, advisorUserId: input.advisorUserId ?? null };
}
var timetableSlotInput = z13.object({
  dayOfWeek: z13.number().int().min(1).max(7),
  startTime: z13.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z13.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  subject: z13.string().trim().min(1).max(60),
  teacherUserId: id4.nullable(),
  room: optionalText(40)
});
async function saveTimetables(ctx, plans) {
  const orgId = ctx.membership.orgId;
  const prepared = plans.map((plan) => ({ classId: plan.classId, slots: sortSlots(plan.slots.map((slot) => ({ ...slot, room: slot.room ?? null }))) }));
  if (new Set(prepared.map((plan) => plan.classId)).size !== prepared.length) throw new TRPCError11({ code: "BAD_REQUEST", message: "Bir s\u0131n\u0131f iki kez g\xF6nderildi." });
  const [members, classes, current] = await Promise.all([listMembers(orgId), listClasses(orgId), listOrgTimetable(orgId)]);
  const staff = new Map(members.filter((member) => isStaffRole(member.role)).map((member) => [member.userId, member]));
  const className = (classId) => classes.find((item) => item.id === classId)?.name ?? "ba\u015Fka bir";
  for (const plan of prepared) {
    if (!classes.some((item) => item.id === plan.classId)) throw new TRPCError11({ code: "NOT_FOUND", message: "S\u0131n\u0131f bulunamad\u0131." });
    const problem = validateClassTimetable(plan.slots);
    if (problem) throw new TRPCError11({ code: "BAD_REQUEST", message: prepared.length > 1 ? `${className(plan.classId)}: ${problem}` : problem });
    if (plan.slots.some((slot) => slot.teacherUserId && !staff.has(slot.teacherUserId))) throw new TRPCError11({ code: "NOT_FOUND", message: "\xD6\u011Fretmen bulunamad\u0131." });
  }
  const replaced = new Set(prepared.map((plan) => plan.classId));
  const placed = [...current.filter((slot) => !replaced.has(slot.classId)).map((slot) => ({ ...slot, room: slot.room ?? null })), ...prepared.flatMap((plan) => plan.slots.map((slot) => ({ ...slot, classId: plan.classId })))];
  const conflicts = prepared.flatMap((plan) => findCrossClassConflicts(plan.classId, plan.slots, placed));
  if (conflicts.length) {
    const names = { teacher: (userId) => staff.get(userId)?.name ?? "\xD6\u011Fretmen", className };
    throw new TRPCError11({ code: "CONFLICT", message: conflicts.slice(0, 3).map((conflict) => describeConflict(conflict, names)).join(" ") });
  }
  await replaceClassTimetables(orgId, prepared);
  for (const plan of prepared) await audit(ctx, "timetable.update", { type: "class", id: plan.classId }, { slots: plan.slots.length, auto: prepared.length > 1 });
  const warnings = prepared.flatMap((plan) => plan.slots).filter((slot) => slot.teacherUserId && branchMismatch(slot.subject, staff.get(slot.teacherUserId)?.subject ?? null)).map((slot) => `${staff.get(slot.teacherUserId)?.name} (${staff.get(slot.teacherUserId)?.subject}) ${slot.subject} dersine atand\u0131.`);
  return { ok: true, warnings: Array.from(new Set(warnings)) };
}
var average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
var orgRouter = router({
  /** Kullanıcının aktif kurum üyelikleri: panel yönlendirmesi ve kurum seçici. */
  mine: protectedProcedure.query(({ ctx }) => listMyMemberships(ctx.user.id)),
  /** Personelin pazar akşamı aldığı sınıf özeti (server/digest/teacherDigest.ts); üyelik başına. */
  myDigest: orgProcedure("teacher").query(async ({ ctx }) => ({ enabled: await getStaffDigestEnabled(ctx.user.id, ctx.membership.orgId) })),
  setMyDigest: orgProcedure("teacher", { allowInactive: true }).input(z13.object({ enabled: z13.boolean() })).mutation(async ({ ctx, input }) => ({ enabled: await setStaffDigestEnabled(ctx.user.id, ctx.membership.orgId, input.enabled) })),
  overview: orgProcedure("teacher").query(async ({ ctx }) => {
    const students = await visibleStudentsWithSummary(ctx);
    const classes = await listClasses(ctx.membership.orgId);
    const adherence = students.map((student) => student.summary.adherence).filter((value) => value !== null);
    const atRisk = students.filter((student) => student.summary.risks.length).sort((a, b) => b.summary.risks.length - a.summary.risks.length).slice(0, 10);
    return {
      orgName: ctx.membership.orgName,
      role: ctx.membership.role,
      totals: {
        students: students.length,
        activeThisWeek: students.filter((student) => student.summary.weekMinutes > 0).length,
        averageAdherence: average(adherence),
        averageLastTyt: average(students.map((student) => student.summary.lastTyt?.net).filter((value) => typeof value === "number")),
        // Her sınav türü için öğrencilerin son denemelerinin ortalaması (yalnız denemesi olan türler).
        averageByKind: Object.fromEntries(EXAM_KINDS.flatMap((kind) => {
          const value = average(students.map((student) => student.summary.lastByKind[kind]?.net).filter((net) => typeof net === "number"));
          return value === null ? [] : [[kind, value]];
        })),
        atRisk: students.filter((student) => student.summary.risks.length).length,
        weekMinutes: students.reduce((sum, student) => sum + student.summary.weekMinutes, 0)
      },
      atRisk: atRisk.map((student) => ({ userId: student.userId, name: student.name, risks: student.summary.risks, lastActivityAt: student.summary.lastActivityAt, adherence: student.summary.adherence })),
      classes: classes.map((item) => {
        const members = students.filter((student) => item.studentUserIds.includes(student.userId));
        return { id: item.id, name: item.name, students: members.length, averageAdherence: average(members.map((member) => member.summary.adherence).filter((value) => value !== null)), averageLastTyt: average(members.map((member) => member.summary.lastTyt?.net).filter((value) => typeof value === "number")) };
      })
    };
  }),
  students: orgProcedure("teacher").input(z13.object({ classId: id4.optional(), teacherUserId: id4.optional(), risk: z13.enum(["inactive", "low_adherence", "net_drop", "any"]).optional(), q: z13.string().max(80).optional() })).query(async ({ ctx, input }) => {
    const students = await visibleStudentsWithSummary(ctx);
    const [classes, assignments, teachers] = await Promise.all([listClasses(ctx.membership.orgId), listAssignments(ctx.membership.orgId), listMembers(ctx.membership.orgId, { role: "teacher" })]);
    const query = input.q?.trim().toLocaleLowerCase("tr") ?? "";
    return students.map((student) => ({
      userId: student.userId,
      name: student.name,
      joinedAt: student.joinedAt,
      classes: classes.filter((item) => item.studentUserIds.includes(student.userId)).map((item) => ({ id: item.id, name: item.name })),
      teachers: assignments.filter((row) => row.studentUserId === student.userId).map((row) => ({ userId: row.teacherUserId, name: teachers.find((teacher) => teacher.userId === row.teacherUserId)?.name ?? "\xD6\u011Fretmen" })),
      summary: student.summary
    })).filter((student) => (!input.classId || student.classes.some((item) => item.id === input.classId)) && (!input.teacherUserId || student.teachers.some((teacher) => teacher.userId === input.teacherUserId)) && (!input.risk || (input.risk === "any" ? student.summary.risks.length > 0 : student.summary.risks.includes(input.risk))) && (!query || student.name.toLocaleLowerCase("tr").includes(query)));
  }),
  student: orgProcedure("teacher").input(z13.object({ studentUserId: id4 })).query(async ({ ctx, input }) => {
    await assertCanViewStudent(ctx, input.studentUserId);
    const since = new Date(Date.now() - 42 * DAY4);
    const { start, end } = currentWeek();
    const [profile, exams, topics, calendar, notes2, signals, classes, assignments, teachers] = await Promise.all([
      getStudentProfile(input.studentUserId),
      getUserMockExams(input.studentUserId),
      getUserTopicProgress(input.studentUserId),
      getStudentCalendarReadOnly(input.studentUserId, since),
      listNotes2(ctx.membership.orgId, input.studentUserId),
      loadStudentSignals([input.studentUserId], start, end, new Date(Date.now() - 30 * DAY4)),
      listClasses(ctx.membership.orgId),
      listAssignments(ctx.membership.orgId),
      listMembers(ctx.membership.orgId, { role: "teacher" })
    ]);
    const member = (await listMembers(ctx.membership.orgId, { role: "student" })).find((row) => row.userId === input.studentUserId);
    return {
      student: { userId: input.studentUserId, name: member.name, joinedAt: member.joinedAt, consentAt: member.consentAt },
      // Profilden yalnızca koçluk için gerekenler (iletişim/kimlik bilgisi yok).
      profile: { examTrack: profile.examTrack, gradeLevel: profile.gradeLevel, examYear: profile.examYear, targetScoreType: profile.targetScoreType, targetUniversity: profile.targetUniversity, targetDepartment: profile.targetDepartment, targetGoal: profile.targetGoal, targetScore: profile.targetScore, dailyStudyDuration: profile.dailyStudyDuration, avatarStyle: profile.avatarStyle },
      summary: summarizeStudent(signals.get(input.studentUserId)),
      exams,
      topics: topics.filter((topic) => !topic.insufficientData),
      sessions: calendar.sessions.map((session) => ({ id: session.id, sessionDate: session.sessionDate, title: session.title, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.plannedMinutes, status: session.status, actualMinutes: session.actualMinutes, actualQuestions: session.actualQuestions, correct: session.correct, assignedByUserId: session.assignedByUserId, abandonedAt: session.abandonedAt })),
      logs: calendar.logs.map((log) => ({ studyDate: log.studyDate, subject: log.subject, topic: log.topic, minutes: log.minutes, questions: log.questions, correct: log.correct })),
      // Görüşme notları mahrem: yalnızca yazanı ve öğrencinin sorumlu öğretmenleri görür (koordinatör/yönetici görmez).
      notes: filterPrivateNotes(notes2, ctx.user.id, await canReadNotes(ctx.membership.orgId, ctx.user.id, input.studentUserId)),
      classes: classes.filter((item) => item.studentUserIds.includes(input.studentUserId)).map((item) => ({ id: item.id, name: item.name })),
      teachers: assignments.filter((row) => row.studentUserId === input.studentUserId).map((row) => ({ userId: row.teacherUserId, name: teachers.find((teacher) => teacher.userId === row.teacherUserId)?.name ?? "\xD6\u011Fretmen" }))
    };
  }),
  /** Ayarlar → Kurum bilgileri: personel görür, yalnızca yönetici düzenler. */
  settings: router({
    get: orgProcedure("teacher").query(async ({ ctx }) => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
      return { ...org, membershipState: membershipState(org), kvkk: effectiveKvkk(org) };
    }),
    /** Kurum yöneticisi: öğrenci başına aylık AI kredi üst sınırı (null = sınırsız). */
    setCreditCap: orgProcedure("admin").input(z13.object({ cap: z13.number().int().min(1).max(1e6).nullable() })).mutation(async ({ ctx, input }) => {
      await setPerStudentCreditCap(ctx.membership.orgId, input.cap);
      await audit(ctx, "org.credit_cap", { type: "organization", id: ctx.membership.orgId }, { cap: input.cap });
      return { ok: true };
    }),
    credits: orgProcedure("coordinator").query(async ({ ctx }) => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
      const report = await orgCreditReport(ctx.membership.orgId);
      return { monthly: org.aiCreditsMonthly, cap: org.perStudentCreditCap, remaining: Math.max(0, org.aiCreditsMonthly - report.used), ...report };
    }),
    /** KVKK metinleri: boş gönderilen metin platform şablonuna döner. Her kayıtta sürüm artar. */
    updateKvkk: orgProcedure("admin").input(z13.object({ notice: z13.string().trim().max(2e4).nullable(), consent: z13.string().trim().max(5e3).nullable() })).mutation(async ({ ctx, input }) => {
      await updateKvkk(ctx.membership.orgId, input.notice || null, input.consent || null);
      await audit(ctx, "org.kvkk", { type: "organization", id: ctx.membership.orgId }, { custom: Boolean(input.notice || input.consent) });
      return { ok: true };
    }),
    /** Paket yükseltme / süre uzatma talebi: kurum yöneticisi gönderir, platform yöneticisi onaylar. Süresi dolmuş kurumda da açık. */
    upgrades: orgProcedure("admin").query(({ ctx }) => listOrgUpgradeRequests(ctx.membership.orgId)),
    // Paket kartlarında gösterilen liste fiyatları (platform yöneticisi belirler; boşsa "iletişime geçin").
    planPrices: orgProcedure("admin", { allowInactive: true }).query(async () => {
      const prices = await listOrgPlanPrices();
      return Object.fromEntries(ORG_PLANS.map((plan) => [plan, { monthlyPriceTry: prices.get(plan)?.monthlyPriceTry ?? null, yearlyPriceTry: prices.get(plan)?.yearlyPriceTry ?? null, priceNote: prices.get(plan)?.priceNote ?? null }]));
    }),
    requestUpgrade: orgProcedure("admin", { allowInactive: true }).input(z13.object({ plan: z13.enum(ORG_PLANS), note: z13.string().trim().max(300).optional() })).mutation(({ ctx, input }) => userFacing4(async () => {
      const org = await getOrganization(ctx.membership.orgId);
      if (!org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
      if (!canRequestPlan(org.plan, input.plan)) throw new OrgError("Bu pakete ge\xE7i\u015F talep edilemez; yaln\u0131zca \xFCst pakete y\xFCkseltme ya da s\xFCre uzatma istenebilir.");
      if ((await listOrgUpgradeRequests(ctx.membership.orgId)).some((row) => row.status === "pending")) throw new OrgError("Zaten bekleyen bir talebin var; sonu\xE7lanmas\u0131n\u0131 bekle ya da iptal et.");
      const requestId = await createUpgradeRequest({ orgId: ctx.membership.orgId, requestedBy: ctx.user.id, currentPlan: org.plan, requestedPlan: input.plan, note: input.note || null });
      await audit(ctx, "org.upgrade_request", { type: "upgrade", id: requestId }, { from: org.plan, to: input.plan });
      return { id: requestId };
    })),
    cancelUpgrade: orgProcedure("admin", { allowInactive: true }).input(z13.object({ requestId: id4 })).mutation(async ({ ctx, input }) => {
      if (!await cancelUpgradeRequest(ctx.membership.orgId, input.requestId)) throw new TRPCError11({ code: "NOT_FOUND", message: "Bekleyen talep bulunamad\u0131." });
      await audit(ctx, "org.upgrade_cancel", { type: "upgrade", id: input.requestId });
      return { ok: true };
    }),
    kvkkStatus: orgProcedure("coordinator").query(async ({ ctx }) => {
      const [org, versions] = await Promise.all([getOrganization(ctx.membership.orgId), listStudentKvkkVersions(ctx.membership.orgId)]);
      const current = org?.kvkkVersion ?? 1;
      return { current, students: versions.length, onCurrent: versions.filter((version) => version === current).length, onOlder: versions.filter((version) => version !== null && version !== current).length, missing: versions.filter((version) => version === null).length };
    }),
    update: orgProcedure("admin").input(z13.object({ name: z13.string().trim().min(2).max(160), kind: z13.enum(ORG_KINDS), city: optionalText(80), district: optionalText(80), address: optionalText(300), phone: optionalText(40), contactEmail: z13.union([z13.literal(""), z13.string().trim().email("Ge\xE7erli bir e-posta yaz.").max(160)]).optional().transform((value) => value || null) })).mutation(async ({ ctx, input }) => {
      await updateOrganization(ctx.membership.orgId, input);
      await audit(ctx, "org.update", { type: "organization", id: ctx.membership.orgId }, { name: input.name });
      return { ok: true };
    })
  }),
  invitations: router({
    list: orgProcedure("teacher").query(async ({ ctx }) => {
      const rows = await listInvitations(ctx.membership.orgId);
      return hasRole(ctx.membership.role, "coordinator") ? rows : rows.filter((row) => row.role === "student");
    }),
    create: orgProcedure("teacher").input(z13.object({ role: z13.enum(INVITABLE_ROLES), note: z13.string().trim().max(160).optional(), subject: z13.string().trim().max(60).optional(), days: z13.number().int().min(1).max(60).default(14), maxUses: z13.number().int().min(1).max(500).default(1) })).mutation(({ ctx, input }) => userFacing4(async () => {
      if (!canInviteRole(ctx.membership.role, input.role)) throw new TRPCError11({ code: "FORBIDDEN", message: "Bu rol i\xE7in davet olu\u015Fturma yetkin yok." });
      const code = generateInviteCode((max) => randomInt(max));
      const invitationId = await createInvitation({ orgId: ctx.membership.orgId, role: input.role, codeHash: hashCode(code), note: input.note || null, subject: input.role === "student" ? null : input.subject || null, expiresAt: new Date(Date.now() + input.days * DAY4), maxUses: input.maxUses, createdBy: ctx.user.id });
      await audit(ctx, "invitation.create", { type: "invitation", id: invitationId }, { role: input.role, maxUses: input.maxUses, days: input.days });
      return { id: invitationId, code };
    })),
    revoke: orgProcedure("teacher").input(z13.object({ invitationId: id4 })).mutation(async ({ ctx, input }) => {
      const rows = await listInvitations(ctx.membership.orgId);
      const target = rows.find((row) => row.id === input.invitationId);
      if (!target || !hasRole(ctx.membership.role, "coordinator") && target.role !== "student") throw new TRPCError11({ code: "NOT_FOUND", message: "Davet bulunamad\u0131." });
      await revokeInvitation(ctx.membership.orgId, input.invitationId);
      await audit(ctx, "invitation.revoke", { type: "invitation", id: input.invitationId });
      return { ok: true };
    })
  }),
  members: router({
    list: orgProcedure("coordinator").query(async ({ ctx }) => (await listMembers(ctx.membership.orgId)).filter((member) => isStaffRole(member.role))),
    setRole: orgProcedure("admin").input(z13.object({ userId: id4, role: z13.enum(ORG_ROLES) })).mutation(async ({ ctx, input }) => {
      const current = await getMemberRole(ctx.membership.orgId, input.userId);
      if (!current || input.userId === ctx.user.id) throw new TRPCError11({ code: "NOT_FOUND", message: "\xDCye bulunamad\u0131." });
      if (!canAssignRole(ctx.membership.role, current, input.role)) throw new TRPCError11({ code: "FORBIDDEN", message: "Bu rol de\u011Fi\u015Fikli\u011Fini yapma yetkin yok." });
      if (current === "student" !== (input.role === "student")) throw new TRPCError11({ code: "BAD_REQUEST", message: "\xD6\u011Frenci ve personel rolleri birbirine \xE7evrilemez." });
      await setMemberRole(ctx.membership.orgId, input.userId, input.role);
      await audit(ctx, "member.role", { type: "user", id: input.userId }, { from: current, to: input.role });
      return { ok: true };
    }),
    setSubject: orgProcedure("coordinator").input(z13.object({ userId: id4, subject: optionalText(60) })).mutation(async ({ ctx, input }) => {
      if (!await setMemberSubject(ctx.membership.orgId, input.userId, input.subject)) throw new TRPCError11({ code: "NOT_FOUND", message: "Personel bulunamad\u0131." });
      await audit(ctx, "member.subject", { type: "user", id: input.userId }, { subject: input.subject });
      return { ok: true };
    }),
    remove: orgProcedure("admin").input(z13.object({ userId: id4 })).mutation(async ({ ctx, input }) => {
      const current = await getMemberRole(ctx.membership.orgId, input.userId);
      if (!current || input.userId === ctx.user.id || !canAssignRole(ctx.membership.role, current, current === "student" ? "student" : "teacher")) throw new TRPCError11({ code: "NOT_FOUND", message: "\xDCye bulunamad\u0131." });
      await endMembership(ctx.membership.orgId, input.userId, "removed");
      await audit(ctx, "member.remove", { type: "user", id: input.userId }, { role: current });
      return { ok: true };
    })
  }),
  classes: router({
    list: orgProcedure("teacher").query(({ ctx }) => listClasses(ctx.membership.orgId)),
    create: orgProcedure("coordinator").input(classInput).mutation(async ({ ctx, input }) => {
      const classId = await createClass(ctx.membership.orgId, await classFields(ctx.membership.orgId, input));
      await audit(ctx, "class.create", { type: "class", id: classId }, { name: input.name });
      return { id: classId };
    }),
    update: orgProcedure("coordinator").input(classInput.extend({ classId: id4 })).mutation(async ({ ctx, input }) => {
      if (!await updateClass(ctx.membership.orgId, input.classId, await classFields(ctx.membership.orgId, input))) throw new TRPCError11({ code: "NOT_FOUND", message: "S\u0131n\u0131f bulunamad\u0131." });
      await audit(ctx, "class.update", { type: "class", id: input.classId }, { name: input.name });
      return { ok: true };
    }),
    remove: orgProcedure("coordinator").input(z13.object({ classId: id4 })).mutation(async ({ ctx, input }) => {
      if (!await deleteClass(ctx.membership.orgId, input.classId)) throw new TRPCError11({ code: "NOT_FOUND", message: "S\u0131n\u0131f bulunamad\u0131." });
      await audit(ctx, "class.remove", { type: "class", id: input.classId });
      return { ok: true };
    }),
    setStudents: orgProcedure("coordinator").input(z13.object({ classId: id4, studentUserIds: z13.array(id4).max(500) })).mutation(async ({ ctx, input }) => {
      if (!await setClassStudents(ctx.membership.orgId, input.classId, input.studentUserIds)) throw new TRPCError11({ code: "NOT_FOUND", message: "S\u0131n\u0131f bulunamad\u0131." });
      await audit(ctx, "class.students", { type: "class", id: input.classId }, { count: input.studentUserIds.length });
      return { ok: true };
    })
  }),
  /**
   * Ders programı: tüm sınıfların haftalık dersleri. Personel (öğretmen dahil) görür; öğrenci verisi
   * içermez. Kaydı koordinatör+ yapar; öğretmen ve derslik çakışması kaydı engeller, branş
   * uyuşmazlığı yalnız uyarıdır.
   */
  timetable: router({
    get: orgProcedure("teacher").query(async ({ ctx }) => {
      const [slots, classes, members] = await Promise.all([listOrgTimetable(ctx.membership.orgId), listClasses(ctx.membership.orgId), listMembers(ctx.membership.orgId)]);
      return {
        slots,
        classes: classes.map((item) => ({ id: item.id, name: item.name, gradeLevel: item.gradeLevel, track: item.track, advisorUserId: item.advisorUserId, studentCount: item.studentUserIds.length })),
        teachers: members.filter((member) => isStaffRole(member.role)).map((member) => ({ userId: member.userId, name: member.name, role: member.role, subject: member.subject }))
      };
    }),
    saveClass: orgProcedure("coordinator").input(z13.object({ classId: id4, slots: z13.array(timetableSlotInput).max(MAX_TIMETABLE_SLOTS_PER_CLASS) })).mutation(({ ctx, input }) => saveTimetables(ctx, [input])),
    // Otomatik dağıtımın sonucu: seçilen sınıfların programı birlikte, tek işlemde kaydedilir.
    saveClasses: orgProcedure("coordinator").input(z13.object({ classes: z13.array(z13.object({ classId: id4, slots: z13.array(timetableSlotInput).max(MAX_TIMETABLE_SLOTS_PER_CLASS) })).min(1).max(100) })).mutation(({ ctx, input }) => saveTimetables(ctx, input.classes))
  }),
  assignments: router({
    list: orgProcedure("coordinator").query(({ ctx }) => listAssignments(ctx.membership.orgId)),
    setTeacherStudents: orgProcedure("coordinator").input(z13.object({ teacherUserId: id4, studentUserIds: z13.array(id4).max(500) })).mutation(async ({ ctx, input }) => {
      if (await getMemberRole(ctx.membership.orgId, input.teacherUserId) !== "teacher") throw new TRPCError11({ code: "NOT_FOUND", message: "\xD6\u011Fretmen bulunamad\u0131." });
      const assigned = await setTeacherStudents(ctx.membership.orgId, input.teacherUserId, input.studentUserIds);
      await audit(ctx, "assignment.set", { type: "user", id: input.teacherUserId }, { count: assigned.length });
      return { assigned: assigned.length };
    })
  }),
  tasks: router({
    assign: orgProcedure("teacher").input(z13.object({ studentUserId: id4, date: z13.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z13.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), subject: z13.string().trim().min(1).max(80), topic: z13.string().trim().min(1).max(180), kind: z13.enum(["Soru \xE7\xF6z\xFCm\xFC", "Konu tekrar\u0131", "Konu \xE7al\u0131\u015Fmas\u0131"]), minutes: z13.number().int().min(10).max(240), targetQuestions: z13.number().int().min(0).max(300).optional(), note: z13.string().trim().max(300).optional() })).mutation(async ({ ctx, input }) => {
      await assertCanViewStudent(ctx, input.studentUserId);
      const start = toMinutes(input.time);
      if (start + input.minutes > 23 * 60 + 30) throw new TRPCError11({ code: "BAD_REQUEST", message: "G\xF6rev 23:30'dan \xF6nce bitmeli." });
      const day2 = /* @__PURE__ */ new Date(`${input.date}T12:00:00`);
      const [schedule, courseBlocks, sessions] = await Promise.all([getClassSchedule(input.studentUserId), getCourseBlocks(input.studentUserId), listPlannedSessionsOn(input.studentUserId, day2)]);
      const busy = busyOn(day2, { blocks: schedule.blocks, courseBlocks, sessions });
      const conflict = findTaskConflict(busy, start, input.minutes);
      if (conflict) {
        const suggestion = suggestStart(busy, input.minutes, { from: start });
        const what = conflict.kind === "session" ? `planl\u0131 \xE7al\u0131\u015Fmas\u0131yla: ${describeInterval(conflict)}` : `${describeInterval(conflict)} dersiyle`;
        throw new TRPCError11({ code: "BAD_REQUEST", message: `\xD6\u011Frencinin ${what} \xE7ak\u0131\u015F\u0131yor. ${suggestion !== null ? `Ayn\u0131 g\xFCn uygun ilk saat: ${fromMinutes(suggestion)}.` : "Bu g\xFCn uygun saat yok; ba\u015Fka bir g\xFCn se\xE7."}` });
      }
      const sessionId = await insertAssignedTask({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, teacherUserId: ctx.user.id, sessionDate: /* @__PURE__ */ new Date(`${input.date}T${input.time}:00`), title: `${input.subject} \xB7 ${input.topic}`, subject: input.subject, topic: input.topic, kind: input.kind, plannedMinutes: input.minutes, targetQuestions: input.targetQuestions || null, summary: input.note || `${ctx.membership.orgName} \xF6\u011Fretmeninin atad\u0131\u011F\u0131 g\xF6rev.` });
      await audit(ctx, "task.assign", { type: "user", id: input.studentUserId }, { sessionId, subject: input.subject, topic: input.topic });
      const teacherName = (await listMembers(ctx.membership.orgId)).find((member) => member.userId === ctx.user.id)?.name ?? null;
      await notifyStudentOfTasks({ studentUserId: input.studentUserId, teacherName, sessionDates: [/* @__PURE__ */ new Date(`${input.date}T${input.time}:00`)] }).catch(() => void 0);
      return { sessionId };
    })
  }),
  notes: router({
    create: orgProcedure("teacher").input(z13.object({ studentUserId: id4, body: z13.string().trim().min(1).max(4e3), visibility: z13.enum(["staff", "student"]) })).mutation(async ({ ctx, input }) => {
      await assertCanViewStudent(ctx, input.studentUserId);
      const noteId = await createNote({ orgId: ctx.membership.orgId, studentUserId: input.studentUserId, authorUserId: ctx.user.id, body: input.body, visibility: input.visibility });
      await audit(ctx, "note.create", { type: "user", id: input.studentUserId }, { noteId, visibility: input.visibility });
      return { id: noteId };
    }),
    remove: orgProcedure("teacher").input(z13.object({ noteId: id4 })).mutation(async ({ ctx, input }) => {
      const note = await getNote2(ctx.membership.orgId, input.noteId);
      if (!note) throw new TRPCError11({ code: "NOT_FOUND", message: "Not bulunamad\u0131." });
      await assertCanViewStudent(ctx, note.studentUserId);
      if (note.authorUserId !== ctx.user.id) throw new TRPCError11({ code: "FORBIDDEN", message: "Notu yaln\u0131zca yazan \xF6\u011Fretmen silebilir." });
      await deleteNote2(ctx.membership.orgId, input.noteId);
      await audit(ctx, "note.remove", { type: "user", id: note.studentUserId }, { noteId: input.noteId });
      return { ok: true };
    })
  }),
  audit: orgProcedure("admin").query(({ ctx }) => listAudit(ctx.membership.orgId)),
  // Novara Rehber: akademik takip dosyaları.
  cases: orgCasesRouter,
  // --- Öğrenci (ve personel) tarafı: davet kodu ile katılma, ayrılma ---------------
  /** Davet kodunu doğrular, kurum adını ve rolü gösterir (katılmadan önce). */
  previewInvitation: protectedProcedure.input(z13.object({ code: z13.string().trim().min(4).max(20) })).mutation(async ({ input }) => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamad\u0131." : invitationProblem(invitation);
    if (problem) throw new TRPCError11({ code: "BAD_REQUEST", message: problem });
    if (membershipState(invitation) === "expired") throw new TRPCError11({ code: "BAD_REQUEST", message: "Bu kurumun \xFCyelik s\xFCresi dolmu\u015F; yeni kat\u0131l\u0131m al\u0131nm\u0131yor." });
    const org = invitation.role === "student" ? await getOrganization(invitation.orgId) : null;
    return { orgName: invitation.orgName, role: invitation.role, kvkk: org ? effectiveKvkk(org) : null };
  }),
  join: protectedProcedure.input(z13.object({ code: z13.string().trim().min(4).max(20), consent: z13.literal(true), kvkkVersion: z13.number().int().positive().optional() })).mutation(({ ctx, input }) => userFacing4(async () => {
    const invitation = await findInvitationByHash(hashCode(input.code));
    const problem = !invitation || invitation.orgStatus !== "active" ? "Davet kodu bulunamad\u0131." : invitationProblem(invitation);
    if (problem) throw new OrgError(problem);
    if (membershipState(invitation) === "expired") throw new OrgError("Bu kurumun \xFCyelik s\xFCresi dolmu\u015F; yeni kat\u0131l\u0131m al\u0131nm\u0131yor.");
    let kvkkVersion = null;
    if (invitation.role === "student") {
      const org = await getOrganization(invitation.orgId);
      kvkkVersion = org?.kvkkVersion ?? 1;
      if (input.kvkkVersion !== kvkkVersion) throw new OrgError("Kurumun KVKK metni g\xFCncellendi; l\xFCtfen metni yeniden okuyup onayla.");
    }
    const memberships = await listMyMemberships(ctx.user.id);
    if (memberships.some((row) => row.orgId === invitation.orgId)) throw new OrgError("Bu kuruma zaten ba\u011Fl\u0131s\u0131n.");
    if (invitation.role === "student" && memberships.some((row) => row.role === "student")) throw new OrgError("\xD6nce \u015Fu anki kurumundan ayr\u0131lman gerekiyor.");
    await acceptInvitation({ invitationId: invitation.id, orgId: invitation.orgId, userId: ctx.user.id, role: invitation.role, invitedBy: invitation.createdBy, subject: invitation.subject, kvkkVersion });
    await audit({ user: { id: ctx.user.id }, membership: { orgId: invitation.orgId, orgName: invitation.orgName, role: invitation.role } }, "member.join", { type: "user", id: ctx.user.id }, { role: invitation.role });
    return { orgId: invitation.orgId, orgName: invitation.orgName, role: invitation.role };
  })),
  leave: protectedProcedure.input(z13.object({ orgId: id4 })).mutation(async ({ ctx, input }) => {
    const memberships = await listMyMemberships(ctx.user.id);
    const membership = memberships.find((row) => row.orgId === input.orgId);
    if (!membership) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    if (membership.role === "owner") throw new TRPCError11({ code: "BAD_REQUEST", message: "Kurum sahibi kurumdan ayr\u0131lamaz." });
    await endMembership(input.orgId, ctx.user.id, "left");
    await audit({ user: { id: ctx.user.id }, membership }, "member.leave", { type: "user", id: ctx.user.id }, { role: membership.role });
    return { ok: true };
  }),
  myFeedback: protectedProcedure.query(({ ctx }) => listStudentFeedback(ctx.user.id)),
  /** Öğrencinin dershane programı (sınıflarının dersleri). */
  myTimetable: protectedProcedure.query(({ ctx }) => listStudentTimetable(ctx.user.id)),
  /** Üyenin bağlı olduğu kurumun KVKK metinleri ve kendi onayladığı sürüm ("Kurumum"). */
  myKvkk: protectedProcedure.input(z13.object({ orgId: id4 })).query(async ({ ctx, input }) => {
    const membership = (await listMyMemberships(ctx.user.id)).find((row) => row.orgId === input.orgId);
    const org = membership ? await getOrganization(input.orgId) : null;
    if (!membership || !org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    return { ...effectiveKvkk(org), acceptedVersion: membership.kvkkVersion ?? null, consentAt: membership.consentAt ?? null };
  })
});
var adminOrgsRouter = router({
  list: adminProcedure.query(async () => {
    const orgs = await listOrganizations();
    const used = await creditsUsedThisMonth(orgs.map((org) => org.id));
    return orgs.map((org) => ({ ...org, membershipState: membershipState(org), creditsUsed: used.get(org.id) ?? 0 }));
  }),
  upgradeRequests: adminProcedure.query(() => listPendingUpgradeRequests()),
  /** Onay: paket talep edilene geçer, kredi en az paketin varsayılanı olur, süre 1 yıl uzar (bitmemişse üstüne). */
  resolveUpgrade: adminProcedure.input(z13.object({ requestId: id4, approve: z13.boolean() })).mutation(async ({ ctx, input }) => {
    const request = await getUpgradeRequest(input.requestId);
    if (!request || request.status !== "pending") throw new TRPCError11({ code: "NOT_FOUND", message: "Bekleyen talep bulunamad\u0131." });
    const org = await getOrganization(request.orgId);
    if (!org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    if (!await resolveUpgradeRequest(input.requestId, input.approve ? "approved" : "rejected", ctx.user.id)) throw new TRPCError11({ code: "CONFLICT", message: "Talep az \xF6nce sonu\xE7land\u0131r\u0131ld\u0131." });
    if (input.approve) {
      const now = /* @__PURE__ */ new Date();
      const expired = membershipState(org, now) !== "active";
      await updateOrgMembership(org.id, { plan: request.requestedPlan, membershipStartsAt: expired || !org.membershipStartsAt ? now : org.membershipStartsAt, membershipEndsAt: renewedMembershipEnd(org.membershipEndsAt, now), aiCreditsMonthly: Math.max(org.aiCreditsMonthly, ORG_PLAN_DEFAULT_CREDITS[request.requestedPlan]) });
    }
    await writeAudit({ orgId: org.id, actorUserId: ctx.user.id, action: input.approve ? "org.upgrade_approved" : "org.upgrade_rejected", targetType: "upgrade", targetId: input.requestId, metadata: { plan: ORG_PLAN_LABELS[request.requestedPlan] } });
    return { ok: true };
  }),
  setMembership: adminProcedure.input(z13.object({ orgId: id4, plan: z13.enum(ORG_PLANS), startsAt: z13.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), endsAt: z13.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), aiCreditsMonthly: z13.number().int().min(0).max(1e7) })).mutation(async ({ input }) => {
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) throw new TRPCError11({ code: "BAD_REQUEST", message: "Biti\u015F tarihi ba\u015Flang\u0131\xE7tan \xF6nce olamaz." });
    const day2 = (value) => value ? /* @__PURE__ */ new Date(`${value}T00:00:00`) : null;
    await updateOrgMembership(input.orgId, { plan: input.plan, membershipStartsAt: day2(input.startsAt), membershipEndsAt: day2(input.endsAt), aiCreditsMonthly: input.aiCreditsMonthly });
    return { ok: true };
  }),
  create: adminProcedure.input(z13.object({ name: z13.string().trim().min(2).max(160), slug: z13.string().trim().regex(/^[a-z0-9-]{3,80}$/, "K\u0131sa ad k\xFC\xE7\xFCk harf, rakam ve tire i\xE7ermeli.") })).mutation(({ ctx, input }) => userFacing4(async () => {
    let orgId;
    try {
      orgId = await createOrganization(input.name, input.slug);
    } catch (error) {
      if (/Duplicate/i.test(String(error?.message ?? error))) throw new OrgError("Bu k\u0131sa ad kullan\u0131l\u0131yor.");
      throw error;
    }
    await updateOrgMembership(orgId, { plan: "trial", membershipStartsAt: /* @__PURE__ */ new Date(), membershipEndsAt: new Date(Date.now() + 30 * DAY4), aiCreditsMonthly: ORG_PLAN_DEFAULT_CREDITS.trial });
    const code = generateInviteCode((max) => randomInt(max));
    await createInvitation({ orgId, role: "admin", codeHash: hashCode(code), note: "Kurum y\xF6neticisi daveti", expiresAt: new Date(Date.now() + 30 * DAY4), maxUses: 1, createdBy: ctx.user.id });
    return { orgId, adminCode: code };
  })),
  inviteAdmin: adminProcedure.input(z13.object({ orgId: id4 })).mutation(async ({ ctx, input }) => {
    const code = generateInviteCode((max) => randomInt(max));
    await createInvitation({ orgId: input.orgId, role: "admin", codeHash: hashCode(code), note: "Kurum y\xF6neticisi daveti (platform)", expiresAt: new Date(Date.now() + 30 * DAY4), maxUses: 1, createdBy: ctx.user.id });
    return { adminCode: code };
  }),
  setStatus: adminProcedure.input(z13.object({ orgId: id4, status: z13.enum(["active", "suspended"]) })).mutation(async ({ input }) => {
    await setOrganizationStatus(input.orgId, input.status);
    return { ok: true };
  }),
  // --- Kurum detayı (Yönetim Paneli → Kurumlar → kurum) ---
  get: adminProcedure.input(z13.object({ orgId: id4 })).query(async ({ input }) => {
    const org = await getOrganization(input.orgId);
    if (!org) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    const [members, classes, used, casesEnabled] = await Promise.all([listMembers(input.orgId), listClasses(input.orgId), creditsUsedThisMonth([input.orgId]), isCasesEnabled(input.orgId)]);
    return {
      org: { ...org, membershipState: membershipState(org), creditsUsed: used.get(input.orgId) ?? 0, academicCasesEnabled: casesEnabled },
      members: members.map((member) => ({ userId: member.userId, name: member.name, email: member.email, role: member.role, subject: member.subject, joinedAt: member.joinedAt, lastSignedIn: member.lastSignedIn })),
      classes: classes.map((item) => ({ id: item.id, name: item.name, students: item.studentUserIds.length, advisorUserId: item.advisorUserId }))
    };
  }),
  /** Var olan bir hesabı e-postasıyla kuruma personel olarak ekler (öğrenci kendi onayıyla, davet koduyla katılır). */
  addStaff: adminProcedure.input(z13.object({ orgId: id4, email: z13.string().trim().email().max(160), role: z13.enum(["owner", "admin", "coordinator", "teacher"]), subject: z13.string().trim().max(60).nullable().optional() })).mutation(async ({ ctx, input }) => {
    if (!await getOrganization(input.orgId)) throw new TRPCError11({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    const user = await findUserByEmail(input.email);
    if (!user) throw new TRPCError11({ code: "NOT_FOUND", message: "Bu e-postayla kay\u0131tl\u0131 hesap yok. Ki\u015Fi \xF6nce uygulamada hesap a\xE7mal\u0131." });
    if (await getMemberRole(input.orgId, user.id) === "student") throw new TRPCError11({ code: "CONFLICT", message: "Bu hesap kurumda \xF6\u011Frenci olarak kay\u0131tl\u0131; personel yap\u0131lamaz." });
    await addStaffMember({ orgId: input.orgId, userId: user.id, role: input.role, subject: input.subject ?? null, invitedBy: ctx.user.id });
    await writeAudit({ orgId: input.orgId, actorUserId: ctx.user.id, action: "platform.member_add", targetType: "user", targetId: user.id, metadata: { role: input.role } });
    return { userId: user.id };
  }),
  setMemberRole: adminProcedure.input(z13.object({ orgId: id4, userId: id4, role: z13.enum(["owner", "admin", "coordinator", "teacher"]) })).mutation(async ({ ctx, input }) => {
    const current = await getMemberRole(input.orgId, input.userId);
    if (!current) throw new TRPCError11({ code: "NOT_FOUND", message: "\xDCye bulunamad\u0131." });
    if (current === "student") throw new TRPCError11({ code: "BAD_REQUEST", message: "\xD6\u011Frencinin rol\xFC de\u011Fi\u015Ftirilemez." });
    const demotesLastAdmin = (current === "owner" || current === "admin") && input.role !== "owner" && input.role !== "admin" && await countActiveOrgAdmins(input.orgId) <= 1;
    if (demotesLastAdmin) throw new TRPCError11({ code: "BAD_REQUEST", message: "Kurumun son y\xF6neticisi; \xF6nce ba\u015Fka birini y\xF6netici yap." });
    await setMemberRole(input.orgId, input.userId, input.role);
    await writeAudit({ orgId: input.orgId, actorUserId: ctx.user.id, action: "platform.member_role", targetType: "user", targetId: input.userId, metadata: { from: current, to: input.role } });
    return { ok: true };
  }),
  removeMember: adminProcedure.input(z13.object({ orgId: id4, userId: id4 })).mutation(async ({ ctx, input }) => {
    const current = await getMemberRole(input.orgId, input.userId);
    if (!current) throw new TRPCError11({ code: "NOT_FOUND", message: "\xDCye bulunamad\u0131." });
    if ((current === "owner" || current === "admin") && await countActiveOrgAdmins(input.orgId) <= 1) throw new TRPCError11({ code: "BAD_REQUEST", message: "Kurumun son y\xF6neticisi \xE7\u0131kar\u0131lamaz; \xF6nce ba\u015Fka birini y\xF6netici yap." });
    await endMembership(input.orgId, input.userId, "removed");
    await writeAudit({ orgId: input.orgId, actorUserId: ctx.user.id, action: "platform.member_remove", targetType: "user", targetId: input.userId, metadata: { role: current } });
    return { ok: true };
  }),
  setCasesEnabled: adminProcedure.input(z13.object({ orgId: id4, enabled: z13.boolean() })).mutation(async ({ ctx, input }) => {
    await setCasesEnabled(input.orgId, input.enabled);
    await writeAudit({ orgId: input.orgId, actorUserId: ctx.user.id, action: "cases.enable", targetType: "organization", targetId: input.orgId, metadata: { enabled: input.enabled, by: "platform" } });
    return { ok: true };
  }),
  /** Bir kullanıcının kurum bağları (Yönetim Paneli → Üyeler → üye). */
  userMemberships: adminProcedure.input(z13.object({ userId: id4 })).query(({ input }) => listUserOrgMemberships(input.userId)),
  // --- Kurum paketlerinin liste fiyatları ---
  planPrices: adminProcedure.query(async () => {
    const prices = await listOrgPlanPrices();
    return ORG_PLANS.map((plan) => ({ plan, label: ORG_PLAN_LABELS[plan], defaultCredits: ORG_PLAN_DEFAULT_CREDITS[plan], monthlyPriceTry: prices.get(plan)?.monthlyPriceTry ?? null, yearlyPriceTry: prices.get(plan)?.yearlyPriceTry ?? null, priceNote: prices.get(plan)?.priceNote ?? null, updatedAt: prices.get(plan)?.updatedAt ?? null }));
  }),
  setPlanPrice: adminProcedure.input(z13.object({ plan: z13.enum(ORG_PLANS), monthlyPriceTry: z13.number().int().min(0).max(1e7).nullable(), yearlyPriceTry: z13.number().int().min(0).max(1e8).nullable(), priceNote: z13.string().trim().max(160).nullable() })).mutation(async ({ ctx, input }) => {
    await upsertOrgPlanPrice({ ...input, priceNote: input.priceNote || null, updatedByUserId: ctx.user.id });
    return { ok: true };
  })
});

// server/routers/parent.ts
import { TRPCError as TRPCError12 } from "@trpc/server";
import { createHash as createHash5, randomInt as randomInt2 } from "node:crypto";
import { z as z14 } from "zod";
var DAY_MS9 = 24 * 60 * 60 * 1e3;
var id5 = z14.number().int().positive();
var hashCode2 = (code) => createHash5("sha256").update(`parent:${normalizeInviteCode(code)}`).digest("hex");
var userFacing5 = async (work) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ParentLinkError) throw new TRPCError12({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
};
function currentWeek2(now = /* @__PURE__ */ new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
var parentRouter = router({
  consentText: protectedProcedure.query(() => ({ version: PARENT_CONSENT_VERSION, text: PARENT_CONSENT_TEXT })),
  // --- Öğrenci tarafı ---------------------------------------------------------
  myParents: protectedProcedure.query(({ ctx }) => listLinksForStudent(ctx.user.id)),
  createInvite: protectedProcedure.input(z14.object({ parentEmail: z14.string().trim().email("Ge\xE7erli bir e-posta adresi yaz.").max(320).optional().or(z14.literal("")) }).optional()).mutation(({ ctx, input }) => userFacing5(async () => {
    const code = generateInviteCode((max) => randomInt2(max));
    const { expiresAt } = await createParentInvite(ctx.user.id, hashCode2(code));
    const joinUrl = `${appBaseUrl(ctx.req)}/veli?kod=${encodeURIComponent(code)}`;
    let emailed = false;
    if (input?.parentEmail) {
      const studentName = await studentDisplayName(ctx.user.id);
      try {
        await sendMail(buildParentInviteEmail({ to: input.parentEmail, studentName, code, joinUrl, expiresAt }));
        emailed = true;
      } catch (error) {
        console.warn("[Parent] invite email failed:", error instanceof Error ? error.message : error);
      }
    }
    return { code, expiresAt, joinUrl, emailed };
  })),
  decide: protectedProcedure.input(z14.object({ linkId: id5, approve: z14.boolean() })).mutation(({ ctx, input }) => userFacing5(() => decideParentRequest(ctx.user.id, input.linkId, input.approve))),
  removeParent: protectedProcedure.input(z14.object({ linkId: id5 })).mutation(({ ctx, input }) => userFacing5(() => revokeParentLink({ userId: ctx.user.id, side: "student" }, input.linkId))),
  // --- Veli tarafı ------------------------------------------------------------
  myStudents: protectedProcedure.query(({ ctx }) => listLinksForParent(ctx.user.id)),
  redeem: protectedProcedure.input(z14.object({ code: z14.string().trim().min(4).max(20), consent: z14.literal(true, { message: "Devam etmek i\xE7in r\u0131za metnini onaylamal\u0131s\u0131n." }) })).mutation(({ ctx, input }) => userFacing5(() => redeemParentInvite(ctx.user.id, hashCode2(input.code)))),
  unlink: protectedProcedure.input(z14.object({ linkId: id5 })).mutation(({ ctx, input }) => userFacing5(() => revokeParentLink({ userId: ctx.user.id, side: "parent" }, input.linkId))),
  setDigest: protectedProcedure.input(z14.object({ linkId: id5, enabled: z14.boolean() })).mutation(({ ctx, input }) => userFacing5(async () => ({ enabled: await setParentDigestEnabled(ctx.user.id, input.linkId, input.enabled) }))),
  /** Velinin gördüğü öğrenci özeti: salt okunur; not, soru defteri, öğretmen notu, iletişim bilgisi yok. */
  student: protectedProcedure.input(z14.object({ studentUserId: id5 })).query(async ({ ctx, input }) => {
    if (!await findActiveLink(ctx.user.id, input.studentUserId)) throw new TRPCError12({ code: "FORBIDDEN", message: "Bu \xF6\u011Frencinin bilgilerini g\xF6rme iznin yok." });
    const since = new Date(Date.now() - 42 * DAY_MS9);
    const { start, end } = currentWeek2();
    const [name2, profile, exams, topics, calendar, signals] = await Promise.all([
      studentDisplayName(input.studentUserId),
      getStudentProfile(input.studentUserId),
      getUserMockExams(input.studentUserId),
      getUserTopicProgress(input.studentUserId),
      getStudentCalendarReadOnly(input.studentUserId, since),
      loadStudentSignals([input.studentUserId], start, end, new Date(Date.now() - 30 * DAY_MS9))
    ]);
    const scoredKind = scoredKindOf(profile.examTrack);
    const latestScored = scoredKind ? exams.filter((exam) => exam.exam === scoredKind).sort((a, b) => b.date.localeCompare(a.date))[0] : void 0;
    const scoreDef = scoredKind ? EXAM_KIND_DEFS[scoredKind].scoreEstimate : null;
    return {
      name: name2,
      profile: { examTrack: profile.examTrack, gradeLevel: profile.gradeLevel, examYear: profile.examYear, targetScoreType: profile.targetScoreType, targetUniversity: profile.targetUniversity, targetDepartment: profile.targetDepartment, targetGoal: profile.targetGoal, targetScore: profile.targetScore, dailyStudyDuration: profile.dailyStudyDuration },
      summary: summarizeStudent(signals.get(input.studentUserId)),
      estimatedScore: scoreDef ? { label: scoreDef.label, max: scoreDef.max, value: latestScored ? estimateScore(scoredKind, latestScored.subjects) : null } : null,
      exams: exams.map((exam) => ({ id: exam.id, title: exam.title, date: exam.date, exam: exam.exam, net: exam.net, subjects: exam.subjects })),
      weakTopics: topics.filter((topic) => !topic.insufficientData && topic.status === "Zay\u0131f").sort((a, b) => a.progress - b.progress).slice(0, 10).map((topic) => ({ slug: topic.slug, subject: topic.subject, topic: topic.topic, progress: topic.progress })),
      sessions: calendar.sessions.map((session) => ({ id: session.id, sessionDate: session.sessionDate, subject: session.subject, topic: session.topic, kind: session.kind, plannedMinutes: session.plannedMinutes, status: session.status, abandonedAt: session.abandonedAt })),
      logs: calendar.logs.map((log) => ({ studyDate: log.studyDate, minutes: log.minutes }))
    };
  })
});

// server/studyPlan/normalizeAiPlan.ts
var KINDS = ["\xD6\u011Frenme", "Soru", "Tekrar", "Deneme analizi"];
var isObj = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var pick = (source, keys) => {
  for (const key of keys) if (source[key] !== void 0 && source[key] !== null && source[key] !== "") return source[key];
  return void 0;
};
var text2 = (value, max) => {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(" ").trim().slice(0, max);
  return "";
};
var optionalText2 = (value, max) => text2(value, max) || null;
var positiveInt = (value, min, max) => {
  const number = Math.round(typeof value === "string" ? Number.parseInt(value, 10) : Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(max, Math.max(min, number)) : null;
};
var kindOf = (value) => {
  const raw = text2(value, 40).toLocaleLowerCase("tr-TR");
  if (KINDS.includes(text2(value, 40))) return text2(value, 40);
  if (raw.includes("\xF6\u011Fren") || raw.includes("konu anlat")) return "\xD6\u011Frenme";
  if (raw.includes("tekrar")) return "Tekrar";
  if (raw.includes("deneme")) return "Deneme analizi";
  return "Soru";
};
var SESSION_LIST_KEYS = ["sessions", "activities", "tasks", "items", "blocks", "oturumlar"];
var DAY_LIST_KEYS = ["days", "weeklyPlan", "plan", "schedule", "gunler"];
function normalizeAiPlan(raw, fallback) {
  if (!isObj(raw)) return fallback;
  const dayList = pick(raw, DAY_LIST_KEYS);
  const days = (Array.isArray(dayList) ? dayList : []).slice(0, 7).flatMap((value) => {
    if (!isObj(value)) return [];
    const sessionList = pick(value, SESSION_LIST_KEYS);
    const sessions = (Array.isArray(sessionList) ? sessionList : []).slice(0, 6).flatMap((item) => {
      if (!isObj(item)) return [];
      const subject2 = text2(pick(item, ["subject", "ders", "lesson", "course"]), 80);
      const topic = text2(pick(item, ["topic", "konu", "unit"]), 180) || text2(pick(item, ["title", "name"]), 180);
      const minutes = positiveInt(pick(item, ["minutes", "duration", "durationMinutes", "plannedMinutes", "dakika", "sure"]), 10, 240);
      if (!subject2 || !topic || !minutes) return [];
      const targetQuestions = positiveInt(pick(item, ["targetQuestions", "questionCount", "questions"]), 1, 500);
      return [{
        title: text2(pick(item, ["title", "name", "activity", "task"]), 180) || `${subject2} \xB7 ${topic}`,
        subject: subject2,
        topic,
        minutes,
        kind: kindOf(pick(item, ["kind", "type", "tur", "category"])),
        rationale: text2(pick(item, ["rationale", "reason", "description", "note", "aciklama"]), 600),
        ...text2(item.bookId, 120) ? { bookId: text2(item.bookId, 120) } : {},
        ...text2(item.bookTitle, 180) ? { bookTitle: text2(item.bookTitle, 180) } : {},
        ...targetQuestions ? { targetQuestions } : {},
        targetPages: optionalText2(item.targetPages, 80),
        targetTests: optionalText2(item.targetTests, 80)
      }];
    });
    if (!sessions.length) return [];
    return [{ day: text2(pick(value, ["day", "dayName", "gun", "name"]), 20), date: text2(pick(value, ["date", "tarih"]), 10), totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0), sessions }];
  });
  if (!days.length) return fallback;
  const focusList = pick(raw, ["focus", "priorities", "focusTopics"]);
  const focus = (Array.isArray(focusList) ? focusList : []).flatMap((item) => {
    if (!isObj(item)) return [];
    const topic = text2(pick(item, ["topic", "konu"]), 180);
    const subject2 = text2(pick(item, ["subject", "ders"]), 80);
    return topic && subject2 ? [{ topic, subject: subject2, reason: text2(pick(item, ["reason", "rationale", "neden"]), 400) }] : [];
  });
  return {
    ...fallback,
    summary: text2(pick(raw, ["summary", "weeklyGoal", "overview", "ozet"]), 2e3) || fallback.summary,
    focus,
    days,
    coachNote: text2(pick(raw, ["coachNote", "coachNotes", "notes", "tips"]), 1e3) || fallback.coachNote
  };
}

// server/routers/resourceCatalog.ts
import { TRPCError as TRPCError14 } from "@trpc/server";
import { z as z16 } from "zod";

// server/resourceCatalog/catalogQueries.ts
import { and as and22, asc as asc4, desc as desc16, eq as eq25, inArray as inArray11, isNull as isNull15, ilike as ilike4, sql as sql13 } from "drizzle-orm";
var DEFAULT_PAGE_SIZE = 24;
var MAX_PAGE_SIZE = 60;
async function listCatalogBooks(filters, page2) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const pageSize = Math.max(1, Math.min(page2.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const offset = Math.max(0, (page2.page - 1) * pageSize);
  const conditions = [eq25(catalogBooks.active, 1)];
  if (filters.exam) conditions.push(eq25(catalogBooks.examScope, filters.exam));
  if (filters.subject) conditions.push(eq25(catalogBooks.subject, filters.subject));
  if (filters.publisherId) conditions.push(eq25(catalogBooks.publisherId, filters.publisherId));
  if (filters.bookType) conditions.push(eq25(catalogBooks.bookType, filters.bookType));
  if (filters.difficulty) conditions.push(eq25(catalogBooks.difficultyLabel, filters.difficulty));
  if (filters.search) conditions.push(ilike4(catalogBooks.name, `%${filters.search}%`));
  let bookIdsForTopic = null;
  if (filters.topic) {
    const topicRows = await db.select({ bookId: bookCurriculumTopics.bookId }).from(bookCurriculumTopics).innerJoin(yksTopics, eq25(bookCurriculumTopics.topicId, yksTopics.id)).where(eq25(yksTopics.topic, filters.topic));
    bookIdsForTopic = topicRows.map((r) => r.bookId);
    if (bookIdsForTopic.length === 0) return { items: [], total: 0 };
    conditions.push(inArray11(catalogBooks.id, bookIdsForTopic));
  }
  const where = and22(...conditions);
  const [{ count: count4 }] = await db.select({ count: sql13`count(*)::int` }).from(catalogBooks).where(where);
  let rows = await db.select().from(catalogBooks).where(where).orderBy(desc16(catalogBooks.createdAt)).limit(pageSize).offset(offset);
  if (filters.minPrice !== void 0 || filters.maxPrice !== void 0) {
    const ids = rows.map((r) => r.id);
    const offerRows2 = ids.length ? await db.select().from(bookOffers).where(inArray11(bookOffers.bookId, ids)) : [];
    const bestPriceByBook = /* @__PURE__ */ new Map();
    for (const offer of offerRows2) {
      if (offer.price === null) continue;
      const price = Number(offer.price);
      const current = bestPriceByBook.get(offer.bookId);
      if (current === void 0 || price < current) bestPriceByBook.set(offer.bookId, price);
    }
    rows = rows.filter((row) => {
      const price = bestPriceByBook.get(row.id);
      if (price === void 0) return false;
      if (filters.minPrice !== void 0 && price < filters.minPrice) return false;
      if (filters.maxPrice !== void 0 && price > filters.maxPrice) return false;
      return true;
    });
  }
  const publisherIds = Array.from(new Set(rows.map((r) => r.publisherId).filter((id8) => id8 !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray11(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const bookIds = rows.map((r) => r.id);
  const offerRows = bookIds.length ? await db.select().from(bookOffers).where(inArray11(bookOffers.bookId, bookIds)) : [];
  const offerByBook = /* @__PURE__ */ new Map();
  for (const offer of offerRows) {
    if (!offerByBook.has(offer.bookId)) offerByBook.set(offer.bookId, { price: offer.price !== null ? Number(offer.price) : null, productUrl: offer.productUrl });
  }
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    publisher: row.publisherId ? publisherNameById.get(row.publisherId) ?? null : null,
    examScope: row.examScope,
    subject: row.subject,
    bookType: row.bookType,
    imageUrl: row.imageUrl,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    price: offerByBook.get(row.id)?.price ?? null,
    productUrl: offerByBook.get(row.id)?.productUrl ?? null
  }));
  return { items, total: Number(count4) };
}
async function listCatalogBooksForAdmin(filters, page2) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const pageSize = Math.max(1, Math.min(page2.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const offset = Math.max(0, (page2.page - 1) * pageSize);
  const conditions = [];
  if (filters.active !== void 0) conditions.push(eq25(catalogBooks.active, filters.active ? 1 : 0));
  if (filters.subject) conditions.push(eq25(catalogBooks.subject, filters.subject));
  if (filters.search) conditions.push(ilike4(catalogBooks.name, `%${filters.search}%`));
  const where = conditions.length ? and22(...conditions) : void 0;
  const countQuery = db.select({ count: sql13`count(*)::int` }).from(catalogBooks);
  const [{ count: count4 }] = await (where ? countQuery.where(where) : countQuery);
  const rowsQuery = db.select().from(catalogBooks).orderBy(desc16(catalogBooks.createdAt)).limit(pageSize).offset(offset);
  const rows = await (where ? rowsQuery.where(where) : rowsQuery);
  const publisherIds = Array.from(new Set(rows.map((r) => r.publisherId).filter((id8) => id8 !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray11(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    publisher: row.publisherId ? publisherNameById.get(row.publisherId) ?? null : null,
    examScope: row.examScope,
    subject: row.subject,
    bookType: row.bookType,
    difficultyLabel: row.difficultyLabel,
    active: row.active === 1,
    needsReview: row.needsReview === 1,
    classificationMethod: row.classificationMethod,
    createdAt: row.createdAt
  }));
  return { items, total: Number(count4) };
}
async function getCatalogBookBySlug(slug) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(catalogBooks).where(eq25(catalogBooks.slug, slug)).limit(1);
  const book = rows[0];
  if (!book) return null;
  const [publisherRow, offerRows, topicRows] = await Promise.all([
    book.publisherId ? db.select().from(publishers).where(eq25(publishers.id, book.publisherId)).limit(1) : Promise.resolve([]),
    db.select().from(bookOffers).where(eq25(bookOffers.bookId, book.id)),
    db.select({ topic: yksTopics.topic, subject: yksTopics.subject, confidence: bookCurriculumTopics.confidence, isVerified: bookCurriculumTopics.isVerified }).from(bookCurriculumTopics).innerJoin(yksTopics, eq25(bookCurriculumTopics.topicId, yksTopics.id)).where(eq25(bookCurriculumTopics.bookId, book.id))
  ]);
  return {
    id: book.id,
    name: book.name,
    slug: book.slug,
    description: book.description,
    publisher: publisherRow[0]?.name ?? null,
    examScope: book.examScope,
    subject: book.subject,
    bookType: book.bookType,
    imageUrl: book.imageUrl,
    difficulty: { label: book.difficultyLabel, score: book.difficultyScore, confidence: Number(book.difficultyConfidence) },
    offers: offerRows.map((o) => ({ source: o.source, price: o.price !== null ? Number(o.price) : null, currency: o.currency, stockStatus: o.stockStatus, productUrl: o.productUrl })),
    relatedTopics: topicRows.map((t2) => ({ topic: t2.topic, subject: t2.subject, confidence: Number(t2.confidence), verified: t2.isVerified === 1 }))
  };
}
async function listPublishersForFilter() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: publishers.id, name: publishers.name }).from(publishers).where(eq25(publishers.isActive, 1)).orderBy(asc4(publishers.name));
}
async function listCatalogBooksForRecommendation(subject2) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq25(catalogBooks.active, 1)];
  if (subject2) conditions.push(eq25(catalogBooks.subject, subject2));
  const rows = await db.select().from(catalogBooks).where(and22(...conditions));
  const bookIds = rows.map((r) => r.id);
  const topicRows = bookIds.length ? await db.select({ bookId: bookCurriculumTopics.bookId, topic: yksTopics.topic }).from(bookCurriculumTopics).innerJoin(yksTopics, eq25(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray11(bookCurriculumTopics.bookId, bookIds)) : [];
  const topicsByBook = /* @__PURE__ */ new Map();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push(row.topic);
    topicsByBook.set(row.bookId, list);
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    examScope: row.examScope,
    bookType: row.bookType,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    active: row.active === 1,
    mappedTopicNames: topicsByBook.get(row.id) ?? []
  }));
}
async function listMyLibraryCatalogBooks(userId) {
  const db = await getDb();
  if (!db) return [];
  const inventoryRows = await db.select().from(bookInventory).where(and22(eq25(bookInventory.userId, userId), isNull15(bookInventory.removedAt)));
  const numericIds = Array.from(new Set(inventoryRows.map((row) => row.bookId).filter((id8) => /^\d+$/.test(id8)).map(Number)));
  if (numericIds.length === 0) return [];
  const [books, topicRows] = await Promise.all([
    db.select().from(catalogBooks).where(inArray11(catalogBooks.id, numericIds)),
    db.select({ bookId: bookCurriculumTopics.bookId, topicId: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, isVerified: bookCurriculumTopics.isVerified, confidence: bookCurriculumTopics.confidence }).from(bookCurriculumTopics).innerJoin(yksTopics, eq25(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray11(bookCurriculumTopics.bookId, numericIds))
  ]);
  const publisherIds = Array.from(new Set(books.map((b) => b.publisherId).filter((id8) => id8 !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray11(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));
  const topicsByBook = /* @__PURE__ */ new Map();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push({ topicId: row.topicId, topic: row.topic, subject: row.subject, isVerified: row.isVerified === 1, confidence: Number(row.confidence) });
    topicsByBook.set(row.bookId, list);
  }
  return books.map((book) => ({
    bookId: book.id,
    name: book.name,
    publisher: book.publisherId ? publisherNameById.get(book.publisherId) ?? null : null,
    subject: book.subject,
    examScope: book.examScope,
    difficultyLabel: book.difficultyLabel,
    pageCount: null,
    topics: topicsByBook.get(book.id) ?? []
  }));
}

// server/resourceCatalog/config.ts
var int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
var float = (value, fallback) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};
var bool = (value, fallback) => {
  if (value === void 0) return fallback;
  return value === "1" || value.toLowerCase() === "true";
};
var resourceCatalogConfig = {
  difficulty: {
    // 0-100 score thresholds. Score <= easyMax -> easy, <= mediumMax -> medium, else hard.
    thresholds: {
      easyMax: int(process.env.RESOURCE_CATALOG_DIFFICULTY_EASY_MAX, 39),
      mediumMax: int(process.env.RESOURCE_CATALOG_DIFFICULTY_MEDIUM_MAX, 69)
    },
    // Hybrid engine weights. Renormalized at runtime if a layer is unavailable
    // (e.g. no AI signal), so they don't need to sum to 1 here.
    weights: {
      rule: float(process.env.RESOURCE_CATALOG_WEIGHT_RULE, 0.45),
      ai: float(process.env.RESOURCE_CATALOG_WEIGHT_AI, 0.4),
      metadata: float(process.env.RESOURCE_CATALOG_WEIGHT_METADATA, 0.15)
    },
    aiEnabled: bool(process.env.RESOURCE_CATALOG_AI_ENABLED, false),
    // Below this confidence, classification is flagged needsReview = true.
    reviewConfidenceThreshold: float(process.env.RESOURCE_CATALOG_REVIEW_CONFIDENCE_THRESHOLD, 0.55)
  },
  recommendation: {
    weights: {
      difficultyFit: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_DIFFICULTY_FIT, 0.35),
      subjectMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_SUBJECT_MATCH, 0.2),
      examMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_EXAM_MATCH, 0.15),
      topicMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_TOPIC_MATCH, 0.15),
      bookTypeMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_BOOK_TYPE_MATCH, 0.05),
      performanceMatch: float(process.env.RESOURCE_CATALOG_REC_WEIGHT_PERFORMANCE_MATCH, 0.1)
    }
  },
  importer: {
    concurrency: int(process.env.RESOURCE_CATALOG_IMPORT_CONCURRENCY, 1),
    delayMs: int(process.env.RESOURCE_CATALOG_IMPORT_DELAY_MS, 800),
    timeoutMs: int(process.env.RESOURCE_CATALOG_IMPORT_TIMEOUT_MS, 15e3),
    maxRetries: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_RETRIES, 3),
    maxPages: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_PAGES, 50),
    maxProducts: int(process.env.RESOURCE_CATALOG_IMPORT_MAX_PRODUCTS, 5e3)
  },
  // In-process background sync (spec: kaynak kataloğu kitapisler.com'dan
  // sürekli güncellenen bir yapı olmalı) — periodically re-runs the same
  // KitapIslerSource pipeline the CLI uses, so the catalog stays fresh
  // without a human running `pnpm resource-catalog` by hand. Off by default
  // under `NODE_ENV=test` so the test suite never makes network calls.
  scheduler: {
    enabled: bool(process.env.RESOURCE_CATALOG_SCHEDULER_ENABLED, process.env.NODE_ENV !== "test"),
    intervalMs: int(process.env.RESOURCE_CATALOG_SCHEDULER_INTERVAL_MS, 6 * 60 * 60 * 1e3),
    initialDelayMs: int(process.env.RESOURCE_CATALOG_SCHEDULER_INITIAL_DELAY_MS, 3e4),
    limitPerRun: int(process.env.RESOURCE_CATALOG_SCHEDULER_LIMIT_PER_RUN, 300)
  }
};

// server/resourceCatalog/recommendationService.ts
init_turkishText();
var DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
var DIFFICULTY_FIT_BY_STATUS = {
  "Zay\u0131f": [1, 0.6, 0.15],
  "Orta": [0.55, 1, 0.45],
  "\u0130yi": [0.25, 0.65, 1]
};
var LEARNING_TYPES = ["topic_explanation", "topic_explanation_question_bank", "fasikul"];
var PRACTICE_TYPES2 = ["question_bank", "test_book"];
var EXAM_STAGE_TYPES = ["mock_exam", "past_questions", "camp"];
var bookTypeFitByStatus = (status, bookType) => {
  if (status === "Zay\u0131f") return LEARNING_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES2.includes(bookType) ? 0.5 : 0.2;
  if (status === "Orta") return PRACTICE_TYPES2.includes(bookType) ? 1 : LEARNING_TYPES.includes(bookType) ? 0.6 : 0.4;
  return EXAM_STAGE_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES2.includes(bookType) ? 0.8 : 0.3;
};
var examScopeCovers = (examScope, exam) => catalogScopeCovers(examScope, exam);
var idealDifficultyScore = (accuracy) => Math.max(0, Math.min(100, accuracy + 15));
var labelFor = (bookDifficulty, status) => {
  const idealRank = DIFFICULTY_FIT_BY_STATUS[status].indexOf(Math.max(...DIFFICULTY_FIT_BY_STATUS[status]));
  const bookRank = DIFFICULTY_RANK[bookDifficulty];
  if (bookRank === idealRank) return "Seviyene uygun";
  if (bookRank === idealRank + 1) return "Bir sonraki seviyeye ge\xE7i\u015F";
  if (bookRank > idealRank + 1) return "\u0130leri seviye";
  return "Temel tekrar kayna\u011F\u0131";
};
function recommendBooksForTopic(topicPerf, books, config = resourceCatalogConfig) {
  const weights = config.recommendation.weights;
  const topicSubjectKey = normalizeForComparison(topicPerf.subject);
  const topicKey = normalizeForComparison(topicPerf.topic);
  const ideal = idealDifficultyScore(topicPerf.accuracy);
  return books.filter((book) => book.active).map((book) => {
    const difficultyFit = DIFFICULTY_FIT_BY_STATUS[topicPerf.status][DIFFICULTY_RANK[book.difficultyLabel]];
    const subjectMatch = book.subject === null ? 0.4 : normalizeForComparison(book.subject) === topicSubjectKey ? 1 : 0;
    const examMatch = examScopeCovers(book.examScope, topicPerf.exam) ? 1 : 0;
    const mappedTopics = (book.mappedTopicNames ?? []).map(normalizeForComparison);
    const topicMatch = mappedTopics.includes(topicKey) ? 1 : subjectMatch === 1 ? 0.3 : 0;
    const bookTypeMatch = bookTypeFitByStatus(topicPerf.status, book.bookType);
    const performanceMatch = 1 - Math.abs(book.difficultyScore - ideal) / 100;
    const rawScore = difficultyFit * weights.difficultyFit + subjectMatch * weights.subjectMatch + examMatch * weights.examMatch + topicMatch * weights.topicMatch + bookTypeMatch * weights.bookTypeMatch + performanceMatch * weights.performanceMatch;
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0;
    const confidenceDamped = normalizedScore * (0.5 + 0.5 * book.difficultyConfidence);
    const score = Math.round(Math.max(0, Math.min(1, confidenceDamped)) * 100);
    const lowConfidenceNote = book.difficultyConfidence < config.difficulty.reviewConfidenceThreshold ? " (zorluk otomatik tahmin, d\xFC\u015F\xFCk g\xFCven)" : "";
    const reason = `Mevcut performans\u0131na (%${Math.round(topicPerf.accuracy)} do\u011Fruluk, ${topicPerf.status}) ve se\xE7ti\u011Fin konuya (${topicPerf.topic}) g\xF6re.${lowConfidenceNote}`;
    return {
      bookId: book.id,
      score,
      label: labelFor(book.difficultyLabel, topicPerf.status),
      reason,
      signals: { difficultyFit, subjectMatch, examMatch, topicMatch, bookTypeMatch, performanceMatch }
    };
  }).filter((rec) => rec.signals.subjectMatch > 0).sort((a, b) => b.score - a.score);
}
var STATUS_PRIORITY = { "Zay\u0131f": 0, "Orta": 1, "\u0130yi": 2 };
function recommendForStudent(topics, books, options = {}, config = resourceCatalogConfig) {
  const limitPerTopic = options.limitPerTopic ?? 3;
  const overallLimit = options.overallLimit ?? 12;
  const sortedTopics = [...topics].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
  const results = [];
  for (const topic of sortedTopics) {
    const perTopic = recommendBooksForTopic(topic, books, config).slice(0, limitPerTopic);
    for (const rec of perTopic) {
      results.push({ ...rec, subject: topic.subject, topic: topic.topic, exam: topic.exam, status: topic.status });
    }
    if (results.length >= overallLimit) break;
  }
  return results.slice(0, overallLimit);
}

// server/routers/resourceCatalogAdmin.ts
import { TRPCError as TRPCError13 } from "@trpc/server";
import { z as z15 } from "zod";

// server/resourceCatalog/catalogDb.ts
import { and as and23, eq as eq26, inArray as inArray12 } from "drizzle-orm";
var toCatalogBookRow = (row) => ({
  id: row.id,
  isbn: row.isbn,
  publisherId: row.publisherId,
  name: row.name,
  editionYear: row.editionYear,
  slug: row.slug,
  bookType: row.bookType,
  examScope: row.examScope,
  subject: row.subject,
  imageUrl: row.imageUrl,
  description: row.description,
  active: row.active === 1,
  manualOverride: row.manualOverride === 1,
  difficultyLabel: row.difficultyLabel,
  difficultyScore: row.difficultyScore,
  difficultyConfidence: Number(row.difficultyConfidence),
  classificationMethod: row.classificationMethod
});
var catalogDb = {
  async findPublisherByNormalizedName(normalizedName) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(publishers).where(eq26(publishers.normalizedName, normalizedName)).limit(1);
    return rows[0] ? { id: rows[0].id, name: rows[0].name, slug: rows[0].slug, normalizedName: rows[0].normalizedName } : null;
  },
  async createPublisher(input) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(publishers).values(input).returning({ id: publishers.id });
    const id8 = Number(result[0].id);
    return { id: id8, ...input };
  },
  async findExternalSource(source, sourceProductId) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(externalBookSources).where(and23(eq26(externalBookSources.source, source), eq26(externalBookSources.sourceProductId, sourceProductId))).limit(1);
    return rows[0] ? { id: rows[0].id, source: rows[0].source, sourceProductId: rows[0].sourceProductId, matchedBookId: rows[0].matchedBookId, syncStatus: rows[0].syncStatus } : null;
  },
  async upsertExternalSource(row) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(externalBookSources).where(and23(eq26(externalBookSources.source, row.source), eq26(externalBookSources.sourceProductId, row.sourceProductId))).limit(1);
    const values = {
      source: row.source,
      sourceProductId: row.sourceProductId,
      sourceUrl: row.sourceUrl,
      rawName: row.rawName,
      rawDescription: row.rawDescription,
      rawPrice: row.rawPrice !== null ? String(row.rawPrice) : null,
      rawCurrency: row.rawCurrency,
      rawImageUrl: row.rawImageUrl,
      rawPublisher: row.rawPublisher,
      rawCategory: row.rawCategory,
      rawIsbn: row.rawIsbn,
      rawMetadata: row.rawMetadata ? JSON.stringify(row.rawMetadata) : null
    };
    if (existing[0]) {
      await db.update(externalBookSources).set(values).where(eq26(externalBookSources.id, existing[0].id));
      return { id: existing[0].id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: existing[0].matchedBookId, syncStatus: existing[0].syncStatus };
    }
    const result = await db.insert(externalBookSources).values(values).returning({ id: externalBookSources.id });
    const id8 = Number(result[0].id);
    return { id: id8, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: null, syncStatus: "pending" };
  },
  async markExternalSourceOutcome(id8, patch) {
    const db = await getDb();
    if (!db) return;
    await db.update(externalBookSources).set({ matchedBookId: patch.matchedBookId, syncStatus: patch.syncStatus, lastSyncedAt: /* @__PURE__ */ new Date(), errorMessage: patch.errorMessage ?? null }).where(eq26(externalBookSources.id, id8));
  },
  async findCatalogBookByIsbn(isbn) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq26(catalogBooks.isbn, isbn)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },
  async listCatalogBooksByPublisher(publisherId) {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(catalogBooks).where(eq26(catalogBooks.publisherId, publisherId));
    return rows.map((row) => ({ id: row.id, isbn: row.isbn, publisherId: row.publisherId, name: row.name, editionYear: row.editionYear }));
  },
  async getCatalogBookById(id8) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq26(catalogBooks.id, id8)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },
  async createCatalogBook(input) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(catalogBooks).values({
      publisherId: input.publisherId,
      name: input.name,
      slug: input.slug,
      isbn: input.isbn,
      editionYear: input.editionYear,
      description: input.description,
      imageUrl: input.imageUrl,
      bookType: input.bookType,
      examScope: input.examScope,
      subject: input.subject,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    }).returning({ id: catalogBooks.id });
    const id8 = Number(result[0].id);
    const row = await this.getCatalogBookById(id8);
    if (!row) throw new Error("Failed to read back created catalog book");
    return row;
  },
  async updateCatalogBook(id8, patch) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const values = {};
    if (patch.publisherId !== void 0) values.publisherId = patch.publisherId;
    if (patch.name !== void 0) values.name = patch.name;
    if (patch.isbn !== void 0) values.isbn = patch.isbn;
    if (patch.editionYear !== void 0) values.editionYear = patch.editionYear;
    if (patch.description !== void 0) values.description = patch.description;
    if (patch.imageUrl !== void 0) values.imageUrl = patch.imageUrl;
    if (patch.bookType !== void 0) values.bookType = patch.bookType;
    if (patch.examScope !== void 0) values.examScope = patch.examScope;
    if (patch.subject !== void 0) values.subject = patch.subject;
    if (patch.metadata !== void 0) values.metadata = patch.metadata ? JSON.stringify(patch.metadata) : null;
    if (Object.keys(values).length > 0) {
      await db.update(catalogBooks).set(values).where(eq26(catalogBooks.id, id8));
    }
    const row = await this.getCatalogBookById(id8);
    if (!row) throw new Error(`Catalog book ${id8} not found after update`);
    return row;
  },
  async updateCatalogBookDifficulty(id8, patch) {
    const db = await getDb();
    if (!db) return;
    await db.update(catalogBooks).set({
      difficultyScore: patch.difficultyScore,
      difficultyLabel: patch.difficultyLabel,
      difficultyConfidence: String(patch.difficultyConfidence),
      classificationMethod: patch.classificationMethod,
      needsReview: patch.needsReview ? 1 : 0,
      classifiedAt: patch.classifiedAt
    }).where(eq26(catalogBooks.id, id8));
  },
  async upsertBookOffer(input) {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(bookOffers).where(and23(eq26(bookOffers.bookId, input.bookId), eq26(bookOffers.source, input.source))).limit(1);
    const values = { price: input.price !== null ? String(input.price) : null, currency: input.currency, productUrl: input.productUrl, lastSyncedAt: /* @__PURE__ */ new Date() };
    if (existing[0]) {
      await db.update(bookOffers).set(values).where(eq26(bookOffers.id, existing[0].id));
    } else {
      await db.insert(bookOffers).values({ bookId: input.bookId, source: input.source, ...values });
    }
  },
  async listCurriculumTopics() {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(yksTopics);
    return rows.map((row) => ({ id: row.id, exam: row.exam, subject: row.subject, topic: row.topic, unit: row.unit }));
  },
  async upsertBookCurriculumMapping(input) {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(bookCurriculumTopics).where(and23(eq26(bookCurriculumTopics.bookId, input.bookId), eq26(bookCurriculumTopics.topicId, input.topicId))).limit(1);
    if (existing[0]) {
      if (existing[0].isVerified === 1) return;
      await db.update(bookCurriculumTopics).set({ confidence: String(input.confidence), mappingMethod: "rule" }).where(eq26(bookCurriculumTopics.id, existing[0].id));
    } else {
      await db.insert(bookCurriculumTopics).values({ bookId: input.bookId, topicId: input.topicId, confidence: String(input.confidence), mappingMethod: "rule" });
    }
  },
  async createSyncLog(input) {
    const db = await getDb();
    if (!db) return { id: -1 };
    const result = await db.insert(resourceCatalogSyncLogs).values({ source: input.source, startedAt: input.startedAt, dryRun: input.dryRun ? 1 : 0, triggeredBy: input.triggeredBy }).returning({ id: resourceCatalogSyncLogs.id });
    return { id: Number(result[0].id) };
  },
  async finishSyncLog(id8, patch) {
    if (id8 < 0) return;
    const db = await getDb();
    if (!db) return;
    await db.update(resourceCatalogSyncLogs).set({
      finishedAt: patch.finishedAt,
      fetched: patch.fetched,
      created: patch.created,
      updated: patch.updated,
      skipped: patch.skipped,
      failed: patch.failed,
      needsReview: patch.needsReview,
      statsJson: patch.statsJson,
      errorLog: patch.errorLog
    }).where(eq26(resourceCatalogSyncLogs.id, id8));
  }
};
async function listResourceCatalogSyncLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resourceCatalogSyncLogs).orderBy(resourceCatalogSyncLogs.id).limit(limit);
}
async function listNeedsReviewBooks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(catalogBooks).where(eq26(catalogBooks.needsReview, 1));
}
async function setManualDifficulty(bookId, input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ difficultyLabel: input.label, difficultyScore: input.score, difficultyConfidence: "1", classificationMethod: "manual", manualOverride: 1, needsReview: 0, classifiedAt: /* @__PURE__ */ new Date() }).where(eq26(catalogBooks.id, bookId));
}
async function approveCatalogBookClassification(bookId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: 0 }).where(eq26(catalogBooks.id, bookId));
}
async function markCatalogBookNeedsReview(bookId, needsReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: needsReview ? 1 : 0 }).where(eq26(catalogBooks.id, bookId));
}
async function setCatalogBookActive(bookId, active) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ active: active ? 1 : 0 }).where(eq26(catalogBooks.id, bookId));
}
async function resolveOrCreatePublisherByName(rawName) {
  const trimmed = rawName.trim();
  if (!trimmed) return null;
  const { normalizePublisherName: normalizePublisherName2 } = await Promise.resolve().then(() => (init_publisherNormalizer(), publisherNormalizer_exports));
  const normalized = normalizePublisherName2(trimmed);
  const existing = await catalogDb.findPublisherByNormalizedName(normalized.normalizedName);
  if (existing) return existing.id;
  const created = await catalogDb.createPublisher({ name: normalized.canonicalName, slug: normalized.slug, normalizedName: normalized.normalizedName });
  return created.id;
}

// server/resourceCatalog/normalizers/bookTypeNormalizer.ts
init_turkishText();
var RAW_RULES = [
  { type: "topic_explanation_question_bank", anyOf: ["konu anlat\u0131ml\u0131 soru bankas\u0131", "konu anlat\u0131ml\u0131 ve soru bankas\u0131"] },
  { type: "mock_exam", anyOf: ["deneme", "deneme s\u0131nav\u0131", "bran\u015F denemesi", "sim\xFClasyon"] },
  { type: "past_questions", anyOf: ["\xE7\u0131km\u0131\u015F sorular", "\xE7\u0131km\u0131\u015F soru", "\xF6sym \xE7\u0131km\u0131\u015F"] },
  { type: "camp", anyOf: ["kamp kitab\u0131", "yaz kamp\u0131", "kamp"] },
  { type: "fasikul", anyOf: ["fasik\xFCl", "fasik\xFCller"] },
  { type: "test_book", anyOf: ["yaprak test", "test kitab\u0131", "test kitaplar\u0131"] },
  { type: "topic_explanation", anyOf: ["konu anlat\u0131m\u0131", "konu anlat\u0131ml\u0131", "ders i\u015Fleme f\xF6y\xFC", "\xF6zet konu"] },
  { type: "question_bank", anyOf: ["soru bankas\u0131", "soru bankalar\u0131"] },
  { type: "reference", anyOf: ["ba\u015Fvuru kayna\u011F\u0131", "s\xF6zl\xFCk", "form\xFCler"] }
];
var RULES = RAW_RULES.map((rule) => ({ type: rule.type, anyOf: rule.anyOf.map(normalizeKeepingTurkish) }));
function normalizeBookType(rawCategory) {
  if (!rawCategory) return "other";
  const normalized = normalizeKeepingTurkish(rawCategory);
  for (const rule of RULES) {
    if (rule.anyOf.some((phrase) => normalized.includes(phrase))) return rule.type;
  }
  return "other";
}
function normalizeExamScope(rawExam) {
  if (!rawExam) return "GENEL";
  const normalized = normalizeKeepingTurkish(rawExam);
  const hasTyt = /\btyt\b/.test(normalized);
  const hasAyt = /\bayt\b/.test(normalized);
  if (hasTyt && hasAyt) return "TYT_AYT";
  if (hasTyt) return "TYT";
  if (hasAyt) return "AYT";
  if (normalized.includes("yks")) return "YKS";
  return "GENEL";
}

// server/resourceCatalog/pipeline/normalize.ts
init_publisherNormalizer();
init_turkishText();
function normalizeProduct(product) {
  const publisher = product.rawPublisher ? normalizePublisherName(product.rawPublisher) : null;
  const metadata = product.rawMetadata ?? {};
  const subject2 = typeof metadata.subjectLabel === "string" ? metadata.subjectLabel : null;
  const examLabelSource = typeof metadata.examLabel === "string" ? metadata.examLabel : product.rawCategory;
  return {
    raw: product,
    name: product.rawName.trim().replace(/\s+/g, " "),
    publisherName: publisher?.canonicalName ?? null,
    publisherSlug: publisher?.slug ?? null,
    publisherNormalizedName: publisher?.normalizedName ?? null,
    isbn: product.rawIsbn ? product.rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase() || null : null,
    editionYear: typeof metadata.editionYear === "number" ? metadata.editionYear : null,
    description: product.rawDescription?.trim() || null,
    imageUrl: product.rawImageUrl ?? null,
    bookType: normalizeBookType(product.rawCategory),
    examScope: normalizeExamScope(examLabelSource ?? null),
    subject: subject2,
    price: typeof product.rawPrice === "number" ? product.rawPrice : null,
    currency: product.rawCurrency ?? "TRY"
  };
}
function slugForBook(name2, publisherName) {
  const base = publisherName ? `${name2} ${publisherName}` : name2;
  return slugify2(base);
}

// server/routers/resourceCatalogAdmin.ts
var bookTypeEnum = z15.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
var examScopeEnum = z15.enum(CATALOG_EXAM_SCOPES);
var catalogBookInput = z15.object({
  name: z15.string().trim().min(1).max(300),
  publisherName: z15.string().trim().max(120).optional(),
  isbn: z15.string().trim().max(32).optional(),
  editionYear: z15.number().int().min(1990).max(2100).optional(),
  description: z15.string().trim().max(2e3).optional(),
  imageUrl: z15.string().trim().max(500).optional(),
  bookType: bookTypeEnum,
  examScope: examScopeEnum,
  subject: z15.string().trim().max(80).optional()
});
var resourceCatalogAdminRouter = router({
  needsReview: adminProcedure.query(() => listNeedsReviewBooks()),
  syncLogs: adminProcedure.input(z15.object({ limit: z15.number().int().min(1).max(100).default(20) }).optional()).query(({ input }) => listResourceCatalogSyncLogs(input?.limit ?? 20)),
  approve: adminProcedure.input(z15.object({ bookId: z15.number().int() })).mutation(({ input }) => approveCatalogBookClassification(input.bookId)),
  setDifficulty: adminProcedure.input(z15.object({ bookId: z15.number().int(), label: z15.enum(["easy", "medium", "hard"]), score: z15.number().int().min(0).max(100) })).mutation(({ input }) => setManualDifficulty(input.bookId, { label: input.label, score: input.score })),
  markNeedsReview: adminProcedure.input(z15.object({ bookId: z15.number().int(), needsReview: z15.boolean() })).mutation(({ input }) => markCatalogBookNeedsReview(input.bookId, input.needsReview)),
  list: adminProcedure.input(z15.object({ page: z15.number().int().min(1).default(1), pageSize: z15.number().int().min(1).max(100).default(30), search: z15.string().max(120).optional(), subject: z15.string().max(80).optional(), active: z15.boolean().optional() })).query(async ({ input }) => {
    const { page: page2, pageSize, ...filters } = input;
    const { items, total } = await listCatalogBooksForAdmin(filters, { page: page2, pageSize });
    return { items, total, page: page2, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),
  create: adminProcedure.input(catalogBookInput).mutation(async ({ input }) => {
    const publisherId = input.publisherName ? await resolveOrCreatePublisherByName(input.publisherName) : null;
    const baseSlug = slugForBook(input.name, input.publisherName ?? null);
    try {
      return await catalogDb.createCatalogBook({
        publisherId,
        name: input.name,
        slug: baseSlug,
        isbn: input.isbn || null,
        editionYear: input.editionYear ?? null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        bookType: input.bookType,
        examScope: input.examScope,
        subject: input.subject || null,
        metadata: { source: "admin_manual" }
      });
    } catch (error) {
      const retrySlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        return await catalogDb.createCatalogBook({
          publisherId,
          name: input.name,
          slug: retrySlug,
          isbn: input.isbn || null,
          editionYear: input.editionYear ?? null,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          bookType: input.bookType,
          examScope: input.examScope,
          subject: input.subject || null,
          metadata: { source: "admin_manual" }
        });
      } catch {
        throw new TRPCError13({ code: "CONFLICT", message: "Bu isim ve yay\u0131nevi ile bir kaynak zaten kay\u0131tl\u0131 olabilir. Farkl\u0131 bir isim dener misin?" });
      }
    }
  }),
  update: adminProcedure.input(
    z15.object({
      bookId: z15.number().int(),
      name: z15.string().trim().min(1).max(300).optional(),
      publisherName: z15.string().trim().max(120).optional(),
      isbn: z15.string().trim().max(32).optional(),
      editionYear: z15.number().int().min(1990).max(2100).optional(),
      description: z15.string().trim().max(2e3).optional(),
      imageUrl: z15.string().trim().max(500).optional(),
      bookType: bookTypeEnum.optional(),
      examScope: examScopeEnum.optional(),
      subject: z15.string().trim().max(80).optional()
    })
  ).mutation(async ({ input }) => {
    const { bookId, publisherName, ...rest } = input;
    const publisherId = publisherName !== void 0 ? await resolveOrCreatePublisherByName(publisherName) : void 0;
    return catalogDb.updateCatalogBook(bookId, {
      ...rest,
      ...publisherId !== void 0 ? { publisherId } : {}
    });
  }),
  setActive: adminProcedure.input(z15.object({ bookId: z15.number().int(), active: z15.boolean() })).mutation(({ input }) => setCatalogBookActive(input.bookId, input.active))
});

// server/routers/resourceCatalog.ts
var bookTypeEnum2 = z16.enum(["question_bank", "topic_explanation", "topic_explanation_question_bank", "mock_exam", "fasikul", "past_questions", "camp", "test_book", "reference", "other"]);
var examScopeEnum2 = z16.enum(CATALOG_EXAM_SCOPES);
var difficultyEnum = z16.enum(["easy", "medium", "hard"]);
var listInput = z16.object({
  page: z16.number().int().min(1).default(1),
  pageSize: z16.number().int().min(1).max(60).default(24),
  exam: examScopeEnum2.optional(),
  subject: z16.string().max(80).optional(),
  publisherId: z16.number().int().optional(),
  bookType: bookTypeEnum2.optional(),
  difficulty: difficultyEnum.optional(),
  minPrice: z16.number().min(0).optional(),
  maxPrice: z16.number().min(0).optional(),
  search: z16.string().max(120).optional(),
  topic: z16.string().max(180).optional()
});
var resourceCatalogRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const { page: page2, pageSize, ...filters } = input;
    const { items, total } = await listCatalogBooks(filters, { page: page2, pageSize });
    return { items, total, page: page2, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),
  get: publicProcedure.input(z16.object({ slug: z16.string().min(1).max(320) })).query(async ({ input }) => {
    const book = await getCatalogBookBySlug(input.slug);
    if (!book) throw new TRPCError14({ code: "NOT_FOUND", message: "Kaynak bulunamad\u0131" });
    return book;
  }),
  publishers: publicProcedure.query(() => listPublishersForFilter()),
  /** "Seviyene Uygun Kaynaklar" — deterministic, explainable per-topic
   * recommendations built from the student's own topic progress (spec §21/§34). */
  recommendations: protectedProcedure.input(z16.object({ subject: z16.string().max(80).optional(), limit: z16.number().int().min(1).max(30).default(12) })).query(async ({ ctx, input }) => {
    const progress = await getUserTopicProgress(ctx.user.id);
    const allTopics = progress.map((p) => ({ subject: p.subject, topic: p.topic, exam: p.exam, accuracy: p.progress, status: p.status }));
    const topics = input.subject ? allTopics.filter((t2) => t2.subject === input.subject) : allTopics;
    const books = await listCatalogBooksForRecommendation(input.subject);
    const recommendations = recommendForStudent(topics, books, { overallLimit: input.limit });
    const bookById = new Map(books.map((b) => [b.id, b]));
    return recommendations.map((rec) => ({ ...rec, book: bookById.get(rec.bookId) ?? null }));
  }),
  /** Kütüphanem — kataloğdan "kütüphaneme ekle" dediğim kitapların, gerçek
   * müfredat konu bağlantılarıyla birlikte listesi. Takvim sekmesi bunu
   * kullanarak "bu kitaptan oturum oluştur" akışında ders/konuyu otomatik doldurur. */
  myLibrary: protectedProcedure.query(({ ctx }) => listMyLibraryCatalogBooks(ctx.user.id)),
  admin: resourceCatalogAdminRouter
});

// server/routers/onboarding.ts
import { TRPCError as TRPCError15 } from "@trpc/server";
import { z as z17 } from "zod";

// shared/onboarding.ts
var AVATAR_STYLES = ["girl", "boy"];
var EXAM_TRACK_OPTIONS = EXAM_TRACKS.map((track) => ({ value: track, ...EXAM_TRACK_DEFS[track].onboarding }));
var gradeLevelsFor = (track) => [...EXAM_TRACK_DEFS[track].gradeLevels];
var TARGET_SCORE_TYPES = ["SAY", "EA", "SOZ", "DIL", "TYT", "belirsiz"];
var MOCK_EXAM_FREQUENCIES = ["haftada_birkac", "haftada_bir", "ayda_birkac", "nadiren", "henuz_cozmedim"];
var STUDY_DAYS = ["Pazartesi", "Sal\u0131", "\xC7ar\u015Famba", "Per\u015Fembe", "Cuma", "Cumartesi", "Pazar"];
var STUDY_TIMES = ["sabah", "oglen", "aksam", "gece"];
var STUDY_METHODS = ["konu_anlatimi", "soru_cozumu", "deneme", "tekrar", "karisik"];
var COACHING_EXPECTATIONS = ["gunluk_plan", "haftalik_plan", "konu_takibi", "deneme_analizi", "motivasyon", "eksik_konu_tespiti", "hepsi"];
var NOTIFICATION_PREFERENCES = ["gunluk", "haftalik", "onemli_anlarda", "kapali"];
var COACHING_STYLES = ["destekleyici", "disiplinli", "kisa_net", "detayli", "dengeli"];
var ONBOARDING_STEP_META = [
  { step: 0, key: "identity", title: "Seni tan\u0131yal\u0131m", eyebrow: "1. Ad\u0131m \xB7 Tan\u0131\u015Fal\u0131m" },
  { step: 1, key: "academic", title: "Akademik durumun", eyebrow: "2. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 2, key: "goals", title: "Hedeflerin", eyebrow: "3. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 3, key: "routine", title: "\xC7al\u0131\u015Fma d\xFCzenin", eyebrow: "4. Ad\u0131m \xB7 Ko\xE7luk bilgisi" },
  { step: 4, key: "coaching", title: "Ko\xE7luk tercihlerin", eyebrow: "5. Ad\u0131m \xB7 Ko\xE7luk bilgisi" }
];
var TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_META.length;
var emptyOnboardingDraft = () => ({
  preferredName: "",
  avatarStyle: "",
  examTrack: "",
  gradeLevel: "",
  examYear: "",
  targetScoreType: "",
  currentTytNet: "",
  currentAytNet: "",
  currentNet: "",
  mockExamFrequency: "",
  selectedSubjects: [],
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: "",
  targetUniversity: "",
  targetDepartment: "",
  targetRanking: "",
  targetGoal: "",
  targetScore: "",
  mainGoal: "",
  shortTermGoal: "",
  longTermGoal: "",
  dailyStudyDuration: "",
  preferredStudyStartTime: "",
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: "",
  coachingExpectations: [],
  notificationPreference: "",
  coachingStyle: "",
  additionalNotes: ""
});
var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
function validateOnboardingStep(step, draft) {
  const errors = {};
  if (step === 0) {
    if (!draft.preferredName.trim()) errors.preferredName = "Sana nas\u0131l hitap edelim, yazar m\u0131s\u0131n?";
    if (!draft.examTrack) errors.examTrack = "Hangi s\u0131nava haz\u0131rland\u0131\u011F\u0131n\u0131 se\xE7.";
    if (draft.examTrack && EXAM_TRACK_DEFS[draft.examTrack].chooseSubjects && draft.selectedSubjects.length === 0) errors.selectedSubjects = "Girece\u011Fin en az bir alan testini se\xE7.";
    if (!draft.gradeLevel) errors.gradeLevel = "S\u0131n\u0131f d\xFCzeyini se\xE7.";
    else if (draft.examTrack && !gradeLevelsFor(draft.examTrack).includes(draft.gradeLevel)) errors.gradeLevel = "Bu s\u0131nav i\xE7in s\u0131n\u0131f d\xFCzeyini yeniden se\xE7.";
    if (!draft.examYear.trim()) errors.examYear = "Hedef s\u0131nav y\u0131l\u0131n\u0131 gir.";
    else {
      const year = Number(draft.examYear);
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 6) {
        errors.examYear = `${currentYear} ile ${currentYear + 6} aras\u0131nda bir y\u0131l gir.`;
      }
    }
    if (EXAM_TRACK_DEFS[draft.examTrack || "YKS"].asksScoreType && !draft.targetScoreType) errors.targetScoreType = "Hedef puan t\xFCr\xFCn\xFC se\xE7.";
  }
  const scoreRule = EXAM_TRACK_DEFS[draft.examTrack || "YKS"].targetScore;
  if (step === 2 && scoreRule && draft.targetScore.trim()) {
    const score = Number(draft.targetScore.replace(",", "."));
    if (!Number.isFinite(score) || score < scoreRule.min || score > scoreRule.max) errors.targetScore = `Puan ${scoreRule.min} ile ${scoreRule.max} aras\u0131nda olmal\u0131 (iste\u011Fe ba\u011Fl\u0131).`;
  }
  if (step === 1) {
  }
  if (step === 2) {
  }
  if (step === 3) {
    if (draft.dailyStudyDuration.trim()) {
      const minutes = Number(draft.dailyStudyDuration);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 960) {
        errors.dailyStudyDuration = "0-960 dakika aras\u0131nda bir s\xFCre gir (iste\u011Fe ba\u011Fl\u0131).";
      }
    }
    if (draft.preferredStudyStartTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.preferredStudyStartTime.trim())) {
      errors.preferredStudyStartTime = "Saat SS:DD bi\xE7iminde olmal\u0131 (iste\u011Fe ba\u011Fl\u0131).";
    }
  }
  if (step === 4) {
  }
  return errors;
}

// server/tracks/trackDb.ts
import { and as and24, asc as asc5, eq as eq27 } from "drizzle-orm";
var TrackError = class extends Error {
};
var TRACK_FIELDS = ["gradeLevel", "examYear", "targetScoreType", "currentTytNet", "currentAytNet", "currentNet", "targetUniversity", "targetDepartment", "targetRanking", "targetGoal", "targetScore", "selectedSubjectsJson"];
var pick2 = (row) => Object.fromEntries(TRACK_FIELDS.map((key) => [key, row[key] ?? null]));
var emptyFields = () => Object.fromEntries(TRACK_FIELDS.map((key) => [key, null]));
async function requireDb10() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 ba\u011Flant\u0131s\u0131 yok.");
  return db;
}
async function syncActiveTrack(userId) {
  const db = await getDb();
  if (!db) return;
  const [profile] = await db.select().from(studentProfiles).where(eq27(studentProfiles.userId, userId)).limit(1);
  if (!profile) return;
  const fields2 = pick2(profile);
  await db.insert(studentExamTracks).values({ userId, track: profile.examTrack, ...fields2 }).onConflictDoUpdate({ target: [studentExamTracks.userId, studentExamTracks.track], set: fields2 });
}
async function listTracks(userId) {
  const db = await requireDb10();
  const [profile] = await db.select({ examTrack: studentProfiles.examTrack, onboardingCompleted: studentProfiles.onboardingCompleted }).from(studentProfiles).where(eq27(studentProfiles.userId, userId)).limit(1);
  if (!profile) return [];
  let rows = await db.select().from(studentExamTracks).where(eq27(studentExamTracks.userId, userId)).orderBy(asc5(studentExamTracks.createdAt));
  if (!rows.some((row) => row.track === profile.examTrack) && profile.onboardingCompleted) {
    await syncActiveTrack(userId);
    rows = await db.select().from(studentExamTracks).where(eq27(studentExamTracks.userId, userId)).orderBy(asc5(studentExamTracks.createdAt));
  }
  return rows.map((row) => ({ track: row.track, active: row.track === profile.examTrack, examYear: row.examYear, gradeLevel: row.gradeLevel, selectedSubjects: parseList(row.selectedSubjectsJson) })).sort((a, b) => Number(b.active) - Number(a.active));
}
var parseList = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
async function addTrack(userId, input) {
  const db = await requireDb10();
  const def = EXAM_TRACK_DEFS[input.track];
  if (!def.gradeLevels.includes(input.gradeLevel)) throw new TrackError("Bu s\u0131nav i\xE7in e\u011Fitim durumunu yeniden se\xE7.");
  const validSubjects = subjectNamesOf(defaultKindOf(input.track));
  const selected = (input.selectedSubjects ?? []).filter((subject2) => validSubjects.includes(subject2));
  if (def.chooseSubjects && selected.length === 0) throw new TrackError("Girece\u011Fin en az bir alan testini se\xE7.");
  await syncActiveTrack(userId);
  const [existing] = await db.select({ id: studentExamTracks.id }).from(studentExamTracks).where(and24(eq27(studentExamTracks.userId, userId), eq27(studentExamTracks.track, input.track))).limit(1);
  if (existing) throw new TrackError(`${def.label} zaten s\u0131navlar\u0131n aras\u0131nda.`);
  await db.insert(studentExamTracks).values({ userId, track: input.track, ...emptyFields(), gradeLevel: input.gradeLevel, examYear: input.examYear, selectedSubjectsJson: selected.length ? JSON.stringify(selected) : null });
  if (input.activate) await switchTrack(userId, input.track);
}
async function switchTrack(userId, track) {
  const db = await requireDb10();
  await syncActiveTrack(userId);
  const [target] = await db.select().from(studentExamTracks).where(and24(eq27(studentExamTracks.userId, userId), eq27(studentExamTracks.track, track))).limit(1);
  if (!target) throw new TrackError("Bu s\u0131nav hen\xFCz eklenmemi\u015F.");
  await db.update(studentProfiles).set({ examTrack: track, ...pick2(target) }).where(eq27(studentProfiles.userId, userId));
}
async function removeTrack(userId, track) {
  const db = await requireDb10();
  const [profile] = await db.select({ examTrack: studentProfiles.examTrack }).from(studentProfiles).where(eq27(studentProfiles.userId, userId)).limit(1);
  if (profile?.examTrack === track) throw new TrackError("Aktif s\u0131nav\u0131 \xE7\u0131karamazs\u0131n; \xF6nce ba\u015Fka bir s\u0131nava ge\xE7.");
  await db.delete(studentExamTracks).where(and24(eq27(studentExamTracks.userId, userId), eq27(studentExamTracks.track, track)));
}

// server/routers/onboarding.ts
var trackErrors = async (work) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof TrackError) throw new TRPCError15({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
};
var enumOrBlank = (values) => z17.union([z17.enum(values), z17.literal("")]);
var draftSchema = z17.object({
  preferredName: z17.string().trim().max(120).optional(),
  avatarStyle: enumOrBlank(AVATAR_STYLES).optional(),
  examTrack: enumOrBlank(EXAM_TRACKS).optional(),
  gradeLevel: enumOrBlank(GRADE_LEVELS).optional(),
  examYear: z17.string().max(4).optional(),
  targetScoreType: enumOrBlank(TARGET_SCORE_TYPES).optional(),
  currentTytNet: z17.string().trim().max(40).optional(),
  currentAytNet: z17.string().trim().max(40).optional(),
  currentNet: z17.string().trim().max(40).optional(),
  mockExamFrequency: enumOrBlank(MOCK_EXAM_FREQUENCIES).optional(),
  selectedSubjects: z17.array(z17.string().max(60)).max(15).optional(),
  strongSubjects: z17.array(z17.string().max(40)).max(15).optional(),
  weakSubjects: z17.array(z17.string().max(40)).max(15).optional(),
  hasPriorStudyPlan: enumOrBlank(["yes", "no"]).optional(),
  targetUniversity: z17.string().trim().max(180).optional(),
  targetDepartment: z17.string().trim().max(180).optional(),
  targetRanking: z17.string().trim().max(60).optional(),
  targetGoal: z17.string().trim().max(180).optional(),
  targetScore: z17.string().trim().max(20).optional(),
  mainGoal: z17.string().trim().max(500).optional(),
  shortTermGoal: z17.string().trim().max(500).optional(),
  longTermGoal: z17.string().trim().max(500).optional(),
  dailyStudyDuration: z17.string().max(6).optional(),
  preferredStudyStartTime: z17.string().max(5).optional(),
  availableStudyDays: z17.array(z17.enum(STUDY_DAYS)).max(7).optional(),
  preferredStudyTimes: z17.array(z17.enum(STUDY_TIMES)).max(4).optional(),
  preferredStudyMethods: z17.array(z17.enum(STUDY_METHODS)).max(5).optional(),
  studyObstacles: z17.string().trim().max(500).optional(),
  coachingExpectations: z17.array(z17.enum(COACHING_EXPECTATIONS)).max(7).optional(),
  notificationPreference: enumOrBlank(NOTIFICATION_PREFERENCES).optional(),
  coachingStyle: enumOrBlank(COACHING_STYLES).optional(),
  additionalNotes: z17.string().trim().max(1e3).optional()
});
var saveStepInput = z17.object({
  step: z17.number().int().min(0).max(TOTAL_ONBOARDING_STEPS - 1),
  data: draftSchema,
  complete: z17.boolean().optional()
});
function draftToPatch(data) {
  const patch = {};
  if (data.preferredName !== void 0) patch.preferredName = data.preferredName || null;
  if (data.avatarStyle !== void 0) patch.avatarStyle = data.avatarStyle || null;
  if (data.examTrack) patch.examTrack = data.examTrack;
  if (data.gradeLevel !== void 0) patch.gradeLevel = data.gradeLevel || null;
  if (data.examYear !== void 0) patch.examYear = data.examYear ? Number(data.examYear) : null;
  if (data.targetScoreType !== void 0) patch.targetScoreType = data.targetScoreType || null;
  if (data.currentTytNet !== void 0) patch.currentTytNet = data.currentTytNet || null;
  if (data.currentAytNet !== void 0) patch.currentAytNet = data.currentAytNet || null;
  if (data.currentNet !== void 0) patch.currentNet = data.currentNet || null;
  if (data.mockExamFrequency !== void 0) patch.mockExamFrequency = data.mockExamFrequency || null;
  if (data.selectedSubjects !== void 0) patch.selectedSubjects = data.selectedSubjects;
  if (data.strongSubjects !== void 0) patch.strongSubjects = data.strongSubjects;
  if (data.weakSubjects !== void 0) patch.weakSubjects = data.weakSubjects;
  if (data.hasPriorStudyPlan !== void 0) patch.hasPriorStudyPlan = data.hasPriorStudyPlan === "yes" ? true : data.hasPriorStudyPlan === "no" ? false : null;
  if (data.targetUniversity !== void 0) patch.targetUniversity = data.targetUniversity || null;
  if (data.targetDepartment !== void 0) patch.targetDepartment = data.targetDepartment || null;
  if (data.targetRanking !== void 0) patch.targetRanking = data.targetRanking || null;
  if (data.targetGoal !== void 0) patch.targetGoal = data.targetGoal || null;
  if (data.targetScore !== void 0) patch.targetScore = data.targetScore || null;
  if (data.mainGoal !== void 0) patch.mainGoal = data.mainGoal || null;
  if (data.shortTermGoal !== void 0) patch.shortTermGoal = data.shortTermGoal || null;
  if (data.longTermGoal !== void 0) patch.longTermGoal = data.longTermGoal || null;
  if (data.dailyStudyDuration !== void 0) patch.dailyStudyDuration = data.dailyStudyDuration ? Number(data.dailyStudyDuration) : null;
  if (data.preferredStudyStartTime !== void 0) patch.preferredStudyStartTime = data.preferredStudyStartTime || null;
  if (data.availableStudyDays !== void 0) patch.availableStudyDays = data.availableStudyDays;
  if (data.preferredStudyTimes !== void 0) patch.preferredStudyTimes = data.preferredStudyTimes;
  if (data.preferredStudyMethods !== void 0) patch.preferredStudyMethods = data.preferredStudyMethods;
  if (data.studyObstacles !== void 0) patch.studyObstacles = data.studyObstacles || null;
  if (data.coachingExpectations !== void 0) patch.coachingExpectations = data.coachingExpectations;
  if (data.notificationPreference !== void 0) patch.notificationPreference = data.notificationPreference || null;
  if (data.coachingStyle !== void 0) patch.coachingStyle = data.coachingStyle || null;
  if (data.additionalNotes !== void 0) patch.additionalNotes = data.additionalNotes || null;
  return patch;
}
var onboardingRouter = router({
  get: protectedProcedure.query(({ ctx }) => getStudentProfile(ctx.user.id)),
  saveStep: protectedProcedure.input(saveStepInput).mutation(async ({ ctx, input }) => {
    const draftForValidation = { ...emptyOnboardingDraft(), examTrack: "YKS", ...input.data };
    const errors = validateOnboardingStep(input.step, draftForValidation);
    if (Object.keys(errors).length > 0) {
      throw new TRPCError15({ code: "BAD_REQUEST", message: Object.values(errors)[0] });
    }
    const saved = await upsertStudentProfileStep(ctx.user.id, input.step, draftToPatch(input.data));
    if (input.complete) await completeOnboarding(ctx.user.id);
    if (input.complete || saved.onboardingCompleted) await syncActiveTrack(ctx.user.id);
    return getStudentProfile(ctx.user.id);
  }),
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await completeOnboarding(ctx.user.id);
    await syncActiveTrack(ctx.user.id);
    return profile;
  }),
  // Birden çok sınav: liste, ekleme, aktif sınavı değiştirme, çıkarma (bkz. server/tracks/trackDb.ts).
  tracks: protectedProcedure.query(({ ctx }) => listTracks(ctx.user.id)),
  addTrack: protectedProcedure.input(z17.object({ track: z17.enum(EXAM_TRACKS), gradeLevel: z17.enum(GRADE_LEVELS), examYear: z17.number().int().min(2020).max(2040), selectedSubjects: z17.array(z17.string().max(60)).max(15).optional(), activate: z17.boolean().optional() })).mutation(({ ctx, input }) => trackErrors(async () => {
    await addTrack(ctx.user.id, input);
    return listTracks(ctx.user.id);
  })),
  switchTrack: protectedProcedure.input(z17.object({ track: z17.enum(EXAM_TRACKS) })).mutation(({ ctx, input }) => trackErrors(async () => {
    await switchTrack(ctx.user.id, input.track);
    return getStudentProfile(ctx.user.id);
  })),
  removeTrack: protectedProcedure.input(z17.object({ track: z17.enum(EXAM_TRACKS) })).mutation(({ ctx, input }) => trackErrors(async () => {
    await removeTrack(ctx.user.id, input.track);
    return listTracks(ctx.user.id);
  })),
  // Genel Bakış'taki tek tıkla avatar seçimi (null = nötr tasarım).
  setAvatar: protectedProcedure.input(z17.object({ avatarStyle: z17.enum(AVATAR_STYLES).nullable() })).mutation(({ ctx, input }) => setStudentAvatarStyle(ctx.user.id, input.avatarStyle)),
  // Pazar akşamı giden haftalık ilerleme e-postası (profil menüsündeki seçenek).
  weeklyDigest: protectedProcedure.query(async ({ ctx }) => ({ enabled: await getWeeklyDigestEnabled(ctx.user.id) })),
  setWeeklyDigest: protectedProcedure.input(z17.object({ enabled: z17.boolean() })).mutation(async ({ ctx, input }) => ({ enabled: await setWeeklyDigestEnabled(ctx.user.id, input.enabled) }))
});

// server/routers/subscription.ts
import { z as z18 } from "zod";

// server/subscriptions/checkout.ts
import { randomUUID as randomUUID3 } from "node:crypto";

// shared/checkoutQuote.ts
var BUNDLE_DISCOUNT = 0.2;
var ADDON_DISCOUNT = 0.2;
var TIER_CODES = { basic: "BASIC", premium: "PREMIUM", premium_plus: "PRO" };
var planCodeFor = (track, tier, period) => `${track === "YKS" ? "" : `${track}_`}${TIER_CODES[tier]}_${period.toUpperCase()}`;
var QuoteError = class extends Error {
};
function quoteCheckout(input) {
  const tracks = input.items.map((item) => item.track);
  if (!input.items.length) throw new QuoteError("Sepet bo\u015F.");
  if (new Set(tracks).size !== tracks.length) throw new QuoteError("Ayn\u0131 s\u0131nav sepette iki kez olamaz.");
  const bundle = input.items.length >= 2;
  const lines = input.items.map((item) => {
    const plan = input.plans.find((candidate) => candidate.code === planCodeFor(item.track, item.tier, item.period));
    if (!plan) throw new QuoteError("Bu plan \u015Fu an sat\u0131\u015Fta de\u011Fil.");
    let basePrice = plan.price;
    let months = 1;
    if (item.period === "yearly") {
      const monthly = input.plans.find((candidate) => candidate.code === planCodeFor(item.track, item.tier, "monthly"));
      if (monthly) {
        const term = yksTermPrice({ monthlyPrice: monthly.price, now: input.now, examYear: input.examYearByTrack[item.track] ?? null, track: item.track });
        basePrice = term.price;
        months = term.months;
      }
    }
    const parent = EXAM_TRACK_DEFS[item.track].addonOf;
    const addon = Boolean(parent && (input.activeTracks.includes(parent) || tracks.includes(parent)));
    const discountReason = bundle ? "bundle" : addon ? "addon" : null;
    const discountRate = discountReason === "bundle" ? BUNDLE_DISCOUNT : discountReason === "addon" ? ADDON_DISCOUNT : 0;
    const price = discountRate ? Math.floor(basePrice * (1 - discountRate) / 100) * 100 : basePrice;
    return { track: item.track, planCode: plan.code, basePrice, discountRate, discountReason, price, currency: plan.currency, months };
  });
  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return { lines, total, currency: lines[0].currency, discountTotal: lines.reduce((sum, line) => sum + (line.basePrice - line.price), 0) };
}

// server/subscriptions/checkout.ts
async function paidActiveTracks(userId) {
  const rows = await listSubscriptionsForUser(userId);
  const tracks = [];
  for (const row of rows) {
    const snapshot = await getEntitlements(userId, row.track);
    if (snapshot.isPremium && !snapshot.isTrial) tracks.push(row.track);
  }
  return tracks;
}
async function quoteForUser(userId, items, now = /* @__PURE__ */ new Date()) {
  const [plans, activeTracks] = await Promise.all([listActivePlans(), paidActiveTracks(userId)]);
  const examYearByTrack = {};
  for (const item of items) examYearByTrack[item.track] = await getStudentExamYearFor(userId, item.track);
  return quoteCheckout({ items, plans: plans.map((plan) => ({ code: plan.code, track: plan.track, tier: plan.tier, billingPeriod: plan.billingPeriod, price: plan.price, currency: plan.currency })), activeTracks, examYearByTrack, now });
}
async function itemFromPlanCode(planCode) {
  const plan = await getPlanByCode(planCode);
  if (!plan || !plan.isActive || plan.tier === "free" || plan.billingPeriod === "none") throw new Error("Ge\xE7ersiz veya pasif plan.");
  if (!PAID_TIERS.includes(plan.tier)) throw new Error("Ge\xE7ersiz plan.");
  return { track: plan.track ?? "YKS", tier: plan.tier, period: plan.billingPeriod };
}
async function completeMockCheckoutForUser(userId, items) {
  const quote = await quoteForUser(userId, items);
  const checkoutId = randomUUID3();
  for (const line of quote.lines) {
    const result = await processWebhookEvent({
      provider: "mock",
      eventId: `mock_manual_${userId}_${checkoutId}_${line.track}`,
      eventType: "checkout.completed",
      payload: { userId, planCode: line.planCode, track: line.track, amount: line.price, currency: line.currency, checkoutId, discountReason: line.discountReason },
      rawPayloadForAudit: { userId, planCode: line.planCode, track: line.track, amount: line.price, checkoutId, source: "completeMockCheckout" }
    });
    if (result.status === "failed") throw new Error(result.reason ?? "Sandbox \xF6demesi i\u015Flenemedi.");
  }
  return { quote, checkoutId };
}

// server/routers/subscription.ts
import { TRPCError as TRPCError16 } from "@trpc/server";
var trackInput = z18.object({ track: z18.enum(EXAM_TRACKS).optional() }).optional();
var resolveTrack = async (userId, track) => track ?? await getStudentExamTrack(userId);
var quoteItemsInput = z18.array(z18.object({ track: z18.enum(EXAM_TRACKS), tier: z18.enum(PAID_TIERS), period: z18.enum(["monthly", "yearly"]) })).min(1).max(EXAM_TRACKS.length);
var subscriptionRouter = router({
  getPlans: publicProcedure.query(() => listActivePlans()),
  // Client'ın useEntitlement() hook'unun okuduğu tek snapshot (spec §8) — bir sınavın aboneliği.
  getCurrent: protectedProcedure.input(trackInput).query(async ({ ctx, input }) => getEntitlements(ctx.user.id, await resolveTrack(ctx.user.id, input?.track))),
  getEntitlements: protectedProcedure.input(trackInput).query(async ({ ctx, input }) => getEntitlements(ctx.user.id, await resolveTrack(ctx.user.id, input?.track))),
  /** Adayın sınavlarındaki (eklediği ve aboneliği olan) tüm abonelikler. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const [enrolled, rows] = await Promise.all([listTracks(ctx.user.id).catch(() => []), listSubscriptionsForUser(ctx.user.id)]);
    const tracks = Array.from(/* @__PURE__ */ new Set([...enrolled.map((row) => row.track), ...rows.map((row) => row.track)]));
    if (!tracks.length) tracks.push(await getStudentExamTrack(ctx.user.id));
    return Promise.all(tracks.map((track) => getEntitlements(ctx.user.id, track)));
  }),
  /** Sepet tutarı: paket (2+ sınav) ya da branş (KPSS aboneliği varken MEB-AGS / A grubu) indirimiyle. */
  quote: protectedProcedure.input(z18.object({ items: quoteItemsInput })).query(async ({ ctx, input }) => {
    try {
      return await quoteForUser(ctx.user.id, input.items);
    } catch (error) {
      if (error instanceof QuoteError) throw new TRPCError16({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),
  cancel: protectedProcedure.input(z18.object({ immediate: z18.boolean().optional(), track: z18.enum(EXAM_TRACKS).optional() })).mutation(async ({ ctx, input }) => {
    const track = await resolveTrack(ctx.user.id, input.track);
    const current = await getCurrentSubscription(ctx.user.id, track);
    const nextStatus = input.immediate ? "canceled" : current.status;
    if (input.immediate) assertValidSubscriptionTransition(current.status, "canceled");
    await updateSubscription(ctx.user.id, track, { status: nextStatus, cancelAtPeriodEnd: input.immediate ? 0 : 1, canceledAt: /* @__PURE__ */ new Date() });
    await writeAuditLog({ userId: ctx.user.id, action: "user_canceled", oldState: { status: current.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !input.immediate, track } });
    return getEntitlements(ctx.user.id, track);
  }),
  resume: protectedProcedure.input(trackInput).mutation(async ({ ctx, input }) => {
    const track = await resolveTrack(ctx.user.id, input?.track);
    const current = await getCurrentSubscription(ctx.user.id, track);
    if (!current.cancelAtPeriodEnd && current.status !== "canceled") return getEntitlements(ctx.user.id, track);
    assertValidSubscriptionTransition(current.status, "active");
    await updateSubscription(ctx.user.id, track, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: ctx.user.id, action: "user_resumed", oldState: { status: current.status }, newState: { status: "active", track } });
    return getEntitlements(ctx.user.id, track);
  }),
  restore: protectedProcedure.input(z18.object({ providerToken: z18.string().min(1) })).mutation(async ({ ctx, input }) => {
    const provider = paymentProviderFactory();
    const result = await provider.restorePurchase({ userId: ctx.user.id, providerToken: input.providerToken });
    if (!result.valid) throw new Error(result.reason ?? "Sat\u0131n alma do\u011Frulanamad\u0131");
    await writeAuditLog({ userId: ctx.user.id, action: "purchase_restored", newState: { providerSubscriptionId: result.providerSubscriptionId } });
    return getEntitlements(ctx.user.id, await getStudentExamTrack(ctx.user.id));
  })
});

// server/routers/payment.ts
import { z as z19 } from "zod";
import { TRPCError as TRPCError17 } from "@trpc/server";
var paymentRouter = router({
  createCheckout: protectedProcedure.input(z19.object({ planCode: z19.string().min(1), successUrl: z19.string().url(), cancelUrl: z19.string().url() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new Error("Ge\xE7ersiz veya pasif plan.");
    const provider = paymentProviderFactory();
    return provider.createCheckout({ userId: ctx.user.id, planCode: input.planCode, successUrl: input.successUrl, cancelUrl: input.cancelUrl });
  }),
  getHistory: protectedProcedure.query(({ ctx }) => listPaymentsForUser(ctx.user.id)),
  /**
   * SANDBOX-ONLY yardımcı uç nokta (spec §53: gerçek provider credential'ı
   * yokken "FAKE PAYMENT SUCCESS" davranışı UYGULANMAYACAK). Bu, gerçek bir
   * ödemeyi "başarılı" gibi göstermiyor — tam tersine, gerçek bir
   * sağlayıcının normalde webhook ile tetikleyeceği AYNI
   * `processWebhookEvent` yolunu, yalnızca `PAYMENT_PROVIDER=mock`
   * olduğunda ve yalnızca ÇAĞIRAN KULLANICININ KENDİ hesabı için tetikler —
   * Paywall'ı uçtan uca test edebilmek için var, production'da
   * `PAYMENT_PROVIDER` gerçek bir sağlayıcıya çevrildiğinde bu uç nokta
   * otomatik olarak devre dışı kalır.
   */
  // Sepet (`items`: bir ya da birden çok sınav) ya da eski istemciler için tek `planCode`.
  // Tutar sunucuda hesaplanır: paket (2+ sınav) ve branş indirimi (shared/checkoutQuote.ts).
  completeMockCheckout: protectedProcedure.input(z19.object({ planCode: z19.string().min(1).optional(), items: quoteItemsInput.optional() })).mutation(async ({ ctx, input }) => {
    if (ENV.paymentProvider !== "mock") {
      throw new Error("Bu u\xE7 nokta yaln\u0131zca PAYMENT_PROVIDER=mock iken kullan\u0131labilir.");
    }
    const items = input.items ?? (input.planCode ? [await itemFromPlanCode(input.planCode)] : null);
    if (!items) throw new Error("Sepet bo\u015F.");
    try {
      const { quote, checkoutId } = await completeMockCheckoutForUser(ctx.user.id, items);
      return { status: "processed", checkoutId, total: quote.total, lines: quote.lines };
    } catch (error) {
      if (error instanceof QuoteError) throw new TRPCError17({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  })
});

// server/admin/analyticsService.ts
import { and as and25, count as count2, countDistinct, eq as eq28, gte as gte15, isNotNull as isNotNull7, lt as lt12, ne as ne4, sql as sql14 } from "drizzle-orm";
async function getAdminDashboardKpis() {
  const db = await getDb();
  const empty = {
    totalUsers: 0,
    pendingApproval: 0,
    activeAccounts: 0,
    suspendedAccounts: 0,
    freeUsers: 0,
    trialUsers: 0,
    premiumUsers: 0,
    monthlySubscribers: 0,
    yearlySubscribers: 0,
    pastDue: 0,
    gracePeriod: 0,
    expiredSubscriptions: 0,
    canceledSubscriptions: 0,
    activeToday: 0,
    activeThisWeek: 0,
    inactive7Plus: 0,
    inactive30Plus: 0,
    trialConversion: { started: 0, stillTrialing: 0, converted: 0, conversionRate: null }
  };
  if (!db) return empty;
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
  const [approvalCounts, accountStatusCounts, planStatusCounts, activeTodayRow, activeWeekRow, inactive7Row, inactive30Row, totalRow, trialStartedRow, stillTrialingRow, convertedRow, premiumUsersRow] = await Promise.all([
    db.select({ approvalStatus: users.approvalStatus, total: count2() }).from(users).groupBy(users.approvalStatus),
    db.select({ accountStatus: users.accountStatus, total: count2() }).from(users).groupBy(users.accountStatus),
    db.select({ tier: subscriptionPlans.tier, billingPeriod: subscriptionPlans.billingPeriod, status: subscriptions.status, total: count2() }).from(subscriptions).innerJoin(subscriptionPlans, eq28(subscriptionPlans.id, subscriptions.planId)).groupBy(subscriptionPlans.tier, subscriptionPlans.billingPeriod, subscriptions.status),
    db.select({ total: count2() }).from(users).where(gte15(users.lastSignedIn, todayStart)),
    db.select({ total: count2() }).from(users).where(gte15(users.lastSignedIn, weekAgo)),
    db.select({ total: count2() }).from(users).where(lt12(users.lastSignedIn, weekAgo)),
    db.select({ total: count2() }).from(users).where(lt12(users.lastSignedIn, monthAgo)),
    db.select({ total: count2() }).from(users),
    db.select({ total: count2() }).from(subscriptions).where(isNotNull7(subscriptions.trialStartedAt)),
    db.select({ total: count2() }).from(subscriptions).where(eq28(subscriptions.status, "trialing")),
    db.select({ total: count2() }).from(subscriptions).where(and25(isNotNull7(subscriptions.trialStartedAt), sql14`${subscriptions.status} in ('active','past_due','grace_period')`)),
    // Üye sayıları kişi başına: her sınavın aboneliği ayrı satır, bir aday birden fazla sınava abone olabilir.
    db.select({ total: countDistinct(subscriptions.userId) }).from(subscriptions).innerJoin(subscriptionPlans, eq28(subscriptionPlans.id, subscriptions.planId)).where(and25(ne4(subscriptionPlans.tier, "free"), sql14`${subscriptions.status} in ('active','trialing','grace_period')`))
  ]);
  const kpis = { ...empty, totalUsers: totalRow[0]?.total ?? 0, activeToday: activeTodayRow[0]?.total ?? 0, activeThisWeek: activeWeekRow[0]?.total ?? 0, inactive7Plus: inactive7Row[0]?.total ?? 0, inactive30Plus: inactive30Row[0]?.total ?? 0 };
  for (const row of approvalCounts) {
    if (row.approvalStatus === "pending") kpis.pendingApproval = row.total;
  }
  for (const row of accountStatusCounts) {
    if (row.accountStatus === "active") kpis.activeAccounts = row.total;
    if (row.accountStatus === "suspended") kpis.suspendedAccounts = row.total;
  }
  for (const row of planStatusCounts) {
    if (row.status === "trialing") kpis.trialUsers += row.total;
    if (row.tier !== "free" && row.billingPeriod === "monthly") kpis.monthlySubscribers += row.total;
    if (row.tier !== "free" && row.billingPeriod === "yearly") kpis.yearlySubscribers += row.total;
    if (row.status === "past_due") kpis.pastDue += row.total;
    if (row.status === "grace_period") kpis.gracePeriod += row.total;
    if (row.status === "expired") kpis.expiredSubscriptions += row.total;
    if (row.status === "canceled") kpis.canceledSubscriptions += row.total;
  }
  kpis.premiumUsers = premiumUsersRow[0]?.total ?? 0;
  kpis.freeUsers = Math.max(0, kpis.totalUsers - kpis.premiumUsers);
  const started = trialStartedRow[0]?.total ?? 0;
  const stillTrialing = stillTrialingRow[0]?.total ?? 0;
  const converted = convertedRow[0]?.total ?? 0;
  const ended = started - stillTrialing;
  kpis.trialConversion = { started, stillTrialing, converted, conversionRate: ended > 0 ? Math.round(converted / ended * 100) : null };
  return kpis;
}

// server/routers/admin/analytics.ts
var adminAnalyticsRouter = router({
  overview: adminProcedure.query(() => getAdminDashboardKpis())
});

// server/routers/admin/audit.ts
import { z as z20 } from "zod";
var adminAuditRouter = router({
  list: adminProcedure.input(z20.object({ userId: z20.number().int().optional(), limit: z20.number().int().min(1).max(500).default(100) })).query(({ input }) => input.userId ? listAuditLogsForUser(input.userId) : listAllAuditLogs(input.limit))
});

// server/routers/admin/errors.ts
import { z as z21 } from "zod";
var adminErrorsRouter = router({
  list: adminProcedure.input(z21.object({ status: z21.enum(["open", "resolved"]).default("open") })).query(({ input }) => listAppErrors(input.status)),
  resolve: adminProcedure.input(z21.object({ id: z21.number().int().positive() })).mutation(({ input }) => resolveAppError(input.id))
});

// server/routers/admin/payments.ts
import { z as z22 } from "zod";
var maskId = (value) => !value ? value : value.length <= 8 ? `${value.slice(0, 2)}\u2022\u2022\u2022\u2022` : `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
var adminPaymentsRouter = router({
  // Kart numarası/CVV gibi bir alan şemada zaten hiç yok (spec §27/§37 — "ASLA saklanmamalı"); providerPaymentId yine de maskelenir.
  list: adminProcedure.input(z22.object({ limit: z22.number().int().min(1).max(500).default(100) })).query(async ({ input }) => {
    const rows = await listAllPaymentsForAdmin(input.limit);
    return rows.map((row) => ({ ...row, providerPaymentId: maskId(row.providerPaymentId) }));
  })
});

// server/routers/admin/subscriptions.ts
import { z as z23 } from "zod";
var trackField = z23.enum(EXAM_TRACKS).default("YKS");
var adminSubscriptionsRouter = router({
  list: adminProcedure.query(() => listAllSubscriptionsForAdmin()),
  get: adminProcedure.input(z23.object({ userId: z23.number().int() })).query(async ({ input }) => {
    const [subscriptions2, payments2, auditLogs] = await Promise.all([listSubscriptionsForUser(input.userId), listPaymentsForUser(input.userId), listAuditLogsForUser(input.userId)]);
    const subscription = subscriptions2.find((row) => row.track === "YKS") ?? subscriptions2[0];
    return { subscription, subscriptions: subscriptions2, payments: payments2, auditLogs };
  }),
  /**
   * Elle erişim verme — spec §24/§9/§28/§29: "Manual entitlement ile
   * provider subscription birbirinden ayrı tutulmalı". `isManualOverride=1`
   * ile işaretlenir, `provider`/`providerSubscriptionId` alanları BOŞ
   * bırakılır (gerçek bir satın alma değil) — admin bunu geri aldığında
   * (revoke) hiçbir gerçek sağlayıcı çağrısı tetiklenmez, çünkü zaten hiç
   * yoktu. (Not: ayrı bir `manual_entitlements` tablosu yerine mevcut
   * `subscriptions.isManualOverride` bayrağı kullanıldı — spec §58 "mevcut
   * schema'yı yeniden tasarlama, duplicate logic oluşturma" ile tutarlı;
   * bkz. docs/admin/ADMIN-COMMAND-CENTER.md "Known limitations".)
   */
  grant: adminProcedure.input(z23.object({ userId: z23.number().int(), planCode: z23.string().min(1), days: z23.number().int().min(1).max(3650), reason: z23.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan) throw new Error(`Plan bulunamad\u0131: ${input.planCode}`);
    const track = plan.track ?? "YKS";
    const existing = await getSubscriptionByUserId(input.userId, track);
    await ensureFreeSubscription(input.userId, track);
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1e3);
    if (existing) assertValidSubscriptionTransition(existing.status, "active");
    await updateSubscription(input.userId, track, { planId: plan.id, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: 0, canceledAt: null, isManualOverride: 1, provider: null, providerSubscriptionId: null, providerCustomerId: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_grant", oldState: existing ? { status: existing.status } : null, newState: { status: "active", planCode: plan.code, track, until: periodEnd.toISOString() }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, track);
  }),
  revoke: adminProcedure.input(z23.object({ userId: z23.number().int(), track: trackField, reason: z23.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    const freePlan = await getPlanByCode("FREE");
    if (!freePlan) throw new Error("FREE plan\u0131 bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, input.track, { planId: freePlan.id, status: "canceled", cancelAtPeriodEnd: 0, canceledAt: /* @__PURE__ */ new Date(), isManualOverride: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_revoke", oldState: { status: existing.status }, newState: { status: "canceled", planCode: "FREE", track: input.track }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, input.track);
  }),
  cancel: adminProcedure.input(z23.object({ userId: z23.number().int(), track: trackField, reason: z23.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "canceled");
    await updateSubscription(input.userId, input.track, { status: "canceled", canceledAt: /* @__PURE__ */ new Date(), cancelAtPeriodEnd: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_canceled", oldState: { status: existing.status }, newState: { status: "canceled", track: input.track }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, input.track);
  }),
  resume: adminProcedure.input(z23.object({ userId: z23.number().int(), track: trackField })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamad\u0131");
    assertValidSubscriptionTransition(existing.status, "active");
    await updateSubscription(input.userId, input.track, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_resumed", oldState: { status: existing.status }, newState: { status: "active", track: input.track } });
    return getSubscriptionByUserId(input.userId, input.track);
  }),
  // Fiyatlar: her sınavın planları (satışta olmayanlar dahil) ve fiyat/deneme/satış durumu düzenleme.
  plans: adminProcedure.query(() => listAllPlans()),
  updatePlan: adminProcedure.input(z23.object({ planId: z23.number().int().positive(), price: z23.number().int().min(0).max(1e8).optional(), trialDays: z23.number().int().min(0).max(60).optional(), isActive: z23.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const plan = await updatePlanPricing(input.planId, { price: input.price, trialDays: input.trialDays, isActive: input.isActive });
    if (!plan) throw new Error("Plan bulunamad\u0131");
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "plan_pricing_updated", newState: { planCode: plan.code, price: plan.price, trialDays: plan.trialDays, isActive: plan.isActive } });
    return plan;
  })
});

// server/routers/admin/system.ts
var redact = (text4) => text4.replace(/\b(sk-[A-Za-z0-9_*.\-]{4,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+)/g, "[redacted]");
async function check(run) {
  const started = Date.now();
  try {
    await run();
    return { ok: true, ms: Date.now() - started, status: null, error: null };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, status: error instanceof LlmUnavailableError ? error.status ?? null : null, error: redact(error instanceof Error ? error.message : String(error)).slice(0, 400) };
  }
}
function configHints(baseUrl, model) {
  const hints = [];
  if (/\/chat\/completions\/?$/.test(baseUrl)) hints.push("LLM_API_URL '/chat/completions' ile bitmemeli; yaln\u0131zca k\xF6k adres (\xF6r. https://api.openai.com/v1).");
  if (!/^https:\/\//.test(baseUrl)) hints.push("LLM_API_URL https:// ile ba\u015Flamal\u0131.");
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    if (!baseUrl.endsWith("/v1beta/openai")) hints.push("Gemini i\xE7in LLM_API_URL tam olarak https://generativelanguage.googleapis.com/v1beta/openai olmal\u0131.");
    if (!model.startsWith("gemini")) hints.push(`Gemini adresiyle '${model}' modeli kullan\u0131lamaz; LLM_MODEL \xF6rn. gemini-2.5-flash olmal\u0131.`);
  }
  if (baseUrl.includes("api.openai.com") && model.startsWith("gemini")) hints.push("OpenAI adresiyle Gemini modeli kullan\u0131lamaz; LLM_MODEL \xF6rn. gpt-4o-mini olmal\u0131.");
  if (/\s/.test(model)) hints.push("LLM_MODEL de\u011Ferinde bo\u015Fluk var.");
  return hints;
}
var adminSystemRouter = router({
  llmHealth: adminProcedure.mutation(async () => {
    const target = resolveLlmTarget();
    const config = {
      configured: Boolean(target),
      keyLength: ENV.llmApiKey ? ENV.llmApiKey.trim().length : 0,
      // Hangi değişkenden okundu (değer değil): GEMINI_API_KEY > LLM_API_KEY > OPENAI_API_KEY.
      keySource: process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : process.env.LLM_API_KEY ? "LLM_API_KEY" : process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : null,
      keyHasWhitespace: ENV.llmApiKey !== ENV.llmApiKey.trim() || /\s/.test(ENV.llmApiKey.trim()),
      baseUrl: target?.baseUrl ?? null,
      model: target?.model ?? null,
      usingDefaultUrl: !ENV.llmApiUrl,
      usingDefaultModel: !ENV.llmModel,
      // Vercel'deki ham değerler (anahtar değil) — otomatik düzeltme yapıldıysa farkı görmek için.
      rawUrl: ENV.llmApiUrl || null,
      rawModel: ENV.llmModel || null,
      transcribeModel: ENV.transcribeModel || "whisper-1"
    };
    if (!target) return { config, hints: ["LLM_API_KEY (ya da OPENAI_API_KEY) tan\u0131ml\u0131 de\u011Fil ya da bu deploy'a ula\u015Fmad\u0131 \u2014 Vercel'de ekledikten sonra Redeploy gerekir."], checks: null };
    const hints = configHints(target.baseUrl, target.model);
    if (config.keyHasWhitespace) hints.push("LLM_API_KEY de\u011Ferinde bo\u015Fluk/sat\u0131r sonu var; Vercel'de yeniden, bo\u015Fluksuz yap\u0131\u015Ft\u0131r.");
    const text4 = await check(() => invokeLLM({ messages: [{ role: "user", content: "Yaln\u0131zca OK yaz." }], max_tokens: 5 }));
    const json = await check(() => invokeLLM({
      messages: [{ role: "user", content: '{"sonuc": "tamam", "sayi": null} d\xF6nd\xFCr.' }],
      response_format: { type: "json_schema", json_schema: { name: "health", strict: true, schema: { type: "object", properties: { sonuc: { type: "string" }, sayi: { type: ["integer", "null"] } }, required: ["sonuc", "sayi"], additionalProperties: false } } }
    }));
    const image = encodeGrayToJpegDataUrl(createGray(64, 64, 230), 80);
    const vision = await check(() => invokeLLM({ messages: [{ role: "user", content: [{ type: "text", text: "Bu g\xF6rselin rengi ne? Tek kelime." }, { type: "image_url", image_url: { url: image, detail: "low" } }] }], max_tokens: 10 }));
    const strongModel = modelForTier("strong");
    const strong = strongModel && strongModel !== target.model ? { model: strongModel, ...await check(() => invokeLLM({ model: strongModel, reasoningEffort: "low", messages: [{ role: "user", content: "Yaln\u0131zca OK yaz." }], max_tokens: 200 })) } : null;
    return { config, hints, checks: { text: text4, json, vision, strong } };
  }),
  // Soru çözümü kademelerinin (LLM_MODEL_LIGHT / LLM_MODEL / LLM_MODEL_STRONG) sağlayıcıda var olup olmadığı.
  // Yalnızca model listesini okur: üretim kotası harcamaz.
  llmTiers: adminProcedure.query(async () => {
    if (!resolveLlmTarget()) return { tiers: null, available: [], error: "LLM_API_KEY tan\u0131ml\u0131 de\u011Fil." };
    const tiers = { light: modelForTier("light") ?? null, medium: modelForTier("medium") ?? null, strong: modelForTier("strong") ?? null };
    try {
      const available = (await listLLMModels()).data.map((model) => model.id.replace(/^models\//, "")).sort();
      return { tiers, available, error: null };
    } catch (error) {
      return { tiers, available: [], error: redact(error instanceof Error ? error.message : String(error)).slice(0, 300) };
    }
  })
});

// server/routers/admin/testimonials.ts
import { z as z24 } from "zod";

// server/testimonials/testimonials.ts
import { desc as desc17, eq as eq29 } from "drizzle-orm";
async function listPublishedTestimonials(limit = 9) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: testimonials.id, displayName: testimonials.displayName, detail: testimonials.detail, rating: testimonials.rating, body: testimonials.body }).from(testimonials).where(eq29(testimonials.status, "approved")).orderBy(desc17(testimonials.reviewedAt)).limit(limit);
}
async function getMyTestimonial(userId) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(testimonials).where(eq29(testimonials.userId, userId)).limit(1);
  return row ?? null;
}
async function saveMyTestimonial(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131 kullan\u0131lam\u0131yor.");
  const now = /* @__PURE__ */ new Date();
  await db.insert(testimonials).values({ userId, ...input, status: "pending", updatedAt: now }).onConflictDoUpdate({ target: testimonials.userId, set: { ...input, status: "pending", updatedAt: now, reviewedAt: null, reviewedBy: null } });
  return getMyTestimonial(userId);
}
async function deleteMyTestimonial(userId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(testimonials).where(eq29(testimonials.userId, userId));
}
async function listTestimonialsForAdmin(status) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: testimonials.id, displayName: testimonials.displayName, detail: testimonials.detail, rating: testimonials.rating, body: testimonials.body, status: testimonials.status, updatedAt: testimonials.updatedAt, userId: testimonials.userId, userName: users.name, userEmail: users.email }).from(testimonials).leftJoin(users, eq29(users.id, testimonials.userId)).where(eq29(testimonials.status, status)).orderBy(desc17(testimonials.updatedAt)).limit(200);
}
async function reviewTestimonial(id8, status, reviewerId) {
  const db = await getDb();
  if (!db) return;
  await db.update(testimonials).set({ status, reviewedAt: /* @__PURE__ */ new Date(), reviewedBy: reviewerId }).where(eq29(testimonials.id, id8));
}

// server/routers/admin/testimonials.ts
var adminTestimonialsRouter = router({
  list: adminProcedure.input(z24.object({ status: z24.enum(["pending", "approved", "rejected"]).default("pending") })).query(({ input }) => listTestimonialsForAdmin(input.status)),
  review: adminProcedure.input(z24.object({ id: z24.number().int().positive(), status: z24.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
    await reviewTestimonial(input.id, input.status, ctx.user.id);
    return { ok: true };
  })
});

// server/routers/admin/usage.ts
import { z as z25 } from "zod";
var adminUsageRouter = router({
  get: adminProcedure.input(z25.object({ userId: z25.number().int(), track: z25.enum(EXAM_TRACKS).default("YKS") })).query(({ input }) => getUsageSummaryForUser(input.userId, input.track)),
  reset: adminProcedure.input(z25.object({ userId: z25.number().int(), featureKey: z25.enum(FEATURE_KEYS) })).mutation(({ ctx, input }) => resetFeatureUsage(input.userId, input.featureKey, USAGE_WINDOW_DAYS, ctx.user.id))
});

// server/routers/admin/users.ts
import { z as z26 } from "zod";

// server/admin/adminUserDb.ts
import { and as and27, count as count3, desc as desc18, eq as eq31, gte as gte17, inArray as inArray13, isNull as isNull16, ilike as ilike5, lt as lt13, or as or7, sql as sql15 } from "drizzle-orm";

// server/admin/progressService.ts
import { and as and26, eq as eq30, gte as gte16 } from "drizzle-orm";

// shared/progressScore.ts
var PROGRESS_SCORE_CONFIG = {
  weights: { studyConsistency: 0.25, questionPerformance: 0.25, topicProgress: 0.2, mockExam: 0.2, planAdherence: 0.1 },
  // Her alt skorun "yeterli veri" sayılması için asgari örneklem — eşiğin
  // altında sahte/erken bir sayı üretmek yerine "Not enough data" dönülür.
  minAccountAgeDaysForConsistency: 3,
  minQuestionsForPerformance: MIN_RELIABLE_QUESTION_COUNT,
  // shared/topicStatus.ts ile aynı eşik — tek kaynak
  minTopicsForTopicProgress: 3,
  minExamsForMockExamScore: 1,
  minPlannedSessionsForAdherence: 2
  // shared/planAdherence.ts'in kendi "veri_topla" eşiğiyle aynı
};
var cap2 = (value) => Math.max(0, Math.min(100, Math.round(value)));
function calculateProgressScore(inputs, config = PROGRESS_SCORE_CONFIG) {
  const components = {
    studyConsistency: inputs.accountAgeDays < config.minAccountAgeDaysForConsistency ? { score: null, insufficientData: true, label: "\xC7al\u0131\u015Fma D\xFCzeni" } : { score: cap2(inputs.activeDaysInWindow / Math.max(1, inputs.windowDays) * 100), insufficientData: false, label: "\xC7al\u0131\u015Fma D\xFCzeni" },
    questionPerformance: inputs.totalQuestions < config.minQuestionsForPerformance ? { score: null, insufficientData: true, label: "Soru Performans\u0131" } : { score: cap2(inputs.correctQuestions / inputs.totalQuestions * 100), insufficientData: false, label: "Soru Performans\u0131" },
    topicProgress: inputs.studiedTopicCount < config.minTopicsForTopicProgress ? { score: null, insufficientData: true, label: "Konu \u0130lerlemesi" } : { score: cap2(inputs.topicCoveragePercent), insufficientData: false, label: "Konu \u0130lerlemesi" },
    mockExam: inputs.examCount < config.minExamsForMockExamScore || inputs.averageExamNet === null ? { score: null, insufficientData: true, label: "Deneme Performans\u0131" } : { score: cap2(inputs.averageExamNet / Math.max(1, inputs.referenceNetCeiling) * 100), insufficientData: false, label: "Deneme Performans\u0131" },
    planAdherence: inputs.plannedSessionsCount < config.minPlannedSessionsForAdherence || inputs.planAdherenceScore === null ? { score: null, insufficientData: true, label: "Plan Uyumu" } : { score: cap2(inputs.planAdherenceScore), insufficientData: false, label: "Plan Uyumu" }
  };
  const available = Object.keys(components).filter((key) => components[key].score !== null);
  if (available.length === 0) return { overallScore: null, insufficientData: true, components };
  const totalWeight = available.reduce((sum, key) => sum + config.weights[key], 0);
  const weightedSum = available.reduce((sum, key) => sum + components[key].score * config.weights[key], 0);
  const overallScore = totalWeight > 0 ? cap2(weightedSum / totalWeight) : null;
  return { overallScore, insufficientData: overallScore === null, components };
}

// server/admin/progressService.ts
var CONSISTENCY_WINDOW_DAYS = 7;
var ADHERENCE_WINDOW_DAYS = 30;
async function getStudyProgressScore(userId) {
  const db = await getDb();
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!db) return { overallScore: null, insufficientData: true, components: emptyComponents(), generatedAt };
  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq30(users.id, userId)).limit(1);
  const accountAgeDays = userRow ? Math.max(0, Math.floor((Date.now() - userRow.createdAt.getTime()) / 864e5)) : 0;
  const windowStart = new Date(Date.now() - CONSISTENCY_WINDOW_DAYS * 864e5);
  const [recentLogs, allLogs, topicRows, examRows] = await Promise.all([
    db.select({ studyDate: topicStudyLogs.studyDate }).from(topicStudyLogs).where(and26(eq30(topicStudyLogs.userId, userId), gte16(topicStudyLogs.studyDate, windowStart))),
    db.select({ questions: topicStudyLogs.questions, correct: topicStudyLogs.correct }).from(topicStudyLogs).where(eq30(topicStudyLogs.userId, userId)),
    db.select({ progress: topicProgress.progress }).from(topicProgress).where(eq30(topicProgress.userId, userId)),
    db.select({ net: userMockExams.net }).from(userMockExams).where(eq30(userMockExams.userId, userId))
  ]);
  const activeDaysInWindow = new Set(recentLogs.map((row) => toLocalDateKey(row.studyDate))).size;
  const totalQuestions = allLogs.reduce((sum, row) => sum + row.questions, 0);
  const correctQuestions = allLogs.reduce((sum, row) => sum + row.correct, 0);
  const studiedTopicCount = topicRows.length;
  const topicCoveragePercent = topicRows.length ? Math.round(topicRows.reduce((sum, row) => sum + row.progress, 0) / topicRows.length) : 0;
  const examCount = examRows.length;
  const averageExamNet = examCount ? examRows.reduce((sum, row) => sum + Number(row.net), 0) / examCount : null;
  const periodEnd = /* @__PURE__ */ new Date();
  const periodStart = new Date(periodEnd.getTime() - ADHERENCE_WINDOW_DAYS * 864e5);
  const { sessions, averageAccuracy } = await getPlanAdherenceInputs(userId, periodStart, periodEnd);
  const adherence = calculatePlanAdherence(sessions, averageAccuracy);
  const result = calculateProgressScore({
    accountAgeDays,
    activeDaysInWindow,
    windowDays: CONSISTENCY_WINDOW_DAYS,
    totalQuestions,
    correctQuestions,
    topicCoveragePercent,
    studiedTopicCount,
    examCount,
    averageExamNet,
    referenceNetCeiling: targetNet,
    planAdherenceScore: adherence.plannedSessions > 0 ? adherence.overallScore : null,
    plannedSessionsCount: adherence.plannedSessions
  });
  return { ...result, generatedAt };
}
function emptyComponents() {
  const insufficient = { score: null, insufficientData: true };
  return {
    studyConsistency: { ...insufficient, label: "\xC7al\u0131\u015Fma D\xFCzeni" },
    questionPerformance: { ...insufficient, label: "Soru Performans\u0131" },
    topicProgress: { ...insufficient, label: "Konu \u0130lerlemesi" },
    mockExam: { ...insufficient, label: "Deneme Performans\u0131" },
    planAdherence: { ...insufficient, label: "Plan Uyumu" }
  };
}

// server/admin/adminUserDb.ts
async function listUsersForAdminPaginated(filters) {
  const db = await getDb();
  const page2 = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  if (!db) return { rows: [], total: 0, page: page2, pageSize };
  const conditions = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().replace(/[%_]/g, (char) => `\\${char}`)}%`;
    const digits = filters.search.replace(/\D/g, "").replace(/^0/, "");
    conditions.push(or7(ilike5(users.name, term), ilike5(users.email, term), ...digits.length >= 4 ? [ilike5(users.openId, `dev_phone_%${digits}%`)] : []));
  }
  if (filters.approvalStatus) conditions.push(eq31(users.approvalStatus, filters.approvalStatus));
  if (filters.accountStatus) conditions.push(eq31(users.accountStatus, filters.accountStatus));
  if (filters.planCode) conditions.push(eq31(subscriptionPlans.code, filters.planCode));
  if (filters.subscriptionStatus) conditions.push(eq31(subscriptions.status, filters.subscriptionStatus));
  if (filters.activity === "today") conditions.push(gte17(users.lastSignedIn, startOfToday2()));
  else if (filters.activity === "week") conditions.push(gte17(users.lastSignedIn, daysAgo(7)));
  else if (filters.activity === "inactive") conditions.push(lt13(users.lastSignedIn, daysAgo(7)));
  const whereClause = conditions.length ? and27(...conditions) : void 0;
  const activeSubscription = and27(eq31(subscriptions.userId, users.id), eq31(subscriptions.track, sql15`coalesce((select sp."examTrack" from student_profiles sp where sp."userId" = ${users.id}), 'YKS')`));
  const countQuery = db.select({ total: count3() }).from(users).leftJoin(subscriptions, activeSubscription).leftJoin(subscriptionPlans, eq31(subscriptionPlans.id, subscriptions.planId));
  const [{ total }] = await (whereClause ? countQuery.where(whereClause) : countQuery);
  const pageQuery = db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    approvalStatus: users.approvalStatus,
    accountStatus: users.accountStatus,
    loginMethod: users.loginMethod,
    emailVerifiedAt: users.emailVerifiedAt,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    planCode: subscriptionPlans.code,
    planName: subscriptionPlans.name,
    subscriptionStatus: subscriptions.status,
    trialEndsAt: subscriptions.trialEndsAt,
    currentPeriodEnd: subscriptions.currentPeriodEnd
  }).from(users).leftJoin(subscriptions, activeSubscription).leftJoin(subscriptionPlans, eq31(subscriptionPlans.id, subscriptions.planId)).orderBy(desc18(users.createdAt)).limit(pageSize).offset((page2 - 1) * pageSize);
  const pageRows = await (whereClause ? pageQuery.where(whereClause) : pageQuery);
  const ids = pageRows.map((row) => row.id);
  const [topicAgg, examAgg, studyAgg] = ids.length ? await Promise.all([
    db.select({ userId: topicProgress.userId, avgProgress: sql15`avg(${topicProgress.progress})`, topicCount: sql15`count(*)::int` }).from(topicProgress).where(inArray13(topicProgress.userId, ids)).groupBy(topicProgress.userId),
    db.select({ userId: userMockExams.userId, examCount: sql15`count(*)::int`, latestNet: sql15`max(${userMockExams.net})` }).from(userMockExams).where(inArray13(userMockExams.userId, ids)).groupBy(userMockExams.userId),
    db.select({ userId: topicStudyLogs.userId, totalMinutes: sql15`sum(${topicStudyLogs.minutes})` }).from(topicStudyLogs).where(inArray13(topicStudyLogs.userId, ids)).groupBy(topicStudyLogs.userId)
  ]) : [[], [], []];
  const topicMap = new Map(topicAgg.map((row) => [row.userId, row]));
  const examMap = new Map(examAgg.map((row) => [row.userId, row]));
  const studyMap = new Map(studyAgg.map((row) => [row.userId, row]));
  const rows = pageRows.map((row) => {
    const topic = topicMap.get(row.id);
    const exam = examMap.get(row.id);
    const study = studyMap.get(row.id);
    const { openId, ...rest } = row;
    return {
      ...rest,
      phone: phoneFromOpenId(openId),
      planCode: row.planCode ?? "FREE",
      planName: row.planName ?? "\xDCcretsiz",
      subscriptionStatus: row.subscriptionStatus ?? "active",
      topicCoveragePercent: topic ? Math.round(Number(topic.avgProgress)) : 0,
      studiedTopicCount: topic?.topicCount ?? 0,
      examCount: exam?.examCount ?? 0,
      latestExamNet: exam?.latestNet != null ? Number(exam.latestNet) : null,
      totalStudyMinutes: study ? Number(study.totalMinutes) : 0
    };
  });
  return { rows, total, page: page2, pageSize };
}
var startOfToday2 = () => {
  const date = /* @__PURE__ */ new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
var daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
async function suspendUser(userId, adminId, reason) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "suspended" }).where(eq31(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_suspended", newState: { accountStatus: "suspended" }, reason });
}
async function reactivateUser(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountStatus: "active" }).where(eq31(users.id, userId));
  await writeAuditLog({ userId, adminId, action: "user_reactivated", newState: { accountStatus: "active" } });
}
async function verifyUserEmailManually(userId, adminId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifiedAt: /* @__PURE__ */ new Date() }).where(and27(eq31(users.id, userId), isNull16(users.emailVerifiedAt)));
  await writeAuditLog({ userId, adminId, action: "email_verified_by_admin", newState: { emailVerified: true } });
}
function maskId2(value) {
  if (!value) return value;
  if (value.length <= 8) return `${value.slice(0, 2)}\u2022\u2022\u2022\u2022`;
  return `${value.slice(0, 4)}\u2022\u2022\u2022\u2022${value.slice(-4)}`;
}
async function getUserDetailForAdmin(userId) {
  const db = await getDb();
  if (!db) return null;
  const [userRow] = await db.select().from(users).where(eq31(users.id, userId)).limit(1);
  if (!userRow) return null;
  const activeTrack = await getStudentExamTrack(userId);
  const [entitlements, usage, progressScore, payments2, recentExams, topicRows, recentStudyLogs, auditLogs, profile, bookContentRows, notebook] = await Promise.all([
    getEntitlements(userId, activeTrack),
    getUsageSummaryForUser(userId, activeTrack),
    getStudyProgressScore(userId),
    listPaymentsForUser(userId),
    db.select().from(userMockExams).where(eq31(userMockExams.userId, userId)).orderBy(desc18(userMockExams.examDate)).limit(10),
    db.select().from(topicProgress).where(eq31(topicProgress.userId, userId)),
    db.select().from(topicStudyLogs).where(eq31(topicStudyLogs.userId, userId)).orderBy(desc18(topicStudyLogs.studyDate)).limit(20),
    listAuditLogsForUser(userId),
    getStudentProfile(userId),
    db.select({ bookId: userBookContents.bookId, mappingStatus: userBookContents.mappingStatus, mappingMethod: userBookContents.mappingMethod, mappingConfidence: userBookContents.mappingConfidence, source: userBookContents.source, createdAt: userBookContents.createdAt }).from(userBookContents).where(eq31(userBookContents.userId, userId)),
    // Defter: yalnızca sayılar — öğrencinin not içeriği admin tarafından görülmez.
    getNoteStatsForAdmin(userId)
  ]);
  const bookContents = Array.from(bookContentRows.reduce((map, row) => {
    const item = map.get(row.bookId) ?? { bookId: row.bookId, source: row.source, entries: 0, confirmed: 0, unmatched: 0, lowConfidence: 0, manual: 0, scannedAt: row.createdAt };
    item.entries += 1;
    if (row.mappingStatus === "confirmed") item.confirmed += 1;
    if (row.mappingStatus === "unmatched") item.unmatched += 1;
    if (row.mappingMethod === "manual") item.manual += 1;
    else if (row.mappingStatus === "confirmed" && Number(row.mappingConfidence) < 0.9) item.lowConfidence += 1;
    map.set(row.bookId, item);
    return map;
  }, /* @__PURE__ */ new Map()).values());
  const bookIds = bookContents.map((book) => book.bookId);
  const numericIds = bookIds.filter((id8) => /^\d+$/.test(id8)).map(Number);
  const [customTitles, catalogTitles] = bookIds.length ? await Promise.all([
    db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and27(eq31(userResourceBooks.userId, userId), inArray13(userResourceBooks.bookId, bookIds))),
    numericIds.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray13(catalogBooks.id, numericIds)) : Promise.resolve([])
  ]) : [[], []];
  const titleById = new Map([...customTitles.map((row) => [row.bookId, row.title]), ...catalogTitles.map((row) => [String(row.id), row.name])]);
  const bookContentsWithTitles = bookContents.map((book) => ({ ...book, title: titleById.get(book.bookId) ?? null }));
  const allSubscriptions = await listSubscriptionsForUser(userId);
  const subscriptionRow = allSubscriptions.find((row) => row.track === activeTrack);
  const plan = subscriptionRow ? await getPlanById(subscriptionRow.planId) : null;
  const subscriptionsByTrack = await Promise.all(allSubscriptions.map(async (row) => ({ track: row.track, status: row.status, planCode: (await getPlanById(row.planId))?.code ?? "FREE", currentPeriodEnd: row.currentPeriodEnd, trialEndsAt: row.trialEndsAt, cancelAtPeriodEnd: row.cancelAtPeriodEnd, isManualOverride: row.isManualOverride })));
  const { passwordHash: _passwordHash, ...safeUser } = userRow;
  return {
    user: { ...safeUser, phone: phoneFromOpenId(safeUser.openId) },
    profile,
    bookContents: bookContentsWithTitles,
    notebook,
    subscription: subscriptionRow ? { ...subscriptionRow, providerSubscriptionId: maskId2(subscriptionRow.providerSubscriptionId), providerCustomerId: maskId2(subscriptionRow.providerCustomerId), planCode: plan?.code ?? "FREE", planName: plan?.name ?? "\xDCcretsiz", planTier: plan?.tier ?? "free" } : null,
    subscriptions: subscriptionsByTrack,
    activeTrack,
    entitlements,
    usage,
    progressScore,
    payments: payments2.map((payment) => ({ ...payment, providerPaymentId: maskId2(payment.providerPaymentId), providerTransactionId: maskId2(payment.providerTransactionId), metadata: void 0 })),
    recentExams: recentExams.map((exam) => ({ id: exam.id, title: exam.title, exam: exam.exam, examDate: exam.examDate, net: Number(exam.net) })),
    topicProgress: topicRows,
    recentStudyLogs,
    auditLogs
  };
}

// server/routers/admin/users.ts
var adminUsersRouter = router({
  list: adminProcedure.input(
    z26.object({
      search: z26.string().max(120).optional(),
      approvalStatus: z26.enum(["pending", "approved", "rejected"]).optional(),
      accountStatus: z26.enum(["active", "suspended", "deleted"]).optional(),
      planCode: z26.string().max(40).optional(),
      subscriptionStatus: z26.string().max(40).optional(),
      activity: z26.enum(["today", "week", "inactive"]).optional(),
      page: z26.number().int().min(1).default(1),
      pageSize: z26.number().int().min(1).max(100).default(20)
    })
  ).query(({ input }) => listUsersForAdminPaginated(input)),
  get: adminProcedure.input(z26.object({ userId: z26.number().int() })).query(({ input }) => getUserDetailForAdmin(input.userId)),
  listPending: adminProcedure.query(() => listPendingUsers()),
  approve: adminProcedure.input(z26.object({ userId: z26.number().int() })).mutation(({ ctx, input }) => approveUser(input.userId, ctx.user.id)),
  reject: adminProcedure.input(z26.object({ userId: z26.number().int(), reason: z26.string().max(300).optional() })).mutation(({ ctx, input }) => rejectUser(input.userId, ctx.user.id, input.reason)),
  // Hesap yaşam döngüsü — subscription iptaliyle KARIŞTIRILMAZ (spec §5/§23): bir kullanıcı aboneliğini iptal edince hesabı askıya alınmaz.
  suspend: adminProcedure.input(z26.object({ userId: z26.number().int(), reason: z26.string().max(300).optional() })).mutation(({ ctx, input }) => suspendUser(input.userId, ctx.user.id, input.reason)),
  reactivate: adminProcedure.input(z26.object({ userId: z26.number().int() })).mutation(({ ctx, input }) => reactivateUser(input.userId, ctx.user.id)),
  verifyEmail: adminProcedure.input(z26.object({ userId: z26.number().int() })).mutation(({ ctx, input }) => verifyUserEmailManually(input.userId, ctx.user.id))
});

// server/routers/admin/quotes.ts
import { TRPCError as TRPCError18 } from "@trpc/server";
import { z as z28 } from "zod";

// shared/orgQuote.ts
import { z as z27 } from "zod";
var QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"];
var quoteLineSchema = z27.object({
  description: z27.string().trim().min(1).max(200),
  quantity: z27.number().int().min(1).max(1e5),
  unitPriceTry: z27.number().int().min(0).max(1e8)
});
function computeQuoteTotals(lines, discountPercent, vatRate) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceTry, 0);
  const discount = Math.round(subtotal * Math.min(100, Math.max(0, discountPercent)) / 100);
  const net = subtotal - discount;
  const vat = Math.round(net * Math.max(0, vatRate) / 100);
  return { subtotal, discount, net, vat, total: net + vat };
}
var quoteNumber = (id8, createdAt) => `T-${new Date(createdAt).getFullYear()}-${String(id8).padStart(4, "0")}`;

// server/org/quoteDb.ts
import { desc as desc19, eq as eq32 } from "drizzle-orm";
async function requireDb11() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  return db;
}
var parseLines = (json) => {
  try {
    return quoteLineSchema.array().parse(JSON.parse(json));
  } catch {
    return [];
  }
};
var toRow = (input) => {
  const totals = computeQuoteTotals(input.lines, input.discountPercent, input.vatRate);
  const { lines, ...rest } = input;
  return { ...rest, linesJson: JSON.stringify(lines), subtotalTry: totals.subtotal, totalTry: totals.total };
};
async function listQuotes() {
  const db = await requireDb11();
  return db.select({ id: orgQuotes.id, orgId: orgQuotes.orgId, orgName: organizations.name, customerName: orgQuotes.customerName, plan: orgQuotes.plan, months: orgQuotes.months, totalTry: orgQuotes.totalTry, status: orgQuotes.status, validUntil: orgQuotes.validUntil, appliedAt: orgQuotes.appliedAt, createdAt: orgQuotes.createdAt, updatedAt: orgQuotes.updatedAt }).from(orgQuotes).leftJoin(organizations, eq32(organizations.id, orgQuotes.orgId)).orderBy(desc19(orgQuotes.createdAt));
}
async function getQuote(id8) {
  const db = await requireDb11();
  const [row] = await db.select({ quote: orgQuotes, orgName: organizations.name, createdByName: users.name, createdByEmail: users.email }).from(orgQuotes).leftJoin(organizations, eq32(organizations.id, orgQuotes.orgId)).leftJoin(users, eq32(users.id, orgQuotes.createdByUserId)).where(eq32(orgQuotes.id, id8)).limit(1);
  if (!row) return null;
  const { linesJson, ...quote } = row.quote;
  const lines = parseLines(linesJson);
  return { ...quote, lines, totals: computeQuoteTotals(lines, quote.discountPercent, quote.vatRate), orgName: row.orgName, createdByName: row.createdByName, createdByEmail: row.createdByEmail };
}
async function createQuote(input, createdByUserId) {
  const db = await requireDb11();
  const [row] = await db.insert(orgQuotes).values({ ...toRow(input), createdByUserId }).returning({ id: orgQuotes.id });
  return row.id;
}
async function updateQuote(id8, input) {
  const db = await requireDb11();
  await db.update(orgQuotes).set(toRow(input)).where(eq32(orgQuotes.id, id8));
}
async function setQuoteStatus(id8, status) {
  const db = await requireDb11();
  await db.update(orgQuotes).set({ status }).where(eq32(orgQuotes.id, id8));
}
async function markQuoteApplied(id8) {
  const db = await requireDb11();
  await db.update(orgQuotes).set({ appliedAt: /* @__PURE__ */ new Date() }).where(eq32(orgQuotes.id, id8));
}
async function deleteQuote(id8) {
  const db = await requireDb11();
  await db.delete(orgQuotes).where(eq32(orgQuotes.id, id8));
}

// server/routers/admin/quotes.ts
var id6 = z28.number().int().positive();
var day = z28.string().regex(/^\d{4}-\d{2}-\d{2}$/);
var quoteInput = z28.object({
  orgId: id6.nullable(),
  customerName: z28.string().trim().min(2).max(160),
  contactName: z28.string().trim().max(120).nullable(),
  contactEmail: z28.string().trim().email().max(160).nullable(),
  plan: z28.enum(ORG_PLANS),
  months: z28.number().int().min(1).max(60),
  studentCount: z28.number().int().min(1).max(1e5).nullable(),
  lines: z28.array(quoteLineSchema).min(1).max(30),
  discountPercent: z28.number().int().min(0).max(100),
  vatRate: z28.number().int().min(0).max(30),
  validUntil: day.nullable(),
  note: z28.string().trim().max(2e3).nullable()
});
async function requireQuote(quoteId) {
  const quote = await getQuote(quoteId);
  if (!quote) throw new TRPCError18({ code: "NOT_FOUND", message: "Teklif bulunamad\u0131." });
  return quote;
}
var adminQuotesRouter = router({
  list: adminProcedure.query(() => listQuotes()),
  get: adminProcedure.input(z28.object({ id: id6 })).query(({ input }) => requireQuote(input.id)),
  save: adminProcedure.input(quoteInput.extend({ id: id6.optional() })).mutation(async ({ ctx, input }) => {
    if (input.orgId && !await getOrganization(input.orgId)) throw new TRPCError18({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    const { id: quoteId, validUntil, ...rest } = input;
    const values = { ...rest, contactName: rest.contactName || null, contactEmail: rest.contactEmail || null, note: rest.note || null, validUntil: validUntil ? /* @__PURE__ */ new Date(`${validUntil}T23:59:59`) : null };
    if (!quoteId) return { id: await createQuote(values, ctx.user.id) };
    const current = await requireQuote(quoteId);
    if (current.status === "accepted" || current.status === "rejected") throw new TRPCError18({ code: "BAD_REQUEST", message: "Sonu\xE7lanm\u0131\u015F teklif de\u011Fi\u015Ftirilemez; kopyalay\u0131p yenisini haz\u0131rla." });
    await updateQuote(quoteId, values);
    return { id: quoteId };
  }),
  setStatus: adminProcedure.input(z28.object({ id: id6, status: z28.enum(QUOTE_STATUSES) })).mutation(async ({ ctx, input }) => {
    const quote = await requireQuote(input.id);
    if (quote.appliedAt) throw new TRPCError18({ code: "BAD_REQUEST", message: "Kuruma uygulanm\u0131\u015F teklifin durumu de\u011Fi\u015Fmez." });
    await setQuoteStatus(input.id, input.status);
    if (quote.orgId) await writeAudit({ orgId: quote.orgId, actorUserId: ctx.user.id, action: "platform.quote_status", targetType: "quote", targetId: input.id, metadata: { status: input.status, number: quoteNumber(quote.id, quote.createdAt) } });
    return { ok: true };
  }),
  /** Kabul edilen teklifi bağlı kurumun üyeliğine uygular (bir kez). */
  applyToOrg: adminProcedure.input(z28.object({ id: id6 })).mutation(async ({ ctx, input }) => {
    const quote = await requireQuote(input.id);
    if (quote.status !== "accepted") throw new TRPCError18({ code: "BAD_REQUEST", message: "\xD6nce teklifi kabul edildi olarak i\u015Faretle." });
    if (quote.appliedAt) throw new TRPCError18({ code: "CONFLICT", message: "Bu teklif kuruma zaten uyguland\u0131." });
    if (!quote.orgId) throw new TRPCError18({ code: "BAD_REQUEST", message: "Teklif bir kuruma ba\u011Fl\u0131 de\u011Fil; \xF6nce kurumu olu\u015Fturup teklife ba\u011Fla." });
    const org = await getOrganization(quote.orgId);
    if (!org) throw new TRPCError18({ code: "NOT_FOUND", message: "Kurum bulunamad\u0131." });
    const now = /* @__PURE__ */ new Date();
    const expired = membershipState(org, now) !== "active";
    await updateOrgMembership(org.id, { plan: quote.plan, membershipStartsAt: expired || !org.membershipStartsAt ? now : org.membershipStartsAt, membershipEndsAt: renewedMembershipEnd(expired ? null : org.membershipEndsAt, now, quote.months), aiCreditsMonthly: Math.max(org.aiCreditsMonthly, ORG_PLAN_DEFAULT_CREDITS[quote.plan]) });
    await markQuoteApplied(quote.id);
    await writeAudit({ orgId: org.id, actorUserId: ctx.user.id, action: "platform.quote_applied", targetType: "quote", targetId: quote.id, metadata: { plan: ORG_PLAN_LABELS[quote.plan], months: quote.months, number: quoteNumber(quote.id, quote.createdAt) } });
    return { ok: true };
  }),
  delete: adminProcedure.input(z28.object({ id: id6 })).mutation(async ({ input }) => {
    const quote = await requireQuote(input.id);
    if (quote.status !== "draft") throw new TRPCError18({ code: "BAD_REQUEST", message: "Yaln\u0131zca taslak teklif silinebilir." });
    await deleteQuote(input.id);
    return { ok: true };
  })
});

// server/routers/admin/settings.ts
import { eq as eq34 } from "drizzle-orm";
import { z as z30 } from "zod";

// shared/platformCompany.ts
import { z as z29 } from "zod";
var text3 = (max) => z29.string().trim().max(max).default("");
var companyInfoSchema = z29.object({
  brandName: text3(80),
  legalName: text3(200),
  taxOffice: text3(80),
  taxNumber: z29.string().trim().regex(/^(\d{10,11})?$/, "Vergi / TC kimlik numaras\u0131 10 ya da 11 haneli olmal\u0131.").default(""),
  mersisNo: z29.string().trim().regex(/^(\d{16})?$/, "MERS\u0130S numaras\u0131 16 haneli olmal\u0131.").default(""),
  address: text3(300),
  phone: text3(40),
  email: z29.union([z29.literal(""), z29.string().trim().email("Ge\xE7erli bir e-posta yaz.").max(160)]).default(""),
  website: text3(160),
  bankName: text3(80),
  iban: z29.string().trim().transform((value) => value.replace(/\s+/g, "").toUpperCase()).pipe(z29.string().regex(/^(TR\d{24})?$/, "IBAN TR ile ba\u015Flayan 26 karakter olmal\u0131.")).default(""),
  quoteTerms: text3(2e3)
});
var EMPTY_COMPANY = companyInfoSchema.parse({});

// server/admin/platformSettings.ts
import { eq as eq33 } from "drizzle-orm";
async function requireDb12() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  return db;
}
async function getCompanyInfo() {
  const db = await requireDb12();
  const [row] = await db.select({ valueJson: platformSettings.valueJson }).from(platformSettings).where(eq33(platformSettings.key, "company")).limit(1);
  if (!row) return EMPTY_COMPANY;
  try {
    return companyInfoSchema.parse(JSON.parse(row.valueJson));
  } catch {
    return EMPTY_COMPANY;
  }
}
async function saveCompanyInfo(info, updatedByUserId) {
  const db = await requireDb12();
  const values = { valueJson: JSON.stringify(info), updatedByUserId };
  await db.insert(platformSettings).values({ key: "company", ...values }).onConflictDoUpdate({ target: platformSettings.key, set: values });
}

// server/routers/admin/settings.ts
var adminSettingsRouter = router({
  company: adminProcedure.query(() => getCompanyInfo()),
  saveCompany: adminProcedure.input(companyInfoSchema).mutation(async ({ ctx, input }) => {
    await saveCompanyInfo(input, ctx.user.id);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "company_info_updated", newState: { legalName: input.legalName, taxNumber: input.taxNumber } });
    return { ok: true };
  }),
  updateMyName: adminProcedure.input(z30.object({ name: z30.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
    await db.update(users).set({ name: input.name }).where(eq34(users.id, ctx.user.id));
    return { ok: true };
  })
});

// server/routers/admin/topics.ts
import { TRPCError as TRPCError19 } from "@trpc/server";
import { z as z31 } from "zod";

// server/admin/topicAdmin.ts
import { and as and28, eq as eq35, inArray as inArray14, sql as sql16 } from "drizzle-orm";
var TopicAdminError = class extends Error {
};
async function requireDb13() {
  const db = await getDb();
  if (!db) throw new Error("Veritaban\u0131na ula\u015F\u0131lamad\u0131.");
  return db;
}
var slugify3 = (value) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var sameName = (a, b) => a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");
var parseNames = (json) => {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
var CURRICULUM_RANK = new Map(CURRICULUM.map((def, index2) => [def.slug, index2]));
async function listTopicsForAdmin(exam) {
  await ensureTopicCatalogSeeded();
  const db = await requireDb13();
  const rows = await db.select().from(yksTopics).where(eq35(yksTopics.exam, exam));
  const counts = rows.length ? await db.select({ topicId: topicProgress.topicId, count: sql16`COUNT(DISTINCT ${topicProgress.userId})::int` }).from(topicProgress).where(inArray14(topicProgress.topicId, rows.map((row) => row.id))).groupBy(topicProgress.topicId) : [];
  const countById = new Map(counts.map((row) => [row.topicId, Number(row.count)]));
  const order = subjectNamesOf(exam);
  const subjects = Array.from(/* @__PURE__ */ new Set([...order, ...rows.map((row) => row.subject)]));
  const rank = (slug, id8) => CURRICULUM_RANK.get(slug) ?? 1e6 + id8;
  const topics = rows.sort((a, b) => subjects.indexOf(a.subject) - subjects.indexOf(b.subject) || rank(a.slug, a.id) - rank(b.slug, b.id)).map((row) => ({ id: row.id, slug: row.slug, subject: row.subject, unit: row.unit, topic: row.topic, hidden: row.hidden === 1, origin: CURRICULUM_RANK.has(row.slug) ? "curriculum" : isAdminTopicSlug(row.slug) ? "admin" : "other", previousNames: parseNames(row.previousNames), studentCount: countById.get(row.id) ?? 0 }));
  return { subjects, topics };
}
async function findDuplicate(exam, subject2, topic, exceptId) {
  const db = await requireDb13();
  const rows = await db.select({ id: yksTopics.id, topic: yksTopics.topic, hidden: yksTopics.hidden }).from(yksTopics).where(and28(eq35(yksTopics.exam, exam), eq35(yksTopics.subject, subject2)));
  return rows.find((row) => row.id !== exceptId && sameName(row.topic, topic)) ?? null;
}
async function addTopic(input) {
  const db = await requireDb13();
  const { subjects } = await listTopicsForAdmin(input.exam);
  if (!subjects.includes(input.subject)) throw new TopicAdminError("Bu ders bu s\u0131navda yok.");
  const duplicate = await findDuplicate(input.exam, input.subject, input.topic);
  if (duplicate) throw new TopicAdminError(duplicate.hidden ? "Bu konu zaten var ama gizli; listede 'G\xF6ster' ile geri a\xE7abilirsin." : "Bu derste ayn\u0131 adl\u0131 bir konu zaten var.");
  const base = `${ADMIN_TOPIC_SLUG_PREFIX}${input.exam.toLowerCase()}-${slugify3(input.subject)}-${slugify3(input.topic)}`.slice(0, 110);
  const taken = new Set((await db.select({ slug: yksTopics.slug }).from(yksTopics).where(sql16`${yksTopics.slug} LIKE ${`${base}%`}`)).map((row2) => row2.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  const [row] = await db.insert(yksTopics).values({ slug, exam: input.exam, subject: input.subject, unit: input.unit, topic: input.topic }).returning({ id: yksTopics.id });
  return row.id;
}
async function updateTopic(input) {
  const db = await requireDb13();
  const [row] = await db.select().from(yksTopics).where(eq35(yksTopics.id, input.id)).limit(1);
  if (!row) throw new TopicAdminError("Konu bulunamad\u0131.");
  if (await findDuplicate(row.exam, row.subject, input.topic, row.id)) throw new TopicAdminError("Bu derste ayn\u0131 adl\u0131 bir konu zaten var.");
  const names = parseNames(row.previousNames);
  if (!sameName(row.topic, input.topic) && !names.includes(row.topic)) names.push(row.topic);
  await db.update(yksTopics).set({ topic: input.topic, unit: input.unit, previousNames: JSON.stringify(names.filter((name2) => !sameName(name2, input.topic))) }).where(eq35(yksTopics.id, row.id));
  return { exam: row.exam, from: row.topic };
}
async function renameUnit(input) {
  const db = await requireDb13();
  const updated = await db.update(yksTopics).set({ unit: input.to }).where(and28(eq35(yksTopics.exam, input.exam), eq35(yksTopics.subject, input.subject), eq35(yksTopics.unit, input.from))).returning({ id: yksTopics.id });
  if (!updated.length) throw new TopicAdminError("\xDCnite bulunamad\u0131.");
  return updated.length;
}
async function setTopicHidden(id8, hidden) {
  const db = await requireDb13();
  const updated = await db.update(yksTopics).set({ hidden: hidden ? 1 : 0 }).where(eq35(yksTopics.id, id8)).returning({ id: yksTopics.id });
  if (!updated.length) throw new TopicAdminError("Konu bulunamad\u0131.");
}

// server/routers/admin/topics.ts
var id7 = z31.number().int().positive();
var name = (max) => z31.string().trim().min(2).max(max);
async function userFacing6(run) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TopicAdminError) throw new TRPCError19({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}
var adminTopicsRouter = router({
  list: adminProcedure.input(z31.object({ exam: z31.enum(EXAM_KINDS) })).query(({ input }) => listTopicsForAdmin(input.exam)),
  add: adminProcedure.input(z31.object({ exam: z31.enum(EXAM_KINDS), subject: name(80), unit: name(120), topic: name(180) })).mutation(({ ctx, input }) => userFacing6(async () => {
    const topicId = await addTopic(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_added", newState: input });
    return { id: topicId };
  })),
  update: adminProcedure.input(z31.object({ id: id7, topic: name(180), unit: name(120) })).mutation(({ ctx, input }) => userFacing6(async () => {
    const result = await updateTopic(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_updated", oldState: { topic: result.from }, newState: input });
    return { ok: true };
  })),
  renameUnit: adminProcedure.input(z31.object({ exam: z31.enum(EXAM_KINDS), subject: name(80), from: z31.string().trim().min(1).max(120), to: name(120) })).mutation(({ ctx, input }) => userFacing6(async () => {
    const count4 = await renameUnit(input);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "topic_unit_renamed", newState: input });
    return { count: count4 };
  })),
  setHidden: adminProcedure.input(z31.object({ id: id7, hidden: z31.boolean() })).mutation(({ ctx, input }) => userFacing6(async () => {
    await setTopicHidden(input.id, input.hidden);
    await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: input.hidden ? "topic_hidden" : "topic_shown", newState: input });
    return { ok: true };
  }))
});

// server/routers/admin/index.ts
var adminRouter = router({
  users: adminUsersRouter,
  subscriptions: adminSubscriptionsRouter,
  usage: adminUsageRouter,
  analytics: adminAnalyticsRouter,
  audit: adminAuditRouter,
  payments: adminPaymentsRouter,
  system: adminSystemRouter,
  orgs: adminOrgsRouter,
  quotes: adminQuotesRouter,
  settings: adminSettingsRouter,
  topics: adminTopicsRouter,
  errors: adminErrorsRouter,
  testimonials: adminTestimonialsRouter
});

// server/routers/testimonials.ts
import { z as z32 } from "zod";

// shared/testimonials.ts
var TESTIMONIAL_LIMITS = { displayName: 60, detail: 80, bodyMin: 20, body: 600 };

// server/routers/testimonials.ts
var testimonialInput = z32.object({
  displayName: z32.string().trim().min(2, "G\xF6r\xFCnecek ad\u0131n\u0131 yaz.").max(TESTIMONIAL_LIMITS.displayName),
  detail: z32.string().trim().max(TESTIMONIAL_LIMITS.detail).optional(),
  rating: z32.number().int().min(1).max(5),
  body: z32.string().trim().min(TESTIMONIAL_LIMITS.bodyMin, `Yorumun en az ${TESTIMONIAL_LIMITS.bodyMin} karakter olmal\u0131.`).max(TESTIMONIAL_LIMITS.body)
});
var testimonialsRouter = router({
  published: publicProcedure.query(() => listPublishedTestimonials()),
  mine: protectedProcedure.query(({ ctx }) => getMyTestimonial(ctx.user.id)),
  save: protectedProcedure.input(testimonialInput).mutation(({ ctx, input }) => saveMyTestimonial(ctx.user.id, { ...input, detail: input.detail || null })),
  remove: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteMyTestimonial(ctx.user.id);
    return { ok: true };
  })
});

// server/routers.ts
var planInput2 = z33.object({
  topics: z33.array(z33.object({
    topic: z33.string(),
    subject: z33.string(),
    exam: z33.enum(EXAM_KINDS),
    progress: z33.number(),
    status: z33.enum(["Zay\u0131f", "Orta", "\u0130yi"])
  })).max(50),
  exams: z33.array(z33.object({
    title: z33.string(),
    date: z33.string(),
    net: z33.number(),
    subjects: z33.record(z33.string(), z33.number()),
    topicDetails: z33.array(z33.object({
      subject: z33.string(),
      topic: z33.string(),
      questionCount: z33.number(),
      correct: z33.number(),
      wrong: z33.number(),
      blank: z33.number(),
      accuracy: z33.number(),
      net: z33.number()
    })).optional()
  })).max(10),
  books: z33.array(z33.object({
    id: z33.string(),
    title: z33.string(),
    subject: z33.string(),
    exam: z33.enum(EXAM_KINDS),
    level: z33.enum(["Kolay", "Orta", "Zor"]),
    pageCount: z33.number().optional(),
    totalQuestions: z33.number().optional(),
    accuracy: z33.number().optional(),
    activeDays: z33.number().optional(),
    mappings: z33.array(z33.object({ topic: z33.string(), pageStart: z33.number().optional(), pageEnd: z33.number().optional(), testStart: z33.number().optional(), testEnd: z33.number().optional() })).max(50).optional()
  })).max(30).default([]),
  availableMinutes: z33.number().min(120).max(2400).default(600),
  // Öğrencinin yerel "bugün"ü (YYYY-MM-DD): plan bugünden başlayan 7 günü kapsar.
  startDate: z33.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goal: z33.string().max(120).default("YKS 2027"),
  // Onboarding'den gelen koçluk bağlamı — tamamen isteğe bağlı, eski
  // istemciler (veya onboarding'i henüz tamamlamamış kullanıcılar) bu alanı
  // hiç göndermeyebilir.
  studentProfile: z33.object({
    // Hedef bilgileri — onboarding'in "Kullanıcı tanımlama" ve "Hedefler"
    // adımlarından. AI planı önceliklendirirken (örn. hedef net/sıralamaya
    // göre tempo) ve dilini kişiselleştirirken kullanır.
    targetScoreType: z33.string().max(20).optional(),
    examYear: z33.number().int().optional(),
    targetUniversity: z33.string().max(180).optional(),
    targetDepartment: z33.string().max(180).optional(),
    targetRanking: z33.string().max(60).optional(),
    dailyStudyDuration: z33.number().int().min(0).max(960).optional(),
    preferredStudyMethods: z33.array(z33.string().max(40)).max(5).optional(),
    studyObstacles: z33.string().max(500).optional(),
    coachingStyle: z33.string().max(40).optional(),
    mainGoal: z33.string().max(500).optional()
  }).optional()
});
var documentExtractionInput = z33.object({
  dataUrl: z33.string().min(20).max(12e6),
  mimeType: z33.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
  fileName: z33.string().max(180).optional()
});
var bookPhotoInput = z33.object({
  dataUrl: z33.string().min(20).max(12e6),
  mimeType: z33.enum(["image/png", "image/jpeg", "image/webp"])
});
var bookPhotoSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    publisher: { type: "string" },
    subject: { type: "string" },
    exam: { type: "string", enum: [...EXAM_KINDS, "GENEL"] },
    authors: { type: "array", items: { type: "string" } },
    isbn: { type: "string" },
    edition: { type: "string" },
    confident: { type: "boolean" },
    imageKind: { type: "string", enum: ["cover", "table_of_contents", "other"] },
    // Alan bazında 0-1 güven: arayüz düşük güvenli alanı "kontrol et" diye işaretler.
    fieldConfidence: {
      type: "object",
      properties: { title: { type: "number" }, publisher: { type: "number" }, subject: { type: "number" }, exam: { type: "number" }, isbn: { type: "number" } },
      required: ["title", "publisher", "subject", "exam", "isbn"],
      additionalProperties: false
    }
  },
  required: ["title", "publisher", "subject", "exam", "authors", "isbn", "edition", "confident", "imageKind", "fieldConfidence"],
  additionalProperties: false
};
var clamp013 = (value) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
var userExamInput = z33.object({
  title: z33.string().min(1).max(180),
  exam: z33.enum(EXAM_KINDS),
  date: z33.string().min(8).max(30),
  net: z33.number().min(-100).max(200),
  delta: z33.number().min(-200).max(200),
  subjects: z33.record(z33.string(), z33.number().min(-50).max(100)),
  timeSpent: z33.record(z33.string(), z33.number().int().min(0).max(1e3)),
  topicNets: z33.record(z33.string(), z33.number().min(-50).max(100)),
  topicDetails: z33.array(z33.object({ subject: z33.string(), topic: z33.string(), questionCount: z33.number().int().min(0), correct: z33.number().int().min(0), wrong: z33.number().int().min(0), blank: z33.number().int().min(0), accuracy: z33.number().min(0).max(100), net: z33.number().min(-50).max(100) })).max(300),
  importedFrom: z33.enum(["manual", "ocr", "pdf", "csv", "xlsx"]),
  notes: z33.string().max(5e3).optional()
});
var documentExtractionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    date: { type: "string" },
    exam: { type: "string", enum: [...EXAM_KINDS] },
    subjects: { type: "object", additionalProperties: { type: "number" } },
    timeSpent: { type: "object", additionalProperties: { type: "number" } },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" },
          topic: { type: "string" },
          questionCount: { type: "integer" },
          correct: { type: "integer" },
          wrong: { type: "integer" },
          blank: { type: "integer" },
          accuracy: { type: "number" },
          net: { type: "number" }
        },
        required: ["subject", "topic", "questionCount", "correct", "wrong", "blank", "accuracy", "net"],
        additionalProperties: false
      }
    },
    notes: { type: "string" }
  },
  required: ["title", "date", "exam", "subjects", "timeSpent", "topics", "notes"],
  additionalProperties: false
};
var fallbackPlan = {
  summary: "Bu hafta \xF6nce zay\u0131f konular\u0131 k\xFC\xE7\xFClt\xFCyor, sonra deneme analizleriyle netlerini sabitliyoruz.",
  focus: [
    { topic: "Problemler", subject: "Matematik", reason: "Zay\u0131f konu ve son denemede geli\u015Fim alan\u0131." },
    { topic: "Paragrafta anlam", subject: "T\xFCrk\xE7e", reason: "G\xFCnl\xFCk k\u0131sa tekrarlarla h\u0131z kazan\u0131labilir." }
  ],
  days: [
    { day: "Pazartesi", date: "", totalMinutes: 90, sessions: [{ title: "Temel kavram tekrar", subject: "Matematik", topic: "Problemler", minutes: 35, kind: "\xD6\u011Frenme", rationale: "Zay\u0131f konunun temel ad\u0131mlar\u0131n\u0131 netle\u015Ftir." }, { title: "Yeni nesil soru seti", subject: "Matematik", topic: "Problemler", minutes: 40, kind: "Soru", rationale: "\xD6\u011Frenmeyi 20 soruyla peki\u015Ftir." }, { title: "Hata notu", subject: "Matematik", topic: "Problemler", minutes: 15, kind: "Tekrar", rationale: "Yanl\u0131\u015Flar\u0131n nedenini tek c\xFCmlede yaz." }] },
    { day: "Sal\u0131", date: "", totalMinutes: 75, sessions: [{ title: "Paragraf h\u0131z turu", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", minutes: 35, kind: "Soru", rationale: "S\xFCre tutarak 20 soru \xE7\xF6z." }, { title: "Yanl\u0131\u015F analizi", subject: "T\xFCrk\xE7e", topic: "Paragrafta anlam", minutes: 20, kind: "Tekrar", rationale: "\xC7eldirici t\xFCrlerini ay\u0131r." }, { title: "K\u0131sa tekrar", subject: "Matematik", topic: "Problemler", minutes: 20, kind: "Tekrar", rationale: "D\xFCnk\xFC hata notuna d\xF6n." }] }
  ],
  coachNote: "Her oturumun sonunda yanl\u0131\u015F nedenini yaz; sadece do\u011Fru say\u0131s\u0131n\u0131 de\u011Fil, d\xFC\u015F\xFCnme bi\xE7imini de geli\u015Ftir."
};
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    // `passwordHash` (only ever set on local dev accounts, see
    // server/_core/localAuth.ts) must never reach the client — strip it here
    // rather than relying on every future caller of ctx.user to remember to.
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    // Profil menüsündeki "Şifre değiştir". Tahmin denemelerine karşı kullanıcı
    // başına 15 dakikada 5 deneme.
    changePassword: protectedProcedure.input(z33.object({ currentPassword: z33.string().min(1).max(200), newPassword: z33.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
      try {
        checkRateLimit(`change-password:${ctx.user.id}`, 5, 15 * 6e4);
      } catch {
        throw new TRPCError20({ code: "TOO_MANY_REQUESTS", message: "\xC7ok fazla deneme yapt\u0131n. 15 dakika sonra tekrar dener misin?" });
      }
      try {
        await changeLocalPassword(ctx.user.id, input.currentPassword, input.newPassword);
        return { success: true };
      } catch (error) {
        if (error instanceof PasswordChangeError) throw new TRPCError20({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
    }),
    // "E-postanı doğrula" ekranının "Tekrar gönder" butonu. requireUser'ın
    // doğrulama/onay kapısından muaf (bkz. _core/trpc.ts APPROVAL_GATE_ALLOWLIST).
    resendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await sendVerificationEmail(ctx.user, ctx.req);
      } catch (error) {
        console.error("[EmailVerification] resend failed:", error instanceof Error ? error.message : error);
        throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR", message: "Do\u011Frulama maili \u015Fu an g\xF6nderilemedi. Birka\xE7 dakika sonra tekrar dener misin?" });
      }
    })
  }),
  resources: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const [inventory, logs, mappings, switches, customBooks] = await Promise.all([
        getBookInventory(ctx.user.id),
        getBookStudyLogs(ctx.user.id),
        getBookTopicMappings(ctx.user.id),
        getSourceSwitches(ctx.user.id),
        getUserResourceBooks(ctx.user.id)
      ]);
      return { inventory, logs, mappings, switches, customBooks };
    }),
    addBook: protectedProcedure.input(z33.object({ bookId: z33.string().max(120) })).mutation(({ ctx, input }) => addBookToInventory(ctx.user.id, input.bookId)),
    removeBook: protectedProcedure.input(z33.object({ bookId: z33.string().max(120) })).mutation(({ ctx, input }) => removeBookFromInventory(ctx.user.id, input.bookId)),
    addLog: protectedProcedure.input(z33.object({ bookId: z33.string().max(120), topic: z33.string().max(180).optional(), sessionDate: z33.string(), minutes: z33.number().int().min(0).max(1440), questions: z33.number().int().min(0).max(2e3), correct: z33.number().int().min(0).max(2e3), wrong: z33.number().int().min(0).max(2e3), blank: z33.number().int().min(0).max(2e3), pageStart: z33.number().int().min(0).optional(), pageEnd: z33.number().int().min(0).optional(), testStart: z33.number().int().min(0).optional(), testEnd: z33.number().int().min(0).optional() })).mutation(({ ctx, input }) => addBookStudyLog(ctx.user.id, { ...input, sessionDate: new Date(input.sessionDate) })),
    upsertMapping: protectedProcedure.input(z33.object({ bookId: z33.string().max(120), topic: z33.string().max(180), subject: z33.string().max(80), pageStart: z33.number().int().min(0).optional(), pageEnd: z33.number().int().min(0).optional(), testStart: z33.number().int().min(0).optional(), testEnd: z33.number().int().min(0).optional() })).mutation(({ ctx, input }) => upsertBookTopicMapping(ctx.user.id, input)),
    addSwitch: protectedProcedure.input(z33.object({ fromBookId: z33.string().max(120).optional(), toBookId: z33.string().max(120), reason: z33.string().max(300) })).mutation(({ ctx, input }) => addSourceSwitch(ctx.user.id, { ...input, switchedAt: /* @__PURE__ */ new Date() })),
    importBooks: protectedProcedure.input(z33.object({ books: z33.array(z33.object({ id: z33.string().max(120), title: z33.string().min(1).max(180), publisher: z33.string().max(120), subject: z33.string().max(80), exam: z33.enum(EXAM_KINDS), level: z33.enum(["Kolay", "Orta", "Zor"]), format: z33.string().max(120), reason: z33.string().max(1e3), sourceUrl: z33.string().max(500).optional(), pageCount: z33.number().int().min(0).optional(), tone: z33.string().max(20), authors: z33.string().max(300).optional(), isbn: z33.string().max(32).optional() })).min(1).max(500) })).mutation(({ ctx, input }) => addUserResourceBooks(ctx.user.id, input.books)),
    // Ortak kitap kaydında ad/yayınevi/ISBN ile arama: kitap kayıtlıysa kapak fotoğrafı (OCR) gerekmez.
    searchSharedBooks: protectedProcedure.input(z33.object({ q: z33.string().trim().min(2).max(120) })).query(({ input }) => searchSharedBooks(input.q)),
    // Kitabı kütüphaneye ekler ve ortak kayda bağlar; öğrenci "Bu kitap" dediyse (sharedBookId)
    // onaylanmış içindekiler de kopyalanır, içindekiler fotoğrafı okunmaz.
    addBookFromCover: protectedProcedure.input(z33.object({
      sharedBookId: z33.number().int().positive().nullable(),
      useSharedContents: z33.boolean(),
      draft: z33.object({ title: z33.string().trim().min(1).max(180), publisher: z33.string().max(120), subject: z33.string().max(80), exam: z33.enum(EXAM_KINDS), level: z33.enum(["Kolay", "Orta", "Zor"]), authors: z33.string().max(300).optional(), isbn: z33.string().max(32).optional(), edition: z33.string().max(120).optional() })
    })).mutation(({ ctx, input }) => addBookToLibrary(ctx.user.id, input)),
    // Öğrenci elindeki fiziksel kitabın kapak fotoğrafını çeker (telefon
    // kamerası); LLM görselden kitap adı/yayınevi/ders tahmini çıkarır.
    // Sadece TAHMİN döner — hiçbir şeyi otomatik kütüphaneye eklemez, öğrenci
    // formda düzeltip onaylamadan `importBooks`/`addBook` çağrılmaz (spec:
    // uydurma veri asıl kütüphaneye sessizce yazılmasın).
    extractBookFromPhoto: metredFeatureProcedure("OCR_BOOK_IMPORT").input(bookPhotoInput).mutation(async ({ input }) => {
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      try {
        const response = await invokeLLMWithTier({
          messages: [
            { role: "system", content: "Sen bir kitap kapa\u011F\u0131 tan\u0131ma asistan\u0131s\u0131n. T\xFCrk\xE7e bir s\u0131nav haz\u0131rl\u0131k (YKS ya da LGS) kaynak kitab\u0131n\u0131n kapak foto\u011Fraf\u0131n\u0131 okuyup kitap ad\u0131n\u0131, yay\u0131nevini, dersini (T\xFCrk\xE7e, Matematik, Fizik, Kimya, Biyoloji, Tarih, Co\u011Frafya, Felsefe, Din K\xFClt\xFCr\xFC, Fen Bilimleri, \u0130nk\u0131lap Tarihi, \u0130ngilizce, Vatanda\u015Fl\u0131k, G\xFCncel Bilgiler, Say\u0131sal, S\xF6zel, Genel) ve s\u0131nav kapsam\u0131n\u0131 (TYT/AYT/LGS/KPSS_GYGK/DGS/GENEL) tahmin et. Kapakta 'LGS', '8. S\u0131n\u0131f' ya da 'Liselere Ge\xE7i\u015F' yaz\u0131yorsa exam 'LGS'; 'KPSS', 'Genel Yetenek' ya da 'Genel K\xFClt\xFCr' yaz\u0131yorsa 'KPSS_GYGK'; 'DGS' ya da 'Dikey Ge\xE7i\u015F' yaz\u0131yorsa 'DGS' olsun. Kapakta yaz\u0131yorsa yazar adlar\u0131n\u0131 (authors), ISBN numaras\u0131n\u0131 (isbn, yaln\u0131zca kapakta/arkada ger\xE7ekten g\xF6r\xFCn\xFCyorsa) ve bask\u0131 bilgisini (edition, \xF6r. 'G\xFCncellenmi\u015F Yeni Bask\u0131', '2025-2026') da \xE7\u0131kar. G\xF6rselde net okuyamad\u0131\u011F\u0131n bir alan\u0131 bo\u015F string / bo\u015F dizi b\u0131rak, uydurma. fieldConfidence her alan i\xE7in 0-1 aras\u0131 okuma g\xFCvenin; alan bo\u015Fsa 0. Kitap ad\u0131 kapakta birden \xE7ok sat\u0131ra/puntoya b\xF6l\xFCnm\xFC\u015F olabilir (\xF6r. b\xFCy\xFCk 'Paragraf' + alt\u0131nda 'SORU BANKASI'): bunlar\u0131 tek ba\u015Fl\u0131kta, kelimelerin ilk harfi b\xFCy\xFCk birle\u015Ftir ('Paragraf Soru Bankas\u0131'); 'Video \xE7\xF6z\xFCml\xFC', 'Yeni nesil', '20 deneme ilaveli' gibi slogan/\xF6zellik sat\u0131rlar\u0131n\u0131 ba\u015Fl\u0131\u011Fa katma. Ders kapakta a\xE7\u0131k\xE7a yazm\u0131yorsa kitap ad\u0131ndan \xE7\u0131kar (Paragraf, Dil Bilgisi, S\xF6zc\xFCkte Anlam \u2192 T\xFCrk\xE7e; Problemler, Temel Matematik \u2192 Matematik); o durumda subject g\xFCvenini en fazla 0.7 ver. 'TYT-AYT' ya da 'YKS' yaz\u0131yorsa ve tek bir s\u0131nava ait de\u011Filse exam 'GENEL' olsun. Foto\u011Fraf yan (90\xB0) ya da ters \xE7ekilmi\u015F, kapa\u011F\u0131n bir k\u0131sm\u0131 kadraj d\u0131\u015F\u0131nda kalm\u0131\u015F olabilir: yaz\u0131y\u0131 d\xF6nd\xFCrerek oku ve g\xF6r\xFCnen ba\u015Fl\u0131\u011F\u0131 yine \xE7\u0131kar; kapa\u011F\u0131n k\u0131smen g\xF6r\xFCnmesi onu 'other' yapmaz. Yay\u0131nevi \xE7o\u011Fu zaman yaln\u0131zca logo olarak (\xF6r. k\xF6\u015Fedeki '\xDC\xE7D\xF6rtBe\u015F') g\xF6r\xFCn\xFCr; logodaki ad\u0131 yay\u0131nevi olarak yaz. B\xFCy\xFCk dekoratif yaz\u0131lar ve rakamlar da ba\u015Fl\u0131\u011F\u0131n par\xE7as\u0131d\u0131r ('0'DAN BA\u015ELA' + 'START' + 'Matematik' \u2192 '0'dan Ba\u015Fla Start Matematik'); yazar/hoca ad\u0131 ('\u015Eenol Hoca') authors alan\u0131na gider. imageKind: g\xF6rsel bir kitap KAPA\u011EIYSA 'cover'; kitab\u0131n i\xE7indekiler / konu listesi / kitap bitirme plan\u0131 sayfas\u0131ysa 'table_of_contents'; ba\u015Fka bir \u015Feyse 'other'. `confident` alan\u0131n\u0131 yaln\u0131zca kapaktaki yaz\u0131lar\u0131 ger\xE7ekten net okuyabildiysen true yap." },
            { role: "user", content: [{ type: "text", text: "Bu kitap kapa\u011F\u0131n\u0131 oku." }, { type: "image_url", image_url: { url: input.dataUrl, detail: "high" } }] }
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_book_cover", strict: true, schema: bookPhotoSchema } }
        }, "strong", invokeLLM);
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Foto\u011Fraftan yap\u0131land\u0131r\u0131lm\u0131\u015F veri al\u0131namad\u0131");
        const parsed = JSON.parse(jsonText);
        const isbn = normalizeIsbn(parsed.isbn);
        const result = {
          title: String(parsed.title ?? "").slice(0, 180),
          publisher: String(parsed.publisher ?? "").slice(0, 120),
          subject: String(parsed.subject ?? "").slice(0, 80),
          exam: parsed.exam,
          authors: (Array.isArray(parsed.authors) ? parsed.authors : []).map((author) => String(author).trim()).filter(Boolean).slice(0, 8),
          isbn: isbn ?? "",
          edition: String(parsed.edition ?? "").slice(0, 120),
          confident: Boolean(parsed.confident) && parsed.imageKind === "cover",
          imageKind: parsed.imageKind === "table_of_contents" || parsed.imageKind === "other" ? parsed.imageKind : "cover",
          fieldConfidence: { title: clamp013(parsed.fieldConfidence?.title), publisher: clamp013(parsed.fieldConfidence?.publisher), subject: clamp013(parsed.fieldConfidence?.subject), exam: clamp013(parsed.fieldConfidence?.exam), isbn: isbn ? clamp013(parsed.fieldConfidence?.isbn) : 0 }
        };
        const matches = result.imageKind === "cover" && result.title ? await findSharedBookMatches({ title: result.title, publisher: result.publisher, isbn: result.isbn, authors: result.authors.join(", ") }).catch(() => []) : [];
        return { ...result, matches };
      } catch (error) {
        console.warn("[Book Photo] Extraction failed:", error);
        throw new Error(llmUnavailableMessage(error) ?? "Foto\u011Fraf okunamad\u0131. Daha net, \u0131\u015F\u0131kl\u0131 bir kapak foto\u011Fraf\u0131 dener misin?");
      }
    })
  }),
  exams: router({
    snapshot: protectedProcedure.query(({ ctx }) => getUserMockExams(ctx.user.id)),
    importMany: protectedProcedure.input(z33.object({ exams: z33.array(userExamInput).min(1).max(200) })).mutation(({ ctx, input }) => addUserMockExams(ctx.user.id, input.exams.map((exam) => ({ ...exam, examDate: new Date(exam.date) }))))
  }),
  calendar: router({
    snapshot: protectedProcedure.query(({ ctx }) => getStudyCalendar(ctx.user.id)),
    savePlan: protectedProcedure.input(z33.object({ title: z33.string().max(180), weekStart: z33.string(), weekEnd: z33.string(), summary: z33.string().max(2e3), source: z33.enum(["ai", "manual"]).optional(), replacePrevious: z33.boolean().optional(), sessions: z33.array(z33.object({ sessionDate: z33.string(), title: z33.string().max(180), subject: z33.string().max(80), topic: z33.string().max(180), kind: z33.string().max(40), plannedMinutes: z33.number().int().min(0).max(1440), targetQuestions: z33.number().int().min(0).optional(), targetPages: z33.string().max(80).nullable().optional(), targetTests: z33.string().max(80).nullable().optional() })).max(100) })).mutation(({ ctx, input }) => saveStudyPlan(ctx.user.id, { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), sessions: input.sessions.map((session) => ({ ...session, sessionDate: new Date(session.sessionDate) })) })),
    completeSession: protectedProcedure.input(z33.object({ sessionId: z33.number().int(), actualMinutes: z33.number().int().min(0).max(1440), actualQuestions: z33.number().int().min(0).max(5e3), correct: z33.number().int().min(0).max(5e3), wrong: z33.number().int().min(0).max(5e3), blank: z33.number().int().min(0).max(5e3), actualPages: z33.number().int().min(0).max(5e3).optional(), note: z33.string().max(1e3).optional() })).mutation(({ ctx, input }) => completeStudySession(ctx.user.id, input)),
    coachSnapshot: protectedProcedure.input(z33.object({ periodStart: z33.string(), periodEnd: z33.string() })).query(async ({ ctx, input }) => {
      const { sessions, averageAccuracy } = await getPlanAdherenceInputs(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd));
      return { ...calculatePlanAdherence(sessions, averageAccuracy), averageAccuracy, alerts: await getCoachAlerts(ctx.user.id) };
    }),
    refreshCoach: protectedProcedure.input(z33.object({ periodStart: z33.string(), periodEnd: z33.string() })).mutation(({ ctx, input }) => savePlanAdherence(ctx.user.id, new Date(input.periodStart), new Date(input.periodEnd))),
    // Üst çubuktaki bildirim zili: okunmamış koç uyarıları (yalnızca okuma; uyarıları refreshCoach üretir).
    alerts: protectedProcedure.query(({ ctx }) => getCoachAlerts(ctx.user.id)),
    readCoachAlert: protectedProcedure.input(z33.object({ alertId: z33.number().int() })).mutation(({ ctx, input }) => markCoachAlertRead(ctx.user.id, input.alertId)),
    addFocusLog: protectedProcedure.input(z33.object({ subject: z33.string().max(80), topic: z33.string().max(180), studyDate: z33.string(), minutes: z33.number().int().min(1).max(1440), questions: z33.number().int().min(0).max(5e3), correct: z33.number().int().min(0).max(5e3), wrong: z33.number().int().min(0).max(5e3), blank: z33.number().int().min(0).max(5e3), note: z33.string().max(1e3).optional() })).mutation(({ ctx, input }) => addTopicStudyLog(ctx.user.id, { ...input, studyDate: new Date(input.studyDate), note: input.note ?? null, sessionId: null })),
    // Paragraf pratiği / gece okuması gibi "şimdi yaptım" alışkanlık kayıtları.
    logRoutine: protectedProcedure.input(z33.object({ title: z33.string().max(180), subject: z33.string().max(80), topic: z33.string().max(180), kind: z33.string().max(40), plannedMinutes: z33.number().int().min(0).max(1440), actualMinutes: z33.number().int().min(0).max(1440), actualPages: z33.number().int().min(0).max(5e3).optional(), note: z33.string().max(1e3).optional(), readingBookId: z33.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const { readingBookId, ...routine } = input;
      const calendar = await logCompletedRoutineSession(ctx.user.id, routine);
      const readingBook = readingBookId && input.actualPages ? await recordReadingPages(ctx.user.id, readingBookId, input.actualPages) : null;
      return { calendar, readingBook };
    })
  }),
  aiPlan: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu uç nokta önceden `publicProcedure`
    // idi — girişsiz, sınırsız olarak herkes tarafından çağrılabilen, gerçek
    // bir LLM çağrısı yapan (maliyetli) bir işlemdi. Artık giriş + onay
    // zorunlu (`protectedProcedure` içeren `metredFeatureProcedure`) VE
    // free/premium'a göre kullanım kotalı (bkz. shared/entitlements.ts).
    generate: metredFeatureProcedure("AI_STUDY_PLAN").input(planInput2).mutation(async ({ ctx, input }) => {
      const weakTopics = input.topics.filter((topic) => topic.status === "Zay\u0131f");
      const recentExams = input.exams.slice(0, 3);
      const profile = input.studentProfile;
      const serverProfile = ctx.user ? await getStudentProfile(ctx.user.id) : null;
      const track = serverProfile?.examTrack ?? "YKS";
      const trackInfo = EXAM_TRACK_DEFS[track];
      const customGoal = trackInfo.goal.kind === "custom" ? trackInfo.goal : null;
      const customTargetContext = customGoal && serverProfile && (serverProfile.targetGoal || serverProfile.targetScore || serverProfile.examYear) ? `

\xD6\u011Frencinin hedefi (onboarding'den \u2014 kesin bir puan/okul garantisi verme, yaln\u0131zca bu hedefe uygun tempo ve odak \xF6ner): ${trackInfo.label} ${serverProfile.examYear ?? "y\u0131l\u0131 belirtilmemi\u015F"}, ${customGoal.label.toLocaleLowerCase("tr")} ${serverProfile.targetGoal || "belirtilmemi\u015F"}${trackInfo.targetScore ? `, hedef puan ${serverProfile.targetScore || "belirtilmemi\u015F"} / ${trackInfo.targetScore.max}` : ""}.` : "";
      const targetContext = customGoal ? customTargetContext : profile && (profile.targetScoreType || profile.targetUniversity || profile.targetDepartment || profile.targetRanking || profile.examYear) ? `

\xD6\u011Frencinin hedefi (onboarding'den \u2014 plan\u0131n \xF6nceliklerini buna g\xF6re kur, ama kesin bir s\u0131ralama/puan garantisi verme, sadece bu hedefe uygun bir tempo ve odak \xF6ner): hedef s\u0131nav y\u0131l\u0131 ${profile.examYear ?? "belirtilmemi\u015F"}, hedef puan t\xFCr\xFC ${profile.targetScoreType ?? "belirtilmemi\u015F"}, hedef \xFCniversite ${profile.targetUniversity || "belirtilmemi\u015F"}, hedef b\xF6l\xFCm ${profile.targetDepartment || "belirtilmemi\u015F"}, tahmini hedef s\u0131ralama ${profile.targetRanking || "belirtilmemi\u015F"}.` : "";
      const chosenSubjectsContext = trackInfo.chooseSubjects && serverProfile?.selectedSubjects.length ? `

Aday\u0131n girece\u011Fi alan testleri (plan\u0131 YALNIZCA bunlara kur): ${serverProfile.selectedSubjects.join(", ")}.` : "";
      const coachingContext = profile && (profile.dailyStudyDuration || profile.preferredStudyMethods?.length || profile.studyObstacles || profile.coachingStyle || profile.mainGoal) ? `

\xD6\u011Frencinin ko\xE7luk tercihleri (varsa bunlara uy \u2014 \xF6rn. tercih etti\u011Fi \xE7al\u0131\u015Fma y\xF6ntemine a\u011F\u0131rl\u0131k ver, ileti\u015Fim tarz\u0131na uygun bir dille yaz): ${JSON.stringify({ dailyStudyDuration: profile.dailyStudyDuration, preferredStudyMethods: profile.preferredStudyMethods, studyObstacles: profile.studyObstacles, coachingStyle: profile.coachingStyle, mainGoal: profile.mainGoal })}` : "";
      const notebookSignal = ctx.user ? await getNotebookPlanSignal(ctx.user.id).catch(() => null) : null;
      const notebookContext = notebookSignal ? `

\xD6\u011Frencinin Soru Defteri (kendi kaydetti\u011Fi, hen\xFCz \xF6\u011Frenemedi\u011Fi sorular \u2014 bu konulara k\u0131sa "Tekrar" oturumlar\u0131 ekle, \xF6\u011Frenciyi etiketleme):
${notebookSignal}` : "";
      const planStart = input.startDate ? /* @__PURE__ */ new Date(`${input.startDate}T12:00:00Z`) : /* @__PURE__ */ new Date();
      const planDays = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(planStart.getTime() + offset * 864e5);
        return `${DAY_LABELS[weekdayOf(date) - 1]} ${date.toISOString().slice(0, 10)}`;
      });
      const scheduleSignal = ctx.user ? await getPlanScheduleContext(ctx.user.id, planStart).catch(() => null) : null;
      const scheduleContext = scheduleSignal ? `

\xD6\u011Frencinin okul/dershane program\u0131na g\xF6re bu haftan\u0131n bo\u015F zaman\u0131 (oturumlar\u0131 yaln\u0131zca bu aral\u0131klara ve her g\xFCn\xFCn bo\u015F dakikas\u0131n\u0131 a\u015Fmayacak \u015Fekilde planla; 23:30'dan sonra oturum koyma; o g\xFCn okulda i\u015Flenen ${track} derslerine ak\u015Fam k\u0131sa bir peki\u015Ftirme oturumu eklemek iyi olur):
${scheduleSignal}` : "";
      const prompt = `${trackInfo.studentNoun} i\xE7in 7 g\xFCnl\xFCk uygulanabilir \xE7al\u0131\u015Fma program\u0131 olu\u015Ftur. Plan bug\xFCnden ba\u015Flar; days dizisi s\u0131ras\u0131yla \u015Fu 7 g\xFCn olsun ve her g\xFCn\xFCn day alan\u0131na g\xFCn ad\u0131n\u0131, date alan\u0131na YYYY-MM-DD tarihini yaz: ${planDays.join(", ")}. Hedef: ${input.goal}. Haftal\u0131k toplam s\xFCre: ${input.availableMinutes} dakika. \xD6ncelik, zay\u0131f konular ve son deneme performans\u0131 olsun. Zay\u0131f konular\u0131 tamamen yok sayma; orta konulara peki\u015Ftirme, iyi konulara koruma oturumu ekle. ${trackInfo.dailyPlanRule} T\xFCrk\xE7e yan\u0131t \xFCret. Ki\u015Fisel raftaki kitaplar\u0131 m\xFCmk\xFCn oldu\u011Funca ilgili zay\u0131f konu oturumlar\u0131na ba\u011Fla. Bir kitab\u0131n mappings alan\u0131nda ilgili konu varsa targetPages alan\u0131na ger\xE7ek sayfa aral\u0131\u011F\u0131n\u0131 ve targetTests alan\u0131na ger\xE7ek test aral\u0131\u011F\u0131n\u0131 yaz; e\u015Fle\u015Ftirme yoksa uydurma aral\u0131k verme, bo\u015F metin ("") b\u0131rak. Soru oturumlar\u0131nda ger\xE7ek\xE7i g\xFCnl\xFCk soru hedefi yaz.

Zay\u0131f/orta/iyi konu verisi:
${JSON.stringify(input.topics)}

\xD6ncelikli zay\u0131f konular:
${JSON.stringify(weakTopics)}

Son denemeler:
${JSON.stringify(recentExams)}

Ki\u015Fisel raf ve \xE7\xF6z\xFCm durumu:
${JSON.stringify(input.books)}${targetContext}${chosenSubjectsContext}${coachingContext}${notebookContext}${scheduleContext}`;
      try {
        const response = await invokeLLM({
          reasoningEffort: "low",
          messages: [
            { role: "system", content: `Sen deneyimli, \xF6l\xE7\xFCl\xFC ve motive edici bir ${track} \xE7al\u0131\u015Fma ko\xE7usun. ${examPromptContext(track)} Sadece verilen verilere dayan; ger\xE7ek\xE7i olmayan hedefler verme. Yan\u0131t\u0131n JSON \u015Femas\u0131na tam uysun.` },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "yks_weekly_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  focus: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, subject: { type: "string" }, reason: { type: "string" } }, required: ["topic", "subject", "reason"], additionalProperties: false } },
                  days: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", properties: { day: { type: "string" }, date: { type: "string" }, totalMinutes: { type: "integer" }, sessions: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "integer" }, kind: { type: "string", enum: ["\xD6\u011Frenme", "Soru", "Tekrar", "Deneme analizi"] }, rationale: { type: "string" }, bookId: { type: "string" }, bookTitle: { type: "string" }, targetQuestions: { type: "integer" }, targetPages: { type: "string" }, targetTests: { type: "string" } }, required: ["title", "subject", "topic", "minutes", "kind", "rationale"], additionalProperties: false } } }, required: ["day", "date", "totalMinutes", "sessions"], additionalProperties: false } },
                  coachNote: { type: "string" }
                },
                required: ["summary", "focus", "days", "coachNote"],
                additionalProperties: false
              }
            }
          }
        });
        const content = response.choices[0]?.message?.content;
        const jsonText = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("");
        const parsed = jsonText ? JSON.parse(jsonText) : null;
        const normalized = normalizeAiPlan(parsed, fallbackPlan);
        if (normalized === fallbackPlan) {
          console.warn("[AI Plan] Unusable AI response; keys:", parsed && typeof parsed === "object" ? Object.keys(parsed).join(",") : typeof parsed);
          throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR", message: "AI plan\u0131 okunamad\u0131. Tekrar dener misin? Bu deneme hakk\u0131ndan d\xFC\u015Fmedi." });
        }
        return normalized;
      } catch (error) {
        if (error instanceof TRPCError20) throw error;
        console.warn("[AI Plan] LLM failed:", error);
        const quota = error instanceof LlmUnavailableError && error.reason === "quota";
        throw new TRPCError20({
          code: quota ? "TOO_MANY_REQUESTS" : "INTERNAL_SERVER_ERROR",
          message: quota ? "Yapay zek\xE2 servisinin kotas\u0131 \u015Fu an dolu; AI plan\u0131n\u0131 birka\xE7 saat sonra tekrar dener misin? Bu deneme hakk\u0131ndan d\xFC\u015Fmedi." : "AI plan\u0131 \u015Fu an haz\u0131rlanamad\u0131; biraz sonra tekrar dener misin? Bu deneme hakk\u0131ndan d\xFC\u015Fmedi."
        });
      }
    })
  }),
  examDocument: router({
    // GÜVENLİK DÜZELTMESİ (audit §F.1): bu, projenin en pahalı uç noktasıydı
    // (LLM vision çağrısı) ve girişsizdi. Artık giriş + onay zorunlu ve
    // free/premium kullanım kotasına tabi; ayrıca gönderilen dosya artık
    // gerçekten sunucu tarafında doğrulanıyor (magic bytes + gerçek boyut —
    // önceden yalnızca client'taki 8MB kontrolüne güveniliyordu).
    extract: metredFeatureProcedure("OCR_EXAM_IMPORT").input(documentExtractionInput).mutation(async ({ ctx, input }) => {
      const track = ctx.user ? (await getStudentProfile(ctx.user.id)).examTrack : "YKS";
      const examHint = kindsOf(track).map((kind) => `${kind} denemesiyse exam = '${kind}', ders netleri \u015Fu adlarla: ${subjectNamesOf(kind).join(", ")}; neti do\u011Fru - yanl\u0131\u015F/${EXAM_KIND_DEFS[kind].wrongsPerCorrect} olarak hesapla.`).join(" ");
      const fileCheck = validateDataUrl(input.dataUrl, input.mimeType);
      if (!fileCheck.valid) throw new Error(fileCheck.reason);
      const isImage = input.mimeType.startsWith("image/");
      const content = isImage ? [{ type: "text", text: "Bu g\xF6rseldeki dershane deneme sonu\xE7 belgesini oku." }, { type: "image_url", image_url: { url: input.dataUrl, detail: "high" } }] : [{ type: "text", text: "Bu PDF i\xE7indeki deneme sonu\xE7 belgesini oku." }, { type: "file_url", file_url: { url: input.dataUrl, mime_type: "application/pdf" } }];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `Sen ${track} deneme sonu\xE7 belgesi okuyucususun. T\xFCrk\xE7e yan\u0131t ver ve yaln\u0131zca belgede g\xF6r\xFClen verileri \xE7\u0131kar. Belge \xF6rnekteki gibi konu ad\u0131, soru say\u0131s\u0131, do\u011Fru, yanl\u0131\u015F ve y\xFCzde s\xFCtunlar\u0131 i\xE7erir. Her konu sat\u0131r\u0131n\u0131 ayr\u0131 kaydet. ${examHint} Bilinmeyen tarih i\xE7in bo\u015F string, bilinmeyen s\xFCre i\xE7in 0 kullan. Ders toplam netlerini subjects i\xE7inde, belge a\xE7\u0131k\xE7a s\xFCre vermiyorsa timeSpent i\xE7inde 0 d\xF6nd\xFCr. JSON \u015Femas\u0131na tam uy.` },
            { role: "user", content }
          ],
          response_format: { type: "json_schema", json_schema: { name: "yks_exam_document", strict: true, schema: documentExtractionSchema } }
        });
        const raw = response.choices[0]?.message?.content;
        const jsonText = typeof raw === "string" ? raw : raw?.map((part) => part.type === "text" ? part.text : "").join("");
        if (!jsonText) throw new Error("Belgeden yap\u0131land\u0131r\u0131lm\u0131\u015F veri al\u0131namad\u0131");
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn("[Exam Document] Extraction failed:", error);
        throw new Error("Belge okunamad\u0131. L\xFCtfen daha net bir PDF veya g\xF6rsel y\xFCkleyin.");
      }
    })
  }),
  topics: topicsRouter,
  bookContent: bookContentRouter,
  notes: notesRouter,
  wall: wallRouter,
  studyTasks: studyTasksRouter,
  questions: questionsRouter,
  classSchedule: classScheduleRouter,
  push: pushRouter,
  reading: readingRouter,
  org: orgRouter,
  parent: parentRouter,
  catalog: resourceCatalogRouter,
  onboarding: onboardingRouter,
  subscription: subscriptionRouter,
  payment: paymentRouter,
  admin: adminRouter,
  testimonials: testimonialsRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/resourceCatalog/difficulty/aiClassifier.ts
var SCHEMA2 = {
  type: "object",
  properties: {
    difficulty_label: { type: "string", enum: ["easy", "medium", "hard"] },
    difficulty_score: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" }
  },
  required: ["difficulty_label", "difficulty_score", "confidence", "reason"],
  additionalProperties: false
};
var isDifficultyLabel = (value) => value === "easy" || value === "medium" || value === "hard";
var unavailableResult = (reason) => ({
  label: "medium",
  score: 50,
  confidence: 0,
  rationale: reason,
  model: "ai:unavailable",
  classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
});
var LlmDifficultyClassifier = class {
  method = "ai";
  async classify(input) {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Sen bir YKS kaynak kitab\u0131n\u0131n zorluk seviyesini de\u011Ferlendiren bir s\u0131n\u0131fland\u0131r\u0131c\u0131s\u0131n. Yaln\u0131zca sana verilen ba\u015Fl\u0131k, yay\u0131nc\u0131, ders, s\u0131nav ve t\xFCr bilgisine dayan; kitab\u0131n i\xE7eri\u011Fi hakk\u0131nda bilmedi\u011Fin hi\xE7bir \u015Feyi uydurma. Emin de\u011Filsen confidence de\u011Ferini d\xFC\u015F\xFCk tut. JSON \u015Femas\u0131na tam uy."
          },
          {
            role: "user",
            content: `Kitap: ${input.title}
Yay\u0131nc\u0131: ${input.publisher ?? "bilinmiyor"}
Ders: ${input.subject ?? "bilinmiyor"}
S\u0131nav: ${input.exam ?? "bilinmiyor"}
T\xFCr: ${input.bookType ?? "bilinmiyor"}
Kategori: ${input.category ?? "bilinmiyor"}
A\xE7\u0131klama: ${input.description ?? "yok"}`
          }
        ],
        response_format: { type: "json_schema", json_schema: { name: "book_difficulty", strict: true, schema: SCHEMA2 } }
      });
      const content = response.choices[0]?.message?.content;
      const jsonText = typeof content === "string" ? content : content?.map((part) => part.type === "text" ? part.text : "").join("");
      if (!jsonText) return unavailableResult("AI bo\u015F yan\u0131t d\xF6nd\xFCrd\xFC");
      const parsed = JSON.parse(jsonText);
      if (!isDifficultyLabel(parsed.difficulty_label) || typeof parsed.difficulty_score !== "number" || typeof parsed.confidence !== "number") {
        return unavailableResult("AI yan\u0131t\u0131 beklenen \u015Femaya uymad\u0131");
      }
      return {
        label: parsed.difficulty_label,
        score: Math.max(0, Math.min(100, Math.round(parsed.difficulty_score))),
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        rationale: typeof parsed.reason === "string" ? parsed.reason : "",
        model: `ai:${response.model || "unknown"}`,
        classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.warn("[ResourceCatalog] AI difficulty classification unavailable:", error);
      return unavailableResult("AI s\u0131n\u0131fland\u0131rma kullan\u0131lamad\u0131 (sa\u011Flay\u0131c\u0131 hatas\u0131 ya da API anahtar\u0131 yok)");
    }
  }
};

// server/resourceCatalog/difficulty/hybridClassifier.ts
function scoreFromMetadata(hint) {
  if (hint.legacyLevel) {
    const score = { Kolay: 22, Orta: 50, Zor: 80 }[hint.legacyLevel];
    return { score, confidence: 0.6, rationale: `kaynak meta verisinde seviye etiketi: ${hint.legacyLevel}` };
  }
  if (typeof hint.pageCount === "number") {
    if (hint.pageCount >= 450) return { score: 60, confidence: 0.25, rationale: `y\xFCksek sayfa say\u0131s\u0131 (${hint.pageCount})` };
    if (hint.pageCount > 0 && hint.pageCount <= 260) return { score: 42, confidence: 0.2, rationale: `d\xFC\u015F\xFCk sayfa say\u0131s\u0131 (${hint.pageCount})` };
  }
  return null;
}
var HybridDifficultyClassifier = class {
  constructor(rule, ai, config = resourceCatalogConfig) {
    this.rule = rule;
    this.ai = ai;
    this.config = config;
  }
  async classify(input, options) {
    const ruleResult = await this.rule.classify(input);
    const aiResult = options.useAi ? await this.ai.classify(input) : null;
    const metaSignal = scoreFromMetadata(options.metadata ?? {});
    const weights = this.config.difficulty.weights;
    const layers = [
      { score: ruleResult.score, confidence: ruleResult.confidence, weight: weights.rule }
    ];
    if (aiResult && aiResult.confidence > 0) layers.push({ score: aiResult.score, confidence: aiResult.confidence, weight: weights.ai });
    if (metaSignal) layers.push({ score: metaSignal.score, confidence: metaSignal.confidence, weight: weights.metadata });
    const effectiveWeightOf = (l) => l.weight * l.confidence;
    const totalEffectiveWeight = layers.reduce((sum, l) => sum + effectiveWeightOf(l), 0);
    const finalScore = totalEffectiveWeight > 0 ? Math.round(layers.reduce((sum, l) => sum + l.score * effectiveWeightOf(l), 0) / totalEffectiveWeight) : ruleResult.score;
    const totalConfiguredWeight = layers.reduce((sum, l) => sum + l.weight, 0);
    const aggregateConfidence = totalConfiguredWeight > 0 ? layers.reduce((sum, l) => sum + l.confidence * l.weight, 0) / totalConfiguredWeight : ruleResult.confidence;
    const { easyMax, mediumMax } = this.config.difficulty.thresholds;
    const label = finalScore <= easyMax ? "easy" : finalScore <= mediumMax ? "medium" : "hard";
    const rationale = [
      `kural: ${ruleResult.rationale} (skor ${ruleResult.score}, g\xFCven ${ruleResult.confidence.toFixed(2)})`,
      aiResult ? `AI: ${aiResult.rationale || "-"} (skor ${aiResult.score}, g\xFCven ${aiResult.confidence.toFixed(2)})` : "AI: kullan\u0131lmad\u0131",
      metaSignal ? `metadata: ${metaSignal.rationale} (skor ${metaSignal.score}, g\xFCven ${metaSignal.confidence.toFixed(2)})` : "metadata: sinyal yok"
    ].join(" | ");
    return {
      label,
      score: Math.max(0, Math.min(100, finalScore)),
      confidence: Number(Math.max(0, Math.min(1, aggregateConfidence)).toFixed(3)),
      rationale,
      model: "hybrid-v1",
      classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/resourceCatalog/difficulty/ruleBasedClassifier.ts
init_turkishText();
var EASY_PHRASES = ["s\u0131f\u0131r", "s\u0131f\u0131rdan", "temel", "ba\u015Flang\u0131\xE7", "ilk ad\u0131m", "kolay", "temelden", "0dan", "0 dan", "ba\u015Flang\u0131\xE7 seviyesi"];
var HARD_PHRASES = ["ileri", "zor", "extreme", "advanced", "master", "pro", "ileri d\xFCzey", "\xFCst d\xFCzey", "se\xE7ici"];
var normalizedPhrases = (phrases) => phrases.map((phrase) => normalizeKeepingTurkish(phrase));
var EASY = normalizedPhrases(EASY_PHRASES);
var HARD = normalizedPhrases(HARD_PHRASES);
var countPhraseMatches = (text4, phrases) => {
  const padded = ` ${normalizeKeepingTurkish(text4)} `;
  return phrases.filter((phrase) => padded.includes(` ${phrase} `));
};
var BOOK_TYPE_MODIFIER = {
  topic_explanation: -6,
  topic_explanation_question_bank: -2,
  question_bank: 0,
  fasikul: -3,
  test_book: -2,
  mock_exam: 2,
  past_questions: 6,
  camp: 3,
  reference: 0,
  other: 0
};
var EASY_SHIFT_PER_MATCH = 16;
var HARD_SHIFT_PER_MATCH = 16;
var MAX_KEYWORD_SHIFT = 34;
var RuleBasedDifficultyClassifier = class {
  method = "rule";
  async classify(input) {
    const haystack = [input.title, input.description ?? "", input.category ?? ""].join(" ");
    const easyMatches = countPhraseMatches(haystack, EASY);
    const hardMatches = countPhraseMatches(haystack, HARD);
    const easyShift = Math.min(easyMatches.length * EASY_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const hardShift = Math.min(hardMatches.length * HARD_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const bookTypeShift = input.bookType ? BOOK_TYPE_MODIFIER[input.bookType] : 0;
    const rawScore = 50 - easyShift + hardShift + bookTypeShift;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const { easyMax, mediumMax } = resourceCatalogConfig.difficulty.thresholds;
    const label = score <= easyMax ? "easy" : score <= mediumMax ? "medium" : "hard";
    const signalCount = easyMatches.length + hardMatches.length + (bookTypeShift !== 0 ? 1 : 0);
    const confidence = signalCount === 0 ? 0.3 : Math.min(0.3 + signalCount * 0.18, 0.85);
    const rationaleParts = [];
    if (easyMatches.length) rationaleParts.push(`kolay sinyaller: ${easyMatches.join(", ")}`);
    if (hardMatches.length) rationaleParts.push(`zor sinyaller: ${hardMatches.join(", ")}`);
    if (bookTypeShift !== 0) rationaleParts.push(`t\xFCr etkisi: ${input.bookType} (${bookTypeShift > 0 ? "+" : ""}${bookTypeShift})`);
    if (rationaleParts.length === 0) rationaleParts.push("belirgin anahtar kelime yok, n\xF6tr puan");
    return {
      label,
      score,
      confidence,
      rationale: rationaleParts.join("; "),
      model: "rule-based-v1",
      classifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/resourceCatalog/curriculumMapper.ts
init_turkishText();
var STOPWORDS2 = /* @__PURE__ */ new Set(["ve", "ile", "soru", "bankasi", "konu", "anlatimi", "anlatimli", "deneme", "kitap", "kitabi", "tyt", "ayt", "fasikul"]);
var examScopeAllows = (examScope, topicExam) => catalogScopeCovers(examScope, topicExam);
function mapBookToCurriculumTopics(book, topics, options = {}) {
  if (!book.subject) return [];
  const maxMatches = options.maxMatches ?? 3;
  const bookSubjectKey = normalizeForComparison(book.subject);
  const bookNameTokens = new Set(tokenize(book.name).filter((token) => !STOPWORDS2.has(token)));
  const candidates = topics.filter((topic) => normalizeForComparison(topic.subject) === bookSubjectKey && examScopeAllows(book.examScope, topic.exam)).map((topic) => {
    const topicTokens = tokenize(topic.topic).filter((token) => !STOPWORDS2.has(token));
    const shared = topicTokens.filter((token) => bookNameTokens.has(token));
    const overlapRatio = topicTokens.length > 0 ? shared.length / topicTokens.length : 0;
    return { topic, shared, overlapRatio };
  }).filter((candidate) => candidate.shared.length > 0).map((candidate) => ({
    topicId: candidate.topic.id,
    confidence: Math.min(0.9, 0.35 + candidate.overlapRatio * 0.55),
    reason: `Ders e\u015Fle\u015Fti (${book.subject}) + ortak kelimeler: ${candidate.shared.join(", ")}`
  })).sort((a, b) => b.confidence - a.confidence).slice(0, maxMatches);
  return candidates;
}

// server/resourceCatalog/duplicateDetector.ts
init_turkishText();
var normalizeIsbn2 = (isbn) => isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  const currentRow = new Array(b.length + 1);
  for (let i = 0; i < a.length; i++) {
    currentRow[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow[j + 1] = Math.min(
        currentRow[j] + 1,
        previousRow[j + 1] + 1,
        previousRow[j] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) previousRow[j] = currentRow[j];
  }
  return previousRow[b.length];
}
var similarity = (a, b) => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
};
var FUZZY_SIMILARITY_THRESHOLD = 0.88;
function detectDuplicate(candidate, existingBooks) {
  if (candidate.isbn) {
    const candidateIsbn = normalizeIsbn2(candidate.isbn);
    const isbnMatch = existingBooks.find((book) => book.isbn && normalizeIsbn2(book.isbn) === candidateIsbn);
    if (isbnMatch) {
      return { bookId: isbnMatch.id, tier: "isbn", confidence: 1, reason: `ISBN e\u015Fle\u015Fmesi (${candidateIsbn})` };
    }
  }
  const candidateNormalizedName = normalizeForComparison(candidate.name);
  const identityMatch = existingBooks.find((book) => {
    if (book.publisherId !== candidate.publisherId) return false;
    if (normalizeForComparison(book.name) !== candidateNormalizedName) return false;
    const bothEditionsKnown = book.editionYear !== null && candidate.editionYear !== null;
    if (bothEditionsKnown && book.editionYear !== candidate.editionYear) return false;
    return true;
  });
  if (identityMatch) {
    return {
      bookId: identityMatch.id,
      tier: "normalized_identity",
      confidence: 0.95,
      reason: "Ayn\u0131 yay\u0131nc\u0131 + normalize edilmi\u015F ad + bask\u0131 y\u0131l\u0131 uyumu"
    };
  }
  const publisherNameMatch = existingBooks.find(
    (book) => book.publisherId === candidate.publisherId && normalizeForComparison(book.name) === candidateNormalizedName
  );
  if (publisherNameMatch) {
    const editionsDiffer = publisherNameMatch.editionYear !== null && candidate.editionYear !== null && publisherNameMatch.editionYear !== candidate.editionYear;
    return {
      bookId: publisherNameMatch.id,
      tier: "publisher_name",
      confidence: editionsDiffer ? 0.55 : 0.85,
      reason: editionsDiffer ? `Ayn\u0131 yay\u0131nc\u0131 + ad, farkl\u0131 bask\u0131 y\u0131l\u0131 (${publisherNameMatch.editionYear} vs ${candidate.editionYear}) \u2014 muhtemelen yeni bask\u0131` : "Ayn\u0131 yay\u0131nc\u0131 + normalize edilmi\u015F ad"
    };
  }
  if (candidate.publisherId !== null) {
    let best = null;
    for (const book of existingBooks) {
      if (book.publisherId !== candidate.publisherId) continue;
      const score = similarity(candidateNormalizedName, normalizeForComparison(book.name));
      if (score >= FUZZY_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { book, score };
      }
    }
    if (best) {
      return {
        bookId: best.book.id,
        tier: "fuzzy",
        confidence: Number(best.score.toFixed(3)),
        reason: `Ayn\u0131 yay\u0131nc\u0131, bulan\u0131k ad benzerli\u011Fi %${Math.round(best.score * 100)}`
      };
    }
  }
  return null;
}

// server/resourceCatalog/pipeline/validate.ts
function validateRawProduct(product) {
  const issues = [];
  if (!product.rawName || product.rawName.trim().length < 2) {
    issues.push({ field: "rawName", message: "\xDCr\xFCn ad\u0131 eksik veya \xE7ok k\u0131sa" });
  }
  if (product.rawName && product.rawName.length > 300) {
    issues.push({ field: "rawName", message: "\xDCr\xFCn ad\u0131 300 karakteri a\u015F\u0131yor" });
  }
  if (!product.sourceProductId || product.sourceProductId.trim().length === 0) {
    issues.push({ field: "sourceProductId", message: "Kaynak \xFCr\xFCn kimli\u011Fi eksik" });
  }
  if (product.rawPrice !== void 0 && (Number.isNaN(product.rawPrice) || product.rawPrice < 0)) {
    issues.push({ field: "rawPrice", message: "Ge\xE7ersiz fiyat" });
  }
  return issues;
}

// server/resourceCatalog/pipeline/orchestrator.ts
var emptyStats = (source, dryRun, startedAt) => ({
  source,
  dryRun,
  fetched: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  needsReview: 0,
  difficulty: { easy: 0, medium: 0, hard: 0, needsReview: 0 },
  curriculumMapped: 0,
  curriculumUnmapped: 0,
  missing: { isbn: 0, publisher: 0, subject: 0, examScope: 0, bookType: 0, image: 0, price: 0 },
  errors: [],
  startedAt: startedAt.toISOString(),
  finishedAt: startedAt.toISOString()
});
var AUTO_MERGE_CONFIDENCE_THRESHOLD = 0.75;
var ResourceCatalogImportPipeline = class {
  constructor(source, db, difficultyClassifier) {
    this.source = source;
    this.db = db;
    this.difficultyClassifier = difficultyClassifier;
  }
  async run(options = {}) {
    const startedAt = /* @__PURE__ */ new Date();
    const dryRun = !!options.dryRun;
    const log = dryRun ? null : await this.db.createSyncLog({ source: this.source.name, startedAt, dryRun, triggeredBy: options.triggeredBy ?? null });
    const stats = emptyStats(this.source.name, dryRun, startedAt);
    const limit = options.limit ?? Number.POSITIVE_INFINITY;
    const curriculumTopics = await this.db.listCurriculumTopics();
    let page2 = 0;
    let hasMore = true;
    while (hasMore && stats.fetched < limit) {
      const { products, hasMore: more } = await this.source.fetchPage(page2);
      hasMore = more;
      page2 += 1;
      if (products.length === 0 && !hasMore) break;
      for (const product of products) {
        if (stats.fetched >= limit) break;
        stats.fetched += 1;
        try {
          this.trackMissingFields(stats, product);
          const outcome = await this.processOne(product, options, curriculumTopics, stats);
          this.tally(stats, outcome);
        } catch (error) {
          stats.failed += 1;
          stats.errors.push({ sourceProductId: product.sourceProductId, message: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    stats.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (log) {
      await this.db.finishSyncLog(log.id, {
        finishedAt: new Date(stats.finishedAt),
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        needsReview: stats.needsReview,
        statsJson: JSON.stringify(stats),
        errorLog: stats.errors.length ? JSON.stringify(stats.errors) : null
      });
    }
    return stats;
  }
  trackMissingFields(stats, product) {
    if (!product.rawIsbn) stats.missing.isbn += 1;
    if (!product.rawPublisher) stats.missing.publisher += 1;
    if (!product.rawMetadata?.subjectLabel) stats.missing.subject += 1;
    if (!product.rawMetadata?.examLabel && !product.rawCategory) stats.missing.examScope += 1;
    if (!product.rawCategory) stats.missing.bookType += 1;
    if (!product.rawImageUrl) stats.missing.image += 1;
    if (product.rawPrice === void 0) stats.missing.price += 1;
  }
  tally(stats, outcome) {
    if (outcome.status === "created") stats.created += 1;
    else if (outcome.status === "updated") stats.updated += 1;
    else if (outcome.status === "skipped") stats.skipped += 1;
    else if (outcome.status === "needs_review") {
      stats.needsReview += 1;
      if (outcome.wasNew) stats.created += 1;
      else stats.updated += 1;
    } else {
      stats.failed += 1;
      stats.errors.push({ sourceProductId: outcome.product?.sourceProductId, message: outcome.reason });
    }
  }
  async processOne(product, options, curriculumTopics, stats) {
    const dryRun = !!options.dryRun;
    const issues = validateRawProduct(product);
    if (!dryRun) {
      const sourceRow = await this.db.upsertExternalSource({
        source: product.source,
        sourceProductId: product.sourceProductId,
        sourceUrl: product.sourceUrl ?? null,
        rawName: product.rawName,
        rawDescription: product.rawDescription ?? null,
        rawPrice: product.rawPrice ?? null,
        rawCurrency: product.rawCurrency ?? null,
        rawImageUrl: product.rawImageUrl ?? null,
        rawPublisher: product.rawPublisher ?? null,
        rawCategory: product.rawCategory ?? null,
        rawIsbn: product.rawIsbn ?? null,
        rawMetadata: product.rawMetadata ?? null
      });
      if (issues.length > 0) {
        await this.db.markExternalSourceOutcome(sourceRow.id, { matchedBookId: sourceRow.matchedBookId, syncStatus: "failed", errorMessage: issues.map((i) => i.message).join("; ") });
        return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
      }
      if (options.onlyNew && sourceRow.matchedBookId) {
        return { status: "skipped", reason: "--only-new: bu \xFCr\xFCn zaten e\u015Fle\u015Fmi\u015F", sourceRowId: sourceRow.id };
      }
      return this.upsertAndClassify(product, sourceRow.matchedBookId, options, curriculumTopics, sourceRow.id, stats);
    }
    if (issues.length > 0) return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
    const existing = await this.db.findExternalSource(product.source, product.sourceProductId);
    if (options.onlyNew && existing?.matchedBookId) return { status: "skipped", reason: "--only-new: bu \xFCr\xFCn zaten e\u015Fle\u015Fmi\u015F" };
    return this.upsertAndClassify(product, existing?.matchedBookId ?? null, options, curriculumTopics, existing?.id ?? -1, stats);
  }
  async upsertAndClassify(product, matchedBookId, options, curriculumTopics, sourceRowId, stats) {
    const dryRun = !!options.dryRun;
    const normalized = normalizeProduct(product);
    let publisherId = null;
    if (normalized.publisherNormalizedName && normalized.publisherName && normalized.publisherSlug) {
      const existingPublisher = await this.db.findPublisherByNormalizedName(normalized.publisherNormalizedName);
      if (existingPublisher) {
        publisherId = existingPublisher.id;
      } else if (!dryRun) {
        const created = await this.db.createPublisher({ name: normalized.publisherName, slug: normalized.publisherSlug, normalizedName: normalized.publisherNormalizedName });
        publisherId = created.id;
      }
    }
    let existingBook = matchedBookId ? await this.db.getCatalogBookById(matchedBookId) : null;
    let match = null;
    if (!existingBook) {
      if (normalized.isbn) {
        existingBook = await this.db.findCatalogBookByIsbn(normalized.isbn);
        if (existingBook) match = { bookId: existingBook.id, tier: "isbn", confidence: 1, reason: "ISBN e\u015Fle\u015Fmesi" };
      }
      if (!existingBook && publisherId !== null) {
        const candidates = await this.db.listCatalogBooksByPublisher(publisherId);
        match = detectDuplicate({ isbn: normalized.isbn, name: normalized.name, publisherId, editionYear: normalized.editionYear }, candidates);
      }
    }
    const willAutoMerge = !!existingBook || match !== null && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD;
    const ambiguousMatch = match && match.confidence < AUTO_MERGE_CONFIDENCE_THRESHOLD ? match : null;
    const bookInput = {
      publisherId,
      name: normalized.name,
      slug: slugForBook(normalized.name, normalized.publisherName) + (ambiguousMatch ? `-${normalized.editionYear ?? Date.now()}` : ""),
      isbn: normalized.isbn,
      editionYear: normalized.editionYear,
      description: normalized.description,
      imageUrl: normalized.imageUrl,
      bookType: normalized.bookType,
      examScope: normalized.examScope,
      subject: normalized.subject,
      metadata: { source: product.source, sourceUrl: product.sourceUrl ?? null }
    };
    let book;
    let isNewBook;
    if (dryRun) {
      isNewBook = !existingBook && !willAutoMerge;
      book = existingBook ?? (match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD ? await this.db.getCatalogBookById(match.bookId) : { ...bookInput, id: -1, active: true, manualOverride: false, difficultyLabel: "medium", difficultyScore: 50, difficultyConfidence: 0, classificationMethod: "rule" });
    } else if (existingBook || match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD) {
      const targetId = existingBook?.id ?? match.bookId;
      book = await this.db.updateCatalogBook(targetId, bookInput);
      isNewBook = false;
    } else {
      book = await this.db.createCatalogBook(bookInput);
      isNewBook = true;
    }
    if (!dryRun) {
      await this.db.markExternalSourceOutcome(sourceRowId, { matchedBookId: book.id, syncStatus: ambiguousMatch ? "needs_review" : "processed" });
      if (normalized.price !== null) {
        await this.db.upsertBookOffer({ bookId: book.id, source: product.source, price: normalized.price, currency: normalized.currency, productUrl: product.sourceUrl ?? null });
      }
    }
    let needsReview = ambiguousMatch !== null;
    if (!book.manualOverride && (isNewBook || options.force)) {
      const rawMetadata = product.rawMetadata ?? {};
      const useAi = resourceCatalogConfig.difficulty.aiEnabled && !options.noAi;
      const result = await this.difficultyClassifier.classify(
        { title: normalized.name, publisher: normalized.publisherName, subject: normalized.subject, exam: normalized.examScope, bookType: normalized.bookType, description: normalized.description, category: product.rawCategory ?? null },
        { useAi, metadata: { legacyLevel: rawMetadata.legacyLevel ?? null, pageCount: rawMetadata.pageCount ?? null } }
      );
      needsReview = needsReview || result.confidence < resourceCatalogConfig.difficulty.reviewConfidenceThreshold;
      stats.difficulty[result.label] += 1;
      if (needsReview) stats.difficulty.needsReview += 1;
      if (!dryRun) {
        await this.db.updateCatalogBookDifficulty(book.id, {
          difficultyScore: result.score,
          difficultyLabel: result.label,
          difficultyConfidence: result.confidence,
          classificationMethod: "hybrid",
          needsReview,
          classifiedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    const mappings = mapBookToCurriculumTopics({ name: normalized.name, subject: normalized.subject, examScope: normalized.examScope }, curriculumTopics);
    if (mappings.length > 0) stats.curriculumMapped += 1;
    else stats.curriculumUnmapped += 1;
    if (!dryRun) {
      for (const mapping of mappings) {
        await this.db.upsertBookCurriculumMapping({ bookId: book.id, topicId: mapping.topicId, confidence: mapping.confidence, reason: mapping.reason });
      }
    }
    if (needsReview) {
      return { status: "needs_review", bookId: dryRun ? null : book.id, sourceRowId, reason: ambiguousMatch ? ambiguousMatch.reason : "D\xFC\u015F\xFCk g\xFCvenli zorluk s\u0131n\u0131fland\u0131rmas\u0131", wasNew: isNewBook };
    }
    return { status: isNewBook ? "created" : "updated", bookId: book.id, sourceRowId };
  }
};

// server/resourceCatalog/sources/kitapIslerSource.ts
var BASE_URL = "https://www.kitapisler.com";
var DEFAULT_SEED_URL = `${BASE_URL}/YKS-Yuksekogretim-Kurum-Sinavi-1196`;
var sleep2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var decodeEntities = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&uuml;/g, "\xFC").replace(/&Uuml;/g, "\xDC").replace(/&ouml;/g, "\xF6").replace(/&Ouml;/g, "\xD6").replace(/&ccedil;/g, "\xE7").replace(/&Ccedil;/g, "\xC7").replace(/&scedil;|&#351;/g, "\u015F").replace(/&#350;/g, "\u015E").replace(/&#287;/g, "\u011F").replace(/&#286;/g, "\u011E").replace(/&#305;/g, "\u0131").replace(/&#304;/g, "\u0130");
var parseTurkishPrice = (raw) => {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : void 0;
};
var PRODUCT_TITLE_PATTERN = /href="([^"]+_(\d+)\.html)"\s+title="([^"]+)"/;
var PUBLISHER_PATTERN = /class="dmarka"><a href="[^"]+" title="([^"]+)"/;
var IMAGE_PATTERN = /<img src="([^"]+)"/;
var CATEGORY_LINK_PATTERN = /class="top_cat(\d+)"><a href="(https:\/\/www\.kitapisler\.com\/[^"]+)" title="([^"]+)"/g;
var YKS_CATEGORY_KEYWORDS = ["tyt", "ayt", "yks"];
var isYksCategory = (title, url) => {
  const haystack = `${title} ${url}`.toLocaleLowerCase("tr");
  return YKS_CATEGORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};
var SUBJECT_KEYWORDS = [
  { subject: "T\xFCrk\xE7e", patterns: ["t\xFCrk\xE7e", "turkce"] },
  { subject: "Matematik", patterns: ["matematik"] },
  { subject: "Fizik", patterns: ["fizik"] },
  { subject: "Kimya", patterns: ["kimya"] },
  { subject: "Biyoloji", patterns: ["biyoloji"] },
  { subject: "Tarih", patterns: ["tarih"] },
  { subject: "Co\u011Frafya", patterns: ["co\u011Frafya", "cografya"] },
  { subject: "Felsefe", patterns: ["felsefe"] },
  { subject: "Din K\xFClt\xFCr\xFC", patterns: ["din k\xFClt\xFCr", "din kultur"] },
  { subject: "Edebiyat", patterns: ["edebiyat"] },
  { subject: "Sosyal", patterns: ["sosyal bilim"] },
  { subject: "Fen", patterns: ["fen bilim"] }
];
var inferSubjectFromTitle = (title) => {
  const normalized = title.toLocaleLowerCase("tr");
  return SUBJECT_KEYWORDS.find((entry) => entry.patterns.some((pattern) => normalized.includes(pattern)))?.subject;
};
var HeuristicHtmlExtractor = class {
  extractProducts(html, categoryUrl, categoryTitle) {
    const products = [];
    const chunks = html.split('<div class="listingProduct">').slice(1);
    const subjectLabel = inferSubjectFromTitle(categoryTitle);
    const seen = /* @__PURE__ */ new Set();
    for (const chunk of chunks) {
      const titleMatch = chunk.match(PRODUCT_TITLE_PATTERN);
      if (!titleMatch) continue;
      const [, hrefRaw, productId, rawTitle] = titleMatch;
      if (seen.has(productId)) continue;
      seen.add(productId);
      const publisherMatch = chunk.match(PUBLISHER_PATTERN);
      const imageMatch = chunk.match(IMAGE_PATTERN);
      const discountPriceMatch = chunk.match(new RegExp(`id="divdiscountprice${productId}"[^>]*>\\s*<span id="pric">([\\d.,]+)</span>`));
      const basePriceMatch = chunk.match(new RegExp(`id="divprice${productId}"><span id="pric">([\\d.,]+)</span>`));
      const priceMatch = discountPriceMatch ?? basePriceMatch;
      const url = hrefRaw.startsWith("http") ? hrefRaw : `${BASE_URL}/${hrefRaw}`;
      products.push({
        source: "kitapisler",
        sourceProductId: productId,
        sourceUrl: url,
        rawName: decodeEntities(rawTitle).trim(),
        rawPublisher: publisherMatch ? decodeEntities(publisherMatch[1]).trim() : void 0,
        rawCategory: categoryTitle || categoryUrl,
        rawImageUrl: imageMatch ? imageMatch[1].startsWith("http") ? imageMatch[1] : `${BASE_URL}/${imageMatch[1].replace(/^\//, "")}` : void 0,
        rawPrice: priceMatch ? parseTurkishPrice(priceMatch[1]) : void 0,
        rawCurrency: "TRY",
        rawMetadata: subjectLabel ? { subjectLabel, examLabel: categoryTitle } : { examLabel: categoryTitle }
      });
    }
    return products;
  }
  extractCategoryLinks(html) {
    const links = [];
    const seen = /* @__PURE__ */ new Set();
    const pattern = new RegExp(CATEGORY_LINK_PATTERN.source, "g");
    let match;
    while (match = pattern.exec(html)) {
      const [, id8, url, rawTitle] = match;
      if (seen.has(id8)) continue;
      seen.add(id8);
      const title = decodeEntities(rawTitle).trim();
      if (isYksCategory(title, url)) links.push({ url, title });
    }
    return links;
  }
};
async function isCrawlingAllowed() {
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    if (!response.ok) return true;
    const text4 = await response.text();
    const blanketDisallow = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(text4);
    return !blanketDisallow;
  } catch {
    return true;
  }
}
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PusulaYKS-ResourceCatalogBot/1.0 (+https://github.com/)" } });
  } finally {
    clearTimeout(timer);
  }
}
var KitapIslerSource = class {
  constructor(seedUrls = [DEFAULT_SEED_URL], extractor = new HeuristicHtmlExtractor(), config = resourceCatalogConfig.importer) {
    this.extractor = extractor;
    this.config = config;
    this.queue = seedUrls.map((url) => ({ url, title: "" }));
  }
  name = "kitapisler";
  queue;
  visited = /* @__PURE__ */ new Set();
  productsSeen = 0;
  robotsChecked = false;
  robotsAllowed = true;
  async fetchPage(page2) {
    if (!this.robotsChecked) {
      this.robotsAllowed = await isCrawlingAllowed();
      this.robotsChecked = true;
    }
    if (!this.robotsAllowed) {
      console.warn("[ResourceCatalog] kitapisler.com robots.txt disallows crawling \u2014 aborting.");
      return { products: [], hasMore: false };
    }
    if (page2 >= this.config.maxPages || this.productsSeen >= this.config.maxProducts || this.queue.length === 0) {
      return { products: [], hasMore: false };
    }
    const next = this.queue.shift();
    if (this.visited.has(next.url)) return { products: [], hasMore: this.queue.length > 0 };
    this.visited.add(next.url);
    if (page2 > 0) await sleep2(this.config.delayMs);
    let lastError;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(next.url, this.config.timeoutMs);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const products = this.extractor.extractProducts(html, next.url, next.title).slice(0, Math.max(0, this.config.maxProducts - this.productsSeen));
        this.productsSeen += products.length;
        for (const category of this.extractor.extractCategoryLinks(html)) {
          if (!this.visited.has(category.url) && !this.queue.some((entry) => entry.url === category.url)) {
            this.queue.push(category);
          }
        }
        return { products, hasMore: this.queue.length > 0 && this.productsSeen < this.config.maxProducts };
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) await sleep2(this.config.delayMs * 2 ** attempt);
      }
    }
    console.warn(`[ResourceCatalog] kitapisler fetch failed for ${next.url}:`, lastError);
    return { products: [], hasMore: this.queue.length > 0 };
  }
};

// server/resourceCatalog/scheduler.ts
var runInFlight = false;
async function runResourceCatalogSyncOnce() {
  if (runInFlight) return { alreadyRunning: true };
  runInFlight = true;
  try {
    const source = new KitapIslerSource();
    const classifier = new HybridDifficultyClassifier(new RuleBasedDifficultyClassifier(), new LlmDifficultyClassifier());
    const pipeline = new ResourceCatalogImportPipeline(source, catalogDb, classifier);
    const stats = await pipeline.run({ limit: resourceCatalogConfig.scheduler.limitPerRun });
    console.log(
      `[ResourceCatalog Scheduler] kitapisler.com senkronu tamamland\u0131: ${stats.fetched} taranan, ${stats.created} yeni, ${stats.updated} g\xFCncellendi, ${stats.failed} hata.`
    );
    return { alreadyRunning: false, ...stats };
  } catch (error) {
    console.error("[ResourceCatalog Scheduler] senkron ba\u015Far\u0131s\u0131z:", error);
    throw error;
  } finally {
    runInFlight = false;
  }
}

// server/_core/app.ts
function createApiApp() {
  const app2 = express2();
  registerWebhookRoutes(app2);
  app2.use(express2.json({ limit: "50mb" }));
  app2.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerLocalAuthRoutes(app2);
  registerEmailVerificationRoutes(app2);
  registerWeeklyDigestRoutes(app2);
  registerErrorLogRoutes(app2);
  registerSessionReminderRoutes(app2);
  registerNoteAttachmentRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // Yalnızca beklenmeyen hatalar kaydedilir; BAD_REQUEST/UNAUTHORIZED gibi kullanıcıya
      // gösterilen mesajlar hata değil, akışın parçası.
      onError: ({ error, path: path2, ctx }) => {
        if (error.code !== "INTERNAL_SERVER_ERROR") return;
        void recordAppError({ source: "server", message: error.cause?.message ?? error.message, stack: error.cause?.stack ?? error.stack, path: `trpc ${path2 ?? "?"}`, userId: ctx?.user?.id ?? null });
      }
    })
  );
  app2.get("/api/cron/resource-catalog-sync", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    if (!resourceCatalogConfig.scheduler.enabled) {
      res.json({ ok: true, result: { disabled: true } });
      return;
    }
    try {
      const result = await runResourceCatalogSyncOnce();
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  });
  app2.use(errorLogMiddleware);
  return app2;
}

// server/subscriptions/seedPlans.ts
var PAID_PRICES = {
  basic: { monthly: 24900, yearly: 239900 },
  premium: { monthly: 99900, yearly: 959900 },
  premium_plus: { monthly: 249900, yearly: 2399900 }
};
var TRIAL_DAYS = 10;
var DEFAULT_PLANS = [
  { code: "FREE", name: "\xDCcretsiz", description: "Temel \xE7al\u0131\u015Fma takibi, konu haritas\u0131 ve odak zamanlay\u0131c\u0131.", tier: "free", track: null, billingPeriod: "none", price: 0, trialDays: 0 },
  ...EXAM_TRACKS.flatMap((track) => PAID_TIERS.flatMap((tier) => {
    const { monthly, yearly } = PAID_PRICES[tier];
    const label = TIER_LABELS[tier];
    const exam = EXAM_TRACK_DEFS[track].label;
    return [
      { code: planCodeFor(track, tier, "monthly"), name: `${exam} ${label} (Ayl\u0131k)`, description: `${exam} i\xE7in ${label} kotalar\u0131yla t\xFCm \xF6zellikler, ayl\u0131k.`, tier, track, billingPeriod: "monthly", price: monthly, trialDays: TRIAL_DAYS },
      { code: planCodeFor(track, tier, "yearly"), name: `${exam} ${label} (Y\u0131ll\u0131k)`, description: `${exam} i\xE7in ${label} kotalar\u0131yla t\xFCm \xF6zellikler, s\u0131nav bitene kadar.`, tier, track, billingPeriod: "yearly", price: yearly, trialDays: TRIAL_DAYS }
    ];
  }))
];
async function seedSubscriptionPlans() {
  for (const plan of DEFAULT_PLANS) {
    await upsertPlan(plan, { keepPrice: true });
  }
}

// server/_core/vercelHandler.ts
process.on("unhandledRejection", (reason) => {
  console.error("[vercelHandler] Yakalanmam\u0131\u015F promise reddi:", reason);
});
var app = createApiApp();
async function seedPlansWithRetry(attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await seedSubscriptionPlans();
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`[vercelHandler] seedSubscriptionPlans ${attempt}. deneme ba\u015Far\u0131s\u0131z, yeniden denenecek:`, error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * 2 ** attempt));
    }
  }
}
seedPlansWithRetry().catch((error) => {
  console.error("[vercelHandler] seedSubscriptionPlans ba\u015Far\u0131s\u0131z (DATABASE_URL kontrol et; elle: scripts/seed-plans.ts):", error);
});
var vercelHandler_default = app;
export {
  vercelHandler_default as default
};
