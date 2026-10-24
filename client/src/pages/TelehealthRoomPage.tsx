import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  Send, 
  Sparkles,
  User,
  Heart,
  Pill,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BackButton } from '../components/BackButton';
import { HomeButton } from '../components/HomeButton';

export const TelehealthRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeFamilyMember } = useAuth();

  // Call Controls State
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'EMR' | 'AI_SOAP'>('EMR');

  // In-call Chat State
  const [messages, setMessages] = useState([
    { id: '1', sender: 'Dr. Ananya Deshmukh', text: 'Hello John! I have reviewed your latest ECG and fasting glucose results. How are you feeling today?', time: '04:30 PM' },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // AI SOAP Note state
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapDraft, setSoapDraft] = useState<any>(null);
  const [soapError, setSoapError] = useState<string | null>(null);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([
      ...messages,
      {
        id: String(Date.now()),
        sender: activeFamilyMember,
        text: inputMsg,
        time: 'Just now',
      },
    ]);
    setInputMsg('');
  };

  const generateSoap = async () => {
    setSoapLoading(true);
    setSoapError(null);
    try {
      const dialogueText = messages
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n');
      const consultationText = dialogueText.trim().length >= 5
        ? dialogueText
        : `Consultation encounter with Dr. Ananya Deshmukh and patient ${activeFamilyMember}.`;

      const res = await api.generateSoapDraft(
        consultationText,
        `Encounter review for ${activeFamilyMember}`
      );
      if (res.success && res.data) {
        setSoapDraft(res.data);
      } else {
        setSoapError(res.error?.message || 'Unable to generate SOAP note draft.');
      }
    } catch (err: any) {
      setSoapError(err.message || 'Clinical documentation service error.');
    } finally {
      setSoapLoading(false);
    }
  };


  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Telehealth Top Status Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <BackButton
            fallback="/dashboard"
            label="Exit Call"
            variant="dark"
          />
          <HomeButton
            variant="dark"
          />
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-200">Session #TEL-2026-9401</span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3 inline mr-1" /> End-to-End Encrypted
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 text-[11px] sm:text-xs">
          <span>Dr. Ananya Deshmukh</span>
          <span>•</span>
          <span className="text-white font-medium">{activeFamilyMember}</span>
        </div>
      </div>

      {/* Main Room Split View: Video Area & Side Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Video Stage */}
        <div className="flex-1 relative bg-slate-900 flex flex-col items-center justify-center p-4">
          {/* Main Remote Video Screen (Doctor Feed) */}
          <div className="w-full h-full max-h-[75vh] rounded-3xl overflow-hidden relative border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&auto=format&fit=crop&q=80"
              alt="Doctor Stream"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center space-x-2 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Dr. Ananya Deshmukh (Cardiologist)</span>
            </div>

            {/* Picture-in-Picture Local Feed (Patient) */}
            <div className="absolute bottom-4 right-4 w-36 sm:w-48 h-24 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl">
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                {videoActive ? (
                  <div className="relative w-full h-full">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                      alt="Self"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1 rounded">You</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <User className="w-6 h-6 mb-1 text-slate-500" />
                    <span>Camera Muted</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Call Control Strip */}
          <div className="absolute bottom-6 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-20">
            <button
              onClick={() => setMicActive(!micActive)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                micActive ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setVideoActive(!videoActive)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                videoActive ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={videoActive ? 'Turn Off Video' : 'Turn On Video'}
            >
              {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-900/40 transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Consultation</span>
            </button>
          </div>
        </div>

        {/* Right Drawer: Live Clinical Context, Chat & AI Notes */}
        <aside className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-72 lg:h-full">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('EMR')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'EMR' ? 'text-teal-400 border-b-2 border-teal-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              Patient EMR
            </button>
            <button
              onClick={() => setActiveTab('CHAT')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'CHAT' ? 'text-teal-400 border-b-2 border-teal-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              Secure Chat
            </button>
            <button
              onClick={() => setActiveTab('AI_SOAP')}
              className={`flex-1 py-3 text-center transition-colors flex items-center justify-center space-x-1 ${
                activeTab === 'AI_SOAP' ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI SOAP</span>
            </button>
          </div>

          {/* Tab 1: EMR Context */}
          {activeTab === 'EMR' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Vitals Telemetry</span>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <p>BP: <strong className="text-white">124/82 mmHg</strong></p>
                  <p>HR: <strong className="text-white">72 bpm</strong></p>
                  <p>SpO2: <strong className="text-white">98%</strong></p>
                  <p>Glucose: <strong className="text-amber-400">112 mg/dL</strong></p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Known Chronic History</span>
                <p className="text-slate-200">• Type-2 Diabetes Mellitus (Under control)</p>
                <p className="text-slate-200">• Mild Essential Hypertension</p>
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documented Allergies</span>
                <p className="text-rose-400 font-semibold">• Penicillin (Severe dermatologic reaction)</p>
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Prescriptions</span>
                <p className="text-slate-200">1. Metformin 500mg (OD)</p>
                <p className="text-slate-200">2. Telmisartan 20mg (OD)</p>
              </div>
            </div>
          )}

          {/* Tab 2: Encrypted Chat */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      m.sender === activeFamilyMember
                        ? 'ml-auto bg-teal-800/80 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <p className="text-[10px] text-teal-300 font-semibold mb-1">{m.sender} • {m.time}</p>
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type secure medical message..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                <button type="submit" className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: AI Consultation Assistant (SOAP Note Generator) */}
          {activeTab === 'AI_SOAP' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Clinical SOAP Draft Assistant</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Synthesize real-time consultation dialogue into structured clinical documentation for physician review.
                </p>
                <button
                  onClick={generateSoap}
                  disabled={soapLoading}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors text-xs"
                >
                  {soapLoading ? 'Synthesizing...' : 'Generate AI SOAP Note'}
                </button>
              </div>

              {soapError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">
                  <p className="font-bold">Documentation Notice:</p>
                  <p className="mt-0.5 text-[11px]">{soapError}</p>
                </div>
              )}

              {soapDraft && (
                <div className="space-y-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Clinical Encounter Draft
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      {soapDraft.metadata?.status || 'DRAFT'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Subjective</span>
                    <p className="text-slate-300 mt-0.5">{soapDraft.subjective.chiefComplaint}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 italic">{soapDraft.subjective.historyOfPresentIllness}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Objective</span>
                    <p className="text-slate-300 mt-0.5">{soapDraft.objective.vitalsRecorded}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 italic">{soapDraft.objective.physicalExamination}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Assessment</span>
                    <p className="text-slate-300 mt-0.5">{soapDraft.assessment.primaryImpression}</p>
                    {soapDraft.assessment.differential?.length > 0 && (
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Differential: {soapDraft.assessment.differential.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Plan</span>
                    <p className="text-slate-300 mt-0.5">{soapDraft.plan.rxRecommendations?.join(', ')}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{soapDraft.plan.lifestyleAdvice}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">Follow-up: {soapDraft.plan.followUp}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-700 italic">
                    * {soapDraft.metadata?.aiWatermark || soapDraft.aiWatermark}
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
