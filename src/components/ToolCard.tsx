"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Tool } from "@/data/tools";
import { cn } from "@/lib/utils";
import { getCommentCountAction, getLikesAction } from "@/lib/actions";

interface ToolCardProps {
    tool: Tool;
    isFavorite: boolean;
    onToggleFavorite: (id: number) => void;
    onOpenHowTo: (id: number) => void;
    isLiked: boolean;
    initialCommentCount: number;
    initialLikeCount: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({
    tool,
    isFavorite,
    onToggleFavorite,
    onOpenHowTo,
    isLiked,
    initialCommentCount,
    initialLikeCount,
}) => {
    const [commentCount, setCommentCount] = useState(initialCommentCount);
    const [likeCount, setLikeCount] = useState(initialLikeCount);

    // 전달받은 초기값이 바뀌면 상태 업데이트 (메인 페이지 로딩 완료 대응)
    useEffect(() => {
        setCommentCount(initialCommentCount);
        setLikeCount(initialLikeCount);
    }, [initialCommentCount, initialLikeCount]);

    useEffect(() => {
        // 모달/메인에서 발생한 변경사항은 이벤트 데이터를 통해 즉시 반영 (네트워크 요청 X)
        const handleCommentUpdate = (e: any) => {
            if (e.detail?.count !== undefined) setCommentCount(e.detail.count);
        };
        const handleLikeUpdate = (e: any) => {
            if (e.detail?.count !== undefined) setLikeCount(e.detail.count);
        };

        window.addEventListener(`commentUpdated-${tool.id}`, handleCommentUpdate);
        window.addEventListener(`likeUpdated-${tool.id}`, handleLikeUpdate);

        return () => {
            window.removeEventListener(`commentUpdated-${tool.id}`, handleCommentUpdate);
            window.removeEventListener(`likeUpdated-${tool.id}`, handleLikeUpdate);
        };
    }, [tool.id]);

    // @ts-ignore
    const Icon = Icons[tool.icon.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")] || Icons.HelpCircle;

    const mainBtnText = tool.actionText || "바로가기";

    return (
        <div className="glass-card p-8 rounded-[2.5rem] flex flex-col group relative overflow-hidden">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(tool.id);
                }}
                className="absolute top-7 right-7 z-10 p-2.5 rounded-full hover:bg-slate-100 transition-all"
            >
                <Icons.Star
                    className={cn(
                        "w-5 h-5 transition-all",
                        isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                    )}
                />
            </button>

            <div
                className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all mb-6",
                    `bg-${tool.tagColor}-50 text-${tool.tagColor}-600 group-hover:bg-${tool.tagColor}-600 group-hover:text-white`
                )}
            >
                <Icon className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 h-[3.5rem] flex items-center">
                {tool.title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 line-clamp-2 h-[2.5rem]">
                {tool.desc}
            </p>

            <div className="mt-auto">
                <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Icons.ThumbsUp
                                className={cn(
                                    "w-3.5 h-3.5",
                                    isLiked ? "text-blue-500 fill-blue-500" : "text-slate-300"
                                )}
                            />
                            <span>{likeCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Icons.MessageSquare className="w-3.5 h-3.5 text-slate-300" />
                            <span>{commentCount}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenHowTo(tool.id)}
                        className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                    >
                        방법보기
                    </button>
                </div>

                {tool.isInternal ? (
                    <button
                        onClick={() => onOpenHowTo(tool.id)}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                    >
                        {mainBtnText}
                    </button>
                ) : (
                    <a
                        href={tool.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                    >
                        {mainBtnText}
                    </a>
                )}
            </div>
        </div>
    );
};
