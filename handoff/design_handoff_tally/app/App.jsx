// app/App.jsx — state, simulated realtime sync, screen assembly, tweaks.
const { fmtEur, uid, CATEGORIES, CAT, catOrder, MEMBERS, MEMBER, SEED_ITEMS, REMOTE_SCRIPT, guessPrice, TIcon } = window.TallyData;
const { Avatar, AvatarStack, SectionHeader, ItemRow, Toast, EmptyState } = window.TallyUI;
const { AddEditSheet, InviteSheet, SettingsScreen } = window.TallySheets;

const STORE = "tally.items.v2";
const loadItems = () => {
  try { const r = localStorage.getItem(STORE); if (r) return JSON.parse(r); } catch (e) {}
  return SEED_ITEMS;
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2541E0",
  "dark": false,
  "density": "airy",
  "listStyle": "swipe"
}/*EDITMODE-END*/;

function TallyApp({ t, setTweak }) {
  const [items, setItems] = React.useState(loadItems);
  const [family, setFamily] = React.useState(() => {
    try { const r = localStorage.getItem("tally.family.v1"); if (r) return JSON.parse(r); } catch (e) {}
    return { name: "Bērziņu ģimene", code: "K7P-29Q" };
  });
  const [draft, setDraft] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [invite, setInvite] = React.useState(false);
  const [settings, setSettings] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [arrived, setArrived] = React.useState({});
  const scriptIdx = React.useRef(0);

  React.useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) {}
  }, [items]);

  React.useEffect(() => {
    try { localStorage.setItem("tally.family.v1", JSON.stringify(family)); } catch (e) {}
  }, [family]);

  // accent → CSS var for tweak panel hooks
  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent-live", t.accent);
  }, [t.accent]);

  const markArrived = (id) => {
    setArrived((a) => ({ ...a, [id]: true }));
    setTimeout(() => setArrived((a) => { const n = { ...a }; delete n[id]; return n; }), 1200);
  };

  // ── preču darbības ──
  const withGuess = (it) => {
    const hasPrice = Number(it.price) > 0;
    return { ...it, price: hasPrice ? Number(it.price) : guessPrice(it.name, it.cat),
      priceGuessed: !hasPrice };
  };
  const upsert = (it) => {
    const g = withGuess(it);
    if (g.id) {
      setItems((xs) => xs.map((x) => (x.id === g.id ? { ...x, ...g } : x)));
    } else {
      const nu = { id: uid(), bought: false, checkedBy: null, checkedAt: null,
        by: "u_me", at: Date.now(), ...g };
      setItems((xs) => [nu, ...xs]);
      markArrived(nu.id);
    }
    setAddOpen(false); setDraft(null);
  };
  const toggle = (it) => setItems((xs) => xs.map((x) => x.id === it.id
    ? { ...x, bought: !x.bought, checkedBy: !x.bought ? "u_me" : null, checkedAt: !x.bought ? Date.now() : null }
    : x));
  const remove = (it) => setItems((xs) => xs.filter((x) => x.id !== it.id));
  const openAdd = () => { setDraft(null); setAddOpen(true); };
  const openEdit = (it) => { setDraft(it); setAddOpen(true); };

  // ── simulated realtime engine (subtle) ──
  const fireRemote = React.useCallback(() => {
    const ev = REMOTE_SCRIPT[scriptIdx.current % REMOTE_SCRIPT.length];
    scriptIdx.current += 1;
    if (ev.kind === "add") {
      const nu = { id: uid(), bought: false, checkedBy: null, checkedAt: null,
        by: ev.by, at: Date.now(), ...ev.item };
      setItems((xs) => (xs.some((x) => x.name === nu.name && !x.bought) ? xs : [nu, ...xs]));
      markArrived(nu.id);
      setToast({ key: uid(), by: ev.by, verb: "pievienoja", item: ev.item.name });
    } else if (ev.kind === "check") {
      let hit = null;
      setItems((xs) => xs.map((x) => {
        if (!hit && !x.bought && x.name === ev.match) { hit = x; return { ...x, bought: true, checkedBy: ev.by, checkedAt: Date.now() }; }
        return x;
      }));
      if (hit) setToast({ key: uid(), by: ev.by, verb: "atzīmēja", item: ev.match });
    }
    setTimeout(() => setToast(null), 3600);
  }, []);

  React.useEffect(() => {
    let tid;
    const loop = () => { tid = setTimeout(() => { fireRemote(); loop(); }, 26000 + Math.random() * 16000); };
    loop();
    const onManual = () => fireRemote();
    window.addEventListener("tally:simulate", onManual);
    return () => { clearTimeout(tid); window.removeEventListener("tally:simulate", onManual); };
  }, [fireRemote]);

  // ── derive groups ──
  const active = items.filter((x) => !x.bought);
  const bought = items.filter((x) => x.bought);
  const groups = {};
  active.forEach((it) => { (groups[it.cat] = groups[it.cat] || []).push(it); });
  const orderedGroups = Object.keys(groups).sort((a, b) => catOrder(a) - catOrder(b));
  const remaining = active.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const memberIds = MEMBERS.map((m) => m.id);

  return (
    <div className={"t-app" + (t.dark ? " dark" : "")} style={{ "--accent": t.accent }}>
      {/* Header */}
      <header className="t-header">
        <div className="t-header-top">
          <AvatarStack ids={memberIds} size={30} onClick={() => setInvite(true)} />
          <div className="t-header-actions">
            <span className="t-sync"><span className="t-live-dot" /> Sinhronizēts</span>
            <button className="t-iconbtn" onClick={() => setSettings(true)} aria-label="Settings">
              <TIcon name="gear" size={21} />
            </button>
          </div>
        </div>
        <div className="t-eyebrow">{family.name}</div>
        <h1 className="t-title">Iepirkumu saraksts</h1>
        <div className="t-summary">
          <span className="t-summary-main">{active.length} {active.length === 1 ? "prece" : "preces"}</span>
          {remaining > 0 && <span className="t-summary-sep">·</span>}
          {remaining > 0 && <span className="t-summary-est">vēl ~{fmtEur(remaining)}</span>}
        </div>
      </header>

      {/* List */}
      <div className="t-list">
        {active.length === 0 && bought.length === 0 && <EmptyState accent={t.accent} />}
        {active.length === 0 && bought.length > 0 && (
          <div className="t-allgood">
            <div className="t-allgood-mark" style={{ background: t.accent }}><TIcon name="check" size={26} stroke="#fff" sw={2.4} /></div>
            <div className="t-allgood-t">Viss savākts</div>
            <div className="t-allgood-s">Viss ir grozā. Lieliski!</div>
          </div>
        )}
        {orderedGroups.map((cid) => {
          const rows = groups[cid];
          const total = rows.reduce((s, x) => s + (Number(x.price) || 0), 0);
          return (
            <section className="t-section" key={cid}>
              <SectionHeader catId={cid} count={rows.length} total={total} />
              <div className="t-rows">
                {rows.map((it) => (
                  <ItemRow key={it.id} item={it} listStyle={t.listStyle} density={t.density}
                    onToggle={toggle} onEdit={openEdit} onDelete={remove} justArrived={arrived[it.id]} />
                ))}
              </div>
            </section>
          );
        })}

        {bought.length > 0 && (
          <section className="t-section cart">
            <div className="t-section-head">
              <TIcon name="bag" size={15} stroke="var(--ink3)" />
              <span className="t-cat-name muted">Grozā</span>
              <span className="t-cat-count">{bought.length}</span>
              <span className="t-section-rule" />
            </div>
            <div className="t-rows">
              {bought.map((it) => (
                <ItemRow key={it.id} item={it} listStyle={t.listStyle} density={t.density}
                  onToggle={toggle} onEdit={openEdit} onDelete={remove} />
              ))}
            </div>
          </section>
        )}
        <div className="t-list-foot" />
      </div>

      <Toast toast={toast} />

      {/* Add bar */}
      <div className="t-addbar">
        <button className="t-addfield" onClick={openAdd}>
          <TIcon name="plus" size={19} stroke="var(--ink3)" />
          <span>Pievienot sarakstam…</span>
        </button>
        <button className="t-addbtn" onClick={openAdd} style={{ background: t.accent }} aria-label="Add item">
          <TIcon name="plus" size={24} stroke="#fff" sw={2.2} />
        </button>
      </div>

      <AddEditSheet open={addOpen} draft={draft} accent={t.accent}
        onClose={() => { setAddOpen(false); setDraft(null); }}
        onSave={upsert} onDelete={(it) => { remove(it); setAddOpen(false); setDraft(null); }} />
      <InviteSheet open={invite} onClose={() => setInvite(false)} family={family} members={memberIds} accent={t.accent} onRename={(name) => setFamily((f) => ({ ...f, name }))} />
      <SettingsScreen open={settings} onClose={() => setSettings(false)} t={t} setTweak={setTweak}
        family={family} members={memberIds} onOpenInvite={() => { setSettings(false); setTimeout(() => setInvite(true), 220); }} />

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Izskats" />
        <TweakToggle label="Tumšs" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakRadio label="Blīvums" value={t.density} options={[{ value: "airy", label: "Plašs" }, { value: "compact", label: "Kompakts" }]} onChange={(v) => setTweak("density", v)} />
        <TweakRadio label="Stils" value={t.listStyle} options={[{ value: "swipe", label: "Vilkšana" }, { value: "check", label: "Ķeksis" }]} onChange={(v) => setTweak("listStyle", v)} />
        <TweakColor label="Akcents" value={t.accent} options={["#2541E0", "#197A4F", "#C0524E", "#7A5AE0", "#0B0E14"]} onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Reāllaiks" />
        <TweakButton label="Imitēt ģimenes locekli" onClick={() => window.dispatchEvent(new Event("tally:simulate"))}>Sūtīt atjauninājumu</TweakButton>
      </TweaksPanel>
    </div>
  );
}

// ── Device + scaling stage ───────────────────────────────────
function Stage() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [scale, setScale] = React.useState(1);
  const W = 402, H = 874;
  React.useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 24) / H, (window.innerWidth - 24) / W));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="t-stage">
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <IOSDevice dark={t.dark} width={W} height={H}>
            <TallyApp t={t} setTweak={setTweak} />
          </IOSDevice>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Stage />);
