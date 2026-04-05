"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Star, Target, Shield, Zap, Sparkles, BookOpen, Brain
} from "lucide-react";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-emerald-200 selection:text-emerald-900">

      {/* Soft Animated Background Gradient */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] left-[20%] w-[80%] h-[80%] rounded-full bg-sky-400/10 blur-[120px]" />
      </div>

      {/* Top Banner */}
      <div className="relative z-50 bg-emerald-600 text-white text-sm font-medium py-2.5 px-4 text-center shadow-md">
        <span className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>Spring 2024 SAT Crash Course is now open for enrollment!</span>
          <Link href="/pricing" className="underline underline-offset-2 hover:text-emerald-100 transition-colors font-semibold ml-1">
            Claim your spot &rarr;
          </Link>
        </span>
      </div>

      {/* Navbar Placeholder (Assuming Navbar goes elsewhere, or we build a minimal one here for the landing) */}
      <nav className="relative z-40 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-inner shadow-emerald-400/20">
            O
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">OnePrep</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link>
          <Link href="#testimonials" className="hover:text-emerald-600 transition-colors">Success Stories</Link>
          <Link href="/pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Log in
          </Link>
          <Link href="/practice" className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-4 mx-auto">
              <Zap className="w-4 h-4" />
              <span>Voted #1 Digital SAT Prep Platform</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[1.05]">
              Your dream score <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                starts here.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Stop guessing, start acing. The most realistic Digital SAT simulator powered by AI to guarantee your score increase.
            </p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <Link
                href="/practice"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-emerald-600 rounded-2xl hover:bg-emerald-500 transition-all shadow-[0_8px_30px_rgb(5_150_105_/_30%)] hover:shadow-[0_8px_40px_rgb(5_150_105_/_40%)] hover:-translate-y-1"
              >
                Start Practicing Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className="text-sm text-slate-500 font-medium">No credit card required.</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Highlights with Progressive Reveal */}
        <section id="features" className="w-full py-24 bg-white/50 backdrop-blur-sm border-y border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">Built to crush the Digital SAT.</h2>
              <p className="text-lg text-slate-600">We mapped every question type, tested every strategy, and built the ultimate testing environment.</p>
            </div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { icon: Target, title: "100% Realistic Interface", desc: "Our testing app looks and feels exactly like the College Board Bluebook. No surprises on test day." },
                { icon: Brain, title: "AI-Powered Explanations", desc: "Get instant, personalized breakdowns for every mistake. It is like having an expert tutor 24/7." },
                { icon: Shield, title: "Score Guarantee", desc: "If your score does not increase by at least 150 points, we will refund your entire purchase." }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-slate-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-slate-700 group-hover:text-emerald-600 transition-colors shadow-sm">
                      <feature.icon size={28} strokeWidth={2} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-lg">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Social Proof / Trust Section */}
        <section id="testimonials" className="w-full py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-16">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-50 bg-slate-200 flex items-center justify-center shadow-sm z-10 hover:z-20 transition-transform hover:scale-110">
                    <span className="text-xs text-slate-400"></span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} fill="currentColor" />)}
              </div>
              <p className="text-xl font-semibold text-slate-900">
                Trusted by 10,000+ students globally.
              </p>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-emerald-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_50%)]" />

            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                Ready to crush <br /> the exam?
              </h2>
              <p className="text-xl text-slate-300 max-w-xl mx-auto">
                Join thousands of students who have already boosted their scores using our platform.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-slate-900 bg-white rounded-2xl hover:bg-emerald-50 transition-all shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1"
              >
                Create Free Account
              </Link>
            </div>
          </motion.div>
        </section>

      </main>
    </div>
  );
}
