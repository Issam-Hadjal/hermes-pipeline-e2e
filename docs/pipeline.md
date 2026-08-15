# Pipeline multi-agents

Ce document décrit le pipeline de bout en bout : de la demande à la
livraison. Sept rôles orchestrent le flux, chacun avec une responsabilité
unique, et chaque porte entre deux branches est soumise à une revue.

## Rôles

- **bot-admin** : provisionne le dépôt, seul à pouvoir écrire les règles de
  protection des branches.
- **bot-orchestrator** : décompose une demande utilisateur en cartes et les
  route vers les bons spécialistes.
- **bot-scribe** : transcrit les découpages de l'orchestrateur en issues
  GitHub, puis lui rapporte les numéros obtenus.
- **bot-dev** : implémente la feature et ouvre une pull request vers `dev`.
- **bot-reviewer** : juge la feature contre son issue, approuve ou demande
  des modifications, puis intègre vers `dev`.
- **bot-merger** : juge le cumul des features intégrées, approuve ou
  demande des modifications, fusionne `dev` vers `main` et ferme les
  issues terminées.
- **bot-maintenance** : resynchronise `dev` depuis `main` après chaque
  fusion, en ouvrant une pull request inverse.

## Le rôle bot-scribe

`bot-scribe` est le septième rôle, et le seul sans jugement à porter. Il est
déclenché par une carte : dans le mode de découpage (section suivante),
l'orchestrateur crée une carte qui lui est adressée et dont le corps porte le
découpage complet. Comme tout worker, il reçoit la carte, travaille et rend
compte par les outils kanban — il ne converse pas.

Il existe parce que la décision et l'écriture doivent rester séparées.
L'orchestrateur décide le découpage mais n'a aucun accès GitHub ;
l'implémenteur ne doit jamais écrire l'issue qu'il implémentera ; le relecteur
et l'intégrateur arriveraient au jugement avec un plan préconçu. Un rôle
dédié transcrit, et s'arrête.

**Ce qu'il fait :**

- **Transcrire le découpage en issues GitHub.** Il crée l'issue parente, puis
  chaque issue fille, puis rattache chaque fille à la parente. C'est son seul
  travail.

**Ce qu'il ne fait pas, par construction :**

- Il ne juge pas le découpage. Un titre qu'il trouve maladroit est copié tel
  quel, un corps qu'il trouve mince aussi. S'il estime que le découpage est
  faux, il le dit dans son résumé — et transcrit quand même. La décision
  appartient à l'orchestrateur : un scribe qui corrige devient un second
  auteur, et plus personne ne sait contre quel texte le relecteur juge.
- Il n'écrit pas de code, n'ouvre pas de pull request, ne relit pas, ne
  fusionne pas, ne ferme pas d'issue. Son canal refuse tout cela.

**Ses contraintes :**

- **L'ordre compte.** L'issue parente d'abord, puis chaque fille, puis le
  rattachement : une fille ne peut pas être rattachée à une issue qui
  n'existe pas encore.
- **Le rattachement prend l'identifiant interne, pas le numéro.** L'API
  `sub_issues` attend l'`id` de la fille, pas son `number` — à relire dans la
  réponse de création, car la réponse d'un rattachement réussi décrit la
  parente, pas la fille.
- **En cas d'échec partiel, il s'arrête, il ne recommence pas.** Si trois
  issues sont créées et que la quatrième échoue, il rapporte les trois numéros
  existants et bloque sa carte. Recommencer du début dupliquerait ce qui a
  réussi, et deux issues en double valent moins qu'une manquante.

**Sa manière de rendre compte : il rapporte chaque numéro obtenu.**
L'orchestrateur n'a aucun accès GitHub — ces numéros n'existent pour lui que
dans le résumé du scribe. Le résumé liste l'issue parente et chaque fille,
chacune avec son titre, pour que la carte suivante puisse router le travail
contre elles.

## Mode de découpage de l'orchestrateur

Pour une demande qui tient dans une seule feature, l'orchestrateur applique le
cycle standard : une chaîne de cartes implémenteur → relecteur → intégrateur
(ou relecteur → intégrateur si le code est déjà écrit). Quand la demande est
trop grosse pour une seule feature, il bascule en **mode de découpage**.

**Critère de déclenchement : la demande produirait plus d'une pull request.**
C'est le test, et ce n'est pas une affaire de goût : un livrable, une issue, un
cycle. Si l'on ne peut pas dire combien de pull requests le travail exige, ce
n'est pas un découpage — c'est une demande standard, et il ne faut pas
surinterpréter.

L'orchestrateur ne peut pas écrire d'issue lui-même — il n'a aucun accès
GitHub. `bot-scribe` les écrit pour lui. Le mode se déroule donc en **deux
passes**.

**Première passe — découper.** L'orchestrateur crée **une** carte pour
`bot-scribe`, laissée **non assignée** (triage) : un humain relit le découpage
avant que plusieurs cycles ne partent dessus. Son corps porte, dans l'ordre :

1. le dépôt ;
2. l'issue parente : son titre et son corps ;
3. chaque issue fille : son titre et son corps, numérotées dans l'ordre où
   elles doivent être traitées.

Ces corps sont rédigés au même standard que n'importe quelle issue : un contenu
**vérifiable**, pas une intention. Un relecteur jugera le travail contre ces
mots et rien d'autre ; un corps que deux implémentations différentes pourraient
satisfaire n'est pas encore écrit.

**Un seul niveau.** Des filles de la parente, jamais de petites-filles. Si une
fille paraît encore trop grosse, le découpage lui-même est faux : refaire le
découpage, ne pas ajouter un étage. Le pipeline transforme une issue en une
pull request ; un second niveau n'a nulle part où aller.

**Ne pas router encore.** Les issues n'existent pas, donc elles n'ont pas de
numéro, et une carte qui ne nomme aucune issue ne donne au relecteur aucun
référent. L'orchestrateur crée une seconde carte pour **lui-même**, chaînée à
celle du scribe, disant de router les filles une fois les numéros connus.
`bot-scribe` rapporte chaque numéro dans son résumé — ce résumé est le seul
endroit où ils existent pour l'orchestrateur.

**Seconde passe — router.** L'orchestrateur lit les numéros dans le résumé du
scribe et applique le cycle standard à chaque fille, **en série** : la première
carte de chaque cycle est chaînée à la dernière carte du cycle précédent. Un
routage en parallèle aurait deux branches visant `dev` en même temps, et le jeu
de règles exige qu'une branche soit à jour avant de fusionner — la seconde
serait refusée jusqu'à resynchronisation. La série coûte du temps et aucune
surprise.

L'orchestrateur dit dans son résumé combien de cycles il a routés et contre
quels numéros d'issue.

## Flux de branches

```
feature/* ──→ dev ──→ main
```

Une branche de fonctionnalité part de `dev` et y est intégrée après revue
du `bot-reviewer`. Une fois que `dev` contient suffisamment de changements
validés, `bot-merger` fusionne `dev` vers `main`, là aussi après revue.
Après chaque fusion vers `main`, `bot-maintenance` ramène les changements
dans `dev` pour que les prochaines features partent d'une base à jour.

Aucun push direct n'est autorisé sur `dev` ni sur `main` ; tout transit
par une pull request et une approbation.
