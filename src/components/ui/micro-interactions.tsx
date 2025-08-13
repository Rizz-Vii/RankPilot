/**
 * Micro-interactions and Progressive Disclosure System
 * Priority 3 Feature Implementation - DevReady Phase 3
 * 
 * Features:
 * - Subtle animations for enhanced user delight
 * - Progressive disclosure patterns for complex features
 * - Accessibility-aware animations
 * - Performance-optimized interactions
 */

import { useTheme } from '@/lib/themes/theme-system';
import { AnimatePresence, motion, MotionProps, Variants } from 'framer-motion';
import { ReactNode, useState } from 'react';

// Animation variants for different interaction types
export const ANIMATION_VARIANTS: Record<string, Variants> = {
    fadeIn: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.2, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.15, ease: 'easeIn' }
        }
    },

    slideUp: {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    },

    slideDown: {
        hidden: {
            opacity: 0,
            y: -20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    },

    slideLeft: {
        hidden: {
            opacity: 0,
            x: 20
        },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            x: -20,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    },

    slideRight: {
        hidden: {
            opacity: 0,
            x: -20
        },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            x: 20,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    },

    scale: {
        hidden: {
            opacity: 0,
            scale: 0.9
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.15, ease: 'easeIn' }
        }
    },

    bounce: {
        hidden: {
            opacity: 0,
            scale: 0.8,
            y: 20
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: [0.68, -0.55, 0.265, 1.55]
            }
        },
        exit: {
            opacity: 0,
            scale: 0.8,
            y: 20,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    },

    staggerChildren: {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        },
        exit: {
            transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    },

    staggerItem: {
        hidden: {
            opacity: 0,
            y: 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            y: -10,
            transition: { duration: 0.2, ease: 'easeIn' }
        }
    }
};

// Base animated component with accessibility support
interface AnimatedProps extends MotionProps {
    children: ReactNode;
    variant?: keyof typeof ANIMATION_VARIANTS;
    className?: string;
    delay?: number;
    duration?: number;
    respectReducedMotion?: boolean;
}

export function Animated({
    children,
    variant = 'fadeIn',
    className = '',
    delay = 0,
    duration,
    respectReducedMotion = true,
    ...motionProps
}: AnimatedProps) {
    const { shouldReduceMotion } = useTheme();

    const shouldAnimate = !respectReducedMotion || !shouldReduceMotion();

    if (!shouldAnimate) {
        return <div className={className}>{children}</div>;
    }

    const variants = ANIMATION_VARIANTS[variant];
    const customVariants = duration ? {
        ...variants,
        visible: {
            ...variants.visible,
            transition: {
                ...(typeof variants.visible === 'object' && 'transition' in variants.visible ? variants.visible.transition : {}),
                duration
            }
        }
    } : variants;

    return (
        <motion.div
            className={className}
            variants={customVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay }}
            {...motionProps}
        >
            {children}
        </motion.div>
    );
}

// Progressive disclosure container
interface ProgressiveDisclosureProps {
    trigger: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
    variant?: 'accordion' | 'modal' | 'drawer' | 'inline';
    className?: string;
    onToggle?: (isOpen: boolean) => void;
}

export function ProgressiveDisclosure({
    trigger,
    children,
    defaultOpen = false,
    variant = 'inline',
    className = '',
    onToggle
}: ProgressiveDisclosureProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        onToggle?.(newState);
    };

    const getAnimationVariant = () => {
        switch (variant) {
            case 'accordion':
                return 'slideDown';
            case 'modal':
                return 'scale';
            case 'drawer':
                return 'slideRight';
            default:
                return 'fadeIn';
        }
    };

    return (
        <div className={className}>
            <div
                onClick={handleToggle}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                aria-expanded={isOpen}
                aria-controls="disclosure-content"
            >
                {trigger}
            </div>

            <AnimatePresence mode="wait">
                {isOpen && (
                    <Animated
                        variant={getAnimationVariant()}
                        className="overflow-hidden"
                    >
                        <div id="disclosure-content" role="region">
                            {children}
                        </div>
                    </Animated>
                )}
            </AnimatePresence>
        </div>
    );
}

// Staggered list animation for multiple items
interface StaggeredListProps {
    children: ReactNode[];
    className?: string;
    itemClassName?: string;
    delay?: number;
    stagger?: number;
}

export function StaggeredList({
    children,
    className = '',
    itemClassName = '',
    delay = 0,
    stagger = 0.1
}: StaggeredListProps) {
    const { shouldReduceMotion } = useTheme();

    if (shouldReduceMotion()) {
        return (
            <div className={className}>
                {children.map((child, index) => (
                    <div key={index} className={itemClassName}>
                        {child}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className={className}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: stagger,
                        delayChildren: delay
                    }
                }
            }}
            initial="hidden"
            animate="visible"
        >
            {children.map((child, index) => (
                <motion.div
                    key={index}
                    className={itemClassName}
                    variants={ANIMATION_VARIANTS.staggerItem}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}

// Hover and focus animations
interface InteractiveProps {
    children: ReactNode;
    className?: string;
    hoverScale?: number;
    hoverRotate?: number;
    focusScale?: number;
    disabled?: boolean;
}

export function Interactive({
    children,
    className = '',
    hoverScale = 1.02,
    hoverRotate = 0,
    focusScale = 1.05,
    disabled = false
}: InteractiveProps) {
    const { shouldReduceMotion } = useTheme();

    if (shouldReduceMotion() || disabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            className={className}
            whileHover={{
                scale: hoverScale,
                rotate: hoverRotate,
                transition: { duration: 0.2 }
            }}
            whileFocus={{
                scale: focusScale,
                transition: { duration: 0.2 }
            }}
            whileTap={{
                scale: 0.98,
                transition: { duration: 0.1 }
            }}
        >
            {children}
        </motion.div>
    );
}

// Loading animation component
interface LoadingAnimationProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
    className?: string;
}

export function LoadingAnimation({
    size = 'md',
    variant = 'spinner',
    className = ''
}: LoadingAnimationProps) {
    const { shouldReduceMotion } = useTheme();

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    if (shouldReduceMotion()) {
        return (
            <div className={`${sizeClasses[size]} bg-primary rounded opacity-50 ${className}`} />
        );
    }

    switch (variant) {
        case 'spinner':
            return (
                <motion.div
                    className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full ${className}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            );

        case 'dots':
            return (
                <div className={`flex space-x-1 ${className}`}>
                    {[0, 1, 2].map((index) => (
                        <motion.div
                            key={index}
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                delay: index * 0.2
                            }}
                        />
                    ))}
                </div>
            );

        case 'pulse':
            return (
                <motion.div
                    className={`${sizeClasses[size]} bg-primary rounded ${className}`}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            );

        case 'bars':
            return (
                <div className={`flex space-x-1 items-end ${className}`}>
                    {[0, 1, 2, 3].map((index) => (
                        <motion.div
                            key={index}
                            className="w-1 bg-primary rounded-sm"
                            animate={{
                                height: ['0.5rem', '1.5rem', '0.5rem']
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: index * 0.1
                            }}
                        />
                    ))}
                </div>
            );

        default:
            return null;
    }
}

// Success/Error state animations
interface StateAnimationProps {
    state: 'idle' | 'loading' | 'success' | 'error';
    children: ReactNode;
    className?: string;
}

export function StateAnimation({ state, children, className = '' }: StateAnimationProps) {
    const getVariant = () => {
        switch (state) {
            case 'loading':
                return 'pulse';
            case 'success':
                return 'bounce';
            case 'error':
                return 'scale';
            default:
                return 'fadeIn';
        }
    };

    const getStateColor = () => {
        switch (state) {
            case 'loading':
                return 'text-info-foreground';
            case 'success':
                return 'text-success-foreground';
            case 'error':
                return 'text-error-foreground';
            default:
                return '';
        }
    };

    return (
        <AnimatePresence mode="wait">
            <Animated
                key={state}
                variant={getVariant()}
                className={`${getStateColor()} ${className}`}
            >
                {children}
            </Animated>
        </AnimatePresence>
    );
}

// Advanced disclosure with multiple sections
interface MultiSectionDisclosureProps {
    sections: Array<{
        id: string;
        trigger: ReactNode;
        content: ReactNode;
        defaultOpen?: boolean;
    }>;
    allowMultiple?: boolean;
    className?: string;
}

export function MultiSectionDisclosure({
    sections,
    allowMultiple = false,
    className = ''
}: MultiSectionDisclosureProps) {
    const [openSections, setOpenSections] = useState<Set<string>>(
        new Set(sections.filter(s => s.defaultOpen).map(s => s.id))
    );

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => {
            const newSet = new Set(prev);

            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                if (!allowMultiple) {
                    newSet.clear();
                }
                newSet.add(sectionId);
            }

            return newSet;
        });
    };

    return (
        <div className={className}>
            {sections.map((section, index) => (
                <div key={section.id} className="border-b border-border last:border-b-0">
                    <div
                        onClick={() => toggleSection(section.id)}
                        className="cursor-pointer p-4 hover:bg-muted/50 transition-colors"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleSection(section.id);
                            }
                        }}
                        aria-expanded={openSections.has(section.id)}
                        aria-controls={`section-${section.id}`}
                    >
                        {section.trigger}
                    </div>

                    <AnimatePresence>
                        {openSections.has(section.id) && (
                            <Animated
                                variant="slideDown"
                                className="overflow-hidden"
                            >
                                <div id={`section-${section.id}`} className="p-4 pt-0">
                                    {section.content}
                                </div>
                            </Animated>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
}

// Tooltip with micro-interaction
interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 500
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <Animated
                        variant="fadeIn"
                        className={`absolute z-50 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-lg whitespace-nowrap ${positionClasses[position]}`}
                    >
                        {content}
                    </Animated>
                )}
            </AnimatePresence>
        </div>
    );
}
