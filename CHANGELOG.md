# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.3.0] - 2026-10-15

### Adicionado

- **Ferramenta de formas** para desenhar retângulo, elipse, triângulo, polígono
  e estrela, com novo ícone na barra de ferramentas e geometria coberta por
  testes (`shapeTool`, `shapeGeometry`).
- **Dica de ferramenta genérica (`ToolHintOverlay`)** substituindo o overlay
  específico da caneta, com evento de dica reutilizável por qualquer ferramenta.
- **Abstração `useElementMenu`** que unifica o comportamento dos menus de
  elementos (texto, gradiente e caminho), incluindo ação de desselecionar.
- Configuração do `knip` e script `typecheck` no `package.json`.

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

### Corrigido

- Reorganização das ferramentas e correção da classe CSS do estado ativo.
- Fundo (`backdrop`) transparente no diálogo de filtros.
- Ajustes de lint e correção do build do Cargo.

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

[0.3.0]: https://github.com/Pesterenan/vtd/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Pesterenan/vtd/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Pesterenan/vtd/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/Pesterenan/vtd/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/Pesterenan/vtd/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/Pesterenan/vtd/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/Pesterenan/vtd/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Pesterenan/vtd/releases/tag/v0.0.1
