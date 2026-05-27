// =============================================================================
// lib/underwriting/runner.ts
// Master runner — calls all three engines and produces unified output
// =============================================================================

import { runCompanyMEligibility, type ProfileM } from './engines/company-m';

export interface UnifiedEngineOutput {
  income_multiplier: number;
  max_eligibility_cr: number;
  available_eligibility_cr: number;
  cover_gap_cr: number;
  company_t_fit: number;
  company_h_fit: number;
  company_m_fit: number;
  overall_fit_label: 'Strong' | 'Good' | 'Marginal' | 'Not Eligible';
  overall_preparedness: number;
  medical_category_m: string;
  medical_tests_m: string[];
  cotinine_required: boolean;
  company_m_preparedness: number;
  uw_sa_cr: number;
  fsa_msa_factor: number;
  all_decline_reasons: string[];
  all_warnings: string[];
  vmer_eligible?: boolean;
  vmer_max_cr?: number;
  mwpa_applicable: boolean;
  huf_applicable: boolean;
  keyman_applicable: boolean;
  ee_applicable: boolean;
  recommended_insurer?: 'T' | 'H' | 'M';
  insurer_rationale?: string[];
}

export async function runAllEngines(profile: any): Promise<UnifiedEngineOutput> {
  const profile_m: ProfileM = {
    age: profile.age,
    occupation: profile.occupation,
    education: profile.education ?? 'graduate',
    residency: profile.residency,
    assessed_income: profile.assessed_income_lakhs,
    sa_requested_cr: profile.sa_requested_cr,
    variant: profile.variant ?? 'regular',
    insurance_type: profile.insurance_type ?? 'individual',
    tobacco_user: profile.tobacco_user ?? false,
    tobacco_quit_months: profile.tobacco_quit_months,
    existing_tsar_cr: profile.existing_tsar_cr ?? 0,
    bmi: profile.bmi,
    city_tier: profile.city_tier,
    cra_country: profile.country,
    business: profile.business_type ? {
      type: profile.business_type,
      director_salary_lakhs: profile.director_salary_lakhs,
      gross_profit_avg_3yr_lakhs: profile.gross_profit_avg_lakhs,
      net_profit_avg_3yr_lakhs: profile.net_profit_avg_lakhs,
      avg_depreciation_lakhs: profile.avg_depreciation_lakhs,
      shareholding_pct: profile.shareholding_pct,
      existing_keyman_cover_cr: profile.existing_keyman_cover_cr ?? 0,
      loss_in_last_year: profile.loss_in_last_year ?? false,
    } : undefined,
    surrogate: profile.surrogate_type ? {
      type: profile.surrogate_type,
      avg_monthly_credit_balance: profile.avg_monthly_credit_balance,
      monthly_sip_amount: profile.monthly_sip_amount,
      credit_limit: profile.credit_limit,
      monthly_emi: profile.monthly_emi,
      car_idv: profile.car_idv,
      avg_monthly_er_contribution: profile.avg_monthly_er_contribution,
      company_tier: profile.company_tier,
      epfo_type: profile.epfo_type,
      use_as: profile.surrogate_use_as,
      existing_assessed_income: profile.existing_assessed_income,
    } : undefined,
  };

  const result_m = runCompanyMEligibility(
    profile_m,
    profile.gender ?? 'M',
    profile.cibil_score,
    profile.afyp
  );

  const company_t_fit = estimateCompanyTFit(profile);
  const company_h_fit = estimateCompanyHFit(profile);

  const fin = result_m.financial_eligibility;
  const cover_gap = Math.max(0, profile.sa_requested_cr - fin.available_eligibility_cr);

  const mwpa_applicable =
    profile.insurance_type === 'individual' &&
    !['housewife'].includes(profile.occupation) &&
    profile.residency === 'indian';

  const huf_applicable =
    profile.occupation !== 'housewife' &&
    profile.residency === 'indian';

  const keyman_applicable =
    ['self_employed', 'professional'].includes(profile.occupation) &&
    profile.insurance_type !== 'keyman';

  const ee_applicable =
    profile.occupation === 'salaried' &&
    !['housewife'].includes(profile.occupation);

  

  const overall = Math.round(
    (result_m.preparedness_score + company_t_fit + company_h_fit) / 3
  );
  const overall_label: UnifiedEngineOutput['overall_fit_label'] =
    overall >= 85 ? 'Strong' :
    overall >= 65 ? 'Good' :
    overall >= 40 ? 'Marginal' : 'Not Eligible';

  const routing = determineOptimalInsurer(profile, result_m, company_t_fit, company_h_fit);
  return {
    income_multiplier: fin.income_multiplier,
    max_eligibility_cr: fin.max_financial_eligibility_cr,
    available_eligibility_cr: fin.available_eligibility_cr,
    cover_gap_cr: cover_gap,
    company_t_fit,
    company_h_fit,
    company_m_fit: result_m.preparedness_score,
    overall_fit_label: overall_label,
    overall_preparedness: overall,
    medical_category_m: result_m.medical_grid.category,
    medical_tests_m: result_m.medical_grid.tests,
    cotinine_required: result_m.medical_grid.cotinine_required,
    company_m_preparedness: result_m.preparedness_score,
    uw_sa_cr: result_m.fsa_msa.underwriting_sa_cr,
    fsa_msa_factor: result_m.fsa_msa.msa_factor,
    all_decline_reasons: result_m.decline_reasons,
    all_warnings: result_m.warnings,
    vmer_eligible: result_m.vmer_status?.eligible,
    vmer_max_cr: result_m.vmer_status?.max_sa_for_vmer_cr,
    mwpa_applicable,
    huf_applicable,
    keyman_applicable,
    ee_applicable,
    recommended_insurer: routing.insurer,
    insurer_rationale: routing.rationale,
  };
}

interface RoutingResult {
  insurer: 'T' | 'H' | 'M';
  rationale: string[];
}

function determineOptimalInsurer(
  profile: any,
  result_m: any,
  t_fit: number,
  h_fit: number
): RoutingResult {
  const rationale: string[] = [];
  let insurer: 'T' | 'H' | 'M' = 'M';

  if (profile.residency !== 'indian' && profile.sa_requested_cr > 5) {
    insurer = 'H';
    rationale.push('NRI large cover: Company H has 13 surrogate types and highest NRI VMER flexibility');
  } else if (['keyman', 'partnership', 'huf', 'employer_employee'].includes(profile.insurance_type)) {
    insurer = 'M';
    rationale.push('Business insurance: Company M has the most complete keyman/EE/HUF documentation suite');
  } else if (profile.hba1c && profile.hba1c >= 7 && profile.hba1c <= 8 && !profile.cardiac_history) {
    insurer = 'T';
    rationale.push('Controlled diabetes: Company T historically most favorable for HbA1c 7-8% range');
  } else if (profile.occupation === 'self_employed' && profile.assessed_income_lakhs < 10) {
    insurer = 'H';
    rationale.push('Self-employed income gap: Company H has 13 surrogate types');
  } else if (profile.prior_decisions?.includes('decline')) {
    insurer = 'H';
    rationale.push('Prior decline: Company H has systematic declined-and-reapplied process with Facultative RI');
  } else if (profile.variant === 'smart_cover') {
    insurer = 'M';
    rationale.push('Smart Cover: Company M originated this variant with 1.5x FSA/MSA factor');
  } else if (result_m.altfin?.eligible) {
    insurer = 'M';
    rationale.push('AltFin V2: Company M has the most advanced AI-model financial waiver');
  } else {
    const scores = { T: t_fit, H: h_fit, M: result_m.preparedness_score };
    insurer = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as 'T' | 'H' | 'M';
    rationale.push(`Highest fit score: Company ${insurer} at ${scores[insurer]}/100`);
  }

  rationale.push(`Comparative fit: Company T ${t_fit}/100, Company H ${h_fit}/100, Company M ${result_m.preparedness_score}/100`);

  return { insurer, rationale };
}

function estimateCompanyTFit(p: any): number {
  let score = 70;
  if (p.residency !== 'indian') score -= 5;
  if (p.hba1c && p.hba1c > 8) score -= 15;
  if (p.hba1c && p.hba1c >= 7 && p.hba1c <= 8) score += 5;
  if (p.cardiac_history) score -= 15;
  if (p.prior_decisions?.includes('decline')) score -= 20;
  if (p.bmi && p.bmi > 35) score -= 10;
  if ((p.existing_tsar_cr ?? 0) + p.sa_requested_cr > 20) score -= 10;
  if ((p.existing_tsar_cr ?? 0) + p.sa_requested_cr > 35) score -= 15;
  if (['keyman', 'partnership'].includes(p.insurance_type)) score -= 5;
  if (p.sa_requested_cr > 10) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function estimateCompanyHFit(p: any): number {
  let score = 72;
  if (p.residency !== 'indian') score += 3;
  if (p.hba1c && p.hba1c > 8) score -= 12;
  if (p.cardiac_history) score -= 12;
  if (p.prior_decisions?.includes('decline')) score -= 15;
  if (p.bmi && p.bmi > 35) score -= 8;
  if (p.occupation === 'self_employed') score += 8;
  if (['keyman', 'partnership', 'employer_employee'].includes(p.insurance_type)) score += 5;
  if (p.surrogate_type) score += 5;
  if (p.sa_requested_cr > 10) score += 3;
  if ((p.existing_tsar_cr ?? 0) + p.sa_requested_cr > 25) score -= 10;
  return Math.max(0, Math.min(100, score));
}