# Video Thumbnail Designer
---

## Plano:
O software será usado para criar miniaturas de forma mais eficiente para vídeos do YouTube.

O software poderá carregar um video gravado de gameplay para capturar uma imagem de fundo, um video
de facecam para alguma reação na miniatura, ou até mesmo poder pegar várias imagens do vídeo como
camadas que poderão ser rotacionadas, escalonadas e movidas na área da miniatura.

Poderá haver algum tipo de editor de texto para incluir títulos ou numerações, camadas de gradiente
para poder adicionar efeitos, e também o programa deverá suportar trabalhar com transparências para
fazer Chroma Key nas imagens de Facecam por exemplo, ou colocar imagens como stickers.

Após a montagem o programa poderá gravar uma imagem final com os itens editados em JPG ou PNG.

### Tecnologias utilizadas
---
- JavaScript
- Electron
- FFMpeg

A maior parte do projeto será utilizando JavaScript e conceitos de WebDev para editar as imagens.
FFMpeg será utilizado para visualizar e extrair as imagens dos vídeos, e o Electron será a
plataforma escolhida para a criação do app redistribuível.

### Etapas de desenvolvimento
---

Criar interface crua da aplicação - OK
Terá um canvas no meio com um menu de ferramentas na direita - OK
Canvas poderá desenhar caixas como teste de render - OK
Os elementos podem ser rotacionados e movidos pela área de montagem - OK
A aplicação pode importar imagens dinamicamente
A importação de vídeo deve conseguir usar o FFMPEG para extrair imagens

