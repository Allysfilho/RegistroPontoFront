<script setup>
import TelaTrocarSenha from '@/components/TelaTrocarSenha.vue'
import { useAdminStore } from '@/stores/auth'

defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()
</script>

<template>
  <TelaTrocarSenha
    :store="store"
    :contexto="empresa"
    rota-painel="admin.funcionarios"
    rota-entrar="admin.entrar"
  />
</template>
