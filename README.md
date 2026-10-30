# ADT Agent

A website for restyling and reviewing existing ADT Studio books against their source PDFs. Import your files, refine a shared component system, review accessibility and exercise issues, and export a repaired ADT.

**Files are processed in your browser. Projects save automatically on this device. AI uses your own OpenAI key and sends only the context you approve directly to OpenAI.**

## Use the website

1. On **Overview**, connect your OpenAI API key, then import the ADT ZIP/folder and its matching PDF, in either order. File controls become available once the workspace finishes loading. Both files stay visible with their filenames and page/section counts; importing does not take you away from this step.
2. Tick **Analyze the full PDF with AI**, then start design creation. The key and this explicit sharing consent are required. Sol reviews every PDF page and plans the brand; Luna assigns every ADT section to a supported page family. Analysis produces a book-specific guide, source coverage and styled examples. The supported 5B reference uses the approved six-example composition gallery after analysis. Refine the shared typography, color and spacing in **Design system**. Source-only families remain visible and missing or uncertain matches remain flagged.
3. **Design system** is a dedicated library: explore the brand guide and page-family examples, and use **Edit design** to change its shared settings. Example navigation is independent of the book’s current page. Design changes remain a draft until applied.
4. In **Book & source**, press **Apply design to whole book** in the banner above the viewer. Every loaded ADT section receives the shared system, with a completion count and a single Undo checkpoint. Later design edits show **Apply updated design to whole book**. Browse sections with Next / Previous or the section picker. Choose **Side by side** for linked ADT/PDF navigation. Turning a page on either side selects its matching content on the other side; both panes use full-page scrolling. Desktop book and design previews keep a fixed 1,280-pixel layout, scaling down to fit smaller columns rather than reflowing as the browser changes size. Phone preview uses a fixed 390-pixel layout. On phones the comparison panes stack. **Original** shows the imported page for comparison.
5. **Review issues** is a separate dashboard. Use **Run whole-book review**, filter the findings, **Fix all supported issues**, or open an individual issue in the book. Repairs can be undone; content meaning, image descriptions and other editorial findings remain for human review. Download the complete issue report from this view.

Files, edits, the PDF, design system, undo history, conversation, page-comment crops and reading positions save automatically. Refresh restores the active workspace; switching tabs keeps the project loaded. **Save now** flushes pending changes.

6. For book-editing assistance, use your connected OpenAI project key. **GPT-6.1 Sol plans** with medium reasoning, then **GPT-6 Luna executes** with low reasoning. In Chat, choose **AI · Sol → Luna**, approve sharing the selected page context, and review the proposed edits before applying them. Both models must be available to your account.
7. **Validate & export** produces the ADT, editable Tailwind component library with self-contained real page examples, and review report. **Download project backup** includes both originals and working files, source PDF, undo history and progress so you can move between browsers or devices. **Saved projects** lets you switch books without replacing the earlier project.

You can explicitly continue without a PDF to inspect an ADT, then add its source later from Overview. The brand button and workspace navigation keep the current project loaded; they do not reload the website.

Connecting a key makes no API request. API usage is charged to the user's OpenAI account when an AI request is sent. Use a personal project key with appropriate limits; both models must be available to your account. The app never silently substitutes a different model.

## Comment on a page

In **Book & source**, choose **Comment on page** (or **Select something on the page** in chat). Hover and click an object in the actual ADT Reader or PDF, or drag a rectangle around a larger area. The tool captures that area and opens a preview. Add a note, check the book section to change, then choose **Add to chat**. An unmapped PDF page requires you to choose its ADT target explicitly. The PDF remains a source reference; edits apply to the ADT.

The crop, page reference and draft note save with the local project and survive refresh. **Go to selection** returns to its section. Connect your key, approve the chat sharing checkbox, then **Send**. Capturing and adding a comment do not make an API request. Sol sees the crop and grounded object references; Luna receives the crop only for tasks that need it. Review the proposal and press **Apply changes**. Undo restores the prior version. A changed book revision invalidates old captures so they cannot silently edit a different object.

Selected-object edits support bounded typography, width, spacing, alignment, image fit and corner radius. Text, labels and image descriptions use the existing guarded operations. The model cannot insert arbitrary HTML/CSS or change exercise answers. A PDF-only crop can guide text or section edits; to adjust a specific object's geometry, select that object in the book. Each request has one crop; send further comments for other areas.

Keyboard: activate the tool, focus the book or PDF, use Up/Down to choose an object and Enter to capture. Escape cancels. PDF vector art without a discrete hover target can be selected with a dragged region. Book captures serialize rendered content and local fonts inside the opaque reader, then rasterize only the selected area; PDF crops come directly from its rendered canvas. No screen-sharing permission is needed. Capture previews let you check rendering before sending, particularly for unusual embedded media. Images are limited to 1,600 pixels on the longest edge and 1.8 MB.

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
- Chat sends the current section’s approved text/IDs, styles, findings, request and optionally a selected image or page-comment crop. Full-PDF design analysis has a separate explicit sharing control and sends every PDF page image plus extracted evidence and ADT summaries. The raw archive, source PDF file and reader scripts are not uploaded.
- Requests use `store:false`, no cookies, no referrer, no redirects, bounded output and no automatic retry. OpenAI processing remains subject to the user's account terms.
- No analytics, CDN dependencies or remote fonts. Book & source runs the imported ADT Reader in an opaque sandbox, with book-only file access and project-scoped response/settings storage. It cannot access the app’s credentials or storage. Design examples and automated audits remain static, isolated content views.
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

### Reference composition gallery

Design generation requires a connected OpenAI API key and the explicit “Analyze the full PDF with AI” checkbox. There is no local-generation fallback when the key is missing, consent is unchecked or analysis fails. File loading, saved-project access and the authored sample preview remain available; they do not trigger paid analysis.

For the verified 5B reference PDF and raw Part 1 Studio export, design creation now builds six **separate composed examples**: cover, contents, lesson heading/keywords, reflection, illustrated reading and quiz. Sol reviews the source and plans the brand, then Luna assigns sections; the saved AI review accompanies the gallery. The source is fingerprinted before its approved reference recipe is used. Artwork is extracted from the user's PDF at the recorded regions; no textbook images or text are distributed with the site. Poppins and Amiri are bundled under their OFL licenses.

The reusable renderer (`public/src/compositions.mjs`) moves existing bound nodes into fixed semantic components. The book-specific recipe (`public/design/reference-5b.json`) supplies bindings, source regions, roles and semantic colors. It is deliberately separate from `library/compositions.css`. Every candidate must preserve text bindings, controls and answers. A small, scoped helper restores local saving for ungraded written responses; the original quiz and navigation scripts remain intact. The Studio-generated quiz is identified as a companion activity, not an exact printed PDF exercise.

Design generation prepares these six pages for review. Style controls update the draft, refresh restores it, and library export uses the composed examples. In **Book & source**, the explicit **Apply design to whole book** action extends the shared package to every loaded section; until that action, the book remains unchanged. This release does not yet infer arbitrary new composition recipes from another PDF: other books use the existing structural draft workflow. Its AI family/token analysis is not a substitute for composed-page visual acceptance.

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

## Separate workspaces and whole-book application (0.7)

The six reference compositions remain the reviewable design library. **Apply design to whole book** uses the same typography, colors and semantic components for every section in the loaded ADT. The six example recipes retain their source-backed compositions; mixed lessons and worksheets keep their original content/control structure with shared presentation. Contents continuations and all Studio quizzes receive the corresponding components. Tables retain their row/column relationships in keyboard-accessible scroll regions. This styles the supplied ADT; it does not manufacture missing sections for unmatched PDF pages.

Application stages every page and checks content bindings, controls, answer keys, script identities and resources before changing the working copy. The live book has a separate token stylesheet from the design draft, so editing the library cannot silently change the book. Application, reapplication and regeneration preserve one-step Undo and existing content edits. Export updates the embedded reader cache and versions the applied styles, so Next / Back retain the design.

Book & source embeds the original Studio reader scripts, toolbar, navigation and activities. A local adapter supplies current project files (instead of the stale offline-preloader cache), virtual history and isolated response/settings storage. Exported reader scripts remain unchanged. SCORM LMS reporting is available in the exported package, not inside the authoring app. Review checks cover the isolated content at wide and phone widths; they are not a certification of pedagogical correctness or every screen-reader interaction.

Additional browser checks: `node tests/workspaces.mjs`; `RAW_ADT=/path/to/original node tests/book-application.mjs` after the reference-gallery fixture exists. The latter applies all 92 reference sections, checks Undo and reapplication, scans 184 section/width combinations and exports the applied reader. Reference artwork and test outputs stay private under ignored `tests/results/`.

### Embedded reader and full-page scrolling (0.8)

Design system and Book & source use the document’s vertical scroll. Headers, application controls, the expanded reader and the source PDF move together. The native reader dock stays part of the embedded book; long sections are never confined to a short inner scroll box. Desktop comparison places the full-height reader and PDF alongside one another; narrow screens stack them.

The embed adapter in `public/src/reader.mjs` executes classic Studio bundles without altering the exported files. Relative asset requests, fetches, native soft navigation, storage and cookies resolve within the imported project. Remote connections are blocked by CSP; the iframe deliberately has no `allow-same-origin` permission. Native menu, glossary, settings and activity code remain supplied by the book. The adapter currently targets the classic, self-contained Studio bundles; remote-dependent books and external module imports are not supported.

Run `APPLIED_ZIP=/path/to/styled-book.zip node tests/embedded-reader.mjs` with the 92-section reference book to exercise every native Next button, Next/Back response retention, reload, quiz feedback, keyboard table scrolling, sizing and isolation. Private books and test screenshots stay under ignored `tests/results/`.

### Linked comparison navigation (0.8.1)

Side by side links native ADT Next/Back, the section picker, PDF arrows and the physical PDF page field. Explicit source mappings take precedence over design-system mappings and page-number hints. A PDF page can correspond to several ADT sections: native section navigation keeps the source page in place, while changing PDF pages opens the first matching section. Selecting the current PDF page preserves the current section. Entering comparison follows whichever view was open.

Unmapped PDF pages show an explicit empty ADT pane, and ADT sections with no source mapping show an empty PDF pane. The app never substitutes a nearby page as a match. Refresh preserves the comparison state. Source-only browsing remains independent. Rapid navigation cancels obsolete PDF renders.

Checks: `node tests/source-navigation.mjs`, `node tests/workspaces.mjs`, and `APPLIED_ZIP=/path/to/book.zip SOURCE_PDF=/path/to/source.pdf node tests/comparison-navigation.mjs` with the reference book.
