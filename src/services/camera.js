/**
 * Acesso à câmera para a foto de evidência do ponto.
 *
 * Como a geolocalização, `getUserMedia` só existe em contexto seguro: HTTPS ou
 * localhost. Num celular acessando pelo IP da rede local o objeto não existe.
 */
export function cameraDisponivel() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

const MENSAGENS = {
  NotAllowedError: 'Permissão de câmera negada. Autorize o acesso nas configurações do navegador.',
  NotFoundError: 'Nenhuma câmera encontrada neste aparelho.',
  NotReadableError: 'A câmera está em uso por outro aplicativo.',
  OverconstrainedError: 'Nenhuma câmera atende aos requisitos solicitados.',
}

/**
 * Abre o fluxo de vídeo da câmera frontal.
 *
 * @returns {Promise<MediaStream>}
 */
export async function abrirCamera() {
  if (!cameraDisponivel()) {
    throw new Error(
      'Este navegador não expõe a câmera. Ela exige HTTPS ou acesso por localhost.',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        // A evidência é do rosto de quem bate: câmera frontal por padrão.
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
  } catch (falha) {
    throw new Error(MENSAGENS[falha.name] ?? 'Não foi possível acessar a câmera.')
  }
}

export function fecharCamera(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Congela o quadro atual do vídeo num JPEG.
 *
 * @returns {Promise<{blob: Blob, url: string}>}
 */
export function capturarQuadro(video) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const contexto = canvas.getContext('2d')

  // O preview é espelhado para a pessoa se enxergar como num espelho, mas a
  // imagem gravada não pode ser: como evidência, ela precisa refletir a cena.
  contexto.drawImage(video, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível capturar a foto.'))

          return
        }

        resolve({ blob, url: URL.createObjectURL(blob) })
      },
      'image/jpeg',
      // 0.85 mantém o rosto reconhecível em ~150 KB; acima disso o ganho é
      // imperceptível e o upload em rede móvel fica mais lento.
      0.85,
    )
  })
}
