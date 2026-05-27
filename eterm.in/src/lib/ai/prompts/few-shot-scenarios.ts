// =============================================================================
// lib/ai/prompts/few-shot-scenarios.ts
// Canonical cases defining exact tone, structure, and intelligence level
// =============================================================================

export interface Scenario {
  id: string;
  label: string;
  profile_summary: string;
  vulnerability_opening: string;
  explanation: string;
  options: string[];
  critical_action: string;
  tags: string[];
}

export const SCENARIO_LIBRARY: Scenario[] = [
  {
    id: 'S001',
    label: 'NRI Dubai | Diabetic | High accumulation',
    profile_summary: 'HbA1c 7.8 | Age 44 | NRI Dubai | Existing cover Rs. 8 Cr | Applying Rs. 12 Cr',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not the diabetes. It is cover accumulation combined with GCC residency and imminent financial scrutiny.',
    explanation: `Your post-application TSAR will be Rs. 20 Cr. Company M's NRI TSAR cap is Rs. 25 Cr — you are not at the ceiling, but you are in the zone where detailed financial justification is mandatory. The GCC residency (Dubai) historically attracts conservative reinsurer positioning above Rs. 5 Cr. The HbA1c of 7.8% is a loading factor, not a decline factor — but it adds complexity to a file that financial underwriting will already scrutinize closely.`,
    options: [
      "Apply to Company H first — historically the most favorable for GCC NRI profiles with metabolic conditions at this SA level",
      "Stage the cover: apply for Rs. 7 Cr now with full financial documentation — then revisit Rs. 5 Cr addition after 18 months",
      "Strengthen the financial file: CA-certified assets and liabilities statement, 6 months bank statements across all accounts",
      "If the full Rs. 12 Cr is essential now, consider splitting across two insurers — family accumulation limits allow this"
    ],
    critical_action: "Prepare the financial justification file before medical — in this case, financial is the primary gate.",
    tags: ['nri', 'gcc', 'diabetic', 'large_cover', 'accumulation']
  },
  {
    id: 'S002',
    label: 'Self-employed | Income gap | wants 3 Cr',
    profile_summary: 'Age 38 | Self-employed | ITR income Rs. 6L | Wants Rs. 3 Cr cover',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not your income level. It is the gap between your ITR income and your actual economic capacity — and there are four legal paths that address it.',
    explanation: `At age 38, self-employed, with assessed income of Rs. 6L, the standard income multiplier (20x) yields a maximum TSAR of Rs. 1.2 Cr — well below your Rs. 3 Cr target. This is a financial underwriting constraint, not a medical one.`,
    options: [
      "Bank account surrogate (Company M): if your average monthly credit balance is Rs. 2.5L+, derived income is Rs. 25L → Rs. 5 Cr eligibility",
      "EPFO route: average monthly employer contribution x 120 gives derived income",
      "SIP surrogate: if your monthly SIP is Rs. 1L+, derived income = Rs. 30L → Rs. 6 Cr eligibility",
      "AltFin V2 (Company M): with CIBIL >= 750 and declared income >= Rs. 5L, AI model approves without standard income proof up to Rs. 1.99 Cr"
    ],
    critical_action: "Pull 6 months bank statements today. The average monthly credit balance number will tell you within 5 minutes whether the bank account surrogate route works.",
    tags: ['self_employed', 'income_gap', 'surrogate', 'altfin']
  },
  {
    id: 'S003',
    label: 'Business owner | wants tax efficiency + family protection',
    profile_summary: 'Age 42 | Director | Salary Rs. 24L | Company profit Rs. 80L | Wants Rs. 5 Cr',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not financial or medical. It is that you are solving a multi-dimensional problem with a single-dimension instrument.',
    explanation: `A standard Rs. 5 Cr personal term plan protects your family but misses two significant opportunities. First, the premium is paid from post-tax personal income when it could be a pre-tax business expense. Second, a personal policy is vulnerable to creditors and business liabilities.`,
    options: [
      "Keyman + MWPA combination: Rs. 3 Cr as company-owned keyman policy (premium = business expense), Rs. 2 Cr personal MWPA policy",
      "Employer-Employee structure: company pays full Rs. 5 Cr premium under Section 37(1) — premium deductible",
      "HUF overlay: if a HUF exists, separate policy on Karta's life unlocks additional Rs. 1.5 Cr Section 80C deduction",
      "MWPA-only: at minimum, ensure the personal policy is declared under MWPA — claim becomes permanently unreachable by creditors"
    ],
    critical_action: "Ask your CA: (1) Is there a constituted HUF? (2) Can the company pay the premium under Section 37(1)?",
    tags: ['business_owner', 'keyman', 'mwpa', 'huf', 'tax_efficiency']
  },
  {
    id: 'S004',
    label: 'Prior decline | reapproach strategy',
    profile_summary: 'Age 39 | Salaried | Declined 2 years ago for cardiac concern | Now healthy | wants Rs. 2 Cr',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not your current health. It is the IIB record of the prior decline — and how the reason is documented this time.',
    explanation: `The IIB carries your prior decline. Every insurer sees it. The underwriter's first question is not "what is wrong with him now" — it is "why was he declined, and has that condition been resolved with sufficient documentation?"`,
    options: [
      "Commission a current cardiologist evaluation: ECG, TMT, 2D Echo, lipid profile — and obtain a physician's letter confirming current cardiac status",
      "Prepare a 2-year health timeline: dates of investigations, results, treating physician, medication changes, current status",
      "Apply to Company H first: most systematic process for declined-and-reapplied cases with structured Facultative RI referral",
      "Consider Rs. 1.5 Cr first: lower SA reduces financial scrutiny threshold — then top up after 18 months of clean in-force history"
    ],
    critical_action: "The cardiologist letter is the single most important document. Without it, you are asking an underwriter to accept uncertainty. With it, you are giving them a reason to say yes.",
    tags: ['prior_decline', 'cardiac', 'reapproach', 'documentation']
  },
  {
    id: 'S005',
    label: 'NRI USA | High income | wants large cover',
    profile_summary: 'Age 35 | NRI USA | Income $180K | Wants Rs. 15 Cr | Existing Rs. 3 Cr',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not your income level. It is the currency mismatch and the NRI cap that most advisors do not know exists.',
    explanation: `Your USD income of $180K translates to approximately Rs. 1.5 Cr annually — at age 35, that supports a TSAR of Rs. 37.5 Cr under standard multipliers. However, as an NRI, the TSAR cap across all three insurers is Rs. 25 Cr. Your post-application TSAR would be Rs. 18 Cr — well within the cap, but the income proof requirements for NRI are stricter.`,
    options: [
      "Company H first: highest NRI VMER limit (Rs. 5 Cr for Graduate + high income) and most systematic NRI documentation process",
      "Split strategy: Rs. 10 Cr with Company H (VMER-eligible) and Rs. 5 Cr with Company T — diversifying reinsurer exposure",
      "Prepare dual-currency documentation: USD salary slips + W-2 or 1099 + 6 months US bank statements",
      "Consider timing: if you plan to return to India within 3 years, a resident Indian application removes the Rs. 25 Cr cap entirely"
    ],
    critical_action: "Gather 6 months of US bank statements showing consistent salary credits. This is the non-negotiable document for all three insurers.",
    tags: ['nri', 'usa', 'large_cover', 'currency_mismatch', 'documentation']
  },
  {
    id: 'S006',
    label: 'Housewife | Husband high income | wants independent cover',
    profile_summary: 'Age 32 | Housewife | Husband income Rs. 45L | Wants Rs. 1 Cr | Graduate',
    vulnerability_opening: 'Your biggest underwriting vulnerability is not your lack of personal income. It is that most platforms do not know how to underwrite a housewife correctly — and the rules are specific.',
    explanation: `As a Graduate housewife, you are eligible for up to Rs. 1 Cr cover based on household income. Your husband's Rs. 45L income easily satisfies the >= Rs. 10L requirement for SA Rs. 50L–1 Cr. However, medicals are mandatory — physical examination plus VMER/PIVC.`,
    options: [
      "Standard individual policy: husband's income proof (Form 16/ITR/salary slips + bank statement) + your identity proof + marriage certificate",
      "MWPA overlay: declare the policy under MWPA at proposal stage — protects claim from any future business liabilities of your husband",
      "HUF structure: if a HUF exists, the HUF can take a separate policy on your husband's life, giving additional Rs. 1.5 Cr Section 80C deduction",
      "Joint life consideration: compare cost of joint life policy vs. two individual policies"
    ],
    critical_action: "Confirm your husband's most recent Form 16 or ITR. This is the income proof that unlocks your eligibility.",
    tags: ['housewife', 'family_income', 'mwpa', 'documentation']
  }
];

export function selectScenariosForProfile(profile: any): Scenario[] {
  const tags = new Set<string>();

  if (['nri', 'oci', 'pio'].includes(profile.residency)) tags.add('nri');
  if (profile.country?.toLowerCase().includes('dubai') || profile.country?.toLowerCase().includes('uae')) tags.add('gcc');
  if (profile.country?.toLowerCase().includes('usa')) tags.add('usa');
  if (profile.hba1c && profile.hba1c > 7) tags.add('diabetic');
  if (profile.occupation === 'self_employed') tags.add('self_employed');
  if (profile.occupation === 'housewife') tags.add('housewife');
  if (['keyman', 'partnership', 'employer_employee', 'huf'].includes(profile.insurance_type)) tags.add('business_owner');
  if (profile.prior_decisions?.includes('decline')) tags.add('prior_decline');
  if ((profile.sa_requested_cr ?? 0) > 5) tags.add('large_cover');
  if ((profile.cover_gap_cr ?? 0) > 0 || (profile.hlv_gap_cr ?? 0) > 0) tags.add('income_gap');
  if (profile.cardiac_history) tags.add('cardiac');

  const scored = SCENARIO_LIBRARY.map(s => ({
    scenario: s,
    score: s.tags.filter(t => tags.has(t)).length
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.filter(s => s.score > 0).slice(0, 2).map(s => s.scenario).length > 0
    ? scored.filter(s => s.score > 0).slice(0, 2).map(s => s.scenario)
    : SCENARIO_LIBRARY.slice(0, 2);
}