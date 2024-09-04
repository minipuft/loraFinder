import React from "react";
import Image from "next/image";
import { GroupedImageInfo } from "../types";
import styles from "../styles/GroupedImageItem.module.css";

interface GroupedImageItemProps {
  group: GroupedImageInfo;
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
}

const GroupedImageItem: React.FC<GroupedImageItemProps> = ({
  group,
  onClick,
  containerWidth,
  containerHeight,
  zoom,
}) => {
  const scaledWidth = containerWidth * zoom;
  const scaledHeight = containerHeight * zoom;

  return (
    <div
      className={`${styles.groupedImageWrapper} ${styles.smoothTransition}`}
      style={{ width: scaledWidth, height: scaledHeight }}
      onClick={onClick}
    >
      <Image
        src={group.images[0].src}
        alt={group.images[0].alt}
        layout="fill"
        objectFit="cover"
        className={styles.image}
      />
      {group.images.length > 1 && (
        <div className={styles.countIndicator}>
          <span>{group.images.length}</span>
        </div>
      )}
      <div className={styles.imageTitle}>
        <p className="text-sm font-medium truncate">{group.title}</p>
      </div>
    </div>
  );
};

export default React.memo(GroupedImageItem);
