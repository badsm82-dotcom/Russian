# Analyse documentaire des méthodes d'apprentissage du russe — pour Russian 365

> Document de travail interne. Usage strictement personnel, non commercial.
> Rédigé le 24/11/2026. Public visé : le responsable produit et le relecteur pédagogique de Russian 365.

## 0. Avertissements méthodologiques (à lire en premier)

- **Accès web partiel.** La recherche web (moteur de recherche) a fonctionné, ainsi que la lecture de pages GitHub.
  En revanche, la **lecture directe** de plusieurs sites était bloquée par la configuration réseau de la session
  (notamment `tatoeba.org` et `kaikki.org`). Pour ces sites, les informations viennent de **résultats de recherche
  et de sources secondaires** (wiki Tatoeba, Wikipédia, PyPI, etc.), pas de la page officielle elle-même.
  **Il faut revérifier chaque licence à la source au moment de l'import** (date, version de la licence).
- **Légende des niveaux de certitude** utilisée dans tout le document :
  - **[V]** vérifié pendant cette recherche sur une source primaire (page officielle, dépôt, article) ;
  - **[S]** vérifié uniquement sur une source secondaire (Wikipédia, forum, agrégateur, résumé) ;
  - **[C]** issu de mes connaissances, **non vérifié** pendant cette recherche — à contrôler avant de s'en servir.
- **Aucun contenu protégé n'a été récupéré.** Les méthodes commerciales sont décrites au niveau des principes,
  de la progression et des formats d'exercice. Seules les ressources sous licence ouverte ou du domaine public
  sont proposées à l'import (section 5).
- Les études d'efficacité des applications commerciales sont, pour la plupart, **financées par l'éditeur** :
  c'est signalé chaque fois.

---

## 1. Méthodes et cours existants

### 1.1 Vue d'ensemble

| Méthode | Type | Écrit/cyrillique | Cas | Aspect | Mouvement | Preuves d'efficacité |
|---|---|---|---|---|---|---|
| FSI Russian | audio-oral (années 1960–70), dialogues + drills | oui, dès le début | progressifs, tous couverts | oui | oui | aucune étude contrôlée ; référence d'heures FSI |
| DLI Russian Basic | intensif militaire (≈ 1 an) | oui | tous | oui | oui | aucune étude publique |
| Assimil « Le russe » | dialogues quotidiens, phases passive puis active | cyrillique + transcription | implicites, notes | implicite | implicite | aucune |
| Pimsleur Russian | audio seul, rappel à intervalles croissants | quasi absent | implicites | implicite | implicite | aucune étude indépendante |
| Michel Thomas Russian | audio, construction guidée de phrases | absent | partiels | partiel | partiel | aucune |
| Teach Yourself Complete Russian | manuel + audio, unités thématiques | oui, unité 1 | tous (A1→B1) | oui | oui | aucune |
| New Penguin Russian Course | manuel grammatical autodidacte | oui | tous, tôt | oui | oui | aucune |
| Поехали! / Дорога в Россию | manuels RKI communicatifs (Russie) | oui, introduction progressive | ordre RKI canonique | oui | oui | aucune étude contrôlée |
| Russian in Exercises (Khavronina) | cahier de drills grammaticaux | oui | tous, par thème | oui | oui | aucune |
| Duolingo | appli ludique, micro-exercices | oui, alphabet au début | implicites | implicite | implicite | études maison (espagnol/français) |
| Babbel / Busuu / Mondly / Memrise | applis commerciales | oui | variables | variables | variables | études commanditées ou aucune |
| RussianPod101 | podcasts par niveau | transcriptions | explications | explications | explications | aucune |
| LingQ / input compréhensible / TPRS | lecture + écoute massives | oui | implicites | implicite | implicite | théorie (Krashen) ; études TPRS limitées |
| Anki + decks | répétition espacée | selon deck | — | — | — | forte base expérimentale pour le principe, pas pour un deck donné |
| Glossika | répétition de phrases audio | oui | implicites | implicite | implicite | aucune étude publiée identifiée |

### 1.2 Fiches détaillées

#### FSI Russian (Foreign Service Institute, gouvernement des États-Unis)
- **Principe [C]** : méthode audio-orale (audiolingual) : dialogue de base mémorisé, notes de grammaire,
  exercices structuraux enregistrés (substitution, transformation, réponse), entraînement à la prononciation.
- **Statut [S]** : travaux du gouvernement fédéral américain, donc **domaine public aux États-Unis** ; les PDF et
  audios sont rassemblés par Live Lingua (« FSI public domain language courses »). Plusieurs sites *revendent* les
  mêmes fichiers (ex. fsi-language-courses.org, qui précise n'avoir aucune affiliation avec FSI/DLI) : ne pas payer.
- **Durée de référence [C]** : la FSI classe le russe en catégorie III (≈ 44 semaines, ≈ 1 100 heures de cours)
  pour un niveau de travail professionnel (ILR 3). **Ce chiffre ne s'applique pas à l'objectif A2** de Russian 365,
  mais il rappelle que 182 h visent un niveau élémentaire.
- **Forces** : énorme volume de drills audio ; dialogues réels ; exercices déterministes (idéaux pour une correction serveur).
- **Faiblesses** : contenu daté (contexte soviétique, vocabulaire diplomatique) ; progression lente ; peu d'images ;
  audio de qualité variable.
- **Transposable** : la *forme* des drills (substitution, transformation, question → réponse attendue unique),
  qui correspond exactement aux exercices « transformation » et « phrase à trous » de l'application ; éventuellement
  quelques dialogues et audios (domaine public) après modernisation et relecture.

#### DLI (Defense Language Institute) Russian Basic Course
- **[S]** Des manuels DLI de russe (Basic, Intermediate, Advanced, SOLT) circulent ; certains sont « textbook only, no audio ».
  Statut probable : travaux du gouvernement américain (domaine public aux États-Unis), **à vérifier pièce par pièce**
  (certains documents DLI réutilisent des textes tiers).
- **Transposable** : liste de situations fonctionnelles et drills ; moins utile que FSI pour un francophone.

#### Assimil « Le russe » (collection « Sans peine » / « Objectif langues »)
- **Principe [C]** : une leçon par jour (≈ 100 leçons), dialogue court avec audio, traduction en regard, notes ;
  **phase passive** (écouter, lire, comprendre) puis, vers la moitié du livre, **« deuxième vague »** : on reprend
  les premières leçons en traduisant du français vers le russe. Révisions toutes les 7 leçons.
- **Progression** : cyrillique accompagné d'une transcription au début ; grammaire inductive (cas et aspect expliqués
  au fil des notes, sans ordre strict).
- **Forces** : régularité quotidienne, beaucoup d'input oral naturel, humour, auto-apprentissage.
- **Faiblesses** : peu d'exercices de production ; grammaire dispersée ; la transcription peut retarder la lecture.
- **Transposable** : la « deuxième vague » = **réactivation différée en production** de dialogues déjà compris
  (rappel français → russe d'une phrase vue il y a 4–8 semaines) ; une révision structurée toutes les 7 unités.

#### Pimsleur Russian
- **Principe [C]** : 5 niveaux × 30 leçons de 30 min, audio seul ; question en anglais → pause → réponse attendue
  → correction par un natif. Rappel à intervalles croissants (*graduated interval recall*, Pimsleur 1967 :
  intervalles de quelques secondes à plusieurs mois).
- **Progression** : phrases utiles d'abord (« Excusez-moi, vous comprenez le russe ? »), vocabulaire réduit
  (≈ 500 mots par niveau selon l'éditeur [C]), lecture marginale.
- **Forces** : production orale forcée dès la 1re minute, prononciation par décomposition (*backward build-up* :
  on répète la fin du mot puis on remonte : « -ста », « -жа-лу-йста », « пожалуйста »).
- **Faiblesses** : vocabulaire très limité, pas d'écrit, explications grammaticales minimales, coût.
- **Preuves** : aucune étude indépendante trouvée.
- **Transposable** : (1) **décomposition syllabique inverse** pour les mots longs (здравствуйте, пожалуйста) ;
  (2) **rappel oral à l'intérieur d'une séance** (intervalles courts : 30 s, 2 min, 10 min) avant le premier
  intervalle d'1 jour.

#### Michel Thomas Russian (Natasha Bershadski [C])
- **Principe** : l'apprenant ne prend pas de notes et « ne doit pas mémoriser » ; le professeur fait construire
  des phrases de plus en plus longues à partir de briques, en enregistrement avec deux élèves.
- **Transposable** : **exercices de construction progressive** (je veux → je veux acheter → je veux acheter du pain
  → je ne veux pas acheter de pain) : idéal pour les unités de structures (Я хочу…).
- **Limites** : pas d'écrit ni de cyrillique ; aucune preuve d'efficacité publiée.

#### Teach Yourself / Complete Russian (Daphne West [C])
- **Principe** : manuel autodidacte A1→B1, une vingtaine d'unités thématiques, dialogues enregistrés, grammaire
  explicite, exercices avec corrigé.
- **Progression [C]** : alphabet dès l'unité 1 ; ordre des cas proche de l'ordre RKI (prépositionnel tôt) ;
  aspect au milieu du livre ; verbes de mouvement idti/khodit' puis préverbes en fin de volume.
- **Transposable** : séquencement thématique, exercices de compréhension de dialogue avec questions fermées.

#### The New Penguin Russian Course (Nicholas J. Brown, 1996 [C])
- **Principe** : cours grammatical très dense pour autodidacte, nombreux exercices de traduction avec corrigé,
  sans audio (dans l'édition originale).
- **Progression [C]** : alphabet en tête, puis tous les cas assez vite (dans les 10 premières leçons), aspect
  explicite, verbes de mouvement détaillés.
- **Forces** : précision grammaticale, explications d'accent tonique et de réduction.
- **Faiblesses** : rythme décourageant pour un A0, pas d'oral.
- **Transposable** : **notes d'accentuation** (paradigmes à accent mobile) et **exercices de traduction courte**
  en rappel écrit.

#### « Road to Russian » / « Дорога в Россию » (Антонова, Нахабина, Толстых et al., Златоуст / МГУ [C])
- Remarque : je n'ai pas identifié de manuel anglophone distinct intitulé exactement « Road to Russian » ;
  le titre désigne très probablement l'édition anglophone ou la traduction de **Дорога в Россию** — **à confirmer**.
- **Principe [C]** : manuel RKI standard (Russie) en volumes alignés sur les niveaux ТРКИ (элементарный,
  базовый, первый) ; démarre par un **cours phonétique et graphique d'introduction** (вводный курс) ;
  grammaire explicite par tableaux, dialogues, textes.
- **Progression** : ordre canonique des cas RKI (voir §2.3) ; aspect au niveau базовый ; verbes de mouvement
  non préfixés au niveau élémentaire/базовый, préfixés au premier niveau.
- **Transposable** : l'**alignement explicite sur les minimums ТРКИ** et l'ordre des cas.

#### « Поехали! » (С. Чернышов, А. Чернышова, Златоуст [C])
- **Principe** : manuel communicatif illustré A1–A2 pour adultes ; lettres introduites par petits groupes en
  commençant par celles qui ressemblent au latin et se lisent pareil (А, К, М, О, Т…), puis « faux amis » (В, Н, Р, С, У, Х),
  puis les lettres nouvelles — **logique identique aux 6 séances d'alphabet de Russian 365**.
- **Transposable** : lecture de mots internationaux dès la séance 1 (такси, мама, кот, атом) : confirme le choix АКМОТ.

#### « Russian in Exercises » (С. Хавронина, А. Широченская, éditions Русский язык [C])
- **Principe** : cahier de drills classés par point de grammaire (chaque cas, chaque emploi, aspect, mouvement,
  participes), consignes courtes et exemple modèle, corrigés.
- **Transposable** : **typologie d'exercices** directement compatible avec la correction déterministe :
  « mettre le mot entre parenthèses à la bonne forme », « répondre à la question selon le modèle »,
  « choisir le verbe de l'aspect correct ». À recréer avec des phrases propres (pas de copie).

#### Duolingo
- **Principe [C]** : séances de quelques minutes, micro-exercices (traduction par tuiles, association image-mot,
  écoute, dictée, prononciation), gamification (séries, ligues). Modélisation de la mémoire :
  *half-life regression* (Settles & Meeder 2016), puis le modèle « Birdbrain ».
- **Progression** : alphabet en début de cours (associations lettre-son), puis phrases ; grammaire implicite.
- **Preuves [S]** : Jiang, Rollinson, Plonsky et al. (2021, *Foreign Language Annals* 54(4)) : apprenants ayant terminé
  les unités de niveau débutant en **espagnol et français** → lecture « Intermediate Low », écoute « Novice High »
  (ACTFL), comparable à 4 semestres universitaires. **Pas d'étude publiée pour le russe** ; études menées par
  des chercheurs de Duolingo.
- **Critiques [C]** : peu de production libre, traduction de phrases artificielles, grammaire rarement expliquée.
- **Transposable** : tuiles de réordonnancement de mots, association image-mot, séances très courtes, « série »
  quotidienne (avec prudence : la gamification ne doit pas pousser à des séances creuses).

#### Babbel, Busuu, Mondly, Memrise
- **Babbel [C]** : leçons de 10–15 min fondées sur des dialogues, explication grammaticale brève, gestionnaire
  de révisions ; disponibilité du russe selon la langue d'interface **à vérifier**. Étude d'efficacité commanditée
  (Vesselinov & Grego, sur l'espagnol) [C].
- **Busuu [C]** : cours CECRL A1–B2, correction des productions par la communauté, étude commanditée
  (Vesselinov & Grego) [C].
- **Mondly [C]** : phrases thématiques, reconnaissance vocale, réalité virtuelle ; aucune preuve publiée identifiée.
- **Memrise [C]** : d'abord decks communautaires de mémorisation (mnémotechniques), aujourd'hui courtes vidéos
  de natifs (« Learn with locals »).
- **Transposable** : **vidéos/audios de natifs pour les chunks** (Memrise) → remplaçables par des enregistrements
  Lingua Libre / Common Voice ; **dialogues de situation** (Babbel) → unités de structures ; correction par la
  communauté (Busuu) → non pertinent (usage personnel).

#### RussianPod101
- **Principe [C]** : bibliothèque de podcasts par niveau (dialogue, explication en anglais, transcription, liste
  de vocabulaire). **Contenu commercial : ne rien importer ni scraper.**
- **Transposable** : le format « dialogue court → explication → réécoute lente → réécoute normale ».

#### LingQ, input compréhensible (Krashen), TPRS, histoires graduées
- **Krashen (1982)** : l'acquisition se fait par l'input légèrement au-dessus du niveau (« i+1 »). Hypothèse
  influente mais critiquée (non falsifiable selon plusieurs auteurs [C]).
- **LingQ [C]** : lecteur/écoute de textes importés ; chaque mot a un statut (nouveau, en cours 1–4, connu) ;
  compteur de mots connus. **Le lecteur F10 prévu par Russian 365 suit exactement ce modèle.**
- **TPRS (Blaine Ray) [C]** : histoires co-construites en classe, questions répétitives (« circling »),
  vocabulaire très restreint et massivement répété. Études peu nombreuses et souvent de faible qualité méthodologique.
- **Couverture lexicale [V]** : Hu & Nation (2000) — certains lecteurs comprennent à 95 % de mots connus, la plupart
  ont besoin de 98 % ; Laufer & Ravenhorst-Kalovski (2010) — 95 % = seuil minimal (avec aide), 98 % = seuil
  optimal (lecture autonome).
- **Transposable** : histoires courtes graduées **générées sous contrainte lexicale** (≥ 95 % de lemmes connus
  pour une lecture guidée, ≥ 98 % pour une lecture autonome), calcul automatique de la couverture par lemmatisation.

#### Anki et decks partagés
- **Principe** : répétition espacée ; depuis la version 23.10, Anki propose **FSRS** en option à côté de SM-2 [C].
- **Decks connus [C]** : decks de fréquence russes (souvent tirés du *Frequency Dictionary of Russian*
  de Routledge, **protégé par le droit d'auteur**), decks « Russian Grammar », decks d'alphabet.
  **La licence des decks AnkiWeb est presque toujours non déclarée → ne pas les importer.**
- **Transposable** : la logique de cartes à plusieurs directions (reconnaissance ru→fr, rappel fr→ru, audio→sens),
  déjà présente sous forme QCM ≠ rappel actif.

#### Méthodes immersives (« bain linguistique », Berlitz, immersion totale, méthode directe)
- **Principe** : aucune langue de médiation ; sens transmis par images, gestes, contexte.
- **Limite pour un A0 adulte autodidacte** : charge cognitive élevée ; l'apprenant multilingue gagne à utiliser
  ses langues connues pour les explications (voir §4.3). **Transposable** : images et situations pour présenter
  le sens (double codage), dialogues sans traduction en **réécoute** une fois le sens connu.

#### Glossika
- **Principe [C]** : répétition audio de phrases complètes (L1 → L2 → répétition), en masse, sans explication.
  Aucune étude d'efficacité publiée identifiée.
- **Transposable** : **dictée et répétition de phrases complètes** issues de Tatoeba avec audio (licence par
  enregistrement, voir §5).

### 1.3 Synthèse : ce que convergent les méthodes sérieuses
1. Alphabet en **petits groupes**, en commençant par les lettres « amies » (Поехали!, Duolingo, manuels RKI).
2. **Chunks avant analyse** : « Меня зовут », « У меня есть », « Мне нравится » appris comme blocs avant
   l'explication des cas (Pimsleur, Michel Thomas, Assimil, manuels RKI).
3. **Prépositionnel en premier cas oblique** (« Где? — В Москве ») dans les manuels RKI (§2.3).
4. **Aspect** introduit au passé, d'abord en réception, puis production au futur.
5. Verbes de mouvement : **идти/ехать** (direction unique) d'abord, **ходить/ездить** ensuite, **préverbes** en dernier.
6. **Accent tonique noté** dans tous les manuels RKI pour débutants.

---

## 2. Référentiels : ТРКИ / TORFL et CECRL

### 2.1 Niveaux et correspondance CECRL [S]

| ТРКИ | Abréviation | CECRL | Minimum lexical (volume indicatif) |
|---|---|---|---|
| Элементарный уровень | ТЭУ | A1 | jusqu'à **≈ 780** unités |
| Базовый уровень | ТБУ | A2 | jusqu'à **≈ 1 300** unités |
| Первый сертификационный | ТРКИ-I | B1 | ≈ 2 300 unités |
| Второй сертификационный | ТРКИ-II | B2 | ≈ 5 000 unités (« около 5100 ») |
| Третий | ТРКИ-III | C1 | — (minimum annoncé en préparation selon une source) |
| Четвёртый | ТРКИ-IV | C2 | — |

Sources : documents de centres de test (Université de Zurich, BGPU, Masaryk), Wikipédia (TORFL). Une source
ancienne donne 750 mots pour A1 (Щукин) : divergence mineure.

**Conséquence pour Russian 365** : la cible « 1 500 lemmes actifs / 2 500 réceptifs en 12 mois » **dépasse** le
minimum ТБУ/A2 (≈ 1 300) en actif et se situe entre A2 et B1 en réceptif. C'est ambitieux pour ≈ 182 h. À titre de
comparaison uniquement (et pour l'anglais, pas le russe), Cambridge estime ≈ 180–200 heures guidées pour A2 [C].
**Recommandation** : garder les 1 500 actifs comme **plafond**, avec l'objectif ferme = minimum ТБУ (≈ 1 300) ;
le réceptif peut suivre via la lecture.

### 2.2 Compétences évaluées [S]/[C]
Le test ТРКИ comporte cinq/six sous-tests : **лексика и грамматика**, **чтение**, **аудирование**, **письмо**,
**говорение** (structure exacte par niveau à vérifier dans la spécification officielle — СПбГУ, Центр
тестирования). Le seuil de réussite est généralement de 66 % par sous-test [C, à vérifier].
**Pour l'application** : le tableau de bord par compétence séparée, sans score global, est cohérent avec ce format.
Les évaluations mensuelles M1–M12 (F11) pourraient reprendre la répartition en 5 sous-tests.

### 2.3 Ordre canonique d'introduction des cas en RKI [S]
L'ordre le plus cité dans la méthodologie RKI est :
**nominatif → prépositionnel → accusatif → génitif → datif → instrumental**,
au singulier d'abord (« principe linéaire »), le pluriel venant ensuite. Une étude de Koursk (2021) propose le même
ordre et souligne la place particulière du génitif (très fréquent). Les manuels divergent sur le détail ;
il n'y a pas de norme unique.

Justification fonctionnelle :
- **Prépositionnel** : « Где? — в/на + П » (lieu), « о ком? о чём? » ; terminaison presque toujours **-е** → facile.
- **Accusatif** : objet direct (« Я хочу кофе / воду »), direction (« в Москву ») ; inanimés masculins/neutres = nominatif.
- **Génitif** : « У меня нет… », « Сколько стоит… — два рубля », possession, quantité : indispensable pour les nombres.
- **Datif** : « Мне нравится », « Мне надо », « Мне 30 лет », destinataire.
- **Instrumental** : « с + Т » (avec), « работать кем », « заниматься чем ».

---

## 3. Recherche en apprentissage : ce qui est établi

| Principe | Résultat principal | Sources | Statut |
|---|---|---|---|
| Pratique de récupération (*testing effect*) | Se tester bat la relecture pour la rétention à long terme | Roediger & Karpicke 2006 ; Karpicke & Roediger 2008 ; Dunlosky et al. 2013 (« haute utilité ») | [V] Dunlosky ; [C] autres |
| Espacement | Des révisions espacées battent la pratique massée ; l'intervalle optimal dépend du délai de rétention visé | Cepeda et al. 2006 (méta-analyse) ; Cepeda et al. 2008 (*Psychological Science* 19(11)) | [V] 2008 ; [C] 2006 |
| FSRS vs SM-2 | Sur le benchmark ouvert *srs-benchmark* (collections Anki), FSRS prédit mieux la probabilité de rappel (log-loss plus faible dans la très grande majorité des collections) | Ye, Su & Cao 2022 (KDD) ; benchmark d'Expertium / open-spaced-repetition | [S] ; chiffres exacts divergents selon les sources, critique de SuperMemo sur la métrique |
| Entrelacement | Mélanger des catégories proches améliore la discrimination (peinture, mathématiques) ; effet sur la grammaire L2 rapporté mais moins établi | Kornell & Bjork 2008 ; Rohrer & Taylor 2007 ; Nakata & Suzuki 2019 (grammaire L2) | [C] |
| Double codage | Mot + image concrète → deux traces mémorielles | Paivio 1971/1986 ; Carpenter & Olson 2012 (images et vocabulaire étranger) | [C] |
| Mot-clé (mnémotechnique) | Méthode du mot-clé testée **précisément sur le vocabulaire russe** : gain important au test immédiat | Atkinson & Raugh 1975 | [C] |
| Chunks / langage formulaïque | Une grande part du discours est préfabriquée ; apprendre des blocs accélère la fluidité | Wray 2002 ; Boers & Lindstromberg 2012 | [C] |
| Effet de génération | Produire (même partiellement) une réponse la retient mieux que la lire | Slamecka & Graf 1978 | [C] |
| Couverture lexicale | 95 % minimal, 98 % optimal pour lire | Hu & Nation 2000 ; Laufer & Ravenhorst-Kalovski 2010 ; Laufer 2021 | [V]/[S] |
| Instruction explicite de prononciation | Effet moyen à grand ; plus net sur des sons ciblés que sur l'accent global | Lee, Jang & Plonsky 2015 (*Applied Linguistics* 36, 86 études) ; Saito & Plonsky 2019 | [S] |
| Entraînement perceptif à haute variabilité (HVPT) | Écouter un contraste chez de **nombreux locuteurs** améliore perception et production | Logan, Lively & Pisoni 1991 ; Thomson 2018 (synthèse) | [C] |
| Effet de l'orthographe / translittération | L'orthographe (cyrillique mal décodé) interfère avec l'acquisition phonolexicale des débutants ; les apprenants expérimentés acquièrent les bonnes correspondances | Showalter 2018 (*Language and Speech* 61) ; Simonchyk & Darcy 2017/2018 | [S] |

### Conséquences pour l'application
- **Récupération + espacement** : déjà au cœur de l'application (rappel actif ≠ QCM, intervalles fixes). Conforme.
- **Intervalles fixes 1/3/7/14/30/60/120 j** : défendables (proches de Pimsleur/Leitner) et reproductibles.
  FSRS ferait mieux *en moyenne* sur des volumes Anki, mais il exige un historique pour s'optimiser. Pour un
  utilisateur unique au mois 1, **garder les intervalles fixes** et **journaliser dès maintenant** les révisions au format
  compatible FSRS (date, note 1–4, état), pour pouvoir basculer vers `ts-fsrs` (MIT) au bout de ~1 000 révisions.
- **Translittération** : à n'utiliser **qu'en aide ponctuelle** pendant les 6 séances d'alphabet, jamais comme
  support principal (Showalter 2018). L'application refuse déjà la saisie latine sans pénalité : à conserver.
- **Accent** : enseigner explicitement l'accent et la réduction (Lee et al. 2015), avec perception avant production.

---

## 4. Difficultés spécifiques des francophones et stratégies

### 4.1 Phonétique

| Difficulté | Pourquoi c'est difficile pour un francophone | Stratégie documentée / proposée | Passerelle avec les langues connues (à valider) |
|---|---|---|---|
| **ы** [ɨ] | Absent du français ; assimilé à [i] | Paires minimales ы/и (мыло/мило, был/бил), HVPT ; geste articulatoire : « dire [u] lèvres écartées » [C] | **Roumain â/î** [ɨ] : analogie très proche (*râu*, *în*) — la meilleure passerelle disponible |
| **х** [x] | Absent du français standard ; substitué par [k] ou [ʁ] | Opposition х/к (хор/кор), х/г | **Allemand ach-Laut** (*Bach, machen*) ; **espagnol j** (*jota*) |
| **р** roulé [r] | Le français a un [ʁ] uvulaire | Paires р/л ; entraîner à partir de « tr/dr » rapides [C] | **Espagnol/italien r** (*perro*, *terra*) ; portugais *r* simple (*caro*) pour le battu |
| **Palatalisation** (consonnes dures/molles) | Pas phonologique en français ; la distinction мат/мать est inaudible au début | Perception d'abord (paires мат/мать, брат/брать, угол/уголь), puis production ; marquer visuellement la mollesse | **Portugais nh/lh** ≈ нь/ль (approximatif) ; italien *gn/gli* |
| **Réduction vocalique** (аканье/иканье) | Le français ne réduit presque pas les voyelles inaccentuées ; on lit « mo-lo-ko » | Toujours afficher l'accent (´) ; exercice « où est l'accent ? » ; écoute de о inaccentué = [ɐ]/[ə] | **Portugais** (surtout européen) : réduction des voyelles inaccentuées ; **anglais** : schwa (*banana*) |
| **Accent tonique libre et mobile** | En français, l'accent est fixe en fin de groupe | Toujours noter l'accent ; familles à accent mobile (рука́ / ру́ку) | Portugais/espagnol/italien : accent lexical libre (*sábado*) |
| **Dévoisement final et assimilation** | Le français ne dévoise pas en finale (хлеб [xlʲep]) | Dictées ciblées ; règle explicite après l'alphabet | **Allemand** : *Auslautverhärtung* (*Hund* [hʊnt]) — analogie exacte |
| **Groupes consonantiques** (здравствуйте, взгляд) | Rares en français | Décomposition inverse façon Pimsleur ; noter les lettres muettes (здра[вст]вуйте → [ˈzdrastvʊjtʲe]) | Allemand (*Herbst*) partiellement |
| **ш / ж / щ** | ш et ж russes sont « durs » (plus graves que ch/j français) ; щ = [ɕː] long et mou | Écoute comparative ш/щ ; щ décrit comme « ch doux et long » | Allemand *sch* ; portugais *x/ch* ; polonais non pertinent |

### 4.2 Grammaire

| Difficulté | Stratégie | Passerelle (limites) |
|---|---|---|
| **Cas (6)** | Introduction fonctionnelle et linéaire (§2.3) : chunk → règle → transformation ; couleurs constantes par cas ; tableaux de terminaisons partiels (un genre, un nombre à la fois) | **Allemand** : idée de déclinaison, nominatif/accusatif/datif/génitif ; *mir gefällt* ≈ *мне нравится* (datif + verbe « plaire »). **Limites** : en russe la marque est sur le nom (pas d'article), il y a 2 cas de plus (instrumental, prépositionnel), et le génitif sert à la négation/quantité. **Roumain** : génitif-datif fusionné (*casei*), vocatif — utile comme idée, pas comme correspondance |
| **Absence d'articles et de « être » au présent** | Exercices de phrases sans копула (« Я студент ») dès le mois 1 (déjà fait) | Aucune langue connue n'en est dépourvue ; l'idée de copule nulle est nouvelle |
| **« Avoir » = у меня есть** | Chunk dès le mois 1–2, explication génitif plus tard | Comparable à des constructions possessives de type « chez moi il y a » ; pas d'équivalent exact |
| **Aspect** (perfectif/imperfectif) | Introduire au passé : imperfectif = processus/habitude, perfectif = résultat ; frises temporelles ; paires apprises ensemble (делать/сделать) | **Français/portugais/espagnol/italien** : imparfait vs passé composé/pretérito perfeito ≈ imperfectif vs perfectif **au passé uniquement**. **Limite** : l'aspect russe s'applique aussi à l'infinitif, à l'impératif et au futur, et c'est une propriété du verbe (paires lexicales), pas un temps |
| **Verbes de mouvement** | Distinguer d'abord à pied/en véhicule (идти/ехать), puis direction unique vs aller-retour/habitude (идти/ходить), puis préverbes (при-, у-, в-, вы-, пере-…) ; schémas fléchés | **Portugais/espagnol** : *ir a pé* / *ir de carro* aide pour идти/ехать ; **allemand** : préverbes séparables (*ankommen, weggehen*) ≈ при-/у- (analogie de forme, sens à vérifier verbe par verbe) |
| **Nombres et accord** (2–4 + génitif sg., 5+ + génitif pl.) | Chunks « один рубль / два рубля / пять рублей » très tôt (Сколько стоит?) | Aucune ; nouveauté à présenter comme telle |
| **Ordre des mots** (thème/rhème) | Réception d'abord ; ne pas l'évaluer avant B1 | — |

### 4.3 Exploitation du profil multilingue — lexique

- **Internationalismes** (anglais, portugais, allemand, français) : телефон, компьютер, университет, ресторан,
  музей, театр, проблема. Très utiles pour la lecture dès la séance 1 (décodage).
- **Emprunts français en russe** (nombreux depuis le XVIIIᵉ s.) : пляж, шофёр, гараж, абажур, магазин, бюро.
- **Emprunts allemands** : бутерброд (≠ « tartine beurrée » seulement : en russe, tout sandwich ouvert), шлагбаум,
  бухгалтер, парикмахер, штраф.
- **Roumain : emprunts slaves** (vieux slave/slavon) [C — chaque exemple à valider avant affichage] :
  *da* ≈ да, *a iubi* ≈ любить, *drag* ≈ дорогой, *prieten* ≈ приятель, *glas* ≈ голос, *vreme* ≈ время,
  *ceas* ≈ час, *a plăti* ≈ платить, *bogat* ≈ богатый.
  **Faux amis instructifs** : *nevastă* (épouse) vs невеста (fiancée) ; *război* (guerre) vs разбой (brigandage).
- **Faux amis français/anglais** à signaler : фамилия = nom de famille (pas « famille » = семья), магазин = magasin
  (oui) mais артист = artiste de spectacle, аккуратный = soigneux (pas « exact »), климат ok, комбинезон = combinaison.

**Limites des passerelles** (conformes au principe « analogies validées uniquement » de l'application) :
une analogie trompeuse coûte plus cher qu'aucune analogie ; toute passerelle doit indiquer sa **zone de validité**
(« vrai pour le passé seulement », « son proche, pas identique »). Les étymologies de Wiktionary (§5) peuvent servir à
proposer des candidats, **jamais à les publier sans relecture**.

---

## 5. Ressources exploitables (le plus important)

### 5.1 Tableau principal

| # | Ressource | URL | Contenu | Licence (statut de vérification) | Format | Usage concret dans Russian 365 |
|---|---|---|---|---|---|---|
| 1 | **OpenRussian** (données) | https://en.openrussian.org — dumps : https://github.com/Badestrand/russian-dictionary | Lemmes avec accent, traductions (en/de), déclinaisons/conjugaisons, niveau, exemples (issus de Tatoeba) | **CC BY-SA 4.0** sur le dépôt GitHub [V] ; « all data CC BY-SA » sur le site [S] | CSV (nouns, verbs, adjectives, others) — **instantanés anciens** ; pas d'API documentée [S] | Base de lemmes accentués et de paradigmes pour générer les exercices de transformation ; niveau A1/A2 pour filtrer ; traductions allemandes pour passerelles. Attribution + partage à l'identique des données dérivées |
| 2 | **Wiktionary (en/fr/ru)** via **kaikki.org / wiktextract** | https://kaikki.org/dictionary/Russian/ — outil : https://github.com/tatuylonen/wiktextract | Accents, tableaux de flexion, prononciation IPA, étymologies, traductions, fichiers audio liés | Code wiktextract **MIT** [V] ; données = contenu Wiktionary, donc **CC BY-SA (4.0 aujourd'hui, 3.0 pour les versions anciennes) + GFDL** [C — kaikki.org inaccessible, licence non lue sur le site] | JSONL en bloc (par langue) | Vérification croisée des accents et des paradigmes OpenRussian ; IPA ; candidats d'étymologie pour passerelles (relecture obligatoire) |
| 3 | **Tatoeba** | https://tatoeba.org/fr/downloads | Phrases ru, fr, en, pt, de… avec liens de traduction ; audio pour une partie | Phrases : **CC BY 2.0 FR** (une partie aussi CC0) [S] ; **audio : licence choisie par chaque contributeur** (CC BY, CC BY-SA, CC BY-NC, ou aucune licence publique) [S] | TSV hebdomadaires (sentences, links, sentences_with_audio) ; audio par URL, pas d'archive groupée récente [S] | Phrases d'exemple ru-fr pour présentation et phrases à trous ; **filtrer l'audio par licence** via le fichier « sentences with audio » ; **relire** (qualité inégale, phrases parfois non naturelles) |
| 4 | **Lingua Libre** | https://lingualibre.org | Enregistrements de mots isolés par des locuteurs identifiés | **CC BY-SA 4.0** [S] ; fichiers déposés sur Wikimedia Commons | Fichiers sur Commons (catégories par langue/locuteur) ; API MediaWiki | Audio natif pour les mots du mois 1–3 (remplace la synthèse vocale non validée) ; plusieurs locuteurs par mot = HVPT |
| 5 | **Wikimedia Commons** (prononciations, images) | https://commons.wikimedia.org | Prononciations russes (`Ru-*.ogg`), images | **Licence propre à chaque fichier** (CC0, CC BY, CC BY-SA, domaine public…) [C] | API MediaWiki ; métadonnées de licence par fichier | Audio de mots et **images pour le double codage** ; stocker la licence et l'auteur fichier par fichier |
| 6 | **Mozilla Common Voice (ru)** | https://datacollective.mozillafoundation.org (Common Voice) | Phrases lues par des milliers de locuteurs ; version 23.0 ≈ 290 h dont ≈ 247 h validées, ≈ 3 600 locuteurs [S] | **CC0 1.0** [S] ; attention : la page d'un jeu *Spontaneous Speech* ajoute une interdiction de ré-héberger, à clarifier [S] | Téléchargement en bloc (MP3 + TSV), inscription requise | Audio de phrases pour dictée et écoute (filtrer par votes positifs) ; **ne pas** prendre pour modèle de prononciation sans écoute (lecture parfois hésitante) |
| 7 | **Listes de fréquence Sharoff / Leeds** | http://corpus.leeds.ac.uk/serge/ (historique) ; https://ssharoff.github.io/kelly | Fréquences de lemmes du corpus Internet russe (I-RU, > 150 M mots) ; liste Kelly (9 000 mots, apprenants) | Listes Leeds : **CC BY 2.5** selon Wiktionary [S, non confirmé à la source] ; **Kelly : CC BY-NC-ND-SA 2.0** selon Wiktionary [S] (clause ND : pas de modification redistribuée) ; le livre Routledge est **commercial** | Fichiers texte | Classer les lemmes OpenRussian par fréquence pour choisir les 1 500/2 500 lemmes ; Kelly en consultation (ND) |
| 8 | **Listes de fréquence OpenSubtitles (hermitdave)** | https://github.com/hermitdave/FrequencyWords | Fréquences de formes (pas de lemmes) issues de sous-titres | **Code MIT, contenu CC BY-SA 4.0** [V] ; présence du russe non confirmée dans la page lue [C] | Fichiers texte | Fréquence orale/conversationnelle (complément de Sharoff) après lemmatisation pymorphy3 |
| 9 | **НКРЯ / Национальный корпус русского языка** et **Частотный словарь** (Ляшевская & Шаров 2009) | https://ruscorpora.ru ; https://ruscorpora.ru/en/page/tool-freq/ | Corpus de référence ; dictionnaire de fréquence (≈ 20 000 lemmes) | **Pas de licence ouverte identifiée** ; datasets sous **contrat de licence propre, droit russe** [S] ; outil de fréquence en ligne limité à 500 lemmes à l'export [S] | Consultation en ligne | **Consultation seulement** (vérifier un rang de fréquence, un usage) ; ne pas redistribuer ni importer en bloc |
| 10 | **OpenCorpora** (dictionnaire morphologique) | http://opencorpora.org | ≈ 400 000 lemmes, paradigmes complets, étiquettes grammaticales | **CC BY-SA 3.0** [S, FAQ citée] ; dérivé du dictionnaire AOT (LGPL), lui-même issu de Zaliznyak [S] | XML en bloc | Source des dictionnaires pymorphy ; génération de formes fléchies ; validation des réponses en transformation |
| 11 | **pymorphy3** (+ `pymorphy3-dicts-ru`) | https://github.com/no-plagiarism/pymorphy3 | Analyseur/générateur morphologique (lemmatisation, flexion) | Code **MIT** [V] ; données du dictionnaire issues d'OpenCorpora → **CC BY-SA** pour les données [S] (métadonnées contradictoires selon les dépôts) | Paquet Python (PyPI) | **Lecteur F10** : lemmatiser chaque mot d'un texte, calculer la couverture (95/98 %), statut connu/inconnu ; contrôle des formes générées. pymorphy2 n'est plus maintenu → utiliser pymorphy3 |
| 12 | **Universal Dependencies — SynTagRus** (et GSD, Taiga, PUD) | https://universaldependencies.org/treebanks/ru_syntagrus/ | ≈ 1,1 M mots annotés (lemme, morphologie, syntaxe) [C pour la taille] | **CC BY-NC-SA 4.0** sur UD [S] ; contrat de licence НКРЯ en parallèle [S] ; GSD/Taiga/PUD : licences différentes, à vérifier [C] | CoNLL-U en bloc | Statistiques d'usage réel des cas après prépositions (ex. fréquence de в + П vs в + В) pour ordonner la progression ; **NC compatible avec l'usage personnel**, mais ne jamais l'intégrer à une version publiée |
| 13 | **FSI Russian** (PDF + audio) | https://www.livelingua.com (rubrique « FSI courses » ; URL exacte de la page russe à vérifier) | Manuels et audio de cours de base | **Domaine public (travail du gouvernement américain)** [S] ; statut hors États-Unis non garanti [C] | PDF + MP3 en téléchargement | Inspiration pour drills ; éventuellement audios de dialogues (qualité à écouter) ; texte à moderniser |
| 14 | **Wikisource (ru)** | https://ru.wikisource.org | Textes classiques (Пушкин, Толстой, Чехов, contes populaires) | Textes **domaine public** ; mise en forme Wikisource sous CC BY-SA [C] | Téléchargement EPUB/PDF, API | Textes authentiques **courts** pour fin de parcours (B1+) ; contes et fables (Толстой — рассказы для детей, Крылов) pour M10–M12 avec glossaire |
| 15 | **Project Gutenberg** | https://www.gutenberg.org | Quelques textes russes et traductions | Domaine public **aux États-Unis** ; marque « Project Gutenberg » à retirer si redistribution [C] | Texte/EPUB | Source secondaire de textes (privilégier Wikisource pour le russe) |
| 16 | **LibriVox** | https://librivox.org | Livres audio lus par des bénévoles, dont quelques-uns en russe | **Domaine public** (enregistrements versés au DP) [C] | MP3 en bloc | Audio de textes classiques alignés avec Wikisource pour la lecture-écoute avancée (peu de titres russes, qualité variable) |
| 17 | **ts-fsrs** | https://github.com/open-spaced-repetition/ts-fsrs | Implémentation TypeScript de FSRS (v6) | **MIT** [S] | npm | Option future pour remplacer les intervalles fixes (§6) |
| 18 | **Forvo** | https://forvo.com | Prononciations communautaires | **Non exploitable** : licence Creative Commons retirée fin 2019, remplacée par une licence *ad hoc* restrictive ; API payante/limitée à un usage non commercial selon les sources [S] | API (clé) | **Ne pas utiliser** : pas de redistribution possible, téléchargement en masse contraire aux conditions ; écouter sur le site à titre personnel seulement |

### 5.2 Ressources complémentaires utiles (à vérifier avant usage)

| Ressource | URL | Licence | Usage |
|---|---|---|---|
| OpenMoji (pictogrammes) | https://openmoji.org | CC BY-SA 4.0 [C] | Pictogrammes pour double codage (aliments, transports, lieux) |
| Noto Emoji | https://github.com/googlefonts/noto-emoji | Apache 2.0 (police : OFL) [C] | Idem, sans clause share-alike |
| Wiktionary : listes de fréquence russes | https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Russian | CC BY-SA (pages) ; licences des listes sources indiquées sur la page [S] | Index des listes disponibles |
| FreeLanguageTools / stress-russian-books, tsnorm | https://github.com/FreeLanguageTools/stress-russian-books | Licence à vérifier ; tsnorm : MIT [S] | Ajouter automatiquement les accents à un texte (à contrôler, erreurs sur homographes) |

### 5.3 Obligations pratiques liées aux licences
- **CC BY / CC BY-SA** : conserver pour chaque item `source`, `auteur`, `licence`, `url` dans le contenu (un champ
  `attribution` par exercice ou par fichier audio). Une page « Crédits » dans l'application suffit en usage personnel.
- **CC BY-SA (OpenRussian, OpenCorpora, Wiktionary, Lingua Libre)** : les jeux de données *dérivés* doivent rester
  sous CC BY-SA s'ils sont partagés. En usage strictement personnel, aucun problème ; **séparer** ces données du code
  de l'application (paquet `@r365/content`) pour que le code puisse garder sa propre licence.
- **NC (SynTagRus, Kelly, certains audios Tatoeba)** : compatible avec l'usage personnel, **à exclure** si l'application
  devenait publique ou payante.
- **ND (Kelly)** : pas de redistribution modifiée → usage en consultation uniquement.

---

## 6. Recommandations concrètes et priorisées

### (a) Gains rapides (mois 1, faible effort)

| # | Recommandation | Justification / source |
|---|---|---|
| A1 | **Afficher l'accent tonique (U+0301) partout** dans les présentations et consignes, et **normaliser** les réponses en retirant U+0301 et en acceptant е pour ё avant comparaison (attention : en NFC l'accent combiné reste un caractère séparé sur le cyrillique). | Pratique universelle des manuels RKI ; réduction vocalique (§4.1) ; Lee et al. 2015 |
| A2 | **Remplacer la synthèse vocale par de l'audio natif Lingua Libre** pour les 33 lettres + 13 expressions + mots du mois 1, avec **2 voix ou plus** par mot quand disponible. | HVPT (Logan et al. 1991) ; CC BY-SA 4.0 |
| A3 | Ajouter un exercice **« paires minimales »** (QCM audio à 2 choix) : ы/и, мат/мать, х/к, ш/щ, р/л, accent (за́мок/замо́к). | Perception avant production ; Simonchyk & Darcy 2017 |
| A4 | **Décomposition inverse** pour les mots longs (пожа́луйста, здра́вствуйте) dans la fiche de présentation. | Pimsleur (backward build-up) |
| A5 | Ajouter les passerelles phonétiques les plus solides **après validation** : ы ≈ roumain â/î ; х ≈ allemand *ach* / espagnol *j* ; dévoisement ≈ allemand *Hund* ; р ≈ espagnol/italien *r*. | §4.1 |
| A6 | **Journaliser chaque révision** (date, note 1–4, intervalle prévu, intervalle réel) dans un format compatible FSRS, sans changer l'algorithme. | Ye et al. 2022 ; permet une bascule ultérieure |
| A7 | Limiter la translittération aux 6 séances d'alphabet, en aide **masquée par défaut** (bouton « voir la lecture »). | Showalter 2018 |

### (b) Contenus à importer (avec licence)

| Priorité | Contenu | Source | Licence | Remarque |
|---|---|---|---|---|
| 1 | Lemmes accentués + paradigmes (≈ 3 000 lemmes les plus fréquents) | OpenRussian (CSV GitHub), contrôlés par Wiktionary/kaikki | CC BY-SA 4.0 / CC BY-SA | Base de toute la progression ; recouper les accents sur 2 sources |
| 2 | Classement par fréquence | Sharoff/Leeds (CC BY 2.5, à confirmer) + OpenSubtitles hermitdave (CC BY-SA 4.0) | voir §5 | Fusionner écrit (Leeds) et oral (sous-titres) |
| 3 | Audio de mots | Lingua Libre / Commons | CC BY-SA 4.0 / par fichier | Champ licence par fichier |
| 4 | Phrases d'exemple ru-fr | Tatoeba | CC BY 2.0 FR (texte) | **Relecture** ; ne garder que les phrases ≥ 95 % de lemmes connus au moment de leur apparition |
| 5 | Audio de phrases | Tatoeba (audio CC BY / CC BY-SA uniquement) + Common Voice (CC0) | variable / CC0 | Filtrer par licence et par votes |
| 6 | Lemmatiseur pour le lecteur F10 | pymorphy3 + dictionnaire OpenCorpora | MIT + CC BY-SA | Service côté serveur (Python) ou pré-calcul des textes |
| 7 | Textes du domaine public pour M10–M12 | Wikisource (Толстой, « Азбука » et « Рассказы для детей » ; Крылов) | Domaine public | Adapter/annoter ; textes authentiques trop difficiles avant B1 sans glossaire |
| 8 | Inspiration de drills | FSI Russian | Domaine public (US) | Recréer avec vocabulaire moderne |

### (c) Nouveaux formats d'exercices visuels et didactiques (tous corrigeables de façon déterministe)

1. **Paires minimales audio** (A3) — choix entre 2 mots ; source : HVPT.
2. **« Où est l'accent ? »** : le mot s'affiche sans accent, on touche la voyelle accentuée après écoute ;
   variante « quelle voyelle est réduite ? ».
3. **Image → mot / mot → image** (double codage, Paivio) avec pictogrammes OpenMoji ou images Commons ;
   à réserver aux mots concrets (aliments, lieux, transports).
4. **Construction progressive de phrase** (façon Michel Thomas) : on ajoute une brique à chaque étape
   (Я хочу → Я хочу купить → Я хочу купить хлеб) ; correction déterministe sur la phrase complète.
5. **Tuiles à réordonner** (façon Duolingo) pour les chunks et l'ordre des mots simples.
6. **Code couleur constant par cas** (ex. : prépositionnel = vert, accusatif = bleu…) dans toutes les fiches et
   corrections ; la terminaison est surlignée.
7. **Tableau de terminaisons à compléter** limité à une case grammaticale à la fois (un cas, un genre).
8. **Frise temporelle pour l'aspect** : choisir делал / сделал selon un schéma (ligne = processus, point = résultat).
9. **Schéma fléché pour les verbes de mouvement** : flèche simple (идти), aller-retour (ходить), piéton/véhicule
   (идти/ехать) ; plus tard : arrivée/départ/entrée/sortie (при-/у-/в-/вы-).
10. **Lecture guidée à couverture contrôlée** : mini-histoires de 80–150 mots générées et **validées** par un
    russophone, avec ≥ 95 % de lemmes connus (affiché à l'apprenant) ; questions fermées de compréhension.
11. **Réactivation différée « deuxième vague »** (Assimil) : rappel fr → ru d'une phrase d'un dialogue vu
    4–8 semaines plus tôt.
12. **Dictée de phrase complète** (Glossika/Tatoeba) avec audio natif, correction tolérante (accents, ё).

### (d) Ajustements de progression pour les mois 2 à 12

Hypothèse : ≈ 15 h/mois en moyenne (182 h / 12). Objectif ferme = minimum ТБУ (≈ 1 300 lemmes actifs) ;
1 500 actifs / 2 500 réceptifs en cible haute.

| Mois | Cas (singulier sauf mention) | Aspect | Mouvement | Autres priorités | Lemmes actifs cumulés (indicatif) |
|---|---|---|---|---|---|
| 1 (fait) | nominatif ; chunks Меня зовут, Я хочу (+accusatif inanimé non analysé) | — | — | alphabet, phrases sans « être », négation | ≈ 100–150 |
| 2 | **prépositionnel** (Где? в/на + П ; о + П) | — | **идти / ехать** au présent (Я иду в…, chunk) | présent 1re/2e conjugaison, nombres 1–20 | ≈ 250 |
| 3 | **accusatif** (objet, direction в/на + В) ; analyse du Я хочу | — | куда? / где? (opposition В / П) | passé (был, была) ; Сколько стоит? + nombres | ≈ 400 |
| 4 | **génitif** (у меня есть/нет, quantités, 2–4 + Gén. sg, 5+ + Gén. pl en chunks) | **réception** des paires au passé (делал/сделал) | **ходить / ездить** (habitude, aller-retour) | possessifs | ≈ 550 |
| 5 | **datif** (мне нравится, мне надо, возраст, к + Д) | aspect **explicite** au passé (processus vs résultat) | идти/ходить en contraste | verbes pronominaux | ≈ 700 |
| 6 | **instrumental** (с + Т, работать кем, заниматься чем) | **futur** perfectif vs буду + imperfectif | — | **évaluation mi-parcours ≈ ТЭУ/A1** (780 lemmes) | ≈ 800 |
| 7 | **pluriel** : nominatif et prépositionnel pl. | impératif et aspect (Скажите / Говорите) | ехать/ездить + transports (на + П) | | ≈ 950 |
| 8 | accusatif et génitif pl. (animés) | aspect à l'infinitif (хочу купить / покупать) | **préverbes de base** при-, у- (прийти/уйти) | | ≈ 1 050 |
| 9 | datif et instrumental pl. | consolidation | в-, вы-, по- (пойти) | lecture : 1re histoire graduée longue | ≈ 1 150 |
| 10 | révision en entrelacement de tous les cas | consolidation | пере-, до-, за- (réception) | comparatifs, phrases complexes (что, потому что, если) | ≈ 1 250 |
| 11 | adjectifs déclinés tous cas | — | révision | lecture d'un livre gradué A2 (extraits), conversation guidée 10 min | ≈ 1 350 |
| 12 | révision | — | — | **évaluation finale ≈ ТБУ/A2** (5 sous-tests), conversation 10–15 min | ≈ 1 300–1 500 |

Principes transversaux :
- **Chunk → règle → transformation** pour chaque cas (le chunk est vu 2–4 semaines avant l'analyse).
- **Entrelacement à partir du 2ᵉ cas** : les séances de révision mélangent les cas déjà analysés (Rohrer & Taylor 2007 ;
  Nakata & Suzuki 2019), mais une notion **nouvelle** est d'abord pratiquée seule (pratique bloquée initiale).
- **Pluriel après les 6 cas au singulier** (principe linéaire RKI).
- **Choix des lemmes** : intersection fréquence (Sharoff + sous-titres) × minimum ТРКИ (thèmes) × utilité pour les
  structures (Где…?, Сколько стоит…?).

### (e) Ce qu'il ne faut PAS faire

| # | À éviter | Pourquoi / source |
|---|---|---|
| E1 | Utiliser la translittération comme support principal ou permanent | Interférence orthographique (Showalter 2018) |
| E2 | Présenter les 6 cas d'un coup ou le tableau complet des déclinaisons au mois 2 | Principe linéaire RKI (§2.3) ; surcharge cognitive |
| E3 | Introduire les verbes de mouvement préfixés avant la maîtrise d'идти/ходить/ехать/ездить | Progression de tous les manuels RKI |
| E4 | Exiger l'accent tonique dans les réponses écrites (déjà respecté) | Les Russes n'écrivent pas les accents ; risque de pénaliser une bonne réponse |
| E5 | Faire confiance à la synthèse vocale du navigateur pour l'accent | Erreurs fréquentes sur les homographes et l'accent mobile (замок, мука) [C] |
| E6 | Importer des decks AnkiWeb, du contenu RussianPod101/Babbel/Duolingo, ou scraper Forvo | Licences absentes ou restrictives (§5.1, ligne 18) |
| E7 | Publier une passerelle tirée automatiquement de Wiktionary sans relecture | Faux amis (nevastă/невеста, război/разбой, фамилия/famille) |
| E8 | Intégrer SynTagRus, Kelly ou des audios Tatoeba CC BY-NC dans une version publique | Clauses NC/ND |
| E9 | Basculer vers FSRS sans historique suffisant ou sans pouvoir le rejouer de façon déterministe | Les paramètres FSRS s'optimisent sur l'historique ; la reproductibilité est une exigence de l'application |
| E10 | Proposer des textes authentiques (Wikisource) avant ≈ 95 % de couverture sans glossaire | Hu & Nation 2000 ; Laufer & Ravenhorst-Kalovski 2010 |
| E11 | Utiliser des phrases Tatoeba ou Common Voice sans relecture humaine | Qualité inégale (phrases non naturelles, lectures hésitantes) |
| E12 | Promettre un niveau d'après des chiffres d'efficacité d'applications | Études commanditées, langues autres que le russe |

---

## 7. Incertitudes et points à vérifier avant import

1. Licence exacte des **données kaikki.org** (non lue sur le site : hôte inaccessible depuis la session).
2. Licence actuelle des **pages de téléchargement Tatoeba** (lues via sources secondaires) et fichier des licences audio.
3. Licence des **listes de fréquence de Leeds** (CC BY 2.5 selon Wiktionary seulement).
4. Clause « pas de ré-hébergement » sur certaines pages **Common Voice** malgré CC0.
5. Licence des **données** de `pymorphy3-dicts-ru` (MIT, GPL-3.0 ou CC BY-SA selon les métadonnées).
6. Présence du russe et date des listes **hermitdave/FrequencyWords**.
7. Statut domaine public des **DLI** (document par document) et des FSI hors États-Unis.
8. Les descriptions de progression des manuels commerciaux marquées [C] viennent de mes connaissances et
   n'ont pas été recontrôlées ; elles servent d'orientation, pas de référence citable.
9. Existence d'un manuel anglophone intitulé exactement « Road to Russian ».
10. Exemples d'emprunts slaves en roumain : à faire valider un par un.

---

## 8. Sources

### Ressources et licences
- OpenRussian — dumps CSV, licence CC BY-SA 4.0 : https://github.com/Badestrand/russian-dictionary
- OpenRussian — dictionnaire / à propos : https://en.openrussian.org/dictionary ; https://en.openrussian.org/about
- openrussian-cli (dump SQL sous CC BY-SA) : https://github.com/rhaberkorn/openrussian-cli
- wiktextract (code MIT) : https://github.com/tatuylonen/wiktextract — Ylonen, T. (2022). *Wiktextract: Wiktionary as Machine-Readable Structured Data*. LREC 2022.
- kaikki.org (données Wiktionary extraites) : https://kaikki.org/dictionary/Russian/
- Tatoeba — téléchargements : https://tatoeba.org/fr/downloads ; wiki (licences, audio) : https://en.wiki.tatoeba.org ; Wikipédia : https://en.wikipedia.org/wiki/Tatoeba
- Lingua Libre : https://lingualibre.org ; https://meta.wikimedia.org/wiki/Lingua_Libre ; https://en.wikipedia.org/wiki/Lingua_Libre
- Wikimedia Commons : https://commons.wikimedia.org
- Mozilla Common Voice (DataCollective), jeux russes : https://datacollective.mozillafoundation.org/datasets/cmflnuzw70j7lpa4qgjzcbuyu ; https://datacollective.mozillafoundation.org/datasets/cmj8u3prj00o9nxxbg5pbn88l ; https://en.wikipedia.org/wiki/Common_Voice
- Sharoff, listes Kelly : https://ssharoff.github.io/kelly ; introduction Routledge : https://ssharoff.github.io/publications/2013-routledge-intro.pdf
- Wiktionary, listes de fréquence russes : https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Russian
- Kilgarriff, A. et al. (2014). Corpus-based vocabulary lists for language learners for nine languages. *Language Resources and Evaluation* : https://link.springer.com/article/10.1007/s10579-013-9251-2
- hermitdave/FrequencyWords : https://github.com/hermitdave/FrequencyWords
- Национальный корпус русского языка, dictionnaires de fréquence : https://ruscorpora.ru/en/page/tool-freq/ ; contrat SynTagRus : https://ruscorpora.ru/file/license_dataset_syntagrus_eng
- Lyashevskaya, O. (HSE), dictionnaire de fréquence des formes : https://publications.hse.ru/en/view/82499188
- OpenCorpora : http://opencorpora.org ; discussion de licence : https://qna.habr.com/q/28343 ; pymorphy2-dicts (PyPI) : https://pypi.org/project/pymorphy2-dicts/
- pymorphy3 : https://github.com/no-plagiarism/pymorphy3 ; https://pypi.org/project/pymorphy3-dicts-ru/ ; pymorphy2 : https://github.com/pymorphy2/pymorphy2 ; Korobov, M. (2015). *Morphological Analyzer and Generator for Russian and Ukrainian Languages* : https://arxiv.org/abs/1503.07283
- UD Russian SynTagRus : https://universaldependencies.org/treebanks/ru_syntagrus/
- FSI (Live Lingua, page exacte à vérifier) : https://www.livelingua.com ; revendeur non affilié (à éviter) : https://www.fsi-language-courses.org/fsi-russian-language-course/
- Wikisource russe : https://ru.wikisource.org ; Project Gutenberg : https://www.gutenberg.org ; LibriVox : https://librivox.org
- ts-fsrs : https://github.com/open-spaced-repetition/ts-fsrs ; benchmark : https://expertium.github.io/Benchmark.html
- Forvo (historique de licence) : https://en.wikipedia.org/wiki/Forvo
- tsnorm (accentuation automatique) : https://pypi.org/project/tsnorm/ ; stress-russian-books : https://github.com/FreeLanguageTools/stress-russian-books

### Référentiels ТРКИ
- Wikipédia, Test of Russian as a Foreign Language : https://en.wikipedia.org/wiki/Test_of_Russian_as_a_Foreign_Language
- Université de Zurich, information ТРКИ : https://www.uzh.ch/cmsssl/slav/dam/jcr:40ab6d35-d4cc-4dba-a9e8-703ba4a7dea4/%D0%98%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BE%20%D0%A2%D0%A0%D0%9A%D0%98_RU.pdf
- BGPU, niveaux : https://old.bgpu.ru/testing/levels.pdf
- Université Masaryk, Элементарный уровень : https://is.muni.cz/el/ped/jaro2017/RJ2MK_DIS4/___________.pdf?lang=cs
- KRSU, standards ТРКИ : https://krsu.edu.kg/images/_main-site/testing-center-for-RF/Tests-and-Docs/TRKI/standards-all.pdf
- Лексический минимум, 2-й уровень (Salzbourg) : https://www.plus.ac.at/wp-content/uploads/2021/06/Leksicheskii_minimum_po_russkomu_iazyku_kak_inostrannomu_2_uroven.pdf
- Article RUDN sur la mise à jour des minimums lexicaux : https://journals.rudn.ru/russian-test/article/view/36501/ru_RU
- Ordre des cas, Université de Koursk (2021) : https://api-mag.kursksu.ru/api/v1/get_pdf/3977

### Recherche
- Atkinson, R. C., & Raugh, M. R. (1975). An application of the mnemonic keyword method to the acquisition of a Russian vocabulary. *JEP: Human Learning and Memory*, 1(2). [C]
- Boers, F., & Lindstromberg, S. (2012). Experimental and intervention studies on formulaic sequences in a second language. *Annual Review of Applied Linguistics*, 32. [C]
- Carpenter, S. K., & Olson, K. M. (2012). Are pictures good for learning new vocabulary in a foreign language? *JEP: LMC*, 38(1). [C]
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin*, 132(3). [C]
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*, 14(1).
- Hu, M., & Nation, I. S. P. (2000). Unknown vocabulary density and reading comprehension. *Reading in a Foreign Language*, 13(1).
- Jiang, X., Rollinson, J., Plonsky, L., Gustafson, E., & Pajak, B. (2021). Evaluating the reading and listening outcomes of beginning-level Duolingo courses. *Foreign Language Annals*, 54(4), 974–1002 : https://experts.nau.edu/en/publications/evaluating-the-reading-and-listening-outcomes-of-beginning-level-/
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science*, 319. [C]
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science*, 19(6). [C]
- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition*. Pergamon. [C]
- Laufer, B., & Ravenhorst-Kalovski, G. C. (2010). Lexical threshold revisited. *Reading in a Foreign Language*, 22(1) : https://files.eric.ed.gov/fulltext/EJ887877.pdf
- Lee, J., Jang, J., & Plonsky, L. (2015). The effectiveness of second language pronunciation instruction: A meta-analysis. *Applied Linguistics*, 36(3), 345–366 : https://experts.nau.edu/en/publications/the-effectiveness-of-second-language-pronunciation-instruction-a-/
- Logan, J. S., Lively, S. E., & Pisoni, D. B. (1991). Training Japanese listeners to identify English /r/ and /l/. *JASA*, 89(2). [C]
- Nakata, T., & Suzuki, Y. (2019). Mixing grammar exercises facilitates long-term retention. *Modern Language Journal*, 103(3). [C]
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review*, 63(1). [C]
- Paivio, A. (1986). *Mental Representations: A Dual Coding Approach*. Oxford University Press. [C]
- Pimsleur, P. (1967). A memory schedule. *Modern Language Journal*, 51(2). [C]
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3). [C]
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35. [C]
- Saito, K., & Plonsky, L. (2019). Effects of second language pronunciation teaching revisited. *Language Learning*, 69(3) : https://discovery-pp.ucl.ac.uk/10068780/1/LL2019.pdf
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*. [C]
- Showalter, C. E. (2018). Impact of Cyrillic on native English speakers' phono-lexical acquisition of Russian. *Language and Speech*, 61(4), 565–576.
- Simonchyk, A., & Darcy, I. (2017). Lexical encoding and perception of palatalized consonants in L2 Russian. *PSLLT 8* : https://psycholinguistics.indiana.edu/papers/Simonchyk%20and%20Darcy%202017_PSLLT8.pdf
- Slamecka, N. J., & Graf, P. (1978). The generation effect. *JEP: Human Learning and Memory*, 4(6). [C]
- Thomson, R. I. (2018). High variability [pronunciation] training (HVPT). *Journal of Second Language Pronunciation*, 4(2). [C]
- Wray, A. (2002). *Formulaic Language and the Lexicon*. Cambridge University Press. [C]
- Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling. *KDD 2022*. [C]
- Kogan, V. (UCL), différences individuelles et contraste /i–ɨ/ : https://discovery.ucl.ac.uk/10157599/
