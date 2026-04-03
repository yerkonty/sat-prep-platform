"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Calculator, Search, Filter,
    ChevronDown, ChevronRight, Clock, Bookmark,
    CheckCircle, Target, Flame, Lightbulb, Hexagon,
    Percent, FunctionSquare, TriangleRight, BarChart3,
    MessageSquareQuote, BookType, Quote, AlignLeft,
    ListTree
} from "lucide-react";
import Link from 'next/link';

const categories = [
    {
        id: "rw",
        title: "Reading & Writing",
        totalQuestions: 1587,
        icon: BookOpen,
        color: "emerald",
        bgClass: "bg-fuchsia-600",
        textClass: "text-fuchsia-600",
        topics: [
            {
                id: "cas",
                name: "Craft and Structure",
                count: 412,
                skills: [
                    { name: "Cross-Text Connections", count: 56 },
                    { name: "Text Structure and Purpose", count: 130 },
                    { name: "Words in Context", count: 226 }
                ]
            },
            {
                id: "eoi",
                name: "Expression of Ideas",
                count: 343,
                skills: [
                    { name: "Rhetorical Synthesis", count: 182 },
                    { name: "Transitions", count: 161 }
                ]
            },
            {
                id: "ini",
                name: "Information and Ideas",
                count: 475,
                skills: [
                    { name: "Central Ideas and Details", count: 116 },
                    { name: "Command of Evidence", count: 242 },
                    { name: "Inferences", count: 117 }
                ]
            },
            {
                id: "sec",
                name: "Standard English Conventions",
                count: 357,
                skills: [
                    { name: "Boundaries", count: 180 },
                    { name: "Form, Structure, and Sense", count: 177 }
                ]
            }
        ]
    },
    {
        id: "math",
        title: "Math",
        totalQuestions: 1700,
        icon: Calculator,
        color: "emerald",
        bgClass: "bg-emerald-600",
        textClass: "text-emerald-600",
        topics: [
            {
                id: "alg",
                name: "Algebra",
                count: 569,
                skills: [
                    { name: "Linear equations in one variable", count: 106 },
                    { name: "Linear functions", count: 152 },
                    { name: "Linear equations in two variables", count: 126 },
                    { name: "Systems of two linear equations in two variables", count: 112 },
                    { name: "Linear inequalities in one or two variables", count: 73 }
                ]
            },
            {
                id: "adv_math",
                name: "Advanced Math",
                count: 479,
                skills: [
                    { name: "Equivalent expressions", count: 102 },
                    { name: "Nonlinear equations in one var & systems in two", count: 148 },
                    { name: "Nonlinear functions", count: 229 }
                ]
            },
            {
                id: "psda",
                name: "Problem-Solving and Data Analysis",
                count: 383,
                skills: [
                    { name: "Ratios, rates, proportional relationships, units", count: 86 },
                    { name: "Percentages", count: 78 },
                    { name: "One-variable data: distributions, center, spread", count: 74 },
                    { name: "Two-variable data: models and scatterplots", count: 63 },
                    { name: "Probability and conditional probability", count: 46 },
                    { name: "Inference from sample stats & margin of error", count: 25 },
                    { name: "Evaluating statistical claims", count: 11 }
                ]
            },
            {
                id: "geo_trig",
                name: "Geometry and Trigonometry",
                count: 269,
                skills: [
                    { name: "Area and volume", count: 86 },
                    { name: "Lines, angles, and triangles", count: 79 },
                    { name: "Right triangles and trigonometry", count: 54 },
                    { name: "Circles", count: 50 }
                ]
            }
        ]
    }
];

export default function QuestionBank() {
    const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

    const toggleTopic = (topicId: string) => {
        setExpandedTopics((prev) => ({
            ...prev,
            [topicId]: !prev[topicId]
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-32">

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-12 mb-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-sm border border-emerald-500 shadow-emerald-600/20">
                            <DatabaseIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">Question Bank</h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-wrap items-center gap-3">
                    <button className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-emerald-600 bg-white rounded-xl font-medium text-emerald-700 hover:bg-emerald-50 transition-colors h-11 w-full md:w-auto">
                        <Filter className="w-5 h-5" /> Filters
                        <ChevronDown className="w-4 h-4 opacity-70" />
                    </button>

                    <div className="flex items-center gap-2 px-3 h-11 bg-white border-2 border-slate-200 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                            Select multiple topics
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in ml-1">
                                <input type="checkbox" name="toggle" id="toggle1" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-200 transition-transform duration-200 ease-in-out z-10" />
                                <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-5 rounded-full bg-slate-200 cursor-pointer"></label>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 px-3 h-11 bg-white border-2 border-slate-200 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                            Randomize order
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in ml-1">
                                <input type="checkbox" name="toggle" id="toggle2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-200 transition-transform duration-200 ease-in-out z-10" />
                                <label htmlFor="toggle2" className="toggle-label block overflow-hidden h-5 rounded-full bg-slate-200 cursor-pointer"></label>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 px-3 h-11 bg-white border-2 border-slate-200 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                            Show previous attempts
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in ml-1">
                                <input type="checkbox" defaultChecked name="toggle" id="toggle3" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-emerald-600 translate-x-5 transition-transform duration-200 ease-in-out z-10" />
                                <label htmlFor="toggle3" className="toggle-label block overflow-hidden h-5 rounded-full bg-emerald-600 cursor-pointer"></label>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {['Question Group', 'Difficulty', 'Time Spent', 'Saved', 'Completed', 'Answer Status'].map(filter => (
                        <button key={filter} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 transition-all border border-transparent hover:border-slate-300">
                            {filter === 'Saved' && <Bookmark className="w-4 h-4 opacity-60" />}
                            {filter === 'Completed' && <CheckCircle className="w-4 h-4 opacity-60" />}
                            {filter} <ChevronDown className="w-4 h-4 opacity-50" />
                        </button>
                    ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
          .toggle-checkbox:checked {
            right: 0;
            border-color: #059669;
            transform: translateX(1.25rem);
          }
          .toggle-checkbox:checked + .toggle-label {
            background-color: #059669;
          }
          .toggle-checkbox {
             right: 1.25rem;
          }
        `}} />
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {categories.map((category) => (
                        <div key={category.id} className="flex flex-col">

                            <Link href={`/practice/session?module=${category.id}`} className="relative mb-2 w-full flex items-center justify-between rounded-2xl px-6 py-5 bg-fuchsia-600 text-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight decoration-white/50 underline-offset-4 hover:underline">{category.title}</h2>
                                    <p className="text-white/90 font-medium text-sm mt-1">{category.totalQuestions} questions</p>
                                </div>
                                <button className="bg-white text-slate-900 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm active:scale-95">
                                    Review All Topics
                                </button>
                            </Link>

                            <ul className="px-4 py-2 space-y-4">
                                {category.topics.map((topic) => (
                                    <li key={topic.id} className="w-full">
                                        <Link href={`/practice/session?module=${category.id}&topic=${topic.id}`} className="flex items-center group transition-colors cursor-pointer py-1">
                                            <h3 className="font-bold text-xl text-slate-900 group-hover:decoration-slate-50 underline-offset-4 group-hover:underline transition-all">
                                                {topic.name}
                                            </h3>
                                            <div className="ml-auto flex items-center gap-2">
                                                <span className="text-slate-500 font-medium text-sm">
                                                    {topic.count} questions
                                                </span>
                                            </div>
                                        </Link>

                                        <ul className="mt-3 mb-6 space-y-2 border-l-2 border-slate-100 ml-2 pl-4">
                                            {topic.skills.map((skill, idx) => (
                                                <li key={idx} className="w-full relative">
                                                    <Link href={`/practice/session?module=${category.id}&topic=${topic.id}&skill=${idx}`} className="flex items-center group transition-colors cursor-pointer py-1">
                                                        <span className="text-base font-medium text-slate-700 group-hover:decoration-slate-50 underline-offset-4 group-hover:underline transition-all">
                                                            {skill.name}
                                                        </span>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            <span className="text-slate-400 font-medium text-sm">
                                                                {skill.count} questions
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DatabaseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6 3C4.34315 3 3 4.34315 3 6V16C3 17.6569 4.34315 19 6 19V20C6 20.5523 6.44772 21 7 21C7.55228 21 8 20.5523 8 20V19H16V20C16 20.5523 16.4477 21 17 21C17.5523 21 18 20.5523 18 20V19C19.6569 19 21 17.6569 21 16V6C21 4.34315 19.6569 3 18 3H6ZM16 11C16 13.2091 14.2091 15 12 15C10.1362 15 8.57006 13.7252 8.12602 12H11C11.5523 12 12 11.5523 12 11C12 10.4477 11.5523 10 11 10H8.12602C8.57006 8.27477 10.1362 7 12 7C14.2091 7 16 8.79086 16 11Z" />
        </svg>
    );
}