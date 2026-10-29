import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { build, resolveLink, extractTitle } from '../outils/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const docsDir = path.join(root, 'docs');

test('resolveLink : réécrit les liens .md vers .html', () => {
  assert.equal(resolveLink('roles.md'), 'roles.html');
  assert.equal(resolveLink('docs/labels.md'), 'labels.html');
  assert.equal(resolveLink('README.md'), 'index.html');
  assert.equal(resolveLink('roles.md#section'), 'roles.html#section');
});

test('resolveLink : laisse les ancres et les URL externes intactes', () => {
  assert.equal(resolveLink('#ancre'), '#ancre');
  assert.equal(resolveLink('https://example.com/x'), 'https://example.com/x');
  assert.equal(resolveLink('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(resolveLink('fichier.txt'), 'fichier.txt');
});

test('extractTitle : première ligne de titre de niveau 1', () => {
  assert.equal(extractTitle('# Site de documentation\n\nReste.'), 'Site de documentation');
  assert.equal(extractTitle('Pas de titre ici.'), null);
});

test('build : crée index.html et une page par guide', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  const { pages } = build({ root, outDir });

  const guides = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  assert.equal(pages.length, guides.length + 1, 'index + une page par guide');
  assert.ok(pages.includes('index.html'));
  assert.ok(existsSync(path.join(outDir, 'index.html')));
  assert.ok(existsSync(path.join(outDir, 'style.css')));

  for (const g of guides) {
    assert.ok(existsSync(path.join(outDir, g.replace(/\.md$/, '.html'))), `page de ${g}`);
  }
});

test('build : la page d’accueil contient README puis la liste des guides', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  build({ root, outDir });
  const index = readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(index, /<h1 id="hermes-pipeline-e2e">hermes-pipeline-e2e<\/h1>/);
  assert.match(index, /<h2>Guides<\/h2>/);
  assert.ok(index.indexOf('hermes-pipeline-e2e') < index.indexOf('<h2>Guides</h2>'));
});

test('build : les liens internes .md mènent aux pages HTML', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  build({ root, outDir });
  const botDev = readFileSync(path.join(outDir, 'bot-dev.html'), 'utf8');
  const index = readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.match(botDev, /href="roles\.html"/);
  assert.match(index, /href="labels\.html"/);
});

test('build : le menu liste tous les guides et met en évidence le guide courant', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  build({ root, outDir });
  const botDev = readFileSync(path.join(outDir, 'bot-dev.html'), 'utf8');

  const guides = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  const titles = guides.map((f) => {
    const md = readFileSync(path.join(docsDir, f), 'utf8');
    const m = md.match(/^#\s+(.+?)\s*$/m);
    return m ? m[1].trim() : f;
  });

  for (const t of titles) {
    assert.ok(botDev.includes(t), `le menu mentionne « ${t} »`);
  }
  assert.match(botDev, /<a href="bot-dev\.html" class="courant" aria-current="page">/);
});

test('build : les séquences $ de remplacement sont insérées à l’identique', () => {
  // Un guide dont le bloc de code contient les séquences spéciales de
  // String.prototype.replace. Avant la correction, `$'` recopiait le reste du
  // gabarit au milieu du contenu, `$&` la cible de la substitution, `$$` un
  // simple `$` : la page générée était cassée.
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'site-echap-'));
  mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  mkdirSync(path.join(tmp, 'outils'), { recursive: true });
  writeFileSync(path.join(tmp, 'README.md'), '# Accueil\n');
  copyFileSync(path.join(root, 'outils', 'gabarit.html'), path.join(tmp, 'outils', 'gabarit.html'));
  copyFileSync(path.join(root, 'outils', 'style.css'), path.join(tmp, 'outils', 'style.css'));
  writeFileSync(
    path.join(tmp, 'docs', 'guide.md'),
    ['# Guide', '', '```sh', "echo $'apostrophe'", 'echo $&', 'echo $$', '```', ''].join('\n'),
  );

  build({ root: tmp, outDir: path.join(tmp, 'site') });
  const html = readFileSync(path.join(tmp, 'site', 'guide.html'), 'utf8');
  const code = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/)?.[1];

  assert.ok(code, 'bloc de code présent dans la page générée');
  assert.ok(code.includes("$'"), "la séquence $' est recopiée telle quelle");
  // Le convertisseur Markdown échappe `&` en `&amp;` (comportement attendu) ; la
  // séquence `$&` doit rester intacte et ne pas être remplacée par `{{CONTENU}}`.
  assert.ok(code.includes('$&amp;'), 'la séquence $& est recopiée (le & échappé)');
  assert.ok(code.includes('$$'), 'la séquence $$ est recopiée telle quelle');
  // La page ne doit pas être cassée : une seule fermeture de <main>.
  assert.equal((html.match(/<\/main>/g) || []).length, 1, 'une seule fermeture de <main>');
});

test('acceptation : aucune dépendance npm déclarée', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

test('acceptation : site/ figure dans .gitignore', () => {
  const gi = readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gi, /^site\/$/m);
});
