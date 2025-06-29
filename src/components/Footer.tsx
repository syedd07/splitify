import { CreditCard, Facebook, Github, Heart, Instagram, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={cn(
      "w-full py-6 px-4 bg-background border-t mt-12 sm:mt-16 md:mt-20",
      className
    )}>
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col space-y-3">
            <div className="ml-[-4] flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Splitify!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Credit ◦ Ease ◦ Divide
              </p>
            </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The simplest way to split credit card expenses with friends, family, and roommates.
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-medium">Links</h3>
            <div className="flex flex-col space-y-2">
              <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </a>
              <a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </a>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-medium">Legal</h3>
            <div className="flex flex-col space-y-2">
              <a href="mailto:syedyusufali6626@gmail.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} Splitify Credit ◦ Ease ◦ Divide. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <a 
              href="https://www.instagram.com/in/syedd07/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>

            </a>
            <a 
              href="https://www.Linkedin.com/in/syedd07/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
              </a>
            <a
              href="https://www.facebook.com/syedd07"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span className="sr-only">Facebook</span>
            </a>
            <a 
              href="https://github.com/syedd07" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
            <span className="text-sm text-muted-foreground">
              Made with <Heart className="h-3 w-3 inline text-destructive" /> by
              <a href="https://sydali.netlify.app"> Ali</a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;