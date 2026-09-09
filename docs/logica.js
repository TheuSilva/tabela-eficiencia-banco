/* tabela-eficiencia-banco — a lógica, sem navegador e sem dependências.
 *
 * Roda igual no Node (require) e no navegador (window.MG). Aqui não há nada de
 * React nem de DOM de propósito: é este arquivo que a suíte de testes exercita,
 * e é dele que sai tudo o que a tela afirma.
 *
 * O caminho é: registros → montaMatriz → { faixa, recado, cascata }.
 */
(function (raiz) {
  'use strict';

  // --------------------------------------------------------------------------
  // Régua de cor: RELATIVA à referência da própria linha, nunca uma tabela fixa
  // de valores. É o que faz a matriz responder "quem está fora do ritmo DESTE
  // lugar" em vez de "quem passou de N dias", que é outra pergunta e some com o
  // contraste onde o lugar inteiro é lento.
  // --------------------------------------------------------------------------
  var CORTES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75];
  var FORA_DA_CURVA = 1.3;   // a mesma razão que pinta a célula e que dispara a frase
  var MIN_COMPARA = 8;       // volume mínimo para uma categoria entrar na comparação
  var NAC = { minLugares: 4, razao: 1.15, pct: 0.35 };

  function faixa(v, ref) {
    if (v === null || v === undefined || !(ref > 0)) return null;
    var r = v / ref;
    if (r >= 2) return 8;
    for (var i = 0; i < CORTES.length; i++) if (r <= CORTES[i]) return i;
    return 7;
  }

  function mediana(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), i = s.length >> 1;
    return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
  }
  function media(a) {
    if (!a.length) return null;
    var t = 0;
    for (var i = 0; i < a.length; i++) t += a[i];
    return t / a.length;
  }
  var arred = function (v) { return v === null ? null : Math.round(v * 10) / 10; };
  var prox = function (a, b) { return Math.max(a, b) / Math.min(a, b); };

  // --------------------------------------------------------------------------
  // montaMatriz — de registros para a estrutura que a tela consome.
  //
  // Um registro é { lugar: ['SP', 'CAMPINAS', '3'], categoria: 'Alfa', valor: 12 }.
  // O array `lugar` é a hierarquia, de fora para dentro, e pode ter 1 a 3 níveis.
  //
  // ⚠ A saída é uma lista PLANA com `niv` e `pai`, não uma árvore aninhada: o
  //   cliente monta o recolhimento sozinho e o JSON fica pequeno.
  // ⚠ Cada célula é [n, mediana, média] e o cliente INDEXA POR POSIÇÃO. Quem
  //   acrescentar métrica põe no fim.
  // ⚠ Nível abaixo de `minN` não vira linha: uma comarca de 1 caso não sustenta
  //   leitura nenhuma, e listá-la só empurra ruído para cima do usuário. O que
  //   ficou de fora vai em `resto`, para a tela poder dizer que não é o universo.
  // --------------------------------------------------------------------------
  function montaMatriz(registros, opc) {
    opc = opc || {};
    var minN = opc.minN || 5;
    var topCols = opc.topCols || 10;
    var minCol = opc.minCol || 20;
    var rotTotal = opc.rotTotal || 'TOTAL';
    var vazio = { cols: [], linhas: [], outros: false, minN: minN };
    if (!registros || !registros.length) return vazio;

    var cont = {};
    registros.forEach(function (r) { cont[r.categoria] = (cont[r.categoria] || 0) + 1; });
    var cols = Object.keys(cont)
      .sort(function (a, b) { return cont[b] - cont[a] || a.localeCompare(b); })
      .slice(0, topCols)
      .filter(function (c) { return cont[c] >= minCol; });

    var fora = Object.keys(cont).filter(function (c) { return cols.indexOf(c) < 0; });
    var nOutros = fora.reduce(function (t, c) { return t + cont[c]; }, 0);
    var outros = nOutros >= minN;
    // "Outros" só é rótulo honesto quando AGRUPA: sobrando uma categoria só, a
    // coluna leva o nome dela.
    var rotOutros = fora.length === 1 ? fora[0] : 'Outros';
    var ordem = cols.concat(outros ? ['__outros__'] : []);
    var colDe = function (c) { return cols.indexOf(c) >= 0 ? c : '__outros__'; };

    function celulas(g) {
      var todos = g.map(function (r) { return r.valor; });
      var out = [[todos.length, arred(mediana(todos)), arred(media(todos))]];
      ordem.forEach(function (c) {
        var v = g.filter(function (r) { return colDe(r.categoria) === c; })
                 .map(function (r) { return r.valor; });
        out.push(v.length ? [v.length, arred(mediana(v)), arred(media(v))] : null);
      });
      return out;
    }

    function agrupa(lista, nivel) {
      var m = {};
      lista.forEach(function (r) {
        var k = r.lugar[nivel];
        if (k === undefined || k === null || k === '') return;
        (m[k] = m[k] || []).push(r);
      });
      return Object.keys(m)
        .map(function (k) { return { rot: k, itens: m[k] }; })
        .sort(function (a, b) { return b.itens.length - a.itens.length || a.rot.localeCompare(b.rot); });
    }

    var linhas = [{ niv: -1, rot: rotTotal, pai: -1, cel: celulas(registros), filho: true }];
    agrupa(registros, 0).forEach(function (g0) {
      var i0 = linhas.length;
      var g1 = agrupa(g0.itens, 1).filter(function (x) { return x.itens.length >= minN; });
      var total1 = new Set(g0.itens.map(function (r) { return r.lugar[1]; })).size;
      linhas.push({
        niv: 0, rot: g0.rot, pai: 0, cel: celulas(g0.itens),
        filho: g1.length > 0, resto: Math.max(0, total1 - g1.length),
      });
      g1.forEach(function (gc) {
        var ic = linhas.length;
        var g2 = agrupa(gc.itens, 2).filter(function (x) { return x.itens.length >= minN; });
        var multi = new Set(gc.itens.map(function (r) { return r.lugar[2]; })).size > 1 && g2.length > 1;
        linhas.push({ niv: 1, rot: gc.rot, pai: i0, cel: celulas(gc.itens), filho: multi });
        if (multi) {
          g2.forEach(function (gv) {
            linhas.push({ niv: 2, rot: gv.rot, pai: ic, cel: celulas(gv.itens), filho: false });
          });
        }
      });
    });
    return { cols: cols, outros: outros, rotOutros: rotOutros, linhas: linhas, minN: minN };
  }

  // --------------------------------------------------------------------------
  // Vocabulário. Existe por uma razão só: português tem gênero e número, e frase
  // montada com concatenação vira "todas as bancos" no primeiro dia em que
  // alguém troca as palavras.
  // --------------------------------------------------------------------------
  var VOC_PADRAO = {
    total: 'o total',            // como se chama a linha raiz numa frase
    totalArt: 'O total',
    totalDe: 'do total',         // "1,2x os 14 DO TOTAL" -- nao "de o total"
    totalEm: 'no total',
    unidade: 'dias',
    // ⚠ Estes quatro existem SO' para a concordancia nao quebrar quando alguem
    //   trocar o vocabulario. Concatenar "a " + categoria produz "a banco" no
    //   primeiro dia, e a tela passa a parecer escrita por maquina.
    categoria: 'categoria',
    catFem: true,
    // um por nível da hierarquia, de fora para dentro
    niveis: [
      { nome: 'estado', art: 'o', plural: 'estados', fem: false },
      { nome: 'comarca', art: 'a', plural: 'comarcas', fem: true },
      { nome: 'vara', art: 'a', plural: 'varas', fem: true },
    ],
    // nome próprio por rótulo, quando existir: { SP: ['São Paulo', 'de'] }
    nomes: {},
  };

  function vocDe(voc) {
    var v = {};
    Object.keys(VOC_PADRAO).forEach(function (k) { v[k] = VOC_PADRAO[k]; });
    Object.keys(voc || {}).forEach(function (k) { v[k] = voc[k]; });
    return v;
  }

  // Como o lugar é dito numa frase. Quando o rótulo tem nome próprio no
  // vocabulário ("SP" → "São Paulo", "de"), usa ele com a preposição certa;
  // senão fica com o rótulo cru, que é o caso de nome de comarca.
  function lugarInfo(linha, voc) {
    if (!linha || linha.niv === -1) {
      return {
        nome: voc.total, de: voc.totalDe || ('de ' + voc.total),
        em: voc.totalEm || ('em ' + voc.total), art: voc.totalArt,
        inteiro: voc.totalArt + ' inteiro', nivel: voc.total, mesmo: 'no mesmo conjunto',
        proprio: 'do conjunto', resp: 'o nível de baixo',
      };
    }
    var n = voc.niveis[Math.min(linha.niv, voc.niveis.length - 1)];
    var prop = voc.nomes && voc.nomes[linha.rot];
    var nome = prop ? prop[0] : linha.rot;
    var pre = prop ? prop[1] : 'de';
    var em = pre === 'do' ? 'no ' + nome : pre === 'da' ? 'na ' + nome : 'em ' + nome;
    var art = prop ? (pre === 'do' ? 'O ' : pre === 'da' ? 'A ' : '') + nome : nome;
    var abaixo = voc.niveis[Math.min(linha.niv + 1, voc.niveis.length - 1)];
    return {
      nome: nome, de: pre + ' ' + nome, em: em, art: art,
      inteiro: (n.fem ? 'A ' : 'O ') + n.nome + (n.fem ? ' inteira' : ' inteiro'),
      nivel: n.art + ' ' + n.nome,
      mesmo: (n.fem ? 'na mesma ' : 'no mesmo ') + n.nome,
      proprio: (n.fem ? 'da própria ' : 'do próprio ') + n.nome,
      resp: abaixo.art + ' ' + abaixo.nome,
    };
  }

  var num = function (v, casas) {
    if (v === null || v === undefined) return '–';
    var f = Math.pow(10, casas === undefined ? 1 : casas);
    return String(Math.round(v * f) / f).replace('.', ',');
  };
  var qtd = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var B = function (t) { return { b: t }; };

  // --------------------------------------------------------------------------
  // recado — a leitura de uma célula, em uma frase.
  //
  // Devolve pedaços (string ou {b}) para o cliente decidir como destacar. A
  // régua NÃO é nova: é a mesma razão que colore a célula, só que escrita.
  //
  // ⚠ Quem compara é a categoria de VOLUME PARECIDO entre as mais rápidas, não
  //   a maior nem a campeã: comparar 42 com 2.400 convida à resposta pronta
  //   ("eles têm escala") e a conversa morre ali.
  // ⚠ A prova vem do nível de BAIXO e só CONFIRMA o que a razão já disse. Deixar
  //   um filho disparar o veredito acusa a categoria errada assim que aparece um
  //   lugar pequeno com contraste grande.
  // ⚠ "Nada fora da curva" também é resposta, e é a que evita cobrança sem
  //   motivo. A função nunca fica em silêncio quando há célula.
  // --------------------------------------------------------------------------
  function recado(m, i, j, opc) {
    opc = opc || {};
    var iVal = opc.iVal === undefined ? 1 : opc.iVal;   // 1 mediana, 2 média
    var voc = vocDe(opc.voc);
    var minCompara = opc.minCompara || MIN_COMPARA;
    var linha = m.linhas[i];
    if (!linha) return null;
    var cel = linha.cel[j];
    if (!cel) return null;

    var cols = ['Todos'].concat(m.cols || []).concat(m.outros ? [m.rotOutros || 'Outros'] : []);
    var filhos = indexaFilhos(m);
    var n = cel[0], val = cel[iVal];
    var li = lugarInfo(linha, voc);
    // as formas com genero, resolvidas uma vez
    var g = {
      a: voc.catFem ? 'a' : 'o', A: voc.catFem ? 'A' : 'O',
      da: voc.catFem ? 'da' : 'do',
      lenta: voc.catFem ? 'A mais lenta' : 'O mais lento',
      rapida: voc.catFem ? 'a mais rápida' : 'o mais rápido',
      nenhuma: voc.catFem ? 'Nenhuma outra' : 'Nenhum outro',
      minhaMaisRapida: voc.catFem ? 'a mais rápida' : 'o mais rápido',
      demais: voc.catFem ? 'as demais' : 'os demais',
      outras: voc.catFem ? 'as outras' : 'os outros',
    };
    var cat = cols[j];
    var ehTodos = j === 0;
    var ehRaiz = ehTodos && linha.niv === -1;
    var valLinha = (linha.cel[0] || [])[iVal];
    var pai = (linha.pai >= 0 && linha.pai !== i) ? m.linhas[linha.pai] : null;
    var valPai = pai ? (pai.cel[0] || [])[iVal] : null;
    var pi = pai ? lugarInfo(pai, voc) : null;

    var razaoLugar = valPai > 0 ? valLinha / valPai : 1;
    var razaoCat = (!ehTodos && valLinha > 0) ? val / valLinha : 1;
    var apontaLugar = razaoLugar >= FORA_DA_CURVA;
    var apontaCat = !ehTodos && n >= minCompara && razaoCat >= FORA_DA_CURVA;

    var rk = [];
    for (var k = 1; k < cols.length; k++) {
      var c = linha.cel[k];
      if (c && c[0] >= minCompara && c[iVal] >= 0) {
        rk.push({ j: k, nome: cols[k], n: c[0], v: c[iVal] });
      }
    }
    rk.sort(function (a, b) { return b.v - a.v; });

    var cand = rk.filter(function (x) { return x.j !== j && x.v < val; });
    var cmp = cand.length ? cand.slice().sort(function (a, b) {
      return prox(a.n, n) - prox(b.n, n);
    })[0] : null;
    var pct = (cmp && val > 0) ? Math.round(100 * (val - cmp.v) / val) : null;
    var parecido = cmp ? prox(cmp.n, n) <= 2 : false;

    var outros2 = rk.filter(function (x) { return x.j !== j; })
      .slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 2);
    var lista = outros2.map(function (x) { return x.nome + ' ' + num(x.v); }).join(' e ');
    var souMaisRapido = !ehTodos && rk.length > 1 && rk[rk.length - 1].j === j;

    var prova = null;
    if (!ehTodos && filhos[i]) {
      filhos[i].forEach(function (fi) {
        var f = m.linhas[fi], cf = f.cel[j];
        if (!cf || cf[0] < minCompara || !(cf[iVal] > 0)) return;
        var melhor = null;
        for (var k2 = 1; k2 < cols.length; k2++) {
          if (k2 === j) continue;
          var co = f.cel[k2];
          if (!co || co[0] < minCompara) continue;
          if (!melhor || co[iVal] < melhor.v) melhor = { nome: cols[k2], n: co[0], v: co[iVal] };
        }
        if (!melhor) return;
        var razao = melhor.v > 0 ? cf[iVal] / melhor.v : Infinity;
        if (razao < FORA_DA_CURVA) return;
        if (!prova || razao > prova.razao) {
          prova = { rot: f.rot, n: cf[0], v: cf[iVal], outro: melhor, razao: razao };
        }
      });
    }

    // ⚠ Padrão geral da categoria NÃO é a mediana dela no total: categoria
    //   concentrada em lugar lento pareceria lenta sem ser. É a mediana das
    //   RAZÕES contra cada lugar. Entra JUNTO do veredito, não no lugar dele.
    var geral = null;
    if (!ehTodos) {
      var razoes = [];
      m.linhas.forEach(function (x) {
        if (x.niv !== 0) return;
        var cc = x.cel[j], t = (x.cel[0] || [])[iVal];
        if (!cc || cc[0] < minCompara || !(t > 0)) return;
        razoes.push(cc[iVal] / t);
      });
      if (razoes.length >= NAC.minLugares) {
        var acima = razoes.filter(function (r) { return r >= FORA_DA_CURVA; }).length;
        var med = mediana(razoes);
        geral = {
          lugares: razoes.length, acima: acima, med: med,
          vale: med >= NAC.razao && acima / razoes.length >= NAC.pct,
        };
      }
    }

    var tarja = (apontaCat && apontaLugar) ? 'dois'
      : apontaCat ? 'categoria' : apontaLugar ? 'lugar' : 'nada';
    var tarjaRot = tarja === 'dois' ? 'Aponta para os dois'
      : tarja === 'categoria' ? 'Aponta para ' + g.a + ' ' + voc.categoria + ', aqui'
        : tarja === 'lugar' ? 'Aponta para ' + li.nivel
          : ehRaiz ? 'A régua' : 'Nada fora da curva';

    var contraPai = pi ? ', ' + num(razaoLugar) + '× os ' + num(valPai) + ' ' + pi.de : '';
    var u = ' ' + voc.unidade;
    var texto = [], selo = '';

    if (apontaLugar && !apontaCat && !ehTodos && n >= minCompara) {
      texto = [
        B('A lentidão é ' + li.de + ', não ' + g.da + ' ' + voc.categoria + '.'), ' ',
        cat + ' leva ', B(num(val) + u), ' aqui e ',
        souMaisRapido ? 'ainda assim é ' + g.minhaMaisRapida + ' daqui'
          : g.demais + ' também não conseguem andar',
        lista ? ': ' + lista + u + '. ' : '. ',
        li.inteiro + ' leva ', B(num(valLinha) + u), contraPai + '.',
      ];
      selo = 'Cobrar ' + g.a + ' ' + voc.categoria + ' não muda esse número. Quem responde por ele é '
        + li.resp + '.';
    } else if (apontaCat && cmp) {
      texto = [
        B(apontaLugar ? g.A + ' ' + voc.categoria + ' piora um lugar que já é lento.'
          : 'O gargalo é ' + g.a + ' ' + voc.categoria + ', não o lugar.'), ' ',
        cat + ' leva ', B(num(val) + u), ' em ' + qtd(n) + ' registros ' + li.em + '. ',
        cmp.nome + (parecido ? ', com volume parecido (' + qtd(cmp.n) + ')'
          : ', com ' + qtd(cmp.n) + ' registros') + ', resolve em ', B(num(cmp.v)), ': ',
        B(pct + '% mais rápido'), ', ' + li.mesmo + ', que leva ', B(num(valLinha) + u),
        apontaLugar ? contraPai + '.' : '.',
        prova ? ' Em ' + prova.rot + ' a diferença se repete: ' + qtd(prova.n)
          + ' registros de ' + cat + ' em ' : '',
        prova ? B(num(prova.v) + u) : '',
        prova ? ' contra ' + qtd(prova.outro.n) + ' de ' + prova.outro.nome + ' em ' : '',
        prova ? B(num(prova.outro.v)) : '', prova ? '.' : '',
      ];
      selo = prova
        ? (linha.niv === -1
          ? 'O contraste não é de um lugar só: ele reaparece dentro de ' + prova.rot + '.'
          : 'Mesm' + (voc.niveis[Math.min(linha.niv, voc.niveis.length - 1)].fem ? 'a ' : 'o ')
            + voc.niveis[Math.min(linha.niv, voc.niveis.length - 1)].nome
            + ', mesmas condições. Aqui a diferença não vem do lugar.')
        : 'Nenhum nível abaixo tem os dois lados com ' + minCompara + '+ registros, então isto '
          + 'ainda pode ser mistura de lugar, e não ' + g.a + ' ' + voc.categoria + '.';
    } else if (apontaCat) {
      texto = [
        B('O gargalo é ' + g.a + ' ' + voc.categoria + ', não o lugar.'), ' ',
        cat + ' leva ', B(num(val) + u), ' em ' + qtd(n) + ' registros ' + li.em + ', ',
        B(num(razaoCat) + '×'), ' a régua ' + li.proprio + ' (' + num(valLinha) + u + ').',
      ];
      selo = g.nenhuma + ' ' + voc.categoria + ' daqui anda mais rápido com volume que dê para '
        + 'comparar, então a régua é ' + li.proprio.replace('do ', 'o ').replace('da ', 'a ') + '.';
    } else if (apontaLugar) {
      texto = [
        B(linha.niv >= 1 ? 'Em ' + li.nome + ' o problema é o lugar, não ' + g.a + ' ' + voc.categoria + '.'
          : li.art + ' é lento para todo mundo.'), ' ',
        B(num(valLinha) + u), pi ? ' contra ' + num(valPai) + ' ' + pi.de + ', '
          + num(razaoLugar) + '× mais.' : '.',
        rk.length >= 2 ? ' ' + g.lenta + ' é ' + rk[0].nome + ', com ' + num(rk[0].v) + u + ' em '
          + qtd(rk[0].n) + ' registros; ' + g.rapida + ', ' + rk[rk.length - 1].nome + ', com '
          + num(rk[rk.length - 1].v) + '.' : '',
        (!ehTodos && n < minCompara) ? ' ' + cat + ' tem ' + qtd(n) + ' registro(s) aqui, '
          + 'pouco para comparar com ' + g.outras + '.' : '',
      ];
      selo = 'O que está lento é o lugar, não ' + g.a + ' ' + voc.categoria + '. É com ' + li.resp
        + ' que se resolve.';
    } else if (!ehTodos) {
      texto = [
        B('Nada fora da curva aqui.'), ' ',
        cat + ' leva ', B(num(val) + u), ' ' + li.em + ', ' + num(razaoCat) + '× a régua '
        + li.proprio + ' (' + num(valLinha) + u + ')',
        pi ? ', e ' + li.nome + ' anda em ' + num(razaoLugar) + '× a régua ' + pi.de + '.' : '.',
      ];
      selo = 'Nem ' + g.a + ' ' + voc.categoria + ' nem o lugar estão fora da curva. Não há o que cobrar '
        + 'nesta célula.';
    } else if (ehRaiz) {
      texto = [
        B('Esta é a régua.'), ' ', B(num(valLinha) + u), ' em ' + qtd(n) + ' registros. ',
        rk.length >= 2 ? g.lenta + ' é ' + rk[0].nome + ', com ' + num(rk[0].v) + u + ' em '
          + qtd(rk[0].n) + ' registros; ' + g.rapida + ', ' + rk[rk.length - 1].nome + ', com '
          + num(rk[rk.length - 1].v) + '.' : '',
      ];
      selo = 'É com este número que cada linha da tabela é comparada.';
    } else {
      texto = [
        B('Nada fora da curva ' + li.em + '.'), ' ',
        rk.length >= 2 ? g.lenta + ' é ' + rk[0].nome + ', com ' + num(rk[0].v) + u + '; ' + g.rapida
          + ', ' + rk[rk.length - 1].nome + ', com ' + num(rk[rk.length - 1].v) + '. ' : '',
        li.inteiro + ' leva ', B(num(valLinha) + u), contraPai + '.',
      ];
      selo = 'O lugar acompanha o nível de cima. Não há lugar nem ' + voc.categoria
        + ' fora da curva aqui.';
    }

    if (geral && geral.vale) {
      selo += (selo ? ' ' : '') + 'E não é só aqui: ' + cat + ' está acima da curva em '
        + geral.acima + ' dos ' + geral.lugares + ' lugares onde tem volume, com razão mediana de '
        + num(geral.med) + '× a régua de cada um.';
    } else if (geral && apontaCat) {
      selo += (selo ? ' ' : '') + 'Mas é só aqui: nos ' + geral.lugares + ' lugares onde ' + cat
        + ' tem volume, a razão mediana contra o lugar é ' + num(geral.med) + '×.';
    }

    return {
      tarja: tarja, tarjaRot: tarjaRot,
      tarja2: (geral && geral.vale) ? 'Padrão geral ' + g.da + ' ' + voc.categoria : null,
      texto: texto.filter(function (x) { return x !== ''; }), selo: selo,
      lugar: linha.rot, categoria: cat, n: n, val: val, valLinha: valLinha,
      razao: ehTodos ? razaoLugar : razaoCat,
      refDe: ehTodos ? (pi ? pi.de : null) : li.de,
      magro: n < 20, geral: geral, prova: prova, cmp: cmp,
    };
  }

  // --------------------------------------------------------------------------
  // cascata — onde, dentro deste lugar, o número mora.
  //
  // ⚠⚠ NÃO RECALCULA MEDIANA DE NADA. A pergunta natural ("quanto cairia sem os
  //    piores") exige os registros, não as medianas: média de medianas não é
  //    mediana. O que sai daqui é CONTAGEM DE REGISTROS em filho acima da régua,
  //    que é honesto com o que a matriz guarda.
  // ⚠ A ordem é por PESO = n × (quanto passa da régua). Não é o mais lento (pode
  //    ter 3 registros) nem o maior: é quem puxa ESTE número.
  // --------------------------------------------------------------------------
  function cascata(m, i, j, opc) {
    opc = opc || {};
    var iVal = opc.iVal === undefined ? 1 : opc.iVal;
    var voc = vocDe(opc.voc);
    var minCel = opc.minCel || m.minN || 5;
    var filhos = indexaFilhos(m);
    var fs = filhos[i] || [];
    if (!fs.length) return null;
    var linha = m.linhas[i], cel = linha.cel[j];
    if (!cel) return null;
    var ref = cel[iVal], total = cel[0];

    var itens = [];
    fs.forEach(function (fi) {
      var c = m.linhas[fi].cel[j];
      if (!c || !c[0]) return;
      itens.push({
        i: fi, rot: m.linhas[fi].rot, n: c[0], v: c[iVal],
        razao: ref > 0 ? c[iVal] / ref : null, forte: c[0] >= minCel,
      });
    });
    if (!itens.length) return null;
    itens.forEach(function (x) {
      x.peso = (x.forte && ref > 0) ? x.n * Math.max(0, x.v - ref) : 0;
    });
    itens.sort(function (a, b) { return (b.peso - a.peso) || (b.n - a.n); });

    var somaN = itens.reduce(function (t, x) { return t + x.n; }, 0);
    var acima = itens.filter(function (x) { return x.forte && x.razao >= FORA_DA_CURVA; });
    var nAcima = acima.reduce(function (t, x) { return t + x.n; }, 0);
    var nivFilho = m.linhas[fs[0]].niv;
    var nv = voc.niveis[Math.min(nivFilho, voc.niveis.length - 1)];

    return {
      itens: itens, ref: ref, total: total, somaN: somaN,
      acima: acima.length, nAcima: nAcima,
      pct: somaN ? Math.round(100 * nAcima / somaN) : 0,
      concentrado: somaN ? (100 * nAcima / somaN) >= 40 : false,
      rot: nv.plural, rot1: nv.nome, fem: nv.fem,
      fora: Math.max(0, total - somaN), resto: linha.resto || 0,
    };
  }

  function indexaFilhos(m) {
    if (m.__filhos) return m.__filhos;
    var f = {};
    (m.linhas || []).forEach(function (l, i) {
      if (i === 0) return;
      (f[l.pai] = f[l.pai] || []).push(i);
    });
    try { Object.defineProperty(m, '__filhos', { value: f, enumerable: false }); } catch (e) { }
    return f;
  }

  // --------------------------------------------------------------------------
  // Leitor de CSV, sem dependência. Colunas: NIVEL1;NIVEL2;NIVEL3;CATEGORIA;VALOR
  // Separador ; ou , detectado pelo cabeçalho. NIVEL2 e NIVEL3 são opcionais.
  // --------------------------------------------------------------------------
  function leCsv(texto) {
    var linhas = String(texto).replace(/^﻿/, '').split(/\r?\n/).filter(function (l) {
      return l.trim() !== '';
    });
    if (!linhas.length) return [];
    var sep = (linhas[0].split(';').length >= linhas[0].split(',').length) ? ';' : ',';
    var cab = linhas[0].split(sep).map(function (c) { return c.trim().toUpperCase(); });
    var iN = [cab.indexOf('NIVEL1'), cab.indexOf('NIVEL2'), cab.indexOf('NIVEL3')];
    var iC = cab.indexOf('CATEGORIA'), iV = cab.indexOf('VALOR');
    if (iN[0] < 0 || iC < 0 || iV < 0) {
      throw new Error('CSV precisa das colunas NIVEL1, CATEGORIA e VALOR');
    }
    var out = [];
    for (var i = 1; i < linhas.length; i++) {
      var p = linhas[i].split(sep);
      var v = Number(String(p[iV]).trim().replace(',', '.'));
      if (!isFinite(v)) continue;
      out.push({
        lugar: iN.map(function (k) { return k >= 0 ? String(p[k] || '').trim() : ''; }),
        categoria: String(p[iC] || '').trim(),
        valor: v,
      });
    }
    return out;
  }

  var MG = {
    CORTES: CORTES, FORA_DA_CURVA: FORA_DA_CURVA, MIN_COMPARA: MIN_COMPARA,
    VOC_PADRAO: VOC_PADRAO,
    faixa: faixa, mediana: mediana, media: media,
    montaMatriz: montaMatriz, recado: recado, cascata: cascata,
    lugarInfo: lugarInfo, vocDe: vocDe, indexaFilhos: indexaFilhos,
    leCsv: leCsv, num: num, qtd: qtd,
  };
  if (typeof module === 'object' && module.exports) module.exports = MG;
  else raiz.MG = MG;
})(typeof window !== 'undefined' ? window : globalThis);
