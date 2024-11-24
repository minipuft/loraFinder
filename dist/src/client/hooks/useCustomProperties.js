import { useEffect } from "react";
import { CUSTOM_PROPERTIES, DEFAULT_CUSTOM_PROPERTY_VALUES } from "../../shared/constants.js";
export function useCustomProperties() {
    useEffect(() => {
        function updateCustomProperties(e) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            document.documentElement.style.setProperty(CUSTOM_PROPERTIES.MOUSE_X, `${mouseX}px`);
            document.documentElement.style.setProperty(CUSTOM_PROPERTIES.MOUSE_Y, `${mouseY}px`);
            console.log(`Mouse event: x=${mouseX}, y=${mouseY}, target=${e.target}`);
        }
        function updateScrollProperty() {
            const scrollY = window.scrollY;
            document.documentElement.style.setProperty(CUSTOM_PROPERTIES.SCROLL_Y, `${scrollY}px`);
        }
        // Set default values
        Object.entries(DEFAULT_CUSTOM_PROPERTY_VALUES).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
        });
        window.addEventListener("scroll", updateScrollProperty);
        document.addEventListener("mousemove", updateCustomProperties);
        document.addEventListener("click", updateCustomProperties);
        return () => {
            window.removeEventListener("scroll", updateScrollProperty);
            document.removeEventListener("mousemove", updateCustomProperties);
            document.removeEventListener("click", updateCustomProperties);
        };
    }, []);
}
//# sourceMappingURL=useCustomProperties.js.map