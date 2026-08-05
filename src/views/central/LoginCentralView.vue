<script setup>
import TelaLogin from '@/components/TelaLogin.vue'
import { useSuperadminStore } from '@/stores/auth'

const store = useSuperadminStore()
</script>

<template>
  <TelaLogin
    :store="store"
    titulo="Painel central"
    subtitulo="Administração do SaaS"
    campo="email"
    campo-rotulo="E-mail"
    campo-tipo="email"
    campo-autocomplete="email"
    rota-painel="central.empresas"
    rota-troca="central.trocar-senha"
    ajuda="Esqueceu a senha? Peça a outro superadmin para gerar uma nova."
  />
</template>
