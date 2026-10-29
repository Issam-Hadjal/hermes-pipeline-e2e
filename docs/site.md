# Site de documentation

Un site statique est généré à partir de `README.md` et des guides de `docs/`.
Il est produit par `npm run build`, sans aucune dépendance externe : le
convertisseur Markdown et le gabarit sont écrits à la main dans `outils/`.

## Pourquoi

La documentation vit en Markdown dans le dépôt, là où chaque changement est
relu par la pull request qui le porte. Le site offre la même documentation en
HTML, plus lisible et navigable : un menu latéral liste les guides, les titres
portent des ancres, et les liens internes mènent aux bonnes pages.

## Structure

- `outils/markdown.mjs` — conversion Markdown → HTML (titres, listes imbriquées,
  code, gras, italique, liens, tableaux).
- `outils/build.mjs` — lit `README.md` et `docs/*.md`, assemble les pages.
- `outils/gabarit.html` — le squelette commun (en-tête, menu, contenu).
- `outils/style.css` — la feuille de style, copiée telle quelle dans `site/`.
- `site/` — le résultat. Non versionné : il figure dans `.gitignore`.

## Conventions du site

- **Hiérarchie aplatie.** Chaque guide `docs/foo.md` devient `site/foo.html`, à
  la racine de `site/` ; `README.md` devient `site/index.html`.
- **Liens internes.** Un lien vers un guide `.md` est réécrit vers sa page HTML
  (`[guide](bot-dev.md)` → `[guide](bot-dev.html)`). Les liens externes et les
  ancres sont laissés tels quels.
- **Ancres de titres.** Chaque titre reçoit un `id` calculé comme sur GitHub
  (minuscules, espaces remplacés par des tirets, ponctuation retirée). Deux
  titres identiques reçoivent un suffixe `-1`, `-2`, etc.
- **Sommaire.** Chaque guide qui porte des titres de niveau 2 ou 3 affiche en
  haut de sa page une table des matières : ces titres y sont listés dans
  l'ordre, chacun lié à son ancre, les niveaux 3 indentés. Un guide sans titre
  de niveau 2 ni 3 n'a pas de sommaire, et la page d'accueil non plus.
- **Page d'accueil.** `index.html` affiche le contenu de `README.md`, suivi de
  la liste des guides.

## Construire

```bash
npm run build
```

Le contenu de `site/` est régénéré de zéro à chaque exécution.

## Prévisualiser en local

Une fois le site construit, ouvrez `site/index.html` directement dans un
navigateur (double-clic, ou `xdg-open site/index.html` sous Linux, `open
site/index.html` sous macOS). Les liens et la feuille de style étant relatifs,
tout fonctionne sans serveur.

Pour une prévisualisation plus fidèle, servez le dossier avec un serveur
statique ponctuel, puis ouvrez l'adresse indiquée :

```bash
python3 -m http.server --directory site
```

C'est un simple outil de lecture, pas une dépendance du dépôt : le site généré
reste un ensemble de fichiers statiques que l'on peut servir avec n'importe
quel serveur de fichiers.

## Tester

```bash
npm test
```

Les tests de `test/` couvrent le convertisseur Markdown et le montage du site
(liens réécrits, pages présentes, ancres).

## Quand le mettre à jour

Ce guide change quand la structure du site évolue : une nouvelle convention de
lien, un gabarit différent, une commande de construction renommée. Il n'est pas
nécessaire d'y toucher à chaque ajout de guide, puisque le site les découvre
automatiquement.
