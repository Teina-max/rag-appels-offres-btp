import { Ask } from "@/components/Ask";
import { Logo } from "@/components/Logo";

export default function Page() {
  return (
    <div className="shell">
      <header className="site-header">
        <Logo size={34} />
        <strong>RAG appels d&apos;offres BTP</strong>
        <nav>
          <a href="https://github.com/Teina-max/rag-appels-offres-btp" target="_blank" rel="noopener noreferrer">Code source</a>
          <a href="https://portfolio-n8n.vercel.app" target="_blank" rel="noopener noreferrer">Portfolio</a>
        </nav>
      </header>

      <main>
        <section className="hero-card">
          <h1>Interrogez un vrai dossier de consultation BTP.</h1>
          <p>Réponses fondées uniquement sur les pièces du dossier, avec citations précises.</p>
          <p className="hero-note">
            Corpus public : 2 DCE, 8 pièces écrites, 144 pages, 371 extraits vectorisés. Si l&apos;information
            n&apos;est pas dans le dossier, le système le dit au lieu d&apos;inventer.
          </p>
        </section>

        <Ask />
      </main>

      <footer className="page-footer">
        <p>
          Pipeline complet (extraction, chunking, embeddings Voyage, pgvector, grounding Claude) :
          {" "}<a href="https://github.com/Teina-max/rag-appels-offres-btp" target="_blank" rel="noopener noreferrer">dépôt public</a>.
          La démo embarque le corpus vectorisé et répond via les mêmes modèles que le CLI.
        </p>
        <p>
          Corpus : pièces écrites de marchés publics (Licence Ouverte). Démo par
          {" "}<a href="https://portfolio-n8n.vercel.app" target="_blank" rel="noopener noreferrer">Teina Teinauri</a>, Product Builder freelance.
        </p>
      </footer>
    </div>
  );
}
