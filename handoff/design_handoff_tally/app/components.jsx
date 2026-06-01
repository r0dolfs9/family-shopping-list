// app/components.jsx — presentational pieces shared across screens.
const { fmtEur, CAT, MEMBER, relTime, TIcon } = window.TallyData;

// ── Avatar (colored initials) ────────────────────────────────
function Avatar({ id, size = 26, ring = false }) {
  const m = MEMBER[id] || { initials: "?", color: "#8A8F99" };
  return (
    <span className="t-avatar" style={{
      width: size, height: size, background: m.color,
      fontSize: size * 0.4,
      boxShadow: ring ? "0 0 0 2px var(--surface)" : "none",
    }} title={m.name}>{m.initials}</span>
  );
}

function AvatarStack({ ids, size = 28, onClick }) {
  return (
    <button className="t-avstack" onClick={onClick} aria-label="Family members">
      {ids.map((id, i) => (
        <span key={id} style={{ marginLeft: i === 0 ? 0 : -size * 0.34, zIndex: ids.length - i }}>
          <Avatar id={id} size={size} ring />
        </span>
      ))}
    </button>
  );
}

// ── Category section header ──────────────────────────────────
function SectionHeader({ catId, count, total }) {
  const c = CAT[catId] || CAT.other;
  return (
    <div className="t-section-head">
      <span className="t-cat-dot" style={{ background: c.hue }} />
      <span className="t-cat-name">{c.name}</span>
      <span className="t-cat-count">{count}</span>
      <span className="t-section-rule" />
      {total > 0 && <span className="t-cat-total">{fmtEur(total)}</span>}
    </div>
  );
}

// ── Checkbox circle ──────────────────────────────────────────
function Check({ on, accent, onClick, size = 24 }) {
  return (
    <button className={"t-check" + (on ? " on" : "")} onClick={onClick}
      style={{ width: size, height: size, "--chk": accent }} aria-pressed={on}>
      {on && <TIcon name="check" size={size * 0.62} stroke="#fff" sw={2.4} />}
    </button>
  );
}

// ── Item row ─────────────────────────────────────────────────
// style: "check" (leading checkbox) | "swipe" (drag to check / delete)
function ItemRow({ item, listStyle, density, onToggle, onEdit, onDelete, justArrived }) {
  const [dx, setDx] = React.useState(0);
  const drag = React.useRef(null);
  const c = CAT[item.cat] || CAT.other;
  const pad = density === "compact" ? 9 : 15;

  const start = (x) => { drag.current = { x0: x, dx: 0, moved: false }; };
  const move = (x) => {
    if (!drag.current) return;
    let d = x - drag.current.x0;
    if (Math.abs(d) > 4) drag.current.moved = true;
    d = Math.max(-130, Math.min(130, d));
    drag.current.dx = d;
    setDx(d);
  };
  const end = () => {
    if (!drag.current) return;
    const d = drag.current.dx;
    drag.current = null;
    if (d > 72) { setDx(0); onToggle(item); }
    else if (d < -72) { setDx(-300); setTimeout(() => onDelete(item), 180); }
    else setDx(0);
  };

  const swipe = listStyle === "swipe";
  const rowBody = (
    <div className="t-row-body" style={{ padding: `${pad}px 0` }}
      onClick={() => { if (!drag.current || !drag.current.moved) (swipe ? onEdit : onEdit)(item); }}>
      {!swipe && (
        <Check on={item.bought} accent="var(--accent)"
          onClick={(e) => { e.stopPropagation(); onToggle(item); }} />
      )}
      <div className="t-row-main">
        <div className={"t-name" + (item.bought ? " bought" : "")}>{item.name}</div>
        <div className="t-meta">
          {item.qty && <span className="t-qty">{item.qty}</span>}
          {item.qty && item.note && <span className="t-dot-sep">·</span>}
          {item.note && <span className="t-note">{item.note}</span>}
          {!item.qty && !item.note && (
            <span className="t-note dim">{item.bought ? "grozā" : "pievienots " + relTime(item.at)}</span>
          )}
        </div>
      </div>
      <div className="t-row-right">
        {item.price > 0 && <span className={"t-price" + (item.bought ? " bought" : "") + (item.priceGuessed ? " guess" : "")}>{item.priceGuessed ? "≈\u00A0" : ""}{fmtEur(item.price)}</span>}
        <Avatar id={item.bought ? (item.checkedBy || item.by) : item.by} size={22} />
      </div>
    </div>
  );

  if (!swipe) {
    return (
      <div className={"t-row" + (item.bought ? " is-bought" : "") + (justArrived ? " arrive" : "")}>
        {rowBody}
      </div>
    );
  }

  // swipe variant
  return (
    <div className={"t-row swipe" + (item.bought ? " is-bought" : "") + (justArrived ? " arrive" : "")}>
      <div className="t-swipe-action left" style={{ opacity: dx > 12 ? 1 : 0.0 }}>
        <TIcon name="check" size={20} stroke="#fff" sw={2.4} />
      </div>
      <div className="t-swipe-action right" style={{ opacity: dx < -12 ? 1 : 0.0 }}>
        <TIcon name="trash" size={19} stroke="#fff" />
      </div>
      <div className="t-swipe-surface"
        style={{ transform: `translateX(${dx}px)`, transition: drag.current ? "none" : "transform .26s cubic-bezier(.22,1,.36,1)" }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(e.clientX); }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerUp={end}
        onPointerCancel={end}>
        {rowBody}
      </div>
    </div>
  );
}

// ── Toast (subtle realtime feedback) ─────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const m = MEMBER[toast.by];
  return (
    <div className="t-toast" key={toast.key}>
      <Avatar id={toast.by} size={24} />
      <span className="t-toast-txt"><b>{m ? m.name : "Someone"}</b> {toast.verb} <b>{toast.item}</b></span>
      <span className="t-live-dot" />
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────
function EmptyState({ accent }) {
  return (
    <div className="t-empty">
      <div className="t-empty-mark" style={{ borderColor: accent }}>
        <TIcon name="cart" size={34} stroke={accent} sw={1.5} />
      </div>
      <div className="t-empty-title">Saraksts ir tukšs</div>
      <div className="t-empty-sub">Nekā vairs nav ko pirkt. Pievieno preci zemāk — tā uzreiz parādīsies visu ģimenes telefonos.</div>
    </div>
  );
}

window.TallyUI = { Avatar, AvatarStack, SectionHeader, Check, ItemRow, Toast, EmptyState };
