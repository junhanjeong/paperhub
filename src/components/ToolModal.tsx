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
    initialLikeCount: number;
    initialCommentCount: number;
}

import { getCommentsAction, addCommentAction, deleteCommentAction, getLikesAction } from "@/lib/actions";

export const ToolModal: React.FC<ToolModalProps> = ({
    toolId,
    onClose,
    isLiked,
    onToggleLike,
    initialLikeCount,
    initialCommentCount,
}) => {
    const tool = toolsData.find((t) => t.id === toolId);
    const [comments, setComments] = useState<{ id: string; nick: string; text: string; date: string; password?: string }[]>([]);
    const [nick, setNick] = useState("");
    const [password, setPassword] = useState("");
    const [commentText, setCommentText] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    // 댓글 수도 초기값을 보여주기 위해 상태 추가
    const [commentCount, setCommentCount] = useState(initialCommentCount);

    // 프롭스 변경 시 상태 동기화
    useEffect(() => {
        setLikeCount(initialLikeCount);
        setCommentCount(initialCommentCount);
    }, [initialLikeCount, initialCommentCount]);

    // Calculator State
    const [baseValue, setBaseValue] = useState("");
    const [newValue, setNewValue] = useState("");
    const [isPercent, setIsPercent] = useState(false);

    // Author Converter State
    const [authorInput, setAuthorInput] = useState("");
    const [showCopyMessage, setShowCopyMessage] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const serverComments = await getCommentsAction(toolId);
                setComments(serverComments.map((c: any) => ({
                    id: c.id,
                    nick: c.nick,
                    text: c.text,
                    password: c.password,
                    date: new Date(c.created_at).toLocaleString('ko-KR')
                })));
                setCommentCount(serverComments.length);

                const lCount = await getLikesAction(toolId);
                if (lCount > 0) setLikeCount(lCount);
            } catch (e: any) {
                console.error("데이터 로딩 실패:", e);
                alert(e.message || "데이터베이스 연결에 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();

        // 메인 페이지나 다른 곳에서 변경된 수치를 즉시 반영
        const handleLikeUpdate = (e: any) => {
            if (e.detail?.count !== undefined) {
                setLikeCount(e.detail.count);
            }
        };
        const handleCommentUpdate = (e: any) => {
            if (e.detail?.count !== undefined) {
                setCommentCount(e.detail.count);
            }
        };

        window.addEventListener(`likeUpdated-${toolId}`, handleLikeUpdate);
        window.addEventListener(`commentUpdated-${toolId}`, handleCommentUpdate);
        return () => {
            window.removeEventListener(`likeUpdated-${toolId}`, handleLikeUpdate);
            window.removeEventListener(`commentUpdated-${toolId}`, handleCommentUpdate);
        };
    }, [toolId]);

    if (!tool) return null;

    const Icon = (Icons as any)[tool.icon.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")] || Icons.HelpCircle;

    const handleAddComment = async () => {
        if (!commentText.trim() || !password.trim()) {
            alert("내용과 비밀번호를 입력해주세요.");
            return;
        }

        const tempId = Math.random().toString(36).substring(2, 9);
        const optimisticComment = {
            id: tempId,
            nick: nick || "연구자",
            text: commentText,
            password: password,
            date: new Date().toLocaleString('ko-KR')
        };

        // UI 즉시 반영 (낙관적 업데이트)
        const previousComments = [...comments];
        setComments([optimisticComment, ...comments]);

        // 입력창 즉시 비우기
        const savedNick = nick;
        const savedText = commentText;
        const savedPw = password;
        setNick("");
        setPassword("");
        setCommentText("");

        try {
            const result = await addCommentAction(toolId, {
                nick: optimisticComment.nick,
                text: optimisticComment.text,
                password: optimisticComment.password
            });

            if (result && result.success) {
                window.dispatchEvent(new CustomEvent(`commentUpdated-${toolId}`, {
                    detail: { count: comments.length + 1 }
                }));
            } else {
                throw new Error("서버 저장 실패");
            }
        } catch (e: any) {
            // 실패 시 롤백
            setComments(previousComments);
            setNick(savedNick);
            setCommentText(savedText);
            setPassword(savedPw);
            alert(e.message || "댓글 등록 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteComment = async (id: string) => {
        const inputPw = prompt("비밀번호를 입력하세요:");
        if (inputPw === null) return;

        const previousComments = [...comments];
        const updatedComments = comments.filter(c => c.id !== id);

        // UI 즉시 삭제 (낙관적 업데이트)
        setComments(updatedComments);

        try {
            const result = await deleteCommentAction(id, inputPw);
            if (result && result.success) {
                window.dispatchEvent(new CustomEvent(`commentUpdated-${toolId}`, {
                    detail: { count: updatedComments.length }
                }));
            } else {
                if (result && !result.success) alert(result.message);
                setComments(previousComments); // 롤백
            }
        } catch (e: any) {
            setComments(previousComments); // 롤백
            alert(e.message || "댓글 삭제 중 오류가 발생했습니다.");
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
                                <span className="text-xs font-bold text-slate-600">{likeCount}</span>
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
                                {commentCount} comments
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
                                                onClick={() => handleDeleteComment(c.id)}
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
