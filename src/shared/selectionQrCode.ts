import QRCode from "qrcode";

export function selectionQrCodeSvg(text: string): Promise<string> {
  if (!text.trim()) {
    return Promise.reject(new Error("Selected text is empty"));
  }
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#17201eff",
      light: "#ffffffff"
    }
  });
}
