// Type declaration for pg (pure ESM package with no bundled types)
// Silences TS7016: Could not find a declaration file for module 'pg'

declare module 'pg' {
  import { EventEmitter } from 'node:events';

  export class Pool extends EventEmitter {
    constructor(options?: any);
    query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }

  export class PoolClient {
    query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
    release(): void;
  }

  const _default: { Pool: typeof Pool; PoolClient: typeof PoolClient };
  export default _default;
  export { Pool, PoolClient };
}
