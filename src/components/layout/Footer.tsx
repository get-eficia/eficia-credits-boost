import { Link } from 'react-router-dom';
import eficiaLogo from "@/assets/eficia-logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center">
              <img src={eficiaLogo} alt="Eficia" className="h-12 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground">
              The most reliable phone number enrichment service. No subscription, just credits.
            </p>
          </div>
          
          <div>
            <h4 className="mb-4 font-display font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/app" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 font-display font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 font-display font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground">GDPR</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Eficia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
