"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
        { role: "ai", content: "안녕하세요! 연구에 도움이 필요하신가요? 로컬 모델(0.6B)을 준비 중입니다." },
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const newMsg = { role: "user" as const, content: input };
        setMessages([...messages, newMsg]);
        setInput("");

        // AI Response Placeholder
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { role: "ai", content: "로컬 모델이 아직 로드되지 않았습니다. WebGPU 설정을 확인해주세요." },
            ]);
        }, 1000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {isOpen && (
                <div
                    className="mb-4 w-[380px] h-[500px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-scaleIn"
                >
                    {/* Header */}
                    <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icons.Brain className="w-5 h-5" />
                            <span className="font-bold text-sm">PaperHub AI (Local 0.6B)</span>
                        </div>
                        <button onClick={() => setIsOpen(false)}>
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                                <div
                                    className={cn(
                                        "max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed",
                                        m.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm"
                                    )}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-50 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                placeholder="질문을 입력하세요..."
                                className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            />
                            <button
                                onClick={handleSend}
                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                <Icons.Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 text-center">
                            Your data stays local. Model running in your browser.
                        </p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95",
                    isOpen ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
                )}
            >
                <Icons.MessageCircle className="w-6 h-6" />
            </button>
        </div>
    );
};
