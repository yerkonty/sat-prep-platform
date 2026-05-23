"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Clock,
    Flag,
    GripVertical,
    Highlighter,
    Shuffle,
    Strikethrough,
    X,
    XCircle
} from "lucide-react";
import api from "@/lib/api";
import { renderMath, renderContentBlocks } from "@/lib/renderMath";

type Question = {
    id: string;
    external_id?: string;
    section?: string;
    type?: string;
    domain?: string;
    skill?: string;
    difficulty?: string;
    content: string;
    options: string[];
    explanation?: string;
    image?: string | null;
};

type AnswerState = {
    is_correct: boolean;
    correct_answer: number;
    correct_answer_text?: string | null;
    explanation: string;
};

type ParsedQuestionContent = {
    passageHtml: string;
    prompt: string;
};

const DEFAULT_PROMPT = "Choose the best answer.";

function splitQuestionContent(rawContent: string): ParsedQuestionContent {
    const raw = (rawContent || "").trim();
    if (!raw) {
        return { passageHtml: "", prompt: DEFAULT_PROMPT };
    }

    const paragraphs = raw
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

    const promptSignals = [/which choice/i, /what choice/i, /according to/i, /based on/i, /the student wants/i, /which quotation/i];

    const isLikelyPrompt = (text: string) => text.endsWith("?") && promptSignals.some((regex) => regex.test(text));

    if (paragraphs.length > 1 && isLikelyPrompt(paragraphs[paragraphs.length - 1])) {
        return {
            passageHtml: paragraphs.slice(0, -1).join("\n\n"),
            prompt: paragraphs[paragraphs.length - 1]
        };
    }

    const trailingPromptMatch = raw.match(
        /(Which choice[\s\S]*?\?|What choice[\s\S]*?\?|According to[\s\S]*?\?|Based on[\s\S]*?\?|The student wants[\s\S]*?\?|Which quotation[\s\S]*?\?)\s*$/i
    );

    if (trailingPromptMatch && trailingPromptMatch.index !== undefined) {
        const prompt = trailingPromptMatch[1].trim();
        const passage = raw.slice(0, trailingPromptMatch.index).trim();
        return {
            passageHtml: passage || raw,
            prompt: prompt || DEFAULT_PROMPT
        };
    }

    return {
        passageHtml: raw,
        prompt: DEFAULT_PROMPT
    };
}

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
    const difficulty = searchParams.get("difficulty") || "";
    const questionId = searchParams.get("question_id") || "";

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
    const [answerStates, setAnswerStates] = useState<Record<number, AnswerState>>({});
    const [eliminated, setEliminated] = useState<Record<number, number[]>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [navigatorOpen, setNavigatorOpen] = useState(false);
    const [shuffleMode, setShuffleMode] = useState(false);

    const [leftWidth, setLeftWidth] = useState(47);
    const [highlightMode, setHighlightMode] = useState(false);
    const [timerHidden, setTimerHidden] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [calcOpen, setCalcOpen] = useState(false);
    const [calcPos, setCalcPos] = useState({ x: 0, y: 0 });
    const [calcSize, setCalcSize] = useState({ w: 560, h: 440 });
    const [calcInteracting, setCalcInteracting] = useState(false);
    const isDraggingCalc = useRef(false);
    const isResizingCalc = useRef(false);
    const calcDragOffset = useRef({ x: 0, y: 0 });
    const calcResizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    const isResizing = useRef(false);

    const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
    const selectedOption = answers[currentIndex];
    const answerState = answerStates[currentIndex];
    const parsedQuestion = useMemo(
        () => splitQuestionContent(currentQuestion?.content || ""),
        [currentQuestion?.content]
    );
    const isMath = moduleId === "math" || currentQuestion?.section === "math";
    // Student-Produced Response (SPR) — questions without A/B/C/D choices.
    // Stored in the DB with a single option holding the correct answer string.
    const isFreeResponse = !!currentQuestion && (currentQuestion.options?.length ?? 0) <= 1;
    const textAnswer = textAnswers[currentIndex] ?? "";

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

                if (difficulty) {
                    params.set("difficulty", difficulty);
                }

                if (questionId) {
                    params.set("question_id", questionId);
                }

                const response = await api.get<Question[]>(`/api/questions?${params.toString()}`);
                setQuestions(response.data || []);
                setCurrentIndex(0);
                setAnswers({});
                setTextAnswers({});
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
    }, [moduleId, domain, skill, difficulty, questionId]);

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

    // Set calculator position to bottom-right when first opened
    useEffect(() => {
        if (calcOpen) {
            setCalcPos({
                x: Math.max(0, window.innerWidth - calcSize.w - 24),
                y: Math.max(0, window.innerHeight - calcSize.h - 88),
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcOpen]);

    // Calculator drag + resize via mouse events
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDraggingCalc.current) {
                setCalcPos({
                    x: Math.max(0, e.clientX - calcDragOffset.current.x),
                    y: Math.max(0, e.clientY - calcDragOffset.current.y),
                });
            }
            if (isResizingCalc.current) {
                const dx = e.clientX - calcResizeStart.current.x;
                const dy = e.clientY - calcResizeStart.current.y;
                setCalcSize({
                    w: Math.max(320, calcResizeStart.current.w + dx),
                    h: Math.max(240, calcResizeStart.current.h + dy),
                });
            }
        };
        const onMouseUp = () => {
            if (isDraggingCalc.current || isResizingCalc.current) {
                isDraggingCalc.current = false;
                isResizingCalc.current = false;
                setCalcInteracting(false);
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
        const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
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

    const remapByPermutation = <T,>(
        record: Record<number, T>,
        oldToNewIndex: Map<number, number>
    ): Record<number, T> => {
        const next: Record<number, T> = {};
        for (const [oldIdxStr, value] of Object.entries(record)) {
            const oldIdx = Number(oldIdxStr);
            const newIdx = oldToNewIndex.get(oldIdx);
            if (newIdx !== undefined) {
                next[newIdx] = value;
            }
        }
        return next;
    };

    const reorderQuestions = (newOrder: Question[]) => {
        const idToNewIndex = new Map<string, number>();
        newOrder.forEach((q, i) => idToNewIndex.set(q.id, i));

        const oldToNewIndex = new Map<number, number>();
        questions.forEach((q, oldIdx) => {
            const newIdx = idToNewIndex.get(q.id);
            if (newIdx !== undefined) {
                oldToNewIndex.set(oldIdx, newIdx);
            }
        });

        const currentId = currentQuestion?.id;
        setQuestions(newOrder);
        setAnswers((prev) => remapByPermutation(prev, oldToNewIndex));
        setTextAnswers((prev) => remapByPermutation(prev, oldToNewIndex));
        setAnswerStates((prev) => remapByPermutation(prev, oldToNewIndex));
        setEliminated((prev) => remapByPermutation(prev, oldToNewIndex));
        setMarkedForReview((prev) => remapByPermutation(prev, oldToNewIndex));
        if (currentId) {
            const newCurrent = idToNewIndex.get(currentId);
            if (newCurrent !== undefined) {
                setCurrentIndex(newCurrent);
            }
        }
    };

    const handleShuffle = () => {
        const shuffled = [...questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        reorderQuestions(shuffled);
    };

    const handleJumpToQuestion = (index: number) => {
        setCurrentIndex(index);
        setNavigatorOpen(false);
    };

    const handleCheckAnswer = async () => {
        if (!currentQuestion) {
            return;
        }
        if (isFreeResponse) {
            if (!textAnswer.trim()) {
                return;
            }
        } else if (selectedOption === undefined) {
            return;
        }

        try {
            const payload: Record<string, unknown> = {
                question_id: currentQuestion.id,
                time_taken: timeElapsed,
            };
            if (isFreeResponse) {
                payload.answer_text = textAnswer.trim();
            } else {
                payload.answer = selectedOption;
            }
            const response = await api.post<AnswerState>("/api/questions/answer", payload);
            setAnswerStates((prev) => {
                const next = { ...prev, [currentIndex]: response.data };
                if (shuffleMode) {
                    const unchecked: number[] = [];
                    for (let i = 0; i < questions.length; i++) {
                        if (i !== currentIndex && next[i] === undefined) {
                            unchecked.push(i);
                        }
                    }
                    if (unchecked.length > 0) {
                        const target = unchecked[Math.floor(Math.random() * unchecked.length)];
                        setTimeout(() => setCurrentIndex(target), 900);
                    }
                }
                return next;
            });
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
        <div className={`h-screen overflow-hidden bg-white text-[#1a1a1a] ${highlightMode ? "cursor-text" : ""}`}>
            <div className="flex h-full flex-col">

                {/* ── Header ── */}
                <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-4">
                    <div className="flex h-full items-center justify-between">
                        {/* Left */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push("/practice")}
                                className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                        </div>

                        {/* Center — Timer */}
                        <button
                            onClick={() => setTimerHidden((prev) => !prev)}
                            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors font-mono"
                        >
                            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            {timerHidden ? "--:--:--" : formatTime(timeElapsed)}
                        </button>

                        {/* Right */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setHighlightMode((prev) => !prev)}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    highlightMode
                                        ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Highlighter className="h-3.5 w-3.5" />
                                Annotate
                            </button>
                            {isMath && (
                                <button
                                    onClick={() => setCalcOpen((prev) => !prev)}
                                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        calcOpen
                                            ? "border-[#00592B] bg-[#00592B] text-white"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    Calculator
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Main ── */}
                <main className="flex min-h-0 flex-1">

                    {/* Left — Passage (RW only) */}
                    {!isMath && (
                        <>
                            <section
                                className="h-full overflow-y-auto bg-white px-8 py-8 md:px-12"
                                style={{ flexBasis: `${leftWidth}%` }}
                                onMouseUp={handleTextSelection}
                            >
                                <div className="max-w-2xl mx-auto">
                                    <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Passage</p>
                                    {currentQuestion.image && (
                                        <div className="flex justify-center rounded-lg bg-slate-50 border border-slate-100 p-3 mb-6">
                                            <img
                                                src={`data:image/png;base64,${currentQuestion.image}`}
                                                alt="Question figure"
                                                className="max-h-64 w-auto object-contain"
                                            />
                                        </div>
                                    )}
                                    <article className="prose max-w-none font-serif text-[1rem] md:text-[1.06rem] leading-[1.75] text-[#1d1d1d]">
                                        {parsedQuestion.passageHtml.split(/\n\n+/).filter(Boolean).map((para, i) => (
                                            <p key={i} dangerouslySetInnerHTML={{ __html: renderMath(para.replace(/\n/g, "<br />")) }} />
                                        ))}
                                    </article>
                                </div>
                            </section>
                            <div
                                className="relative z-10 flex w-[3px] shrink-0 cursor-col-resize items-center justify-center bg-slate-200 hover:bg-slate-300 transition-colors"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    isResizing.current = true;
                                    document.body.style.cursor = "col-resize";
                                }}
                            >
                                <GripVertical className="h-4 w-4 text-slate-400" />
                            </div>
                        </>
                    )}

                    {/* Right — Question (or full-width for math) */}
                    <section
                        className="h-full overflow-y-auto bg-white px-6 py-6 md:px-8"
                        style={{ flexBasis: isMath ? "100%" : `${100 - leftWidth}%` }}
                    >
                        <div className="mx-auto max-w-2xl">

                            {/* Question toolbar */}
                            <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[#1a1a1a] text-sm font-bold text-white">
                                    {currentIndex + 1}
                                </div>
                                <button
                                    onClick={() =>
                                        setMarkedForReview((prev) => ({
                                            ...prev,
                                            [currentIndex]: !prev[currentIndex]
                                        }))
                                    }
                                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        markedForReview[currentIndex]
                                            ? "border-amber-400 bg-amber-50 text-amber-700"
                                            : "border-transparent text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Flag className={`h-3.5 w-3.5 ${markedForReview[currentIndex] ? "fill-amber-500 text-amber-500" : ""}`} />
                                    {markedForReview[currentIndex] ? "Marked" : "Mark for Review"}
                                </button>
                                <span className="text-slate-200">|</span>
                                <span className="text-xs font-semibold text-slate-500">Eliminate</span>
                                {currentQuestion.external_id && (
                                    <>
                                        <span className="ml-auto font-mono text-[10px] text-slate-300">
                                            ID: {currentQuestion.external_id}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Math: image (graph/diagram) + question content */}
                            {isMath && (
                                <div className="mb-6 space-y-4">
                                    {currentQuestion.image && (
                                        <div className="flex justify-center rounded-lg bg-white p-2">
                                            <img
                                                src={`data:image/png;base64,${currentQuestion.image}`}
                                                alt="Question diagram"
                                                className="max-h-72 w-auto object-contain"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className="space-y-3 text-[1rem] leading-[1.7] text-[#1a1a1a] [&_p]:m-0 [&_table]:my-3"
                                        dangerouslySetInnerHTML={{ __html: renderContentBlocks(currentQuestion.content) }}
                                    />

                                </div>
                            )}

                            {/* RW: show question prompt only */}
                            {!isMath && (
                                <p className="mb-6 text-[1.05rem] font-medium leading-[1.65] text-[#1a1a1a]"
                                    dangerouslySetInnerHTML={{ __html: renderMath(parsedQuestion.prompt) }}
                                />
                            )}

                            {/* Free-response input (Area and volume) */}
                            {isFreeResponse && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={textAnswer}
                                        onChange={(e) =>
                                            setTextAnswers((prev) => ({
                                                ...prev,
                                                [currentIndex]: e.target.value,
                                            }))
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !answerState) {
                                                e.preventDefault();
                                                handleCheckAnswer();
                                            }
                                        }}
                                        disabled={!!answerState}
                                        placeholder="Enter your answer (e.g., 5.566, -5.566, 2/3, -2/3)"
                                        className={`w-full rounded-xl border bg-white px-4 py-3 text-[0.95rem] text-slate-800 outline-none transition-colors ${
                                            answerState
                                                ? answerState.is_correct
                                                    ? "border-emerald-400 bg-emerald-50"
                                                    : "border-rose-400 bg-rose-50"
                                                : "border-slate-300 focus:border-slate-800"
                                        }`}
                                    />
                                    {answerState && (
                                        <div className="flex items-center gap-2 text-sm">
                                            {answerState.is_correct ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                    <span className="font-semibold text-emerald-700">Correct</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-4 w-4 text-rose-500" />
                                                    <span className="font-semibold text-rose-700">Incorrect</span>
                                                    {answerState.correct_answer_text && (
                                                        <span className="text-slate-600">
                                                            — correct answer:{" "}
                                                            <span
                                                                className="font-semibold text-slate-900"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: renderMath(answerState.correct_answer_text),
                                                                }}
                                                            />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Answer options */}
                            {!isFreeResponse && (
                            <div className="space-y-2.5">
                                {currentQuestion.options.map((option, index) => {
                                    const isSelected = selectedOption === index;
                                    const isEliminated = (eliminated[currentIndex] || []).includes(index);
                                    const letter = String.fromCharCode(65 + index);

                                    let cardClass = "border-slate-200 bg-white hover:border-slate-400";
                                    let circleClass = "border-slate-300 text-slate-600 bg-white";

                                    if (!answerState && isSelected) {
                                        cardClass = "border-slate-800 bg-white";
                                        circleClass = "border-slate-800 bg-slate-800 text-white";
                                    }
                                    if (!answerState && isEliminated) {
                                        cardClass = "border-slate-200 bg-slate-50 opacity-50";
                                    }
                                    if (answerState && index === answerState.correct_answer) {
                                        cardClass = "border-emerald-400 bg-emerald-50";
                                        circleClass = "border-emerald-500 bg-emerald-500 text-white";
                                    }
                                    if (answerState && isSelected && index !== answerState.correct_answer) {
                                        cardClass = "border-rose-400 bg-rose-50";
                                        circleClass = "border-rose-400 bg-rose-400 text-white";
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleSelectOption(index)}
                                            className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all ${cardClass}`}
                                        >
                                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors ${circleClass}`}>
                                                {letter}
                                            </span>
                                            <span
                                                className={`flex-1 text-[0.95rem] leading-[1.55] text-slate-800 ${isEliminated ? "line-through text-slate-400" : ""}`}
                                                dangerouslySetInnerHTML={{ __html: renderMath(option) }}
                                            />
                                            {answerState ? (
                                                index === answerState.correct_answer ? (
                                                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                                ) : isSelected ? (
                                                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                                ) : null
                                            ) : (
                                                <span
                                                    onClick={(event) => toggleEliminate(index, event)}
                                                    className="shrink-0 rounded-full border border-slate-200 p-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-slate-400"
                                                >
                                                    <Strikethrough className="h-3.5 w-3.5" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            )}

                            {/* Explanation */}
                            {answerState?.explanation && (
                                <div className={`mt-6 rounded-xl border p-5 ${
                                    answerState.is_correct
                                        ? "border-emerald-200 bg-emerald-50"
                                        : "border-rose-200 bg-rose-50"
                                }`}>
                                    <h3 className={`mb-2 text-sm font-bold ${
                                        answerState.is_correct ? "text-emerald-800" : "text-rose-800"
                                    }`}>
                                        {answerState.is_correct ? "Correct — Explanation" : "Your answer is incorrect — Explanation"}
                                    </h3>
                                    <div className="space-y-2">
                                        {answerState.explanation.split(/\n\n+/).filter(Boolean).map((para, i) => (
                                            <p key={i} className="text-sm leading-[1.7] text-slate-700"
                                                dangerouslySetInnerHTML={{ __html: renderMath(para.replace(/\n/g, " ")) }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                {/* ── Footer ── */}
                <footer className="h-[68px] shrink-0 border-t border-slate-200 bg-white px-6">
                    <div className="flex h-full items-center justify-between">

                        {/* Left — Previous */}
                        <button
                            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>

                        {/* Center — Progress + Question counter */}
                        <div className="flex flex-col items-center gap-1">
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <CheckCircle className="h-3 w-3 text-[#00592B]" />
                                Progress: {Object.keys(answerStates).length} of {questions.length} questions checked
                            </p>
                            <button
                                onClick={() => setNavigatorOpen(true)}
                                className="group relative flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-1.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:scale-[1.04] hover:bg-black hover:shadow-md active:scale-[0.97]"
                                title="Jump to a question or toggle shuffle"
                            >
                                <span className="grid h-4 w-4 place-items-center rounded-sm bg-white/15 text-[10px] font-bold transition-colors group-hover:bg-white/25">
                                    #
                                </span>
                                Question {currentIndex + 1} of {questions.length}
                                {shuffleMode && (
                                    <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                                        <Shuffle className="h-3 w-3" />
                                        On
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Right — Check + Next */}
                        <div className="flex items-center gap-2">
                            {!answerState && (isFreeResponse ? textAnswer.trim().length > 0 : selectedOption !== undefined) && (
                                <button
                                    onClick={handleCheckAnswer}
                                    className="flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Check
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (shuffleMode) {
                                        const unchecked: number[] = [];
                                        for (let i = 0; i < questions.length; i++) {
                                            if (i !== currentIndex && answerStates[i] === undefined) {
                                                unchecked.push(i);
                                            }
                                        }
                                        if (unchecked.length > 0) {
                                            setCurrentIndex(unchecked[Math.floor(Math.random() * unchecked.length)]);
                                            return;
                                        }
                                        router.push("/practice");
                                        return;
                                    }
                                    if (currentIndex < questions.length - 1) {
                                        setCurrentIndex((prev) => prev + 1);
                                        return;
                                    }
                                    router.push("/practice");
                                }}
                                className="flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                {shuffleMode
                                    ? (Object.keys(answerStates).length >= questions.length - (answerStates[currentIndex] ? 0 : 1) ? "Finish" : "Next")
                                    : (currentIndex < questions.length - 1 ? "Next" : "Finish")}
                                {shuffleMode ? <Shuffle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </footer>

            </div>

            {/* ── Question Navigator ── */}
            {navigatorOpen && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setNavigatorOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Jump to question</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {questions.length} questions · {Object.keys(answerStates).length} checked
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShuffleMode((v) => !v)}
                                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                        shuffleMode
                                            ? "border-amber-400 bg-amber-50 text-amber-800"
                                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                    }`}
                                    title="When on, after you check an answer, jump to a random unchecked question"
                                >
                                    <Shuffle className="h-3.5 w-3.5" />
                                    Shuffle mode: {shuffleMode ? "On" : "Off"}
                                </button>
                                <button
                                    onClick={handleShuffle}
                                    className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    title="Reorder the question list randomly"
                                >
                                    Shuffle order
                                </button>
                                <button
                                    onClick={() => setNavigatorOpen(false)}
                                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto px-5 py-4">
                            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
                                {questions.map((q, i) => {
                                    const label = String(i + 1);
                                    const state = answerStates[i];
                                    const isCurrent = i === currentIndex;
                                    const isMarked = !!markedForReview[i];
                                    const isAnsweredUnchecked =
                                        !state && (answers[i] !== undefined || (textAnswers[i] || "").trim().length > 0);

                                    let cls = "border-slate-200 bg-white text-slate-700 hover:border-slate-400";
                                    if (state?.is_correct) {
                                        cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
                                    } else if (state && !state.is_correct) {
                                        cls = "border-rose-400 bg-rose-50 text-rose-800";
                                    } else if (isAnsweredUnchecked) {
                                        cls = "border-slate-400 bg-slate-100 text-slate-800";
                                    }
                                    if (isCurrent) {
                                        cls += " ring-2 ring-offset-1 ring-[#00592B]";
                                    }

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => handleJumpToQuestion(i)}
                                            className={`relative h-10 rounded-lg border text-sm font-semibold transition-colors ${cls}`}
                                            title={q.skill || q.domain || `Question ${label}`}
                                        >
                                            {label}
                                            {isMarked && (
                                                <Flag className="absolute -top-1 -right-1 h-3 w-3 fill-amber-500 text-amber-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-emerald-400 bg-emerald-50" /> Correct</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-rose-400 bg-rose-50" /> Incorrect</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-slate-400 bg-slate-100" /> Selected, unchecked</span>
                            <span className="flex items-center gap-1.5"><Flag className="h-3 w-3 fill-amber-500 text-amber-500" /> Marked</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Desmos Calculator (math only) ── */}
            {isMath && calcOpen && (
                <div
                    style={{
                        position: "fixed",
                        left: `${calcPos.x}px`,
                        top: `${calcPos.y}px`,
                        width: `${calcSize.w}px`,
                        height: `${calcSize.h}px`,
                        zIndex: 200,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    {/* Drag handle — title bar */}
                    <div
                        onMouseDown={(e) => {
                            e.preventDefault();
                            isDraggingCalc.current = true;
                            calcDragOffset.current = { x: e.clientX - calcPos.x, y: e.clientY - calcPos.y };
                            setCalcInteracting(true);
                            document.body.style.cursor = "grabbing";
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 14px",
                            background: "#1a1a1a",
                            borderRadius: "11px 11px 0 0",
                            flexShrink: 0,
                            cursor: "grab",
                            userSelect: "none",
                        }}
                    >
                        <span style={{ color: "white", fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em" }}>
                            Desmos Graphing Calculator
                        </span>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setCalcOpen(false)}
                            style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 2px" }}
                        >
                            ×
                        </button>
                    </div>
                    <iframe
                        src="https://www.desmos.com/calculator"
                        style={{
                            flex: 1,
                            border: "none",
                            display: "block",
                            pointerEvents: calcInteracting ? "none" : "auto",
                        }}
                        title="Desmos Graphing Calculator"
                        allow="fullscreen"
                    />
                    {/* Resize handle — bottom-right corner */}
                    <div
                        onMouseDown={(e) => {
                            e.preventDefault();
                            isResizingCalc.current = true;
                            calcResizeStart.current = { x: e.clientX, y: e.clientY, w: calcSize.w, h: calcSize.h };
                            setCalcInteracting(true);
                            document.body.style.cursor = "se-resize";
                        }}
                        style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            width: "20px",
                            height: "20px",
                            cursor: "se-resize",
                            background: "linear-gradient(135deg, transparent 50%, #cbd5e1 50%)",
                            borderBottomRightRadius: "11px",
                        }}
                    />
                </div>
            )}
        </div>
    );
}
