import '@testing-library/jest-dom/vitest';

// jsdom no implementa scrollIntoView: sin esto, cualquier componente que lleve
// la vista al final de una lista revienta en los tests y el DOM queda vacío.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
