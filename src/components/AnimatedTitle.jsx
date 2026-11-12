import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedTitle({
  text,
  as: Heading = 'h1',
  className = '',
  goldWord = '',
  startDelay = 0,
}) {
  const reducedMotion = useReducedMotion();
  const words = useMemo(() => {
    let charIndex = 0;
    return text.split(' ').map((word, wi) => {
      const isGold =
        word === goldWord || word === goldWord.replace(/[^a-zA-Z]/g, '');
      const chars = [];
      for (let i = 0; i < word.length; i++) {
        chars.push({ char: word[i], isGold, index: charIndex });
        charIndex++;
      }
      return { chars, index: wi };
    });
  }, [text, goldWord]);

  return (
    <Heading
      aria-label={text}
      className={`${className} flex flex-wrap justify-center gap-x-[0.25em]`}
    >
      {words.map((word) => (
        <span
          aria-hidden="true"
          key={word.index}
          className="inline-flex whitespace-nowrap"
        >
          {word.chars.map((l) => (
            <span
              key={l.index}
              className="overflow-hidden inline-flex relative leading-[1.2] pt-2 -mt-2"
            >
              <motion.span
                className={`${l.isGold ? 'gold-gradient-text' : ''} inline-block`}
                initial={{ y: reducedMotion ? '0%' : '100%' }}
                animate={{ y: '0%' }}
                transition={{
                  duration: 0.4,
                  delay:
                    startDelay +
                    l.index * Math.max(0.001, 0.4 / Math.max(text.length, 1)),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {l.char}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </Heading>
  );
}
