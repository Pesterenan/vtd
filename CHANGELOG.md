# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.4.1] - 2026-11-26

### Corrigido

- **Compatibilidade com o FFmpeg do Ubuntu 24.04**: os builds passam a ser
  feitos contra o FFmpeg 6.1 (`libavutil.so.58`) em vez do FFmpeg 8
  (`libavutil.so.60`). O `.deb` volta a abrir no Ubuntu 24.04 sem exigir a
  instalação manual de uma versão mais recente do FFmpeg.
- Os runners Linux de CI e de release foram fixados em `ubuntu-24.04`, já que
  o `ubuntu-latest` passou a apontar para o Ubuntu 26.04 (FFmpeg 8) em novembro
  de 2026.
- O `.deb` agora declara as bibliotecas de runtime do FFmpeg 6.1 como
  dependências, para que o `apt` as instale junto com o aplicativo.
- O pacote Windows passou a empacotar as DLLs do FFmpeg 6.1.1, alinhadas à
  versão usada na compilação.

## [0.4.0] - 2026-11-17

### Adicionado

- **Ferramenta conta-gotas** (`I`) para copiar cores entre elementos: `Shift`
  copia só o preenchimento, `Alt` só o contorno e `Ctrl` a aparência completa
  (cores, traço, tipografia e opacidade, sem filtros). Fora de formas, a origem
  passa a ser o pixel renderizado do canvas. O cursor indica o canal armado com
  os selos `P`, `C` e `A`.
- **Seletor de cores circular** com anel de matiz e triângulo de
  saturação/valor em HSL, exibido como popover ancorado no swatch clicado.
- **Conta-gotas embutido no seletor de cores**, para capturar a cor de qualquer
  pixel do canvas sem trocar de ferramenta.
- **Cores ativas** com swatches de preenchimento e contorno e botão de troca; o
  par é persistido no `localStorage` e serve de cor padrão para novos elementos.
- **Sufixo da unidade dentro do campo numérico** do `SliderControl`.
- Utilitários de conversão HSL/hex, geometria do triângulo de cor e
  posicionamento do popover.

### Modificado

- Aviso explícito quando a origem não tem o canal pedido (`Shift`/`Alt`), em vez
  de copiar em silêncio.
- **Acessibilidade do seletor circular**: anel e triângulo operáveis por teclado,
  com rótulos e foco visível.
- Repintura do triângulo coalescida com `requestAnimationFrame` e gravação das
  cores ativas limitada a 150 ms (primeira mudança imediata + escrita final).
- Anel de matiz desenhado com paradas explícitas de 60°, sem depender de
  `conic-gradient` com interpolação estendida.
- Evento de amostragem em coordenadas de cliente renomeado para
  `workarea:sampleColorAtClient`, com a semântica de resolução documentada no
  `workArea`.

### Corrigido

- Formas fechadas criadas pela ferramenta de formas agora herdam a cor de
  preenchimento ativa; caminhos livres continuam apenas com contorno.
- Estado HSL do seletor independente do hex, preservando o matiz ao alterar
  luminosidade ou digitar um valor.
- Campo numérico do slider pode ser limpo e digitado novamente, com validação
  apenas ao confirmar.
- Cores que não estão em hex caem no preenchimento padrão.
- Arraste da roda é encerrado ao fechar o painel ou perder o foco da janela.
- Cliques fora do anel de matiz são ignorados.
- Conta-gotas emite `workarea:update` uma única vez por clique e alinha a ponta
  do ícone ao pixel amostrado.
- Abertura do seletor de cores por teclado não duplica mais os eventos de
  abertura.
- Remoção do `onChange` nativo morto do seletor de cores.

## [0.3.1] - 2026-10-21

### Adicionado

- **Contorno destacado do path selecionado** na ferramenta caneta: halo branco
  de 1.5px com linha preta de 1px sobre o path ativo, incluindo o segmento de
  fechamento.
- **Ponto preditivo de inserção de vértice** na caneta agora exige `Shift`,
  alinhando o indicador à ação real; a dica da ferramenta foi atualizada.
- Clique direito descarta um path em construção (com 1 ponto).
- Utilitário `deepClone` para cópia profunda de valores.

### Modificado

- Regra "reta vs. Bézier" centralizada em `traceSegment` (`utils/pathMath`) e
  reutilizada pelo render do `PathElement`, pelo contorno da caneta e pela linha
  elástica.

### Corrigido

- Cópia de elementos agora preserva todas as propriedades (clone profundo).
- Fluxo de aplicação de recorte em elementos de imagem.
- Criação de path e arraste de handles na ferramenta caneta.

## [0.3.0] - 2026-10-16

### Adicionado

- **Ferramenta de formas** para desenhar retângulo, elipse, triângulo, polígono
  e estrela, com novo ícone na barra de ferramentas e geometria coberta por
  testes (`shapeTool`, `shapeGeometry`).
- **Dica de ferramenta genérica (`ToolHintOverlay`)** substituindo o overlay
  específico da caneta, com evento de dica reutilizável por qualquer ferramenta.
- **Abstração `useElementMenu`** que unifica o comportamento dos menus de
  elementos (texto, gradiente e caminho), incluindo ação de desselecionar.
- Configuração do `knip` e script `typecheck` no `package.json`.
- **Feedback visual de arraste no menu de camadas**: camada de origem com
  aparência "desabilitada", linha de inserção com marcador na borda, realce de
  grupo ao aninhar e cursores `grab`/`grabbing`.

### Modificado

- **Herança de elementos unificada** em todo o app, removendo duplicação na
  implementação das classes de elemento.
- **Quebra dos "god objects"**: `workArea` foi separado em módulos de seleção,
  clipboard e transformações; o gerenciamento de arquivos foi extraído do
  `mainWindow`.
- Extração de utilitários reutilizáveis: parsing de hex unificado em
  `utils/color`, funções de ângulo em `angles.ts`, `readBlobAsDataURL`,
  `resolveHandleSign`, `forEachTarget` e `resetDrag`.
- Limpeza de CSS e de tipos duplicados (`ISelectOption` movido para `types`).
- Nível máximo de zoom ampliado.
- Assinatura de `renderLayer` passou a receber um objeto de opções, simplificando
  a renderização das camadas e dos grupos.

### Corrigido

- Reorganização das ferramentas e correção da classe CSS do estado ativo.
- Fundo (`backdrop`) transparente no diálogo de filtros.
- Ajustes de lint e correção do build do Cargo.
- **Reordenação de camadas** pelo menu: como a lista é renderizada invertida
  (`column-reverse`), o índice de inserção ficava desalinhado e a camada caía
  fora de posição (às vezes exigindo arrastar duas posições).
- Grupos sem filhos apareciam permanentemente como selecionados
  (`[].every(...)` é verdadeiro) e a seleção do menu não acompanhava a seleção
  real do canvas, deixando destaques obsoletos após arrastar ou bloquear.

### Removido

- Código morto: arquivo `bb.ts`, função `hitPathSegment` e exports não
  utilizados.

## [0.2.0] - 2026-09-14

### Adicionado

- **Ferramenta caneta (pen)** com criação de elementos de caminho (`path`),
  incluindo curvas de Bézier.
- Adição e remoção de pontos em um caminho, com pré-visualização da linha
  enquanto se adiciona o próximo ponto.
- Criação e fechamento de caminhos, com arraste de novos pontos direto para a
  curva.
- **Componente `ContextMenu`** e **menu de caminho (`PathMenu`)** com controles
  visuais de traço e preenchimento.
- Cache do uso de teclas modificadoras e atualização da caixa de transformação
  ao editar pontos.

### Modificado

- Refatoração/auditoria do `penTool`, simplificando a ferramenta e seus testes.
- Uso de variáveis na ferramenta abstrata (`abstractTool`).
- Atualização do Vite e demais dependências.
- Testes atualizados para a nova implementação, incluindo testes do
  `mainWindow`.

### Corrigido

- Movimento de pontos com `Alt`/`Ctrl`, posição do mouse no `mouseDown` e
  coordenadas do mouse nas ferramentas.
- Fechamento de caminho pela caneta e movimento do primeiro ponto em caminhos
  fechados.
- Posição do overlay e dos pontos do caminho.

### Documentação

- Atualização do `README.md` e criação de arquivos de agentes para entendimento
  do codebase.

## [0.1.0] - 2026-07-07

Reescrita do aplicativo sobre **Tauri 2 + React + TypeScript**.

### Adicionado

- **Janela separada do Extrator de Quadros de Vídeo (VFE)**, com migração total
  para React.
- **Ferramenta múltipla (`multiTool`)** reunindo seleção, mover, rotacionar e
  escalar, com menu para troca de modo e abertura por clique direito.
- Rotação e escala em torno de um ponto de ancoragem, com snapping de rotação ao
  segurar `Ctrl`/`Shift`.
- Adição de elementos à seleção com `Shift`.
- Alternância de tema claro/escuro.
- Salvamento e carregamento de projetos, diálogo de propriedades do projeto e
  comandos de backend organizados em arquivos.
- Seleção de imagens por drag-and-drop, overlay de carregamento e alertas.
- Exportação de imagem e aplicação de recorte pelos diálogos.

### Modificado

- Migração de todos os menus e diálogos (ferramentas, camadas, gradiente,
  texto, transformação, filtros, sobre, novo projeto) para React.
- Migração dos testes para **Vitest**.
- Remoção da base vanilla e do `renderer.ts`.

### Corrigido

- Inicialização do app, estilo dos handles da caixa de transformação, menus
  colapsáveis e barra de gradiente.
- Redimensionamento da janela após manipulação do canvas.
- Erros de build e de lint.

## [0.0.5] - 2025-12-10

### Adicionado

- Exportação com fundo transparente.
- Serialização dos dados da caixa de recorte no projeto.
- Método e evento para listar todos os elementos da área de trabalho.
- Suporte a soltar e colar novas imagens.

### Modificado

- Área de menus rolável e ajuste da largura do menu lateral.
- Melhoria no tratamento de IDs de elementos e tooltips dos botões de ícone.

## [0.0.4] - 2025-09-22

### Adicionado

- Seleção de proporção (`aspect ratio`) para a caixa de extração de quadros.
- Modelos de tamanho e novos templates de miniatura no diálogo de novo projeto.
- Botões para controlar a extração de vídeo.
- Alertas ao extrair vídeo e exportar imagem.
- Cálculo do tamanho final da imagem ao salvar.
- Novas opções nos menus Arquivo e Ajuda.

### Corrigido

- Fluxo de fechamento de projeto, carregamento assíncrono de imagens e diálogo
  de propriedades.

## [0.0.3] - 2025-08-28

### Adicionado

- **Recorte de imagens**: classe `CroppingBox` e recorte aplicado ao elemento de
  imagem, com suavização da imagem recortada.
- Controles de recorte no menu de transformação.

### Modificado

- Filtros passam a ser gerados apenas durante a edição e somente as propriedades
  de filtro são salvas no projeto.

### Corrigido

- Caixa de recorte exibida apenas ao segurar `Alt`.
- Controle de cor: vinculação/desvinculação, reset para preto e seleção
  automática do stop do gradiente.

## [0.0.2] - 2025-08-12

### Adicionado

- Versão do aplicativo exibida a partir da configuração de build.

### Corrigido

- Botão "Extrair Quadro" ([VTD-01]).
- Vínculo/desvínculo do controle de cor.

## [0.0.1] - 2025-08-09

Primeira versão pública, baseada em **Electron + TypeScript**.

### Adicionado

- Área de trabalho com canvas de elementos e canvas de ferramentas.
- Seleção, movimentação, rotação e escala de elementos com caixa de
  transformação.
- Zoom e movimentação da área de trabalho, com atalhos de teclado.
- Importação de imagens (incluindo SVG) e elementos de texto.
- Salvamento e carregamento de projetos em JSON.
- Ícones e organização inicial das ferramentas.

[0.4.1]: https://github.com/Pesterenan/vtd/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/Pesterenan/vtd/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/Pesterenan/vtd/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Pesterenan/vtd/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Pesterenan/vtd/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Pesterenan/vtd/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/Pesterenan/vtd/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/Pesterenan/vtd/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/Pesterenan/vtd/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/Pesterenan/vtd/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Pesterenan/vtd/releases/tag/v0.0.1
