/**
 * Leitura da posição do aparelho.
 *
 * `navigator.geolocation` só existe em contexto seguro: HTTPS ou localhost. Num
 * celular acessando o servidor pelo IP da rede local o objeto simplesmente não
 * existe — daí a mensagem explicar o motivo em vez de dizer só "indisponível".
 */
export function geolocalizacaoDisponivel() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

const MENSAGENS = {
  1: 'Permissão de localização negada. Autorize o acesso nas configurações do navegador.',
  2: 'Não foi possível determinar sua posição. Verifique se o GPS está ligado.',
  3: 'A busca pela sua posição demorou demais. Tente novamente.',
}

/**
 * Obtém a posição atual.
 *
 * @returns {Promise<{latitude: number, longitude: number, precisao: number}>}
 */
export function obterPosicao({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!geolocalizacaoDisponivel()) {
      reject(
        new Error(
          'Este navegador não expõe a localização. Ela exige HTTPS ou acesso por localhost.',
        ),
      )

      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisao: coords.accuracy,
        }),
      (falha) => reject(new Error(MENSAGENS[falha.code] ?? 'Não foi possível obter sua posição.')),
      {
        // Sem alta precisão o navegador tende a devolver a posição por rede,
        // que erra centenas de metros e reprovaria quem está no lugar certo.
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      },
    )
  })
}
