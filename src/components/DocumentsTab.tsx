import { useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import type { Patient } from '@/types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function DocumentsTab({ patient }: { patient: Patient }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateGdprPdf = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF();
            const marginX = 20;
            let currentY = 20;

            // ---- HEADER BOX ----
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text('COSTASPINE', marginX, 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text('PATIENT MASTER CONSENT RECORD', marginX, 30);

            // Document Meta (Right aligned in header)
            doc.setFontSize(10);
            doc.text(`Ref: CS-${patient.id.substring(0,8).toUpperCase()}`, 190, 22, { align: 'right' });
            doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 190, 30, { align: 'right' });

            // Reset text color for body
            doc.setTextColor(30, 41, 59);
            currentY = 55;

            // ---- PATIENT SECTION ----
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('I. PATIENT IDENTIFICATION', marginX, currentY);
            currentY += 5;
            
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setFillColor(248, 250, 252); // slate-50
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

            // Block function
            const addConsentBlock = (title: string, lawRef: string, statusText: string, dateText: string, yPos: number) => {
                doc.setDrawColor(226, 232, 240);
                doc.rect(marginX, yPos, 170, 22);
                doc.setFillColor(241, 245, 249);
                doc.rect(marginX, yPos, 170, 8, 'F'); // header background
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(title, marginX + 3, yPos + 6);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.text(lawRef, 190 - 3, yPos + 6, { align: 'right' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Status:', marginX + 3, yPos + 16);
                
                if (statusText.includes('SIGNED') || statusText.includes('AGREED')) {
                    doc.setTextColor(22, 163, 74); // green-600
                } else {
                    doc.setTextColor(220, 38, 38); // red-600
                }
                doc.text(statusText, marginX + 18, yPos + 16);
                doc.setTextColor(30, 41, 59);

                doc.setFont('helvetica', 'normal');
                doc.text(`Recorded: ${dateText}`, 190 - 3, yPos + 16, { align: 'right' });
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

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`This document serves as an immutable PDF extract from the CostaSpine DB.`, marginX, currentY);
            currentY += 5;
            doc.text(`Verification ID: ${patient.id}`, marginX, currentY);
            currentY += 5;
            doc.text(`System Timestamp: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX")}`, marginX, currentY);
            currentY += 5;
            doc.text(`Authorized IP / Scope: INTERNAL_CLINIC_SYSTEM`, marginX, currentY);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`CostaSpine Clinics • Urb. Elviria, Marbella 29604, Spain • +34 952 123 456`, 105, 285, { align: 'center' });
            
            // Save
            doc.save(`CostaSpine_Consent_${patient.first_name}_${patient.last_name}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setTimeout(() => setIsGenerating(false), 500); // small delay for UX
        }
    };

    const isSigned = patient.data_processing_consent || patient.medical_data_consent;

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
                
                {isSigned && (
                    <Button 
                        size="sm" 
                        className="h-8 text-[12px]" 
                        onClick={generateGdprPdf}
                        disabled={isGenerating}
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {isGenerating ? 'Generating...' : 'Master Consent Record (PDF)'}
                    </Button>
                )}
            </div>

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
