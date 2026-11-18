import re, json
base = r'C:\Users\bruno\Desktop\MCP SOCIAL\site-brubaogg'

# --- candidatos desenhados a mao (viewBox 24x24, preenchidos, currentColor) ---

def folha(cx, cy, px, py, qx, qy):
    """folha em forma de lua crescente: do centro (cx,cy) ate a ponta (px,py); (qx,qy)=controle de cima, ajustado por espessura"""
    return f"M{cx} {cy}Q{qx} {qy} {px} {py}Q{(cx+px)/2+ (qx-(cx+px)/2)*0.35:.2f} {(cy+py)/2+(qy-(cy+py)/2)*0.35:.2f} {cx} {cy}Z"

def espelha(d, eixo=12):
    """espelha um path simples (so M/Q/Z com pares absolutos) em torno de x = eixo"""
    out = []
    for tok in re.findall(r'[MQZ]|-?\d+\.?\d*', d):
        out.append(tok)
    res, i, cmd = '', 0, None
    while i < len(out):
        t = out[i]
        if t in 'MQZ':
            res += t; i += 1
        else:
            x = 2 * eixo - float(out[i]); y = float(out[i + 1])
            res += f"{x:.2f} {y:.2f}"; i += 2
            # separador entre pares
            res += ' ' if i < len(out) and out[i] not in 'MQZ' else ''
    return res

def palmeira(cx, cy, folhas, tronco, coco=True):
    d = ''
    for (px, py, qx, qy) in folhas:
        d += folha(cx, cy, px, py, qx, qy)
        d += espelha(folha(cx, cy, px, py, qx, qy), eixo=cx)       # lado oposto
    d += tronco
    if coco:
        d += f"M{cx-1.7} {cy+1.2}a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0Z"
        d += f"M{cx+0.6} {cy+1.6}a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0Z"
    return d

C = (12, 8.5)
# folhas: (ponta x, ponta y, controle x, controle y) so do lado esquerdo; o direito e espelho
folhas7 = [(1.8, 12.5, 6.0, 2.2), (4.2, 3.2, 6.8, 2.4), (9.5, 1.6, 9.0, 3.8), (4.6, 15.0, 6.8, 7.6)]
folhas5 = [(1.8, 12.5, 6.0, 2.2), (5.0, 3.0, 7.0, 2.6), (8.6, 14.0, 9.0, 8.2)]
tronco_fino = "M11.2 9.8C11.8 14 11.9 18 11.1 22.6L12.7 22.6C13.1 18 13.0 14 12.8 9.8Z"
tronco_curvo = "M11.0 9.8C12.6 13 12.9 18 11.4 22.6L13.0 22.6C14.4 18 14.0 13 12.9 9.8Z"

cands = {
  'M1 · 7 folhas, tronco fino': palmeira(12, 8.6, folhas7, tronco_fino),
  'M2 · 7 folhas, tronco curvo': palmeira(12, 8.6, folhas7, tronco_curvo),
  'M3 · 5 folhas, tronco curvo': palmeira(12, 8.6, folhas5, tronco_curvo),
  'M4 · 5 folhas, sem cocos': palmeira(12, 8.6, folhas5, tronco_curvo, coco=False),
}
json.dump(cands, open(base + r'\_ferramentas\cache\cand-manual.json', 'w', encoding='utf8'), ensure_ascii=False)

atual = open(base + r'\assets\icones\tree-palm.svg', encoding='utf8').read()
lucide = open(base + r'\_marca\icones-originais\tree-palm-lucide.svg', encoding='utf8').read()
lu = re.search(r'<svg[^>]*>([\s\S]*)</svg>', lucide).group(1)
def tile(t, svg): return f'<div class="t"><div class="par"><span class="g">{svg}</span><span class="m">{svg}</span><span class="p">{svg}</span></div><small>{t}</small></div>'
mk = lambda d: f'<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="nonzero" d="{d}"/></svg>'
tiles = tile('contorno antigo (Lucide)', f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{lu}</svg>')
tiles += tile('versao volumosa (a que voce reprovou)', atual.replace('<svg ', '<svg ', 1))
tiles += ''.join(tile(n, mk(d)) for n, d in cands.items())
html = f'''<!doctype html><meta charset="utf-8"><style>
body{{background:#302D33;color:#CFCD2D;font-family:system-ui;padding:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:26px}}
.t{{text-align:center}} .par{{display:flex;gap:18px;align-items:flex-end;justify-content:center}}
.g svg{{width:110px;height:110px}} .m svg{{width:30px;height:30px}} .p svg{{width:18px;height:18px}} small{{display:block;margin-top:8px;color:#f4f3ea;font-size:12px}}
</style>{tiles}'''
open(base + r'\_ferramentas\cache\preview-icone.html', 'w', encoding='utf8').write(html)
print('ok', len(cands), 'candidatos')
