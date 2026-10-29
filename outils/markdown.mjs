// Conversion Markdown -> HTML, sans aucune dépendance. Couvre le sous-ensemble
// utilisé par la documentation : titres avec ancres calculées comme sur GitHub,
// paragraphes, listes à puces et numérotées (imbrication comprise), blocs de
// code, code en ligne, gras, italique, liens et tableaux.

const P = '\u0000'; // marqueur de protection des fragments déjà rendus

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// L'ancre d'un titre, calculée comme GitHub : minuscules, seuls les lettres,
// les chiffres, les espaces et les tirets subsistent, puis les espaces
// deviennent des tirets.
export function slugify(text) {
  const cleaned = String(text)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'section';
}

// Les titres d'un document, dans l'ordre, avec leur niveau (1 à 6) et leur ancre
// calculée comme sur GitHub, doublons suffixés -1, -2, etc. La déduplication
// compte tous les niveaux, exactement comme dans `render`, afin que les ancres
// renvoyées ici coïncident avec les `id` posés sur les balises de titre. Les
// titres à l'intérieur d'un bloc de code sont ignorés.
export function headings(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const seen = new Map();
  const out = [];
  let open = null; // { marker, len } tant qu'un bloc de code est ouvert
  for (const line of lines) {
    const fence = fenceMatch(line);
    if (fence) {
      if (open === null) {
        open = { marker: fence[1][0], len: fence[1].length };
      } else if (isFenceClose(line, open.marker, open.len)) {
        open = null;
      }
      continue;
    }
    if (open !== null) continue;
    const heading = headingMatch(line);
    if (!heading) continue;
    const base = slugify(heading[2].trim());
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    out.push({ level: heading[1].length, text: heading[2].trim(), anchor: n === 0 ? base : `${base}-${n}` });
  }
  return out;
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

function fenceMatch(line) {
  return line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
}

function headingMatch(line) {
  return line.match(/^(#{1,6})\s+(.*)$/);
}

function hrMatch(line) {
  return /^ {0,3}(-{3,}|_{3,}|\*{3,})\s*$/.test(line);
}

function listMatch(line) {
  return line.match(/^([ ]*)([-*+]|\d+[.)])\s+(.*)$/);
}

function isTableRow(line) {
  return line.trim().startsWith('|');
}

function isTableSep(line) {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function isFenceClose(line, marker, len) {
  const t = line.trim();
  if (t.length < len) return false;
  return t.split('').every((c) => c === marker);
}

// Une ligne qui commence un bloc (autre qu'un paragraphe) met fin au paragraphe
// en cours. La détection de tableau exige la ligne de séparation juste après.
function startsBlock(lines, idx) {
  const line = lines[idx];
  if (isBlank(line) || fenceMatch(line) || headingMatch(line) || hrMatch(line) || listMatch(line)) {
    return true;
  }
  return isTableRow(line) && idx + 1 < lines.length && isTableSep(lines[idx + 1]);
}

function renderTable(lines, start, inline) {
  const header = splitRow(lines[start]).map((c) => `<th>${inline(c)}</th>`);
  const rows = [];
  let i = start + 2;
  while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
    rows.push(splitRow(lines[i]).map((c) => `<td>${inline(c)}</td>`).join(''));
    i++;
  }
  const thead = `<thead>\n<tr>${header.join('')}</tr>\n</thead>`;
  const tbody = rows.length ? `<tbody>\n${rows.map((r) => `<tr>${r}</tr>`).join('\n')}\n</tbody>` : '';
  return { html: `<table>\n${thead}\n${tbody}</table>`, next: i };
}

function renderList(lines, start, indent, inline) {
  const items = [];
  let i = start;
  let ordered = null;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) break;
    const m = listMatch(line);
    if (!m) break;
    const ind = m[1].length;
    if (ind < indent) break;
    if (ind > indent) {
      // liste imbriquée, rattachée au dernier élément
      if (items.length === 0) break;
      const nested = renderList(lines, i, ind, inline);
      items[items.length - 1].nested = nested.html;
      i = nested.next;
      continue;
    }
    const isOrdered = /^\d/.test(m[2]);
    if (ordered === null) ordered = isOrdered;
    const item = { content: [m[3]], ordered: isOrdered, nested: null };
    items.push(item);
    i++;
    while (i < lines.length) {
      const cl = lines[i];
      if (isBlank(cl)) break;
      const nm = listMatch(cl);
      if (nm) {
        if (nm[1].length <= indent) break;
        const nested = renderList(lines, i, nm[1].length, inline);
        item.nested = nested.html;
        i = nested.next;
        continue;
      }
      item.content.push(cl.trim());
      i++;
    }
  }
  const tag = ordered ? 'ol' : 'ul';
  const body = items
    .map((it) => {
      let s = `<li>${inline(it.content.join(' '))}`;
      if (it.nested) s += `\n${it.nested}`;
      return `${s}</li>`;
    })
    .join('\n');
  return { html: `<${tag}>\n${body}\n</${tag}>`, next: i };
}

export function render(markdown, options = {}) {
  const linkTarget = options.linkTarget || ((href) => href);
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  const seen = new Map();

  const anchor = (text) => {
    const base = slugify(text);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };

  const inline = (text) => {
    const spans = [];
    const protect = (s) => {
      spans.push(s);
      return `${P}${spans.length - 1}${P}`;
    };
    const emphasis = (s) => {
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
      s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
      s = s.replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
      return s;
    };
    const restore = (s) => {
      // Les fragments protégés peuvent en contenir d'autres (un code en ligne
      // dans le libellé d'un lien) : on remplace jusqu'à ce qu'il n'en reste
      // plus, avec une borne pour ne jamais boucler.
      let out = s;
      const re = new RegExp(`${P}(\\d+)${P}`, 'g');
      for (let guard = 0; guard <= spans.length && out.includes(P); guard++) {
        out = out.replace(re, (m, idx) => spans[Number(idx)]);
      }
      return out;
    };

    let s = String(text);
    s = s.replace(/`([^`\n]+)`/g, (m, c) => protect(`<code>${escapeHtml(c)}</code>`));
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g, (m, label, href, title) => {
      const t = title ? ` title="${escapeAttr(title)}"` : '';
      return protect(`<a href="${escapeAttr(linkTarget(href))}"${t}>${emphasis(escapeHtml(label))}</a>`);
    });
    // Le texte restant est échappé (un éventuel HTML brut devient du texte),
    // puis le gras et l'italique s'appliquent sur ce texte déjà échappé.
    s = escapeHtml(s);
    s = emphasis(s);
    return restore(s);
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    const fence = fenceMatch(line);
    if (fence) {
      const marker = fence[1][0];
      const len = fence[1].length;
      const lang = fence[2].trim();
      const buf = [];
      i++;
      while (i < lines.length && !isFenceClose(lines[i], marker, len)) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // ligne de fermeture
      const cls = lang ? ` class="language-${escapeAttr(lang)}"` : '';
      html.push(`<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = headingMatch(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${escapeAttr(anchor(text))}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (hrMatch(line)) {
      html.push('<hr>');
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const { html: tableHtml, next } = renderTable(lines, i, inline);
      html.push(tableHtml);
      i = next;
      continue;
    }

    const lm = listMatch(line);
    if (lm) {
      const { html: listHtml, next } = renderList(lines, i, lm[1].length, inline);
      html.push(listHtml);
      i = next;
      continue;
    }

    const para = [];
    while (i < lines.length && !startsBlock(lines, i)) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) html.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return html.join('\n');
}
