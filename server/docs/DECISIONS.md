# Décisions techniques et produit

N'ajouter que les décisions durables. Ne pas y enregistrer chaque modification mineure.

## Format
### AAAA-MM-JJ — Titre court
- Contexte :
- Décision :
- Raisons :
- Conséquences / compromis :
- Zones concernées :

### 2026-10-25 — Documentation initiale du dépôt (constat, pas une nouvelle décision)
- Contexte : première initialisation de `docs/PROJECT.md`, `docs/DESIGN.md` et `docs/DECISIONS.md` pour ce backend ; les entrées ci-dessous consignent des décisions déjà prises dans le code existant, repérées lors de cette analyse.
- Décision : documenter ces choix tels qu'implémentés, sans les modifier.
- Raisons : respecter la consigne « ne rien deviner, ne pas refondre » pour cette première étape.
- Conséquences / compromis : les dates ci-dessous sont la date de documentation, pas la date de décision d'origine (inconnue).
- Zones concernées : ensemble du backend `HIGHFIVE_CHESS_BACKEND`.

### 2026-10-25 — Architecture en couches strictes routes → controller → service → repository
- Contexte : chaque domaine métier (auth, jeu, défis, tournois, social, signalements...) suit la même structure : une route Express, un contrôleur qui valide la requête, un service qui porte la logique métier, un repository qui accède à Prisma.
- Décision : conserver cette séparation pour tout nouveau domaine ou endpoint.
- Raisons : cohérence du code existant, testabilité (les services et repositories sont testés indépendamment des routes HTTP, voir les nombreux `*.test.ts` colocalisés).
- Conséquences / compromis : un peu plus de fichiers par fonctionnalité, mais logique métier découplée du framework HTTP.
- Zones concernées : `src/routes/`, `src/controller/`, `src/service/`, `src/repository/`.

### 2026-10-25 — Base de données managée via Prisma 8 + Prisma Composer
- Contexte : `module.ts`/`service.ts` provisionnent une base PostgreSQL via `@prisma/composer-prisma-cloud` (région `us-east-1`) et lient l'app Express construite par `tsdown` ; le contrat de données vit dans `src/prisma/contract.prisma` et les migrations dans `migrations/app/<horodatage>_<nom>`.
- Décision : la gestion du schéma et des déploiements passe par l'outillage Prisma Composer plutôt que par des migrations SQL manuelles ou un autre ORM.
- Raisons : non documentées explicitement dans le code ; le `README.md` racine présente ce flux comme le mode de fonctionnement principal (`npm run dev:composer`, `npm run deploy`).
- Conséquences / compromis : dépendance à des paquets en version pré-release (`@prisma/orm-postgres@8.0.0-rc.12`, `prisma@8.0.0-rc.18`, `alchemy@2.0.0-beta.78`) — risque de changements de comportement lors des mises à jour (politique de versions : voir l'entrée du 2026-11-19). Un mode « direct » existe aussi (`npm run dev`, nécessite `DATABASE_URL`) sans passer par Composer.
- Zones concernées : `module.ts`, `service.ts`, `prisma.config.ts`, `prisma-composer.config.ts`, `src/prisma/`, `migrations/`.

### 2026-10-25 — Authentification JWT access/refresh avec hachage argon2id
- Contexte : `src/utils/token.ts` génère des JWT d'accès et de rafraîchissement signés séparément (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), avec des durées configurables (`JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`) ; les mots de passe et les tokens de rafraîchissement persistés sont hachés avec `argon2` (variante `argon2id`).
- Décision : `argon2id` est l'algorithme de hachage de référence pour les mots de passe et les tokens sensibles.
- Raisons : non documentées explicitement ; `argon2id` est un choix reconnu comme robuste contre les attaques GPU/ASIC.
- Conséquences / compromis : une seconde bibliothèque (`bcryptjs`) coexistait dans `src/utils/hash.util.ts` mais n'était appelée nulle part (`passwordResetService` et `userService` n'en importent que les empreintes HMAC) ; elle a été retirée le 2026-11-19 (voir l'entrée du même jour).
- Zones concernées : `src/utils/password.ts`, `src/utils/token.ts`, `src/middlewares/auth.middleware.ts`, `src/service/authService.ts`.

### 2026-10-25 — Sécurité HTTP : liste blanche d'origines CORS stricte et en-têtes durcis
- Contexte : `src/config/http-security.config.ts` construit les options CORS à partir de `CLIENT_ORIGINS` (parsées et validées comme origines HTTP/HTTPS strictes, sans utilisateur/mot de passe/chemin/requête/fragment) ; `src/index.ts` applique `helmet()` globalement et désactive l'en-tête `X-Powered-By`.
- Décision : aucune origine n'est acceptée par défaut en production si `CLIENT_ORIGINS` n'est pas défini (liste vide) ; en développement, `http://localhost:5173` est la valeur par défaut.
- Raisons : limiter la surface d'attaque CSRF/CORS en production tout en restant utilisable sans configuration en local.
- Conséquences / compromis : la valeur par défaut de développement (`5173`) ne correspondait pas aux ports du frontend ; l'incohérence a été corrigée le 2026-11-19 en alignant le frontend sur `5173` (voir l'entrée du même jour).
- Zones concernées : `src/config/http-security.config.ts`, `src/index.ts`.

### 2026-10-25 — Gestion centralisée des erreurs HTTP et de la validation d'entrée
- Contexte : `src/service/errorService.ts` définit une classe `HttpError` unique (code/status/statusCode/success) et une fonction `rethrowServiceError` pour convertir toute erreur de service en `HttpError` ; `src/controller/controller.utils.ts` fournit des helpers de validation partagés (`readParamId`, `readBody`, `readString`, `readPositiveInteger`, `requireCurrentUser`, `requireAdmin`).
- Décision : tous les contrôleurs valident leurs entrées et gèrent leurs erreurs via ces helpers communs plutôt que par des vérifications ad hoc ou une bibliothèque de schéma (`zod`/`valibot` ne sont pas utilisées dans `src/controller/` à ce jour malgré la présence de `valibot` dans les `overrides` de `package.json`).
- Raisons : cohérence des réponses d'erreur (messages en français, codes HTTP homogènes) sur l'ensemble de l'API.
- Conséquences / compromis : toute nouvelle validation doit passer par ces helpers (ou les étendre) pour rester cohérente ; pas de schéma déclaratif centralisé décrivant la forme des payloads.
- Zones concernées : `src/service/errorService.ts`, `src/controller/controller.utils.ts`, `src/middlewares/error.middleware.ts`, l'ensemble de `src/controller/`.

### 2026-11-19 — Nom officiel du produit : HIGHFIVE_CHESS
- Contexte : le nom variait selon les sources (« server », `highfive_chess_backend`, « HIGHFIVE_CHESS », « highfive_tournament » / « HIGHFIVE Tournament », « CHESSARENA » côté frontend, `vipp_session` comme nom de cookie par défaut).
- Décision : le nom officiel est HIGHFIVE_CHESS. Le cookie d'authentification par défaut devient `highfive_chess_session` (au lieu de `vipp_session`) ; l'expéditeur e-mail par défaut reste « HIGHFIVE Chess ».
- Raisons : un seul nom de produit, sans reliquat d'anciens projets.
- Conséquences / compromis : si les fichiers `.env` (hors dépôt) définissent encore `AUTH_COOKIE_NAME` ou `EMAIL_FROM` avec « highfive_tournament » / « HIGHFIVE Tournament », ils doivent être mis à jour à la main ; changer le nom du cookie oblige les utilisateurs concernés à se reconnecter une fois.
- Zones concernées : `src/utils/authConfig.ts`, `src/service/emailService.ts`, `.env.example`, fichiers `.env*` locaux.

### 2026-11-19 — Suppression de `bcryptjs` : `argon2` seule bibliothèque de hachage
- Contexte : `src/utils/hash.util.ts` exposait `hashValue` / `compareValue` (bcrypt), mais aucun fichier ne les appelait ; seules `resetDigest` et `digestMatches` (HMAC-SHA256) étaient importées.
- Décision : suppression de `hashValue`, `compareValue` et de la dépendance `bcryptjs`. Mots de passe et tokens restent hachés avec `argon2id`.
- Raisons : code mort, dépendance inutile, deux algorithmes à maintenir pour rien. Aucun hachage bcrypt n'a pu être produit par l'application, donc aucune donnée existante n'est concernée.
- Conséquences / compromis : si de vieux hachages bcrypt existaient en base (import manuel), ils ne seraient plus vérifiables ; rien dans le code actuel n'en crée.
- Zones concernées : `src/utils/hash.util.ts`, `package.json`, `package-lock.json`.

### 2026-11-19 — ESLint côté backend
- Contexte : aucun lint n'était configuré côté serveur, contrairement au frontend.
- Décision : ajout d'ESLint 10 avec la config plate `eslint.config.js` (règles « recommended » de JavaScript et de TypeScript-ESLint) et du script `npm run lint`. `dist`, `migrations` et `src/prisma/contract.d.ts` (fichiers générés) sont ignorés ; un nom préfixé par `_` marque une valeur volontairement inutilisée.
- Raisons : même niveau d'exigence que le frontend, détection des imports et variables inutilisés.
- Conséquences / compromis : les 13 problèmes existants ont été corrigés sans changement de comportement (imports et variables inutilisés, `cause` ajoutée à une erreur relancée, `const` dans le handler `JOIN_GAME`). Le lint n'est pas encore branché sur une CI.
- Zones concernées : `eslint.config.js`, `package.json`, `src/`.

### 2026-11-19 — Dépendances pré-release : versions exactes, pas de retour à Prisma 7
- Contexte : `prisma`, `@prisma/orm-postgres`, `alchemy` et `@prisma/composer*` n'existent qu'en RC, beta ou 0.x. Vérification npm du 2026-11-19 : le tag `latest` de `prisma` pointe vers `8.0.0-rc.34` (dernier stable : `7.10.1`) et `@prisma/orm-postgres` n'a aucune version stable.
- Décision : rester sur Prisma 8 RC en versions exactes (`.npmrc` : `save-exact=true`), sans repasser à Prisma 7 ni monter de version sans validation. Mettre à jour d'un seul bloc (`prisma`, `@prisma/orm-postgres`, `@prisma/composer`, `@prisma/composer-prisma-cloud`, `@prisma/dev`, `alchemy` et les `overrides`), jamais paquet par paquet.
- Raisons : d'après la structure du projet (contrat `contract.prisma` / `contract.json`, migrations `.ts` + `ops.json`, Composer), revenir à Prisma 7 reviendrait à réécrire la couche d'accès aux données et les migrations. Les versions actuelles sont celles sur lesquelles `migration:status`, `db:verify` et les tests PostgreSQL ont été validés.
- Conséquences / compromis : le risque de changement de comportement reste accepté. Avant toute montée de version : `npm run migration:status`, `npm run db:verify`, `npm test` et `npx vitest run src/prisma/db.integration.test.ts` sur la base de test, puis déploiement hors production d'abord.
- Zones concernées : `package.json`, `package-lock.json`, `.npmrc`, `module.ts`, `service.ts`, `src/prisma/`, `migrations/`.
