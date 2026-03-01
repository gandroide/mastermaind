'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { DropzoneContext } from '@/services/contract-dropzone';
import { uploadContractAction } from '@/app/portal/contracts/upload/actions';

interface DropzoneFormProps {
  context: DropzoneContext;
}

export default function DropzoneForm({ context }: DropzoneFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setStatus('idle');
    setErrorMessage('');
    
    if (selectedFile.type !== 'application/pdf') {
      setStatus('error');
      setErrorMessage('Por favor, selecciona únicamente un archivo PDF.');
      return;
    }
    
    // Auto-fill title if empty
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
    
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setStatus('error');
      setErrorMessage('Por favor, selecciona un archivo PDF para subir.');
      return;
    }
    
    if (!title.trim() || !companyName.trim()) {
      setStatus('error');
      setErrorMessage('Por favor, completa todos los campos requeridos.');
      return;
    }
    
    try {
      setStatus('uploading');
      
      const formData = new FormData();
      formData.append('file', file);
      
      await uploadContractAction(context.share_token, title, companyName, formData);
      
      setStatus('success');
    } catch (err: any) {
      console.error('Upload Error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Se produjo un error al subir el contrato. Intenta nuevamente.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Contrato enviado al MasterMind</h2>
        <p className="text-zinc-400">
          El contrato ha sido recibido exitosamente por la unidad {context.business_unit_name}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Información del Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Nombre del Documento
          </label>
          <input
            type="text"
            placeholder="Ej. Contrato de Servicios 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={status === 'uploading'}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm backdrop-blur-md"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Empresa / Socio
          </label>
          <input
            type="text"
            placeholder="Tu nombre o el de tu empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={status === 'uploading'}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm backdrop-blur-md"
            required
          />
        </div>
      </div>

      {/* Área de Dropzone */}
      <div
        className={`
          relative group cursor-pointer overflow-hidden
          border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300
          ${isDragging 
            ? 'border-violet-500 bg-violet-500/10' 
            : file 
              ? 'border-green-500/50 bg-green-500/5' 
              : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/40'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="application/pdf"
          className="hidden"
          disabled={status === 'uploading'}
        />

        {file ? (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center text-green-400">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white font-medium text-lg">{file.name}</p>
              <p className="text-zinc-400 text-sm mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Listo para enviar
              </p>
            </div>
            {status !== 'uploading' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-full text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Cambiar Archivo
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300
              ${isDragging ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25' : 'bg-white/5 text-zinc-400 group-hover:text-violet-400'}
            `}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white font-medium text-lg mb-1">
                Arrastra tu contrato aquí
              </p>
              <p className="text-zinc-400 text-sm">
                o haz clic para explorar. Sólo formato PDF.
              </p>
            </div>
          </div>
        )}

        {/* Carga simulada/bg animado al arrastrar */}
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 pointer-events-none" />
        )}
      </div>

      {/* Zona de Errores */}
      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{errorMessage}</p>
        </div>
      )}

      {/* Submit */}
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          className="
            relative overflow-hidden group px-8 py-3 rounded-full font-medium text-white shadow-xl 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
          "
        >
          {/* Default state bg */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-90 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative flex items-center gap-2">
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                Enviar Contrato
                <UploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </div>
        </button>
      </div>

      {status === 'uploading' && (
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-pulse flex-1 w-full" style={{ animationDuration: '2s' }} />
        </div>
      )}

    </form>
  );
}
