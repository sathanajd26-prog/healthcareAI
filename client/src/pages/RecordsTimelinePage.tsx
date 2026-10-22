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
      if (res.success && Array.isArray(res.data?.records)) {
        setRecords(res.data.records);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error(err);
      setRecords([]);
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
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading verified medical records...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No medical records uploaded yet</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Your longitudinal health timeline is empty. Upload clinical reports, pathology tests, or prescriptions above.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload First Clinical Report</span>
          </button>
        </div>
      ) : (
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
      )}

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
