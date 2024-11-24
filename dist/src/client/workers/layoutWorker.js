"use strict";
self.onmessage = (event) => {
    if (event.data.action === "calculateLayout") {
        const { images, containerWidth, containerHeight, targetRowHeight } = event.data;
        const layout = calculateOptimalLayout(images, containerWidth, containerHeight, targetRowHeight);
        self.postMessage({ action: "layoutCalculated", layout });
    }
};
function calculateOptimalLayout(images, containerWidth, containerHeight, targetRowHeight) {
    const layout = [];
    let currentRow = [];
    let currentRowWidth = 0;
    let y = 0;
    for (const image of images) {
        const aspectRatio = image.width / image.height;
        const scaledWidth = targetRowHeight * aspectRatio;
        if (currentRowWidth + scaledWidth > containerWidth &&
            currentRow.length > 0) {
            const rowLayout = layoutRow(currentRow, containerWidth, y, targetRowHeight);
            layout.push(...rowLayout);
            y += targetRowHeight;
            currentRow = [];
            currentRowWidth = 0;
        }
        currentRow.push(image);
        currentRowWidth += scaledWidth;
    }
    if (currentRow.length > 0) {
        const rowLayout = layoutRow(currentRow, containerWidth, y, targetRowHeight);
        layout.push(...rowLayout);
    }
    return layout;
}
function layoutRow(row, containerWidth, y, targetHeight) {
    const totalAspectRatio = row.reduce((sum, img) => sum + img.width / img.height, 0);
    const rowWidth = containerWidth;
    const rowHeight = rowWidth / totalAspectRatio;
    let x = 0;
    return row.map((image) => {
        const width = (image.width / image.height) * rowHeight;
        const item = {
            id: image.id,
            x,
            y,
            width,
            height: rowHeight,
            textureCoords: {
                s: x / containerWidth,
                t: y / containerWidth,
                u: (x + width) / containerWidth,
                v: (y + rowHeight) / containerWidth,
            },
        };
        x += width;
        return item;
    });
}
//# sourceMappingURL=layoutWorker.js.map