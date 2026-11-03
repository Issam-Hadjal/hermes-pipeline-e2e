# Gestes humains d'ouverture d'un projet

Plusieurs gestes ne peuvent pas être automatisés. Ils sont décrits ci-dessous
dans l'ordre où un opérateur humain doit les effectuer pour ouvrir un nouveau
dépôt, puis le déployer.

---

## 1. Créer le dépôt sur GitHub, en public

Créer le dépôt sur github.com, en choisissant les options de visibilité
publique, le nom et la description, sans cocher « Add a README file » : le
dépôt reste vide, son premier commit viendra du premier push humain.

**Pourquoi ce geste ne peut pas être automatisé.** Un jeton d'installation
de GitHub App ne peut pas créer de dépôt sur un compte personnel. Il n'est
pas question de droits d'organisation : le compte n'en est pas une.

---

## 2. Faire le premier push : le squelette et son AGENTS.md

Cloner le dépôt vide, y poser le squelette du projet accompagné de son
`AGENTS.md`, puis pousser sur `main`. Ce premier push crée la branche par
défaut et donne à bot-admin la base qu'il provisionnera.

**Pourquoi ce geste ne peut pas être automatisé.** Le squelette et
l'`AGENTS.md` décrivent le projet et sa gouvernance ; ils sont rédigés par
l'humain, avant qu'aucun agent n'intervienne.

---

## 3. Installer les cinq GitHub Apps sur ce dépôt

Depuis la page « Settings > GitHub Apps » du dépôt, installer les cinq
apps Hermes nécessaires au fonctionnement du pipeline.

**Pourquoi ce geste ne peut pas être automatisé.** L'installation d'une
GitHub App exige le consentement explicite du propriétaire du compte dans
le navigateur.

---

## 4. Déclarer le dépôt dans l'allowlist des workers du broker

Ajouter le dépôt (au format `owner/nom`) dans la configuration du broker,
dans la liste des dépôts autorisés.

**Pourquoi ce geste ne peut pas être automatisé.** Les fichiers de
configuration vivent sur l'hôte de la VM, hors du conteneur, et le
redémarrage des services exige les droits root. L'agent est de l'autre
côté de la frontière.

---

## 5. Régler la branche production chez l'hébergeur

Pour un projet déployé, régler chez l'hébergeur la branche à déployer :
`production`. L'hébergeur déploie alors cette branche.

**Pourquoi ce geste ne peut pas être automatisé.** Le réglage de la branche
à déployer vit dans le compte de l'hébergeur, hors de portée des agents du
pipeline.

---

## 6. Faire avancer production

Seul l'humain fait avancer la branche `production`, en fusionnant `main`
dans `production` par un commit de fusion. Déployer n'est jamais une carte.

**Pourquoi ce geste ne peut pas être automatisé.** Publier en production est
une décision humaine ; le déploiement n'est jamais confié à une carte.

---

## Suite : le travail de bot-admin

Une fois ces gestes accomplis, le provisionnement du dépôt est
déclenché par une carte adressée à **bot-admin**. Ce worker automatise
tout le reste : configuration des branches protégées, des workflows CI,
des règles de revue, et des paramètres de fusion.
