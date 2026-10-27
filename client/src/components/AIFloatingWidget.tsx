import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Minus, 
  RotateCcw, 
  AlertTriangle, 
  Phone, 
  ChevronRight,
  ShieldCheck,
  User,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  emergencyAlert?: boolean;
  provider?: string;
}

const EMERGENCY_REGEX = /\b(chest\s*pain|heart\s*attack|cardiac\s*arrest|cannot\s*breathe|shortness\s*of\s*breath|stroke|facial\s*droop|arm\s*weakness|slurred\s*speech|severe\s*bleeding|unconscious|fainted|throat\s*closing|anaphylaxis|suicid)\b/i;

const QUICK_PROMPTS = [
  'What lifestyle habits improve heart health?',
  'Explain normal blood sugar ranges',
  'How do I prepare for a doctor visit?',
  'What are common symptoms of seasonal flu?',
];

export const AIFloatingWidget: React.FC = () => {
  const { user, token, activeFamilyMember } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultGreeting: ChatMessage = {
    id: 'welcome-floating-ai',
    sender: 'AI',
    text: `Hello ${user?.fullName ? user.fullName.split(' ')[0] : 'there'}! 👋 I am your AegisHealth AI Clinical Assistant.\n\nAsk me about symptoms, general health questions, medications, or wellness advice!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    provider: 'AegisHealth Clinical OS',
  };

  useEffect(() => {
    // Initialize chat messages
    const storageKey = `aegis_floating_chat_${user?.id || 'guest'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // fallback
    }
    setMessages([defaultGreeting]);
  }, [user?.id]);

  useEffect(() => {
    if (messages.length > 1) {
      const storageKey = `aegis_floating_chat_${user?.id || 'guest'}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setEmergencyAlert(false);

    // Client-side emergency check
    if (EMERGENCY_REGEX.test(textToSend)) {
      setEmergencyAlert(true);
    }

    try {
      if (!token) {
        // Guest mode simulated response
        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'AI',
            text: `Thank you for asking! For general wellness: always ensure balanced nutrition, proper hydration, 7-8 hours of sleep, and routine medical check-ups.\n\n💡 *Tip: Sign in or use Instant Demo Login to let me analyze your personalized prescriptions and lab records!*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: 'Aegis Clinical AI',
          };
          setMessages([...nextMessages, aiMsg]);
          setLoading(false);
        }, 600);
        return;
      }

      const res = await api.askHealthAssistant(
        textToSend,
        nextMessages.map((m) => ({ sender: m.sender, text: m.text })),
        activeFamilyMember
      );

      if (res.success && res.data) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'AI',
          text: res.data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          emergencyAlert: res.data.emergencyAlert,
          provider: res.data.provider || 'Aegis Clinical AI',
        };
        setMessages([...nextMessages, aiMsg]);
        if (res.data.emergencyAlert) {
          setEmergencyAlert(true);
        }
      } else {
        throw new Error(res.error?.message || 'AI service response unavailable');
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        text: `I apologize, I am temporarily unable to reach the clinical knowledge service (${err.message || 'Network issue'}). Please try again shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'Clinical Assistant Fallback',
      };
      setMessages([...nextMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([defaultGreeting]);
    setEmergencyAlert(false);
    const storageKey = `aegis_floating_chat_${user?.id || 'guest'}`;
    localStorage.removeItem(storageKey);
  };

  return (
    <>
      {/* Floating Circular Robot Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Subtle Welcome Tooltip when closed */}
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="mb-2 hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 text-white rounded-full text-xs font-semibold shadow-xl border border-slate-700/60 cursor-pointer animate-bounce hover:bg-slate-900 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask Aegis AI</span>
          </div>
        )}

        {/* Circular Robot Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setHasUnread(false);
          }}
          aria-label="Open AI Health Assistant"
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 focus:ring-medical-500/30 ${
            isOpen
              ? 'bg-slate-800 text-white rotate-90 scale-95 shadow-slate-900/40'
              : 'bg-gradient-to-tr from-medical-700 via-teal-600 to-emerald-500 text-white hover:scale-110 active:scale-95 shadow-medical-900/30'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <>
              {/* Animated pulsating halo ring */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 opacity-30 group-hover:opacity-60 blur-xs animate-pulse pointer-events-none" />
              
              {/* Robot Icon */}
              <Bot className="w-7 h-7 stroke-[2.2] relative z-10 transition-transform group-hover:rotate-6" />

              {/* Online Green Pulsing Indicator */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full z-20 shadow-xs flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* Expanded Floating AI Assistant Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-medical-950 to-teal-950 text-white flex items-center justify-between border-b border-white/10 relative overflow-hidden">
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md">
                <Bot className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight">AegisHealth AI</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-teal-200/80 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Clinical Health Assistant</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 relative z-10">
              <button
                type="button"
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Emergency Alert Banner if triggered */}
          {emergencyAlert && (
            <div className="p-3 bg-rose-600 text-white text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
                <span className="font-bold">Potential Emergency: Please dial 112 immediately!</span>
              </div>
              <Link
                to="/emergency"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 bg-white text-rose-700 font-bold text-[11px] rounded hover:bg-rose-50 flex items-center space-x-1"
              >
                <Phone className="w-3 h-3" />
                <span>SOS</span>
              </Link>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.sender === 'USER' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.sender === 'AI' && (
                  <div className="w-7 h-7 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 flex-shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                {msg.sender === 'USER' && (
                  <div className="w-7 h-7 rounded-xl bg-medical-700 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'USER'
                    ? 'bg-medical-700 text-white rounded-tr-xs'
                    : msg.emergencyAlert
                    ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div className={`mt-1 flex items-center justify-between text-[10px] ${
                    msg.sender === 'USER' ? 'text-teal-200' : 'text-slate-400'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.provider && msg.sender === 'AI' && (
                      <span className="font-semibold text-[9px] opacity-80">{msg.provider}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit shadow-xs animate-pulse">
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Clinical Assistant is analyzing your query...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          {messages.length <= 2 && !loading && (
            <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] whitespace-nowrap px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask health or symptom questions..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Safety Disclaimer Footer */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
            AI Assistant provides clinical informational guidance. In an emergency, dial 112.
          </div>
        </div>
      )}
    </>
  );
};
