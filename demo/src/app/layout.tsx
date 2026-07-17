import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG appels d'offres BTP | Démo sourcée",
  description:
    "Posez une question sur un vrai dossier de consultation BTP : réponses fondées sur les pièces, citations précises, refus explicite quand l'information n'existe pas."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
