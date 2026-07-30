# Gestes humains d'ouverture d'un projet

Trois gestes ne peuvent pas être automatisés. Ils sont décrits ci-dessous
dans l'ordre où un opérateur humain doit les effectuer pour ouvrir un
nouveau dépôt.

---

## 1. Créer le dépôt sur GitHub, en public

Créer le dépôt sur github.com, en choisissant les options de visibilité
publique, le nom et la description.

**Pourquoi ce geste ne peut pas être automatisé.** La création d'un dépôt
nécessite un token avec des droits d'administration sur l'organisation, ou
une session GitHub.com authentifiée. Le broker ne possède pas ces droits, et
aucun worker ne détient de token — c'est une règle de sécurité
infrastructurelle.

---

## 2. Installer les quatre GitHub Apps sur ce dépôt

Depuis la page « Settings > GitHub Apps » du dépôt, installer les quatre
apps Hermes nécessaires au fonctionnement du pipeline.

**Pourquoi ce geste ne peut pas être automatisé.** L'installation d'une
GitHub App sur un dépôt est une action administrateur qui se fait depuis
l'interface GitHub. Il n'existe pas d'API publique permettant à un worker de
le faire à la place d'un humain.

---

## 3. Déclarer le dépôt dans l'allowlist des workers du broker

Ajouter le dépôt (au format `owner/nom`) dans la configuration du broker,
dans la liste des dépôts autorisés. C'est le fichier
`/opt/data/profiles/bot-dev/gateways/github/broker.yaml` ou l'équivalent
selon l'installation.

**Pourquoi ce geste ne peut pas être automatisé.** Le broker fait partie de
l'infrastructure Hermes. Un worker automatisé ne peut pas modifier sa propre
configuration d'accès sans créer un escalade de privilèges. Seul un humain
ayant accès au serveur ou au fichier de configuration peut effectuer cette
modification.

---

## Suite : le travail de bot-admin

Une fois ces trois gestes accomplis, le provisionnement du dépôt est
déclenché par une carte adressée à **bot-admin**. Ce worker automatise
tout le reste : configuration des branches protégées, des workflows CI,
des règles de revue, et des paramètres de fusion.
