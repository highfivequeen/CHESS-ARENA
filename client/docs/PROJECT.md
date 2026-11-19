# Project context

> À compléter lors de la première exploration du dépôt. Ne pas inventer les informations manquantes.

## Produit
- Nom : **HIGHFIVE_CHESS** (nom officiel, confirmé le 2026-11-19), affiché « HIGHFIVE CHESS » dans l'interface (titre HTML dans `index.html`, en-tête, pages d'authentification). Clés de stockage : `highfive-chess-board-appearance` et `highfive-chess-move-sound-enabled` (les anciennes clés `chessarena-board-appearance` et `CHESSARENAMoveSoundEnabled` restent lues en secours). Le dossier/paquet s'appelle `highfive_chess` / `highfive_chess_client`.
- Objectif principal : plateforme web de jeu d'échecs en ligne (parties classées/amicales, contre l'ordinateur, défis directs, tournois, apprentissage, suivi de classement et de succès).
- Utilisateurs : joueurs inscrits, joueurs invités (sans compte, via lien de défi ou partie invité), organisateurs de tournois (`OrganizerDashboardPage`) et administrateurs (`AdminDashboardPage`).
- Fonctionnalités principales (déduites des pages dans `src/pages/`) :
  - Jeu : partie locale/en ligne (`PlayPage`), contre l'ordinateur (`ComputerGamePage`), défis (`challenge/:userId`, `challenge-link/:token`), partie invité (`guest-game/:token`), observation de parties (`WatchPage`).
  - Social : messagerie (`MessagesPage`), notifications (`NotificationsPage`), recherche de joueurs (`PlayerSearch`), profil (`ProfilePage`).
  - Compétition : tournois (`TournamentsPage`), classements (`RankingsPage`), succès (`AchievementsPage`).
  - Autres : puzzles tactiques (`ProblemsPage`), leçons (`LearnPage`), éditeur d'échiquier (`BoardEditorPage`), gestion des utilisateurs (`UsersPage`), tableau de bord admin (indicateurs de comptes, parties, tournois, liste d'utilisateurs et signalements), tableau de bord organisateur.

## Stack technique
- Framework frontend : React 19 (`react`, `react-dom` ^19.2.8) avec Vite 8.
- Langage : TypeScript (compilation stricte via `tsc -b`, voir `tsconfig.app.json`).
- Styling / UI library : Tailwind CSS v4 (`@tailwindcss/vite`) + variables CSS personnalisées (`src/index.css`, `src/App.css`) ; icônes via `lucide-react`.
- Gestion d'état : Redux Toolkit (`@reduxjs/toolkit`, `react-redux`) pour l'état global (`src/store/store.ts`, slices `authSlice`, `counterSlice`) ; complété par des React Context pour des préoccupations transverses (`AuthContext` encapsule le slice Redux, `SocketContext`, `ChessAppearanceContext`, `NavigationContext`).
- Routage : `react-router-dom` v7 (`src/routes/index.tsx`), avec routes protégées et routes publiques (invité) selon l'état d'authentification.
- API / backend : backend séparé (projet voisin `HIGHFIVE_CHESS_BACKEND`, Node/Express + Prisma) consommé via Axios (`src/axios.ts`, instance avec intercepteur de rafraîchissement de token JWT) et Socket.IO (`socket.io-client`, `src/socket.ts`) pour le temps réel. URLs configurées via `VITE_API_URL` / `VITE_SOCKET_URL` (`.env`).
- Tests : aucun framework de test ni script configuré (voir « À confirmer »).
- Build / package manager : npm (`package-lock.json` présent) ; build = `tsc -b && vite build`.

## Architecture
- Point d'entrée : `src/main.tsx` (monte `App` dans `ReduxProvider > BrowserRouter > AuthProvider > SocketProvider`).
- Dossier des pages : `src/pages/`.
- `ProblemsPage` propose un entraînement tactique séparé des leçons, à progression
  débutant/intermédiaire/avancé et thèmes mélangés (mat, capture, fourchette).
  Les coups légaux sont vérifiés par `chess.js`; chaque solution est expliquée.
- Les préférences du plateau sont gérées dans `ChessAppearanceContext`; elles
  incluent le thème Abricot et un preset de pièces à contour reproduisant l’image de référence.
- Chargement différé : les pages de route et les onglets secondaires de
  `MainApp` utilisent `React.lazy`/`Suspense`; l'accueil reste dans le chargement
  de l'espace principal pour éviter un aller-retour réseau supplémentaire à
  l'arrivée.
- Dossier des composants : `src/components/` (primitives UI dans `src/components/ui/`, flux d'authentification dans `src/components/auth/`).
- Dossier des styles : `src/index.css` (tokens globaux + import Tailwind), `src/App.css` (styles spécifiques par page/section, fichier volumineux avec variables scoppées par préfixe : `--vc-*`, `--home-*`, `--guest-*`, `--computer-*`, `--setup-*`, `--auth-*`, `--piece-*`).
- Dossier des appels API : `src/api/` (`authApi.ts`, `chatApi.ts`) + instance centrale `src/axios.ts`.
- Dossier des tests : aucun (pas de dossier de tests ni de fichiers `*.test.*`/`*.spec.*` dans `src/`).
- État additionnel : `src/context/` (providers transverses), `src/features/` (slices Redux), `src/types/` (types partagés), `src/hooks/` (hooks utilitaires), `src/chess/` (logique/présentation liées aux échecs).

## Commandes validées
- Installation : non exécutée pendant cette analyse ; `package-lock.json` présent, donc `npm install`/`npm ci` est l'outil attendu (à confirmer en l'exécutant).
- Développement : `npm run dev` → `vite` (port **5173** défini dans `vite.config.ts` avec `strictPort`, aligné sur `CLIENT_ORIGINS` du backend ; l'API sur le port 3000 est appelée directement via `VITE_API_URL` / `VITE_SOCKET_URL`, sans proxy Vite).
- Lint : `npm run lint` → `eslint .`.
- Tests : aucune commande définie dans `package.json` (pas de script `test`).
- Build : `npm run build` → `tsc -b && vite build`. Un script `npm run typecheck` existe aussi (`tsc --noEmit -p tsconfig.app.json`).

## Contraintes
- Compatibilité navigateur : non documentée dans le projet.
- Responsive : des points de rupture mobiles sont présents (`@media (max-width: 1024px)` dans `src/index.css` et `src/App.css`), mais aucune documentation formelle du comportement attendu par taille d'écran.
- Accessibilité : aucun test ou outillage a11y automatisé détecté.
- Contraintes de performance : non documentées.
- Conventions spécifiques : alias d'import `@` → `src` (`vite.config.ts`) ; configuration ESLint « flat config » (`eslint.config.js`) coexistant avec une entrée `eslintConfig` héritée de Create React App dans `package.json` (voir « À confirmer »).

## À confirmer
Ne conserver ici que les questions réellement non résolues.
- **Configuration ESLint dupliquée** : `package.json` contient un bloc `eslintConfig` (`react-app`, `react-app/jest`, héritage Create React App) en plus du fichier `eslint.config.js` (flat config Vite/ESLint 9+). Lequel est actif/voulu ?
- **Fichiers « copy »** : `src/pages/PlayPage copy.tsx` et `src/pages/SidebarLeft copy.tsx` existent en plus des fichiers originaux. Sont-ils des brouillons à supprimer, ou du code encore utilisé ?
- **Tests** : aucune stratégie de test n'est en place. Est-ce un choix délibéré pour ce projet ou un chantier à ouvrir ?
- **Lint** : `npm run lint` signale 5 problèmes antérieurs au 2026-11-19 : 4 erreurs `react-hooks/set-state-in-effect` (`AuthContext.tsx`, `LearnPage.tsx`, `SidebarLeft.tsx` et son fichier « copy ») et 1 avertissement `react-hooks/exhaustive-deps` (`LearnPage.tsx`). Corriger ou assouplir la règle ?