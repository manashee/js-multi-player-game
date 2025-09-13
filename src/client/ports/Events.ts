export type InputEvent =
  | { type: 'move'; dir: 'w' | 'a' | 's' | 'd' }
  | { type: 'dig'; amount: number }
  | { type: 'quit' };

export type Action =
  | { type: 'move'; dir: 'w' | 'a' | 's' | 'd' }
  | { type: 'dig'; amount: number };

export type NetEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'state'; payload: unknown };

