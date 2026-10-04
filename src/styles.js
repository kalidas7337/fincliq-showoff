export const themes = Object.freeze({
  green: Object.freeze({
    name: 'FINCLIQ Green', background: '#07110B', foreground: '#C8F7D4',
    accent: '#39FF88', secondary: '#54DCFF', tertiary: '#C49BFF', highlight: '#FFD166',
    muted: '#7BBF91', warning: '#FFD166', error: '#FF6B6B',
    nativeAccent: 'Green', nativeSecondary: 'Cyan', nativeTertiary: 'Magenta',
  }),
  aurora: Object.freeze({
    name: 'FINCLIQ Aurora', background: '#0B1020', foreground: '#E2E8FF',
    accent: '#58E1FF', secondary: '#AB91FF', tertiary: '#FF87C7', highlight: '#70F0B4',
    muted: '#8C9DBF', warning: '#FFD580', error: '#FF738D',
    nativeAccent: 'Cyan', nativeSecondary: 'Magenta', nativeTertiary: 'Green',
  }),
  neon: Object.freeze({
    name: 'FINCLIQ Neon', background: '#120B1C', foreground: '#F2E8FF',
    accent: '#FF70DB', secondary: '#70EAFF', tertiary: '#C0FF77', highlight: '#FFCF70',
    muted: '#AB90B8', warning: '#FFCF70', error: '#FF7373',
    nativeAccent: 'Magenta', nativeSecondary: 'Cyan', nativeTertiary: 'Green',
  }),
  amber: Object.freeze({
    name: 'FINCLIQ Amber', background: '#17100A', foreground: '#FFF0D2',
    accent: '#FFCB6B', secondary: '#FF9966', tertiary: '#78DECF', highlight: '#C0AAFF',
    muted: '#B79B7A', warning: '#FFE08A', error: '#FF7777',
    nativeAccent: 'Yellow', nativeSecondary: 'Cyan', nativeTertiary: 'Magenta',
  }),
});

export const artStyles = Object.freeze(['block', 'circuit', 'classic']);
export const theme = themes.green;

export function getTheme(name = 'green') {
  if (!Object.hasOwn(themes, name)) throw new Error(`Unknown theme: ${name}. Choose ${Object.keys(themes).join(', ')}.`);
  return themes[name];
}

export function validateArt(name) {
  if (!artStyles.includes(name)) throw new Error(`Unknown art style: ${name}. Choose ${artStyles.join(', ')}.`);
}

// Five-row ASCII glyphs, drawn locally without external fonts or dependencies.
const glyphs = {
  A: [' ### ', '#   #', '#####', '#   #', '#   #'],
  B: ['#### ', '#   #', '#### ', '#   #', '#### '],
  C: [' ### ', '#   #', '#    ', '#   #', ' ### '],
  D: ['#### ', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#### ', '#    ', '#####'],
  F: ['#####', '#    ', '#### ', '#    ', '#    '],
  G: [' ### ', '#    ', '# ###', '#   #', ' ### '],
  H: ['#   #', '#   #', '#####', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['#####', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#  ##', ' ####'],
  R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
  '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '#####'],
  '2': [' ### ', '#   #', '   # ', '  #  ', '#####'],
  '3': ['#### ', '    #', ' ### ', '    #', '#### '],
  '4': ['#   #', '#   #', '#####', '    #', '    #'],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
  '-': ['     ', '     ', '#####', '     ', '     '],
};

export function renderArt(brand, style = 'block') {
  validateArt(style);
  const letters = [...brand.toUpperCase()];
  if (!letters.length || letters.some((letter) => !Object.hasOwn(glyphs, letter))) return null;
  return Array.from({ length: 5 }, (_, row) => letters.map((letter) => {
    const glyph = glyphs[letter];
    return [...glyph[row]].map((pixel, col) => {
      if (pixel === ' ') return pixel;
      if (style === 'classic') return letter;
      if (style === 'block') return '#';
      const horizontal = glyph[row][col - 1] === '#' || glyph[row][col + 1] === '#';
      const vertical = glyph[row - 1]?.[col] === '#' || glyph[row + 1]?.[col] === '#';
      return horizontal && vertical ? '+' : horizontal ? '=' : vertical ? '|' : '+';
    }).join('');
  }).join('  '));
}
