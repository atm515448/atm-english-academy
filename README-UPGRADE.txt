ATM ENGLISH ACADEMY DICTIONARY UI UPGRADE

IMPORTANT: This package deliberately does NOT replace dictionary-data.js.
Keep your existing dictionary-data.js in the same repository folder. The new interface reads its existing fields (en, ha, type, definition, exampleEn, exampleHa, level) and also supports optional synonyms and antonyms.

Included:
- dictionary.html: redesigned interface with Dictionary, Favourites, History and Settings tabs
- dictionary.css: responsive light/dark themes and text sizing
- dictionary.js: search, favourites, history, settings and pronunciation
- sw.js: updated offline cache
- manifest.webmanifest: install metadata

INSTALL ON GITHUB:
1. Open https://github.com/atm515448/atm-english-academy
2. Open the repository root (Code tab).
3. Add file > Upload files.
4. Upload these five files from this ZIP into the ROOT, beside dictionary-data.js.
5. If GitHub asks to replace existing files, replace dictionary.html, dictionary.css, dictionary.js, sw.js and manifest.webmanifest.
6. Do NOT delete or replace dictionary-data.js.
7. Commit message: Upgrade dictionary interface and offline settings
8. Commit directly to main.
9. Wait for GitHub Pages to rebuild. Open:
   https://atm515448.github.io/atm-english-academy/dictionary.html
10. Open it once online in Chrome, then use Chrome menu > Add to Home screen / Install app.

DATASET / 10,000-HEADWORD TARGET:
A public-domain historical English-Hausa lexicon is available here:
https://huggingface.co/datasets/adab-tech/murya-hausa-en-lexicon-robinson1914
It contains 20,628 English-to-Hausa word/phrase pairs derived from Robinson's 1914 dictionary. It is NOT 20,628 clean unique modern headwords. The dataset publisher warns that OCR and old Hausa spelling conventions may contain errors. Do not blindly label every row as verified modern Hausa. It is useful as a candidate source that needs cleaning and review before inclusion.
The interface supports large local JSON arrays, but the current data file remains your existing starter list until a reviewed expanded data file is added. This upgrade does not pretend that the existing 104 entries have become 10,000.

LIMITATIONS:
- Speech depends on voices installed on the Android phone. Hausa voice may not be installed.
- Offline service worker caching works on GitHub Pages HTTPS after the first online visit.
- Favourites, history and settings are stored in browser localStorage on this device.
- This is a client-side app; it does not send searches to a server.
