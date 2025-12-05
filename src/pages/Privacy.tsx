import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <img src={logo} alt="UAOL Logo" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground -mt-1">Universal AI Orchestration Layer</p>
            </div>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
              <p>
                UAOL (Universal AI Orchestration Layer) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your information 
                when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information (email address, authentication tokens)</li>
                <li>API keys that you configure for AI service providers</li>
                <li>Messages and content you send through the chat interface</li>
                <li>Files and documents you upload for processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and improve our AI orchestration services</li>
                <li>Process your requests and execute workflows</li>
                <li>Authenticate and manage your account</li>
                <li>Communicate with you about your account and our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your 
                personal information. However, no method of transmission over the internet is 
                100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Third-Party Services</h2>
              <p>
                UAOL integrates with third-party AI service providers (OpenAI, Google Gemini, 
                Anthropic Claude). When you use these services, your data may be processed by 
                these providers according to their respective privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Request a copy of your data</li>
                <li>Opt out of certain data processing activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us through 
                our <a href="https://github.com/mcpmessenger/uaol" className="text-primary hover:underline">GitHub repository</a>.
              </p>
            </section>

            <section>
              <p className="text-sm text-muted-foreground/80">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
