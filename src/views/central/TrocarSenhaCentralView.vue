<script setup>
import TelaTrocarSenha from '@/components/TelaTrocarSenha.vue'
import { useSuperadminStore } from '@/stores/auth'

const store = useSuperadminStore()
</script>

<template>
  <TelaTrocarSenha
    :store="store"
    rota-painel="central.empresas"
    rota-entrar="central.entrar"
  />
</template>
