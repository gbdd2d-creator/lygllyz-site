# Lygllyz Smoke Culture 🔮

Site de tabacaria com tema místico (roxo + dourado), carrinho de compras e
finalização de pedido direto no **WhatsApp**.

## Como abrir
Dê duplo clique em `index.html` ou arraste para o navegador. É um site estático
(HTML/CSS/JS), não precisa instalar nada.

## ⚙️ O que editar — tudo em `js/config.js`

### 1. Número do WhatsApp (IMPORTANTE)
```js
whatsapp: "5500000000000",
```
Troque pelo número real, **só dígitos**, com código do país + DDD.
Ex.: WhatsApp (11) 99999-9999 vira `"5511999999999"`.

### 2. Contato (aba "Sobre / Contato")
`email`, `telefone`, `instagram`, `endereco`, `horario`.

### 3. Produtos
Cada produto é uma linha em `produtos: [...]`:
```js
{ id: "seda1", cat: "seda", nome: "Seda King Size", preco: 4.50, desc: "...", img: "" },
```
- `id` — único, sem repetir.
- `cat` — a `key` da categoria (veja a lista `categorias`).
- `preco` — número com ponto (4.50).
- `img` — opcional. Para usar foto real, salve a imagem em uma pasta `img/`
  e coloque `img: "img/seda1.jpg"`. Se deixar `""`, aparece o emoji da categoria.

### 4. Categorias (abas)
Já vêm todas as 16: seda, piteira, cuia, tesoura, piteira de vidro, case,
kit completo, isqueiros, maçaricos, tabacos, cinzeiros, mocos, bandejas,
bongs, bags e acessórios. Para mudar nome/emoji, edite `categorias`.

## Como funciona o pedido
1. Cliente clica no **+** dos produtos → vão para o carrinho 🛒.
2. No carrinho ajusta quantidade e clica **Finalizar no WhatsApp**.
3. Abre o WhatsApp da loja com a lista de itens + total já escritos.
   A loja recebe a mensagem e separa os produtos. ✅

O carrinho fica salvo no navegador do cliente (localStorage).

## Trocar imagens / mockups / grafites
- Coloque arquivos em uma pasta `img/` e referencie no `config.js`.
- Mockups e imagens grátis: Unsplash, Pexels, Pixabay (uso livre).
