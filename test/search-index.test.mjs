import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { plainText, tokenize, buildIndex } from '../outils/search-index.mjs';
import { build } from '../outils/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

test('tokenize : mots en minuscules, sans ponctuation, avec leur position', () => {
  const tokens = tokenize('Le rôle, Bot-Dev.');
  assert.deepEqual(
    tokens.map((t) => t.word),
    ['le', 'rôle', 'bot', 'dev'],
  );
  // La position de « rôle » désigne bien ce mot dans le texte source.
  const role = tokens.find((t) => t.word === 'rôle');
  assert.equal('Le rôle, Bot-Dev.'.slice(role.position, role.position + 4), 'rôle');
});

test('un mot présent dans un guide est associé à ce guide, avec une position', () => {
  const index = buildIndex([
    { page: 'guide.html', titre: 'Guide', markdown: '# Guide\n\nLe rôle de bot-dev est de coder.' },
  ]);

  const positions = index.index['rôle']['guide.html'];
  assert.ok(positions, '« rôle » est associé au guide');
  assert.ok(positions.length >= 1, 'avec au moins une position');

  // La position désigne le mot dans le texte brut du guide.
  const texte = index.guides['guide.html'].texte;
  assert.equal(texte.slice(positions[0], positions[0] + 4), 'rôle');
});

test('un mot absent des guides n’est pas indexé', () => {
  const index = buildIndex([
    { page: 'guide.html', titre: 'Guide', markdown: '# Guide\n\nDu texte ordinaire.' },
  ]);
  assert.equal(index.index['introuvable'], undefined);
});

test('la position permet de reconstituer un extrait autour du mot', () => {
  const markdown = '# Guide\n\nVoici un paragraphe qui parle de la recherche plein texte sur le site.';
  const index = buildIndex([{ page: 'guide.html', titre: 'Guide', markdown }]);

  const positions = index.index['recherche']['guide.html'];
  assert.ok(positions, '« recherche » est indexé');

  const texte = index.guides['guide.html'].texte;
  const pos = positions[0];
  const extrait = texte.slice(Math.max(0, pos - 20), pos + 'recherche'.length + 20);
  assert.ok(extrait.includes('recherche'), 'l’extrait contient le mot recherché');
  assert.ok(extrait.includes('parle de la'), 'l’extrait contient le contexte autour du mot');
});

test('plainText : retire la syntaxe Markdown et conserve le contenu du code', () => {
  const markdown = [
    '# Titre',
    '',
    '- une **liste** avec un [lien](cible.md)',
    '',
    '```sh',
    'npm run build',
    '```',
    '',
  ].join('\n');
  const texte = plainText(markdown);
  assert.ok(texte.includes('une liste avec un lien'), 'la liste, le gras et le lien sont ramenés au texte');
  assert.ok(texte.includes('npm run build'), 'le contenu du bloc de code est conservé');
  assert.ok(!texte.includes('```'), 'les clôtures de code sont retirées');
  assert.ok(!texte.includes('# Titre'), 'le marqueur de titre est retiré');
});

test('build : produit site/search-index.json avec guides et index', () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'site-index-'));
  build({ root, outDir });

  const indexPath = path.join(outDir, 'search-index.json');
  assert.ok(existsSync(indexPath), 'site/search-index.json est produit');

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  assert.ok(index.guides && index.index, 'l’index a les deux volets guides et index');

  // Un mot réellement présent dans un guide y est associé avec une position.
  const mot = 'pipeline';
  assert.ok(index.index[mot], 'le mot « pipeline » est indexé');
  const pages = Object.keys(index.index[mot]);
  assert.ok(pages.length >= 1, 'il est associé à au moins un guide');
  const page = pages[0];
  const positions = index.index[mot][page];
  assert.ok(positions.length >= 1, 'avec une position exploitable');
  assert.ok(
    index.guides[page].texte.slice(positions[0], positions[0] + mot.length) === mot,
    'la position désigne le mot dans le texte du guide',
  );
});
