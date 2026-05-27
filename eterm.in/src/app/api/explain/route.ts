// =============================================================================
// app/api/explain/route.ts
// AI explanation endpoint — vulnerability-first, fear-resolved response
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ETERM_SYSTEM_PROMPT } from '@/lib/ai/prompts/system-prompt';
import { selectScenariosForProfile } from '@/lib/ai/prompts/few-shot-scenarios';
import { analyzeVulnerability } from '@/lib/ai/prompts/vulnerability-first';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, profile, engines, fears } = body;

    const selectedScenarios = selectScenariosForProfile({ ...profile, ...engines });

    const few_shot_prefix = selectedScenarios.map(s => `
--- EXAMPLE CASE ---
Profile: ${s.profile_summary}
Opening: ${s.vulnerability_opening}
Explanation: ${s.explanation}
Options:
${s.options.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}
Critical action: ${s.critical_action}
--- END EXAMPLE ---`).join('\n\n');

    const vulnerability = analyzeVulnerability({
      ...profile,
      ...engines,
      income_multiplier: engines.income_multiplier,
      max_eligibility_cr: engines.max_eligibility_cr,
      available_eligibility_cr: engines.available_eligibility_cr,
      cover_gap_cr: engines.cover_gap_cr,
    });

    const user_message = `
You are ETERM's senior underwriting intelligence engine. You have seen 50,000 cases. You know exactly where underwriters look first.

Here are two reference cases showing the exact tone, structure, and intelligence level required:

${few_shot_prefix}

Now analyse this actual profile and respond in the SAME structure:
- Opening with the real primary vulnerability (not the obvious one)
- "What this means in practice:" section
- "Your options:" numbered list
- "The decision that matters most right now:" — one action

ACTUAL PROFILE TO ANALYSE:
${prompt}

CRITICAL RULES:
- Currency: Rs. only, never ₹
- Use probabilistic language: "commonly," "historically," "may," "subject to underwriter assessment"
- Never: "guaranteed," "definitely," "best," "cheapest"
- Never name real insurers — use Company T, H, M only
- Append disclaimer at end

Return a JSON object with exactly these fields:
{
  "explanation": "The full explanation text",
  "options": ["option 1", "option 2", "option 3", "option 4"],
  "critical_action": "The single most important action right now",
  "primary_insurer_recommendation": "T | H | M",
  "insurer_rationale": "One sentence explaining why this insurer is optimal for this profile"
}
Return ONLY the JSON. No markdown. No preamble.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: ETERM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: user_message }]
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: {
      explanation: string;
      options: string[];
      critical_action: string;
      primary_insurer_recommendation?: string;
      insurer_rationale?: string;
    };

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        explanation: raw.slice(0, 800),
        options: ['Consult a matched specialist advisor for detailed case-specific guidance.'],
        critical_action: 'Share your full profile with a matched advisor for precise underwriting strategy.',
        primary_insurer_recommendation: engines.recommended_insurer ?? 'M',
        insurer_rationale: 'Based on profile complexity, a specialist assessment is recommended.'
      };
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error('Explain API error:', error);
    return NextResponse.json(
      {
        explanation: 'Analysis service temporarily unavailable. Please try again.',
        options: [],
        critical_action: '',
        primary_insurer_recommendation: 'M',
        insurer_rationale: 'Service temporarily unavailable.'
      },
      { status: 500 }
    );
  }
}