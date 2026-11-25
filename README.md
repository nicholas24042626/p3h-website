# Humanistic Hands and Heart (P3H)

A buildless HTML, CSS and JavaScript website for Tzu Chi Singapore's youth and adult caregiver support programme, with server-side staff access and activity photo publishing.

## Local preview

Double-click `Open-Website.cmd` to serve the site at `http://localhost:8080/`. Keep the server window open while browsing; press Ctrl+C to stop it. No dependencies are required on Windows.

For another port, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-Website.ps1 -Port 8081` from this folder.

## Eligibility guide

`eligibility.html` is the public, table-style grant and resource finder beside Activities. It separates caregiver details from care-recipient details, asks about all six basic ADLs individually, and supports partial answers, household income bands and the no-income property-value route. Gender is optional and never changes grant suggestions. Answers stay in page memory: there is no form submission, profile storage, account requirement or personal information in links. Clear answers removes the current selections; Print my options is user initiated.

`js/eligibility.js` contains informational matching rules, remaining checks and official source links; `js/eligibility-translations.js` supplies its Chinese copy. HCG, CTG and SMF device criteria were checked against AIC on 25 November 2026. ComCare is referred for a holistic SSO assessment rather than filtered by a hard income cut-off. South West support is referred to the CDC for its additional checks. Unknown details stay uncertain; selections that differ from a scheme's screening criteria remain visible in the expandable Other schemes section. Results are not approvals or a substitute for care assessments. Verify sources before changing the rules or review date.

Open `tests/eligibility.html` on the local server to check age/ADL/income boundaries, PR family conditions, uncertain answers, safe matching, privacy, reset, language switching, print and responsive results. The new page is included in the shared navigation, language and layout checks.

## Live Carers Hub articles

Resources & FAQs includes the three newest dated articles from Carers Hub's Singapore caregiver article library. `Articles-Api.ps1` reads the fixed public `https://www.carershub.sg/articles` index, extracts titles/publication dates/authors/canonical article links and matching publisher thumbnails, deduplicates them and sorts by publication date. Future dates, offsite links and invalid records are rejected. It does not copy article bodies or image files, import third-party scripts, or share user accounts or cookies. Thumbnail URLs are restricted to Carers Hub's public raster image paths; unavailable images show a neutral fallback without breaking the cards.

`GET /api/articles` is public. Successful results are cached privately in `.p3h-data/carershub-articles.json` for one hour; requests after expiry refresh the index, with a ten-minute retry backoff after failures. The last valid result survives outages and restarts. The UI checks the endpoint on load and periodically while visible, labels saved results honestly, and shows the last successful check time in Singapore time. Article titles stay in their original English while surrounding controls and dates follow the site's language switch.

`assets/data/carershub-articles.json` is a public fallback snapshot. Refresh it manually with `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Refresh-ArticleSnapshot.ps1`. Static-only hosting shows this dated fallback; automatic updates require hosting the article backend too. If Carers Hub changes its index markup, update the parser; failed parsing preserves the cache rather than replacing it with incomplete results. Run `tests/Articles-Api.Tests.ps1` and open `/tests/articles.html` for parsing, cache, outage, safety, language and mobile checks.

## Staff activity publishing

Open Activities, choose **Staff access**, enter the configured code and sign in. Add the activity title and date, choose up to six JPEG or PNG photos (3 MB each), add a caption for every photo, confirm approval for public sharing, then choose **Publish photos**. Chinese titles, descriptions and captions are optional. Published photos appear for all visitors, including after a server restart. Existing photo collections remain available.

Signed-in staff can select **Edit photos** under Existing activities to update the title, descriptions and captions, add photos, replace an individual photo, or remove photos. Choose **Save changes** to apply the edits, or **Cancel editing** to keep the published collection unchanged. Keep at least one photo in a collection; **Remove activity** removes the whole collection after confirmation. The original four collections are editable too, with optional dates where no historical date was supplied. Reload activities if another staff session has changed the collection; outdated saves and removals are rejected to prevent overwriting newer work.

Edits and removals are saved as immutable private revisions. Removed photos stop appearing publicly and their old served URLs return 404; original image files and older uploaded versions remain in source/private storage for recovery rather than being permanently erased. Homepage highlights follow edits and removals to the original collections. Backups and any previously downloaded copies remain separate from the live website.

The code is configured privately in this checkout. It is never included in public HTML or JavaScript. To configure a new installation or change the code, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Set-StaffCode.ps1` and enter the code at the protected prompt. Restart the website server afterward to apply the code and revoke existing sessions.

`Activities-Api.ps1` verifies a salted PBKDF2 hash, issues a server-checked HttpOnly/SameSite session lasting 30 minutes, checks request origins, and limits login attempts. JPEG/PNG uploads are decoded, resized to at most 1920 pixels on the longest side, and saved as fresh JPEG files without original location metadata. Captions also provide accessible image descriptions. The editor previews photos before publishing; publishing is immediate.

The private `.p3h-data/` directory holds the code hash, activity records and photos. It is ignored by Git and blocked by the local HTTP server; only published images are exposed through `/media/activities/`. Back up the whole directory securely to preserve uploads. Do not upload it to static hosting or commit it to source control. Browser test data belongs only in ignored `tmp/`, separate from actual activities.

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Activities-Api.Tests.ps1` for authentication, image validation, publication, persistence, session expiry and rate-limit tests. `tests/publishing.html` exercises the real browser flow only on an isolated test server with its own temporary code; never pass the actual staff code in a URL.

## Content and sources

Programme content comes from the supplied P3H background and bilingual standee. The four support areas, financial grants, referral services, training now live together on `assistance.html`.


The grant acknowledgement links to the official Income announcement:
https://www.income.com.sg/about-us/corporate-information/press-releases/caregiver-grant

WhatsApp (6859 1962), email (caregiversupport@tzuchi.org.sg), islandwide coverage and weekday 9am-5pm contact hours come from the standee. Contact links open the visitor's messaging app; the website does not collect or submit enquiry data.

## Files

- Edit the seven canonical pages: `index.html`, `assistance.html`, `activities.html`, `eligibility.html`, `resources.html`, `contact.html` and `caregiving-journey.html`.
- Other HTML routes, including `streams/`, are generated compatibility copies. Do not edit them directly.
- `tools/Sync-Layout.ps1` owns primary navigation, the footer, canonical links and compatibility copies. Run it after editing content: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Sync-Layout.ps1`.
- `css/refinements.css` applies the warm orange P3H styling after existing styles.
- `css/accessibility.css` provides shared reading controls, readable footer contrast, responsive journey layouts and print styles. It is loaded last by the layout sync tool.
- All seven canonical pages share one English / 中文 switch, including navigation, reading controls, FAQs, accessible labels and slideshow counters. English is the first-visit default; no automatic browser-language detection is used. Explicit `?lang=en` / `?lang=zh` links override the saved preference. Internal HTML links carry the current language, including new tabs and compatibility routes. External sites and documents retain their original language.
- `js/translations.js` contains reviewed Singapore Simplified Chinese copy keyed by normalised English source text. `js/i18n.js` applies the translations while preserving existing markup, filters, focus and section bookmarks. Update dictionary entries whenever English source text changes. The journey guide keeps longer paired `data-language` blocks in its HTML; update both versions together. No translation service, API key or network request is required.
- English source HTML is the fallback without JavaScript; Chinese guide blocks and inactive controls stay hidden. Text size and site-language preferences use browser-local storage when available; they contain no personal or health information. Browser zoom and print remain usable without JavaScript. Printing with JavaScript temporarily expands disclosures, includes all support sections and restores the previous disclosure state afterward.
- `js/main.js` controls mobile navigation, active-page indicators and support sections with bookmark and browser history support. Without JavaScript, all sections remain readable.
- FAQs use native HTML disclosure elements and work without JavaScript.
- `assets/documents/p3h-caregiver-support.pdf` is the original print standee.

## Content still to supply

- Approved caregiver and volunteer stories, consent and photographs.
- Confirmed activity schedules, venues and accessibility information.
- Current access arrangements, eligibility and costs for specific services.
- Verified descriptions and URLs for SEEN, GLOW and Longevity Courtyard.
- Approved external caregiver guides and downloadable resources.

Add approved activity content to `activities.html` and confirmed visit arrangements to `contact.html`. Partners and programme background live in the expandable About section on Home. Do not substitute invented testimonials, schedules or eligibility rules.

## Navigation and maintenance

The primary navigation is **Home / Caregiver support / Activities / Eligibility / Resources & FAQs / Contact**. Every page has a visible current-page indicator and a Home link. Support functions are reachable through the Caregiver support page and its four section links. Registration and visit guidance live on Contact; FAQs and downloads live on Resources & FAQs.

Regular text hyperlinks open a new tab with `noopener noreferrer`. Navigation menus, section links, buttons, the brand link and Skip to content stay in the current tab. Browsers may hand email or messaging links to the visitor's configured application.

See [NAVIGATION-AUDIT.md](NAVIGATION-AUDIT.md) for the original route audit, feature ownership, old URL mapping, journey comparisons and verification results. Old URLs serve complete copies of their canonical workspace without redirect hops. They carry canonical links and `noindex,follow`, and are excluded from chatbot grounding.

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Navigation.Tests.ps1` to validate navigation, content retention, local files, fragments and structural nesting. With the local server running, open `/tests/navigation.html` to check in-page sections, bookmarks, Back/Forward history, filters, compatibility routes, responsive navigation, language switching, persistent text size and print disclosure restoration. Run the browser checks at desktop and mobile widths (use `?width=375` for an exact mobile iframe).

Open `/tests/language.html` (also with `?width=375`) to check Chinese text and accessible-label coverage, first-visit English, exact English restoration, language persistence, internal links, page titles, nested routes, and photo controls. Partner brand names and service acronyms intentionally retain their recognisable English forms. Chinese copy uses 看护者 consistently, with local terms such as 护联中心、失智症、乐龄人士、暂托服务 and 电邮. The copy was reviewed for meaning and natural Singapore usage; this is not a claim of external professional certification.

## Caregiving journey content review

The journey guide and seven financial-grant summaries were reviewed on 23 November 2026 against the linked AIC, MSF and South West CDC resources. Summary review dates do not confirm service availability or individual eligibility. The South West Caregiver Support Fund now links to the current CDC page rather than the older PDF, and SMF links directly to its provider page. Update review dates only after checking sources again. Youth privacy guidance invites visitors to ask the team about consent and confidentiality; it does not invent a P3H privacy or safeguarding policy. Former-caregiver participation and referrals remain subject to team confirmation.

## Hosting

The current server binds only to this computer's loopback interface. Public hosting has not been configured. No build step is required for the information pages, but static hosting alone cannot run staff login or save uploads. Public deployment needs a backend implementing the activity API, durable private storage, and HTTPS with Secure session cookies. The included PowerShell server is a local preview implementation, not a public production server. Do not expose it directly to the internet. Preserve the folder structure and UTF-8 encoding, and migrate the private uploaded data through the backend rather than publishing the directory.

## Retained chatbot implementation

The chatbot has been removed from all public pages. Its JavaScript, API implementation and regression fixtures remain in the repository for reference; public pages do not load the widget.

## April 2026 media release update

The supplied media release dated 7 April 2026 is available at assets/documents/p3h-media-release-20260407.pdf. It confirms the 1 April soft launch at GLOW (Nanyang), Healthy-Tec collaboration, home/centre respite and micro jobs. The published annual caregiver targets sum to 2,800 (700 + 900 + 1,200), replacing the earlier rounded 3,000 figure. Confirm current visit arrangements with the team.

The launch media release is retained as an archival source and is no longer linked from the public resources page because it describes a retired feature.
