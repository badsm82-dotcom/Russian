# API Russian 365 — `/v1`

JSON, authentification `Authorization: Bearer <jeton>` sauf `/v1/auth/*`.
Erreurs structurées : `{"error":{"code","message","details"}}` avec 400 (validation), 401, 404 (y compris ressource d'un autre compte), 409 (conflit, prérequis non enseigné, étape hors ordre), 429 (limitation auth), 501 (fonction non livrée), 503.
Dates en UTC (ISO 8601) ; l'affichage local relève du client (fuseau du profil, `Europe/Zurich` par défaut).

## Authentification
| Méthode | Route | Corps / réponse |
|---|---|---|
| POST | `/auth/register` | `{email, password}` → 201 `{token, user_id}` ; crée le profil A0 |
| POST | `/auth/login` | `{email, password}` → `{token, user_id}` |
| POST | `/auth/logout` | révoque le jeton |

## Profil
| Méthode | Route | Notes |
|---|---|---|
| GET | `/profile` | profil, `baseline` A0, `settings`, `languages`, `onboarded` |
| PATCH | `/profile` | `{settings?: {...partiel}, onboarded?, consent_version?}` (validation stricte) |
| GET | `/profile/languages` | langues connues et niveaux déclarés |
| PATCH | `/profile/languages` | `{known_languages:[{code, proficiency, bridges_enabled}]}` |

## Parcours
| Méthode | Route | Notes |
|---|---|---|
| GET | `/curriculum` | unités (courante, verrouillée, complétée) + parcours annuel indicatif |
| GET | `/alphabet` | 33 lettres + état de l'apprenant |

## Séances
| Méthode | Route | Notes |
|---|---|---|
| POST | `/sessions` | `{minutes?: 5\|15\|25\|35\|60, mode?, replace?}` → 201 nouvelle séance, ou 200 `resumed:true` si une séance active existe |
| GET | `/sessions/current` | séance active ou `null` |
| GET | `/sessions/{id}` | étapes hydratées (fiches, exercices **sans corrigé**), `cursor` |
| POST | `/sessions/{id}/steps/{i}/ack` | présentation vue (item « enseigné ») ou répétition orale faite ; idempotent |
| POST | `/sessions/{id}/steps/{i}/hint` | renvoie l'indice ; l'étape devient « assistée » |
| POST | `/sessions/{id}/attempts` | voir ci-dessous |
| POST | `/sessions/{id}/complete` | bilan de séance |
| GET | `/reviews/due` | éléments dus |

Tentative :

```json
{"client_attempt_id":"uuid","exercise_id":"uuid","step_index":4,"answer":{"text":"Я хочу кофе"},
 "assisted":false,"duration_ms":5400,"occurred_at":"2026-11-24T08:00:00Z","mode":"standard"}
```

`answer` : `{choice_id}` (QCM), `{text}` (saisie) ou `{dont_know:true}`. `abandoned:true` = interruption (pas un échec).
`mode:"audio_unavailable"` pour une écoute impossible : passée sans effet. `occurred_at` (hors ligne) accepté s'il est plausible (≤ 30 j, pas futur).

Réponse 201 (ou 200 `replayed:true` si même `client_attempt_id`) :

```json
{"outcome":"correct","grade":2,"accepted":true,"feedback_fr":"Correct.","expected":"Я хочу́ ко́фе.",
 "review_due_at":"2026-11-25T08:00:00Z","mastery_status":"learning","early_review":false,
 "remediation_step_added":false,"cursor":5}
```

`outcome: "unscorable"` (réponse vide, mauvais alphabet) : aucune pénalité, l'étape reste à refaire. La note est toujours calculée par le serveur.

## Passerelles
| Méthode | Route | Notes |
|---|---|---|
| GET | `/concepts/{id}/bridges?context=lesson\|exercise&offset=0&session_id&step_index` | passerelle validée suivante ou `bridge:null` ; en contexte `exercise`, l'étape devient assistée |
| POST | `/bridges/{id}/feedback` | `{helpful: boolean, bridge_attempt_id?}` |

## Analyse et données
| Méthode | Route | Notes |
|---|---|---|
| GET | `/analytics` | compétences séparées, rétention 7/30 j, erreurs, courbe hebdomadaire, sortie alphabet, effet des passerelles, action suivante |
| GET | `/export?format=json\|csv` | export complet (JSON) ou tentatives (CSV) |
| DELETE | `/account` | `{confirm:"SUPPRIMER"}` → suppression définitive en cascade |

## Non livrées (501)
`/tutor/dialogues`, `/speech/transcribe`, `/speech/synthesize`, `/library`, `/assessments/{id}/submit`.
