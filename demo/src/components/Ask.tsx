"use client";

import { useState, type FormEvent } from "react";
import { AnswerMarkdown } from "@/lib/markdown";

type Source = {
  fileName: string;
  lot: string | null;
  pieceType: string;
  page: number | null;
  articleCode: string | null;
  similarity: number;
};

type AskResult = { answer: string; sources: Source[] };

const EXAMPLES = [
  "Quelles qualifications et cartes professionnelles sont exigées pour les agents ?",
  "Quelles pénalités sont prévues en cas de poste non tenu ou d'absence d'agent ?",
  "Quels sont les horaires de présence et le régime de vacation demandés ?",
  "Quelles caractéristiques techniques pour les caméras de vidéosurveillance à installer ?"
];

export function Ask() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setAsked(trimmed);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      const data = (await res.json()) as AskResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Le service est momentanément indisponible.");
        return;
      }
      setResult(data);
    } catch {
      setError("Impossible de contacter le service. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <>
      <div className="chips" aria-label="Questions d'exemple">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => { setQuestion(example); void ask(example); }}>
            {example}
          </button>
        ))}
      </div>

      <form className="ask-form" onSubmit={onSubmit}>
        <div className="ask-row">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Posez votre question sur le dossier (qualifications, horaires, pénalités, moyens exigés...)"
            maxLength={300}
            aria-label="Votre question sur le dossier"
            required
          />
          <button type="submit" disabled={loading}>Demander</button>
        </div>
        <div className="ask-meta">
          <span>Démo limitée en volume : quelques questions par visiteur.</span>
          <span>{question.length}/300</span>
        </div>
      </form>

      {loading && <p className="loading" role="status">Recherche dans les pièces du dossier...</p>}
      {error && <div className="error-card" role="alert">{error}</div>}

      {result && (
        <section className="answer-card" aria-live="polite">
          <h2>Réponse sourcée</h2>
          <p><strong>{asked}</strong></p>
          <AnswerMarkdown text={result.answer} />
          <div className="sources">
            <h2>Extraits fournis (retrieval)</h2>
            <ol>
              {result.sources.map((s, i) => (
                <li key={i}>
                  {s.fileName} · {s.lot ?? s.pieceType}{s.page ? ` · p.${s.page}` : ""}
                  {s.articleCode ? ` · art.${s.articleCode}` : ""} · sim={s.similarity.toFixed(3)}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
