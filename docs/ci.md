# Intégration continue

Le workflow `.github/workflows/ci.yml` s'exécute sur chaque pull request
visant `main` ou `dev`, et sur chaque push vers `dev`. Il est composé de deux
couches : un **socle** de vérifications globales, puis une **couche projet**
qui exécute les scripts du dépôt quand ils existent.

Le socle met la CI en échec dès qu'il trouve un marqueur de conflit non
résolu ou le marqueur de blocage explicite. La couche projet, elle, tolère
l'absence : ses étapes sont ignorées quand le script attendu n'existe pas,
sans mettre la CI en échec.

## La couche projet

Quatre étapes exécutent les scripts du projet. Chacune **tolère l'absence du
script qui lui correspond** : sans ce script, l'étape est ignorée — elle ne met
pas la CI en échec. Un dépôt sans `package.json`, ou qui n'a pas défini tel
script, reste donc au vert.

| Étape | Script attendu | En l'absence du script |
| --- | --- | --- |
| `Projet — Installation (npm)` | `package.json` | Étape ignorée — « Aucun package.json : rien à installer. » |
| `Projet — Build` | `build` (dans `package.json`) | Étape ignorée — « Pas de script build (ou pas de package.json) : rien à construire. » |
| `Projet — Tests` | `test` (dans `package.json`) | Étape ignorée — « Pas de script test (ou pas de package.json) : rien à tester. » |
| `Projet — Lint` | `lint` (dans `package.json`) | Étape ignorée — « Pas de script lint (ou pas de package.json) : rien à vérifier. » |

### Détail des quatre étapes

**Installation (npm).** Si `package.json` existe, l'étape installe les
dépendances : `npm ci` quand `package-lock.json` est présent, sinon
`npm install`. Sans `package.json`, elle ne fait rien.

**Build.** Si `package.json` définit un script `build`, l'étape lance
`npm run build`. Sinon, elle ne fait rien.

**Tests.** Si `package.json` définit un script `test`, l'étape lance
`npm test`. Sinon, elle ne fait rien.

**Lint.** Si `package.json` définit un script `lint`, l'étape lance
`npm run lint`. Sinon, elle ne fait rien.

La présence du script est vérifiée avec `jq` : l'étape teste la clé
`.scripts.<nom>` de `package.json`. C'est ce test, et non le résultat du
script, qui décide d'ignorer l'étape. Un script **présent mais qui échoue**
fait bien échouer la CI ; c'est seulement l'absence du script qui est tolérée.

## Version de Node

La CI épingle la version de Node.js à **24**. L'épinglage est fait par l'action
`actions/setup-node@v4` dans `.github/workflows/ci.yml`, à l'étape
`Projet — Version de Node épinglée` :

```yaml
      - name: Projet — Version de Node épinglée
        uses: actions/setup-node@v4
        with:
          node-version: '24'
```

La valeur est écrite littéralement (`node-version: '24'`), sans plage ni alias
(`latest`, `lts/*`) : la version est donc exactement la même d'une exécution à
l'autre.

**Pourquoi une version fixe.** Épingler une version précise rend la CI
reproductible : les scripts du projet (`npm install`, `npm test`, …) tournent
avec la même version de Node en local et en CI, ce qui évite la dérive de
version et les différences de comportement dues au runtime.
