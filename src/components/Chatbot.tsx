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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [showHelp, setShowHelp] = useState(false);

    const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error } = useChat({
        // Vercel 서버를 거치지 않고 사용자의 로컬 Ollama와 직접 통신
        api: "http://localhost:11434/api/chat",
        body: {
            model: "qwen3:4b-instruct-2507-q4_K_M",
            stream: true,
        },
        // Ollama 직접 호출을 위한 커스텀 fetch (CORS 설정 필수)
        fetch: async (url, options) => {
            const body = JSON.parse(options?.body as string);

            // Ollama API 포맷에 맞게 메시지 구조 변경 (System 프롬프트 포함)
            const ollamaMessages = [
                {
                    role: "system",
                    content: pdfText
                        ? `당신은 연구 보조 AI입니다. 다음 제공된 문서 내용을 바탕으로 답변하세요.\n\n[문서 내용]\n${pdfText}`
                        : "당신은 연구 보조 AI입니다. 연구와 관련된 질문에 전문적이고 친절하게 답변하세요."
                },
                ...body.messages
            ];

            return fetch(url, {
                ...options,
                body: JSON.stringify({
                    model: body.model,
                    messages: ollamaMessages,
                    stream: true
                })
            });
        },
        onError: (err: any) => {
            console.error("Chat Error:", err);
        }
    });

    useEffect(() => {
        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }
        };

        // 메시지가 추가되거나 로딩 상태가 변할 때(답변 스트리밍 중) 하단으로 이동
        scrollToBottom();
        const timeoutId = setTimeout(scrollToBottom, 50); // 렌더링 지연 대응
        return () => clearTimeout(timeoutId);
    }, [messages, isLoading]);

    // Textarea 자동 높이 조절
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
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
                setMessages([
                    ...messages,
                    { id: Date.now().toString(), role: "system" as any, content: `📎 PDF 파일("${file.name}") 분석 완료! 이제 이 문서에 대해 물어보세요.` }
                ]);
            } catch (err: any) {
                console.error("PDF Error:", err);
                const errorMsg = err.message || "알 수 없는 에러";
                alert(`PDF 분석 중 오류가 발생했습니다: ${errorMsg}`);
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

    const handleNewChat = () => {
        if (messages.length === 0 && !attachedFile) return;
        if (confirm("대화 내역을 초기화하고 새 대화를 시작할까요?")) {
            setMessages([]);
            removeFile();
        }
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
                        onClick={handleNewChat}
                        className={cn("p-2 rounded-full transition-colors", isInline ? "hover:bg-slate-200" : "hover:bg-slate-800")}
                        title="새 대화 시작"
                    >
                        <Icons.RotateCcw className="w-5 h-5 text-slate-400" />
                    </button>
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
                                    <h4 className="font-bold text-red-600 mb-2">1. 브라우저 접근 허용 (CORS 설정)</h4>
                                    <p className="text-slate-600">배포된 환경에서 로컬 AI를 쓰려면 이 설정이 <strong>반드시</strong> 필요합니다. 터미널에 입력 후 Ollama를 재시작하세요.</p>
                                    <div className="bg-slate-900 text-slate-300 p-3 rounded-xl mt-2 font-mono text-[9px] relative group">
                                        <code>launchctl setenv OLLAMA_ORIGINS "*"</code>
                                        <Icons.Copy className="absolute right-3 top-3 w-3 h-3 hover:text-white cursor-pointer opacity-50 group-hover:opacity-100" />
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-400 font-medium">* 윈도우 사용자는 시스템 환경 변수에서 <code>OLLAMA_ORIGINS</code>를 <code>*</code>로 추가하세요.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-slate-900 mb-2">2. 모델 설치 (최초 1회)</h4>
                                    <p>터미널에서 아래 명령어를 입력하여 모델을 내려받습니다.</p>
                                    <div className="bg-slate-900 text-slate-300 p-3 rounded-xl mt-2 font-mono text-[9px] relative group">
                                        <code>ollama pull qwen3:4b-instruct-2507-q4_K_M</code>
                                        <Icons.Copy className="absolute right-3 top-3 w-3 h-3 hover:text-white cursor-pointer opacity-50 group-hover:opacity-100" />
                                    </div>
                                    <p className="mt-2 text-slate-400 font-medium">* 다운로드 후에는 Ollama 앱만 켜두시면 됩니다.</p>
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

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth min-h-0"
                >
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
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={attachedFile ? "파일 내용에 대해 물어보세요..." : "메시지를 입력하세요..."}
                        className="flex-1 px-5 py-3 bg-slate-100 border-none rounded-2xl text-xs focus:ring-2 focus:ring-blue-600 transition-all outline-none resize-none min-h-[46px] max-h-[150px] overflow-y-auto pt-4"
                        rows={1}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || isProcessing || !input.trim()}
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none h-[46px] w-[46px] shrink-0 flex items-center justify-center mt-auto"
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
