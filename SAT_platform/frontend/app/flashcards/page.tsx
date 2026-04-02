'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, CheckCircle2, XCircle } from 'lucide-react';

const mockCards = [
  { id: 1, front: "What is the formula for the area of a circle?", back: "A = πr²" },
  { id: 2, front: "Define 'Mitigate'", back: "To make less severe, harmful, or painful" },
  { id: 3, front: "What is the quadratic formula?", back: "x = [-b ± √(b² - 4ac)] / 2a" }
];

export default function FlashcardsPage() {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard((prev) => (prev + 1) % mockCards.length), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard((prev) => (prev - 1 + mockCards.length) % mockCards.length), 150);
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">SAT Flashcards</h1>
          <p className="text-neutral-500">Master key concepts for Math and Reading</p>
        </div>

        <div className="flex justify-between items-center mb-6 text-sm font-medium text-emerald-600">
          <span>Card {currentCard + 1} of {mockCards.length}</span>
          <span>Mastered: 0/{mockCards.length}</span>
        </div>

        {/* Card Container */}
        <div 
          className="relative h-80 w-full cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ perspective: '1000px' }}
        >
          <div 
            className="w-full h-full transition-transform duration-500 relative"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front */}
            <div 
              className="absolute w-full h-full bg-white border-2 border-neutral-100 rounded-2xl shadow-md flex flex-col items-center justify-center p-8 text-center hover:border-emerald-200 transition-colors"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Front</span>
              <h2 className="text-2xl font-semibold text-neutral-800">{mockCards[currentCard].front}</h2>
              <div className="absolute bottom-6 flex items-center gap-2 text-emerald-600 text-sm">
                <RotateCw className="w-4 h-4" /> Click to flip
              </div>
            </div>

            {/* Back */}
            <div 
              className="absolute w-full h-full bg-emerald-50 border-2 border-emerald-200 rounded-2xl shadow-md flex flex-col items-center justify-center p-8 text-center"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-600/50">Back</span>
              <p className="text-2xl font-medium text-emerald-900">{mockCards[currentCard].back}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-between">
          <button onClick={prevCard} className="p-3 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors font-medium shadow-sm">
              <XCircle className="w-5 h-5" /> Needs Review
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium shadow-sm">
              <CheckCircle2 className="w-5 h-5" /> Got it
            </button>
          </div>

          <button onClick={nextCard} className="p-3 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}