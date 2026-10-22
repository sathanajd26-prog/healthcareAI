import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  Plus, 
  FlaskConical, 
  FileCheck, 
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageNavigation } from '../components/PageNavigation';
import { MedicalRecord } from '../types';

export const RecordsTimelinePage: React.FC = () => {
  const { activeFamilyMember } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload & OCR Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('Comprehensive Blood Chemistry Panel');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);

  useEffect(() => {
    fetchRecords();
  }, [activeFamilyMember]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getTimeline();
      if (res.success && res.data.records.length > 0) {
        setRecords(res.data.records);
      } else {
        // Sample longitudinal timeline events
        setRecords([
          {
            _id: 'rec-1',
            title: 'Cardiology Follow-Up Consultation',
            encounterType: 'CONSULTATION',
            encounterDate: '2026-10-10T10:00:00Z',
            doctorName: 'Dr. Ananya Deshmukh',
            category: 'Cardiovascular Evaluation',
            summary: 'Evaluated resting palpitations. Normal S1/S2 heart sounds, ECG sinus rhythm. Advised continued aerobic walking 30 min daily.',
            vitals: { systolicBP: 124, diastolicBP: 82, heartRate: 72, spO2: 98 },
            aiInsights: 'Blood pressure shows stable control within Stage-1 pre-hypertensive threshold.',
          },
          {
            _id: 'rec-2',
            title: 'Diagnostic Lipid & Glycemic Profile',
            encounterType: 'LAB_REPORT',
            encounterDate: '2026-10-06T08:30:00Z',
            doctorName: 'Apollo Diagnostics LIS',
            category: 'Pathology & Biochemistry',
            summary: 'Automated biomarker accessioning. Fasting glucose and HbA1c panel analyzed.',
            extractedBiomarkers: [
              { name: 'HbA1c', value: '6.4', unit: '%', referenceRange: '< 5.7%', status: 'ELEVATED' },
              { name: 'Fasting Blood Sugar', value: '112', unit: 'mg/dL', referenceRange: '70-99 mg/dL', status: 'ELEVATED' },
              { name: 'Total Cholesterol', value: '178', unit: 'mg/dL', referenceRange: '< 200 mg/dL', status: 'NORMAL' },
            ],
            aiInsights: 'Positive downward trajectory: HbA1c improved from 6.8% in July to 6.4% in October.',
          },
          {
            _id: 'rec-3',
            title: 'Internal Medicine Review & Prescription',
            encounterType: 'PRESCRIPTION',
            encounterDate: '2026-09-15T14:15:00Z',
            doctorName: 'Dr. Kabir Sen',
            category: 'General Medicine',
            summary: 'Prescribed Metformin 500mg OD and Telmisartan 20mg OD with dietary potassium guidelines.',
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAndAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.analyzeDocumentOCR('BLOOD_CHEMISTRY');
      if (res.success) {
        setAnalyzedData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalyzedRecord = async () => {
    if (!analyzedData) return;
    try {
      await api.uploadRecord({
        title: uploadTitle,
        category: analyzedData.classifiedType,
        summary: analyzedData.clinicalSummary,
        biomarkers: analyzedData.extractedBiomarkers,
        aiInsights: 'Values synchronized into longitudinal health graph.',
      });
      setShowUploadModal(false);
      setAnalyzedData(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageNavigation
        backFallback="/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'EMR Timeline' },
        ]}
      />

      {/* Header & Upload CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-medical-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-medical-600" />
            <span>FHIR R4 & ABDM Compatible Record Vault</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Longitudinal Health Timeline — {activeFamilyMember}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, unified chronological medical record aggregating consultations, lab tests, and prescriptions.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload & Analyze Report</span>
        </button>
      </div>

      {/* Biomarker Trend Cards (Section 18 HbA1c Trend Example) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* HbA1c Trend Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HbA1c Glycated Hemoglobin</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" /> 0.4% Improvement
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <span className="text-3xl font-extrabold text-slate-900">6.4%</span>
            <span className="text-xs text-slate-400">Previous: 6.8% (Jul 2026)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Normal: &lt;5.7% • Pre-diabetic target: 6.0% - 6.5%
          </p>
        </div>

        {/* Fasting Glucose Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fasting Blood Glucose</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center">
              Mildly Elevated
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <span className="text-3xl font-extrabold text-slate-900">112</span>
            <span className="text-xs text-slate-400">mg/dL (Reference: 70-99)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Targeting &lt;105 mg/dL with dietary carbohydrate moderation.
          </p>
        </div>

        {/* Total Cholesterol Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Serum Cholesterol</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
              Normal
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-3">
            <span className="text-3xl font-extrabold text-slate-900">178</span>
            <span className="text-xs text-slate-400">mg/dL (Desirable: &lt;200)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Lipid fractions remain within healthy cardiovascular bounds.
          </p>
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-teal-200/70 space-y-8">
        {records.map((rec, idx) => (
          <div key={rec._id || idx} className="relative group">
            {/* Timeline bullet dot */}
            <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-5 h-5 rounded-full border-4 border-white bg-medical-600 shadow-sm" />

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:border-medical-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-medical-700 uppercase tracking-wider">{rec.encounterType}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{new Date(rec.encounterDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{rec.title}</h3>
                </div>

                <span className="text-xs text-slate-600 font-medium px-2.5 py-1 bg-slate-100 rounded-lg">
                  {rec.doctorName}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                {rec.summary}
              </p>

              {/* Biomarkers if present */}
              {rec.extractedBiomarkers && rec.extractedBiomarkers.length > 0 && (
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Extracted Biomarker Panel</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {rec.extractedBiomarkers.map((b, bIdx) => (
                      <div key={bIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <p className="text-slate-500 font-medium">{b.name}</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{b.value} <span className="text-[10px] text-slate-400 font-normal">{b.unit}</span></p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ref: {b.referenceRange}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights pill */}
              {rec.aiInsights && (
                <div className="mt-4 flex items-center space-x-2 text-xs text-teal-900 bg-teal-50 border border-teal-200/80 px-3 py-2 rounded-xl">
                  <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span><strong>AI Synthesis:</strong> {rec.aiInsights}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload & OCR Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-medical-700" />
                <h3 className="text-base font-bold text-slate-900">Upload & Analyze Clinical Document</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            {/* Drag & Drop Simulation Box */}
            <div
              onClick={handleUploadAndAnalyze}
              className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-teal-50 transition-colors"
            >
              <FlaskConical className="w-8 h-8 text-medical-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Click to Select & OCR Scan Medical Report</p>
              <p className="text-[11px] text-slate-400 mt-1">Accepts PDF, JPG, PNG, Scanned Laboratory Sheets</p>
            </div>

            {analyzing && (
              <p className="text-xs text-center font-bold text-teal-700 animate-pulse">
                Extracting clinical biomarkers via OCR & matching LOINC reference ranges...
              </p>
            )}

            {analyzedData && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OCR Extraction Complete ({analyzedData.classifiedType})</span>
                </div>
                <div className="space-y-1">
                  {analyzedData.extractedBiomarkers.map((b: any, i: number) => (
                    <p key={i} className="text-slate-700">
                      • <strong>{b.name}:</strong> {b.value} {b.unit} ({b.status})
                    </p>
                  ))}
                </div>
                <button
                  onClick={saveAnalyzedRecord}
                  className="w-full py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Save to Longitudinal Timeline
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
