/* tabela-eficiencia-banco — o componente. React sem build: Babel transpila no navegador,
 * como a demo em docs/index.html mostra.
 *
 * Ele não decide nada sozinho: régua, frase e cascata vêm de src/logica.js, que
 * roda no Node e é o que a suíte de testes exercita. Aqui só há tela.
 */

// As faixas saem de color-mix sobre os tokens, então a paleta inteira troca no
// CSS e os três temas seguem sozinhos. Nada de hex fixo aqui.
const CORES = [
  'color-mix(in oklab, var(--g-verde) 52%, transparent)',
  'color-mix(in oklab, var(--g-verde) 38%, transparent)',
  'color-mix(in oklab, var(--g-verde) 25%, transparent)',
  'color-mix(in oklab, var(--g-verde) 13%, transparent)',
  'color-mix(in oklab, var(--g-ambar) 15%, transparent)',
  'color-mix(in oklab, var(--g-ambar) 27%, transparent)',
  'color-mix(in oklab, var(--g-ambar) 40%, transparent)',
  'color-mix(in oklab, var(--g-ambar) 55%, transparent)',
  'color-mix(in oklab, var(--g-vermelho) 62%, transparent)',
];
const CORES_ROT = ['≤ ¼', '¼–½', '½–¾', '¾–1×', '1–1,25×', '1,25–1,5×', '1,5–1,75×', '1,75–2×', '≥ 2×'];
const COR_TARJA = {
  categoria: ['var(--g-vermelho)', 62], dois: ['var(--g-vermelho)', 62],
  lugar: ['var(--g-ambar)', 55], nada: ['var(--g-fg-4)', 45],
};
const PISOS = [[0, 'todas'], [10, '10+'], [25, '25+'], [50, '50+'], [100, '100+']];

function Seletor({ lbl, opcoes, sel, onPick }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span className="g-lbl">{lbl}</span>
      <div className="g-seg">
        {opcoes.map((o) => (
          <button key={String(o[0])} aria-pressed={sel === o[0]} onClick={() => onPick(o[0])}>{o[1]}</button>
        ))}
      </div>
    </div>
  );
}

function Frase({ partes }) {
  return (
    <React.Fragment>
      {partes.map((p, k) => (typeof p === 'string'
        ? <React.Fragment key={k}>{p}</React.Fragment>
        : <b key={k}>{p.b}</b>))}
    </React.Fragment>
  );
}

// O quadro: a leitura da célula em uma frase, e embaixo onde ela mora.
function Quadro({ rec, casc, voc, metrica, pai, onIr, onFechar }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);
  if (!rec) return null;
  const cor = COR_TARJA[rec.tarja] || COR_TARJA.nada;
  const regua = metrica === 'media' ? 'média' : 'mediana';
  return (
    <div className="g-fundo" role="dialog" aria-modal="true" onClick={onFechar}>
      <div className="g-quadro" onClick={(e) => e.stopPropagation()}>
        <div className="g-quadro-h">
          <div>
            <div className="g-cap">
              {pai && <a className="g-link" onClick={() => onIr(pai.i)}>‹ {pai.rot} </a>}
              {rec.lugar} · {rec.categoria}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 3 }}>
              <span className="g-mono" style={{ fontSize: 23, fontWeight: 600 }}>{MG.num(rec.val)}</span>
              <span style={{ fontSize: 11.5, color: 'var(--g-fg-2)' }}>{voc.unidade} · {regua}</span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--g-fg-3)', marginTop: 2 }}>
              {MG.qtd(rec.n)} registro(s) no recorte
              {rec.refDe ? ' · ' + MG.num(rec.razao) + '× a régua ' + rec.refDe
                + ' (' + MG.num(rec.valLinha) + ')' : ''}
            </div>
          </div>
          <button className="g-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </div>
        <div className="g-quadro-b">
          <p className="g-rot">O recado</p>
          <div className="g-direto">
            <span className="g-tarja" style={{
              background: 'color-mix(in oklab, ' + cor[0] + ' ' + cor[1] + '%, transparent)',
            }}>{rec.tarjaRot}</span>
            {rec.tarja2 && <span className="g-tarja g-tarja2">{rec.tarja2}</span>}
            <div className="g-frase"><Frase partes={rec.texto} /></div>
            {rec.selo && <div className="g-selo">{rec.selo}</div>}
          </div>

          {casc && <React.Fragment>
            <p className="g-rot" style={{ margin: '16px 0 8px' }}>Onde isso mora</p>
            <div className="g-frase" style={{ fontSize: 12.5, marginBottom: 9 }}>
              {casc.acima === 0
                ? <React.Fragment>
                    <b>Nenhum{casc.fem ? 'a' : ''} {casc.rot1} fora da curva.</b> O valor se distribui
                    parecido entre {casc.itens.length} {casc.rot}, então não há um lugar para atacar
                    primeiro: o número desta célula é o padrão daqui.
                  </React.Fragment>
                : casc.concentrado
                  ? <React.Fragment>
                      <b>O atraso está concentrado.</b>{' '}
                      <b>{MG.qtd(casc.nAcima)} dos {MG.qtd(casc.somaN)} registros ({casc.pct}%)</b> estão
                      em {casc.acima} {casc.acima === 1 ? casc.rot1 : casc.rot} que
                      {casc.acima === 1 ? ' passa' : ' passam'} de {MG.num(MG.FORA_DA_CURVA)}× os{' '}
                      {MG.num(casc.ref)} desta célula. Atacar {casc.acima === 1
                        ? 'ess' + (casc.fem ? 'a ' : 'e ') + casc.rot1
                        : 'ess' + (casc.fem ? 'as ' : 'es ') + casc.acima + ' ' + casc.rot} muda o
                      número daqui.
                    </React.Fragment>
                  : <React.Fragment>
                      <b>As piores não explicam o número.</b> Só{' '}
                      <b>{MG.qtd(casc.nAcima)} dos {MG.qtd(casc.somaN)} registros ({casc.pct}%)</b> estão
                      {casc.fem ? ' nas ' : ' nos '}{casc.acima}{' '}
                      {casc.acima === 1 ? casc.rot1 : casc.rot} acima de {MG.num(MG.FORA_DA_CURVA)}× os{' '}
                      {MG.num(casc.ref)} desta célula. O resto está espalhado, e é por isso que
                      resolver {casc.fem ? 'a pior' : 'o pior'} não resolve a célula.
                    </React.Fragment>}
            </div>
            <div>
              {casc.itens.slice(0, 6).map((x) => {
                const f = x.forte ? MG.faixa(x.v, casc.ref) : null;
                return (
                  <div key={x.i} className="g-item" onClick={() => onIr(x.i)}
                    style={{ opacity: x.forte ? 1 : .5 }} title={'Ver o recado de ' + x.rot}>
                    <span className="g-item-nome">{x.rot}</span>
                    <span className="g-item-n g-mono">{MG.qtd(x.n)} reg.</span>
                    <span className="g-item-v g-mono" style={{
                      background: f === null ? 'transparent' : CORES[f],
                      border: f === null ? '1px dashed var(--g-border)' : '1px solid transparent',
                    }}>{MG.num(x.v)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--g-fg-3)', marginTop: 7, lineHeight: 1.6 }}>
              {casc.itens.length > 6 ? 'Mais ' + (casc.itens.length - 6) + ' ' + casc.rot
                + ' nesta célula, fora da lista. ' : ''}
              Ordenados por quanto cada um puxa o número da célula, que é o volume vezes o quanto
              passa da régua, e não pelo maior valor.{' '}
              {casc.fora > 0 ? MG.qtd(casc.fora) + ' registro(s) estão em ' + casc.rot
                + ' pequenas demais para entrar na tabela e não aparecem aqui. ' : ''}
              <b>Clique em qualquer linha</b> para ler o recado dali.
            </div>
          </React.Fragment>}

          {rec.magro && <div className="g-aviso">
            São {MG.qtd(rec.n)} registro(s). Com esse volume o número troca a cada semana. Serve
            para olhar, não para cobrar.
          </div>}
          <div style={{ fontSize: 10.5, color: 'var(--g-fg-3)', marginTop: 10, lineHeight: 1.6 }}>
            A leitura usa a mesma régua da cor da célula: a coluna contra a {regua} da própria
            linha, e a linha contra o nível de cima. Fora da curva é {MG.num(MG.FORA_DA_CURVA)}× ou
            mais, e só entra na comparação quem tem {MG.MIN_COMPARA}+ registros no recorte.
          </div>
        </div>
      </div>
    </div>
  );
}

// A matriz. Hierarquia recolhível, ranking pelo cabeçalho e a célula que abre o
// quadro.
function Matriz({ m, voc, titulo, legenda }) {
  const [abertos, setAbertos] = React.useState({});
  const [ord, setOrd] = React.useState({ k: null, d: -1 });
  const [metrica, setMetrica] = React.useState('mediana');
  const [piso, setPiso] = React.useState(0);
  const [sel, setSel] = React.useState(null);

  const filhos = React.useMemo(() => MG.indexaFilhos(m), [m]);
  if (!m || !m.linhas || !m.linhas.length) return <p className="g-cap">Sem dados no recorte.</p>;

  const V = MG.vocDe(voc);
  const cols = ['Todos'].concat(m.cols || []).concat(m.outros ? [m.rotOutros || 'Outros'] : []);
  const iVal = metrica === 'media' ? 2 : 1;
  const iOrd = metrica === 'volume' ? 0 : iVal;
  const refTotal = (m.linhas[0].cel[0] || [])[iVal];
  const minCel = m.minN || 5;

  const totalLinha = (i) => ((m.linhas[i].cel[0] || [])[0] || 0);
  const fora = (i) => i !== 0 && m.linhas[i].niv >= 0 && totalLinha(i) < piso;
  const nOcultas = piso ? m.linhas.filter((l, i) => fora(i)).length : 0;

  const alterna = (i) => setAbertos((a) => {
    const n = Object.assign({}, a); if (n[i]) delete n[i]; else n[i] = 1; return n;
  });
  // três estados por clique: piores, melhores, volume. Sem o terceiro não há
  // como voltar ao mapa do jeito que ele abre.
  const clicaCol = (k) => setOrd((o) => {
    if (o.k === k) return o.d < 0 ? { k: k, d: 1 } : { k: null, d: -1 };
    return { k: k, d: k === 'nome' ? 1 : -1 };
  });

  // ⚠ célula abaixo do mínimo NÃO disputa: vai para o fim nos dois sentidos. É a
  //   mesma regra de não receber cor, e sem ela a linha de um registro só vira a
  //   "melhor do país".
  const valor = (i, k) => {
    const c = m.linhas[i].cel[k];
    if (!c || c[0] < minCel) return null;
    return c[iOrd];
  };
  // ⚠ ordena DENTRO de cada pai, nunca a lista inteira: ranquear só o topo daria
  //   um mapa que se contradiz quando a linha é aberta.
  const ordenados = (lista) => {
    if (ord.k === null) return lista;
    const arr = lista.slice();
    if (ord.k === 'nome') {
      arr.sort((a, b) => m.linhas[a].rot.localeCompare(m.linhas[b].rot, 'pt-BR') * (ord.d < 0 ? -1 : 1));
      return arr;
    }
    arr.sort((a, b) => {
      const va = valor(a, ord.k), vb = valor(b, ord.k);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * ord.d;
    });
    return arr;
  };

  const visiveis = [];
  const anda = (i) => {
    if (fora(i)) return;
    visiveis.push(i);
    if (i !== 0 && !abertos[i]) return;
    if (filhos[i]) ordenados(filhos[i]).forEach(anda);
  };
  anda(0);

  const ranqueandoValor = ord.k !== null && ord.k !== 'nome';
  const foraDoRanking = (i) => ranqueandoValor && m.linhas[i].niv >= 0 && valor(i, ord.k) === null;
  const nFora = visiveis.filter(foraDoRanking).length;
  const seta = (k) => (ord.k === k ? <span className="g-seta">{ord.d < 0 ? '▼' : '▲'}</span> : null);

  const celula = (c, ref, k, i) => {
    if (!c) return <td key={k} style={{ color: 'var(--g-fg-4)' }}>–</td>;
    const f = c[0] < minCel ? null : MG.faixa(c[iVal], ref);
    return (
      <td key={k} style={{
        background: f === null ? 'transparent' : CORES[f],
        border: f === null ? '1px dashed var(--g-border)' : '1px solid transparent',
      }}>
        <div className="g-cel" onClick={() => setSel({ i: i, j: k })}
          title={c[0] + ' registro(s)' + (ref > 0 ? ' · régua da linha ' + MG.num(ref)
            + ' · ' + MG.num(c[iVal] / ref) + '×' : '') + ' · clique para o recado'}>
          <div className="g-v g-mono">{MG.num(c[iVal])}</div>
          {/* opacidade, e não uma cor fixa: sobre o preenchimento forte o cinza
              some, e é a contagem que sustenta a leitura da célula */}
          <div className="g-n g-mono">{c[0]}</div>
        </div>
      </td>
    );
  };

  const rotOrd = ord.k === 'nome' ? 'nome' : cols[ord.k];
  const sentido = ord.k === 'nome' ? (ord.d < 0 ? 'de Z a A' : 'de A a Z')
    : metrica === 'volume' ? (ord.d < 0 ? 'as de maior volume primeiro' : 'as de menor volume primeiro')
      : (ord.d < 0 ? 'as piores primeiro' : 'as melhores primeiro');

  return (
    <div className="g-card">
      <div className="g-card-h">
        <div>
          <div className="g-ttl">{titulo}</div>
          {legenda && <div className="g-cap">{legenda}</div>}
        </div>
      </div>
      <div className="g-ctrl">
        <Seletor lbl="A coluna mostra:" sel={metrica} onPick={setMetrica}
          opcoes={[['mediana', 'Mediana'], ['media', 'Média'], ['volume', 'Quantidade']]} />
        <Seletor lbl="Mínimo na linha:" sel={piso} onPick={setPiso} opcoes={PISOS} />
      </div>
      <div className="g-rolagem">
        <table className="g-tbl">
          <thead><tr>
            <th className="g-nome" onClick={() => clicaCol('nome')}>
              {V.niveis.map((n) => n.nome).join(' / ')}{seta('nome')}
            </th>
            {cols.map((c, i) => <th key={i} onClick={() => clicaCol(i)}>{c}{seta(i)}</th>)}
          </tr></thead>
          <tbody>
            {visiveis.map((i) => {
              const l = m.linhas[i];
              const raiz = l.niv === -1;
              const ref = raiz ? refTotal : (l.cel[0] || [])[iVal];
              return (
                <tr key={i} className={(raiz ? 'g-raiz ' : '') + (foraDoRanking(i) ? 'g-fraca' : '')}>
                  <td className="g-nome" onClick={l.filho ? () => alterna(i) : null}
                    style={{
                      paddingLeft: 10 + Math.max(l.niv, 0) * 16,
                      cursor: l.filho ? 'pointer' : 'default',
                      fontWeight: l.niv <= 0 ? 600 : 400,
                      color: l.niv === 2 ? 'var(--g-fg-3)' : l.niv === 1 ? 'var(--g-fg-2)' : 'var(--g-fg)',
                    }}>
                    <span style={{ display: 'inline-block', width: 12, color: 'var(--g-fg-4)' }}>
                      {l.filho ? (abertos[i] ? '▾' : '▸') : ''}
                    </span>
                    {l.rot}
                    {l.resto > 0 && abertos[i] && !piso
                      ? <span className="g-cap" style={{ marginLeft: 6 }}>
                          (+{l.resto} abaixo do mínimo)</span>
                      : null}
                  </td>
                  {cols.map((c, j) => celula(l.cel[j], j === 0 ? refTotal : ref, j, i))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="g-legenda">
        <span>em relação à {metrica === 'media' ? 'média' : 'mediana'} da linha:</span>
        {CORES.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i style={{ background: c }} />{CORES_ROT[i]}
          </span>
        ))}
      </div>
      <div className="g-nota">
        <div style={{ marginBottom: 3 }}>
          <b>Clique em qualquer célula</b> para ver o recado: se o que está fora da curva é a
          coluna, o lugar, os dois, ou nenhum dos dois.
        </div>
        {ord.k === null
          ? 'Ordem por volume. Clique no título de uma coluna para rankear por ela: o primeiro clique traz as piores, o segundo as melhores, o terceiro volta ao volume.'
          : <React.Fragment>
              Rankeado por <b>{rotOrd}</b>, {sentido}, em todos os níveis. Célula com menos
              de {minCel} registro(s) não disputa e fica no fim
              {nFora ? ', são ' + nFora + ' linha(s) esmaecidas' : ''}.{' '}
              <a className="g-link" onClick={() => setOrd({ k: null, d: -1 })}>voltar ao volume</a>
            </React.Fragment>}
        {piso > 0 && <div style={{ marginTop: 3 }}>
          Mostrando só linhas com <b>{piso}+ registros</b>
          {nOcultas ? ', ' + nOcultas + ' linha(s) ficam fora' : ''}.{' '}
          <a className="g-link" onClick={() => setPiso(0)}>mostrar todas</a>
        </div>}
      </div>
      {sel && <Quadro
        rec={MG.recado(m, sel.i, sel.j, { iVal: iVal, voc: voc })}
        casc={MG.cascata(m, sel.i, sel.j, { iVal: iVal, voc: voc, minCel: minCel })}
        voc={V} metrica={metrica}
        pai={m.linhas[sel.i].pai >= 0 && m.linhas[sel.i].pai !== sel.i
          ? { i: m.linhas[sel.i].pai, rot: m.linhas[m.linhas[sel.i].pai].rot } : null}
        onIr={(i) => setSel({ i: i, j: sel.j })}
        onFechar={() => setSel(null)} />}
    </div>
  );
}
