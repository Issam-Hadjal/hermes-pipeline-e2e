// Construit le site statique de la documentation : lit README.md et chaque
// guide de docs/, convertit le Markdown en HTML, puis écrit le tout dans site/
// (non versionné). Aucune dépendance : uniquement les modules natifs de Node.

import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { render, headings } from './markdown.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Réécrit un lien interne vers un guide `.md` en lien vers sa page HTML :
// README.md -> index.html, docs/foo.md -> foo.html. Un lien externe ou une
// ancre dans la page est laissé tel quel.
export function resolveLink(href) {
  if (href.startsWith('#')) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  const m = href.match(/^([^#]*?)(\.md)(#.*)?$/i);
  if (!m) return href;
  const base = path.basename(m[1]);
  const page = base.toLowerCase() === 'readme' ? 'index.html' : `${base}.html`;
  return page + (m[3] || '');
}

// Le titre d'un guide : sa première ligne de titre de niveau 1, sinon null.
export function extractTitle(markdown) {
  const m = String(markdown).match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function menuHtml(guides, currentPage) {
  const home = `<li><a href="index.html"${currentPage === 'index.html' ? ' class="courant" aria-current="page"' : ''}>Accueil</a></li>`;
  const items = guides.map((g) => {
    const cls = currentPage === g.page ? ' class="courant" aria-current="page"' : '';
    return `<li><a href="${g.page}"${cls}>${esc(g.titre)}</a></li>`;
  });
  return `${home}\n${items.join('\n')}`;
}

// La table des matières d'un guide : ses titres de niveau 2 et 3, dans l'ordre,
// chacun lié à son ancre. Les niveaux 3 sont indentés pour les distinguer des
// niveaux 2. Sans titre de niveau 2 ni 3, il n'y a rien à lister : chaîne vide.
function tocHtml(all) {
  const items = all
    .filter((h) => h.level === 2 || h.level === 3)
    .map((h) => {
      const cls = h.level === 3 ? ' class="niveau-3"' : '';
      return `<li${cls}><a href="#${h.anchor}">${esc(h.text)}</a></li>`;
    });
  if (items.length === 0) return '';
  return `<nav class="sommaire" aria-label="Sommaire">\n<ul>\n${items.join('\n')}\n</ul>\n</nav>`;
}

function page(template, { titre, contenu, sommaire, guides, currentPage }) {
  // Les remplacements passent par une fonction plutôt qu'une chaîne : une
  // chaîne de remplacement fait interpréter à `String.prototype.replace` les
  // séquences `$'`, `$&`, `$$`, etc. présentes dans le contenu du guide, ce qui
  // cassait la page générée. Une fonction restitue sa valeur à l'identique.
  return template
    .replace('{{TITRE}}', () => esc(titre))
    .replace('{{SOMMAIRE}}', () => sommaire)
    .replace('{{MENU}}', () => menuHtml(guides, currentPage))
    .replace('{{CONTENU}}', () => contenu);
}

export function build(options = {}) {
  const root = options.root || process.cwd();
  const docsDir = path.join(root, 'docs');
  const outilsDir = path.join(root, 'outils');
  const outDir = options.outDir || path.join(root, 'site');
  const readmePath = path.join(root, 'README.md');
  const template = readFileSync(path.join(outilsDir, 'gabarit.html'), 'utf8');

  const readme = readFileSync(readmePath, 'utf8');
  const files = readdirSync(docsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const guides = files
    .map((f) => {
      const md = readFileSync(path.join(docsDir, f), 'utf8');
      return { page: f.replace(/\.md$/, '.html'), titre: extractTitle(md) || path.basename(f, '.md') };
    })
    .sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const writePage = (name, titre, contenu, currentPage, sommaire = '') => {
    writeFileSync(path.join(outDir, name), page(template, { titre, contenu, sommaire, guides, currentPage }));
  };

  // Page d'accueil : le contenu de README.md, suivi de la liste des guides.
  const readmeHtml = render(readme, { linkTarget: resolveLink });
  const guideList = `<h2>Guides</h2>\n<ul>\n${guides
    .map((g) => `<li><a href="${g.page}">${esc(g.titre)}</a></li>`)
    .join('\n')}\n</ul>`;
  writePage('index.html', 'Accueil', `${readmeHtml}\n${guideList}`, 'index.html');

  // Une page par guide.
  for (const g of guides) {
    const md = readFileSync(path.join(docsDir, g.page.replace(/\.html$/, '.md')), 'utf8');
    const sommaire = tocHtml(headings(md));
    writePage(g.page, g.titre, render(md, { linkTarget: resolveLink }), g.page, sommaire);
  }

  copyFileSync(path.join(outilsDir, 'style.css'), path.join(outDir, 'style.css'));

  return { outDir, pages: ['index.html', ...guides.map((g) => g.page)] };
}

if (import.meta.main) {
  build();
  console.log('site/ construit.');
}
