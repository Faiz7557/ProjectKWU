import { describe, it, expect } from 'vitest';
import { VoiceCommandListener } from '../voice-commands';

describe('Two-Way Voice Commands Parser', () => {
  const listener = new VoiceCommandListener();

  it('correctly maps Indonesian pause phrases', () => {
    expect(listener.parseTranscript('tolong jeda sebentar')).toBe('pause');
    expect(listener.parseTranscript('pause dulu')).toBe('pause');
    expect(listener.parseTranscript('stop')).toBe('pause');
    expect(listener.parseTranscript('istirahat')).toBe('pause');
  });

  it('correctly maps Indonesian resume phrases', () => {
    expect(listener.parseTranscript('lanjut lagi')).toBe('resume');
    expect(listener.parseTranscript('resume')).toBe('resume');
    expect(listener.parseTranscript('teruskan')).toBe('resume');
  });

  it('correctly maps Indonesian start phrases', () => {
    expect(listener.parseTranscript('mulai sekarang')).toBe('start');
    expect(listener.parseTranscript('ayo mulai')).toBe('start');
    expect(listener.parseTranscript('gas')).toBe('start');
    expect(listener.parseTranscript('saya sudah siap')).toBe('start');
  });

  it('correctly maps Indonesian finish phrases', () => {
    expect(listener.parseTranscript('selesai latihan')).toBe('finish');
    expect(listener.parseTranscript('sudah kelar')).toBe('finish');
    expect(listener.parseTranscript('finish')).toBe('finish');
  });

  it('returns null for unrelated phrases', () => {
    expect(listener.parseTranscript('halo apa kabar')).toBeNull();
    expect(listener.parseTranscript('berapa repetisi saya')).toBeNull();
  });
});
