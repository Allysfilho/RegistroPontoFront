<script setup>
import { onMounted, ref } from 'vue'
import http, { mensagemDeErro } from '@/services/http'

const carregando = ref(true)
const erro = ref(null)
const saude = ref(null)

async function consultar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await http.get('/health')
    saude.value = data
  } catch (e) {
    saude.value = e.response?.data ?? null
    erro.value = mensagemDeErro(e, 'Backend indisponível.')
  } finally {
    carregando.value = false
  }
}

onMounted(consultar)
</script>

<template>
  <main class="pagina pagina--larga">
    <header class="cabecalho">
      <h1>Registro de Ponto</h1>
      <p class="subtitulo">Verificação da stack</p>
    </header>

    <section class="cartao">
      <div class="cartao__topo">
        <h2>Backend</h2>
        <span class="etiqueta" :class="`etiqueta--${saude?.status ?? 'indefinido'}`">
          {{ carregando ? 'consultando…' : (saude?.status ?? 'sem resposta') }}
        </span>
      </div>

      <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <ul v-if="saude?.checks" class="lista">
        <li v-for="(check, nome) in saude.checks" :key="nome" class="lista__item">
          <span class="lista__nome">{{ nome }}</span>
          <span class="lista__status" :class="`lista__status--${check.status}`">
            {{ check.status }}
          </span>
          <span v-if="check.message" class="lista__msg">{{ check.message }}</span>
        </li>
      </ul>

      <dl v-if="saude?.app" class="meta">
        <div><dt>Aplicação</dt><dd>{{ saude.app }}</dd></div>
        <div><dt>Ambiente</dt><dd>{{ saude.environment }}</dd></div>
        <div><dt>Consultado em</dt><dd>{{ saude.timestamp }}</dd></div>
      </dl>

      <button class="botao" :disabled="carregando" @click="consultar">
        Consultar novamente
      </button>
    </section>

    <section class="cartao atalhos">
      <h2>Entrar como funcionário</h2>
      <p class="campo__ajuda">
        Cada empresa tem o próprio endereço, resolvido pelo slug na URL.
      </p>
      <ul class="atalhos__lista">
        <li><RouterLink to="/empresa-a/entrar">/empresa-a/entrar</RouterLink></li>
        <li><RouterLink to="/empresa-b/entrar">/empresa-b/entrar</RouterLink></li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.cabecalho h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitulo {
  margin: 0.25rem 0 1.5rem;
  color: var(--cor-texto-suave);
}

.cartao__topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.cartao__topo h2,
.atalhos h2 {
  margin: 0;
  font-size: 1.05rem;
}

.etiqueta {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--cor-borda);
}

.etiqueta--ok {
  color: #14532d;
  background: #dcfce7;
  border-color: #86efac;
}

.etiqueta--degraded,
.etiqueta--indefinido {
  color: var(--cor-aviso);
  background: var(--cor-aviso-fundo);
  border-color: var(--cor-aviso-borda);
}

.lista {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.lista__item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.lista__nome {
  min-width: 6rem;
  font-weight: 600;
}

.lista__status--ok { color: #15803d; }
.lista__status--fail { color: var(--cor-erro); }

.lista__msg {
  flex-basis: 100%;
  color: var(--cor-texto-suave);
  font-size: 0.8rem;
  word-break: break-word;
}

.meta {
  margin: 0 0 1.25rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.meta div {
  display: flex;
  gap: 0.5rem;
}

.meta dt {
  min-width: 7rem;
  color: var(--cor-texto-suave);
}

.meta dd {
  margin: 0;
}

.atalhos {
  margin-top: 1rem;
}

.atalhos__lista {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.atalhos__lista a {
  color: var(--cor-primaria);
}
</style>
