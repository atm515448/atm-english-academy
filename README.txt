ATM ENGLISH ACADEMY - ENGLISH <-> HAUSA DICTIONARY (new version)

WHAT CHANGED
- Arabic has been removed completely (screens, search, quiz, pronunciation, data file, manifest).
- New look: search card with language switch (English <-> Hausa), level and type filters,
  bottom navigation, dark mode, text size setting, new app icon.
- Search is smarter: best matches first, finds Hausa words even if you type b, d, k instead of the hooked letters.
- Browse A-Z, Flashcards ("I know it" / "Still learning"), 10-question Quiz (English->Hausa, Hausa->English, mixed) with score, streak and best score.
- My Words: saved favourites (Copy list) and search history. Copy and Share buttons on every word.
- 995 new difficult words with Hausa meanings added (dictionary-words-1000.js).
  Total: 1,128 words.

FILES (upload ALL of them to the same folder / repository root)
- dictionary.html, dictionary.css, dictionary.js
- dictionary-data.js, dictionary-extra-batch-1.js, dictionary-words-1000.js
- sw.js, manifest.webmanifest, icon.svg, icon-192.png, icon-512.png

HOW TO UPDATE ON GITHUB
1. Open your atm-english-academy repository, then Add file > Upload files.
2. Upload every file listed above (replace the old ones).
3. DELETE the old file dictionary-arabic-batch-1.js (it is no longer used).
4. Commit, wait for GitHub Pages to publish, open dictionary.html once online.
   The app then works offline. If you still see the old version, close and reopen the page once.

ADDING MORE WORDS LATER
Add entries to dictionary-data.js in this format (type and level are optional):
{ "en": "word", "ha": "Hausa meaning", "type": "noun", "level": "Intermediate",
  "definition": "short meaning", "exampleEn": "English sentence.", "exampleHa": "Jumlar Hausa." }
For many simple words, add [English, Hausa] pairs to the list in dictionary-words-1000.js.

NOTE
Some English words have more than one Hausa meaning; the closest common one is given.
Ask a fluent Hausa speaker to review before publishing large lists.
Speech depends on the voices installed on the phone (a Hausa voice may not be available).
