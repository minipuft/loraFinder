# Component Styling Reference

This document outlines the primary styling mechanisms for key components within the MediaFlow application. It is intended to inform the creation of a comprehensive style guide by detailing how components are styled, whether they accept external styling props, and what internal elements are key to their appearance.

## General Styling Observations:

- **SCSS Modules**: Many components utilize their own `.module.scss` file for scoped styling. These often leverage Tailwind CSS's `@apply` directive.
- **Tailwind CSS**: Used extensively, both directly in JSX `className` attributes and within SCSS modules via `@apply`. Understanding Tailwind utility classes is crucial for styling many components. The global Tailwind configuration (`tailwind.config.js`) defines the core theme.
- **Framer Motion**: Widely used for animations and interactive visual feedback. Styling often involves configuring Framer Motion's `style`, `animate`, `initial`, `whileHover`, `whileTap` props.
- **Context-Driven Styling**: Application state (e.g., from `useAppSettings`, `ColorContext`) frequently influences component appearance and layout, leading to conditional class application or style changes.
- **No `className` Prop (Common Pattern)**: Most core components reviewed (`ImageFeed`, `Navbar`, `Sidebar`, `ZoomSlider`, `SearchBar`, `CurrentDirectoryButton`, `AuraBackground`) do **not** accept a direct `className` prop from their parent for overarching style overrides. Their styling is largely self-contained or theme-driven. Customization typically involves editing the component's own SCSS module, its internal Tailwind usage, or global theme variables/Tailwind config.
- **Global Theme via Tailwind (`tailwind.config.js`)**:
  - Defines a custom color palette based on "Tokyo Night" theme colors. Key named colors include:
    - `primary: '#7aa2f7'` (Tokyo Night blue)
    - `secondary: '#bb9af7'` (Tokyo Night purple)
    - `background.light: '#1a1b26'`, `background.dark: '#16161e'`
    - A custom gray scale (e.g., `gray.100` to `gray.700`)
    - Accent colors: `accent.peach: '#ff9e64'`, `accent.green: '#9ece6a'`, `accent.cyan: '#7dcfff'`, `accent.red: '#f7768e'`.
  - These colors are available for use directly in Tailwind classes or via `@apply` in SCSS.
- **Typography (`tailwind.config.js`)**:
  - A standard sans-serif font stack is defined (`theme.extend.fontFamily.sans`).
  - Specific components (e.g., `Navbar`, `SearchBar`) may override this with custom fonts like 'Orbitron'.
- **Interactive Variants (`tailwind.config.js`)**:
  - `group-hover` variants for `opacity` and `transform` are explicitly enabled.

---

## Component Details

### 1. `ImageFeed.tsx`

- **Path**: `src/components/ImageFeed.tsx`
- **Primary Styling Method(s)**:
  - SCSS Module: `src/styles/ImageFeed.module.scss` (imported as `styles`)
  - Inline Styles (dynamic, for virtualization)
  - Context-driven styling (view modes, grouping, zoom, dominant colors)
  - Delegation to child components (`ImageRow`, lazy-loaded views for Masonry, Banner, Carousel)
  - Tailwind CSS (for some ad-hoc elements)
- **External Styling Interface**:
  - No direct `className` prop for overall styling.
- **Key Internal Styling Points**:
  - **SCSS Classes**: `styles.container`, `styles.feed`, `styles.error`, `styles.noImages`, `styles.loadingFallback`, `styles.fakeCardPileContainer`, `styles.fakeCard`. Many other classes for layouts and effects are present, often used by child components or complex logic.
  - **Tailwind CSS**: Used in SCSS module via `@apply` and for some direct element styling (e.g., "Reset Order" button uses `bg-blue-500`, not a theme color).
  - **Context**: `useAppSettings` (for `viewMode`, `isGrouped`, `zoom`) and `ColorContext` (for dynamic colors) heavily influence layout and appearance.
  - **CSS Custom Properties**: A `CustomStyle` interface hints at potential dynamic inline styles with CSS variables like `'--energy-color'`.
- **Notes for Stylists/Themers**:
  - Focus on `ImageFeed.module.scss` for base structural styles.
  - Styling specific view modes involves child components (e.g., `ImageRow.tsx`) and their styles.
  - Theming involves Tailwind config and global CSS variables.
  - The "Reset Order" button uses standard Tailwind `blue-500`. For full theme consistency, consider aliasing to a theme color from `tailwind.config.js`.

---

### 2. `Navbar.tsx`

- **Path**: `src/components/Navbar.tsx`
- **Primary Styling Method(s)**:
  - SCSS Module: `src/styles/Navbar.module.scss` (imported as `styles`)
  - Tailwind CSS (via `@apply` and directly)
  - Inline SVG with JavaScript-driven animation for background.
  - Framer Motion for interactive elements.
- **External Styling Interface**:
  - No direct `className` prop.
- **Key Internal Styling Points**:
  - **SCSS Classes**: `styles.navbar` (uses `font-family: 'Orbitron'`), `styles.leftSection`, `styles.rightSection`, `styles.navbarBackground`, `styles.viewModeButton`, `styles.active`, `styles.viewToggleButton`.
  - **Tailwind CSS**: Heavily used via `@apply` in SCSS.
  - **Context**: `useAppSettings` influences button states.
- **Notes for Stylists/Themers**:
  - Styles primarily in `Navbar.module.scss`.
  - 'Orbitron' font and custom animated SVG background are key design elements.
  - Button colors (active, hover) defined in SCSS, potentially using Tailwind theme colors if `@apply` is used with them.

---

### 3. `Sidebar.tsx`

- **Path**: `src/components/Sidebar.tsx`
- **Primary Styling Method(s)**:
  - SCSS Module: `src/styles/Sidebar.module.scss` (imported as `styles`)
  - Tailwind CSS (directly in JSX and via `@apply` in SCSS)
  - Framer Motion for container transitions.
- **External Styling Interface**:
  - No direct `className` prop.
- **Key Internal Styling Points**:
  - **SCSS Classes**: `styles.sidebar`, `styles.loading`, `styles.error`, `styles.sidebarInner`, `styles.logo`, `styles.folderList`, `styles.folderItem`, `styles.selectedFolder`, `styles.setHomeButton`, `styles.isHome`, `styles.uploadButton`.
  - **Tailwind CSS**: Used extensively for layout, typography, and conditional visibility (e.g., `group-hover:opacity-100`).
  - **Context**: `useAppSettings` influences `styles.selectedFolder`.
- **Notes for Stylists/Themers**:
  - Styling is a mix of `Sidebar.module.scss` and direct Tailwind utilities.
  - Key colors like `text-primary` (maps to `#7aa2f7`), `bg-primary`, and `bg-secondary` (maps to `#bb9af7`) are sourced from `tailwind.config.js`. Modifying these in the Tailwind config will globally change accents.

---

### 4. `ZoomSlider.tsx`

- **Path**: `src/components/ZoomSlider.tsx`
- **Primary Styling Method(s)**:
  - Tailwind CSS (directly in JSX)
  - Inline Styles (for `boxShadow`, glow effects, dynamic width)
  - Framer Motion (for animations)
- **External Styling Interface**:
  - No direct `className` prop. `zoom` prop value drives visual state.
- **Key Internal Styling Points**:
  - No dedicated SCSS module.
  - **Tailwind CSS**: Base appearance for container (`bg-gray-800/80 backdrop-blur-md`), icons (`text-gray-200`), slider track (`bg-gray-700`). These grays map to the custom gray scale in `tailwind.config.js`.
  - **Inline Styles**: `boxShadow`, radial gradients for glows.
  - **Framer Motion**: Critical for animated progress bar, icon interactions.
- **Notes for Stylists/Themers**:
  - Self-contained. Customization involves editing Tailwind/inline/Framer Motion styles in `ZoomSlider.tsx`.
  - The blue accent for progress (`bg-blue-500`) and glows uses standard Tailwind blue, not a theme color from `tailwind.config.js` (e.g., `primary` or `accent.cyan`). Consider aligning for theme consistency.

---

### 5. `SearchBar.tsx`

- **Path**: `src/components/SearchBar.tsx`
- **Primary Styling Method(s)**:
  - SCSS Module: `src/styles/SearchBar.module.scss` (imported as `styles`)
  - Framer Motion (for container width and background animations)
- **External Styling Interface**:
  - No direct `className` prop.
- **Key Internal Styling Points**:
  - **SCSS Classes**: `styles.searchBarContainer` (uses CSS custom properties like `--search-bg-color`), `styles.searchBackground`, `styles.searchInput` (uses `font-family: 'Orbitron'`), `styles.suggestions`.
  - **CSS Custom Properties**: Defined in `.searchBarContainer` for theming core colors.
  - **Framer Motion**: Animates container width and background based on input content.
- **Notes for Stylists/Themers**:
  - Uses `SearchBar.module.scss` and its CSS variables for theming.
  - 'Orbitron' font is a key design choice.
  - Animations are central to its UX.

---

### 6. `AuraBackground.tsx`

- **Path**: `src/components/AuraBackground.tsx`
- **Primary Styling Method(s)**:
  - WebGL Shaders (entire visual output)
  - Inline Styles (canvas positioning)
  - SCSS Module: `src/styles/ParticleBackground.module.scss` (reused, for fallback canvas styling)
- **External Styling Interface**:
  - No props.
- **Key Internal Styling Points**:
  - **WebGL**: Visuals generated by GLSL shaders.
  - **Inline Styles**: Position canvas to fill parent, `zIndex: -1`.
  - **SCSS Class (`styles.particleBackground`)**: Applied to canvas. Provides positioning and a `linear-gradient` fallback background (from `tailwind.config.js` `background.light` and `dark` if used in the gradient definition via theme function).
  - **Context**: `ColorContext` (`dominantColors`, `hoverState`) dynamically controls WebGL aura colors and effects.
- **Notes for Stylists/Themers**:
  - Highly specialized. Styling means editing GLSL shader code or JS feeding uniforms.
  - The `.particleBackground` class from `ParticleBackground.module.scss` offers a fallback. Its gradient might be using theme colors if defined with Tailwind's `theme()` function in SCSS.

---

### 7. `CurrentDirectoryButton.tsx`

- **Path**: `src/components/CurrentDirectoryButton.tsx`
- **Primary Styling Method(s)**:
  - Tailwind CSS (directly in JSX)
  - Framer Motion (for hover/tap animations)
- **External Styling Interface**:
  - No props for direct styling.
- **Key Internal Styling Points**:
  - No dedicated SCSS module.
  - **Tailwind CSS**: Defines all visuals (backgrounds, text colors, padding, etc.) based on loading/error/data states. Uses colors from `tailwind.config.js` like `bg-gray-700`, `text-peach` (maps to `accent.peach: '#ff9e64'`), and specific icon colors.
  - **Framer Motion**: For hover/tap scale and opacity animations.
- **Notes for Stylists/Themers**:
  - Self-contained styling via Tailwind. Customization involves editing conditional Tailwind classes in the component.
  - Uses theme colors like `accent.peach` and custom grays from `tailwind.config.js`.

---
