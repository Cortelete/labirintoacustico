
import React, { useState, useRef, useEffect } from 'react';
import ShoppingCartIcon from '../icons/ShoppingCartIcon';
import CloseIcon from '../icons/CloseIcon';
import WhatsappIcon from '../icons/WhatsappIcon';

// --- Types ---
interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    images: string[];
    sizes: string[];
}

interface CartItem {
    productId: string;
    name: string;
    size: string;
    quantity: number;
    price: number;
    image: string;
}

// --- Data ---
const PRODUCTS: Product[] = [
    {
        id: 'fan',
        name: 'Camiseta Fã Intergalático',
        price: 120.00,
        description: 'Mostre que você faz parte da tripulação! Design exclusivo com o logo clássico do Labirinto Acústico em neon sobre fundo preto profundo. Algodão 100% confortável para viagens longas pelo espaço.',
        images: [
            'https://placehold.co/400x500/1e1b4b/FFF?text=Fã+Intergalático+Frontal',
            'https://placehold.co/400x500/1e1b4b/FFF?text=Fã+Intergalático+Costas',
            'https://placehold.co/400x500/1e1b4b/FFF?text=Detalhe+Logo'
        ],
        sizes: ['P', 'M', 'G', 'GG', 'XG']
    },
    {
        id: 'acoustic',
        name: 'Camiseta Labirinto Acústico',
        price: 120.00,
        description: 'A essência do programa estampada no peito. Tipografia marcante e ondas sonoras que vibram na frequência do rock. Ideal para curtir o programa ao vivo.',
        images: [
            'https://placehold.co/400x500/312e81/FFF?text=Labirinto+Acústico+Frontal',
            'https://placehold.co/400x500/312e81/FFF?text=Labirinto+Acústico+Zoom',
            'https://placehold.co/400x500/312e81/FFF?text=Detalhe+Tecido'
        ],
        sizes: ['P', 'M', 'G', 'GG', 'XG']
    },
    {
        id: 'jack',
        name: 'Camiseta Jack Planet',
        price: 120.00,
        description: 'Edição Especial Limitada! Uma homenagem ao nosso mascote cósmico Jack. Estampa full-print com arte psicodélica e cores vibrantes que brilham na luz negra.',
        images: [
            'https://placehold.co/400x500/4c1d95/FFF?text=Jack+Planet+Art',
            'https://placehold.co/400x500/4c1d95/FFF?text=Jack+Planet+Costas',
            'https://placehold.co/400x500/4c1d95/FFF?text=Jack+Planet+Lateral'
        ],
        sizes: ['P', 'M', 'G', 'GG', 'XG']
    }
];

// --- Components ---

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!isZoomed) {
            if (touchStartX.current - touchEndX.current > 50) {
                // Swipe Left
                nextSlide();
            }
            if (touchStartX.current - touchEndX.current < -50) {
                // Swipe Right
                prevSlide();
            }
        }
    };

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="relative w-full aspect-[4/5] bg-slate-800 rounded-xl overflow-hidden group">
            <div 
                className={`w-full h-full transition-transform duration-500 ease-in-out flex ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {images.map((img, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0 relative overflow-hidden">
                        <img 
                            src={img} 
                            alt={`View ${idx}`} 
                            className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed && currentIndex === idx ? 'scale-150' : 'scale-100'}`}
                            onClick={() => setIsZoomed(!isZoomed)}
                        />
                    </div>
                ))}
            </div>
            
            {/* Navigation Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-green-400' : 'bg-white/30'}`}
                    />
                ))}
            </div>

            {/* Arrows */}
            {!isZoomed && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        ❮
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        ❯
                    </button>
                </>
            )}
            
            <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white pointer-events-none">
                {isZoomed ? 'Toque para reduzir' : 'Toque para ampliar'}
            </div>
        </div>
    );
};

// --- Main Store Component ---

const IntergalacticStore: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [view, setView] = useState<'list' | 'details' | 'cart'>('list');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    
    // Details State
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [quantity, setQuantity] = useState(1);

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerAge, setCustomerAge] = useState('');

    const addToCart = () => {
        if (!selectedProduct || !selectedSize) return;

        const newItem: CartItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            size: selectedSize,
            quantity: quantity,
            price: selectedProduct.price,
            image: selectedProduct.images[0]
        };

        setCart([...cart, newItem]);
        setSelectedSize('');
        setQuantity(1);
        setView('cart'); // Go to cart or back to list? Let's go to cart to confirm.
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        
        const itemsList = cart.map(item => `• ${item.quantity}x ${item.name} (Tam: ${item.size}) - R$ ${(item.price * item.quantity).toFixed(2)}`).join('\n');
        
        const message = `Olá! Quero finalizar minha encomenda na Loja Intergaláctica 🚀\n\n*Meus Dados:*\nNome: ${customerName}\nIdade: ${customerAge}\n\n*Pedido:*\n${itemsList}\n\n*Total Estimado: R$ ${cartTotal.toFixed(2)}*\n\nAguardo a chave PIX para confirmar a encomenda!`;
        
        const whatsappUrl = `https://wa.me/5541988710303?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    // --- Views ---

    if (view === 'list') {
        return (
            <div className="flex flex-col h-full max-h-[75vh]">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900/95 z-10 py-2">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
                        Loja Intergaláctica
                    </h3>
                    <div className="flex gap-3">
                         <button 
                            className="relative p-2 text-slate-300 hover:text-white transition-colors"
                            onClick={() => setView('cart')}
                        >
                            <ShoppingCartIcon />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                
                <div className="overflow-y-auto pb-4 space-y-4">
                    <p className="text-sm text-slate-400 text-center mb-2">
                        Encomendas sob medida. Entrega em ~30 dias terrestres.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PRODUCTS.map(product => (
                            <div 
                                key={product.id} 
                                className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex flex-col gap-3 hover:border-purple-500/50 transition-colors cursor-pointer group"
                                onClick={() => {
                                    setSelectedProduct(product);
                                    setSelectedSize('');
                                    setQuantity(1);
                                    setView('details');
                                }}
                            >
                                <div className="aspect-[4/5] w-full overflow-hidden rounded-lg relative">
                                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white leading-tight">{product.name}</h4>
                                    <p className="text-green-400 font-bold mt-1">R$ {product.price.toFixed(2)}</p>
                                </div>
                                <button className="mt-auto w-full bg-slate-700 hover:bg-purple-600 text-white text-sm font-bold py-2 rounded-lg transition-colors">
                                    Ver Detalhes
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'details' && selectedProduct) {
        return (
            <div className="flex flex-col h-full max-h-[80vh]">
                <div className="flex items-center mb-4 sticky top-0 bg-slate-900/95 z-10 py-2">
                    <button onClick={() => setView('list')} className="text-slate-400 hover:text-white mr-4">
                        ❮ Voltar
                    </button>
                    <h3 className="text-lg font-bold text-white truncate">
                        {selectedProduct.name}
                    </h3>
                </div>

                <div className="overflow-y-auto pr-2">
                    <ImageCarousel images={selectedProduct.images} />
                    
                    <div className="mt-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                            <span className="text-xl font-bold text-green-400 whitespace-nowrap">R$ {selectedProduct.price.toFixed(2)}</span>
                        </div>
                        
                        <p className="text-slate-300 text-sm leading-relaxed">
                            {selectedProduct.description}
                        </p>

                        <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
                            <p className="text-xs text-purple-300 font-semibold mb-1">ℹ️ Informação de Encomenda</p>
                            <p className="text-xs text-slate-400">
                                Este item é produzido sob demanda nas forjas estelares. O prazo estimado de entrega é de 30 dias após a confirmação do pagamento.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Tamanho</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedProduct.sizes.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                                            selectedSize === size 
                                            ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] scale-110' 
                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Quantidade</label>
                            <div className="flex items-center gap-4 bg-slate-800 w-max px-3 py-1 rounded-lg border border-slate-700">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-xl text-slate-400 hover:text-white">-</button>
                                <span className="text-white font-bold w-4 text-center">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="text-xl text-slate-400 hover:text-white">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 bg-slate-900 sticky bottom-0">
                    <button
                        onClick={addToCart}
                        disabled={!selectedSize}
                        className={`w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                            selectedSize 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <ShoppingCartIcon />
                        {selectedSize ? 'Adicionar ao Carrinho' : 'Selecione um Tamanho'}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'cart') {
        return (
            <div className="flex flex-col h-full max-h-[80vh]">
                <div className="flex items-center mb-4 sticky top-0 bg-slate-900/95 z-10 py-2 border-b border-slate-700/50">
                    <button onClick={() => setView('list')} className="text-slate-400 hover:text-white mr-4">
                        ❮ Continuar Comprando
                    </button>
                    <h3 className="text-lg font-bold text-white">Seu Carrinho</h3>
                </div>

                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <ShoppingCartIcon className="w-16 h-16 mb-4 opacity-30" />
                        <p>Seu carrinho está vazio no vácuo do espaço.</p>
                        <button onClick={() => setView('list')} className="mt-4 text-purple-400 hover:text-purple-300 underline">
                            Ver camisetas
                        </button>
                    </div>
                ) : (
                    <div className="overflow-y-auto pr-2 space-y-6">
                        <div className="space-y-3">
                            {cart.map((item, index) => (
                                <div key={index} className="flex gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded-md" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                                        <p className="text-xs text-slate-400">Tamanho: <span className="text-white">{item.size}</span> | Qtd: <span className="text-white">{item.quantity}</span></p>
                                        <p className="text-sm font-bold text-green-400 mt-1">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(index)} className="text-slate-500 hover:text-red-400 self-start">
                                        <CloseIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-600">
                            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                🚀 Dados para Decolagem
                            </h4>
                            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Seu Nome</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none"
                                        placeholder="Ex: Viajante Estelar"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Sua Idade</label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={customerAge}
                                        onChange={e => setCustomerAge(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none"
                                        placeholder="Ex: 25"
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30 text-xs text-yellow-200">
                            <p>💰 O pagamento será realizado via <strong>PIX</strong> após a confirmação do pedido no WhatsApp.</p>
                        </div>
                    </div>
                )}

                {cart.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700 bg-slate-900 sticky bottom-0">
                        <div className="flex justify-between items-center mb-3 text-lg font-bold">
                            <span>Total Estimado</span>
                            <span className="text-green-400">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                            form="checkout-form"
                            type="submit"
                            className="w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all animate-pulse-slow"
                        >
                            <WhatsappIcon /> Finalizar no WhatsApp
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default IntergalacticStore;
