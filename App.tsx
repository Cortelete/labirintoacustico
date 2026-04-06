
import React, { useState, useEffect, useRef } from 'react';

// Import constants and types
import { 
  SUBTITLES, 
  WHATSAPP_NUMBER, 
  SONG_REQUEST_WHATSAPP_NUMBER,
  INSTAGRAM_URL,
  TWITCH_URL,
  YOUTUBE_URL,
  TIKTOK_URL,
  OFFICIAL_TIKTOK_URL,
  RADIO_URL, 
  RADIO_STREAM_URL, 
  DEVELOPER_WHATSAPP_NUMBER, 
  DEVELOPER_INSTAGRAM_URL,
  SHOP_URL,
  ADVERTISE_URL
} from './constants';
import { ModalType } from './types';

// Import components and icons
import Modal from './components/Modal';
import Stars from './components/Stars';
import GuideBubble from './components/GuideBubble';
import InfoIcon from './components/icons/InfoIcon';
import WhatsappIcon from './components/icons/WhatsappIcon';
import InstagramIcon from './components/icons/InstagramIcon';
import TwitchIcon from './components/icons/TwitchIcon';
import YoutubeIcon from './components/icons/YoutubeIcon';
import TikTokIcon from './components/icons/TikTokIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import RadioIcon from './components/icons/RadioIcon';
import PlayIcon from './components/icons/PlayIcon';
import PauseIcon from './components/icons/PauseIcon';
import LiveIcon from './components/icons/LiveIcon';
import MusicNoteIcon from './components/icons/MusicNoteIcon';
import RocketIcon from './components/icons/RocketIcon';
import MegaphoneIcon from './components/icons/MegaphoneIcon';
import ShoppingCartIcon from './components/icons/ShoppingCartIcon';
import GamesIcon from './components/icons/GamesIcon';
import BombIcon from './components/icons/BombIcon';
import GuitarIcon from './components/icons/GuitarIcon';
import RhythmIcon from './components/icons/RhythmIcon';
import VolumeIcon from './components/icons/VolumeIcon';
import CosmicSnakeGame from './components/games/CosmicSnakeGame';
import BomberAlienGame from './components/games/BomberAlien';
import RockInvadersGame from './components/games/RockInvadersGame';
import CosmicRiffGame from './components/games/CosmicRiffGame';
import IntergalacticStore from './components/shop/IntergalacticStore';


const App: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinVelocity, setSpinVelocity] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeTimerRef = useRef<number | null>(null);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactAge, setContactAge] = useState('');
  const [contactObs, setContactObs] = useState('');
  
  // Song Request Form State
  const [songRequestName, setSongRequestName] = useState('');
  const [songRequestTitle, setSongRequestTitle] = useState('');
  const [songRequestMessage, setSongRequestMessage] = useState('');

  // Advertiser Form State
  const [advertiseName, setAdvertiseName] = useState('');
  const [advertiseCompany, setAdvertiseCompany] = useState('');
  const [hasReadyAd, setHasReadyAd] = useState(false);
  const [adCopy, setAdCopy] = useState('');

  // Dev Contact Form State
  const [devContactName, setDevContactName] = useState('');

  // Game State
  const [snakePlayerName, setSnakePlayerName] = useState('');
  const [bomberAlienPlayerName, setBomberAlienPlayerName] = useState('');
  const [rockInvadersPlayerName, setRockInvadersPlayerName] = useState('');
  const [cosmicRiffPlayerName, setCosmicRiffPlayerName] = useState('');


  // Subtitle cycling effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prevIndex) => (prevIndex + 1) % SUBTITLES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Check for first visit OR mobile to show guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('labirinto_guide_seen');
    const isMobile = window.innerWidth < 768; // Check if device is likely mobile

    if (isMobile || !hasSeenGuide) {
        // Show after a small delay to not overwhelm immediately
        const timer = setTimeout(() => {
            setShowGuide(true);
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseGuide = () => {
      setShowGuide(false);
      localStorage.setItem('labirinto_guide_seen', 'true');
  };

  // Volume slider hide timer
  const startVolumeTimer = () => {
    if (volumeTimerRef.current) {
      window.clearTimeout(volumeTimerRef.current);
    }
    volumeTimerRef.current = window.setTimeout(() => {
      setShowVolumeSlider(false);
    }, 2000);
  };

  const handleVolumeIconClick = () => {
    setShowVolumeSlider(true);
    startVolumeTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    startVolumeTimer();
  };

  useEffect(() => {
    return () => {
      if (volumeTimerRef.current) window.clearTimeout(volumeTimerRef.current);
    };
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (activeModal !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);
  
  // Live Status Check
  useEffect(() => {
    const checkLiveStatus = () => {
      try {
        const timeZone = 'America/Sao_Paulo';
        const now = new Date();
        
        // Using Intl.DateTimeFormat to get the current day and hour in Brazil.
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            weekday: 'short', // Mon, Tue, etc.
            hour: 'numeric',  // 0-23
            hour12: false,
        });

        const parts = formatter.formatToParts(now);
        const dayPart = parts.find(p => p.type === 'weekday');
        const hourPart = parts.find(p => p.type === 'hour');

        if (!dayPart || !hourPart) {
          // Fallback for older browsers
          console.warn('Could not determine time in Brazil, falling back to local time.');
          const localNow = new Date();
          const day = localNow.getDay(); // Sunday: 0, Monday: 1, ... Thursday: 4
          const hour = localNow.getHours();
          const live = (day >= 1 && day <= 4) && hour === 22;
          setIsLive(live);
          return;
        }
        
        const dayOfWeek = dayPart.value; // e.g., "Mon", "Tue"
        const hour = parseInt(hourPart.value, 10);
        
        const liveDays = ['Mon', 'Tue', 'Wed', 'Thu'];
        const isLiveDay = liveDays.includes(dayOfWeek);
        // The program is live from 22:00:00 to 22:59:59 (the 22nd hour).
        const isLiveHour = hour === 22;

        setIsLive(isLiveDay && isLiveHour);

      } catch (error) {
        console.error("Error checking live status with timezone, falling back to local time.", error);
        // Fallback to local time if Intl API fails for any reason
        const localNow = new Date();
        const day = localNow.getDay();
        const hour = localNow.getHours();
        const live = (day >= 1 && day <= 4) && hour === 22;
        setIsLive(live);
      }
    };

    checkLiveStatus(); // Initial check
    const interval = setInterval(checkLiveStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Coin spin physics effect
  useEffect(() => {
    if (spinVelocity === 0) return;
    const friction = 0.98; // a value less than 1 to slow down
    const stopThreshold = 0.1;

    const animateSpin = () => {
        setRotation(prev => prev + spinVelocity);
        setSpinVelocity(prev => {
            const newVelocity = prev * friction;
            if (Math.abs(newVelocity) < stopThreshold) {
                // Snap to a clean final rotation
                 setRotation(r => Math.round(r / 360) * 360);
                 return 0;
            }
            return newVelocity;
        });
    };

    const animationFrame = requestAnimationFrame(animateSpin);
    return () => cancelAnimationFrame(animationFrame);
  }, [spinVelocity, rotation]);
  
  const handleLogoClick = () => {
      const impulse = 20 + Math.random() * 15; // Add a random force
      setSpinVelocity(prev => prev + impulse);
      
      // Open modal during the animation (reduced delay for smoother transition)
      // 300ms allows the spin to start visually but feels like the modal is "thrown" out of the spin
      setTimeout(() => {
          openModal('about');
      }, 300);
  };
  
  const openModal = (type: ModalType) => setActiveModal(type);
  const closeModal = () => {
      setActiveModal(null);
      // Reset sensitive forms on close if needed, but keeping state allows resuming
  };
  
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Meu nome é ${contactName}, tenho ${contactAge} anos.\nObservações: ${contactObs || 'Nenhuma'}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    closeModal();
  };

  const handleSongRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let message = `Pedido de Música!\n\nNome do Ouvinte: ${songRequestName}\nMúsica: ${songRequestTitle}`;
    if (songRequestMessage) {
        message += `\n\nMensagem: ${songRequestMessage}`;
    }
    
    const whatsappUrl = `https://wa.me/${SONG_REQUEST_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    setSongRequestName('');
    setSongRequestTitle('');
    setSongRequestMessage('');

    closeModal();
  };
  
  const handleAdvertiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let message = `Proposta de Anúncio!\n\nNome: ${advertiseName}\nEmpresa: ${advertiseCompany}\n\n`;
    if (hasReadyAd) {
      message += `Já tenho a propaganda pronta.\nTexto: ${adCopy || 'Não informado'}`;
    } else {
      message += `Preciso que a propaganda seja criada.`;
    }
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    closeModal();
  };

  const handleDevContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá, vi o link da Labirinto Acústico e quero um site igual! Meu nome é ${devContactName}.`;
    const whatsappUrl = `https://wa.me/${DEVELOPER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    closeModal();
  };
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const syncLive = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    // Bust cache to ensure we get the live stream
    const streamUrl = `${RADIO_STREAM_URL}?t=${new Date().getTime()}`;
    audioRef.current.src = streamUrl;
    audioRef.current.load();
    audioRef.current.play().catch(e => console.error("Error playing audio after sync:", e));
    setIsPlaying(true);
  };


  const renderModalContent = () => {
    switch (activeModal) {
      case 'artemis':
        return (
          <div className="flex flex-col items-center justify-center w-full space-y-4">
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-orange-500/30 shadow-[0_0_15px_rgba(251,146,60,0.2)]">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/m3kR2KK8TEs?autoplay=1" 
                title="Missão Artemis II (Ao Vivo)" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </div>
            <p className="text-slate-300 text-sm text-center">
              Acompanhe ao vivo a transmissão oficial da NASA sobre a Missão Artemis II, o retorno da humanidade à Lua! 🚀🌕
            </p>
          </div>
        );
      case 'about':
        return (
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-green-400 text-transparent bg-clip-text flex items-center justify-center gap-2">
              <SparklesIcon className="w-7 h-7"/> O Labirinto Acústico
            </h3>
            <p className="text-slate-300 text-sm">👽 O Labirinto Acústico é um programa de rádio criado pra quem vibra na frequência do rock, respira tecnologia e vive intensamente o universo pop e alternativo.</p>
            <p className="text-slate-300 text-sm">Transmitido direto de Ponta Grossa – PR, o programa mistura informação, entretenimento e música em uma experiência sonora que foge do comum. 🎸⚡</p>
            <div className="text-left bg-slate-800/50 p-4 rounded-lg border border-purple-500/30">
              <h4 className="font-semibold text-base text-green-400 mb-2">Aqui, cada episódio é uma viagem:</h4>
              <ul className="list-none space-y-2 text-slate-300 text-sm">
                <li>💡 Notícias de tecnologia e inovações que moldam o futuro.</li>
                <li>🎶 Rock clássico e nacional que marcaram gerações.</li>
                <li>👨‍🎤 Histórias e curiosidades sobre artistas e bandas lendárias.</li>
                <li>🛸 Tudo isso apresentado com a irreverência da nossa saudação cósmica.</li>
              </ul>
            </div>
            <p className="font-bold text-base pt-2">O Labirinto Acústico não é só um programa — é um portal pra quem quer pensar, curtir e sentir o som de um jeito diferente. 🚀</p>
          </div>
        );
      case 'contactOptions':
        return (
            <div className="space-y-4">
                <p className="text-center text-slate-300 mb-4">Como podemos te ajudar hoje?</p>
                <button 
                    onClick={() => openModal('contact')}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-white font-bold py-4 px-6 rounded-xl flex items-center gap-4 group"
                >
                    <div className="bg-green-500/20 p-3 rounded-full group-hover:bg-green-500/30 transition-colors">
                        <WhatsappIcon className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="text-left">
                        <span className="block text-lg">Falar com a Produção</span>
                        <span className="text-xs text-slate-400">Sugestões, recados e contato geral</span>
                    </div>
                </button>

                <button 
                    onClick={() => openModal('advertise')}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-white font-bold py-4 px-6 rounded-xl flex items-center gap-4 group"
                >
                    <div className="bg-purple-500/20 p-3 rounded-full group-hover:bg-purple-500/30 transition-colors">
                        <MegaphoneIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <span className="block text-lg">Quero Anunciar</span>
                        <span className="text-xs text-slate-400">Divulgue sua marca no Labirinto</span>
                    </div>
                </button>
            </div>
        );
      case 'contact':
        return (
            <form onSubmit={handleContactSubmit} className="space-y-4">
                <input type="text" placeholder="Seu nome" value={contactName} onChange={e => setContactName(e.target.value)} required className="input-field" />
                <input type="number" placeholder="Sua idade" value={contactAge} onChange={e => setContactAge(e.target.value)} required className="input-field" />
                <textarea placeholder="Observações (opcional)" value={contactObs} onChange={e => setContactObs(e.target.value)} className="input-field min-h-[80px]"></textarea>
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                    <WhatsappIcon /> Enviar via WhatsApp
                </button>
            </form>
        );
      case 'requestSong':
        return (
            <form onSubmit={handleSongRequestSubmit} className="space-y-4">
                <input type="text" placeholder="Seu nome" value={songRequestName} onChange={e => setSongRequestName(e.target.value)} required className="input-field" />
                <input type="text" placeholder="Nome da música" value={songRequestTitle} onChange={e => setSongRequestTitle(e.target.value)} required className="input-field" />
                
                <textarea 
                    placeholder="Sua mensagem (opcional)" 
                    value={songRequestMessage} 
                    onChange={e => setSongRequestMessage(e.target.value)} 
                    className="input-field min-h-[80px]"
                ></textarea>

                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                    <WhatsappIcon /> Enviar Pedido
                </button>
            </form>
        );
      case 'advertise':
        return (
            <form onSubmit={handleAdvertiseSubmit} className="space-y-4">
                <input type="text" placeholder="Seu nome" value={advertiseName} onChange={e => setAdvertiseName(e.target.value)} required className="input-field" />
                <input type="text" placeholder="Nome da Empresa" value={advertiseCompany} onChange={e => setAdvertiseCompany(e.target.value)} required className="input-field" />
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300 p-2 rounded-md hover:bg-slate-800/50 transition-colors">
                    <input type="checkbox" checked={hasReadyAd} onChange={e => setHasReadyAd(e.target.checked)} className="checkbox-input" />
                    Já tenho a propaganda pronta
                </label>
                {hasReadyAd && (
                    <textarea placeholder="Cole o texto da sua propaganda aqui" value={adCopy} onChange={e => setAdCopy(e.target.value)} className="input-field min-h-[100px]"></textarea>
                )}
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                    <WhatsappIcon /> Continuar no WhatsApp
                </button>
            </form>
        );
      case 'games':
        return (
          <div className="relative text-center space-y-4 overflow-hidden p-4 min-h-[250px]">
              <span className="cosmic-item text-4xl" style={{ top: '10%', left: '15%', animationDuration: '15s' }}>👽</span>
              <span className="cosmic-item text-2xl" style={{ top: '70%', left: '80%', animationDuration: '20s', animationDelay: '3s' }}>✨</span>
              <span className="cosmic-item text-3xl" style={{ top: '80%', left: '20%', animationDuration: '18s', animationDelay: '1s' }}>🚀</span>
              <span className="cosmic-item text-4xl" style={{ top: '25%', left: '75%', animationDuration: '22s', animationDelay: '5s' }}>🪐</span>

              <div className="relative z-10 bg-slate-900/60 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 space-y-4">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-green-400 text-transparent bg-clip-text text-gradient animated-gradient">
                      Joguinhos Cósmicos
                  </h3>
                  <p className="text-slate-300">Prepare-se para uma aventura intergaláctica!</p>
                  <button
                      onClick={() => openModal('requestPlayerName')}
                      className="w-full bg-purple-600 hover:bg-purple-700 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                      🚀 Jogar Cosmic Snake
                  </button>
                   <button
                        onClick={() => openModal('requestBomberAlienPlayerName')}
                        className="w-full bg-orange-600 hover:bg-orange-700 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                        <BombIcon className="w-5 h-5" /> Jogar Bomber Alien
                    </button>
                    <button
                        onClick={() => openModal('requestRockInvadersPlayerName')}
                        className="w-full bg-pink-600 hover:bg-pink-700 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                        <GuitarIcon className="w-5 h-5" /> Jogar Rock Invaders
                    </button>
                    <button
                        onClick={() => openModal('requestCosmicRiffPlayerName')}
                        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                        <RhythmIcon className="w-5 h-5" /> Jogar Cosmic Riff
                    </button>
              </div>
          </div>
        );
      case 'requestPlayerName':
        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                openModal('cosmicSnakeGame');
            }} className="space-y-4 text-center">
                <p className="text-slate-300">Para começar, nos diga o seu nome de piloto espacial:</p>
                <input 
                    type="text" 
                    placeholder="Seu nome" 
                    value={snakePlayerName} 
                    onChange={e => setSnakePlayerName(e.target.value)} 
                    required 
                    className="input-field" 
                />
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-3 px-4 rounded-lg">
                    Iniciar Jogo
                </button>
            </form>
        );
      case 'cosmicSnakeGame':
        return (
            <CosmicSnakeGame playerName={snakePlayerName || 'Viajante'} onClose={closeModal} />
        );
      case 'requestBomberAlienPlayerName':
        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                openModal('bomberAlienGame');
            }} className="space-y-4 text-center">
                <p className="text-slate-300">Insira seu nome de especialista em demolição:</p>
                <input
                    type="text"
                    placeholder="Seu nome"
                    value={bomberAlienPlayerName}
                    onChange={e => setBomberAlienPlayerName(e.target.value)}
                    required
                    className="input-field"
                />
                <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 transition-colors text-white font-bold py-3 px-4 rounded-lg">
                    Iniciar Jogo
                </button>
            </form>
        );
    case 'bomberAlienGame':
        return (
            <BomberAlienGame 
                playerName={bomberAlienPlayerName || 'Detonador'} 
                onClose={closeModal} 
            />
        );
    case 'requestRockInvadersPlayerName':
        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                openModal('rockInvadersGame');
            }} className="space-y-4 text-center">
                <p className="text-slate-300">Assine o contrato com seu nome de Rockstar para entrar no palco cósmico:</p>
                <input
                    type="text"
                    placeholder="Seu nome de astro do rock"
                    value={rockInvadersPlayerName}
                    onChange={e => setRockInvadersPlayerName(e.target.value)}
                    required
                    className="input-field"
                />
                <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 transition-colors text-white font-bold py-3 px-4 rounded-lg">
                    Entrar no Palco
                </button>
            </form>
        );
    case 'rockInvadersGame':
        return (
            <RockInvadersGame
                playerName={rockInvadersPlayerName || 'Astro do Rock'}
                onClose={closeModal}
            />
        );
    case 'requestCosmicRiffPlayerName':
        return (
            <form onSubmit={(e) => {
                e.preventDefault();
                openModal('cosmicRiffGame');
            }} className="space-y-4 text-center">
                <p className="text-slate-300">Qual será seu nome artístico no palco?</p>
                <input
                    type="text"
                    placeholder="Seu nome"
                    value={cosmicRiffPlayerName}
                    onChange={e => setCosmicRiffPlayerName(e.target.value)}
                    required
                    className="input-field"
                />
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white font-bold py-3 px-4 rounded-lg">
                    Começar o Show
                </button>
            </form>
        );
    case 'cosmicRiffGame':
        return (
            <CosmicRiffGame
                playerName={cosmicRiffPlayerName || 'Guitar Hero'}
                onClose={closeModal}
            />
        );
      case 'instagram':
        return (
          <div className="text-center">
            <p className="mb-6">Siga-nos para ficar por dentro de todas as novidades e bastidores do programa!</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:scale-105 transition-transform">
              Ir para o Instagram
            </a>
          </div>
        );
      case 'tiktok':
        return (
            <div className="text-center space-y-6">
                {/* Official Live Section */}
                <div className={`bg-slate-800/50 p-4 rounded-xl border ${isLive ? 'border-green-500/30' : 'border-purple-500/30'} relative overflow-hidden`}>
                     {isLive && (
                        <div className="absolute top-0 right-0 p-2">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        </div>
                     )}
                    <h3 className={`text-xl font-bold ${isLive ? 'text-green-400' : 'text-slate-300'} mb-2 flex items-center justify-center gap-2`}>
                        {isLive && <LiveIcon className="w-5 h-5" />} 
                        {isLive ? 'AO VIVO AGORA' : 'Canal Oficial de Lives'}
                    </h3>
                    <p className="text-slate-300 text-sm mb-4">
                        {isLive 
                            ? "Estamos transmitindo ao vivo pelo nosso perfil oficial! 🚀" 
                            : "De segunda a quinta, às 22h, as lives acontecem aqui."}
                    </p>
                    <a
                        href={OFFICIAL_TIKTOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full ${isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} transition-colors text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm`}
                    >
                        <TikTokIcon className="w-4 h-4" /> {isLive ? 'Acessar Live (@labirintoacustico)' : 'Seguir @labirintoacustico'}
                    </a>
                </div>

                {/* Secondary Section */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-600/50">
                    <h3 className="text-lg font-bold text-slate-400 mb-2 flex items-center justify-center gap-2">
                       Siga também
                    </h3>
                    <a
                        href={TIKTOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm"
                    >
                        <TikTokIcon className="w-4 h-4" /> @joydealmeida
                    </a>
                </div>
            </div>
        );
      case 'twitch':
        return (
          <div className="text-center">
            <p className="mb-6">Acompanhe nossas transmissões ao vivo com muita interação e gameplay!</p>
            <a 
                href={TWITCH_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block bg-[#9146FF] hover:bg-[#a970ff] transition-colors text-white font-bold py-3 px-6 rounded-lg hover:scale-105 transition-transform"
                onClick={closeModal}
            >
                <TwitchIcon className="inline-block w-5 h-5 mr-2" /> Ir para a Twitch
            </a>
          </div>
        );
      case 'youtube':
        return (
          <div className="text-center">
            <p className="mb-6">Inscreva-se no nosso canal para ver os melhores momentos, cortes e programas completos!</p>
            <a 
                href={YOUTUBE_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block bg-[#FF0000] hover:bg-[#ff4d4d] transition-colors text-white font-bold py-3 px-6 rounded-lg hover:scale-105 transition-transform"
                onClick={closeModal}
            >
                <YoutubeIcon className="inline-block w-5 h-5 mr-2" /> Ir para o YouTube
            </a>
          </div>
        );
      case 'developerInfo':
         return (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Desenvolvido por InteligenciArte.IA ✨</h3>
            <p className="text-slate-400 mb-4">Quer um site incrível como esse? Fale comigo! 🚀</p>
            <div className="space-y-4">
                <button onClick={() => openModal('developerContact')} className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <WhatsappIcon /> Chamar no WhatsApp
                </button>
                <a href={DEVELOPER_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <InstagramIcon /> Seguir no Instagram
                </a>
            </div>
          </div>
        );
    case 'developerContact':
        return (
            <form onSubmit={handleDevContactSubmit} className="space-y-4 text-center">
                <p className="text-slate-300">Por favor, confirme seu nome para personalizar a mensagem.</p>
                <input type="text" placeholder="Seu nome" value={devContactName} onChange={e => setDevContactName(e.target.value)} required className="input-field" />
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                    <WhatsappIcon /> Enviar para Desenvolvedor
                </button>
            </form>
        );
    case 'shop':
        return (
            <IntergalacticStore onClose={closeModal} />
        );
      default: return null;
    }
  };

  return (
    <>
      <div className="min-h-screen w-full bg-slate-900 text-white overflow-hidden selection:bg-purple-500/30">
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-green-800 to-fuchsia-800 animated-gradient -z-10 overflow-hidden">
          <span className="subliminal-text" style={{ top: '20%', left: '15%', animationDelay: '0s' }}>VIBRE NA FREQUÊNCIA</span>
          <span className="subliminal-text" style={{ top: '80%', left: '25%', animationDelay: '4s' }}>A RESPOSTA ESTÁ NA MÚSICA</span>
          <span className="subliminal-text" style={{ top: '50%', left: '75%', animationDelay: '8s' }}>ELES ESTÃO ENTRE NÓS</span>
          <span className="subliminal-text" style={{ top: '10%', left: '60%', animationDelay: '2s' }}>TRANSMISSÃO CÓSMICA</span>
          <span className="subliminal-text" style={{ top: '65%', left: '5%', animationDelay: '6s' }}>OUÇA O SINAL</span>
        </div>
        <Stars />
        {showGuide && <GuideBubble onClose={handleCloseGuide} />}
        <audio ref={audioRef} src={RADIO_STREAM_URL} preload="none" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}></audio>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-2 sm:p-4">
            <main className="w-full max-w-lg mx-auto bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-900/40 p-4 sm:p-6 text-center flex flex-col items-center">
                <div 
                    className="w-24 h-24 sm:w-28 sm:h-28 mb-1 cursor-pointer"
                    onClick={handleLogoClick}
                    style={{ 
                        transform: `rotateY(${rotation}deg)`,
                        transition: 'transform 0.1s linear'
                    }}
                >
                    <img src="/logo.png" alt="Labirinto Acústico Logo" className="w-full h-full object-contain" />
                </div>
                
                <h1 
                  className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text animated-gradient text-gradient cursor-pointer"
                  onClick={() => openModal('about')}
                >
                  Labirinto Acústico
                </h1>
                
                <div className="mt-1 min-h-[2.5rem] flex items-center justify-center px-2">
                  <p className="text-slate-300 text-xs sm:text-sm transition-opacity duration-500">
                    {SUBTITLES[subtitleIndex]}
                  </p>
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-green-400">
                  ⏰ Segunda à Quinta às 22:00
                </p>
                {isLive && (
                    <p className="mt-1 text-base font-bold text-green-400 animate-pulse">
                        ESTAMOS AO VIVO AGORA
                    </p>
                )}

                <div className="w-full max-w-sm bg-slate-800/40 border border-purple-500/20 rounded-xl p-2 sm:p-3 mt-2 flex items-center justify-between shadow-lg relative">
                    <div className="text-left">
                        <h3 className="font-bold text-sm sm:text-base text-white">Rádio Clube 94.1 FM</h3>
                        <p className="text-xs text-slate-400">Clique para ouvir</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Volume Control */}
                        <div className="relative flex items-center">
                          <button 
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            onClick={handleVolumeIconClick}
                          >
                            <VolumeIcon level={volume} />
                          </button>
                          
                          {showVolumeSlider && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 border border-purple-500/30 rounded-lg shadow-xl animate-fade-in">
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={volume} 
                                onChange={handleVolumeChange}
                                onInput={startVolumeTimer}
                                className="w-24 accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                              />
                            </div>
                          )}
                        </div>

                        <button onClick={syncLive} className="flex items-center gap-1.5 text-xs font-semibold bg-red-600/80 text-white px-2 py-1.5 sm:px-2.5 rounded-md hover:bg-red-600 transition-colors">
                            <LiveIcon className="w-2 h-2 animate-pulse" />
                            AO VIVO
                        </button>
                        <button onClick={togglePlayPause} className="bg-purple-600/80 p-2 sm:p-2.5 rounded-full hover:bg-purple-600 transition-colors text-white">
                            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-2 mt-3">
                  <button 
                      onClick={() => openModal('artemis')}
                      className="btn-artemis w-full max-w-sm py-3 px-4 text-sm sm:text-base rounded-xl flex items-center justify-center font-bold"
                  >
                      <div className="btn-artemis-particles">
                          <span style={{ left: '15%', animationDelay: '0.1s' }}>🚀</span>
                          <span style={{ left: '50%', animationDelay: '1.2s' }}>🌕</span>
                          <span style={{ left: '80%', animationDelay: '0.7s' }}>👨‍🚀</span>
                      </div>
                      <span className="relative z-10 text-orange-300 drop-shadow-[0_0_5px_rgba(253,186,116,0.8)] flex items-center gap-2">
                          <RocketIcon className="w-5 h-5" /> Missão Artemis II (Ao Vivo)
                      </span>
                  </button>

                  <button 
                      onClick={() => openModal('requestSong')} 
                      className="btn-music w-full max-w-sm py-3 px-4 text-sm sm:text-base rounded-xl flex items-center justify-center font-bold"
                  >
                      <div className="btn-music-particles">
                          <span style={{ left: '15%', animationDelay: '0.3s' }}>🎵</span>
                          <span style={{ left: '50%', animationDelay: '1.5s' }}>🎸</span>
                          <span style={{ left: '80%', animationDelay: '0.8s' }}>🎧</span>
                      </div>
                      <span className="relative z-10 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] flex items-center gap-2">
                          <MusicNoteIcon className="w-5 h-5" /> Pedir Música
                      </span>
                  </button>

                  <button 
                      onClick={() => openModal('games')} 
                      className="btn-cosmic w-full max-w-sm py-3 px-4 text-sm sm:text-base rounded-xl flex items-center justify-center font-bold"
                  >
                      <div className="btn-cosmic-particles">
                          <span style={{ left: '10%', animationDelay: '0.2s' }}>👾</span>
                          <span style={{ left: '45%', animationDelay: '1.8s' }}>🛸</span>
                          <span style={{ left: '75%', animationDelay: '0.5s' }}>🎮</span>
                      </div>
                      <span className="relative z-10 text-green-300 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)] flex items-center gap-2">
                          <GamesIcon className="w-5 h-5" /> Joguinhos
                      </span>
                  </button>

                  <button 
                      onClick={() => openModal('shop')} 
                      className="btn-shop w-full max-w-sm py-3 px-4 text-sm sm:text-base rounded-xl flex items-center justify-center font-bold"
                  >
                      <div className="btn-shop-particles">
                          <span style={{ left: '15%', animationDelay: '0.1s' }}>🛍️</span>
                          <span style={{ left: '50%', animationDelay: '1.2s' }}>💎</span>
                          <span style={{ left: '80%', animationDelay: '0.8s' }}>✨</span>
                      </div>
                      <span className="relative z-10 text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)] flex items-center gap-2">
                          <ShoppingCartIcon className="w-5 h-5" /> Loja Intergaláctica
                      </span>
                  </button>

                  <div className="flex gap-2 w-full">
                      <LinkButton 
                          icon={<InstagramIcon />} 
                          text="Instagram" 
                          onClick={() => openModal('instagram')} 
                          className="flex-1 btn-social"
                      />
                      <LinkButton 
                          icon={<TwitchIcon />} 
                          text="Twitch" 
                          onClick={() => openModal('twitch')} 
                          className="flex-1 btn-social"
                      />
                  </div>
                  <div className="flex gap-2 w-full">
                      <LinkButton 
                          icon={<YoutubeIcon />} 
                          text="Youtube" 
                          onClick={() => openModal('youtube')} 
                          className="flex-1 btn-social"
                      />
                      <LinkButton 
                          icon={<TikTokIcon />} 
                          text="TikTok" 
                          onClick={() => openModal('tiktok')} 
                          className="flex-1 btn-social"
                      />
                  </div>
                  
                  <div className="flex justify-around items-center pt-1 gap-3">
                      <div className="group relative">
                          <LinkButton
                              icon={<InfoIcon />}
                              text="Quem somos nós?"
                              onClick={() => openModal('about')}
                              className="icon-only-button"
                          />
                          <span className="tooltip">Quem somos nós?</span>
                      </div>
                      <div className="group relative">
                          <LinkAnchor
                              icon={<RadioIcon />}
                              text="Ouça no site da Clube FM"
                              href={RADIO_URL}
                              className="icon-only-button"
                          />
                          <span className="tooltip">Ouça no site da Clube FM</span>
                      </div>
                      <div className="group relative">
                          <LinkButton
                              icon={<WhatsappIcon />}
                              text="Contato"
                              onClick={() => openModal('contactOptions')}
                              className="icon-only-button"
                          />
                          <span className="tooltip">Fale Conosco</span>
                      </div>
                      <div className="group relative">
                          <LinkAnchor
                              icon={<MegaphoneIcon />}
                              text="Anunciar"
                              href={ADVERTISE_URL}
                              className="icon-only-button"
                          />
                          <span className="tooltip">Anunciar no Labirinto</span>
                      </div>
                  </div>
                </div>
            </main>
            <footer className="w-full text-center p-4 mt-4 text-sm text-slate-400">
                <button onClick={() => openModal('developerInfo')} className="hover:text-white transition-colors">
                    Desenvolvido por <strong>InteligenciArte.IA</strong> ✨
                </button>
            </footer>
        </div>
        <Modal 
            isOpen={activeModal !== null} 
            onClose={closeModal} 
            title={MODAL_TITLES[activeModal as keyof typeof MODAL_TITLES]}
            variant={activeModal === 'about' ? 'spin' : 'default'}
        >
            {renderModalContent()}
        </Modal>
      </div>
      <style>{`
        .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation-name: twinkle;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
            box-shadow: 0 0 4px #fff, 0 0 6px #fff, 0 0 10px #c084fc;
        }
        @keyframes twinkle {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
            100% {
                opacity: 0;
                transform: scale(0.5);
            }
        }
        .input-field {
            width: 100%;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            color: white;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
            outline: none;
            border-color: #a855f7;
            box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.3);
        }
        .checkbox-input {
            appearance: none;
            width: 1.25rem;
            height: 1.25rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 0.25rem;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
        }
        .checkbox-input:checked {
            border-color: #34d399;
            background-color: #34d399;
        }
        .checkbox-input:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            color: white;
            font-weight: bold;
            font-size: 0.9rem;
            transform: translate(-50%, -52%);
        }
        .link-button-style {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            width: 100%;
            text-align: center;
            padding: 0.4rem 0.8rem;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            border-radius: 0.5rem;
            transition: all 0.2s ease-in-out;
            font-weight: 600;
            font-size: 0.8rem;
        }
        .link-button-style:hover {
            transform: translateY(-2px) scale(1.02);
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(168, 85, 247, 0.5); /* purple-500 */
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .btn-social {
            background: linear-gradient(45deg, rgba(255,255,255,0.02), rgba(168,85,247,0.1), rgba(255,255,255,0.02));
            background-size: 200% 200%;
            animation: social-bg-shift 3s ease infinite alternate;
        }
        @keyframes social-bg-shift {
            0% { 
                background-position: 0% 50%; 
                border-color: rgba(168, 85, 247, 0.2);
                box-shadow: 0 0 5px rgba(168, 85, 247, 0.1);
            }
            100% { 
                background-position: 100% 50%; 
                border-color: rgba(236, 72, 153, 0.4);
                box-shadow: 0 0 12px rgba(236, 72, 153, 0.2);
            }
        }
        .link-button-style > svg {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            width: 1.25rem;
            height: 1.25rem;
            flex-shrink: 0;
            color: #e2e8f0; /* slate-200 */
        }
        .link-button-style > span {
            flex-grow: 1;
            text-align: center;
            /* The margin-right hack is no longer needed */
        }
        .icon-only-button {
            width: 2.5rem; 
            height: 2.5rem; 
            padding: 0;
            justify-content: center;
            border-radius: 9999px;
            animation: icon-float 2.5s ease-in-out infinite alternate;
        }
        .group:nth-child(1) .icon-only-button { animation-delay: 0s; }
        .group:nth-child(2) .icon-only-button { animation-delay: 0.4s; }
        .group:nth-child(3) .icon-only-button { animation-delay: 0.8s; }
        .group:nth-child(4) .icon-only-button { animation-delay: 1.2s; }

        .icon-only-button:hover {
            transform: scale(1.15) translateY(-4px) !important;
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(34, 211, 238, 0.6);
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
            animation-play-state: paused;
        }
        @keyframes icon-float {
            0% { transform: translateY(0px); box-shadow: 0 0 0px rgba(255,255,255,0); }
            100% { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }
        }
        .icon-only-button > svg {
            position: static; /* Override absolute positioning */
            transform: none; /* Override transform */
            margin-right: 0;
            width: 1.25rem;
            height: 1.25rem;
        }
        .icon-only-button > span {
            display: none;
        }
        .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 0.5rem;
            padding: 0.375rem 0.75rem;
            background-color: #0f172a;
            border: 1px solid rgba(168, 85, 247, 0.3);
            color: white;
            font-size: 0.75rem;
            border-radius: 0.5rem;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
            white-space: nowrap;
            z-index: 20;
        }
        .group:hover .tooltip {
            opacity: 1;
        }
        .subliminal-text {
            position: absolute;
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 2.5rem;
            color: rgba(216, 180, 254, 0.07);
            text-transform: uppercase;
            animation: psychedelic-drift 20s infinite ease-in-out;
            pointer-events: none;
            user-select: none;
        }
        @keyframes psychedelic-drift {
            0%, 100% {
                opacity: 0.1;
                transform: translate(0px, 10px) scale(0.98) rotate(-2deg);
            }
            50% {
                opacity: 1;
                transform: translate(10px, -10px) scale(1.02) rotate(2deg);
            }
        }
        
        /* Games Modal Styles */
        .cosmic-item {
            position: absolute;
            z-index: 0;
            opacity: 0;
            animation: float-cosmic ease-in-out infinite;
            pointer-events: none;
            text-shadow: 
                0 0 4px rgba(255, 255, 255, 0.6),
                0 0 8px rgba(168, 85, 247, 0.5),
                0 0 16px rgba(168, 85, 247, 0.4),
                0 0 24px rgba(52, 211, 153, 0.3);
        }
        @keyframes float-cosmic {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 0.3; }
            25% { transform: translateY(-20px) translateX(15px) rotate(15deg) scale(1.1); opacity: 0.8; }
            50% { transform: translateY(10px) translateX(-10px) rotate(-10deg) scale(0.9); opacity: 0.4; }
            75% { transform: translateY(-15px) translateX(20px) rotate(5deg) scale(1.2); opacity: 0.9; }
        }

        /* Cosmic Snake Game Styles */
        .snake-segment { border-radius: 20%; transition: all 0.1s linear; }
        .snake-head { border-radius: 40% 40% 20% 20%; z-index: 10; }
        .food-orb { border-radius: 50%; animation: pulse-food 2s infinite ease-in-out; }
        @keyframes pulse-food { 0%, 100% { transform: scale(0.9); box-shadow: 0 0 10px currentColor; } 50% { transform: scale(1.1); box-shadow: 0 0 20px currentColor; } }
        .level-1 { border-color: #a855f7; background: radial-gradient(circle, #2c1a4c, #1a0f2c); }
        .level-1 .snake-segment { background-color: #00ffff; box-shadow: 0 0 8px #00ffff; }
        .level-1 .food-orb { background-color: #f0f; color: #f0f; }
        .level-2 { border-color: #f97316; background: radial-gradient(circle, #6f1d1b, #4a0404); }
        .level-2 .snake-segment { background: linear-gradient(45deg, #f97316, #fde047); box-shadow: 0 0 8px #f97316; }
        .level-2 .food-orb { background-color: #eab308; color: #eab308; }
        .level-3 { border-color: #84cc16; background-color: #1c1917; background-image: radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 40px), radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 30px); background-size: 550px 550px, 350px 350px; background-position: 0 0, 40px 60px; }
        .level-3 .snake-segment { background-color: #84cc16; box-shadow: 0 0 8px #84cc16; }
        .level-3 .food-orb { background-color: #22d3ee; color: #22d3ee; }
        .level-4 { border-color: #34d399; background-color: #064e3b; }
        .level-4 .snake-segment { background-color: #fde047; box-shadow: 0 0 8px #fde047; }
        .level-4 .food-orb { background-color: #a78bfa; color: #a78bfa; }
        .level-5 { border-color: #ec4899; background: radial-gradient(ellipse at center, #4c1d95 0%,#020617 70%); animation: rotate-bg 10s linear infinite; }
        @keyframes rotate-bg { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .level-5 .snake-segment { background-color: white; box-shadow: 0 0 10px #ec4899; }
        .level-5 .food-orb { background-color: #f43f5e; color: #f43f5e; }

        /* Bomber Alien Game Styles */
        .bomber-grid { display: grid; position: absolute; inset: 0; background-color: #1e293b; border-radius: 0.25rem; }
        .bomber-cell { width: 100%; height: 100%; }
        .bomber-floor { background-color: #334155; }
        .bomber-wall-indestructible { background-color: #475569; border: 1px solid #64748b; }
        .bomber-wall-destructible { background-color: #a16207; background-image: linear-gradient(45deg, #ca8a04 25%, transparent 25%, transparent 75%, #ca8a04 75%, #ca8a04), linear-gradient(-45deg, #ca8a04 25%, transparent 25%, transparent 75%, #ca8a04 75%, #ca8a04); background-size: 8px 8px; }
        .bomber-player { position: absolute; background: radial-gradient(circle, #6ee7b7, #10b981); border-radius: 50%; width: 7.69%; /* 100/13 */ height: 9.09%; /* 100/11 */ transition: all 0.1s linear; z-index: 10; box-shadow: 0 0 8px #34d399; }
        .bomber-ai { position: absolute; background: radial-gradient(circle, #f87171, #dc2626); border-radius: 50%; width: 7.69%; height: 9.09%; transition: all 0.1s linear; z-index: 9; box-shadow: 0 0 8px #ef4444; }
        .bomber-bomb { position: absolute; background: radial-gradient(circle, #4c4c4c, #1a1a1a); border-radius: 50%; width: 7.69%; height: 9.09%; z-index: 5; animation: pulse-bomb 1s infinite; }
        @keyframes pulse-bomb { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); box-shadow: 0 0 10px #facc15; } }
        .bomber-explosion { position: absolute; background-color: #f59e0b; width: 7.69%; height: 9.09%; z-index: 20; animation: flash-explosion 0.5s forwards; }
        @keyframes flash-explosion { from { transform: scale(0.5); opacity: 1; border-radius: 50%; } to { transform: scale(1.5); opacity: 0; border-radius: 0; } }
        
        .bomber-analog-stick {
            position: relative;
            width: 100px;
            height: 100px;
            background-color: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            touch-action: none;
            user-select: none;
        }
        .bomber-analog-knob {
            position: absolute;
            width: 50px;
            height: 50px;
            background-color: rgba(168, 85, 247, 0.5); /* purple */
            border: 2px solid rgba(168, 85, 247, 0.8);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none; /* So it doesn't interfere with the base's touch events */
            transition: top 0.05s linear, left 0.05s linear;
        }

        .bomber-action button { 
            width: 80px; 
            height: 80px; 
            border-radius: 50%; 
            background-color: #dc2626; 
            border: 1px solid #f87171; 
            font-size: 2.5rem; 
            color: white;
        }
        .bomber-action button:active { background-color: #ef4444; }

        /* Rock Invaders Game Styles */
        .rock-invaders-canvas {
            border-radius: 0.5rem;
            box-shadow: 0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(236, 72, 153, 0.6);
            touch-action: none; /* Prevent default touch actions like scrolling */
        }
        .mobile-controls { display: none; }
        @media (hover: none) and (pointer: coarse), (max-width: 768px) {
            .mobile-controls {
                display: flex;
                justify-content: center; /* Centered the controls */
                width: 100%;
                margin-top: 0.5rem;
                padding: 0 1rem;
                user-select: none;
            }
            .mobile-controls .move-buttons button, .mobile-controls .action-button button {
                width: 60px; /* Increased button size */
                height: 60px; /* Increased button size */
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(219, 39, 119, 0.4);
                color: white;
                font-size: 1.8rem; /* Increased icon size */
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .mobile-controls .move-buttons {
                display: flex;
                gap: 1rem;
            }
        }

        /* Cosmic Button Styles */
        .btn-cosmic {
            position: relative;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.4); /* fundo meio transparente */
            backdrop-filter: blur(4px);
            border: 2px solid #a3e635; /* verde limão neon */
            box-shadow: 0 0 15px rgba(163, 230, 53, 0.5), inset 0 0 10px rgba(163, 230, 53, 0.2);
            color: white;
            transition: all 0.3s ease;
        }
        .btn-cosmic:hover {
            box-shadow: 0 0 25px rgba(163, 230, 53, 0.8), inset 0 0 15px rgba(163, 230, 53, 0.4);
            background: rgba(15, 23, 42, 0.6);
            transform: scale(1.02);
        }
        .btn-cosmic-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            opacity: 0.4;
        }
        .btn-cosmic-particles span {
            position: absolute;
            bottom: -30px;
            font-size: 1.5rem;
            animation: fly-up 3s linear infinite;
        }
        @keyframes fly-up {
            0% { transform: translateY(0) rotate(-45deg) scale(0.8); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) rotate(-45deg) scale(1.2); opacity: 0; }
        }

        /* Artemis Button Styles */
        .btn-artemis {
            position: relative;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            border: 2px solid #fb923c; /* orange-400 */
            box-shadow: 0 0 15px rgba(251, 146, 60, 0.5), inset 0 0 10px rgba(251, 146, 60, 0.2);
            color: white;
            transition: all 0.3s ease;
            display: flex;
        }
        .btn-artemis:hover {
            box-shadow: 0 0 25px rgba(251, 146, 60, 0.8), inset 0 0 15px rgba(251, 146, 60, 0.4);
            background: rgba(15, 23, 42, 0.6);
            transform: scale(1.02);
        }
        .btn-artemis-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            opacity: 0.5;
        }
        .btn-artemis-particles span {
            position: absolute;
            bottom: -30px;
            font-size: 1.5rem;
            animation: float-up-artemis 3s ease-in-out infinite;
        }
        @keyframes float-up-artemis {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }

        /* Music Button Styles */
        .btn-music {
            position: relative;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            border: 2px solid #22d3ee; /* cyan-400 */
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.5), inset 0 0 10px rgba(34, 211, 238, 0.2);
            color: white;
            transition: all 0.3s ease;
        }
        .btn-music:hover {
            box-shadow: 0 0 25px rgba(34, 211, 238, 0.8), inset 0 0 15px rgba(34, 211, 238, 0.4);
            background: rgba(15, 23, 42, 0.6);
            transform: scale(1.02);
        }
        .btn-music-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            opacity: 0.5;
        }
        .btn-music-particles span {
            position: absolute;
            bottom: -30px;
            font-size: 1.5rem;
            animation: float-up-music 3s ease-in-out infinite;
        }
        @keyframes float-up-music {
            0% { transform: translateY(0) scale(0.8) rotate(-10deg); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(-80px) scale(1.2) rotate(10deg); opacity: 0; }
        }

        /* Shop Button Styles */
        .btn-shop {
            position: relative;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            border: 2px solid #fde047; /* yellow-300 */
            box-shadow: 0 0 15px rgba(253, 224, 71, 0.5), inset 0 0 10px rgba(253, 224, 71, 0.2);
            color: white;
            transition: all 0.3s ease;
        }
        .btn-shop:hover {
            box-shadow: 0 0 25px rgba(253, 224, 71, 0.8), inset 0 0 15px rgba(253, 224, 71, 0.4);
            background: rgba(15, 23, 42, 0.6);
            transform: scale(1.02);
        }
        .btn-shop-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            opacity: 0.5;
        }
        .btn-shop-particles span {
            position: absolute;
            bottom: -30px;
            font-size: 1.5rem;
            animation: float-up 3s ease-in-out infinite;
        }
        @keyframes float-up {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }

        /* Responsiveness */
        @media (max-width: 640px) {
            main.max-w-lg {
                padding: 1.25rem;
                max-width: 95%;
            }
            div.max-w-md.m-auto {
                max-width: 95%;
            }
            .link-button-style {
                padding: 0.5rem 0.75rem;
                font-size: 0.8rem;
            }
            .link-button-style > svg {
                width: 1.1rem;
                height: 1.1rem;
            }
            .icon-only-button {
                width: 2.75rem; 
                height: 2.75rem; 
            }
            .icon-only-button > svg {
                width: 1.15rem;
                height: 1.15rem;
            }
        }
        @media (min-width: 640px) {
            .subliminal-text {
                font-size: 4rem;
            }
        }
        
        @keyframes fade-in {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
        }

        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid white;
        }

        input[type=range]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid white;
        }
      `}</style>
    </>
  );
};

const LinkButton: React.FC<{icon: React.ReactNode, text: string, onClick: () => void, className?: string}> = ({ icon, text, onClick, className = '' }) => (
    <button onClick={onClick} className={`link-button-style ${className}`}>
        {icon}
        <span className="text-transparent bg-clip-text animated-gradient text-gradient">{text}</span>
    </button>
);

const LinkAnchor: React.FC<{icon: React.ReactNode, text: string, href: string, className?: string}> = ({ icon, text, href, className = '' }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`link-button-style ${className}`}>
        {icon}
        <span className="text-transparent bg-clip-text animated-gradient text-gradient">{text}</span>
    </a>
);

const MODAL_TITLES = {
    artemis: 'Missão Artemis II (Ao Vivo)',
    about: 'Quem somos nós?',
    contact: 'Fale Conosco',
    contactOptions: 'Entre em Contato',
    requestSong: 'Peça sua Música',
    advertise: 'Anuncie Conosco',
    games: 'Área de Joguinhos 👾',
    requestPlayerName: 'Identificação de Piloto',
    cosmicSnakeGame: 'Cosmic Snake',
    requestBomberAlienPlayerName: 'Registro de Demolição',
    bomberAlienGame: 'Bomber Alien',
    requestRockInvadersPlayerName: 'Assine o Contrato, Rockstar!',
    rockInvadersGame: 'Rock Invaders',
    requestCosmicRiffPlayerName: 'Nome Artístico',
    cosmicRiffGame: 'Cosmic Riff',
    instagram: 'Siga-nos no Instagram',
    tiktok: 'Canais TikTok',
    twitch: 'Canal na Twitch',
    youtube: 'Canal no YouTube',
    developerInfo: 'Créditos',
    developerContact: 'Contato para Desenvolvimento',
    shop: 'Loja Intergaláctica 🛍️',
    construction: 'Em Construção'
};

export default App;
