import React from "react";
const NextImage = ({ src, alt = "", ...props }: any) => (
  <img
    src={typeof src === "string" ? src : src?.src || ""}
    alt={alt}
    {...props}
  />
);
export default NextImage;
