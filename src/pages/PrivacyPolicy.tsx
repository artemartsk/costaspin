import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-5">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-gray-900" />
                        <h1 className="text-xl font-semibold text-gray-900">CostaSpine</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Privacy Policy / Política de Privacidad</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* English Version */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h2>
                    <p className="text-xs text-gray-400 mb-6">Last updated: March 2026 | Version 1.0</p>

                    <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">1. Data Controller</h3>
                            <p>CostaSpine S.L., located at Urb. Elviria, Marbella, 29604 Málaga, Spain, is the data controller responsible for your personal data in accordance with the General Data Protection Regulation (EU) 2016/679 ("GDPR") and the Spanish Organic Law 3/2018 on Personal Data Protection ("LOPDGDD").</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">2. Data We Collect</h3>
                            <p className="mb-2">We collect and process the following categories of personal data:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Identity data:</strong> first name, last name, date of birth</li>
                                <li><strong>Contact data:</strong> phone number, email address</li>
                                <li><strong>Health data (special category):</strong> diagnosis, treatment plans, clinical notes, medical history</li>
                                <li><strong>Communication data:</strong> call recordings, transcripts (with your consent)</li>
                                <li><strong>Financial data:</strong> payment records (card data is processed by Stripe and never stored by us)</li>
                                <li><strong>Technical data:</strong> IP address when signing digital forms</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">3. Legal Basis for Processing</h3>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Performance of contract</strong> (Art. 6(1)(b)): to provide healthcare services and manage appointments</li>
                                <li><strong>Explicit consent</strong> (Art. 9(2)(a)): for processing health data and call recordings</li>
                                <li><strong>Legal obligation</strong> (Art. 6(1)(c)): to maintain medical records for 5 years (Ley 41/2002)</li>
                                <li><strong>Legitimate interest</strong> (Art. 6(1)(f)): for appointment reminders and service quality</li>
                                <li><strong>Consent</strong> (Art. 6(1)(a)): for marketing communications (optional)</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">4. Data Sharing & Processors</h3>
                            <p className="mb-2">We share your data only with the following processors, all under Data Processing Agreements:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Supabase (EU region):</strong> database hosting and authentication</li>
                                <li><strong>Stripe:</strong> payment processing (PCI DSS compliant)</li>
                                <li><strong>Twilio:</strong> WhatsApp appointment reminders</li>
                                <li><strong>VAPI:</strong> AI-assisted phone booking (call recordings)</li>
                            </ul>
                            <p className="mt-2">We do not sell your data to third parties.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">5. Data Retention</h3>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Medical records:</strong> 5 years minimum (Ley 41/2002, Art. 17)</li>
                                <li><strong>Call recordings & transcripts:</strong> 90 days, then automatically deleted</li>
                                <li><strong>Payment records:</strong> as required by Spanish tax law</li>
                                <li><strong>Marketing consent records:</strong> until consent is withdrawn</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">6. Your Rights (GDPR Articles 15–22)</h3>
                            <p className="mb-2">You have the right to:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Access</strong> your personal data (Art. 15)</li>
                                <li><strong>Rectify</strong> inaccurate data (Art. 16)</li>
                                <li><strong>Erase</strong> your data ("right to be forgotten") (Art. 17)</li>
                                <li><strong>Restrict</strong> processing (Art. 18)</li>
                                <li><strong>Data portability</strong> — receive your data in machine-readable format (Art. 20)</li>
                                <li><strong>Object</strong> to processing (Art. 21)</li>
                                <li><strong>Withdraw consent</strong> at any time without affecting prior processing (Art. 7(3))</li>
                            </ul>
                            <p className="mt-2">To exercise any of these rights, contact us at <strong>privacy@costaspine.com</strong>. We will respond within 30 days.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">7. Data Security</h3>
                            <p>We implement appropriate technical and organizational measures including: encrypted data storage, role-based access controls, audit logging of all data access, and regular security reviews. Health data is encrypted at rest and in transit.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">8. Supervisory Authority</h3>
                            <p>You have the right to lodge a complaint with the Spanish Data Protection Agency (AEPD) at <strong>www.aepd.es</strong> if you believe your data rights have been violated.</p>
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <hr className="border-gray-200 mb-12" />

                {/* Spanish Version */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Política de Privacidad</h2>
                    <p className="text-xs text-gray-400 mb-6">Última actualización: marzo 2026 | Versión 1.0</p>

                    <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">1. Responsable del Tratamiento</h3>
                            <p>CostaSpine S.L., con domicilio en Urb. Elviria, Marbella, 29604 Málaga, España, es el responsable del tratamiento de sus datos personales conforme al Reglamento General de Protección de Datos (UE) 2016/679 ("RGPD") y la Ley Orgánica 3/2018 de Protección de Datos Personales ("LOPDGDD").</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">2. Datos que Recopilamos</h3>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Datos de identidad:</strong> nombre, apellidos, fecha de nacimiento</li>
                                <li><strong>Datos de contacto:</strong> teléfono, correo electrónico</li>
                                <li><strong>Datos de salud (categoría especial):</strong> diagnóstico, planes de tratamiento, notas clínicas</li>
                                <li><strong>Datos de comunicación:</strong> grabaciones de llamadas, transcripciones (con su consentimiento)</li>
                                <li><strong>Datos financieros:</strong> registros de pago (los datos de tarjeta son procesados por Stripe)</li>
                                <li><strong>Datos técnicos:</strong> dirección IP al firmar formularios digitales</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">3. Base Legal del Tratamiento</h3>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Ejecución del contrato</strong> (Art. 6(1)(b)): para prestar servicios sanitarios</li>
                                <li><strong>Consentimiento explícito</strong> (Art. 9(2)(a)): para el tratamiento de datos de salud</li>
                                <li><strong>Obligación legal</strong> (Art. 6(1)(c)): conservación de historiales durante 5 años (Ley 41/2002)</li>
                                <li><strong>Interés legítimo</strong> (Art. 6(1)(f)): recordatorios de citas</li>
                                <li><strong>Consentimiento</strong> (Art. 6(1)(a)): comunicaciones de marketing (opcional)</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">4. Cesión de Datos y Encargados del Tratamiento</h3>
                            <p className="mb-2">Compartimos sus datos únicamente con los siguientes encargados, todos bajo Acuerdos de Tratamiento de Datos:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Supabase (región UE):</strong> alojamiento de base de datos</li>
                                <li><strong>Stripe:</strong> procesamiento de pagos</li>
                                <li><strong>Twilio:</strong> recordatorios por WhatsApp</li>
                                <li><strong>VAPI:</strong> reserva telefónica asistida por IA</li>
                            </ul>
                            <p className="mt-2">No vendemos sus datos a terceros.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">5. Conservación de Datos</h3>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Historiales médicos:</strong> mínimo 5 años (Ley 41/2002)</li>
                                <li><strong>Grabaciones de llamadas:</strong> 90 días, luego eliminación automática</li>
                                <li><strong>Registros de pago:</strong> según legislación fiscal española</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">6. Sus Derechos (Artículos 15–22 del RGPD)</h3>
                            <p className="mb-2">Usted tiene derecho a:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li><strong>Acceder</strong> a sus datos personales</li>
                                <li><strong>Rectificar</strong> datos inexactos</li>
                                <li><strong>Suprimir</strong> sus datos ("derecho al olvido")</li>
                                <li><strong>Limitar</strong> el tratamiento</li>
                                <li><strong>Portabilidad</strong> de datos en formato legible por máquina</li>
                                <li><strong>Oponerse</strong> al tratamiento</li>
                                <li><strong>Retirar el consentimiento</strong> en cualquier momento</li>
                            </ul>
                            <p className="mt-2">Para ejercer sus derechos, contacte con <strong>privacy@costaspine.com</strong>. Responderemos en un plazo de 30 días.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">7. Seguridad de los Datos</h3>
                            <p>Implementamos medidas técnicas y organizativas apropiadas: almacenamiento cifrado, controles de acceso basados en roles, registro de auditoría de todos los accesos, y revisiones periódicas de seguridad.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">8. Autoridad de Control</h3>
                            <p>Tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en <strong>www.aepd.es</strong>.</p>
                        </div>
                    </div>
                </section>

                <div className="mt-12 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-400 text-center">
                        CostaSpine S.L. · Urb. Elviria, Marbella, 29604 Málaga · privacy@costaspine.com
                    </p>
                </div>
            </div>
        </div>
    );
}
