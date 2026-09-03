import React from 'react';

/*
 * Ícones de cachorro e de gato do seletor de espécie.
 *
 * São os ícones do mockup aprovado, recortados da própria arte e salvos
 * em public/ com fundo transparente. Tentei antes reproduzi-los em SVG e
 * em biblioteca (Phosphor), e nenhum dos dois chegou perto — então o
 * caminho certo era usar o desenho original.
 *
 * Os vãos do rosto (olhos, focinho, boca) continuam brancos na imagem, e
 * não transparentes: o recorte tirou só o fundo de fora. Isso é o que
 * queremos aqui, já que os cards são brancos.
 *
 * Para trocar a arte depois, basta substituir os dois arquivos em public/
 * mantendo os nomes.
 */

const TAMANHO_PADRAO = 54;

export function IconeCachorro({ tamanho = TAMANHO_PADRAO, ...resto }) {
  return (
    <img
      src="/icone-cachorro.png"
      width={tamanho}
      height={tamanho}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{ display: 'block', objectFit: 'contain' }}
      {...resto}
    />
  );
}

export function IconeGato({ tamanho = TAMANHO_PADRAO, ...resto }) {
  return (
    <img
      src="/icone-gato.png"
      width={tamanho}
      height={tamanho}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{ display: 'block', objectFit: 'contain' }}
      {...resto}
    />
  );
}
