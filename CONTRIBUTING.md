# Contribuer

Ce dépôt fait partie d'un pipeline multi-agents. Chaque modification transite par une branche de fonctionnalité et une pull request vers `dev`.

## Processus

1. Créer une branche depuis `dev`
2. Ouvrir une Pull Request vers `dev`
3. Un pair examine et approuve la PR
4. Fusionner par merge commit (ou squash pour les features)
5. La branche source est supprimée automatiquement

## Règles

- Les pushes directs sur `main` et `dev` sont interdits
- Toute PR nécessite au moins une approbation
- Le dernier auteur du push ne peut pas être l'approbateur
- Le workflow CI doit passer avant fusion
