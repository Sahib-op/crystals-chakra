import { useRef, useState, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import WhatsAppCTA from './WhatsAppCTA';

export default function ServiceCard({
  title,
  price,
  features,
  isPopular,
  oldPrice,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -4, y: dx * 4 });
  }, []);

  const handleMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`service-card-polished relative glass-panel bg-chakra-surface/30 backdrop-blur-xl rounded-2xl p-6 sm:p-8 flex flex-col h-full transition-transform duration-200 ease-out ${isPopular ? 'border-chakra-gold ring-1 ring-chakra-gold/50' : 'border-white/10'}`}
      style={{
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        willChange: 'transform',
      }}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-chakra-goldLight via-chakra-gold to-chakra-goldLight text-chakra-bg px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
          MOST POPULAR
        </div>
      )}

      <h3 className="text-xl sm:text-2xl font-serif font-bold text-center mb-2 gold-gradient-text">
        {title}
      </h3>

      <div className="text-center mb-6">
        <span className="text-3xl sm:text-4xl font-bold text-white">
          ₹{price}
        </span>
        {oldPrice && (
          <span className="text-chakra-gold/70 line-through ml-2 text-lg">
            ₹{oldPrice}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 sm:space-y-4 mb-8">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-chakra-cyan shrink-0 mt-0.5" />
            <span className="text-chakra-text/90 text-sm">{feature}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 justify-center mt-auto">
        <WhatsAppCTA
          message={`Hi! I'm interested in the ${title} (₹${price}). Please provide more details.`}
        />
      </div>
    </div>
  );
}
