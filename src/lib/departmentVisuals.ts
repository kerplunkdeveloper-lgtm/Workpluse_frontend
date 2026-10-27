
import {
  Building2,
  Users,
  Headphones,
  Coins,
  Target,
  Code2,
  Megaphone,
  Palette,
  Layers,
  Scale,
  Cog,
  ShieldCheck,
  BarChart3,
  HeartHandshake,
  LifeBuoy,
  Landmark,
  TrendingUp,
  Terminal,
  Sparkles,
  Shield,
  Briefcase,
  LucideIcon,
  Crown,
  Laptop,
  GraduationCap,
  Truck,
  Database,
  Cpu,
} from "lucide-react";

export interface DepartmentStyle {
  iconId: string;
  themeId: string;
  imageUrl?: string;
  description?: string;
}

export interface PresetIcon {
  id: string;
  label: string;
  category: string;
  icon: LucideIcon;
}

export interface PresetTheme {
  id: string;
  label: string;
  gradient: string;
  progressGradient: string;
  shadow: string;
  textColor: string;
  bgLight: string;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: "indigo",
    label: "Royal Indigo",
    gradient: "from-indigo-600 via-indigo-700 to-indigo-800",
    progressGradient: "from-indigo-500 to-indigo-600",
    shadow: "shadow-indigo-500/25",
    textColor: "text-indigo-600",
    bgLight: "bg-indigo-50",
  },
  {
    id: "rose",
    label: "Rose Velvet",
    gradient: "from-rose-500 via-pink-600 to-rose-700",
    progressGradient: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-500/25",
    textColor: "text-rose-600",
    bgLight: "bg-rose-50",
  },
  {
    id: "emerald",
    label: "Emerald Mint",
    gradient: "from-emerald-500 via-teal-600 to-emerald-700",
    progressGradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/25",
    textColor: "text-emerald-600",
    bgLight: "bg-emerald-50",
  },
  {
    id: "amber",
    label: "Amber Sun",
    gradient: "from-amber-500 via-orange-600 to-amber-700",
    progressGradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/25",
    textColor: "text-amber-600",
    bgLight: "bg-amber-50",
  },
  {
    id: "purple",
    label: "Electric Violet",
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    progressGradient: "from-violet-500 to-purple-600",
    shadow: "shadow-purple-500/25",
    textColor: "text-purple-600",
    bgLight: "bg-purple-50",
  },
  {
    id: "cyan",
    label: "Ocean Cyan",
    gradient: "from-blue-600 via-cyan-600 to-teal-600",
    progressGradient: "from-blue-500 to-cyan-500",
    shadow: "shadow-cyan-500/25",
    textColor: "text-cyan-600",
    bgLight: "bg-cyan-50",
  },
  {
    id: "fuchsia",
    label: "Neon Fuchsia",
    gradient: "from-fuchsia-500 via-pink-600 to-purple-600",
    progressGradient: "from-fuchsia-500 to-pink-500",
    shadow: "shadow-fuchsia-500/25",
    textColor: "text-fuchsia-600",
    bgLight: "bg-fuchsia-50",
  },
  {
    id: "slate",
    label: "Executive Dark",
    gradient: "from-slate-700 via-slate-800 to-zinc-900",
    progressGradient: "from-slate-600 to-slate-800",
    shadow: "shadow-slate-500/25",
    textColor: "text-slate-700",
    bgLight: "bg-slate-100",
  },
];

export const PRESET_ICONS: PresetIcon[] = [
  { id: "building", label: "Admin & Executive", category: "Management", icon: Building2 },
  { id: "shield", label: "Governance & Shield", category: "Management", icon: Shield },
  { id: "crown", label: "Leadership", category: "Management", icon: Crown },
  { id: "briefcase", label: "Business Operations", category: "Management", icon: Briefcase },

  { id: "users", label: "Human Resources", category: "People", icon: Users },
  { id: "heart-handshake", label: "People & Culture", category: "People", icon: HeartHandshake },
  { id: "graduation", label: "Training & L&D", category: "People", icon: GraduationCap },

  { id: "headphones", label: "Customer Support", category: "Support", icon: Headphones },
  { id: "lifebuoy", label: "Client Success", category: "Support", icon: LifeBuoy },

  { id: "coins", label: "Finance & Accounts", category: "Finance", icon: Coins },
  { id: "landmark", label: "Banking & Treasury", category: "Finance", icon: Landmark },

  { id: "target", label: "Sales & Targets", category: "Sales", icon: Target },
  { id: "trending-up", label: "Revenue & Growth", category: "Sales", icon: TrendingUp },

  { id: "code", label: "Engineering & Dev", category: "Tech", icon: Code2 },
  { id: "terminal", label: "DevOps & Systems", category: "Tech", icon: Terminal },
  { id: "laptop", label: "IT & Software", category: "Tech", icon: Laptop },
  { id: "cpu", label: "Hardware & AI", category: "Tech", icon: Cpu },
  { id: "database", label: "Data & Infrastructure", category: "Tech", icon: Database },

  { id: "megaphone", label: "Marketing & PR", category: "Growth", icon: Megaphone },
  { id: "sparkles", label: "Brand & Creative", category: "Growth", icon: Sparkles },
  { id: "barchart", label: "Analytics & BI", category: "Growth", icon: BarChart3 },

  { id: "palette", label: "UI / UX Design", category: "Design", icon: Palette },
  { id: "layers", label: "Product Management", category: "Product", icon: Layers },

  { id: "scale", label: "Legal & Compliance", category: "Legal", icon: Scale },
  { id: "shield-check", label: "Security & QA", category: "Security", icon: ShieldCheck },
  { id: "cog", label: "Operations & Logistics", category: "Operations", icon: Cog },
  { id: "truck", label: "Supply Chain", category: "Operations", icon: Truck },
];

export const ICON_MAP: Record<string, LucideIcon> = PRESET_ICONS.reduce(
  (acc, item) => {
    acc[item.id] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>,
);

/**
 * Intelligent automatic mapper that detects standard SaaS department names
 * and returns the appropriate icon and vibrant theme.
 */
export function detectDefaultDepartmentStyle(name: string): {
  iconId: string;
  themeId: string;
  IconComponent: LucideIcon;
  theme: PresetTheme;
} {
  const norm = (name || "").toLowerCase().trim();

  // 1. Engineering / Tech
  if (/engin|softw|develop|tech|code|frontend|backend|fullstack|qa|test|devops|infra|system|it|cloud/i.test(norm)) {
    return {
      iconId: "code",
      themeId: "cyan",
      IconComponent: Code2,
      theme: PRESET_THEMES.find((t) => t.id === "cyan") || PRESET_THEMES[0],
    };
  }

  // 2. Human Resources / People
  if (/human|hr|people|talent|recruit|staff|culture|onboard|hiring/i.test(norm)) {
    return {
      iconId: "users",
      themeId: "rose",
      IconComponent: Users,
      theme: PRESET_THEMES.find((t) => t.id === "rose") || PRESET_THEMES[1],
    };
  }

  // 3. Customer Support / Success
  if (/support|custom|client|help|desk|service|call|ticket/i.test(norm)) {
    return {
      iconId: "headphones",
      themeId: "emerald",
      IconComponent: Headphones,
      theme: PRESET_THEMES.find((t) => t.id === "emerald") || PRESET_THEMES[2],
    };
  }

  // 4. Finance / Accounts
  if (/finan|account|audit|tax|money|bill|pay|treasur|bank/i.test(norm)) {
    return {
      iconId: "coins",
      themeId: "amber",
      IconComponent: Coins,
      theme: PRESET_THEMES.find((t) => t.id === "amber") || PRESET_THEMES[3],
    };
  }

  // 5. Sales / Revenue / Commercial
  if (/sale|revenu|deal|growth|b2b|growth|commercial|client acquisition/i.test(norm)) {
    return {
      iconId: "target",
      themeId: "purple",
      IconComponent: Target,
      theme: PRESET_THEMES.find((t) => t.id === "purple") || PRESET_THEMES[4],
    };
  }

  // 6. Marketing / PR / Content
  if (/market|brand|pr|promot|advert|seo|social|media|content|campaign/i.test(norm)) {
    return {
      iconId: "megaphone",
      themeId: "fuchsia",
      IconComponent: Megaphone,
      theme: PRESET_THEMES.find((t) => t.id === "fuchsia") || PRESET_THEMES[6],
    };
  }

  // 7. Administration / Executive / Management
  if (/admin|manage|exec|director|board|office|general|corp/i.test(norm)) {
    return {
      iconId: "building",
      themeId: "slate",
      IconComponent: Building2,
      theme: PRESET_THEMES.find((t) => t.id === "slate") || PRESET_THEMES[7],
    };
  }

  // 8. Design / Creative / UI UX
  if (/design|ui|ux|creativ|art|graphic|visual/i.test(norm)) {
    return {
      iconId: "palette",
      themeId: "purple",
      IconComponent: Palette,
      theme: PRESET_THEMES.find((t) => t.id === "purple") || PRESET_THEMES[4],
    };
  }

  // 9. Product
  if (/product|pm|roadmap|feature/i.test(norm)) {
    return {
      iconId: "layers",
      themeId: "indigo",
      IconComponent: Layers,
      theme: PRESET_THEMES.find((t) => t.id === "indigo") || PRESET_THEMES[0],
    };
  }

  // 10. Legal / Compliance
  if (/legal|law|complian|policy|counsel|regul/i.test(norm)) {
    return {
      iconId: "scale",
      themeId: "slate",
      IconComponent: Scale,
      theme: PRESET_THEMES.find((t) => t.id === "slate") || PRESET_THEMES[7],
    };
  }

  // 11. Security / Infosec
  if (/secur|cyber|infosec|protect|guard|safety/i.test(norm)) {
    return {
      iconId: "shield-check",
      themeId: "rose",
      IconComponent: ShieldCheck,
      theme: PRESET_THEMES.find((t) => t.id === "rose") || PRESET_THEMES[1],
    };
  }

  // 12. Operations / Logistics
  if (/operat|ops|logist|supply|warehous|fleet/i.test(norm)) {
    return {
      iconId: "cog",
      themeId: "emerald",
      IconComponent: Cog,
      theme: PRESET_THEMES.find((t) => t.id === "emerald") || PRESET_THEMES[2],
    };
  }

  // Fallback default
  return {
    iconId: "sparkles",
    themeId: "indigo",
    IconComponent: Sparkles,
    theme: PRESET_THEMES[0],
  };
}

const STORAGE_KEY = "workpulse_department_styles_v1";

export function getStoredDepartmentStyles(): Record<string, DepartmentStyle> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDepartmentStyle(idOrNameKey: string, style: DepartmentStyle): void {
  if (typeof window === "undefined") return;
  try {
    const all = getStoredDepartmentStyles();
    all[idOrNameKey] = style;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error("Failed to persist department style", err);
  }
}

export function removeStoredDepartmentStyle(idOrNameKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = getStoredDepartmentStyles();
    delete all[idOrNameKey];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Resolves the visual configuration for a department:
 * 1. Checks custom uploaded image or custom icon/theme saved in localStorage by ID or Name.
 * 2. Falls back to intelligent auto-detection based on department relation/domain.
 */
export function resolveDepartmentVisual(
  id: string,
  name: string,
  localOverrides?: Record<string, DepartmentStyle>,
): {
  imageUrl?: string;
  IconComponent: LucideIcon;
  theme: PresetTheme;
  isCustomImage: boolean;
  isAutoDetected: boolean;
} {
  const overrides = localOverrides || getStoredDepartmentStyles();
  const custom = overrides[id] || overrides[name.toLowerCase().trim()];

  const auto = detectDefaultDepartmentStyle(name);

  if (custom) {
    const IconComponent = (custom.iconId && ICON_MAP[custom.iconId]) || auto.IconComponent;
    const theme = PRESET_THEMES.find((t) => t.id === custom.themeId) || auto.theme;

    return {
      imageUrl: custom.imageUrl,
      IconComponent,
      theme,
      isCustomImage: Boolean(custom.imageUrl),
      isAutoDetected: false,
    };
  }

  return {
    imageUrl: undefined,
    IconComponent: auto.IconComponent,
    theme: auto.theme,
    isCustomImage: false,
    isAutoDetected: true,
  };
}
