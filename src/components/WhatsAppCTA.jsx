import WhatsAppIcon from './WhatsAppIcon';
import { whatsappHref, readingContact } from '../../shared/contact.js';

export default function WhatsAppCTA({
  message = 'Hello, I would like to get a personalized Kundli reading.',
}) {
  const whatsappUrl = whatsappHref(message);
  const displayNumber = readingContact().displayNumber;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-bold shadow-lg shadow-[#25D366]/30 transform transition-all hover:scale-105 active:scale-95"
    >
      <WhatsAppIcon size={22} />
      <div className="flex flex-col text-left">
        <span className="text-xs uppercase tracking-wider opacity-90 leading-none mb-1">
          WhatsApp Now
        </span>
        <span className="text-lg sm:text-xl leading-none">{displayNumber}</span>
      </div>
    </a>
  );
}
