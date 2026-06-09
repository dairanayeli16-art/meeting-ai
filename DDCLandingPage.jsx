/**
 * DDC Global Technology — Landing Page
 * Stack: React + Tailwind CSS (Lovable.dev compatible)
 * Bilingual: Spanish / English toggle
 * Features: Personalised Diagnosis Form with Supabase integration
 */

import { useState, useEffect } from "react";
import { supabase } from "./src/lib/supabaseClient";

/* ─────────────────────────────────────────────────────────
   COPY (all UI text, both languages)
───────────────────────────────────────────────────────── */
const COPY = {
  es: {
    nav: {
      services: "Servicios",
      diagnosis: "Diagnóstico",
      about: "Nosotros",
      process: "Proceso",
      contact: "Contacto",
      cta: "Hablemos",
    },
    hero: {
      badge: "Tecnología que transforma negocios",
      headline1: "Automatización e IA",
      headline2: "para empresas que",
      headline3: "quieren crecer.",
      sub: "Desarrollamos software a medida, implementamos inteligencia artificial y diseñamos estrategias digitales que convierten la tecnología en una ventaja competitiva real.",
      cta1: "Iniciar proyecto",
      cta2: "Ver servicios",
    },
    stats: [
      { value: "50+", label: "Proyectos entregados" },
      { value: "3×", label: "Más rápido en procesos" },
      { value: "98%", label: "Satisfacción de clientes" },
      { value: "5+", label: "Países atendidos" },
    ],
    services: {
      eyebrow: "Servicios",
      title: "Todo lo que tu empresa necesita",
      sub: "Soluciones tecnológicas end-to-end adaptadas a tus objetivos de negocio.",
      items: [
        {
          icon: "🤖",
          title: "IA & Automatización",
          desc: "Eliminamos el trabajo manual repetitivo. Desplegamos automatización inteligente que aprende, se adapta y escala con tu negocio — ahorrando tiempo y reduciendo costes desde el primer mes.",
          features: ["Automatización de procesos (RPA)", "Integraciones de IA / LLM", "Flujos de trabajo inteligentes", "Análisis predictivo"],
        },
        {
          icon: "💻",
          title: "Desarrollo de Software",
          desc: "Aplicaciones web y móviles a medida construidas para rendimiento y escala. Desde plataformas SaaS hasta herramientas internas — creamos el software que tu negocio necesita para operar mejor.",
          features: ["Aplicaciones web", "Apps móviles", "Productos SaaS", "Integraciones API"],
        },
        {
          icon: "🧭",
          title: "Consultoría & Estrategia",
          desc: "Transforma tus operaciones digitales con orientación experta. Auditamos tu situación actual, diseñamos la hoja de ruta y ejecutamos la transformación digital de principio a fin.",
          features: ["Estrategia de transformación digital", "Auditorías tecnológicas", "Diseño de procesos", "Formación de equipos"],
        },
      ],
    },
    why: {
      eyebrow: "Por qué elegirnos",
      title: "No somos solo proveedores. Somos tu equipo tecnológico.",
      sub: "Nos integramos en tu negocio para entender tus desafíos reales y construir soluciones que realmente funcionan.",
      items: [
        { icon: "⚡", title: "Velocidad real", desc: "La mayoría de proyectos van del inicio al despliegue en semanas, no meses." },
        { icon: "🎯", title: "Orientados a resultados", desc: "Cada solución está vinculada a métricas de negocio medibles y claras." },
        { icon: "🌍", title: "Alcance global", desc: "Atendemos clientes en Europa, Latinoamérica y Norteamérica." },
        { icon: "🔒", title: "Seguro por diseño", desc: "Seguridad de nivel empresarial integrada desde el primer día, no como añadido." },
        { icon: "🤝", title: "Alianza real", desc: "No subcontratamos. Tu proyecto lo lleva nuestro equipo core de principio a fin." },
        { icon: "🚀", title: "Tecnología de vanguardia", desc: "Siempre las herramientas más efectivas del mercado — sin legado obsoleto." },
      ],
    },
    process: {
      eyebrow: "Cómo trabajamos",
      title: "Un proceso probado. Resultados predecibles.",
      sub: "Tres fases diseñadas para eliminar el riesgo y maximizar el valor desde el día uno.",
      steps: [
        { num: "01", title: "Descubrimiento", desc: "Analizamos tu negocio, identificamos cuellos de botella y mapeamos tus objetivos para definir exactamente qué construir y por qué." },
        { num: "02", title: "Diseño & Desarrollo", desc: "Nuestro equipo diseña, prototipa y desarrolla tu solución con revisiones regulares. Tú ves el progreso en tiempo real." },
        { num: "03", title: "Lanzamiento & Escala", desc: "Desplegamos, monitorizamos y optimizamos tu solución de forma continua para que mejore con el tiempo." },
      ],
    },
    testimonials: {
      eyebrow: "Clientes",
      title: "Empresas que ya operan más rápido",
      items: [
        {
          quote: "DDC automatizó los procesos que nos robaban horas cada semana. En 3 meses recuperamos más de 40 horas mensuales en mi equipo.",
          name: "María González",
          role: "CEO, Innova Solutions",
          avatar: "MG",
        },
        {
          quote: "Desarrollaron nuestra plataforma SaaS en tiempo récord. El código es limpio, escalable y el equipo es increíblemente profesional.",
          name: "Carlos Ruiz",
          role: "CTO, TechForce Pro",
          avatar: "CR",
        },
        {
          quote: "La consultoría estratégica de DDC nos ayudó a tomar decisiones tecnológicas que ahorraron más de €80k en el primer año.",
          name: "Ana Martínez",
          role: "Directora de Operaciones, Global Corp",
          avatar: "AM",
        },
      ],
    },
    cta: {
      title: "¿Listo para transformar tu empresa?",
      sub: "Reserva una llamada de estrategia gratuita de 30 minutos. Sin compromisos. Solo resultados.",
      btn1: "Reservar llamada gratuita",
      btn2: "Enviar mensaje",
    },
    footer: {
      tagline: "Transformando empresas a través de tecnología inteligente.",
      links: [
        { label: "Servicios", href: "#services" },
        { label: "Nosotros", href: "#about" },
        { label: "Proceso", href: "#process" },
        { label: "Contacto", href: "#contact" },
      ],
      legal: "© 2026 DDC Global Technology. Todos los derechos reservados.",
    },
  },

  en: {
    nav: {
      services: "Services",
      diagnosis: "Diagnosis",
      about: "About",
      process: "Process",
      contact: "Contact",
      cta: "Let's Talk",
    },
    hero: {
      badge: "Technology that transforms businesses",
      headline1: "AI & Automation",
      headline2: "for companies that",
      headline3: "want to grow.",
      sub: "We build custom software, implement artificial intelligence and design digital strategies that turn technology into a real competitive advantage.",
      cta1: "Start your project",
      cta2: "See services",
    },
    stats: [
      { value: "50+", label: "Projects delivered" },
      { value: "3×", label: "Faster processes" },
      { value: "98%", label: "Client satisfaction" },
      { value: "5+", label: "Countries served" },
    ],
    services: {
      eyebrow: "Services",
      title: "Everything your business needs",
      sub: "End-to-end technology solutions tailored to your business objectives.",
      items: [
        {
          icon: "🤖",
          title: "AI & Automation",
          desc: "We eliminate repetitive manual work. We deploy intelligent automation that learns, adapts, and scales with your business — saving time and reducing costs from month one.",
          features: ["Process automation (RPA)", "AI / LLM integrations", "Intelligent workflows", "Predictive analytics"],
        },
        {
          icon: "💻",
          title: "Software Development",
          desc: "Custom web and mobile applications built for performance and scale. From SaaS platforms to internal tools — we build the software your business needs to operate better.",
          features: ["Web applications", "Mobile apps", "SaaS products", "API integrations"],
        },
        {
          icon: "🧭",
          title: "Consulting & Strategy",
          desc: "Transform your digital operations with expert guidance. We audit your current state, design the roadmap, and execute your digital transformation from start to finish.",
          features: ["Digital transformation strategy", "Tech audits", "Process design", "Team training"],
        },
      ],
    },
    why: {
      eyebrow: "Why choose us",
      title: "We're not just vendors. We're your tech team.",
      sub: "We embed ourselves in your business to understand your real challenges and build solutions that actually work.",
      items: [
        { icon: "⚡", title: "Real speed", desc: "Most projects go from kickoff to deployment in weeks, not months." },
        { icon: "🎯", title: "Results-driven", desc: "Every solution is tied to clear, measurable business metrics." },
        { icon: "🌍", title: "Global reach", desc: "Serving clients across Europe, Latin America, and North America." },
        { icon: "🔒", title: "Secure by design", desc: "Enterprise-grade security built in from day one — not bolted on." },
        { icon: "🤝", title: "True partnership", desc: "We don't subcontract. Your project is handled by our core team end-to-end." },
        { icon: "🚀", title: "Cutting-edge tech", desc: "Always using the most effective tools on the market — no legacy bloat." },
      ],
    },
    process: {
      eyebrow: "How we work",
      title: "A proven process. Predictable results.",
      sub: "Three phases designed to eliminate risk and maximize value from day one.",
      steps: [
        { num: "01", title: "Discovery", desc: "We analyze your business, identify bottlenecks, and map your goals to define exactly what to build and why." },
        { num: "02", title: "Design & Build", desc: "Our team designs, prototypes, and develops your solution with regular check-ins. You see progress in real time." },
        { num: "03", title: "Launch & Scale", desc: "We deploy, monitor, and continuously optimize your solution so it keeps improving over time." },
      ],
    },
    testimonials: {
      eyebrow: "Clients",
      title: "Companies already running faster",
      items: [
        {
          quote: "DDC automated the processes that were stealing hours from us every week. In 3 months we recovered over 40 monthly hours across my team.",
          name: "María González",
          role: "CEO, Innova Solutions",
          avatar: "MG",
        },
        {
          quote: "They built our SaaS platform in record time. The code is clean, scalable, and the team is incredibly professional.",
          name: "Carlos Ruiz",
          role: "CTO, TechForce Pro",
          avatar: "CR",
        },
        {
          quote: "DDC's strategic consulting helped us make technology decisions that saved over €80k in the first year.",
          name: "Ana Martínez",
          role: "Director of Operations, Global Corp",
          avatar: "AM",
        },
      ],
    },
    cta: {
      title: "Ready to transform your business?",
      sub: "Book a free 30-minute strategy call. No commitments. Just results.",
      btn1: "Book a free call",
      btn2: "Send a message",
    },
    footer: {
      tagline: "Transforming businesses through intelligent technology.",
      links: [
        { label: "Services", href: "#services" },
        { label: "About", href: "#about" },
        { label: "Process", href: "#process" },
        { label: "Contact", href: "#contact" },
      ],
      legal: "© 2026 DDC Global Technology. All rights reserved.",
    },
  },
};

/* ─────────────────────────────────────────────────────────
   SMALL REUSABLE COMPONENTS
───────────────────────────────────────────────────────── */

function Eyebrow({ children }) {
  return (
    <span className="inline-block text-orange-500 font-bold text-xs tracking-[0.2em] uppercase mb-3">
      {children}
    </span>
  );
}

function SectionTitle({ children, light = false }) {
  return (
    <h2 className={`text-4xl md:text-5xl font-black leading-tight ${light ? "text-white" : "text-gray-900"}`}>
      {children}
    </h2>
  );
}

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-orange-400 fill-orange-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DIAGNOSIS FORM COMPONENT
───────────────────────────────────────────────────────── */

function DiagnosisForm({ lang, t }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phoneCountryCode: "+34",
    phoneNumber: "",
    website: "",
    industry: "",
    businessType: "",
    location: "",
    mainProblem: "",
    currentProcess: "",
    responseTime: "",
    monthlyLeads: "",
    missedLeadsEstimate: "",
    channels: [],
    toolsUsed: [],
    automationGoals: [],
    preferredContactMethod: "email",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.phoneNumber.trim()) {
        setError(lang === "es" ? "Rellena los campos obligatorios" : "Please fill in required fields");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.mainProblem || !formData.currentProcess) {
        setError(lang === "es" ? "Rellena los campos obligatorios" : "Please fill in required fields");
        return false;
      }
    }
    if (step === 3) {
      if (formData.automationGoals.length === 0) {
        setError(lang === "es" ? "Selecciona al menos un objetivo" : "Select at least one goal");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError("");

    try {
      // Build full phone number
      const fullPhone = `${formData.phoneCountryCode}${formData.phoneNumber}`.replace(/\s+/g, "");

      // Generate diagnosis (simple scoring logic)
      const leadScore = Math.min(
        10,
        Math.round(
          (formData.automationGoals.length * 2 +
            (formData.missedLeadsEstimate ? 3 : 0) +
            (formData.channels.length > 1 ? 2 : 0)) /
            2
        )
      );

      // Create submission data
      const submissionData = {
        business_name: formData.businessName || "",
        contact_name: formData.contactName || "",
        email: formData.email || "",
        phone_country_code: formData.phoneCountryCode || "",
        phone_number: formData.phoneNumber || "",
        full_phone: fullPhone,
        website: formData.website || "",
        industry: formData.industry || "",
        business_type: formData.businessType || "",
        location: formData.location || "",
        language: lang || "en",
        main_problem: formData.mainProblem || "",
        current_process: formData.currentProcess || "",
        response_time: formData.responseTime || "",
        monthly_leads: formData.monthlyLeads || "",
        missed_leads_estimate: formData.missedLeadsEstimate || "",
        channels: formData.channels || [],
        tools_used: formData.toolsUsed || [],
        automation_goals: formData.automationGoals || [],
        lead_score: leadScore,
        preferred_contact_method: formData.preferredContactMethod || "email",
        status: "new",
        raw_answers: {
          ...formData,
          submitted_from: "website_personalised_diagnosis_form",
          submitted_at: new Date().toISOString(),
          leadScore,
        },
      };

      console.log("📝 Submitting diagnosis form:", submissionData);

      // Insert to Supabase
      const { data, error: supabaseError } = await supabase
        .from("personalised_diagnosis_submissions")
        .insert([submissionData])
        .select();

      if (supabaseError) {
        console.error("❌ Supabase insert error:", supabaseError);
        throw supabaseError;
      }

      console.log("✅ Supabase insert success:", data);

      // Show success
      setSuccess(true);
      setStep(4);

      // Reset form after 5 seconds
      setTimeout(() => {
        setFormData({
          businessName: "",
          contactName: "",
          email: "",
          phoneCountryCode: "+34",
          phoneNumber: "",
          website: "",
          industry: "",
          businessType: "",
          location: "",
          mainProblem: "",
          currentProcess: "",
          responseTime: "",
          monthlyLeads: "",
          missedLeadsEstimate: "",
          channels: [],
          toolsUsed: [],
          automationGoals: [],
          preferredContactMethod: "email",
        });
        setStep(1);
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("💥 Form submission error:", err);
      setError(
        lang === "es"
          ? "Error al enviar el formulario. Intenta de nuevo."
          : "Error submitting form. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-12 text-center max-w-2xl mx-auto">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-3xl font-black text-gray-900 mb-3">
          {lang === "es" ? "¡Diagnóstico completado!" : "Diagnosis complete!"}
        </h3>
        <p className="text-gray-600 text-lg mb-6">
          {lang === "es"
            ? "Hemos recibido tu diagnóstico. Nos pondremos en contacto dentro de 24 horas."
            : "We've received your diagnosis. We'll contact you within 24 hours."}
        </p>
        <div className="text-sm text-gray-500">
          {lang === "es" ? "Redirigiendo..." : "Redirecting..."}
        </div>
      </div>
    );
  }

  // Step 1: Business info
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            {lang === "es" ? "Cuéntanos de tu empresa" : "Tell us about your business"}
          </h3>
          <p className="text-gray-500">
            {lang === "es"
              ? "Necesitamos algunos datos básicos (paso 1 de 3)"
              : "We need some basic information (step 1 of 3)"}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Nombre de la empresa *" : "Business name *"}
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              placeholder={lang === "es" ? "Tu empresa" : "Your company"}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Tu nombre" : "Your name"}
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange("contactName", e.target.value)}
              placeholder={lang === "es" ? "Tu nombre completo" : "Full name"}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Email" : "Email"}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Teléfono *" : "Phone number *"}
            </label>
            <div className="flex gap-2">
              <select
                value={formData.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                className="w-24 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="+34">🇪🇸 +34</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+34">🇲🇽 +52</option>
              </select>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                placeholder={lang === "es" ? "123 456 789" : "123 456 789"}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Sitio web" : "Website"}
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

        <button
          onClick={handleNextStep}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all"
        >
          {lang === "es" ? "Siguiente →" : "Next →"}
        </button>
      </div>
    );
  }

  // Step 2: Current process
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            {lang === "es" ? "Cuéntanos sobre tu operación actual" : "Tell us about your current operations"}
          </h3>
          <p className="text-gray-500">
            {lang === "es" ? "Paso 2 de 3" : "Step 2 of 3"}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "¿Cuál es tu principal desafío? *" : "What's your main business challenge? *"}
            </label>
            <select
              value={formData.mainProblem}
              onChange={(e) => handleChange("mainProblem", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">
                {lang === "es" ? "Selecciona..." : "Select..."}
              </option>
              <option value="manual_processes">
                {lang === "es" ? "Procesos manuales y repetitivos" : "Manual and repetitive processes"}
              </option>
              <option value="slow_response">
                {lang === "es" ? "Tiempo de respuesta lento" : "Slow response times"}
              </option>
              <option value="data_management">
                {lang === "es" ? "Gestión manual de datos" : "Manual data management"}
              </option>
              <option value="team_overloaded">
                {lang === "es" ? "Equipo saturado de tareas" : "Team overloaded with tasks"}
              </option>
              <option value="other">
                {lang === "es" ? "Otro" : "Other"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "¿Cómo es tu proceso actual? *" : "How is your current process managed? *"}
            </label>
            <select
              value={formData.currentProcess}
              onChange={(e) => handleChange("currentProcess", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">
                {lang === "es" ? "Selecciona..." : "Select..."}
              </option>
              <option value="spreadsheets">Excel / Hojas de cálculo</option>
              <option value="email">Email / Correo</option>
              <option value="crm">CRM básico</option>
              <option value="custom_system">Sistema propio</option>
              <option value="multiple_tools">
                {lang === "es" ? "Múltiples herramientas" : "Multiple tools"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "¿Cuántas horas/semana se pierden en tareas manuales?" : "How many hours/week spent on manual tasks?"}
            </label>
            <select
              value={formData.responseTime}
              onChange={(e) => handleChange("responseTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">
                {lang === "es" ? "Selecciona..." : "Select..."}
              </option>
              <option value="under_5">5-10 horas</option>
              <option value="10_20">10-20 horas</option>
              <option value="20_40">20-40 horas</option>
              <option value="over_40">Más de 40 horas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {lang === "es" ? "Leads perdidos/mes aprox." : "Approx. missed leads per month"}
            </label>
            <input
              type="number"
              value={formData.missedLeadsEstimate}
              onChange={(e) => handleChange("missedLeadsEstimate", e.target.value)}
              placeholder={lang === "es" ? "Número aproximado" : "Approximate number"}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={handlePrevStep}
            className="flex-1 border border-gray-300 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-50 transition-all"
          >
            {lang === "es" ? "← Anterior" : "← Previous"}
          </button>
          <button
            onClick={handleNextStep}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            {lang === "es" ? "Siguiente →" : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Automation goals
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            {lang === "es" ? "¿Qué quieres automatizar?" : "What do you want to automate?"}
          </h3>
          <p className="text-gray-500">
            {lang === "es"
              ? "Selecciona al menos una opción (paso final)"
              : "Select at least one option (final step)"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            {
              value: "lead_capture",
              label: lang === "es" ? "Captura de leads" : "Lead capture",
            },
            {
              value: "email_follow_up",
              label: lang === "es" ? "Seguimiento por email" : "Email follow-up",
            },
            {
              value: "data_entry",
              label: lang === "es" ? "Entrada de datos" : "Data entry",
            },
            {
              value: "invoicing",
              label: lang === "es" ? "Facturación" : "Invoicing",
            },
            {
              value: "scheduling",
              label: lang === "es" ? "Scheduling/Citas" : "Scheduling/Appointments",
            },
            {
              value: "reporting",
              label: lang === "es" ? "Reportes" : "Reporting",
            },
          ].map((goal) => (
            <label key={goal.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-orange-50">
              <input
                type="checkbox"
                checked={formData.automationGoals.includes(goal.value)}
                onChange={(e) => handleCheckboxChange("automationGoals", goal.value)}
                className="w-5 h-5 text-orange-500 rounded"
              />
              <span className="ml-3 font-medium text-gray-900">{goal.label}</span>
            </label>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">
            {lang === "es" ? "¿Cómo prefieres que nos contactemos?" : "How should we contact you?"}
          </label>
          <div className="flex gap-3 mb-6">
            {[
              { value: "email", label: "Email" },
              { value: "phone", label: lang === "es" ? "Teléfono" : "Phone" },
              { value: "meeting", label: lang === "es" ? "Reunión" : "Meeting" },
            ].map((method) => (
              <label key={method.value} className="flex items-center">
                <input
                  type="radio"
                  name="contact_method"
                  value={method.value}
                  checked={formData.preferredContactMethod === method.value}
                  onChange={(e) => handleChange("preferredContactMethod", e.target.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="ml-2 text-gray-700 font-medium">{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrevStep}
            className="flex-1 border border-gray-300 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-50 transition-all"
          >
            {lang === "es" ? "← Anterior" : "← Previous"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 text-white font-bold py-3 rounded-lg transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading
              ? lang === "es"
                ? "Enviando..."
                : "Sending..."
              : lang === "es"
              ? "✓ Enviar diagnóstico"
              : "✓ Submit diagnosis"}
          </button>
        </div>
      </div>
    );
  }
}

export default function DDCLandingPage() {
  const [lang, setLang] = useState("es");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const t = COPY[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* smooth-scroll helper */
  const handleNavClick = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="font-sans text-gray-900 scroll-smooth overflow-x-hidden">

      {/* ═══════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-lg shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30">
              <span className="text-white font-black text-xl leading-none">D</span>
            </div>
            <div className="leading-none">
              <div className={`font-black text-lg ${scrolled ? "text-gray-900" : "text-white"}`}>
                DDC
              </div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-orange-500 uppercase">
                Global Technology
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: t.nav.services, href: "#services" },
              { label: t.nav.diagnosis, href: "#diagnosis" },
              { label: t.nav.about,    href: "#about"    },
              { label: t.nav.process,  href: "#process"  },
              { label: t.nav.contact,  href: "#contact"  },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`text-sm font-semibold transition-colors hover:text-orange-500 ${
                  scrolled ? "text-gray-600" : "text-white/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className={`hidden md:flex items-center gap-1.5 text-xs font-bold border rounded-full px-3 py-1.5 transition-all hover:border-orange-500 hover:text-orange-500 ${
                scrolled
                  ? "border-gray-200 text-gray-600"
                  : "border-white/30 text-white"
              }`}
            >
              {lang === "es" ? "🇬🇧 EN" : "🇪🇸 ES"}
            </button>

            {/* CTA button */}
            <button
              onClick={() => handleNavClick("#contact")}
              className="hidden md:block bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-px"
            >
              {t.nav.cta}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1.5 p-1"
              aria-label="Menu"
            >
              <span className={`block w-6 h-0.5 transition-all ${mobileOpen ? "rotate-45 translate-y-2 bg-gray-800" : scrolled ? "bg-gray-800" : "bg-white"}`} />
              <span className={`block w-6 h-0.5 transition-all ${mobileOpen ? "opacity-0 bg-gray-800" : scrolled ? "bg-gray-800" : "bg-white"}`} />
              <span className={`block w-6 h-0.5 transition-all ${mobileOpen ? "-rotate-45 -translate-y-2 bg-gray-800" : scrolled ? "bg-gray-800" : "bg-white"}`} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-5 space-y-4 shadow-lg">
            {[
              { label: t.nav.services, href: "#services" },
              { label: t.nav.diagnosis, href: "#diagnosis" },
              { label: t.nav.about,    href: "#about"    },
              { label: t.nav.process,  href: "#process"  },
              { label: t.nav.contact,  href: "#contact"  },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="block w-full text-left text-gray-700 font-semibold py-1 hover:text-orange-500"
              >
                {item.label}
              </button>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setLang(lang === "es" ? "en" : "es")}
                className="text-xs font-bold border border-gray-200 rounded-full px-3 py-1.5 text-gray-600"
              >
                {lang === "es" ? "🇬🇧 EN" : "🇪🇸 ES"}
              </button>
              <button
                onClick={() => handleNavClick("#contact")}
                className="bg-orange-500 text-white text-sm font-bold px-5 py-2 rounded-full"
              >
                {t.nav.cta}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════ */}
      <section className="relative min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#111827] to-[#0A0F1E] flex items-center overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 right-0 w-[700px] h-[700px] bg-orange-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-400/5 rounded-full blur-3xl" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Vertical accent line */}
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-orange-500/20 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 grid md:grid-cols-2 gap-16 items-center">
          {/* LEFT — Text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-400 text-sm font-semibold">{t.hero.badge}</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-6">
              <span className="block">{t.hero.headline1}</span>
              <span className="block">{t.hero.headline2}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
                {t.hero.headline3}
              </span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg">
              {t.hero.sub}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleNavClick("#contact")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full transition-all hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5 text-sm"
              >
                {t.hero.cta1} →
              </button>
              <button
                onClick={() => handleNavClick("#services")}
                className="border border-white/20 hover:border-orange-500/50 text-white font-semibold px-8 py-4 rounded-full transition-all hover:bg-white/5 text-sm"
              >
                {t.hero.cta2}
              </button>
            </div>
          </div>

          {/* RIGHT — Visual */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-[420px] h-[420px]">
              {/* Orbit rings */}
              <div className="absolute inset-0 rounded-full border border-white/5" />
              <div className="absolute inset-6 rounded-full border border-orange-500/10" />
              <div className="absolute inset-12 rounded-full border border-orange-500/15" />

              {/* Center card */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-2xl shadow-orange-500/50 flex items-center justify-center rotate-6 hover:rotate-0 transition-transform duration-500">
                  <div className="text-center">
                    <div className="text-5xl mb-1">🚀</div>
                    <div className="text-white font-black text-xs tracking-widest uppercase">DDC</div>
                  </div>
                </div>
              </div>

              {/* Floating feature chips */}
              {[
                { icon: "🤖", label: lang === "es" ? "IA Empresarial" : "Enterprise AI", top: "4%",  left: "2%"  },
                { icon: "⚡", label: lang === "es" ? "Automatización" : "Automation",    top: "4%",  right: "2%" },
                { icon: "💻", label: lang === "es" ? "Software"      : "Software",       bottom: "4%", left: "2%"  },
                { icon: "📊", label: lang === "es" ? "Analítica"     : "Analytics",      bottom: "4%", right: "2%" },
              ].map((chip, i) => (
                <div
                  key={i}
                  className="absolute bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 flex flex-col items-center gap-1.5 w-28"
                  style={{ top: chip.top, left: chip.left, bottom: chip.bottom, right: chip.right }}
                >
                  <span className="text-2xl">{chip.icon}</span>
                  <span className="text-white text-[11px] font-semibold text-center leading-tight">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-orange-500 to-transparent" />
      </section>

      {/* ═══════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════ */}
      <section className="bg-orange-500 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {t.stats.map((s, i) => (
            <div key={i}>
              <div className="text-4xl md:text-5xl font-black text-white">{s.value}</div>
              <div className="text-orange-100 text-sm mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SERVICES
      ═══════════════════════════════════════════ */}
      <section id="services" className="py-24 bg-[#FDFAF6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Eyebrow>{t.services.eyebrow}</Eyebrow>
            <SectionTitle>{t.services.title}</SectionTitle>
            <p className="text-gray-500 text-lg mt-4">{t.services.sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.services.items.map((svc, i) => (
              <div
                key={i}
                className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 flex flex-col"
              >
                <div className="w-16 h-16 bg-orange-50 group-hover:bg-orange-500 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-all duration-300 shrink-0">
                  {svc.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">{svc.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm mb-6 flex-1">{svc.desc}</p>
                <ul className="space-y-2.5">
                  {svc.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          WHY US
      ═══════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div>
              <Eyebrow>{t.why.eyebrow}</Eyebrow>
              <SectionTitle>{t.why.title}</SectionTitle>
              <p className="text-gray-500 text-lg mt-5 leading-relaxed">{t.why.sub}</p>
              <button
                onClick={() => handleNavClick("#contact")}
                className="mt-8 bg-orange-500 hover:bg-orange-600 text-white font-bold px-7 py-3.5 rounded-full transition-all hover:shadow-lg hover:shadow-orange-500/30 text-sm"
              >
                {t.nav.cta} →
              </button>
            </div>
            {/* Right grid */}
            <div className="grid grid-cols-2 gap-4">
              {t.why.items.map((item, i) => (
                <div
                  key={i}
                  className="bg-gray-50 hover:bg-orange-50 rounded-2xl p-5 transition-colors duration-200"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROCESS
      ═══════════════════════════════════════════ */}
      <section id="process" className="py-24 bg-[#0A0F1E] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Eyebrow>{t.process.eyebrow}</Eyebrow>
            <SectionTitle light>{t.process.title}</SectionTitle>
            <p className="text-gray-400 text-lg mt-4">{t.process.sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-12 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-gradient-to-r from-orange-500/30 via-orange-500/50 to-orange-500/30" />

            {t.process.steps.map((step, i) => (
              <div
                key={i}
                className="relative bg-white/4 border border-white/8 hover:border-orange-500/40 rounded-3xl p-8 transition-all duration-300 hover:bg-white/6"
              >
                {/* Step number bubble */}
                <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-6">
                  <span className="text-orange-400 font-black text-sm">{step.num}</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════ */}
      <section className="py-24 bg-[#FDFAF6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Eyebrow>{t.testimonials.eyebrow}</Eyebrow>
            <SectionTitle>{t.testimonials.title}</SectionTitle>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.testimonials.items.map((t2, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <StarRating />
                <blockquote className="text-gray-700 leading-relaxed text-sm mb-6 italic">
                  "{t2.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">
                    {t2.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t2.name}</div>
                    <div className="text-gray-500 text-xs">{t2.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PERSONALISED DIAGNOSIS FORM
      ═══════════════════════════════════════════ */}
      <section id="diagnosis" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <Eyebrow>{lang === "es" ? "Diagnóstico personalizado" : "Personalised diagnosis"}</Eyebrow>
            <SectionTitle>
              {lang === "es"
                ? "Descubre qué puedes automatizar"
                : "Discover what you can automate"}
            </SectionTitle>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
              {lang === "es"
                ? "Responde 8 preguntas simples y recibirás un diagnóstico personalizado sobre las oportunidades de automatización en tu negocio."
                : "Answer 8 quick questions and get a personalized diagnosis of automation opportunities for your business."}
            </p>
          </div>

          <DiagnosisForm lang={lang} t={t} />
        </div>
      </section>

      {/* ═════════════════════════════════════════════
      <section id="contact" className="py-28 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-black/10 rounded-full" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-semibold">
              {lang === "es" ? "Consulta gratuita · Sin compromisos" : "Free consultation · No strings attached"}
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            {t.cta.title}
          </h2>
          <p className="text-orange-100 text-xl mb-10 max-w-2xl mx-auto">
            {t.cta.sub}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:info@ddcglobaltechnology.com"
              className="bg-white text-orange-600 font-black px-8 py-4 rounded-full hover:bg-gray-50 transition-all hover:shadow-2xl hover:-translate-y-0.5 text-sm"
            >
              {t.cta.btn1}
            </a>
            <a
              href="mailto:info@ddcglobaltechnology.com"
              className="border-2 border-white/50 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all text-sm"
            >
              {t.cta.btn2}
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="bg-[#050A14] py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30">
                  <span className="text-white font-black text-xl leading-none">D</span>
                </div>
                <div className="leading-none">
                  <div className="font-black text-white text-lg">DDC</div>
                  <div className="text-[10px] font-bold tracking-[0.18em] text-orange-500 uppercase">Global Technology</div>
                </div>
              </div>
              <p className="text-gray-500 text-sm max-w-[220px] text-center md:text-left leading-relaxed mt-1">
                {t.footer.tagline}
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-8">
              {t.footer.links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-gray-500 hover:text-orange-500 text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Social / contact placeholder */}
            <div className="flex flex-col items-center md:items-end gap-2">
              <a
                href="mailto:info@ddcglobaltechnology.com"
                className="text-gray-400 hover:text-orange-500 text-sm transition-colors"
              >
                info@ddcglobaltechnology.com
              </a>
              <a
                href="https://ddcglobaltechnology.com"
                className="text-gray-600 hover:text-orange-500 text-xs transition-colors"
              >
                ddcglobaltechnology.com
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-gray-600 text-xs">
            <span>{t.footer.legal}</span>
            <span className="text-gray-700">
              {lang === "es" ? "Hecho con" : "Made with"}{" "}
              <span className="text-orange-500">♥</span>{" "}
              {lang === "es" ? "por DDC Global Technology" : "by DDC Global Technology"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
