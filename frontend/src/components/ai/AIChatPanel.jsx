import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, X, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import client from '../../api/client';
import Spinner from '../ui/Spinner';

export default function AIChatPanel({ county, area, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await client.get('/api/ai/chat/');
            setMessages(res.data);
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    const handleSend = async (msgText) => {
        const text = msgText || input;
        if (!text.trim()) return;

        setInput('');
        setLoading(true);
        setError(null);

        // Optimistic user message
        const userMsg = { id: Date.now(), message: text, is_ai: false, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        try {
            const res = await client.post('/api/ai/chat/', {
                message: text,
                county: county || 'National',
                area: area || 'General'
            });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            setError(e.response?.data?.error || "Failed to get AI response");
        } finally {
            setLoading(false);
        }
    };

    const chips = [
        "What are the evacuation routes?",
        "Show me the latest risk trend",
        "How can I help currently?",
        "Explain the technical model logic"
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-surface border-l border-slate-200 dark:border-surface-border overflow-hidden transition-colors">
            {/* Header - Tactical */}
            <div className="px-5 py-3 bg-white dark:bg-surface border-b border-slate-100 dark:border-surface-border flex justify-between items-center bg-gradient-to-r from-flood-600 to-flood-700 text-white">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-flood-200" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Intel Engine v4.0</h2>
                </div>
                {onClose && (
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-sm transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages - Dense */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-surface/50">
                {messages.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <Bot className="w-10 h-10 text-flood-400 mb-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Awaiting Mission Parameters</h3>
                        <p className="text-[9px] font-bold text-slate-400 italic">Context established for {area || county || 'National Sector'}.</p>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_ai ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-1`}>
                        <div className={`max-w-[88%] rounded-sm p-3 border ${m.is_ai
                            ? 'bg-white dark:bg-surface-raised text-slate-700 dark:text-slate-200 border-slate-200 dark:border-surface-border'
                            : 'bg-flood-600 text-white border-flood-700'
                            }`}>
                            <div className="flex items-center gap-2 mb-1.5 border-b border-current/10 pb-1">
                                {m.is_ai ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                <span className="text-[8px] uppercase font-black tracking-widest">
                                    {m.is_ai ? 'Tactical Advisor' : 'Operator'}
                                </span>
                                <span className="text-[8px] ml-auto font-bold opacity-60">
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            import ReactMarkdown from 'react-markdown';

                            // ... in message loop
                            {m.is_ai ? (
                                <div className="prose-tactical dark:prose-invert">
                                    <ReactMarkdown>{m.message}</ReactMarkdown>
                                </div>
                            ) : (
                                {
                                    m.is_ai ? (
                                        <div className="prose-tactical dark:prose-invert">
                                            <ReactMarkdown>{m.message}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] font-bold leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                    )
                                }
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-surface-raised border border-slate-200 dark:border-surface-border rounded-sm p-3 flex gap-2 items-center">
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-flood-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1 h-1 bg-flood-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1 h-1 bg-flood-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Processing...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center p-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 text-danger-600 rounded-sm text-[9px] font-black uppercase tracking-widest border border-danger-100 animate-bounce">
                            <AlertCircle className="w-3 h-3" />
                            {error}
                        </div>
                    </div>
                )}
            </div>

            {/* Input - Compact */}
            <div className="p-4 bg-white dark:bg-surface border-t border-slate-200 dark:border-surface-border transition-colors">
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {chips.map(chip => (
                        <button
                            key={chip}
                            onClick={() => handleSend(chip)}
                            disabled={loading}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm text-[8px] font-black uppercase tracking-widest text-slate-400 hover:border-flood-500 hover:text-flood-600 transition-all disabled:opacity-50"
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-slate-50 dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm px-3 py-2.5 text-xs focus:border-flood-500 outline-none transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 uppercase font-bold"
                        placeholder="ENTER QUERY..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="p-2.5 bg-flood-600 text-white rounded-sm hover:bg-flood-700 disabled:bg-slate-200 dark:disabled:bg-surface-border/20 transition-all flex items-center justify-center w-10 h-10 border border-flood-700"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
