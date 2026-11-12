# P3H navigation audit and implementation

Reviewed 12 November 2026. Scope: all 16 public HTML routes; header, footer and body links; support and grant filters; activity carousels; FAQs; chatbot answers, tutorials and source links; associated CSS; local preview/API scripts; and existing regression fixtures. Test pages are developer tools, not public navigation destinations. Documents and images are retained as content assets.

This repository is the public caregiver information website. It contains no authenticated staff application, dashboard, Administration, Settings, analytics or social media management. Those example features were not added. Home remains the consistent starting point.

## Findings before changes

| Existing route | Purpose and navigation issue | Primary home after changes |
| --- | --- | --- |
| `index.html` | Introduction plus the same four support cards shown on Assistance; multiple programme shortcuts and registration entry | Home: introduction, reach target, expandable programme background and partners |
| `target-groups.html` | Small audience explanation split away from support selection | Caregiver support: expandable Who is P3H for? |
| `how-we-help.html` | Label suggests general help, but page contains only financial grants; sends visitors back to Assistance | Caregiver support: Financial grants |
| `assistance.html` | Four redirect cards, another assistance catalogue, and a duplicated standee download | Caregiver support: single workspace with five sections |
| `streams/stream-1.html` | Care navigation detail, grant link, repeated eligibility and unrelated programme/digital links | Caregiver support: expandable care navigation option |
| `streams/stream-2.html` | Training description separated from the actual partner training catalogue | Caregiver support: expandable training option and Training section |
| `streams/stream-3.html` | Respite detail duplicated in Programmes; repeated digital cross-link | Caregiver support: expandable respite option |
| `streams/stream-4.html` | Peer support detail with repeated eligibility and programme/digital links | Caregiver support: expandable peer support option |
| `programmes.html` | Mixes launch history, respite, micro-jobs, training, discounts and digital wellness | Background on Home; services, training and digital wellness in Caregiver support |
| `activities.html` | Working photo carousels hidden under More | Activities: direct primary destination; carousels retained |
| `venues.html` | Sparse visit guidance requires a second trip to Contact for practical action | Contact: Plan your visit |
| `resources.html` | Downloads and external caregiver resources; standee repeated on Assistance | Resources & FAQs: one download entry and external resource |
| `faq.html` | Common questions hidden under More; registration/contact links repeat Contact | Resources & FAQs: native expandable answers; registration points to Contact |
| `partners.html` | Background, launch, funding and reach targets separate from introduction | Home: expandable About P3H & our partners |
| `testimonies.html` | Immediate redirect to Activities with no content | Full Activities compatibility route; no refresh redirect |

The old header exposed eleven destinations across six direct links and a generic More menu. Three adjacent labels (How We Help, Assistance, Programmes) did not distinguish tasks. Four support details repeated eligibility text, programme links and digital links. Home repeated the full support selector. The SMF equipment grant appeared in both financial grants and other assistance. Several service cards repeated Contact actions before a further referral action. The footer repeated Assistance, Resources and FAQs on every page. The chatbot could independently lead visitors into all of those paths.

## Implemented hierarchy and feature ownership

| Primary destination | Content owned here | Interaction |
| --- | --- | --- |
| Home | Introduction, reach target, programme background, launch and partners | About disclosure; prominent support and joining actions |
| Caregiver support | Support options; grants; care and daily living services; training; digital wellness | Five flat section links, native support disclosures, existing grant/service filters |
| Activities | Activity photo galleries and highlights | Existing keyboard-accessible photo controls |
| Resources & FAQs | Standee PDF, external Carers Hub, common questions | Download/external actions and native FAQ disclosures |
| Contact | Registration form, both GLOW WhatsApp contacts, email, contact hours, enquiry preparation, visit guidance | Direct communication and external registration actions |

The header is identical on every route, with an explicit Home destination and one current-page indicator rendered in HTML. Mobile navigation uses the existing Menu control and Escape behaviour. The support section navigation marks the selected section, preserves fragment links and works with Back/Forward. Section changes move focus to the visible heading. Without JavaScript, all support sections remain readable and section links work as anchors. Native disclosures work without JavaScript as well.

Removed the duplicate SMF service card, support redirect cards on Home, generic More menu, repeated footer quick links, Assistance standee copy, service-by-service referral links, and stream-to-programme navigation. All seven financial grants, eight non-grant service entries, ten partner training entries, five digital categories, four support descriptions, activity photos, FAQs, downloads, registration and both team contacts remain available. Content has been reorganised, not replaced with invented services or staff tools.

Some contextual links remain intentionally: a grant's official source, a support description's link to the grant section, registration access from Home, chatbot sources, and Contact in the global navigation/footer and support call to action. These support a specific next step; they do not create competing feature catalogues. The registration form itself has one entry on Contact.

## Journeys

Counts refer to choosing a feature from an already loaded page; scrolling does not count as a click. Expanding optional detail takes an additional click.

| Task | Before | After |
| --- | --- | --- |
| Find a financial grant | Interpret How We Help vs Assistance vs Programmes; some routes require another page | Caregiver support → Financial grants (2 clicks) |
| Read support details | Home or Assistance → separate stream → further programme/grant page | Caregiver support → expand relevant support (2 clicks) |
| Find partner training | Programmes, then scan mixed content | Caregiver support → Training (2 clicks) |
| Find digital wellness | Programmes, or repeated stream cross-links | Caregiver support → Digital wellness (2 clicks) |
| Read FAQs | More → FAQs (2 clicks in desktop header) | Resources & FAQs (1 click, then expand answer) |
| See activity photos | More → Activities | Activities (1 click) |
| Register or arrange a visit | Registration in several places; Venues → Contact | Contact (1 click to destination) |
| Return to starting point | Home or logo | Home or logo (1 click) |

On mobile, opening Menu adds one action. No additional navigation hierarchy is introduced.

## Compatibility and maintenance

Five HTML pages are the editable content sources. `tools/Sync-Layout.ps1` generates shared navigation/footer markup and eleven complete compatibility copies from those sources. Copies are not linked by the normal interface; they have canonical references, `noindex,follow`, and default to the relevant section. Old stream URLs expand the appropriate support description. Old fragments for grant categories, training and digital wellness still work. This preserves static hosting and old bookmarks without new redirect-only pages, client-side fetching or a server dependency.

Edit canonical content only, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Sync-Layout.ps1
```

The chatbot's browser source renderer maps old references to canonical page fragments. Server grounding excludes generated copies, preventing repeated content from biasing answers. Older unused CSS/JS files remain available for compatibility but do not add public destinations.

## Verification

- PowerShell navigation checks: 1,588 assertions across all 16 routes, including local files/fragments, matching structural tags, titles, active navigation, feature counts and absence of links to legacy destinations.
- Headless Chrome navigation: 34/34 desktop checks and 44/44 checks at an exact 390px mobile width, including in-place sections, filters, history, bookmarks, compatibility routes, menu behaviour and overflow.
- Chatbot browser regressions: 59/59 at desktop and mobile widths, including canonical source links and existing conversation behaviour.
- API provider-contract, grounding, invalid-input and incomplete-response checks pass with a mocked provider. No live provider call was needed.
- Desktop and exact 390px mobile support screenshots inspected for hierarchy, spacing, selected navigation and disclosure layout.

Changes are local. Confirmed schedules, addresses and participation arrangements still require approved content from the programme team. No publishing or production configuration change is included.
