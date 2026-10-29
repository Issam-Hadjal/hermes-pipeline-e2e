// Recherche côté navigateur : charge l'index plein texte construit par le build
// (site/search-index.json), interroge à la frappe, et rend les résultats — pour
// chaque guide, le titre lié et un extrait autour du mot trouvé, le mot mis en
// évidence. La génération de l'extrait est factorisée ici, sans aucune API du
// navigateur, pour être testée dans Node ; le câblage du champ n'est exécuté que
// lorsqu'un document existe. Aucune dépendance : uniquement les modules natifs
// de Node (côté test) et les API du navigateur (côté page).

// Un mot est une suite de lettres et de chiffres, comme dans l'index.
const MOT = /[\p{L}\p{N}]+/gu;

function mots(s) {
  const out = [];
  for (const m of String(s).matchAll(MOT)) out.push({ mot: m[0], debut: m.index });
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Construit un extrait autour d'une occurrence d'un mot : quelques mots avant,
// le mot lui-même, quelques mots après, sans jamais couper un mot en deux.
// `position` et `longueur` désignent l'occurrence dans `texte`, telles que les
// fournit l'index. Rend { avant, mot, apres }, chaque partie en texte brut, le
// mot étant la sous-chaîne exacte de `texte` (casse d'origine conservée).
export function extrait(texte, position, longueur, options = {}) {
  const avant = options.avant ?? 6;
  const apres = options.apres ?? 6;
  const s = String(texte);
  const fin = position + longueur;
  const prefixe = s.slice(0, position);
  const suffixe = s.slice(fin);

  const avantMots = mots(prefixe);
  const debut = avantMots.length > avant ? avantMots[avantMots.length - avant].debut : 0;

  const apresMots = mots(suffixe);
  const finExtrait = apresMots.length > apres ? apresMots[apres].debut : suffixe.length;

  return {
    avant: prefixe.slice(debut),
    mot: s.slice(position, fin),
    apres: suffixe.slice(0, finExtrait),
  };
}

// Rend un extrait en HTML : le texte est échappé, le mot est mis en évidence
// dans une balise <mark>. Le contexte et le mot étant échappés, le texte brut
// d'un guide ne peut pas injecter de balise.
export function renduExtrait(e) {
  return `${esc(e.avant)}<mark>${esc(e.mot)}</mark>${esc(e.apres)}`;
}

// --- Partie navigateur : câblage du champ et rendu des résultats. ---
if (typeof document !== 'undefined') {
  const champ = document.getElementById('q');
  const liste = document.getElementById('resultats');
  let index = null;

  // L'index n'est chargé qu'une fois : la première frappe déclenche l'unique
  // appel réseau, les suivantes lisent le cache. Aucun autre appel n'a lieu.
  const chargerIndex = async () => {
    if (index) return index;
    const reponse = await fetch('search-index.json');
    if (!reponse.ok) throw new Error(`index introuvable (${reponse.status})`);
    index = await reponse.json();
    return index;
  };

  const rechercher = async () => {
    const termes = mots(champ.value).map((m) => m.mot.toLowerCase());
    liste.replaceChildren();
    if (termes.length === 0) return;

    try {
      const donnees = await chargerIndex();
      // page -> { total, premierMot, premierPosition } : on regroupe les
      // occurrences de tous les termes de la requête, puis on trie par nombre
      // d'occurrences décroissant.
      const parPage = new Map();
      for (const terme of termes) {
        const pages = donnees.index[terme];
        if (!pages) continue;
        for (const [page, positions] of Object.entries(pages)) {
          let entree = parPage.get(page);
          if (!entree) {
            entree = { total: 0, premierMot: terme, premierPosition: positions[0] };
            parPage.set(page, entree);
          }
          entree.total += positions.length;
        }
      }

      const resultats = [...parPage.entries()].sort((a, b) => b[1].total - a[1].total);
      for (const [page, r] of resultats) {
        const guide = donnees.guides[page];
        const ex = extrait(guide.texte, r.premierPosition, r.premierMot.length);
        const item = document.createElement('li');
        item.className = 'resultat';
        const lien = document.createElement('a');
        lien.href = page;
        lien.textContent = guide.titre;
        const extraitP = document.createElement('p');
        extraitP.innerHTML = renduExtrait(ex);
        item.append(lien, extraitP);
        liste.append(item);
      }
    } catch (erreur) {
      const item = document.createElement('li');
      item.className = 'resultat erreur';
      item.textContent = `La recherche est indisponible : ${erreur.message}`;
      liste.append(item);
    }
  };

  champ.addEventListener('input', rechercher);
}
