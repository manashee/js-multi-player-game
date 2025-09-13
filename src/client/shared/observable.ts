export type Unsubscribe = () => void;

export interface Observable<T> {
  subscribe(handler: (value: T) => void): Unsubscribe;
}

export interface Subject<T> extends Observable<T> {
  next: (value: T) => void;
}

export function createSubject<T>(): Subject<T> {
  const handlers = new Set<(value: T) => void>();
  return {
    subscribe(handler: (value: T) => void) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    next(value: T) {
      handlers.forEach((h) => h(value));
    },
  };
}

