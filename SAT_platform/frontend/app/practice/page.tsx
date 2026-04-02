'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Clock, 
  MoreVertical,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';

const mockQuestions = [
  {
    id: 'q1',
    section: 'Reading and Writing',
    passage: `The following text is adapted from Jane Austen's 1813 novel, Pride and Prejudice.

It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.`,
    prompt: 'Which choice best describes the function of the first sentence in the overall structure of the text?',
    options: [
      'It introduces a societal assumption that the narrator will go on to examine and satirize.',
      'It presents a scientific fact that forms the basis of the characters\' actions.',
      'It expresses a deeply personal belief held only by the protagonist.',
      'It summarizes the main argument of a complex philosophical treatise.'
    ]
  },
  {
    id: 'q2',
    section: 'Reading and Writing',
    passage: `While researching the effects of urban noise on bird communication, ecologists have discovered that some species alter the pitch of their songs in noisy environments. For example, great tits (Parus major) in cities sing at higher frequencies than ____ forest counterparts, likely because higher-pitched sounds are less masked by low-frequency traffic noise.`,
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    options: [
      'there',
      'they\'re',
      'their',
      'its'
    ]
  },
  {
    id: 'q3',
    section: 'Math',
    passage: null,
    prompt: 'A landscaper is designing a rectangular garden. The length of the garden is to be 5 feet longer than twice its width. If the area of the garden will be 104 square feet, what will be the length, in feet, of the garden?',
    options: [
      '8',
      '13',
      '16',
      '21'
    ]
  }
];

export default function PracticeSheet() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timerVisible, setTimerVisible] = useState(true);

  // Time mock state
  const [timeLeft, setTimeLeft] = useState(24 * 60 + 15); // 24:15

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [mockQuestions[currentIndex].id]: optionIndex
    }));
  };

  const toggleMarkForReview = () => {
    const currentId = mockQuestions[currentIndex].id;
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentId)) {
        newSet.delete(currentId);
      } else {
        newSet.add(currentId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentIndex < mockQuestions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const currentQ = mockQuestions[currentIndex];
  const isMarked = markedForReview.has(currentQ.id);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Top Header */}
      <header className="bg-zinc-900 text-white h-14 flex items-center justify-between px-6 shrink-0">
        <div className="flex-1 text-lg font-semibold tracking-wide">
          {currentQ.section}: Module 1
        </div>
        
        <div className="flex-1 flex justify-center items-center gap-4">
          <div className="flex flex-col items-center">
            {timerVisible ? (
              <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
            ) : (
              <span className="font-mono text-lg font-bold invisible">00:00</span>
            )}
            <button 
              onClick={() => setTimerVisible(!timerVisible)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              {timerVisible ? 'Hide' : 'Show'} Timer
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex justify-end items-center gap-6">
          <button className="flex items-center gap-1 text-sm font-medium hover:text-zinc-300">
            <span>Directions</span>
            <ChevronDown size={16} />
          </button>
          <button className="text-sm font-medium hover:text-zinc-300">
            Annotate
          </button>
          <button className="hover:text-zinc-300">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Main Split Pane */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane - Passage */}
        <div className="w-1/2 border-r-2 border-slate-200 bg-white p-8 md:p-12 overflow-y-auto">
          {currentQ.passage ? (
            <div className="font-serif text-lg leading-relaxed max-w-2xl whitespace-pre-wrap">
              {currentQ.passage}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic font-serif">
              No passage for this question.
            </div>
          )}
        </div>

        {/* Right Pane - Question */}
        <div className="w-1/2 bg-slate-50 p-8 md:p-12 overflow-y-auto flex flex-col">
          
          {/* Question Header */}
          <div className="flex justify-between items-start mb-6 w-full">
            <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center font-bold text-lg">
              {currentIndex + 1}
            </div>
            
            <button 
              onClick={toggleMarkForReview}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
                isMarked 
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50' 
                  : 'border-slate-300 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bookmark size={18} className={isMarked ? 'fill-emerald-500 text-emerald-500' : ''} />
              <span className="text-sm font-semibold">Mark for Review</span>
            </button>
          </div>

          {/* Question Prompt */}
          <div className="text-lg font-medium mb-8">
            {currentQ.prompt}
          </div>

          {/* Options */}
          <div className="space-y-3 flex-1 w-full max-w-xl">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === idx;
              const letter = String.fromCharCode(65 + idx);
              
              return (
                <div 
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  className={`border-2 rounded-lg p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-slate-300 hover:bg-slate-200 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-400 text-slate-600'
                  }`}>
                    {letter}
                  </div>
                  <div className="text-base text-slate-800 leading-snug">
                    {opt}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-slate-300 bg-white flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex-1 font-semibold text-slate-800">
          Student Name
        </div>
        
        <div className="flex-1 flex justify-center">
          <button className="flex items-center justify-center gap-2 font-bold text-slate-700 hover:text-slate-900 px-4 py-2 rounded transition-colors hover:bg-slate-100">
            <LayoutGrid size={20} />
            Question {currentIndex + 1} of {mockQuestions.length}
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="flex-1 flex justify-end gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center justify-center w-12 h-10 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-slate-900 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === mockQuestions.length - 1}
            className="flex items-center justify-center px-6 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white font-semibold transition-colors"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
