<script setup>
import TelaLogin from '@/components/TelaLogin.vue'
import { useAdminStore } from '@/stores/auth'

defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()
</script>

<template>
  <TelaLogin
    :store="store"
    titulo="Painel da empresa"
    :subtitulo="empresa"
    :contexto="empresa"
    campo="email"
    campo-rotulo="E-mail"
    campo-tipo="email"
    campo-autocomplete="email"
    rota-painel="admin.funcionarios"
    rota-troca="admin.trocar-senha"
    ajuda="Esqueceu a senha? Peça a outro administrador da empresa para gerar uma nova."
  />
</template>
