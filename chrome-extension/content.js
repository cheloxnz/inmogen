/**
 * InmoGen Content Script
 * Inyecta un botón flotante en portales inmobiliarios soportados.
 * Click → abre InmoGen con la URL actual pre-cargada.
 */
;(function () {
  const INMOGEN_URL = 'https://inmogen-ia.com'
  const BTN_ID = 'inmogen-fab'

  // No inyectar dos veces
  if (document.getElementById(BTN_ID)) return

  // Solo en páginas de listings (tienen un ID numérico largo o keyword en la URL)
  const url = window.location.href
  const isListing = /\/propiedades?\/|\/inmueble|\/clasificado|\/casa|\/departamento|\d{6,}/.test(url)
  if (!isListing) return

  // Crear botón
  const btn = document.createElement('div')
  btn.id = BTN_ID
  btn.title = 'Generar creativos con InmoGen'
  btn.innerHTML = `
    <span class="inmogen-fab-icon">⚡</span>
    <span class="inmogen-fab-text">Generar Ad</span>
  `

  btn.addEventListener('click', () => {
    const target = `${INMOGEN_URL}/generate?url=${encodeURIComponent(url)}`
    window.open(target, '_blank')
  })

  document.body.appendChild(btn)
})()
