# Sources du corpus & cadre juridique

Ce dépôt embarque un corpus de **pièces écrites de marchés publics** (gardiennage et travaux) (DCE — Dossiers de Consultation des Entreprises) à des fins de démonstration et d'évaluation d'un système RAG. La démo publique tourne sur le corpus **gardiennage / sécurité** ; le corpus **travaux (BTP)** reste dans le dépôt pour la détection d'incohérences inter-lots.

## Pourquoi c'est un corpus libre

- Un DCE est un **document administratif public**. Depuis la loi pour une République numérique (2016) et le CRPA (art. L.321-1 s.), la **réutilisation gratuite des informations publiques est la règle**, sous **Licence Ouverte / Etalab 2.0** par défaut (décret n°2017-638).
- Jurisprudence : **TA de Caen, 12 mai 2009** — un DCE ne présente pas de caractère original, n'est donc **pas une « œuvre de l'esprit »** et peut être communiqué / réutilisé.

## Limite respectée : pas de plans d'architecte

Le droit de réutilisation ne couvre pas les documents sur lesquels un tiers détient des droits de propriété intellectuelle (CRPA L.321-2). Les **œuvres d'architecture (plans, croquis, planches graphiques) sont protégées** par le Code de la propriété intellectuelle.

➡️ **Ce dépôt ne contient que des pièces écrites** (CCTP, CCAP, DPGF, RC). **Aucune planche graphique** d'architecte n'est redistribuée.

## Provenance des pièces

| Source | Acheteur public | Pièces | Usage dans le projet |
|---|---|---|---|
| `corpus/raw/camp-des-milles/` | Fondation du Camp des Milles, Mémorial (13) — Gardiennage et surveillance des locaux | CCP, BPU | **Q&A sourcé** (démo publique gardiennage) |
| `corpus/raw/guyane-prefecture/` | Préfecture de la Guyane (973) — Surveillance et gardiennage de la préfecture et de la résidence | CCTP | **Q&A sourcé** (démo publique gardiennage) |
| `corpus/raw/grand-chambery/` | Grand Chambéry (73) — Surveillance d'équipements sportifs (lot 2) | CCTP | **Q&A sourcé** (démo publique gardiennage) |
| `corpus/raw/coupvray/` | Mairie de Coupvray (77) — Aménagement des combles, DCE indice B, mars 2021 | CCTP lots 00, 01, 02, 03, 05 | Détection **inter-lots** (interfaces plâtrerie / menuiseries / électricité) |
| `corpus/raw/cuzieu/` | Commune de Cuzieu (42) — École, 2015 | CCTP-DPGF combinés lots 01, 02, 03 | Détection **intra-lot déterministe** (jointure code CCTP ↔ DPGF) |

Chaque pièce reste attribuée à son acheteur public d'origine. Les incohérences utilisées pour l'évaluation (`eval/gold/`) sont **plantées volontairement** sur cette base réelle, et documentées comme telles.

## Licence

- **Code** du dépôt : voir `LICENSE` (MIT).
- **Corpus** (`corpus/raw/`) : informations publiques réutilisables sous **Licence Ouverte / Etalab 2.0**, attribution aux acheteurs ci-dessus.
