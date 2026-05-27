import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Barcode scanners usually fire events very fast. 
      // If we pause for more than 50ms, reset the buffer.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length > 3) {
          onScan(bufferRef.current);
          e.preventDefault();
        }
        bufferRef.current = '';
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, 50); // 50ms timeout for scanner
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan]);
}
