import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ZodiacWheel from './ZodiacWheel';
import { WHATSAPP_NUMBER } from '../constants';

const reveal = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.4, ease: 'easeOut' } }),
};

const LOADING_TEXTS = [
  "Preparing your zodiac sign...",
  "Calculating your life path...",
  "Preparing your snapshot...",
];

export default function ReadingOverlay({ 
  isOpen, 
  reading,
  onClose, 
  onGenerate,
  userData
}) {
  const [step, setStep] = useState('input'); // input, calculating, reading
  const [formData, setFormData] = useState({ name: '', dob: '' });
  const [loadingStep, setLoadingStep] = useState(0);

  const timers = useRef([]);

  useEffect(() => {
    if (!isOpen) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setStep('input');
      setFormData({ name: '', dob: '' });
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep('calculating');
    setLoadingStep(0);

    timers.current = [
      setTimeout(() => setLoadingStep(1), 600),
      setTimeout(() => setLoadingStep(2), 1200),
      setTimeout(() => {
        onGenerate(formData);
        setStep('reading');
      }, 2000),
    ];
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          />
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-[70] max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-chakra-bg border-t border-chakra-ring px-5 pt-4 pb-6 max-w-2xl mx-auto shadow-[0_-10px_40px_rgba(37,169,186,0.15)] flex flex-col ${step === 'calculating' ? 'items-center justify-center min-h-[400px]' : ''} ${step === 'reading' ? 'max-h-[90vh]' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Cosmic Snapshot"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header (hidden in calculating state) */}
            {step !== 'calculating' && (
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs uppercase tracking-[0.2em] text-chakra-cyan font-bold">
                  {step === 'input' ? 'Cosmic Snapshot' : (userData?.name || 'Your Reading')}
                </span>
                <button onClick={handleClose} aria-label="Close" className="text-chakra-muted hover:text-white transition-colors text-xl leading-none p-2 -mr-2">
                  ✕
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* STEP 1: INPUT FORM */}
              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-chakra-muted text-sm mb-6">Enter your name and date of birth to explore a zodiac and numerology snapshot.</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="snapshot-name" className="block text-sm text-chakra-muted mb-1">First name</label>
                      <input id="snapshot-name" type="text" placeholder="First Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-chakra-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-chakra-muted focus:outline-none focus:border-chakra-cyan transition-colors" />
                    </div>
                    <div>
                      <label htmlFor="snapshot-dob" className="block text-sm text-chakra-muted mb-1">Date of birth</label>
                      <input id="snapshot-dob" type="date" required value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full bg-chakra-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-chakra-muted focus:outline-none focus:border-chakra-cyan transition-colors" />
                    </div>
                    
                    <button type="submit" className="w-full bg-chakra-cyan hover:bg-chakra-blue text-chakra-bg font-bold py-4 rounded-xl mt-4 transition-transform active:scale-[0.98]">
                      Align Stars
                    </button>
                  </form>
                </motion.div>
              )}

              {/* STEP 2: CALCULATING */}
              {step === 'calculating' && (
                <motion.div
                  key="calculating"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                    <motion.div 
                      className="absolute inset-0 opacity-40"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <ZodiacWheel size={192} />
                    </motion.div>
                    {/* A fast spinning inner element */}
                    <div className="w-12 h-12 rounded-full border-2 border-chakra-cyan border-t-transparent animate-spin" />
                  </div>
                  
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-chakra-gold font-serif text-lg text-center"
                  >
                    {LOADING_TEXTS[loadingStep]}
                  </motion.p>
                  
                  <p className="text-xs text-chakra-muted/60 italic mt-6 text-center max-w-[280px] mx-auto">
                    ✨ This is a fun preview experience — your full Kundli uses your exact birth data. We never store this data.
                  </p>
                </motion.div>
              )}

              {/* STEP 3: READING */}
              {step === 'reading' && reading && (
                <motion.div
                  key="reading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col min-h-0 flex-1"
                >
                  {/* Scrollable reading content */}
                  <div className="overflow-y-auto flex-1 min-h-0 pr-1">
                    {/* ── Zodiac Section ── */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xl sm:text-2xl font-serif font-bold gold-gradient-text">{reading.zodiac.name}</span>
                        <span className="text-xs sm:text-sm text-chakra-muted">
                          {reading.zodiac.element} · {reading.zodiac.rulingPlanet}
                        </span>
                      </div>

                      <div className="space-y-2 mt-2">
                        {reading.zodiac.lines.map((line, i) => (
                          <motion.p
                            key={`z-${i}`}
                            custom={i}
                            variants={reveal}
                            initial="hidden"
                            animate="visible"
                            className="text-sm sm:text-base text-white/90 leading-snug"
                          >
                            {line}
                          </motion.p>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {reading.zodiac.traits.map((trait, i) => (
                          <span key={i} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] sm:text-xs text-chakra-muted">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ── Numerology Section ── */}
                    <div className="pt-3 sm:pt-4 border-t border-white/10">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xl sm:text-2xl font-serif font-bold gold-gradient-text">{reading.numerology.name}</span>
                        <span className="text-xs sm:text-sm text-chakra-muted">Life Path · <span className="text-sm sm:text-base font-semibold text-white">{reading.numerology.number}</span></span>
                      </div>

                      <div className="space-y-2 mt-2">
                        {reading.numerology.lines.map((line, i) => (
                          <motion.p
                            key={`n-${i}`}
                            custom={i + reading.zodiac.lines.length}
                            variants={reveal}
                            initial="hidden"
                            animate="visible"
                            className="text-sm sm:text-base text-white/90 leading-snug"
                          >
                            {line}
                          </motion.p>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {reading.numerology.traits.map((trait, i) => (
                          <span key={i} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] sm:text-xs text-chakra-muted">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── WhatsApp CTA — always visible at bottom ── */}
                  <div className="mt-4 pt-4 border-t border-chakra-ring text-center shrink-0">
                    <p className="text-xs sm:text-sm text-chakra-muted mb-2 sm:mb-3">Want the full picture mathematically mapped to your birth chart?</p>
                    <a 
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'd like to get my full Kundli reading.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleClose} 
                      className="inline-block w-full bg-gradient-to-r from-chakra-goldLight via-chakra-gold to-chakra-goldLight text-chakra-bg font-bold py-3 sm:py-3.5 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                    >
                      Get Your Full Kundli Reading
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

