// =============================================================================
// lib/advisors/matching-engine.ts
// AIRE — Advisor Intelligence Ranking Engine
// =============================================================================

import { supabase } from '@/lib/supabase/server';
import { type FearType } from '@/lib/ai/fears/fear-map';

export interface AdvisorMatchInput {
  fears: FearType[];
  profile: any;
  primary_vulnerability: string;
}

export interface AdvisorMatchResult {
  advisor_id: string;
  advisor_name: string;
  match_score: number;
  match_reason: string;
  primary_competency: string;
  badges: string[];
  cases_in_this_category: number;
  response_sla_hours: number;
  client_sat?: number;
  tier: string;
  company_relationships: {
    t: string;
    h: string;
    m: string;
  };
}

const COMPETENCY_LABELS: Record<string, string> = {
  nri_gcc_score: 'GCC NRI Specialist',
  nri_usa_uk_score: 'USA/UK NRI Specialist',
  nri_sea_score: 'SEA NRI Specialist',
  diabetic_uw_score: 'Diabetic Underwriting Specialist',
  cardiac_uw_score: 'Cardiac Underwriting Specialist',
  substandard_lives_score: 'Substandard Lives Specialist',
  mwpa_structuring_score: 'MWPA Strategist',
  huf_structuring_score: 'HUF Architect',
  ee_structuring_score: 'Employer-Employee Specialist',
  keyman_score: 'Keyman Insurance Expert',
  partnership_score: 'Partnership Cover Expert',
  surrogate_income_score: 'Surrogate Income Specialist',
  large_cover_score: 'Large Cover Specialist (Rs. 10 Cr+)',
  hni_score: 'HNI Specialist',
  claims_facilitation_score: 'Claims Facilitation Specialist',
};

export const BADGE_LABELS: Record<string, string> = {
  best_nri_gcc: '🌍 GCC NRI Expert',
  best_nri_usa_uk: '✈️ USA/UK NRI Expert',
  diabetic_specialist: '🩺 Diabetic UW Specialist',
  mwpa_strategist: '🛡️ MWPA Strategist',
  huf_architect: '🏛️ HUF Architect',
  keyman_expert: '🔑 Keyman Expert',
  '50cr_specialist': '💎 Rs. 50 Cr+ Specialist',
  business_insurance_architect: '🏢 Business Insurance Architect',
  surrogate_master: '📊 Surrogate Income Master',
  claims_champion: '✅ Claims Champion',
};

export async function matchAdvisors(input: AdvisorMatchInput): Promise<AdvisorMatchResult[]> {
  const { fears, profile } = input;

  const requirements: Record<string, number> = {};

  for (const fear of fears) {
    switch (fear) {
      case 'F9_NRI_COMPLEXITY': {
        const country = profile.country?.toLowerCase() ?? '';
        if (['uae', 'dubai', 'abu dhabi', 'saudi', 'qatar', 'kuwait', 'bahrain', 'oman'].some(c => country.includes(c))) {
          requirements['nri_gcc_score'] = (requirements['nri_gcc_score'] ?? 0) + 40;
        } else if (['usa', 'canada', 'uk', 'england'].some(c => country.includes(c))) {
          requirements['nri_usa_uk_score'] = (requirements['nri_usa_uk_score'] ?? 0) + 40;
        } else {
          requirements['nri_sea_score'] = (requirements['nri_sea_score'] ?? 0) + 30;
        }
        break;
      }
      case 'F1_REJECTION':
      case 'F2_LOADING': {
        if (profile.hba1c) requirements['diabetic_uw_score'] = (requirements['diabetic_uw_score'] ?? 0) + 35;
        if (profile.cardiac_history) requirements['cardiac_uw_score'] = (requirements['cardiac_uw_score'] ?? 0) + 35;
        requirements['substandard_lives_score'] = (requirements['substandard_lives_score'] ?? 0) + 25;
        break;
      }
      case 'F5_STRUCTURE':
      case 'F8_BUSINESS_STRUCTURE': {
        requirements['keyman_score'] = (requirements['keyman_score'] ?? 0) + 25;
        requirements['mwpa_structuring_score'] = (requirements['mwpa_structuring_score'] ?? 0) + 25;
        requirements['ee_structuring_score'] = (requirements['ee_structuring_score'] ?? 0) + 20;
        requirements['huf_structuring_score'] = (requirements['huf_structuring_score'] ?? 0) + 20;
        requirements['partnership_score'] = (requirements['partnership_score'] ?? 0) + 15;
        break;
      }
      case 'F6_PRESENTATION':
      case 'F7_COVER_GAP': {
        requirements['surrogate_income_score'] = (requirements['surrogate_income_score'] ?? 0) + 40;
        requirements['large_cover_score'] = (requirements['large_cover_score'] ?? 0) + 20;
        break;
      }
      case 'F3_CLAIM_RISK': {
        requirements['claims_facilitation_score'] = (requirements['claims_facilitation_score'] ?? 0) + 30;
        requirements['mwpa_structuring_score'] = (requirements['mwpa_structuring_score'] ?? 0) + 20;
        break;
      }
      case 'F4_INSURER_FIT': {
        requirements['large_cover_score'] = (requirements['large_cover_score'] ?? 0) + 20;
        requirements['hni_score'] = (requirements['hni_score'] ?? 0) + 15;
        break;
      }
    }
  }

  if ((profile.sa_requested_cr ?? 0) >= 10) {
    requirements['large_cover_score'] = (requirements['large_cover_score'] ?? 0) + 30;
    requirements['hni_score'] = (requirements['hni_score'] ?? 0) + 20;
  }

  const { data: advisors } = await supabase
    .from('advisors')
    .select(`
      id,
      name,
      tier,
      response_sla_hours,
      company_t_relationship,
      company_h_relationship,
      company_m_relationship,
      advisor_competencies (
        nri_gcc_score, nri_usa_uk_score, nri_sea_score,
        diabetic_uw_score, cardiac_uw_score, substandard_lives_score,
        mwpa_structuring_score, huf_structuring_score, ee_structuring_score,
        keyman_score, partnership_score, surrogate_income_score,
        large_cover_score, hni_score, claims_facilitation_score,
        nri_cases_closed, diabetic_cases_closed, cardiac_cases_closed,
        business_cases_closed, large_cover_cases_closed, mwpa_cases_closed,
        surrogate_cases_closed, cases_issued_standard_pct,
        client_satisfaction_score, badges
      )
    `)
    .eq('is_active', true)
    .eq('is_verified', true);

  if (!advisors || advisors.length === 0) {
    return [];
  }

  const scored = advisors.map((advisor: any) => {
    const comp = advisor.advisor_competencies;
    let score = 0;
    let total_weight = 0;

    for (const [field, weight] of Object.entries(requirements)) {
          const competency_score = ((comp as unknown) as Record<string, number>)?.[field] ?? 0;
    }

    const match_score = total_weight > 0 ? Math.round((score / total_weight) * 100) : 0;
    const top_req = Object.entries(requirements).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '';

    const caseCountMap: Record<string, string> = {
      nri_gcc_score: 'nri_cases_closed',
      nri_usa_uk_score: 'nri_cases_closed',
      diabetic_uw_score: 'diabetic_cases_closed',
      cardiac_uw_score: 'cardiac_cases_closed',
      mwpa_structuring_score: 'mwpa_cases_closed',
      keyman_score: 'business_cases_closed',
      surrogate_income_score: 'surrogate_cases_closed',
      large_cover_score: 'large_cover_cases_closed',
      claims_facilitation_score: 'business_cases_closed',
    };

    return {
      advisor_id: advisor.id,
      advisor_name: advisor.name,
      match_score,
      match_reason: buildMatchReason(fears, comp, profile),
      primary_competency: COMPETENCY_LABELS[top_req] ?? 'General Specialist',
      badges: (advisor as any).badges ?? [],
      cases_in_this_category: (comp as any)?.[caseCountMap[top_req] ?? ''] ?? 0,
      response_sla_hours: advisor.response_sla_hours ?? 24,
      client_sat: (advisor as any).client_satisfaction_score,
      tier: advisor.tier ?? 'standard',
      company_relationships: {
        t: advisor.company_t_relationship ?? 'standard',
        h: advisor.company_h_relationship ?? 'standard',
        m: advisor.company_m_relationship ?? 'standard',
      }
    };
  });

  return scored
    .filter(a => a.match_score > 25)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 3);
}

function buildMatchReason(fears: FearType[], comp: any, profile: any): string {
  const primary = fears[0];
  if (!primary) return 'Matched to your profile complexity.';

  const reasons: Partial<Record<FearType, string>> = {
    F9_NRI_COMPLEXITY: `${comp?.nri_cases_closed ?? 0} NRI cases closed. Specializes in ${profile.country?.includes('UAE') || profile.country?.includes('Dubai') ? 'GCC' : 'international'} residency profiles.`,
    F1_REJECTION: `${comp?.diabetic_cases_closed ?? 0} diabetic/substandard cases navigated.`,
    F2_LOADING: `Track record of minimizing premium loading. ${comp?.cases_issued_standard_pct ?? 0}% standard terms rate.`,
    F3_CLAIM_RISK: `Specializes in claim-ready policy architecture. ${comp?.mwpa_cases_closed ?? 0} MWPA structures completed.`,
    F4_INSURER_FIT: `Works with all three insurers. Understands which company is most favorable.`,
    F5_STRUCTURE: `${comp?.business_cases_closed ?? 0} business insurance structures completed.`,
    F6_PRESENTATION: `${comp?.surrogate_cases_closed ?? 0} surrogate income cases navigated.`,
    F7_COVER_GAP: `Specialist in maximizing cover within financial eligibility constraints.`,
    F8_BUSINESS_STRUCTURE: `Business insurance architect. Understands tax, legal, and underwriting dimensions.`,
  };

  return reasons[primary] ?? 'Matched to your profile complexity.';
}

export { COMPETENCY_LABELS };