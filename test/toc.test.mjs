import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { build } from '../outils/build.mjs';
import { headings } from '../outils/markdown.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// Construit un site de test dans un dossier temporaire : README.md plus les
// guides passés (nom -> contenu Markdown), en recopiant le gabarit et la feuille
// de style réels, puis renvoie le chemin du dossier (le site est dans site/).
function siteDeFacon(guides, readme = '# Accueil\n') {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'site-toc-'));
  mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  mkdirSync(path.join(tmp, 'outils'), { recursive: true });
  writeFileSync(path.join(tmp, 'README.md'), readme);
  copyFileSync(path.join(root, 'outils', 'gabarit.html'), path.join(tmp, 'outils', 'gabarit.html'));
  copyFileSync(path.join(root, 'outils', 'style.css'), path.join(tmp, 'outils', 'style.css'));
  for (const [name, md] of Object.entries(guides)) {
    writeFileSync(path.join(tmp, 'docs', name), md);
  }
  build({ root: tmp, outDir: path.join(tmp, 'site') });
  return tmp;
}

function sommaireDe(html) {
  const m = html.match(/<nav class="sommaire"[\s\S]*?<\/nav>/);
  return m ? m[0] : null;
}

test('un guide avec des titres de niveaux 2 et 3 produit un sommaire ordonné avec les bonnes ancres', () => {
  const md = [
    '# Mon guide',
    '',
    '## Première section',
    '',
    '### Sous-section',
    '',
    '## Deuxième section',
    '',
    '## Première section',
    '',
  ].join('\n');
  const tmp = siteDeFacon({ 'guide.md': md });
  const html = readFileSync(path.join(tmp, 'site', 'guide.html'), 'utf8');
  const sommaire = sommaireDe(html);

  assert.ok(sommaire, 'le sommaire est présent dans la page');

  // Les quatre titres de niveau 2 et 3 figurent, dans l'ordre du guide.
  const labels = [...sommaire.matchAll(/<li(?: class="niveau-3")?><a href="#[^"]+">([^<]+)<\/a><\/li>/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['Première section', 'Sous-section', 'Deuxième section', 'Première section']);

  // Les ancres suivent l'algorithme de GitHub, doublons suffixés compris.
  assert.match(sommaire, /href="#première-section"/);
  assert.match(sommaire, /href="#sous-section"/);
  assert.match(sommaire, /href="#deuxième-section"/);
  assert.match(sommaire, /href="#première-section-1"/);

  // Les niveaux 3 sont visuellement distingués des niveaux 2.
  assert.match(sommaire, /<li class="niveau-3"><a href="#sous-section">Sous-section<\/a><\/li>/);

  // Chaque ancre du sommaire correspond à un titre réellement rendu dans la page.
  const ids = [...html.matchAll(/<h[1-6] id="([^"]+)">/g)].map((m) => m[1]);
  for (const href of [...sommaire.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])) {
    assert.ok(ids.includes(href), `l'ancre #${href} du sommaire existe dans la page`);
  }

  // Le sommaire est inséré en haut de la page, avant le premier titre.
  assert.ok(html.indexOf('<nav class="sommaire"') < html.indexOf('<h1 id='));
});

test('un guide sans titre de niveau 2 ni 3 n’a pas de sommaire', () => {
  const md = '# Mon guide\n\nUn paragraphe, sans titre intermédiaire.\n';
  const tmp = siteDeFacon({ 'guide.md': md });
  const html = readFileSync(path.join(tmp, 'site', 'guide.html'), 'utf8');
  assert.equal(sommaireDe(html), null);
});

test('les titres de niveau 1 et 4+ ne sont pas listés dans le sommaire', () => {
  const md = [
    '# Mon guide',
    '',
    '## Seule section de niveau 2',
    '',
    '#### Sous-titre de niveau 4 ignoré',
    '',
  ].join('\n');
  const tmp = siteDeFacon({ 'guide.md': md });
  const html = readFileSync(path.join(tmp, 'site', 'guide.html'), 'utf8');
  const sommaire = sommaireDe(html);

  assert.ok(sommaire, 'le sommaire est présent (un titre de niveau 2 existe)');
  assert.ok(!sommaire.includes('Mon guide'), 'le titre de niveau 1 n’est pas listé');
  assert.ok(!sommaire.includes('Sous-titre de niveau 4'), 'le titre de niveau 4 n’est pas listé');
  assert.match(sommaire, /Seule section de niveau 2/);
});

test('un titre à l’intérieur d’un bloc de code n’est pas listé', () => {
  const md = ['# Mon guide', '', '## Vraie section', '', '```', '## Pas un titre', '```', ''].join('\n');
  const tmp = siteDeFacon({ 'guide.md': md });
  const html = readFileSync(path.join(tmp, 'site', 'guide.html'), 'utf8');
  const sommaire = sommaireDe(html);

  assert.ok(sommaire, 'le sommaire est présent');
  assert.match(sommaire, /Vraie section/);
  assert.ok(!sommaire.includes('Pas un titre'), 'le titre dans le bloc de code est ignoré');
});

test('la page d’accueil (README) n’a pas de sommaire, même avec des titres', () => {
  const readme = '# Accueil\n\n## Une section du README\n\nDu contenu.\n';
  const tmp = siteDeFacon({}, readme);
  const index = readFileSync(path.join(tmp, 'site', 'index.html'), 'utf8');
  assert.equal(sommaireDe(index), null);
});

test('headings : renvoie les niveaux et ancres dans l’ordre, tous niveaux comptés', () => {
  const h = headings('# Un\n\n## Deux\n\n## Deux\n\n### Trois\n');
  assert.deepEqual(h, [
    { level: 1, text: 'Un', anchor: 'un' },
    { level: 2, text: 'Deux', anchor: 'deux' },
    { level: 2, text: 'Deux', anchor: 'deux-1' },
    { level: 3, text: 'Trois', anchor: 'trois' },
  ]);
});
