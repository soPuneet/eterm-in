// =============================================================================
// lib/underwriting/engines/company-m.ts
// Company M deterministic underwriting engine
// =============================================================================

export interface ProfileM {
  age: number;
  occupation: string;
  education: string;
  residency: string;
  assessed_income: number;
  sa_requested_cr: number;
  variant: string;
  insurance_type: string;
  tobacco_user: boolean;
  tobacco_quit_months?: number;
  existing_tsar_cr: number;
  bmi?: number;
  hba1c?: number;
  bp_history?: boolean;
  cardiac_history?: boolean;
  city_tier?: number;
  cra_country?: string;
  business?: {
    type: string;
    director_salary_lakhs?: number;
    gross_profit_avg_3yr_lakhs?: number;
    net_profit_avg_3yr_lakhs?: number;
    avg_depreciation_lakhs?: number;
    shareholding_pct?: number;
    existing_keyman_cover_cr?: number;
    loss_in_last_year?: boolean;
  };
  surrogate?: {
    type: string;
    avg_monthly_credit_balance?: number;
    monthly_sip_amount?: number;
    credit_limit?: number;
    monthly_emi?: number;
    car_idv?: number;
    avg_monthly_er_contribution?: number;
    company_tier?: string;
    epfo_type?: string;
    use_as?: string;
    existing_assessed_income?: number;
  };
}

export interface CompanyMResult {
  financial_eligibility: {
    income_multiplier: number;
    max_financial_eligibility_cr: number;
    available_eligibility_cr: number;
  };
  preparedness_score: number;
  medical_grid: {
    category: string;
    tests: string[];
    cotinine_required: boolean;
  };
  fsa_msa: {
    underwriting_sa_cr: number;
    msa_factor: number;
  };
  decline_reasons: string[];
  warnings: string[];
  vmer_status?: {
    eligible: boolean;
    max_sa_for_vmer_cr: number;
  };
  altfin?: {
    eligible: boolean;
  };
}

export function runCompanyMEligibility(
  p: ProfileM,
  gender: 'M' | 'F' = 'M',
  cibil_score?: number,
  afyp?: number
): CompanyMResult {
  const declines: string[] = [];
  const warnings: string[] = [];

  if (p.age < 18 || p.age > 65) {
    declines.push(`Age ${p.age} is outside the 18-65 entry gate.`);
  }

  const education_gate = ['tenth', 'twelfth', 'graduate', 'post_graduate', 'professional_degree'];
  if (!education_gate.includes(p.education)) {
    declines.push(`Education level "${p.education}" does not meet minimum gate criteria.`);
  }

  if (p.assessed_income < 3 && p.occupation !== 'housewife') {
    declines.push(`Assessed income Rs. ${p.assessed_income}L is below minimum Rs. 3L gate.`);
  }

  if (p.sa_requested_cr > 35) {
    warnings.push('SA > Rs. 35 Cr triggers special financial underwriting gate requiring CFO/CA certification and reinsurer referral.');
  }

  const issue_limits: Record<string, number> = {
    '18-30': 20, '31-40': 25, '41-45': 20, '46-50': 15,
    '51-55': 10, '56-60': 5, '61-65': 2,
  };
  let age_band = '';
  if (p.age <= 30) age_band = '18-30';
  else if (p.age <= 40) age_band = '31-40';
  else if (p.age <= 45) age_band = '41-45';
  else if (p.age <= 50) age_band = '46-50';
  else if (p.age <= 55) age_band = '51-55';
  else if (p.age <= 60) age_band = '56-60';
  else age_band = '61-65';

  const max_issue_cr = issue_limits[age_band] ?? 2;
  if (p.sa_requested_cr > max_issue_cr) {
    warnings.push(`Requested SA Rs. ${p.sa_requested_cr} Cr exceeds age-band issue limit of Rs. ${max_issue_cr} Cr.`);
  }

  let income_multiplier = 20;
  if (p.age <= 35) income_multiplier = 25;
  else if (p.age <= 45) income_multiplier = 20;
  else if (p.age <= 55) income_multiplier = 15;
  else income_multiplier = 10;

  let fsa_factor = 1.0;
  if (p.variant === 'smart_cover') {
    fsa_factor = 1.5;
    warnings.push('Smart Cover variant applies 1.5x FSA/MSA factor.');
  } else if (p.variant === 'early_rop') {
    fsa_factor = 1.25;
  }

  let derived_income = p.assessed_income;
  if (p.surrogate) {
    const s = p.surrogate;
    if (s.type === 'bank_account' && s.avg_monthly_credit_balance) {
      derived_income = Math.max(derived_income, (s.avg_monthly_credit_balance * 12) / 100000);
      warnings.push('Bank account surrogate income applied.');
    } else if (s.type === 'sip' && s.monthly_sip_amount) {
      derived_income = Math.max(derived_income, (s.monthly_sip_amount * 300) / 100000);
      warnings.push('SIP surrogate income applied.');
    } else if (s.type === 'epfo' && s.avg_monthly_er_contribution) {
      derived_income = Math.max(derived_income, (s.avg_monthly_er_contribution * 120) / 100000);
      warnings.push('EPFO surrogate income applied.');
    } else if (s.type === 'credit_card' && s.credit_limit) {
      derived_income = Math.max(derived_income, (s.credit_limit * 3) / 100000);
      warnings.push('Credit card surrogate income applied.');
    } else if (s.type === 'car' && s.car_idv) {
      derived_income = Math.max(derived_income, (s.car_idv * 0.15) / 100000);
      warnings.push('Car ownership surrogate income applied.');
    }
  }

  if (p.business) {
    const b = p.business;
    if (b.type === 'keyman' || b.type === 'partnership' || b.type === 'employer_employee') {
      const profit_addback = (b.net_profit_avg_3yr_lakhs ?? 0) + (b.avg_depreciation_lakhs ?? 0);
      if (profit_addback > 0) {
        derived_income = Math.max(derived_income, profit_addback);
        warnings.push(`Business income add-back applied: Rs. ${profit_addback.toFixed(1)}L.`);
      }
    }
  }

  const max_financial_eligibility_cr = (derived_income * income_multiplier) / 100;
  const available_eligibility_cr = Math.max(0, max_financial_eligibility_cr - p.existing_tsar_cr);

  let medical_category = 'A1';
  const tests: string[] = [];
  let cotinine_required = false;

  if (p.age <= 35 && !p.tobacco_user && (p.bmi ?? 0) < 25 && !p.cardiac_history) {
    medical_category = 'A1';
    tests.push('VMER/PIVC');
  } else if (p.age <= 45 && ((p.bmi ?? 0) < 30) && !p.cardiac_history) {
    medical_category = 'A2';
    tests.push('VMER/PIVC', 'Blood Sugar', 'Lipid Profile');
  } else if (p.age <= 50 || (p.bmi ?? 0) >= 30 || (p.hba1c ?? 0) > 7) {
    medical_category = 'CAT 5';
    tests.push('Physical Medical', 'Blood Sugar', 'Lipid Profile', 'ECG');
  } else if ((p.bmi ?? 0) >= 35 || (p.hba1c ?? 0) > 8.5 || p.cardiac_history) {
    medical_category = 'CAT 6';
    tests.push('Physical Medical', 'Blood Sugar', 'Lipid Profile', 'ECG', 'TMT', '2D Echo');
  } else {
    medical_category = 'CAT 10';
    tests.push('Physical Medical', 'Blood Sugar', 'Lipid Profile', 'ECG', 'TMT', '2D Echo', 'Chest X-Ray', 'CBC', 'KFT', 'LFT', 'Urine Cotinine');
  }

  if (p.tobacco_user && (!p.tobacco_quit_months || p.tobacco_quit_months < 24)) {
    cotinine_required = true;
    warnings.push('Tobacco use within 24 months — cotinine test mandatory.');
  }

  let vmer_eligible = false;
  let vmer_max_cr = 0;
  if (p.age <= 50 && (p.bmi ?? 0) < 30 && !p.cardiac_history && !p.tobacco_user && p.residency === 'indian') {
    vmer_eligible = true;
    vmer_max_cr = Math.min(5, p.sa_requested_cr);
  }
  if (p.residency !== 'indian' && p.education === 'graduate' && p.assessed_income >= 35) {
    vmer_eligible = true;
    vmer_max_cr = Math.min(5, p.sa_requested_cr);
    warnings.push('NRI VMER eligible up to Rs. 5 Cr for Graduate with income >= Rs. 35L.');
  }

  if (p.residency !== 'indian') {
    const nri_cap = 25;
    if ((p.sa_requested_cr + p.existing_tsar_cr) > nri_cap) {
      declines.push(`NRI total TSAR Rs. ${(p.sa_requested_cr + p.existing_tsar_cr).toFixed(1)} Cr exceeds Rs. ${nri_cap} Cr cap.`);
    }
    warnings.push('NRI application requires 6 months bank statements, passport copy, and employment proof.');
  }

  if (p.occupation === 'housewife') {
    if (p.education !== 'graduate') {
      declines.push('Housewife cover requires Graduate education minimum.');
    }
    const housewife_max = 1.0;
    if (p.sa_requested_cr > housewife_max) {
      declines.push(`Housewife cover maximum is Rs. ${housewife_max} Cr.`);
    }
    warnings.push('Housewife cover requires husband income proof and marriage certificate.');
  }

  let altfin_eligible = false;
  if (cibil_score && cibil_score >= 750 && p.assessed_income >= 5 && p.sa_requested_cr <= 1.99) {
    altfin_eligible = true;
    warnings.push('AltFin V2 waiver eligible — AI-model financial approval without standard income proof.');
  }

  if (p.variant === 'rop' || p.variant === 'early_rop') {
    warnings.push('TROP variant requires separate premium calculation — not eligible for standard term rates.');
  }

  let preparedness = 85;
  if (declines.length > 0) {
    preparedness = 0;
  } else {
    if ((p.bmi ?? 0) > 30) preparedness -= 10;
    if ((p.hba1c ?? 0) > 7) preparedness -= 10;
    if ((p.hba1c ?? 0) > 8.5) preparedness -= 15;
    if (p.tobacco_user) preparedness -= 10;
    if (p.cardiac_history) preparedness -= 20;
    if (p.sa_requested_cr > max_issue_cr) preparedness -= 15;
  }

  const msa_factor = fsa_factor;
  const underwriting_sa_cr = p.sa_requested_cr * msa_factor;

  return {
    financial_eligibility: {
      income_multiplier,
      max_financial_eligibility_cr,
      available_eligibility_cr,
    },
    preparedness_score: Math.max(0, Math.min(100, preparedness)),
    medical_grid: {
      category: medical_category,
      tests,
      cotinine_required,
    },
    fsa_msa: {
      underwriting_sa_cr,
      msa_factor,
    },
    decline_reasons: declines,
    warnings,
    vmer_status: {
      eligible: vmer_eligible,
      max_sa_for_vmer_cr: vmer_max_cr,
    },
    altfin: {
      eligible: altfin_eligible,
    },
  };
}