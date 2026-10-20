// @mono.co/connect.js ships without types; just what this app uses.
declare module "@mono.co/connect.js" {
  type Options = {
    key: string;
    scope?: "auth" | "payments";
    data?: Record<string, unknown>;
    reference?: string;
    onSuccess: (data: { code: string }) => void;
    onClose?: () => void;
    onLoad?: () => void;
    onEvent?: (eventName: string, data: unknown) => void;
  };
  export default class MonoConnect {
    constructor(options: Options);
    setup(config?: Record<string, unknown>): void;
    reauthorise(accountId: string): void;
    open(): void;
    close(): void;
  }
}
