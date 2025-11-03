document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const adminIds = ["504348666"];
  let userData = { id: null, name: "", isAdmin: false };

  // === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();
    const user = tg.initDataUnsafe?.user;
    if (user) {
      userData = {
        id: user.id.toString(),
        name: `${user.first_name || ""} ${user.last_name || ""}`,
        isAdmin: adminIds.includes(user.id.toString()),
      };
    }
  }

  // === ФОН И ДЫМ ===
  const bg = document.createElement("div");
  bg.className = "smoke-layer";
  const bg2 = document.createElement("div");
  bg2.className = "smoke-layer";
  document.body.prepend(bg, bg2);

  // === НАЧАЛЬНЫЙ ЭКРАН ===
  app.innerHTML = `
    <div id="welcome">
      <h1>🍃 Кальянный Миксер</h1>
      <p>Создавай свои уникальные вкусы и сохраняй их в библиотеке!</p>
      <button id="enterApp">Войти</button>
    </div>
  `;
  document.getElementById("enterApp").onclick = loadMainApp;

  // === ОСНОВНОЙ ИНТЕРФЕЙС ===
  function loadMainApp() {
    app.innerHTML = `
      <header style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#c2955d;">🍃 Кальянный Миксер</h2>
      </header>

      <div class="tabs">
        <button class="tab-btn" data-tab="mixes"><span>📚</span> Миксы</button>
        <button class="tab-btn" data-tab="builder"><span>⚗️</span> Конструктор</button>
        ${userData.isAdmin ? `<button class="tab-btn" data-tab="admin"><span>🛠️</span> Админ</button>` : ""}
      </div>

      <div id="content"></div>
      <footer><p>Лаунж-дизайн • версия 2025</p></footer>
    `;

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => openTab(btn.dataset.tab));
    });

    openTab("mixes");
  }

  // === ДИНАМИКА ДЫМА ===
  function triggerSmoke() {
    document.querySelectorAll(".smoke-layer").forEach(el => {
      el.classList.remove("pulse-smoke");
      void el.offsetWidth;
      el.classList.add("pulse-smoke");
    });
  }

  // === ВКЛАДКИ ===
  function openTab(tab) {
    const c = document.getElementById("content");
    if (tab === "mixes") renderMixes(c);
    if (tab === "builder") renderBuilder(c);
    if (tab === "admin") renderAdmin(c);
  }

  // === ДАННЫЕ ===
  let mixes = JSON.parse(localStorage.getItem("mixes") || "[]");
  let brands = JSON.parse(localStorage.getItem("brands") || "[]");
  let flavors = JSON.parse(localStorage.getItem("flavors") || "[]");

  function saveData() {
    localStorage.setItem("mixes", JSON.stringify(mixes));
    localStorage.setItem("brands", JSON.stringify(brands));
    localStorage.setItem("flavors", JSON.stringify(flavors));
  }

  // === ВКЛАДКА МИКСЫ ===
  function renderMixes(container) {
    container.innerHTML = `
      <div class="grid">
        ${mixes.length
          ? mixes.map(
              (m, i) => `
          <div class="card">
            <h3>${m.name}</h3>
            <p>Автор: ${m.author || "Аноним"}</p>
            <span class="badge ${tasteClass(m.taste)}">${m.taste}</span>
            <p>Крепость: ${m.strength}</p>
            <p>Вкусы: ${m.flavors.join(", ")}</p>
            <div style="text-align:right;">
              <span class="like-btn" data-i="${i}">❤ ${m.likes || 0}</span>
            </div>
          </div>`
            ).join("")
          : `<p style="text-align:center;">Пока нет миксов 😶</p>`}
      </div>
    `;

    container.querySelectorAll(".like-btn").forEach(btn =>
      btn.addEventListener("click", e => {
        const i = e.target.dataset.i;
        mixes[i].likes = (mixes[i].likes || 0) + 1;
        saveData();
        triggerSmoke();
        renderMixes(container);
      })
    );
  }

  // === ВКЛАДКА КОНСТРУКТОР ===
  function renderBuilder(container) {
    container.innerHTML = `
      <div class="card">
        <h3>Собери свой микс</h3>
        <label>Название микса:</label>
        <input id="mixName" placeholder="Например: Ночной бриз">
        <label>Выбери вкусы:</label>
        <select id="flavorSelect" multiple size="5">
          ${flavors.map(f => `<option value="${f.name}">${f.brand} — ${f.name}</option>`).join("")}
        </select>
        <label>Крепость:</label>
        <input id="mixStrength" type="number" min="1" max="10" value="5">
        <button id="saveMix" class="btn" style="margin-top:12px;">Сохранить микс</button>
      </div>
    `;

    document.getElementById("saveMix").onclick = () => {
      const name = document.getElementById("mixName").value.trim();
      const selected = Array.from(document.getElementById("flavorSelect").selectedOptions).map(o => o.value);
      const strength = parseInt(document.getElementById("mixStrength").value);

      if (!name || !selected.length) return alert("Заполни все поля!");
      const taste = getDominantTaste(selected);

      mixes.push({
        name,
        author: userData.name || "Аноним",
        flavors: selected,
        strength,
        taste,
        likes: 0,
      });

      saveData();
      alert("Микс сохранён!");
    };
  }

  function getDominantTaste(selected) {
    const counts = {};
    selected.forEach(f => {
      const fl = flavors.find(x => x.name === f);
      if (!fl) return;
      counts[fl.taste] = (counts[fl.taste] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "сбалансированный";
  }

  function tasteClass(t) {
    const map = {
      сладкий: "badge-sweet",
      свежий: "badge-fresh",
      десертный: "badge-dessert",
      кислый: "badge-sour",
      пряный: "badge-spicy",
      чайный: "badge-tea",
      алкогольный: "badge-alco",
      травяной: "badge-herb",
    };
    return map[t] || "badge";
  }

  // === ВКЛАДКА АДМИН ===
  function renderAdmin(container) {
    container.innerHTML = `
      <div class="grid">
        <div class="card">
          <h3>Добавить бренд</h3>
          <input id="newBrand" placeholder="Название бренда">
          <button id="addBrand">Добавить</button>
          <div>${brands.map(b => `<div>${b}</div>`).join("")}</div>
        </div>
        <div class="card">
          <h3>Добавить вкус</h3>
          <input id="newFlavorName" placeholder="Название вкуса">
          <select id="brandSelect">
            ${brands.map(b => `<option>${b}</option>`).join("")}
          </select>
          <select id="tasteSelect">
            <option>сладкий</option><option>свежий</option><option>десертный</option>
            <option>кислый</option><option>пряный</option><option>чайный</option>
            <option>алкогольный</option><option>травяной</option>
          </select>
          <button id="addFlavor">Добавить</button>
        </div>
      </div>
    `;

    document.getElementById("addBrand").onclick = () => {
      const name = document.getElementById("newBrand").value.trim();
      if (!name) return;
      brands.push(name);
      saveData();
      renderAdmin(container);
    };

    document.getElementById("addFlavor").onclick = () => {
      const name = document.getElementById("newFlavorName").value.trim();
      const brand = document.getElementById("brandSelect").value;
      const taste = document.getElementById("tasteSelect").value;
      if (!name) return;
      flavors.push({ name, brand, taste });
      saveData();
      renderAdmin(container);
    };
  }
});
