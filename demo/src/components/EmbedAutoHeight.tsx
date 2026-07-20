"use client";

import { useEffect } from "react";

// Remonte la hauteur du contenu à la page hôte pour qu'elle dimensionne son iframe,
// ce qui évite une deuxième barre de défilement imbriquée.
// Seul un entier est transmis, jamais de contenu.
export function EmbedAutoHeight() {
  useEffect(() => {
    if (window.parent === window) return;

    // On mesure le conteneur de contenu, jamais document/body : ceux-ci s'étirent
    // à la hauteur de l'iframe, donc les mesurer ferait grandir l'iframe à chaque cycle.
    const target = document.querySelector<HTMLElement>(".shell");
    if (!target) return;

    const send = () => {
      window.parent.postMessage(
        { source: "rag-ao-demo", height: Math.ceil(target.getBoundingClientRect().height) },
        "*"
      );
    };

    const observer = new ResizeObserver(send);
    observer.observe(target);
    send();

    return () => observer.disconnect();
  }, []);

  return null;
}
