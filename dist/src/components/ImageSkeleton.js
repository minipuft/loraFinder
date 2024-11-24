import { jsx as _jsx } from "react/jsx-runtime";
import styles from "../styles/ImageItem.module.scss";
const ImageSkeleton = ({ containerWidth, containerHeight }) => {
    return (_jsx("div", { className: `${styles.imageItem} ${styles.imageSkeleton}`, style: {
            width: containerWidth,
            height: containerHeight,
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: `${containerWidth} / ${containerHeight}`,
        }, children: _jsx("div", { className: styles.skeletonAnimation }) }));
};
export default ImageSkeleton;
//# sourceMappingURL=ImageSkeleton.js.map