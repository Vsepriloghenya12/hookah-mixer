const { useState, useEffect } = React;

(function initTG() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.ready) tg.ready();
  } catch {}
})();

let tg = window.Telegram?.WebApp || null;
let CURRENT_USER_ID = 0,
  CURRENT_USERNAME = "",
  CURRENT_USER_NAME = "Гость";
const ADMIN_USERNAMES = ["tutenhaman", "brgmnstrr"];
const ADMIN_IDS = [504348666, 2015942051];

try {
  if (tg && tg.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    CURRENT_USER_ID = u.id;
    CURRENT_USERNAME = (u.username || "").toLowerCase();
    CURRENT_USER_NAME =
      [u.first_name, u.last_name].filter(Boolean).join(" ") || "Гость";
  }
} catch {}

const IS_ADMIN =
  ADMIN_USERNAMES.includes(CURRENT_USERNAME) ||
  ADMIN_IDS.includes(CURRENT_USER_ID);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const TASTE_COLORS = {
  сладкий: "#f5a623",
  кислый: "#f56d6d",
  свежий: "#4fc3f7",
  десертный: "#d18df0",
  пряный: "#ff8c00",
  чайный: "#c1b684",
  алкогольный: "#a970ff",
  гастрономический: "#90a955",
  травяной: "#6ab04c",
};
const tasteColor = (t) => TASTE_COLORS[(t || "").toLowerCase()] || "#ccc";

function App() {
  const [tab, setTab] = useState("community");

  // данные
  const [brands, setBrands] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [likes, setLikes] = useState({});
  const [banned, setBanned] = useState([]);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then(setBrands)
      .catch(console.error);
    fetch("/api/mixes")
      .then((r) => r.json())
      .then(setMixes)
      .catch(console.error);
    try {
      setBanned(JSON.parse(localStorage.getItem("bannedWords") || "[]"));
    } catch {}
  }, []);

  const reloadMixes = () =>
    fetch("/api/mixes")
      .then((r) => r.json())
      .then(setMixes);

  // лайки
  const toggleLike = async (id) => {
    const already = !!likes[id];
    const delta = already ? -1 : 1;
    const r = await fetch(`/api/mixes/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    const j = await r.json();
    if (j.success) {
      setMixes((ms) =>
        ms.map((m) => (m.id === id ? { ...m, likes: j.mix.likes } : m))
      );
      setLikes((s) => {
        const n = { ...s };
        if (already) delete n[id];
        else n[id] = 1;
        return n;
      });
    }
  };

  // удаление микса (только админ)
  const deleteMix = async (id) => {
    if (!confirm("Удалить этот микс?")) return;
    const r = await fetch(`/api/mixes/${id}`, {
      method: "DELETE",
      headers: { "x-admin-id": CURRENT_USER_ID || "" },
    });
    const j = await r.json().catch(() => ({}));
    if (j.success) {
      alert("✅ Микс удалён");
      reloadMixes();
    } else {
      alert("⚠️ Ошибка удаления");
    }
  };

  // === Конструктор ===
  const [selected, setSelected] = useState(null);
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState("");
  const selectedBrand = brands.find((b) => b.id === selected);
  const total = parts.reduce((a, b) => a + b.percent, 0);
  const avg =
    parts.length && total > 0
      ? Math.round(
          parts.reduce((a, p) => a + p.percent * p.strength, 0) / total
        )
      : 0;
  const remaining = Math.max(0, 100 - total);

  // доминирующий вкус
  let tasteTotals = {};
  for (const p of parts) {
    if (!p.taste) continue;
    const t = p.taste.trim().toLowerCase();
    tasteTotals[t] = (tasteTotals[t] || 0) + p.percent;
  }
  let finalTaste = "—";
  if (Object.keys(tasteTotals).length) {
    const [mainTaste] = Object.entries(tasteTotals).sort(
      (a, b) => b[1] - a[1]
    )[0];
    finalTaste = mainTaste;
  }

  const addFlavor = (brandId, fl) => {
    if (remaining <= 0) return;
    const key = `${brandId}:${fl.id}`;
    setParts((p) =>
      p.some((x) => x.key === key)
        ? p
        : [
            ...p,
            {
              key,
              brandId,
              flavorId: fl.id,
              name: fl.name,
              type: fl.type || "",
              taste: fl.taste,
              strength: fl.strength,
              percent: Math.min(20, remaining),
            },
          ]
    );
  };

  const updatePct = (key, val) => {
    setParts((prev) => {
      const sumOthers = prev.reduce(
        (a, b) => a + (b.key === key ? 0 : b.percent),
        0
      );
      const allowed = Math.max(0, 100 - sumOthers);
      const clamped = clamp(val, 0, allowed);
      return prev.map((x) =>
        x.key === key ? { ...x, percent: clamped } : x
      );
    });
  };
  const removePart = (key) => setParts((p) => p.filter((x) => x.key !== key));

  const saveMix = async () => {
    if (total !== 100) return alert("Сумма процентов должна быть 100%");
    const title = prompt("Введите название микса:");
    if (!title) return;
    const bad = banned.find((w) =>
      title.toLowerCase().includes(String(w).toLowerCase())
    );
    if (bad) return alert(`❌ Запрещённое слово: "${bad}"`);
    const mix = {
      name: title.trim(),
      author: CURRENT_USER_NAME,
      flavors: parts,
      avgStrength: avg,
      finalTaste,
    };
    const r = await fetch("/api/mixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mix),
    });
    const j = await r.json();
    if (j.success) {
      alert("✅ Микс сохранён");
      setParts([]);
      reloadMixes();
    }
  };

  // === Фильтрация ===
  const tasteCategories = Array.from(
    new Set(mixes.map((m) => (m.finalTaste || "").toLowerCase()).filter(Boolean))
  );
  const [pref, setPref] = useState("all");
  const [strength, setStrength] = useState(5);
  const filteredMixes = mixes
    .filter(
      (m) =>
        pref === "all" ||
        (m.finalTaste || "").toLowerCase().includes(pref)
    )
    .filter((m) => Math.abs((m.avgStrength || 0) - strength) <= 1);

  // === Админ ===
  const [brandName, setBrandName] = useState("");
  const [flavorName, setFlavorName] = useState("");
  const [flavorType, setFlavorType] = useState(""); // новый параметр
  const [flavorTaste, setFlavorTaste] = useState("");
  const [flavorStrength, setFlavorStrength] = useState(5);
  const [brandForFlavor, setBrandForFlavor] = useState("");

  const saveLibrary = async (lib) => {
    await fetch("/api/library", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": CURRENT_USER_ID || "",
      },
      body: JSON.stringify(lib),
    });
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
    const b = brands.find((x) => x.id === brandForFlavor);
    if (!b) return;
    const name = flavorName.trim();
    if (!name) return;
    const fl = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      type: flavorType,
      strength: flavorStrength,
      taste: flavorTaste,
      hidden: false,
    };
    const newLib = brands.map((x) =>
      x.id === b.id ? { ...x, flavors: [...x.flavors, fl] } : x
    );
    setBrands(newLib);
    saveLibrary(newLib);
    setFlavorName("");
    setFlavorType("");
    setFlavorTaste("");
  };

  const toggleFlavorHidden = (bid, fid) => {
    const newLib = brands.map((b) => {
      if (b.id !== bid) return b;
      return {
        ...b,
        flavors: b.flavors.map((f) =>
          f.id === fid ? { ...f, hidden: !f.hidden } : f
        ),
      };
    });
    setBrands(newLib);
    saveLibrary(newLib);
  };

  const deleteFlavor = (bid, fid) => {
    if (!confirm("Удалить этот вкус?")) return;
    const newLib = brands.map((b) => {
      if (b.id !== bid) return b;
      return { ...b, flavors: b.flavors.filter((f) => f.id !== fid) };
    });
    setBrands(newLib);
    saveLibrary(newLib);
  };

  const toggleHidden = (bid, fid) => {
    const newLib = brands.map((b) => {
      if (b.id !== bid) return b;
      if (!fid) return { ...b, hidden: !b.hidden };
      return {
        ...b,
        flavors: b.flavors.map((f) =>
          f.id === fid ? { ...f, hidden: !f.hidden } : f
        ),
      };
    });
    setBrands(newLib);
    saveLibrary(newLib);
  };

  const delBrand = (id) => {
    const newLib = brands.filter((b) => b.id !== id);
    setBrands(newLib);
    saveLibrary(newLib);
  };

  const [banInput, setBanInput] = useState("");
  const addBan = () => {
    const w = (banInput || "").trim();
    if (!w) return;
    const list = [...new Set([...(banned || []), w])];
    setBanned(list);
    localStorage.setItem("bannedWords", JSON.stringify(list));
    setBanInput("");
  };
  const delBan = (word) => {
    const list = (banned || []).filter((x) => String(x) !== String(word));
    setBanned(list);
    localStorage.setItem("bannedWords", JSON.stringify(list));
  };

  // === UI ===
  return (
    <div className="container">
      {/* остальной интерфейс без изменений */}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
