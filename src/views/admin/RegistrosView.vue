<script setup>
import { onMounted, ref } from 'vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { competenciaAtual, competenciasRecentes, dataHora } from '@/services/formato'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const competencia = ref(competenciaAtual())
const competencias = competenciasRecentes()
const funcionarioId = ref('')
const pagina = ref(1)

const funcionarios = ref([])
const registros = ref([])
const paginacao = ref(null)
const carregando = ref(true)
const erro = ref(null)
const fotoAberta = ref(null)

const negadas = ref([])
const mostrandoNegadas = ref(false)

function url(caminho = '') {
  return `/${props.empresa}/admin/registros${caminho}`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const [lista, pessoas] = await Promise.all([
      store.api.get(url(), {
        params: {
          competencia: competencia.value,
          funcionario_id: funcionarioId.value || undefined,
          pagina: pagina.value,
        },
      }),
      funcionarios.value.length
        ? Promise.resolve({ data: { data: funcionarios.value } })
        : store.api.get(`/${props.empresa}/admin/funcionarios`),
    ])

    registros.value = lista.data.data
    paginacao.value = lista.data.paginacao
    funcionarios.value = pessoas.data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os registros.')
  } finally {
    carregando.value = false
  }
}

function filtrar() {
  pagina.value = 1
  carregar()
}

function irPara(destino) {
  pagina.value = destino
  carregar()
}

async function carregarNegadas() {
  erro.value = null

  try {
    const { data } = await store.api.get(`/${props.empresa}/admin/tentativas-negadas`, {
      params: { competencia: competencia.value },
    })
    negadas.value = data.data
    mostrandoNegadas.value = true
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

async function abrirFoto(registro) {
  erro.value = null

  try {
    const { data } = await store.api.get(url(`/${registro.id}/foto`), { responseType: 'blob' })
    fotoAberta.value = { registro, url: URL.createObjectURL(data) }
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar a foto.')
  }
}

function fecharFoto() {
  if (fotoAberta.value) {
    URL.revokeObjectURL(fotoAberta.value.url)
    fotoAberta.value = null
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
    <template #titulo>Registros de ponto</template>
    <template #acoes>
      <button class="botao botao--secundario botao--compacto" type="button" @click="carregarNegadas">
        Tentativas recusadas
      </button>
    </template>

    <p class="aviso campo__ajuda">
      Somente leitura. Uma marcação gravada não pode ser alterada nem apagada —
      divergências são tratadas em Solicitações.
    </p>

    <form class="filtros" @submit.prevent="filtrar">
      <label class="campo">
        <span class="campo__rotulo">Mês</span>
        <select v-model="competencia" class="campo__entrada">
          <option v-for="opcao in competencias" :key="opcao.valor" :value="opcao.valor">
            {{ opcao.rotulo }}
          </option>
        </select>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Funcionário</span>
        <select v-model="funcionarioId" class="campo__entrada">
          <option value="">Todos</option>
          <option v-for="pessoa in funcionarios" :key="pessoa.id" :value="pessoa.id">
            {{ pessoa.nome }} ({{ pessoa.identificador }})
          </option>
        </select>
      </label>

      <button class="botao botao--compacto" type="submit">Filtrar</button>
    </form>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <template v-else>
      <p v-if="!registros.length" class="vazio">Nenhum registro no período.</p>

      <div v-else class="tabela-rolagem">
        <table class="tabela">
          <thead>
            <tr>
              <th>NSR</th>
              <th>Funcionário</th>
              <th>Tipo</th>
              <th>Data e hora</th>
              <th>Local</th>
              <th>Foto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="registro in registros" :key="registro.id">
              <td class="mono">{{ registro.nsr }}</td>
              <td>
                {{ registro.funcionario?.nome }}
                <span class="secundario">{{ registro.funcionario?.identificador }}</span>
              </td>
              <td>
                <span class="etiqueta" :class="`etiqueta--${registro.tipo}`">
                  {{ registro.tipo_rotulo }}
                </span>
              </td>
              <td>{{ dataHora(registro.registrado_em) }}</td>
              <td class="secundario">
                <template v-if="registro.endereco_legivel">{{ registro.endereco_legivel }}</template>
                <template v-else-if="registro.distancia_metros !== null">
                  {{ registro.distancia_metros }} m do local
                </template>
                <template v-else>—</template>
              </td>
              <td>
                <button class="botao botao--secundario botao--compacto" type="button" @click="abrirFoto(registro)">
                  Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="paginacao && paginacao.paginas > 1" class="paginacao">
        <button
          class="botao botao--secundario botao--compacto"
          type="button"
          :disabled="paginacao.pagina <= 1"
          @click="irPara(paginacao.pagina - 1)"
        >
          Anterior
        </button>
        <span>Página {{ paginacao.pagina }} de {{ paginacao.paginas }} ({{ paginacao.total }} registros)</span>
        <button
          class="botao botao--secundario botao--compacto"
          type="button"
          :disabled="paginacao.pagina >= paginacao.paginas"
          @click="irPara(paginacao.pagina + 1)"
        >
          Próxima
        </button>
      </nav>
    </template>

    <!-- Tentativas recusadas por geolocalização -->
    <div v-if="mostrandoNegadas" class="fundo" @click.self="mostrandoNegadas = false">
      <section class="painel-lateral">
        <header class="painel-lateral__topo">
          <h2>Tentativas recusadas</h2>
          <button class="fechar" type="button" @click="mostrandoNegadas = false">×</button>
        </header>

        <p class="campo__ajuda">
          Batidas recusadas por localização. Não viraram registro de ponto nem
          consumiram NSR.
        </p>

        <p v-if="!negadas.length" class="vazio">Nenhuma tentativa recusada no período.</p>

        <ul v-else class="negadas">
          <li v-for="item in negadas" :key="item.id" class="cartao">
            <strong>{{ item.funcionario?.nome }}</strong>
            <span class="secundario"> · {{ dataHora(item.ocorrida_em) }}</span>
            <p class="motivo">{{ item.motivo }}</p>
          </li>
        </ul>
      </section>
    </div>

    <!-- Foto de evidência -->
    <div v-if="fotoAberta" class="fundo" @click.self="fecharFoto">
      <div class="visor">
        <img :src="fotoAberta.url" :alt="`Foto do NSR ${fotoAberta.registro.nsr}`" class="visor__imagem" />
        <p class="visor__legenda">
          NSR {{ fotoAberta.registro.nsr }} ·
          {{ fotoAberta.registro.funcionario?.nome }} ·
          {{ dataHora(fotoAberta.registro.registrado_em) }}
        </p>
        <button class="botao" type="button" @click="fecharFoto">Fechar</button>
      </div>
    </div>
  </PainelLayout>
</template>

<style scoped>
.aviso {
  margin-bottom: 1rem;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.filtros .campo {
  flex: 1 1 12rem;
  margin-bottom: 0;
}

/* Tabela larga rola dentro do próprio container, não na página. */
.tabela-rolagem {
  overflow-x: auto;
  border: 1px solid var(--cor-borda);
  border-radius: 0.6rem;
}

.tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: var(--cor-superficie);
}

.tabela th,
.tabela td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--cor-borda);
}

.tabela th {
  font-size: 0.8rem;
  color: var(--cor-texto-suave);
  font-weight: 600;
}

.tabela tbody tr:last-child td {
  border-bottom: 0;
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
}

.secundario {
  color: var(--cor-texto-suave);
  font-size: 0.8rem;
}

.etiqueta--entrada {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-fundo);
  border-color: var(--cor-sucesso);
}

.etiqueta--saida {
  color: var(--cor-texto-suave);
  border-color: var(--cor-borda);
}

.paginacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}

.vazio {
  color: var(--cor-texto-suave);
}

.fundo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.75);
  overflow-y: auto;
}

.painel-lateral {
  width: 100%;
  max-width: 32rem;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.25rem;
  border-radius: 0.9rem;
  background: var(--cor-superficie);
}

.painel-lateral__topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.painel-lateral__topo h2 {
  margin: 0;
  font-size: 1.1rem;
}

.fechar {
  border: 0;
  background: transparent;
  color: var(--cor-texto-suave);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.negadas {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.motivo {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
}

.visor {
  width: 100%;
  max-width: 30rem;
}

.visor__imagem {
  width: 100%;
  border-radius: 0.6rem;
  display: block;
}

.visor__legenda {
  margin: 0.6rem 0 0.75rem;
  color: #e2e8f0;
  font-size: 0.85rem;
  text-align: center;
}
</style>
