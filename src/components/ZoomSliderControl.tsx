import { IconX } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';
import styles from './ZoomSliderControl.module.scss';

interface ZoomSliderControlProps {
  value: number;
  onChange: (newValue: number) => void;
  onClose: () => void;
  min?: number;
  max?: number;
  step?: number;
}

const ZoomSliderControl: React.FC<ZoomSliderControlProps> = ({
  value,
  onChange,
  onClose,
  min = 0.5,
  max = 2,
  step = 0.1,
}) => {
  return (
    <div className={styles.zoomSliderContainer}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={styles.zoomRangeInput}
        onClick={e => e.stopPropagation()} // Prevent menu item click through
      />
      <motion.button
        type="button"
        className={styles.closeButton}
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close zoom slider"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <IconX size={16} />
      </motion.button>
    </div>
  );
};

export default ZoomSliderControl;
