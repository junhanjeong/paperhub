"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "ai/react";
import { extractTextFromPDF } from "@/lib/pdf";

interface ChatbotProps {
    isInline?: boolean;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isInline = false }) => {
    const [isOpen, setIsOpen] = useState(isInline); // Inline mode is always open
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [showHelp, setShowHelp] = useState(false);

    const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error } = useChat({
        api: "/api/chat",
        body: {
            context: pdfText,
        },
        onError: (err: any) => {
            console.error("Chat Error:", err);
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === "application/pdf") {
            setAttachedFile(file);
            setIsProcessing(true);
            try {
                const text = await extractTextFromPDF(file);
                setPdfText(text);
                setMessages([
                    ...messages,
                    { id: Date.now().toString(), role: "system" as any, content: `📎 PDF 파일("${file.name}") 분석 완료! 이제 이 문서에 대해 물어보세요.` }
                ]);
            } catch (err: any) {
                console.error("PDF Error:", err);
                alert("PDF 분석 중 오류가 발생했습니다. (파일이 너무 크거나 보안이 걸려있을 수 있습니다)");
                setAttachedFile(null);
            } finally {
                setIsProcessing(false);
            }
        } else if (file.type === "text/plain") {
            setAttachedFile(file);
            setIsProcessing(true);
            try {
                const text = await file.text();
                setPdfText(text);
                setMessages([
                    ...messages,
                    { id: Date.now().toString(), role: "system" as any, content: `📝 텍스트 파일("${file.name}") 분석 완료! 내용에 대해 대화를 시작합니다.` }
                ]);
            } catch (err: any) {
                alert("파일을 읽는 중 오류가 발생했습니다.");
                setAttachedFile(null);
            } finally {
                setIsProcessing(false);
            }
        } else {
            alert("PDF 또는 TXT 파일만 지원됩니다.");
        }
    };

    const removeFile = () => {
        setAttachedFile(null);
        setPdfText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const chatInterface = (
        <div className={cn(
            "bg-white flex flex-col overflow-hidden",
            isInline ? "h-full w-full rounded-2xl border border-slate-100" : "mb-4 w-[400px] h-[600px] rounded-[2.5rem] shadow-2xl border border-slate-100"
        )}>
            {/* Header */}
            <div className={cn("p-6 flex items-center justify-between", isInline ? "bg-slate-50 border-b border-slate-100 text-slate-800" : "bg-slate-900 text-white")}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Icons.Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-sm block">PaperHub AI Assistant</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            qwen3:4b
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={cn("p-2 rounded-full transition-colors", isInline ? "hover:bg-slate-200" : "hover:bg-slate-800")}
                        title="사용 가이드"
                    >
                        <Icons.HelpCircle className="w-5 h-5 text-slate-400" />
                    </button>
                    {!isInline && (
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                            <Icons.X className="w-5 h-5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {/* Help Overlay */}
                <AnimatePresence>
                    {showHelp && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-8 overflow-y-auto"
                        >
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Icons.Terminal className="w-5 h-5 text-blue-600" /> 로컬 AI 사용 가이드
                            </h3>
                            <div className="space-y-6 text-xs text-slate-600 leading-relaxed">
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">1. Ollama 설치</h4>
                                    <p><a href="https://ollama.com" target="_blank" className="text-blue-600 underline">ollama.com</a>에서 본인의 OS에 맞는 버전을 내려받아 설치해 주세요.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">2. 모델 설치 (최초 1회)</h4>
                                    <p>터미널을 열고 아래 명령어를 입력하여 모델을 내려받습니다.</p>
                                    <div className="bg-slate-900 text-slate-300 p-3 rounded-xl mt-2 font-mono text-[10px] flex items-center justify-between">
                                        <code>ollama pull qwen3:4b-instruct-2507-q4_K_M</code>
                                        <Icons.Copy className="w-3 h-3 hover:text-white cursor-pointer" />
                                    </div>
                                    <p className="mt-2 text-slate-400 font-medium">* 다운로드가 완료된 후에는 터미널을 닫고 Ollama 앱만 켜두시면 됩니다.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">3. 파일 분석하기</h4>
                                    <p>하단의 클립(📎) 아이콘을 눌러 <strong>PDF 또는 TXT</strong> 파일을 업로드하면 AI가 내용을 읽고 답변을 준비합니다.</p>
                                    <p className="mt-1 text-[10px] text-slate-400 font-medium">* 표(Excel)나 이미지 분석 기능은 추후 업데이트 예정입니다.</p>
                                </section>
                                <div className="pt-4 border-t border-slate-100 italic text-[10px] text-slate-400">
                                    * 모든 데이터는 본인 PC에서만 처리되며 외부로 전송되지 않습니다.
                                </div>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl mt-4"
                                >
                                    이해했습니다
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-10">
                            <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center">
                                <Icons.MessageSquare className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Local AI Assistant</h3>
                                <p className="text-xs text-slate-500 mt-2">상단 물음표(❓)를 눌러 설정 가이드를 확인해 보세요.</p>
                            </div>
                        </div>
                    )}
                    {messages.map((m: any) => (
                        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div
                                className={cn(
                                    "max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed shadow-sm",
                                    m.role === "user"
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : m.role === "system"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-tl-none italic"
                                            : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                )}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100" />
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-[10px] rounded-2xl border border-red-100">
                            ⚠️ 오류: Ollama가 실행 중인지 확인해 주세요. (qwen3 모델 필요)
                        </div>
                    )}
                </div>
            </div>

            {/* File Area */}
            <AnimatePresence>
                {(attachedFile || isProcessing) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 py-3 bg-white border-t border-slate-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Icons.FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">
                                        {isProcessing ? "분석 중..." : attachedFile?.name}
                                    </span>
                                    <span className="text-[8px] text-slate-400 capitalize">
                                        {isProcessing ? "내용을 읽고 있습니다..." : (attachedFile?.type === "application/pdf" ? "PDF Document" : "Text Document")}
                                    </span>
                                </div>
                            </div>
                            {!isProcessing && (
                                <button onClick={removeFile} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                                    <Icons.X className="w-3 h-3 text-slate-500" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-6 bg-white shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(e);
                    }}
                    className="flex gap-2"
                >
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                        <Icons.Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.txt"
                        className="hidden"
                    />
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder={attachedFile ? "파일 내용에 대해 물어보세요..." : "메시지를 입력하세요..."}
                        className="flex-1 px-5 py-3 bg-slate-100 border-none rounded-2xl text-xs focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || isProcessing}
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                    >
                        <Icons.Send className="w-5 h-5" />
                    </button>
                </form>
                <p className="text-[9px] text-slate-400 mt-4 text-center">
                    Local Engine: Ollama / Model: qwen3:4b-instruct
                </p>
            </div>
        </div>
    );

    if (isInline) return chatInterface;

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                        {chatInterface}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 group",
                    isOpen ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                )}
            >
                {isOpen ? (
                    <Icons.ChevronDown className="w-7 h-7" />
                ) : (
                    <Icons.Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                )}
            </button>
        </div>
    );
};
