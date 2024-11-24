import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconFolder } from '@tabler/icons-react';
import { motion } from 'framer-motion';
/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton = ({ currentDirectory }) => {
    return (_jsxs(motion.button, { className: "flex items-center bg-gray-700 px-3 py-1 rounded-md text-peach text-sm hover:bg-gray-600 transition-all duration-300 ease-in-out", whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, children: [_jsx(IconFolder, { size: 16, className: "mr-2 text-yellow-500" }), _jsx(motion.div, { className: "truncate max-w-xs", initial: { clipPath: 'circle(0% at 50% 50%)' }, animate: { clipPath: 'circle(100% at 50% 50%)' }, transition: { duration: 0.5 }, children: _jsx("span", { children: currentDirectory }) })] }));
};
export default CurrentDirectoryButton;
//# sourceMappingURL=CurrentDirectoryButton.js.map