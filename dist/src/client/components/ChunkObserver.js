import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
const ChunkObserver = ({ children, chunkIndex, setVisibleChunks }) => {
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisibleChunks(prev => [...prev, chunkIndex]);
            }
        }, { threshold: 0.1 });
        if (ref.current) {
            observer.observe(ref.current);
        }
        return () => observer.disconnect();
    }, [chunkIndex, setVisibleChunks]);
    return _jsx("div", { ref: ref, children: children });
};
export default ChunkObserver;
//# sourceMappingURL=ChunkObserver.js.map