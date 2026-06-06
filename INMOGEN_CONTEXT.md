# InmoGen — Contexto completo del producto

## ¿Qué es?
SaaS para profesionales inmobiliarios. Pegás la URL de una propiedad publicada en un portal y en ~2 minutos obtenés creativos visuales listos para publicar en Meta Ads (Facebook/Instagram), con la identidad visual de tu inmobiliaria.

**URL producción:** https://inmogen-ia.com  
**API:** https://api.inmogen-ia.com  
**Stack:** FastAPI + MongoDB + React + Vite + Tailwind CSS v4 + Clerk Auth + Stripe + Cloudinary

---

## Flujo del usuario (3 pasos)

### Paso 1 — Pegás el link
- URL de cualquier propiedad en Zonaprop, Argenprop, Idealista, Inmuebles24, etc.
- El scraper extrae automáticamente: fotos (hasta 40), precio, m², ambientes, baños, ubicación, título

### Paso 2 — Configurás el creativo
- Seleccionás hasta 7 fotos de las extraídas
- Elegís el tipo de creativo (ver lista abajo)
- Elegís el formato de salida (ver lista abajo)
- Para algunos tipos podés escribir tu propio copy

### Paso 3 — Descargás
- Imágenes generadas con tu marca aplicada automáticamente
- Descarga individual o ZIP
- Podés regenerar cualquier ángulo sin gastar créditos adicionales

---

## 7 Tipos de creativos

| Tipo | Emoji | Descripción |
|------|-------|-------------|
| Destacado | 🏠 | Foto principal + precio + datos clave de la propiedad |
| Infografía | 📊 | Cards visuales con m², ambientes, baños, ubicación |
| Hook Attack | ⚡ | Titular disruptivo que para el scroll (copy personalizable) |
| Storytelling | ✨ | Narrativa aspiracional de la propiedad (copy personalizable) |
| Social Proof | ⭐ | Confianza de la agencia, trayectoria (copy personalizable) |
| FAQ | ❓ | Preguntas frecuentes sobre la propiedad |
| Testimonial | 💬 | Cita de un cliente satisfecho (copy personalizable) |

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

## Identidad de marca (configuración)
El usuario configura una vez en "Mi Marca":
- Nombre de la agencia
- Logo (subida de archivo o URL)
- Color primario + secundario + texto (picker o paletas predefinidas)
- Teléfono / WhatsApp
- Sitio web
- Instagram
- **API Key de Google Gemini** (opcional pero recomendado)

**6 paletas profesionales predefinidas** para inmobiliarias:
- Azul corporativo, Negro elegante, Verde premium, Bordo clásico, Gris moderno, Azul marino

---

## Motor de generación: Gemini Imagen 3

- Sin API Key: motor básico de composición (Pillow/SVG), fondos sólidos
- **Con API Key de Google Gemini**: fondos fotorrealistas generados por IA, composición publicitaria de calidad profesional
- La key es **gratuita** desde Google AI Studio (aistudio.google.com)
- Se configura en 2 minutos desde "Mi Marca"

---

## Features destacadas

- ✅ **Scraper automático multi-portal**: Zonaprop, Argenprop, Idealista, Fotocasa, Inmuebles24, MercadoLibre Inmuebles, y más
- ✅ **Retry logic en scraper**: 3 intentos (render=true → sin render → fetch directo)
- ✅ **Regenerar sin costo**: un ángulo que no gustó se regenera gratis
- ✅ **Historial completo**: todos los jobs guardados con thumbnails, paginado de 10/página
- ✅ **Share link**: página pública por job para compartir con clientes (`/share/:jobId`)
- ✅ **Notificación del browser**: avisa cuando terminó la generación
- ✅ **Imágenes en Cloudinary**: CDN rápido, con fallback a disco local
- ✅ **ZIP descargable**: todos los creativos de un job en un zip
- ✅ **Preview de marca en tiempo real**: vista previa de colores y logo mientras se configura

---

## Planes y precios

### Suscripciones mensuales (Stripe)
| Plan | Precio | Créditos | Destacado |
|------|--------|----------|-----------|
| Starter | $49/mes | 30 creativos/mes | — |
| Pro | $99/mes | 100 creativos/mes | ⭐ Más popular |
| Scale | $199/mes | Ilimitado | Onboarding personalizado incluido |

### Paquetes de créditos one-time (sin vencimiento)
| Pack | Precio | Créditos | Precio por creativo |
|------|--------|----------|---------------------|
| Pack 10 | $9 | 10 | $0.90 |
| Pack 25 | $19 | 25 | $0.76 |
| Pack 50 | $32 | 50 | $0.64 |
| Pack 100 | $55 | 100 | $0.55 |

**1 crédito = 1 propiedad** (todos los formatos y ángulos incluidos, regenerar no cuesta crédito)

---

## Sistema de referidos
- Cada usuario tiene un código único (link con `?ref=CODIGO`)
- Por cada amigo que se registra: el referente gana **5 créditos**, el nuevo usuario gana **2 créditos**
- Stats visibles en el Dashboard (referidos totales, créditos ganados)

---

## Dashboard del usuario
- Créditos disponibles + plan actual + total de generaciones
- Accesos rápidos a Generar y Configurar Marca
- Banner de onboarding si no tiene marca configurada
- Banner de Gemini si no tiene API Key
- Banner de éxito post-pago (suscripción o pack)
- Sección de referidos con link copiable
- Historial paginado con thumbnails + descarga + eliminar

---

## Portales soportados (scraper)
- 🇦🇷 Zonaprop, Argenprop (Argentina)
- 🇦🇷 MercadoLibre Inmuebles (Argentina)
- 🇪🇸 Idealista, Fotocasa (España)
- 🇲🇽 Inmuebles24 (México)
- 🇺🇾 Infocasas (Uruguay)
- 🇨🇱 Portal Inmobiliario (Chile)
- 🇨🇴 Metrocuadrado (Colombia)
- Y más (ScraperAPI con render=true por portal)

---

## Propuesta de valor (para la landing)

**Para el usuario:** "Del link de la propiedad a 7 creativos para Meta Ads en 2 minutos, con la identidad visual de tu inmobiliaria. Sin diseñador. Sin apps de diseño."

**Pain points que resuelve:**
- Armar creativos tarda 2+ horas por propiedad
- Los diseñadores son caros y lentos
- Los creativos genéricos no tienen tu marca
- Hay que saber usar Canva/Photoshop

**Diferenciadores:**
- Scraping automático (no hay que cargar fotos ni datos)
- 7 tipos de creativo por propiedad (no solo una imagen)
- Marca aplicada automáticamente en todos
- Motor Gemini Imagen 3 (calidad publicitaria real)
- Regenerar gratis (sin miedo a gastar créditos)
- Multi-portal y multi-país

---

## Testimonials (ficticios, para landing)
- **Martín R.** (Agente en Palermo): "Antes tardaba 2 horas en armar los creativos para cada propiedad. Ahora en 3 minutos ya los tengo listos para publicar."
- **Valentina S.** (Directora en Recoleta): "La calidad visual sorprende. Los clientes me preguntan quién hace el diseño y les digo que es IA. Se quedan sin palabras."
- **Diego M.** (Broker en Córdoba): "Lo mejor es que mantiene mi identidad de marca en todo. Logo, colores, teléfono. Súper consistente."

---

## Info de contacto / legal
- Email: hola@inmogen-ia.com
- Términos: inmogen-ia.com/terms
- Privacidad: inmogen-ia.com/privacy
- Inicio gratis: 3 créditos sin tarjeta de crédito

---

## Notas para la landing de Automatik Media
- El target son **inmobiliarias y agentes inmobiliarios** de LATAM y España
- Tono: profesional pero accesible, enfocado en el ahorro de tiempo
- El CTA principal es "Generar mis primeros creativos" → registro en Clerk (modal)
- Destacar que los primeros 100 clientes tienen créditos dobles de por vida
- La prueba social es clave: mostrar antes/después o ejemplos de creativos
- Gemini Imagen 3 es el diferenciador técnico más fuerte — mencionarlo
