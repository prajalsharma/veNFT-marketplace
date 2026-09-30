import { NextRequest, NextResponse } from "next/server";

/**
 * Ask Vezo — the docs assistant endpoint.
 *
 * The docs site is a static build, so its chat widget calls this route (the app
 * already runs serverless on Vercel). Flow:
 *
 *   1. Fetch the documentation as plain text (llms-full.txt, regenerated on
 *      every docs deploy) and split it into section-sized chunks.
 *   2. Score chunks against the question with a small BM25-style ranker and keep
 *      the best few. This is the retrieval step, and it costs nothing.
 *   3. If a free LLM key is configured, have the model write an answer grounded
 *      ONLY in those chunks. If no key is set, return the chunks themselves.
 *
 * That last part matters: the widget is useful with zero configuration and zero
 * spend (it becomes a very good docs search), and gains prose answers the moment
 * a free-tier key exists. It never invents an answer when retrieval finds
 * nothing.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const DOCS_ORIGIN = "https://docs.vezo.exchange";
const DOCS_TEXT_URL = `${DOCS_ORIGIN}/llms-full.txt`;
const MAX_QUESTION_LEN = 500;
const TOP_K = 5;

// Chunk titles come from the docs' own headings; this maps a page heading to its
// path so every answer can cite a link the reader can open.
const PAGE_URLS: Record<string, string> = {
  "vezo documentation": "/",
  "what is vezo?": "/introduction/what-is-vezo/",
  "what is mezo?": "/introduction/what-is-mezo/",
  "vote-escrow & venfts": "/introduction/vote-escrow/",
  "who is vezo for?": "/introduction/who-is-vezo-for/",
  "marketplace mechanics": "/concepts/marketplace-mechanics/",
  "pricing & discounts": "/concepts/pricing-and-discounts/",
  bidding: "/concepts/bidding/",
  "pay with any token": "/concepts/pay-with-any-token/",
  fees: "/concepts/fees/",
  "getting started": "/guides/getting-started/",
  "buying a venft": "/guides/buying/",
  "selling a venft": "/guides/selling/",
  "system overview": "/architecture/overview/",
  "what we built, and why": "/architecture/what-we-built/",
  "smart contracts": "/architecture/contracts/",
  security: "/architecture/security/",
  "contract integration": "/developers/integrate/",
  "subgraph & data": "/developers/subgraph/",
  "run locally": "/developers/run-locally/",
  faq: "/resources/faq/",
  "ask ai about vezo": "/resources/ask-ai/",
  "links & addresses": "/resources/links/",
};

interface Chunk {
  page: string;
  section: string;
  text: string;
  url: string;
}

// ─── CORS ────────────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin === DOCS_ORIGIN ||
    origin === "https://www.vezo.exchange" ||
    origin === "https://vezo.exchange" ||
    (!!origin && /^http:\/\/(localhost|127\.0\.0\.1|support\.localhost)(:\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? (origin as string) : DOCS_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
// Per-instance and therefore approximate, which is the right trade for a free
// endpoint: it blunts a hammering script without any external state.

const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude bound on memory
  return recent.length > MAX_PER_WINDOW;
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

let cache: { chunks: Chunk[]; at: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

function chunkDocs(raw: string): Chunk[] {
  const chunks: Chunk[] = [];
  let page = "Vezo Documentation";
  let section = "";
  let buf: string[] = [];

  const flush = () => {
    const text = buf
      .join("\n")
      // Starlight's generated "[Section titled ...](#anchor)" lines are noise.
      .replace(/^\[Section titled .*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text.length > 40) {
      chunks.push({
        page,
        section,
        text,
        url: DOCS_ORIGIN + (PAGE_URLS[page.toLowerCase()] ?? "/"),
      });
    }
    buf = [];
  };

  for (const line of raw.split("\n")) {
    if (line.startsWith("# ")) {
      flush();
      page = line.slice(2).trim();
      section = "";
    } else if (line.startsWith("## ")) {
      flush();
      section = line.slice(3).trim();
    } else {
      buf.push(line);
      // Keep chunks small enough that several fit in a prompt comfortably.
      if (buf.join("\n").length > 2400) flush();
    }
  }
  flush();
  return chunks;
}

async function getChunks(): Promise<Chunk[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.chunks;
  const res = await fetch(DOCS_TEXT_URL, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`docs fetch failed (${res.status})`);
  const chunks = chunkDocs(await res.text());
  cache = { chunks, at: Date.now() };
  return chunks;
}

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of", "in", "on", "for", "and",
  "or", "it", "its", "this", "that", "with", "as", "at", "by", "from", "how", "what", "why", "when",
  "does", "do", "did", "can", "i", "you", "my", "me", "we", "us", "if", "there", "their", "they",
]);

function terms(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function rank(question: string, chunks: Chunk[]): Chunk[] {
  const q = terms(question);
  if (q.length === 0) return [];
  const uniq = [...new Set(q)];

  // Document frequency for an IDF weight: a term in every chunk says little.
  const df = new Map<string, number>();
  for (const t of uniq) {
    let n = 0;
    for (const c of chunks) if (c.text.toLowerCase().includes(t)) n++;
    df.set(t, n);
  }

  const idfOf = (t: string) => Math.log(1 + chunks.length / Math.max(1, df.get(t) ?? 1));

  // Coverage is measured only over terms the docs actually contain. Counting
  // absent terms punished honest questions: a single typo or an incidental word
  // ("in vezoi") was enough to bury a question the docs answer well. Recall
  // matters more than precision here, because a wrong "not covered" is worse
  // than a loosely related section, and the model is told to refuse anyway.
  const present = uniq.filter((t) => (df.get(t) ?? 0) > 0);
  if (present.length === 0) return [];
  const totalIdf = present.reduce((sum, t) => sum + idfOf(t), 0);

  const scored = chunks.map((c) => {
    const hay = (c.page + " " + c.section + " " + c.text).toLowerCase();
    const head = (c.page + " " + c.section).toLowerCase();
    let score = 0;
    let covered = 0;
    let matched = 0;
    for (const t of present) {
      const occurrences = hay.split(t).length - 1;
      if (occurrences === 0) continue;
      const idf = idfOf(t);
      covered += idf;
      matched++;
      // Saturating term frequency, so one long chunk cannot dominate by repetition.
      score += idf * (occurrences / (occurrences + 1.5));
      if (head.includes(t)) score += idf * 0.8; // heading matches are strong signal
    }
    if (hay.includes(question.toLowerCase().trim())) score += 2; // exact phrase
    return { c, score, matched, coverage: totalIdf > 0 ? covered / totalIdf : 0 };
  });

  // A single matched term is only convincing when the question was that short;
  // longer questions need at least two to count as on-topic.
  const minMatched = present.length === 1 ? 1 : 2;

  return scored
    .filter((s) => s.score > 0.35 && s.coverage >= 0.3 && s.matched >= minMatched)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((s) => s.c);
}

// ─── Answer synthesis (optional, free-tier providers) ────────────────────────

const SYSTEM = `You are the Vezo documentation assistant. Vezo is an escrowless peer-to-peer marketplace for veBTC and veMEZO vote-escrowed NFTs on Mezo, Bitcoin's economic layer.

Rules:
- Answer ONLY from the documentation excerpts provided. They are the single source of truth.
- If the excerpts do not contain the answer, say so plainly and point to the closest relevant page. Never guess, and never invent contract addresses, fees, function names, or numbers.
- Be concise and concrete: a short paragraph, or a few bullets when steps are involved.
- Write plain prose with no em dashes. Do not open with a greeting.
- Never ask for, or discuss providing, a private key or seed phrase.
- Remind the reader to verify addresses on the explorer when the answer includes one.`;

// Free tiers are capped on tokens per day, not just requests, so the prompt is
// kept lean: the top few sections, each trimmed. Sections are already topic
// scoped, so trimming rarely costs an answer, and it roughly halves token spend
// per question.
const CONTEXT_CHUNKS = 4;
const CONTEXT_CHARS = 1400;

function buildPrompt(question: string, chunks: Chunk[]): string {
  const context = chunks
    .slice(0, CONTEXT_CHUNKS)
    .map((c, i) => {
      const body = c.text.length > CONTEXT_CHARS ? c.text.slice(0, CONTEXT_CHARS).trimEnd() + "…" : c.text;
      return `[${i + 1}] ${c.page}${c.section ? " > " + c.section : ""}\n${body}`;
    })
    .join("\n\n---\n\n");
  return `Documentation excerpts:\n\n${context}\n\n---\n\nQuestion: ${question}`;
}

// Repeat questions are the norm on a docs site (the suggested prompts most of
// all), so a small cache keeps the provider quota for genuinely new questions.
const answerCache = new Map<string, { answer: string; at: number }>();
const ANSWER_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Calls whichever free-tier provider is configured. Returns null if none is.
 *
 * Provider keys, all optional and all free to obtain:
 *   GROQ_API_KEY       console.groq.com  (NOT x.ai: "Groq" the inference company,
 *                      not "Grok" the xAI chatbot, which is paid)
 *   GEMINI_API_KEY     aistudio.google.com, free on Flash models
 *   OPENROUTER_API_KEY openrouter.ai, use a model with the ":free" suffix
 *
 * With none set the caller falls back to returning documentation excerpts,
 * which is a fully working (and free) mode, not an error path.
 */
async function synthesize(question: string, chunks: Chunk[]): Promise<string | null> {
  const prompt = buildPrompt(question, chunks);

  // Groq — free tier, OpenAI-compatible.
  if (process.env.GROQ_API_KEY) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.DOCS_CHAT_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`groq ${r.status}`);
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() ?? null;
  }

  // Google Gemini — free tier.
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.DOCS_CHAT_MODEL || "gemini-2.0-flash";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
      }
    );
    if (!r.ok) throw new Error(`gemini ${r.status}`);
    const j = await r.json();
    return j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("").trim() ?? null;
  }

  // OpenRouter — has genuinely free models (":free" suffix).
  if (process.env.OPENROUTER_API_KEY) {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": DOCS_ORIGIN,
        "X-Title": "Vezo Docs",
      },
      body: JSON.stringify({
        model: process.env.DOCS_CHAT_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`openrouter ${r.status}`);
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() ?? null;
  }

  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
  }

  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400, headers });
  }
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json(
      { error: `Keep questions under ${MAX_QUESTION_LEN} characters.` },
      { status: 400, headers }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "That is a lot of questions in one hour. Try again a bit later." },
      { status: 429, headers }
    );
  }

  let chunks: Chunk[];
  try {
    chunks = rank(question, await getChunks());
  } catch {
    return NextResponse.json(
      { error: "The documentation could not be loaded right now. Try again shortly." },
      { status: 503, headers }
    );
  }

  const sources = chunks.map((c) => ({
    title: c.section ? `${c.page}: ${c.section}` : c.page,
    url: c.url,
  }));

  if (chunks.length === 0) {
    return NextResponse.json(
      {
        mode: "empty",
        answer:
          "Nothing in the documentation matches that closely enough for me to answer honestly. Try different wording, or browse the FAQ.",
        sources: [{ title: "FAQ", url: `${DOCS_ORIGIN}/resources/faq/` }],
      },
      { headers }
    );
  }

  const key = cacheKey(question);
  const cached = answerCache.get(key);
  if (cached && Date.now() - cached.at < ANSWER_TTL_MS) {
    return NextResponse.json({ mode: "ai", answer: cached.answer, sources, cached: true }, { headers });
  }

  try {
    const answer = await synthesize(question, chunks);
    if (answer) {
      if (answerCache.size > 200) answerCache.clear();
      answerCache.set(key, { answer, at: Date.now() });
      return NextResponse.json({ mode: "ai", answer, sources }, { headers });
    }
  } catch {
    // Provider hiccup or daily quota reached: fall through to excerpts. The
    // widget keeps working, it just stops writing prose until the quota resets.
  }

  // Excerpt mode shows documentation prose directly. Markdown syntax is stripped
  // (it would render as literal asterisks and backticks) but line structure is
  // deliberately kept: tables and numbered steps flattened into one paragraph
  // are unreadable, which is exactly how this looked before.
  const plain = (s: string) =>
    s
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, "").trim())
      .replace(/^\s*\|.*\|\s*$/gm, (row) =>
        // Markdown table row → "label: value" on its own line.
        row.split("|").map((cell) => cell.trim()).filter(Boolean).join(": ")
      )
      .replace(/^\s*[-:|\s]+$/gm, "") // table separator rows
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(?<![*\w])\*([^*\n]+)\*(?!\w)/g, "$1") // single-asterisk emphasis
      .replace(/`([^`]+)`/g, "$1")
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^>\s?/gm, "")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  // A short teaser that ends on a sentence, not mid-word. The excerpt exists to
  // show the reader they are in the right place; the page link carries the rest.
  const teaser = (s: string, limit = 320) => {
    if (s.length <= limit) return s;
    const cut = s.slice(0, limit);
    const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
    return (stop > limit * 0.5 ? cut.slice(0, stop + 1) : cut.trimEnd()) + "…";
  };

  return NextResponse.json(
    {
      mode: "excerpts",
      answer: "",
      excerpts: chunks.map((c) => ({
        title: c.section || c.page,
        page: c.page,
        url: c.url,
        text: teaser(plain(c.text)),
      })),
      sources,
    },
    { headers }
  );
}
