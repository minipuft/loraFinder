import {
  AnimationProps,
  HTMLMotionProps,
  motion,
  TargetAndTransition,
  Transition,
  VariantLabels,
} from 'framer-motion';
import React from 'react';
import { motionVariants } from '.';

// --- Define the supported elements explicitly for type safety ---
type SupportedMotionElement =
  | 'div'
  | 'span'
  | 'img'
  | 'button'
  | 'li'
  | 'ul'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3';

const motionComponents: {
  [key in SupportedMotionElement]: React.ComponentType<HTMLMotionProps<key>>;
} = {
  div: motion.div,
  span: motion.span,
  img: motion.img,
  button: motion.button,
  li: motion.li,
  ul: motion.ul,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
};

// Props for the MotionPreset component
// Separate standard HTML/React props from MotionProps for clarity
interface BasePresetProps {
  as?: SupportedMotionElement;
  preset: keyof typeof motionVariants;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
}

// Combine with relevant MotionProps, excluding 'variants' which we handle internally
type MotionPresetProps = BasePresetProps &
  Omit<AnimationProps, 'variants'> & {
    // Use AnimationProps for initial, animate, exit
    // Explicitly type hover/tap/drag states
    whileHover?: VariantLabels | TargetAndTransition;
    whileTap?: VariantLabels | TargetAndTransition;
    whileFocus?: VariantLabels | TargetAndTransition;
    whileDrag?: VariantLabels | TargetAndTransition;
    whileInView?: VariantLabels | TargetAndTransition;
    // Allow transition prop override
    transition?: Transition;
    // Capture other valid HTML attributes if necessary
    [key: string]: any;
  };

const MotionPreset: React.FC<MotionPresetProps> = ({
  as = 'div',
  preset,
  children,
  className,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  // Destructure AnimationProps
  initial = 'initial',
  animate = 'animate',
  exit,
  // Destructure state props
  whileHover,
  whileTap,
  whileFocus,
  whileDrag,
  whileInView,
  // Destructure transition
  transition,
  ...rest // Capture any remaining valid HTML attributes
}) => {
  const MotionComponent = motionComponents[as];
  if (!MotionComponent) {
    console.warn(`MotionPreset: Element type "${as}" is not supported. Defaulting to div.`);
    const FallbackComponent = motion.div;
    // Render children within the fallback
    return (
      <FallbackComponent style={style} className={className} {...rest}>
        {children}
      </FallbackComponent>
    );
  }

  const variants = motionVariants[preset];

  // Define default transitions based on preset
  let defaultTransition: Transition = {};
  if (preset === 'hoverPop') {
    defaultTransition = { type: 'spring', stiffness: 300, damping: 15 };
  }
  if (preset === 'fadeIn') {
    defaultTransition = { type: 'spring', stiffness: 120, damping: 20 };
  }

  const mergedTransition = transition ?? defaultTransition;

  // Determine hover/tap targets safely
  const hasHoverVariant = 'hover' in variants;
  const hasTapVariant = 'tap' in variants;
  // Use the actual variant name if available, otherwise undefined
  const hoverTarget = whileHover ?? (hasHoverVariant ? 'hover' : undefined);
  const tapTarget = whileTap ?? (hasTapVariant ? 'tap' : undefined);

  // Note: whileFocus, whileDrag, whileInView would need similar checks
  // if presets included 'focus', 'drag', or 'inView' keys.

  return (
    <MotionComponent
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit} // Pass exit directly
      whileHover={hoverTarget}
      whileTap={tapTarget}
      whileFocus={whileFocus} // Pass through directly
      whileDrag={whileDrag} // Pass through directly
      whileInView={whileInView} // Pass through directly
      transition={mergedTransition}
      {...rest} // Pass down remaining props
    >
      {children}
    </MotionComponent>
  );
};

export default MotionPreset;
