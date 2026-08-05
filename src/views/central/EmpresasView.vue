<script setup>
import { onMounted, reactive, ref } from 'vue'
import CredenciaisGeradas from '@/components/CredenciaisGeradas.vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useSuperadminStore } from '@/stores/auth'
import { ITENS_MENU_CENTRAL } from './menu'

const store = useSuperadminStore()

const empresas = ref([])
const carregando = ref(true)
const erro = ref(null)
const credenciais = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)

const formulario = reactive({
  slug: '',
  nome_razao_social: '',
  cnpj: '',
  tipo_identificador_funcionario: 'matricula',
  administrador: { nome: '', email: '' },
})

const exclusao = reactive({ aberta: false, empresa: null, confirmacao: '', erro: null, enviando: false })

const TIPOS = [
  { valor: 'matricula', rotulo: 'Matrícula' },
  { valor: 'cpf', rotulo: 'CPF' },
  { valor: 'custom', rotulo: 'Identificador personalizado' },
]

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get('/central/empresas')
    empresas.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar as empresas.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, {
    slug: '',
    nome_razao_social: '',
    cnpj: '',
    tipo_identificador_funcionario: 'matricula',
    administrador: { nome: '', email: '' },
  })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(empresa) {
  editando.value = empresa
  Object.assign(formulario, {
    slug: empresa.slug,
    nome_razao_social: empresa.nome_razao_social,
    cnpj: empresa.cnpj ?? '',
    tipo_identificador_funcionario: empresa.tipo_identificador_funcionario,
    administrador: { nome: '', email: '' },
  })
  erroModal.value = null
  modalAberto.value = true
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = {
    slug: formulario.slug.trim(),
    nome_razao_social: formulario.nome_razao_social.trim(),
    cnpj: formulario.cnpj.trim() || null,
    tipo_identificador_funcionario: formulario.tipo_identificador_funcionario,
  }

  try {
    if (editando.value) {
      await store.api.put(`/central/empresas/${editando.value.id}`, payload)
    } else {
      // Criar a empresa provisiona o schema, roda as migrations e cadastra o
      // primeiro administrador — pode demorar alguns segundos.
      const { data } = await store.api.post('/central/empresas', {
        ...payload,
        administrador: {
          nome: formulario.administrador.nome.trim(),
          email: formulario.administrador.email.trim(),
        },
      })

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

function abrirExclusao(empresa) {
  Object.assign(exclusao, { aberta: true, empresa, confirmacao: '', erro: null, enviando: false })
}

async function excluir() {
  exclusao.enviando = true
  exclusao.erro = null

  try {
    await store.api.delete(`/central/empresas/${exclusao.empresa.id}`, {
      data: { confirmacao: exclusao.confirmacao.trim() },
    })

    exclusao.aberta = false
    await carregar()
  } catch (e) {
    exclusao.erro = mensagemDeErro(e)
  } finally {
    exclusao.enviando = false
  }
}

onMounted(carregar)
</script>

<template>
  <PainelLayout
    :store="store"
    titulo="Painel central"
    :subtitulo="store.usuario?.nome"
    :itens="ITENS_MENU_CENTRAL"
    rota-entrar="central.entrar"
  >
    <template #titulo>Empresas</template>
    <template #acoes>
      <button class="botao botao--compacto" type="button" @click="abrirCriacao">
        Nova empresa
      </button>
    </template>

    <CredenciaisGeradas
      v-if="credenciais"
      :credenciais="credenciais"
      rotulo-identificacao="E-mail do admin"
      @fechar="credenciais = null"
    />

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!empresas.length" class="vazio">
      Nenhuma empresa cadastrada ainda.
    </p>

    <ul v-else class="lista">
      <li v-for="empresa in empresas" :key="empresa.id" class="cartao item">
        <div class="item__principal">
          <strong>{{ empresa.nome_razao_social }}</strong>
          <code class="item__slug">/{{ empresa.slug }}</code>
        </div>

        <dl class="item__meta">
          <div><dt>Schema</dt><dd>{{ empresa.schema }}</dd></div>
          <div><dt>Identificador</dt><dd>{{ empresa.tipo_identificador_funcionario }}</dd></div>
          <div><dt>CNPJ</dt><dd>{{ empresa.cnpj || '—' }}</dd></div>
          <div>
            <dt>Totais</dt>
            <dd>
              {{ empresa.totais.funcionarios }} func. ·
              {{ empresa.totais.administradores }} admin ·
              {{ empresa.totais.registros_ponto }} pontos
            </dd>
          </div>
        </dl>

        <div class="item__acoes">
          <a class="botao botao--secundario botao--compacto" :href="`/${empresa.slug}/admin/entrar`">
            Abrir painel
          </a>
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(empresa)">
            Editar
          </button>
          <button class="botao botao--perigo botao--compacto" type="button" @click="abrirExclusao(empresa)">
            Excluir
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar empresa' : 'Nova empresa'"
      :enviando="enviando"
      :erro="erroModal"
      @fechar="modalAberto = false"
      @confirmar="salvar"
    >
      <label class="campo">
        <span class="campo__rotulo">Razão social</span>
        <input v-model="formulario.nome_razao_social" class="campo__entrada" required />
      </label>

      <label class="campo">
        <span class="campo__rotulo">Identificador na URL</span>
        <input v-model="formulario.slug" class="campo__entrada" autocapitalize="none" required />
        <span class="campo__ajuda">
          Só letras minúsculas, números e hífen. Vira o endereço da empresa:
          /{{ formulario.slug || 'minha-empresa' }}/entrar
        </span>
      </label>

      <label class="campo">
        <span class="campo__rotulo">CNPJ</span>
        <input v-model="formulario.cnpj" class="campo__entrada" inputmode="numeric" />
        <span class="campo__ajuda">14 dígitos, sem pontuação. Opcional.</span>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Como os funcionários se identificam</span>
        <select v-model="formulario.tipo_identificador_funcionario" class="campo__entrada">
          <option v-for="tipo in TIPOS" :key="tipo.valor" :value="tipo.valor">
            {{ tipo.rotulo }}
          </option>
        </select>
      </label>

      <template v-if="!editando">
        <hr class="divisor" />
        <p class="campo__ajuda secao">
          Primeiro administrador da empresa. Sem ele ninguém consegue entrar no
          painel dela.
        </p>

        <label class="campo">
          <span class="campo__rotulo">Nome do administrador</span>
          <input v-model="formulario.administrador.nome" class="campo__entrada" required />
        </label>

        <label class="campo">
          <span class="campo__rotulo">E-mail do administrador</span>
          <input v-model="formulario.administrador.email" class="campo__entrada" type="email" required />
        </label>
      </template>
    </ModalFormulario>

    <ModalFormulario
      v-if="exclusao.aberta"
      titulo="Excluir empresa"
      rotulo-confirmar="Excluir definitivamente"
      :enviando="exclusao.enviando"
      :erro="exclusao.erro"
      @fechar="exclusao.aberta = false"
      @confirmar="excluir"
    >
      <p class="alerta alerta--erro">
        Isto apaga o schema <strong>{{ exclusao.empresa.schema }}</strong> com
        todos os funcionários e registros de ponto. Não há como desfazer.
      </p>

      <label class="campo">
        <span class="campo__rotulo">
          Digite <code>{{ exclusao.empresa.slug }}</code> para confirmar
        </span>
        <input v-model="exclusao.confirmacao" class="campo__entrada" autocapitalize="none" />
      </label>
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

.item__principal {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.item__slug {
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}

.item__meta {
  margin: 0 0 1rem;
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.item__meta div {
  display: flex;
  gap: 0.6rem;
}

.item__meta dt {
  min-width: 7rem;
  color: var(--cor-texto-suave);
}

.item__meta dd {
  margin: 0;
  word-break: break-word;
}

.item__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.vazio {
  color: var(--cor-texto-suave);
}

.divisor {
  margin: 1.25rem 0 1rem;
  border: 0;
  border-top: 1px solid var(--cor-borda);
}

.secao {
  margin-bottom: 1rem;
}
</style>
