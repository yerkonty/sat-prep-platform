"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Shield,
  Star,
  Target,
  Zap,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [coins, setCoins] = useState<{ id: number; left: number; delay: number }[]>([]);

  useEffect(() => {
    // Generate some "money rain" conceptual elements
    const newCoins = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setCoins(newCoins);

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Hero headline animation (splitting text effect conceptually)
      gsap.fromTo(
        ".hero-word",
        { y: 100, opacity: 0, rotateX: -20 },
        {
          y: 0, opacity: 1, rotateX: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power4.out",
          delay: 0.2
        }
      );

      // Hero text / sub-headline
      gsap.fromTo(
        ".hero-sub",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.6 }
      );

      // Scroll triggered cards reveal
      gsap.fromTo(
        ".feature-card",
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.2,
          duration: 1,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 80%",
            toggleActions: "play none none none"
          }
        }
      );

      // Floating abstract shapes
      gsap.to(".abstract-shape-1", {
        y: "-=30",
        rotation: "+=15",
        duration: 4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
      gsap.to(".abstract-shape-2", {
        y: "+=25",
        rotation: "-=10",
        duration: 5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] overflow-hidden selection:bg-[#1CE585] selection:text-[#00592B]">

      {/* Playful Microinteraction: Falling "Points" (MoMoney inspired rain effect idea) */}
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            initial={{ y: -50, opacity: 0, rotate: 0 }}
            animate={{ y: "110vh", opacity: [0, 1, 0], rotate: 360 }}
            transition={{
              duration: 5 + Math.random() * 2,
              repeat: Infinity,
              delay: coin.delay,
              ease: "linear",
            }}
            className="fixed z-0 pointer-events-none w-4 h-4 rounded-full border-2 border-[#1CE585]/30 bg-[#1CE585]/10 backdrop-blur-sm"
            style={{ left: `${coin.left}%` }}
          />
        ))}
      </AnimatePresence>

      {/* Shapes (Subtle Spline-like replacements) */}
      <div className="absolute top-20 right-[10%] w-64 h-64 bg-gradient-to-tr from-[#1CE585] to-[#10B981] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] mix-blend-multiply opacity-20 blur-[60px] abstract-shape-1 pointer-events-none" />
      <div className="absolute bottom-20 left-[5%] w-72 h-72 bg-gradient-to-tr from-[#00592B] to-[#1CE585] rounded-[30%_70%_70%_30%/30%_30%_70%_70%] mix-blend-multiply opacity-10 blur-[80px] abstract-shape-2 pointer-events-none" />


      <main className="relative z-10 flex flex-col items-center">
        {/* Massive Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-32 pb-40 text-center relative">
          <div className="max-w-4xl mx-auto space-y-10 relative z-20">
            <h1 ref={heroTextRef} className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] font-black text-[#1A1A1A] tracking-tighter leading-[0.9] perspective-1000">
              <span className="block overflow-hidden"><span className="inline-block hero-word">Your</span> <span className="inline-block hero-word text-[#00592B]">dream</span></span>
              <span className="block overflow-hidden"><span className="inline-block hero-word">score</span> <span className="inline-block hero-word text-transparent bg-clip-text bg-gradient-to-r from-[#00592B] via-[#10B981] to-[#1CE585]">starts</span></span>
              <span className="block overflow-hidden"><span className="inline-block hero-word">here.</span></span>
            </h1>

            <p className="hero-sub text-xl md:text-2xl text-[#1A1A1A]/70 max-w-2xl mx-auto leading-relaxed font-medium">
              Stop guessing, start acing. The most realistic Digital SAT simulator powered by AI to guarantee your score increase.
            </p>

            <div className="hero-sub flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Link
                href="/practice"
                className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-[#FAFAF8] bg-[#00592B] rounded-full overflow-hidden transition-all shadow-[0_10px_40px_rgba(0,89,43,0.3)] hover:shadow-[0_15px_50px_rgba(28,229,133,0.4)] hover:-translate-y-2 active:scale-95"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#10B981] to-[#1CE585] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <span className="relative z-10 flex items-center">
                  Start Practicing Free
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid / Cards with Flips & Reveals */}
        <section id="features" className="w-full py-32 bg-white rounded-t-[4rem] relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] border-t border-[#1CE585]/20">
          <div className="max-w-7xl mx-auto px-6" ref={cardsRef}>
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-[#1A1A1A] mb-6">Built to crush the <br /><span className="text-[#00592B]">Digital SAT.</span></h2>
              <p className="text-xl text-[#1A1A1A]/60 font-medium">We mapped every question type, tested every strategy, and built the ultimate testing environment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
              {[
                { icon: Target, title: "Realistic Interface", desc: "Our app looks exactly like the official Bluebook. No surprises on test day.", color: "bg-[#FAFAF8]", iconCol: "text-[#00592B]" },
                { icon: Brain, title: "AI-Powered Explanations", desc: "Deep feedback for every mistake. It's like having an expert tutor 24/7.", color: "bg-[#00592B]", textCol: "text-[#FAFAF8]", iconCol: "text-[#1CE585]", dark: true },
                { icon: BookOpen, title: "Detailed Analytics", desc: "Track your progress with granular insights into your unique strengths and weaknesses.", color: "bg-[#10B981]", iconCol: "text-[#00592B]" }
              ].map((feature, i) => (
                <div key={i} className="feature-card h-80 group [perspective:1000px]">
                  <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(10deg)_scale(1.02)]">
                    <div className={`absolute inset-0 rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden shadow-sm ${feature.color} border border-slate-200/50`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${feature.iconCol}`}>
                        <feature.icon size={32} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className={`text-3xl font-bold mb-4 tracking-tight ${feature.dark ? 'text-white' : 'text-[#1A1A1A]'}`}>{feature.title}</h3>
                        <p className={`text-lg font-medium ${feature.dark ? 'text-white/80' : 'text-[#1A1A1A]/60'} leading-snug`}>{feature.desc}</p>
                      </div>
                      {/* Interactive glow on hover */}
                      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof with Premium Layout (Ticker style) */}
        <section id="testimonials" className="w-full py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6 overflow-hidden">
            <div className="flex flex-col items-center text-center space-y-6 mb-16">
              <div className="flex gap-1.5 text-[#1CE585]">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={28} className="fill-[#1CE585]" />)}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] max-w-2xl">
                Level up your skills and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00592B] to-[#10B981]">master the exam.</span>
              </h2>
            </div>
          </div>

          {/* Animated ticker using GSAP text (or framer motion) */}
          <div className="w-full overflow-hidden flex select-none bg-[#FAFAF8] py-8 border-y border-slate-200">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="flex whitespace-nowrap gap-12 font-black text-6xl text-[#10B981]/15 tracking-tighter uppercase"
            >
              <span>ACE THE DIGITAL SAT</span> • <span>GUARANTEED RESULTS</span> • <span>EXPERT TUTORS</span> • <span>1500+ COMMUNITY</span> • <span>ACE THE DIGITAL SAT</span> • <span>GUARANTEED RESULTS</span> • <span>EXPERT TUTORS</span> • <span>1500+ COMMUNITY</span>
            </motion.div>
          </div>
        </section>

        {/* Massive Footer CTA Card */}
        <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-24 bg-white">
          <div className="bg-[#00592B] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(0,89,43,0.4)]">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(28,229,133,0.3),transparent_60%)]" />

            <div className="relative z-10 space-y-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center p-4">
                <div className="w-full h-full border-[4px] border-[#1CE585] rounded-xl flex items-center justify-center font-bold text-2xl text-[#FAFAF8]">M</div>
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-[#FAFAF8] tracking-tighter">
                Ready to crush the exam?
              </h2>
              <p className="text-2xl text-[#FAFAF8]/70 max-w-2xl mx-auto font-medium leading-relaxed">
                Join thousands of students who have already boosted their scores using MaxSAT.
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center justify-center px-12 py-6 text-xl font-bold text-[#00592B] bg-[#1CE585] rounded-full hover:bg-white transition-all shadow-xl hover:shadow-[#1CE585]/30 hover:scale-105 active:scale-95"
              >
                Create Free Account
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Interactive/Microinteraction details */}
            <div className="absolute bottom-5 left-10 text-[#FAFAF8]/40 font-mono text-sm">
              Press [Enter] to ace.
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
