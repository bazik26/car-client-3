/**
 * Утилита для генерации уникального фингерпринта браузера
 * Использует различные характеристики браузера для создания уникального идентификатора
 */

export class FingerprintUtil {
  private static instance: FingerprintUtil;
  private fingerprint: string | null = null;

  private constructor() {}

  static getInstance(): FingerprintUtil {
    if (!FingerprintUtil.instance) {
      FingerprintUtil.instance = new FingerprintUtil();
    }
    return FingerprintUtil.instance;
  }

  /**
   * Генерирует уникальный фингерпринт браузера
   */
  async generateFingerprint(): Promise<string> {
    if (this.fingerprint) {
      return this.fingerprint;
    }

    try {
      const components = await Promise.all([
        this.getScreenInfo(),
        this.getBrowserInfo(),
        this.getTimezoneInfo(),
        this.getLanguageInfo(),
        this.getCanvasFingerprint(),
        this.getWebGLFingerprint(),
        this.getAudioFingerprint(),
        this.getFontsFingerprint()
      ]);

      // Создаем хеш из всех компонентов
      const combined = components.join('|');
      this.fingerprint = await this.hashString(combined);
      
      console.log('Fingerprint generated:', this.fingerprint);
      return this.fingerprint;
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      // Fallback - используем случайный ID
      this.fingerprint = 'fp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      return this.fingerprint;
    }
  }

  /**
   * Информация об экране
   */
  private getScreenInfo(): string {
    const screen = window.screen;
    return [
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      screen.availWidth,
      screen.availHeight
    ].join(',');
  }

  /**
   * Информация о браузере
   */
  private getBrowserInfo(): string {
    const nav = navigator;
    return [
      nav.userAgent,
      nav.platform,
      nav.language,
      nav.languages?.join(',') || '',
      nav.cookieEnabled ? '1' : '0',
      nav.doNotTrack || '0',
      nav.maxTouchPoints || '0'
    ].join(',');
  }

  /**
   * Информация о часовом поясе
   */
  private getTimezoneInfo(): string {
    const date = new Date();
    return [
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      date.getTimezoneOffset(),
      date.getHours(),
      date.getMinutes()
    ].join(',');
  }

  /**
   * Информация о языках
   */
  private getLanguageInfo(): string {
    return [
      navigator.language,
      navigator.languages?.join(',') || '',
      document.documentElement.lang || ''
    ].join(',');
  }

  /**
   * Canvas fingerprint
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no_canvas';

      canvas.width = 200;
      canvas.height = 50;

      // Рисуем текст
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Fingerprint', 4, 17);

      return canvas.toDataURL();
    } catch (error) {
      return 'canvas_error';
    }
  }

  /**
   * WebGL fingerprint
   */
  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no_webgl';

      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      const version = gl.getParameter(gl.VERSION);
      const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

      return [renderer, vendor, version, shadingLanguageVersion].join(',');
    } catch (error) {
      return 'webgl_error';
    }
  }

  /**
   * Audio fingerprint
   */
  private getAudioFingerprint(): string {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);
      const fingerprint = analyser.frequencyBinCount.toString();
      oscillator.stop();
      audioContext.close();

      return fingerprint;
    } catch (error) {
      return 'audio_error';
    }
  }

  /**
   * Fonts fingerprint
   */
  private getFontsFingerprint(): string {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond',
      'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas_fonts';

    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const h = canvas.height = 60;
    const w = canvas.width = 240;

    ctx.textBaseline = 'top';
    ctx.font = testSize + ' monospace';
    ctx.fillText(testString, 0, 0);
    const baseWidths = baseFonts.map(font => {
      ctx.font = testSize + ' ' + font;
      return ctx.measureText(testString).width;
    });

    const detectedFonts = testFonts.filter(font => {
      const detected = baseFonts.some((baseFont, index) => {
        ctx.font = testSize + ' ' + font + ', ' + baseFont;
        return ctx.measureText(testString).width !== baseWidths[index];
      });
      return detected;
    });

    return detectedFonts.join(',');
  }

  /**
   * Хеширование строки
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Получить сохраненный фингерпринт из localStorage
   */
  getStoredFingerprint(): string | null {
    return localStorage.getItem('user_fingerprint');
  }

  /**
   * Сохранить фингерпринт в localStorage
   */
  storeFingerprint(fingerprint: string): void {
    localStorage.setItem('user_fingerprint', fingerprint);
  }

  /**
   * Очистить сохраненный фингерпринт
   */
  clearStoredFingerprint(): void {
    localStorage.removeItem('user_fingerprint');
    this.fingerprint = null;
  }
}
