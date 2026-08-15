# Taxonomie des labels

Les labels de ce dépôt marquent l'étape d'une pull request dans le flux qui
relie `main` et `dev`. Trois labels de porte couvrent les trois transitions
possibles ; un workflow GitHub Actions les applique automatiquement, sans
intervention manuelle.

## Les trois labels de porte

| Label | Signification |
| --- | --- |
| `stage:feature` | La pull request vise `dev` depuis une branche autre que `main` : une entrée de contenu (feature, correctif, documentation, CI…). |
| `stage:integration` | La pull request vise `main` depuis `dev` : l'intégration des changements accumulés dans `dev`. |
| `stage:resync` | La pull request vise `dev` depuis `main` : la resynchronisation de `dev` après une fusion vers `main`. |

## Qui applique ces labels

Le workflow `Étiquetage par porte` (`.github/workflows/label-by-gate.yml`)
applique le label à l'ouverture et à la réouverture d'une pull request, selon
la paire de branches `head` → `base` :

- `main` → `dev` donne `stage:resync` ;
- toute autre branche → `dev` donne `stage:feature` ;
- `dev` → `main` donne `stage:integration`.

Toute autre paire de branches ne reçoit aucun label.
