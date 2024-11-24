import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import CurrentDirectoryButton from './CurrentDirectoryButton';
import SearchBar from './SearchBar';
import ZoomSlider from './ZoomSlider';
import styles from '../styles/Navbar.module.scss';
// Define the Navbar component
const Navbar = ({ currentDirectory, onSearch, zoom, onZoomChange, isGrouped, onGroupToggle, }) => {
    const svgRef = useRef(null);
    useEffect(() => {
        const svg = svgRef.current;
        if (svg) {
            const animate = () => {
                const path = svg.querySelector('path');
                if (path) {
                    const length = path.getTotalLength();
                    path.style.strokeDasharray = `${length} ${length}`;
                    path.style.strokeDashoffset = `${length}`;
                    path.getBoundingClientRect();
                    path.style.transition = 'stroke-dashoffset 2s ease-in-out';
                    path.style.strokeDashoffset = '0';
                }
            };
            animate();
        }
    }, []);
    // Render the Navbar component
    return (_jsxs(motion.div, { className: styles.navbar, initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, children: [_jsx("svg", { ref: svgRef, className: styles.navbarBackground, children: _jsx("path", { d: "M0,0 Q50,20 100,10 T200,30 T300,5 T400,25 V100 Q350,80 300,90 T200,70 T100,95 T0,75 Z" }) }), _jsxs("div", { className: styles.leftSection, children: [_jsx(CurrentDirectoryButton, { currentDirectory: currentDirectory }), _jsx(SearchBar, { onSearch: onSearch })] }), _jsxs("div", { className: styles.rightSection, children: [_jsx(motion.button, { onClick: onGroupToggle, className: styles.viewToggleButton, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, children: isGrouped ? 'Ungroup' : 'Group' }), _jsx(ZoomSlider, { zoom: zoom, onZoomChange: onZoomChange })] })] }));
};
// Export the Navbar component
export default Navbar;
//# sourceMappingURL=Navbar.js.map