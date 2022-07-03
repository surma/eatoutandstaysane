export class RingBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = [];
  }

  push(el) {
    this.buffer.push(el);
    this.shiftToSize();
  }

  shiftToSize() {
    while (this.buffer.length > this.size) {
      this.buffer.shift();
    }
  }

  read() {
    return this.buffer.shift();
  }

  values() {
    return this.buffer.values();
  }

  entries() {
    return this.buffer.entries();
  }

  clear() {
    this.buffer = [];
  }

  at(i) {
    if (i < 0) {
      return this.buffer[this.buffer.length - i];
    }
    return this.buffer[i];
  }

  [Symbol.iterator]() {
    return this.buffer[Symbol.iterator]();
  }
}
