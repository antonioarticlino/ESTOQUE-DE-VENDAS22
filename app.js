// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Firebase Firestore
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDtmu5yKt5Kz8yxzTCCf5MfC2av1O5zL2Q",
  authDomain: "lojavendas-ae418.firebaseapp.com",
  projectId: "lojavendas-ae418",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//////////////////////////////////////////////////////
// ENVIAR IMAGEM PARA CLOUDINARY
//////////////////////////////////////////////////////
async function uploadImagem(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "vendas_produtos");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dsuz5hiq6/image/upload",
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();
  return data.secure_url;
}

//////////////////////////////////////////////////////
// SALVAR PRODUTO
//////////////////////////////////////////////////////
window.salvarProduto = async function() {
  try {
    const nome = document.getElementById("nome")?.value;
    const categoria = document.getElementById("categoria")?.value;
    const preco = document.getElementById("preco")?.value;
    const descricao = document.getElementById("descricao")?.value;
    const imagensInput = document.getElementById("imagem");

    if (!nome || !categoria || !preco || !descricao || !imagensInput || imagensInput.files.length === 0) {
      alert("Preencha todos os campos!");
      return;
    }

    let urlsImagens = [];
    for (let i = 0; i < imagensInput.files.length; i++) {
      const url = await uploadImagem(imagensInput.files[i]);
      urlsImagens.push(url);
    }

await addDoc(collection(db, "produtos"), {
  nome,
  categoria,
  preco: parseFloat(preco), // importante salvar como número
  descricao,
  imagens: urlsImagens,
  criadoEm: serverTimestamp(),

  vendido: false, // 🔹 NOVO CAMPO: começa como "não vendido"

  promocao: {
    ativo: false,
    desconto: 0,
    dataInicio: null,
    dataFim: null
  }
});



    alert("Produto salvo com sucesso!");
    carregarProdutos();

    // ⚡ Limpar campos do formulário
    document.getElementById("nome").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("imagem").value = "";

  } catch (error) {
    console.error(error);
    alert("Erro ao salvar produto!");
  }
};


//////////////////////////////////////////////////////
// CARREGAR PRODUTOS
//////////////////////////////////////////////////////
async function carregarProdutos() {
  const produtosDiv = document.getElementById("produtos");
  if (!produtosDiv) return;

  const q = query(
    collection(db, "produtos"),
    orderBy("criadoEm", "asc")
  );

  const querySnapshot = await getDocs(q);
  produtosDiv.innerHTML = "";

  querySnapshot.forEach((documento) => {
    const produto = documento.data();
    const id = documento.id;

    let imagensHTML = "";
    if (produto.imagens && produto.imagens.length > 0) {
      produto.imagens.forEach((img, index) => {
        imagensHTML += `
          <div style="position: relative; display: inline-block; margin-right: 5px;">
            <img src="${img}" alt="${produto.nome}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;">
            
            <button style="
              position: absolute;
              top: 2px;
              left: 2px;
              font-size: 10px;
              padding: 2px 4px;
              border: none;
              border-radius: 4px;
              background: rgba(0,0,0,0.6);
              color: white;
              cursor: pointer;
            " onclick="substituirImagem('${id}', ${index})">Trocar</button>

            <button style="
              position: absolute;
              top: 2px;
              right: 2px;
              font-size: 10px;
              padding: 2px 4px;
              border: none;
              border-radius: 4px;
              background: rgba(255,0,0,0.7);
              color: white;
              cursor: pointer;
            " onclick="removerImagem('${id}', ${index})">❌</button>
          </div>
        `;
      });
    }

    produtosDiv.innerHTML += `
      <div class="card" data-id="${id}">
        <div class="imagens-container">
          ${imagensHTML}
        </div>

        <h3>${produto.nome}</h3>
        <p class="categoria">Categoria: ${produto.categoria}</p>
        <p class="descricao">${(produto.descricao || "").replace(/\n/g, "<br>")}</p>
        <div class="preco">R$ ${produto.preco}</div>

        <div class="botoes" style="margin-top:10px;">
          <button class="btn-editar" onclick="ativarEdicao('${id}')">✏️ Editar</button>
          <button class="btn-salvar" onclick="salvarEdicao('${id}')">💾 Salvar</button>
          <button class="btn-excluir" onclick="excluirProduto('${id}')">🗑 Excluir</button>
          <button onclick="abrirPromocao('${id}')">🔥 Promoção</button>
          <button 
            onclick="marcarVendido('${id}')" 
            style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">
            ${produto.vendido ? "Desmarcar" : "Vendido"}
          </button>
        </div>
      </div>
    `;
  });
}


// Ativa edição inline
window.ativarEdicao = function(id) {
  const card = document.querySelector(`.card[data-id='${id}']`);
  if (!card) return;

  card.querySelector("h3").contentEditable = true;
  card.querySelector(".categoria").contentEditable = true;
  card.querySelector(".descricao").contentEditable = true;
  card.querySelector(".preco").contentEditable = true;

  card.querySelectorAll("h3, .categoria, .descricao, .preco").forEach(el => {
    el.style.border = "1px dashed #3b82f6";
    el.style.padding = "2px 4px";
  });
};

// Salva edição inline
window.salvarEdicao = async function(id) {
  const card = document.querySelector(`.card[data-id='${id}']`);
  if (!card) return;

  const novoNome = card.querySelector("h3").textContent.trim();
  const novaCategoria = card.querySelector(".categoria").textContent.trim();
  const novaDescricao = card.querySelector(".descricao").innerHTML.replace(/<br>/g,"\n").trim();
  const novoPreco = card.querySelector(".preco").textContent.replace("R$ ","").trim();

  await updateDoc(doc(db, "produtos", id), {
    nome: novoNome,
    categoria: novaCategoria,
    descricao: novaDescricao,
    preco: novoPreco
  });

  // Desativa edição visual
  card.querySelectorAll("h3, .categoria, .descricao, .preco").forEach(el => {
    el.contentEditable = false;
    el.style.border = "none";
    el.style.padding = "0";
  });

  alert("Produto atualizado!");
};


window.salvarEdicao = async function(id) {
  const card = document.querySelector(`.card[data-id='${id}']`);
  if (!card) return;

  const novoNome = card.querySelector("h3").textContent;
  const novaCategoria = card.querySelector(".categoria").textContent;
  const novaDescricao = card.querySelector(".descricao").innerHTML.replace(/<br>/g,"\n");
  const novoPreco = card.querySelector(".preco").textContent.replace("R$ ","");

  await updateDoc(doc(db, "produtos", id), {
    nome: novoNome,
    categoria: novaCategoria,
    descricao: novaDescricao,
    preco: novoPreco
  });

  alert("Produto atualizado!");
};

//////////////////////////////////////////////////////
// EXCLUIR PRODUTO
//////////////////////////////////////////////////////
window.excluirProduto = async function(id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  await deleteDoc(doc(db, "produtos", id));
  alert("Produto excluído!");
  carregarProdutos();
};

//////////////////////////////////////////////////////
// EDITAR PRODUTO (COM IMAGENS)
//////////////////////////////////////////////////////
window.editarProduto = async function(id) {

  const querySnapshot = await getDocs(collection(db, "produtos"));
  let produtoAtual = null;

  querySnapshot.forEach((documento) => {
    if (documento.id === id) {
      produtoAtual = documento.data();
    }
  });

  if (!produtoAtual) {
    alert("Produto não encontrado!");
    return;
  }

  const novoNome = prompt("Novo nome:", produtoAtual.nome);
  const novaCategoria = prompt("Nova categoria:", produtoAtual.categoria);
  const novoPreco = prompt("Novo preço:", produtoAtual.preco);
  const novaDescricao = prompt("Nova descrição:", produtoAtual.descricao);



  if (!novoNome || !novaCategoria || !novoPreco) {
    alert("Edição cancelada.");
    return;
  }

  const adicionarImagens = confirm("Deseja adicionar novas imagens?");
  let novasImagens = produtoAtual.imagens || [];

  if (adicionarImagens) {

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async function() {

      for (let i = 0; i < input.files.length; i++) {
        const url = await uploadImagem(input.files[i]);
        novasImagens.push(url);
      }

     await updateDoc(doc(db, "produtos", id), {
     nome: novoNome,
     categoria: novaCategoria,
  preco: novoPreco,
  descricao: novaDescricao,
  imagens: novasImagens
    });


      alert("Produto atualizado!");
      carregarProdutos();
    };

    input.click();

  } else {

     await updateDoc(doc(db, "produtos", id), {
  nome: novoNome,
  categoria: novaCategoria,
  preco: novoPreco,
  descricao: novaDescricao
});


    alert("Produto atualizado!");
    carregarProdutos();
  }
};

carregarProdutos();
//////////////////////////////////////////////////////
// FILTRAR POR CATEGORIA
//////////////////////////////////////////////////////
window.filtrarCategoria = async function() {
  const categoriaSelecionada = document.getElementById("filtroCategoria").value;
  const produtosDiv = document.getElementById("produtos");
  produtosDiv.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "produtos"));

  querySnapshot.forEach((documento) => {
    const produto = documento.data();
    const id = documento.id;

    // Verifica categoria
    if (categoriaSelecionada === "" || produto.categoria === categoriaSelecionada) {

      // Monta imagens
      let imagensHTML = "";
      if (produto.imagens && produto.imagens.length > 0) {
        produto.imagens.forEach(img => {
          imagensHTML += `
            <div style="position: relative; display: inline-block; margin-right: 5px;">
              <a href="${img}" target="_blank"><img src="${img}" alt="${produto.nome}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;"></a>
              <button style="
                position: absolute;
                bottom: 2px;
                right: 2px;
                font-size: 10px;
                padding: 2px 4px;
                border: none;
                border-radius: 4px;
                background: rgba(0,0,0,0.6);
                color: white;
                cursor: pointer;
              " onclick="navigator.clipboard.writeText('${img}'); alert('URL copiada!')">
                Copiar URL
              </button>
            </div>
          `;
        });
      }

      // Monta o card completo com editar, salvar e excluir
      produtosDiv.innerHTML += `
        <div class="card" data-id="${id}">
          <div class="imagens-container">
            ${imagensHTML}
          </div>

          <h3>${produto.nome}</h3>
          <p class="categoria">${produto.categoria}</p>
          <p class="descricao">${(produto.descricao || "").replace(/\n/g, "<br>")}</p>
          <div class="preco">R$ ${produto.preco}</div>

          <div class="botoes" style="margin-top:10px;">
            <button class="btn-editar" onclick="ativarEdicao('${id}')">✏️ Editar</button>
            <button class="btn-salvar" onclick="salvarEdicao('${id}')">💾 Salvar</button>
            <button class="btn-excluir" onclick="excluirProduto('${id}')">🗑 Excluir</button>
          </div>
        </div>
      `;
    }
  });
};

window.filtrarProdutos = async function() {
  const pesquisa = document.getElementById("pesquisa").value.toLowerCase();
  const categoriaSelecionada = document.getElementById("filtroCategoria").value;
  const produtosDiv = document.getElementById("produtos");
  produtosDiv.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "produtos"));

  querySnapshot.forEach((documento) => {
    const produto = documento.data();
    const id = documento.id;

    // Verifica categoria
    const categoriaMatch = categoriaSelecionada === "" || produto.categoria === categoriaSelecionada;

    // Verifica pesquisa por nome
    const nomeMatch = produto.nome.toLowerCase().includes(pesquisa);

    if (categoriaMatch && nomeMatch) {
      let imagensHTML = "";
      if (produto.imagens && produto.imagens.length > 0) {
        produto.imagens.forEach(img => {
          imagensHTML += `
            <div style="position: relative; display: inline-block; margin-right: 5px;">
              <a href="${img}" target="_blank"><img src="${img}" alt="${produto.nome}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;"></a>
              <button style="
                position: absolute;
                bottom: 2px;
                right: 2px;
                font-size: 10px;
                padding: 2px 4px;
                border: none;
                border-radius: 4px;
                background: rgba(0,0,0,0.6);
                color: white;
                cursor: pointer;
              " onclick="navigator.clipboard.writeText('${img}'); alert('URL copiada!')">
                Copiar URL
              </button>
            </div>
          `;
        });
      }

      produtosDiv.innerHTML += `
        <div class="card" data-id="${id}">
          <div class="imagens-container">
            ${imagensHTML}
          </div>
          <h3>${produto.nome}</h3>
          <p class="categoria">${produto.categoria}</p>
          <p class="descricao">${(produto.descricao || "").replace(/\n/g, "<br>")}</p>
          <div class="preco">R$ ${produto.preco}</div>
          <div class="botoes" style="margin-top:10px;">
            <button class="btn-editar" onclick="ativarEdicao('${id}')">✏️ Editar</button>
            <button class="btn-salvar" onclick="salvarEdicao('${id}')">💾 Salvar</button>
            <button class="btn-excluir" onclick="excluirProduto('${id}')">🗑 Excluir</button>
            <button onclick="adicionarImagem('ID_DO_PRODUTO')">➕ Adicionar Foto</button>

          </div>
        </div>
      `;
    }
  });
};

let produtoPromoId = null;

window.abrirPromocao = async function(id) {

  produtoPromoId = id;

  const docSnap = await getDocs(collection(db, "produtos"));

  docSnap.forEach((documento) => {
    if (documento.id === id) {
      const produto = documento.data();

      if (produto.promocao) {
        document.getElementById("promoAtiva").checked = produto.promocao.ativo;
        document.getElementById("promoDesconto").value = produto.promocao.desconto;
        document.getElementById("promoInicio").value = produto.promocao.dataInicio || "";
        document.getElementById("promoFim").value = produto.promocao.dataFim || "";
      }
    }
  });

  document.getElementById("modalPromocao").style.display = "flex";
};

window.fecharPromocao = function() {
  document.getElementById("modalPromocao").style.display = "none";
};

window.salvarPromocao = async function() {

  const promocao = {
    ativo: document.getElementById("promoAtiva").checked,
    desconto: parseFloat(document.getElementById("promoDesconto").value) || 0,
    dataInicio: document.getElementById("promoInicio").value || null,
    dataFim: document.getElementById("promoFim").value || null
  };

  await updateDoc(doc(db, "produtos", produtoPromoId), {
    promocao
  });

  alert("Promoção salva!");
  fecharPromocao();
  carregarProdutos();
};
// Abrir modal para promoção por categoria
window.abrirPromocaoCategoria = function() {
  // Limpar campos
  document.getElementById("promoAtiva").checked = true;
  document.getElementById("promoDesconto").value = "";
  document.getElementById("promoInicio").value = "";
  document.getElementById("promoFim").value = "";
  document.getElementById("categoriaPromo").value = "";

  document.getElementById("modalPromocao").style.display = "flex";
};
window.salvarPromocaoCategoria = async function() {
  const ativa = document.getElementById("promoAtiva").checked;
  const desconto = parseFloat(document.getElementById("promoDesconto").value) || 0;
  const inicio = document.getElementById("promoInicio").value;
  const fim = document.getElementById("promoFim").value;
  const categoria = document.getElementById("categoriaPromo").value;

  if (!categoria) {
    alert("Selecione uma categoria!");
    return;
  }

  const produtosSnapshot = await getDocs(collection(db, "produtos"));
  const updates = [];

  produtosSnapshot.forEach((docSnap) => {
    const produto = docSnap.data();
    if (produto.categoria === categoria) {
      const promocao = ativa
        ? {
            ativo: true,
            desconto: desconto,
            dataInicio: inicio,
            dataFim: fim
          }
        : { ativo: false, desconto: 0, dataInicio: null, dataFim: null };

      updates.push(updateDoc(doc(db, "produtos", docSnap.id), { promocao }));
    }
  });

  await Promise.all(updates);

  alert(`Promoção aplicada na categoria "${categoria}"!`);
  document.getElementById("modalPromocao").style.display = "none";
  carregarProdutos();
};

window.marcarVendido = async function(id) {
  const docRef = doc(db, "produtos", id);
  const docSnap = await getDocs(collection(db, "produtos"));
  let produtoAtual;

  docSnap.forEach(d => {
    if (d.id === id) produtoAtual = d.data();
  });

  if (!produtoAtual) return;

  await updateDoc(docRef, {
    vendido: !produtoAtual.vendido
  });

  alert(produtoAtual.vendido ? "Produto desmarcado!" : "Produto marcado como vendido!");
  carregarProdutos();
};
// Substituir uma imagem específica do produto
window.substituirImagem = async function(produtoId, index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;

    const url = await uploadImagem(file); // envia para Cloudinary

    // Pega o produto atual
    const docRef = doc(db, "produtos", produtoId);
    const docSnap = await getDocs(collection(db, "produtos"));
    let produtoAtual;
    docSnap.forEach(d => {
      if (d.id === produtoId) produtoAtual = d.data();
    });

    if (!produtoAtual) return;

    const imagens = produtoAtual.imagens || [];
    imagens[index] = url; // substitui a imagem

    await updateDoc(docRef, { imagens });
    alert("Imagem substituída!");
    carregarProdutos();
  };

  input.click();
};

// Remover uma imagem específica do produto
window.removerImagem = async function(produtoId, index) {
  if (!confirm("Deseja realmente remover esta imagem?")) return;

  const docRef = doc(db, "produtos", produtoId);
  const docSnap = await getDocs(collection(db, "produtos"));
  let produtoAtual;
  docSnap.forEach(d => {
    if (d.id === produtoId) produtoAtual = d.data();
  });

  if (!produtoAtual) return;

  const imagens = produtoAtual.imagens || [];
  imagens.splice(index, 1); // remove a imagem

  await updateDoc(docRef, { imagens });
  alert("Imagem removida!");
  carregarProdutos();
};

// Adicionar novas imagens a um produto existente
window.adicionarImagem = async function(produtoId) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = "image/*";

  input.onchange = async function() {
    if (!input.files.length) return;

    const docRef = doc(db, "produtos", produtoId);
    const docSnap = await getDocs(collection(db, "produtos"));
    let produtoAtual;
    docSnap.forEach(d => {
      if (d.id === produtoId) produtoAtual = d.data();
    });

    if (!produtoAtual) return;

    let novasImagens = produtoAtual.imagens || [];

    // Envia cada arquivo para Cloudinary e adiciona à lista
    for (let i = 0; i < input.files.length; i++) {
      const url = await uploadImagem(input.files[i]);
      novasImagens.push(url);
    }

    await updateDoc(docRef, { imagens: novasImagens });
    alert("Nova(s) imagem(ns) adicionada(s)!");
    carregarProdutos();
  };

  input.click();
};
