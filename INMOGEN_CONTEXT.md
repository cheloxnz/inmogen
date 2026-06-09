# InmoGen — Contexto completo del producto

> Última actualización: junio 2026

---

## ¿Qué es?

SaaS para profesionales inmobiliarios. Pegás la URL de una propiedad publicada en un portal y en ~2 minutos obtenés creativos visuales listos para publicar en Meta Ads (Facebook/Instagram), con la identidad visual de tu inmobiliaria. También genera automáticamente una landing page de la propiedad para capturar leads.

**URL producción frontend:** https://inmogen-ia.com (Vercel)
**URL producción API:** https://api.inmogen-ia.com (VPS, puerto 8003)
**Repo:** github.com/cheloxnz/inmogen

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 — deploy en Vercel |
| Backend | FastAPI (Python 3.12) — Docker Compose en VPS |
| Base de datos | MongoDB (motor async con Motor) |
| Autenticación | Clerk (header `x-user-id`) |
| Pagos | Stripe (suscripciones + one-time payments + webhooks) |
| Imágenes CDN | Cloudinary (fallback a disco local) |
| Scraping | ScraperAPI con render=true + retry logic (3 intentos) |
| Generación IA | Google Gemini Imagen 3 (opcional, API key del usuario) |
| Generación base | Pillow + SVG (motor sin IA) |
| Fuentes | Inter (instalada en VPS en /opt/inmogen/backend/app/assets/fonts/) |
| Nginx | Reverse proxy → FastAPI, maneja CORS headers |

---

## Flujo del usuario (3 pasos)

### Paso 1 — Pegás el link
URL de cualquier propiedad en un portal inmobiliario. El scraper extrae automáticamente:
- Fotos (hasta 40)
- Precio y moneda
- m², ambientes, baños, cochera
- Título y descripción
- Ubicación

### Paso 2 — Configurás el creativo
- Seleccionás hasta 7 fotos de las extraídas
- Elegís el tipo de creativo (1 a 7 por job)
- Elegís el formato de salida
- Para algunos tipos podés escribir tu propio copy

### Paso 3 — Descargás
- Imágenes generadas con tu marca aplicada automáticamente
- Descarga individual o en ZIP
- Regenerar cualquier ángulo sin gastar créditos adicionales
- Compartir resultados (página pública `/share/:jobId`)
- Ver landing page de la propiedad (`/p/:jobId`)

---

## 7 Tipos de creativos

| Tipo | Emoji | Descripción | Copy personalizable |
|------|-------|-------------|---------------------|
| Destacado | 🏠 | Foto principal + precio + datos clave | No |
| Infografía | 📊 | Cards visuales con m², ambientes, baños | No |
| Hook Attack | ⚡ | Titular disruptivo que para el scroll | Sí |
| Storytelling | ✨ | Narrativa aspiracional | Sí |
| Social Proof | ⭐ | Confianza de la agencia | Sí |
| FAQ | ❓ | Preguntas frecuentes sobre la propiedad | No |
| Testimonial | 💬 | Cita de cliente satisfecho | Sí |

---

## 6 Formatos de salida

| Formato | Dimensión | Uso |
|---------|-----------|-----|
| Feed 1:1 | 1080×1080 | Instagram Feed / Facebook |
| Story 9:16 | 1080×1920 | Stories / Reels |
| Banner 16:9 | 1920×1080 | Facebook Ads horizontal |
| Carrusel 1 | 1080×1080 | Slide principal del carrusel |
| Carrusel 2 | 1080×1080 | Slide de detalle |
| WhatsApp Status | 1080×1920 | Estado de WhatsApp |

---

## Identidad de marca (configuración en /brand)

El usuario configura una vez:
- Nombre de la agencia
- Logo (subida de archivo o URL)
- Color primario + secundario + texto (picker o 6 paletas predefinidas)
- Teléfono / WhatsApp
- Sitio web
- Instagram
- **API Key de Google Gemini** (opcional — activa Imagen 3)

**6 paletas predefinidas:**
Azul corporativo, Negro elegante, Verde premium, Bordo clásico, Gris moderno, Azul marino

---

## Motor de generación

- **Sin API Key:** Pillow/SVG — fondos sólidos, composición básica
- **Con API Key Gemini:** Fondos fotorrealistas generados con IA, calidad publicitaria real
- La key es **gratuita** desde Google AI Studio (aistudio.google.com)
- Se configura en 2 minutos desde "Mi Marca"

---

## Landing page de propiedad (`/p/:jobId`)

Generada automáticamente con los datos del scraping. Pensada para usarla como destino de Meta Ads.

**Contenido:**
- Galería de fotos con swipe (flechas + dots + contador)
- Badge de agencia sobre la foto (logo + nombre)
- Precio grande + título + ubicación
- Chips de características (ambientes, m², baños, cochera)
- Descripción colapsable
- Formulario de contacto (nombre + teléfono + mensaje opcional)
- Info de la agencia (logo, teléfono, web, instagram)
- "Creado con InmoGen" subtle footer
- **Sticky bottom bar:** botón WhatsApp (verde, mensaje pre-completado) + botón Consultar (color de marca)

**Leads:** cuando alguien llena el formulario, se guarda en MongoDB (`leads` collection).

**Loop completo:**
```
Meta Ad → Landing /p/:jobId → Formulario → Lead en DB → (futuro: InmoBot)
```

---

## Sistema de créditos

- **1 crédito = 1 propiedad** (todos los ángulos y formatos incluidos)
- Regenerar ángulos: **sin costo de créditos**
- Los créditos de planes mensuales se renuevan cada ciclo (no acumulables)
- Los créditos de packs one-time **no vencen**

---

## Planes y precios

### Suscripciones mensuales (Stripe)
| Plan | Precio | Créditos | Extras |
|------|--------|----------|--------|
| Starter | $49/mes | 30/mes | — |
| Pro | $99/mes | 100/mes | Soporte WhatsApp |
| Scale | $199/mes | Ilimitado | Soporte + Onboarding de marca ($150 valor) |

### Paquetes one-time (sin vencimiento)
| Pack | Precio | Créditos | Por creativo |
|------|--------|----------|-------------|
| Pack 10 | $9 | 10 | $0.90 |
| Pack 25 | $19 | 25 | $0.76 |
| Pack 50 | $32 | 50 | $0.64 ⭐ mejor valor |
| Pack 100 | $55 | 100 | $0.55 |

---

## Sistema de referidos

- Cada usuario tiene un código único (MD5 del clerk_id, 8 chars)
- Link: `https://inmogen-ia.com?ref=CODIGO`
- Referente gana **5 créditos** por cada registro
- Nuevo usuario gana **2 créditos** al registrarse
- Stats en Dashboard (referrals_count, credits_earned)

---

## Rutas del frontend

| Ruta | Componente | Auth | Descripción |
|------|-----------|------|-------------|
| `/` | Home.jsx | No | Landing pública con pricing modal |
| `/dashboard` | Dashboard.jsx | Sí | Panel principal del usuario |
| `/generate` | Generate.jsx | Sí | Flujo de 3 pasos para generar |
| `/brand` | Brand.jsx | Sí | Configuración de marca |
| `/pricing` | Pricing.jsx | No | Página de planes (standalone) |
| `/share/:jobId` | Share.jsx | No | Resultados públicos del job |
| `/p/:jobId` | PropertyLanding.jsx | No | Landing de propiedad para ads |
| `/terms` | Legal.jsx | No | Términos y condiciones |
| `/privacy` | Legal.jsx | No | Política de privacidad |

---

## Endpoints del backend

### Generate (`/generate`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/generate/preview?url=` | Sí | Scraping previo — devuelve fotos y datos |
| POST | `/generate/` | Sí | Inicia generación (background task) |
| GET | `/generate/{jobId}` | Sí | Status y resultado del job |
| GET | `/generate/{jobId}/share` | No | Datos públicos del job + brand |
| POST | `/generate/{jobId}/regenerate` | Sí | Regenera un slot sin costo |
| GET | `/generate/{jobId}/zip` | No | Descarga ZIP de los creativos |

### Users (`/users`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/me?ref=` | Sí | Obtiene/crea usuario, aplica referido |
| PUT | `/users/brand` | Sí | Guarda configuración de marca |
| GET | `/users/jobs?page=&per_page=` | Sí | Lista jobs paginados |
| DELETE | `/users/jobs/{jobId}` | Sí | Elimina un job |
| DELETE | `/users/jobs` | Sí | Elimina todos los jobs |
| GET | `/users/referral` | Sí | Info del sistema de referidos |

### Billing (`/billing`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/billing/checkout?plan=` | Sí | Checkout Stripe (suscripción) |
| POST | `/billing/checkout-pack?pack=` | Sí | Checkout Stripe (one-time) |
| POST | `/billing/webhook` | No | Webhook Stripe |
| GET | `/billing/status` | Sí | Estado de suscripción |

### Leads (`/leads`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/leads/{jobId}` | No | Crea lead desde landing pública |
| GET | `/leads/{jobId}` | Sí | Lista leads de un job (solo dueño) |

---

## Portales soportados (scraper)

| Portal | País | Notas |
|--------|------|-------|
| Zonaprop | 🇦🇷 Argentina | Principal, bien soportado |
| Argenprop | 🇦🇷 Argentina | Retry con 3 niveles |
| MercadoLibre Inmuebles | 🇦🇷 Argentina | — |
| Idealista | 🇪🇸 España | — |
| Fotocasa | 🇪🇸 España | — |
| Inmuebles24 | 🇲🇽 México | — |
| Infocasas | 🇺🇾 Uruguay | — |
| Portal Inmobiliario | 🇨🇱 Chile | — |
| Metrocuadrado | 🇨🇴 Colombia | — |

**Retry logic del scraper (3 niveles):**
1. ScraperAPI con `render=true`
2. ScraperAPI sin render
3. Fetch directo

---

## Archivos clave del proyecto

```
inmogen/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS comentado (lo maneja Nginx)
│   │   ├── api/
│   │   │   ├── generate.py          # Jobs, scraping, regenerar, share, zip
│   │   │   ├── users.py             # Usuarios, brand, jobs, referidos
│   │   │   ├── billing.py           # Stripe checkout + webhook
│   │   │   └── leads.py             # Leads de landing pages
│   │   ├── services/
│   │   │   ├── scraper.py           # Multi-portal + retry
│   │   │   ├── image_generator.py   # Pillow (motor base)
│   │   │   ├── gemini.py            # Google Gemini Imagen 3
│   │   │   ├── overlays.py          # Composición final con marca
│   │   │   └── storage.py           # Cloudinary + fallback disco
│   │   ├── models/
│   │   │   ├── brand.py             # BrandConfig
│   │   │   └── property.py          # PropertyData
│   │   ├── core/
│   │   │   ├── config.py            # Settings (env vars)
│   │   │   └── database.py          # MongoDB Motor
│   │   └── assets/fonts/            # Inter-Regular.ttf + Inter-Bold.ttf
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── .env                         # Variables de entorno (en VPS)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Rutas
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Landing pública
│   │   │   ├── Dashboard.jsx        # Panel usuario
│   │   │   ├── Generate.jsx         # Flujo 3 pasos
│   │   │   ├── Brand.jsx            # Config de marca
│   │   │   ├── Pricing.jsx          # Planes + PricingModal
│   │   │   ├── Share.jsx            # Resultados públicos
│   │   │   ├── PropertyLanding.jsx  # Landing para Meta Ads /p/:jobId
│   │   │   └── Legal.jsx            # Terms + Privacy
│   │   ├── components/
│   │   │   └── Layout.jsx           # Navbar autenticada
│   │   └── lib/
│   │       └── api.js               # Todas las llamadas al backend
│   └── index.html                   # SEO, og:tags, lang=es
└── INMOGEN_CONTEXT.md               # Este archivo
```

---

## Variables de entorno (VPS .env)

```
MONGODB_URL=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_SCALE=price_...
STRIPE_PRICE_PACK_10=price_...
STRIPE_PRICE_PACK_25=price_...
STRIPE_PRICE_PACK_50=price_...
STRIPE_PRICE_PACK_100=price_...
CLOUDINARY_CLOUD_NAME=dsefkwank
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SCRAPERAPI_KEY=...
REFERRAL_CREDITS_REFERRER=5
REFERRAL_CREDITS_NEW_USER=2
STATIC_DIR=/opt/inmogen/backend/static
API_BASE_URL=https://api.inmogen-ia.com
```

---

## Infraestructura VPS

- **OS:** Ubuntu
- **Docker Compose:** `/opt/inmogen/backend/docker-compose.yml`
- **Contenedor:** `inmogen-backend` en puerto 8003
- **Nginx:** `/etc/nginx/sites-enabled/inmogen-api` — maneja SSL + CORS headers
- **Certificados SSL:** Let's Encrypt (`/etc/letsencrypt/live/api.inmogen-ia.com/`)
- **Imágenes estáticas:** `/opt/inmogen/backend/static/jobs/` (montado como volumen)

---

## Dashboard del usuario — qué muestra

- Créditos disponibles + plan actual + total de generaciones
- Accesos rápidos a Generar y Configurar Marca
- Banner onboarding si no tiene marca configurada
- Banner Gemini si tiene marca pero no tiene API Key
- Banner éxito post-pago (`?success=1` suscripción / `?credits=1` pack)
- Sección de referidos con link copiable y stats
- Historial paginado (10/página) con:
  - Thumbnails de los creativos
  - Status del job
  - Botón ZIP
  - Botón Landing (abre `/p/:jobId`)
  - Botón eliminar (con modal de confirmación + spinner)
  - Expansión para ver/descargar creativos individuales

---

## Propuesta de valor

**Para el usuario:**
> "Del link de la propiedad a 7 creativos para Meta Ads en 2 minutos, con la identidad visual de tu inmobiliaria. Sin diseñador. Sin apps de diseño."

**Pain points que resuelve:**
- Armar creativos tarda 2+ horas por propiedad
- Los diseñadores son caros y lentos
- Los creativos genéricos no tienen la marca de la agencia
- Los clicks de los ads no convierten (van a WhatsApp o al portal)

**Diferenciadores clave:**
- Scraping automático (no hay que cargar fotos ni datos manualmente)
- 7 tipos de creativo × 6 formatos por propiedad
- Marca aplicada automáticamente en todos
- Motor Gemini Imagen 3 (calidad publicitaria real, gratis para el usuario)
- Landing page de propiedad auto-generada → captura leads directamente
- Regenerar ángulos gratis (sin miedo a gastar créditos)
- Multi-portal y multi-país (Argentina, España, México, Uruguay, Chile, Colombia)

---

## Testimonials (para landing/marketing)

- **Martín R.** (Agente en Palermo): *"Antes tardaba 2 horas en armar los creativos para cada propiedad. Ahora en 3 minutos ya los tengo listos para publicar."*
- **Valentina S.** (Directora en Recoleta): *"La calidad visual sorprende. Los clientes me preguntan quién hace el diseño y les digo que es IA."*
- **Diego M.** (Broker en Córdoba): *"Lo mejor es que mantiene mi identidad de marca en todo. Logo, colores, teléfono. Súper consistente."*

---

## Info de contacto / legal

- Email: hola@inmogen-ia.com
- Términos: https://inmogen-ia.com/terms
- Privacidad: https://inmogen-ia.com/privacy
- Inicio gratis: 3 créditos sin tarjeta de crédito
- Oferta early: primeros 100 clientes → créditos dobles de por vida
