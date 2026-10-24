# Redimensiona as imagens das materias para a web (chamado por gerador/imagens.mjs; precisa do Python 3 com Pillow: python -m pip install pillow).
# Entrada (stdin, JSON): [{ "src": "caminho da imagem original", "larguras": [480, 800, 1200], "modelo": "pasta/nome-{w}.webp", "qualidade": 90 }]
# Saida (stdout, JSON): [{ "w": largura original, "a": altura original, "ls": [larguras gravadas] }]  (na mesma ordem; "erro" no lugar se a imagem estiver quebrada)
# Nunca aumenta a imagem: uma largura maior que a original vira a propria largura original. Grava WebP (qualidade do job, padrao 90), sem os metadados da foto (localizacao, camera...).
import json
import os
import sys

from PIL import Image, ImageOps


def processar(job):
    im = ImageOps.exif_transpose(Image.open(job["src"]))  # respeita a orientacao gravada na foto
    ow, oh = im.size
    tem_alfa = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if tem_alfa else "RGB")
    larguras = sorted({min(int(w), ow) for w in job["larguras"]})
    for w in larguras:
        destino = job["modelo"].replace("{w}", str(w))
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        saida = im if w == ow else im.resize((w, max(1, round(oh * w / ow))), Image.LANCZOS)
        saida.save(destino, "WEBP", quality=int(job.get("qualidade", 90)), method=6)
    return {"w": ow, "a": oh, "ls": larguras}


def main():
    jobs = json.load(sys.stdin)
    resultado = []
    for job in jobs:
        try:
            resultado.append(processar(job))
        except Exception as erro:  # imagem quebrada: o gerador mostra qual
            resultado.append({"erro": f"{type(erro).__name__}: {erro}"})
    sys.stdout.write(json.dumps(resultado))


if __name__ == "__main__":
    main()
