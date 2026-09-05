# L'Agglo en bus — site démonstrateur (non-officiel)

Site web progressif (PWA) de démonstration pour le réseau de transport **L'Agglo en bus** de la
communauté d'agglomération Gap-Tallard-Durance.

⚠️ **Ceci est une initiative personnelle indépendante, réalisée à titre de démonstrateur.
L'auteur n'a aucun lien avec la communauté d'agglomération Gap-Tallard-Durance ni avec
l'exploitant du réseau.** Voir la page "Mentions légales" du site.

## Principe

- Le contenu éditorial (accueil, actualités, infos pratiques, mentions légales…) est statique.
- Les données du réseau (lignes, arrêts, horaires, tracés) proviennent du flux **GTFS** publié à
  l'adresse `https://gtfs-rt.infra-hubup.fr/cagtd/current/gtfs`. Ce flux est téléchargé et analysé
  **directement dans le navigateur du visiteur** au chargement du site, puis mis en cache en
  mémoire pour la durée de la session (aucun stockage permanent, aucun serveur intermédiaire).

## Stack technique

- [Vite](https://vitejs.dev/) + JavaScript vanilla (pas de framework, pour un chargement rapide sur mobile)
- [JSZip](https://stuk.github.io/jszip/) + [PapaParse](https://www.papaparse.com/) pour lire le GTFS côté client
- [Leaflet](https://leafletjs.com/) + fond de carte OpenStreetMap pour les cartes
- PWA installable (manifest + service worker, mise en cache de l'app shell)

## Développement

```bash
npm install
npm run dev
```

## Build de production

```bash
npm run build
npm run preview
```

## Déploiement sur Vercel

Le projet est un site statique standard (sortie dans `dist/`). Depuis le dashboard Vercel :

1. Importer le dépôt Git.
2. Framework preset : **Vite**.
3. Build command : `npm run build` — Output directory : `dist`.
4. Déployer.

Le fichier `vercel.json` fourni redirige toutes les routes internes vers `index.html`
(nécessaire car il s'agit d'une application à page unique avec routage côté client).

## Licence des données

Les données GTFS restent la propriété de la communauté d'agglomération Gap-Tallard-Durance et de
son exploitant. Ce site ne fait que les afficher publiquement telles que publiées.
