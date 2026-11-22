(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };

  /* ---------- DATA ---------- */
  const raw = Array.isArray(window.ATM_DICTIONARY) ? window.ATM_DICTIONARY : [];

  // Normaliser used for searching: ignores case, accents and Hausa hooked letters (ɓ ɗ ƙ ƴ)
  const fold = s => String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ɓ/g, "b").replace(/ɗ/g, "d").replace(/ƙ/g, "k").replace(/ƴ/g, "y")
    .replace(/[’‘ʼ`]/g, "'")
    .trim();

  const seen = new Set();
  const words = [];
  raw.forEach((w, i) => {
    const en = String(w.en ?? w.english ?? "").trim();
    const key = en.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const item = {
      id: key,
      oldId: String(w.id ?? i),
      en,
      ha: String(w.ha ?? w.hausa ?? "").trim(),
      type: String(w.type ?? w.pos ?? "word").toLowerCase(),
      level: w.level || "Beginner",
      definition: w.definition ?? w.meaning ?? "",
      exampleEn: w.exampleEn ?? w.example_en ?? "",
      exampleHa: w.exampleHa ?? w.example_ha ?? "",
      synonyms: toArray(w.synonyms),
      antonyms: toArray(w.antonyms),
      tag: w.tag || ""
    };
    item._en = fold(item.en);
    item._ha = fold(item.ha);
    item._extra = fold([item.definition, item.exampleEn, item.exampleHa].join(" "));
    words.push(item);
  });

  function toArray(v) {
    if (Array.isArray(v)) return v;
    return v ? String(v).split(/[,;]/).map(x => x.trim()).filter(Boolean) : [];
  }

  const byId = new Map(words.map(w => [w.id, w]));
  const levels = ["Beginner", "Intermediate", "Advanced"];

  /* ---------- STORAGE ---------- */
  const get = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem("atmDict_" + key));
      return v ?? fallback;
    } catch { return fallback; }
  };
  const set = (key, value) => {
    try { localStorage.setItem("atmDict_" + key, JSON.stringify(value)); }
    catch (e) { console.warn("Could not save:", e); }
  };

  const defaultSettings = { theme: "system", fontSize: "medium", voiceLang: "en", autoSpeak: false, showExamples: true };

  let favorites = get("favorites", []);
  let history = get("history", []);
  let known = get("known", []);
  let best = get("bestScore", 0);
  let settings = Object.assign({}, defaultSettings, get("settings", {}));

  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(history)) history = [];
  if (!Array.isArray(known)) known = [];
  if (settings.voiceLang !== "en" && settings.voiceLang !== "ha") settings.voiceLang = "en";

  // Older versions saved favourites by number; convert them to word ids
  const migrate = list => Array.from(new Set(list.map(id => {
    if (byId.has(id)) return id;
    const w = words.find(x => x.oldId === String(id));
    return w ? w.id : null;
  }).filter(Boolean)));
  favorites = migrate(favorites);
  known = migrate(known);
  set("favorites", favorites);

  /* ---------- STATE ---------- */
  const names = { en: "English", ha: "Hausa" };
  const voices = { en: "en-GB", ha: "ha-NG" };

  let direction = get("direction", "en-ha");
  if (direction !== "en-ha" && direction !== "ha-en") direction = "en-ha";
  let activePage = "search";
  let levelFilter = "all";
  let typeFilter = "all";
  let browseLetter = "A";
  let savedMode = "fav";
  let learnMode = "flash";

  const PAGE = 30;
  const lists = {
    results: { items: [], shown: PAGE, box: "results", more: "resultsMore" },
    browse: { items: [], shown: PAGE, box: "browseList", more: "browseMore", rows: true }
  };

  const pair = () => {
    const [first, second] = direction.split("-");
    return { first, second };
  };

  /* ---------- HELPERS ---------- */
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const regEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function highlight(text, query) {
    const safe = esc(text);
    if (!query) return safe;
    try {
      return safe.replace(new RegExp("(" + regEsc(esc(query)) + ")", "gi"), "<mark>$1</mark>");
    } catch { return safe; }
  }

  let toastTimer;
  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const text = (word, lang) => word[lang] || "";

  /* ---------- SETTINGS ---------- */
  const systemTheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function applySettings() {
    const dark = settings.theme === "dark" || (settings.theme === "system" && systemTheme && systemTheme.matches);
    document.body.dataset.theme = dark ? "dark" : "light";
    document.body.dataset.font = settings.fontSize || "medium";

    if ($("theme")) $("theme").value = settings.theme;
    if ($("fontSize")) $("fontSize").value = settings.fontSize;
    if ($("voiceLang")) $("voiceLang").value = settings.voiceLang;
    if ($("autoSpeak")) $("autoSpeak").checked = !!settings.autoSpeak;
    if ($("showExamples")) $("showExamples").checked = !!settings.showExamples;
    if ($("themeQuick")) $("themeQuick").textContent = dark ? "☀️" : "🌙";

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0d1524" : "#0f2d5c");
  }

  function saveSettings() {
    settings = {
      theme: $("theme").value,
      fontSize: $("fontSize").value,
      voiceLang: $("voiceLang").value,
      autoSpeak: $("autoSpeak").checked,
      showExamples: $("showExamples").checked
    };
    set("settings", settings);
    applySettings();
    refreshActive();
  }

  if (systemTheme) {
    const handler = () => { if (settings.theme === "system") applySettings(); };
    if (systemTheme.addEventListener) systemTheme.addEventListener("change", handler);
    else if (systemTheme.addListener) systemTheme.addListener(handler);
  }

  /* ---------- SPEECH ---------- */
  function speak(content, lang) {
    if (!content) return;
    if (!("speechSynthesis" in window)) { toast("Speech is not supported on this browser."); return; }
    const u = new SpeechSynthesisUtterance(String(content).split(/[,;]/)[0]);
    u.lang = voices[lang] || "en-GB";
    const match = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(lang));
    if (match) u.voice = match;
    else if (lang === "ha") toast("No Hausa voice found on this phone. Install one in your phone's speech settings.");
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  /* ---------- WORD CARD ---------- */
  function card(word, query) {
    const saved = favorites.includes(word.id);
    const { first, second } = pair();
    const firstText = text(word, first);
    const secondText = text(word, second);
    const showEx = settings.showExamples && (word.exampleEn || word.exampleHa);

    return `
      <article class="word-card" data-level="${esc(word.level)}">
        <div class="meta">
          <span class="tag">${esc(word.type)}</span><span class="tag lvl">${esc(word.level)}</span>${word.tag ? `<span class="tag">${esc(word.tag)}</span>` : ""}
        </div>

        <div class="word-head">
          <h2>${highlight(firstText || "—", query)}</h2>
          <button class="speak-btn" data-speak="${esc(firstText)}" data-lang="${first}" aria-label="Pronounce ${esc(firstText)}">🔊</button>
        </div>

        <div class="translation">${highlight(secondText || "Translation not added yet", query)}</div>

        ${word.definition ? `<p class="definition">${esc(word.definition)}</p>` : ""}

        ${showEx ? `
          <div class="example">
            ${word.exampleEn ? `<p>${esc(word.exampleEn)}</p>` : ""}
            ${word.exampleHa ? `<p>${esc(word.exampleHa)}</p>` : ""}
          </div>` : ""}

        ${word.synonyms.length ? `<div class="related"><b>Synonyms:</b> ${esc(word.synonyms.join(", "))}</div>` : ""}
        ${word.antonyms.length ? `<div class="related"><b>Antonyms:</b> ${esc(word.antonyms.join(", "))}</div>` : ""}

        <div class="card-actions">
          <button class="${saved ? "saved" : ""}" data-fav="${esc(word.id)}">${saved ? "♥ Saved" : "♡ Save"}</button>
          <button data-copy="${esc(word.id)}">Copy</button>
          <button data-share="${esc(word.id)}">Share</button>
          <button data-speak="${esc(word.en)}" data-lang="en">🔊 EN</button>
          ${word.ha ? `<button data-speak="${esc(word.ha)}" data-lang="ha">🔊 HA</button>` : ""}
        </div>
      </article>`;
  }

  const row = word => {
    const { first, second } = pair();
    return `<button class="word-row" data-open="${esc(word.id)}">
      <span class="w">${esc(text(word, first))}</span>
      <span class="t">${esc(text(word, second))}</span>
    </button>`;
  };

  const empty = (title, sub) =>
    `<div class="empty"><strong>${esc(title)}</strong>${esc(sub || "")}</div>`;

  /* ---------- PAGINATED LISTS ---------- */
  function paint(name, query) {
    const l = lists[name];
    const box = $(l.box);
    const more = $(l.more);
    if (!box) return;

    const part = l.items.slice(0, l.shown);
    box.innerHTML = part.map(w => l.rows ? row(w) : card(w, query)).join("");

    if (more) {
      more.innerHTML = l.items.length > l.shown
        ? `<button class="secondary-button" data-more="${name}">Show more (${(l.items.length - l.shown).toLocaleString()} left)</button>`
        : "";
    }
  }

  /* ---------- SEARCH ---------- */
  function fieldScore(field, q) {
    if (!field) return 0;
    if (field === q) return 100;
    if (field.startsWith(q)) return 80;
    if (field.split(/[\s,;/()]+/).some(t => t === q)) return 70;
    if (field.split(/[\s,;/()]+/).some(t => t.startsWith(q))) return 60;
    if (field.includes(q)) return 40;
    return 0;
  }

  function passesFilters(w) {
    return (levelFilter === "all" || w.level === levelFilter) &&
           (typeFilter === "all" || w.type === typeFilter);
  }

  let lastQuery = "";

  function search() {
    const input = $("searchInput");
    if (!input) return;

    const raw = input.value.trim();
    const q = fold(raw);
    lastQuery = raw;
    const { first, second } = pair();

    const pool = words.filter(passesFilters);

    const showHome = !q;
    $("dailyWord").hidden = !showHome;
    $("recentSearches").hidden = !showHome;
    $("clearSearch").hidden = !raw;

    if (showHome) {
      $("countLabel").textContent = `${pool.length.toLocaleString()} words ready • works offline`;
      lists.results.items = [];
      $("results").innerHTML = "";
      $("resultsMore").innerHTML = "";
      renderRecent();
      return;
    }

    const found = pool.map(w => {
      const a = fieldScore(w["_" + first], q);
      const b = fieldScore(w["_" + second], q) * 0.7;
      const c = w._extra.includes(q) ? 10 : 0;
      return { w, s: Math.max(a, b, c) };
    }).filter(x => x.s > 0)
      .sort((x, y) => y.s - x.s || x.w.en.length - y.w.en.length)
      .map(x => x.w);

    lists.results.items = found;
    lists.results.shown = PAGE;

    $("countLabel").textContent = found.length
      ? `${found.length.toLocaleString()} result${found.length === 1 ? "" : "s"} for “${raw}”`
      : "No results";

    if (found.length) paint("results", raw);
    else {
      $("results").innerHTML = empty("No matching word found", "Check the spelling, change the level filter, or try the other language direction.");
      $("resultsMore").innerHTML = "";
    }
  }

  let historyTimer;
  function scheduleHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      const q = $("searchInput").value.trim();
      if (q.length >= 2 && lists.results.items.length) addHistory(q);
    }, 1200);
  }

  function addHistory(query) {
    history = [query, ...history.filter(h => h.toLowerCase() !== query.toLowerCase())].slice(0, 100);
    set("history", history);
  }

  function renderRecent() {
    const box = $("recentSearches");
    if (!box) return;
    const recent = history.slice(0, 8);
    box.innerHTML = recent.length
      ? `<p class="recent-title">RECENT SEARCHES</p><div class="recent-chips">${recent.map(r => `<button data-recent="${esc(r)}">${esc(r)}</button>`).join("")}</div>`
      : "";
  }

  /* ---------- DAILY WORD ---------- */
  function renderDailyWord() {
    const box = $("dailyWord");
    if (!box || !words.length) return;
    const d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const w = words[day % words.length];
    box.innerHTML = `
      <div class="meta">Word of the day</div>
      <h2>${esc(w.en)}</h2>
      <p class="ha">${esc(w.ha || "Hausa translation coming soon")}</p>
      ${w.definition ? `<p class="muted">${esc(w.definition)}</p>` : ""}
      ${w.exampleEn ? `<p class="muted">“${esc(w.exampleEn)}”</p>` : ""}
      <div class="card-actions">
        <button data-speak="${esc(w.en)}" data-lang="en">🔊 Listen</button>
        <button data-fav="${esc(w.id)}" class="${favorites.includes(w.id) ? "saved" : ""}">${favorites.includes(w.id) ? "♥ Saved" : "♡ Save"}</button>
      </div>`;
  }

  /* ---------- BROWSE ---------- */
  function firstLetter(w) {
    const { first } = pair();
    const ch = (w["_" + first] || "").charAt(0).toUpperCase();
    return /[A-Z]/.test(ch) ? ch : "#";
  }

  function renderBrowse() {
    const { first } = pair();
    const sorted = words.filter(w => w["_" + first]).sort((a, b) => a["_" + first].localeCompare(b["_" + first]));
    const letters = Array.from(new Set(sorted.map(firstLetter))).sort();
    if (!letters.includes(browseLetter)) browseLetter = letters[0] || "A";

    $("letterStrip").innerHTML = letters.map(l =>
      `<button data-letter="${l}" class="${l === browseLetter ? "active" : ""}">${l}</button>`).join("");

    lists.browse.items = sorted.filter(w => firstLetter(w) === browseLetter);
    lists.browse.shown = PAGE * 2;
    $("browseCount").textContent =
      `${lists.browse.items.length.toLocaleString()} words under “${browseLetter}” • ${names[first]} → ${names[pair().second]}`;
    paint("browse");
  }

  /* ---------- LEARN: FLASHCARDS ---------- */
  let deck = [];
  let flipped = false;
  let deckTotal = 0;

  const learnPool = () => {
    const lvl = $("learnLevel").value;
    return words.filter(w => w.ha && (lvl === "all" || w.level === lvl));
  };

  function newDeck() {
    const pool = learnPool();
    const fresh = pool.filter(w => !known.includes(w.id));
    deck = shuffle(fresh.length ? fresh : pool);
    deckTotal = deck.length;
    flipped = false;
    renderFlash();
  }

  function renderFlash() {
    const area = $("flashArea");
    const pool = learnPool();
    const knownCount = pool.filter(w => known.includes(w.id)).length;
    const pct = pool.length ? Math.round(knownCount / pool.length * 100) : 0;

    if (!deck.length) {
      area.innerHTML = `
        <div class="progress"><div style="width:${pct}%"></div></div>
        <div class="progress-text">${knownCount} of ${pool.length} words learned (${pct}%)</div>
        <p class="quiz-q">🎉 You finished this deck!</p>
        <button class="big-btn primary" data-flash="restart">Start again</button>
        <p><button class="secondary-button" data-flash="reset">Reset learned words</button></p>`;
      return;
    }

    const w = deck[0];
    const { first, second } = pair();
    area.innerHTML = `
      <div class="progress"><div style="width:${pct}%"></div></div>
      <div class="progress-text">${knownCount} of ${pool.length} learned • ${deck.length} left in this round</div>
      <div class="flashcard ${flipped ? "flipped" : ""}" data-flash="flip" role="button" tabindex="0">
        <div class="meta">${esc(w.type)} • ${esc(w.level)}</div>
        <div class="fc-word">${esc(text(w, first))}</div>
        ${flipped
          ? `<div class="fc-ans">${esc(text(w, second))}</div>${w.exampleEn ? `<div class="fc-hint">${esc(w.exampleEn)}</div>` : ""}`
          : `<div class="fc-hint">Tap the card to see the ${names[second]} meaning</div>`}
      </div>
      <p><button class="secondary-button" data-speak="${esc(text(w, first))}" data-lang="${first}">🔊 Listen</button>
         <button class="secondary-button" data-flash="swap">⇄ ${names[first]} first</button></p>
      ${flipped ? `
        <div class="fc-actions">
          <button class="big-btn again" data-flash="again">Still learning</button>
          <button class="big-btn know" data-flash="know">I know it</button>
        </div>` : ""}`;
  }

  function flashAction(action) {
    if (action === "flip") { flipped = !flipped; renderFlash(); return; }
    if (action === "restart") { newDeck(); return; }
    if (action === "swap") {
      direction = direction === "en-ha" ? "ha-en" : "en-ha";
      set("direction", direction); syncDirection(); renderFlash(); return;
    }
    if (action === "reset") {
      known = []; set("known", known); newDeck(); toast("Learned words reset."); return;
    }
    const w = deck.shift();
    if (!w) return;
    if (action === "know") { if (!known.includes(w.id)) known.push(w.id); set("known", known); }
    if (action === "again") deck.push(w);
    flipped = false;
    renderFlash();
  }

  /* ---------- LEARN: QUIZ ---------- */
  const QUIZ_LEN = 10;
  let quiz = null;

  function renderQuizStart() {
    $("quizArea").innerHTML = `
      <p class="quiz-q">🎯 Ready for a ${QUIZ_LEN}-question quiz?</p>
      <div class="stat-row"><span>Best score: <b>${best}/${QUIZ_LEN}</b></span></div>
      <button class="big-btn primary" data-quiz-start="en-ha">English → Hausa</button>
      <p></p>
      <button class="big-btn primary" data-quiz-start="ha-en">Hausa → English</button>
      <p></p>
      <button class="secondary-button" data-quiz-start="mix">Mixed</button>`;
  }

  function startQuiz(mode) {
    const pool = learnPool();
    if (pool.length < 8) {
      $("quizArea").innerHTML = empty("Not enough words", "Choose “All levels” to start a quiz.");
      return;
    }
    const picks = shuffle(pool).slice(0, QUIZ_LEN);
    quiz = { mode, i: 0, score: 0, streak: 0, bestStreak: 0, pool, qs: picks.map(w => {
      const d = mode === "mix" ? (Math.random() < .5 ? "en-ha" : "ha-en") : mode;
      const [from, to] = d.split("-");
      const sameType = pool.filter(x => x.id !== w.id && x.type === w.type);
      const others = shuffle(sameType.length >= 3 ? sameType : pool.filter(x => x.id !== w.id));
      const choices = shuffle([w, ...others.filter(x => text(x, to) !== text(w, to)).slice(0, 3)]);
      return { w, from, to, choices, answered: false };
    }) };
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.qs[quiz.i];
    const pct = quiz.i / QUIZ_LEN * 100;
    $("quizArea").innerHTML = `
      <div class="progress"><div style="width:${pct}%"></div></div>
      <div class="progress-text">Question ${quiz.i + 1} of ${QUIZ_LEN} • Score ${quiz.score} • Streak ${quiz.streak} 🔥</div>
      <div class="quiz-q"><small>What is the ${names[q.to]} for:</small>${esc(text(q.w, q.from))}</div>
      <div class="quiz-options">
        ${q.choices.map(c => `<button class="quiz-option" data-quiz="${esc(c.id)}">${esc(text(c, q.to))}</button>`).join("")}
      </div>
      <div class="quiz-feedback" id="quizFeedback" aria-live="polite"></div>
      <div id="quizNext"></div>`;
  }

  function answerQuiz(id, button) {
    const q = quiz.qs[quiz.i];
    if (q.answered) return;
    q.answered = true;

    const ok = id === q.w.id;
    if (ok) { quiz.score++; quiz.streak++; quiz.bestStreak = Math.max(quiz.bestStreak, quiz.streak); }
    else quiz.streak = 0;

    document.querySelectorAll(".quiz-option").forEach(b => {
      b.disabled = true;
      if (b.dataset.quiz === q.w.id) b.classList.add("correct");
    });
    if (!ok) button.classList.add("wrong");

    $("quizFeedback").textContent = ok
      ? "✅ Correct! Well done."
      : `❌ Not quite. The answer is “${text(q.w, q.to)}”.`;

    const last = quiz.i === QUIZ_LEN - 1;
    $("quizNext").innerHTML = `<button class="big-btn primary" data-quiz-next="1">${last ? "See my score" : "Next question"}</button>`;
  }

  function nextQuiz() {
    quiz.i++;
    if (quiz.i < QUIZ_LEN) { renderQuestion(); return; }

    const newBest = quiz.score > best;
    if (newBest) { best = quiz.score; set("bestScore", best); }
    const msg = quiz.score >= 9 ? "Excellent! 🌟" : quiz.score >= 6 ? "Good job! 👍" : "Keep practising. 💪";
    $("quizArea").innerHTML = `
      <p class="quiz-q">${msg}</p>
      <div class="score-big">${quiz.score}/${QUIZ_LEN}</div>
      <div class="stat-row"><span>Best streak: <b>${quiz.bestStreak}</b></span><span>Best score: <b>${best}/${QUIZ_LEN}</b></span></div>
      ${newBest ? "<p><b>🏆 New best score!</b></p>" : ""}
      <button class="big-btn primary" data-quiz-start="${quiz.mode}">Play again</button>
      <p></p>
      <button class="secondary-button" data-quiz-menu="1">Change quiz type</button>`;
  }

  function setLearnMode(mode) {
    learnMode = mode;
    $("modeFlash").classList.toggle("active", mode === "flash");
    $("modeQuiz").classList.toggle("active", mode === "quiz");
    $("flashArea").hidden = mode !== "flash";
    $("quizArea").hidden = mode !== "quiz";
    if (mode === "flash") newDeck(); else renderQuizStart();
  }

  /* ---------- SAVED ---------- */
  function renderSaved() {
    const box = $("savedList");
    const fav = savedMode === "fav";
    $("savedTabFav").classList.toggle("active", fav);
    $("savedTabHist").classList.toggle("active", !fav);
    $("copyFavs").hidden = !fav;
    $("clearHistory").hidden = fav;

    if (fav) {
      const list = favorites.map(id => byId.get(id)).filter(Boolean);
      box.innerHTML = list.length
        ? list.map(w => card(w)).join("")
        : empty("No saved words yet", "Tap ♡ Save on any word to keep it here.");
    } else {
      box.innerHTML = history.length
        ? `<div class="recent" style="grid-column:1/-1"><div class="recent-chips">${history.map(h => `<button data-recent="${esc(h)}">${esc(h)}</button>`).join("")}</div></div>`
        : empty("No search history yet", "Words you search for will appear here.");
    }
  }

  /* ---------- ABOUT ---------- */
  function renderAbout() {
    const counts = levels.map(l => `${l}: ${words.filter(w => w.level === l).length.toLocaleString()}`).join(" • ");
    $("aboutCard").innerHTML = `
      <h3>About this dictionary</h3>
      <p><b>${words.length.toLocaleString()}</b> English ⇄ Hausa words</p>
      <p>${counts}</p>
      <p>Saved words: ${favorites.length} • Learned: ${known.length}</p>
      <p>Works offline after the first visit. Your saved data stays on this device.</p>`;
  }

  /* ---------- NAVIGATION ---------- */
  function syncDirection() {
    const { first, second } = pair();
    $("dirFrom").textContent = names[first];
    $("dirTo").textContent = names[second];
    $("searchInput").placeholder = first === "en" ? "Type an English word..." : "Rubuta kalmar Hausa...";
  }

  function refreshActive() {
    if (activePage === "search") { search(); renderDailyWord(); }
    else if (activePage === "browse") renderBrowse();
    else if (activePage === "saved") renderSaved();
    else if (activePage === "settings") renderAbout();
  }

  function showPage(page) {
    activePage = page;
    document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + page));
    document.querySelectorAll(".bottom-nav .tab").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    if (page === "learn") setLearnMode(learnMode);
    else refreshActive();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openWord(id) {
    const w = byId.get(id);
    if (!w) return;
    levelFilter = "all"; typeFilter = "all";
    syncFilters();
    showPage("search");
    const { first } = pair();
    $("searchInput").value = text(w, first);
    search();
  }

  function syncFilters() {
    document.querySelectorAll("#levelChips .chip").forEach(c => c.classList.toggle("active", c.dataset.level === levelFilter));
    $("typeFilter").value = typeFilter;
  }

  function hideEmptyLevels() {
    const present = new Set(words.map(w => w.level));
    document.querySelectorAll("#levelChips .chip").forEach(c => {
      if (c.dataset.level !== "all" && !present.has(c.dataset.level)) c.hidden = true;
    });
    document.querySelectorAll("#learnLevel option").forEach(o => {
      if (o.value !== "all" && !present.has(o.value)) o.remove();
    });
  }

  function buildTypeFilter() {
    const types = Array.from(new Set(words.map(w => w.type))).sort();
    $("typeFilter").innerHTML = `<option value="all">All types</option>` +
      types.map(t => `<option value="${esc(t)}">${esc(t.charAt(0).toUpperCase() + t.slice(1))}</option>`).join("");
  }

  /* ---------- EVENTS ---------- */
  document.querySelectorAll(".bottom-nav .tab").forEach(b =>
    b.addEventListener("click", () => showPage(b.dataset.page)));

  on("searchInput", "input", () => { search(); scheduleHistory(); });
  on("searchInput", "keydown", e => {
    if (e.key === "Enter") {
      const q = $("searchInput").value.trim();
      if (q) addHistory(q);
      if (settings.autoSpeak && lists.results.items.length) {
        const lang = settings.voiceLang;
        speak(lists.results.items[0][lang], lang);
      }
      $("searchInput").blur();
    }
  });

  on("clearSearch", "click", () => {
    $("searchInput").value = "";
    search();
    $("searchInput").focus();
  });

  on("swapDir", "click", () => {
    direction = direction === "en-ha" ? "ha-en" : "en-ha";
    set("direction", direction);
    syncDirection();
    refreshActive();
  });

  on("levelChips", "click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    levelFilter = chip.dataset.level;
    syncFilters();
    search();
  });

  on("typeFilter", "change", e => { typeFilter = e.target.value; search(); });

  on("themeQuick", "click", () => {
    settings.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    set("settings", settings);
    applySettings();
  });

  ["theme", "fontSize", "voiceLang", "autoSpeak", "showExamples"].forEach(id => on(id, "change", saveSettings));

  on("resetSettings", "click", () => {
    settings = Object.assign({}, defaultSettings);
    set("settings", settings);
    applySettings();
    refreshActive();
    toast("Settings reset.");
  });

  on("clearAll", "click", () => {
    if (!confirm("Erase your saved words, search history and learning progress on this device?")) return;
    favorites = []; history = []; known = []; best = 0;
    ["favorites", "history", "known", "bestScore"].forEach(k => set(k, k === "bestScore" ? 0 : []));
    refreshActive();
    toast("Saved data erased.");
  });

  on("clearHistory", "click", () => { history = []; set("history", history); renderSaved(); });

  on("savedTabFav", "click", () => { savedMode = "fav"; renderSaved(); });
  on("savedTabHist", "click", () => { savedMode = "hist"; renderSaved(); });

  on("copyFavs", "click", async () => {
    const list = favorites.map(id => byId.get(id)).filter(Boolean);
    if (!list.length) { toast("No saved words to copy."); return; }
    const out = list.map(w => `${w.en} — ${w.ha}`).join("\n");
    try { await navigator.clipboard.writeText(out); toast("List copied."); }
    catch { toast("Could not copy on this browser."); }
  });

  on("modeFlash", "click", () => setLearnMode("flash"));
  on("modeQuiz", "click", () => setLearnMode("quiz"));
  on("learnLevel", "change", () => setLearnMode(learnMode));

  // One listener for all dynamic buttons
  document.addEventListener("click", async e => {
    const t = e.target;
    if (!t.closest) return;

    const fav = t.closest("[data-fav]");
    if (fav) {
      const id = fav.dataset.fav;
      const adding = !favorites.includes(id);
      favorites = adding ? [...favorites, id] : favorites.filter(x => x !== id);
      set("favorites", favorites);
      toast(adding ? "Saved to My Words ♥" : "Removed from My Words");
      if (activePage === "search") { paint("results", lastQuery); renderDailyWord(); }
      else if (activePage === "saved") renderSaved();
      else if (activePage === "settings") renderAbout();
      return;
    }

    const sp = t.closest("[data-speak]");
    if (sp) { speak(sp.dataset.speak, sp.dataset.lang || "en"); return; }

    const cp = t.closest("[data-copy]");
    if (cp) {
      const w = byId.get(cp.dataset.copy);
      if (w) {
        try { await navigator.clipboard.writeText(`${w.en} — ${w.ha}`); toast("Copied."); }
        catch { toast("Could not copy on this browser."); }
      }
      return;
    }

    const sh = t.closest("[data-share]");
    if (sh) {
      const w = byId.get(sh.dataset.share);
      if (!w) return;
      const msg = `${w.en} — ${w.ha}${w.exampleEn ? "\n" + w.exampleEn : ""}\n(ATM English Academy)`;
      if (navigator.share) { try { await navigator.share({ text: msg }); } catch {} }
      else { try { await navigator.clipboard.writeText(msg); toast("Copied to share."); } catch { toast("Sharing is not supported here."); } }
      return;
    }

    const more = t.closest("[data-more]");
    if (more) {
      const name = more.dataset.more;
      lists[name].shown += PAGE * 2;
      paint(name, name === "results" ? lastQuery : "");
      return;
    }

    const letter = t.closest("[data-letter]");
    if (letter) { browseLetter = letter.dataset.letter; renderBrowse(); return; }

    const open = t.closest("[data-open]");
    if (open) { openWord(open.dataset.open); return; }

    const recent = t.closest("[data-recent]");
    if (recent) {
      showPage("search");
      $("searchInput").value = recent.dataset.recent;
      search();
      return;
    }

    const fl = t.closest("[data-flash]");
    if (fl) { flashAction(fl.dataset.flash); return; }

    const qs = t.closest("[data-quiz-start]");
    if (qs) { startQuiz(qs.dataset.quizStart); return; }

    if (t.closest("[data-quiz-menu]")) { renderQuizStart(); return; }
    if (t.closest("[data-quiz-next]")) { nextQuiz(); return; }

    const qa = t.closest("[data-quiz]");
    if (qa && quiz) { answerQuiz(qa.dataset.quiz, qa); }
  });

  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".flashcard")) {
      e.preventDefault();
      flashAction("flip");
    }
  });

  /* ---------- OFFLINE ---------- */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(err => console.warn("Offline registration failed:", err));
    });
  }

  /* ---------- START ---------- */
  buildTypeFilter();
  hideEmptyLevels();
  syncDirection();
  applySettings();
  showPage("search");
  console.log(`ATM English Academy ready: ${words.length} unique entries loaded.`);
})();
