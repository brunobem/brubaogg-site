// Onde mora o arquivo de cada materia, em UM so lugar.
//   _conteudo/materias/<tipo>/<ID>/<ID>.json     <tipo> = noticias | reviews | lancamentos | wiki
// Cada materia tem a PROPRIA pasta (o nome e o ID do video, ou o nome do arquivo da Wiki); o JSON tem o mesmo nome da pasta, e as imagens dela (miniatura, fotos do texto) ficam ao lado.
// O tipo e a pasta de "o que e": GTA 6 (categoria gta6-novidades) e noticia, entao mora em noticias; a Wiki (categoria series) mora em wiki. Uma categoria nova que nao esteja
// em PASTA_DO_TIPO usa o proprio nome como pasta de tipo (o gerador le qualquer subpasta de _conteudo/materias).
import fs from 'node:fs';
import path from 'node:path';
import { normalizarId } from './util.mjs';

export const RAIZ_DE_CONTEUDO = '_conteudo/materias';
export const PASTA_DO_TIPO = { 'gta6-novidades': 'noticias', series: 'wiki' }; // categoria do site -> pasta de tipo (o que nao esta aqui usa o proprio nome)
export const tipoDaCategoria = (categoria) => PASTA_DO_TIPO[categoria] ?? categoria;

/**
 * Todos os conteudos: [{ id, tipo, arquivo (caminho completo), rel (a partir da raiz do site, com /), pasta (a do ID) }], ordenados por tipo e ID.
 * `foraDoLugar` = o que existe mas nao esta no formato materias/<tipo>/<ID>/<ID>.json (JSON solto, pasta sem o JSON de mesmo nome): o gerador avisa, para nada sumir calado.
 */
export function listarConteudos(site) {
  const raiz = path.join(site, RAIZ_DE_CONTEUDO), itens = [], foraDoLugar = [];
  if (!fs.existsSync(raiz)) return { itens, foraDoLugar };
  const rel = (...p) => `${RAIZ_DE_CONTEUDO}/${p.join('/')}`;
  for (const t of fs.readdirSync(raiz, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!t.isDirectory()) { if (t.name.endsWith('.json')) foraDoLugar.push(rel(t.name)); continue; }
    const dirTipo = path.join(raiz, t.name);
    for (const e of fs.readdirSync(dirTipo, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory()) { if (e.name.endsWith('.json')) foraDoLugar.push(rel(t.name, e.name)); continue; }
      const arquivo = path.join(dirTipo, e.name, `${e.name}.json`);
      if (fs.existsSync(arquivo)) itens.push({ id: e.name, tipo: t.name, arquivo, rel: rel(t.name, e.name, `${e.name}.json`), pasta: path.join(dirTipo, e.name) });
      else if (fs.readdirSync(path.join(dirTipo, e.name)).some((x) => x.endsWith('.json'))) foraDoLugar.push(rel(t.name, e.name, '(o JSON precisa ter o nome da pasta)'));
    }
  }
  // ordem pelo nome do arquivo (ID.json), como a lista de uma pasta so: a ordem em que o gerador le as materias nao pode mudar so porque elas ganharam pastas
  const chave = (c) => `${c.id}.json`;
  itens.sort((x, y) => (chave(x) < chave(y) ? -1 : chave(x) > chave(y) ? 1 : 0));
  return { itens, foraDoLugar };
}

/** Caminho do arquivo de uma materia (ou null se ela nao existe em nenhuma pasta). */
export function arquivoDaMateria(site, id) {
  return listarConteudos(site).itens.find((c) => c.id === id)?.arquivo ?? null;
}

/** Em que tipo (pasta) a materia `id` mora hoje, ou null. */
export function tipoDaMateria(site, id) {
  return listarConteudos(site).itens.find((c) => c.id === id)?.tipo ?? null;
}

/** Caminho do JSON de uma materia NOVA da categoria `categoria` (ou da Wiki, com `categoria` = 'series'): a pasta do ID e criada por quem grava. */
export function arquivoParaNova(site, categoria, id) {
  return path.join(site, RAIZ_DE_CONTEUDO, tipoDaCategoria(categoria), id, `${id}.json`);
}

/**
 * O identificador que o comando recebeu: o ID (ou link) de um video, ou o nome de um arquivo da Wiki (ex.: resident-evil-4-leon).
 * O nome da Wiki so vale se o arquivo existe ou o conteudo ja esta no registro de enderecos. Devolve null quando nao e nenhum dos dois.
 */
export function resolverId(site, arg) {
  const id = normalizarId(arg);
  if (id) return id;
  const s = String(arg ?? '').trim();
  if (!/^[\w-]+$/.test(s)) return null;
  if (arquivoDaMateria(site, s)) return s;
  const reg = path.join(site, '_conteudo', 'enderecos.json');
  try { return Object.hasOwn(JSON.parse(fs.readFileSync(reg, 'utf8').replace(/^﻿/, '')), s) ? s : null; } catch { return null; }
}
