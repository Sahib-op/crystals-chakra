export const DEFAULT_READING_ORDER = 1000;
export const READING_COLOR_HEX = /#[0-9a-fA-F]{6}/;
export const isReadingHex = (value: string) =>
  value.length === 7 && READING_COLOR_HEX.test(value);
export const readingCardColor = (id: string, color?: string) =>
  color && color !== 'default' ? color : id === 'bhrigu' ? 'burgundy' : 'navy';
