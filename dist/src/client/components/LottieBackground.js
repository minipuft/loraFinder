import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import styles from "../../client/styles/LottieBackground.module.scss";
const LottieBackground = () => {
    const gradientRef = useRef(null);
    useEffect(() => {
        const updateGradient = (event) => {
            if (gradientRef.current) {
                const x = event.clientX / window.innerWidth;
                const y = event.clientY / window.innerHeight;
                gradientRef.current.style.background = `
          radial-gradient(
            circle at ${x * 100}% ${y * 100}%,
            rgba(238, 119, 82, 0.3),
            rgba(231, 60, 126, 0.3),
            rgba(35, 166, 213, 0.3),
            rgba(35, 213, 171, 0.3)
          )
        `;
            }
        };
        window.addEventListener("mousemove", updateGradient);
        return () => window.removeEventListener("mousemove", updateGradient);
    }, []);
    return (_jsx("div", { className: styles.lottieBackground, children: _jsx("div", { ref: gradientRef, className: styles.animatedBackground }) }));
};
export default LottieBackground;
//# sourceMappingURL=LottieBackground.js.map