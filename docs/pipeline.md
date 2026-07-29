# Pipeline multi-agents

Ce document décrit le pipeline de bout en bout : de la demande à la
livraison. Six rôles orchestrent le flux, chacun avec une responsabilité
unique, et chaque porte entre deux branches est soumise à une revue.

## Rôles

- **bot-admin** : provisionne le dépôt, seul à pouvoir écrire les règles de
  protection des branches.
- **bot-orchestrator** : décompose une demande utilisateur en cartes et les
  route vers les bons spécialistes.
- **bot-dev** : implémente la feature et ouvre une pull request vers `dev`.
- **bot-reviewer** : juge la feature contre son issue, approuve ou demande
  des modifications, puis intègre vers `dev`.
- **bot-merger** : juge le cumul des features intégrées, approuve ou
  demande des modifications, fusionne `dev` vers `main` et ferme les
  issues terminées.
- **bot-maintenance** : resynchronise `dev` depuis `main` après chaque
  fusion, en ouvrant une pull request inverse.

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
