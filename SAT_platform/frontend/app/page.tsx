"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Target,
  BookOpen,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-highlight/30 selection:text-primary">
      <main className="relative z-10 flex flex-col items-center">
        <section className="w-full max-w-7xl mx-auto px-6 pt-10 pb-24 text-center relative">
          <div className="max-w-4xl mx-auto space-y-8 relative z-20">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground tracking-tighter leading-[0.9]" style={{ textWrap: "balance" }}>
              Your <span className="text-primary">dream</span>{" "}
              score <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-highlight">starts</span>{" "}
              here.
            </h1>

            <p className="text-lg md:text-xl text-text-2 max-w-2xl mx-auto leading-relaxed font-medium">
              The most realistic Digital SAT simulator with AI-powered feedback on every question. Practice with real College Board formats and watch your score climb.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/practice"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-primary rounded-xl overflow-hidden transition-[transform,box-shadow] duration-[var(--dur)] ease-[var(--ease)] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-accent to-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--dur-slow)]" />
                <span className="relative z-10 flex items-center">
                  Start Practicing Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-[var(--dur)]" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-20 bg-card rounded-t-3xl relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] border-t border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-4" style={{ textWrap: "balance" }}>
                Built to crush the <span className="text-primary">Digital SAT.</span>
              </h2>
              <p className="text-lg text-text-2 font-medium">Every question type mapped. Every strategy tested. The environment that matches test day.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Target, title: "Realistic Interface", desc: "Mirrors the official Bluebook app. No surprises on test day — practice exactly how you'll perform.", color: "bg-background", dark: false },
                { icon: Brain, title: "AI-Powered Feedback", desc: "Detailed explanations for every answer. Understand your mistakes and learn the patterns that matter.", color: "bg-primary", dark: true },
                { icon: BookOpen, title: "Detailed Analytics", desc: "Track accuracy by skill, domain, and difficulty. See exactly where to focus your study time.", color: "bg-accent", dark: false }
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`group rounded-2xl p-8 flex flex-col justify-between min-h-[280px] border border-border/50 transition-[transform,box-shadow] duration-[var(--dur-slow)] ease-[var(--ease)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${feature.color} ${feature.dark ? "text-white border-transparent" : ""}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.dark ? "bg-white/15" : "bg-primary/10"}`}>
                    <feature.icon size={24} strokeWidth={2.5} className={feature.dark ? "text-highlight" : "text-primary"} />
                  </div>
                  <div className="mt-auto">
                    <h3 className={`text-2xl font-bold mb-3 tracking-tight ${feature.dark ? "" : "text-foreground"}`}>{feature.title}</h3>
                    <p className={`text-base font-medium leading-snug ${feature.dark ? "text-white/80" : "text-text-2"}`}>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-16 bg-card">
          <div className="bg-primary rounded-2xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(28,229,133,0.2),transparent_60%)]" />

            <div className="relative z-10 space-y-6 flex flex-col items-center">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter" style={{ textWrap: "balance" }}>
                Ready to crush the exam?
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto font-medium leading-relaxed">
                Join students who have already boosted their scores with MaxSAT.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-primary bg-highlight rounded-xl hover:bg-white transition-colors active:scale-[0.97]"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="w-full border-t border-border bg-background py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-3">
            <span className="font-bold text-primary tracking-tighter">MaxSAT</span>
            <div className="flex gap-6">
              <Link href="/practice" className="hover:text-text-1 transition-colors">Practice</Link>
              <Link href="/dashboard" className="hover:text-text-1 transition-colors">Dashboard</Link>
              <Link href="/ai-tutor" className="hover:text-text-1 transition-colors">AI Tutor</Link>
            </div>
            <span>&copy; {new Date().getFullYear()} MaxSAT</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
