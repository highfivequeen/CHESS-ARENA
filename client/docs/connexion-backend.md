# Intégration du client avec le backend

Ce document décrit les contrats actuellement utilisés par le client. Pour
modifier une route ou un événement, vérifier ensemble l’appel frontend et la
route/le gestionnaire serveur correspondants. Les sources de vérité sont
`src/api/`, les pages concernées, `server/src/routes/` et
`server/src/events/`.

## Adresses

Le serveur monte son API HTTP sous `/api`. Le client configure Axios avec
l’URL complète de cette API, et Socket.IO avec l’origine du serveur :

```dotenv
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Les appels Axios utilisent des chemins relatifs à `VITE_API_URL`, par exemple
`/auth/login` ou `/games/me`. Axios ajoute le jeton d’accès, gère le
renouvellement sur les réponses `401` et transmet les identifiants de session
invité aux routes de jeu invité. Voir `src/axios.ts` et `src/guestSession.ts`.

## Authentification

`src/api/authApi.ts` expose notamment :

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `POST /auth/refresh` (renouvellement également géré par l’intercepteur Axios)
- `GET /users/me`
- `POST /auth/password/forgot`, `POST /auth/password/reset`

`AuthContext` s’appuie sur Redux pour conserver l’utilisateur et le jeton. Les
pages doivent passer par `useAuth()` et `axiosInstance` plutôt que créer une
seconde gestion de session.

## Parties et matchmaking

Les pages de jeu utilisent l’API HTTP pour créer/récupérer les parties, lire
les coups et effectuer les actions de jeu. L’historique d’un compte est chargé
avec `GET /games/me`; le client consulte les détails et les coups via
`GET /games/:gameId` et `GET /games/:gameId/moves`.

La recherche d’adversaire suit deux étapes :

1. `POST /games/matchmaking` crée la recherche et retourne le participant ainsi
   que, pour un invité, son jeton de session.
2. Socket.IO rejoint la file avec `matchmaking-join`. Les autres événements de
   la file sont `matchmaking-found`, `matchmaking-error` et
   `matchmaking-cancel`.

Les noms d’événements de partie utilisés par le client comprennent
`join-game`, `leave-game`, `game-state`, `game-ready`, `game-updated`,
`move-played`, `timer-update`, `player-joined`, `game-error` et
`chat-message`. Les notifications sont diffusées sous `notification`.
Le payload des événements est défini par les constantes dans
`server/src/events/`; ne pas substituer des noms inventés comme
`game:moveMade`.

## Autres domaines

- Défis : la page de jeu charge les défis du compte via `GET /challenges/me`.
- Historique : `GamesPage` utilise `/games/me`, `/games/:gameId` et
  `/games/:gameId/moves`.
- Messagerie : `MessagesPage` utilise les routes `/conversations/*` et les
  événements Socket.IO associés ; ne pas confondre ce flux avec le chat d’une
  partie (`/games/:gameId/messages`, événement `chat-message`).
- Notifications : le contexte de navigation écoute `notification`. Le
  transport est temps réel ; l’affichage et les actions relèvent du client.

Les listes exhaustives des routes et les règles métier sont maintenues dans
`server/docs/` (notamment `parties-et-coups.md`, `temps-reel.md`,
`defis.md` et `social-et-blocages.md`).

## Vérifications après une modification de contrat

1. Comparer l’appel client au routeur/contrôleur serveur, y compris le préfixe
   `/api`, la méthode HTTP et la forme de la réponse.
2. Pour Socket.IO, comparer le nom et le payload dans les événements serveur
   et dans le composant ou contexte client qui les consomme.
3. Exécuter `npm run typecheck`, `npm run lint` et `npm test` dans `client/`,
   puis les tests ciblés côté serveur si le contrat serveur a changé.
