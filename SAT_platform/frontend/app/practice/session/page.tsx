"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ChevronLeft, ChevronDown, CheckCircle, XCircle,
    Clock, EyeOff, Eye, Highlighter, Maximize2, GripVertical,
    Sparkles, Strikethrough
} from "lucide-react";
import api from "@/lib/api";

type Question = {
    id: string;
    section: string;
    domain: string;
    difficulty: string;
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center font-sans tracking-tight text-slate-500">Loading session...</div>}>
            <PracticeSession />
        </Suspense>
    );
}

function PracticeSession() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Config
    const moduleId = searchParams.get("module") || "";
    const isMath = moduleId === "math";

    // Application state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // User progress state (allowing free navigation)
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [answerStates, setAnswerStates] = useState<Record<number, AnswerState>>({});
    const [eliminated, setEliminated] = useState<Record<number, number[]>>({});

    // Presentation state
    const [leftWidth, setLeftWidth] = useState(50);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [timerHidden, setTimerHidden] = useState(false);
    const [highlightMode, setHighlightMode] = useState(false);

    const isResizing = useRef(false);

    // Stop-watch logic
    useEffect(() => {
        if (loading || questions.length === 0) return;
        const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [loading, questions.length]);

    // Initial Fetch
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const sectionFilter = isMath ? 'math' : 'english';
                const response = await api.get(`/api/questions?section=${sectionFilter}&limit=10`);
                setQuestions(response.data);
            } catch (err) {
                console.error("Error fetching questions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [isMath]);

    // Resizer Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = (e.clientX / window.innerWidth) * 100;
            if (newWidth > 30 && newWidth < 70) {
                setLeftWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = 'default';
            }
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleTextSelection = () => {
        if (!highlightMode) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

        try {
            const range = selection.getRangeAt(0);
            const span = document.createElement('mark');
            span.className = 'bg-yellow-300/80 text-black cursor-pointer rounded-sm px-0.5';
            span.title = 'Click to remove highlight';
            span.onclick = function (e) {
                const target = e.currentTarget as HTMLElement;
                const p = target.parentNode as HTMLElement;
                if (p && target.firstChild) {
                    while (target.firstChild) p.insertBefore(target.firstChild, target);
                    p.removeChild(target);
                    p.normalize();
                }
            };
            range.surroundContents(span);
            selection.removeAllRanges();
        } catch (e) {
            console.log("Could not highlight across varying elements", e);
        }
    };

    // Actions
    const handleOptionSelect = (optIndex: number) => {
        if (answerStates[currentIndex]) return; // Locked once checked
        setAnswers(prev => ({ ...prev, [currentIndex]: optIndex }));

        // Auto-uneliminate if selected
        const currentElims = eliminated[currentIndex] || [];
        if (currentElims.includes(optIndex)) {
            setEliminated(prev => ({
                ...prev,
                [currentIndex]: currentElims.filter(i => i !== optIndex)
            }));
        }
    };

    const toggleEliminate = (optIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (answerStates[currentIndex]) return;

        setEliminated(prev => {
            const current = prev[currentIndex] || [];
            if (current.includes(optIndex)) {
                return { ...prev, [currentIndex]: current.filter(i => i !== optIndex) };
            } else {
                return { ...prev, [currentIndex]: [...current, optIndex] };
            }
        });

        if (answers[currentIndex] === optIndex) {
            setAnswers(prev => {
                const next = { ...prev };
                delete next[currentIndex];
                return next;
            });
        }
    };

    const handleCheckAnswer = async () => {
        const selected = answers[currentIndex];
        if (selected === undefined) return;

        try {
            const response = await api.post(`/api/questions/answer`, {
                question_id: questions[currentIndex].id,
                answer: selected,
                time_taken: timeElapsed
            });
            setAnswerStates(prev => ({ ...prev, [currentIndex]: response.data }));
        } catch (err) {
            console.error("Failed to check answer", err);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-sans tracking-tight text-slate-500">Loading Question Bank...</div>;
    }

    if (questions.length === 0) {
        return (
            <div className="flex h-screen flex-col items-center justify-center p-6 text-center font-sans">
                <p className="text-xl font-medium text-slate-500 mb-4">No questions found for this module.</p>
                <button onClick={() => router.push('/practice')} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg">Return to Practice</button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const isChecked = !!answerStates[currentIndex];
    const selectedOption = answers[currentIndex];

    return (
        <div className={"flex flex-col h-screen overflow-hidden antialiased font-sans " + (highlightMode ? 'cursor-text' : '')}>

            {/* Top Navbar */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-2 py-2 md:px-4 md:py-3 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push('/practice')} className="flex items-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors font-medium text-sm">
                        <ChevronLeft className="w-5 h-5 mr-1" /> Go back
                    </button>
                    <button className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors font-medium text-sm">
                        Directions <ChevronDown className="w-4 h-4 opacity-50" />
                    </button>
                </div>

                {/* Stop-watch Timer */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    {!timerHidden && (
                        <div className="flex items-center font-mono font-bold text-xl tracking-tight text-slate-800 mb-0.5">
                            {formatTime(timeElapsed)}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={() => setTimerHidden(!timerHidden)} className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full px-4 py-[3px] text-xs font-semibold uppercase tracking-wider transition-colors border border-slate-200">
                            {timerHidden ? <><Eye className="w-3 h-3 mr-1.5" /> Show</> : <><EyeOff className="w-3 h-3 mr-1.5" /> Hide</>}
                        </button>
                    </div>
                </div>

                {/* Top Right Tools */}
                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={() => setHighlightMode(!highlightMode)}
                        className={"flex items-center gap-2 rounded-lg px-3 md:px-4 py-2 font-medium text-sm transition-colors border " + (highlightMode ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-inner' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100')}
                    >
                        <Highlighter className={"w-4 h-4 md:w-5 md:h-5 " + (highlightMode ? 'fill-yellow-300' : '')} />
                        <span className="hidden md:inline">Highlight</span>
                    </button>
                    <button className="hidden md:flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors border border-transparent">
                        <Maximize2 className="w-5 h-5" />
                        <span>Fullscreen</span>
                    </button>
                </div>
            </div>

            {/* Split Screen Workspace */}
            <div className="flex-1 flex min-h-0 bg-slate-50">

                {/* Left Panel: Passage Text */}
                <div
                    className="h-full overflow-y-auto bg-white p-6 md:p-10 relative"
                    style={{ flexBasis: `${leftWidth}%` }}
                    onMouseUp={handleTextSelection}
                >
                    <div className="max-w-2xl mx-auto">
                        <div className="mb-4 inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 uppercase tracking-widest border border-slate-200/60">
                            Question {currentIndex + 1}
                        </div>
                        <div
                            className="prose prose-slate max-w-none font-serif text-[1.10rem] leading-[1.85] text-slate-800 whitespace-pre-wrap selection:bg-blue-200"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
                        />
                    </div>
                </div>

                {/* Right Panel: Options & Actions */}
                <div className="relative w-1.5 md:w-2 bg-slate-200 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize shrink-0 flex items-center justify-center transition-colors shadow-sm z-20 group"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        isResizing.current = true;
                        document.body.style.cursor = 'col-resize';
                    }}>
                    <div className="w-4 h-8 bg-white border border-slate-300 rounded shadow-sm flex items-center justify-center group-hover:border-blue-400">
                        <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                    </div>
                </div>

                <div
                    className="h-full overflow-y-auto bg-[#f8f9fa] p-6 md:p-10"
                    style={{ flexBasis: `${100 - leftWidth}%` }}
                >
                    <div className="max-w-xl mx-auto flex flex-col h-full">

                        <div className="flex-1 space-y-3">
                            {currentQuestion.options.map((opt, i) => {
                                const isSel = answers[currentIndex] === i;
                                const isElim = (eliminated[currentIndex] || []).includes(i);
                                const answerObj = answerStates[currentIndex];

                                let containerProps = "bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-sm text-slate-700";
                                let letterProps = "border-slate-300 text-slate-500";

                                if (isElim && !isChecked) {
                                    containerProps = "bg-transparent border-2 border-slate-200 opacity-40 grayscale-[50%]";
                                    letterProps = "border-slate-300 text-slate-400";
                                }
                                else if (isSel && !answerObj) {
                                    containerProps = "bg-blue-50 border-2 border-blue-500 shadow-md ring-4 ring-blue-500/10 text-slate-900";
                                    letterProps = "border-blue-500 bg-blue-600 text-white font-bold";
                                }

                                if (answerObj) {
                                    if (i === answerObj.correct_answer) {
                                        containerProps = "bg-green-50 border-2 border-green-500 shadow-md text-green-950 font-medium";
                                        letterProps = "border-green-500 bg-green-500 text-white";
                                    } else if (isSel && i !== answerObj.correct_answer) {
                                        containerProps = "bg-red-50 border-2 border-red-400 text-red-950 opacity-90";
                                        letterProps = "border-red-400 bg-red-400 text-white";
                                    } else {
                                        containerProps = "bg-white border-2 border-slate-200 opacity-60";
                                        letterProps = "border-slate-200 text-slate-400";
                                    }
                                }

                                const letter = String.fromCharCode(65 + i);

                                return (
                                    <div
                                        key={i}
                                        onClick={() => handleOptionSelect(i)}
                                        className={"relative group flex min-h-[4rem] items-center rounded-xl p-4 px-5 transition-all outline-none cursor-pointer select-none " + (containerProps)}
                                    >
                                        <div className={"flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm shrink-0 mr-4 transition-colors " + (letterProps)}>
                                            {letter}
                                        </div>

                                        <div className={"flex-1 text-[1.05rem] leading-snug break-words " + (isElim ? 'line-through decoration-2 decoration-slate-400/70' : '')} dangerouslySetInnerHTML={{ __html: opt }} />

                                        <div className="ml-3 shrink-0 flex items-center">
                                            {answerObj ? (
                                                i === answerObj.correct_answer ? <CheckCircle className="w-6 h-6 text-green-500" /> :
                                                    isSel ? <XCircle className="w-6 h-6 text-red-500" /> : null
                                            ) : (
                                                <button
                                                    tabIndex={-1}
                                                    onClick={(e) => toggleEliminate(i, e)}
                                                    className={"w-8 h-8 flex items-center justify-center rounded-full transition-colors border outline-none " +
                                                        (isElim ? 'bg-slate-200 border-slate-300 text-slate-600' : 'bg-white border-slate-200 text-slate-300 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-100 opacity-0 group-hover:opacity-100')
                                                    }
                                                >
                                                    <Strikethrough className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {isChecked && answerStates[currentIndex]?.explanation && (
                            <div className="mt-8 p-5 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h4 className="font-bold text-slate-800 flex items-center mb-3">
                                    Explanation
                                </h4>
                                <div className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: answerStates[currentIndex].explanation }} />

                                <button className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm">
                                    <Sparkles className="w-4 h-4" /> Ask AI Tutor to clarify
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 md:px-8 z-10">
                <div className="hidden md:block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {currentQuestion.domain}
                </div>

                <div className="flex-1 flex items-center justify-end gap-3 w-full">
                    {!isChecked && selectedOption !== undefined && (
                        <button
                            onClick={handleCheckAnswer}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold rounded-xl px-8 py-2.5 transition active:scale-95"
                        >
                            Check Answer
                        </button>
                    )}

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <button
                            onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                            disabled={currentIndex === 0}
                            className="bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none font-semibold rounded-xl px-5 py-2 transition"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                if (currentIndex < questions.length - 1) setCurrentIndex(p => p + 1);
                                else router.push('/practice');
                            }}
                            className="bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 font-semibold rounded-xl px-8 py-2 transition active:scale-95 flex items-center"
                        >
                            {currentIndex < questions.length - 1 ? 'Next' : 'Finish'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}