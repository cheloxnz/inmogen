import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={22} />
          <span className="font-bold text-xl">InmoGen</span>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Volver
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-extrabold mb-8">{title}</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
          {children}
        </div>
      </div>
      <footer className="border-t border-gray-800 px-8 py-6 text-center text-gray-600 text-xs">
        © 2026 InmoGen · <a href="mailto:hola@inmogen-ia.com" className="hover:text-gray-400">hola@inmogen-ia.com</a>
      </footer>
    </div>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Términos y Condiciones">
      <p className="text-gray-500 text-sm">Última actualización: junio 2026</p>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">1. Aceptación de los términos</h2>
        <p>Al acceder y utilizar InmoGen ("el Servicio"), aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguno de estos términos, no uses el Servicio.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">2. Descripción del servicio</h2>
        <p>InmoGen es una plataforma SaaS que permite a profesionales inmobiliarios generar automáticamente creativos visuales para campañas de publicidad en Meta (Facebook e Instagram) a partir de URLs de propiedades publicadas en portales inmobiliarios.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">3. Cuenta y créditos</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Para usar el Servicio debés crear una cuenta con información verídica.</li>
          <li>Cada generación de creativos consume 1 crédito de tu saldo.</li>
          <li>Los créditos de planes mensuales se renuevan al inicio de cada ciclo de facturación y no son acumulables.</li>
          <li>Los créditos de paquetes one-time no tienen fecha de vencimiento.</li>
          <li>Los créditos no son reembolsables una vez utilizados.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">4. Pagos y facturación</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Los pagos son procesados por Stripe de forma segura.</li>
          <li>Los planes mensuales se cobran automáticamente al inicio de cada período.</li>
          <li>Podés cancelar tu suscripción en cualquier momento desde tu cuenta.</li>
          <li>No se realizan reembolsos por períodos parciales de suscripción.</li>
          <li>Los precios están expresados en dólares estadounidenses (USD).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">5. Uso aceptable</h2>
        <p>Te comprometés a usar InmoGen exclusivamente para fines lícitos relacionados con la comercialización de propiedades inmobiliarias. Está prohibido:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Usar el Servicio para generar contenido falso o engañoso.</li>
          <li>Intentar acceder a datos de otros usuarios.</li>
          <li>Realizar scraping masivo o automatizado no autorizado del Servicio.</li>
          <li>Revender o sublicenciar el acceso al Servicio.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">6. Propiedad intelectual</h2>
        <p>Los creativos generados son de tu propiedad. InmoGen retiene todos los derechos sobre la plataforma, algoritmos y código fuente del Servicio.</p>
        <p className="mt-2">Sos responsable de tener los derechos necesarios sobre las imágenes y contenidos de las propiedades que procesás a través del Servicio.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">7. Limitación de responsabilidad</h2>
        <p>InmoGen no garantiza resultados específicos de campañas publicitarias. El Servicio se ofrece "tal cual" sin garantías de ningún tipo. En ningún caso nuestra responsabilidad superará el monto pagado por el usuario en los últimos 3 meses.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">8. Modificaciones</h2>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios se notificarán por email y entrarán en vigencia 30 días después de su publicación.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">9. Contacto</h2>
        <p>Para consultas sobre estos términos: <a href="mailto:hola@inmogen-ia.com" className="text-yellow-400 hover:underline">hola@inmogen-ia.com</a></p>
      </section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad">
      <p className="text-gray-500 text-sm">Última actualización: junio 2026</p>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">1. Información que recopilamos</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-white">Datos de cuenta:</strong> nombre, email y foto de perfil (provistos por Clerk).</li>
          <li><strong className="text-white">Datos de marca:</strong> nombre de agencia, logo, colores, teléfono e Instagram que configurás voluntariamente.</li>
          <li><strong className="text-white">Datos de uso:</strong> URLs de propiedades procesadas, creativos generados e historial de jobs.</li>
          <li><strong className="text-white">Datos de pago:</strong> procesados exclusivamente por Stripe. No almacenamos datos de tarjetas.</li>
          <li><strong className="text-white">Datos técnicos:</strong> dirección IP, tipo de navegador y cookies de sesión.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">2. Cómo usamos tu información</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Proveer y mejorar el Servicio.</li>
          <li>Procesar pagos y gestionar suscripciones.</li>
          <li>Enviarte notificaciones sobre el estado de tus generaciones.</li>
          <li>Comunicarte actualizaciones importantes del Servicio.</li>
          <li>Prevenir fraudes y abusos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">3. Proveedores de terceros</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-white">Clerk:</strong> autenticación de usuarios.</li>
          <li><strong className="text-white">Stripe:</strong> procesamiento de pagos.</li>
          <li><strong className="text-white">Cloudinary:</strong> almacenamiento de imágenes generadas.</li>
          <li><strong className="text-white">MongoDB Atlas:</strong> base de datos.</li>
          <li><strong className="text-white">ScraperAPI:</strong> extracción de datos de portales inmobiliarios.</li>
        </ul>
        <p className="mt-2">Cada proveedor maneja tus datos según su propia política de privacidad.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">4. Almacenamiento y seguridad</h2>
        <p>Tus datos se almacenan en servidores seguros. Los creativos generados se guardan en Cloudinary con acceso autenticado. Implementamos medidas técnicas y organizativas para proteger tu información.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">5. Tus derechos</h2>
        <p>Tenés derecho a:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Acceder a tus datos personales.</li>
          <li>Corregir información incorrecta.</li>
          <li>Solicitar la eliminación de tu cuenta y datos.</li>
          <li>Exportar tus creativos generados.</li>
        </ul>
        <p className="mt-2">Para ejercer estos derechos, contactanos en <a href="mailto:hola@inmogen-ia.com" className="text-yellow-400 hover:underline">hola@inmogen-ia.com</a>.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">6. Cookies</h2>
        <p>Usamos cookies estrictamente necesarias para mantener tu sesión activa. No usamos cookies de seguimiento ni publicidad de terceros.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">7. Cambios a esta política</h2>
        <p>Notificaremos cualquier cambio significativo por email con al menos 30 días de anticipación.</p>
      </section>

      <section>
        <h2 className="text-white font-bold text-lg mb-2">8. Contacto</h2>
        <p>Para consultas sobre privacidad: <a href="mailto:hola@inmogen-ia.com" className="text-yellow-400 hover:underline">hola@inmogen-ia.com</a></p>
      </section>
    </LegalLayout>
  )
}
