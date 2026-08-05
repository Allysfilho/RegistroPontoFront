<script setup>
import TelaLogin from '@/components/TelaLogin.vue'
import { useFuncionarioStore } from '@/stores/auth'

defineProps({
  empresa: { type: String, required: true },
})

const store = useFuncionarioStore()
</script>

<template>
  <TelaLogin
    :store="store"
    titulo="Registro de Ponto"
    :subtitulo="empresa"
    :contexto="empresa"
    campo="identificador"
    campo-rotulo="Matrícula, CPF ou identificador"
    rota-painel="inicio"
    rota-troca="trocar-senha"
    ajuda="Esqueceu a senha? Procure um administrador da sua empresa para gerar uma nova senha provisória."
  />
</template>
