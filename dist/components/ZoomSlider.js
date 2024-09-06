import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconZoomIn, IconZoomOut } from "@tabler/icons-react";
// ZoomSlider component for adjusting image zoom level
const ZoomSlider = ({ zoom, onZoomChange }) => {
    return (
    // Container for the zoom slider
    _jsxs("div", { className: "flex items-center bg-gray-600 rounded-md p-1", children: [_jsx(IconZoomOut, { size: 16, className: "text-gray-200 mr-1" }), _jsx("input", { type: "range", min: "0.5", max: "2", step: "0.1", value: zoom, onChange: (e) => onZoomChange(parseFloat(e.target.value)), className: "w-20 mx-1 appearance-none bg-gray-500 h-1 rounded-full outline-none" }), _jsx(IconZoomIn, { size: 16, className: "text-gray-200 ml-1" })] }));
};
// Export the ZoomSlider component
export default ZoomSlider;
//# sourceMappingURL=ZoomSlider.js.map