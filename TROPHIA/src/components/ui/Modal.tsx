import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* En celular ocupa toda la altura para adaptarse perfecto al teclado; en PC es una tarjeta centrada */}
      <div className={`relative w-full ${sizeMap[size]} h-full sm:h-auto sm:max-h-[85vh] flex flex-col rounded-none sm:rounded-2xl bg-white dark:bg-gray-900 border-0 sm:border border-gray-200 dark:border-gray-800 shadow-2xl animate-slide-up sm:animate-fade-in overflow-hidden`}>
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shrink-0">
          <h2 className="font-condensed text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo con scroll interno fluido */}
        <div className="p-5 overflow-y-auto flex-1 scrollbar-thin">
          {children}
        </div>

        {/* Footer con los botones siempre accesibles */}
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md flex gap-3 justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
