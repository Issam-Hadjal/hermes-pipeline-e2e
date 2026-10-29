// Vérificateur de liens internes : parcourt tous les fichiers Markdown du dépôt,
// repère les liens dont la cible est un chemin `.md` relatif (avec ou sans ancre
// `#fragment`), et vérifie pour chacun que le fichier cible existe et que l'ancre
// éventuelle correspond à un titre du fichier cible (ancre calculée comme sur
// GitHub, doublons suffixés -1, -2, etc.). Aucune dépendance : uniquement les
// modules natifs de Node. Les liens externes et les cibles non Markdown sont
// ignorés.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { slugify } from './markdown.mjs';

// Répertoires à ne pas parcourir : le dépôt Git lui-même, les dépendances et le
// site généré (non versionné).
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'site']);

// Un lien Markdown en ligne : [libellé](cible "titre optionnel"). Même forme que
// celle du convertisseur, pour ne pas inventer de liens que lui ne verrait pas.
const LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
// Un titre de niveau 1 à 6, en début de ligne, comme le convertisseur le lit.
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
// Une ligne qui ouvre un bloc de code clôturé (accents graves ou tildes).
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

function mdFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...mdFiles(full));
    else if (st.isFile() && entry.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

// Pour chaque ligne, vrai si elle se trouve à l'intérieur d'un bloc de code
// clôturé : on n'y cherche ni titre ni lien.
function linesInsideFences(lines) {
  const inside = new Array(lines.length).fill(false);
  let open = null; // { marker, len } tant qu'un bloc est ouvert
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_RE);
    if (m) {
      const marker = m[1][0];
      const len = m[1].length;
      if (open === null) {
        open = { marker, len };
      } else {
        const t = lines[i].trim();
        if (t.length >= open.len && t.split('').every((c) => c === open.marker)) {
          open = null;
        }
      }
      inside[i] = true;
    } else {
      inside[i] = open !== null;
    }
  }
  return inside;
}

// Les ancres de tous les titres du document, calculées comme sur GitHub : la
// forme du titre via slugify, et les doublons suffixés -1, -2, etc.
function anchorsOf(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const inside = linesInsideFences(lines);
  const seen = new Map();
  const anchors = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (inside[i]) continue;
    const m = lines[i].match(HEADING_RE);
    if (!m) continue;
    const base = slugify(m[2].trim());
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    anchors.add(n === 0 ? base : `${base}-${n}`);
  }
  return anchors;
}

// Décompose une cible de lien. Rend { file, anchor } pour un lien interne vers un
// fichier `.md`, ou null si la cible est externe (schéma d'URL), une ancre seule,
// ou ne vise pas un fichier Markdown.
function parseTarget(target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  const m = target.match(/^([^#]*?)(\.md)(?:#(.*))?$/i);
  if (!m) return null;
  return { file: m[1] + m[2], anchor: m[3] || null };
}

export function checkLinks(root = process.cwd()) {
  root = path.resolve(root);
  const errors = [];
  const anchorsCache = new Map();

  const anchorsFor = (absPath) => {
    if (!anchorsCache.has(absPath)) {
      anchorsCache.set(absPath, anchorsOf(readFileSync(absPath, 'utf8')));
    }
    return anchorsCache.get(absPath);
  };

  for (const file of mdFiles(root)) {
    const content = readFileSync(file, 'utf8');
    const lines = content.replace(/\r\n?/g, '\n').split('\n');
    const inside = linesInsideFences(lines);
    const rel = path.relative(root, file);
    for (let i = 0; i < lines.length; i++) {
      if (inside[i]) continue;
      // Le code en ligne est retiré avant de chercher les liens : un exemple de
      // lien écrit entre accents graves n'est pas un lien.
      const line = lines[i].replace(/`([^`\n]+)`/g, ' ');
      for (const match of line.matchAll(LINK_RE)) {
        const info = parseTarget(match[2]);
        if (!info) continue;
        const targetAbs = path.resolve(path.dirname(file), info.file);
        if (!existsSync(targetAbs)) {
          errors.push({ file: rel, line: i + 1, cause: `fichier absent : ${info.file}` });
          continue;
        }
        if (info.anchor && !anchorsFor(targetAbs).has(info.anchor)) {
          errors.push({ file: rel, line: i + 1, cause: `ancre absente : ${info.file}#${info.anchor}` });
        }
      }
    }
  }
  return errors;
}

if (import.meta.main) {
  const errors = checkLinks();
  for (const e of errors) {
    console.error(`${e.file}:${e.line} : ${e.cause}`);
  }
  if (errors.length) {
    console.error(`${errors.length} lien(s) interne(s) cassé(s).`);
    process.exitCode = 1;
  }
}
