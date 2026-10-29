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
- `outils/search-index.mjs` — extrait le texte des guides et construit l'index
  de recherche plein texte.
- `outils/search.js` — la recherche côté navigateur : charge l'index, construit
  un extrait autour du mot trouvé et le met en évidence.
- `outils/recherche.html` — le contenu de la page de recherche (champ de saisie
  et zone de résultats), monté dans le gabarit commun.
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
- **Recherche.** Le menu de chaque page pointe vers la page `site/recherche.html`
  : un champ de saisie interroge, à la frappe et sans autre appel réseau que le
  chargement de l'index, les guides construits ; chaque résultat montre le titre
  du guide lié et un extrait autour du mot trouvé, le mot mis en évidence.

## Construire

```bash
npm run build
```

Le contenu de `site/` est régénéré de zéro à chaque exécution.

Le build produit aussi `site/search-index.json` : un index plein texte qui
associe chaque mot des guides aux pages où il apparaît et à sa position dans le
texte, prêt à être consommé par la page de recherche.

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

## Vérifier les liens

```bash
npm run lint
```

`outils/check-links.mjs` parcourt tous les fichiers Markdown du dépôt et
contrôle chaque lien interne vers un guide `.md` : le fichier cible doit
exister, et l'ancre éventuelle doit correspondre à un titre de ce fichier. Les
liens externes et les cibles non Markdown sont ignorés.

Chaque lien cassé est écrit sur la sortie d'erreur au format
`fichier:ligne : cause`, la cause étant `fichier absent : <cible>` ou
`ancre absente : <cible#ancre>`. Le script termine avec un code de sortie non
nul quand au moins un lien est cassé.

## Quand le mettre à jour

Ce guide change quand la structure du site évolue : une nouvelle convention de
lien, un gabarit différent, une commande de construction renommée. Il n'est pas
nécessaire d'y toucher à chaque ajout de guide, puisque le site les découvre
automatiquement.
