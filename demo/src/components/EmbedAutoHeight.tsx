"use client";

import { useEffect } from "react";

// Remonte la hauteur du contenu à la page hôte pour qu'elle dimensionne son iframe,
// ce qui évite une deuxième barre de défilement imbriquée.
// Seul un entier est transmis, jamais de contenu.
export function EmbedAutoHeight() {
  useEffect(() => {
    if (window.parent === window) return;

    const send = () => {
      window.parent.postMessage(
        { source: "rag-ao-demo", height: document.documentElement.scrollHeight },
        "*"
      );
    };

    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    send();

    return () => observer.disconnect();
  }, []);

  return null;
}
