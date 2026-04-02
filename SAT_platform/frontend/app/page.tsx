import Link from "next/link";
import { BrainCircuit, BookOpen, BarChart, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
            Master the Digital SAT with <span className="text-emerald-600">Confidence</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Experience the most realistic practice environment, powered by AI tutoring and instant analytics to boost your score to the next level.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/practice"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Start Practicing Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/progress"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              View Progress
            </Link>
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Why Choose Our Platform for SAT Prep?</h2>
            <p className="mt-4 text-lg text-slate-600">Everything you need to succeed, all in one place.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Realistic Bluebook Interface</h3>
              <p className="text-slate-600 leading-relaxed">
                Practice in an environment that exactly mirrors the official College Board testing app. Get comfortable with the tools and format before test day.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Tutoring</h3>
              <p className="text-slate-600 leading-relaxed">
                Stuck on a question? Our intelligent AI tutor provides hints, step-by-step breakdowns, and personalized strategies without giving away the answer.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                <BarChart size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Identify your weak points instantly. Detailed performance breakdowns help you focus your study time on the areas that will impact your score most.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
