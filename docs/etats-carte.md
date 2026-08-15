# Les états d'une carte kanban

Une carte kanban traverse un cycle d'états, de sa création jusqu'à sa clôture.
Les états possibles et leur signification sont donnés ci-dessous ; ils sont
tirés de la configuration du kanban, sans en ajouter ni en retirer.

## Les neuf états

| État | Signification |
| --- | --- |
| `triage` | La carte attend dans la file de triage : un rôle spécialisé la reprend, précise son contenu ou la re-découpe en cartes filles, sans intervention humaine. |
| `todo` | La carte attend ses dépendances : au moins une carte parente n'est pas encore `done`. Elle est promue en `ready` dès que toutes ses parentes sont terminées. |
| `scheduled` | La carte attend une échéance, pas une décision humaine. Elle n'est pas distribuable ; un déclencheur externe (cron, automate, action humaine) la remet en jeu. |
| `ready` | La carte est prête à être distribuée : plus aucune dépendance en attente. Le répartiteur la réclame au prochain passage. |
| `running` | Un worker a réclamé la carte et travaille dessus. |
| `blocked` | La carte est bloquée sur une décision humaine ou sur un mur qu'aucun agent ne peut franchir. Elle ne repart qu'après un déblocage explicite. |
| `review` | Le travail est livré (la pull request est ouverte) : la carte attend la vérification d'un agent de revue, qui fusionne (`done`) ou renvoie au worker (`running`). |
| `done` | La carte est terminée. Ses cartes filles deviennent distribuables à leur tour. |
| `archived` | La carte est clôturée et sortie du tableau : elle n'apparaît plus dans la vue par défaut. |

## Le triage est une file automatique

Le triage n'est pas une attente humaine. Une carte posée en `triage` est
reprise automatiquement par un rôle spécialisé, qui précise son contenu ou la
re-découpe en cartes filles — sans intervention humaine. C'est le point
d'entrée du découpage : une demande trop grosse pour une seule feature y est
déposée, puis transformée en une grappe de cartes liées prêtes à être routées
vers les bons spécialistes.
