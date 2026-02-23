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
// FUNÇÕES AUXILIARES (UPLOAD E RENDERIZAÇÃO)
//////////////////////////////////////////////////////

async function uploadImagem(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "vendas_produtos");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dsuz5hiq6/image/upload",
    { method: "POST", body: formData }
  );

  const data = await response.json();
  return data.secure_url;
}

// ESTA É A FUNÇÃO QUE CORRIGE O BUG - ELA GERA O HTML IGUAL PARA TUDO
function gerarHTMLCard(id, produto) {
  let imagensHTML = "";
  if (produto.imagens && produto.imagens.length > 0) {
    produto.imagens.forEach((img, index) => {
      imagensHTML += `
        <div style="position: relative; display: inline-block; margin-right: 5px;">
          <img src="${img}" alt="${produto.nome}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;">
          <button style="position: absolute; top: 2px; left: 2px; font-size: 10px; padding: 2px 4px; border: none; border-radius: 4px; background: rgba(0,0,0,0.6); color: white; cursor: pointer;" onclick="substituirImagem('${id}', ${index})">Trocar</button>
          <button style="position: absolute; top: 2px; right: 2px; font-size: 10px; padding: 2px 4px; border: none; border-radius: 4px; background: rgba(255,0,0,0.7); color: white; cursor: pointer;" onclick="removerImagem('${id}', ${index})">❌</button>
        </div>`;
    });
  }

  return `
    <div class="card" data-id="${id}" data-vendido="${produto.vendido}">
      <div class="imagens-container">${imagensHTML}</div>
      <h3 contenteditable="false">${produto.nome}</h3>
      <p class="categoria" contenteditable="false">Categoria: ${produto.categoria}</p>
      <p class="descricao" contenteditable="false">${(produto.descricao || "").replace(/\n/g, "<br>")}</p>
      <div class="preco" contenteditable="false">R$ ${produto.preco}</div>
      
      <div class="botoes" style="margin-top:15px; display: flex; flex-wrap: wrap; gap: 8px;">
        <button class="btn-editar" style="background:#3b82f6; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="ativarEdicao('${id}')">✏️ Editar</button>
        <button class="btn-salvar" style="background:#22c55e; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="salvarEdicao('${id}')">💾 Salvar</button>
        <button class="btn-excluir" style="background:#64748b; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="excluirProduto('${id}')">🗑 Excluir</button>
        <button style="background:#f59e0b; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="abrirPromocao('${id}')">🔥 Promoção</button>
        <button style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="marcarVendido('${id}')">
          ${produto.vendido ? "Desmarcar" : "Vendido"}
        </button>
        <button style="background:#8b5cf6; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="adicionarImagem('${id}')">➕ Foto</button>
      </div>
    </div>`;
}

//////////////////////////////////////////////////////
// CARREGAR E FILTRAR (TODAS USAM A FUNÇÃO ACIMA)
//////////////////////////////////////////////////////

async function carregarProdutos() {
  const produtosDiv = document.getElementById("produtos");
  if (!produtosDiv) return;

  const q = query(collection(db, "produtos"), orderBy("criadoEm", "asc"));
  const querySnapshot = await getDocs(q);
  produtosDiv.innerHTML = "";

  querySnapshot.forEach((documento) => {
    produtosDiv.innerHTML += gerarHTMLCard(documento.id, documento.data());
  });
}

window.filtrarCategoria = async function() {
  const categoriaSelecionada = document.getElementById("filtroCategoria").value;
  const produtosDiv = document.getElementById("produtos");
  produtosDiv.innerHTML = "Carregando...";

  const querySnapshot = await getDocs(collection(db, "produtos"));
  produtosDiv.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const produto = doc.data();
    if (categoriaSelecionada === "" || produto.categoria === categoriaSelecionada) {
      produtosDiv.innerHTML += gerarHTMLCard(doc.id, produto);
    }
  });
};

window.filtrarProdutos = async function() {
  const pesquisa = document.getElementById("pesquisa").value.toLowerCase();
  const categoriaSelecionada = document.getElementById("filtroCategoria").value;
  const produtosDiv = document.getElementById("produtos");

  const querySnapshot = await getDocs(collection(db, "produtos"));
  produtosDiv.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const produto = doc.data();
    const categoriaMatch = categoriaSelecionada === "" || produto.categoria === categoriaSelecionada;
    const nomeMatch = produto.nome.toLowerCase().includes(pesquisa);

    if (categoriaMatch && nomeMatch) {
      produtosDiv.innerHTML += gerarHTMLCard(doc.id, produto);
    }
  });
};

//////////////////////////////////////////////////////
// AÇÕES DO PRODUTO (SALVAR, EDITAR, VENDER)
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
      const url = await uploadImagem(imagesInput.files[i]);
      urlsImagens.push(url);
    }

    await addDoc(collection(db, "produtos"), {
      nome, categoria, preco: parseFloat(preco),
      descricao, imagens: urlsImagens, criadoEm: serverTimestamp(),
      vendido: false,
      promocao: { ativo: false, desconto: 0, dataInicio: null, dataFim: null }
    });

    alert("Produto salvo!");
    carregarProdutos();
    ["nome", "categoria", "preco", "descricao", "imagem"].forEach(id => document.getElementById(id).value = "");
  } catch (error) { console.error(error); alert("Erro ao salvar!"); }
};

window.ativarEdicao = function(id) {
  const card = document.querySelector(`.card[data-id='${id}']`);
  if (!card) return;
  card.querySelectorAll("h3, .categoria, .descricao, .preco").forEach(el => {
    el.contentEditable = true;
    el.style.border = "1px dashed #3b82f6";
    el.style.padding = "2px 4px";
  });
};

window.salvarEdicao = async function(id) {
  const card = document.querySelector(`.card[data-id='${id}']`);
  const novoNome = card.querySelector("h3").textContent.trim();
  const novaCategoria = card.querySelector(".categoria").textContent.replace("Categoria: ", "").trim();
  const novaDescricao = card.querySelector(".descricao").innerHTML.replace(/<br>/g,"\n").trim();
  const novoPreco = card.querySelector(".preco").textContent.replace("R$ ","").trim();

  await updateDoc(doc(db, "produtos", id), {
    nome: novoNome, categoria: novaCategoria,
    descricao: novaDescricao, preco: parseFloat(novoPreco)
  });

  alert("Atualizado!");
  carregarProdutos();
};

window.excluirProduto = async function(id) {
  if (confirm("Excluir?")) {
    await deleteDoc(doc(db, "produtos", id));
    carregarProdutos();
  }
};

window.marcarVendido = async function(id) {
  const querySnapshot = await getDocs(collection(db, "produtos"));
  let statusAtual = false;
  querySnapshot.forEach(d => { if(d.id === id) statusAtual = d.data().vendido; });

  await updateDoc(doc(db, "produtos", id), { vendido: !statusAtual });
  carregarProdutos();
};

//////////////////////////////////////////////////////
// IMAGENS E PROMOÇÃO
//////////////////////////////////////////////////////

window.substituirImagem = async function(produtoId, index) {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = async function() {
    const url = await uploadImagem(input.files[0]);
    const q = await getDocs(collection(db, "produtos"));
    let imgs = [];
    q.forEach(d => { if(d.id === produtoId) imgs = d.data().imagens; });
    imgs[index] = url;
    await updateDoc(doc(db, "produtos", produtoId), { imagens: imgs });
    carregarProdutos();
  };
  input.click();
};

window.removerImagem = async function(produtoId, index) {
  if (!confirm("Remover imagem?")) return;
  const q = await getDocs(collection(db, "produtos"));
  let imgs = [];
  q.forEach(d => { if(d.id === produtoId) imgs = d.data().imagens; });
  imgs.splice(index, 1);
  await updateDoc(doc(db, "produtos", produtoId), { imagens: imgs });
  carregarProdutos();
};

window.adicionarImagem = async function(produtoId) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.onchange = async function() {
    const q = await getDocs(collection(db, "produtos"));
    let imgs = [];
    q.forEach(d => { if(d.id === produtoId) imgs = d.data().imagens || []; });
    for (let file of input.files) {
      const url = await uploadImagem(file);
      imgs.push(url);
    }
    await updateDoc(doc(db, "produtos", produtoId), { imagens: imgs });
    carregarProdutos();
  };
  input.click();
};

let produtoPromoId = null;
window.abrirPromocao = function(id) {
  produtoPromoId = id;
  document.getElementById("modalPromocao").style.display = "flex";
};

window.fecharPromocao = () => document.getElementById("modalPromocao").style.display = "none";

window.salvarPromocao = async function() {
  const promocao = {
    ativo: document.getElementById("promoAtiva").checked,
    desconto: parseFloat(document.getElementById("promoDesconto").value) || 0,
    dataInicio: document.getElementById("promoInicio").value || null,
    dataFim: document.getElementById("promoFim").value || null
  };
  await updateDoc(doc(db, "produtos", produtoPromoId), { promocao });
  alert("Promoção salva!");
  fecharPromocao();
  carregarProdutos();
};

window.filtrarVendido = function () {
  const filtro = document.getElementById("filtroVendido").value;
  document.querySelectorAll(".card").forEach(card => {
    const vendido = card.getAttribute("data-vendido") === "true";
    card.style.display = (filtro === "todos" || (filtro === "vendido" && vendido) || (filtro === "disponivel" && !vendido)) ? "block" : "none";
  });
};

// Inicialização
carregarProdutos();
