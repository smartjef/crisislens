import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, X, Sparkles, AlertCircle } from 'lucide-react';
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
                county: county,
                area: area
            });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            setError(e.response?.data?.error || "Failed to get AI response");
            // Remove the optimistic message if it failed and wasn't a rate limit error? 
            // Actually leave it for context so they can retry.
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
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-200" />
                    <h2 className="font-bold">CrisisLens Intelligence</h2>
                </div>
                {onClose && (
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <Bot className="w-12 h-12 text-blue-200 mb-4" />
                        <h3 className="text-slate-800 font-bold mb-2">How can I assist you today?</h3>
                        <p className="text-sm text-slate-500 italic">I have context for {area || county || 'the national overview'}.</p>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_ai ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${m.is_ai
                                ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                : 'bg-blue-600 text-white rounded-tr-none'
                            }`}>
                            <div className="flex items-center gap-2 mb-1.5 opacity-70">
                                {m.is_ai ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                <span className="text-[10px] uppercase font-bold tracking-wider">
                                    {m.is_ai ? 'CrisisLens AI' : 'You'}
                                </span>
                                <span className="text-[10px] ml-auto">
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 flex gap-2 items-center">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-slate-400 font-medium">CrisisLens is thinking...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center p-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-100 animate-bounce">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap gap-2 mb-4">
                    {chips.map(chip => (
                        <button
                            key={chip}
                            onClick={() => handleSend(chip)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all disabled:opacity-50"
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                        placeholder="Type your question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center justify-center w-11 h-11"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
