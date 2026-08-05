<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Diálogo de formulário usado pelos cadastros dos painéis.
 */
defineProps({
  titulo: { type: String, required: true },
  enviando: { type: Boolean, default: false },
  rotuloConfirmar: { type: String, default: 'Salvar' },
  erro: { type: String, default: null },
})

const emit = defineEmits(['fechar', 'confirmar'])

function aoTeclar(evento) {
  if (evento.key === 'Escape') {
    emit('fechar')
  }
}

onMounted(() => document.addEventListener('keydown', aoTeclar))
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <div class="fundo" @click.self="$emit('fechar')">
    <form class="modal" novalidate @submit.prevent="$emit('confirmar')">
      <header class="modal__topo">
        <h2>{{ titulo }}</h2>
        <button class="modal__fechar" type="button" aria-label="Fechar" @click="$emit('fechar')">
          ×
        </button>
      </header>

      <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <div class="modal__corpo">
        <slot />
      </div>

      <footer class="modal__acoes">
        <button class="botao botao--secundario" type="button" @click="$emit('fechar')">
          Cancelar
        </button>
        <button class="botao" type="submit" :disabled="enviando">
          {{ enviando ? 'Salvando…' : rotuloConfirmar }}
        </button>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.fundo {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.55);
  overflow-y: auto;
}

.modal {
  width: 100%;
  max-width: 32rem;
  margin: auto 0 0;
  padding: 1.25rem;
  border-radius: 0.9rem 0.9rem 0 0;
  background: var(--cor-superficie);
}

.modal__topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.modal__topo h2 {
  margin: 0;
  font-size: 1.1rem;
}

.modal__fechar {
  border: 0;
  background: transparent;
  color: var(--cor-texto-suave);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.modal__acoes {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.modal__acoes .botao {
  flex: 1;
}

/* Em telas largas o diálogo vira um cartão centralizado. */
@media (min-width: 40rem) {
  .fundo {
    align-items: center;
  }

  .modal {
    margin: 0;
    border-radius: 0.9rem;
  }
}
</style>
