var e = Object.defineProperty,
  t = (t, r, i) =>
    ((t, r, i) =>
      r in t ? e(t, r, { enumerable: !0, configurable: !0, writable: !0, value: i }) : (t[r] = i))(
      t,
      'symbol' != typeof r ? r + '' : r,
      i
    );
import { jsx as r, jsxs as i, Fragment as a } from 'react/jsx-runtime';
import n, {
  useState as o,
  useEffect as s,
  useRef as l,
  memo as c,
  useMemo as h,
  useCallback as d,
} from 'react';
import m from 'react-dom/server';
import {
  motion as g,
  useAnimation as u,
  AnimatePresence as p,
  useViewportScroll as f,
  useTransform as w,
} from 'framer-motion';
import { IconFolder as y } from '@tabler/icons-react';
import { useSpring as v, animated as x } from 'react-spring';
import _ from 'yet-another-react-lightbox';
import M from 'gsap';
import { ScrollTrigger as b } from 'gsap/ScrollTrigger.js';
import { CustomEase as N } from 'gsap/CustomEase.js';
import E from 'yet-another-react-lightbox/plugins/captions';
import C from 'yet-another-react-lightbox/plugins/counter';
import I from 'yet-another-react-lightbox/plugins/zoom';
import R from 'yet-another-react-lightbox/plugins/thumbnails';
import { openDB as k } from 'idb';
import $ from 'react-masonry-css';
import G from 'react-slick';
import { FaChevronRight as z, FaChevronLeft as A } from 'react-icons/fa';
import S from 'axios';
const L = '_sidebar_1d71g_2',
  T = '_logo_1d71g_7',
  P = '_folderList_1d71g_12',
  W = '_folderItem_1d71g_17',
  Y = '_folderButton_1d71g_22',
  B = '_selectedFolder_1d71g_30',
  D = '_uploadButton_1d71g_35',
  F = ({ folders: e, selectedFolder: t, onFolderChange: a }) =>
    r(g.div, {
      initial: { x: -300 },
      animate: { x: 0 },
      transition: { type: 'spring', stiffness: 120 },
      className: L,
      children: i('div', {
        className: `${L} flex flex-col h-full`,
        children: [
          r('div', { className: T, children: 'Lora Finder' }),
          r('ul', {
            className: `${P} flex-grow overflow-y-auto`,
            children: e.map(e =>
              r(
                'li',
                {
                  className: W,
                  children: r('button', {
                    onClick: () => a(e.name),
                    className: `${Y} ${t === e.name ? B : ''}`,
                    children: e.name,
                  }),
                },
                e.name
              )
            ),
          }),
          r('div', {
            className: 'p-8 mt-auto',
            children: r('button', { className: `${D} w-full`, children: 'Upload' }),
          }),
        ],
      }),
    }),
  H = ({ currentDirectory: e }) =>
    i(g.button, {
      className:
        'flex items-center bg-gray-700 px-3 py-1 rounded-md text-peach text-sm hover:bg-gray-600 transition-all duration-300 ease-in-out',
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
      children: [
        r(y, { size: 16, className: 'mr-2 text-yellow-500' }),
        r(g.div, {
          className: 'truncate max-w-xs',
          initial: { clipPath: 'circle(0% at 50% 50%)' },
          animate: { clipPath: 'circle(100% at 50% 50%)' },
          transition: { duration: 0.5 },
          children: r('span', { children: e }),
        }),
      ],
    }),
  O = '_searchBarContainer_3g2eh_1',
  X = '_searchBackground_3g2eh_19',
  j = '_searchInput_3g2eh_41',
  q = ({ onSearch: e }) => {
    const [t, a] = o('');
    u();
    return i(g.form, {
      onSubmit: r => {
        r.preventDefault(), e(t);
      },
      className: O,
      initial: { width: '200px' },
      animate: { width: t ? '300px' : '200px' },
      transition: { type: 'spring', stiffness: 300, damping: 30 },
      children: [
        r(g.div, {
          className: X,
          animate: {
            background: t
              ? 'linear-gradient(90deg, #4a00e0 0%, #8e2de2 100%)'
              : 'rgba(255, 255, 255, 0.1)',
          },
        }),
        r(g.input, {
          type: 'text',
          value: t,
          onChange: e => a(e.target.value),
          className: j,
          placeholder: 'Search the future...',
          whileFocus: { scale: 1.05 },
          transition: { type: 'spring', stiffness: 400, damping: 30 },
        }),
      ],
    });
  },
  Z = ({ zoom: e, onZoomChange: t }) => {
    const [a, n] = o(!1),
      l = u(),
      c = v({
        width: ((e - 0.5) / 1.5) * 100 + '%',
        config: { tension: 300, friction: 10, precision: 0.01 },
      }),
      h = v({ opacity: a ? 1 : 0.6, scale: a ? 1.1 : 1, config: { tension: 300, friction: 20 } });
    return (
      s(() => {
        l.start({
          scale: a ? 1.05 : 1,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        });
      }, [a, l]),
      i(g.div, {
        className:
          'relative flex items-center bg-gray-800/80 backdrop-blur-md rounded-full p-3 overflow-hidden',
        style: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '200px' },
        animate: l,
        children: [
          i(g.div, {
            className: 'relative',
            whileHover: { scale: 1.2 },
            whileTap: { scale: 0.95 },
            onClick: () => t(Math.max(0.5, e - 0.1)),
            children: [
              r(g.svg, {
                className: 'text-gray-200 mr-3 cursor-pointer',
                width: '20',
                height: '20',
                viewBox: '0 0 24 24',
                fill: 'none',
                xmlns: 'http://www.w3.org/2000/svg',
                whileHover: { rotate: -90 },
                transition: { duration: 0.3 },
                children: r('path', {
                  d: 'M21 21L16.65 16.65M11 8V14M8 11H14M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }),
              }),
              r(x.div, {
                style: {
                  ...h,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '30px',
                  height: '30px',
                  background:
                    'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                },
              }),
            ],
          }),
          i('div', {
            className: 'relative flex-1 h-2 bg-gray-700 rounded-full overflow-hidden',
            children: [
              r(x.div, {
                className: 'absolute top-0 left-0 h-full bg-blue-500 rounded-full',
                style: { ...c, boxShadow: '0 0 10px rgba(59,130,246,0.5)' },
              }),
              r('input', {
                type: 'range',
                min: '0.5',
                max: '2',
                step: '0.1',
                value: e,
                onChange: e => t(parseFloat(e.target.value)),
                onMouseDown: () => n(!0),
                onMouseUp: () => n(!1),
                onTouchStart: () => n(!0),
                onTouchEnd: () => n(!1),
                className: 'absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer',
              }),
            ],
          }),
          i(g.div, {
            className: 'relative',
            whileHover: { scale: 1.2 },
            whileTap: { scale: 0.95 },
            onClick: () => t(Math.min(2, e + 0.1)),
            children: [
              r(g.svg, {
                className: 'text-gray-200 ml-3 cursor-pointer',
                width: '20',
                height: '20',
                viewBox: '0 0 24 24',
                fill: 'none',
                xmlns: 'http://www.w3.org/2000/svg',
                whileHover: { rotate: 90 },
                transition: { duration: 0.3 },
                children: r('path', {
                  d: 'M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }),
              }),
              r(x.div, {
                style: {
                  ...h,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '30px',
                  height: '30px',
                  background:
                    'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                },
              }),
            ],
          }),
        ],
      })
    );
  };
var U = (e => (
  (e.GRID = 'grid'), (e.BANNER = 'banner'), (e.MASONRY = 'masonry'), (e.CAROUSEL = 'carousel'), e
))(U || {});
const V = '_navbar_550aa_2',
  Q = '_leftSection_550aa_10',
  J = '_rightSection_550aa_15',
  K = '_navbarBackground_550aa_19',
  ee = '_viewToggleButton_550aa_45',
  te = '_viewModeButtons_550aa_55',
  re = '_viewModeButton_550aa_55',
  ie = '_active_550aa_73',
  ae = ({
    currentDirectory: e,
    onSearch: t,
    zoom: a,
    onZoomChange: n,
    isGrouped: o,
    onGroupToggle: c,
    viewMode: h,
    onViewModeChange: d,
  }) => {
    const m = l(null);
    return (
      s(() => {
        const e = m.current;
        if (e) {
          (() => {
            const t = e.querySelector('path');
            if (t) {
              const e = t.getTotalLength();
              (t.style.strokeDasharray = `${e} ${e}`),
                (t.style.strokeDashoffset = `${e}`),
                t.getBoundingClientRect(),
                (t.style.transition = 'stroke-dashoffset 2s ease-in-out'),
                (t.style.strokeDashoffset = '0');
            }
          })();
        }
      }, []),
      i(g.div, {
        className: V,
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
        children: [
          r('svg', {
            ref: m,
            className: K,
            children: r('path', {
              d: 'M0,0 Q50,20 100,10 T200,30 T300,5 T400,25 V100 Q350,80 300,90 T200,70 T100,95 T0,75 Z',
            }),
          }),
          i('div', {
            className: Q,
            children: [r(H, { currentDirectory: e }), r(q, { onSearch: t })],
          }),
          i('div', {
            className: J,
            children: [
              r('div', {
                className: te,
                children: Object.values(U).map(e =>
                  r(
                    g.button,
                    {
                      onClick: () => d(e),
                      className: `${re} ${h === e ? ie : ''}`,
                      whileHover: { scale: 1.05 },
                      whileTap: { scale: 0.95 },
                      children: e.charAt(0).toUpperCase() + e.slice(1),
                    },
                    e
                  )
                ),
              }),
              r(g.button, {
                onClick: c,
                className: ee,
                whileHover: { scale: 1.05 },
                whileTap: { scale: 0.95 },
                children: o ? 'Ungroup' : 'Group',
              }),
              r(Z, { zoom: a, onZoomChange: n }),
            ],
          }),
        ],
      })
    );
  },
  ne = {
    imageItem: '_imageItem_14bsp_1',
    imageWrapper: '_imageWrapper_14bsp_38',
    image: '_image_14bsp_1',
    imageTitle: '_imageTitle_14bsp_72',
    groupCounter: '_groupCounter_14bsp_89',
    carouselIndicator: '_carouselIndicator_14bsp_108',
    loading: '_loading_14bsp_133',
    shimmer: '_shimmer_14bsp_1',
  },
  oe = ({ containerWidth: e, containerHeight: t }) =>
    r('div', {
      className: `${ne.imageItem} ${ne.imageSkeleton}`,
      style: {
        width: e,
        height: t,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: `${e} / ${t}`,
      },
      children: r('div', { className: ne.skeletonAnimation }),
    }),
  se = {
    imageGrid: '_imageGrid_c13qx_2',
    myMasonryGrid: '_myMasonryGrid_c13qx_18',
    myMasonryGridColumn: '_myMasonryGridColumn_c13qx_23',
    imageWrapper: '_imageWrapper_c13qx_28',
    image: '_image_c13qx_2',
    imageTitle: '_imageTitle_c13qx_44',
    smoothTransition: '_smoothTransition_c13qx_49',
    imageFeed: '_imageFeed_c13qx_54',
    imageRow: '_imageRow_c13qx_60',
    visible: '_visible_c13qx_65',
    parallaxLayer: '_parallaxLayer_c13qx_92',
    'masked-image-feed': '_masked-image-feed_c13qx_101',
    'image-feed': '_image-feed_c13qx_108',
    feedContent: '_feedContent_c13qx_140',
    waterMask: '_waterMask_c13qx_148',
    ripple: '_ripple_c13qx_158',
    rippleOverlay: '_rippleOverlay_c13qx_167',
  };
function le(e) {
  if (!e) return 'Untitled';
  const t = e
    .replace(/\.(preview|thumbnail|jpg|jpeg|png|gif|webp)/gi, '')
    .replace(/[-_.](v\d+|example|intro|concept)[-_.]?\d*/gi, '')
    .replace(/[-_.]?(flux|lora|ai|toolkit|preview|example\d*|poster)[-_.]?/gi, ' ')
    .replace(/\.\d+$/, '')
    .replace(/[-_.]?\d{6,}[-_.]?/g, '')
    .replace(/(\d)[-_.](\d)/g, '$1$2')
    .replace(/\s+\d+$/, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(e => (e.match(/^[A-Z]{2,}$/) ? e : e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()))
    .join(' ')
    .trim();
  return t.length > 30 ? t.substring(0, 30) + '...' : t;
}
const ce = 200,
  he = 0.5,
  de = new WeakMap(),
  me = new Map();
const ge = new (class {
    constructor(e) {
      t(this, 'cache'), t(this, 'maxSize'), (this.cache = new Map()), (this.maxSize = e);
    }
    set(e, t, r) {
      if (this.cache.size >= this.maxSize) {
        const e = this.cache.keys().next().value;
        e && this.cache.delete(e);
      }
      this.cache.set(e, { data: t, width: r });
    }
    get(e, t) {
      const r = this.cache.get(e);
      if (r) {
        if (!(Math.abs(r.width - t) > 50)) return r.data;
        this.cache.delete(e);
      }
    }
    clear() {
      this.cache.clear();
    }
  })(100),
  ue = e => {
    const t = 4 * (1 + 0.25 * ((Math.max(he, Math.min(3, e)) - he) / 2.5)),
      r = Math.round(2 * t) / 2;
    return Math.min(Math.max(r, 2), 12);
  },
  pe = e => {
    let t = de.get(e);
    return t || ((t = e.width / e.height), de.set(e, t)), t;
  },
  fe = e => e.map(pe),
  we = (e, t, r, i) => {
    const a = fe(e),
      n = a.reduce((e, t) => e + t, 0),
      o = Math.max(0, (e.length - 1) * i),
      s = Math.max(0, t - o) / n,
      l = a.map(e => Math.floor(s * e));
    return { idealHeight: s, widths: l };
  },
  ye = (e, t, r, i) => {
    const { idealHeight: a, widths: n } = we(e, t, 0, i),
      o = ce * r,
      s = n.every(e => e >= o),
      l = n.reduce((e, t) => e + t, 0) + (e.length - 1) * i;
    return { fits: s && l <= t, idealHeight: a, predictedWidths: n };
  },
  ve = (e, t, r, i = 200) => {
    if (t <= 0 || 0 === e.length) return console.warn('Invalid input detected'), [];
    const a = (e => {
        const t = e.map(e => e.id).join(',');
        if (me.has(t)) return me.get(t);
        const r = [...e].sort((e, t) => e.width / e.height - t.width / t.height);
        return me.set(t, r), r;
      })(e),
      n = ue(r),
      o = [];
    let s = [],
      l = 0;
    for (let c = 0; c < a.length; c++) {
      const e = [...s, a[c]],
        { fits: i, idealHeight: h, predictedWidths: d } = ye(e, t, r, n);
      if (!i && s.length > 0) {
        const { idealHeight: e, widths: r } = we(s, t, 0, n);
        o.push({ width: t, height: Math.floor(e), gap: n, images: s, imageWidths: r, offset: 0 }),
          (s = [a[c]]),
          (l = pe(a[c]));
      } else (s = e), (l += pe(a[c]));
    }
    if (s.length > 0) {
      const { idealHeight: e, widths: r } = we(s, t, 0, n);
      o.push({ width: t, height: Math.floor(e), gap: n, images: s, imageWidths: r, offset: 0 });
    }
    return o;
  },
  xe = e => {
    const { containerWidth: t, zoom: r, viewMode: i, isGrouped: a } = e,
      n = ((e, t) => {
        const r = e / t,
          i = Math.floor(r / (ce * t));
        return Math.min(Math.max(i, 1), 7);
      })(t, r),
      o = ue(r);
    return { columns: n, gap: o, minImageWidth: ce * r, maxImageWidth: t / n - o };
  };
M.registerPlugin(b, N);
const _e = class e {
  constructor() {
    t(this, 'state'),
      t(this, 'MAX_ENERGY', 100),
      t(this, 'MIN_ENERGY', 20),
      t(this, 'ENERGY_DECAY_RATE', 0.95),
      t(this, 'ENERGY_BOOST', 25),
      t(this, 'RIPPLE_DURATION', 1.5),
      t(this, 'BREATHING_INTENSITY', 0.02),
      t(this, 'GRID_SIZE', 200),
      t(this, 'MAX_RIPPLES', 5),
      t(this, 'RIPPLE_LIFETIME', 2e3),
      (this.state = {
        energy: this.MIN_ENERGY,
        activeItems: new Set(),
        timeline: M.timeline(),
        ripples: new Map(),
        spatialGrid: new Map(),
        colorEnergy: 0,
      }),
      this.startEnergyDecay(),
      this.initializeCustomEases();
  }
  initializeCustomEases() {
    N.create('rippleOut', 'M0,0 C0.126,0.382 0.282,0.674 0.44,0.822 0.632,1.002 0.818,1 1,1'),
      N.create('energyPulse', 'M0,0 C0.39,0 0.575,0.565 0.669,0.782 0.762,1 0.846,1 1,1');
  }
  static getInstance() {
    return e.instance || (e.instance = new e()), e.instance;
  }
  startEnergyDecay() {
    M.ticker.add(() => {
      this.state.energy = Math.max(this.MIN_ENERGY, this.state.energy * this.ENERGY_DECAY_RATE);
      const e = Date.now();
      for (const [t, r] of this.state.ripples.entries())
        e - r.timestamp > this.RIPPLE_LIFETIME && this.state.ripples.delete(t);
    });
  }
  addEnergy(e = this.ENERGY_BOOST) {
    this.state.energy = Math.min(this.MAX_ENERGY, this.state.energy + e);
  }
  getEnergy() {
    return this.state.energy;
  }
  getAnimationProperties(e) {
    const t = this.state.energy,
      r = this.state.activeItems.has(e);
    return {
      duration: 0.3 + 0.7 * (1 - t / this.MAX_ENERGY),
      ease: t > 70 ? 'elastic.out(1, 0.3)' : 'power2.out',
      transformOrigin: 'center center',
      scale: 1 + (t / this.MAX_ENERGY) * 0.05,
      rotation: r ? (Math.random() > 0.5 ? 1 : -1) * (t / this.MAX_ENERGY) * 2 : 0,
    };
  }
  calculateRippleEffect(e) {
    const t = e.getBoundingClientRect(),
      r = t.left + t.width / 2,
      i = t.top + t.height / 2;
    let a = { scale: 1, rotation: 0, blur: 0, brightness: 1, translateZ: 0 };
    for (const o of this.state.ripples.values()) {
      const e = Math.hypot(r - o.x, i - o.y),
        t = 0.5 * Math.max(window.innerWidth, window.innerHeight),
        n = Math.max(0, 1 - e / t),
        s = (Date.now() - o.timestamp) / this.RIPPLE_LIFETIME,
        l = o.strength * (1 - s) * n;
      (a.scale += 0.1 * l),
        (a.rotation += 5 * l * (Math.random() > 0.5 ? 1 : -1)),
        (a.blur += 2 * l),
        (a.brightness += 0.1 * l),
        (a.translateZ += 20 * l);
    }
    const n = this.state.energy / this.MAX_ENERGY;
    return (a.scale *= 1 + 0.1 * n), (a.blur *= n), (a.brightness *= 1 + 0.2 * n), a;
  }
  createBreathingAnimation(e, t) {
    const r = M.timeline({ repeat: -1 });
    this.updateSpatialGrid(e, t);
    return (
      M.ticker.add(() => {
        const t = this.calculateRippleEffect(e),
          i = this.state.energy / this.MAX_ENERGY,
          a = this.BREATHING_INTENSITY * (1 + i);
        r.to(e, {
          scale: t.scale * (1 + a),
          rotation: t.rotation,
          filter: `blur(${t.blur}px) brightness(${t.brightness})`,
          transform: `perspective(1000px) translateZ(${t.translateZ}px)`,
          duration: 2,
          ease: 'energyPulse',
        }).to(e, {
          scale: t.scale,
          rotation: 0,
          filter: 'blur(0px) brightness(1)',
          transform: 'perspective(1000px) translateZ(0)',
          duration: 2,
          ease: 'rippleOut',
        });
      }),
      r
    );
  }
  createHoverAnimation(e, t) {
    this.state.activeItems.add(t), this.addEnergy();
    const r = this.state.energy / this.MAX_ENERGY,
      i = this.calculateRippleEffect(e);
    return M.to(e, {
      scale: (1.05 + 0.05 * r) * i.scale,
      rotationX: 10 * Math.random() - 5,
      rotationY: 10 * Math.random() - 5,
      rotation: i.rotation,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        this.state.activeItems.delete(t);
      },
    });
  }
  createProximityAnimation(e, t, r, i) {
    const a = e.getBoundingClientRect(),
      n = a.left + (r * a.width) / 100,
      o = a.top + (i * a.height) / 100;
    this.addRipple(n, o, 0.3);
    const s = 1 - Math.hypot(r - 50, i - 50) / 150,
      l = this.state.energy / this.MAX_ENERGY,
      c = this.calculateRippleEffect(e);
    return M.to(e, {
      duration: 0.5,
      rotationX: 0.1 * (i - 50) * s * l,
      rotationY: 0.1 * (r - 50) * s * l,
      scale: c.scale * (1 + 0.05 * s * l),
      rotation: c.rotation,
      ease: 'power2.out',
      transformOrigin: 'center center',
    });
  }
  createMorphAnimation(e, t) {
    const r = this.state.energy / this.MAX_ENERGY,
      i = this.calculateRippleEffect(e);
    return M.to(e, {
      duration: 0.5,
      scale: i.scale,
      rotation: i.rotation,
      borderRadius: 8 + 12 * r + 'px',
      boxShadow: `0 ${4 + 8 * r}px ${12 + 16 * r}px rgba(0,0,0,${0.1 + 0.1 * r})`,
      ease: 'power2.out',
    });
  }
  updateSpatialGrid(e, t) {
    const r = e.getBoundingClientRect(),
      i = `${Math.floor(r.left / this.GRID_SIZE)},${Math.floor(r.top / this.GRID_SIZE)}`;
    this.state.spatialGrid.forEach((e, r) => {
      e.delete(t), 0 === e.size && this.state.spatialGrid.delete(r);
    }),
      this.state.spatialGrid.has(i) || this.state.spatialGrid.set(i, new Set()),
      this.state.spatialGrid.get(i).add(t);
  }
  getNearbyItems(e) {
    const t = Math.floor(e.x / this.GRID_SIZE),
      r = Math.floor(e.y / this.GRID_SIZE),
      i = new Set();
    for (let a = -1; a <= 1; a++)
      for (let e = -1; e <= 1; e++) {
        const n = `${t + a},${r + e}`,
          o = this.state.spatialGrid.get(n);
        o && o.forEach(e => i.add(e));
      }
    return Array.from(i);
  }
  addRipple(e, t, r = 1) {
    const i = Date.now().toString();
    if (this.state.ripples.size >= this.MAX_RIPPLES) {
      const e = Array.from(this.state.ripples.entries()).sort(
        ([, e], [, t]) => e.timestamp - t.timestamp
      )[0][0];
      this.state.ripples.delete(e);
    }
    this.state.ripples.set(i, { x: e, y: t, strength: r, timestamp: Date.now() });
  }
  updateColorEnergy() {
    const e = (360 * this.state.colorEnergy) % 360;
    document.documentElement.style.setProperty('--energy-hue', e.toString()),
      (this.state.colorEnergy += (this.state.energy / this.MAX_ENERGY) * 0.001);
  }
  getRipples() {
    return Array.from(this.state.ripples.values());
  }
};
t(_e, 'instance');
let Me = _e;
const be = c(
    ({
      image: e,
      onClick: t,
      containerWidth: a,
      containerHeight: n,
      zoom: c,
      groupCount: m,
      imageProcessor: f,
      onResize: w,
      width: y,
      height: v,
      isCarousel: x,
      groupImages: _,
      processedImage: b,
      onRipple: N,
    }) => {
      u();
      const E = l(null),
        C = l(null),
        [I, R] = o(!1),
        [k, $] = o(!1),
        [G, z] = o((null == b ? void 0 : b.low) || e.src),
        A = h(() => Me.getInstance(), []),
        S = l(),
        [L, T] = o(0),
        P = l(),
        W = l(null),
        Y = l({ x: 0, y: 0 }),
        [B, D] = (function (e = {}) {
          const [t, r] = o(!1),
            i = l(null);
          return (
            s(() => {
              const t = new IntersectionObserver(([e]) => {
                r(e.isIntersecting);
              }, e);
              return (
                i.current && t.observe(i.current),
                () => {
                  i.current && t.unobserve(i.current);
                }
              );
            }, [e]),
            [i, t]
          );
        })({ threshold: 0.1, rootMargin: '50px', triggerOnce: !1 }),
        F = h(
          () =>
            ((e, t, r) => {
              const i = pe(e);
              return i > t / r
                ? { width: t, height: Math.round(t / i) }
                : { width: Math.round(r * i), height: r };
            })(e, a, n),
          [e, a, n]
        );
      s(() => {
        w && w(F.width, F.height);
      }, [F.width, F.height, w]),
        s(
          () => (
            C.current && k && (S.current = A.createBreathingAnimation(C.current, e.id)),
            () => {
              var e;
              null == (e = S.current) || e.kill();
            }
          ),
          [k, e.id, A]
        );
      const H = d(() => {
          var e;
          R(!0),
            C.current &&
              (null == (e = S.current) || e.pause(),
              M.to(C.current, { scale: 1.05, duration: 0.2, ease: 'power2.out', overwrite: !0 }));
        }, []),
        O = d(() => {
          var e;
          R(!1),
            C.current &&
              (null == (e = S.current) || e.resume(),
              M.to(C.current, {
                scale: 1,
                rotationX: 0,
                rotationY: 0,
                duration: 0.15,
                ease: 'power1.out',
                overwrite: !0,
              }));
        }, []),
        X = d(
          e => {
            if (!C.current) return;
            const t = C.current.getBoundingClientRect(),
              r = e.clientX - t.left,
              i = e.clientY - t.top,
              a = (r / t.width) * 100,
              n = (i / t.height) * 100;
            if (W.current) {
              const t = e.clientX - W.current.x,
                r = e.clientY - W.current.y;
              Y.current = { x: 0.8 * Y.current.x + 0.2 * t, y: 0.8 * Y.current.y + 0.2 * r };
              const i = Math.hypot(Y.current.x, Y.current.y);
              i > 3 && N && N(e.clientX, e.clientY, Math.min(i / 15, 1));
              const o = Math.min(100, L + i / 15);
              T(o),
                P.current && window.clearTimeout(P.current),
                (P.current = window.setTimeout(() => {
                  T(e => Math.max(0, 0.9 * e));
                }, 50)),
                M.to(C.current, {
                  rotationX: 0.1 * (n - 50),
                  rotationY: 0.1 * (a - 50),
                  duration: 0.15,
                  ease: 'power1.out',
                  overwrite: !0,
                });
            }
            (W.current = { x: e.clientX, y: e.clientY }),
              C.current &&
                (C.current.style.setProperty('--mouse-x', `${a}%`),
                C.current.style.setProperty('--mouse-y', `${n}%`));
          },
          [L, N]
        );
      return (
        s(
          () => () => {
            P.current && window.clearTimeout(P.current);
          },
          []
        ),
        s(() => {
          if (!C.current) return;
          const t = M.to(C.current, {
            width: F.width,
            height: F.height,
            ...A.getAnimationProperties(e.id),
            onComplete: () => {
              C.current &&
                ((C.current.style.willChange = 'auto'), A.createMorphAnimation(C.current, e.id));
            },
          });
          return () => {
            t.kill();
          };
        }, [F.width, F.height, c, e.id, A]),
        s(() => {
          if (D && f) {
            f.postMessage({
              action: 'processImage',
              imageSrc: e.src,
              width: Math.ceil(F.width),
              height: Math.ceil(F.height),
            });
            const t = e => {
              'imageProcessed' === e.data.action && z(e.data.processedImage);
            };
            return f.addEventListener('message', t), () => f.removeEventListener('message', t);
          }
        }, [D, e.src, F.width, F.height, f]),
        s(() => {
          (null == b ? void 0 : b.high) && k && z(b.high);
        }, [b, k]),
        r(g.div, {
          ref: C,
          className: ne.imageItem,
          style: {
            width: F.width,
            height: F.height,
            overflow: 'hidden',
            borderRadius: '8px',
            transformOrigin: 'center center',
            willChange: 'transform',
            position: 'relative',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            perspective: 1e3,
            WebkitPerspective: 1e3,
            '--mouse-x': '50%',
            '--mouse-y': '50%',
            transition: 'transform 0.15s ease-out',
          },
          onMouseMove: X,
          onMouseLeave: O,
          onHoverStart: H,
          onHoverEnd: O,
          onClick: () => {
            A.addEnergy(), t(e);
          },
          layout: 'position',
          layoutDependency: c,
          children: i(g.div, {
            className: ne.imageWrapper,
            layout: !0,
            style: { width: '100%', height: '100%', position: 'relative' },
            children: [
              r(g.img, {
                ref: E,
                src: G,
                alt: e.alt,
                className: ne.image,
                loading: 'lazy',
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                },
                layoutId: `image-${e.id}`,
                onLoad: () => $(!0),
                initial: { opacity: 0 },
                animate: { opacity: k ? 1 : 0, scale: k ? 1 : 0.95 },
                transition: { duration: 0.3, ease: 'easeOut' },
              }),
              r(p, {
                children:
                  m &&
                  m > 1 &&
                  r(g.div, {
                    className: ne.groupCounter,
                    initial: { opacity: 0, scale: 0.8 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.8 },
                    children: m,
                  }),
              }),
              x &&
                _.length > 1 &&
                r('div', { className: ne.carouselIndicator, children: _.length }),
              r(g.div, {
                className: ne.imageTitle,
                initial: { opacity: 0, y: 20 },
                animate: { opacity: I ? 1 : 0, y: I ? 0 : 20 },
                transition: { duration: 0.2, ease: 'easeOut' },
                children: le(e.alt),
              }),
            ],
          }),
        })
      );
    },
    (e, t) =>
      e.image.src === t.image.src &&
      e.containerWidth === t.containerWidth &&
      e.containerHeight === t.containerHeight &&
      e.zoom === t.zoom &&
      e.groupCount === t.groupCount &&
      e.width === t.width &&
      e.height === t.height &&
      e.isCarousel === t.isCarousel &&
      e.groupImages.length === t.groupImages.length &&
      e.processedImage === t.processedImage
  ),
  Ne = '_imageRow_119ey_1',
  Ee = '_imageWrapper_119ey_24',
  Ce = ({
    images: e,
    onImageClick: t,
    columns: i,
    zoom: a,
    isLastRow: n,
    rowHeight: c,
    groupedImages: d,
    processedImages: m,
    imageProcessor: p,
    onImageOverflow: f,
    gap: w,
    containerWidth: y,
  }) => {
    const v = l(null),
      [x, _] = o(new Map()),
      M = u(),
      [b, N] = o(!1);
    s(() => {
      _(new Map()), N(!1);
    }, [e, d]);
    const E = h(() => {
        if (!e.length) return null;
        return e.every(e => e.width > 0 && e.height > 0)
          ? ((e, t, r) => {
              if (t <= 0)
                return console.warn('Invalid container width detected in optimizeRowLayout'), e;
              const i = ((e, t, r) => `${t}-${r}-${'row'}-${e.map(e => e.id).join(',')}`)(
                  e.images,
                  t,
                  r
                ),
                a = ge.get(i, t);
              if (a) return a;
              const n = Math.max(he, Math.min(3, r)),
                o = ue(n),
                s = Math.round(o),
                l = Math.max(0, (e.images.length - 1) * s),
                c = Math.max(0, t - l),
                h = fe(e.images),
                d = h.reduce((e, t) => e + t, 0),
                m = c / d,
                g = (ce * r) / Math.max(...h),
                u = c / d,
                p = Math.round(Math.max(g, Math.min(u, m))),
                f = h.map(e => Math.floor(p * e)),
                w = c - f.reduce((e, t) => e + t, 0);
              if (0 !== w && f.length > 0) {
                const e = Math.floor(w / f.length),
                  t = w % f.length;
                f.forEach((t, r) => {
                  f[r] += e;
                });
                for (let r = 0; r < t; r++) f[r] += 1;
              }
              const y = f.reduce((e, t) => e + t, 0) + l;
              if (y !== t && f.length > 0) {
                const e = t - y;
                f[0] += e;
              }
              const v = { ...e, width: t, height: p, gap: s, imageWidths: f };
              return ge.set(i, v, t), v;
            })({ width: y, height: c, gap: w, images: e }, y, a)
          : null;
      }, [y, c, w, e.length, a]),
      C = h(() => {
        if (!E) return [];
        const t = w * (e.length - 1),
          r = Math.max(0, y - t),
          i = e.map(e => e.width / e.height),
          a = i.reduce((e, t) => e + t, 0),
          n = i.map(e => {
            const t = e / a;
            return Math.floor(r * t);
          }),
          o = n.reduce((e, t) => e + t, 0) + t,
          s = o > y;
        if ((s !== b && (N(s), s && f && f(e[e.length - 1])), s || o < y)) {
          const r = y - o,
            i = Math.floor(r / e.length);
          return n.map((e, r) => {
            if (r === n.length - 1) {
              const e = n.slice(0, -1).reduce((e, t) => e + t + i, 0) + t;
              return Math.max(0, y - e);
            }
            return Math.max(0, e + i);
          });
        }
        return n;
      }, [e, y, w, E, b, f]);
    return e && 0 !== e.length && E
      ? r(g.div, {
          ref: v,
          className: Ne,
          animate: M,
          initial: !1,
          style: {
            display: 'flex',
            gap: `${w}px`,
            height: `${E.height}px`,
            marginBottom: `${w}px`,
            position: 'relative',
            willChange: 'transform',
            width: '100%',
            maxWidth: `${y}px`,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            flexWrap: 'nowrap',
          },
          layout: !0,
          transition: { type: 'spring', stiffness: 300, damping: 30 },
          children: e.map((e, i) => {
            const n = d.find(t => t.images.some(t => t.id === e.id)),
              o = C[i];
            return o
              ? r(
                  g.div,
                  {
                    className: Ee,
                    style: {
                      width: `${o}px`,
                      height: `${E.height}px`,
                      flexShrink: 0,
                      flexGrow: 0,
                      position: 'relative',
                      overflow: 'hidden',
                    },
                    layout: !0,
                    children: r(be, {
                      image: e,
                      onClick: () => t(e),
                      containerWidth: o,
                      containerHeight: E.height,
                      width: o,
                      height: E.height,
                      zoom: a,
                      isCarousel: (null == n ? void 0 : n.isCarousel) || !1,
                      groupImages: (null == n ? void 0 : n.images) || [],
                      processedImage: m[e.id],
                      imageProcessor: p,
                      onResize:
                        ((s = e.id),
                        (e, t) => {
                          _(r => {
                            const i = new Map(r);
                            return i.set(s, { width: e, height: t }), i;
                          });
                        }),
                    }),
                  },
                  e.id
                )
              : null;
            var s;
          }),
        })
      : null;
  };
class Ie {
  constructor() {
    t(this, 'worker'),
      t(this, 'db', null),
      t(this, 'messageQueue', []),
      t(this, 'isProcessing', !1),
      (this.worker = new Worker(new URL('./imageProcessorWorker.ts', import.meta.url))),
      this.initDB(),
      (this.worker.onmessage = this.handleWorkerMessage.bind(this));
  }
  async initDB() {
    this.db = await k('imageCache', 1, {
      upgrade(e) {
        e.createObjectStore('images');
      },
    });
  }
  async getCachedImage(e) {
    return this.db ? this.db.get('images', e) : null;
  }
  async cacheImage(e, t) {
    this.db && (await this.db.put('images', t, e));
  }
  async processNextMessage() {
    if (this.isProcessing || 0 === this.messageQueue.length) return;
    this.isProcessing = !0;
    const e = this.messageQueue.shift();
    'processImage' === e.action && e.images
      ? await this.processImage(e.images[0])
      : 'processBatch' === e.action && e.images && (await this.processBatch(e.images)),
      (this.isProcessing = !1),
      this.processNextMessage();
  }
  async processImage(e) {
    const t = await this.getCachedImage(e.id);
    t
      ? this.postMessage({ action: 'imageProcessed', id: e.id, processedImage: t })
      : this.worker.postMessage({ action: 'processImage', ...e });
  }
  async processBatch(e) {
    const t = [];
    for (const r of e) {
      const e = await this.getCachedImage(r.id);
      e ? this.postMessage({ action: 'imageProcessed', id: r.id, processedImage: e }) : t.push(r);
    }
    t.length > 0 && this.worker.postMessage({ action: 'processBatch', images: t });
  }
  handleWorkerMessage(e) {
    'imageProcessed' === e.data.action &&
      (this.cacheImage(e.data.id, e.data.processedImage), this.postMessage(e.data));
  }
  postMessage(e) {
    this.messageQueue.push(e), this.processNextMessage();
  }
  terminate() {
    this.worker.terminate();
  }
}
const Re = ({ images: e, zoom: t }) =>
    e.length
      ? r('div', {
          className: 'banner-view space-y-4',
          children: e.map((e, a) =>
            r(
              g.div,
              {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5, delay: 0.1 * a },
                className: 'banner-item relative',
                children: i('div', {
                  className:
                    'banner-image-container w-full h-[300px] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300',
                  style: { height: 300 * t + 'px' },
                  children: [
                    r('img', { src: e.src, alt: e.alt, className: 'w-full h-full object-cover' }),
                    i('div', {
                      className:
                        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4',
                      children: [
                        r('h3', {
                          className: 'text-white text-lg font-semibold',
                          children: e.title,
                        }),
                        i('p', {
                          className: 'text-white/80 text-sm',
                          children: [e.width, ' × ', e.height],
                        }),
                      ],
                    }),
                  ],
                }),
              },
              e.id
            )
          ),
        })
      : r('div', { className: 'text-center text-gray-500 mt-8', children: 'No images to display' }),
  ke = ({ images: e, zoom: t }) =>
    e.length
      ? r($, {
          breakpointCols: { default: 4, 1536: 4, 1280: 3, 1024: 3, 768: 2, 640: 1 },
          className: 'flex -ml-4 w-auto',
          columnClassName: 'pl-4 bg-clip-padding',
          children: e.map((e, a) =>
            r(
              g.div,
              {
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.5, delay: 0.1 * a },
                className: 'mb-4',
                children: i('div', {
                  className:
                    'relative group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300',
                  children: [
                    r('img', {
                      src: e.src,
                      alt: e.alt,
                      className: 'w-full h-auto',
                      style: { maxHeight: 400 * t + 'px', objectFit: 'cover' },
                    }),
                    i('div', {
                      className:
                        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300',
                      children: [
                        r('h3', {
                          className: 'text-white text-lg font-semibold',
                          children: e.title,
                        }),
                        i('p', {
                          className: 'text-white/80 text-sm',
                          children: [e.width, ' × ', e.height],
                        }),
                      ],
                    }),
                  ],
                }),
              },
              e.id
            )
          ),
        })
      : r('div', { className: 'text-center text-gray-500 mt-8', children: 'No images to display' }),
  $e = e => {
    const { onClick: t } = e;
    return r('button', {
      onClick: t,
      className:
        'absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors duration-300',
      children: r(z, {}),
    });
  },
  Ge = e => {
    const { onClick: t } = e;
    return r('button', {
      onClick: t,
      className:
        'absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors duration-300',
      children: r(A, {}),
    });
  },
  ze = ({ images: e, zoom: t }) => {
    if (!e.length)
      return r('div', {
        className: 'text-center text-gray-500 mt-8',
        children: 'No images to display',
      });
    return r('div', {
      className: 'carousel-view',
      children: r(G, {
        ...{
          dots: !0,
          infinite: !0,
          speed: 500,
          slidesToShow: 1,
          slidesToScroll: 1,
          nextArrow: r($e, {}),
          prevArrow: r(Ge, {}),
          adaptiveHeight: !0,
          customPaging: e =>
            r('div', {
              className:
                'w-3 h-3 mx-1 rounded-full bg-white/50 hover:bg-white/70 transition-colors duration-300',
            }),
        },
        children: e.map((e, a) =>
          r(
            g.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 },
              className: 'outline-none',
              children: i('div', {
                className: 'relative aspect-video',
                children: [
                  r('img', {
                    src: e.src,
                    alt: e.alt,
                    className: 'w-full h-full object-contain',
                    style: { maxHeight: 600 * t + 'px' },
                  }),
                  i('div', {
                    className:
                      'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4',
                    children: [
                      r('h3', { className: 'text-white text-lg font-semibold', children: e.title }),
                      i('p', {
                        className: 'text-white/80 text-sm',
                        children: [e.width, ' × ', e.height],
                      }),
                    ],
                  }),
                ],
              }),
            },
            e.id
          )
        ),
      }),
    });
  };
const Ae = ({
    width: e,
    height: t,
    resolution: i = 256,
    damping: a = 0.97,
    propagationSpeed: n = 5,
    onReady: o,
  }) => {
    const c = l(null),
      h = l({ current: [], previous: [] }),
      m = l([]),
      g = l(0),
      u = l(null),
      p = d(() => {
        const e = {
          current: Array(i)
            .fill(0)
            .map(() => Array(i).fill(0)),
          previous: Array(i)
            .fill(0)
            .map(() => Array(i).fill(0)),
        };
        h.current = e;
      }, [i]),
      f = d(
        (e, t, r = 1) => {
          const a = {
            x: e * i,
            y: t * i,
            radius: 0,
            strength: Math.min(Math.max(r, 0), 1),
            timestamp: Date.now(),
          };
          m.current.push(a);
          const n = h.current.current,
            o = 5 * a.strength;
          for (let s = -2; s <= 2; s++)
            for (let e = -2; e <= 2; e++) {
              const t = Math.floor(a.x + s),
                r = Math.floor(a.y + e);
              if (t >= 0 && t < i && r >= 0 && r < i) {
                const i = Math.sqrt(s * s + e * e);
                if (i <= 2) {
                  const e = (1 - i / 2) * o;
                  n[r][t] = e;
                }
              }
            }
        },
        [i]
      ),
      w = d(() => {
        const { current: e, previous: t } = h.current,
          r = Array(i)
            .fill(0)
            .map(() => Array(i).fill(0));
        for (let n = 1; n < i - 1; n++)
          for (let o = 1; o < i - 1; o++) {
            const i = (e[n - 1][o] + e[n + 1][o] + e[n][o - 1] + e[n][o + 1]) / 2 - t[n][o];
            r[n][o] = i * a;
          }
        (h.current.previous = e), (h.current.current = r);
      }, [i, a]),
      y = d(() => {
        if (!c.current || !u.current) return;
        const r = u.current,
          a = r.getImageData(0, 0, e, t),
          { data: n } = a,
          o = h.current.current;
        for (let s = 0; s < i; s++)
          for (let r = 0; r < i; r++) {
            const a = o[s][r],
              l = Math.floor((r / i) * e),
              c = 4 * (Math.floor((s / i) * t) * e + l),
              h = Math.min(255 * Math.abs(a), 255);
            (n[c] = h), (n[c + 1] = h), (n[c + 2] = h), (n[c + 3] = 0.5 * h);
          }
        r.putImageData(a, 0, 0);
      }, [e, t, i]),
      v = d(() => {
        w(), y(), (g.current = requestAnimationFrame(v));
      }, [w, y]);
    s(() => {
      if (!c.current) return;
      const r = c.current;
      (r.width = e), (r.height = t);
      const i = r.getContext('2d');
      return i
        ? ((u.current = i),
          p(),
          v(),
          null == o || o(),
          () => {
            g.current && cancelAnimationFrame(g.current);
          })
        : void 0;
    }, [e, t, p, v, o]);
    const x = d(
      e => {
        const t = c.current;
        if (!t) return;
        const r = t.getBoundingClientRect(),
          i = 'touches' in e ? e.touches[0].clientX : e.clientX,
          a = 'touches' in e ? e.touches[0].clientY : e.clientY,
          n = (i - r.left) / r.width,
          o = (a - r.top) / r.height;
        f(n, o, 1);
      },
      [f]
    );
    return r('canvas', {
      ref: c,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: 0.8,
      },
      onMouseMove: x,
      onTouchMove: x,
    });
  },
  Se = ({ images: e, isLoading: t, isGrouped: a, zoom: n, viewMode: c }) => {
    const m = (function () {
        const [e, t] = o({ width: window.innerWidth, height: window.innerHeight }),
          r = d(() => {
            const r = window.innerWidth,
              i = window.innerHeight;
            (r === e.width && i === e.height) ||
              requestAnimationFrame(() => {
                t({ width: r, height: i });
              });
          }, [e.width, e.height]);
        return (
          s(() => {
            let e = null;
            function t() {
              e && clearTimeout(e), (e = setTimeout(r, 150));
            }
            return (
              r(),
              window.addEventListener('resize', t),
              () => {
                e && clearTimeout(e), window.removeEventListener('resize', t);
              }
            );
          }, [r]),
          e
        );
      })(),
      u = l(null),
      [p, y] = o(0),
      [v, x] = o(4),
      [M, b] = o(-1),
      [N, k] = o([]),
      [$, G] = o([]),
      { scrollY: z } = f(),
      A = w(z, [0, 300], [0, 200]);
    w(z, [0, 300], [0, -200]);
    const [S, L] = o({}),
      T = h(() => Me.getInstance(), []),
      [P, W] = o('rgba(255, 255, 255, 0.5)'),
      [Y, B] = o([]),
      [D, F] = o(!1);
    l(null),
      s(() => {
        b(-1), k([]), L({}), G([]);
      }, [e, c]),
      s(() => {
        const e = () => {
          if (!u.current) return;
          const e = u.current.getBoundingClientRect(),
            t = Math.max(ce, e.width);
          if (t !== p) {
            y(t);
            const e = xe({ containerWidth: t, zoom: n, viewMode: c, isGrouped: a });
            x(e.columns);
          }
        };
        e();
        const t = new ResizeObserver(e);
        return (
          u.current && t.observe(u.current),
          window.addEventListener('resize', e),
          () => {
            t.disconnect(), window.removeEventListener('resize', e);
          }
        );
      }, [n, c, a, p]),
      s(() => {
        const e = setInterval(() => {
          T.updateColorEnergy();
          const e = getComputedStyle(document.documentElement)
            .getPropertyValue('--energy-hue')
            .trim();
          W(`hsla(${e}, 80%, 60%, 0.5)`);
        }, 50);
        return () => clearInterval(e);
      }, [T]);
    const H = h(() => {
        if (!Array.isArray(e) || 0 === e.length)
          return console.warn('No images provided or invalid images array'), [];
        const t = e.filter(
          e =>
            e &&
            'object' == typeof e &&
            'width' in e &&
            'height' in e &&
            e.width > 0 &&
            e.height > 0
        );
        if (
          (t.length !== e.length &&
            console.warn(`Filtered out ${e.length - t.length} invalid images`),
          !a)
        )
          return t.map(e => ({ key: e.id, images: [e], isCarousel: !1 }));
        const r = {};
        return (
          t.forEach(e => {
            const t = le(e.alt);
            r[t] || (r[t] = []), r[t].push(e);
          }),
          Object.entries(r).map(([e, t]) => ({ key: e, images: t, isCarousel: t.length > 1 }))
        );
      }, [e, a]),
      O = h(() => {
        if (!p || 0 === H.length || c !== U.GRID) return [];
        const e = H.map(e => e.images[0]).filter(e => e && e.width > 0 && e.height > 0);
        return 0 === e.length ? [] : ve(e, p, n, 200);
      }, [H, n, p, c]),
      X = d(e => {
        console.warn('Image overflow detected:', e.id);
      }, []),
      j = d(
        e => {
          const t = H.findIndex(t => t.images.some(t => t.id === e.id));
          if (-1 !== t) {
            const e = H[t];
            b(t), k(e.images);
          }
        },
        [H]
      );
    d(e => `/api/image/${e.replace(/^(\/|api\/image\/)+/, '').replace(/\\/g, '/')}`, []);
    const q = h(() => new Ie(), []),
      Z = d((e, t, r) => {
        const i = Date.now();
        B(a => [...a.slice(-3), { id: i, x: e, y: t, strength: r }]),
          setTimeout(() => {
            B(e => e.filter(e => e.id !== i));
          }, 1e3);
      }, []);
    return i('div', {
      className: 'image-feed overflow-x-hidden',
      ref: u,
      style: {
        position: 'relative',
        perspective: '1000px',
        gap: `${ue(n)}px`,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: m.width ? `${m.width}px` : '100%',
        overflow: 'hidden',
      },
      children: [
        r('div', {
          className: se.feedContent,
          children: (() => {
            if (!p) return null;
            const t = ue(n),
              i = { onRipple: Z, energyColor: P };
            switch (c) {
              case U.BANNER:
                return r(Re, { images: e, zoom: n, ...i });
              case U.MASONRY:
                return r(ke, { images: e, zoom: n, ...i });
              case U.CAROUSEL:
                return r(ze, { images: e, zoom: n, ...i });
              case U.GRID:
                return O.length
                  ? r(g.div, {
                      className: se.gridContainer,
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: `${t}px`,
                        '--energy-color': P,
                      },
                      children: O.map((e, i) =>
                        r(
                          Ce,
                          {
                            images: e.images,
                            onImageClick: j,
                            columns: v,
                            zoom: n,
                            isLastRow: i === O.length - 1,
                            rowHeight: e.height,
                            groupedImages: H,
                            processedImages: S,
                            imageProcessor: q,
                            gap: t,
                            containerWidth: p,
                            onImageOverflow: X,
                          },
                          `row-${i}-${e.images.map(e => e.id).join('-')}`
                        )
                      ),
                    })
                  : null;
              default:
                return null;
            }
          })(),
        }),
        r(Ae, {
          width: m.width || window.innerWidth,
          height: m.height || window.innerHeight,
          resolution: 128,
          damping: 0.97,
          propagationSpeed: 5,
          onReady: () => F(!0),
        }),
        t && r(oe, { containerWidth: 800, containerHeight: 600 }),
        r(_, {
          slides: N.map(e => ({
            src: e.src,
            alt: e.alt,
            title: le(e.alt),
            description: `Image ${e.id}`,
          })),
          open: M >= 0,
          index: M - M,
          close: () => b(-1),
          plugins: [E, C, I, ...(N.length > 1 ? [R] : [])],
          thumbnails: {
            position: 'bottom',
            width: 120,
            height: 80,
            border: 1,
            borderRadius: 4,
            padding: 4,
            gap: 16,
          },
          animation: { fade: 300, swipe: 300 },
          carousel: { finite: !0, preload: 2, padding: 0, spacing: 30, imageFit: 'contain' },
          render: { buttonPrev: () => null, buttonNext: () => null },
        }),
        r(g.div, {
          className: se.parallaxLayer,
          style: { y: A, filter: 'hue-rotate(calc(var(--energy-hue, 0) * 1deg))' },
        }),
      ],
    });
  },
  Le = '_imageViewer_feuzf_1',
  Te = '_contentContainer_feuzf_8',
  Pe = ({
    images: e,
    isLoading: t,
    error: a,
    selectedFolder: n,
    isGrouped: o,
    zoom: s,
    viewMode: l,
  }) =>
    r('div', {
      className: `${Le} flex flex-col h-full`,
      children: r('div', {
        className: `${Te} flex-1`,
        children: a
          ? i('div', {
              className: 'text-center text-accent-red',
              children: [
                i('p', { children: ['Error: ', a] }),
                r('p', {
                  children: 'Please try again later or contact support if the problem persists.',
                }),
              ],
            })
          : t
            ? r('div', { className: 'text-center text-gray-300', children: 'Loading images...' })
            : 0 === e.length
              ? r('div', {
                  className: 'text-center text-gray-300',
                  children: 'No images found in this folder.',
                })
              : r(Se, { images: e, isLoading: t, isGrouped: o, zoom: s, viewMode: l }),
      }),
    }),
  We = ({
    images: e,
    selectedFolder: t,
    searchQuery: i,
    isLoading: n,
    error: o,
    zoom: s,
    isGrouped: l,
    viewMode: c,
  }) => {
    const d = h(
      () => (i ? e.filter(e => e.alt.toLowerCase().includes(i.toLowerCase())) : e),
      [e, i]
    );
    return r(a, {
      children: r(Pe, {
        images: d,
        isLoading: n,
        error: o,
        selectedFolder: t,
        zoom: s,
        isGrouped: l,
        viewMode: c,
      }),
    });
  },
  Ye = S.create({ baseURL: '/api' });
async function Be(e) {
  var t;
  if (!e) throw new Error('Folder parameter is required');
  try {
    const t = await Ye.get(`/images?folder=${encodeURIComponent(e)}`);
    if (!Array.isArray(t.data))
      throw (
        (console.error('Invalid response data:', t.data),
        new Error('Invalid response format from server'))
      );
    return t.data;
  } catch (r) {
    if (r.response) {
      const e = (null == (t = r.response.data) ? void 0 : t.error) || r.response.statusText;
      throw new Error(`Server error: ${e}`);
    }
    throw r.request
      ? new Error('No response from server')
      : (console.error('Error in getImages:', r), new Error(r.message || 'Failed to fetch images'));
  }
}
const De = '_particleBackground_uglj2_1',
  Fe = '_particle_uglj2_1',
  He = n.memo(() => {
    const e = l(null),
      t = l([]),
      i = l(),
      a = l(0),
      n = l({ lastCheck: 0, frames: 0 }),
      [c, m] = o(!1),
      g = c ? 20 : 30,
      u = 1e3 / g,
      p = h(
        () => ({
          maxParticles: c ? 8 : 12,
          baseHues: [190, 160, 140],
          sizeRange: { min: 15, max: 35 },
          opacityRange: { min: 0.15, max: 0.35 },
          speedRange: { min: -0.04, max: 0.04 },
          poolSize: 20,
        }),
        [c]
      ),
      f = d(() => {
        if (e.current) {
          t.current.forEach(e => e.element.remove()), (t.current = []);
          for (let r = 0; r < p.poolSize; r++) {
            const r = document.createElement('div');
            r.classList.add(Fe),
              (r.style.display = 'none'),
              e.current.appendChild(r),
              t.current.push({
                element: r,
                x: 0,
                y: 0,
                speedX: 0,
                speedY: 0,
                size: 0,
                opacity: 0,
                hue: 0,
                energy: 0,
                phase: 0,
                active: !1,
              });
          }
        }
      }, [p.poolSize]),
      w = d(() => {
        if (!e.current) return;
        const r = t.current.find(e => !e.active);
        if (!r) return;
        const i = Math.random() * (p.sizeRange.max - p.sizeRange.min) + p.sizeRange.min,
          a = Math.floor(Math.random() * p.baseHues.length),
          n = p.baseHues[a] + 15 * Math.random(),
          o = 100 * Math.random(),
          s = 100 * Math.random(),
          l = Math.random() * (p.opacityRange.max - p.opacityRange.min) + p.opacityRange.min;
        Object.assign(r, {
          x: o,
          y: s,
          speedX: Math.random() * (p.speedRange.max - p.speedRange.min) + p.speedRange.min,
          speedY: Math.random() * (p.speedRange.max - p.speedRange.min) + p.speedRange.min,
          size: i,
          opacity: l,
          hue: n,
          energy: Math.random(),
          phase: Math.random() * Math.PI * 2,
          active: !0,
        }),
          (r.element.style.cssText = `\n      display: block;\n      width: ${i}px;\n      height: ${i}px;\n      background: hsla(${n}, 85%, 25%, ${l});\n      transform: translate(${o}%, ${s}%) scale(1);\n      will-change: transform, opacity;\n      pointer-events: none;\n    `);
        if (t.current.filter(e => e.active).length > p.maxParticles) {
          const e = t.current.find(e => e.active);
          e && ((e.active = !1), (e.element.style.display = 'none'));
        }
      }, [p]),
      y = d(() => {
        const e = performance.now(),
          r = e - a.current;
        if ((n.current.frames++, e - n.current.lastCheck > 1e3)) {
          const t = n.current.frames;
          (n.current.frames = 0), (n.current.lastCheck = e), t < 0.75 * g && !c && m(!0);
        }
        r < u ||
          ((a.current = e),
          t.current.forEach(e => {
            e.active &&
              ((e.phase += 0.006),
              (e.energy = 0.2 * Math.sin(e.phase) + 0.8),
              (e.x += e.speedX),
              (e.y += e.speedY),
              (e.x > 100 || e.x < 0) && ((e.speedX *= -1), (e.x = Math.max(0, Math.min(100, e.x)))),
              (e.y > 100 || e.y < 0) && ((e.speedY *= -1), (e.y = Math.max(0, Math.min(100, e.y)))),
              (e.element.style.transform = `translate(${e.x}%, ${e.y}%) scale(${1 + 0.1 * e.energy})`),
              (e.element.style.opacity = (e.opacity * e.energy).toString()));
          })),
          (i.current = requestAnimationFrame(y));
      }, [u, g, c]);
    return (
      s(() => {
        f();
        const r = setInterval(w, c ? 800 : 600);
        return (
          (n.current = { lastCheck: performance.now(), frames: 0 }),
          (a.current = performance.now()),
          y(),
          () => {
            if ((clearInterval(r), i.current && cancelAnimationFrame(i.current), e.current))
              for (; e.current.firstChild; ) e.current.firstChild.remove();
            t.current = [];
          }
        );
      }, [f, w, y, c]),
      r('div', {
        ref: e,
        className: De,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          willChange: 'transform',
          transform: 'translateZ(0)',
          zIndex: -1,
        },
      })
    );
  }),
  Oe = '_lottieBackground_1laej_1',
  Xe = '_animatedBackground_1laej_12',
  je = () => r('div', { className: Oe, children: r('div', { className: Xe }) }),
  qe = '--scroll-y',
  Ze = '--mouse-x',
  Ue = '--mouse-y',
  Ve = { [qe]: '0px', [Ze]: '0px', [Ue]: '0px' };
const Qe = ({
    children: e,
    folders: t,
    selectedFolder: a,
    onFolderChange: n,
    currentDirectory: l,
    onSearch: c,
    zoom: h,
    onZoomChange: d,
    isGrouped: m,
    onGroupToggle: g,
    viewMode: u,
    onViewModeChange: p,
  }) => {
    s(() => {
      function e(e) {
        const t = e.clientX,
          r = e.clientY;
        document.documentElement.style.setProperty(Ze, `${t}px`),
          document.documentElement.style.setProperty(Ue, `${r}px`),
          console.log(`Mouse event: x=${t}, y=${r}, target=${e.target}`);
      }
      function t() {
        const e = window.scrollY;
        document.documentElement.style.setProperty(qe, `${e}px`);
      }
      return (
        Object.entries(Ve).forEach(([e, t]) => {
          document.documentElement.style.setProperty(e, t);
        }),
        window.addEventListener('scroll', t),
        document.addEventListener('mousemove', e),
        document.addEventListener('click', e),
        () => {
          window.removeEventListener('scroll', t),
            document.removeEventListener('mousemove', e),
            document.removeEventListener('click', e);
        }
      );
    }, []);
    const [f, w] = o([]),
      [y, v] = o(!1),
      [x, _] = o(null),
      [M, b] = o('');
    return (
      s(() => {
        a
          ? (async () => {
              v(!0), _(null);
              try {
                const e = await Be(a);
                w(e || []);
              } catch (e) {
                const t = e.message || 'Failed to fetch images';
                _(t), w([]), console.error('Error fetching images:', e);
              } finally {
                v(!1);
              }
            })()
          : (w([]), _('No folder selected'));
      }, [a]),
      i('div', {
        className: 'flex flex-col h-screen relative bg-transparent',
        children: [
          r('div', { className: 'gradient-overlay' }),
          r(je, {}),
          r(He, {}),
          r(ae, {
            currentDirectory: l,
            onSearch: c,
            zoom: h,
            onZoomChange: d,
            isGrouped: m,
            onGroupToggle: g,
            viewMode: u,
            onViewModeChange: p,
          }),
          i('div', {
            className: 'flex flex-1 overflow-hidden',
            children: [
              r(F, { folders: t, selectedFolder: a, onFolderChange: n }),
              r('main', {
                className: 'flex-1 overflow-auto p-4 relative bg-transparent',
                children: r('div', {
                  className: 'relative z-10',
                  children: r(We, {
                    images: f,
                    selectedFolder: a,
                    searchQuery: M,
                    isLoading: y,
                    error: x,
                    zoom: h,
                    isGrouped: m,
                    viewMode: u,
                  }),
                }),
              }),
            ],
          }),
        ],
      })
    );
  },
  Je = () => {
    const [e, t] = o([]),
      [i, a] = o(''),
      [n, l] = o([]),
      [c, h] = o(1),
      [d, m] = o('');
    o('');
    const [g, u] = o(!1),
      [p, f] = o(null),
      [w, y] = o(!0),
      [v, x] = o(U.GRID);
    s(() => {
      (async () => {
        try {
          const e = await (async function () {
            try {
              return (await Ye.get('/folders')).data.map(e => ({ name: e.name, path: e.path }));
            } catch (p) {
              throw (
                (console.error('Error in getFolders:', p), new Error('Failed to fetch folders'))
              );
            }
          })();
          t(e), e.length > 0 && a(e[0].name);
        } catch (e) {
          console.error('Error fetching folders:', e), f('Failed to fetch folders');
        }
      })();
    }, []),
      s(() => {
        (async () => {
          if (i) {
            u(!0), f(null);
            try {
              const e = await Be(i);
              l(e);
            } catch (e) {
              console.error('Error fetching images:', e), f('Failed to fetch images'), l([]);
            } finally {
              u(!1);
            }
          }
        })();
      }, [i]);
    return r(Qe, {
      folders: e,
      selectedFolder: i,
      onFolderChange: e => {
        a(e);
      },
      currentDirectory: i,
      onSearch: e => {
        m(e);
      },
      zoom: c,
      onZoomChange: e => {
        h(e);
      },
      isGrouped: w,
      onGroupToggle: () => {
        y(e => !e);
      },
      viewMode: v,
      onViewModeChange: e => {
        x(e);
      },
      children: r(We, {
        images: n,
        zoom: c,
        searchQuery: d,
        isLoading: g,
        error: p,
        selectedFolder: i,
        isGrouped: w,
        viewMode: v,
      }),
    });
  };
function Ke() {
  return r('div', { className: 'App', children: r(Je, {}) });
}
function et() {
  return { html: m.renderToString(r(n.StrictMode, { children: r(Ke, {}) })) };
}
export { et as render };
//# sourceMappingURL=entry-server.js.map
