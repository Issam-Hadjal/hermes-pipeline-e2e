# Flux hybride — je code, les bots relisent et intègrent

Procédure complète, du clone du projet jusqu'à la branche d'intégration à jour.

Tu remplaces `bot-dev` dans le cycle. Tout le reste — revue, intégration,
resynchronisation — est fait par les agents, sans intervention.

---

## Les deux environnements, et pourquoi la frontière tient

|                     | Où               | Ce qu'on y fait                                 |
| ------------------- | ---------------- | ----------------------------------------------- |
| **Poste de bureau** | ta machine       | Écrire du code, pousser, ouvrir la pull request |
| **VM `hermes-vm`**  | conteneur Hermes | Créer les cartes, faire tourner les agents      |

**Ton identité GitHub ne doit jamais entrer dans la VM.**

Toute l'architecture repose sur une invariante : _il n'existe aucun secret dans
cet environnement_. Les agents partagent l'uid du conteneur et disposent d'un
terminal — l'un d'eux pourrait lire ta clé. Tu développes donc sur ton poste,
avec ton identité, et tu ne pilotes la VM que par les fonctions `hermes-*`.

La seule chose que tu édites _dans_ la VM, c'est la gouvernance — `soul-parts/`,
`tools/`, `skills-maison/` — parce que ces fichiers y vivent et y sont
versionnés. Ce n'est pas du développement de projet.

---

## Les acteurs

| Acteur                | Environnement | Rôle dans ce flux                                                       |
| --------------------- | ------------- | ----------------------------------------------------------------------- |
| **Toi**               | poste         | Écris l'issue, le code, ouvres la pull request de feature               |
| **`bot-reviewer`**    | VM            | Juge contre l'issue, approuve, fusionne dans `dev`, ouvre l'intégration |
| **`bot-merger`**      | VM            | Juge le cumul, fusionne dans `main`, ferme l'issue, ouvre le resync     |
| **`bot-maintenance`** | VM            | Approuve et fusionne le resync `main` → `dev`                           |

`bot-dev` n'intervient pas : c'est toi. `bot-orchestrator` non plus — sa
playbook ne connaît qu'un mode à trois cartes commençant par l'implémenteur.
`bot-admin` n'intervient jamais dans un cycle de feature.

---

## Étape 0 — le dépôt doit être provisionné

Ce document suppose un dépôt déjà ouvert au pipeline : branches `main` et `dev`,
règles de protection actives, Apps installées, allowlist du broker à jour.

Si ce n'est pas le cas, voir la procédure d'ouverture d'un nouveau projet
(trois gestes humains, puis une carte au provisionneur).

---

## Étape 1 — cloner, sur ton poste

```bash
git clone git@github.com:Issam-Hadjal/<depot>.git
cd <depot>
git checkout dev
git pull
```

**Toujours partir de `dev`, jamais de `main`.** C'est la branche d'intégration ;
`main` ne reçoit que des fusions gouvernées.

---

## Étape 2 — écrire l'issue, dans le navigateur

**C'est l'étape la plus importante du flux, et c'est la seule qu'on ne peut pas
rattraper plus tard.**

L'issue est le **référent** du relecteur. Il jugera ton code contre elle, pas
contre ta description de pull request. Une issue vague ne produit pas une revue
indulgente : elle produit une porte de qualité **sans référent**, donc
inopérante sur le fond.

### Règles de rédaction

**Énoncer un contenu vérifiable, pas une intention.** Si le livrable doit
contenir six éléments, nomme-les tous les six. Le relecteur ne peut vérifier que
ce qui est énonçable.

**Décrire le résultat voulu, jamais la correction à faire.** Une issue qui dit
« il est faux d'écrire X » fait fuiter le langage de correction dans le
livrable — c'est arrivé, et le relecteur a validé puisque c'était littéralement
conforme. Pour une correction, écris le texte attendu.

**Pas de label, pas d'assigné.** La taxonomie ne couvre que les pull requests,
et c'est la carte kanban qui porte l'assignation.

---

### Quand une issue est-elle nécessaire

Une issue est nécessaire dès qu'un rôle doit juger un travail gouverné par
les consignes d'un autre rôle. Le savoir est propre à chaque rôle — le
provisionneur connaît des contraintes que le relecteur n'a pas dans sa
propre identité. L'issue est le seul canal qui met les deux au même niveau.

---

## Étape 3 — coder et pousser, sur ton poste

```bash
git checkout -b feat/<sujet-court>
# ... tu codes ...
git add -A
git commit -m "feat: <description au présent>"
git push -u origin feat/<sujet-court>
```

Les branches de feature ne sont **pas** protégées : tu pousses librement, autant
de fois que tu veux.

Conventions de nommage et de message : `references/commits-branches.md` de la
compétence maison. Autant t'aligner sur ce que les bots produisent — le dépôt
reste lisible.

---

## Étape 4 — ouvrir la pull request, dans le navigateur

Base `dev`, comparaison `feat/<sujet-court>`.

Le modèle de pull request s'affichera automatiquement — c'est le seul cas où il
sert, puisque les agents ouvrent avec un corps déjà rempli par l'API.

Deux choses à mettre dans le corps :

- `Closes #<numéro>` pour lier l'issue. Le mot-clé n'agira pas tout seul dans un
  flux à deux niveaux, mais le lien reste utile — et `bot-merger` fermera
  l'issue explicitement à l'intégration.
- Une description courte de ce que tu as fait.

**Tu peux aussi déléguer cette ouverture à `bot-dev`** par une carte, son canal
l'autorise. Mais ça coûte une carte et un tour de modèle pour un gain nul : la
description n'est pas le référent.

Note le numéro de la pull request.

---

## Étape 5 — lancer la chaîne, sur la VM

Deux cartes chaînées, créées avec `kancc`.

### Carte 1 — le relecteur

```
kancc
```

| Question                 | Réponse                                           |
| ------------------------ | ------------------------------------------------- |
| Titre                    | `Relire et integrer la PR #<N> pour l'issue #<M>` |
| Assigné                  | `bot-reviewer`                                    |
| Tenant                   | `<nom-du-depot>`                                  |
| Dépôt GitHub             | (défaut proposé)                                  |
| Numéro d'issue à joindre | `<M>`                                             |
| Espace de travail        | `1` (éphémère)                                    |
| Carte parente            | _(vide)_                                          |

Corps, terminé par `Ctrl-D` sur une ligne vide :

```
Dépôt : Issam-Hadjal/<depot>
Issue : #<M>
Pull request : #<N>

La pull request #<N> a été ouverte par un humain, pas par bot-dev.

Juge son contenu contre l'issue, pas contre sa description.
Si le contenu convient, approuve et fusionne dans dev, puis ouvre
la pull request d'intégration dev vers main.

Si le contenu ne convient pas, bloque cette carte en énonçant
précisément ce qui manque : l'auteur est humain et corrigera
hors du cycle.
```

Note l'identifiant de carte renvoyé.

### Carte 2 — l'intégrateur

Mêmes questions, avec :

| Question      | Réponse                                    |
| ------------- | ------------------------------------------ |
| Titre         | `Integrer la PR de l'issue #<M> vers main` |
| Assigné       | `bot-merger`                               |
| Carte parente | **l'identifiant de la carte 1**            |

Corps :

```
Dépôt : Issam-Hadjal/<depot>
Issue : #<M>

Une pull request d'intégration dev vers main a été ouverte par le relecteur.

Juge le cumul, approuve et fusionne.
```

**Ne crée pas de troisième carte.** L'intégrateur crée lui-même celle de la
maintenance : elle doit nommer le numéro de la pull request de resynchronisation,
qui n'existe pas avant son passage.

---

## Étape 6 — laisser tourner

Le répartiteur — la passerelle de `bot-orchestrator` — réclame les cartes dans
la minute. La chaîne se déroule seule :

```
toi          →  PR feature → dev
bot-reviewer →  juge, approuve, fusionne (écrasement), ouvre dev → main
bot-merger   →  juge, approuve, fusionne (commit de fusion),
                ferme l'issue, ouvre main → dev, crée la carte de maintenance
bot-maintenance → approuve et fusionne le resync (commit de fusion)
```

Suivre l'avancement :

```bash
docker exec hermes hermes kanban ls 2>&1 | tail -6
```

Compter deux à quatre minutes par carte.

### Si le relecteur refuse

Il bloque la carte avec ses demandes. Alors :

```bash
docker exec hermes hermes kanban show <ID> 2>&1 | grep -A 15 "blocked"
```

Tu corriges sur ton poste, tu pousses sur la même branche, puis :

```bash
docker exec hermes hermes kanban comment <ID> "Corrections poussees, relance la revue."
docker exec hermes hermes kanban unblock <ID>
```

**Attention à l'invalidation d'approbation.** La règle `protect-dev` invalide
une approbation existante dès qu'un nouveau commit arrive. Si le relecteur avait
déjà approuvé avant que tu pousses, il devra réapprouver — c'est prévu, mais ça
consomme un tour.

---

## Étape 7 — vérifier

```bash
docker exec -u 10000 hermes bash /opt/data/bin/verif-cycle.sh
```

_(le script est écrit pour un dépôt précis — adapte la variable `R` si tu
travailles sur un autre projet)_

### Ce qui doit être vrai

**Trois pull requests fermées** : ta feature vers `dev`, l'intégration vers
`main`, le resync vers `dev`.

**L'ascendance :**

| Commit        | Parents | Pourquoi                                             |
| ------------- | ------- | ---------------------------------------------------- |
| ta feature    | **1**   | écrasement — la branche est supprimée juste après    |
| l'intégration | **2**   | commit de fusion — `dev` devient ancêtre de `main`   |
| le resync     | **2**   | commit de fusion — `main` redevient ancêtre de `dev` |

Un `parents=1` sur l'intégration ou le resync signifierait qu'un écrasement est
passé malgré le verrou. C'est le point qui compte le plus.

**L'approbateur distinct du dernier pousseur** sur les trois pull requests.

**L'écart final** : `ahead_by: 1, behind_by: 0`. Le commit de resync ne vit que
sur `dev` et ne porte aucun contenu. `main` est un ancêtre de `dev`, ce qui
rendra la prochaine intégration triviale.

**Deux branches** : `main` et `dev`. Ta branche de feature a été supprimée
automatiquement par le réglage `delete_branch_on_merge`.

**L'issue est fermée**, par `bot-merger`, à l'intégration.

---

## Étape 8 — se remettre à jour, sur ton poste

```bash
git checkout dev
git pull
git branch -d feat/<sujet-court>
```

La branche distante a déjà disparu ; il ne reste que la copie locale.

---

## Mode A sans issue — deux passes

Le flux ci-dessus suppose qu'une issue existe déjà : tu l'écris à l'étape 2,
et la chaîne juge contre elle. Mais on peut aussi fournir une simple demande
en langage naturel, sans issue. L'orchestrateur ne peut pas écrire l'issue
lui-même — il n'a aucun accès GitHub. Il matérialise donc l'issue, puis route
le cycle, en **deux passes**.

### Première passe — matérialiser l'issue

L'orchestrateur crée **deux** cartes, chaînées :

1. une carte pour `bot-scribe`, qui crée l'issue sur le dépôt — titre et
   corps ;
2. une carte pour lui-même (`bot-orchestrator`), **chaînée à la première**,
   qui routera le cycle une fois le numéro d'issue connu.

Le corps de l'issue est rédigé au même standard qu'à l'étape 2 : un contenu
**vérifiable**, pas une intention. Le relecteur jugera le travail contre ces
mots et rien d'autre ; un corps que deux implémentations différentes
pourraient satisfaire n'est pas encore écrit.

`bot-scribe` rapporte le numéro d'issue obtenu dans le résumé de sa carte. Ce
résumé est le seul endroit où ce numéro existe pour l'orchestrateur, qui n'a
aucun accès GitHub.

### Seconde passe — router le cycle

Une fois le numéro d'issue rapporté, l'orchestrateur route le cycle Mode A
classique — `bot-dev` → `bot-reviewer` → `bot-merger` — contre ce numéro.

### Ce que la séparation en deux passes garantit

- **Aucune tâche du cycle n'est créée tant que le numéro d'issue n'existe
  pas.** Une carte qui ne nomme aucune issue ne donne au relecteur aucun
  référent.
- **Le relecteur juge le travail contre l'issue.** Le corps de l'issue doit
  donc être une exigence vérifiable — c'est lui le référent, pas la demande
  initiale.
- **Les trois tâches du cycle ne sont pas créées dans la même passe que la
  matérialisation de l'issue.** Elles partent dans la seconde passe, une fois
  le numéro connu, et jamais avant.

---

## Ce que ce flux ne couvre pas encore

**Le refus n'a jamais été exercé avec un auteur humain.** La personnalité du
relecteur dit « l'auteur corrige », ce qui suppose un auteur agent disponible
dans le cycle. Face à toi, il improvisera la première fois. La consigne ajoutée
dans le corps de carte (étape 5) le guide, mais ce n'est pas encore dans son
identité — à y écrire si ce flux devient habituel.

**Une seule carte au lieu de deux.** La playbook de `bot-orchestrator` ne connaît
qu'un mode : trois cartes commençant par l'implémenteur. Un second mode
« code déjà écrit » lui permettrait de produire les deux bonnes cartes à partir
d'une seule demande.

**Le label sur ta pull request.** Les agents oublient de le poser une fois sur
deux, et toi tu peux le mettre à la main. Un workflow qui le dérive de la paire
de branches réglerait le sujet pour tout le monde.

---

## Résumé en une page

| #   | Où         | Qui  | Quoi                                             |
| --- | ---------- | ---- | ------------------------------------------------ |
| 1   | poste      | toi  | `git clone`, `git checkout dev`                  |
| 2   | navigateur | toi  | Écrire l'issue — contenu vérifiable              |
| 3   | poste      | toi  | Brancher, coder, pousser                         |
| 4   | navigateur | toi  | Ouvrir la pull request vers `dev`                |
| 5   | VM         | toi  | `kancc` × 2 — relecteur, puis intégrateur chaîné |
| 6   | VM         | bots | La chaîne se déroule seule                       |
| 7   | VM         | toi  | Vérifier l'ascendance et l'écart                 |
| 8   | poste      | toi  | `git pull` sur `dev`, effacer la branche locale  |
