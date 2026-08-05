<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Moldura dos dois painéis administrativos: cabeçalho, navegação e conteúdo.
 */
const props = defineProps({
  store: { type: Object, required: true },
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  itens: { type: Array, required: true },
  rotaEntrar: { type: String, required: true },
  contexto: { type: String, default: null },
})

const router = useRouter()
const menuAberto = ref(false)

async function sair() {
  await props.store.sair()
  router.push({
    name: props.rotaEntrar,
    params: props.contexto ? { empresa: props.contexto } : {},
  })
}
</script>

<template>
  <div class="painel">
    <header class="topo">
      <div class="topo__identidade">
        <strong>{{ titulo }}</strong>
        <span v-if="subtitulo" class="topo__subtitulo">{{ subtitulo }}</span>
      </div>

      <button
        class="topo__alternar"
        type="button"
        :aria-expanded="menuAberto"
        @click="menuAberto = !menuAberto"
      >
        Menu
      </button>

      <nav class="navegacao" :class="{ 'navegacao--aberta': menuAberto }">
        <RouterLink
          v-for="item in itens"
          :key="item.rota"
          :to="{ name: item.rota, params: contexto ? { empresa: contexto } : {} }"
          class="navegacao__link"
          @click="menuAberto = false"
        >
          {{ item.rotulo }}
        </RouterLink>

        <button class="navegacao__link navegacao__sair" type="button" @click="sair">
          Sair
        </button>
      </nav>
    </header>

    <main class="conteudo">
      <div class="conteudo__cabecalho">
        <h1><slot name="titulo" /></h1>
        <div class="conteudo__acoes"><slot name="acoes" /></div>
      </div>

      <slot />
    </main>
  </div>
</template>

<style scoped>
.painel {
  min-height: 100svh;
}

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid var(--cor-borda);
  background: var(--cor-superficie);
}

.topo__identidade {
  display: flex;
  flex-direction: column;
  margin-right: auto;
}

.topo__subtitulo {
  font-size: 0.8rem;
  color: var(--cor-texto-suave);
}

.topo__alternar {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--cor-borda);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--cor-texto);
  cursor: pointer;
}

.navegacao {
  display: none;
  flex-basis: 100%;
  flex-direction: column;
  gap: 0.25rem;
}

.navegacao--aberta {
  display: flex;
}

.navegacao__link {
  padding: 0.65rem 0.5rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--cor-texto-suave);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.navegacao__link.router-link-active {
  color: var(--cor-primaria);
  font-weight: 600;
}

.navegacao__sair {
  color: var(--cor-erro);
}

.conteudo {
  max-width: 62rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
}

.conteudo__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.conteudo__cabecalho h1 {
  margin: 0;
  font-size: 1.35rem;
}

/* Em telas largas o menu é sempre visível e o botão some. */
@media (min-width: 48rem) {
  .topo__alternar {
    display: none;
  }

  .navegacao {
    display: flex;
    flex-basis: auto;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
  }

  .navegacao__link {
    padding: 0.4rem 0.7rem;
  }
}
</style>
