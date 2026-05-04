"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Flag,
    GripVertical,
    BookOpen,
    Calculator,
    Trophy,
    AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { renderMath } from "@/lib/renderMath";

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

type ExamState = {
    examId: string;
    rwQuestions: Question[];
    mathQuestions: Question[];
};

type ExamResult = {
    exam_id: string;
    rw_score: number;
    math_score: number;
    total_score: number;
    rw_correct: number;
    rw_total: number;
    math_correct: number;
    math_total: number;
};

type Phase = "loading" | "rw_active" | "rw_break" | "math_active" | "submitting" | "results";

const RW_TIME = 32 * 60;
const MATH_TIME = 35 * 60;
const DEFAULT_PROMPT = "Choose the best answer.";

function splitQuestionContent(rawContent: string): { passageHtml: string; prompt: string } {
    const raw = (rawContent || "").trim();
    if (!raw) return { passageHtml: "", prompt: DEFAULT_PROMPT };

    const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const promptSignals = [/which choice/i, /what choice/i, /according to/i, /based on/i, /the student wants/i, /which quotation/i];
    const isLikelyPrompt = (t: string) => t.endsWith("?") && promptSignals.some((r) => r.test(t));

    if (paragraphs.length > 1 && isLikelyPrompt(paragraphs[paragraphs.length - 1])) {
        return {
            passageHtml: paragraphs.slice(0, -1).join("\n\n"),
            prompt: paragraphs[paragraphs.length - 1],
        };
    }

    const m = raw.match(
        /(Which choice[\s\S]*?\?|What choice[\s\S]*?\?|According to[\s\S]*?\?|Based on[\s\S]*?\?|The student wants[\s\S]*?\?|Which quotation[\s\S]*?\?)\s*$/i
    );
    if (m && m.index !== undefined) {
        return {
            passageHtml: raw.slice(0, m.index).trim() || raw,
            prompt: m[1].trim() || DEFAULT_PROMPT,
        };
    }
    return { passageHtml: raw, prompt: DEFAULT_PROMPT };
}

function formatTime(s: number): string {
    if (s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function TestSessionPage() {
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>("loading");
    const [examId, setExamId] = useState("");
    const [rwQuestions, setRwQuestions] = useState<Question[]>([]);
    const [mathQuestions, setMathQuestions] = useState<Question[]>([]);

    const [rwAnswers, setRwAnswers] = useState<Record<number, number>>({});
    const [mathAnswers, setMathAnswers] = useState<Record<number, number>>({});
    const [rwFlagged, setRwFlagged] = useState<Record<number, boolean>>({});
    const [mathFlagged, setMathFlagged] = useState<Record<number, boolean>>({});

    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [showNavigator, setShowNavigator] = useState(false);
    const [leftWidth, setLeftWidth] = useState(47);
    const [results, setResults] = useState<ExamResult | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    const isSubmitting = useRef(false);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        const raw = typeof window !== "undefined" ? localStorage.getItem("sat_exam_state") : null;
        if (!raw) {
            router.replace("/test");
            return;
        }
        try {
            const data: ExamState = JSON.parse(raw);
            setExamId(data.examId);
            setRwQuestions(data.rwQuestions);
            setMathQuestions(data.mathQuestions);
            setTimeRemaining(RW_TIME);
            setPhase("rw_active");
            startTimeRef.current = Date.now();
        } catch {
            router.replace("/test");
        }
    }, [router]);

    useEffect(() => {
        if (phase !== "rw_active" && phase !== "math_active") return;
        const id = setInterval(() => {
            setTimeRemaining((t) => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [phase]);

    async function submitExam() {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        setPhase("submitting");

        const rwById: Record<string, number> = {};
        Object.entries(rwAnswers).forEach(([i, a]) => {
            const q = rwQuestions[parseInt(i, 10)];
            if (q) rwById[q.id] = a;
        });
        const mathById: Record<string, number> = {};
        Object.entries(mathAnswers).forEach(([i, a]) => {
            const q = mathQuestions[parseInt(i, 10)];
            if (q) mathById[q.id] = a;
        });

        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        try {
            const res = await api.post<ExamResult>(`/api/exam/${examId}/submit`, {
                rw_answers: rwById,
                math_answers: mathById,
                time_taken: elapsed,
            });
            setResults(res.data);
            setPhase("results");
            localStorage.removeItem("sat_exam_state");
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } };
            setSubmitError(err?.response?.data?.detail || "Failed to submit. Please try again.");
            setPhase(currentModule === "math" ? "math_active" : "rw_active");
            isSubmitting.current = false;
        }
    }

    useEffect(() => {
        if (timeRemaining > 0) return;
        if (phase === "rw_active") {
            setPhase("rw_break");
            setCurrentIndex(0);
        } else if (phase === "math_active") {
            void submitExam();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRemaining, phase]);

    const currentModule: "rw" | "math" = phase === "math_active" ? "math" : "rw";
    const currentQuestions = currentModule === "rw" ? rwQuestions : mathQuestions;
    const currentAnswers = currentModule === "rw" ? rwAnswers : mathAnswers;
    const currentFlagged = currentModule === "rw" ? rwFlagged : mathFlagged;
    const currentQuestion = currentQuestions[currentIndex];
    const isMath = currentModule === "math";

    const parsed = useMemo(
        () => splitQuestionContent(currentQuestion?.content || ""),
        [currentQuestion]
    );

    function selectAnswer(idx: number) {
        if (currentModule === "rw") {
            setRwAnswers({ ...rwAnswers, [currentIndex]: idx });
        } else {
            setMathAnswers({ ...mathAnswers, [currentIndex]: idx });
        }
    }

    function toggleFlag() {
        if (currentModule === "rw") {
            setRwFlagged({ ...rwFlagged, [currentIndex]: !rwFlagged[currentIndex] });
        } else {
            setMathFlagged({ ...mathFlagged, [currentIndex]: !mathFlagged[currentIndex] });
        }
    }

    function goPrev() {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    }

    function goNext() {
        if (currentIndex < currentQuestions.length - 1) setCurrentIndex(currentIndex + 1);
    }

    function jumpTo(i: number) {
        setCurrentIndex(i);
        setShowNavigator(false);
    }

    function handleSubmitClick() {
        setShowSubmitConfirm(true);
    }

    function confirmSubmitModule() {
        setShowSubmitConfirm(false);
        if (phase === "rw_active") {
            setPhase("rw_break");
            setCurrentIndex(0);
        } else if (phase === "math_active") {
            void submitExam();
        }
    }

    function startMathModule() {
        setPhase("math_active");
        setTimeRemaining(MATH_TIME);
        setCurrentIndex(0);
    }

    if (phase === "loading") {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-600">
                Loading test…
            </div>
        );
    }

    if (phase === "rw_break") {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
                <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-10 text-center">
                    <div className="w-16 h-16 bg-[#00592B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calculator className="w-8 h-8 text-[#00592B]" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Reading & Writing complete</h2>
                    <p className="text-slate-600 mb-8">
                        Up next: Math — 22 questions, 35 minutes. Once you begin, the timer will start
                        and you cannot return to the previous module.
                    </p>
                    <button
                        onClick={startMathModule}
                        className="w-full bg-[#00592B] text-white font-bold py-4 rounded-xl hover:bg-[#10B981] transition"
                    >
                        Begin Math Module
                    </button>
                </div>
            </div>
        );
    }

    if (phase === "submitting") {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-300 border-t-[#00592B] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-700 font-semibold">Scoring your test…</p>
                </div>
            </div>
        );
    }

    if (phase === "results" && results) {
        const rwPct = results.rw_total ? (results.rw_correct / results.rw_total) * 100 : 0;
        const mathPct = results.math_total ? (results.math_correct / results.math_total) * 100 : 0;
        return (
            <div className="min-h-screen bg-[#FAFAF8] py-12 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-br from-[#00592B] to-[#10B981] text-white p-10 text-center">
                            <Trophy className="w-12 h-12 mx-auto mb-3" />
                            <p className="text-white/80 uppercase text-sm font-bold tracking-widest mb-2">Your Score</p>
                            <div className="text-7xl font-black mb-1">{results.total_score}</div>
                            <div className="text-white/80">out of 1600</div>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="border border-slate-200 rounded-xl p-6">
                                    <div className="flex items-center gap-2 text-[#00592B] font-bold mb-3">
                                        <BookOpen className="w-5 h-5" />
                                        Reading & Writing
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{results.rw_score}</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        {results.rw_correct} / {results.rw_total} correct
                                    </div>
                                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#00592B]" style={{ width: `${rwPct}%` }} />
                                    </div>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-6">
                                    <div className="flex items-center gap-2 text-[#00592B] font-bold mb-3">
                                        <Calculator className="w-5 h-5" />
                                        Math
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{results.math_score}</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        {results.math_correct} / {results.math_total} correct
                                    </div>
                                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#00592B]" style={{ width: `${mathPct}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="flex-1 border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition"
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => router.push("/test")}
                                    className="flex-1 bg-[#00592B] text-white font-bold py-3 rounded-xl hover:bg-[#10B981] transition"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const moduleLabel = currentModule === "rw" ? "Module 1: Reading & Writing" : "Module 2: Math";
    const totalQ = currentQuestions.length;
    const lowTime = timeRemaining <= 60;

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    {currentModule === "rw" ? (
                        <BookOpen className="w-5 h-5 text-[#00592B]" />
                    ) : (
                        <Calculator className="w-5 h-5 text-[#00592B]" />
                    )}
                    <span className="font-bold text-slate-900">{moduleLabel}</span>
                </div>
                <div className={`flex items-center gap-2 font-mono text-lg font-bold ${lowTime ? "text-red-600" : "text-slate-900"}`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeRemaining)}
                </div>
                <button
                    onClick={toggleFlag}
                    className={`flex items-center gap-1 text-sm font-semibold transition ${currentFlagged[currentIndex] ? "text-amber-600" : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Flag className={`w-4 h-4 ${currentFlagged[currentIndex] ? "fill-amber-500" : ""}`} />
                    {currentFlagged[currentIndex] ? "Flagged" : "Flag"}
                </button>
            </header>

            {submitError && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {submitError}
                </div>
            )}

            <main className="flex-1 overflow-hidden flex">
                {!isMath ? (
                    <>
                        <div
                            className="overflow-y-auto p-8 border-r border-slate-200 bg-white"
                            style={{ flexBasis: `${leftWidth}%` }}
                        >
                            <div
                                className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: renderMath(parsed.passageHtml) }}
                            />
                        </div>
                        <div
                            className="w-1.5 bg-slate-100 hover:bg-slate-200 cursor-col-resize flex items-center justify-center flex-shrink-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.clientX;
                                const startLeft = leftWidth;
                                const containerWidth = (e.currentTarget.parentElement?.clientWidth || 1);
                                const onMove = (ev: MouseEvent) => {
                                    const delta = ((ev.clientX - startX) / containerWidth) * 100;
                                    setLeftWidth(Math.min(75, Math.max(25, startLeft + delta)));
                                };
                                const onUp = () => {
                                    window.removeEventListener("mousemove", onMove);
                                    window.removeEventListener("mouseup", onUp);
                                };
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                            }}
                        >
                            <GripVertical className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            <div
                                className="text-slate-900 font-semibold mb-6"
                                dangerouslySetInnerHTML={{ __html: renderMath(parsed.prompt) }}
                            />
                            <OptionList
                                options={currentQuestion?.options || []}
                                selected={currentAnswers[currentIndex]}
                                onSelect={selectAnswer}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        <div className="max-w-3xl mx-auto">
                            <div
                                className="text-slate-900 leading-relaxed mb-6 whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: renderMath(currentQuestion?.content || "") }}
                            />
                            <OptionList
                                options={currentQuestion?.options || []}
                                selected={currentAnswers[currentIndex]}
                                onSelect={selectAnswer}
                            />
                        </div>
                    </div>
                )}
            </main>

            {showNavigator && (
                <div className="bg-white border-t border-slate-200 px-6 py-4 flex-shrink-0 max-h-64 overflow-y-auto">
                    <div className="flex flex-wrap gap-2 max-w-4xl mx-auto">
                        {currentQuestions.map((_, i) => {
                            const answered = currentAnswers[i] !== undefined;
                            const flagged = currentFlagged[i];
                            const current = i === currentIndex;
                            return (
                                <button
                                    key={i}
                                    onClick={() => jumpTo(i)}
                                    className={`relative w-10 h-10 rounded-lg text-sm font-bold transition ${current
                                            ? "ring-2 ring-[#00592B] ring-offset-2"
                                            : ""
                                        } ${answered
                                            ? "bg-[#00592B] text-white"
                                            : "border border-slate-300 text-slate-700 hover:border-slate-500"
                                        }`}
                                >
                                    {i + 1}
                                    {flagged && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={() => setShowNavigator((s) => !s)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200"
                >
                    Question {currentIndex + 1} of {totalQ}
                </button>
                {currentIndex < totalQ - 1 ? (
                    <button
                        onClick={goNext}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#00592B] hover:bg-[#10B981]"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmitClick}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#00592B] hover:bg-[#10B981]"
                    >
                        {currentModule === "rw" ? "Submit Module" : "Submit Test"}
                    </button>
                )}
            </footer>

            {showSubmitConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            Submit {currentModule === "rw" ? "Reading & Writing" : "Math"}?
                        </h3>
                        <p className="text-slate-600 mb-6">
                            You will not be able to return to this module. Make sure you&apos;ve answered every question.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-50"
                            >
                                Keep working
                            </button>
                            <button
                                onClick={confirmSubmitModule}
                                className="flex-1 bg-[#00592B] text-white font-semibold py-2.5 rounded-lg hover:bg-[#10B981]"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OptionList({
    options,
    selected,
    onSelect,
}: {
    options: string[];
    selected?: number;
    onSelect: (i: number) => void;
}) {
    const letters = ["A", "B", "C", "D"];
    return (
        <div className="space-y-3">
            {options.map((opt, i) => {
                const active = selected === i;
                return (
                    <button
                        key={i}
                        onClick={() => onSelect(i)}
                        className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition ${active
                                ? "border-[#00592B] bg-[#00592B]/5"
                                : "border-slate-200 hover:border-slate-400 bg-white"
                            }`}
                    >
                        <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${active ? "bg-[#00592B] text-white" : "border border-slate-400 text-slate-700"
                                }`}
                        >
                            {letters[i]}
                        </span>
                        <span
                            className="text-slate-800 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMath(opt) }}
                        />
                    </button>
                );
            })}
        </div>
    );
}
