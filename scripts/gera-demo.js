#!/usr/bin/env node
/* Gera a demonstração: dados INVENTADOS, no formato do caso real que originou o
 * projeto (tempo até uma decisão judicial, por estado, comarca, vara e banco).
 *
 * ⚠⚠ NENHUM NOME AQUI EXISTE. Estados, comarcas e bancos são fictícios, e as
 *    siglas de estado (SA, VN, CV...) foram escolhidas justamente por NÃO serem
 *    UFs brasileiras: ninguém pode ler esta demo como afirmação sobre um lugar
 *    ou uma instituição de verdade.
 * ⚠ NADA DE Math.random, e nada de data na tela: o CSV é commitado e a página é
 *   gerada uma vez. Esta demonstração não precisa ser atualizada nunca, e mesma
 *   semente produz arquivo idêntico, então o diff do git não muda sozinho.
 * ⚠ LCG em 32 bits com Math.imul. A versão ingênua (semente * 1103515245 + ...)
 *   estoura 2^53 em ponto flutuante e o sorteio degenera: numa primeira versão
 *   um banco de peso 0,06 não saiu NENHUMA vez e outro saiu quatro vezes mais do
 *   que devia. Gerador de demonstração também precisa estar certo, senão a demo
 *   mostra um comportamento que o código não tem.
 *
 *   node scripts/gera-demo.js [saida.csv] [quantidade]
 */
'use strict';
const fs = require('fs');
const path = require('path');

let semente = 20260909 >>> 0;
const rnd = () => {
  semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
  return semente / 4294967296;
};
const entre = (a, b) => a + rnd() * (b - a);
const inteiro = (a, b) => Math.floor(entre(a, b + 1));
const escolhe = (a) => a[Math.floor(rnd() * a.length)];

// Estados fictícios. A sigla é o rótulo da tabela e o nome por extenso vive no
// config.json, que é como a frase sai dizendo "do Monte Rubro" em vez de "de MR".
const ESTADOS = [
  { sigla: 'SA', peso: 26, base: 12 },   // Serra Alta
  { sigla: 'VN', peso: 20, base: 11 },   // Vale do Norte
  { sigla: 'CV', peso: 16, base: 14 },   // Campo Verde
  { sigla: 'LS', peso: 13, base: 10 },   // Litoral Sul
  { sigla: 'PN', peso: 10, base: 13 },   // Planalto Norte
  { sigla: 'MR', peso: 8, base: 48 },    // Monte Rubro: o estado lento para todo mundo
  { sigla: 'TB', peso: 7, base: 12 },    // Terra Boa
  { sigla: 'BC', peso: 5, base: 9 },     // Baía Clara
  { sigla: 'IL', peso: 4, base: 15 },    // Ilha Longa
  { sigla: 'SD', peso: 3, base: 11 },    // Sertão Dourado
];
const COMARCAS = ['Porto Nobre', 'Vila Aurora', 'Santa Elis', 'Cruzeiro Novo', 'Alto Rubro',
  'Barra Limpa', 'Serra Nova', 'Lagoa Azul', 'Pedra Fria', 'Monte Claro do Vale'];

// Bancos fictícios. Nomes escolhidos para não lembrar instituição existente.
const BANCOS = [
  { nome: 'Banco Aurora', peso: 34, fator: 1.0 },
  { nome: 'Banco Meridiano', peso: 22, fator: 1.05 },
  { nome: 'Banco Vantis', peso: 15, fator: 0.75 },
  { nome: 'Crediluz', peso: 12, fator: 2.1 },        // o banco lento em toda parte
  { nome: 'Banco Solaris', peso: 9, fator: 0.9 },
  { nome: 'Norvel Crédito', peso: 5, fator: 1.1 },
  { nome: 'Banco Cordilheira', peso: 2, fator: 1.0 },
  // estes dois existem para a demo exercitar a coluna "Outros": volume abaixo do
  // mínimo para coluna própria, mas suficiente para a coluna agregada.
  { nome: 'Fin Âmbar', peso: 0.06, fator: 1.2 },
  { nome: 'Credi Sarã', peso: 0.05, fator: 0.9 },
];

const sorteiaPor = (lista) => {
  const total = lista.reduce((t, x) => t + x.peso, 0);
  let r = rnd() * total;
  for (const x of lista) { r -= x.peso; if (r <= 0) return x; }
  return lista[lista.length - 1];
};

const N = Number(process.argv[3] || 26000);
const saida = process.argv[2] || path.join(__dirname, '..', 'dados', 'exemplo.csv');
const linhas = ['NIVEL1;NIVEL2;NIVEL3;CATEGORIA;VALOR'];

for (let i = 0; i < N; i++) {
  const uf = sorteiaPor(ESTADOS);
  const banco = sorteiaPor(BANCOS);
  // a capital concentra, como no dado de verdade
  const comarca = rnd() < 0.55 ? COMARCAS[0] : escolhe(COMARCAS);
  const vara = 'Vara ' + inteiro(1, 6);

  let base = uf.base * banco.fator;
  // dentro de Serra Alta, uma comarca sozinha segura o atraso do estado
  if (uf.sigla === 'SA' && comarca === 'Alto Rubro') base *= 3.4;
  // Banco Vantis vai mal SÓ no Vale do Norte, e em nenhum outro lugar
  if (uf.sigla === 'VN' && banco.nome === 'Banco Vantis') base *= 2.6;

  // cauda longa à direita, como todo tempo de processo: a maioria sai rápido e
  // uma minoria demora muito. É ela que separa média de mediana na tela.
  const r = rnd();
  const mult = r > 0.97 ? entre(6, 24) : r > 0.85 ? entre(2, 4) : entre(0.55, 1.5);
  const valor = Math.max(1, Math.round(base * mult));
  linhas.push([uf.sigla, comarca, vara, banco.nome, valor].join(';'));
}

fs.writeFileSync(saida, linhas.join('\n') + '\n', 'utf8');
console.log('gravado', saida, '|', N, 'registros');
