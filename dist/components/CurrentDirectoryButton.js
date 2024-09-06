import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconFolder } from '@tabler/icons-react';
/** CurrentDirectoryButton component that displays the current directory.*/
const CurrentDirectoryButton = ({ currentDirectory }) => {
    return (_jsxs("button", { className: "flex items-center bg-gray-700 px-3 py-1 rounded-md text-peach text-sm hover:bg-gray-600 transition-all duration-300 ease-in-out", children: [_jsx(IconFolder, { size: 16, className: "mr-2 text-yellow-500" }), _jsx("span", { className: "truncate max-w-xs", children: currentDirectory })] }));
};
export default CurrentDirectoryButton;
//# sourceMappingURL=CurrentDirectoryButton.js.map