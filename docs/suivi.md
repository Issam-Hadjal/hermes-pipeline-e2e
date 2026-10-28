# Suivi des issues

Le workflow `.github/workflows/suivi.yml` (nom « Suivi des issues ») tient à
jour, dans le corps de chaque issue, un unique bloc délimité par les deux
repères `<!-- suivi:debut -->` et `<!-- suivi:fin -->`. Ce bloc liste les
sous-issues et les pull requests rattachées à l'issue, avec leur état. Tout le
reste du corps n'est jamais touché : c'est l'exigence que juge le relecteur.

Un repère ne compte que seul sur sa ligne et hors d'un bloc de code. Si une
issue contient plusieurs blocs balisés, c'est le dernier — celui de la section
`Suivi` — qui est réécrit.

## Ce que le bloc liste

Le bloc peut contenir deux listes, ou rien :

**Les sous-issues.** Une ligne de compte — `**Sous-issues** : N fermée(s) sur
M` — puis une ligne par sous-issue, triée par numéro :
`- #N <titre> — ouverte|fermée`.

**Les pull requests.** Un titre `**Pull requests**`, puis une ligne par pull
request, triée par numéro : `- #N <genre> « <titre> » — <état>`. Le genre est
`feature`, `intégration` ou `resynchronisation` selon la porte de la pull
request ; l'état est `ouverte`, `brouillon`, `fusionnée dans <branche> le
<date>` ou `fermée sans fusion`.

S'il n'y a ni sous-issue ni pull request, le bloc porte la phrase
`_Aucune sous-issue ni pull request pour l'instant._`.

## Le rattachement d'une pull request à une issue

Le workflow rattache une pull request à une issue de trois façons, selon sa
porte :

| Porte de la pull request | Ce qui la rattache |
| --- | --- |
| feature (vers `dev`) | le numéro `N` porté par sa branche (`<type>/<N>-…`), ou une ligne `Refs #N` de son corps |
| intégration (`dev` → `main`) | chaque ligne `Closes #N` de son corps |
| resynchronisation (`main` → `dev`) | le numéro d'intégration qu'elle cite dans son corps : elle est rattachée aux issues que cette intégration a fermées |

Une feature est donc rattachée à son issue dès sa branche ou son corps ; une
intégration, aux issues qu'elle livre ; une resynchronisation, aux mêmes issues
que l'intégration qu'elle suit, sans qu'on ait à les re-citer.

## Quand le bloc est réécrit

Le workflow se déclenche de quatre façons, et ne réécrit un bloc que si son
contenu a changé — un bloc déjà juste n'est pas réécrit :

1. **Sur un événement d'issue** (ouverture, édition, fermeture, réouverture) :
   l'issue touchée est réécrite, ainsi que sa mère si c'est une sous-issue.
2. **Sur un événement de pull request** (ouverture, édition, réouverture,
   fermeture) : les issues rattachées à cette pull request sont réécrites.
3. **Toutes les heures** (planification `23 * * * *`) : toutes les issues
   ouvertes, plus celles qui ont bougé dans les deux derniers jours — une
   issue fermée à la fusion de son intégration reçoit encore l'état final de
   ses pull requests.
4. **Manuellement** (`workflow_dispatch`).

Le passage horaire existe parce que rattacher une sous-issue ne déclenche
aucun événement : il rattrape les issues que les événements n'ont pas touchées.
Une issue dont le corps ne porte aucun des deux repères n'est pas modifiée.
