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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeMode, ThemePreferences, useTheme } from '@/lib/themes/theme-system';
import {
    Accessibility,
    Eye,
    Monitor,
    Moon,
    Palette,
    Settings,
    Sun,
    Type
} from 'lucide-react';
import { useState } from 'react';

interface ThemeConfigurationProps {
    className?: string;
}

export function ThemeConfiguration({ className }: ThemeConfigurationProps) {
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

    const [customColors, setCustomColors] = useState({
        primary: preferences.customColors?.primary || '#3B82F6',
        secondary: preferences.customColors?.secondary || '#6B7280',
        accent: preferences.customColors?.accent || '#10B981',
    });

    const handleThemeChange = (newTheme: ThemeMode) => {
        setTheme(newTheme);
    };

    const handlePreferenceChange = (_key: keyof ThemePreferences, _value: unknown) => {
        setPreferences({ [key]: value });
    };

    const handleCustomColorChange = (colorType: string, color: string) => {
        const newCustomColors = { ...customColors, [colorType]: color };
        setCustomColors(newCustomColors);
        setPreferences({ customColors: newCustomColors });
    };

    const resetToDefaults = () => {
        setTheme('auto');
        setPreferences({
            mode: 'auto',
            reducedMotion: false,
            fontSize: 'medium',
            colorBlindnessSupport: false,
            highContrast: false,
        });
        setCustomColors({
            primary: '#3B82F6',
            secondary: '#6B7280',
            accent: '#10B981',
        });
    };

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Theme Configuration</h2>
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
                    <TabsTrigger value="accessibility" className="flex items-center gap-2">
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
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    onClick={() => handleThemeChange('light')}
                                    className="h-20 flex-col gap-2"
                                >
                                    <Sun className="h-6 w-6" />
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    onClick={() => handleThemeChange('dark')}
                                    className="h-20 flex-col gap-2"
                                >
                                    <Moon className="h-6 w-6" />
                                    Dark
                                </Button>
                                <Button
                                    variant={theme === 'high-contrast' ? 'default' : 'outline'}
                                    onClick={() => handleThemeChange('high-contrast')}
                                    className="h-20 flex-col gap-2"
                                >
                                    <Eye className="h-6 w-6" />
                                    High Contrast
                                </Button>
                                <Button
                                    variant={theme === 'auto' ? 'default' : 'outline'}
                                    onClick={() => handleThemeChange('auto')}
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
                                                value={customColors.primary}
                                                onChange={(e) => handleCustomColorChange('primary', e.target._value)}
                                                className="w-12 h-12 rounded-md border cursor-pointer"
                                            />
                                            <Input
                                                value={customColors.primary}
                                                onChange={(e) => handleCustomColorChange('primary', e.target._value)}
                                                placeholder="#3B82F6"
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
                                                value={customColors.secondary}
                                                onChange={(e) => handleCustomColorChange('secondary', e.target._value)}
                                                className="w-12 h-12 rounded-md border cursor-pointer"
                                            />
                                            <Input
                                                value={customColors.secondary}
                                                onChange={(e) => handleCustomColorChange('secondary', e.target._value)}
                                                placeholder="#6B7280"
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
                                                value={customColors.accent}
                                                onChange={(e) => handleCustomColorChange('accent', e.target._value)}
                                                className="w-12 h-12 rounded-md border cursor-pointer"
                                            />
                                            <Input
                                                value={customColors.accent}
                                                onChange={(e) => handleCustomColorChange('accent', e.target._value)}
                                                placeholder="#10B981"
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
                                Accessibility Options
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>High Contrast Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enhances text and element contrast for better visibility
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.highContrast}
                                    onCheckedChange={(checked) => handlePreferenceChange('highContrast', checked)}
                                />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Reduce Motion</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Minimizes animations and transitions for users sensitive to motion
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.reducedMotion}
                                    onCheckedChange={(checked) => handlePreferenceChange('reducedMotion', checked)}
                                />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Color Blindness Support</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Optimizes color combinations for color vision deficiencies
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.colorBlindnessSupport}
                                    onCheckedChange={(checked) => handlePreferenceChange('colorBlindnessSupport', checked)}
                                />
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label>Font Size</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Adjust the base font size for better readability
                                    </p>
                                </div>
                                <Select
                                    value={preferences.fontSize}
                                    onValueChange={(_value: 'small' | 'medium' | 'large' | 'extra-large') =>
                                        handlePreferenceChange('fontSize', _value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Small (87.5%)</SelectItem>
                                        <SelectItem value="medium">Medium (100%)</SelectItem>
                                        <SelectItem value="large">Large (112.5%)</SelectItem>
                                        <SelectItem value="extra-large">Extra Large (125%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Keyboard Navigation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h4 className="font-medium mb-2">Global Shortcuts</h4>
                                    <div className="space-y-1 text-muted-foreground">
                                        <div>Alt + T: Toggle theme</div>
                                        <div>Alt + /: Search</div>
                                        <div>Alt + D: Dashboard</div>
                                        <div>Esc: Close modals</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Navigation</h4>
                                    <div className="space-y-1 text-muted-foreground">
                                        <div>Tab: Next element</div>
                                        <div>Shift + Tab: Previous element</div>
                                        <div>Enter: Activate</div>
                                        <div>Space: Select</div>
                                    </div>
                                </div>
                            </div>
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
                                            preferences.fontSize === 'small' ? 0 :
                                                preferences.fontSize === 'medium' ? 1 :
                                                    preferences.fontSize === 'large' ? 2 : 3
                                        ]}
                                        onValueChange={([value]) => {
                                            const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
                                            handlePreferenceChange('fontSize', sizes[value]);
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
                                    <h2 className="text-2xl font-semibold">Heading 2 - Section Title</h2>
                                    <h3 className="text-xl font-medium">Heading 3 - Subsection</h3>
                                    <p className="text-base">
                                        This is body text that demonstrates the current typography settings.
                                        It should be easily readable and comfortable for extended reading sessions.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        This is secondary text used for descriptions and less important information.
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
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const config = JSON.stringify(preferences, null, 2);
                                            navigator.clipboard.writeText(config);
                                        }}
                                    >
                                        Export Theme
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.readText().then(text => {
                                                try {
                                                    const config = JSON.parse(text);
                                                    setPreferences(config);
                                                } catch (_error) {
                                                    console.error('Invalid theme configuration');
                                                }
                                            });
                                        }}
                                    >
                                        Import Theme
                                    </Button>
                                </div>
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
                                    <div className="text-muted-foreground capitalize">{theme}</div>
                                </div>
                                <div>
                                    <div className="font-medium">Dark Mode:</div>
                                    <div className="text-muted-foreground">{isDark() ? 'Enabled' : 'Disabled'}</div>
                                </div>
                                <div>
                                    <div className="font-medium">High Contrast:</div>
                                    <div className="text-muted-foreground">{isHighContrast() ? 'Enabled' : 'Disabled'}</div>
                                </div>
                                <div>
                                    <div className="font-medium">Reduced Motion:</div>
                                    <div className="text-muted-foreground">{shouldReduceMotion() ? 'Enabled' : 'Disabled'}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
