import { CARD_STYLES, defaultBackground, renderCardPng, type CardStyleId } from "./celebrationCard";
import { defaultMessage, personInitials, type Moment, type MomentKind } from "./celebrations";

/**
 * The default card template for each occasion. Set once on the Celebrations page, then
 * used wherever a person's birthday/anniversary is listed (dashboard and Celebrations).
 * Stored per workspace in this browser.
 */
export type Template = { styleId: CardStyleId; background: string | null };
export type SavedTemplates = Record<MomentKind, Template>;

const storageKey = (orgId: string) => `wp-celebration-template:${orgId}`;
export const emptyTemplate = (): Template => ({ styleId: "default", background: null });
export const emptySaved = (): SavedTemplates => ({ Birthday: emptyTemplate(), "Work anniversary": emptyTemplate() });

function cleanTemplate(value: unknown): Template {
  const raw = (value ?? {}) as Partial<Template>;
  return {
    styleId: CARD_STYLES.some((s) => s.id === raw.styleId) ? (raw.styleId as CardStyleId) : "default",
    background: typeof raw.background === "string" ? raw.background : null,
  };
}

export function readSavedTemplates(orgId: string): SavedTemplates {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(orgId)) || "null");
    if (parsed && ("Birthday" in parsed || "Work anniversary" in parsed)) {
      return { Birthday: cleanTemplate(parsed.Birthday), "Work anniversary": cleanTemplate(parsed["Work anniversary"]) };
    }
    // Earlier versions saved one template for every card: keep it for both occasions.
    const legacy = cleanTemplate(parsed);
    return { Birthday: legacy, "Work anniversary": { ...legacy } };
  } catch {
    return emptySaved();
  }
}

/** Returns false when the browser refused to store it (storage full or blocked). */
export function writeSavedTemplates(orgId: string, saved: SavedTemplates): boolean {
  try {
    localStorage.setItem(storageKey(orgId), JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

export const momentKindLabel = (moment: Moment) =>
  moment.kind === "Birthday" ? "Happy birthday" : `${moment.years} ${moment.years === 1 ? "year" : "years"} together`;

export const momentSubtitle = (moment: Moment) =>
  [moment.person.designation, moment.person.department].filter(Boolean).join(" · ");

export type CardBrand = { companyName: string; logoUrl?: string | null };

/**
 * Builds the card for one person from the saved default template and downloads it as a PNG.
 * Pass `message` to override the standard greeting.
 */
export async function downloadMomentCard(
  moment: Moment,
  { companyName, logoUrl }: CardBrand,
  saved: SavedTemplates,
  message?: string,
  photoUrl: string | null = moment.person.photoUrl ?? null,
): Promise<{ skippedRemote: boolean }> {
  const template = saved[moment.kind];
  const { blob, skippedRemote } = await renderCardPng({
    background: template.background || defaultBackground(moment.kind),
    styleId: template.styleId,
    kindLabel: momentKindLabel(moment),
    name: moment.name,
    subtitle: momentSubtitle(moment),
    message: message ?? defaultMessage(moment, companyName),
    companyName,
    logoUrl,
    photoUrl,
    initials: personInitials(moment.name),
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${moment.name.replace(/\s+/g, "-").toLowerCase()}-${moment.kind === "Birthday" ? "birthday" : "anniversary"}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return { skippedRemote };
}
