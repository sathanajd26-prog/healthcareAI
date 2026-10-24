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
  const [uploadTitle, setUploadTitle] = useState('Laboratory Diagnostic Report');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    base64?: string;
    text?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setAnalyzedData(null);

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10MB limit.');
      return;
    }

    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv');

    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          text: reader.result as string,
        });
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || result;
        setSelectedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64: base64Data,
        });
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeRealFile = async () => {
    if (!selectedFile) {
      setUploadError('Please select a medical report file to analyze.');
      return;
    }

    setAnalyzing(true);
    setUploadError(null);
    try {
      const res = await api.analyzeDocumentOCR({
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        fileContentBase64: selectedFile.base64,
        textContent: selectedFile.text,
      });

      if (res.success && res.data) {
        setAnalyzedData(res.data);
      } else {
        setUploadError(res.error?.message || 'Failed to analyze document.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading document.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunDemoSimulation = async () => {
    setAnalyzing(true);
    setUploadError(null);
    try {
      const res = await api.analyzeDocumentOCR({ isDemoRequested: true });
      if (res.success && res.data) {
        setAnalyzedData(res.data);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Demo simulation failed.');
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
        aiInsights: analyzedData.isDemoData
          ? 'Synchronized from synthetic demonstration profile.'
          : 'Biomarkers extracted and synchronized into longitudinal EMR graph.',
      });
      setShowUploadModal(false);
      setAnalyzedData(null);
      setSelectedFile(null);
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
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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

            {/* Hidden Real File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Real File Selector Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-2xl p-6 text-center cursor-pointer hover:bg-teal-50 transition-colors"
            >
              <FlaskConical className="w-8 h-8 text-medical-600 mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-teal-800">Selected: {selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Plain Document'}
                  </p>
                  <p className="text-[10px] text-teal-600 mt-1 font-semibold">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-800">Click to Select Medical Report from Device</p>
                  <p className="text-[11px] text-slate-400 mt-1">Accepts Plain Text, CSV, PDF, JPG, PNG (Max 10MB)</p>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAnalyzeRealFile}
                disabled={analyzing || !selectedFile}
                className="flex-1 py-2.5 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                {analyzing ? 'Analyzing Report...' : 'Analyze Selected File'}
              </button>
              <button
                type="button"
                onClick={handleRunDemoSimulation}
                disabled={analyzing}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                title="Run with sample laboratory biomarkers for testing"
              >
                Sample Demo
              </button>
            </div>

            {analyzing && (
              <p className="text-xs text-center font-bold text-teal-700 animate-pulse">
                Extracting clinical biomarkers & matching reference ranges...
              </p>
            )}

            {analyzedData && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Analysis Complete: {analyzedData.classifiedType}</span>
                  </div>
                  {analyzedData.isDemoData && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                      DEMO SAMPLE
                    </span>
                  )}
                </div>

                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {analyzedData.clinicalSummary}
                </p>

                {/* Limitations notice if OCR unavailable */}
                {analyzedData.limitations && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                    <strong>Note:</strong> {analyzedData.limitations}
                  </div>
                )}

                {/* Biomarkers */}
                {analyzedData.extractedBiomarkers && analyzedData.extractedBiomarkers.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-slate-700 text-[11px]">Extracted Biomarkers:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {analyzedData.extractedBiomarkers.map((b: any, i: number) => (
                        <div key={i} className="p-2 bg-white rounded-lg border border-slate-200">
                          <p className="font-bold text-slate-800">{b.name}</p>
                          <p className="text-slate-600">
                            {b.value} {b.unit}{' '}
                            <span className={`font-bold text-[10px] ${b.status === 'NORMAL' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ({b.status})
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400">Ref: {b.referenceRange}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    No biomarkers extracted from this document.
                  </p>
                )}

                <p className="text-[10px] text-slate-400 italic pt-1">
                  * {analyzedData.disclaimer}
                </p>

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
