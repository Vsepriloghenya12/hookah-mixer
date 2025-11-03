document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const adminIds = ["504348666"];
  let userData = { id: null, name: "", isAdmin: false };

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

  app.innerHTML = `
    <div id="welcome">
      <h1>Hookah Mix</h1>
      <p>Создавай свои миксы и делись с другими!</p>
      <button id="enterBtn">Войти</button>
    </div>
  `;

  document.getElementById("enterBtn").addEventListener("click", initApp);

  function initApp() {
    app.innerHTML = `
      <div class="tabs">
        <button class="tab-btn" data-tab="library">Библиотека</button>
        <button class="tab-btn" data-tab="builder">Конструктор</button>
        ${userData.isAdmin ? `<button class="tab-btn" data-tab="admin">Админ</button>` : ""}
      </div>
      <div id="content"></div>
    `;

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        openTab(btn.dataset.tab);
      });
    });

    openTab("library");
  }

  function openTab(tab) {
    const content = document.getElementById("content");
    if (tab === "library") renderLibrary(content);
    if (tab === "builder") renderBuilder(content);
    if (tab === "admin") renderAdmin(content);
  }

  let mixes = JSON.parse(localStorage.getItem("mixes") || "[]");
  let brands = JSON.parse(localStorage.getItem("brands") || "[]");
  let flavors = JSON.parse(localStorage.getItem("flavors") || "[]");

  function saveData() {
    localStorage.setItem("mixes", JSON.stringify(mixes));
    localStorage.setItem("brands", JSON.stringify(brands));
    localStorage.setItem("flavors", JSON.stringify(flavors));
  }

  function renderLibrary(container) {
    container.innerHTML = `
      <h2>Библиотека миксов</h2>
      ${mixes.length
        ? mixes
            .map(
              (m, i) => `
          <div class="card">
            <h3>${m.name}</h3>
            <p>Автор: ${m.author || "Аноним"}</p>
            <p>Крепость: ${m.strength}</p>
            <p>Вкусы: ${m.flavors.join(", ")}</p>
            <p>Описание: ${m.taste || "—"}</p>
          </div>
        `
            )
            .join("")
        : "<p>Пока нет миксов 😶</p>"}
    `;
  }

  function renderBuilder(container) {
    container.innerHTML = `
      <h2>Создание микса</h2>
      <div class="card">
        <label>Название микса:</label>
        <input id="mixName" placeholder="Введите название" />

        <label>Выбор вкусов:</label>
        <select id="flavorSelect" multiple size="5">
          ${flavors.map((f) => `<option value="${f.name}">${f.brand} — ${f.name}</option>`).join("")}
        </select>

        <label>Крепость (1–10):</label>
        <input id="mixStrength" type="number" min="1" max="10" value="5" />

        <button id="saveMix">Сохранить микс</button>
      </div>
    `;

    document.getElementById("saveMix").addEventListener("click", () => {
      const name = document.getElementById("mixName").value.trim();
      const selected = Array.from(document.getElementById("flavorSelect").selectedOptions).map((o) => o.value);
      const strength = parseInt(document.getElementById("mixStrength").value);

      if (!name || !selected.length) return alert("Заполните все поля!");

      const taste = getDominantTaste(selected);

      const mix = {
        name,
        author: userData.name || "Аноним",
        flavors: selected,
        strength,
        taste,
      };

      mixes.push(mix);
      saveData();
      alert("Микс сохранён!");
    });
  }

  function getDominantTaste(selected) {
    const counts = {};
    selected.forEach((f) => {
      const fl = flavors.find((x) => x.name === f);
      if (fl) counts[fl.taste] = (counts[fl.taste] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "сбалансированный";
  }

  function renderAdmin(container) {
    container.innerHTML = `
      <h2>Админ-панель</h2>
      <div class="card">
        <h3>Добавить бренд</h3>
        <input id="newBrand" placeholder="Название бренда" />
        <button id="addBrand">Добавить</button>
        <div>${brands.map((b) => `<p>${b}</p>`).join("")}</div>
      </div>

      <div class="card">
        <h3>Добавить вкус</h3>
        <input id="newFlavor" placeholder="Название вкуса" />
        <select id="brandSelect">
          ${brands.map((b) => `<option value="${b}">${b}</option>`).join("")}
        </select>
        <select id="tasteSelect">
          <option>сладкий</option>
          <option>свежий</option>
          <option>десертный</option>
          <option>кислый</option>
          <option>пряный</option>
          <option>чайный</option>
          <option>алкогольный</option>
          <option>травяной</option>
        </select>
        <button id="addFlavor">Добавить вкус</button>
      </div>
    `;

    document.getElementById("addBrand").addEventListener("click", () => {
      const brand = document.getElementById("newBrand").value.trim();
      if (!brand) return;
      brands.push(brand);
      saveData();
      renderAdmin(container);
    });

    document.getElementById("addFlavor").addEventListener("click", () => {
      const name = document.getElementById("newFlavor").value.trim();
      const brand = document.getElementById("brandSelect").value;
      const taste = document.getElementById("tasteSelect").value;

      if (!name) return;
      flavors.push({ name, brand, taste });
      saveData();
      renderAdmin(container);
    });
  }
});
