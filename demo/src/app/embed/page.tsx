import type { Metadata } from "next";
import { Ask } from "@/components/Ask";

// Version sans en-tête ni pied de page, destinée à être embarquée en iframe
// depuis une page tierce qui porte déjà son propre contexte.
export const metadata: Metadata = {
  title: "Questions sur un dossier de consultation",
  robots: { index: false, follow: false }
};

export default function EmbedPage() {
  return (
    <div className="shell shell--embed">
      <main>
        <Ask />
      </main>
    </div>
  );
}
