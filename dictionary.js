
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const on = (id, event, fn) => {
    const el = $(id);
    if (el) el.addEventListener(event, fn);
  };

  // LOAD DICTIONARY DATA
  const raw = Array.isArray(window.ATM_DICTIONARY)
    ? window.ATM_DICTIONARY
    : [];

  // NORMALISE DATA AND REMOVE DUPLICATES
  const seen = new Set();

  const words = raw.map((w, i) => ({
    id: String(w.id ?? i),
    en: String(w.en ?? w.english ?? "").trim(),
    ha: String(w.ha ?? w.hausa ?? "").trim(),
    ar: String(w.ar ?? w.arabic ?? "").trim(),
    type: w.type ?? w.pos ?? "Word",
    definition: w.definition ?? w.meaning ?? "",
    definitionHa: w.definitionHa ?? "",
    definitionAr: w.definitionAr ?? "",
    exampleEn: w.exampleEn ?? w.example_en ?? "",
    exampleHa: w.exampleHa ?? w.example_ha ?? "",
    exampleAr: w.exampleAr ?? w.example_ar ?? "",
    synonyms: w.synonyms ?? [],
    antonyms: w.antonyms ?? [],
    level: w.level ?? "Beginner"
  })).filter(w => {
    const key = w.en.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // LOCAL STORAGE
  function get(key, fallback) {
    try {
      const value = JSON.parse(
        localStorage.getItem("atmDict_" + key)
      );
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(
        "atmDict_" + key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn("Could not save dictionary data:", error);
    }
  }

  let favorites = get("favorites", []);
  let history = get("history", []);

  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(history)) history = [];

  let settings = get("settings", {
    theme: "system",
    fontSize: "medium",
    voiceLang: "en",
    autoSpeak: false
  });

  let direction = "en-ha";
  let activePage = "search";

  // LANGUAGES
  const languages = {
    en: { name: "English", voice: "en-GB" },
    ha: { name: "Hausa", voice: "ha-NG" },
    ar: { name: "Arabic", voice: "ar-SA" }
  };

  function languagePair() {
    const parts = direction.split("-");
    return {
      first: parts[0] || "en",
      second: parts[1] || "ha"
    };
  }

  function languageText(word, lang) {
    return word[lang] || "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function arr(value) {
    return Array.isArray(value)
      ? value
      : value
        ? String(value).split(/[,;]/).map(x => x.trim()).filter(Boolean)
        : [];
  }

  function rtl(lang) {
    return lang === "ar"
      ? 'dir="rtl" lang="ar" class="arabic-text"'
      : "";
  }

  // SETTINGS AND SYSTEM THEME
  const systemTheme = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function applySettings() {
    const dark = settings.theme === "dark" ||
      (settings.theme === "system" &&
        systemTheme &&
        systemTheme.matches);

    document.body.dataset.theme = dark ? "dark" : "light";
    document.body.dataset.font = settings.fontSize || "medium";

    if ($("theme")) $("theme").value = settings.theme || "system";
    if ($("fontSize")) $("fontSize").value = settings.fontSize || "medium";
    if ($("voiceLang")) $("voiceLang").value = settings.voiceLang || "en";
    if ($("autoSpeak")) $("autoSpeak").checked = !!settings.autoSpeak;

    if ($("themeQuick")) {
      $("themeQuick").textContent = dark ? "☀" : "☾";
    }
  }

  function saveSettings() {
    settings = {
      theme: $("theme")?.value || "system",
      fontSize: $("fontSize")?.value || "medium",
      voiceLang: $("voiceLang")?.value || "en",
      autoSpeak: !!$("autoSpeak")?.checked
    };

    set("settings", settings);
    applySettings();
  }

  // AUTOMATICALLY FOLLOW PHONE SYSTEM THEME
  if (systemTheme) {
    const handleSystemThemeChange = () => {
      if (settings.theme === "system") {
        applySettings();
      }
    };

    if (systemTheme.addEventListener) {
      systemTheme.addEventListener("change", handleSystemThemeChange);
    } else if (systemTheme.addListener) {
      systemTheme.addListener(handleSystemThemeChange);
    }
  }

  // PRONUNCIATION
  function speak(text, lang) {
    if (!text || !("speechSynthesis" in window)) {
      alert("Speech is not supported by this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languages[lang]?.voice || "en-GB";

    const voices = speechSynthesis.getVoices();
    const matchingVoice = voices.find(v =>
      v.lang.toLowerCase().startsWith(lang)
    );

    if (matchingVoice) utterance.voice = matchingVoice;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  // WORD CARD
  function card(word) {
    const saved = favorites.includes(word.id);
    const pair = languagePair();

    const firstText = languageText(word, pair.first);
    const secondText = languageText(word, pair.second);

    return `
      <article class="word-card">
        <div class="meta">
          ${escapeHtml(word.type)}
          ${word.level ? " · " + escapeHtml(word.level) : ""}
        </div>

        <div class="word-language">
          <h2 ${rtl(pair.first)}>
            ${escapeHtml(firstText || "Translation not added yet")}
          </h2>

          <button class="speak-btn"
            data-speak="${escapeHtml(firstText)}"
            data-lang="${pair.first}"
            ${firstText ? "" : "disabled"}>
            🔊 ${escapeHtml(languages[pair.first].name)}
          </button>
        </div>

        <div class="translation" ${rtl(pair.second)}>
          ${escapeHtml(secondText || "Translation not added yet")}
        </div>

        <div class="all-translations">
          <div><b>English:</b> ${escapeHtml(word.en || "—")}</div>
          <div><b>Hausa:</b> ${escapeHtml(word.ha || "Ba a ƙara ba")}</div>
          <div ${rtl("ar")}><b>العربية:</b> ${escapeHtml(word.ar || "لم تُضف الترجمة بعد")}</div>
        </div>

        ${word.definition ? `
          <p class="definition">
            <b>Meaning:</b> ${escapeHtml(word.definition)}
          </p>` : ""}

        ${word.definitionAr ? `
          <p class="definition arabic-text" dir="rtl">
            ${escapeHtml(word.definitionAr)}
          </p>` : ""}

        ${(word.exampleEn || word.exampleHa || word.exampleAr) ? `
          <div class="example">
            <b>Example sentences</b>
            ${word.exampleEn ? `<p>${escapeHtml(word.exampleEn)}</p>` : ""}
            ${word.exampleHa ? `<p>${escapeHtml(word.exampleHa)}</p>` : ""}
            ${word.exampleAr ? `<p class="arabic-text" dir="rtl">${escapeHtml(word.exampleAr)}</p>` : ""}
          </div>` : ""}

        ${arr(word.synonyms).length ? `
          <div class="tags">
            <b>Synonyms:</b>
            ${escapeHtml(arr(word.synonyms).join(", "))}
          </div>` : ""}

        ${arr(word.antonyms).length ? `
          <div class="tags">
            <b>Antonyms:</b>
            ${escapeHtml(arr(word.antonyms).join(", "))}
          </div>` : ""}

        <div class="card-actions">
          <button class="${saved ? "saved" : ""}"
            data-fav="${escapeHtml(word.id)}">
            ${saved ? "♥ Saved" : "♡ Save"}
          </button>

          <button data-speak="${escapeHtml(word.en)}" data-lang="en">
            🔊 English
          </button>

          ${word.ha ? `
            <button data-speak="${escapeHtml(word.ha)}" data-lang="ha">
              🔊 Hausa
            </button>` : ""}

          ${word.ar ? `
            <button data-speak="${escapeHtml(word.ar)}" data-lang="ar">
              🔊 Arabic
            </button>` : ""}
        </div>
      </article>
    `;
  }

  function empty(message) {
    return `<div class="empty">${escapeHtml(message)}</div>`;
  }

  // SEARCH HISTORY
  function addHistory(query) {
    history = [
      query,
      ...history.filter(
        item => item.toLowerCase() !== query.toLowerCase()
      )
    ].slice(0, 100);

    set("history", history);
  }

  // SEARCH ALL THREE LANGUAGES
  function search() {
    const input = $("searchInput");
    if (!input || !$("results")) return;

    const query = input.value.trim().toLowerCase();

    if ($("countLabel")) {
      $("countLabel").textContent =
        `${words.length.toLocaleString()} unique words loaded`;
    }

    if (!query) {
      $("results").innerHTML =
        empty("Search in English, Hausa or Arabic.");
      return;
    }

    const pair = languagePair();

    const found = words.filter(word => {
      const fields = [
        word.en, word.ha, word.ar,
        word.definition, word.definitionHa, word.definitionAr,
        word.exampleEn, word.exampleHa, word.exampleAr
      ];

      return fields.some(value =>
        String(value || "").toLowerCase().includes(query)
      );
    }).sort((a, b) => {
      const aExact =
        [a[pair.first], a[pair.second], a.en, a.ha, a.ar]
          .some(v => String(v || "").toLowerCase() === query);

      const bExact =
        [b[pair.first], b[pair.second], b.en, b.ha, b.ar]
          .some(v => String(v || "").toLowerCase() === query);

      return Number(bExact) - Number(aExact);
    }).slice(0, 80);

    $("results").innerHTML = found.length
      ? found.map(card).join("")
      : empty("No matching word found in the installed dictionary.");

    if (settings.autoSpeak && found.length) {
      const lang = settings.voiceLang || "en";
      speak(found[0][lang], lang);
    }
  }

  // ALL WORDS
  function renderAllWords() {
    if (!$("allWordsList")) return;

    const query = ($("allWordsSearch")?.value || "")
      .trim().toLowerCase();

    const list = words.filter(word => {
      const fields = [
        word.en, word.ha, word.ar,
        word.definition, word.exampleEn,
        word.exampleHa, word.exampleAr
      ];

      return !query || fields.some(value =>
        String(value || "").toLowerCase().includes(query)
      );
    }).sort((a, b) => a.en.localeCompare(b.en));

    if ($("allWordsCount")) {
      $("allWordsCount").textContent =
        `${list.length} of ${words.length} unique words`;
    }

    $("allWordsList").innerHTML = list.length
      ? list.map(card).join("")
      : empty("No matching words found.");
  }

  // FAVOURITES AND HISTORY
  function renderSaved() {
    const isFavorites = activePage === "favorites";

    const list = isFavorites
      ? words.filter(word => favorites.includes(word.id))
      : history.map(query => {
          const q = query.toLowerCase();
          return words.find(word =>
            [word.en, word.ha, word.ar].some(value =>
              String(value || "").toLowerCase().includes(q)
            )
          );
        }).filter(Boolean);

    const target = isFavorites ? "favoriteList" : "historyList";

    if ($(target)) {
      $(target).innerHTML = list.length
        ? list.map(card).join("")
        : empty(isFavorites
          ? "You have not saved any words yet."
          : "No search history yet.");
    }
  }

  // PAGE NAVIGATION
function showPage(page) {
  activePage = page;

  document.querySelectorAll(".page").forEach(element => {
    element.classList.toggle(
      "active",
      element.id === "page-" + page
    );
  });

  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  if (page === "allwords") renderAllWords();

  if (page === "favorites" || page === "history") {
    renderSaved();
  }
}

  // DAILY WORD
  function renderDailyWord() {
    const target = $("dailyWord");
    if (!target || !words.length) return;

    const today = new Date();
    const dayNumber = Math.floor(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) /
      86400000
    );

    const word = words[dayNumber % words.length];

    target.innerHTML = `
      <div class="meta">WORD OF THE DAY</div>
      <h2>${escapeHtml(word.en)}</h2>
      <p>${escapeHtml(word.ha || "Hausa translation coming soon")}</p>
      <p class="arabic-text" dir="rtl">
        ${escapeHtml(word.ar || "الترجمة العربية قريباً")}
      </p>
      <p>${escapeHtml(word.definition)}</p>
    `;
  }

  // QUIZ
  let quizAnswer = null;

  function startQuiz() {
    const question = $("quizQuestion");
    const options = $("quizOptions");
    const feedback = $("quizFeedback");

    if (!question || !options) return;

    const available = words.filter(word => word.en && word.ha);

    if (available.length < 4) {
      question.textContent = "More vocabulary is needed for this quiz.";
      return;
    }

    const correct = available[
      Math.floor(Math.random() * available.length)
    ];

    const choices = [correct];

    while (choices.length < 4) {
      const candidate = available[
        Math.floor(Math.random() * available.length)
      ];

      if (!choices.some(item => item.id === candidate.id)) {
        choices.push(candidate);
      }
    }

    choices.sort(() => Math.random() - 0.5);
    quizAnswer = correct.id;

    question.textContent =
      `What is the Hausa meaning of "${correct.en}"?`;

    options.innerHTML = choices.map(word => `
      <button class="quiz-option" data-quiz="${escapeHtml(word.id)}">
        ${escapeHtml(word.ha)}
      </button>
    `).join("");

    if (feedback) feedback.textContent = "";
  }

  // NAVIGATION EVENTS
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  // SEARCH EVENTS
  on("searchInput", "input", search);

  on("searchInput", "change", () => {
    const query = $("searchInput")?.value.trim();
    if (query) addHistory(query);
  });

  on("allWordsSearch", "input", renderAllWords);

  on("direction", "change", event => {
    direction = event.target.value;
    search();
    renderAllWords();

    if (activePage === "favorites" || activePage === "history") {
      renderSaved();
    }
  });

  on("clearSearch", "click", () => {
    if ($("searchInput")) {
      $("searchInput").value = "";
      search();
      $("searchInput").focus();
    }
  });

  // QUICK THEME SWITCH
  on("themeQuick", "click", () => {
    settings.theme =
      document.body.dataset.theme === "dark" ? "light" : "dark";

    set("settings", settings);
    applySettings();
  });

  // SETTINGS EVENTS
  ["theme", "fontSize", "voiceLang", "autoSpeak"].forEach(id => {
    on(id, "change", saveSettings);
  });

  on("resetSettings", "click", () => {
    settings = {
      theme: "system",
      fontSize: "medium",
      voiceLang: "en",
      autoSpeak: false
    };

    set("settings", settings);
    applySettings();
  });

  // CLEAR HISTORY
  on("clearHistory", "click", () => {
    history = [];
    set("history", history);
    renderSaved();
  });

  // QUIZ EVENT
  on("quizStart", "click", startQuiz);

  // CARD BUTTONS AND QUIZ ANSWERS
  document.addEventListener("click", event => {
    const target = event.target;
    if (!target.closest) return;

    const fav = target.closest("[data-fav]");

    if (fav) {
      const id = fav.dataset.fav;

      favorites = favorites.includes(id)
        ? favorites.filter(item => item !== id)
        : [...favorites, id];

      set("favorites", favorites);

      if (activePage === "search") search();
      else if (activePage === "allwords") renderAllWords();
      else renderSaved();

      return;
    }

    const speakButton = target.closest("[data-speak]");

    if (speakButton) {
      speak(
        speakButton.dataset.speak,
        speakButton.dataset.lang || "en"
      );
      return;
    }

    const quizButton = target.closest("[data-quiz]");

    if (quizButton && quizAnswer !== null) {
      const feedback = $("quizFeedback");
      const correct = quizButton.dataset.quiz === quizAnswer;

      if (feedback) {
        feedback.textContent = correct
          ? "Correct! Well done."
          : "Not correct. Try another question.";
      }

      document.querySelectorAll("[data-quiz]").forEach(button => {
        button.disabled = true;
      });
    }
  });

  // OFFLINE SUPPORT
  if ("serviceWorker" in navigator &&
      location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.warn("Offline registration failed:", error);
      });
    });
  }

  // START APPLICATION
applySettings();
showPage("search");
search();
renderDailyWord();

  console.log(
    `ATM English Academy ready: ${words.length} unique entries loaded.`
  );
})();
  
