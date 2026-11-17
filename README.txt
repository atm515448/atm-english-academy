# ATM English Academy Dictionary add-on

This add-on provides a bilingual English ↔ Hausa dictionary with 104 starter entries.

## Files
- `dictionary.html`: dictionary page
- `dictionary-data.js`: bundled vocabulary data (works without an API)
- `dictionary.js`: search, direction switch, favourites, history and pronunciation
- `dictionary.css`: responsive styling
- `manifest.webmanifest`: install metadata
- `sw.js`: offline cache

## Add to the existing `english-academy` GitHub repository
1. Extract this ZIP.
2. Upload all six files into the root of the existing `english-academy` repository (or into a folder named `dictionary`; if using a folder, change the relative paths in `manifest.webmanifest` and `sw.js` accordingly).
3. Add a link or button to the academy home page: `<a href="dictionary.html">English–Hausa Dictionary</a>`.
4. Commit the changes and wait for GitHub Pages to publish.
5. Open the published site once while online, then use **Add to Home screen / Install app** in Chrome. Open the dictionary once so its files are cached.

## Offline notes
The word list, search, saved words and search history work locally. No translation API, external font, CDN or network request is required for dictionary lookups. Browser speech synthesis depends on speech voices installed on the phone; Hausa voice availability varies by device and may require a voice to be downloaded in Android settings.

## Expanding the dictionary
Add entries to `dictionary-data.js` using the same fields: `en`, `ha`, `type`, `exampleEn`, `exampleHa`, `level`, and `definition`. Review Hausa wording with a fluent speaker before publishing large batches; some words have several context-dependent translations.
