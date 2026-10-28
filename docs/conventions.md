# Contrôle des conventions

Le workflow `.github/workflows/conventions.yml` (nom « Conventions ») contrôle
le titre, la branche, le corps et les commits de chaque pull request, selon la
porte qu'elle franchit. Il est exigé par les règles de protection des branches
sous le nom « conventions » : une pull request non conforme ne peut pas être
fusionnée.

Le contrôle se déclenche à chaque événement susceptible de changer ce qu'il
juge : ouverture, édition, réouverture, synchronisation (nouveau push) et
passage « prêt pour revue » de la pull request. À chaque passage il reprend
tout à zéro, sans rien retenir de l'exécution précédente.

## Les portes

Le contrôle commence par déterminer la porte d'après la paire de branches
`base` → `head` :

| Paire de branches | Porte | Ce que la pull request fait |
| --- | --- | --- |
| `<branche>` → `dev` (branche autre que `main`) | feature vers dev | apporte du contenu : feature, correctif, documentation, CI… |
| `dev` → `main` | intégration dev vers main | livre le cumul de `dev` dans `main` |
| `main` → `dev` | resynchronisation main vers dev | ramène `main` dans `dev` après une fusion vers `main` |

Toute autre paire de branches n'appartient pas au pipeline : le contrôle n'a
rien à vérifier et se termine sans échec. Une branche autre que `dev` qui vise
`main` est néanmoins refusée d'emblée — seule `dev` s'intègre dans `main`.

## Ce que le contrôle vérifie à chaque porte

### Feature vers dev

C'est la porte la plus contrôlée : elle vérifie le titre, la branche, le corps
et chaque commit.

**Le titre.** Il doit suivre `type(portée): résumé`, où `type` est l'un des
sept types `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, et où la
portée est facultative. Le titre ne dépasse pas 72 caractères, ne se termine
pas par un point, commence son résumé par une minuscule et ne porte aucun
numéro d'issue — la fusion ajoute celui de la pull request.

**La branche.** Elle doit suivre `<type>/<N>-<objet-court>` : le type parmi
les sept ci-dessus, `N` le numéro de l'issue, et un objet court en minuscules
(alphanumérique et tirets), d'au plus 30 caractères.

**Le corps.** Il doit comporter les sept sections, dans cet ordre et sans en
manquer : `Issue`, `Objectif`, `Changements`, `Vérification`, `Conséquences et
risques`, `Hors périmètre`, `Carte`. Le contrôle ignore les commentaires HTML
et les blocs de code avant de compter les sections : un titre cité dans un bloc
n'est pas pris pour une section. Le corps doit aussi porter une ligne
`Refs #N` dont le numéro est celui de la branche.

**L'issue référencée.** Le numéro `N` de la branche doit exister et être une
issue (pas une pull request). Vers `dev`, rien ne se ferme : un mot de fermeture
(`Closes`, `Fixes`, …) devant un numéro est un écart — il faut `Refs #N`.

**Les commits.** Chaque commit de la branche (hormis les commits de fusion,
reconnus à leurs deux parents) doit porter un titre au format
`type(portée): résumé` — 72 caractères au plus, sans point final, résumé en
minuscule —, une ligne `Refs #N` dans son message, une ligne vide après le
titre quand le message a un corps, et un pied `BREAKING CHANGE:` quand son
titre porte le marqueur `!`.

### Intégration de dev vers main

**Le titre.** Il doit suivre exactement `chore(integration): livrer <objet>
dans main`, sans dépasser 72 caractères.

**Le corps.** Il doit comporter les trois sections, dans l'ordre : `Livré`,
`Synthèse`, `Risques`. Il doit aussi porter au moins une ligne `Closes #N`,
une par issue livrée — c'est vers `main` que GitHub ferme les issues à la
fusion.

### Resynchronisation de main vers dev

**Le titre.** Il doit être exactement
`chore(resync): resynchroniser dev depuis main`.

**Le corps.** Il doit comporter les deux sections, dans l'ordre : `Suit`,
`Écart`. La section `Suit` doit citer le numéro de la pull request
d'intégration qu'elle suit.

## Où lire les écarts

Quand le contrôle trouve des écarts, il les signale à trois endroits, mais le
canal à lire est le premier :

1. **Un commentaire sur la pull request**, le canal que lisent les rôles. Il
   est créé au premier échec et réécrit à chaque passage : il liste chaque
   écart sous le titre `Contrôle des conventions`. Quand la pull request
   devient conforme, le commentaire existant est réécrit en « Conforme ».
2. **Les annotations du run**, visibles dans l'onglet de la vérification
   « conventions » : chaque écart apparaît comme une erreur `Conventions`.
3. **Le résumé d'étape** du run, qui répète la liste des écarts.

Le contrôle repasse à chaque modification du titre, du corps ou des commits :
un écart corrigé est signalé conforme au passage suivant. Une erreur passagère
de GitHub est retentée avant d'échouer, pour qu'une panne temporaire ne fasse
pas échouer une pull request valide.
