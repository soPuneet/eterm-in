'use client';

export const dynamic = 'force-dynamic';




// =============================================================================
// app/(app)/simulate/page.tsx — PRODUCTION-READY
// =============================================================================


import { useState, useCallback, useTransition } from 'react';
import { detectFears, getFearDisplay, type FearType } from '@/lib/ai/fears/fear-map';
import { analyzeVulnerability, buildVulnerabilityFirstPrompt } from '@/lib/ai/prompts/vulnerability-first';
import { matchAdvisors, BADGE_LABELS } from '@/lib/advisors/matching-engine';
import { runAllEngines } from '@/lib/underwriting/runner';

interface SimulationState {
  age: number;
  gender: 'M' | 'F';
  occupation: 'salaried' | 'self_employed' | 'professional' | 'housewife';
  education: 'tenth' | 'twelfth' | 'graduate' | 'post_graduate' | 'professional_degree';
  residency: 'indian' | 'nri' | 'oci' | 'pio';
  country: string;
  assessed_income_lakhs: number;
  sa_requested_cr: number;
  existing_tsar_cr: number;
  variant: string;
  insurance_type: string;
  purpose: string;
  bmi: number;
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
  city_tier?: 1 | 2 | 3;
  cibil_score?: number;
}

interface ResultState {
  fears: FearType[];
  primary_vulnerability: string;
  secondary_vulnerabilities: string[];
  ai_explanation: string;
  company_t_fit: number;
  company_h_fit: number;
  company_m_fit: number;
  recommended_insurer: string;
  insurer_rationale: string[];
  financial_eligibility_cr: number;
  cover_gap_cr: number;
  medical_category_recommended: string;
  options: string[];
  critical_action: string;
  matched_advisors: any[];
  preparedness_score: number;
  fit_label: string;
  cotinine_required: boolean;
  vmer_eligible?: boolean;
  vmer_max_cr?: number;
  mwpa_applicable: boolean;
  huf_applicable: boolean;
  keyman_applicable: boolean;
  ee_applicable: boolean;
}

export default function SimulatePage() {
  const [step, setStep] = useState<'form' | 'analyzing' | 'result'>('form');
  const [form, setForm] = useState<Partial<SimulationState>>({
    residency: 'indian',
    variant: 'regular',
    insurance_type: 'individual',
    tobacco_user: false,
    bp_history: false,
    cardiac_history: false,
    existing_tsar_cr: 0,
    city_tier: 1,
  });
  const [result, setResult] = useState<ResultState | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = useCallback((field: keyof SimulationState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const runSimulation = useCallback(() => {
    startTransition(async () => {
      setStep('analyzing');

      const engines = await runAllEngines(form as SimulationState);

      const profile_for_fears = {
        ...form,
        hlv_gap_cr: Math.max(0, (form.sa_requested_cr ?? 0) - engines.max_eligibility_cr),
        mwpa_applicable: engines.mwpa_applicable,
        business_owner: ['self_employed', 'professional'].includes(form.occupation ?? ''),
        high_income_professional: (form.assessed_income_lakhs ?? 0) > 25,
        business_insurance_type: form.business_type,
        cover_gap_cr: engines.cover_gap_cr,
      };
      const fears = detectFears(profile_for_fears as any);

      const vulnerability = analyzeVulnerability({
        ...form,
        income_multiplier: engines.income_multiplier,
        max_eligibility_cr: engines.max_eligibility_cr,
        available_eligibility_cr: engines.available_eligibility_cr,
        cover_gap_cr: engines.cover_gap_cr,
        existing_tsar_cr: form.existing_tsar_cr ?? 0,
        company_t_fit: engines.company_t_fit,
        company_h_fit: engines.company_h_fit,
        company_m_fit: engines.company_m_fit,
      } as any);

      const prompt = buildVulnerabilityFirstPrompt(
        { ...form, ...engines, fears } as any,
        fears,
        vulnerability
      );

      const ai_resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, profile: form, engines, fears })
      });
      const ai_data = await ai_resp.json();

      const advisors = await matchAdvisors({
        fears,
        profile: { ...form, ...engines } as any,
        primary_vulnerability: vulnerability.primary
      });

      setResult({
        fears,
        primary_vulnerability: vulnerability.primary,
        secondary_vulnerabilities: vulnerability.secondary,
        ai_explanation: ai_data.explanation ?? '',
        company_t_fit: engines.company_t_fit,
        company_h_fit: engines.company_h_fit,
        company_m_fit: engines.company_m_fit,
        recommended_insurer: ai_data.primary_insurer_recommendation ?? engines.recommended_insurer ?? 'M',
        insurer_rationale: ai_data.insurer_rationale ? [ai_data.insurer_rationale] : engines.insurer_rationale ?? [],
        financial_eligibility_cr: engines.max_eligibility_cr,
        cover_gap_cr: engines.cover_gap_cr,
        medical_category_recommended: engines.medical_category_m ?? '',
        options: ai_data.options ?? [],
        critical_action: ai_data.critical_action ?? '',
        matched_advisors: advisors,
        preparedness_score: engines.company_m_preparedness ?? engines.overall_preparedness ?? 70,
        fit_label: engines.overall_fit_label ?? 'Good',
        cotinine_required: engines.cotinine_required,
        vmer_eligible: engines.vmer_eligible,
        vmer_max_cr: engines.vmer_max_cr,
        mwpa_applicable: engines.mwpa_applicable,
        huf_applicable: engines.huf_applicable,
        keyman_applicable: engines.keyman_applicable,
        ee_applicable: engines.ee_applicable,
      });
      setStep('result');
    });
  }, [form]);

  if (step === 'form') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Underwriting Intelligence Simulator
          </h1>
          <p className="text-slate-500 text-sm">
            Tell us about your profile. We identify your real underwriting vulnerabilities
            and give you every legal path to a better outcome.
          </p>
        </div>

        <Section title="About You">
          <Row label="Age">
            <Input type="number" value={form.age ?? ''} onChange={v => update('age', Number(v))} placeholder="e.g. 38" />
          </Row>
          <Row label="Gender">
            <Select value={form.gender ?? ''} onChange={v => update('gender', v)}>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </Select>
          </Row>
          <Row label="Residency">
            <Select value={form.residency} onChange={v => update('residency', v)}>
              <option value="indian">Resident Indian</option>
              <option value="nri">NRI</option>
              <option value="oci">OCI</option>
              <option value="pio">PIO</option>
            </Select>
          </Row>
          {form.residency !== 'indian' && (
            <Row label="Country of Residence">
              <Input value={form.country ?? ''} onChange={v => update('country', v)} placeholder="e.g. Dubai / UAE / USA" />
            </Row>
          )}
          <Row label="Occupation">
            <Select value={form.occupation ?? ''} onChange={v => update('occupation', v)}>
              <option value="">Select</option>
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self Employed</option>
              <option value="professional">Professional</option>
              <option value="housewife">Housewife</option>
            </Select>
          </Row>
          <Row label="Education">
            <Select value={form.education ?? ''} onChange={v => update('education', v)}>
              <option value="">Select</option>
              <option value="tenth">10th Pass</option>
              <option value="twelfth">12th Pass</option>
              <option value="graduate">Graduate</option>
              <option value="post_graduate">Post Graduate</option>
              <option value="professional_degree">Professional Degree</option>
            </Select>
          </Row>
          <Row label="City Tier">
            <Select value={form.city_tier ?? ''} onChange={v => update('city_tier', Number(v))}>
              <option value="">Select</option>
              <option value={1}>Tier 1 (Metro)</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
            </Select>
          </Row>
        </Section>

        <Section title="Coverage Required">
          <Row label="Annual Assessed Income (Rs. Lacs)">
            <Input type="number" value={form.assessed_income_lakhs ?? ''} onChange={v => update('assessed_income_lakhs', Number(v))} placeholder="e.g. 18" />
          </Row>
          <Row label="Sum Assured Desired (Rs. Crores)">
            <Input type="number" value={form.sa_requested_cr ?? ''} onChange={v => update('sa_requested_cr', Number(v))} placeholder="e.g. 5" />
          </Row>
          <Row label="Existing Life Cover (Rs. Crores)">
            <Input type="number" value={form.existing_tsar_cr ?? 0} onChange={v => update('existing_tsar_cr', Number(v))} placeholder="e.g. 2" />
          </Row>
          <Row label="Plan Variant">
            <Select value={form.variant} onChange={v => update('variant', v)}>
              <option value="regular">Regular Cover</option>
              <option value="smart_cover">Smart Cover (1.5x underwriting SA)</option>
              <option value="early_rop">Early Return of Premium</option>
              <option value="rop">Return of Premium</option>
              <option value="whole_life">Whole Life Cover</option>
              <option value="income_protection">Income Protection Cover</option>
            </Select>
          </Row>
          <Row label="Insurance Purpose">
            <Select value={form.insurance_type} onChange={v => update('insurance_type', v)}>
              <option value="individual">Personal — Family Protection</option>
              <option value="keyman">Keyman Insurance</option>
              <option value="partnership">Partnership Cover</option>
              <option value="employer_employee">Employer-Employee</option>
              <option value="huf">HUF Cover</option>
              <option value="mwpa">Personal — MWPA Protection</option>
            </Select>
          </Row>
        </Section>

        <Section title="Health Profile">
          <Row label="BMI">
            <Input type="number" step="0.1" value={form.bmi ?? ''} onChange={v => update('bmi', Number(v))} placeholder="e.g. 26.4" />
          </Row>
          <Row label="Tobacco / Nicotine Use (last 24 months)">
            <Select value={form.tobacco_user ? 'yes' : 'no'} onChange={v => update('tobacco_user', v === 'yes')}>
              <option value="no">No — not in last 24 months</option>
              <option value="yes">Yes — in last 24 months</option>
            </Select>
          </Row>
          {!form.tobacco_user && (
            <Row label="Months since last tobacco use (if ever)">
              <Input type="number" value={form.tobacco_quit_months ?? ''} onChange={v => update('tobacco_quit_months', Number(v))} placeholder="e.g. 36" />
            </Row>
          )}
          <Row label="HbA1c (if diabetic)">
            <Input type="number" step="0.1" value={form.hba1c ?? ''} onChange={v => update('hba1c', Number(v) || undefined)} placeholder="e.g. 7.2" />
          </Row>
          <Row label="Blood Pressure History">
            <Select value={form.bp_history ? 'yes' : 'no'} onChange={v => update('bp_history', v === 'yes')}>
              <option value="no">No history of hypertension</option>
              <option value="yes">Yes — on medication or history</option>
            </Select>
          </Row>
          <Row label="Cardiac History">
            <Select value={form.cardiac_history ? 'yes' : 'no'} onChange={v => update('cardiac_history', v === 'yes')}>
              <option value="no">No cardiac history</option>
              <option value="yes">Yes — any cardiac event or procedure</option>
            </Select>
          </Row>
          <Row label="Prior Insurance Decision">
            <Select value={form.prior_decisions ?? 'none'} onChange={v => update('prior_decisions', v)}>
              <option value="none">No prior decision</option>
              <option value="standard">Issued at standard terms</option>
              <option value="loading">Issued with loading</option>
              <option value="postponed">Postponed</option>
              <option value="decline">Declined</option>
            </Select>
          </Row>
        </Section>

        <Section title="Business Details (if applicable)">
          <Row label="Business Type">
            <Select value={form.business_type ?? ''} onChange={v => update('business_type', v)}>
              <option value="">Not applicable</option>
              <option value="keyman">Keyman — Director/Key Person</option>
              <option value="partnership">Partnership Firm</option>
              <option value="employer_employee">Employer-Employee Structure</option>
              <option value="huf">HUF — Karta Cover</option>
            </Select>
          </Row>
          {form.business_type && (
            <>
              <Row label="Director Salary (Rs. Lacs/year)">
                <Input type="number" value={form.director_salary_lakhs ?? ''} onChange={v => update('director_salary_lakhs', Number(v))} placeholder="e.g. 24" />
              </Row>
              <Row label="Avg Gross Profit — 3 years (Rs. Lacs)">
                <Input type="number" value={form.gross_profit_avg_lakhs ?? ''} onChange={v => update('gross_profit_avg_lakhs', Number(v))} placeholder="e.g. 80" />
              </Row>
              <Row label="Avg Net Profit — 3 years (Rs. Lacs)">
                <Input type="number" value={form.net_profit_avg_lakhs ?? ''} onChange={v => update('net_profit_avg_lakhs', Number(v))} placeholder="e.g. 40" />
              </Row>
              <Row label="Shareholding %">
                <Input type="number" value={form.shareholding_pct ?? ''} onChange={v => update('shareholding_pct', Number(v))} placeholder="e.g. 50" />
              </Row>
            </>
          )}
        </Section>

        <button
          onClick={runSimulation}
          disabled={!form.age || !form.gender || !form.occupation || !form.assessed_income_lakhs || !form.sa_requested_cr}
          className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Analyse My Profile
        </button>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Analysing your underwriting profile</h2>
        <p className="text-slate-500 text-sm">Running deterministic engines across Company T, H, and M…</p>
        <p className="text-slate-400 text-xs mt-2">Detecting fears • Calculating vulnerabilities • Matching advisors</p>
      </div>
    );
  }

  if (step === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Underwriting Preparedness</h2>
            <span className={`text-2xl font-bold ${
              result.preparedness_score >= 85 ? 'text-green-600' :
              result.preparedness_score >= 65 ? 'text-blue-600' :
              result.preparedness_score >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>{result.preparedness_score}/100</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                result.preparedness_score >= 85 ? 'bg-green-500' :
                result.preparedness_score >= 65 ? 'bg-blue-500' :
                result.preparedness_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${result.preparedness_score}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">{result.fit_label} profile for standard underwriting consideration</p>
        </div>

        {result.fears.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              Underwriting concerns identified
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.fears.map(fear => {
                const display = getFearDisplay(fear);
                return (
                  <span key={fear} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${display.color}`}>
                    {display.icon} {display.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-slate-900 text-white rounded-2xl p-6">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Primary Underwriting Vulnerability
          </div>
          <p className="text-sm leading-relaxed">{result.primary_vulnerability}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">What this means for you</h3>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.ai_explanation}</div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-3">Recommended Insurer</h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-slate-900">Company {result.recommended_insurer}</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Optimal Fit</span>
          </div>
          <ul className="space-y-1">
            {result.insurer_rationale.map((r, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Insurer Fit Analysis</h3>
          <div className="space-y-3">
            {[
              { label: 'Company T', score: result.company_t_fit, rec: result.recommended_insurer === 'T' },
              { label: 'Company H', score: result.company_h_fit, rec: result.recommended_insurer === 'H' },
              { label: 'Company M', score: result.company_m_fit, rec: result.recommended_insurer === 'M' },
            ].map(({ label, score, rec }) => (
              <div key={label} className={rec ? 'bg-slate-50 rounded-lg p-2 -mx-2' : ''}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 flex items-center gap-2">
                    {label}
                    {rec && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Recommended</span>}
                  </span>
                  <span className="font-medium text-slate-900">{score}/100</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${rec ? 'bg-green-500' : 'bg-slate-400'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Financial Eligibility</h3>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Max Eligibility" value={`Rs. ${result.financial_eligibility_cr.toFixed(1)} Cr`} />
            <Stat label="Requested Cover" value={`Rs. ${form.sa_requested_cr} Cr`} />
            <Stat
              label="Cover Gap"
              value={result.cover_gap_cr > 0 ? `Rs. ${result.cover_gap_cr.toFixed(1)} Cr` : 'None'}
              highlight={result.cover_gap_cr > 0}
            />
            <Stat label="Medical Category (Company M)" value={result.medical_category_recommended || '—'} />
          </div>
          {result.cotinine_required && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
              ⚠️ Urine cotinine test required to verify non-smoker status
            </div>
          )}
          {result.vmer_eligible && (
            <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg p-2">
              ✅ Video MER eligible up to Rs. {result.vmer_max_cr} Cr
            </div>
          )}
        </div>

        {(result.mwpa_applicable || result.huf_applicable || result.keyman_applicable || result.ee_applicable) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-indigo-900 mb-3">Available Structures</h3>
            <div className="flex flex-wrap gap-2">
              {result.mwpa_applicable && (
                <span className="text-xs bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                  🛡️ MWPA — Creditor Protection
                </span>
              )}
              {result.huf_applicable && (
                <span className="text-xs bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                  🏛️ HUF — Dual 80C Benefit
                </span>
              )}
              {result.keyman_applicable && (
                <span className="text-xs bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                  🔑 Keyman — Business Expense
                </span>
              )}
              {result.ee_applicable && (
                <span className="text-xs bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                  🏢 Employer-Employee — Section 37(1)
                </span>
              )}
            </div>
          </div>
        )}

        {result.secondary_vulnerabilities.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">Secondary factors to address</h3>
            <ul className="space-y-2">
              {result.secondary_vulnerabilities.map((v, i) => (
                <li key={i} className="text-xs text-amber-800 leading-relaxed">{v}</li>
              ))}
            </ul>
          </div>
        )}

        {result.matched_advisors.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Advisors matched to your profile
            </h3>
            <div className="space-y-3">
              {result.matched_advisors.map((adv: any, i: number) => (
                <div key={adv.advisor_id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{adv.advisor_name ?? `Advisor ${i + 1}`}</p>
                      <p className="text-xs text-slate-500">{adv.primary_competency}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                      {adv.match_score}% match
                    </span>
                  </div>
                  {adv.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {adv.badges.slice(0, 3).map((badge: string) => (
                        <span key={badge} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {BADGE_LABELS[badge] ?? badge}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{adv.match_reason}</p>
                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    <span>Responds within {adv.response_sla_hours}h</span>
                    {adv.client_sat && <span>★ {adv.client_sat}/10 satisfaction</span>}
                    <span className="capitalize">{adv.tier} tier</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {adv.company_relationships?.t === 'preferred' && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">T: Preferred</span>
                    )}
                    {adv.company_relationships?.h === 'preferred' && (
                      <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">H: Preferred</span>
                    )}
                    {adv.company_relationships?.m === 'preferred' && (
                      <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">M: Preferred</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
          All assessments are indicative only. Final underwriting decisions on issuance, terms,
          and pricing rest entirely with the respective insurer. ETERM.IN operates as an
          IRDAI-registered intermediary. This guidance does not constitute a guarantee of any
          outcome and should not be construed as legal, tax, or medical advice.
        </p>

        <button
          onClick={() => { setStep('form'); setResult(null); }}
          className="w-full border border-slate-200 text-slate-700 py-3 rounded-xl text-sm hover:bg-slate-50 transition"
        >
          Run Another Simulation
        </button>
      </div>
    );
  }

  return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${className}`}
      {...props}
      onChange={e => props.onChange?.(e.target.value as any)}
    />
  );
}

function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { onChange: (v: string) => void }) {
  return (
    <select
      className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${className}`}
      {...props}
      onChange={e => props.onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}