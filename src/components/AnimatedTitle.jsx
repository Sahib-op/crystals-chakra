import { useMemo } from 'react';

// Letters rise into place one after another. Pure CSS (see .title-char in
// refinements.css), so it plays on prerendered HTML even before JavaScript
// hydrates; reduced-motion preferences show the title at rest.
export default function AnimatedTitle({
  text,
  as: Heading = 'h1',
  className = '',
  goldWord = '',
  startDelay = 0,
}) {
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
  const step = Math.max(0.001, 0.4 / Math.max(text.length, 1));

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
              <span
                className={`${l.isGold ? 'gold-gradient-text' : ''} title-char inline-block`}
                style={{ '--delay': `${startDelay + l.index * step}s` }}
              >
                {l.char}
              </span>
            </span>
          ))}
        </span>
      ))}
    </Heading>
  );
}
