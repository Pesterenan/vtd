# Video Thumbnail Designer

Editor de miniaturas para vídeos.
A aplicação conta com um extrator de quadros de vídeos que utiliza o FFmpeg para retirar
imagens direto de algum arquivo de vídeo e facilitar a criação de miniaturas.

O editor conta com edição por camadas, ferramentas de desenho e filtros para que a
miniatura tenha o destaque desejado.

## Funcionalidades

- **Extrator de quadros (VFE)** — abre em uma janela separada, pré-visualiza os
  quadros do vídeo em uma grade de miniaturas e envia o quadro escolhido para a
  área de trabalho, com barra de progresso e possibilidade de cancelamento.
- **Edição por camadas** — selecionar, mover, rotacionar, escalar e recortar
  objetos, com composição por camadas.
- **Ferramentas** — seleção/mão, zoom, textos, gradientes e caneta (traços
  abertos e fechados).
- **Filtros** — sombra externa, brilho (glow) e correção de cor.
- **Clipboard** — copiar e colar imagens.
- **Projetos** — importar imagens, exportar a miniatura final e salvar/carregar
  projetos em JSON.

## Tecnologias

- Tauri 2
- Rust + FFmpeg
- React/TypeScript

## Pré-requisitos

Para a funcionalidade de extração de quadros de vídeo, será necessário ter o
**FFmpeg** instalado no sistema.

## Como baixar a aplicação

Novas versões da aplicação ficarão disponíveis na página de 'Releases', com
instalação para Windows (instalador NSIS) e Linux (.deb).
