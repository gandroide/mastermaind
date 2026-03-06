'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FileLock2, Loader2 } from 'lucide-react';
import DropzoneForm from '@/components/contracts/DropzoneForm';

export default function DropzonePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [validData, setValidData] = useState<any>(null);
  
  // Variables de estado para el Debugging Visual
  const [debugToken, setDebugToken] = useState<string>("");
  const [debugError, setDebugError] = useState<string>("");

  useEffect(() => {
    async function validateLink() {
      const tokenValue = (params?.token || params?.id) as string;
      setDebugToken(tokenValue || "UNDEFINED/NULL");

      if (!tokenValue) {
        setDebugError("No se encontró parámetro en la URL.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('contract_dropzone_links')
        .select('*')
        .eq('share_token', tokenValue)
        .eq('is_active', true)
        .single();

      if (error) {
        setDebugError(error.message || JSON.stringify(error));
      } else if (!data) {
        setDebugError("Supabase respondió sin error, pero con data vacía (Data = null).");
      } else {
        setValidData(data);
      }
      
      setLoading(false);
    }

    validateLink();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  // PANTALLA DE DEBUGGING VISUAL EN LUGAR DE ACCESO DENEGADO
  if (!validData) return (
    <div className="p-10 bg-red-50 text-red-900 border-2 border-red-500 m-10 rounded-xl font-mono">
      <h2 className="text-2xl font-bold mb-4">🚨 ALERTA DE DEBUGGING DEL CTO 🚨</h2>
      <p><strong>Token Extraído de la URL:</strong> {debugToken}</p>
      <p><strong>Error de la Base de Datos:</strong> {debugError}</p>
      <p className="mt-4 text-sm">Pásale esta captura de pantalla exacta al CTO.</p>
    </div>
  );

  return (
    // 1. Scroll habilitado estricto para PWA (h-dvh + overflow-hidden en el padre)
    <div className="flex h-dvh w-full flex-col bg-surface-0 overflow-hidden text-text-primary selection:bg-accent-bioalert/30 font-sans isolate">
      
      {/* 2. Mantén tus decoradores si quieres, pero ajusta las opacidades si el fondo ya no es negro puro */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 relative z-10">
        <div className="container max-w-3xl mx-auto px-2 py-8 md:py-24">
          
          {/* Header */}
          <div className="text-center mb-12 animate-in slide-in-from-bottom-6 fade-in duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm text-violet-300 mb-6">
              <FileLock2 className="w-4 h-4" />
              Portal Seguro
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 mb-4">
              Subir Contrato
            </h1>
            
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Por favor, sube tu documento PDF firmado. Este archivo será enviado de forma segura a la unidad <span className="text-white font-medium">Socio Comercial</span>.
            </p>
          </div>

          {/* Dropzone Card */}
          <div className="glass-card p-6 md:p-10 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-150 fill-mode-both">
            <DropzoneForm context={{
              business_unit_id: validData.business_unit_id,
              business_unit_name: "Socio Comercial",
              share_token: validData.share_token,
            }} />
          </div>

          {/* Footer info */}
          <div className="mt-12 text-center text-zinc-600 text-sm animate-in fade-in duration-1000 delay-300 fill-mode-both">
            <p>Brivex Mastermind &copy; {new Date().getFullYear()}</p>
            <p className="mt-1">Sistema Conectado Seguramente con Socio Comercial</p>
          </div>
        </div>
      </main>
    </div>
  );
}
