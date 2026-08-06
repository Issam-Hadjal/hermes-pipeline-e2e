# Gestes humains d'ouverture d'un projet

Trois gestes ne peuvent pas être automatisés. Ils sont décrits ci-dessous
dans l'ordre où un opérateur humain doit les effectuer pour ouvrir un
nouveau dépôt.

---

## 1. Créer le dépôt sur GitHub, en public

Créer le dépôt sur github.com, en choisissant les options de visibilité
publique, le nom et la description.

**Pourquoi ce geste ne peut pas être automatisé.** Un jeton d'installation
de GitHub App ne peut pas créer de dépôt sur un compte personnel. Il n'est
pas question de droits d'organisation : le compte n'en est pas une.

---

## 2. Installer les quatre GitHub Apps sur ce dépôt

Depuis la page « Settings > GitHub Apps » du dépôt, installer les quatre
apps Hermes nécessaires au fonctionnement du pipeline.

**Pourquoi ce geste ne peut pas être automatisé.** L'installation d'une
GitHub App exige le consentement explicite du propriétaire du compte dans
le navigateur.

---

## 3. Déclarer le dépôt dans l'allowlist des workers du broker

Ajouter le dépôt (au format `owner/nom`) dans la configuration du broker,
dans la liste des dépôts autorisés.

**Pourquoi ce geste ne peut pas être automatisé.** Les fichiers de
configuration vivent sur l'hôte de la VM, hors du conteneur, et le
redémarrage des services exige les droits root. L'agent est de l'autre
côté de la frontière.

---

## Suite : le travail de bot-admin

Une fois ces trois gestes accomplis, le provisionnement du dépôt est
déclenché par une carte adressée à **bot-admin**. Ce worker automatise
tout le reste : configuration des branches protégées, des workflows CI,
des règles de revue, et des paramètres de fusion.
