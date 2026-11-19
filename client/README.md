# HIGHFIVE CHESS — client web

Application web de HIGHFIVE CHESS : parties en ligne et contre l’ordinateur,
défis, tournois, entraînement et espace joueur. Le client est une SPA React
alimentée par l’API HTTP et les événements Socket.IO du serveur.

## Prérequis

- Node.js compatible avec Vite 8
- npm
- Le serveur HIGHFIVE CHESS accessible en local ou via une instance configurée

## Configuration locale

Créer un fichier `.env.local` à la racine du client :

```dotenv
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

`VITE_API_URL` inclut le préfixe `/api`; les appels Axios utilisent ensuite des
chemins comme `/auth/login`. `VITE_SOCKET_URL` est l’origine Socket.IO, sans
préfixe `/api`. `VITE_WITH_CREDENTIALS` vaut `true` par défaut.

## Commandes

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Le serveur Vite écoute sur `http://localhost:5173`. Le lint et le type-check
peuvent aussi être exécutés avant le build.

## Organisation

- `src/pages/` : pages et parcours de l’application.
- `src/components/` : composants réutilisables, dont l’échiquier et les
  contrôles de partie.
- `src/context/`, `src/features/`, `src/store/` : état partagé, Redux et
  contextes React.
- `src/api/`, `src/axios.ts`, `src/socket.ts` : contrats HTTP et temps réel.
- `src/hooks/`, `src/chess/` : hooks et logique liée aux échecs.
- `src/**/*.test.tsx` : tests Vitest/Testing Library colocalisés avec le code.

Voir [la documentation d’intégration backend](./docs/connexion-backend.md),
[les paramètres de partie](./docs/parametres-partie.md) et
[le contexte du projet](./docs/PROJECT.md).
