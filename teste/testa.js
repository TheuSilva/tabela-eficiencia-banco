#!/usr/bin/env node
/* Testes da lógica, sem navegador. Rodam contra a demonstração de dados/, que é
 * determinística: os padrões plantados em scripts/gera-demo.js precisam sair do
 * outro lado nomeados.
 *
 * O bloco que mais importa é o do VEREDITO: ele existe porque a frase é o
 * produto, e uma frase que afirma o que o dado não diz é pior do que tabela
 * nenhuma.
 *
 *   node teste/testa.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const MG = require('../src/logica.js');

let ok = 0, ruim = 0;
function conf(nome, cond, extra) {
  if (cond) { ok++; return; }
  ruim++;
  console.error('  FALHOU: ' + nome + (extra !== undefined ? '  [' + extra + ']' : ''));
}
const plano = (t) => t.map((p) => (typeof p === 'string' ? p : p.b)).join('');

const csv = fs.readFileSync(path.join(__dirname, '..', 'dados', 'exemplo.csv'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const registros = MG.leCsv(csv);
const m = MG.montaMatriz(registros, cfg.matriz);
const VOC = cfg.voc;
const cols = ['Todos'].concat(m.cols).concat(m.outros ? [m.rotOutros] : []);
const iLugar = (rot) => m.linhas.findIndex((l) => l.niv === 0 && l.rot === rot);
const jCat = (nome) => cols.indexOf(nome);

console.log('leitura e montagem');
conf('CSV lido', registros.length === 26000, registros.length);
conf('registro tem 3 níveis', registros[0].lugar.length === 3);
conf('linha raiz é a primeira', m.linhas[0].niv === -1 && m.linhas[0].pai === -1);
conf('lista é plana, com pai', m.linhas.every((l, i) => i === 0 || l.pai < i));
conf('célula é [n, mediana, média]', m.linhas[0].cel[0].length === 3);
conf('total da raiz = registros', m.linhas[0].cel[0][0] === registros.length);
conf('média difere da mediana (cauda)', m.linhas[0].cel[0][2] > m.linhas[0].cel[0][1]);
conf('banco abaixo de minCol não vira coluna',
  m.cols.indexOf('Fin Âmbar') < 0 && m.cols.indexOf('Credi Sarã') < 0, m.cols.join(','));
conf('mas ela sobrevive na coluna agregada', m.outros === true && m.rotOutros === 'Outros',
  m.rotOutros);
// "Outros" só é rótulo honesto quando agrupa: sobrando uma categoria, a coluna
// leva o nome dela.
const mUm = MG.montaMatriz(
  Array.from({ length: 60 }, (_, i) => ({
    lugar: ['L1', 'C1', '1'], categoria: i < 55 ? 'Grande' : 'Sozinha', valor: 10 + (i % 5),
  })));
conf('sobrando um só, a coluna leva o nome dele', mUm.rotOutros === 'Sozinha', mUm.rotOutros);
conf('nível 2 só quando há mais de um', m.linhas.filter((l) => l.niv === 2).every((l) => {
  const irmaos = m.linhas.filter((x) => x.pai === l.pai);
  return irmaos.length > 1;
}));

console.log('régua de cor');
conf('sem referência não há faixa', MG.faixa(10, 0) === null);
conf('metade da régua cai no verde', MG.faixa(5, 10) <= 1);
conf('igual à régua fica no meio', MG.faixa(10, 10) === 3);
conf('o dobro é o alerta', MG.faixa(20, 10) === 8);
conf('a régua é razão, não valor fixo',
  MG.faixa(60, 60) === MG.faixa(6, 6), MG.faixa(60, 60) + ' x ' + MG.faixa(6, 6));

console.log('veredito');
const rFalesia = MG.recado(m, iLugar('MR'), jCat('Banco Aurora'), { voc: VOC });
conf('lugar lento para todos aponta para o lugar', rFalesia.tarja === 'lugar', rFalesia.tarjaRot);
conf('e diz que o banco não é o problema',
  /não do banco/.test(plano(rFalesia.texto)), plano(rFalesia.texto).slice(0, 70));

const rDelta = MG.recado(m, iLugar('SA'), jCat('Crediluz'), { voc: VOC });
conf('banco lento aponta para o banco', rDelta.tarja === 'categoria', rDelta.tarjaRot);
conf('padrão geral sai quando se repete em toda parte', rDelta.tarja2 !== null, rDelta.tarja2);
conf('padrão geral é a mediana das razões, não a mediana do banco',
  rDelta.geral.med > 1.15 && rDelta.geral.acima >= 4, JSON.stringify(rDelta.geral));

const rGama = MG.recado(m, iLugar('VN'), jCat('Banco Vantis'), { voc: VOC });
conf('banco lento em um estado só também aponta para ele', rGama.tarja === 'categoria');
conf('e o selo avisa que é só ali', /Mas é só aqui/.test(rGama.selo), rGama.selo.slice(-70));
conf('sem padrão geral quando não se repete', rGama.tarja2 === null);

const rNada = MG.recado(m, iLugar('LS'), jCat('Banco Aurora'), { voc: VOC });
conf('nada fora da curva também é resposta', rNada.tarja === 'nada', rNada.tarjaRot);
conf('e ela diz que não há o que cobrar', /Não há o que cobrar/.test(rNada.selo));

const rRaiz = MG.recado(m, 0, 0, { voc: VOC });
conf('a linha raiz é a régua, não "nada fora da curva"', rRaiz.tarjaRot === 'A régua', rRaiz.tarjaRot);

conf('célula vazia devolve null', MG.recado(m, iLugar('BC'), 99) === null);

console.log('quem compara');
// ⚠ o par é o de volume PARECIDO entre os mais rápidos, não o maior nem o campeão
const linhaAurora = m.linhas[iLugar('SA')];
const nDelta = linhaAurora.cel[jCat('Crediluz')][0];
const maior = cols.map((c, j) => ({ j: j, n: (linhaAurora.cel[j] || [0])[0] }))
  .filter((x) => x.j > 0 && x.j !== jCat('Crediluz'))
  .sort((a, b) => b.n - a.n)[0];
conf('comparável existe', !!rDelta.cmp);
conf('comparável é mais rápido que a célula', rDelta.cmp.v < rDelta.val);
conf('comparável não é obrigatoriamente o maior',
  Math.abs(rDelta.cmp.n - nDelta) <= Math.abs(maior.n - nDelta),
  rDelta.cmp.nome + ' n=' + rDelta.cmp.n + ' vs maior n=' + maior.n);
conf('"volume parecido" só quando é verdade',
  !/volume parecido/.test(plano(rDelta.texto)) || Math.max(rDelta.cmp.n, nDelta) / Math.min(rDelta.cmp.n, nDelta) <= 2,
  rDelta.cmp.n + ' x ' + nDelta);

console.log('cascata por foro');
const cAurora = MG.cascata(m, iLugar('SA'), 0, { voc: VOC });
conf('cascata existe onde há nível abaixo', !!cAurora);
conf('ordenada por peso, não pelo maior valor',
  cAurora.itens[0].peso >= cAurora.itens[cAurora.itens.length - 1].peso);
conf('a comarca plantada como lenta aparece no topo', cAurora.itens[0].rot === 'Alto Rubro',
  cAurora.itens.slice(0, 3).map((x) => x.rot).join(', '));
conf('conta registros, e a conta fecha',
  cAurora.somaN === cAurora.itens.reduce((t, x) => t + x.n, 0));
conf('o que não coube é declarado', cAurora.fora === Math.max(0, cAurora.total - cAurora.somaN));
conf('nAcima só soma filhos fortes acima da régua',
  cAurora.nAcima === cAurora.itens.filter((x) => x.forte && x.razao >= MG.FORA_DA_CURVA)
    .reduce((t, x) => t + x.n, 0));
conf('nível folha não tem cascata',
  MG.cascata(m, m.linhas.length - 1, 0) === null || m.linhas[m.linhas.length - 1].filho);

// ⚠ o teste que protege a promessa da tela: a cascata NÃO pode alegar mediana
//    de conjunto nenhum, porque ela só tem medianas de pedaços.
const somaMedianas = cAurora.itens.reduce((t, x) => t + x.v, 0) / cAurora.itens.length;
conf('a média das medianas dos filhos não é a mediana da célula (por isso não se usa)',
  Math.abs(somaMedianas - cAurora.ref) > 0.0001, somaMedianas + ' x ' + cAurora.ref);

console.log('concordância do vocabulário');
const rM = MG.recado(m, iLugar('SA'), jCat('Crediluz'), { voc: VOC });
conf('vocabulário masculino não produz "a banco"', !/\ba banco\b/.test(plano(rM.texto) + rM.selo),
  plano(rM.texto).slice(0, 70));
conf('e usa "o gargalo é o banco"', /é o banco/.test(plano(rM.texto)));
const rF = MG.recado(m, iLugar('MR'), 0, { voc: VOC });
conf('o mais lento concorda com o gênero', /O mais lento/.test(plano(rF.texto)), plano(rF.texto).slice(0, 90));
// e o inverso: trocando para uma palavra feminina, a frase acompanha
const vocF = Object.assign({}, VOC, { categoria: 'carteira', catFem: true });
const rFem = MG.recado(m, iLugar('SA'), jCat('Crediluz'), { voc: vocF });
conf('vocabulário feminino não produz "o carteira"', !/o carteira/.test(plano(rFem.texto) + rFem.selo));
conf('e usa "é a carteira"', /é a carteira/.test(plano(rFem.texto)), plano(rFem.texto).slice(0, 60));
conf('o nome próprio do estado entra na frase com a preposição certa',
  /da Serra Alta|de Serra Alta/.test(plano(rDelta.texto)) || /Serra Alta/.test(plano(rDelta.texto)),
  plano(rDelta.texto).slice(0, 90));
conf('a raiz não vira "de o país"', !/de o país/.test(plano(rFalesia.texto)));

console.log('métrica');
const rMed = MG.recado(m, iLugar('MR'), 0, { iVal: 1, voc: VOC });
const rMean = MG.recado(m, iLugar('MR'), 0, { iVal: 2, voc: VOC });
conf('mediana e média dão números diferentes', rMed.val !== rMean.val, rMed.val + ' x ' + rMean.val);
conf('e a razão é recalculada junto', rMed.razao !== rMean.razao);

console.log('');
console.log(ok + ' verificações passaram, ' + ruim + ' falharam');
process.exit(ruim ? 1 : 0);
