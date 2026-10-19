# Humanistic Hands and Heart (P3H)

A buildless HTML, CSS and JavaScript website for Tzu Chi Singapore's youth and adult caregiver support programme.

## Local preview

Double-click `Open-Website.cmd` to serve the site at `http://localhost:8080/`. Keep the server window open while browsing; press Ctrl+C to stop it. No dependencies are required on Windows.

For another port, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-Website.ps1 -Port 8081` from this folder.

## Content and sources

Programme content comes from the supplied P3H background and bilingual standee. The four support areas use shorter public-facing headings, with application assistance, training, forward care planning, respite and peer support explained on their detail pages.

The 3,000-caregiver figure is a three-year target. The engagement hub, Mobile Respite Team and rewards mechanism are described as programme approaches; contact the team for current arrangements. Weekday staff contact hours are distinguished from the planned 24/7 hub.

The grant acknowledgement links to the official Income announcement:
https://www.income.com.sg/about-us/corporate-information/press-releases/caregiver-grant

WhatsApp (6859 1962), email (caregiversupport@tzuchi.org.sg), islandwide coverage and weekday 9am-5pm contact hours come from the standee. Contact links open the visitor's messaging app; the website does not collect or submit enquiry data.

## Files

- Top-level HTML files contain the public pages.
- `streams/` contains the four support detail pages.
- `css/refinements.css` applies the navy-and-cream refinements after existing styles.
- `js/main.js` controls mobile navigation and active-page indicators.
- FAQs use native HTML disclosure elements and work without JavaScript.
- `assets/documents/p3h-caregiver-support.pdf` is the original print standee.

## Content still to supply

- Approved caregiver and volunteer stories, consent and photographs.
- Confirmed activity schedules, venues and accessibility information.
- Current access arrangements, eligibility and costs for specific services.
- Verified descriptions and URLs for SEEN, GLOW and Longevity Courtyard.
- Approved external caregiver guides and downloadable resources.

The stories and venues pages explain that details are pending. Add approved content to the existing HTML pages when available. Do not substitute invented testimonials, schedules or eligibility rules.

## Hosting

Serve `p3h-website` as the static site root. No build step is required. Preserve the folder structure and UTF-8 encoding; serve HTML, CSS, JavaScript and PDFs with their appropriate content types.

## P3H companion chatbot

Every page has an **Ask P3H** button. The responsive chat offers answers about support, eligibility, rewards and contact details, plus three guided tutorials: getting started, finding caregiver support and using digital wellness. Local answers link to the relevant website pages. Unknown questions are referred to the team. Conversations stay in memory and clear on navigation or New chat.

The local guide works without credentials, including on static hosting. For AI answers, set `OPENAI_API_KEY` in your server environment and run `Start-Website.ps1` from that same PowerShell session. Set `OPENAI_MODEL` to change the default `gpt-4.1-mini`. Never put a key in HTML, JavaScript or a committed file. The existing double-click launcher also supports an inherited environment key.

The Windows server exposes `GET /api/chat/status` and `POST /api/chat`. It uses the [OpenAI Responses API](https://developers.openai.com/api/docs/quickstart), sends the last ten chat messages with the question, discovers the website's HTML pages at request time (excluding test fixtures), and supplies page titles, headings, content and link targets as grounded knowledge. This keeps AI answers aligned when website content changes without requiring a separate chatbot index. It sets `store: false`. AI mode displays a notice that questions are sent to OpenAI. No chat history is saved by this website. Provider data handling still applies. An unavailable AI connection falls back to the clearly labelled local guide.

The PowerShell server is a loopback-only local preview server. It validates input size and roles, limits AI requests to twelve per minute, and does not serve PowerShell or credential files. It handles requests sequentially. For public AI hosting, implement the same API routes in a production backend with server-side secrets and suitable access and rate controls; static hosting alone provides the local guide.

Keep the topic answers in `js/chatbot.js` aligned with approved content when programme details change. AI answers read the current HTML source at request time. Tutorials explain website-supported steps and do not assume unverified platform screens or installation links.

### Chatbot regression checks

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Chatbot-Api.Tests.ps1` for provider-contract and input-validation checks. These mock the provider and do not require an API key or make paid requests. With the local server running, open `/tests/chatbot.html` for browser checks covering answer matching, tutorials, safe rendering, AI fallback, source links, bounded conversation history and request cancellation. This test page simulates AI responses; run it on desktop and mobile viewports. Live provider quality and account access must be verified separately with a configured server key.

## April 2026 media release update

The supplied media release dated 7 April 2026 is available at assets/documents/p3h-media-release-20260407.pdf. It confirms the 1 April soft launch at GLOW (Nanyang), Healthy-Tec collaboration, home/centre respite, micro jobs, digital wellness categories and Crystal Economy. The published annual caregiver targets sum to 2,800 (700 + 900 + 1,200), replacing the earlier rounded 3,000 figure. Reward details are attributed to the April release; visitors are directed to the team for current arrangements. No GLOW address or installation link was supplied, so these are requested through the team.
