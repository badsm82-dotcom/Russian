# Russian 365

Professeur numérique adaptatif de russe pour un adulte francophone multilingue, **départ A0 intégral** (aucun mot ni aucune lettre supposés connus).
Implémentation du cahier des charges *Russian 365 V1.2 — Départ A0 intégral et profil multilingue*.

Ce dépôt livre les lots **P0 et P1** du plan de développement (§20), plus le moteur de passerelles linguistiques (F14) :
domaine pédagogique testé, contenu de la semaine 1, API, base de données et application web utilisable pour la première semaine.
Voir [docs/LIMITATIONS.md](docs/LIMITATIONS.md) pour ce qui n'est **pas** encore livré ni validé.

## Ce qui fonctionne

- **Inscription → profil A0** : zéro acquis, évaluations `null`, pas de test de placement, première unité `A0-01` (§3, AC19).
- **Profil linguistique** : sept langues aux niveaux déclarés exacts, désactivables une à une (§2.1).
- **Séances adaptatives** de 5/15/25/35/60 min (§6) : révisions dues d'abord, nouveautés plafonnées, présentation
  (son, traduction, démonstration) **avant** tout exercice évalué, production orale non notée, transfert sur mots inédits,
  pratique sans avancement anticipé, suppression des nouveautés si la dette de révision est élevée, autre explication
  et exercice plus simple après 3 échecs, remédiation ajoutée dans la séance après un échec.
- **Reprise** exacte d'une séance interrompue (AC07).
- **Correction déterministe côté serveur** (§8) : corrigé jamais envoyé au client ; accent pédagogique jamais exigé ;
  е accepté pour ё hors exercice ciblé ; saisie en lettres latines → demande de clarification sans pénalité ;
  réponse avec indice ou passerelle comptée « assistée » (décidé par le serveur).
- **Répétition espacée** exactement selon §9 (intervalles 1/3/7/14/30/60/120 j, plafond 180 j, remédiation 10 min),
  état dérivé par **repli chronologique** des tentatives (reproductible, robuste aux tentatives hors ligne arrivées dans le désordre).
- **Idempotence** par `client_attempt_id`, y compris pour des requêtes concurrentes (AC06).
- **Maîtrise** : QCM ≠ rappel actif (AC04) ; maîtrise active = 3 rappels autonomes sur 3 jours distincts dont un ≥ 14 j + usage en contexte.
- **Passerelles** (F14) : seules les analogies validées s'affichent, une par défaut + « autre comparaison », retour « utile ? »,
  ajustement progressif lissé, comparaison descriptive J1/J7 avec garde « données insuffisantes ».
- **Contenu A0** : 33 lettres (6 séances + consolidation), 13 expressions de la semaine 1, 232 exercices de 9 types,
  fiches de présentation, 13 passerelles (12 validées par le responsable produit d'après le cahier des charges, 1 brouillon jamais affichée),
  validation automatique (Unicode NFC, prérequis lettre par lettre, doublons, cohérence) — §17.
- **Tableau de bord** par compétence séparée, sans score global ; « non évalué » pour l'oral ; erreurs fréquentes et
  confusions de lettres (« Tu confonds Н et Р ») ; critère de sortie de l'alphabet ; action suivante.
- **Export** JSON/CSV et **suppression** de compte (AC13) ; isolation stricte entre comptes (AC14).
- **Web** (React/TypeScript, responsive, thème clair/sombre, taille de texte, navigation clavier, focus visible) :
  onboarding, séance, **clavier cyrillique virtuel**, audio par synthèse vocale du navigateur (vitesses 0,75–1,15),
  alphabet, parcours annuel, progrès, réglages. Aucun micro ni clavier russe requis (AC21).

## Démarrage

Prérequis : Node.js ≥ 22.12, PostgreSQL ≥ 13 (ou Docker).

```bash
cp .env.example .env
```

```bash
docker compose up -d db
```

```bash
npm install
```

```bash
npm run db:migrate
```

Développement (API sur :3000, interface Vite sur :5173 avec proxy `/v1`) :

```bash
npm run dev:server
```

```bash
npm run dev:web
```

Production simple (le serveur sert l'API et le build web) :

```bash
npm run build:web && npm start
```

Données de démonstration (compte A0 vierge si `DEMO_PASSWORD` est défini dans `.env`) :

```bash
npm run db:seed
```

## Mise en ligne (o2switch, bmcg.ch/russian)

Guide pas à pas : [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md). Le paquet de production (un seul fichier serveur, sans dépendances à installer) se construit avec :

```bash
BASE_PATH=/russian node scripts/build-release.mjs
```

## Tests

```bash
npm test
```

- `packages/domain/test` : scheduler à horloge simulée, Unicode, translittération, correction, prérequis, maîtrise, passerelles, planificateur, sortie d'alphabet — sans réseau ni base.
- `packages/content/test` : validation du contenu, couverture 33 lettres, aucun prérequis non enseigné, chaque exercice accepte sa propre réponse.
- `apps/server/test` : intégration API + PostgreSQL (base `TEST_DATABASE_URL` réinitialisée) — AC01, AC04–AC07, AC13–AC15, AC19–AC21, passerelles, remédiation.
- `e2e/first-session.mjs` : parcours navigateur (Playwright) inscription → onboarding → séance complète au clavier virtuel → progrès :

```bash
BASE_URL=http://localhost:3000 node e2e/first-session.mjs
```

Autres commandes : `npm run typecheck`, `npm run content:check` (rapport de validation du contenu).

## Architecture

Monolithe modulaire (§14) :

```
packages/domain    Domaine pur : scheduler, correction, prérequis, maîtrise, planificateur, passerelles, profil A0
packages/content   Contenu versionné (alphabet, lexique, passerelles, exercices générés) + validation automatique
apps/server        API Fastify /v1, PostgreSQL (migrations SQL), journal d'événements append-only
apps/web           PWA React/TypeScript (Vite)
e2e                Test de bout en bout Playwright
```

Le moteur déterministe contrôle la progression et la notation ; aucune dépendance à un fournisseur d'IA.
Documentation : [API](docs/API.md) · [Limites connues](docs/LIMITATIONS.md).

## Variables d'environnement

Voir [.env.example](.env.example). Aucune clé d'API n'est nécessaire dans cette version.
