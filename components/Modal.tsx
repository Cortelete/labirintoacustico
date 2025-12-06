
import React, { Fragment } from 'react';
import CloseIcon from './icons/CloseIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'spin'; // Nova propriedade para controlar a animação
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, variant = 'default' }) => {
  if (!isOpen) return null;

  const animationClass = variant === 'spin' ? 'animate-spin-entry' : 'animate-scale-in';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className={`relative bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-md m-auto p-6 md:p-8 text-white transition-transform duration-300 max-h-[85vh] overflow-y-auto ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        {title && (
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
                {title}
            </h2>
        )}
        {children}
      </div>
      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Nova animação elegante para o giro */
        @keyframes spin-entry {
          0% { 
            opacity: 0; 
            transform: perspective(1000px) scale(0.1) rotateY(180deg); 
          }
          100% { 
            opacity: 1; 
            transform: perspective(1000px) scale(1) rotateY(0deg); 
          }
        }
        .animate-spin-entry {
          /* Duração mais longa e curva suave para elegância */
          animation: spin-entry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: center center;
        }
      `}</style>
    </div>
  );
};

export default Modal;