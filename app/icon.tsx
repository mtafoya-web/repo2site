import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EFF6FF",
          borderRadius: "16px",
          position: "relative",
          border: "4px solid #2563EB",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "17px",
            left: "16px",
            width: "32px",
            height: "4px",
            borderRadius: "9999px",
            backgroundColor: "#2563EB",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "27px",
            left: "16px",
            width: "24px",
            height: "4px",
            borderRadius: "9999px",
            backgroundColor: "#2563EB",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "37px",
            left: "16px",
            width: "20px",
            height: "4px",
            borderRadius: "9999px",
            backgroundColor: "#2563EB",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "34px",
            left: "40px",
            width: "13px",
            height: "13px",
            borderRadius: "9999px",
            backgroundColor: "#2563EB",
          }}
        />
      </div>
    ),
    size,
  );
}
