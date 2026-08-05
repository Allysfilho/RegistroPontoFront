<script setup>
import { onMounted, reactive, ref } from 'vue'
import CredenciaisGeradas from '@/components/CredenciaisGeradas.vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const administradores = ref([])
const carregando = ref(true)
const erro = ref(null)
const credenciais = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)

const formulario = reactive({ nome: '', email: '', status: true })

function url(caminho = '') {
  return `/${props.empresa}/admin/administradores${caminho}`
}

function souEu(administrador) {
  return administrador.id === store.usuario?.id
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(url())
    administradores.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os administradores.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, { nome: '', email: '', status: true })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(administrador) {
  editando.value = administrador
  Object.assign(formulario, {
    nome: administrador.nome,
    email: administrador.email,
    status: administrador.status,
  })
  erroModal.value = null
  modalAberto.value = true
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = {
    nome: formulario.nome.trim(),
    email: formulario.email.trim(),
    status: formulario.status,
  }

  try {
    if (editando.value) {
      await store.api.put(url(`/${editando.value.id}`), payload)
    } else {
      const { data } = await store.api.post(url(), payload)
      credenciais.value = data.credenciais_iniciais
    }

    modalAberto.value = false
    await carregar()
  } catch (e) {
    erroModal.value = mensagemDeErro(e)
  } finally {
    enviando.value = false
  }
}

async function resetarSenha(administrador) {
  erro.value = null

  try {
    const { data } = await store.api.post(url(`/${administrador.id}/resetar-senha`))
    credenciais.value = data.credenciais_iniciais
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

async function remover(administrador) {
  erro.value = null

  try {
    await store.api.delete(url(`/${administrador.id}`))
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

onMounted(carregar)
</script>

<template>
  <PainelLayout
    :store="store"
    titulo="Painel da empresa"
    :subtitulo="store.usuario?.empresa?.nome"
    :itens="ITENS_MENU_ADMIN"
    :contexto="empresa"
    rota-entrar="admin.entrar"
  >
    <template #titulo>Administradores</template>
    <template #acoes>
      <button class="botao botao--compacto" type="button" @click="abrirCriacao">
        Novo administrador
      </button>
    </template>

    <CredenciaisGeradas
      v-if="credenciais"
      :credenciais="credenciais"
      rotulo-identificacao="E-mail"
      @fechar="credenciais = null"
    />

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <ul v-else class="lista">
      <li v-for="pessoa in administradores" :key="pessoa.id" class="cartao">
        <div class="titulo">
          <strong>{{ pessoa.nome }}</strong>
          <span v-if="souEu(pessoa)" class="etiqueta">você</span>
          <span v-if="!pessoa.status" class="etiqueta etiqueta--inativo">inativo</span>
          <span v-else-if="pessoa.senha_provisoria" class="etiqueta">senha provisória</span>
        </div>

        <p class="email">{{ pessoa.email }}</p>

        <div class="acoes">
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(pessoa)">
            Editar
          </button>
          <button class="botao botao--secundario botao--compacto" type="button" @click="resetarSenha(pessoa)">
            Resetar senha
          </button>
          <button
            v-if="!souEu(pessoa)"
            class="botao botao--perigo botao--compacto"
            type="button"
            @click="remover(pessoa)"
          >
            Remover
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar administrador' : 'Novo administrador'"
      :enviando="enviando"
      :erro="erroModal"
      @fechar="modalAberto = false"
      @confirmar="salvar"
    >
      <label class="campo">
        <span class="campo__rotulo">Nome</span>
        <input v-model="formulario.nome" class="campo__entrada" required />
      </label>

      <label class="campo">
        <span class="campo__rotulo">E-mail</span>
        <input v-model="formulario.email" class="campo__entrada" type="email" required />
        <span class="campo__ajuda">Único dentro desta empresa.</span>
      </label>

      <label v-if="editando && !souEu(editando)" class="campo campo--linha">
        <input v-model="formulario.status" type="checkbox" />
        <span class="campo__rotulo">Administrador ativo</span>
      </label>

      <p v-if="!editando" class="campo__ajuda">
        A senha provisória é gerada automaticamente e exibida uma única vez.
      </p>
    </ModalFormulario>
  </PainelLayout>
</template>

<style scoped>
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.email {
  margin: 0.25rem 0 0.9rem;
  font-size: 0.9rem;
  color: var(--cor-texto-suave);
  word-break: break-all;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
