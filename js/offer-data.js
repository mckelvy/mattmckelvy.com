/* ============================================================
   Offer model data — section [ 03 / 04 ].
   Single source of truth for every number on screen in that
   section. Figures are illustrative composites built from public
   2026 market data, US, Senior IC (Radford P4-equivalent),
   Zone 1 anchor, cash at 100% attainment. Equity, sign-on,
   SPIFFs, and accelerators excluded. Rounded to $5K.
   Spot-check date for all sources: August 2026.

   How each row was built:

   Role 1 (Sr. Enterprise Account Executive, core SaaS platform).
   Anchor: RepVue Enterprise AE page, median base $140,000 and
   median OTE $280,000 across 12,728 verified submissions as of
   Aug 2026; RepVue mid-year guide notes median Enterprise AE OTE
   moved from $265,000 to $275,000 while base stayed nearly flat
   and the top-performer ceiling rose almost $44,000. Zone 1
   senior composite = national median plus roughly 10% for zone
   and senior scope. Pay mix: 50/50 is the 2026 default for every
   closing role. Context: about 42% of US AEs reach or exceed
   annual quota.

   Role 2 (Sr. Solutions Engineer, pre-sales, core SaaS).
   Anchor: RepVue Sales Engineer page, $146,000 median base,
   $205,000 median OTE, top performers $341,528, 1,745
   submissions, about 61% of SEs hitting quota; top-paying
   employer Moveworks at $335,000 median OTE. Enterprise cut
   (WinsAbove citing RepVue Q1 2026): enterprise SaaS SE median
   OTE $215K on a $162K base, roughly 75/25; cybersecurity and
   data-infrastructure SEs sit $15K-$25K above the cross-industry
   median. KORE1 2026 guide: senior SaaS/cybersecurity SE band
   starts at $160K base, 70/30, $228K OTE; senior SEs at AWS,
   Snowflake, Databricks, CrowdStrike, Palo Alto, and Okta clear
   $230K-$310K OTE before equity. Google posts its SE title
   (Customer Engineer) at $152K-$222K US base. Composite =
   enterprise median plus zone and senior uplift.

   Role 3 (Sr. AI Solutions Engineer, GenAI / AI-platform
   pre-sales). KORE1 (May 2026): AI Solutions Engineers cost
   $130K-$185K mid-level and $190K-$260K senior in the US; the
   pre-sales-flavored version tracks closer to traditional SE at
   $170K-$215K senior base with OTE 25-40% above base, and the
   title hides four different jobs. AISE Pulse: median US AI
   Sales Engineer OTE about $185,000 in early 2026 (mixed level);
   top comp drivers are depth of hands-on LLM and retrieval
   knowledge, enterprise six- and seven-figure deal experience,
   and custom demo / proof-of-concept builds. Modeling: core SE
   base +20% delivered through a 75/25 mix (OTE +12% at P50),
   wider dispersion at P75/P90 reflecting AI-native employers.
   The title alone carries no premium; the skills do.

   Role 4 (Sr. AI Account Executive, AI platform, direct quota).
   RepVue OpenAI page (small sample, directional): Enterprise AE
   base $240,000-$290,000, OTE $300,000-$480,000, 71/29 split,
   average deal size about $460,000, quota near 5x OTE; RepVue
   ranks OpenAI third among top-paying tech employers for
   Enterprise AEs at $480,000 median OTE. Google Cloud AI Sales
   Specialist posts a US base range of $138,000-$200,000 plus
   bonus, equity, and benefits; Google's Security Sales
   Specialist carries the same $138K-$200K range and the Key
   Account Executive is posted at $147K-$205K, i.e. hyperscalers
   level the AI seller as a specialist overlay inside the
   existing sales structure, so the premium lives in level
   placement, variable target, and equity rather than a separate
   base range. AI-native labs pay it through OTE, base-heavy
   mixes, and equity; Anthropic states that for sales roles the
   posted range is the OTE range. Composite modeled at 50/50
   (platform-seller convention) with the lab practice noted on
   screen.

   Zones (Radford-style geographic pay zones; companies using
   tiers group the same way: SF/NY/Seattle at 100%, secondary
   markets at 90-95%, emerging markets at 80-85%). Multipliers
   apply to OTE: base and target incentive scale together,
   including percentiles, range, and peers. Many companies apply
   differentials to base only or price quota-carrying roles
   nationally; both practices exist.
   ============================================================ */
window.OFFER_DATA = {
  checked: "August 2026",
  level: "Senior IC (Radford P4-equivalent)",

  zones: {
    z1: { name: "Zone 1", mult: 1.00, metros: "SF Bay Area, NYC, Seattle" },
    z2: { name: "Zone 2", mult: 0.92, metros: "Boston, LA, San Diego, DC, Austin, Chicago, Denver" },
    z3: { name: "Zone 3", mult: 0.85, metros: "all other US" }
  },

  /* market target: range midpoint = chosen percentile.
     P60 = log-linear interpolation between P50 and P75. */
  targets: {
    p50: { name: "P50", stance: "match the market" },
    p60: { name: "P60", stance: "lead slightly" },
    p75: { name: "P75", stance: "lead the market" }
  },
  rangeSpread: { minF: 0.80, maxF: 1.20 },   /* 50% range spread */

  /* placement guideline: candidate assessment maps to range thirds */
  assess: {
    dev:  { name: "developing",     lo: 0,       hi: 1 / 3 },
    prof: { name: "proficient",     lo: 1 / 3,   hi: 2 / 3 },
    exp:  { name: "deep expertise", lo: 2 / 3,   hi: 1 }
  },

  /* internal peers: illustrative compa-ratios vs the zone-adjusted midpoint */
  peerRatios: [0.90, 0.95, 0.97, 1.00, 1.03, 1.06, 1.12],

  roles: {
    r1: {
      name: "Sr. Enterprise Account Executive",
      short: "Sr. Enterprise AE",
      family: "core SaaS platform, direct quota",
      mix: { base: 0.50, variable: 0.50 }, varWord: "target commission",
      pct: { p25: 270000, p50: 310000, p75: 360000, p90: 410000 },
      quotaAtP50Z1: 1500000,
      sibling: null
    },
    r2: {
      name: "Sr. Solutions Engineer",
      short: "Sr. Solutions Engineer",
      family: "pre-sales, core SaaS",
      mix: { base: 0.70, variable: 0.30 }, varWord: "target incentive",
      pct: { p25: 215000, p50: 250000, p75: 290000, p90: 330000 },
      quotaAtP50Z1: null,
      sibling: null
    },
    r3: {
      name: "Sr. AI Solutions Engineer",
      short: "Sr. AI Solutions Engineer",
      family: "GenAI / AI-platform pre-sales",
      mix: { base: 0.75, variable: 0.25 }, varWord: "target incentive",
      pct: { p25: 240000, p50: 280000, p75: 330000, p90: 385000 },
      quotaAtP50Z1: null,
      sibling: "r2"
    },
    r4: {
      name: "Sr. AI Account Executive",
      short: "Sr. AI Account Executive",
      family: "AI platform, direct quota",
      mix: { base: 0.50, variable: 0.50 }, varWord: "target commission",
      pct: { p25: 300000, p50: 350000, p75: 420000, p90: 480000 },
      quotaAtP50Z1: 1750000,
      sibling: "r1"
    }
  },

  /* "What the market is pricing" panel, verbatim content */
  panel: {
    r1: {
      priced: ["Full-cycle enterprise selling (six- and seven-figure ACV, multi-threaded, 6 to 12 month cycles)", "Qualification discipline (MEDDICC/MEDDPICC), forecast accuracy, self-sourced pipeline", "Executive relationships and business-case selling", "Procurement, legal, and security-review navigation", "Partner and channel co-sell"],
      drivers: ["Consistent attainment and President's Club history", "Strategic or named-account experience", "Vertical depth (financial services, healthcare, public sector)"],
      why: "The rep carries the closing risk, so half of OTE is at risk (50/50) and quota sits near 5x OTE.",
      demand: "Median Enterprise AE OTE rose from $265K to $275K in RepVue's mid-year 2026 update while base stayed flat; the money moved into variable and the ceiling.",
      real: "The standard quota-carrying closer at enterprise software vendors and the largest sales sample RepVue tracks."
    },
    r2: {
      priced: ["Discovery-led demos and custom demo environments", "Proof-of-concept (POC/POV) design and execution", "RFP/RFI responses", "Enterprise integration and architecture (APIs, SSO/SAML/SCIM, data pipelines)", "Security and compliance questionnaires (SOC 2, ISO 27001)", "Technical-win ownership and clean handoff to implementation"],
      drivers: ["Cybersecurity or data-infrastructure domain (roughly $15K to $25K over the cross-industry median)", "Production-grade coding", "Running complex POCs independently"],
      why: "A shared-quota technical role, so the mix is base-heavy (70/30) and variable typically pays on supported-deal or team attainment; about 61% of SEs hit quota versus 42% of AEs.",
      demand: "Median SE OTE $205K, top performers $341K (RepVue, Aug 2026); senior SEs at cloud, data, and security platforms clear $230K to $310K OTE.",
      real: "The pre-sales technical lead paired with AEs (demos, technical evaluations, POCs, RFPs). Google's title for it is Customer Engineer."
    },
    r3: {
      priced: ["Everything in role 2, plus LLM application patterns (retrieval-augmented generation on enterprise knowledge, agent and tool-use workflows, evaluation frameworks, guardrails and hallucination handling)", "Hands-on Python, LLM APIs, vector databases, cloud AI platforms (Bedrock, Vertex, Azure OpenAI)", "Pilot scoping to production (SOW definition, data readiness, security and privacy review of model use, latency and token-cost tradeoffs)", "Selling to technical buyers (CTO, CDO, ML platform and data teams)"],
      drivers: ["Depth of hands-on LLM and retrieval work", "Production-quality code plus enterprise deal cycles (the three drivers AISE Pulse identifies)", "Clarity about which of the four \"AI SE\" jobs this is (pre-sales, not forward-deployed or post-sales)"],
      why: "The talent pool overlaps with ML and software engineering, which is priced on fixed pay, so the premium arrives mostly through base (75/25 mix, base +20% over the core SE) rather than variable. The title alone carries no premium (the mixed-level AI SE median OTE is about $185K); the skills do.",
      demand: "Postings mentioning at least one AI skill advertise 28% higher salaries, and 43% higher with at least two; the largest premiums appear in customer and client support, sales, and manufacturing (Lightcast, 1.3B postings).",
      real: "The pre-sales SE for AI platforms (Databricks' Specialist Solutions Architect for GenAI, Scale AI's enterprise Solutions Engineer, the AI-flavored SE at model labs), distinct from forward-deployed and post-sales engineers."
    },
    r4: {
      priced: ["Everything in role 1, plus consumption and usage-based selling and forecasting (tokens, compute, committed spend) rather than seat-based ARR", "Use-case discovery for a new category, working with product teams so customers can build on the platform", "Technical-buyer fluency (CTO, CDO, Head of AI) and AI-specific objections (data usage and training rights, model risk, privacy, governance, evaluation)", "Pilot-to-enterprise expansion", "Hyperscaler and SI partner ecosystems, including marketplace transactions"],
      drivers: ["Enterprise pedigree combined with real AI product fluency is a thin pool", "AI-native deal sizes are large (average deal near $460K at the best-known lab per RepVue)"],
      why: "Demand and scarcity, and the employer type decides where the premium shows up. AI-native labs pay it through OTE, base-heavy mixes (about 70/30) and equity; hyperscalers level the AI seller as a specialist overlay with the same base range as other specialists, so the premium lives in level, variable target, and equity.",
      demand: "Jobs requiring specific AI skills are growing almost eight times faster (69%) than the total jobs market (9%), with the average AI-skills wage premium at 62% (PwC 2026, job-ad based, all occupations; directional only, never applied to a sales range).",
      real: "The direct-quota enterprise seller at AI-native vendors; hyperscalers run the same work as a specialist overlay titled AI Sales Specialist (Google Cloud)."
    },
    aiFooter: "Hot-skill premiums are administered as a market premium or a specialist job profile, reviewed annually, not by inflating the whole job family; the skill adds no value on its own, and companies pay for its application to deliver differentiated performance (WorldatWork / Korn Ferry)."
  },

  sources: [
    "RepVue Enterprise AE and Sales Engineer salary pages (Aug 2026; n=12,728 and n=1,745)",
    "RepVue mid-year 2026 Sales Salary Guide (July 2026)",
    "RepVue OpenAI company page (small sample, directional)",
    "Google Careers postings: AI Sales Specialist, Customer Engineer, Key Account Executive (2026, US base only)",
    "KORE1 2026 Sales Engineer Salary Guide and \"How to Hire AI Solutions Engineers in 2026\" (May 2026)",
    "AISE Pulse AI Sales Engineer Salary Guide (2026; postings and pay-transparency filings)",
    "Bridge Group SaaS AE report and 2026 benchmark summaries (pay-mix conventions)",
    "Lightcast, \"Beyond the Buzz\" (July 2025)",
    "PwC 2026 Global AI Jobs Barometer (June 2026)",
    "WorldatWork Workspan Daily on AI skill premiums (Aug 2025)",
    "Pave and SHRM/Radford for geographic pay zones; Radford Global Job Leveling for level nomenclature"
  ],
  assumptions: "Modeling choices: composites of national medians adjusted for zone and level, rounded to $5K; 50% range spread (min 0.80x, max 1.20x of midpoint); zone multipliers applied to OTE, base and variable together (many companies apply differentials to base only, or price quota-carrying roles nationally; both practices exist); P60 interpolated log-linearly between P50 and P75; internal peers illustrative; licensed survey data (Radford, Mercer) was not used; nothing from Cisco."
};
