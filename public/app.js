const { useState, useEffect } = React;

let tg = window.Telegram?.WebApp || null;
let CURRENT_USER_ID = 0, CURRENT_USERNAME = "", CURRENT_USER_NAME = "Гость";
const ADMIN_USERNAMES = ["tutenhaman", "brgmnstrr"];
const ADMIN_IDS = [504348666, 2015942051];

try {
  if (tg && tg.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    CURRENT_USER_ID = u.id;
    CURRENT_USERNAME = (u.username || "").toLowerCase();
    CURRENT_USER_NAME = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Гость";
  }
} catch {}
const IS_ADMIN = ADMIN_USERNAMES.includes(CURRENT_USERNAME) || ADMIN_IDS.includes(CURRENT_USER_ID);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function App() {
  const [tab, setTab] = useState("community");
  const [brands, setBrands] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [likes, setLikes] = useState({});
  const [banned, setBanned] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    fetch("/api/library").then(r => r.json()).then(setBrands).catch(console.error);
    fetch("/api/mixes").then(r => r.json()).then(setMixes).catch(console.error);
    try { setBanned(JSON.parse(localStorage.getItem("bannedWords") || "[]")); } catch {}
  }, []);

  const reloadMixes = () => fetch("/api/mixes").then(r => r.json()).then(setMixes);

  const toggleLike = async (id) => {
    const already = !!likes[id];
    const delta = already ? -1 : 1;
    const r = await fetch(`/api/mixes/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta })
    });
    const j = await r.json();
    if (j.success) {
      setMixes(ms => ms.map(m => m.id === id ? { ...m, likes: j.mix.likes } : m));
      setLikes(s => { const n = { ...s }; if (already) delete n[id]; else n[id] = 1; return n; });
    }
  };

  const deleteMix = async (id) => {
    if (!confirm("Удалить этот микс?")) return;
    const r = await fetch(`/api/mixes/${id}`, {
      method: "DELETE",
      headers: { "x-admin-id": CURRENT_USER_ID || "" }
    });
    const j = await r.json().catch(() => ({}));
    if (j.success) {
      alert("✅ Микс удалён");
      reloadMixes();
    } else {
      alert("⚠️ Ошибка удаления");
    }
  };

  // === конструктор ===
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState("");
  const total = parts.reduce((a, b) => a + b.percent, 0);
  const avg = parts.length && total > 0 ? Math.round(parts.reduce((a, p) => a + p.percent * p.strength, 0) / total) : 0;
  const remaining = Math.max(0, 100 - total);

  let tasteTotals = {};
  for (const p of parts) {
    if (!p.taste) continue;
    const t = p.taste.trim().toLowerCase();
    tasteTotals[t] = (tasteTotals[t] || 0) + p.percent;
  }
  let finalTaste = "—";
  if (Object.keys(tasteTotals).length) {
    const [mainTaste] = Object.entries(tasteTotals).sort((a, b) => b[1] - a[1])[0];
    finalTaste = mainTaste;
  }

  const addFlavor = (brandId, fl) => {
    if (remaining <= 0) return;
    const key = `${brandId}:${fl.id}`;
    setParts(p => p.some(x => x.key === key)
      ? p
      : [...p, { key, brandId, flavorId: fl.id, name: fl.name, taste: fl.taste, strength: fl.strength, percent: Math.min(20, remaining) }]
    );
  };

  const updatePct = (key, val) => {
    setParts(prev => {
      const sumOthers = prev.reduce((a, b) => a + (b.key === key ? 0 : b.percent), 0);
      const allowed = Math.max(0, 100 - sumOthers);
      const clamped = clamp(val, 0, allowed);
      return prev.map(x => x.key === key ? { ...x, percent: clamped } : x);
    });
  };

  const removePart = key => setParts(p => p.filter(x => x.key !== key));

  const saveMix = async () => {
    if (total !== 100) return alert("Сумма процентов должна быть 100%");
    const title = prompt("Введите название микса:");
    if (!title) return;
    const bad = banned.find(w => title.toLowerCase().includes(String(w).toLowerCase()));
    if (bad) return alert(`❌ Запрещённое слово: "${bad}"`);
    const mix = { name: title.trim(), author: CURRENT_USER_NAME, flavors: parts, avgStrength: avg, finalTaste };
    const r = await fetch("/api/mixes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mix) });
    const j = await r.json();
    if (j.success) { alert("✅ Микс сохранён"); setParts([]); reloadMixes(); }
  };

  // === ADMIN ===
  const [brandName, setBrandName] = useState("");
  const [flavorName, setFlavorName] = useState("");
  const [flavorTaste, setFlavorTaste] = useState("");
  const [flavorType, setFlavorType] = useState("");
  const [flavorStrength, setFlavorStrength] = useState(5);
  const [brandForFlavor, setBrandForFlavor] = useState("");

  const saveLibrary = async (lib) => {
    await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-id": CURRENT_USER_ID || "" }, body: JSON.stringify(lib) });
  };

  const addBrand = () => {
    const name = brandName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const newLib = [...brands, { id, name, hidden: false, flavors: [] }];
    setBrands(newLib);
    saveLibrary(newLib);
    setBrandName("");
  };

  const addFlavorAdmin = () => {
    const b = brands.find(x => x.id === brandForFlavor);
    if (!b) return;
    const name = flavorName.trim();
    if (!name) return;
    const fl = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      type: flavorType,
      strength: flavorStrength,
      taste: flavorTaste,
      hidden: false
    };
    const newLib = brands.map(x => x.id === b.id ? { ...x, flavors: [...x.flavors, fl] } : x);
    setBrands(newLib);
    saveLibrary(newLib);
    setFlavorName(""); setFlavorType(""); setFlavorTaste("");
  };

  const toggleHidden = (bid) => {
    const newLib = brands.map(b => b.id === bid ? { ...b, hidden: !b.hidden } : b);
    setBrands(newLib);
    saveLibrary(newLib);
  };

  const delBrand = id => {
    const newLib = brands.filter(b => b.id !== id);
    setBrands(newLib);
    saveLibrary(newLib);
  };

  return (
    <div className="container">
      <header className="title">Кальянный Миксер</header>
      <div className="tabs">
        <button className={"tab-btn" + (tab === 'community' ? ' active' : '')} onClick={() => setTab('community')}>Миксы</button>
        <button className={"tab-btn" + (tab === 'builder' ? ' active' : '')} onClick={() => setTab('builder')}>Конструктор</button>
        {IS_ADMIN && <button className={"tab-btn" + (tab === 'admin' ? ' active' : '')} onClick={() => setTab('admin')}>Админ</button>}
      </div>

      {/* === BUILDER === */}
      {tab === "builder" && (
        <>
          <div className="card">
            <div className="hd"><h3>Поиск по всем вкусам</h3></div>
            <div className="bd">
              <input className="input" placeholder="Введите вкус (например, малина)" value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <div className="search-results">
                  {brands.flatMap(b =>
                    b.hidden ? [] :
                      b.flavors
                        .filter(f => !f.hidden)
                        .filter(f => {
                          const q = search.toLowerCase();
                          return (
                            (f.name || "").toLowerCase().includes(q) ||
                            (f.type || "").toLowerCase().includes(q) ||
                            (f.taste || "").toLowerCase().includes(q)
                          );
                        })
                        .map(f => (
                          <div key={`${b.id}-${f.id}`} className="flavor-item">
                            <div><b>{b.name}</b> — {f.name} <div className="tiny muted">{f.type} — {f.taste}</div></div>
                            <button className="btn" onClick={() => addFlavor(b.id, f)}>+ в микс</button>
                          </div>
                        ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="hd"><h3>Бренды и вкусы</h3></div>
            <div className="bd">
              {brands.filter(b => !b.hidden).map(b => (
                <div key={b.id} className="mix-card">
                  <div className="row between" onClick={() => setCollapsed(c => ({ ...c, [b.id]: !c[b.id] }))} style={{ cursor: "pointer" }}>
                    <b>{b.name}</b>
                    <span className="tiny">{collapsed[b.id] ? "▼" : "▲"}</span>
                  </div>
                  {!collapsed[b.id] && (
                    <div className="flavor-list">
                      {b.flavors.filter(f => !f.hidden).map(f => (
                        <div key={f.id} className="flavor-item">
                          <div><b>{f.name}</b> <div className="tiny muted">{f.type} — {f.taste}</div></div>
                          <button className="btn" onClick={() => addFlavor(b.id, f)}>+ в микс</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="hd"><h3>Ваш микс</h3></div>
            <div className="bd grid">
              {parts.map(p => (
                <div key={p.key} className="mix-card">
                  <div className="row between">
                    <div><b>{p.name}</b><div className="tiny muted">{p.taste}</div></div>
                    <button className="btn small" onClick={() => removePart(p.key)}>×</button>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={p.percent} onChange={e => updatePct(p.key, +e.target.value)} />
                  <div className="tiny muted">{p.percent}%</div>
                </div>
              ))}
              <div className="tiny muted">
                Итого: {total}% (осталось {100 - total}%) • Крепость {avg} • Вкус: {finalTaste}
              </div>
              <button className={"btn " + (total === 100 ? 'accent' : '')} onClick={saveMix} disabled={total !== 100}>Сохранить</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
