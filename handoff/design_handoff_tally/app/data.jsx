// app/data.jsx — kategorijas, dalībnieki, sākuma dati, palīgi, ikonas (LV)
// Pieejams caur window pārējiem babel skriptiem.

// ── Nauda / formāts (latviešu: "1,79 €") ─────────────────────
const fmtEur = (n) => {
  if (n == null || n === "" || isNaN(n)) return "";
  const v = Math.round(Number(n) * 100) / 100;
  const s = (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)).replace(".", ",");
  return s + " €";
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Kategorijas (sakārtotas; smalks tonis katrai grupai) ─────
const CATEGORIES = [
  { id: "produce",   name: "Dārzeņi",          hue: "#3E8E5A" },
  { id: "fruit",     name: "Augļi",            hue: "#D98A2B" },
  { id: "meat",      name: "Gaļa un zivis",    hue: "#C0524E" },
  { id: "dairy",     name: "Piena produkti",   hue: "#3E6FB0" },
  { id: "bakery",    name: "Maize",            hue: "#A9772F" },
  { id: "drinks",    name: "Dzērieni",         hue: "#2E8C8C" },
  { id: "snacks",    name: "Uzkodas",          hue: "#8A5BC4" },
  { id: "frozen",    name: "Saldēti",          hue: "#4A86C4" },
  { id: "household", name: "Mājsaimniecība",   hue: "#5E6470" },
  { id: "other",     name: "Citi",             hue: "#8A8F99" },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const catOrder = (id) => CATEGORIES.findIndex((c) => c.id === id);

// atslēgvārds → kategorija (ātrai pievienošanai). Latviešu saknes.
const GUESS = {
  produce: ["tomāt","gurķ","salāt","sīpol","kartup","burkān","paprik","brokoļ","ķiplok","spināt","avokado","kāpost","zaļum","sēn","cukini","pupiņ","zirņ"],
  fruit: ["ābol","banān","apelsīn","vīnog","ogas","zemen","mellen","citron","laim","mango","bumbier","persik","melone","kivi","ananās","ķirš"],
  meat: ["vist","liellop","cūk","steik","malt","bekon","desa","šķiņķ","tītar","zivs","zivj","las","tunci","garnel","jēr","fileja","kotlet"],
  dairy: ["piens","pilnpien","siers","jogurt","sviest","ola","olas","krējum","kefīr","biezpien","skābais"],
  bakery: ["maiz","klaip","bulciņ","bagete","rausi","tortilj","kūk","smalkmaiz","plācen"],
  drinks: ["ūden","sula","soda","kola","kafij","tēj","vīns","alus","kakao","limonād","dzēr"],
  snacks: ["čips","šokolād","konfekt","cepum","rieksti","popkorn","krekeri","saldum","batoniņ","želej"],
  frozen: ["saldēt","saldējum","pica","frī"],
  household: ["papīr","dvieļ","salvet","ziepes","mazgāj","tīrīš","sūkl","atkritum","maisiņ","folij","baterij","spuldz","tualet"],
};
const guessCategory = (name) => {
  const n = (name || "").toLowerCase();
  for (const [cat, words] of Object.entries(GUESS)) {
    if (words.some((w) => n.includes(w))) return cat;
  }
  return "other";
};

// ── Cenas aplēse (EUR, aptuvenas LV mazumtirdzniecības cenas) ─
// Ja cena atstāta tukša, šeit uzminam pēc nosaukuma vai kategorijas vidējās.
const PRICE_KEYWORDS = {
  pilnpien:1.20, piens:1.20, siers:4.50, jogurt:1.50, sviest:2.80, krējum:1.40, biezpien:1.60, kefīr:1.10, "ola":3.20, "olas":3.20,
  maiz:1.80, klaip:1.80, bulciņ:0.60, bagete:1.20, kūk:6.00, smalkmaiz:1.50,
  vist:5.50, liellop:9.00, cūk:6.00, malt:5.00, bekon:3.00, desa:3.50, šķiņķ:4.00, zivs:8.00, las:9.00, tunci:2.50, garnel:7.00, steik:10.00, fileja:8.00, tītar:7.00,
  tomāt:2.00, gurķ:1.50, salāt:1.20, sīpol:1.00, kartup:1.50, burkān:1.00, paprik:2.50, brokoļ:1.80, ķiplok:1.50, spināt:1.30, avokado:2.10, kāost:1.20, sēn:2.00,
  ābol:1.50, banān:1.20, apelsīn:1.80, vīnog:3.00, zemen:2.90, mellen:3.50, citron:1.00, mango:1.80, bumbier:1.80, persik:2.50, melone:3.00, kivi:2.00, ananās:2.50, ķirš:4.00, ogas:3.00,
  ūden:1.00, sula:2.40, kola:1.80, kafij:6.50, tēj:3.00, vīns:8.00, alus:1.50, kakao:3.50, limonād:1.80, soda:1.50,
  čips:2.00, šokolād:2.20, konfekt:3.00, cepum:1.80, rieksti:4.00, popkorn:2.00, krekeri:1.80, saldum:3.00, batoniņ:1.20,
  saldējum:3.50, pica:3.00, frī:2.50, saldēt:3.00,
  papīr:4.00, dvieļ:4.10, salvet:1.50, ziepes:2.00, mazgāj:6.00, tīrīš:3.00, sūkl:1.50, atkritum:3.00, maisiņ:2.00, folij:2.50, baterij:5.00, spuldz:4.00, tualet:5.00,
};
const CAT_AVG = { produce:1.80, fruit:2.20, meat:7.00, dairy:2.00, bakery:1.80, drinks:2.50, snacks:2.50, frozen:3.20, household:3.50, other:2.50 };
const guessPrice = (name, cat) => {
  const n = (name || "").toLowerCase();
  for (const [w, p] of Object.entries(PRICE_KEYWORDS)) {
    if (n.includes(w)) return p;
  }
  return CAT_AVG[cat] || CAT_AVG.other;
};

// ── Ģimenes dalībnieki (krāsainas iniciāļu ikonas) ───────────
const MEMBERS = [
  { id: "u_me",  name: "Tu",    initials: "TU", color: "#2541E0", me: true },
  { id: "u_mara",name: "Māra",  initials: "MR", color: "#C0524E" },
  { id: "u_jan", name: "Jānis", initials: "JN", color: "#3E8E5A" },
  { id: "u_eva", name: "Eva",   initials: "EV", color: "#A9772F" },
];
const MEMBER = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));

// ── Sākuma saraksts ──────────────────────────────────────────
const now = Date.now();
const min = 60 * 1000;
const SEED_ITEMS = [
  { name: "Pilnpiens", qty: "2", price: 1.39, note: "", cat: "dairy", by: "u_mara", at: now - 42*min },
  { name: "Brīvo vistu olas", qty: "10 gab.", price: 3.2, note: "Lielas", cat: "dairy", by: "u_me", at: now - 38*min },
  { name: "Skābmaizes klaips", qty: "1", price: 2.5, note: "", cat: "bakery", by: "u_jan", at: now - 30*min },
  { name: "Vistas krūtiņa", qty: "600 g", price: 5.4, note: "Svētdienai", cat: "meat", by: "u_mara", at: now - 28*min },
  { name: "Laša fileja", qty: "2", price: 8.9, note: "", cat: "meat", by: "u_me", at: now - 20*min, bought: true, checkedBy: "u_me", checkedAt: now - 6*min },
  { name: "Tomāti", qty: "5", price: 1.6, note: "Uz zara", cat: "produce", by: "u_eva", at: now - 18*min },
  { name: "Mazie spināti", qty: "1 maiss", price: 1.3, note: "", cat: "produce", by: "u_mara", at: now - 16*min },
  { name: "Avokado", qty: "3", price: 2.1, note: "Gatavs", cat: "produce", by: "u_jan", at: now - 12*min },
  { name: "Banāni", qty: "6", price: 1.2, note: "", cat: "fruit", by: "u_me", at: now - 10*min, bought: true, checkedBy: "u_eva", checkedAt: now - 4*min },
  { name: "Zemenes", qty: "1 kastīte", price: 2.9, note: "", cat: "fruit", by: "u_eva", at: now - 9*min },
  { name: "Gāzēts ūdens", qty: "6 gab.", price: 3.4, note: "", cat: "drinks", by: "u_jan", at: now - 7*min },
  { name: "Maltā kafija", qty: "1", price: 6.5, note: "Tumšais grauzdējums", cat: "drinks", by: "u_mara", at: now - 5*min },
  { name: "Tumšā šokolāde", qty: "2", price: 2.2, note: "85%", cat: "snacks", by: "u_me", at: now - 3*min },
  { name: "Papīra dvieļi", qty: "4 gab.", price: 4.1, note: "", cat: "household", by: "u_eva", at: now - 2*min },
].map((it) => ({ id: uid(), bought: false, checkedBy: null, checkedAt: null, priceGuessed: false, ...it }));

// "attālie" notikumi smalkai reāllaika simulācijai
const REMOTE_SCRIPT = [
  { kind: "add", by: "u_mara", item: { name: "Grieķu jogurts", qty: "4", price: 3.6, note: "", cat: "dairy" } },
  { kind: "check", by: "u_jan", match: "Tomāti" },
  { kind: "add", by: "u_eva", item: { name: "Apelsīnu sula", qty: "1", price: 2.4, note: "Bez mīkstuma", cat: "drinks" } },
  { kind: "check", by: "u_mara", match: "Mazie spināti" },
  { kind: "add", by: "u_jan", item: { name: "Čipsi", qty: "2", price: 2.0, note: "", cat: "snacks" } },
];

const relTime = (ts) => {
  const d = Math.max(0, Date.now() - ts);
  const m = Math.floor(d / 60000);
  if (m < 1) return "tikko";
  if (m < 60) return "pirms " + m + " min";
  const h = Math.floor(m / 60);
  if (h < 24) return "pirms " + h + " h";
  return "pirms " + Math.floor(h / 24) + " d";
};

// ── Monolīniju ikonas (1.75px) ───────────────────────────────
const TIcon = ({ name, size = 18, stroke = "currentColor", sw = 1.75, style = {} }) => {
  const P = {
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M4 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    gear: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8z" /></>,
    back: <path d="M15 6l-6 6 6 6" />,
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />,
    edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
    users: <><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.4c2.1.7 3.5 2.4 3.5 4.6" /></>,
    chevron: <path d="M9 6l6 6-6 6" />,
    link: <path d="M9 15l6-6M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7l-1.8 1.8M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8" />,
    bag: <path d="M6 8h12l-.8 11a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 8zM9 8V6a3 3 0 0 1 6 0v2" />,
    sparkle: <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />,
    cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L20 7H6" /></>,
    qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2M20 14v6h-6M18 18h2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {P[name] || P.sparkle}
    </svg>
  );
};

window.TallyData = {
  fmtEur, uid, CATEGORIES, CAT, catOrder, guessCategory, guessPrice,
  MEMBERS, MEMBER, SEED_ITEMS, REMOTE_SCRIPT, relTime, TIcon,
};
