
import React from 'react';

interface GuideBubbleProps {
    onClose: () => void;
}

const GuideBubble: React.FC<GuideBubbleProps> = ({ onClose }) => {
    return (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-[60] max-w-[280px] sm:max-w-xs animate-fade-in-down">
            {/* Arrow pointing roughly up/right */}
            <div className="absolute -top-2 right-4 w-4 h-4 bg-slate-900 border-t border-l border-green-500/50 transform rotate-45"></div>

            <div className="bg-slate-900 border border-green-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(74,222,128,0.2)] text-left relative overflow-hidden">
                
                {/* Decorative background element - moved to left for balance */}
                <div className="absolute -left-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl pointer-events-none"></div>

                <p className="text-slate-200 text-sm mb-2 leading-relaxed relative z-10">
                    <span className="font-bold text-green-400 text-base">Chegou aqui pelo Instagram?</span>
                </p>
                <p className="text-slate-300 text-xs mb-3 leading-relaxed relative z-10">
                    Então clique nesses <strong>três pontinhos acima</strong> e selecione <span className="text-white font-semibold">"Abrir no navegador externo"</span>.
                </p>
                <p className="text-slate-400 text-[11px] mb-4 leading-relaxed relative z-10 border-l-2 border-purple-500 pl-2">
                    Isso garante uma melhor experiência, onde a rádio não é pausada ao ser minimizada, e você pode utilizar seu celular enquanto escuta a gente!
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
                >
                    Entendi, obrigado!
                </button>
            </div>
            <style>{`
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default GuideBubble;