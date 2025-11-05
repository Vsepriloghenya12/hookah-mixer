import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// 🔐 Настройки админов и окружения
const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || "504348666,2015942051")
  .split(",")
  .map(s => s.trim());
const DEV_ALLOW_UNSAFE = process.env.DEV_ALLOW_UNSAFE === "true";

// 🗂️ Папка для хранения данных (в Railway — /mnt/data)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 📄 Файлы хранения
const libraryFile = path.join(DATA_DIR, "library.json");
const mixesFile = path.join(DATA_DIR, "mixes.json");

// 🧩 Функции для чтения/записи JSON
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf-8") || "[]");
  } catch (e) {
    console.error("Ошибка чтения JSON:", e);
    return [];
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Ошибка записи JSON:", e);
  }
}

// ⚙️ Инициализация пустых файлов, если нет
if (!fs.existsSync(libraryFile)) writeJSON(libraryFile, []);
if (!fs.existsSync(mixesFile)) writeJSON(mixesFile, []);

// 🧾 Middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 👮 Проверка прав администратора
function isAdmin(req) {
  const id = req.header("x-admin-id");
  return DEV_ALLOW_UNSAFE || (id && ADMIN_TG_IDS.includes(String(id)));
}

// === ROUTES ===

// 📚 Библиотека (бренды и вкусы)
app.get("/api/library", (req, res) => {
  res.json(readJSON(libraryFile));
});

app.post("/api/library", (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "not authorized" });
  writeJSON(libraryFile, req.body || []);
  res.json({ success: true });
});

// 🍹 Миксы
app.get("/api/mixes", (req, res) => {
  res.json(readJSON(mixesFile));
});

app.post("/api/mixes", (req, res) => {
  const data = readJSON(mixesFile);
  const newMix = req.body;
  if (!newMix || !newMix.name)
    return res.status(400).json({ success: false, message: "Invalid mix" });

  newMix.id = Date.now().toString();
  newMix.likes = 0;
  data.push(newMix);
  writeJSON(mixesFile, data);
  res.json({ success: true });
});

// ❤️ Лайк микса
app.post("/api/mixes/:id/like", (req, res) => {
  const data = readJSON(mixesFile);
  const mix = data.find(m => m.id === req.params.id);
  if (!mix) return res.status(404).json({ success: false });
  mix.likes = Math.max(0, (mix.likes || 0) + (req.body.delta || 0));
  writeJSON(mixesFile, data);
  res.json({ success: true, mix });
});

// 🗑️ Удаление микса (только админ)
app.delete("/api/mixes/:id", (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "not authorized" });

  const data = readJSON(mixesFile);
  const updated = data.filter(m => String(m.id) !== String(req.params.id));

  if (updated.length === data.length)
    return res.status(404).json({ success: false, message: "Mix not found" });

  writeJSON(mixesFile, updated);
  res.json({ success: true });
});

// 💾 Прямая загрузка файлов (бэкапы)
app.get("/api/download/library", (req, res) => {
  res.setHeader("Content-Disposition", "attachment; filename=library_backup.json");
  res.setHeader("Content-Type", "application/json");
  res.send(readJSON(libraryFile));
});

app.get("/api/download/mixes", (req, res) => {
  res.setHeader("Content-Disposition", "attachment; filename=mixes_backup.json");
  res.setHeader("Content-Type", "application/json");
  res.send(readJSON(mixesFile));
});

// 🌐 Отдача фронтенда
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Запуск
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});
// Отправить сообщение с кнопкой "Открыть Baby Sleep+" в канал
bot.command('post', async (ctx) => {
  try {
    await ctx.telegram.sendMessage('@твой_канал', '👶 Baby Sleep+', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Открыть Baby Sleep+', url: 'https://t.me/barTooman_bot?start=from_channel' }
        ]]
      }
    });
    await ctx.reply('✅ Сообщение отправлено в канал');
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Ошибка при отправке сообщения');
  }
});
