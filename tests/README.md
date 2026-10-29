# Verification

Start `npm start` on port 8890 before browser tests. The tests use an installed Google Chrome via Playwright, not the user's regular browser profile.

- `npm test` runs sample end-to-end, mocked AI/security, image crop and static server boundary checks.
- `node tests/real-book.mjs` imports the workspace's 92-section Part 1 and 94-page PDF, styles and exports it, then checks every embedded page cache entry and the original runtime bytes.
- `node tests/reader-export.mjs` serves that exported ZIP temporarily on port 8892, visits every section via the original Next controls at 1200/390px, checks nine quizzes and verifies response persistence.
- `node tests/layout-real.mjs` scans every exported real-book section through the application's own isolated layout scanner.

Paid AI calls are not made. OpenAI Responses requests are intercepted by Playwright and fulfilled with test responses. Keys are checked for encryption in a separate credential store and exclusion from project data and exports. Persistence tests relaunch a real Chrome profile, migrate earlier saves and check conflicting tabs and failed writes. Full-design tests verify all source images, resumable Sol/Luna stages, guarded assignments and real example exports. Live model quality and account access are not verified by mocked calls.

Reports/screenshots go in `tests/results/` and are excluded from distributable archives. Some regression inputs are user-provided local files; those files and their exported test copies are not packaged with the application.

## Raw-input composition milestone

The older real-book fixture was already restyled; it does not establish generation quality from raw Studio output. For the 5B reference, run:

```sh
RAW_ADT="/path/to/raw-folder" SOURCE_PDF="/path/to/reference.pdf" node tests/composition-reference.mjs
RAW_ADT="/path/to/raw-folder" node tests/composition-runtime.mjs
RAW_ADT="/path/to/raw-folder" node tests/composition-export.mjs
```

The first test builds six compositions from raw input and checks visible text, fonts, artwork, phone layouts, refresh recovery, style edits, repeat generation and library export. The export check verifies that both downloads link to the composed examples while preserving the reader. The runtime check serves the candidate package with the original reader, checking keyboard quiz feedback, response persistence, Next/Back and accessibility. Screenshots require visual review separately. No paid AI calls or private textbook assets are included in the published site.
