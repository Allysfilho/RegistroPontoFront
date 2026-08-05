<script setup>
import { ref } from 'vue'

/**
 * Exibe a senha provisória recém-gerada.
 *
 * É a única vez que esse valor aparece: o backend guarda só o hash. Por isso a
 * caixa é insistente e o fechamento é explícito — fechar sem anotar significa
 * ter que gerar outra.
 */
defineProps({
  credenciais: { type: Object, required: true },
  rotuloIdentificacao: { type: String, default: 'Acesso' },
})

defineEmits(['fechar'])

const copiado = ref(false)

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 2000)
  } catch {
    // Sem permissão de área de transferência: a senha segue visível na tela.
  }
}
</script>

<template>
  <div class="credenciais" role="alert">
    <h3 class="credenciais__titulo">Senha provisória gerada</h3>

    <p class="credenciais__aviso">
      Anote ou copie agora. Esta senha não será exibida novamente e a troca é
      obrigatória no primeiro acesso.
    </p>

    <dl class="credenciais__dados">
      <div>
        <dt>{{ rotuloIdentificacao }}</dt>
        <dd>{{ credenciais.email ?? credenciais.identificador }}</dd>
      </div>
      <div>
        <dt>Senha</dt>
        <dd class="credenciais__senha">{{ credenciais.senha_provisoria }}</dd>
      </div>
    </dl>

    <div class="credenciais__acoes">
      <button
        class="botao"
        type="button"
        @click="copiar(credenciais.senha_provisoria)"
      >
        {{ copiado ? 'Copiada!' : 'Copiar senha' }}
      </button>
      <button class="botao botao--secundario" type="button" @click="$emit('fechar')">
        Já anotei
      </button>
    </div>
  </div>
</template>

<style scoped>
.credenciais {
  margin-bottom: 1.25rem;
  padding: 1rem;
  border: 1px solid var(--cor-aviso-borda);
  border-radius: 0.6rem;
  background: var(--cor-aviso-fundo);
  color: var(--cor-aviso);
}

.credenciais__titulo {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.credenciais__aviso {
  margin: 0 0 0.9rem;
  font-size: 0.85rem;
}

.credenciais__dados {
  margin: 0 0 1rem;
  display: grid;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.credenciais__dados div {
  display: flex;
  gap: 0.75rem;
}

.credenciais__dados dt {
  min-width: 6rem;
  font-weight: 600;
}

.credenciais__dados dd {
  margin: 0;
  word-break: break-all;
}

.credenciais__senha {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
}

.credenciais__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.credenciais__acoes .botao {
  width: auto;
  flex: 1 1 8rem;
  min-height: 2.6rem;
  font-size: 0.9rem;
}
</style>
