import { motion } from "framer-motion";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="flex-shrink-0 py-4 px-6 bg-transparent">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-6 text-sm">
        <motion.a
          href="/privacy"
          className="text-muted-foreground hover:text-foreground transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Privacy Policy
        </motion.a>
        <motion.a
          href="https://github.com/mcpmessenger/uaol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Github className="w-4 h-4" />
          GitHub
        </motion.a>
      </div>
    </footer>
  );
}
