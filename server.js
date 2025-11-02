import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
const LIB_PATH = path.join(DATA_DIR, "library.json");
const MIX_PATH = path.join(DATA_DIR, "mixes.json");

// --- Utility functions ---
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// --- Initialize data files if missing ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(LIB_PATH)) writeJSON(LIB_PATH, { brands: [] });
if (!fs.existsSync(MIX_PATH)) writeJSON(MIX_PATH, []);

// --- LIBRARY API ---

// get all brands and flavors
app.get("/api/library", (req, res) => {
  res.json(readJSON(LIB_PATH, { brands: [] }));
});

// add brand or flavor
app.post("/api/library", (req, res) => {
  const data = req.body;
  const lib = readJSON(LIB_PATH, { brands: [] });

  // add new brand
  if (data.action === "addBrand" && data.name) {
    if (lib.brands.some(b => b.name === data.name)) {
      return res.status(400).json({ error: "Бренд уже существует" });
    }
    lib.brands.push({ name: data.name, flavors: [] });
    writeJSON(LIB_PATH, lib);
    return res.json({ ok: true });
  }

  // add new flavor
  if (data.action === "addFlavor" && data.brand && data.flavor) {
    const brand = lib.brands.find(b => b.name === data.brand);
    if (!brand) return res.status(400).json({ error: "Бренд не найден" });
    const newId = Date.now();
    brand.flavors.push({ id: newId, ...data.flavor });
    writeJSON(LIB_PATH, lib);
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Неверный запрос" });
});

// delete flavor
app.delete("/api/library/:brand/:id", (req, res) => {
  const { brand, id } = req.params;
  const lib = readJSON(LIB_PATH, { brands: [] });
  const b = lib.brands.find(x => x.name === brand);
  if (!b) return res.status(404).json({ error: "Бренд не найден" });
  b.flavors = b.flavors.filter(f => f.id != id);
  writeJSON(LIB_PATH, lib);
  res.json({ ok: true });
});

// --- MIXES API ---

// get all mixes
app.get("/api/mixes", (req, res) => {
  res.json(readJSON(MIX_PATH, []));
});

// add new mix
app.post("/api/mixes", (req, res) => {
  const mixes = readJSON(MIX_PATH, []);
  const data = req.body;
  const id = Date.now();
  mixes.push({ id, likes: [], ...data });
  writeJSON(MIX_PATH, mixes);
  res.json({ ok: true });
});

// delete mix (admin)
app.delete("/api/mixes/:id", (req, res) => {
  const { id } = req.params;
  const mixes = readJSON(MIX_PATH, []);
  const newList = mixes.filter(m => m.id != id);
  writeJSON(MIX_PATH, newList);
  res.json({ ok: true });
});

// like/unlike mix
app.post("/api/mixes/:id/like", (req, res) => {
  const { id } = req.params;
  const { user } = req.body;
  if (!user) return res.status(400).json({ error: "user required" });

  const mixes = readJSON(MIX_PATH, []);
  const mix = mixes.find(m => m.id == id);
  if (!mix) return res.status(404).json({ error: "mix not found" });

  mix.likes = mix.likes || [];
  if (mix.likes.includes(user))
    mix.likes = mix.likes.filter(u => u !== user);
  else mix.likes.push(user);

  writeJSON(MIX_PATH, mixes);
  res.json({ ok: true, likes: mix.likes.length });
});

// --- Serve frontend ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start server ---
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
