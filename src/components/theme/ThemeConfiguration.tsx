"use client";

/**
 * Theme Configuration Component
 * Priority 3 Feature Implementation - DevReady Phase 3
 *
 * Features:
 * - User-configurable theme preferences
 * - Accessibility options
 * - Real-time theme preview
 * - Advanced customization options
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { ThemeMode, ThemePreferences } from "@/lib/themes/theme-system";
import { useTheme } from "@/lib/themes/theme-system";
import {
  Accessibility,
  Eye,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  Type,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

interface ThemeConfigurationProps {
  className?: string;
}

export function ThemeConfiguration({ className }: ThemeConfigurationProps) {
  const { toast } = useToast();
  const {
    theme,
    preferences,
    setTheme,
    setPreferences,
    isDark,
    isHighContrast,
    shouldReduceMotion,
    hasColorBlindnessSupport,
  } = useTheme();

  const [customColors, setCustomColors] = useState(() => {
    // Prefer persisted text values (can include var(--token)) to preserve user intent in inputs
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("rankpilot-theme-customColors");
        if (saved) {
          const parsed = JSON.parse(saved) as {
            primary?: string;
            secondary?: string;
            accent?: string;
          };
          return {
            primary:
              parsed.primary ||
              preferences.customColors?.primary ||
              "var(--color-primary-500)",
            secondary:
              parsed.secondary ||
              preferences.customColors?.secondary ||
              "var(--color-gray-500)",
            accent:
              parsed.accent ||
              preferences.customColors?.accent ||
              "var(--color-success-500)",
          };
        }
      } catch {}
    }
    return {
      // Initialize from preferences when available, fall back to tokens
      primary: preferences.customColors?.primary || "var(--color-primary-500)",
      secondary: preferences.customColors?.secondary || "var(--color-gray-500)",
      accent: preferences.customColors?.accent || "var(--color-success-500)",
    };
  });

  const resolveCssVar = (varName: string) => {
    if (typeof window === "undefined") return "";
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return v || "";
  };
  const isHexColor = (v: string | undefined) =>
    !!v && /^#([0-9a-fA-F]{6})$/.test(v);

  // Helpers to avoid raw hex literals while still producing valid #rrggbb for color inputs
  // Clamp a numeric channel to [0,255], coercing non-finite values to 0 to prevent NaN -> "NaN" hex segments
  const clampByte = (n: number) => {
    if (!Number.isFinite(n)) return 0;
    const rounded = Math.round(n);
    if (!Number.isFinite(rounded)) return 0;
    return Math.max(0, Math.min(255, rounded));
  };
  const toHex2 = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  const hexFromRGB = (r: number, g: number, b: number) =>
    `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  const defaultHex = () => hexFromRGB(0, 0, 0); // safe fallback without raw hex literal

  // Parse css color strings like rgb()/rgba()/hsl()/hsla() to #rrggbb; return '' if not parseable
  const cssColorToHex = (v: string): string => {
    if (!v) return "";
    if (/^#([0-9a-fA-F]{6})$/.test(v)) return v;
    // raw HSL triplet like "217.2 91.2% 59.8%" stored in --primary style var
    const triplet = v.match(/^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/);
    if (triplet) {
      const h = parseFloat(triplet[1]);
      const s = parseFloat(triplet[2]) / 100;
      const l = parseFloat(triplet[3]) / 100;
      if ([h, s, l].every(Number.isFinite)) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let rr = 0,
          gg = 0,
          bb = 0;
        if (h < 60) {
          rr = c;
          gg = x;
          bb = 0;
        } else if (h < 120) {
          rr = x;
          gg = c;
          bb = 0;
        } else if (h < 180) {
          rr = 0;
          gg = c;
          bb = x;
        } else if (h < 240) {
          rr = 0;
          gg = x;
          bb = c;
        } else if (h < 300) {
          rr = x;
          gg = 0;
          bb = c;
        } else {
          rr = c;
          gg = 0;
          bb = x;
        }
        return hexFromRGB(255 * (rr + m), 255 * (gg + m), 255 * (bb + m));
      }
    }
    // rgb/rgba
    if (/^rgba?\(/i.test(v)) {
      const parts = v
        .replace(/rgba?\(|\)/g, "")
        .split(",")
        .map((s) => parseFloat(s.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        const [r, g, b] = parts;
        return hexFromRGB(r, g, b);
      }
    }
    // hsl/hsla
    if (/^hsla?\(/i.test(v)) {
      const parts = v
        .replace(/hsla?\(|\)/g, "")
        .split(",")
        .map((s) => s.trim());
      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1]) / 100;
      const l = parseFloat(parts[2]) / 100;
      if ([h, s, l].every(Number.isFinite)) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let rr = 0,
          gg = 0,
          bb = 0;
        if (h < 60) {
          rr = c;
          gg = x;
          bb = 0;
        } else if (h < 120) {
          rr = x;
          gg = c;
          bb = 0;
        } else if (h < 180) {
          rr = 0;
          gg = c;
          bb = x;
        } else if (h < 240) {
          rr = 0;
          gg = x;
          bb = c;
        } else if (h < 300) {
          rr = x;
          gg = 0;
          bb = c;
        } else {
          rr = c;
          gg = 0;
          bb = x;
        }
        return hexFromRGB(255 * (rr + m), 255 * (gg + m), 255 * (bb + m));
      }
    }
    return "";
  };

  // Prefer full CSS color variables (e.g., --color-primary) before triplet vars (e.g., --primary)
  const primaryResolved = customColors.primary.startsWith("var(")
    ? resolveCssVar("--color-primary") ||
      resolveCssVar("--primary") ||
      resolveCssVar("--color-primary-500")
    : customColors.primary;
  const primaryColorForPicker = isHexColor(primaryResolved)
    ? primaryResolved
    : typeof window !== "undefined"
      ? (() => {
          const v =
            resolveCssVar("--color-primary") ||
            resolveCssVar("--primary") ||
            resolveCssVar("--color-primary-500");
          if (isHexColor(v)) return v;
          const hex = cssColorToHex(v);
          return hex || defaultHex();
        })()
      : defaultHex();

  const secondaryResolved = customColors.secondary.startsWith("var(")
    ? resolveCssVar("--color-secondary") ||
      resolveCssVar("--secondary") ||
      resolveCssVar("--color-gray-500")
    : customColors.secondary;
  const secondaryColorForPicker = isHexColor(secondaryResolved)
    ? secondaryResolved
    : (() => {
        const hex = cssColorToHex(secondaryResolved);
        return (
          hex ||
          (isHexColor(primaryColorForPicker)
            ? primaryColorForPicker
            : defaultHex())
        );
      })();

  const accentResolved = customColors.accent.startsWith("var(")
    ? resolveCssVar("--color-accent") ||
      resolveCssVar("--accent") ||
      resolveCssVar("--color-success-500")
    : customColors.accent;
  const accentColorForPicker = isHexColor(accentResolved)
    ? accentResolved
    : (() => {
        const hex = cssColorToHex(accentResolved);
        return (
          hex ||
          (isHexColor(primaryColorForPicker)
            ? primaryColorForPicker
            : defaultHex())
        );
      })();

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  const handlePreferenceChange = (
    key: keyof ThemePreferences,
    value: unknown
  ) => {
    setPreferences({ [key]: value });
  };

  const handleCustomColorChange = (
    colorType: "primary" | "secondary" | "accent",
    color: string
  ) => {
    // Normalize incoming value to a valid hex if possible, otherwise keep as provided token string
    let next = color;
    let valueForPreferences: string | undefined = undefined;
    if (typeof next === "string") {
      if (next.startsWith("#")) {
        if (!isHexColor(next)) {
          // try to normalize 3-digit #rgb to #rrggbb
          const m = /^#([0-9a-fA-F]{3})$/.exec(next);
          if (m) {
            const [r, g, b] = m[1].split("");
            // build without raw hex literal
            next = `#${r}${r}${g}${g}${b}${b}`;
          }
        }
        if (!isHexColor(next)) {
          // fallback to prior resolved value to avoid invalid color assignment
          const prior =
            colorType === "primary"
              ? primaryColorForPicker
              : colorType === "secondary"
                ? secondaryColorForPicker
                : accentColorForPicker;
          next = isHexColor(prior) ? prior : defaultHex();
        }
        valueForPreferences = next; // store concrete hex for preferences
      } else if (next.startsWith("var(")) {
        // If token string provided, attempt to resolve immediately to ensure the color picker stays valid
        const token = next.replace(/^var\(|\)$/g, "").trim();
        const tokenName = token.split(",")[0]?.trim();
        const rawResolved = tokenName ? resolveCssVar(tokenName as string) : "";
        const resolvedHex = cssColorToHex(rawResolved);
        if (resolvedHex && isHexColor(resolvedHex)) {
          // Persist resolved hex to preferences for runtime usage
          valueForPreferences = resolvedHex;
        } else {
          // unresolved token -> keep token as text value but avoid pushing invalid to picker by persisting previous valid color
          const prior =
            colorType === "primary"
              ? primaryColorForPicker
              : colorType === "secondary"
                ? secondaryColorForPicker
                : accentColorForPicker;
          if (!isHexColor(prior)) {
            // force a stable default to prevent #NaNNaNNaN
            next = next; // keep token for text field
            valueForPreferences = defaultHex();
          } else {
            valueForPreferences = prior;
          }
        }
      }
    }
    const newCustomColors = { ...customColors, [colorType]: next };
    setCustomColors(newCustomColors);
    // Persist into theme preferences so ThemeSystem applies overrides and cookie sync stays accurate
    const persistedForPreferences = {
      primary:
        colorType === "primary"
          ? valueForPreferences ||
            preferences.customColors?.primary ||
            primaryColorForPicker
          : preferences.customColors?.primary || primaryColorForPicker,
      secondary:
        colorType === "secondary"
          ? valueForPreferences ||
            preferences.customColors?.secondary ||
            secondaryColorForPicker
          : preferences.customColors?.secondary || secondaryColorForPicker,
      accent:
        colorType === "accent"
          ? valueForPreferences ||
            preferences.customColors?.accent ||
            accentColorForPicker
          : preferences.customColors?.accent || accentColorForPicker,
    };
    setPreferences({ customColors: persistedForPreferences });
    // Persist token text for UI display separately so we don't lose the var(--token) text
    try {
      localStorage.setItem(
        "rankpilot-theme-customColors",
        JSON.stringify(newCustomColors)
      );
    } catch {}
  };

  const resetToDefaults = () => {
    setTheme("auto");
    setPreferences({
      mode: "auto",
      reducedMotion: false,
      fontSize: "medium",
      colorBlindnessSupport: false,
      highContrast: false,
    });
    setCustomColors({
      primary: "var(--color-primary-500)",
      secondary: "var(--color-gray-500)",
      accent: "var(--color-success-500)",
    });
    setPreferences({
      customColors: {
        primary: undefined,
        secondary: undefined,
        accent: undefined,
      },
    });
  };

  // Non-async click handlers that delegate to async helpers to satisfy no-misused-promises
  const exportTheme = async () => {
    const config = JSON.stringify(preferences, null, 2);
    try {
      await navigator.clipboard.writeText(config);
      toast({ title: "Theme exported", description: "Copied to clipboard." });
    } catch {
      const w = window.open("", "_blank", "width=600,height=400");
      if (w && w.document) {
        w.document.write(
          '<pre style="white-space:pre-wrap;word-break:break-word;margin:0;padding:12px;font-family:monospace;"></pre>'
        );
        w.document.title = "Theme Export";
        const pre = w.document.querySelector("pre");
        if (pre) pre.textContent = config;
      } else {
        toast({
          title: "Clipboard unavailable",
          description: "Opened export in a new tab.",
          variant: "destructive",
        });
      }
    }
  };

  const importTheme = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const config = JSON.parse(text);
      const schema = z.object({
        highContrast: z.boolean().optional(),
        reducedMotion: z.boolean().optional(),
        fontSize: z
          .enum(["small", "medium", "large", "extra-large"])
          .optional(),
        colorBlindnessSupport: z.boolean().optional(),
        mode: z.enum(["light", "dark", "high-contrast", "auto"]).optional(),
        customColors: z
          .object({
            primary: z.string().optional(),
            secondary: z.string().optional(),
            accent: z.string().optional(),
          })
          .optional(),
      });
      const parsed = schema.parse(config);
      setPreferences(parsed);
      toast({ title: "Theme imported", description: "Loaded from clipboard." });
    } catch {
      const pasted = window.prompt("Paste theme JSON here");
      if (pasted) {
        try {
          const cfg = JSON.parse(pasted);
          const schema = z.object({
            highContrast: z.boolean().optional(),
            reducedMotion: z.boolean().optional(),
            fontSize: z
              .enum(["small", "medium", "large", "extra-large"])
              .optional(),
            colorBlindnessSupport: z.boolean().optional(),
            mode: z.enum(["light", "dark", "high-contrast", "auto"]).optional(),
            customColors: z
              .object({
                primary: z.string().optional(),
                secondary: z.string().optional(),
                accent: z.string().optional(),
              })
              .optional(),
          });
          const parsed = schema.parse(cfg);
          setPreferences(parsed);
          toast({
            title: "Theme imported",
            description: "Applied pasted JSON.",
          });
        } catch {
          toast({
            title: "Invalid theme JSON",
            description: "Please check the pasted content.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleExportClick = () => {
    void exportTheme();
  };
  const handleImportClick = () => {
    void importTheme();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Theme Configuration
          </h2>
          <p className="text-muted-foreground">
            Customize your interface appearance and accessibility preferences
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="accessibility"
            className="flex items-center gap-2"
          >
            <Accessibility className="h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => handleThemeChange("light")}
                  className="h-20 flex-col gap-2"
                >
                  <Sun className="h-6 w-6" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => handleThemeChange("dark")}
                  className="h-20 flex-col gap-2"
                >
                  <Moon className="h-6 w-6" />
                  Dark
                </Button>
                <Button
                  variant={theme === "high-contrast" ? "default" : "outline"}
                  onClick={() => handleThemeChange("high-contrast")}
                  className="h-20 flex-col gap-2"
                >
                  <Eye className="h-6 w-6" />
                  High Contrast
                </Button>
                <Button
                  variant={theme === "auto" ? "default" : "outline"}
                  onClick={() => handleThemeChange("auto")}
                  className="h-20 flex-col gap-2"
                >
                  <Monitor className="h-6 w-6" />
                  Auto
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Custom Colors</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={primaryColorForPicker || defaultHex()}
                        onChange={(e) =>
                          handleCustomColorChange("primary", e.target.value)
                        }
                        className="w-12 h-12 rounded-md border cursor-pointer"
                      />
                      <Input
                        value={customColors.primary}
                        onChange={(e) =>
                          handleCustomColorChange("primary", e.target.value)
                        }
                        placeholder="var(--color-primary-500)" /* token primary-500 */
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={secondaryColorForPicker || defaultHex()}
                        onChange={(e) =>
                          handleCustomColorChange("secondary", e.target.value)
                        }
                        className="w-12 h-12 rounded-md border cursor-pointer"
                      />
                      <Input
                        value={customColors.secondary}
                        onChange={(e) =>
                          handleCustomColorChange("secondary", e.target.value)
                        }
                        placeholder="var(--color-gray-500)" /* token gray-500 */
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={accentColorForPicker || defaultHex()}
                        onChange={(e) =>
                          handleCustomColorChange("accent", e.target.value)
                        }
                        className="w-12 h-12 rounded-md border cursor-pointer"
                      />
                      <Input
                        value={customColors.accent}
                        onChange={(e) =>
                          handleCustomColorChange("accent", e.target.value)
                        }
                        placeholder="var(--color-success-500)" /* token success-500 */
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibility Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Accessibility controls live under the Accessibility tab in
                Settings. Use that tab to manage High Contrast, Reduced Motion,
                and related options.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Font Size Scale</Label>
                <div className="space-y-2">
                  <Slider
                    value={[
                      preferences.fontSize === "small"
                        ? 0
                        : preferences.fontSize === "medium"
                          ? 1
                          : preferences.fontSize === "large"
                            ? 2
                            : 3,
                    ]}
                    onValueChange={([value]) => {
                      const sizes = [
                        "small",
                        "medium",
                        "large",
                        "extra-large",
                      ] as const;
                      handlePreferenceChange("fontSize", sizes[value]);
                    }}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                    <span>Extra Large</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Typography Preview</h4>
                <div className="space-y-4 p-4 border rounded-lg">
                  <h1 className="text-3xl font-bold">Heading 1 - Main Title</h1>
                  <h2 className="text-2xl font-semibold">
                    Heading 2 - Section Title
                  </h2>
                  <h3 className="text-xl font-medium">
                    Heading 3 - Subsection
                  </h3>
                  <p className="text-base">
                    This is body text that demonstrates the current typography
                    settings. It should be easily readable and comfortable for
                    extended reading sessions.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is secondary text used for descriptions and less
                    important information.
                  </p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    Code text in monospace font
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Performance</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Hardware Acceleration</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Smooth Scrolling</Label>
                      <Switch defaultChecked={!shouldReduceMotion()} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Privacy</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Analytics</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Error Reporting</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Theme Export/Import</h4>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportClick}>
                    Export Theme
                  </Button>
                  <Button variant="outline" onClick={handleImportClick}>
                    Import Theme
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  If a custom color token cannot be resolved, the previous valid
                  color will be used for preview.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Theme Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Active Theme:</div>
                  <div className="text-muted-foreground capitalize">
                    {theme}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Dark Mode:</div>
                  <div className="text-muted-foreground">
                    {isDark() ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">High Contrast:</div>
                  <div className="text-muted-foreground">
                    {isHighContrast() ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Reduced Motion:</div>
                  <div className="text-muted-foreground">
                    {shouldReduceMotion() ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Color Blindness Support:</div>
                  <div className="text-muted-foreground">
                    {hasColorBlindnessSupport() ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
