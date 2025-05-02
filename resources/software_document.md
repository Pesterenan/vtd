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
- HTML5 / CSS3 / TypeScript
- Electron
- FFMpeg

A maior parte do projeto será utilizando JavaScript e conceitos de WebDev para editar as imagens.
FFMpeg será utilizado para visualizar e extrair as imagens dos vídeos, e o Electron será a
plataforma escolhida para a criação do app redistribuível.

### Etapas de desenvolvimento
---

&#9746; - Criar interface crua da aplicação\
&#9746; - Terá um canvas no meio com um menu de ferramentas na direita\
&#9746; - Canvas poderá desenhar caixas como teste de render\
&#9746; - Os elementos podem ser rotacionados e movidos pela área de montagem\
&#9746; - A aplicação pode importar imagens dinamicamente\
&#9746; - A importação de vídeo deve conseguir usar o FFMPEG para extrair imagens\
&#9746; - O video  escolhido para importação deve abrir uma nova janela para extrair o frame\
&#9746; - Os elementos (imagens, textos) podem ser reorganizados de acordo com seu z-index\
&#9746; - A aplicação tem um sistema de gerenciar camadas\
&#9746; - O usuário pode escolher qual parte do frame ele quer extrair para a aplicação\
&#9746; - Os elementos tem visibilidade alternável e só podem ser selecionados se estiverem visiveis\
&#9746; - A aplicação pode criar e editar elementos de texto\
&#9746; - Implementar tamanho do contorno\
&#9746; - Retrabalhar a forma como as ferramentas funcionam em relação a posição do mouse, offset e ajustado para zoom.\
&#9746; - O usuário pode travar elementos para não serem movidos\
&#9746; - Implementar opacidade total do elemento\
&#9746; - A aplicação pode salvar a imagem final do projeto como um JPG ou PNG\
&#9746; - Criar um novo modal para mostrar a qualidade da imagem exportada, e incluir a escolha de formato.\
&#9746; - O usuário pode agrupar elementos em um grupo para movimentar todos juntos\
&#9746; - Criar sistema de alertas para eventos como salvar, copiar elemento, exportar imagem, etc.\
&#9746; - Mostrar o tempo em segundos enquanto arrasta o slider do video frame extractor\
&#9746; - Buscar um novo frame apenas após soltar o slider do video frame extractor\
&#9746; - Adicionar controles de teclas para navegação do video frame extractor\
&#9746; - Melhorar interface do video frame extractor, colocar alerts e posicionar melhor os elementos\
&#9746; - Buscar miniaturas para mostrar como preview do video no vfe.\
&#9746; - Implementar opacidade nos filtros, melhorar implementação de filtros\
&#9746; - Implementar filtro de brilho e contraste\
&#9746; - Implementar filtro de correção de cores\
&#9746; - Retrabalhar dialogs para componentes genéricos\

&#9744; - Retrabalhar o sistema de texto para ter mais opções de formatação\
&#9744; - Implementar efeito de chroma/color key\
&#9744; - Implementar um sistema de undo/redo\

