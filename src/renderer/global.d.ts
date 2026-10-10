import type { ReportForgeApi } from '../preload';

declare global {
  interface Window {
    reportForge: ReportForgeApi;
  }
}

export {};
