# Installer Russian 365 sur o2switch (bmcg.ch/russian)

Résultat : l'application à l'adresse **https://bmcg.ch/russian**, installable sur l'écran d'accueil du téléphone.
Chaque mise à jour poussée sur `main` est testée puis déployée automatiquement par GitHub Actions (FTPS).

À faire une seule fois ; compter environ 20 minutes. Aucun mot de passe ne va dans le dépôt.

---

## 1. Base de données PostgreSQL (cPanel)

1. cPanel → rechercher **« PostgreSQL »** → *Bases de données PostgreSQL*.
2. **Créer une base** : par exemple `russian` (cPanel la préfixe : `VOTRECOMPTE_russian`).
3. **Créer un utilisateur** : par exemple `russian` (→ `VOTRECOMPTE_russian`), avec un mot de passe long **sans caractères spéciaux**
   (lettres et chiffres uniquement, sinon il faut les encoder dans l'URL).
4. **Ajouter l'utilisateur à la base** avec tous les privilèges.

Tu obtiens l'adresse de connexion :

```
postgres://VOTRECOMPTE_russian:MOT_DE_PASSE@localhost:5432/VOTRECOMPTE_russian
```

> Pas de PostgreSQL dans ton cPanel ? Dis-le : l'application sera adaptée à MySQL/MariaDB.

## 2. Application Node.js (cPanel → « Setup Node.js App »)

**Créer une application** avec :

| Champ | Valeur |
|---|---|
| Version de Node.js | **22.23.5** (ou toute version ≥ 20) |
| Mode d'application | **Production** |
| Racine de l'application | `russian_app` (dossier **hors** de `Bmcg.ch`, pour que la configuration ne soit jamais publique) |
| URL de l'application | domaine `bmcg.ch`, chemin `russian` |
| Fichier de démarrage | `app.js` |

Puis **Environment variables → Ajouter une variable** (ou, à la place, un fichier `.env` dans `russian_app`, voir `release/.env.exemple`) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'adresse de l'étape 1 |
| `BASE_PATH` | `/russian` |
| `REGISTRATION_OPEN` | `true` (on fermera après la création de ton compte) |
| `ALLOW_PENDING_CONTENT` | `true` (contenu en attente de relecture linguistique) |
| `TOKEN_TTL_DAYS` | `90` (rester connecté 3 mois sur le téléphone) |
| `LOG_LEVEL` | `warn` |

Clique **Create**. L'application n'a encore aucun fichier : c'est normal, le déploiement les envoie.
**Il n'y a pas besoin de cliquer sur « Run NPM Install »** : le serveur est livré compilé, sans dépendances.

## 3. Secrets GitHub (une fois)

Dépôt GitHub → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `FTP_HOST` | ton serveur FTP (le même que pour Dashaskandinsky) |
| `FTP_USER` | identifiant FTP |
| `FTP_PASS` | mot de passe FTP |
| `FTP_DIR` | `russian_app` |

**Attention au chemin** (comme pour Dashaskandinsky) : avec le compte FTP principal, on arrive dans ton dossier personnel
et `russian_app` est correct. Avec un compte FTP limité à un dossier, adapte `FTP_DIR` pour viser le même dossier que
la « Racine de l'application » de l'étape 2.

## 4. Déployer

GitHub → onglet **Actions** → *Tester et déployer sur o2switch* → **Run workflow**.
Le workflow exécute les tests, compile, envoie le paquet par FTPS puis redémarre l'application (`tmp/restart.txt`).
Le paquet reste téléchargeable dans les artefacts du workflow, même sans FTP.

Au premier démarrage, l'application crée elle-même les tables (migrations) et charge le contenu.

Vérification : https://bmcg.ch/russian/health doit afficher `{"ok":true}`.

## 5. Créer ton compte puis fermer les inscriptions

1. Ouvre **https://bmcg.ch/russian** sur ton téléphone, crée ton compte, fais l'onboarding.
2. cPanel → Setup Node.js App → ton application → variable `REGISTRATION_OPEN` = **`false`** → **Save** puis **Restart**.
   Plus personne ne peut créer de compte ; la page n'affiche plus que la connexion.

## 6. L'installer sur le téléphone

- **iPhone (Safari)** : bouton *Partager* → **« Sur l'écran d'accueil »**.
- **Android (Chrome)** : menu ⋮ → **« Installer l'application »** (ou « Ajouter à l'écran d'accueil »).

L'icône « Я » ouvre l'application en plein écran. Pour l'audio, vérifie qu'une voix russe est installée sur le téléphone :
- iPhone : Réglages → Accessibilité → Contenu énoncé → Voix → Russe ;
- Android : Paramètres → Gestion globale → Synthèse vocale → moteur Google → installer les données vocales en russe.

## En cas de problème

| Symptôme | Piste |
|---|---|
| `/russian/health` ne répond pas | cPanel → Setup Node.js App → **Restart** ; consulter `russian_app/stderr.log` dans le gestionnaire de fichiers |
| « Démarrage impossible » + erreur de connexion | vérifier `DATABASE_URL` (préfixe du compte, mot de passe, privilèges) |
| Page blanche | vérifier que `BASE_PATH` vaut `/russian` et que le paquet a été construit avec la même valeur (variable GitHub `BASE_PATH`, défaut `/russian`) |
| Le workflow dit « Secrets FTP absents » | renseigner les 4 secrets de l'étape 3 |

Sauvegardes : la base est incluse dans les sauvegardes o2switch (JetBackup). L'export JSON/CSV est aussi disponible dans *Réglages*.
