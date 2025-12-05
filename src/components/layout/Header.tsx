import { motion } from "framer-motion";
import { Workflow, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="flex-shrink-0 h-16 border-b border-border/30 bg-background/50 backdrop-blur-lg">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo & Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img src={logo} alt="UAOL Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              UAOL
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Universal AI Orchestration
            </p>
          </div>
        </motion.div>

        {/* Center Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:flex items-center gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <Workflow className="w-4 h-4" />
            Workflows
          </Button>
        </motion.div>

        {/* Right Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/30 transition-colors"
            onClick={() => navigate("/login")}
            aria-label="Login"
          >
            <User className="w-5 h-5 text-primary" />
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
