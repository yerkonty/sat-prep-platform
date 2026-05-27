"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Calculator, ChevronRight, ListTree, Loader2 } from "lucide-react";
import api from "@/lib/api";

type SkillStats = {
    name: string;
    count: number;
};

type DomainStats = {
    name: string;
    count: number;
    skills: SkillStats[];
};

type SectionStats = {
    id: string;
    title: string;
    count: number;
    domains: DomainStats[];
};

type QuestionStatsResponse = {
    total_questions: number;
    sections: SectionStats[];
};

const EMPTY_SECTION: Record<string, SectionStats> = {
    rw: { id: "rw", title: "Reading & Writing", count: 0, domains: [] },
    math: { id: "math", title: "Math", count: 0, domains: [] }
};

export default function QuestionBankPage() {
    const [stats, setStats] = useState<QuestionStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [questionIdSearch, setQuestionIdSearch] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get<QuestionStatsResponse>("/api/questions/stats");
                setStats(response.data);
            } catch (error) {
                console.error("Failed to load question stats", error);
                setStats({ total_questions: 0, sections: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const sections = useMemo(() => {
        const map = new Map<string, SectionStats>();
        for (const section of stats?.sections || []) {
            map.set(section.id, section);
        }

        return [
            map.get("rw") || EMPTY_SECTION.rw,
            map.get("math") || EMPTY_SECTION.math
        ];
    }, [stats]);

    function buildSessionUrl(params: { module: string; domain?: string; skill?: string }) {
        const url = new URLSearchParams();
        url.set("module", params.module);
        if (params.domain) url.set("domain", params.domain);
        if (params.skill) url.set("skill", params.skill);
        if (selectedDifficulties.length > 0) url.set("difficulty", selectedDifficulties.join(","));
        if (questionIdSearch.trim()) url.set("question_id", questionIdSearch.trim());
        return `/practice/session?${url.toString()}`;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-16">
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
                <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight">Question Bank</h1>
                        <p className="text-text-2 mt-1 text-sm">
                            Real questions grouped by section, domain, and skill.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-semibold text-primary">
                        <ListTree className="w-4 h-4" />
                        Total: {stats?.total_questions ?? 0}
                    </div>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-2">Difficulty:</span>
                        {(["Easy", "Medium", "Hard"] as const).map((level) => {
                            const isSelected = selectedDifficulties.includes(level);
                            const colorMap: Record<string, string> = {
                                Easy:   isSelected ? "bg-emerald-600 text-white border-emerald-600"   : "bg-card text-emerald-700 border-emerald-300 hover:border-emerald-500",
                                Medium: isSelected ? "bg-amber-500 text-white border-amber-500"       : "bg-card text-amber-700 border-amber-300 hover:border-amber-500",
                                Hard:   isSelected ? "bg-rose-600 text-white border-rose-600"         : "bg-card text-rose-700 border-rose-300 hover:border-rose-500",
                            };
                            return (
                                <button
                                    key={level}
                                    onClick={() =>
                                        setSelectedDifficulties((prev) =>
                                            prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level]
                                        )
                                    }
                                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors active:scale-95 ${colorMap[level]}`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                        {selectedDifficulties.length > 0 && (
                            <button
                                onClick={() => setSelectedDifficulties([])}
                                className="text-xs text-text-3 hover:text-foreground underline ml-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <label htmlFor="qid-search" className="text-sm font-semibold text-text-2 whitespace-nowrap">
                            Question ID:
                        </label>
                        <input
                            id="qid-search"
                            type="text"
                            value={questionIdSearch}
                            onChange={(e) => setQuestionIdSearch(e.target.value)}
                            placeholder="e.g. a1b2c3d4"
                            className="w-36 rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                        />
                        {questionIdSearch.trim() && (
                            <Link
                                href={buildSessionUrl({ module: "rw" })}
                                className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent transition-colors active:scale-95"
                            >
                                Go
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {sections.map((section) => {
                        const isMath = section.id === "math";
                        const Icon = isMath ? Calculator : BookOpen;
                        const cardAccent = isMath ? "bg-primary" : "bg-accent";

                        return (
                            <div key={section.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                                <div className={`p-5 ${cardAccent} text-white`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
                                                <p className="text-white/80 text-sm mt-0.5 tabular-nums">{section.count} questions</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={buildSessionUrl({ module: section.id })}
                                            className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors active:scale-[0.97]"
                                        >
                                            Solve
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {section.domains.length === 0 && (
                                        <div className="rounded-xl border border-border bg-background p-3 text-sm text-text-3">
                                            0 questions in this section.
                                        </div>
                                    )}

                                    {section.domains.map((domain) => (
                                        <div key={domain.name} className="rounded-xl border border-border p-3">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <Link
                                                    href={buildSessionUrl({ module: section.id, domain: domain.name })}
                                                    className="font-bold text-base text-foreground hover:text-primary transition-colors"
                                                >
                                                    {domain.name}
                                                </Link>
                                                <span className="text-sm font-semibold text-text-3 tabular-nums">{domain.count}</span>
                                            </div>

                                            <div className="space-y-0.5">
                                                {domain.skills.length === 0 && (
                                                    <div className="text-sm text-text-3">0 questions</div>
                                                )}

                                                {domain.skills.map((skill) => (
                                                    <Link
                                                        key={`${domain.name}-${skill.name}`}
                                                        href={buildSessionUrl({ module: section.id, domain: domain.name, skill: skill.name })}
                                                        className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-background transition-colors text-sm"
                                                    >
                                                        <span className="text-text-2">{skill.name}</span>
                                                        <span className="font-medium text-text-3 tabular-nums">{skill.count}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
