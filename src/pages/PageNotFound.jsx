import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="max-w-md space-y-4 text-center">
                <h1 className="text-7xl font-light text-muted-foreground/30">404</h1>
                <h2 className="font-display text-2xl text-foreground">Page introuvable</h2>
                <p className="text-sm text-muted-foreground">La page « {pathname} » n'existe pas.</p>
                <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
            </div>
        </div>
    );
}