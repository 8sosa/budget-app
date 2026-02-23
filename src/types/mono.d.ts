// src/types/mono.d.ts
declare module '@mono.co/connect.js' {
  export interface MonoConfig {
    key: string; // Note: The SDK uses 'key', not 'publicKey'
    onClose?: () => void;
    onLoad?: () => void;
    onSuccess?: (data: { code: string }) => void;
    onEvent?: (eventName: string, data: any) => void;
    reference?: string;
  }

  export default class Connect {
    constructor(config: MonoConfig);
    setup(config?: any): void;
    open(): void;
    close(): void;
  }
}