// Plain JS jsdom setup for mocha
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };
// minimal localStorage
global.localStorage = {
  _s: {},
  getItem(k){ return this._s[k]||null; },
  setItem(k,v){ this._s[k]=v; },
  removeItem(k){ delete this._s[k]; }
};
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false
});

// Minimal canvas mock for libraries that probe canvas
try {
  const proto = dom.window.HTMLCanvasElement && dom.window.HTMLCanvasElement.prototype;
  if (proto) {
    proto.getContext = function(){
      return {
        // Draw ops – no-ops sufficient for tests
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => ([]),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {}
      };
    };
  }
} catch {}
