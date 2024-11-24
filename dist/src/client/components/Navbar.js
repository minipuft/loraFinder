import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from "gsap";
import CurrentDirectoryButton from "../../client/components/CurrentDirectoryButton";
import SearchBar from "../../client/components/SearchBar";
import ZoomSlider from "../../client/components/ZoomSlider";
import styles from "../../client/styles/Navbar.module.scss";
// Define the Navbar component
const Navbar = ({ currentDirectory, onSearch, zoom, onZoomChange, isGrouped, onGroupToggle, }) => {
    const svgRef = useRef(null);
    const controls = useAnimation();
    const lightRef = useRef(null);
    useEffect(() => {
        const svg = svgRef.current;
        if (svg) {
            const path = svg.querySelector('path');
            if (path) {
                gsap.to(path, {
                    attr: { d: "M0,0 Q100,50 200,0 T400,0 V100 Q300,150 200,100 T0,100 Z" },
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }
        }
    }, []);
    const handleHover = () => {
        controls.start({
            scale: 1.05,
            transition: { duration: 0.3 }
        });
    };
    const handleHoverEnd = () => {
        controls.start({
            scale: 1,
            transition: { duration: 0.3 }
        });
    };
    useEffect(() => {
        if (lightRef.current) {
            gsap.to(lightRef.current, {
                opacity: 0.7,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });
        }
    }, []);
    // Render the Navbar component
    return (_jsxs(motion.nav, { className: styles.navbar, initial: { y: -50, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.5, ease: "easeOut" }, children: [_jsx("div", { ref: lightRef, className: styles.cornerLight }), _jsx("svg", { ref: svgRef, className: styles.navbarBackground, children: _jsx("path", { d: "M0,0 Q50,20 100,10 T200,30 T300,5 T400,25 V100 Q350,80 300,90 T200,70 T100,95 T0,75 Z" }) }), _jsxs(motion.div, { className: styles.leftSection, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, animate: controls, children: [_jsx(CurrentDirectoryButton, { currentDirectory: currentDirectory }), _jsx(SearchBar, { onSearch: onSearch })] }), _jsxs(motion.div, { className: styles.rightSection, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, children: [_jsx(motion.button, { onClick: onGroupToggle, className: styles.viewToggleButton, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, children: isGrouped ? 'Ungroup' : 'Group' }), _jsx(ZoomSlider, { zoom: zoom, onZoomChange: onZoomChange })] })] }));
};
// Export the Navbar component
export default Navbar;
//# sourceMappingURL=Navbar.js.map