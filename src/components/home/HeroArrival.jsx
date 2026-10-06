import React from "react";
import { Plus, UserPlus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampaignSelect from "@/components/common/CampaignSelect";
import ProgressTracker from "@/components/home/ProgressTracker";

export default function HeroArrival({
  campaign,
  campaigns,
  onSelectCampaign,
  progress,
  onCreateScene,
  onCreateNpc,
  onCreateLocation,
  onCreateCampaign,
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hex-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,hsl(var(--primary)/0.16),transparent_62%)]" />
      <div className="relative flex min-h-[44vh] flex-col justify-center gap-6 px-6 py-10 md:min-h-[52vh] md:px-12 md:py-14">
        <span className="tag w-fit border border-primary/40 text-primary">Outil du Maître du Jeu</span>
        <div>
          <h1 className="display-xl font-bold text-foreground">Arcanes &amp; Scénarios</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Structurez votre campagne en actes et scènes ramifiées, suivez ce qui a déjà été joué et
            rattachez le codex du monde à chaque scène.
          </p>
        </div>

        <div className="grid gap-4 md:max-w-2xl md:grid-cols-2">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Campagne
            </span>
            {campaigns.length === 0 ? (
              <Button variant="secondary" className="w-full justify-start" onClick={onCreateCampaign}>
                <Plus className="mr-2 h-4 w-4" /> Créer une campagne
              </Button>
            ) : (
              <CampaignSelect
                campaigns={campaigns}
                value={campaign?.id}
                onValueChange={onSelectCampaign}
                className="w-full"
                placeholder="Choisir une campagne"
                allowCreate
              />
            )}
          </div>
          <ProgressTracker progress={progress} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onCreateScene}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle scène
            <span className="ml-3 hidden rounded border border-primary-foreground/30 px-1.5 py-0.5 font-mono text-xs md:inline">
              Ctrl N
            </span>
          </Button>
          <Button variant="outline" onClick={onCreateNpc}>
            <UserPlus className="mr-2 h-4 w-4" /> PNJ
          </Button>
          <Button variant="outline" onClick={onCreateLocation}>
            <MapPin className="mr-2 h-4 w-4" /> Lieu
          </Button>
        </div>
      </div>
    </section>
  );
}