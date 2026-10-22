import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  User, 
  HelpCircle,
  FileText,
  Calendar,
  Pill,
  Copy,
  Check,
  RotateCcw,
  Download,
  Trash2,
  Phone,
  ArrowDown
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageNavigation } from '../components/PageNavigation';
import type { CompanionState } from '../components/3d/AIAssistantCompanion3D';
import { Loader2, CheckCircle2 } from 'lucide-react';

const AIAssistantCompanion3D = React.lazy(() =>
  import('../components/3d/AIAssistantCompanion3D').then((m) => ({ default: m.AIAssistantCompanion3D }))
);

interface Message {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  emergencyAlert?: boolean;
  provider?: string;
  isError?: boolean;
}

// Emergency keyword patterns for immediate client-side detection (Emergency Number: 112)
const CLIENT_EMERGENCY_REGEX = /\b(chest\s*pain|heart\s*attack|cardiac\s*arrest|cannot\s*breathe|shortness\s*of\s*breath|stroke|facial\s*droop|arm\s*weakness|slurred\s*speech|severe\s*bleeding|unconscious|fainted|throat\s*closing|anaphylaxis|suicid)\b/i;

export const AIHealthAssistantPage: React.FC = () => {
  const { activeFamilyMember } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clientEmergencyWarning, setClientEmergencyWarning] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Storage key isolated by active family member
  const storageKey = `aegishealth_chat_${activeFamilyMember.replace(/\s+/g, '_')}`;

  // Initial welcome greeting template
  const defaultGreeting: Message = {
    id: 'welcome-msg',
    sender: 'AI',
    text: `Hello ${activeFamilyMember.split(' ')[0]}! I am your AegisHealth Clinical AI Assistant.

I have secure, read-only access to your authorized medical timeline, prescriptions, and lab records.

How can I help you today? You can ask about your latest HbA1c tests, active medications, or upcoming doctor appointments.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    provider: 'AegisHealth Clinical OS',
  };

  // Load chat history from localStorage on profile switch or mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    setMessages([defaultGreeting]);
  }, [storageKey]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.warn('Failed to save chat to localStorage:', e);
      }
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom if user is already near bottom
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Track user scroll position
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsNearBottom(true);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }

    // Immediate client-side emergency check
    if (CLIENT_EMERGENCY_REGEX.test(e.target.value)) {
      setClientEmergencyWarning(
        'Critical alert: Your query indicates acute symptoms. If this is a life-threatening emergency, dial 112 immediately or proceed to the nearest hospital trauma center.'
      );
    } else {
      setClientEmergencyWarning(null);
    }
  };

  // Keyboard navigation: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setClientEmergencyWarning(null);

    // 15-second client-side timeout controller
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    try {
      const res = await api.askHealthAssistant(
        textToSend,
        updatedMessages.map((m) => ({ sender: m.sender, text: m.text })),
        activeFamilyMember,
        abortController.signal
      );

      clearTimeout(timeoutId);

      if (res.success && res.data) {
        if (res.data.providerNotice) {
          setProviderNotice(res.data.providerNotice);
        }

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'AI',
          text: res.data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          emergencyAlert: res.data.emergencyAlert,
          provider: res.data.provider || 'Clinical Knowledge Engine',
        };
        setMessages([...updatedMessages, aiMsg]);
      } else {
        throw new Error(res.error?.message || 'Clinical response unavailable');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        text: isTimeout
          ? 'The request timed out while analyzing your medical records. Please check your network and click "Retry" below.'
          : 'Unable to connect to the healthcare service. Please check your connection or retry in a few moments.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    // Find last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'USER') {
        const lastQuery = messages[i].text;
        // Remove error message and retry
        setMessages(messages.filter((m) => !m.isError));
        handleSend(lastQuery);
        break;
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('Clear your conversation history for this profile?')) {
      localStorage.removeItem(storageKey);
      setMessages([defaultGreeting]);
      setProviderNotice(null);
    }
  };

  const handleExportChat = () => {
    const transcript = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.sender === 'USER' ? activeFamilyMember : 'AegisHealth AI'}:\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob(
      [
        `AegisHealth AI Health Assistant Transcript\nPatient: ${activeFamilyMember}\nDate: ${new Date().toLocaleString()}\n\nDisclaimer: Informational synthesis only. Not a medical diagnosis.\n\n========================================\n\n${transcript}`
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AegisHealth_AI_Consultation_${activeFamilyMember.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickPrompts = [
    { label: 'Explain my latest blood report', icon: FileText, query: 'Explain my latest blood report and glucose trends.' },
    { label: 'What medicines am I taking?', icon: Pill, query: 'What medicines am I currently taking and what are the doses?' },
    { label: 'When is my next appointment?', icon: Calendar, query: 'When is my next scheduled appointment and with which doctor?' },
    { label: 'Questions for my cardiologist', icon: HelpCircle, query: 'What questions should I ask my cardiologist about resting heart palpitations?' },
  ];

  const lastMsg = messages[messages.length - 1];
  const companionState: CompanionState = loading
    ? 'processing'
    : lastMsg?.isError
    ? 'error'
    : lastMsg?.sender === 'AI' && messages.length > 1
    ? 'success'
    : 'idle';

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Top Navigation Row: Back Button, Home Button & Breadcrumbs */}
      <PageNavigation
        backFallback="/dashboard"
        backLabel="Back"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'AI Health Assistant' },
        ]}
        rightContent={
          messages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handleExportChat}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors"
                title="Download conversation transcript as text"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                type="button"
                onClick={handleClearChat}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 shadow-2xs transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )
        }
      />

      {/* Mandatory Non-Diagnostic Clinical Disclaimer Banner */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 text-xs text-amber-900 flex items-start space-x-2.5 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <span className="font-bold">Medical Information Disclaimer:</span> AegisHealth AI provides educational health synthesis from authorized clinical records. It does not diagnose conditions, prescribe medications, or replace direct clinical consultation with a licensed healthcare professional.
        </div>
      </div>

      {/* Immediate Client-Side Emergency Warning Banner */}
      {clientEmergencyWarning && (
        <div className="bg-rose-600 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-bold leading-relaxed">
              {clientEmergencyWarning}
            </p>
          </div>
          <a
            href="tel:112"
            className="w-full sm:w-auto px-4 py-2 bg-white text-rose-700 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:bg-rose-50 transition-colors flex-shrink-0"
          >
            <Phone className="w-4 h-4" />
            <span>Call 112 Now</span>
          </a>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-14rem)] sm:h-[calc(100vh-13rem)] min-h-[480px]">
        {/* Chat Header Bar with 3D Visual Companion */}
        <div className="bg-gradient-to-r from-teal-900 via-medical-800 to-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {/* 3D Visual Companion Hologram */}
            <React.Suspense
              fallback={
                <div
                  className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Bot className="w-5 h-5 text-teal-300 animate-pulse" />
                </div>
              }
            >
              <AIAssistantCompanion3D state={companionState} className="w-11 h-11 flex-shrink-0" />
            </React.Suspense>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight">Clinical AI Health Assistant</h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  RAG Protected
                </span>
              </div>
              <p className="text-[11px] text-teal-200/90">
                Active Profile: <strong className="text-white">{activeFamilyMember}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Real-time Dynamic State Badge */}
            <div className="hidden sm:flex items-center">
              {companionState === 'processing' ? (
                <span className="flex items-center space-x-1.5 text-sky-200 border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs">
                  <Loader2 className="w-3 h-3 animate-spin text-sky-300" />
                  <span>Synthesizing Records...</span>
                </span>
              ) : companionState === 'error' ? (
                <span className="flex items-center space-x-1.5 text-rose-200 border border-rose-400/30 bg-rose-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3 text-rose-300" />
                  <span>Interrupted</span>
                </span>
              ) : companionState === 'success' ? (
                <span className="flex items-center space-x-1.5 text-emerald-200 border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>Analysis Ready</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5 text-teal-200 border border-teal-400/30 bg-teal-500/15 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>AI Companion Online</span>
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-semibold text-teal-100 border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* Local Provider Notice Bar if applicable */}
        {providerNotice && (
          <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="truncate">{providerNotice}</span>
            <button
              type="button"
              onClick={() => setProviderNotice(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Feed Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm bg-slate-50/40 relative"
          tabIndex={0}
          aria-label="Chat messages history"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${
                m.sender === 'USER' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                  m.sender === 'USER'
                    ? 'bg-slate-900 shadow-xs'
                    : m.emergencyAlert
                    ? 'bg-rose-600 shadow-xs'
                    : 'bg-gradient-to-tr from-medical-700 to-medical-500 shadow-xs'
                }`}
              >
                {m.sender === 'USER' ? (
                  <User className="w-4 h-4" />
                ) : m.emergencyAlert ? (
                  <AlertTriangle className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-xs leading-relaxed transition-all ${
                  m.sender === 'USER'
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : m.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-xs'
                    : m.emergencyAlert
                    ? 'bg-rose-50/90 border border-rose-300 text-rose-950 rounded-tl-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                {/* Sender Title & Timestamp */}
                <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-80">
                  <span className="font-semibold">
                    {m.sender === 'USER' ? activeFamilyMember.split(' ')[0] : 'Clinical Assistant'}
                  </span>
                  <span className="text-[10px] ml-2 opacity-75">{m.timestamp}</span>
                </div>

                {/* Text Content */}
                <div className="whitespace-pre-line text-xs sm:text-sm">{m.text}</div>

                {/* Emergency Hotline Button if flagged */}
                {m.emergencyAlert && (
                  <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap items-center gap-2">
                    <a
                      href="tel:112"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Dial National Emergency (112)</span>
                    </a>
                  </div>
                )}

                {/* Error Retry Option */}
                {m.isError && (
                  <div className="mt-3 pt-2 border-t border-rose-200 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                )}

                {/* Bubble Footer & Copy Action */}
                <div className="mt-2.5 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {m.sender === 'AI' && !m.isError ? (
                      <span className="text-[10px] text-slate-400">Non-Diagnostic Synthesis</span>
                    ) : null}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(m.text, m.id)}
                    className="opacity-70 hover:opacity-100 transition-opacity flex items-center space-x-1 p-1 hover:text-medical-700"
                    title="Copy message to clipboard"
                    aria-label="Copy message"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-medical-700 to-medical-500 flex items-center justify-center text-white flex-shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-medical-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-medical-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-medical-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-slate-500 font-medium ml-2">Retrieving authorized medical records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll To Bottom Button (if user scrolled up) */}
        {!isNearBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-28 right-8 p-2.5 bg-white text-slate-700 hover:text-medical-700 rounded-full shadow-lg border border-slate-200 z-10 focus:outline-none transition-all hover:scale-105"
            aria-label="Scroll to newest message"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Suggested:
          </span>
          {quickPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.query)}
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-medical-50 hover:text-medical-800 text-slate-700 rounded-full border border-slate-200 text-xs font-medium flex-shrink-0 transition-colors disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-medical-600" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Multiline Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-500/20 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about lab results, medications, or doctor questions... (Enter to send, Shift+Enter for new line)"
                className="w-full px-3.5 py-3 text-xs sm:text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400 resize-none max-h-36"
                aria-label="Health message input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 sm:px-5 sm:py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-40 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all shadow-xs flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-medical-500"
              aria-label="Send message"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400 mt-2">
            Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Shift + Enter</kbd> for a new line. In emergency situations, dial <strong>112</strong> immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
