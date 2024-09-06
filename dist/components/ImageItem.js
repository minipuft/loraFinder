import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import styles from "../styles/ImageItem.module.scss";
import { truncateImageTitle } from "../utils/stringUtils.js";
const ImageItem = React.memo(({ image, onClick, containerWidth, containerHeight, zoom, groupCount }) => {
    const scaledWidth = containerWidth * zoom;
    const scaledHeight = containerHeight * zoom;
    return (_jsxs("div", { className: `${styles.imageWrapper} ${styles.smoothTransition}`, style: { width: scaledWidth, height: scaledHeight }, onClick: onClick, children: [_jsx("img", { src: image.src, alt: image.alt, className: styles.image }), _jsx("div", { className: styles.imageOverlay, children: _jsx("div", { className: styles.imageTitle, children: _jsx("p", { className: "text-sm font-medium truncate", children: truncateImageTitle(image.alt) }) }) }), groupCount && groupCount > 1 && (_jsx("div", { className: `${styles.groupCounter} ${styles.alwaysVisible}`, children: groupCount }))] }));
});
export default ImageItem;
//# sourceMappingURL=ImageItem.js.map