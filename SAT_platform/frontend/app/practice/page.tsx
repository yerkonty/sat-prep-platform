"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Calculator, ChevronRight, ListTree } from "lucide-react";
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center text-[#1A1A1A]/60">
                Loading question bank...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] pb-24">
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-10">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Question Bank</h1>
                        <p className="text-[#1A1A1A]/60 mt-2 text-sm md:text-base">
                            Real questions from your database, grouped by section, domain, and skill.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-[#00592B]/20 bg-white px-4 py-2 text-sm font-semibold text-[#00592B]">
                        <ListTree className="w-4 h-4" />
                        Total available: {stats?.total_questions ?? 0}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sections.map((section) => {
                        const isMath = section.id === "math";
                        const Icon = isMath ? Calculator : BookOpen;
                        const cardAccent = isMath ? "bg-[#00592B]" : "bg-[#10B981]";

                        return (
                            <div key={section.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className={`p-6 ${cardAccent} text-white`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                                                <p className="text-white/90 text-sm mt-1">{section.count} questions</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/practice/session?module=${section.id}`}
                                            className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50 transition-colors"
                                        >
                                            Solve
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {section.domains.length === 0 && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                            0 questions in this section.
                                        </div>
                                    )}

                                    {section.domains.map((domain) => (
                                        <div key={domain.name} className="rounded-2xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <Link
                                                    href={`/practice/session?module=${section.id}&domain=${encodeURIComponent(domain.name)}`}
                                                    className="font-bold text-lg text-slate-900 hover:text-[#00592B] transition-colors"
                                                >
                                                    {domain.name}
                                                </Link>
                                                <span className="text-sm font-semibold text-slate-500">{domain.count} questions</span>
                                            </div>

                                            <div className="space-y-2">
                                                {domain.skills.length === 0 && (
                                                    <div className="text-sm text-slate-500">0 questions</div>
                                                )}

                                                {domain.skills.map((skill) => (
                                                    <Link
                                                        key={`${domain.name}-${skill.name}`}
                                                        href={`/practice/session?module=${section.id}&domain=${encodeURIComponent(domain.name)}&skill=${encodeURIComponent(skill.name)}`}
                                                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <span className="text-sm text-slate-700">{skill.name}</span>
                                                        <span className="text-sm font-medium text-slate-500">{skill.count}</span>
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
