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
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-12">
            <div className="max-w-3xl w-full">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-br from-[#00592B] to-[#10B981] text-white p-10">
                        <h1 className="text-4xl font-black mb-3">SAT Practice Test</h1>
                        <p className="text-white/90 text-lg">
                            A timed, full-length practice test modeled on the Digital SAT.
                        </p>
                    </div>

                    <div className="p-10 space-y-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Test Structure</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="border border-slate-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 text-[#00592B] font-bold mb-2">
                                        <BookOpen className="w-5 h-5" />
                                        Module 1
                                    </div>
                                    <div className="text-slate-900 font-semibold">Reading & Writing</div>
                                    <div className="text-sm text-slate-600 mt-1">27 questions • 32 minutes</div>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 text-[#00592B] font-bold mb-2">
                                        <Calculator className="w-5 h-5" />
                                        Module 2
                                    </div>
                                    <div className="text-slate-900 font-semibold">Math</div>
                                    <div className="text-sm text-slate-600 mt-1">22 questions • 35 minutes</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">Directions</h2>
                            <ul className="space-y-2 text-slate-700">
                                <li className="flex gap-3">
                                    <Clock className="w-5 h-5 text-[#00592B] flex-shrink-0 mt-0.5" />
                                    <span>Each module is timed independently. The clock counts down in the upper right.</span>
                                </li>
                                <li className="flex gap-3">
                                    <Flag className="w-5 h-5 text-[#00592B] flex-shrink-0 mt-0.5" />
                                    <span>You can flag questions and navigate freely within a module before submitting.</span>
                                </li>
                                <li className="flex gap-3">
                                    <ArrowLeftRight className="w-5 h-5 text-[#00592B] flex-shrink-0 mt-0.5" />
                                    <span>Once a module is submitted you cannot return to it.</span>
                                </li>
                                <li className="flex gap-3">
                                    <BarChart3 className="w-5 h-5 text-[#00592B] flex-shrink-0 mt-0.5" />
                                    <span>Your section scores will display at the end (200–800 each, 400–1600 total).</span>
                                </li>
                            </ul>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="w-full bg-[#00592B] text-white font-bold py-4 rounded-xl hover:bg-[#10B981] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
