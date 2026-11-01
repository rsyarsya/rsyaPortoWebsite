import { describe, expect, it } from 'vitest';
import { translateText } from '../src/lib/translations';

describe('English and Indonesian site copy', () => {
  it('keeps the original English, including whitespace, as the default copy', () => {
    const source = '  Send message\n';
    expect(translateText(source, 'en')).toBe(source);
    expect(translateText(source, 'id')).toBe('  Kirim pesan\n');
  });

  it('localizes multi-line source paragraphs without requiring identical formatting', () => {
    expect(translateText('Name and website are optional.\n   Notes appear here after approval.', 'id'))
      .toBe('Nama dan situs web boleh dikosongkan. Pesan ditampilkan setelah disetujui.');
  });

  it('localizes live validation, counters and playback states', () => {
    expect(translateText('Enter a message.', 'id')).toBe('Masukkan pesan.');
    expect(translateText('999 characters left', 'id')).toBe('Sisa 999 karakter');
    expect(translateText('1 character left', 'id')).toBe('Sisa 1 karakter');
    expect(translateText('24 lines', 'id')).toBe('24 garis');
    expect(translateText('Last played 12 min ago via Last.fm', 'id')).toBe('Terakhir diputar 12 menit lalu melalui Last.fm');
    expect(translateText('Now playing on Spotify', 'id')).toBe('Sedang diputar melalui Spotify');
  });

  it('keeps literal characters in search terms and falls back safely for unknown copy', () => {
    expect(translateText('No commands match “$&”.', 'id')).toBe('Tidak ada perintah untuk “$&”.');
    expect(translateText('No commands match “May”.', 'id')).toBe('Tidak ada perintah untuk “May”.');
    for (const unknown of ['HydroConnect', 'OSTOSENSE', 'constructor', 'toString', '__proto__']) {
      expect(translateText(unknown, 'id')).toBe(unknown);
    }
  });
});
