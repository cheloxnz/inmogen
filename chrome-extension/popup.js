const INMOGEN_URL = 'https://inmogen-ia.com'

const PORTALS = {
  'zonaprop.com.ar':       'Zonaprop',
  'argenprop.com':         'Argenprop',
  'properati.com.ar':      'Properati',
  'mercadolibre.com.ar':   'MercadoLibre',
  'inmuebles24.com':       'Inmuebles24',
  'idealista.com':         'Idealista',
  'fotocasa.es':           'Fotocasa',
  'habitaclia.com':        'Habitaclia',
  'portalinmobiliario.com':'Portal Inmobiliario',
  'infocasas.com.uy':      'InfoCasas',
  'toctoc.com':            'TocToc',
  'metrocuadrado.com':     'MetroCuadrado',
  'fincaraiz.com.co':      'FincaRaíz',
}

function detectPortal(url) {
  for (const [domain, name] of Object.entries(PORTALS)) {
    if (url.includes(domain)) return name
  }
  return null
}

function isListingUrl(url) {
  // Heurística: URLs de listings suelen tener números de ID o keywords
  const listingPatterns = [
    /\/propiedades?\//i,
    /\/inmueble[s]?\//i,
    /\/clasificado\//i,
    /\/departamento/i,
    /\/casa[s]?\//i,
    /\/property\//i,
    /\/listing/i,
    /\/anuncio/i,
    /\/vivienda/i,
    /\/piso[s]?\//i,
    /\/alquiler\//i,
    /\/venta\//i,
    /\d{6,}/,  // ID numérico largo
  ]
  return listingPatterns.some(p => p.test(url))
}

function truncateUrl(url, max = 55) {
  try {
    const u = new URL(url)
    const path = u.hostname + u.pathname
    return path.length > max ? path.slice(0, max) + '…' : path
  } catch {
    return url.slice(0, max) + '…'
  }
}

function openInmoGen(propertyUrl) {
  const target = `${INMOGEN_URL}/generate?url=${encodeURIComponent(propertyUrl)}`
  chrome.tabs.create({ url: target })
  window.close()
}

// ── Render ────────────────────────────────────────────────────────────────────

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const content = document.getElementById('content')
  const url = tab?.url || ''
  const portal = detectPortal(url)
  const looksLikeListing = isListingUrl(url)

  if (!portal && !looksLikeListing) {
    // No estamos en un portal conocido
    content.innerHTML = `
      <div class="not-listing">
        <div class="icon">🏠</div>
        <p>Abrí un listing de cualquier portal inmobiliario y hacé click acá para generar los creativos.</p>
      </div>
      <button class="btn-secondary" id="btn-open-app">Abrir InmoGen</button>
    `
    document.getElementById('btn-open-app').addEventListener('click', () => {
      chrome.tabs.create({ url: INMOGEN_URL })
      window.close()
    })
    return
  }

  const portalLabel = portal || 'Portal detectado'
  const isListing = looksLikeListing

  content.innerHTML = `
    <span class="portal-badge">${portalLabel}</span>
    <div class="url-preview">
      <div class="url-label">Propiedad detectada</div>
      <div class="url-text">${truncateUrl(url)}</div>
    </div>
    <button class="btn-primary" id="btn-generate" ${!isListing ? 'disabled' : ''}>
      <span>⚡</span>
      ${isListing ? 'Generar creativos con IA' : 'Navegá a un listing primero'}
    </button>
    ${!isListing ? `
      <p style="font-size:11px;color:#6b7280;text-align:center;margin-top:10px;">
        Estás en la página principal del portal.<br>Abrí un inmueble específico.
      </p>
    ` : ''}
    <button class="btn-secondary" id="btn-dashboard">Ver mis trabajos</button>
  `

  if (isListing) {
    document.getElementById('btn-generate').addEventListener('click', () => openInmoGen(url))
  }
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: `${INMOGEN_URL}/dashboard` })
    window.close()
  })
})
