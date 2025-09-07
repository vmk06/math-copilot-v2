// File: src/app/page.tsx
"use client";

import React, { useRef, useState, FormEvent } from "react";
import "katex/dist/katex.min.css";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { PluggableList } from "unified";

/** Brand bits (quiet parent brand) */
const PRODUCT = "Math Olympiad Coach";
const ENDORSEMENT = "from MathMakki";
const VERSION = "v1";

/**
 * Parse staged output from the API.
 * Accepts <HINT_1>, <HINT_2>, <HINT_3>, and <SOLUTION> (or <FULL_SOLUTION>).
 */
function parseAIResponse(text: string) {
  const pull = (name: string) => {
    const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i").exec(text);
    return m?.[1]?.trim() ?? "";
  };
  const hints = [pull("HINT_1"), pull("HINT_2"), pull("HINT_3")].filter(Boolean) as string[];
  const solution = pull("SOLUTION") || pull("FULL_SOLUTION");
  return { hints, solution };
}

// Safe casts to avoid occasional unified/vfile type mismatches
const REMARK_PLUGINS = [remarkMath] as unknown as PluggableList;
const REHYPE_PLUGINS = [rehypeKatex] as unknown as PluggableList;

/** Example prompts (LaTeX escaped for KaTeX) */
const EXAMPLES: string[] = [
  "Prove that for any prime $p>3$, $p^2 \\\\equiv 1 \\\\pmod{24}$.",
  "Find all integer solutions $x^2-3y^2=1$ with $x,y>0$.",
  "In $\\\\triangle ABC$ with $AB=AC$, prove that $A=60^{\\\\circ}$ if $\\\\angle B + \\\\angle C = 2\\\\angle A$.",
  "How many 6-digit numbers have digit sum $10$?",
  "Among any $n+1$ integers, show two have difference divisible by $n$."
];

export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hints, setHints] = useState<string[]>([]);
  const [solution, setSolution] = useState<string>("");
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHints([]);
    setSolution("");
    setCurrentHintIndex(0);

    try {
      // Send both keys so the API can accept either
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, problem: query })
      });

      let raw = "";
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        raw =
          (data?.solution ||
            data?.text ||
            data?.message ||
            data?.content ||
            data?.output_text ||
            "") + "";
        if (!raw && data?.output?.[0]?.content?.[0]?.text) raw = data.output[0].content[0].text;
        if (!raw && typeof data === "string") raw = data;
      } else {
        raw = await res.text();
      }

      if (!res.ok) throw new Error(raw || `Request failed (${res.status})`);

      const parsed = parseAIResponse(raw);
      setHints(parsed.hints);
      setSolution(parsed.solution);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function useExample(text: string, autoSubmit = false) {
    setQuery(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
    if (autoSubmit) onSubmit();
  }

  const canRevealAnother = currentHintIndex < hints.length;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-center text-3xl font-extrabold">{PRODUCT}</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Learn by thinking — hints → strategy → solution.
        </p>

        {/* Input form */}
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm text-slate-300">Enter your math problem:</label>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`e.g., "Prove that for any prime p > 3, p^2 ≡ 1 (mod 24)."`}
            className="h-40 w-full resize-y rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Example chips */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => useExample(ex)}
                className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
                title="Click to load this example"
              >
                Try: {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Begin Tutoring"}
          </button>
        </form>

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-400 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Hints */}
        {hints.length > 0 && (
          <section className="mt-8">
            {hints.slice(0, currentHintIndex).map((hint, idx) => (
              <div key={idx} className="prose prose-invert max-w-none rounded-lg bg-slate-800 p-6 mb-4">
                <h2 className="mb-4 text-2xl font-bold">Hint {idx + 1}:</h2>
                <div className="not-prose">
                  <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                    {hint}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            <div className="mt-2 flex flex-wrap gap-3">
              {canRevealAnother && (
                <button
                  type="button"
                  onClick={() => setCurrentHintIndex((n) => Math.min(n + 1, hints.length))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700/60"
                >
                  Reveal next hint
                </button>
              )}

              {!solution && hints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentHintIndex(hints.length)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700/60"
                >
                  Reveal all hints
                </button>
              )}

              {solution && (
                <a
                  href="#solution"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Jump to solution
                </a>
              )}
            </div>
          </section>
        )}

        {/* Solution */}
        {solution && (
          <section id="solution" className="mt-8 w-full max-w-2xl">
            <div className="prose prose-invert max-w-none rounded-lg bg-slate-800 p-6">
              <h2 className="mb-4 text-2xl font-bold">Full Solution</h2>
              <div className="not-prose">
                <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                  {solution}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* About / Mission / Roadmap */}
        <section className="mx-auto mt-10 max-w-2xl text-slate-200">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-5">
            <h2 className="text-lg font-semibold">What is this?</h2>
            <p className="mt-2 text-slate-300">
              {PRODUCT} helps beginners <span className="font-semibold">learn by thinking</span>.
              Instead of dumping full solutions, it uses <span className="font-semibold">staged hints → strategy → full solution</span>
              so you stay in control of the reasoning.
            </p>

            <h3 className="mt-4 text-base font-semibold">How it helps</h3>
            <ul className="mt-2 list-inside list-disc text-slate-300">
              <li>Stepwise hints before revealing solutions</li>
              <li>“Check my reasoning” to validate your approach</li>
              <li>Clean typeset math (KaTeX)</li>
              <li>Export/share solutions with teachers & peers</li>
            </ul>

            <h3 className="mt-4 text-base font-semibold">Roadmap</h3>
            <ul className="mt-2 list-inside list-disc text-slate-300">
              <li>IOQM/RMO topic packs & daily drills</li>
              <li>Error log + targeted “fix-it” practice</li>
              <li>Teacher mode: worksheet generator & printable keys</li>
              <li>Progress tracker, streaks, shareable sessions</li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="#teacher"
                className="rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
              >
                Teacher resources (coming soon)
              </a>
              <span className="rounded-full border border-slate-600 bg-slate-700/50 px-2 py-1 text-xs">
                {ENDORSEMENT}
              </span>
              <span className="rounded-full border border-slate-600 bg-slate-700/50 px-2 py-1 text-xs">
                {VERSION}
              </span>
            </div>
          </div>
        </section>

        {/* Placeholder Teacher section */}
        <section id="teacher" className="mx-auto mt-8 max-w-2xl text-slate-200">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
            <h2 className="text-lg font-semibold">Teacher resources</h2>
            <p className="mt-2 text-slate-300">
              We’re building a teacher mode with worksheet generation, hint levels, printable keys,
              and class tracking. If you’d like early access or to share feedback, reach out!
            </p>
            <div className="mt-3 text-sm text-slate-300">
              Contact:{" "}
              <a className="text-indigo-400 hover:underline" href="mailto:hello@mathmakki.org">
                hello@mathmakki.org
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-sm text-slate-400">
          <div>Built with ❤ by MathMakki</div>
          <div className="mt-2 space-x-4">
            <a className="hover:underline" href="#">
              Privacy
            </a>
            <a className="hover:underline" href="#">
              Terms
            </a>
            <a className="hover:underline" href="mailto:hello@mathmakki.org">
              Contact
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
