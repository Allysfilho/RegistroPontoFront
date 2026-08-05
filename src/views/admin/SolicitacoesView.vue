<script setup>
import { onMounted, reactive, ref } from 'vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { dataHora } from '@/services/formato'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const solicitacoes = ref([])
const pendentes = ref(0)
const filtro = ref('')
const carregando = ref(true)
const erro = ref(null)

const resposta = reactive({
  aberta: false,
  solicitacao: null,
  status: 'aprovado',
  texto: '',
  enviando: false,
  erro: null,
})

function url(caminho = '') {
  return `/${props.empresa}/admin/solicitacoes${caminho}`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(url(), {
      params: { status: filtro.value || undefined },
    })

    solicitacoes.value = data.data
    pendentes.value = data.pendentes
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar as solicitações.')
  } finally {
    carregando.value = false
  }
}

function abrirResposta(solicitacao, status) {
  Object.assign(resposta, {
    aberta: true,
    solicitacao,
    status,
    texto: '',
    enviando: false,
    erro: null,
  })
}

async function responder() {
  resposta.enviando = true
  resposta.erro = null

  try {
    await store.api.post(url(`/${resposta.solicitacao.id}/responder`), {
      status: resposta.status,
      resposta: resposta.texto.trim() || null,
    })

    resposta.aberta = false
    await carregar()
  } catch (e) {
    resposta.erro = mensagemDeErro(e)
  } finally {
    resposta.enviando = false
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
    <template #titulo>Solicitações de ajuste</template>

    <p v-if="pendentes" class="alerta alerta--aviso">
      {{ pendentes }} solicitação(ões) aguardando resposta.
    </p>

    <label class="campo filtro">
      <span class="campo__rotulo">Situação</span>
      <select v-model="filtro" class="campo__entrada" @change="carregar">
        <option value="">Todas</option>
        <option value="pendente">Pendentes</option>
        <option value="aprovado">Aprovadas</option>
        <option value="rejeitado">Rejeitadas</option>
      </select>
    </label>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!solicitacoes.length" class="vazio">Nenhuma solicitação encontrada.</p>

    <ul v-else class="lista">
      <li v-for="item in solicitacoes" :key="item.id" class="cartao">
        <div class="topo">
          <strong>{{ item.funcionario?.nome }}</strong>
          <span class="secundario">{{ item.funcionario?.identificador }}</span>
          <span class="etiqueta" :class="`etiqueta--${item.status}`">{{ item.status_rotulo }}</span>
          <span class="data">{{ dataHora(item.criada_em) }}</span>
        </div>

        <p v-if="item.registro" class="referencia">
          Marcação de {{ dataHora(item.registro.registrado_em) }}
          — {{ item.registro.tipo_rotulo }}, NSR {{ item.registro.nsr }}
        </p>
        <p v-else class="referencia">Marcação esquecida (sem registro vinculado)</p>

        <p class="motivo">{{ item.motivo }}</p>

        <div v-if="item.status === 'pendente'" class="acoes">
          <button class="botao botao--compacto" type="button" @click="abrirResposta(item, 'aprovado')">
            Aprovar
          </button>
          <button class="botao botao--perigo botao--compacto" type="button" @click="abrirResposta(item, 'rejeitado')">
            Rejeitar
          </button>
        </div>

        <div v-else class="respondida">
          <strong>
            {{ item.status_rotulo }} por {{ item.respondida_por || '—' }}
            em {{ dataHora(item.respondida_em) }}
          </strong>
          <p v-if="item.resposta">{{ item.resposta }}</p>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="resposta.aberta"
      :titulo="resposta.status === 'aprovado' ? 'Aprovar solicitação' : 'Rejeitar solicitação'"
      :rotulo-confirmar="resposta.status === 'aprovado' ? 'Aprovar' : 'Rejeitar'"
      :enviando="resposta.enviando"
      :erro="resposta.erro"
      @fechar="resposta.aberta = false"
      @confirmar="responder"
    >
      <p class="campo__ajuda referencia">
        {{ resposta.solicitacao.funcionario?.nome }} —
        {{ resposta.solicitacao.motivo }}
      </p>

      <label class="campo">
        <span class="campo__rotulo">Observação (opcional)</span>
        <textarea v-model="resposta.texto" class="campo__entrada area" rows="4"></textarea>
        <span class="campo__ajuda">Fica visível para o funcionário.</span>
      </label>

      <p v-if="resposta.status === 'aprovado'" class="alerta alerta--aviso">
        Aprovar não altera a marcação original — ela é imutável. A aprovação
        registra que a empresa reconheceu a divergência; a correção do valor
        apurado acontece na folha.
      </p>
    </ModalFormulario>
  </PainelLayout>
</template>

<style scoped>
.filtro {
  max-width: 16rem;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.secundario {
  color: var(--cor-texto-suave);
  font-size: 0.8rem;
}

.data {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--cor-texto-suave);
}

.etiqueta--aprovado {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-fundo);
  border-color: var(--cor-sucesso);
}

.etiqueta--rejeitado {
  color: var(--cor-erro);
  background: var(--cor-erro-fundo);
  border-color: var(--cor-erro);
}

.referencia {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}

.motivo {
  margin: 0 0 0.9rem;
  white-space: pre-wrap;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.respondida {
  padding-top: 0.8rem;
  border-top: 1px solid var(--cor-borda);
  font-size: 0.9rem;
}

.respondida p {
  margin: 0.35rem 0 0;
  white-space: pre-wrap;
}

.area {
  resize: vertical;
  font-family: inherit;
}

.vazio {
  color: var(--cor-texto-suave);
}
</style>
