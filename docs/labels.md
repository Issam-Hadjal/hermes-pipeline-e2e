# Taxonomie des labels

Les labels de ce dépôt marquent deux axes d'une pull request : la porte
franchie dans le flux qui relie `main` et `dev` (labels `stage:`) et la nature
du changement (labels `type:`). Un seul workflow GitHub Actions les applique
automatiquement, sans intervention manuelle.

## Les trois labels de porte

| Label | Signification |
| --- | --- |
| `stage:feature` | La pull request vise `dev` depuis une branche autre que `main` : une entrée de contenu (feature, correctif, documentation, CI…). |
| `stage:integration` | La pull request vise `main` depuis `dev` : l'intégration des changements accumulés dans `dev`. |
| `stage:resync` | La pull request vise `dev` depuis `main` : la resynchronisation de `dev` après une fusion vers `main`. |

## Les sept labels de type

| Label | Signification |
| --- | --- |
| `type:feat` | Une nouvelle fonctionnalité. |
| `type:fix` | La correction d'un défaut. |
| `type:docs` | Une modification de documentation. |
| `type:refactor` | Une réorganisation du code sans changement de comportement. |
| `type:test` | L'ajout ou la correction de tests. |
| `type:ci` | Une modification de la configuration d'intégration continue. |
| `type:chore` | Une tâche de maintenance sans impact fonctionnel. |

## Qui applique ces labels

Le workflow `Étiquetage par porte et par type`
(`.github/workflows/label-by-gate.yml`) applique les deux axes à l'ouverture, à
la réouverture et à l'édition d'une pull request.

Le label de porte (`stage:`) est lu sur la paire de branches `head` → `base` :

- `main` → `dev` donne `stage:resync` ;
- toute autre branche → `dev` donne `stage:feature` ;
- `dev` → `main` donne `stage:integration`.

Toute autre paire de branches ne reçoit aucun label de porte.

Le label de type (`type:`) est tiré du type du titre de la pull request : le
mot d'ouverture du titre, parmi les sept types reconnus `feat`, `fix`, `docs`,
`refactor`, `test`, `ci` et `chore`, avant le `:` qui le termine. Un titre qui
ne commence par aucun de ces types ne reçoit aucun label de type.

Quand le titre d'une pull request change, le même workflow retire le label
`type:` devenu faux : un `type:feat` est retiré si le titre ne commence plus par
`feat`, et le nouveau type reconnu, s'il existe, est posé à la place. Le retrait
vaut aussi pour un label `stage:` devenu faux.
