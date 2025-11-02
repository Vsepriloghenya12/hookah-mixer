import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
const LIB_PATH = path.join(DATA_DIR, "library.json");
const MIX_PATH = path.join(DATA_DIR, "mixes.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(LIB_PATH)) fs.writeFileSync(LIB_PATH, JSON.stringify({ brands: [] }, null, 2));
if (!fs.existsSync(MIX_PATH)) fs.writeFileSync(MIX_PATH, JSON.stringify([], null, 2));

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// ---------- LIBRARY ----------
app.get("/api/library", (req, res) => {
  res.json(readJSON(LIB_PATH, { brands: [] }));
});

app.post("/api/library", (req, res) => {
  const data = req.body;
  const lib = readJSON(LIB_PATH, { brands: [] });

  // Add brand
  if (data.action === "addBrand" && data.name) {
    if (lib.brands.find(b => b.name === data.name)) {
      return res.status(400).json({ error: "Бренд уже существует" });
    }
    lib.brands.push({ name: data.name, flavors: [] });
    writeJSON(LIB_PATH, lib);
    return res.json({ ok: true });
  }

  // Add flavor
  if (data.action === "addFlavor" && data.brand && data.flavor) {
    const brand = lib.brands.find(b => b.name === data.brand);
    if (!brand) return res.status(400).json({ error: "Бренд не найден" });

    if (!brand.flavors) brand.flavors = [];
    const duplicate = brand.flavors.find(f => f.title === data.flavor.title);
    if (duplicate) return res.status(400).json({ error: "Такой вкус уже есть" });

    const newId = Date.now();
    brand.flavors.push({ id: newId, ...data.flavor });

    try {
      writeJSON(LIB_PATH, lib);
    } catch (err) {
      console.error("Ошибка записи:", err);
      return res.status(500).json({ error: "Ошибка записи файла" });
    }
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Неверный запрос" });
});

app.delete("/api/library/:brand/:id", (req, res) => {
  const { brand, id } = req.params;
  const lib = readJSON(LIB_PATH, { brands: [] });
  const b = lib.brands.find(x => x.name === brand);
  if (!b) return res.status(404).json({ error: "Бренд не найден" });
  b.flavors = b.flavors.filter(f => f.id != id);
  writeJSON(LIB_PATH, lib);
  res.json({ ok: true });
});

// ---------- MIXES ----------
app.get("/api/mixes", (req, res) => {
  res.json(readJSON(MIX_PATH, []));
});

app.post("/api/mixes", (req, res) => {
  const mixes = readJSON(MIX_PATH, []);
  const data = req.body;
  const id = Date.now();
  mixes.push({ id, likes: [], ...data });
  writeJSON(MIX_PATH, mixes);
  res.json({ ok: true });
});

app.delete("/api/mixes/:id", (req, res) => {
  const { id } = req.params;
  const mixes = readJSON(MIX_PATH, []);
  const newList = mixes.filter(m => m.id != id);
  writeJSON(MIX_PATH, newList);
  res.json({ ok: true });
});

app.post("/api/mixes/:id/like", (req, res) => {
  const { id } = req.params;
  const { user } = req.body;
  if (!user) return res.status(400).json({ error: "user required" });

  const mixes = readJSON(MIX_PATH, []);
  const mix = mixes.find(m => m.id == id);
  if (!mix) return res.status(404).json({ error: "mix not found" });

  mix.likes = mix.likes || [];
  if (mix.likes.includes(user)) mix.likes = mix.likes.filter(u => u !== user);
  else mix.likes.push(user);

  writeJSON(MIX_PATH, mixes);
  res.json({ ok: true, likes: mix.likes.length });
});

// ---------- Frontend ----------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
