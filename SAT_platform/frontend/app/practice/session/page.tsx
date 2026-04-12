"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ChevronDown,
    ChevronLeft,
    CheckCircle,
    Eye,
    EyeOff,
    Flag,
    GripVertical,
    Highlighter,
    MessageCircleQuestion,
    Siren,
    Strikethrough,
    VolumeX,
    XCircle
} from "lucide-react";
import api from "@/lib/api";

type Question = {
    id: string;
    section?: string;
    type?: string;
    domain?: string;
    skill?: string;
    difficulty?: string;
    content: string;
    options: string[];
    explanation?: string;
};

type AnswerState = {
    is_correct: boolean;
    correct_answer: number;
    explanation: string;
};

export default function PracticeSessionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500">Loading session...</div>}>
            <PracticeSession />
        </Suspense>
    );
}

function PracticeSession() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const moduleId = (searchParams.get("module") || "rw").toLowerCase();
    const domain = searchParams.get("domain") || searchParams.get("topic") || "";
    const skill = searchParams.get("skill") || "";

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [answerStates, setAnswerStates] = useState<Record<number, AnswerState>>({});
    const [eliminated, setEliminated] = useState<Record<number, number[]>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});

    const [leftWidth, setLeftWidth] = useState(47);
    const [highlightMode, setHighlightMode] = useState(false);
    const [timerHidden, setTimerHidden] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);

    const isResizing = useRef(false);

    const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
    const selectedOption = answers[currentIndex];
    const answerState = answerStates[currentIndex];

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set("section", moduleId || "rw");
                params.set("limit", "1000");

                if (domain) {
                    params.set("domain", domain);
                }

                // Keep backward compatibility with old links where skill was numeric index.
                if (skill && Number.isNaN(Number(skill))) {
                    params.set("skill", skill);
                }

                const response = await api.get<Question[]>(`/api/questions?${params.toString()}`);
                setQuestions(response.data || []);
                setCurrentIndex(0);
                setAnswers({});
                setAnswerStates({});
                setEliminated({});
                setMarkedForReview({});
                setTimeElapsed(0);
            } catch (error) {
                console.error("Failed to fetch questions", error);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [moduleId, domain, skill]);

    useEffect(() => {
        if (loading || questions.length === 0) {
            return;
        }

        const id = setInterval(() => {
            setTimeElapsed((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(id);
    }, [loading, questions.length]);

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (!isResizing.current) {
                return;
            }

            const width = (event.clientX / window.innerWidth) * 100;
            if (width >= 30 && width <= 70) {
                setLeftWidth(width);
            }
        };

        const onMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = "default";
            }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        return `${mm}:${ss}`;
    };

    const handleTextSelection = () => {
        if (!highlightMode) {
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            const mark = document.createElement("mark");
            mark.className = "bg-yellow-300/70 rounded-sm px-0.5";
            mark.title = "Click to remove highlight";
            mark.onclick = (event) => {
                const target = event.currentTarget as HTMLElement;
                const parent = target.parentNode as HTMLElement;
                if (!parent) {
                    return;
                }

                while (target.firstChild) {
                    parent.insertBefore(target.firstChild, target);
                }
                parent.removeChild(target);
                parent.normalize();
            };

            range.surroundContents(mark);
            selection.removeAllRanges();
        } catch {
            // Ignore complex selections spanning non-compatible nodes.
        }
    };

    const handleSelectOption = (index: number) => {
        if (answerState) {
            return;
        }

        setAnswers((prev) => ({ ...prev, [currentIndex]: index }));
        const eliminatedInQuestion = eliminated[currentIndex] || [];
        if (eliminatedInQuestion.includes(index)) {
            setEliminated((prev) => ({
                ...prev,
                [currentIndex]: eliminatedInQuestion.filter((item) => item !== index)
            }));
        }
    };

    const toggleEliminate = (index: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (answerState) {
            return;
        }

        setEliminated((prev) => {
            const current = prev[currentIndex] || [];
            return {
                ...prev,
                [currentIndex]: current.includes(index) ? current.filter((x) => x !== index) : [...current, index]
            };
        });

        if (answers[currentIndex] === index) {
            setAnswers((prev) => {
                const next = { ...prev };
                delete next[currentIndex];
                return next;
            });
        }
    };

    const handleCheckAnswer = async () => {
        if (selectedOption === undefined || !currentQuestion) {
            return;
        }

        try {
            const response = await api.post<AnswerState>("/api/questions/answer", {
                question_id: currentQuestion.id,
                answer: selectedOption,
                time_taken: timeElapsed
            });
            setAnswerStates((prev) => ({ ...prev, [currentIndex]: response.data }));
        } catch (error) {
            console.error("Failed to check answer", error);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-slate-500">Loading questions...</div>;
    }

    if (!currentQuestion) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#f7f7f7] px-6 text-center">
                <h2 className="text-2xl font-semibold text-slate-800">No questions found</h2>
                <p className="text-slate-500 mt-2">Try another section or topic.</p>
                <button
                    onClick={() => router.push("/practice")}
                    className="mt-5 rounded-lg bg-[#00592B] px-5 py-2.5 text-white font-medium hover:bg-[#0c6a37]"
                >
                    Back to Question Bank
                </button>
            </div>
        );
    }

    return (
        <div className={`h-screen overflow-hidden bg-[#f3f3f3] text-[#1f1f1f] ${highlightMode ? "cursor-text" : ""}`}>
            <div className="flex h-full flex-col">
                <header className="h-[84px] shrink-0 border-b border-slate-300 bg-[#f6f6f6] px-3 md:px-6">
                    <div className="relative flex h-full items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => router.push("/practice")}
                                className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                            >
                                <ChevronLeft className="inline-block h-4 w-4" />
                                Back
                            </button>
                            <button className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900">
                                Directions <ChevronDown className="inline-block h-4 w-4" />
                            </button>
                        </div>

                        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="text-sm text-slate-500">Timer</div>
                            {!timerHidden && <div className="font-mono font-semibold text-xl text-slate-800">{formatTime(timeElapsed)}</div>}
                            <button
                                onClick={() => setTimerHidden((prev) => !prev)}
                                className="mt-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                {timerHidden ? <Eye className="inline-block h-3.5 w-3.5 mr-1" /> : <EyeOff className="inline-block h-3.5 w-3.5 mr-1" />}
                                {timerHidden ? "Show" : "Hide"}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => setHighlightMode((prev) => !prev)}
                                className={`rounded-md px-3 py-1.5 font-medium border ${highlightMode
                                        ? "border-yellow-300 bg-yellow-100 text-yellow-800"
                                        : "border-transparent bg-transparent text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                <Highlighter className="inline-block h-4 w-4 mr-1" />
                                Highlight
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex min-h-0 flex-1">
                    <section
                        className="h-full overflow-y-auto bg-white px-6 py-8 md:px-10"
                        style={{ flexBasis: `${leftWidth}%` }}
                        onMouseUp={handleTextSelection}
                    >
                        <div className="max-w-3xl mx-auto">
                            <div className="mb-6 border-b border-slate-300 pb-5 text-[2rem] leading-none font-serif text-slate-700">_</div>
                            <article
                                className="prose max-w-none font-serif text-[1.15rem] leading-[1.8] text-[#1d1d1d] whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
                            />
                        </div>
                    </section>

                    <div
                        className="relative z-10 flex w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-slate-300 bg-[#e9e9e9] hover:bg-[#dcdcdc]"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            isResizing.current = true;
                            document.body.style.cursor = "col-resize";
                        }}
                    >
                        <GripVertical className="h-4 w-4 text-slate-500" />
                    </div>

                    <section className="h-full overflow-y-auto bg-[#f7f7f7] px-4 py-5 md:px-6" style={{ flexBasis: `${100 - leftWidth}%` }}>
                        <div className="mx-auto max-w-3xl">
                            <div className="mb-4 flex items-center justify-between rounded-md border border-slate-300 bg-[#efefef] px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-8 w-8 place-items-center bg-black text-white font-bold">{currentIndex + 1}</div>
                                    <button
                                        onClick={() =>
                                            setMarkedForReview((prev) => ({
                                                ...prev,
                                                [currentIndex]: !prev[currentIndex]
                                            }))
                                        }
                                        className="text-sm font-semibold text-slate-800 hover:text-black"
                                    >
                                        <Flag className="inline-block h-4 w-4 mr-1" />
                                        {markedForReview[currentIndex] ? "Marked" : "Mark for Review"}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <button className="hover:text-slate-800"><VolumeX className="inline-block h-4 w-4 mr-1" />Mute Preppy</button>
                                    <button className="hover:text-slate-800"><Siren className="inline-block h-4 w-4 mr-1" />Report</button>
                                </div>
                            </div>

                            <div className="mb-5 text-[2rem] leading-none font-serif text-slate-700">_</div>
                            <h2 className="mb-5 font-serif text-[2rem] leading-tight text-[#1d1d1d]">Which choice best completes the text?</h2>

                            <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => {
                                    const isSelected = selectedOption === index;
                                    const isEliminated = (eliminated[currentIndex] || []).includes(index);
                                    const letter = String.fromCharCode(65 + index);

                                    let classes = "border-slate-500 bg-[#f9f9f9]";
                                    if (!answerState && isSelected) {
                                        classes = "border-[#00592B] bg-[#ebfff5]";
                                    }
                                    if (!answerState && isEliminated) {
                                        classes = "border-slate-300 bg-[#efefef] opacity-60";
                                    }
                                    if (answerState && index === answerState.correct_answer) {
                                        classes = "border-emerald-600 bg-emerald-50";
                                    }
                                    if (answerState && isSelected && index !== answerState.correct_answer) {
                                        classes = "border-rose-500 bg-rose-50";
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleSelectOption(index)}
                                            className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${classes}`}
                                        >
                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-500 font-semibold">{letter}</span>
                                            <span
                                                className={`flex-1 text-2xl font-serif leading-snug ${isEliminated ? "line-through" : ""}`}
                                                dangerouslySetInnerHTML={{ __html: option }}
                                            />

                                            {answerState ? (
                                                index === answerState.correct_answer ? (
                                                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                                                ) : isSelected ? (
                                                    <XCircle className="h-5 w-5 text-rose-600" />
                                                ) : null
                                            ) : (
                                                <span
                                                    onClick={(event) => toggleEliminate(index, event)}
                                                    className="rounded-full border border-slate-300 bg-white p-1.5 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100"
                                                >
                                                    <Strikethrough className="h-4 w-4" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {answerState?.explanation && (
                                <div className="mt-6 rounded-xl border border-slate-300 bg-white p-4">
                                    <h3 className="font-semibold text-slate-800">Explanation</h3>
                                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{answerState.explanation}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="h-[74px] shrink-0 border-t border-slate-300 bg-[#f6f6f6] px-3 md:px-6">
                    <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
                        <div className="rounded-full bg-[#131313] px-4 py-2 text-sm font-semibold text-white">
                            {Math.min(currentIndex + 1, questions.length)} of {questions.length}
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a20b2]">
                                <MessageCircleQuestion className="inline-block h-4 w-4 mr-1" />
                                Ask Preppy
                            </button>

                            {!answerState && selectedOption !== undefined && (
                                <button
                                    onClick={handleCheckAnswer}
                                    className="rounded-xl bg-[#6ec1ea] px-4 py-2 text-sm font-semibold text-white hover:bg-[#56b1df]"
                                >
                                    Check
                                </button>
                            )}

                            <button
                                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => {
                                    if (currentIndex < questions.length - 1) {
                                        setCurrentIndex((prev) => prev + 1);
                                        return;
                                    }
                                    router.push("/practice");
                                }}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                                {currentIndex < questions.length - 1 ? "Next" : "Finish"}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
