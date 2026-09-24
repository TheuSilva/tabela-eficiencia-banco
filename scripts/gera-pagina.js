#!/usr/bin/env node
/* Monta a página da demonstração em docs/, que é o que o GitHub Pages serve.
 *
 * O Pages publica a pasta /docs como raiz do site, então os fontes de src/ são
 * COPIADOS para lá. É por isso que este passo existe, e é por isso que ele é
 * manual: rodar antes de commitar, senão a demo publicada fica velha.
 *
 *   node scripts/gera-pagina.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const MG = require('../src/logica.js');

const raiz = path.join(__dirname, '..');
const docs = path.join(raiz, 'docs');
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'config.json'), 'utf8'));

const registros = MG.leCsv(fs.readFileSync(path.join(raiz, 'dados', 'exemplo.csv'), 'utf8'));
const m = MG.montaMatriz(registros, cfg.matriz || {});

['logica.js', 'matriz.jsx', 'estilo.css'].forEach((f) => {
  fs.copyFileSync(path.join(raiz, 'src', f), path.join(docs, f));
});
// a base vai junto, mas a página só a busca quando alguém clica em baixar um recorte
fs.copyFileSync(path.join(raiz, 'dados', 'exemplo.csv'), path.join(docs, 'exemplo.csv'));

fs.writeFileSync(path.join(docs, 'dados-demo.js'),
  'window.DEMO = ' + JSON.stringify({ matriz: m, voc: cfg.voc, titulo: cfg.titulo, legenda: cfg.legenda })
  + ';\n', 'utf8');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tabela-eficiencia-banco</title>
<link rel="stylesheet" href="estilo.css">
</head>
<body>
<div class="g-wrap">
  <h1>Tabela de eficiência por banco</h1>
  <p class="g-sub">
    Tempo até a decisão, por estado e por banco. <b>Clicar numa célula responde para onde
    apontar</b>: o banco, o foro, os dois, ou nenhum dos dois.
  </p>
  <p class="g-sub">
    <b>Tudo nesta página é inventado.</b> Estados, comarcas, varas e bancos são fictícios
    (<code>scripts/gera-demo.js</code>), as siglas de estado não são UFs brasileiras, e os
    números são gerados com semente fixa, com quatro padrões plantados de propósito para a
    tela ter o que achar. Nada aqui descreve lugar ou instituição de verdade.
  </p>
  <div id="raiz"></div>
  <p class="g-sub" style="margin-top:18px">
    Código em <a class="g-link" href="https://github.com/TheuSilva/tabela-eficiencia-banco">github.com/TheuSilva/tabela-eficiencia-banco</a>.
  </p>
</div>
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>
<script src="logica.js"></script>
<script src="dados-demo.js"></script>
<script type="text/babel" data-presets="react" src="matriz.jsx"></script>
<script type="text/babel" data-presets="react">
ReactDOM.createRoot(document.getElementById('raiz')).render(
  <Matriz m={window.DEMO.matriz} voc={window.DEMO.voc}
    titulo={window.DEMO.titulo} legenda={window.DEMO.legenda}
    registros={() => fetch('exemplo.csv').then((r) => r.text()).then(MG.leCsv)} />
);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(docs, 'index.html'), html, 'utf8');
console.log('docs/ pronto |', m.linhas.length, 'linhas |', registros.length, 'registros');
