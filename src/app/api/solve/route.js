import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");
  return new OpenAI({ apiKey });
}

function polish(text) {
  let s = String(text).replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, "");
  s = s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `\n$$\n${inner.trim()}\n$$\n`);
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${inner.trim()}$`);
  s = s.replace(/^\s*\$\s*$/gm, "$$");
  s = s.replace(/[ \t]*\$\$[ \t]*/g, "\n$$\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export async function POST(req) {
  try {
    const { prompt, problem } = await req.json();
    const input = (prompt || problem || "").toString().trim();
    if (!input) {
      return new Response(JSON.stringify({ error: "No problem provided" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    const guardrails = String.raw`You are a world-class Math Olympiad coach, 'Professor Abacus', known for your ability to teach problem-solving techniques to bright students in grades 7-9.

Your primary goal is to guide the student to the solution with tiered hints, not to give the answer away immediately.

For the problem provided by the user, you must first solve it completely for your own reference. Then, you must structure your entire output in the following mandatory format using these exact XML-style tags:

<HINT_1>
[Provide a brief, high-level hint to get the student started. This should point them to the right general area or concept.]
</HINT_1>

<HINT_2>
[Provide a more specific second hint that builds on the first. This should suggest a concrete technique.]
</HINT_2>

<HINT_3>
[Provide a final, very direct hint that almost reveals the key step.]
</HINT_3>

<FULL_SOLUTION>
[Finally, provide the complete, step-by-step solution using the four-part structure below.]

**1. Analysis & Key Concepts:** [Identify the problem type and key theorems.]

**2. Strategy:** [Outline the plan of attack.]

**3. Step-by-Step Execution:** [Provide the detailed solution.]

**4. Conclusion & Insight:** [State the final answer and summarize the key insight.]

</FULL_SOLUTION>

---
Global constraints (MUST follow):
- Produce at least one hint (HINT_1 is required; include HINT_2 and HINT_3 if helpful).
- Do NOT include any text outside the HINT_* and FULL_SOLUTION tags.
- Do NOT use backticks or code fences.
- Do not use calculus or university-level mathematics.
- Define all variables clearly.
- Use Markdown for formatting and **bold** for the four section headers in FULL_SOLUTION.
- Use LaTeX for ALL mathematical notation, with '$...$' for inline and '$$...$$' for display math.
- Never place a single '$' on a line by itself; for display math, wrap the content inside one pair of '$$...$$' on their own lines.
- For multi-line derivations, prefer $$\\begin{aligned} ... \\end{aligned}$$ to align steps.
- Prefer symbols like \\equiv, \\pmod{n}, \\frac{a}{b}, \\binom{n}{k}, and exponents ^{ }.
- Keep paragraphs short; put important equations in $$...$$ blocks; avoid long prose walls.`;

    const client = getClient();
    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_output_tokens: 1400,
      input: `${guardrails}\n\nProblem:\n${input}\n\nReturn ONLY the required tags and their contents.`
    });

    const rawText =
      resp.output_text ??
      resp?.output?.[0]?.content?.[0]?.text ??
      JSON.stringify(resp);

    return new Response(JSON.stringify({ text: polish(rawText) }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
