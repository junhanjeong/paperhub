"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Tool, toolsData } from "@/data/tools";
import { cn } from "@/lib/utils";

interface ToolModalProps {
    toolId: number;
    onClose: () => void;
    isLiked: boolean;
    onToggleLike: (id: number) => void;
}

import { getCommentsAction, addCommentAction, deleteCommentAction, toggleLikeAction } from "@/lib/actions";

export const ToolModal: React.FC<ToolModalProps> = ({
    toolId,
    onClose,
    isLiked,
    onToggleLike,
}) => {
    const tool = toolsData.find((t) => t.id === toolId);
    const [comments, setComments] = useState<{ id: string; nick: string; text: string; date: string; password?: string }[]>([]);
    const [nick, setNick] = useState("");
    const [password, setPassword] = useState("");
    const [commentText, setCommentText] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Calculator State
    const [baseValue, setBaseValue] = useState("");
    const [newValue, setNewValue] = useState("");
    const [isPercent, setIsPercent] = useState(false);

    // Author Converter State
    const [authorInput, setAuthorInput] = useState("");
    const [showCopyMessage, setShowCopyMessage] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            setIsLoading(true);
            // 서버에서 데이터 가져오기 시도
            const serverComments = await getCommentsAction(toolId);

            if (serverComments && serverComments.length > 0) {
                setComments(serverComments.map((c: any) => ({
                    id: c.id,
                    nick: c.nick,
                    text: c.text,
                    password: c.password,
                    date: new Date(c.created_at).toLocaleString('ko-KR')
                })));
            } else {
                // 서버 데이터가 없거나 설정 전이면 로컬 스토리지 사용
                const savedComments = localStorage.getItem("paperhub-comments");
                if (savedComments) {
                    const allComments = JSON.parse(savedComments);
                    setComments(allComments[toolId] || []);
                }
            }
            setIsLoading(false);
        };

        loadComments();
    }, [toolId]);

    if (!tool) return null;

    const Icon = (Icons as any)[tool.icon.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")] || Icons.HelpCircle;

    const handleAddComment = async () => {
        if (!commentText.trim() || !password.trim()) {
            alert("내용과 비밀번호를 입력해주세요.");
            return;
        }

        const newComment = {
            id: Math.random().toString(36).substr(2, 9),
            nick: nick || "연구자",
            text: commentText,
            password: password,
            date: new Date().toLocaleDateString("ko-KR") + " " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        };

        // 1. 서버 전송 시도
        const result = await addCommentAction(toolId, newComment);

        // 2. 서버 성공 시 목록 갱신, 실패 시(DB 설정 전 등) 로컬 저장
        if (result && result.success) {
            const serverComments = await getCommentsAction(toolId);
            setComments(serverComments.map((c: any) => ({
                id: c.id,
                nick: c.nick,
                text: c.text,
                password: c.password,
                date: new Date(c.created_at).toLocaleString('ko-KR')
            })));
        } else {
            const updatedComments = [newComment, ...comments];
            setComments(updatedComments);
            const savedComments = localStorage.getItem("paperhub-comments");
            const allComments = savedComments ? JSON.parse(savedComments) : {};
            allComments[toolId] = updatedComments;
            localStorage.setItem("paperhub-comments", JSON.stringify(allComments));
            window.dispatchEvent(new Event('storage'));
        }

        setNick("");
        setPassword("");
        setCommentText("");
    };

    const handleDeleteComment = async (id: string, originalPw?: string) => {
        const inputPw = prompt("비밀번호를 입력하세요:");
        if (inputPw === null) return;

        // 1. 서버 삭제 시도
        const result = await deleteCommentAction(id, inputPw);

        if (result && result.success) {
            const serverComments = await getCommentsAction(toolId);
            setComments(serverComments.map((c: any) => ({
                id: c.id,
                nick: c.nick,
                text: c.text,
                password: c.password,
                date: new Date(c.created_at).toLocaleString('ko-KR')
            })));
        } else {
            // 서버에서 처리하지 못한 경우 (로컬 데이터이거나 서버 설정 전)
            if (inputPw === originalPw) {
                const updatedComments = comments.filter((c) => c.id !== id);
                setComments(updatedComments);
                const savedComments = localStorage.getItem("paperhub-comments");
                const allComments = savedComments ? JSON.parse(savedComments) : {};
                allComments[toolId] = updatedComments;
                localStorage.setItem("paperhub-comments", JSON.stringify(allComments));
                window.dispatchEvent(new Event('storage'));
            } else {
                alert("비밀번호가 일치하지 않거나 서버 오류가 발생했습니다.");
            }
        }
    };

    const calculateImprovement = () => {
        const base = parseFloat(baseValue);
        const newVal = parseFloat(newValue);
        if (isNaN(base) || isNaN(newVal)) return null;

        const diff = newVal - base;
        if (isPercent) {
            return {
                label: diff >= 0 ? "Improvement (%p)" : "Decline (%p)",
                value: (diff > 0 ? "+" : "") + diff.toFixed(2) + "%p",
                isPositive: diff >= 0,
            };
        } else {
            if (base === 0) return { label: "Improvement Rate", value: "N/A", isPositive: true };
            const rate = (diff / base) * 100;
            return {
                label: rate >= 0 ? "Improvement Rate" : "Decline Rate",
                value: (rate > 0 ? "+" : "") + rate.toFixed(2) + "%",
                isPositive: rate >= 0,
            };
        }
    };

    const improvement = calculateImprovement();

    const convertAuthorName = (input: string) => {
        if (!input) return "입력하세요...";
        const andIndex = input.toLowerCase().indexOf(" and ");
        if (andIndex !== -1) {
            return input.substring(0, andIndex).replace(/ /g, "~").replace(/,/g, " and ") + input.substring(andIndex);
        } else {
            return input.replace(/ /g, "~").replace(/,/g, " and ");
        }
    };

    const authorResult = convertAuthorName(authorInput);

    const copyToClipboard = (text: string) => {
        if (text === "입력하세요...") return;
        navigator.clipboard.writeText(text);
        setShowCopyMessage(true);
        setTimeout(() => setShowCopyMessage(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] animate-fadeIn"
            />
            <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", `bg-${tool.tagColor}-600`)}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onToggleLike(toolId)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:bg-slate-50 group",
                                    isLiked ? "bg-blue-50 border-blue-200" : "border-slate-200"
                                )}
                            >
                                <Icons.ThumbsUp className={cn("w-4 h-4 transition-all", isLiked ? "text-blue-500 fill-blue-500" : "text-slate-300 group-hover:text-blue-500")} />
                                <span className="text-xs font-bold text-slate-600">{tool.likes + (isLiked ? 1 : 0)}</span>
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <Icons.X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{tool.title}</h2>
                    <p className="text-blue-600 text-xs font-semibold uppercase tracking-wider">{tool.categoryLabel}</p>
                </div>

                <div className="overflow-y-auto flex-1 p-8 space-y-8">
                    {/* Tool Functionality Area */}
                    {toolId === 17 && (
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                                <Icons.Zap className="w-4 h-4 text-orange-500" /> 실시간 향상 폭 계산기
                            </h4>
                            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-slate-600">입력 단위가 %인가요?</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isPercent}
                                            onChange={(e) => setIsPercent(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        value={baseValue}
                                        onChange={(e) => setBaseValue(e.target.value)}
                                        placeholder="Baseline"
                                        className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        placeholder="New"
                                        className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm"
                                    />
                                </div>
                                {improvement && (
                                    <div className="mt-4 p-5 bg-white rounded-2xl border-2 border-dashed border-indigo-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{improvement.label}</p>
                                        <h3 className={cn("text-3xl font-black tracking-tight", improvement.isPositive ? "text-indigo-600" : "text-rose-600")}>
                                            {improvement.value}
                                        </h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {toolId === 20 && (
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                                <Icons.User className="w-4 h-4 text-blue-500" /> 최종 저자명 변환기
                            </h4>
                            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-6">
                                <textarea
                                    value={authorInput}
                                    onChange={(e) => setAuthorInput(e.target.value)}
                                    placeholder="Gildong Hong, Kim Cheolsu and Lee Younghee"
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-400 text-sm font-medium h-24 resize-none"
                                />
                                <div
                                    onClick={() => copyToClipboard(authorResult)}
                                    className="p-4 bg-white rounded-2xl border-2 border-dashed border-blue-200 min-h-[80px] flex items-center justify-center cursor-pointer group hover:border-blue-400 transition-all"
                                >
                                    <p className="text-sm font-bold text-slate-700 break-all text-center">
                                        {authorResult}
                                    </p>
                                </div>
                            </div>
                            {showCopyMessage && (
                                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-4 py-2 rounded-full z-[300] animate-fadeIn">
                                    복사되었습니다!
                                </div>
                            )}
                        </div>
                    )}

                    {/* How-To Guide */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                            <Icons.Info className="w-4 h-4 text-blue-500" /> 사용 방법 가이드
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                                {tool.howto}
                            </p>
                        </div>
                    </div>

                    {/* Discussion */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                <Icons.MessageCircle className="w-4 h-4 text-emerald-500" /> Discussion
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                {comments.length} comments
                            </span>
                        </div>

                        <div className="mb-6 space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={nick}
                                    onChange={(e) => setNick(e.target.value)}
                                    placeholder="닉네임"
                                    className="text-xs p-2.5 border border-slate-100 bg-slate-50 rounded-lg w-24 outline-none focus:border-blue-400 transition-all"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="비번"
                                    className="text-xs p-2.5 border border-slate-100 bg-slate-50 rounded-lg w-20 outline-none focus:border-blue-400 transition-all"
                                />
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                                    placeholder="의견을 남겨주세요..."
                                    className="text-xs p-2.5 border border-slate-100 bg-slate-50 rounded-lg flex-1 outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAddComment}
                                    className="bg-blue-600 text-white text-xs px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-shadow"
                                >
                                    등록
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-[11px] text-slate-400 py-10 text-center">의견이 없습니다.</p>
                            ) : (
                                comments.map((c, i) => (
                                    <div key={i} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl mb-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-extrabold text-slate-700">{c.nick}</span>
                                                <span className="text-[10px] font-bold text-slate-300">{c.date}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteComment(c.id, c.password)}
                                                className="p-1 hover:bg-red-50 rounded group transition-colors"
                                            >
                                                <Icons.Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">{c.text}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors"
                    >
                        닫기
                    </button>
                    {!tool.isInternal && tool.link !== "#" && (
                        <a
                            href={tool.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3.5 bg-blue-600 text-white text-center font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
                        >
                            사이트 바로가기
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
