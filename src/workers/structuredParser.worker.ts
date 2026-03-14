/**
 * Web Worker para parseStructuredText
 * 
 * Isola o parser síncrono (3500+ linhas de regex) em thread separada,
 * impedindo que a UI congele em caso de catastrophic backtracking.
 * O componente pai controla o timeout e faz worker.terminate() se necessário.
 */

import { parseStructuredText, type ParseResult } from '@/utils/structuredTextParser';

self.onmessage = (event: MessageEvent<{ text: string }>) => {
  const { text } = event.data;
  try {
    const result: ParseResult = parseStructuredText(text);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
