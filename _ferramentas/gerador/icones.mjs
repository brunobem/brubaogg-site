// Icones: cada arquivo de assets/icones/<nome>.svg vira SVG embutido (herda a cor do texto).
import fs from 'node:fs';
import path from 'node:path';

export function criarIcones(site) {
  const _icones = {};
  return function icone(nome) {
    if (_icones[nome]) return _icones[nome];
    const f = path.join(site, 'assets', 'icones', `${nome}.svg`);
    if (!fs.existsSync(f)) throw new Error(`Icone nao encontrado: assets/icones/${nome}.svg`);
    const raw = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
    const m = raw.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/);
    if (!m) throw new Error(`assets/icones/${nome}.svg nao e um SVG valido`);
    const viewBox = (m[1].match(/viewBox="([^"]+)"/) ?? [])[1] ?? '0 0 24 24';
    const linha = /\bstroke="/.test(m[1]); // estilo Lucide (contorno) ou Simple Icons (preenchido)
    const interno = m[2].replace(/\s+/g, ' ').trim();
    return (_icones[nome] = `<svg class="ico ${linha ? 'ico-linha' : 'ico-cheio'}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${interno}</svg>`);
  };
}
