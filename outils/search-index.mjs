// Index de recherche plein texte des guides : extrait le texte brut de chaque
// guide, le découpe en mots en minuscules et sans ponctuation, puis associe à
// chaque mot les guides où il apparaît et la position (offset de caractère) de
// chaque occurrence dans le texte. La position permet à la page de recherche de
// reconstituer un extrait autour du mot. Aucune dépendance : uniquement les
// modules natifs de Node.

// Un mot est une suite de lettres et de chiffres ; toute ponctuation est un
// séparateur. Le drapeau `u` autorise les classes Unicode (\p{L}, \p{N}).
const WORD_RE = /[\p{L}\p{N}]+/gu;

function isFenceClose(line, marker, len) {
  const t = line.trim();
  return t.length >= len && t.split('').every((c) => c === marker);
}

// Ramène la syntaxe en ligne d'une ligne de guide au texte seul : le code en
// ligne à son contenu, un lien à son libellé, le gras et l'italique au texte.
function inlineText(s) {
  return s
    .replace(/`([^`\n]+)`/g, '$1')                                      // code en ligne
    .replace(/\[([^\]\n]+)\]\([^)\s]+(?:\s+["'][^"']*["'])?\)/g, '$1')   // lien
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')                                 // gras
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')                                     // italique
    .replace(/(^|[^\p{L}\p{N}])_([^_\n]+)_(?=[^\p{L}\p{N}]|$)/gu, '$1$2');
}

// Extrait le texte brut d'un guide Markdown : retire la syntaxe structurale
// (clôtures de code, marqueurs de titre, de liste, de citation, règles
// horizontales), ramène la syntaxe en ligne au texte, et normalise les blancs.
// Le contenu des blocs de code est conservé tel quel.
export function plainText(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let open = null; // { marker, len } tant qu'un bloc de code est ouvert
  for (const line of lines) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (open === null) {
        open = { marker: fence[1][0], len: fence[1].length };
      } else if (isFenceClose(line, open.marker, open.len)) {
        open = null;
      }
      continue; // la ligne de clôture et la langue ne sont pas du texte
    }
    if (open !== null) {
      out.push(line);
      continue;
    }
    if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue; // règle horizontale
    const s = inlineText(
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')                // marqueur de titre
        .replace(/^\s{0,3}>+\s?/, '')                     // marqueur de citation
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''),         // puce de liste
    );
    out.push(s);
  }
  return out.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

// Découpe un texte en mots : chaque mot est ramené en minuscules, accompagné de
// la position (offset de caractère) de son début dans le texte. Cette position
// désigne le mot dans `texte`, ce qui permet d'en reconstituer un extrait.
export function tokenize(text) {
  const tokens = [];
  for (const m of String(text).matchAll(WORD_RE)) {
    tokens.push({ word: m[0].toLowerCase(), position: m.index });
  }
  return tokens;
}

// Construit l'index à partir des guides ({ page, titre, markdown }). Rend un
// objet { guides, index } :
// - guides : page -> { titre, texte } (le texte brut servant aux extraits) ;
// - index  : mot -> { page: [positions] } (les positions dans ce texte).
export function buildIndex(guides) {
  const index = {};
  const meta = {};
  for (const g of guides) {
    const texte = plainText(g.markdown);
    meta[g.page] = { titre: g.titre, texte };
    for (const { word, position } of tokenize(texte)) {
      const parMot = index[word] ?? (index[word] = {});
      const positions = parMot[g.page] ?? (parMot[g.page] = []);
      positions.push(position);
    }
  }
  return { guides: meta, index };
}
