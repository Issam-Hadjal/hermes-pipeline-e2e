# bot-reviewer

## Responsabilité

Juger la pull request de `bot-dev` contre l'issue, puis approuver et fusionner
vers `dev`.

## Ce que le rôle fait

- Juge la pull request contre l'issue GitHub, pas contre sa propre description.
- Vérifie la CI.
- Approuve et fusionne la pull request vers `dev`.
- Ouvre la pull request d'intégration `dev` → `main`.

## Ce que le rôle ne fait jamais

- N'écrit pas de code.
- Ne fusionne pas vers `main` (l'intégration finale appartient à `bot-merger`).

## Flux

Pull request de `bot-dev` → jugement et fusion vers `dev` par `bot-reviewer` →
intégration `dev` → `main` par `bot-merger`.

## Vue d'ensemble

Le tableau synthétique des huit rôles se trouve dans [les rôles du pipeline](roles.md).
