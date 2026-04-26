// frontend/src/global.d.ts
// frontend/src/global.d.ts
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}