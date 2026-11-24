# Limites connues — version 0.1 (lots P0 + P1)

À lire avant tout usage. Rien ci-dessous n'est présenté comme terminé ou validé.

## Validation linguistique
- **Tout le contenu (lettres, expressions, 232 exercices, fiches) est au statut `pending_review`** : rédigé et contrôlé
  automatiquement, mais **pas encore relu par un russophone compétent** (§17). Il n'est servi que si `ALLOW_PENDING_CONTENT=true`.
  À faire relire : accents toniques, translittérations approximatives, réponses acceptées, distracteurs, explications.
- Les 12 passerelles « validées » reprennent les exemples fournis dans le cahier des charges (§2.2, §5) ; une suggestion
  interne (р / espagnol) reste en brouillon et n'est jamais affichée.

## Contenu
- Seul le **mois 1** est disponible : semaine 1 (33 lettres, 13 expressions, unités A0-01 à A0-07) et semaines 2 à 4
  (unités A0-08 à A0-12 : je/tu/vous, phrases sans « être », vouloir, négation, besoins, dialogue guidé au café).
  Les mois 2 à 12 restent à produire ; le parcours annuel est affiché comme indicatif.
- Pas de banque de dialogues ni de textes de lecture (cible §17 : 10 + 10).

## Audio et oral
- Audio = **synthèse vocale du navigateur** (voix ru-RU si présente), non validée ; aucun enregistrement natif.
  Sans voix russe, l'interface le signale et les écoutes peuvent être passées sans effet sur la progression.
- **Pas d'ASR ni d'évaluation de prononciation** : l'expression orale et la prononciation sont affichées « non évaluées ».
  Les répétitions orales sont pratiquées mais jamais notées.

## Fonctions non livrées (P2–P5)
- Tuteur IA / jeux de rôle (F09), TTS/ASR serveur, lecteur et bibliothèque (F10), évaluations M1–M12 (F11 ; le bilan alphabet J7–J14 sans aide est livré),
  outil d'administration du contenu, notifications. Les routes correspondantes répondent **501**.
- Hors ligne : la séance en cours (ou « préparée pour hors ligne ») continue sans réseau, avec correction provisoire
  sur l'appareil (IndexedDB) ; les réponses sont rejouées dans l'ordre au retour du réseau et recorrigées par le serveur.
  **Une nouvelle séance ne peut pas être créée sans réseau** (la planification reste côté serveur) ; les comparaisons
  linguistiques ne sont pas disponibles hors ligne. Les corrigés de la séance sont stockés sur l'appareil (pas de mode examen).
- Pas de réinitialisation de mot de passe ni de vérification d'e-mail.
- Pas de rappel quotidien (notifications) : utiliser un rappel du téléphone en attendant.

## Mesures
- Minutes actives : estimation (durée de réponse plafonnée à 2 min + 30 s par présentation).
- Le grade « facile » (3) est déduit par le serveur (réponse autonome rapide sur un item déjà réussi) : heuristique à calibrer.
- Seuils (consolidation d'unité 80 %, sortie d'alphabet, plafonds de nouveautés, durées estimées) : valeurs initiales à ajuster
  après le pilote de 14 jours (§19).
- Une réussite sur un item non encore dû (pratique dans la même séance) est enregistrée mais ne fait pas avancer le niveau
  (règle ajoutée pour éviter de compresser les intervalles ; non spécifiée dans le cahier des charges).

## Exploitation
- Limitation de débit en mémoire (une seule instance). Pas encore d'observabilité (latence, coûts), ni de sauvegarde/restauration outillée.
- Conformité LPD/RGPD à vérifier avant mise en production (§18). Aucun audio n'est stocké.
- Contenu servi depuis le code (`@r365/content`) et recopié en base avec versions d'exercices immuables ; changer un exercice impose d'incrémenter sa version.
