import { Link } from 'react-router-dom';
import eficiaLogo from "@/assets/eficia-logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Link to="/" className="flex items-center">
            <img src={eficiaLogo} alt="Eficia" className="h-12 w-auto" />
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            The most reliable phone number enrichment service. No subscription, just credits.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Eficia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
