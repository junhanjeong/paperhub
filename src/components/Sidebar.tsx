"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { conferences } from "@/data/conferences";
import { Chatbot } from "./Chatbot";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const [activePage, setActivePage] = useState(1);
    const [isLocalMode, setIsLocalMode] = useState(false);
    const [memo, setMemo] = useState("");
    const [todos, setTodos] = useState<{ text: string; completed: boolean }[]>([]);
    const [todoInput, setTodoInput] = useState("");
    const [goal, setGoal] = useState({ title: "Paper Submission", date: "2026-06-30" });
    const [isGoalSettingsOpen, setIsGoalSettingsOpen] = useState(false);

    // Timer State
    const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Load state from localStorage
        const savedFocus = localStorage.getItem('paperhub-focus-sec');
        if (savedFocus) setTotalFocusSeconds(parseInt(savedFocus));

        const savedTodos = localStorage.getItem('paperhub-todos');
        if (savedTodos) setTodos(JSON.parse(savedTodos));

        const savedMemo = localStorage.getItem('paperhub-memo');
        if (savedMemo) setMemo(savedMemo);

        const savedGoal = localStorage.getItem('paperhub-user-goal');
        if (savedGoal) setGoal(JSON.parse(savedGoal));

        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        localStorage.setItem('paperhub-todos', JSON.stringify(todos));
    }, [todos, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        localStorage.setItem('paperhub-memo', memo);
    }, [memo, isMounted]);

    const sessionStartTime = isMounted ? Date.now() : 0;
    const currentTotalSeconds = totalFocusSeconds + (isMounted ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0);

    const formatTime = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getGardenStats = (totalSec: number) => {
        let stageText = "Seedling";
        let treeIcon = "🌱";
        let stageProgress = 0;

        if (totalSec < 300) {
            stageText = "Seedling"; treeIcon = "🌱"; stageProgress = (totalSec / 300) * 100;
        } else if (totalSec < 1800) {
            stageText = "Sprout"; treeIcon = "🌿"; stageProgress = ((totalSec - 300) / 1500) * 100;
        } else if (totalSec < 3600) {
            stageText = "Small Tree"; treeIcon = "🌳"; stageProgress = ((totalSec - 1800) / 1800) * 100;
        } else {
            stageText = "Great Tree"; treeIcon = "🌲"; stageProgress = 100;
        }
        return { stageText, treeIcon, stageProgress };
    };

    const { stageText, treeIcon, stageProgress } = getGardenStats(currentTotalSeconds);
    const catCount = Math.min(5, Math.floor(currentTotalSeconds / 3600));
    const catEmojis = ["🐱", "🐈", "🦁", "🐯", "🐈‍⬛"];

    const getAOETime = () => {
        if (!currentTime) return new Date();
        const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
        return new Date(utc - (12 * 3600000));
    };

    const aoeTime = getAOETime();
    const displayTime = isLocalMode ? (currentTime || new Date()) : aoeTime;

    const calculateGoalCountdown = () => {
        const target = new Date(goal.date + "T23:59:59").getTime();
        const diff = Math.max(0, target - (currentTime?.getTime() || Date.now()));
        return {
            d: String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0'),
            h: String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0'),
            m: String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0'),
            s: String(Math.floor((diff / 1000) % 60)).padStart(2, '0'),
        };
    };

    const countdown = calculateGoalCountdown();

    const addTodo = () => {
        if (!todoInput.trim()) return;
        setTodos([...todos, { text: todoInput.trim(), completed: false }]);
        setTodoInput("");
    };

    const toggleTodo = (index: number) => {
        const newTodos = [...todos];
        newTodos[index].completed = !newTodos[index].completed;
        setTodos(newTodos);
    };

    const deleteTodo = (index: number) => {
        setTodos(todos.filter((_, i) => i !== index));
    };

    const titles = ["Focus", "Schedule", "Workspace", "AI Assistant"];

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-[140] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                id="schedule-sidebar"
                className={cn(
                    "fixed top-0 right-0 h-full w-[450px] z-[150] border-l border-white/20 flex flex-col p-6 overflow-hidden shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white/80 backdrop-blur-xl",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-8 shrink-0 relative min-h-[40px]">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                        {titles[activePage - 1]}
                    </h3>

                    <div className="flex gap-2 bg-white/60 p-2 rounded-full border border-slate-100 shadow-sm absolute left-1/2 -translate-x-1/2">
                        {[1, 2, 3, 4].map((num) => (
                            <div
                                key={num}
                                className={cn("page-dot", activePage === num && "active")}
                                onClick={() => setActivePage(num)}
                            />
                        ))}
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <Icons.X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content Pages */}
                <div className={cn("flex-1", activePage !== 4 && "overflow-y-auto")}>
                    {activePage === 1 && (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Focus Garden */}
                            <div className="widget-card p-6 border-2 border-emerald-50 bg-emerald-50/20">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2">
                                        <Icons.Sprout className="w-4 h-4 text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Focus Garden</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                                        {formatTime(currentTotalSeconds)}
                                    </span>
                                </div>

                                <div className="relative h-32 flex items-end justify-center mb-6 bg-white/40 rounded-3xl overflow-hidden">
                                    <div className="flex items-end justify-center gap-2 pb-4">
                                        <span className="garden-obj text-6xl">{treeIcon}</span>
                                        <div className="flex gap-1">
                                            {Array.from({ length: catCount }).map((_, i) => (
                                                <span key={i} className="garden-obj cat-appear text-3xl">
                                                    {catEmojis[i % catEmojis.length]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 w-full h-2 bg-amber-800/10" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-bold">
                                        <span className="text-slate-500 uppercase">Growth Stage: {stageText}</span>
                                        <span className="text-emerald-600">{Math.floor(stageProgress)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-400 transition-all duration-1000"
                                            style={{ width: `${stageProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 text-center italic">집중한 시간에 따라 나무가 자라고 고양이가 찾아옵니다.</p>
                                </div>
                            </div>

                            {/* Time Widget */}
                            <div className={cn("widget-card p-6 border-2 shrink-0 transition-all duration-300", isLocalMode ? "time-widget-local" : "time-widget-aoe")}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        {isLocalMode ? (
                                            <Icons.Clock className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <Icons.Globe className="w-4 h-4 text-blue-600" />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {isLocalMode ? "Your Local Time" : "Anywhere on Earth"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Local Time</span>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={isLocalMode}
                                                onChange={(e) => setIsLocalMode(e.target.checked)}
                                            />
                                            <span className="slider" />
                                        </label>
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-slate-800 tracking-tighter">
                                    {isMounted
                                        ? displayTime.toLocaleTimeString('ko-KR', { hour12: false })
                                        : "--:--:--"}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 font-medium italic">
                                    {isMounted
                                        ? displayTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
                                        : "Loading..."}
                                </p>
                            </div>

                            {/* Milestone */}
                            <div className="widget-card p-6 border-2 border-slate-50 shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Icons.Target className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custom Milestone</span>
                                    </div>
                                    <button onClick={() => setIsGoalSettingsOpen(!isGoalSettingsOpen)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                                        <Icons.Settings className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>

                                {!isGoalSettingsOpen ? (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-700 truncate mb-4">{goal.title}</h4>
                                        <div className="flex justify-between items-center gap-2">
                                            {[
                                                { label: "Days", value: countdown.d },
                                                { label: "Hours", value: countdown.h },
                                                { label: "Mins", value: countdown.m },
                                                { label: "Secs", value: countdown.s },
                                            ].map((seg) => (
                                                <div key={seg.label} className="countdown-segment">
                                                    <div className="text-2xl font-black text-slate-800 tracking-tighter">{seg.value}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{seg.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                        <input
                                            type="text"
                                            value={goal.title}
                                            onChange={(e) => setGoal({ ...goal, title: e.target.value })}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                                            placeholder="목표 이름"
                                        />
                                        <input
                                            type="date"
                                            value={goal.date}
                                            onChange={(e) => setGoal({ ...goal, date: e.target.value })}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    localStorage.setItem('paperhub-user-goal', JSON.stringify(goal));
                                                    setIsGoalSettingsOpen(false);
                                                }}
                                                className="flex-1 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900 transition-shadow"
                                            >
                                                저장
                                            </button>
                                            <button
                                                onClick={() => setIsGoalSettingsOpen(false)}
                                                className="flex-1 py-2 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-slate-200"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activePage === 2 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div className="widget-card p-6">
                                <p className="text-center text-slate-400 text-xs py-8">Calendar interface coming soon...</p>
                            </div>
                            <div className="widget-card p-6 border-2 border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Icons.CalendarCheck className="w-4 h-4 text-blue-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Deadlines</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full">
                                        {conferences.length}
                                    </span>
                                </div>
                                <div className="space-y-5">
                                    {conferences.map((c) => {
                                        const dl = new Date(c.deadline.y, c.deadline.m - 1, c.deadline.d, 23, 59, 59);
                                        const diffDays = Math.ceil((dl.getTime() - aoeTime.getTime()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <div key={c.name} className="p-4 bg-white/60 rounded-2xl border border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-extrabold text-slate-800">{c.name}</span>
                                                    <span className={cn("text-[10px] font-black", diffDays > 0 ? 'text-blue-600' : 'text-rose-500')}>
                                                        {diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? 'D-Day' : 'Closed')}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-[9px] text-slate-400">
                                                        <Icons.Clock className="w-3 h-3" />
                                                        <span>마감: {c.deadline.y}.{c.deadline.m}.{c.deadline.d}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] text-slate-400">
                                                        <Icons.MapPin className="w-3 h-3" />
                                                        <span>개최: {c.period.start.m}/{c.period.start.d} - {c.period.end.m}/{c.period.end.d}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePage === 3 && (
                        <div className="space-y-5 flex flex-col h-full animate-fadeIn">
                            <div className="widget-card p-6 border-2 border-slate-50">
                                <div className="flex items-center gap-2 mb-4">
                                    <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">To-do List</span>
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={todoInput}
                                        onChange={(e) => setTodoInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-400"
                                        placeholder="새 할 일 추가..."
                                    />
                                    <button onClick={addTodo} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                        <Icons.Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {todos.length === 0 ? (
                                        <p className="text-[10px] text-slate-400 py-4 text-center italic">Nothing to do yet.</p>
                                    ) : (
                                        todos.map((todo, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group">
                                                <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => toggleTodo(i)}>
                                                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", todo.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200')}>
                                                        {todo.completed && <Icons.Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <span className={cn("text-xs truncate", todo.completed ? 'text-slate-300 line-through' : 'text-slate-600')}>
                                                        {todo.text}
                                                    </span>
                                                </div>
                                                <button onClick={() => deleteTodo(i)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100">
                                                    <Icons.Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="widget-card p-6 flex-1 flex flex-col border-2 border-slate-50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Icons.StickyNote className="w-4 h-4 text-orange-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Memo</span>
                                    </div>
                                </div>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    className="flex-1 w-full p-4 text-sm bg-orange-50/20 border border-orange-100 rounded-2xl outline-none focus:border-orange-300 resize-none leading-relaxed text-slate-700 min-h-[150px]"
                                    placeholder="연구 아이디어나 간단한 메모를 남겨보세요..."
                                />
                            </div>
                        </div>
                    )}

                    {activePage === 4 && (
                        <div className="h-full animate-fadeIn pb-4">
                            <Chatbot isInline={true} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
