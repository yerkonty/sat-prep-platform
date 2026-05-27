"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, BookOpen, Calculator, Play, AlertCircle, Flag, ArrowLeftRight, BarChart3 } from "lucide-react";
import api from "@/lib/api";

type Question = {
    id: string;
    external_id?: string;
    section?: string;
    domain?: string;
    skill?: string;
    difficulty?: string;
    content: string;
    options: string[];
    explanation?: string;
    image?: string | null;
};

type StartResponse = {
    exam_id: string;
    rw_questions: Question[];
    math_questions: Question[];
};

export default function TestStartPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleStart() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post<StartResponse>("/api/exam/start");
            const data = res.data;
            localStorage.setItem(
                "sat_exam_state",
                JSON.stringify({
                    examId: data.exam_id,
                    rwQuestions: data.rw_questions,
                    mathQuestions: data.math_questions,
                })
            );
            router.push("/test/session");
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err?.response?.data?.detail || "Failed to start test. Please try again.");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
            <div className="max-w-3xl w-full">
                <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                    <div className="bg-gradient-to-br from-primary to-accent text-white p-8">
                        <h1 className="text-3xl font-black mb-2">SAT Practice Test</h1>
                        <p className="text-white/90 text-base">
                            A timed, full-length practice test modeled on the Digital SAT.
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-foreground mb-3">Test structure</h2>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="border border-border rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-primary font-bold mb-1.5">
                                        <BookOpen className="w-5 h-5" />
                                        Module 1
                                    </div>
                                    <div className="text-foreground font-semibold text-sm">Reading & Writing</div>
                                    <div className="text-sm text-text-3 mt-0.5 tabular-nums">27 questions · 32 minutes</div>
                                </div>
                                <div className="border border-border rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-primary font-bold mb-1.5">
                                        <Calculator className="w-5 h-5" />
                                        Module 2
                                    </div>
                                    <div className="text-foreground font-semibold text-sm">Math</div>
                                    <div className="text-sm text-text-3 mt-0.5 tabular-nums">22 questions · 35 minutes</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-foreground mb-3">Directions</h2>
                            <ul className="space-y-2 text-text-2 text-sm">
                                <li className="flex gap-3">
                                    <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span>Each module is timed independently. The clock counts down in the upper right.</span>
                                </li>
                                <li className="flex gap-3">
                                    <Flag className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span>You can flag questions and navigate freely within a module before submitting.</span>
                                </li>
                                <li className="flex gap-3">
                                    <ArrowLeftRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span>Once a module is submitted you cannot return to it.</span>
                                </li>
                                <li className="flex gap-3">
                                    <BarChart3 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span>Your section scores will display at the end (200–800 each, 400–1600 total).</span>
                                </li>
                            </ul>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Loading questions…
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    Start Practice Test
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
