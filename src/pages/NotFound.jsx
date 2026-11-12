import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import CosmicBackground from '../components/CosmicBackground';

export default function NotFound() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-chakra-bg overflow-x-hidden flex flex-col">
      <PageMeta
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
      />

      {/* Animated constellation background with parallax */}
      <CosmicBackground parallaxOffset={scrollY} />

      <div className="relative z-10 pt-20 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-8 min-h-[80vh] flex flex-col items-center justify-center text-center">
        <span className="text-9xl font-serif font-bold gold-gradient-text mb-4">
          404
        </span>
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">
          Lost in the Cosmos
        </h1>
        <p className="text-chakra-muted text-lg max-w-md mb-10">
          The stars couldn't find this page. It may have moved, or perhaps it
          was never written in your destiny.
        </p>
        <Link
          to="/"
          className="bg-chakra-cyan hover:bg-chakra-blue text-chakra-bg font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
