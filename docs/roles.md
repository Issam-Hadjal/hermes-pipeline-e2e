# Les rôles du pipeline

Le pipeline s'appuie sur huit rôles, chacun avec une responsabilité unique.
Le tableau ci-dessous liste, pour chaque rôle, ce qu'il fait et ce qu'il ne
peut pas faire.

| Nom | Ce qu'il fait | Ce qu'il ne peut pas faire |
| --- | --- | --- |
| `bot-orchestrator` | Décompose une demande utilisateur en cartes et les route vers les bons spécialistes ; décide le découpage. | N'a aucun accès GitHub — ne peut pas écrire d'issue lui-même. Privé de terminal, de fichiers et d'exécution de code. |
| `lego-bot` | Point d'entrée conversationnel : transforme une demande en langage naturel en une carte destinée à `bot-orchestrator`. | Ne fait rien d'autre — ne décompose pas la demande, ne route pas les tâches, n'a aucun accès GitHub. |
| `bot-scribe` | Transcrit le découpage de l'orchestrateur en issues GitHub (issue parente, puis filles, puis rattachement) et rapporte les numéros obtenus. | Ne juge pas le découpage. N'écrit pas de code, n'ouvre pas de pull request, ne relit pas, ne fusionne pas, ne ferme pas d'issue. |
| [`bot-dev`](bot-dev.md) | Implémente la feature et ouvre une pull request vers `dev`. | Ne doit jamais écrire l'issue qu'il implémentera. |
| [`bot-reviewer`](bot-reviewer.md) | Juge la feature contre son issue, approuve ou demande des modifications, fusionne vers `dev` (squash), puis ouvre la pull request d'intégration `dev` → `main`. | Ne juge pas contre la description de pull request mais contre l'issue. Ne fusionne pas vers `main` et ne ferme pas d'issue — c'est le `bot-merger`. |
| `bot-merger` | Juge le cumul des features intégrées, approuve ou demande des modifications, fusionne `dev` vers `main` (merge), ferme les issues terminées et ouvre la pull request de resync `main` → `dev`. | Ne juge pas chaque feature individuellement — c'est le `bot-reviewer`. N'approuve pas et ne fusionne pas le resync — c'est le `bot-maintenance`. |
| `bot-admin` | Provisionne le dépôt — branches protégées, workflows CI, règles de revue, paramètres de fusion. Seul à pouvoir écrire les règles de protection des branches. | N'intervient jamais dans un cycle de feature ; il est déclenché par un humain, jamais par le pipeline. Ne crée pas le dépôt, n'installe pas les Apps, ne déclare pas le dépôt dans l'allowlist — ces trois gestes restent humains. |
| `bot-maintenance` | Resynchronise `dev` depuis `main` en ouvrant une pull request inverse, puis approuve et fusionne le resync (merge). | Ne pourra jamais approuver une pull request ouverte par le provisionneur — elle tourne sur l'identité du provisionneur, et GitHub y voit le même acteur. |

## Réglages par rôle

Chaque rôle tourne avec un modèle et un effort de raisonnement propres, fixés
dans sa configuration. Le tableau ci-dessous les récapitule.

| Nom | Modèle | Effort de raisonnement |
| --- | --- | --- |
| `bot-orchestrator` | `deepseek-v4-pro` | high |
| `bot-scribe` | `deepseek-v4-flash` | low |
| `bot-dev` | `deepseek-v4-pro` | high |
| `bot-reviewer` | `deepseek-v4-pro` | high |
| `bot-merger` | `deepseek-v4-pro` | medium |
| `bot-admin` | `deepseek-v4-pro` | high |
| `bot-maintenance` | `deepseek-v4-flash` | minimal |
