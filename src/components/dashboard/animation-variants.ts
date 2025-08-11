import { Variants } from 'framer-motion';

// Shared framer-motion variants for dashboard section & card entrance animations
export const dashboardContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { delayChildren: 0.15, staggerChildren: 0.08 }
    }
};

export const dashboardItemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 120, damping: 16 }
    }
};
