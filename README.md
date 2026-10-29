# ADT Agent

A website for restyling and reviewing existing ADT Studio books against their source PDFs. Import your files, refine a shared component system, review accessibility and exercise issues, and export a repaired ADT.

**Files are processed in your browser. AI uses your own OpenAI key and sends approved page context directly to OpenAI.**

## Use the website

1. Open the published website and choose **Explore a sample**, or import an ADT ZIP/folder and source PDF.
2. Use **Design system** to adjust shared typography, color and spacing. Apply the design to the whole book.
3. Use **Review issues** for supported automatic repairs and editorial review. Check every section at desktop and phone widths.
4. For AI assistance, choose **Connect OpenAI**, enter your own project API key and select a supported model. The default is `gpt-5.4-mini`.
5. In Chat, choose **AI assistant**, approve sending the selected page context, then send your request. Review and apply the proposed edits.
6. **Validate & export** produces the ADT, editable Tailwind component library and review report.

Connecting a key makes no API request. API usage is charged to the user's OpenAI account when an AI request is sent. Use a personal project key with appropriate limits; the selected model must be available to your account.

## Key and file privacy

- The key is held only in private JavaScript memory for the current tab. The input is cleared after connection.
- The app does not save keys in cookies, local/session storage, IndexedDB, project files, reports, exported ZIPs or GitHub.
- Disconnect, refresh or leaving the page clears the key. Disconnect also clears content-sharing consent and aborts active AI requests.
- Requests go directly to `https://api.openai.com/v1/responses` over HTTPS. There is no application proxy receiving users' keys or book contents.
- Only the current section's text/IDs, style settings, findings, the user's request, and an explicitly selected optional image are sent. The complete PDF/archive is not sent.
- Requests use `store:false`, no cookies, no referrer, no redirects, bounded output and no automatic retry. OpenAI processing remains subject to the user's account terms.
- No analytics, CDN dependencies or remote fonts. Imported reader scripts do not execute in the sandboxed layout preview.
- Save project locally explicitly stores a working copy in IndexedDB. Export a ZIP for a portable backup.

Browser BYOK is intended for a user supplying their own key to a tool they trust. A browser application cannot protect a key from that user's browser, extensions or compromised application code. Do not embed a shared organization/service key in this site. OpenAI recommends server-side secret management for applications distributing a developer-owned credential. This app distributes no credential; a future centrally managed service would need an authenticated backend and server-side secrets.

Official references: [API key guidance](https://developers.openai.com/api/docs/guides/production-best-practices#api-keys), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs), [default model capabilities](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

## Local development

```sh
npm ci --ignore-scripts
npm run build
npm start
```

Open http://127.0.0.1:8890. The included Node 22+ server serves static files only; use the same Connect OpenAI button locally. On macOS, `Start ADT Agent.command` launches it once Node is installed.

The built site is `public/`. GitHub Pages deploys only that folder through `.github/workflows/pages.yml`. It contains an authored sample book/PDF, not users' imported books, test outputs or credentials. All paths work under a repository URL such as `/adt-agent/`.

## Features and limits

- Inventory every physical PDF page and ADT reading-order entry; extract page geometry, text evidence, possible blanks, a suggested palette and font-family evidence.
- Fixed, scoped Tailwind 4.3.3 components without preflight. Control text/paper/accent/panel colors, reading font/size, line spacing, page width, component spacing and corners. Four supported foreground/background pairings must meet 4.5:1 contrast before application. PDF palette suggestions are adapted for contrast.
- Preserve reading order, binding IDs, input identities, grading data, original scripts and reader navigation.
- Flag missing assets, descriptions, accessible labels, duplicate IDs, malformed metadata, quiz binding issues and source gaps. Image meaning, inclusion and exercise correctness remain editorial review items.
- Fix supported issues in one batch: shared styles, configured language, mobile viewport, responsive images and existing dictionary descriptions. No invented answers or descriptions.
- Audit every section at 1200px and 390px with axe and layout checks. Distinguish violations, inconclusive checks and editorial review. Imported reader scripts are preserved in export but not executed during these isolated content checks.
- Edit descriptions and source-language dictionaries. Flag existing narration when its wording changes. Crop source artwork with PDF hash/page/coordinates and image hashes recorded.
- Local chat commands for common style changes, supported fixes and precise leaf-text edits; optional AI proposes only validated style, text, description, label and component operations.
- Undo, local save/resume/delete, source mappings, original/styled preview, component examples, ADT ZIP/report/library export.
- Synchronize recognized Studio embedded page caches and version edited dependencies, preserving styling through Next/Back.

“Valid” means the **ADT Studio structural and preservation profile** passed. It is not an official ADT or WCAG certification. Human verification still covers original reader behavior, keyboard/screen-reader use, narration, reading order, image meaning and pedagogical accuracy. Existing SCORM manifests include the new component files; full SCORM schema validation is not implemented.

Palette/font extraction is evidence, not automatic visual understanding. Unusual layouts and physical/printed-page offsets need review. The app processes one ADT part at a time and does not merge separate readers or regenerate audio. Import limits: 250 MB ZIP/PDF, 512 MB expanded files, 15,000 files and 1,500 sections/PDF pages. Initial site loading requires a connection; no offline service worker is installed.

Internal `folio/` asset paths, component identifiers and local project storage names are retained for compatibility with earlier exports. User-facing branding and downloads are ADT Agent.

## Verification

With the local server running and Chrome installed:

```sh
npm test
```

Tests cover local import/PDF inventory, whole-book styles, issue repairs, undo, text/description localization, accessibility, save/resume, export/reimport, source-crop provenance and mocked OpenAI requests. BYOK checks verify consent, key clearing, no key persistence and constrained proposals; no real API key or paid request is used.

Private real-book regressions can be run with `ADT_TEST_ZIP` and `ADT_TEST_PDF` environment variables. They verified 94 PDF pages and 92 ADT sections, actual Next/Back at desktop/phone widths, nine quizzes, response persistence and all embedded cache entries. The full layout scanner completed 184 section/width checks with zero axe violations, no broken images and one wide-table review flag. These results concern the tested book, not arbitrary inputs.

Dependency source/license notices are in `public/vendor`. [PDF.js](https://mozilla.github.io/pdf.js/examples/), [fflate](https://github.com/101arrowz/fflate), and [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
