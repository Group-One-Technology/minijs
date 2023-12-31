export default class MiniArray extends Array {
  constructor(...args) {
    super(...args);
  }

  get first() {
    return this[0];
  }

  get last() {
    return this.at(-1);
  }
  
  nextItem(item) {
    const nextIndex = this.indexOf(item) + 1;
    return nextIndex >= this.length ? this.first : this.at(nextIndex);
  }

  previousItem(item) {
    const previousIndex = this.indexOf(item) - 1;
    return previousIndex < 0 ? this.last : this.at(previousIndex);
  }

  toggle(value) {
    let newValue;

    if (Array.isArray(value)) {
      newValue = value;
    } else {
      let index = this.indexOf(value);
      if (index === -1) {
        newValue = this.concat(value);
      } else {
        newValue = this.slice(0, index).concat(this.slice(index + 1));
      }
    }

    return new MiniArray(...newValue);
  }

  add(value) {
    let index = this.indexOf(value);
    if (index !== -1) return this;

    const newValue = this.concat(value);
    
    return new MiniArray(...newValue);
  }

  remove(value) {
    let index = this.indexOf(value);
    if (index === -1) return this;

    const newValue = this.slice(0, index).concat(this.slice(index + 1));
    
    return new MiniArray(...newValue);
  }

  subtract(arr) {
    return new MiniArray(...this.filter(item => !arr.includes(item)));
  }

  search(query) {
    const normalizedQuery = query.toLowerCase().split(/\s+/);

    const matches = this.filter(item => {
      const lowercaseItem = item.toLowerCase();
      return normalizedQuery.every(word => lowercaseItem.includes(word));
    });

    return new MiniArray(...matches);
  }
}