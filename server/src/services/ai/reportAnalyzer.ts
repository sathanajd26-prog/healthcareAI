export interface ExtractedBiomarker {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'ELEVATED' | 'LOW';
}

export interface ReportAnalysisInput {
  documentType?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  fileContentBase64?: string;
  textContent?: string;
  isDemoRequested?: boolean;
}

export interface ReportAnalysisResult {
  classifiedType: string;
  extractedBiomarkers: ExtractedBiomarker[];
  clinicalSummary: string;
  ocrStatus: 'SUCCESS_TEXT_PARSED' | 'OCR_UNAVAILABLE_BINARY' | 'NO_BIOMARKERS_DETECTED' | 'DEMO_SIMULATION';
  limitations?: string;
  isDemoData: boolean;
  disclaimer: string;
  extractedFromTextLength?: number;
}

// Known standard biomarker reference configurations for calibrated extraction
interface BiomarkerDef {
  key: string;
  name: string;
  unit: string;
  patterns: RegExp[];
  refRangeText: string;
  minNormal: number;
  maxNormal: number;
}

const BIOMARKER_DEFINITIONS: BiomarkerDef[] = [
  {
    key: 'glucose',
    name: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    patterns: [
      /(?:fasting\s+(?:blood\s+)?glucose|fbs|blood\s+glucose|glucose)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '70 - 99 mg/dL',
    minNormal: 70,
    maxNormal: 99,
  },
  {
    key: 'hba1c',
    name: 'HbA1c (Glycated Hemoglobin)',
    unit: '%',
    patterns: [
      /(?:hba1c|glycated\s+hemoglobin|hemoglobin\s+a1c)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
      /(?:hba1c|glycated\s+hemoglobin)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    ],
    refRangeText: '< 5.7%',
    minNormal: 4.0,
    maxNormal: 5.6,
  },
  {
    key: 'totalCholesterol',
    name: 'Total Cholesterol',
    unit: 'mg/dL',
    patterns: [
      /(?:total\s+cholesterol|serum\s+cholesterol|cholesterol,\s*total)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '< 200 mg/dL',
    minNormal: 125,
    maxNormal: 199,
  },
  {
    key: 'ldl',
    name: 'LDL Cholesterol',
    unit: 'mg/dL',
    patterns: [
      /(?:ldl(?:\s+cholesterol)?|low\s+density\s+lipoprotein)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '< 100 mg/dL',
    minNormal: 50,
    maxNormal: 99,
  },
  {
    key: 'hdl',
    name: 'HDL Cholesterol',
    unit: 'mg/dL',
    patterns: [
      /(?:hdl(?:\s+cholesterol)?|high\s+density\s+lipoprotein)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '> 40 mg/dL',
    minNormal: 40,
    maxNormal: 100,
  },
  {
    key: 'triglycerides',
    name: 'Serum Triglycerides',
    unit: 'mg/dL',
    patterns: [
      /(?:triglycerides|serum\s+triglycerides)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '< 150 mg/dL',
    minNormal: 50,
    maxNormal: 149,
  },
  {
    key: 'creatinine',
    name: 'Serum Creatinine',
    unit: 'mg/dL',
    patterns: [
      /(?:serum\s+creatinine|creatinine)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dL)?/i,
    ],
    refRangeText: '0.7 - 1.3 mg/dL',
    minNormal: 0.7,
    maxNormal: 1.3,
  },
  {
    key: 'hemoglobin',
    name: 'Hemoglobin (Hb)',
    unit: 'g/dL',
    patterns: [
      /(?:hemoglobin|hb)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g\/dL)?/i,
    ],
    refRangeText: '13.0 - 17.0 g/dL',
    minNormal: 13.0,
    maxNormal: 17.0,
  },
  {
    key: 'wbc',
    name: 'White Blood Cell Count (WBC)',
    unit: 'cells/mcL',
    patterns: [
      /(?:wbc(?:\s+count)?|white\s+blood\s+cell(?:\s+count)?|total\s+leukocyte\s+count|tlc)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    ],
    refRangeText: '4,500 - 11,000 /mcL',
    minNormal: 4500,
    maxNormal: 11000,
  },
  {
    key: 'platelets',
    name: 'Platelet Count',
    unit: 'x10^3/mcL',
    patterns: [
      /(?:platelet(?:\s+count)?|plt)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    ],
    refRangeText: '150 - 450 x10^3/mcL',
    minNormal: 150,
    maxNormal: 450,
  },
  {
    key: 'tsh',
    name: 'TSH (Thyroid Stimulating Hormone)',
    unit: 'uIU/mL',
    patterns: [
      /(?:tsh|thyroid\s+stimulating\s+hormone)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:uIU\/mL|mIU\/L)?/i,
    ],
    refRangeText: '0.4 - 4.0 uIU/mL',
    minNormal: 0.4,
    maxNormal: 4.0,
  },
];

const DISALLOWED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-bat',
  'application/x-dosexec',
  'text/html',
  'application/javascript',
  'application/x-javascript',
];

const ALLOWED_MIME_PATTERNS = [
  /^text\/plain/,
  /^text\/csv/,
  /^application\/pdf/,
  /^image\/jpeg/,
  /^image\/png/,
  /^image\/webp/,
];

export class ReportAnalyzerService {
  /**
   * Validate and analyze a medical report document.
   * Extracts real biomarkers from text content or base64 decoded text.
   * If binary image/PDF is uploaded without configured OCR, returns clear limitation.
   */
  public static async analyzeDocument(input: ReportAnalysisInput): Promise<ReportAnalysisResult> {
    // 1. Explicit Demo Simulation Request
    if (input.isDemoRequested) {
      return {
        classifiedType: 'Comprehensive Metabolic Panel (CMP) [DEMO SIMULATION]',
        extractedBiomarkers: [
          { name: 'HbA1c', value: '6.4', unit: '%', referenceRange: '< 5.7%', status: 'ELEVATED' },
          { name: 'Estimated Average Glucose', value: '137', unit: 'mg/dL', referenceRange: '< 117 mg/dL', status: 'ELEVATED' },
          { name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.7 - 1.3 mg/dL', status: 'NORMAL' },
          { name: 'Total Cholesterol', value: '178', unit: 'mg/dL', referenceRange: '< 200 mg/dL', status: 'NORMAL' },
        ],
        clinicalSummary: 'DEMO DATA: Synthetic biochemical panel illustrating glycemic elevation and normal renal parameters.',
        ocrStatus: 'DEMO_SIMULATION',
        isDemoData: true,
        disclaimer: 'DEMO NOTICE: This output consists of synthetic demonstration values. It was not extracted from any live patient document.',
      };
    }

    // 2. Validate upload safety and mime types
    const mime = (input.mimeType || '').toLowerCase();
    const fileName = (input.fileName || '').toLowerCase();

    if (mime && DISALLOWED_MIME_TYPES.includes(mime)) {
      throw new Error('SECURITY_ERROR: Uploaded file type is prohibited for clinical documents.');
    }

    if (fileName.endsWith('.exe') || fileName.endsWith('.sh') || fileName.endsWith('.bat') || fileName.endsWith('.cmd')) {
      throw new Error('SECURITY_ERROR: Executable file types are strictly prohibited.');
    }

    // If mime type is present, ensure it belongs to allowed medical document formats
    if (mime && !ALLOWED_MIME_PATTERNS.some((pattern) => pattern.test(mime))) {
      throw new Error(`UNSUPPORTED_FORMAT: File type "${mime}" is not a supported medical record format.`);
    }

    // 3. Resolve Document Text Content
    let textToAnalyze = '';

    if (input.textContent && input.textContent.trim().length > 0) {
      textToAnalyze = input.textContent.trim();
    } else if (input.fileContentBase64) {
      try {
        const buffer = Buffer.from(input.fileContentBase64, 'base64');

        // Check if buffer contains binary PDF or Image headers
        const isPdf = buffer.slice(0, 4).toString() === '%PDF';
        const isPng = buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isJpeg = buffer.slice(0, 2).equals(Buffer.from([0xff, 0xd8]));

        if (isPdf || isPng || isJpeg || (mime && (mime.includes('image') || mime.includes('pdf')))) {
          // Binary image / scanned document without local OCR engine
          return {
            classifiedType: isPdf ? 'Scanned PDF Laboratory Report' : 'Scanned Image / Photographic Lab Sheet',
            extractedBiomarkers: [],
            clinicalSummary: 'Document received and validated. OCR text extraction engine is not configured in this environment.',
            ocrStatus: 'OCR_UNAVAILABLE_BINARY',
            limitations: 'Local Optical Character Recognition (OCR) engine is unconfigured. Scanned binary images and image-only PDFs require an active OCR service. No biomarker values have been fabricated.',
            isDemoData: false,
            disclaimer: 'CLINICAL NOTICE: Without an active OCR provider, clinical biomarkers cannot be extracted from photographic/binary files. Please paste lab text or input values manually.',
          };
        }

        // Attempt text decode for plain text / CSV reports
        textToAnalyze = buffer.toString('utf-8').trim();
      } catch (e) {
        throw new Error('DECODE_ERROR: Unable to decode uploaded document content.');
      }
    }

    // 4. Handle empty document content
    if (!textToAnalyze) {
      return {
        classifiedType: input.documentType || 'Unclassified Medical Document',
        extractedBiomarkers: [],
        clinicalSummary: 'Uploaded document contains no readable text content.',
        ocrStatus: 'NO_BIOMARKERS_DETECTED',
        limitations: 'Document body is empty or unreadable text. No clinical values extracted.',
        isDemoData: false,
        disclaimer: 'Automated document analysis completed. No biomarkers were found in the uploaded text.',
      };
    }

    // 5. Extract Biomarkers via Calibrated Pattern Matching
    const extracted: ExtractedBiomarker[] = [];
    const lowerText = textToAnalyze.toLowerCase();

    for (const def of BIOMARKER_DEFINITIONS) {
      for (const pattern of def.patterns) {
        const match = textToAnalyze.match(pattern);
        if (match && match[1]) {
          const numVal = parseFloat(match[1]);
          if (!isNaN(numVal)) {
            let status: 'NORMAL' | 'ELEVATED' | 'LOW' = 'NORMAL';
            if (numVal > def.maxNormal) {
              status = 'ELEVATED';
            } else if (numVal < def.minNormal) {
              status = 'LOW';
            }

            extracted.push({
              name: def.name,
              value: String(numVal),
              unit: def.unit,
              referenceRange: def.refRangeText,
              status,
            });
            break; // Matched this biomarker definition once
          }
        }
      }
    }

    // 6. Formulate Document Classification & Summary
    let classifiedType = input.documentType || 'General Laboratory Report';
    if (lowerText.includes('lipid') || lowerText.includes('cholesterol') || lowerText.includes('triglyceride')) {
      classifiedType = 'Lipid Profile Report';
    } else if (lowerText.includes('glucose') || lowerText.includes('hba1c') || lowerText.includes('diabetic')) {
      classifiedType = 'Glycemic Panel / Diabetes Screening';
    } else if (lowerText.includes('creatinine') || lowerText.includes('renal') || lowerText.includes('kidney')) {
      classifiedType = 'Renal Function Test (RFT)';
    } else if (lowerText.includes('hemoglobin') || lowerText.includes('cbc') || lowerText.includes('wbc')) {
      classifiedType = 'Complete Blood Count (CBC)';
    }

    const clinicalSummary = extracted.length > 0
      ? `Successfully extracted ${extracted.length} documented biomarker(s) from report text. ${
          extracted.some((b) => b.status !== 'NORMAL')
            ? 'Notable out-of-range parameters detected requiring clinician review.'
            : 'Extracted values appear within standard physiological reference ranges.'
        }`
      : 'Document processed successfully, but no standard clinical biomarkers matched the extraction parser.';

    return {
      classifiedType,
      extractedBiomarkers: extracted,
      clinicalSummary,
      ocrStatus: extracted.length > 0 ? 'SUCCESS_TEXT_PARSED' : 'NO_BIOMARKERS_DETECTED',
      limitations: extracted.length === 0
        ? 'No standard biomarker patterns detected in the supplied text. Verify that the document includes biomarker names with values.'
        : undefined,
      isDemoData: false,
      disclaimer: 'Values extracted via automated text parser. Attending clinician must verify values against the physical source document before making clinical decisions.',
      extractedFromTextLength: textToAnalyze.length,
    };
  }
}
