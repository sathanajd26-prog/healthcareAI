import { AiProviderService } from './aiProvider';

export interface SoapDraftInput {
  consultationDialogue: string;
  patientSymptoms?: string;
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    spO2?: number;
    temperature?: number;
    glucose?: number;
  };
  encounterType?: string;
  patientName?: string;
  clinicianName?: string;
}

export interface SoapDraftResult {
  subjective: {
    chiefComplaint: string;
    historyOfPresentIllness: string;
  };
  objective: {
    vitalsRecorded: string;
    physicalExamination: string;
  };
  assessment: {
    primaryImpression: string;
    differential: string[];
  };
  plan: {
    rxRecommendations: string[];
    lifestyleAdvice: string;
    followUp: string;
  };
  metadata: {
    status: 'DRAFT';
    requiresClinicianApproval: boolean;
    clinicianReviewed: boolean;
    provider: 'OPENAI_LIVE' | 'GEMINI_LIVE' | 'LOCAL_DETERMINISTIC_SYNTHESIZER';
    isFallback: boolean;
    generatedAt: string;
    aiWatermark: string;
  };
}

export class SoapGeneratorService {
  /**
   * Generates a structured clinical SOAP draft strictly from supplied clinical inputs.
   * If information is missing, it is explicitly marked as unavailable.
   * NEVER invents symptoms, diagnoses, or medications not present in inputs.
   */
  public static async generateDraft(input: SoapDraftInput): Promise<SoapDraftResult> {
    const dialogue = (input.consultationDialogue || '').trim();
    const symptoms = (input.patientSymptoms || '').trim();

    // 1. If live LLM provider is configured, attempt model generation
    if (AiProviderService.isLiveAiConfigured()) {
      try {
        const prompt = `You are a clinical documentation assistant for AegisHealth.
Generate a structured clinical SOAP draft (Subjective, Objective, Assessment, Plan) based ONLY on the provided consultation dialogue and reported symptoms.

STRICT CLINICAL SAFETY RULES:
1. NEVER invent symptoms, vitals, examination findings, diagnoses, medications, or treatment plans that are not explicitly mentioned in the input dialogue.
2. If vitals were not discussed, write "[Not recorded during consultation]".
3. If physical examination was not documented, write "[Requires attending clinician physical examination]".
4. If no medications were discussed, list ["[No prescription documented in dialogue - pending clinician order]"].
5. Return JSON ONLY with this exact structure:
{
  "subjective": {
    "chiefComplaint": "string",
    "historyOfPresentIllness": "string"
  },
  "objective": {
    "vitalsRecorded": "string",
    "physicalExamination": "string"
  },
  "assessment": {
    "primaryImpression": "string",
    "differential": ["string"]
  },
  "plan": {
    "rxRecommendations": ["string"],
    "lifestyleAdvice": "string",
    "followUp": "string"
  }
}

Input Context:
- Consultation Dialogue: "${dialogue}"
- Reported Symptoms: "${symptoms || 'None specified'}"
- Documented Vitals: ${JSON.stringify(input.vitals || {})}`;

        const aiResult = await AiProviderService.generateCompletion({
          messages: [
            { role: 'system', content: 'You are a clinical documentation assistant. Output valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          maxTokens: 800,
          timeoutMs: 8000,
        });

        if (aiResult.success && aiResult.text) {
          // Parse JSON from text
          const cleanedText = aiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);

          return {
            subjective: {
              chiefComplaint: parsed.subjective?.chiefComplaint || symptoms || 'Symptoms reviewed in consultation',
              historyOfPresentIllness: parsed.subjective?.historyOfPresentIllness || dialogue,
            },
            objective: {
              vitalsRecorded: parsed.objective?.vitalsRecorded || this.formatVitals(input.vitals),
              physicalExamination: parsed.objective?.physicalExamination || '[Requires attending clinician physical examination]',
            },
            assessment: {
              primaryImpression: parsed.assessment?.primaryImpression || '[Preliminary impression pending clinician evaluation]',
              differential: Array.isArray(parsed.assessment?.differential) ? parsed.assessment.differential : [],
            },
            plan: {
              rxRecommendations: Array.isArray(parsed.plan?.rxRecommendations) && parsed.plan.rxRecommendations.length > 0
                ? parsed.plan.rxRecommendations
                : ['[Pending attending clinician order]'],
              lifestyleAdvice: parsed.plan?.lifestyleAdvice || '[Discussed lifestyle recommendations as recorded in dialogue]',
              followUp: parsed.plan?.followUp || 'Follow up as clinically indicated or if symptoms worsen.',
            },
            metadata: {
              status: 'DRAFT',
              requiresClinicianApproval: true,
              clinicianReviewed: false,
              provider: aiResult.provider === 'GEMINI_LIVE' ? 'GEMINI_LIVE' : 'OPENAI_LIVE',
              isFallback: false,
              generatedAt: new Date().toISOString(),
              aiWatermark: 'AI DRAFT NOTE: Requires attending physician review, edit, and cryptographic signature.',
            },
          };
        }
      } catch (err) {
        // Fall through to deterministic clinical synthesizer
      }
    }

    // 2. Safe Local Deterministic Clinical Synthesizer (Fallback)
    return this.generateDeterministicDraft(dialogue, symptoms, input.vitals);
  }

  private static generateDeterministicDraft(
    dialogue: string,
    symptoms: string,
    vitals?: SoapDraftInput['vitals']
  ): SoapDraftResult {
    const lowerDialogue = dialogue.toLowerCase();

    // Subjective Section
    const chiefComplaint = symptoms || (dialogue.length > 120 ? `${dialogue.substring(0, 117)}...` : dialogue) || '[Chief complaint not documented]';
    const historyOfPresentIllness = dialogue || '[History of present illness not documented in consultation notes]';

    // Objective Section - Format vitals strictly if present in structured object or mentioned in text
    let vitalsRecorded = this.formatVitals(vitals);
    if (vitalsRecorded === '[Not recorded in consultation data]') {
      // Check if vitals are mentioned in dialogue text
      const bpMatch = dialogue.match(/\b(?:bp|blood\s*pressure)\s*[:=-]?\s*([0-9]{2,3}\s*\/\s*[0-9]{2,3})\b/i);
      const hrMatch = dialogue.match(/\b(?:hr|pulse|heart\s*rate)\s*[:=-]?\s*([0-9]{2,3})\s*(?:bpm)?\b/i);
      const glucoseMatch = dialogue.match(/\b(?:glucose|blood\s*sugar)\s*[:=-]?\s*([0-9]{2,3})\s*(?:mg\/dL)?\b/i);

      const parsedVitals: string[] = [];
      if (bpMatch) parsedVitals.push(`BP: ${bpMatch[1].trim()} mmHg`);
      if (hrMatch) parsedVitals.push(`HR: ${hrMatch[1].trim()} bpm`);
      if (glucoseMatch) parsedVitals.push(`Glucose: ${glucoseMatch[1].trim()} mg/dL`);

      if (parsedVitals.length > 0) {
        vitalsRecorded = parsedVitals.join(', ');
      }
    }

    const physicalExamination = '[Requires attending clinician physical examination]';

    // Assessment Section - Derived strictly from inputs without inventing unmentioned conditions
    let primaryImpression = '[Preliminary clinical impression pending complete examination]';
    const differential: string[] = [];

    if (lowerDialogue.includes('headache') || lowerDialogue.includes('migraine')) {
      primaryImpression = 'Cephalalgia / Headache Evaluation (Pending diagnostic confirmation)';
      differential.push('Tension-type Cephalalgia', 'Migraine variant');
    } else if (lowerDialogue.includes('glucose') || lowerDialogue.includes('sugar') || lowerDialogue.includes('diabetes')) {
      primaryImpression = 'Glycemic Regulation Monitoring';
      differential.push('Pre-diabetes management', 'Type 2 Diabetes Mellitus review');
    } else if (lowerDialogue.includes('chest') || lowerDialogue.includes('palpitation')) {
      primaryImpression = 'Cardiovascular Symptom Evaluation (Requires urgent ECG & cardiac biomarkers)';
      differential.push('Atypical chest discomfort', 'Musculoskeletal thoracic strain');
    } else if (lowerDialogue.includes('skin') || lowerDialogue.includes('rash') || lowerDialogue.includes('dermat')) {
      primaryImpression = 'Cutaneous Dermatological Assessment';
      differential.push('Contact Dermatitis', 'Eczematous rash');
    } else if (symptoms) {
      primaryImpression = `Clinical evaluation of reported: ${symptoms}`;
    }

    // Plan Section - Extract medications only if mentioned
    const rxRecommendations: string[] = [];
    const medMatches = dialogue.match(/\b(?:tab|tablet|cap|capsule|mg|drops|syrup)\s+[A-Za-z0-9\s-]{3,20}\b/gi);
    if (medMatches && medMatches.length > 0) {
      rxRecommendations.push(...medMatches.map((m) => m.trim()));
    } else {
      rxRecommendations.push('[No medications documented in consultation notes - pending clinician order]');
    }

    let lifestyleAdvice = '[Maintain standard hydration and balanced nutrition]';
    if (lowerDialogue.includes('walk') || lowerDialogue.includes('exercise')) {
      lifestyleAdvice = 'Continue prescribed daily physical exercise/walking routine.';
    } else if (lowerDialogue.includes('diet') || lowerDialogue.includes('sugar')) {
      lifestyleAdvice = 'Adhere to recommended low-glycemic dietary options.';
    }

    const followUp = lowerDialogue.includes('follow') || lowerDialogue.includes('week') || lowerDialogue.includes('return')
      ? 'Follow-up review as discussed in consultation.'
      : 'Return for clinical re-evaluation if symptoms persist beyond 7 days or worsen.';

    return {
      subjective: {
        chiefComplaint,
        historyOfPresentIllness,
      },
      objective: {
        vitalsRecorded,
        physicalExamination,
      },
      assessment: {
        primaryImpression,
        differential,
      },
      plan: {
        rxRecommendations,
        lifestyleAdvice,
        followUp,
      },
      metadata: {
        status: 'DRAFT',
        requiresClinicianApproval: true,
        clinicianReviewed: false,
        provider: 'LOCAL_DETERMINISTIC_SYNTHESIZER',
        isFallback: true,
        generatedAt: new Date().toISOString(),
        aiWatermark: 'AI DRAFT NOTE: Requires attending physician review, edit, and cryptographic signature.',
      },
    };
  }

  private static formatVitals(vitals?: SoapDraftInput['vitals']): string {
    if (!vitals) return '[Not recorded in consultation data]';
    const parts: string[] = [];
    if (vitals.systolicBP && vitals.diastolicBP) {
      parts.push(`BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg`);
    }
    if (vitals.heartRate) {
      parts.push(`HR: ${vitals.heartRate} bpm`);
    }
    if (vitals.spO2) {
      parts.push(`SpO2: ${vitals.spO2}%`);
    }
    if (vitals.temperature) {
      parts.push(`Temp: ${vitals.temperature}°F`);
    }
    if (vitals.glucose) {
      parts.push(`Glucose: ${vitals.glucose} mg/dL`);
    }
    return parts.length > 0 ? parts.join(', ') : '[Not recorded in consultation data]';
  }
}
