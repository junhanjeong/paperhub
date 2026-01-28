"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { extractTextFromPDF } from "@/lib/pdf";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

interface ChatbotProps {
    isInline?: boolean;
}

// 사용 가능한 모델 목록 (가장 작은 모델이 기본값)
const AVAILABLE_MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", name: "Qwen2.5 0.5B", size: "~400MB" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen2.5 1.5B", size: "~1GB" },
    { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen2.5 3B", size: "~2GB" },
    { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B", size: "~2GB" },
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi-3.5 Mini", size: "~2.5GB" },
];

export const Chatbot: React.FC<ChatbotProps> = ({ isInline = false }) => {
    const [isOpen, setIsOpen] = useState(isInline);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // WebLLM 관련 상태
    const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const currentAssistantIdRef = useRef<string | null>(null);

    // Web Worker 초기화 및 모델 로드
    const initWorker = useCallback((modelId: string) => {
        if (typeof window === "undefined") return;

        // 기존 워커 정리
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        workerRef.current = new Worker(new URL("../workers/chat-worker.ts", import.meta.url), { type: "module" });

        workerRef.current.onmessage = (e: MessageEvent) => {
            const { type, data } = e.data;

            if (type === "status") {
                if (data === "ready") {
                    setModelStatus("ready");
                    setStatusMessage("AI 준비 완료!");
                    setDownloadProgress(100);
                } else {
                    setStatusMessage(data);
                }
            }

            if (type === "progress") {
                setModelStatus("loading");
                setDownloadProgress(Math.round(data.progress || 0));
                setStatusMessage(data.text || "로딩 중...");
            }

            if (type === "chunk") {
                if (currentAssistantIdRef.current) {
                    setMessages(prev => prev.map(m =>
                        m.id === currentAssistantIdRef.current
                            ? { ...m, content: m.content + data }
                            : m
                    ));
                }
            }

            if (type === "done") {
                setIsLoading(false);
                currentAssistantIdRef.current = null;
            }

            if (type === "error") {
                setError(data);
                setIsLoading(false);
                setModelStatus("error");
                currentAssistantIdRef.current = null;
            }
        };

        // 모델 로드 시작
        workerRef.current.postMessage({ type: "load", data: { modelId } });
        setModelStatus("loading");
        setStatusMessage("WebGPU 초기화 중...");
        setDownloadProgress(0);
    }, []);

    // 초기 모델 로드
    useEffect(() => {
        initWorker(selectedModel.id);
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // 자동 스크롤
    useEffect(() => {
        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }
        };
        scrollToBottom();
        const timeoutId = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(timeoutId);
    }, [messages, isLoading]);

    // 입력창 높이 조절
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

    const handleNewChat = () => {
        if (messages.length === 0 && !attachedFile) return;
        if (confirm("대화 내역을 초기화하고 새 대화를 시작할까요?")) {
            setMessages([]);
            setAttachedFile(null);
            setPdfText("");
            setInput("");
            setError(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleModelChange = (model: typeof AVAILABLE_MODELS[0]) => {
        if (modelStatus === "loading") return;
        setSelectedModel(model);
        setMessages([]);
        setError(null);
        initWorker(model.id);
    };

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || isProcessing || modelStatus !== "ready") return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);
        setError(null);

        const assistantId = (Date.now() + 1).toString();
        currentAssistantIdRef.current = assistantId;
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

        const systemPrompt = pdfText
            ? `당신은 연구 보조 AI입니다. 다음 제공된 문서 내용을 바탕으로 답변하세요.\n\n[문서 내용]\n${pdfText}`
            : "당신은 연구 보조 AI입니다. 연구와 관련된 질문에 전문적이고 친절하게 답변하세요.";

        workerRef.current?.postMessage({
            type: "generate",
            data: { messages: newMessages, systemPrompt }
        });
    }, [input, isLoading, isProcessing, modelStatus, messages, pdfText]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === "application/pdf") {
            setAttachedFile(file);
            setIsProcessing(true);
            try {
                const text = await extractTextFromPDF(file);
                setPdfText(text);
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: `📎 PDF 파일("${file.name}") 분석 완료!` }]);
            } catch (err: any) {
                alert(`PDF 분석 중 오류: ${err.message || "알 수 없는 에러"}`);
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
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: `📝 텍스트 파일("${file.name}") 분석 완료!` }]);
            } catch (err: any) {
                alert("파일 읽기 오류");
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
        <div className={cn("bg-white flex flex-col overflow-hidden", isInline ? "h-full w-full rounded-2xl border border-slate-100" : "mb-4 w-[400px] h-[600px] rounded-[2.5rem] shadow-2xl border border-slate-100")}>
            {/* Header */}
            <div className={cn("p-4 flex items-center justify-between", isInline ? "bg-slate-50 border-b border-slate-100 text-slate-800" : "bg-slate-900 text-white")}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Icons.Cpu className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-sm block">PaperHub AI</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            {modelStatus === "ready" ? (
                                <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {selectedModel.name}</>
                            ) : modelStatus === "loading" ? (
                                <><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> 로딩 중...</>
                            ) : modelStatus === "error" ? (
                                <><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> 오류</>
                            ) : (
                                <><span className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> 대기 중</>
                            )}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleNewChat} className={cn("p-2 rounded-full transition-colors", isInline ? "hover:bg-slate-200" : "hover:bg-slate-800")} title="새 대화">
                        <Icons.RotateCcw className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => setShowHelp(!showHelp)} className={cn("p-2 rounded-full transition-colors", isInline ? "hover:bg-slate-200" : "hover:bg-slate-800")} title="도움말">
                        <Icons.HelpCircle className="w-4 h-4 text-slate-400" />
                    </button>
                    {!isInline && (
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                            <Icons.X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Model Loading Overlay */}
            {modelStatus === "loading" && (
                <div className="bg-gradient-to-b from-blue-50 to-white p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Icons.Download className="w-5 h-5 text-blue-600 animate-bounce" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{selectedModel.name} 로딩 중</p>
                            <p className="text-[10px] text-slate-500 truncate">{statusMessage}</p>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 text-center">최초 1회만 다운로드됩니다. 이후에는 캐시에서 즉시 로드됩니다.</p>
                </div>
            )}

            {/* Messages Content */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                <AnimatePresence>
                    {showHelp && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Icons.Sparkles className="w-5 h-5 text-purple-600" /> WebLLM 브라우저 AI
                            </h3>
                            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                                <section>
                                    <h4 className="font-bold text-emerald-600 mb-2">✨ 설치 필요 없음!</h4>
                                    <p>WebGPU를 통해 브라우저에서 직접 AI가 실행됩니다. 서버로 데이터가 전송되지 않아 100% 프라이빗합니다.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">📦 모델 선택</h4>
                                    <div className="space-y-2">
                                        {AVAILABLE_MODELS.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => handleModelChange(model)}
                                                disabled={modelStatus === "loading"}
                                                className={cn(
                                                    "w-full p-3 rounded-xl text-left transition-all border",
                                                    selectedModel.id === model.id
                                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                                        : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                                                )}
                                            >
                                                <span className="font-bold">{model.name}</span>
                                                <span className="text-[10px] text-slate-400 ml-2">({model.size})</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">⚠️ 요구사항</h4>
                                    <p>Chrome 113+ 또는 Edge 113+ (WebGPU 지원) 및 충분한 GPU 메모리가 필요합니다.</p>
                                </section>
                                <button onClick={() => setShowHelp(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl mt-4">확인</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 scroll-smooth min-h-0">
                    {messages.length === 0 && modelStatus === "ready" && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl shadow-sm flex items-center justify-center">
                                <Icons.MessageSquare className="w-8 h-8 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">AI 준비 완료!</h3>
                                <p className="text-xs text-slate-500 mt-2">무엇이든 물어보세요. 모든 처리는 브라우저에서 이루어집니다.</p>
                            </div>
                        </div>
                    )}
                    {messages.map((m) => (
                        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed shadow-sm", m.role === "user" ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-none" : m.role === "system" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-tl-none italic" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none whitespace-pre-wrap")}>
                                {m.content || (m.role === "assistant" && isLoading ? <span className="animate-pulse">생각 중...</span> : "")}
                            </div>
                        </div>
                    ))}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-[10px] rounded-2xl border border-red-100">⚠️ {error}</div>
                    )}
                </div>
            </div>

            {/* File Area */}
            <AnimatePresence>
                {(attachedFile || isProcessing) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 py-3 bg-white border-t border-slate-50 overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Icons.FileText className="w-4 h-4" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{isProcessing ? "분석 중..." : attachedFile?.name}</span>
                                    <span className="text-[8px] text-slate-400">{isProcessing ? "내용을 읽고 있습니다..." : (attachedFile?.type === "application/pdf" ? "PDF" : "TXT")}</span>
                                </div>
                            </div>
                            {!isProcessing && <button onClick={removeFile} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"><Icons.X className="w-3 h-3 text-slate-500" /></button>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-4 bg-white shrink-0 border-t border-slate-50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"><Icons.Paperclip className="w-5 h-5" /></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt" className="hidden" />
                    <textarea ref={textareaRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={modelStatus !== "ready" ? "모델 로딩 중..." : attachedFile ? "파일 내용에 대해 물어보세요..." : "메시지를 입력하세요..."} disabled={modelStatus !== "ready"} className="flex-1 px-5 py-3 bg-slate-100 border-none rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 transition-all outline-none resize-none min-h-[46px] max-h-[150px] overflow-y-auto pt-4 disabled:opacity-50" rows={1} />
                    <button type="submit" disabled={isLoading || isProcessing || !input.trim() || modelStatus !== "ready"} className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none h-[46px] w-[46px] shrink-0 flex items-center justify-center"><Icons.Send className="w-5 h-5" /></button>
                </form>
                <p className="text-[9px] text-slate-400 mt-3 text-center">WebLLM (WebGPU) · {selectedModel.name} · 100% 브라우저 처리</p>
            </div>
        </div>
    );

    if (isInline) return chatInterface;

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen && <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}>{chatInterface}</motion.div>}
            </AnimatePresence>
            <button onClick={() => setIsOpen(!isOpen)} className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 group", isOpen ? "bg-slate-900 text-white" : "bg-gradient-to-r from-blue-500 to-purple-600 text-white")}>
                {isOpen ? <Icons.ChevronDown className="w-7 h-7" /> : <Icons.Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform" />}
            </button>
        </div>
    );
};
