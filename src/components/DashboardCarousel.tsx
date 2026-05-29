import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const carouselData = [
  {
    id: 1,
    imageUrl: 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/carrossel/carrossel01.png',
    link: 'predictions',
    alt: 'Prêmio da Rodada (13ª Rodada no Ar!)'
  },
  {
    id: 2,
    imageUrl: 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/carrossel/carrossel02.png',
    link: 'predictions',
    alt: 'Bônus Acumulado (Superbônus Rei)'
  },
  {
    id: 3,
    imageUrl: 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/carrossel/carrossel03.png',
    link: 'ranking',
    alt: 'Ranking Anual (Caixa de Som Aiwa)'
  },
  {
    id: 4,
    imageUrl: 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/carrossel/carrossel04.png',
    link: 'referral',
    alt: 'Indique e Ganhe (Bônus na Carteira)'
  },
  {
    id: 5,
    imageUrl: 'https://zxnsubmxqoplohcngntu.supabase.co/storage/v1/object/public/imagem/carrossel/carrossel05.png',
    link: 'transparency',
    alt: 'Transparência Total (Regulamento)'
  }
];

export const DashboardCarousel = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (!isHovered) {
      intervalId = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselData.length);
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isHovered]);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? carouselData.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === carouselData.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div 
      className="max-w-4xl mx-auto w-full relative mb-8 rounded-2xl overflow-hidden border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] group aspect-video bg-[#0A0F1E]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="w-full h-full cursor-pointer relative"
        onClick={() => onNavigate(carouselData[currentIndex].link)}
      >
        {carouselData.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img 
              src={slide.imageUrl} 
              alt={slide.alt} 
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Left Arrow */}
        <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            className="p-1 sm:p-2 rounded-full bg-black/40 text-white hover:bg-black/80 hover:text-[#32CD32] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Right Arrow */}
        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            className="p-1 sm:p-2 rounded-full bg-black/40 text-white hover:bg-black/80 hover:text-[#32CD32] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Dots */}
        <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center py-2">
          {carouselData.map((_, slideIndex) => (
            <div
              key={slideIndex}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(slideIndex);
              }}
              className={`cursor-pointer w-2 h-2 sm:w-2.5 sm:h-2.5 mx-1 md:mx-1.5 rounded-full transition-all duration-300 ${
                currentIndex === slideIndex 
                  ? 'bg-[#32CD32] scale-125 shadow-[0_0_8px_#32CD32]' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
