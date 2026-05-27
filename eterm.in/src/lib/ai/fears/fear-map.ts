// =============================================================================
// lib/ai/fears/fear-map.ts
// The Nine Fears — Complete Resolution Architecture
// =============================================================================

export const FEAR_MAP = {

  F1_REJECTION: {
    trigger_signals: ['prior_decline', 'loading_history', 'high_hba1c', 'cardiac_history', 'high_bmi', 'tobacco_recent'],
    user_articulation: "Will I get rejected?",
    underlying_need: "Tell me honestly if I have a real problem, and if I do, tell me what to do about it.",
    ai_response_mode: 'VULNERABILITY_AUDIT',
    resolution_path: 'Precise probability language + which insurer is most favorable + what changes the outcome',
    advisor_competency_needed: 'substandard_lives_score',
    priority_weight: 100
  },

  F2_LOADING: {
    trigger_signals: ['hba1c_gt_7', 'bmi_gt_30', 'bp_history', 'thyroid', 'asthma_moderate'],
    user_articulation: "Will I get loaded? How much extra will I pay?",
    underlying_need: "I want to know the true cost before I commit time and medical fees.",
    ai_response_mode: 'LOADING_ESTIMATE',
    resolution_path: 'Loading range estimate + which insurer loads least + how to reduce loading over time',
    advisor_competency_needed: 'substandard_lives_score',
    priority_weight: 90
  },

  F3_CLAIM_RISK: {
    trigger_signals: ['non_disclosure_risk', 'multiple_policies', 'large_sa', 'business_insurance', 'complex_structure'],
    user_articulation: "Will my family actually receive the claim?",
    underlying_need: "I am terrified my family will go through the process and still not get paid.",
    ai_response_mode: 'CLAIM_FORTRESS',
    resolution_path: 'Disclosure checklist + claim trigger documentation + MWPA protection + insurer claims track record',
    advisor_competency_needed: 'claims_facilitation_score',
    priority_weight: 95
  },

  F4_INSURER_FIT: {
    trigger_signals: ['complex_profile', 'nri', 'health_condition', 'high_sa', 'business_insurance'],
    user_articulation: "Which insurer secretly prefers my profile?",
    underlying_need: "I know insurers have preferences they don't publish. Tell me what they are.",
    ai_response_mode: 'INSURER_MATCHING',
    resolution_path: 'Company T vs H vs M fit scores with reasons + which insurer is most favorable for this exact profile combination',
    advisor_competency_needed: 'multi_company_specialist',
    priority_weight: 85
  },

  F5_STRUCTURE: {
    trigger_signals: ['business_owner', 'huf_possible', 'mwpa_possible', 'ee_possible', 'keyman_possible', 'high_income'],
    user_articulation: "Can I structure this smarter?",
    underlying_need: "I feel like I am leaving money or protection on the table by not knowing the right structure.",
    ai_response_mode: 'STRUCTURE_ARCHITECT',
    resolution_path: 'MWPA / EE / HUF / Keyman analysis + tax optimization + cover architecture across structures',
    advisor_competency_needed: 'business_insurance_architect',
    priority_weight: 80
  },

  F6_PRESENTATION: {
    trigger_signals: ['income_proof_weak', 'self_employed', 'surrogate_needed', 'gap_between_desired_and_eligible'],
    user_articulation: "Can I hide risk legally through better presentation?",
    underlying_need: "I want to know every legal option before I accept a lower cover or a loading.",
    ai_response_mode: 'LEGAL_OPTIMIZATION',
    resolution_path: 'Surrogate income options + EPFO waiver + AltFin + bridging strategy + optimal document sequencing',
    advisor_competency_needed: 'surrogate_income_score',
    priority_weight: 75
  },

  F7_COVER_GAP: {
    trigger_signals: ['hlv_shortfall', 'income_multiplier_cap', 'existing_cover_insufficient', 'family_protection_gap'],
    user_articulation: "Can I increase cover despite weak income proof?",
    underlying_need: "My family needs more than the system thinks I can prove.",
    ai_response_mode: 'COVERAGE_MAXIMIZER',
    resolution_path: 'Every legal path to higher cover — surrogates, waivers, joint life, HUF layering',
    advisor_competency_needed: 'surrogate_income_score',
    priority_weight: 88
  },

  F8_BUSINESS_STRUCTURE: {
    trigger_signals: ['keyman', 'partnership', 'employer_employee', 'huf'],
    user_articulation: "Can HUF / MWPA / EE / Keyman solve this?",
    underlying_need: "I want to solve multiple problems (tax, creditor protection, business continuity) with one insurance decision.",
    ai_response_mode: 'BUSINESS_ARCHITECT',
    resolution_path: 'Full business insurance analysis with tax math, structure recommendation, documentation requirements',
    advisor_competency_needed: 'business_insurance_architect',
    priority_weight: 82
  },

  F9_NRI_COMPLEXITY: {
    trigger_signals: ['nri', 'oci', 'pio', 'gcc_resident', 'usa_resident', 'uk_resident'],
    user_articulation: "Does any of this even apply to me as an NRI?",
    underlying_need: "I feel like Indian insurance is designed for people in India. I want someone who actually knows NRI underwriting.",
    ai_response_mode: 'NRI_NAVIGATOR',
    resolution_path: 'Country-specific eligibility + VMER vs physical medicals + income proof for NRI + insurer NRI caps',
    advisor_competency_needed: 'nri_gcc_score',
    priority_weight: 92
  }
} as const;

export type FearType = keyof typeof FEAR_MAP;

export interface SimulationProfile {
  age: number;
  gender: 'M' | 'F';
  occupation: string;
  education: string;
  residency: string;
  country?: string;
  assessed_income_lakhs: number;
  sa_requested_cr: number;
  existing_tsar_cr: number;
  variant: string;
  insurance_type: string;
  purpose?: string;
  bmi?: number;
  tobacco_user: boolean;
  tobacco_quit_months?: number;
  hba1c?: number;
  bp_history: boolean;
  cardiac_history: boolean;
  prior_decisions?: string;
  business_type?: string;
  director_salary_lakhs?: number;
  gross_profit_avg_lakhs?: number;
  net_profit_avg_lakhs?: number;
  shareholding_pct?: number;
  hlv_gap_cr?: number;
  mwpa_applicable?: boolean;
  business_owner?: boolean;
  high_income_professional?: boolean;
  business_insurance_type?: string;
  cover_gap_cr?: number;
}

export function detectFears(profile: SimulationProfile): FearType[] {
  const fears: FearType[] = [];
  const p = profile;

  if (p.prior_decisions?.includes('decline') ||
      p.prior_decisions?.includes('loading') ||
      (p.hba1c && p.hba1c > 7.5) ||
      (p.bmi && p.bmi > 32) ||
      p.cardiac_history ||
      (p.tobacco_user && (!p.tobacco_quit_months || p.tobacco_quit_months < 24))) {
    fears.push('F1_REJECTION');
  }

  if ((p.hba1c && p.hba1c > 7) ||
      (p.bmi && p.bmi > 30) ||
      p.bp_history ||
      p.prior_decisions?.includes('loading')) {
    fears.push('F2_LOADING');
  }

  if ((p.sa_requested_cr ?? 0) > 5 ||
      (p.existing_tsar_cr ?? 0) > 8 ||
      p.business_insurance_type ||
      p.prior_decisions?.includes('decline')) {
    fears.push('F3_CLAIM_RISK');
  }

  if (p.residency !== 'indian' ||
      p.hba1c ||
      (p.sa_requested_cr ?? 0) > 5 ||
      p.cardiac_history ||
      p.business_insurance_type) {
    fears.push('F4_INSURER_FIT');
  }

  if (p.business_owner ||
      p.high_income_professional ||
      p.mwpa_applicable ||
      (p.assessed_income_lakhs ?? 0) > 25) {
    fears.push('F5_STRUCTURE');
  }

  if (p.occupation === 'self_employed' && (p.assessed_income_lakhs ?? 0) < 10) {
    fears.push('F6_PRESENTATION');
  }

  if ((p.hlv_gap_cr ?? 0) > 0 || (p.cover_gap_cr ?? 0) > 0) {
    fears.push('F7_COVER_GAP');
  }

  if (['keyman', 'partnership', 'employer_employee', 'huf'].includes(p.insurance_type)) {
    fears.push('F8_BUSINESS_STRUCTURE');
  }

  if (['nri', 'oci', 'pio'].includes(p.residency)) {
    fears.push('F9_NRI_COMPLEXITY');
  }

  return fears.sort((a, b) => FEAR_MAP[b].priority_weight - FEAR_MAP[a].priority_weight);
}

export function getPrimaryFear(fears: FearType[]): FearType | null {
  return fears.length > 0 ? fears[0] : null;
}

export function getFearDisplay(fear: FearType): { label: string; icon: string; color: string } {
  const displays: Record<FearType, { label: string; icon: string; color: string }> = {
    F1_REJECTION:      { label: 'Rejection Risk',        icon: '⚠️', color: 'bg-red-50 border-red-200 text-red-800' },
    F2_LOADING:        { label: 'Premium Loading',       icon: '📈', color: 'bg-orange-50 border-orange-200 text-orange-800' },
    F3_CLAIM_RISK:     { label: 'Claim Security',        icon: '🛡️', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    F4_INSURER_FIT:    { label: 'Insurer Matching',      icon: '🎯', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    F5_STRUCTURE:      { label: 'Smarter Structure',     icon: '🏛️', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    F6_PRESENTATION:   { label: 'Income Presentation',   icon: '📊', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    F7_COVER_GAP:      { label: 'Cover Gap',             icon: '🔍', color: 'bg-teal-50 border-teal-200 text-teal-800' },
    F8_BUSINESS_STRUCTURE: { label: 'Business Insurance', icon: '🏢', color: 'bg-slate-50 border-slate-200 text-slate-800' },
    F9_NRI_COMPLEXITY: { label: 'NRI Complexity',        icon: '✈️', color: 'bg-sky-50 border-sky-200 text-sky-800' },
  };
  return displays[fear];
}