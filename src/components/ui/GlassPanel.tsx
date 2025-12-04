import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  tiltEnabled?: boolean;
  glowOnHover?: boolean;
  variant?: "default" | "subtle" | "prominent";
}

export function GlassPanel({
  children,
  className,
  tiltEnabled = true,
  glowOnHover = false,
  variant = "default",
}: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !tiltEnabled) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variantStyles = {
    default: "glass-panel",
    subtle: "glass-panel-subtle",
    prominent: "glass-panel shadow-glass-hover",
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltEnabled ? { rotateX, rotateY, transformStyle: "preserve-3d" } : {}}
      whileHover={glowOnHover ? { scale: 1.01 } : {}}
      className={cn(
        variantStyles[variant],
        "transition-all duration-200",
        glowOnHover && "hover:shadow-aurora hover:border-primary/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
