// src/utils/MaxHeap.ts
// Generic max-heap with fixed capacity, preserving the N smallest elements by comparator logic.
export default class MaxHeap<T> {
  private data: T[];
  private compare: (a: T, b: T) => number;
  private maxSize: number;

  constructor(compare: (a: T, b: T) => number, maxSize: number) {
    this.compare = compare;
    this.maxSize = maxSize;
    this.data = [];
  }

  /**
   * Inserts an item into the heap. If at capacity, replaces the root if the new item is better.
   */
  push(item: T): void {
    if (this.data.length < this.maxSize) {
      this.data.push(item);
      this.bubbleUp(this.data.length - 1);
    } else if (this.compare(item, this.data[0]) < 0) {
      // New item has lower comparator value (better), replace root
      this.data[0] = item;
      this.bubbleDown(0);
    }
  }

  /**
   * Returns the current heap contents (unordered).
   */
  getItems(): T[] {
    return [...this.data];
  }

  /**
   * Returns the number of elements in the heap.
   */
  size(): number {
    return this.data.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.data[index], this.data[parent]) > 0) {
        [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]];
        index = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const last = this.data.length - 1;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let largest = index;

      if (left <= last && this.compare(this.data[left], this.data[largest]) > 0) {
        largest = left;
      }
      if (right <= last && this.compare(this.data[right], this.data[largest]) > 0) {
        largest = right;
      }
      if (largest !== index) {
        [this.data[index], this.data[largest]] = [this.data[largest], this.data[index]];
        index = largest;
      } else {
        break;
      }
    }
  }
}
