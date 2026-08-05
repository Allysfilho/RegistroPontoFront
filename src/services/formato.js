/**
 * Formatação de datas para exibição.
 *
 * O backend devolve sempre ISO 8601 com fuso explícito; a conversão para o
 * horário local fica com o navegador, que é onde a pessoa está.
 */
const FUSO = 'America/Sao_Paulo'

export function dataHora(iso) {
  if (!iso) return '—'

  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: FUSO,
  })
}

export function hora(iso) {
  if (!iso) return '—'

  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  })
}

export function diaPorExtenso(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: FUSO,
  })
}

/** Chave AAAA-MM-DD no fuso de exibição, para agrupar por dia. */
export function chaveDoDia(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSO })
}

/** Competência atual no formato AAAA-MM. */
export function competenciaAtual() {
  return new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: FUSO,
  }).slice(0, 7)
}

/**
 * Últimas N competências, da mais recente para a mais antiga.
 *
 * @returns {Array<{valor: string, rotulo: string}>}
 */
export function competenciasRecentes(quantidade = 12) {
  const hoje = new Date()

  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`

    return {
      valor,
      rotulo: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })
}
