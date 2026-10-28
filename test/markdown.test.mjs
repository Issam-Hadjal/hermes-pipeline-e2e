import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, slugify } from '../outils/markdown.mjs';

test('slugify : minuscules, ponctuation retirée, espaces en tirets', () => {
  assert.equal(slugify('Un Titre Simple'), 'un-titre-simple');
  assert.equal(slugify('États d’une carte'), 'états-dune-carte');
  assert.equal(slugify('Avec (parenthèses) & symboles !'), 'avec-parenthèses-symboles');
});

test('titres : balises h1-h6 avec ancre calculée comme sur GitHub', () => {
  assert.match(render('# Bonjour'), /<h1 id="bonjour">Bonjour<\/h1>/);
  assert.match(render('## Deux mots'), /<h2 id="deux-mots">Deux mots<\/h2>/);
  assert.match(render('###### Niveau six'), /<h6 id="niveau-six">Niveau six<\/h6>/);
});

test('titres : le code en ligne est retiré de l’ancre', () => {
  const html = render('# La commande `npm run build`');
  assert.match(html, /id="la-commande-npm-run-build"/);
  assert.match(html, /<h1[^>]*>La commande <code>npm run build<\/code><\/h1>/);
});

test('titres : deux titres identiques reçoivent un suffixe', () => {
  const html = render('# Aide\n\n# Aide');
  assert.match(html, /id="aide"/);
  assert.match(html, /id="aide-1"/);
});

test('paragraphes : les lignes consécutives sont jointes', () => {
  const html = render('Première ligne\nseconde ligne.\n\nAutre paragraphe.');
  assert.match(html, /<p>Première ligne seconde ligne\.<\/p>/);
  assert.match(html, /<p>Autre paragraphe\.<\/p>/);
});

test('paragraphes : le HTML brut est échappé', () => {
  const html = render('Du <script>alert(1)</script> et un & un <.');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&amp;/);
});

test('listes à puces', () => {
  const html = render('- premier\n- second\n- troisième');
  assert.match(html, /<ul>\n<li>premier<\/li>\n<li>second<\/li>\n<li>troisième<\/li>\n<\/ul>/);
});

test('listes numérotées', () => {
  const html = render('1. un\n2. deux\n3. trois');
  assert.match(html, /<ol>\n<li>un<\/li>\n<li>deux<\/li>\n<li>trois<\/li>\n<\/ol>/);
});

test('listes : la continuation d’un élément est rattachée au même élément', () => {
  const html = render('- premier élément\n  qui continue sur deux lignes\n- second');
  assert.match(html, /<li>premier élément qui continue sur deux lignes<\/li>/);
});

test('listes imbriquées : puces dans puces', () => {
  const html = render('- item\n  - sous\n  - sous 2\n- item 2');
  assert.match(html, /<li>item\n<ul>\n<li>sous<\/li>\n<li>sous 2<\/li>\n<\/ul><\/li>/);
  assert.match(html, /<li>item 2<\/li>/);
});

test('listes imbriquées : numérotée dans numérotée', () => {
  const html = render('1. a\n   1. a1\n   2. a2\n2. b');
  assert.match(html, /<li>a\n<ol>\n<li>a1<\/li>\n<li>a2<\/li>\n<\/ol><\/li>/);
  assert.match(html, /<li>b<\/li>/);
});

test('listes imbriquées : puces dans numérotée', () => {
  const html = render('1. a\n   - p1\n   - p2\n2. b');
  assert.match(html, /<li>a\n<ul>\n<li>p1<\/li>\n<li>p2<\/li>\n<\/ul><\/li>/);
});

test('blocs de code : langue reportée et contenu échappé', () => {
  const html = render('```js\nconst x = "<tag>";\n```');
  assert.match(html, /<pre><code class="language-js">const x = "&lt;tag&gt;";<\/code><\/pre>/);
});

test('blocs de code : sans langue', () => {
  const html = render('```\nplain text\n```');
  assert.match(html, /<pre><code>plain text<\/code><\/pre>/);
});

test('code en ligne : échappé et insensible au gras', () => {
  const html = render('Utilisez `x < y` et `**pas gras**`.');
  assert.match(html, /<code>x &lt; y<\/code>/);
  assert.match(html, /<code>\*\*pas gras\*\*<\/code>/);
});

test('gras', () => {
  const html = render('Un **mot important** ici.');
  assert.match(html, /Un <strong>mot important<\/strong> ici\./);
});

test('italique : astérisque et souligné', () => {
  assert.match(render('Un *mot* en italique.'), /Un <em>mot<\/em> en italique\./);
  assert.match(render('Un _mot_ en italique.'), /Un <em>mot<\/em> en italique\./);
});

test('italique : les identifiants à soulignés ne sont pas altérés', () => {
  const html = render('Le réglage `delete_branch_on_merge` reste intact.');
  assert.match(html, /<code>delete_branch_on_merge<\/code>/);
});

test('liens : href et libellé', () => {
  const html = render('Voir [le guide](roles.md).');
  assert.match(html, /<a href="roles\.md">le guide<\/a>/);
});

test('liens : titre optionnel et libellé en gras', () => {
  const html = render('[**gras**](url "un titre")');
  assert.match(html, /<a href="url" title="un titre"><strong>gras<\/strong><\/a>/);
});

test('liens : un code en ligne dans le libellé', () => {
  const html = render('Voir [`docs/labels.md`](docs/labels.md).');
  assert.match(html, /<a href="docs\/labels\.md"><code>docs\/labels\.md<\/code><\/a>/);
});

test('liens : la fonction linkTarget réécrit la cible', () => {
  const html = render('[guide](bot-dev.md)', { linkTarget: (h) => h.replace(/\.md$/, '.html') });
  assert.match(html, /<a href="bot-dev\.html">guide<\/a>/);
});

test('tableaux : en-tête et corps', () => {
  const html = render('| Colonne | Valeur |\n| --- | --- |\n| a | **1** |\n| b | `x` |');
  assert.match(html, /<table>/);
  assert.match(html, /<thead>\n<tr><th>Colonne<\/th><th>Valeur<\/th><\/tr>\n<\/thead>/);
  assert.match(html, /<tbody>\n<tr><td>a<\/td><td><strong>1<\/strong><\/td><\/tr>\n<tr><td>b<\/td><td><code>x<\/code><\/td><\/tr>\n<\/tbody>/);
});

test('règle horizontale', () => {
  const html = render('avant\n\n---\n\naprès');
  assert.match(html, /<hr>/);
});

test('ligne vide : pas de paragraphe vide', () => {
  const html = render('a\n\n\nb');
  assert.equal((html.match(/<p>/g) || []).length, 2);
});
