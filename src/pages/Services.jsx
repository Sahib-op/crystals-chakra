import ServiceCard from '../components/ServiceCard';
import CosmicBackground from '../components/CosmicBackground';
import PageMeta from '../components/PageMeta';
import AnimatedTitle from '../components/AnimatedTitle';
import { WHATSAPP_NUMBER } from '../constants';
import {
  User,
  Award,
  BookOpen,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const ASTROLOGERS = [
  {
    name: 'Pandit Ramesh Shastri',
    specialty: 'Bhrigu Patrika & Vedic Remedies',
    experience: '25+ years',
    description:
      'Trained in the Bhrigu Samhita tradition at Varanasi. Specializes in career timing, Manglik Dosha analysis, and gemstone prescriptions.',
  },
  {
    name: 'Acharya Sunita Devi',
    specialty: 'Parashara System & Nadi Astrology',
    experience: '18+ years',
    description:
      'A gold medalist in Jyotish Shastra from BHU. Known for precise Dasha-based predictions and relationship compatibility readings.',
  },
  {
    name: 'Dr. Arvind Mishra',
    specialty: 'KP System & Financial Astrology',
    experience: '15+ years',
    description:
      'Combines Krishnamurti Paddhati with classical Vedic methods. Experts in wealth yogas, property timings, and business-related queries.',
  },
];

export default function Services() {
  return (
    <div className="relative min-h-screen bg-chakra-bg overflow-x-hidden flex flex-col">
      <PageMeta
        title="Kundli Services"
        description="Choose from Birhaat Kundli, Bhrigu Patrika, or Parashara Patrika Plus. Expert astrologers deliver personalized, precision-calculated birth chart readings."
        path="/services"
      />

      {/* Animated constellation background */}
      <CosmicBackground />

      {/* Foreground Content */}
      <div className="relative z-10 pt-20 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
        <div className="text-center mb-6 sm:mb-10">
          <AnimatedTitle
            text="Our Kundli Services"
            goldWord="Services"
            className="text-5xl sm:text-6xl md:text-8xl font-serif font-bold text-center mb-4 sm:mb-8 tracking-wide"
            startDelay={0.1}
          />
          <p
            className="text-lg sm:text-xl text-chakra-muted max-w-3xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
          >
            Prepared by expert astrologers, our personalized Patrikas decode the
            cosmic geometry at the time of your birth. Discover your strengths,
            anticipate challenges, and align your life with the universe.
          </p>
        </div>

        <div
          className="animate-fade-in-up"
          style={{ animationDelay: '0.9s', animationFillMode: 'both' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <ServiceCard
              title="Bhrigu Patrika"
              price="999/-"
              oldPrice="3000"
              features={[
                'Everything in Birhaat Kundli',
                'In-depth Karma & Life Path',
                'Detailed Health Predictions',
                'Year-by-Year Breakdown (Next 5 Years)',
                'Specific Gemstone & Mantra Recommendations',
                'Favorable Timings for Major Decisions',
              ]}
            />
            <ServiceCard
              title="Birhaat Kundli"
              price="699/-"
              oldPrice="2500"
              isPopular={true}
              features={[
                'Basic Life Overview',
                'Personality & Traits Analysis',
                'Career & Financial Success',
                'Marriage & Relationship Insights',
                'Major Doshas & Basic Remedies',
                '100% Personalized & Confidential',
              ]}
            />
            <ServiceCard
              title="Parashara Patrika Plus"
              price="1499/-"
              oldPrice="5000"
              features={[
                'Complete Astrological Master Blueprint',
                'Detailed Vimshottari Dasha Analysis',
                'Micro-level Transit (Gochar) Impact',
                'Advanced Wealth & Property Yogas',
                'Intensive Relationship Compatibility',
                'Comprehensive, Powerful Custom Remedies',
              ]}
            />
          </div>

          {/* What You'll Receive */}
          <div className="mt-10 sm:mt-16 max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-center mb-10 sm:mb-12">
              What You'll Receive
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl p-6 text-center">
                <FileText className="w-8 h-8 text-chakra-cyan mx-auto mb-4" />
                <h3 className="font-bold mb-2">Detailed PDF Report</h3>
                <p className="text-chakra-muted text-sm">
                  15-40 page professionally formatted document with charts,
                  tables, and plain-language interpretations.
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-6 text-center">
                <Clock className="w-8 h-8 text-chakra-gold mx-auto mb-4" />
                <h3 className="font-bold mb-2">3-5 Day Delivery</h3>
                <p className="text-chakra-muted text-sm">
                  Each reading is manually prepared by our astrologers — no
                  auto-generated reports. Express 24hr option available.
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-6 text-center">
                <ShieldCheck className="w-8 h-8 text-chakra-cyan mx-auto mb-4" />
                <h3 className="font-bold mb-2">7-Day Guarantee</h3>
                <p className="text-chakra-muted text-sm">
                  Full refund within 7 days if the reading doesn't meet its
                  described scope. No questions asked.
                </p>
              </div>
            </div>
          </div>

          {/* Our Astrologers */}
          <div className="mt-16 sm:mt-24 max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-center mb-4">
              Our Expert Astrologers
            </h2>
            <p className="text-chakra-muted text-center mb-10 sm:mb-12 text-sm sm:text-base">
              Every reading is personally crafted by one of our certified Vedic
              astrologers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {ASTROLOGERS.map((astro, i) => (
                <div key={i} className="glass-panel rounded-2xl p-6 sm:p-8">
                  <div className="w-14 h-14 bg-chakra-cyan/10 rounded-full flex items-center justify-center mb-4">
                    <User className="w-7 h-7 text-chakra-cyan" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{astro.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-chakra-gold" />
                    <span className="text-chakra-gold text-xs font-semibold">
                      {astro.experience}
                    </span>
                  </div>
                  <p className="text-chakra-cyan text-xs font-semibold uppercase tracking-wider mb-3">
                    {astro.specialty}
                  </p>
                  <p className="text-chakra-muted text-sm leading-relaxed">
                    {astro.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Need Help Choosing */}
          <div className="mt-16 sm:mt-24 glass-panel rounded-2xl p-6 sm:p-8 md:p-12 text-center max-w-4xl mx-auto border-chakra-cyan/30">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4">
              Need Help Choosing?
            </h2>
            <p className="text-chakra-muted mb-8 text-sm sm:text-base">
              Not sure which Patrika is right for you? Message our team of
              expert astrologers on WhatsApp for a free consultation to find the
              perfect reading for your current life situation.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello, I need help choosing a Kundli reading.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-transparent border-2 border-chakra-cyan text-chakra-cyan hover:bg-chakra-cyan hover:text-chakra-bg px-6 sm:px-8 py-3 rounded-full font-bold transition-all"
            >
              Chat with an Expert
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
