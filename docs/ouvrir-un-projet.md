# Ouvrir un nouveau projet au pipeline

Procédure complète, de la création du dépôt jusqu'à la vérification que les sept
rôles y interviennent correctement.

Trois gestes ne peuvent pas être délégués à un agent. Ils sont détaillés en
sections 1 à 3. Le reste — structure, intégration continue, règles de
protection, réglages, labels — est le travail du provisionneur et ne doit **pas**
être fait à la main : le faire à sa place empêcherait de vérifier qu'il en est
capable.

Durée : environ dix minutes pour les gestes humains, quelques minutes pour le
provisionnement automatisé.

---

## Vue d'ensemble

| #   | Geste                         | Où             | Pourquoi il reste humain                                          |
| --- | ----------------------------- | -------------- | ----------------------------------------------------------------- |
| 1   | Créer le dépôt                | github.com     | Un jeton d'App ne peut pas créer de dépôt sur un compte personnel |
| 2   | Installer les cinq Apps       | github.com     | L'installation exige un consentement humain, par construction     |
| 3   | Déclarer le dépôt aux workers | VM, `sudo`     | C'est la garde qui garde les gardes — voir §3.1                   |
| 4   | Vérifier les cinq canaux      | VM             | Intégré au script du geste 3                                      |
| 5   | Lancer le provisionnement     | Tableau kanban | Carte assignée au provisionneur                                   |
| 6   | Contrôler l'état réel         | VM             | Ce qu'un agent dit avoir fait ≠ ce qu'il a fait                   |

---

## 1. Créer le dépôt

Sur github.com, nouveau dépôt.

**Visibilité : PUBLIC — obligatoire.**

Sur un compte gratuit, les règles de protection d'un dépôt privé sont créées,
affichées dans l'interface, et **totalement inertes**. Aucune ne bloque quoi que
ce soit. Le pipeline semblerait fonctionner alors qu'aucune porte ne tient. Ce
piège est silencieux : rien ne signale la différence.

**Cocher « Add a README file ».**

Contre-intuitif, puisque la structure est le travail du provisionneur. La raison
est mécanique : un dépôt totalement vide n'a aucun commit, donc aucune branche
par défaut. Le provisionneur devrait fabriquer le commit initial, un chemin qui
n'a jamais été éprouvé. Avec un README, `main` existe et il travaille par-dessus.

**Ne rien créer d'autre.** Pas de branche `dev`, pas de `.gitignore`, pas de
licence, pas de modèle de pull request. C'est le travail du provisionneur, et
c'est ce qu'on veut observer.

---

## 2. Installer les cinq Apps

Réglages du compte GitHub → **Applications** → onglet **Installed GitHub Apps**.

Pour **chacune** des cinq Apps du pipeline — les identités dev, reviewer,
merger, admin et scribe — ouvrir la configuration et ajouter le nouveau dépôt
à la liste des dépôts autorisés.

**Les cinq, sans exception.**

Il en manque une et le cycle s'arrêtera en son milieu sur un refus
**indistinguable d'un manque de permission**. Le diagnostic coûtera plus cher
que la vérification.

Rappel de la répartition des identités :

| Identité GitHub | Sert les profils                 |
| --------------- | -------------------------------- |
| dev             | `bot-dev`                        |
| reviewer        | `bot-reviewer`                   |
| merger          | `bot-merger`                     |
| admin           | `bot-admin` et `bot-maintenance` |
| scribe          | `bot-scribe`                     |

Le rôle de maintenance tourne sur l'identité du provisionneur, avec une politique
de broker distincte. Conséquence à connaître : **la maintenance ne pourra jamais
approuver une pull request ouverte par le provisionneur**, GitHub y voyant le
même acteur. Sans effet sur le flux normal, où le resync est ouvert par
l'intégrateur.

---

## 3. Déclarer le dépôt aux workers

```bash
sudo /usr/local/bin/gh-open-repo.sh Issam-Hadjal/NOM-DU-DEPOT
```

Le script est idempotent : relancé sur un dépôt déjà déclaré, il annonce « déjà
présent » sans dupliquer de ligne.

Ce qu'il fait :

1. ajoute le dépôt à `/etc/gh-workers/dev/repos`, `reviewer/repos` et
   `merger/repos` ;
2. redémarre `gh-broker-dev`, `gh-broker-reviewer` et `gh-broker-merger` ;
3. vérifie les cinq canaux (section 4).

### 3.1 Pourquoi ce geste n'est pas automatisable

L'allowlist est la garde qui garde les gardes. Ce qui peut la réécrire et
redémarrer le broker détient exactement le pouvoir que le broker existe pour
retenir : donner à un agent l'accès en écriture à un dépôt. Un agent capable de
s'ajouter un dépôt n'aurait plus besoin d'être autorisé — il s'autoriserait.

Même famille que la suppression d'une règle de protection, exclue par principe.

Et la frontière est **matérielle**, pas conventionnelle : les fichiers vivent
dans `/etc` sur la VM, hors du conteneur ; le redémarrage passe par systemd et
exige root. L'agent tourne dans le conteneur sous un uid non privilégié. Il n'y
a pas de porte à respecter, il n'y a pas de porte.

Automatiser reviendrait à en construire une, et ce démon privilégié deviendrait
le maillon faible de toute l'architecture.

### 3.2 Pourquoi les workers seuls

La politique admin porte un joker (`Issam-Hadjal/*`) ; celle des workers est
nominative. C'est délibéré : les workers sont les seuls rôles qui **écrivent du
code**. Un joker leur ouvrirait tout dépôt où une App se trouve installée, y
compris un ouvert pour une raison sans rapport.

Le coût est une ligne dans trois fichiers par projet. Le bénéfice est que
l'ouverture d'un dépôt à des agents qui y écriront reste un moment visible.

### 3.3 Si le script n'existe pas

À faire à la main, puis écrire le script :

```bash
for r in dev reviewer merger; do
  echo "Issam-Hadjal/NOM-DU-DEPOT" | sudo tee -a /etc/gh-workers/$r/repos > /dev/null
done
sudo systemctl restart gh-broker-dev gh-broker-reviewer gh-broker-merger
```

Vérifier ensuite que chaque ligne est bien seule sur sa ligne : si un fichier ne
se terminait pas par un saut de ligne, l'ajout se serait collé au dépôt
précédent.

---

## 4. Vérifier les cinq canaux

Intégré au script du geste 3. Pour le relancer seul :

```bash
for prof in bot-admin bot-dev bot-reviewer bot-merger bot-maintenance; do
  printf '%-18s ' "$prof"
  docker exec -u 10000 hermes bash -c \
    "export HERMES_HOME=/opt/data/profiles/$prof; gh-api http://localhost/repos/Issam-Hadjal/NOM-DU-DEPOT | jq -r '.full_name // .message // .broker_error'"
done
```

Attendu : cinq fois le nom complet du dépôt.

`bot-orchestrator` n'y figure pas volontairement — privé de terminal, de fichiers
et d'exécution de code, il n'a aucun accès au broker. C'est sa frontière, et elle
est réelle.

### Diagnostic

| Réponse                   | Cause                          | Correction                      |
| ------------------------- | ------------------------------ | ------------------------------- |
| `not in broker allowlist` | Geste 3 non fait pour ce rôle  | Relancer le script              |
| `Not Found`               | App non installée sur ce dépôt | Geste 2, l'App du rôle concerné |
| Nom du dépôt              | Correct                        | —                               |

**L'ordre du diagnostic compte.** Tant que le broker refuse en amont, on ne peut
pas savoir si l'App est installée : son refus masque la question. Toujours régler
les `broker_error` d'abord, puis relancer le contrôle pour voir apparaître les
éventuels `Not Found`.

---

## 5. Synchroniser les personnalités des rôles

À faire **avant** le provisionnement si une consigne a changé depuis le dernier
projet. Sans effet sur le dépôt, mais les agents travailleront avec ce qui est
en place au moment du lancement.

### Règle absolue

Les `SOUL.md` sous `/opt/data/profiles/<rôle>/` sont des **artefacts générés**.
Les éditer directement est une modification qu'une régénération écrase en
silence, sans avertissement.

La source est `/opt/data/soul-parts/`, versionnée :

```
common.md               tronc commun, partagé par les sept
identity-dev.md         une identité par rôle
identity-reviewer.md
identity-merger.md
identity-maintenance.md
identity-orchestrator.md
identity-admin.md
identity-scribe.md
build.sh                le générateur
```

Assemblage : `SOUL.md = identity-<rôle>.md` + un saut de ligne + `common.md`.

### Régénérer

```bash
docker exec -u 10000 hermes bash -c '/opt/data/soul-parts/build.sh'
```

Sortie rôle par rôle : `inchange` ou `REGENERE`. Un premier passage tout en
« inchangé » prouve que le script reproduit l'existant.

### Modifier une consigne

```bash
# 1. éditer la SOURCE, jamais l'artefact
#    /opt/data/soul-parts/identity-<rôle>.md

# 2. régénérer
docker exec -u 10000 hermes bash -c '/opt/data/soul-parts/build.sh'

# 3. relire
docker exec -u 10000 hermes bash -c 'git -C /opt/data diff soul-parts/'

# 4. commiter, avec un message qui dit POURQUOI
docker exec -u 10000 hermes bash -c '
git -C /opt/data add soul-parts/
git -C /opt/data commit -m "<rôle> : <ce qui change>" -m "<la raison>"'
```

`profiles/` est ignoré par git — à raison, il contient secrets, sessions et bases
de données. Seule la source est versionnée.

### Éditer un fichier depuis le shell : le piège

Ne **jamais** imbriquer un patch dans `bash -c '...'`. Une apostrophe dans le
texte ferme la chaîne, après quoi les accents graves du Markdown s'exécutent
comme des commandes.

Écrire le script dans un fichier avec un heredoc non imbriqué, puis le copier :

```bash
cat > /tmp/patch.py << 'PYEOF'
# ... python, apostrophes autorisées ...
PYEOF

docker cp /tmp/patch.py hermes:/tmp/patch.py
docker exec -u 10000 hermes python3 /tmp/patch.py
```

Faire compter les correspondances au script et **abandonner** s'il n'y en a pas
exactement une : mieux vaut un échec net qu'une substitution partielle dans un
fichier de gouvernance.

---

## 6. Lancer le provisionnement

Une carte au tableau, assignée à `bot-admin`.

**Titre :** `Provisionner <nom-du-dépôt> pour le pipeline`

**Corps :**

```
Dépôt : Issam-Hadjal/NOM-DU-DEPOT

Le dépôt vient d'être créé et ne contient qu'un README d'initialisation.
Les cinq Apps y sont installées et les canaux du broker sont ouverts.

Provisionne-le pour que le pipeline puisse y travailler.

Dans ton rapport, sépare ce que tu as créé, ce qui existait déjà,
et ce que tu n'as pas pu vérifier.
```

**Espace de travail :** un arbre de travail git, avec le chemin du dépôt. Sans
lui, le lancement échoue avant de commencer — l'espace par défaut d'une carte est
éphémère et ne convient pas à une tâche qui produit des fichiers.

La carte est volontairement **minimale**. Détailler l'attendu reviendrait à
tester sa propre capacité à écrire une carte plutôt que la personnalité du
provisionneur. S'il produit l'état complet à partir de si peu, sa personnalité
tient.

Le provisionneur est déclenché par un humain, **jamais par le pipeline**. S'il
reçoit une carte au milieu d'un cycle de feature, c'est une erreur de routage et
il doit bloquer.

---

## 7. Contrôler l'état réel

Ce qu'un agent dit avoir fait et ce qu'il a fait sont deux choses. Ce contrôle
est la validation du provisionnement.

Le script `audit-repo.sh` est installé une fois dans `/opt/data/bin/` et prend le
dépôt en argument :

```bash
docker exec -u 10000 hermes bash /opt/data/bin/audit-repo.sh Issam-Hadjal/NOM-DU-DEPOT
```

Il vit dans le volume, donc il survit à une recréation du conteneur.

Utile aussi **avant** le provisionnement, pour disposer d'une photo de l'état de
départ : une seule branche, aucun label personnalisé, aucune règle, aucun
workflow.

### État attendu

**Branches** — `main` et `dev`.

**Réglages de fusion** — squash `true`, merge `true`, rebase `false`,
suppression automatique de la branche source `true`.

**Labels** — `type:resync` et `type:integration` présents.

**Règles de protection** — deux règles, `protect-main` visant la branche par
défaut et `protect-dev` visant `refs/heads/dev`. Chacune portant quatre types :
`deletion`, `non_fast_forward`, `pull_request`, `required_status_checks`.

**Paramètres de pull request** — `required_approving_review_count: 1` et
`require_last_push_approval: true` sur les deux. Contournements **vides**.

**Méthodes de fusion autorisées** — `["merge"]` sur la principale,
`["merge","squash"]` sur l'intégration.

**Structure** — README, `.gitignore`, `CONTRIBUTING.md`, modèle de pull request,
et au moins un fichier sous `.github/workflows/`.

### Deux points à vérifier explicitement

**`required_linear_history` doit être ABSENTE.** Elle interdit le commit de
fusion et condamnerait le resync à un rattrapage perpétuel : chaque intégration
créerait un commit sans lien d'ascendance avec `dev`, et les conflits
apparaîtraient sur du code déjà livré. C'est le piège le plus coûteux de la
configuration, car il ne se manifeste qu'après plusieurs cycles.

**La CI doit avoir tourné au moins une fois** avant que son contrôle soit exigé
dans une règle : un contrôle jamais vu ne peut pas être requis. Si
`required_status_checks` référence un contrôle inexistant, aucune pull request ne
pourra jamais être fusionnée.

---

## 8. Le premier cycle

Une fois le provisionnement validé, le dépôt est prêt.

La chaîne complète :

```
demandeur → issue portant l'exigence
   ↓
bot-orchestrator → grappe de cartes liées, une par rôle
   ↓
bot-dev          → implémente, ouvre la PR feature → dev, complète sa carte
   ↓
bot-reviewer     → juge contre l'issue, approuve, fusionne (squash),
                   puis ouvre la PR d'intégration dev → main
   ↓
bot-merger       → juge le cumul, approuve, fusionne (merge),
                   ferme les issues livrées, ouvre la PR de resync main → dev
   ↓
bot-maintenance  → approuve et fusionne le resync (merge)
```

### L'issue doit énoncer un contenu vérifiable

Une exigence vague ne produit pas une revue laxiste : elle produit une porte de
qualité **sans référent**, donc inopérante sur le fond. Un relecteur a déjà
approuvé un contenu factuellement faux parce que l'issue disait « les quatre
rôles » sans les nommer — ni lui ni l'implémenteur ne connaissaient la liste.

Écrire ce qui doit s'y trouver, pas seulement l'intention.

### Le relais entre cartes passe par les commentaires

L'implémenteur écrit le numéro de pull request dans le fil de sa carte ; le
relecteur l'y trouve. Une carte fille n'est promue que si ses parents sont
**terminés** — d'où la règle : ouvrir la pull request achève la carte de
l'implémenteur, elle ne le met pas en attente de revue.

### Décomposition manuelle ou automatique

Le décomposeur automatique a son propre prompt et ignore les conventions
locales : titres en anglais, prescription de partir de la branche principale,
et une carte structurellement impossible déjà observée. Pour un premier cycle
sur un projet neuf, préférer le **mode manuel** — l'orchestrateur crée les cartes
avec sa playbook, et l'on teste le pipeline seul.
