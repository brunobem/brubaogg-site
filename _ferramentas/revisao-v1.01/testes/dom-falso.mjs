// Navegador de mentira, so o bastante para rodar assets/js/busca.js e contador.js SEM alterar o codigo deles e sem navegador.
// Serve para fuzz e medicao de escala (rapido). O que depende de navegador de verdade (foco, teclado real, leitor de tela) fica em js.html.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { raiz } from './lib.mjs';

export class El {
  constructor(tag = 'div', doc = null) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.parent = null;
    this.className = ''; this._text = ''; this.hidden = false; this.value = ''; this.href = ''; this.src = ''; this.alt = ''; this.loading = ''; this.id = '';
    this.ouvintes = {}; this.innerHTMLUsado = false; this._classes = new Set();
    const self = this;
    this.classList = {
      toggle(c, on) { if (on === undefined ? !self._classes.has(c) : on) self._classes.add(c); else self._classes.delete(c); },
      add(c) { self._classes.add(c); }, remove(c) { self._classes.delete(c); }, contains(c) { return self._classes.has(c); },
    };
  }
  get nextElementSibling() { const i = this.parent ? this.parent.children.indexOf(this) : -1; return i >= 0 ? this.parent.children[i + 1] ?? null : null; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  set innerHTML(v) { this.innerHTMLUsado = true; this.children = []; this._text = String(v); }
  get innerHTML() { return this._text; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, f) { (this.ouvintes[t] ??= []).push(f); }
  contains(o) { for (let n = o; n; n = n.parent) if (n === this) return true; return false; }
  todos() { return this.children.flatMap((c) => [c, ...c.todos()]); }
  casa(sel, no) {
    // so os seletores que o site usa: tag, .classe, tag.classe, #id
    const m = sel.match(/^([a-z0-9]*)(?:\.([\w-]+))?(?:#([\w-]+))?$/i); if (!m) return false;
    return (!m[1] || no.tagName === m[1].toUpperCase()) && (!m[2] || no.className.split(/\s+/).includes(m[2]) || no._classes.has(m[2])) && (!m[3] || no.id === m[3]);
  }
  querySelectorAll(sel) { return this.todos().filter((n) => this.casa(sel, n)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  dispararEvento(tipo, ev = {}) { const e = { type: tipo, target: this, preventDefault() { e.padraoEvitado = true; }, ...ev }; for (const f of this.ouvintes[tipo] ?? []) f(e); return e; }
}

/** monta o documento da pagina de busca/qualquer pagina com cabecalho: form.search > input + div.search-results */
export function montarPagina({ base = '', comResultados = false, alvoContador = null }) {
  const doc = { title: '', raiz: new El('body'), ouvintes: {} };
  const novo = (t) => new El(t, doc);
  const form = novo('form'); form.className = 'search'; form.setAttribute('data-base', base);
  const input = novo('input'); const box = novo('div'); box.className = 'search-results'; box.id = 'search-results'; box.hidden = true;
  form.appendChild(input); form.appendChild(box); doc.raiz.appendChild(form);
  let lista = null, contagem = null;
  if (comResultados) { lista = novo('ul'); lista.id = 'busca-resultados'; contagem = novo('p'); contagem.id = 'busca-contagem'; doc.raiz.appendChild(lista); doc.raiz.appendChild(contagem); }
  let contador = null;
  if (alvoContador !== undefined && alvoContador !== null) {
    contador = novo('div'); contador.id = 'gta-count'; contador.setAttribute('data-alvo', alvoContador);
    for (const [k, rotulo] of [['d', 'dias'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']]) { const b = novo('b'); b.id = `cd-${k}`; b.textContent = '--'; contador.appendChild(b); const r = novo('span'); r.textContent = rotulo; contador.appendChild(r); }
    const t = novo('h2'); t.id = 'gta-title'; t.textContent = 'GTA VI chega em'; doc.raiz.appendChild(t); doc.raiz.appendChild(contador);
  }
  doc.createElement = (t) => novo(t);
  doc.createTextNode = (s) => { const n = novo('#text'); n._text = String(s); return n; };
  doc.querySelector = (s) => doc.raiz.querySelector(s);
  doc.getElementById = (id) => doc.raiz.todos().find((n) => n.id === id) ?? null;
  doc.addEventListener = (t, f) => { (doc.ouvintes[t] ??= []).push(f); };
  return { doc, form, input, box, lista, contagem, contador };
}

/** roda um script do site (assets/js/*.js) dentro do navegador de mentira.
 *  opcoes: doc (documento falso), relogio (funcao que devolve "agora" em ms), resposta (o que o fetch devolve: objeto com json()/headers, ou funcao), semFetch */
export function rodarScript(arquivo, { doc, relogio = null, resposta = null, semFetch = false, q = '' } = {}) {
  const local = { href: '', pathname: '/index.html', search: q ? `?q=${encodeURIComponent(q)}` : '' };
  const janela = { location: local };
  const chamadas = []; const intervalos = [];
  const fetchFalso = (url, opcoes) => {
    chamadas.push({ url, metodo: opcoes?.method ?? 'GET' });
    const r = typeof resposta === 'function' ? resposta(url, opcoes) : resposta;
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? { ok: true, headers: { get: () => null }, json: () => Promise.resolve([]) });
  };
  const agora = relogio ?? (() => Date.now());
  const RelogioDate = class extends Date { constructor(...a) { if (a.length) super(...a); else super(agora()); } static now() { return agora(); } };
  const contexto = { document: doc, window: janela, URL, URLSearchParams, encodeURIComponent, decodeURIComponent, Date: RelogioDate,
    setInterval: (f, ms) => { intervalos.push({ f, ms }); janela.__intervalos = intervalos; return intervalos.length; },
    clearInterval: (id) => { if (intervalos[id - 1]) intervalos[id - 1].parado = true; }, setTimeout, clearTimeout, console };
  if (!semFetch) { contexto.fetch = fetchFalso; janela.fetch = fetchFalso; }
  janela.fetch ??= undefined;
  const ctx = vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(raiz, 'assets', 'js', arquivo), 'utf8');
  vm.runInContext(codigo, ctx, { filename: arquivo });
  return { location: local, chamadas, intervalos, ctx, janela };
}

/** documento sem nada (nenhuma pagina com cabecalho): so as funcoes puras de busca.js ficam disponiveis em window.BrubaoBusca */
export const documentoVazio = () => ({ querySelector: () => null, getElementById: () => null, addEventListener() {}, baseURI: 'http://localhost/' });

export const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
