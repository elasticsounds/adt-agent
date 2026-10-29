# ADT Agent

A website for restyling and reviewing existing ADT Studio books against their source PDFs. Import your files, refine a shared component system, review accessibility and exercise issues, and export a repaired ADT.

**Files are processed in your browser. Projects save automatically on this device. AI uses your own OpenAI key and sends only the context you approve directly to OpenAI.**

## Use the website

1. On **Overview**, connect your OpenAI API key, then import the ADT ZIP/folder and its matching PDF, in either order. File controls become available once the workspace finishes loading. Both files stay visible with their filenames and page/section counts; importing does not take you away from this step.
2. Tick **Analyze the full PDF with AI**, then start design creation. The key and this explicit sharing consent are required. Sol reviews every PDF page and plans the brand; Luna assigns every ADT section to a supported page family. Analysis produces a book-specific guide, source coverage and styled examples. The supported 5B reference uses the approved six-example composition gallery after analysis. Refine the shared typography, color and spacing in **Design system**. Source-only families remain visible and missing or uncertain matches remain flagged.
3. Open **Book & source** to read the book and compare the PDF. Use the section picker or optional section list; hide the tools for more reading room. The book, PDF and tools scroll independently. Overview retains both files, the current section and edits. Files, edits, the PDF, design system, undo history, conversation, drafts and reading position save automatically. The latest project reopens after refresh or a browser restart. **Save now** flushes any pending changes.
4. Use **Review issues** for supported automatic repairs and editorial review. Check every section at desktop and phone widths.
5. For book-editing assistance, use your connected OpenAI project key. **GPT-6.1 Sol plans** with medium reasoning, then **GPT-6 Luna executes** with low reasoning. In Chat, choose **AI · Sol → Luna**, approve sharing the selected page context, and review the proposed edits before applying them. Both models must be available to your account.
6. **Validate & export** produces the ADT, editable Tailwind component library with self-contained real page examples, and review report. **Download project backup** includes both originals and working files, source PDF, undo history and progress so you can move between browsers or devices. **Saved projects** lets you switch books without replacing the earlier project.

You can explicitly continue without a PDF to inspect an ADT, then add its source later from Overview. The brand button and workspace navigation keep the current project loaded; they do not reload the website.

Connecting a key makes no API request. API usage is charged to the user's OpenAI account when an AI request is sent. Use a personal project key with appropriate limits; both models must be available to your account. The app never silently substitutes a different model.

## Full PDF design analysis

Explicit full-PDF consent sends page renderings (up to 1,000 pixels on the longest edge), extracted text/geometry and ADT section summaries directly to OpenAI. Sol examines every physical PDF page in batches of six, then derives constrained, contrast-checked tokens and typography from those observations. Luna receives the brand plan and relevant evidence to assign batches of 18 ADT sections. The interface shows the maximum planned request count before starting.

Each successful batch is checkpointed locally before the next paid request. Stop, failure or refresh leaves the job resumable. Resume skips completed batches; it never starts itself on reload. A changed source or section fingerprint invalidates previous analysis. Unknown/duplicate/missing section IDs, unsafe exercise layouts, out-of-range typography and inadequate contrast are rejected. The job never accepts model-generated scripts or arbitrary HTML/CSS. Existing controls and content nodes remain intact.

Source observations select reviewed page-family, layout and panel variants; the full design is applied to every existing section. The guide includes all physical PDF pages, including those with no matched ADT section. Local generation is explicitly labeled a draft; AI completion still requires a visual fidelity review. This is a constrained editing system, not an autonomous replacement for a human’s judgment about every unusual composition. Incorrect artwork and descriptions use the source-review/crop and editing tools rather than invented replacements.

## Direct Codex workflow

For the full agent-driven process—visual inspection, custom variants when needed, asset repairs and iteration against the original reader—use [the self-contained Codex prompt](public/codex-restyle-prompt.md). Replace its three paths. It works with local files without this website or an additional API key. The same prompt is downloadable from Overview.

## Sol → Luna workflow

Sol reviews the selected section and creates up to 20 explicit tasks. The client validates their types, targets, evidence and exercise restrictions before handing them to Luna. Luna receives only the assigned tasks and the text, controls or images needed to execute them. Ordinary style edits do not resend reading text or images. Requests with no tasks stop after Sol.

Luna cannot introduce new edit targets: its results reference the approved task IDs, which the client maps back to the plan. Every task must return a completed value or an explicit review item. Unknown tasks, incomplete results, inaccessible color choices and out-of-range settings are rejected before a proposal can be applied. The user sees Sol’s plan, Luna’s proposed edits and any unresolved review items. Application still requires **Apply changes**, and a changed book/page invalidates the proposal.

Planning is capped at 6,000 output tokens and execution at 4,000. If execution fails, **Retry Luna** reuses the validated plan in tab memory for unchanged source content and the same request. It makes one executor call rather than another planning call. There are no automatic retries; retrying can still incur usage charges. Stop AI, disconnect, refresh or a changed key clears the retained plan. Local commands remain available without AI.

These settings reduce repeated context and avoid repeating successful planning; actual cost and output quality depend on the request. Routing tests use mocked Responses API calls, not a live key or paid model benchmark.

## Key and file privacy

- **Remember my key on this browser** is enabled by default. The key is encrypted with AES-GCM in a separate IndexedDB credential store, using a nonextractable browser CryptoKey. It survives refresh and closing the browser. The password field is cleared immediately after connection.
- Credentials never enter project records, project backups, reports, exported books, local/session storage or GitHub. Encryption protects the stored representation; it does not protect against compromised same-origin application code or browser extensions.
- Disconnect deletes the remembered key, clears sharing consent and aborts active requests. Uncheck Remember for a session-only connection. Connecting and restoring a key make no API request.
- Requests go directly to `https://api.openai.com/v1/responses` over HTTPS. There is no application proxy receiving users' keys or book contents.
- Chat sends the current section’s approved text/IDs, styles, findings, request and optionally a selected image. Full-PDF design analysis has a separate explicit sharing control and sends every PDF page image plus extracted evidence and ADT summaries. The raw archive, source PDF file and reader scripts are not uploaded.
- Requests use `store:false`, no cookies, no referrer, no redirects, bounded output and no automatic retry. OpenAI processing remains subject to the user's account terms.
- No analytics, CDN dependencies or remote fonts. Imported reader scripts do not execute in the sandboxed layout preview.
- Projects autosave to IndexedDB using content-addressed file blobs and atomic project records. Multiple saved books, older saved-project migration, generation checks against stale tabs, storage-failure alerts and portable project backups are supported. Browser storage remains tied to this browser profile and origin; clearing site data/private browsing can remove it. Persistent-storage permission is requested where supported. Download a project backup for durable storage outside the browser.

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

### Composition gallery milestone (0.6)

Design generation requires a connected OpenAI API key and the explicit “Analyze the full PDF with AI” checkbox. There is no local-generation fallback when the key is missing, consent is unchecked or analysis fails. File loading, saved-project access and the authored sample preview remain available; they do not trigger paid analysis.

For the verified 5B reference PDF and raw Part 1 Studio export, design creation now builds six **separate composed examples**: cover, contents, lesson heading/keywords, reflection, illustrated reading and quiz. Sol reviews the source and plans the brand, then Luna assigns sections; the saved AI review accompanies the gallery. The source is fingerprinted before its approved reference recipe is used. Artwork is extracted from the user's PDF at the recorded regions; no textbook images or text are distributed with the site. Poppins and Amiri are bundled under their OFL licenses.

The reusable renderer (`public/src/compositions.mjs`) moves existing bound nodes into fixed semantic components. The book-specific recipe (`public/design/reference-5b.json`) supplies bindings, source regions, roles and semantic colors. It is deliberately separate from `library/compositions.css`. Every candidate must preserve text bindings, controls and answers. A small, scoped helper restores local saving for ungraded written responses; the original quiz and navigation scripts remain intact. The Studio-generated quiz is identified as a companion activity, not an exact printed PDF exercise.

These six pages are an explicit visual review milestone. They do **not** replace the whole book. Style controls update this draft, refresh restores it, and library export uses these composed pages. Only after the gallery is accepted should the same package be extended and applied to the remaining sections. This release does not yet infer arbitrary new composition recipes from another PDF: other books use the existing structural draft workflow. Its AI family/token analysis is not a substitute for composed-page visual acceptance.

- Inventory every physical PDF page and ADT reading-order entry; extract page geometry, text evidence, possible blanks, a suggested palette and font-family evidence.
- Fixed, scoped Tailwind 4.3.3 components without preflight. Control text/paper/accent/panel colors, reading font/size, line spacing, page width, component spacing and corners. Four supported foreground/background pairings must meet 4.5:1 contrast before application. PDF palette suggestions are adapted for contrast.
- Preserve reading order, binding IDs, input identities, grading data, original scripts and reader navigation.
- Flag missing assets, descriptions, accessible labels, duplicate IDs, malformed metadata, quiz binding issues and source gaps. Image meaning, inclusion and exercise correctness remain editorial review items.
- Fix supported issues in one batch: shared styles, configured language, mobile viewport, responsive images and existing dictionary descriptions. No invented answers or descriptions.
- Audit every section at 1200px and 390px with axe and layout checks. Distinguish violations, inconclusive checks and editorial review. Imported reader scripts are preserved in export but not executed during these isolated content checks.
- Edit descriptions and source-language dictionaries. Flag existing narration when its wording changes. Crop source artwork with PDF hash/page/coordinates and image hashes recorded.
- Local chat commands for common style changes, supported fixes and precise leaf-text edits; optional Sol planning and Luna execution propose only validated style, text, description, label and component operations.
- Undo, automatic recovery, multiple saved projects, portable backups, source mappings, original/styled preview, actual page-family examples and ADT ZIP/report/library export.
- Synchronize recognized Studio embedded page caches and version edited dependencies, preserving styling through Next/Back.

“Valid” means the **ADT Studio structural and preservation profile** passed. It is not an official ADT or WCAG certification. Human verification still covers original reader behavior, keyboard/screen-reader use, narration, reading order, image meaning and pedagogical accuracy. Existing SCORM manifests include the new component files; full SCORM schema validation is not implemented.

Palette/font extraction is evidence, not automatic visual understanding. Unusual layouts and physical/printed-page offsets need review. The app processes one ADT part at a time and does not merge separate readers or regenerate audio. Import limits: 250 MB ZIP/PDF, 512 MB expanded files, 15,000 files and 1,500 sections/PDF pages. Initial site loading requires a connection; no offline service worker is installed.

Internal `folio/` asset paths, component identifiers and local project storage names are retained for compatibility with earlier exports. User-facing branding and downloads are ADT Agent.

## Verification

With the local server running and Chrome installed:

```sh
npm test
```

Tests cover paired imports in either order, explicit design creation, retained navigation state, wheel scrolling and page-end reachability, laptop/tablet/phone layouts, local import/PDF inventory, whole-book styles, issue repairs, undo, text/description localization, accessibility, save/resume, export/reimport, source-crop provenance and mocked OpenAI requests. AI routing checks verify the two model roles, reduced context, exact task accounting, protected quiz text, contrast validation, cancellation and plan reuse. BYOK browser checks verify consent, encrypted credential persistence, session-only mode, disconnect deletion, absence of keys from projects/exports, constrained proposals, retries and accessible review UI. Recovery checks close and relaunch a persistent Chrome profile, test storage failure, legacy migration, conflicting tabs and portable backups. Full-design tests exercise source batches, brand planning, safe section assignment and resuming after failures; no real API key or paid request is used.

The earlier real-book regressions used an already-restyled book. They establish runtime and export preservation, **not successful composition from raw Studio output**. They must not be used as evidence of the new generation pipeline's visual quality.

The raw-input composition regression is separate:

```sh
RAW_ADT='/path/to/raw-studio-folder' SOURCE_PDF='/path/to/source.pdf' node tests/composition-reference.mjs
```

It requires the raw reference export, checks all source pages are inventoried, verifies six composed pages at desktop and phone widths, confirms bound text visibility and loaded fonts, and checks that generation leaves all original book sections unchanged. Images and reports stay in ignored `tests/results/`. Browser screenshots still require visual inspection; passing preservation checks alone is not visual acceptance.

Dependency source/license notices are in `public/vendor`. [PDF.js](https://mozilla.github.io/pdf.js/examples/), [fflate](https://github.com/101arrowz/fflate), and [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
