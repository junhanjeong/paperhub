"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ToolCard } from "@/components/ToolCard";
import { Chatbot } from "@/components/Chatbot";
import { ToolModal } from "@/components/ToolModal";
import { toolsData, Tool } from "@/data/tools";
import { cn } from "@/lib/utils";

import { toggleLikeAction, getLikesAction } from "@/lib/actions";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [userLikes, setUserLikes] = useState<number[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null);

  useEffect(() => {
    const savedFavs = localStorage.getItem('paperhub-favs');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const savedLikes = localStorage.getItem('paperhub-user-likes');
    if (savedLikes) setUserLikes(JSON.parse(savedLikes));
  }, []);

  const toggleFavorite = (id: number) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('paperhub-favs', JSON.stringify(newFavs));
  };

  const toggleLike = async (id: number) => {
    const tool = toolsData.find(t => t.id === id);
    if (!tool) return;

    const isCurrentlyLiked = userLikes.includes(id);
    const newLikes = isCurrentlyLiked
      ? userLikes.filter((l) => l !== id)
      : [...userLikes, id];

    setUserLikes(newLikes);
    localStorage.setItem('paperhub-user-likes', JSON.stringify(newLikes));

    // 공유 서버로 좋아요 전송 (해제 로직은 생략/추가 기능)
    if (!isCurrentlyLiked) {
      await toggleLikeAction(id, tool.likes);
    }
  };

  const categories = [
    { id: "all", label: "전체보기", icon: null },
    { id: "fav", label: "즐겨찾기", icon: <Icons.Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> },
    { id: "screening", label: "논문 스크리닝", icon: null },
    { id: "search", label: "국내외 DB", icon: null },
    { id: "writing", label: "LaTeX", icon: null },
    { id: "submit", label: "투고", icon: null },
    { id: "citation", label: "인용구/레퍼런스", icon: null },
    { id: "figure", label: "그림/도식", icon: null },
    { id: "llm", label: "LLM 도구", icon: null },
    { id: "calc", label: "계산기", icon: null },
  ];

  const filteredTools = toolsData.filter((tool) => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" ||
      (activeCategory === "fav" && favorites.includes(tool.id)) ||
      tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-20">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Header */}
      <header className="w-full pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Icons.BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 text-xl tracking-tight">PaperHub</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm font-bold text-slate-700 transition-all"
            >
              <Icons.LayoutGrid className="w-4 h-4" /> 연구 대시보드
            </button>
          </div>

          <div className="relative group">
            <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-6 h-6" />
            <input
              type="text"
              placeholder="도구 이름이나 기능을 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-start gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "category-tab px-6 py-2.5 rounded-full text-sm font-medium border border-slate-200 flex items-center gap-2",
                activeCategory === cat.id ? "active" : "text-slate-600"
              )}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div key={tool.id}>
              <ToolCard
                tool={tool}
                isFavorite={favorites.includes(tool.id)}
                onToggleFavorite={toggleFavorite}
                onOpenHowTo={() => setSelectedToolId(tool.id)}
                isLiked={userLikes.includes(tool.id)}
              />
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="py-24 text-center">
            <Icons.SearchX className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">결과가 없습니다. 다른 검색어를 입력해보세요.</p>
          </div>
        )}
      </main>

      <footer className="mt-28 py-12 border-t border-slate-50 text-center text-slate-300 text-xs tracking-wide">
        <p>&copy; 2024 PaperHub. 연구자들을 위한 스마트한 길잡이.</p>
      </footer>

      <Chatbot />

      {selectedToolId && (
        <ToolModal
          toolId={selectedToolId}
          onClose={() => setSelectedToolId(null)}
          isLiked={userLikes.includes(selectedToolId)}
          onToggleLike={toggleLike}
        />
      )}
    </div>
  );
}
