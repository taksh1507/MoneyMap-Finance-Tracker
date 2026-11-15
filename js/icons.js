const paths = {
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  wallet:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 10h5v6h-5a3 3 0 0 1 0-6Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  exchange: '<path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5"/>',
  pie: '<path d="M12 3v9h9a9 9 0 1 1-9-9Z"/><path d="M16 3a6 6 0 0 1 5 5h-5Z"/>',
  flag: '<path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
  settings:
    '<path d="m10 3-.7 3-2 .9-2.7-.9-2 3.5 2.2 2v2.2l-2.2 2 2 3.5 2.8-.9 1.9.9.7 3h4l.7-3 2-.9 2.7.9 2-3.5-2.2-2v-2.2l2.2-2-2-3.5-2.8.9-1.9-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
  food: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18m11-18c-4 0-4 10 0 10V3Zm0 10v8"/>',
  bill: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2Zm4 5h6m-6 4h6"/>',
  home: '<path d="m3 10 9-7 9 7v11H3Zm6 11v-8h6v8"/>',
  music:
    '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  bag: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  heart: '<path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z"/>',
  book: '<path d="M12 5C9 2 4 2 2 3v16c4-1 7-1 10 2m0-16c3-3 8-3 10-2v16c-4-1-7-1-10 2V5Z"/>',
  edit: '<path d="m15 4 5 5M3 21l5-1L21 7a3 3 0 0 0-5-5L3 15v6Z"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
};
export function icon(name) {
  return `<svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.wallet}</svg>`;
}
