import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle2, Clock, FileWarning } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Patient } from '@/types';
import { jsPDF } from 'jspdf';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function DocumentsTab({ patient }: { patient: Patient }) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);

    useEffect(() => {
        const fetchDocs = async () => {
            setIsLoadingDocs(true);
            const { data, error } = await supabase!
                .from('patient_documents')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setDocuments(data);
            }
            setIsLoadingDocs(false);
        };
        fetchDocs();
    }, [patient.id]);

    const [isGeneratingLegacy, setIsGeneratingLegacy] = useState(false);

    const handleDownloadStoredPdf = async (path: string) => {
        if (path.startsWith('http')) {
            window.open(path, '_blank');
            return;
        }
        
        const { data, error } = await supabase!.storage.from('patient_documents').createSignedUrl(path, 60);
        if (error || !data) {
            console.error("Error generating signed URL:", error);
            alert("Failed to access secure document. Please try again.");
            return;
        }
        window.open(data.signedUrl, '_blank');
    };

    const handleGenerateLegacyRecord = async () => {
        setIsGeneratingLegacy(true);
        try {
            const doc = new jsPDF();
            let currentY = 20;
            const marginX = 15;

            // Header
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('MASTER PATIENT RECORD', marginX, 20);

            // Metadata box
            currentY = 40;
            doc.setTextColor(30, 41, 59);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(marginX, currentY, 170, 35, 2, 2, 'FD');

            currentY += 8;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Full Name:', marginX + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${patient.first_name} ${patient.last_name}`, marginX + 35, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Patient ID:', 110, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${patient.id.substring(0,20)}...`, 135, currentY);

            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Email:', marginX + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${patient.email || 'N/A'}`, marginX + 35, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Phone:', 110, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${patient.phone || 'N/A'}`, 135, currentY);

            currentY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Language:', marginX + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${(patient.language || 'en').toUpperCase()}`, marginX + 35, currentY);
            
            // ---- LEGAL SECTION ----
            currentY += 25;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('II. LEGAL CONSENT & DECLARATIONS', marginX, currentY);
            currentY += 5;

            const addConsentBlock = (title: string, lawRef: string, statusText: string, dateText: string, yPos: number) => {
                doc.setDrawColor(226, 232, 240);
                doc.rect(marginX, yPos, 170, 22);
                doc.setFillColor(241, 245, 249);
                doc.rect(marginX, yPos, 170, 8, 'F');
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(title, marginX + 3, yPos + 6);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                // Right edge is marginX + 170 = 185. Padding 3 = 182.
                doc.text(lawRef, marginX + 167, yPos + 6, { align: 'right' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Status:', marginX + 3, yPos + 16);
                
                if (statusText.includes('SIGNED') || statusText.includes('AGREED')) {
                    doc.setTextColor(22, 163, 74);
                } else {
                    doc.setTextColor(220, 38, 38);
                }
                doc.text(statusText, marginX + 18, yPos + 16);
                doc.setTextColor(30, 41, 59);

                doc.setFont('helvetica', 'normal');
                doc.text(`Recorded: ${dateText}`, marginX + 167, yPos + 16, { align: 'right' });
            };

            const medicalStatus = patient.medical_data_consent ? 'SIGNED (INTAKE)' : 'NOT SIGNED';
            const medicalDate = patient.medical_consent_date ? format(new Date(patient.medical_consent_date), 'dd/MM/yyyy HH:mm') : 'N/A';
            addConsentBlock('Medical Information & Clinical Treatment', 'Ley 41/2002', medicalStatus, medicalDate, currentY);
            
            currentY += 28;
            const dataStatus = patient.data_processing_consent ? 'SIGNED (DIGITAL)' : 'NOT SIGNED';
            const dataDate = patient.data_processing_consent_date ? format(new Date(patient.data_processing_consent_date), 'dd/MM/yyyy HH:mm') : 'N/A';
            addConsentBlock('Personal Data Processing & Storage', 'RGPD / LOPDGDD', dataStatus, dataDate, currentY);

            currentY += 28;
            const marketingStatus = patient.marketing_consent ? 'AGREED' : 'DECLINED';
            addConsentBlock('Commercial & Marketing Communications', 'LSSI-CE', marketingStatus, dataDate, currentY);

            // ---- AUDIT TRAIL ----
            currentY += 40;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('III. DIGITAL AUDIT TRAIL', marginX, currentY);
            currentY += 5;

            doc.setDrawColor(226, 232, 240);
            doc.line(marginX, currentY, 190, currentY);
            currentY += 8;

            const tStamp = new Date();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`This document serves as an immutable PDF extract from the CostaSpine DB.`, marginX, currentY);
            currentY += 5;
            doc.text(`Verification ID: ${patient.id}`, marginX, currentY);
            currentY += 5;
            doc.text(`System Timestamp: ${format(tStamp, "yyyy-MM-dd'T'HH:mm:ssXXX")}`, marginX, currentY);
            currentY += 5;
            doc.text(`Authorized IP / Scope: INTERNAL_CLINIC_SYSTEM (Legacy Generation)`, marginX, currentY);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`CostaSpine Clinics • Urb. Elviria, Marbella 29604, Spain • +34 952 123 456`, 105, 285, { align: 'center' });
            
            // Upload to Supabase Storage
            const pdfBlob = doc.output('blob');
            const fileName = `${patient.id}/legacy_consent_${tStamp.getTime()}.pdf`;
            
            const { data: uploadData, error: uploadError } = await supabase!.storage
                .from('patient_documents')
                .upload(fileName, pdfBlob, {
                    contentType: 'application/pdf',
                    cacheControl: '31536000',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            if (uploadData) {
                const filePath = uploadData.path;
                
                const { data: newDoc, error: insertError } = await supabase!.from('patient_documents').insert({
                    patient_id: patient.id,
                    type: 'consent',
                    signed_at: tStamp.toISOString(),
                    pdf_url: filePath,
                    data: { generation: 'legacy_recovery', signed_name: `${patient.first_name} ${patient.last_name}` }
                }).select().single();

                if (insertError) throw insertError;
                
                if (newDoc) {
                    setDocuments(prev => [newDoc, ...prev]);
                }
            }
        } catch (error) {
            console.error("Failed to generate legacy record", error);
            alert("Failed to generate and save record. Please try again.");
        } finally {
            setIsGeneratingLegacy(false);
        }
    };

    const isSigned = patient.data_processing_consent || patient.medical_data_consent;
    const latestConsentDoc = documents.find(d => d.type === 'consent');

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[14px] font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> 
                        Legal Documents & Consents
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-1">
                        RGPD compliance records and patient agreements
                    </p>
                </div>
                
                {latestConsentDoc ? (
                    <Button 
                        size="sm" 
                        variant="default"
                        className="h-8 text-[12px]" 
                        onClick={() => handleDownloadStoredPdf(latestConsentDoc.pdf_url)}
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download Immutable Record (PDF)
                    </Button>
                ) : isSigned ? (
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 text-[12px] border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40" 
                        onClick={handleGenerateLegacyRecord}
                        disabled={isGeneratingLegacy}
                    >
                        {isGeneratingLegacy ? (
                            <>
                                <div className="h-3.5 w-3.5 mr-1.5 animate-spin rounded-full border-2 border-amber-800 border-t-transparent dark:border-amber-400"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileWarning className="h-3.5 w-3.5 mr-1.5" />
                                Generate Legacy Record
                            </>
                        )}
                    </Button>
                ) : null}
            </div>

            {/* If signed but no URL exists, warn the user */}
            {isSigned && !latestConsentDoc && !isLoadingDocs && (
                <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-lg flex items-start gap-3 mb-6">
                    <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-[13px] font-medium text-amber-900 dark:text-amber-400">Legacy Consent Record</h4>
                        <p className="text-[12px] text-amber-800/80 dark:text-amber-500/80 mt-1 max-w-[90%]">
                            This patient signed their forms before the immutable PDF storage system was implemented. You can generate a fallback PDF report based on their recorded consent timestamps.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Data Processing Document Card */}
                <Card className="shadow-none border-border">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-medium flex items-center gap-2">
                                Data Processing Agreement (RGPD)
                                {patient.data_processing_consent ? (
                                    <Badge variant="success" className="text-[10px] uppercase font-semibold h-5">Signed</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold h-5 bg-muted/80 text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                                )}
                            </h4>
                            <p className="text-[11px] text-muted-foreground w-3/4">
                                Consent for the clinic to store and process standard personal data for administrative and scheduling purposes as required by LOPDGDD.
                            </p>
                        </div>
                        <div className="text-right">
                            {patient.data_processing_consent_date ? (
                                <div className="text-[11px] text-muted-foreground flex flex-col items-end">
                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Authorized on:</span>
                                    <span className="font-medium text-foreground">{format(new Date(patient.data_processing_consent_date), 'MMM d, yyyy HH:mm')}</span>
                                    {patient.privacy_policy_version && <span className="opacity-50 mt-0.5">Policy v{patient.privacy_policy_version}</span>}
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground">No signature recorded</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Medical Consent Card */}
                <Card className="shadow-none border-border">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-medium flex items-center gap-2">
                                Medical Storage Consent
                                {patient.medical_data_consent ? (
                                    <Badge variant="success" className="text-[10px] uppercase font-semibold h-5">Signed</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold h-5 bg-muted/80 text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                                )}
                            </h4>
                            <p className="text-[11px] text-muted-foreground w-3/4">
                                Explicit consent for the clinic to digitize, store, and process sensitive health information and clinical SOAP records (Ley 41/2002).
                            </p>
                        </div>
                        <div className="text-right">
                            {patient.medical_consent_date ? (
                                <div className="text-[11px] text-muted-foreground flex flex-col items-end">
                                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Authorized on:</span>
                                    <span className="font-medium text-foreground">{format(new Date(patient.medical_consent_date), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground">No signature recorded</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
