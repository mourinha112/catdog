import React from 'react';

/*
 * Ícones de rosto de cachorro e de gato, desenhados à mão para este
 * projeto.
 *
 * Nenhuma biblioteca pronta chegou perto do mockup, então são SVG
 * próprios: silhueta preta preenchida, orelhas caídas no cachorro,
 * orelhas pontudas e bigodes no gato, olhos e focinho em negativo.
 *
 * Os dois usam o mesmo viewBox (64x64), a mesma espessura de traço e o
 * mesmo tamanho de olho e focinho, para terem peso visual igual quando
 * ficam lado a lado.
 *
 * `cor`   — a silhueta (o padrão herda o color do elemento pai)
 * `fundo` — os vãos do rosto: olhos, focinho e boca. Precisa ser a cor da
 *           superfície atrás do ícone. No catálogo os cards são brancos.
 */

const PADRAO = { tamanho: 54, cor: '#111111', fundo: '#FFFFFF' };

export function IconeCachorro({ tamanho = PADRAO.tamanho, cor = PADRAO.cor, fundo = PADRAO.fundo, ...resto }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Cachorro"
      {...resto}
    >
      <g fill={cor}>
        {/* orelhas caídas, presas abaixo da coroa da cabeça */}
        <ellipse cx="13.2" cy="36.5" rx="6.6" ry="12.2" transform="rotate(-17 13.2 36.5)" />
        <ellipse cx="50.8" cy="36.5" rx="6.6" ry="12.2" transform="rotate(17 50.8 36.5)" />
        {/* cabeça */}
        <rect x="17" y="8" width="30" height="40" rx="15" />
      </g>

      <g fill={fundo}>
        <ellipse cx="26" cy="26.5" rx="3.1" ry="3.5" />
        <ellipse cx="38" cy="26.5" rx="3.1" ry="3.5" />
        {/* nariz */}
        <path d="M32 31.8c1.7 0 3.1 1.1 3.1 2.3s-1.4 2.5-3.1 2.5-3.1-1.3-3.1-2.5 1.4-2.3 3.1-2.3Z" />
      </g>

      {/* focinho e sorriso */}
      <g stroke={fundo} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M32 36.6v2.2" />
        <path d="M32 38.8c0 1.9-1.5 3.1-3.2 3.1s-3.2-1.2-3.2-3.1" />
        <path d="M32 38.8c0 1.9 1.5 3.1 3.2 3.1s3.2-1.2 3.2-3.1" />
      </g>
    </svg>
  );
}

export function IconeGato({ tamanho = PADRAO.tamanho, cor = PADRAO.cor, fundo = PADRAO.fundo, ...resto }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Gato"
      {...resto}
    >
      {/* cabeça com as duas orelhas pontudas no mesmo contorno */}
      <path
        fill={cor}
        d="M32 16c-3.1 0-6.1.5-8.8 1.4l-5.6-6.8c-.8-1-2.4-.4-2.4.9v10.3C12.6 24.7 11 28.6 11 32.9 11 41.2 20.4 48 32 48s21-6.8 21-15.1c0-4.3-1.6-8.2-4.2-11.1V11.5c0-1.3-1.6-1.9-2.4-.9l-5.6 6.8C38.1 16.5 35.1 16 32 16Z"
      />

      <g stroke={cor} strokeWidth="2.6" strokeLinecap="round">
        <path d="M13 33.5H2.5M13.8 39.2 3.6 42.6M13.8 27.8 3.6 24.4" />
        <path d="M51 33.5h10.5M50.2 39.2l10.2 3.4M50.2 27.8l10.2-3.4" />
      </g>

      <g fill={fundo}>
        <ellipse cx="25.5" cy="31" rx="3.1" ry="3.5" />
        <ellipse cx="38.5" cy="31" rx="3.1" ry="3.5" />
        {/* nariz */}
        <path d="M32 35.6c1.6 0 2.9 1 2.9 2.2s-1.3 2.3-2.9 2.3-2.9-1.1-2.9-2.3 1.3-2.2 2.9-2.2Z" />
      </g>

      {/* focinho e sorriso */}
      <g stroke={fundo} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M32 40.1v2" />
        <path d="M32 42.1c0 1.8-1.4 2.9-3 2.9s-3-1.1-3-2.9" />
        <path d="M32 42.1c0 1.8 1.4 2.9 3 2.9s3-1.1 3-2.9" />
      </g>
    </svg>
  );
}
