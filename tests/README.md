# Verification

Start `npm start` on port 8890 before browser tests. The tests use an installed Google Chrome via Playwright, not the user's regular browser profile.

- `npm test` runs sample end-to-end, mocked AI/security, image crop and static server boundary checks.
- `node tests/real-book.mjs` imports the workspace's 92-section Part 1 and 94-page PDF, styles and exports it, then checks every embedded page cache entry and the original runtime bytes.
- `node tests/reader-export.mjs` serves that exported ZIP temporarily on port 8892, visits every section via the original Next controls at 1200/390px, checks nine quizzes and verifies response persistence.
- `node tests/layout-real.mjs` scans every exported real-book section through the application's own isolated layout scanner.

Paid AI calls are not made. OpenAI Responses requests are intercepted by Playwright and fulfilled with test responses. Keys are checked for exclusion from persistence and exports.

Reports/screenshots go in `tests/results/` and are excluded from distributable archives. Some regression inputs are user-provided local files; those files and their exported test copies are not packaged with the application.
