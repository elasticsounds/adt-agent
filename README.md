# ADT Agent

A website for restyling and reviewing existing ADT Studio books against their source PDFs. Import your files, refine a shared component system, review accessibility and exercise issues, and export a repaired ADT.

**Files are processed in your browser. AI uses your own OpenAI key and sends approved page context directly to OpenAI.**

## Use the website

1. On **Overview**, import the ADT ZIP/folder and its matching PDF, in either order. Both stay visible with their filenames and page/section counts; importing does not take you away from this step.
2. Choose **Create design system**. The fixed component library is applied across the book using a PDF-derived accent adapted for contrast, while retaining the book’s own font. Existing ADT Agent designs and edits are retained. Refine the shared typography, color and spacing in **Design system**.
3. Open **Book & source** to read the book and compare the PDF. Use the section picker or optional section list; hide the tools for more reading room. The book, PDF and tools scroll independently. Overview retains both files, the current section and edits. Use **Save locally** to preserve a project across a refresh or browser restart.
4. Use **Review issues** for supported automatic repairs and editorial review. Check every section at desktop and phone widths.
5. For AI assistance, choose **Connect OpenAI** and enter your project API key. **GPT-6.1 Sol plans** with medium reasoning, then **GPT-6 Luna executes** with low reasoning. In Chat, choose **AI · Sol → Luna**, approve sharing the selected page context, and review the proposed edits before applying them. Both models must be available to your account.
6. **Validate & export** produces the ADT, editable Tailwind component library and review report.

You can explicitly continue without a PDF to inspect an ADT, then add its source later from Overview. The brand button and workspace navigation keep the current project loaded; they do not reload the website.

Connecting a key makes no API request. API usage is charged to the user's OpenAI account when an AI request is sent. Use a personal project key with appropriate limits; both models must be available to your account. The app never silently substitutes a different model.

## Sol → Luna workflow

Sol reviews the selected section and creates up to 20 explicit tasks. The client validates their types, targets, evidence and exercise restrictions before handing them to Luna. Luna receives only the assigned tasks and the text, controls or images needed to execute them. Ordinary style edits do not resend reading text or images. Requests with no tasks stop after Sol.

Luna cannot introduce new edit targets: its results reference the approved task IDs, which the client maps back to the plan. Every task must return a completed value or an explicit review item. Unknown tasks, incomplete results, inaccessible color choices and out-of-range settings are rejected before a proposal can be applied. The user sees Sol’s plan, Luna’s proposed edits and any unresolved review items. Application still requires **Apply changes**, and a changed book/page invalidates the proposal.

Planning is capped at 6,000 output tokens and execution at 4,000. If execution fails, **Retry Luna** reuses the validated plan in tab memory for unchanged source content and the same request. It makes one executor call rather than another planning call. There are no automatic retries; retrying can still incur usage charges. Stop AI, disconnect, refresh or a changed key clears the retained plan. Local commands remain available without AI.

These settings reduce repeated context and avoid repeating successful planning; actual cost and output quality depend on the request. Routing tests use mocked Responses API calls, not a live key or paid model benchmark.

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

Official references: [API key guidance](https://developers.openai.com/api/docs/guides/production-best-practices#api-keys), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna).

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
- Local chat commands for common style changes, supported fixes and precise leaf-text edits; optional Sol planning and Luna execution propose only validated style, text, description, label and component operations.
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

Tests cover paired imports in either order, explicit design creation, retained navigation state, wheel scrolling and page-end reachability, laptop/tablet/phone layouts, local import/PDF inventory, whole-book styles, issue repairs, undo, text/description localization, accessibility, save/resume, export/reimport, source-crop provenance and mocked OpenAI requests. AI routing checks verify the two model roles, reduced context, exact task accounting, protected quiz text, contrast validation, cancellation and plan reuse. BYOK browser checks verify consent, key clearing, no key persistence, constrained proposals, retries and accessible review UI; no real API key or paid request is used.

Private real-book regressions can be run with `ADT_TEST_ZIP` and `ADT_TEST_PDF` environment variables. They verified 94 PDF pages and 92 ADT sections, actual Next/Back at desktop/phone widths, nine quizzes, response persistence and all embedded cache entries. The full layout scanner completed 184 section/width checks with zero axe violations, no broken images and one wide-table review flag. These results concern the tested book, not arbitrary inputs.

Dependency source/license notices are in `public/vendor`. [PDF.js](https://mozilla.github.io/pdf.js/examples/), [fflate](https://github.com/101arrowz/fflate), and [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
