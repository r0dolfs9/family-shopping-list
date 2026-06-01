// app/sheets.jsx — Pievienot/Rediģēt, Ielūgums, Iestatījumi (LV)
const { fmtEur, CATEGORIES, CAT, MEMBERS, MEMBER, guessCategory, guessPrice, TIcon } = window.TallyData;
const { Avatar } = window.TallyUI;

// ── Apakšējais panelis ───────────────────────────────────────
function Sheet({ open, onClose, children, label, maxH = "88%" }) {
  return (
    <div className={"t-sheet-wrap" + (open ? " open" : "")} onClick={onClose}>
      <div className="t-sheet" style={{ maxHeight: maxH }} onClick={(e) => e.stopPropagation()}>
        <div className="t-sheet-grip" />
        {label && <div className="t-sheet-label">{label}</div>}
        {children}
      </div>
    </div>
  );
}

// ── Segmentu pārslēgs ────────────────────────────────────────
function Seg({ value, options, onChange }) {
  return (
    <div className="t-seg">
      {options.map((o) => (
        <button key={o.v} className={"t-seg-btn" + (value === o.v ? " on" : "")}
          onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Pievienot / Rediģēt preci ────────────────────────────────
function AddEditSheet({ open, onClose, draft, onSave, onDelete, accent }) {
  const editing = draft && draft.id;
  const [name, setName] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [note, setNote] = React.useState("");
  const [cat, setCat] = React.useState("other");
  const [catTouched, setCatTouched] = React.useState(false);
  const nameRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setName(draft?.name || "");
    setQty(draft?.qty || "");
    // ja iepriekšējā cena bija uzminēta, rādām lauku tukšu
    setPrice(draft?.price && !draft?.priceGuessed ? String(draft.price).replace(".", ",") : "");
    setNote(draft?.note || "");
    setCat(draft?.cat || "other");
    setCatTouched(!!draft?.id);
    setTimeout(() => nameRef.current && nameRef.current.focus(), 280);
  }, [open, draft]);

  // dzīvā kategorijas minēšana, kamēr raksta nosaukumu
  React.useEffect(() => {
    if (!catTouched && name.trim()) setCat(guessCategory(name));
  }, [name, catTouched]);

  const canSave = name.trim().length > 0;
  const priceNum = price ? Number(price.replace(",", ".")) : 0;
  const estimate = name.trim() ? guessPrice(name, cat) : 0;
  const save = () => {
    if (!canSave) return;
    onSave({
      ...(draft || {}),
      name: name.trim(),
      qty: qty.trim(),
      price: priceNum,           // 0 → App uzminēs cenu
      note: note.trim(),
      cat,
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label={editing ? "Rediģēt preci" : "Pievienot sarakstam"}>
      <input ref={nameRef} className="t-input-lg" placeholder="Ko vajag?"
        value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()} />

      <div className="t-cat-scroll">
        {CATEGORIES.map((c) => (
          <button key={c.id}
            className={"t-cat-chip" + (cat === c.id ? " on" : "")}
            style={cat === c.id ? { borderColor: c.hue, color: c.hue } : {}}
            onClick={() => { setCat(c.id); setCatTouched(true); }}>
            <span className="t-cat-dot sm" style={{ background: c.hue }} />
            {c.name}
          </button>
        ))}
      </div>

      <div className="t-field-row">
        <label className="t-field">
          <span className="t-field-l">Daudzums</span>
          <input className="t-input" placeholder="piem. 2 · 500 g"
            value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="t-field">
          <span className="t-field-l">Cena</span>
          <div className="t-input price">
            <input inputMode="decimal" placeholder={estimate ? "≈ " + String(Number.isInteger(estimate) ? estimate : estimate.toFixed(2)).replace(".", ",") : "auto"} value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))} />
            <span className="t-eur">€</span>
          </div>
        </label>
      </div>
      <div className="t-price-hint">
        <TIcon name="sparkle" size={13} stroke="var(--ink3)" />
        {price
          ? "Cena norādīta manuāli."
          : (estimate ? "Atstāj tukšu — aplēsīsim ap " + fmtEur(estimate) + "." : "Atstāj tukšu, un cenu aplēsīsim automātiski.")}
      </div>

      <label className="t-field">
        <span className="t-field-l">Piezīme</span>
        <input className="t-input" placeholder="Zīmols, gatavība, kam paredzēts…"
          value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="t-sheet-actions">
        {editing && (
          <button className="t-btn ghost danger" onClick={() => onDelete(draft)}>
            <TIcon name="trash" size={17} /> Dzēst
          </button>
        )}
        <button className="t-btn primary" disabled={!canSave} onClick={save}
          style={{ background: accent }}>
          {editing ? "Saglabāt" : "Pievienot"}
        </button>
      </div>
    </Sheet>
  );
}

// ── Ielūgt / pievienoties ģimenei ────────────────────────────
function InviteSheet({ open, onClose, family, members, accent, onRename }) {
  const [copied, setCopied] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(family.name);
  React.useEffect(() => { setNameVal(family.name); }, [family.name]);
  React.useEffect(() => { if (!open) setEditing(false); }, [open]);
  const commit = () => { const v = nameVal.trim(); if (v) onRename(v); setEditing(false); };
  const link = "tally.app/join/" + family.code;
  const copy = (text, which) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(which); setTimeout(() => setCopied(""), 1600);
  };
  return (
    <Sheet open={open} onClose={onClose} label="Tava ģimene">
      <div className="t-family-head">
        {editing ? (
          <input className="t-family-input" value={nameVal} autoFocus
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setNameVal(family.name); setEditing(false); } }}
            onBlur={commit} />
        ) : (
          <button className="t-family-name-btn" onClick={() => setEditing(true)}>
            <span className="t-family-name">{family.name}</span>
            <TIcon name="edit" size={17} stroke="var(--ink3)" />
          </button>
        )}
        <div className="t-family-sub">{members.length} dalībnieki · sinhronizēts</div>
      </div>

      <div className="t-invite-card">
        <div className="t-invite-qr">
          <TIcon name="qr" size={62} stroke={accent} sw={1.4} />
        </div>
        <div className="t-invite-right">
          <div className="t-field-l">Ielūguma kods</div>
          <div className="t-code">{family.code}</div>
          <button className="t-btn ghost sm" onClick={() => copy(link, "link")}>
            <TIcon name={copied === "link" ? "check" : "link"} size={15} />
            {copied === "link" ? "Saite nokopēta" : "Kopēt ielūguma saiti"}
          </button>
        </div>
      </div>
      <div className="t-invite-hint">
        Padalies ar kodu vai saiti. Kad ģimenes loceklis to atver, viņš pievienojas šim
        sarakstam un redz katru izmaiņu reāllaikā.
      </div>

      <div className="t-member-list">
        {members.map((id) => {
          const m = MEMBER[id];
          return (
            <div className="t-member-row" key={id}>
              <Avatar id={id} size={34} />
              <div className="t-member-info">
                <div className="t-member-name">{m.name}{m.me && <span className="t-you-tag">tu</span>}</div>
                <div className="t-member-role">{m.me ? "Īpašnieks" : "Dalībnieks"}</div>
              </div>
              <span className="t-member-live">tiešsaistē</span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

// ── Iestatījumi (pilnekrāns) ─────────────────────────────────
function SettingsScreen({ open, onClose, t, setTweak, family, members, onOpenInvite }) {
  return (
    <div className={"t-screen" + (open ? " open" : "")}>
      <div className="t-screen-bar">
        <button className="t-iconbtn" onClick={onClose} aria-label="Atpakaļ"><TIcon name="back" size={22} /></button>
        <span className="t-screen-title">Iestatījumi</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="t-screen-body">
        <div className="t-set-group-l">Izskats</div>
        <div className="t-set-card">
          <div className="t-set-row col">
            <span className="t-set-k">Tēma</span>
            <Seg value={t.dark ? "dark" : "light"} onChange={(v) => setTweak("dark", v === "dark")}
              options={[{ v: "light", label: "Gaišs" }, { v: "dark", label: "Tumšs" }]} />
          </div>
          <div className="t-set-row col">
            <span className="t-set-k">Blīvums</span>
            <Seg value={t.density} onChange={(v) => setTweak("density", v)}
              options={[{ v: "airy", label: "Plašs" }, { v: "compact", label: "Kompakts" }]} />
          </div>
          <div className="t-set-row col">
            <span className="t-set-k">Saraksta stils</span>
            <Seg value={t.listStyle} onChange={(v) => setTweak("listStyle", v)}
              options={[{ v: "swipe", label: "Vilkšana" }, { v: "check", label: "Ķeksis" }]} />
          </div>
          <div className="t-set-row col last">
            <span className="t-set-k">Akcents</span>
            <div className="t-swatches">
              {["#2541E0", "#197A4F", "#C0524E", "#7A5AE0", "#0B0E14"].map((c) => (
                <button key={c} className={"t-swatch" + (t.accent === c ? " on" : "")}
                  style={{ background: c }} onClick={() => setTweak("accent", c)}>
                  {t.accent === c && <TIcon name="check" size={14} stroke="#fff" sw={2.6} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="t-set-group-l">Ģimene</div>
        <div className="t-set-card">
          <button className="t-set-row tap" onClick={onOpenInvite}>
            <TIcon name="users" size={19} stroke="var(--ink2)" />
            <span className="t-set-k">{family.name}</span>
            <span className="t-set-v">{members.length} dalībnieki</span>
            <TIcon name="chevron" size={16} stroke="var(--ink3)" />
          </button>
          <button className="t-set-row tap last" onClick={onOpenInvite}>
            <TIcon name="link" size={19} stroke="var(--ink2)" />
            <span className="t-set-k">Ielūguma saite</span>
            <span className="t-set-v mono">{family.code}</span>
            <TIcon name="chevron" size={16} stroke="var(--ink3)" />
          </button>
        </div>

        <div className="t-set-group-l">Par</div>
        <div className="t-set-card">
          <div className="t-set-row last about">
            <span className="t-set-k">Tally</span>
            <span className="t-set-v">v0.1 · MVP prototips</span>
          </div>
        </div>
        <div className="t-set-foot">
          Reāllaika sinhronizācija, bezsaistes režīms un ģimenes pieslēgšanās ir aprakstīti
          ražošanas versijai failos PLAN.md un README.md.
        </div>
      </div>
    </div>
  );
}

window.TallySheets = { Sheet, Seg, AddEditSheet, InviteSheet, SettingsScreen };
