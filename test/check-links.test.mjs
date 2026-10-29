import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkLinks } from '../outils/check-links.mjs';

// Monte un dépôt temporaire à partir d'un plan { chemin relatif : contenu }.
function makeRepo(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'check-links-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

test('un lien vers un fichier existant sans ancre ne produit aucune erreur', () => {
  const root = makeRepo({ 'a.md': '[vers B](b.md)\n', 'b.md': '# B\n' });
  assert.deepEqual(checkLinks(root), []);
});

test('un fichier absent est signalé avec la source, la ligne et la cause', () => {
  const root = makeRepo({ 'docs/a.md': 'avant\n[absent](inexistant.md)\naprès\n' });
  const errors = checkLinks(root);
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0], {
    file: path.join('docs', 'a.md'),
    line: 2,
    cause: 'fichier absent : inexistant.md',
  });
});

test('une ancre absente est signalée avec la cause', () => {
  const root = makeRepo({ 'docs/a.md': '[mauvaise ancre](b.md#introuvable)\n', 'docs/b.md': '# Titre\n' });
  const errors = checkLinks(root);
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0], {
    file: path.join('docs', 'a.md'),
    line: 1,
    cause: 'ancre absente : b.md#introuvable',
  });
});

test('une ancre calculée comme GitHub est acceptée, doublons compris', () => {
  const root = makeRepo({
    'docs/a.md': [
      '# A',
      '',
      '[deux mots](b.md#deux-mots)',
      '[apostrophe](b.md#états-dune-carte)',
      '[premier doublon](b.md#titre-1)',
      '[second doublon](b.md#titre-2)',
      '',
    ].join('\n'),
    'docs/b.md': [
      '# Titre',
      '',
      '## Deux Mots',
      '',
      "## États d'une carte",
      '',
      '## Titre',
      '',
      '## Titre',
      '',
    ].join('\n'),
  });
  assert.deepEqual(checkLinks(root), []);
});

test('un lien externe ou vers un fichier non Markdown est ignoré', () => {
  const root = makeRepo({
    'a.md': [
      '[externe https](https://example.com/x)',
      '[externe http](http://example.com/y)',
      '[image](image.png)',
      '[texte](fichier.txt)',
      '',
    ].join('\n'),
  });
  assert.deepEqual(checkLinks(root), []);
});

test('tous les liens cassés sont signalés, pas seulement le premier', () => {
  const root = makeRepo({ 'a.md': '[un](absent1.md)\n[deux](absent2.md)\n' });
  const errors = checkLinks(root);
  assert.equal(errors.length, 2);
  assert.equal(errors[0].line, 1);
  assert.equal(errors[1].line, 2);
});

test('un lien écrit dans du code en ligne ou un bloc de code est ignoré', () => {
  const root = makeRepo({
    'a.md': [
      'Dans un bloc :',
      '```',
      '[lien](inexistant.md)',
      '```',
      'Et en ligne : `[lien](inexistant.md)`.',
      '',
    ].join('\n'),
  });
  assert.deepEqual(checkLinks(root), []);
});
