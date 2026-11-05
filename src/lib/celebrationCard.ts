/** Card look shared by the on-screen preview and the PNG export. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export const CARD_STYLES = [
  { id: "default", name: "Brand default", overlay: ["rgba(15,23,42,0.10)", "rgba(15,23,42,0.58)"] },
  { id: "sunrise", name: "Warm sunrise", overlay: ["rgba(249,115,22,0.35)", "rgba(190,18,60,0.70)"] },
  { id: "midnight", name: "Midnight", overlay: ["rgba(2,6,23,0.55)", "rgba(2,6,23,0.88)"] },
] as const;
export type CardStyleId = (typeof CARD_STYLES)[number]["id"];

export const defaultBackground = (kind: "Birthday" | "Work anniversary") =>
  kind === "Birthday" ? "/celebrations/birthday.svg" : "/celebrations/anniversary.svg";

export const overlayCss = (styleId: CardStyleId) => {
  const style = CARD_STYLES.find((item) => item.id === styleId) ?? CARD_STYLES[0];
  return `linear-gradient(180deg, ${style.overlay[0]}, ${style.overlay[1]})`;
};

/** Loads an image for canvas use. Resolves null on failure so one bad URL never blocks the card. */
export function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    if (crossOrigin && /^https?:/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Turns an uploaded picture into a card background: cropped to the card's shape and
 * shrunk to a size that is cheap to store and to export.
 */
export async function fileToBackground(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image under 8 MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl, false);
    if (!image) throw new Error("That image could not be read.");
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot process images.");
    const scale = Math.max(CARD_WIDTH / image.width, CARD_HEIGHT / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    context.drawImage(image, (CARD_WIDTH - w) / 2, (CARD_HEIGHT - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type CardInput = {
  background: string;
  styleId: CardStyleId;
  kindLabel: string;
  name: string;
  subtitle: string;
  message: string;
  companyName: string;
  logoUrl?: string | null;
  photoUrl?: string | null;
  initials: string;
};

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

async function draw(input: CardInput, allowRemote: boolean): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot create images.");

  const isRemote = (url?: string | null) => !!url && /^https?:/i.test(url);
  const [background, logo, photo] = await Promise.all([
    loadImage(input.background),
    input.logoUrl && (allowRemote || !isRemote(input.logoUrl)) ? loadImage(input.logoUrl) : null,
    input.photoUrl && (allowRemote || !isRemote(input.photoUrl)) ? loadImage(input.photoUrl) : null,
  ]);

  // Background (cover) + readability overlay
  context.fillStyle = "#1e1b4b";
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  if (background) {
    const scale = Math.max(CARD_WIDTH / background.width, CARD_HEIGHT / background.height);
    const w = background.width * scale;
    const h = background.height * scale;
    context.drawImage(background, (CARD_WIDTH - w) / 2, (CARD_HEIGHT - h) / 2, w, h);
  }
  const style = CARD_STYLES.find((item) => item.id === input.styleId) ?? CARD_STYLES[0];
  const overlay = context.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  overlay.addColorStop(0, style.overlay[0]);
  overlay.addColorStop(1, style.overlay[1]);
  context.fillStyle = overlay;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const pad = 64;

  // Company row: logo (or initials) + name
  roundedRect(context, pad, pad, 72, 72, 18);
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.fill();
  if (logo) {
    context.save();
    roundedRect(context, pad, pad, 72, 72, 18);
    context.clip();
    const fit = Math.min(60 / logo.width, 60 / logo.height);
    context.drawImage(logo, pad + 36 - (logo.width * fit) / 2, pad + 36 - (logo.height * fit) / 2, logo.width * fit, logo.height * fit);
    context.restore();
  } else {
    context.fillStyle = "#4338ca";
    context.font = `800 28px ${FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(input.companyName.slice(0, 2).toUpperCase(), pad + 36, pad + 38);
  }
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.font = `700 26px ${FONT}`;
  context.fillText(input.companyName.toUpperCase().slice(0, 34), pad + 96, pad + 46);

  // Person: photo (or initials) + occasion + name
  const photoSize = 170;
  const photoX = pad;
  const photoY = 200;
  context.save();
  context.beginPath();
  context.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = "rgba(255,255,255,0.18)";
  context.fill();
  context.clip();
  if (photo) {
    const scale = Math.max(photoSize / photo.width, photoSize / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    context.drawImage(photo, photoX + (photoSize - w) / 2, photoY + (photoSize - h) / 2, w, h);
  } else {
    context.fillStyle = "#ffffff";
    context.font = `800 64px ${FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(input.initials, photoX + photoSize / 2, photoY + photoSize / 2 + 4);
  }
  context.restore();
  context.beginPath();
  context.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
  context.lineWidth = 6;
  context.strokeStyle = "rgba(255,255,255,0.85)";
  context.stroke();

  const textX = photoX + photoSize + 44;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = `700 24px ${FONT}`;
  context.fillText(input.kindLabel.toUpperCase().split("").join(" "), textX, photoY + 52);
  context.fillStyle = "#ffffff";
  context.font = `800 64px ${FONT}`;
  context.fillText(input.name.slice(0, 26), textX, photoY + 120);
  if (input.subtitle) {
    context.fillStyle = "rgba(255,255,255,0.8)";
    context.font = `500 28px ${FONT}`;
    context.fillText(input.subtitle.slice(0, 48), textX, photoY + 166);
  }

  // Message + sign-off
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = `500 31px ${FONT}`;
  const lines = wrapText(context, input.message, CARD_WIDTH - pad * 2).slice(0, 4);
  lines.forEach((line, index) => context.fillText(line, pad, 440 + index * 44));
  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = `600 22px ${FONT}`;
  context.fillText(`With appreciation, ${input.companyName} People Team`, pad, CARD_HEIGHT - pad + 8);

  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null); // a cross-origin image without CORS headers "taints" the canvas
    }
  });

/** Renders the card to a PNG. If a remote photo/logo blocks export, retries without remote images. */
export async function renderCardPng(input: CardInput): Promise<{ blob: Blob; usedRemoteImages: boolean; skippedRemote: boolean }> {
  const hasRemote = [input.logoUrl, input.photoUrl].some((url) => !!url && /^https?:/i.test(url));
  const first = await toBlob(await draw(input, true));
  if (first) return { blob: first, usedRemoteImages: hasRemote, skippedRemote: false };
  const second = await toBlob(await draw(input, false));
  if (second) return { blob: second, usedRemoteImages: false, skippedRemote: hasRemote };
  throw new Error("The card image could not be created in this browser.");
}
