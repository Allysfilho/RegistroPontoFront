<script setup>
import { onMounted, reactive, ref } from 'vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const carregando = ref(true)
const enviando = ref(false)
const erro = ref(null)
const sucesso = ref(false)

const formulario = reactive({ exige_geolocalizacao: false, raio_padrao_metros: 100 })

function url() {
  return `/${props.empresa}/admin/configuracoes`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(url())
    Object.assign(formulario, {
      exige_geolocalizacao: data.data.exige_geolocalizacao,
      raio_padrao_metros: data.data.raio_padrao_metros ?? 100,
    })
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar as configurações.')
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  enviando.value = true
  erro.value = null
  sucesso.value = false

  try {
    await store.api.put(url(), {
      exige_geolocalizacao: formulario.exige_geolocalizacao,
      raio_padrao_metros: Number(formulario.raio_padrao_metros),
    })

    sucesso.value = true
  } catch (e) {
    erro.value = mensagemDeErro(e)
  } finally {
    enviando.value = false
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
    <template #titulo>Configurações</template>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="sucesso" class="alerta alerta--sucesso" role="status">Configurações salvas.</p>
    <p v-if="carregando">Carregando…</p>

    <form v-else class="cartao" novalidate @submit.prevent="salvar">
      <label class="campo campo--linha">
        <input v-model="formulario.exige_geolocalizacao" type="checkbox" />
        <span class="campo__rotulo">Exigir geolocalização ao bater ponto</span>
      </label>

      <p class="campo__ajuda recuo">
        Vale para toda a empresa. Cada funcionário pode ter uma exceção própria
        no cadastro dele.
      </p>

      <label class="campo">
        <span class="campo__rotulo">Raio padrão (metros)</span>
        <input
          v-model="formulario.raio_padrao_metros"
          class="campo__entrada"
          type="number"
          min="20"
          max="20000"
        />
        <span class="campo__ajuda">
          Aplicado a novos locais que não definirem raio próprio.
        </span>
      </label>

      <button class="botao" type="submit" :disabled="enviando">
        {{ enviando ? 'Salvando…' : 'Salvar' }}
      </button>
    </form>
  </PainelLayout>
</template>

<style scoped>
.recuo {
  margin: -0.5rem 0 1.25rem 1.75rem;
}
</style>
