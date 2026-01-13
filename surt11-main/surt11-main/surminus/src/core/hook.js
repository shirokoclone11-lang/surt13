import { outer, outerDocument } from '@/core/outer.js';

// Object wrapper for compatibility
export const object = {};
for (const prop of Object.getOwnPropertyNames(Object)) {
  object[prop] = Object[prop];
}

// Reflect wrapper for compatibility
export const reflect = {};
for (const prop of Object.getOwnPropertyNames(Reflect)) {
  reflect[prop] = Reflect[prop];
}

export const spoof = new WeakMap();

export function hook(object, name, handler) {
  try {
    const original = object[name];
    const hooked = new Proxy(original, handler);
    spoof.set(hooked, original);
    Object.defineProperty(object, name, {
      value: hooked,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  } catch (e) {
    console.error(`Failed to hook ${name}:`, e);
  }
}

export function getnative(func) {
  let current = func;
  const seen = new WeakSet();
  while (spoof.has(current)) {
    if (seen.has(current)) break;
    seen.add(current);
    current = spoof.get(current);
  }
  return current;
}

export function ishooked(func) {
  return spoof.has(func);
}

export function restore(object, name) {
  try {
    const native = getnative(object[name]);
    Object.defineProperty(object, name, {
      value: native,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  } catch (e) {
    console.error(`Failed to restore ${name}:`, e);
  }
}

hook(outer.Function.prototype, 'toString', {
  apply(f, th, args) {
    return Reflect.apply(f, spoof.get(th) || th, args);
  },
});

hook(outer.Element.prototype, 'attachShadow', {
  apply(f, th, args) {
    const [options = {}] = args;
    if (options.mode === 'closed') {
      return Reflect.apply(f, th, args);
    }
    return Reflect.apply(f, th, args);
  },
});

hook(outer, 'Proxy', {
  construct(f, args) {
    return Reflect.construct(f, args);
  },
});

export const ref_addEventListener = EventTarget.prototype.addEventListener;
export const ref_removeEventListener = EventTarget.prototype.removeEventListener;
export const proxy = Proxy;

export let mahdiFunctionConstructor = (...args) => {
  try {
    const gen = function* () { }.prototype.constructor.constructor(...args)();
    return gen.next.bind(gen);
  } catch (e) {
    console.error('Error in mahdiFunctionConstructor:', e);
    return null;
  }
};

export const FONT_NAME = Array.from(
  { length: 12 },
  () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 52)]
).join('');

const fonts = outerDocument.fonts;

const isOurFont = (font) => {
  try {
    return font && typeof font === 'object' && font.family === FONT_NAME;
  } catch {
    return false;
  }
};

const sizeDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(fonts), 'size');
if (sizeDescriptor && sizeDescriptor.get) {
  const originalSizeGetter = sizeDescriptor.get;
  sizeDescriptor.get = new Proxy(originalSizeGetter, {
    apply(f, th, args) {
      try {
        const actualSize = Reflect.apply(f, th, args);
        return Math.max(0, actualSize - 5);
      } catch {
        return 0;
      }
    },
  });
  Object.defineProperty(Object.getPrototypeOf(fonts), 'size', sizeDescriptor);
}

hook(fonts, 'values', {
  apply(f, th, args) {
    const originalIterator = Reflect.apply(f, th, args);
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let result = originalIterator.next();
        while (!result.done && isOurFont(result.value)) {
          result = originalIterator.next();
        }
        return result;
      },
    };
  },
});

hook(fonts, 'entries', {
  apply(f, th, args) {
    const originalIterator = Reflect.apply(f, th, args);
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let result = originalIterator.next();
        while (!result.done && isOurFont(result.value[0])) {
          result = originalIterator.next();
        }
        return result;
      },
    };
  },
});

hook(fonts, 'keys', {
  apply(f, th, args) {
    const originalIterator = Reflect.apply(f, th, args);
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let result = originalIterator.next();
        while (!result.done && isOurFont(result.value)) {
          result = originalIterator.next();
        }
        return result;
      },
    };
  },
});

hook(fonts, 'forEach', {
  apply(f, th, args) {
    const [callback, context] = args;
    const wrappedCallback = function (value, key, set) {
      if (!isOurFont(value)) {
        callback.call(context, value, key, set);
      }
    };
    return Reflect.apply(f, th, [wrappedCallback, context]);
  },
});

hook(fonts, 'has', {
  apply(f, th, args) {
    const [font] = args;
    if (isOurFont(font)) return false;
    return Reflect.apply(f, th, args);
  },
});

hook(fonts, 'delete', {
  apply(f, th, args) {
    const [font] = args;
    if (isOurFont(font)) return false;
    return Reflect.apply(f, th, args);
  },
});

hook(fonts, 'check', {
  apply(f, th, args) {
    const [font, text] = args;
    if (font && font.includes(FONT_NAME)) return false;
    return Reflect.apply(f, th, args);
  },
});

hook(fonts, Symbol.iterator, {
  apply(f, th, args) {
    const originalIterator = Reflect.apply(f, th, args);
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let result = originalIterator.next();
        while (!result.done && isOurFont(result.value)) {
          result = originalIterator.next();
        }
        return result;
      },
    };
  },
});
