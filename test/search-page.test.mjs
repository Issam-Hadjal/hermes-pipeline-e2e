import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { extrait, renduExtrait } from '../outils/search.js';
import { build } from '../outils/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const docsDir = path.join(root, 'docs');

test('extrait : quelques mots avant et après, le mot mis en évidence', () => {
  const texte = 'Le rôle de bot-dev est de coder et de relire les pull requests du pipeline.';
  const mot = 'coder';
  const position = texte.indexOf(mot);
  const ex = extrait(texte, position, mot.length);

  assert.equal(ex.mot, 'coder', 'le mot extrait est la sous-chaîne exacte');
  assert.match(ex.avant, /rôle/, 'des mots précèdent le mot');
  assert.match(ex.apres, /pull requests/, 'des mots suivent le mot');

  const html = renduExtrait(ex);
  assert.match(html, /<mark>coder<\/mark>/, 'le mot est mis en évidence');
  assert.ok(html.indexOf('<mark>') > 0, 'du contexte précède la mise en évidence');
});

test('extrait : ne déborde pas en début ni en fin de texte', () => {
  const texte = 'recherche plein texte';
  const debut = extrait(texte, 0, 'recherche'.length, { avant: 4, apres: 4 });
  assert.equal(debut.avant, '', 'rien avant le premier mot');
  assert.match(debut.apres, /plein texte/, 'les mots suivants sont présents');

  const fin = extrait(texte, texte.indexOf('texte'), 'texte'.length, { avant: 4, apres: 4 });
  assert.equal(fin.apres, '', 'rien après le dernier mot');
  assert.match(fin.avant, /recherche plein/, 'les mots précédents sont présents');
});

test('renduExtrait : échappe le HTML présent dans le contexte', () => {
  const texte = 'une <balise> puis le mot cherché après';
  const position = texte.indexOf('cherché');
  const html = renduExtrait(extrait(texte, position, 'cherché'.length));
  assert.ok(html.includes('&lt;balise&gt;'), 'le contexte est échappé');
  assert.match(html, /<mark>cherché<\/mark>/, 'le mot est mis en évidence');
});

test('build : produit la page de recherche et recopie le module', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-recherche-'));
  build({ root, outDir });

  const page = readFileSync(path.join(outDir, 'recherche.html'), 'utf8');
  assert.match(page, /<input[^>]*type="search"/, 'la page contient un champ de saisie');
  assert.match(page, /<script type="module" src="search\.js">/, 'la page charge le module de recherche');
  assert.ok(existsSync(path.join(outDir, 'search.js')), 'le module search.js est recopié dans site/');

  // Le menu de la page de recherche met en évidence le lien Recherche.
  assert.match(page, /<a href="recherche\.html" class="courant" aria-current="page">Recherche<\/a>/);
});

test('build : le menu de chaque guide pointe vers la recherche', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-recherche-'));
  build({ root, outDir });

  const guides = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  assert.ok(guides.length >= 1, 'au moins un guide existe');
  for (const g of guides) {
    const html = readFileSync(path.join(outDir, g.replace(/\.md$/, '.html')), 'utf8');
    assert.match(html, /<a href="recherche\.html"[^>]*>Recherche<\/a>/, `le menu de ${g} pointe vers la recherche`);
  }
});
