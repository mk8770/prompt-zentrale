# Universal Business Sales Demo Template

**Version:** v1.0.4
**Updated:** 14.10.2026 - 20:52 Uhr (Helsinki)

---

You are a senior full-stack developer and expert UI/UX designer. Build a complete, highly responsive website template based on the specific business CATEGORY selected by the user below, engineered as a high-converting sales demo.

CRITICAL IMAGE REQUIREMENT: You must use the image that I have uploaded here in this prompt window as the default, main background image for the Hero Section. Ensure it is rendered as the primary visual asset upon initial load.

CRITICAL INLINE REQUIREMENT: You are strictly FORBIDDEN from building a separate control panel, sidebar dashboard, or popup window for editing. Absolutely 100 percent of the editing must happen directly on the public elements. When the presenter logs in with the password 2026, the website elements themselves must become content-editable fields. Clicking text must turn that text block into an input field on the spot. Adding or deleting items, gallery images, or events must be done via small plus and cross icons rendered right next to the existing elements on the public page. No separate admin dashboard view or control panel is allowed.

SECTION 1: GLOBAL CONTROLS & DYNAMIC MULTI-THEME SWITCHER
Language Switcher: Implement a prominent toggle button styled like a pill (tablette design) in the header. It must allow the user to instantly switch the entire website between English and Finnish. All text content must change based on the active language.
Live Design Theme Switcher: Add a sleek floating theme switcher widget at the bottom corner of the screen. Toggling a theme must instantly update the visual color system AND dynamically swap BOTH the default section titles and the entire body text paragraphs underneath across the page to match the vibe and tone of that selected style.
THEME CONFIGURATION SCHEMA: Generate 5 distinct visual styles plus 1 Underground/Alternative style. Register these themes so the floating theme switcher can toggle them dynamically:
Theme 1: Modern Nordic Kallio
Theme 2: Irish
Theme 3: Craft
Theme 4: Sports
Theme 5: Rock
Theme 6: Neon Dive Bar
Rule A High Contrast: For each theme, map button text colors to ensure perfect contrast against button backgrounds.
Rule B Story Shifting: For each theme, automatically generate unique headlines and storytelling text that perfectly capture the vocabulary, brand identity, and atmosphere of that design.
Inline Admin Login Access: Place an Admin Login button directly next to the language switcher pill in the header. Clicking it opens a tiny inline credentials bar inside the navigation.
Hardcoded Credentials: The password must be hardcoded strictly to 2026 to instantly unlock Edit Mode.

SECTION 2: THE INLINE EDIT MODE
Language-Specific Toggle: Place a small sticky toggle bar to switch between editing English and Finnish inline blocks.
Inline Section Toggle: Provide an inline hide/show toggle badge next to the header of the Special Features section to collapse the layout seamlessly if hidden.
Direct Inline CRUD: Edit headlines, descriptions, items, and marquee texts directly inline. Render small inline plus and cross icons next to list items for live page modification.
Mobile-Friendly Inline Image Upload: Render an inline image icon next to editable images triggering a native file selector (Max 5MB, JPEG/PNG/WEBP). Custom uploads permanently lock that slot from automated theme-switching.

SECTION 3: UNIVERSAL PUBLIC WEBSITE STRUCTURE
STICKY NAVIGATION: Brand Name/Logo on the left. Navigation links, Language Switcher, and Admin Access on the far right.
TOP MARQUEE POSITIONING: Build a slow-moving horizontal marquee ticker banner positioned EXACTLY BELOW the sticky navigation bar and directly ABOVE the hero section.
Rule A Typo Scale: The text within this marquee banner must be styled extra large, prominent, and bold (text-2xl or text-3xl).
Rule B Freezing: When inline Admin Edit Mode is active, the CSS animation scroll of BOTH the Top Marquee and the Testimonials Marquee must instantly FREEZE and pause completely.
HERO SECTION: Features user-uploaded image as background overlay. Automatically generate dynamic titles and buttons.
ABOUT US SECTION: Clean split layout. Left side displays dynamic title and story text shifting with the theme. Right side shows a photo of the interior.
3. DYNAMIC OFFERINGS SECTION (STRICT VERTICAL MENU LIST LAYOUT):
- BAN ALL SINGLE-PRICE BLOCKS: The AI builder is strictly FORBIDDEN from rendering each column as a single giant card displaying only one generic title and one global price block.
- ENFORCE MULTI-ITEM VERTICAL LISTS: Each of the 4 columns within the side-by-side grid layout MUST be built as a clean, structured price-list card (matching the pristine white list look from the user's reference image). Inside each container, there must be a vertical stack cleanly listing 5 distinct, individual items stacked under each other.
- ITEM ROW ANATOMY: Every individual menu item row within a column must use a flexible flexbox space-between layout. The Item Name text must sit on the far left, and the Price text must sit on the far right, aligned perfectly in a razor-sharp vertical line.
- HARDCODED HELSINKI MENU REPOSITORY DATA:
  * Column 1 (HANASTA): Karhu (7€), Lapin Kulta (7€), Koff (7€), Guinness (7€), Seasonal Craft (7€).
  * Column 2 (COCKTAILIT): Long Island Iced Tea (11€), Moscow Mule (11€), Gin & Tonic (11€), Aperol Spritz (11€), House Special (11€).
  * Column 3 (SHOTIT JA VIINAT): Koskenkorva (6,50€), Jägermeister (6,50€), Jameson (6,50€), Jack Daniel's (6,50€), Fernet-Branca (6,50€).
  * Column 4 (ALKOHOLITTOMAT): Soft Drinks (4€), Fresh Juice (4€), Espresso (4€), Mineral Water (3€), Virgin Cocktails (4€).
- FULL INLINE EDIT MODE (PASSWORD 2026): When the presenter logs in with the password 2026, every single item name string and every single price text within these vertical lists must turn into an independent content-editable field for live, seamless modification on the spot.
DYNAMIC GALLERY SECTION: Mixed asymmetry grid of 6 initial image slots (landscape, square, portrait). Placeholder images automatically cycle to match themes via Pexels API unless overridden by custom uploads.
SPECIAL FEATURES AND HIGHLIGHTS SECTION: Marketing grid detailing three dynamic events or unique selling points tailored to the business type.
DEMO LEAD OR BOOKING FORM: Functional niche demo form (Max 6 people or dates). Submitting shows an inline success popup and logs data directly into the inline viewer log.
TESTIMONIALS MARQUEE: Slow marquee running right to left with realistic guest reviews (~50% English, ~40% Finnish, <10% German/Spanish).
CONTACT & SOCIAL INTERACTIVE CARD: Footer displaying opening hours, address placeholder, and social links. For maps, embed a standard native HTML iframe with a public maps URL to avoid blank screen billing errors.

SECTION 4: ACTIVE BUSINESS CATEGORIES
Category 1: PUB (Default Name: [Name des Unternehmens])
- Offerings: Hanasta (7€), Cocktailit (11€), Shotit (6,50€), Alkoholittomat (4€).
Category 2: CAFE
- Offerings: Kahvi & Tee (3,50€-5,50€), Leivonnaiset (4€-6€), Lounas (8,50€-12€), Kylmät Juomat (5€).
Category 3: BEAUTY SALON
- Offerings: Kasvohoidot (65€-95€), Ripset & Kulmat (25€-45€), Sokerointi (20€-55€), Kädet & Jalat (45€-75€).
Category 4: FRÖSÖN / PARTURI
- Offerings: Hiukset (30€-45€), Parta (20€-35€), Paketit (55€-70€), Tuotteet (15€-25€).
Category 5: ZAHNARZT
- Offerings: Tarkastus (60€-90€), Puhdistus (85€), Hoidot (110€-250€), Esteettinen (150€-300€).
Category 6: NAGELSTUDIO
- Offerings: Geelikynnet (85€-110€), Huolto (65€-80€), Geelilakkaus (40€-55€), Nail Art (5€-30€).
Category 7: RESTAURANT / PIZZERIA
- Offerings: Alkupalat (6€-12€), Pizzat (12,50€-18,50€), Pastat (14€-19,50€), Jälkiruoat (7€).
Category 8: ELEKTRIKER
- Offerings: Kotitaloudet (65€/h), Asennukset (Flat), Saneeraus (Diag), Päivystys (120€).
Category 9: PHYSIOTHERAPIE
- Offerings: Konsultaatio (75€), Terapia (65€), Hieronnasta (70€), Kotikäynnit (95€).
Category 10: TIERÄRZTE
- Offerings: Tarkastus (55€), Rokotukset (45€-65€), Hammas (150€), Laboratorio (40€).
Category 11: SCHLÜSSELDIENST
- Offerings: Oven Avaaja (80€), Yöpäivystys (150€), Lukot (95€), Turvallisuus (Audit).
Category 12: MASSAGE
- Offerings: Klassinen (60€), Urheilu (65€), Kuumakivi (80€), Aromi (70€).
