# hermes-pipeline-e2e

Dépôt de bout en bout pour le pipeline multi-agents Hermes.

## Rôles

Le pipeline s'appuie sur huit rôles, chacun avec une responsabilité unique :

1. `bot-orchestrator` — Décompose une demande en tâches et route chacune vers le rôle spécialiste qui en est propriétaire.
2. `lego-bot` — Point d'entrée conversationnel : transforme une demande en langage naturel en une carte destinée à `bot-orchestrator`, et rien d'autre.
3. `bot-scribe` — Matérialise les demandes en issues GitHub rédigées et prêtes à être travaillées.
4. `bot-dev` — Implémente l'issue, puis ouvre la pull request contre `dev`.
5. `bot-reviewer` — Juge la pull request fonctionnelle contre son issue, vérifie la CI, puis approuve et fusionne dans `dev`.
6. `bot-merger` — Intègre `dev` dans `main` et clôt les issues livrées.
7. `bot-maintenance` — Approuve et fusionne la pull request de resynchronisation `main`→`dev` qui clôt un cycle.
8. `bot-admin` — Provisionne le dépôt et ses protections, déclenché uniquement par un humain.

## Branches

- `main` — version stable
- `dev` — intégration continue

## Labels

- `type:resync` — resynchronisation de `dev` depuis `main`
- `type:integration` — intégration de `dev` vers `main`

## CI

Le workflow CI s'exécute sur chaque pull request et chaque push sur `dev`.
