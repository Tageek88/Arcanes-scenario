import React from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Adresse du site Cloudflare Pages : lecture seule tant qu'on n'a pas cliqué sur le crayon. */
export default function PollServiceUrlField({ value, editing, onChange, onEdit, onCommit }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="poll-service-url">Adresse du site Cloudflare Pages</Label>
          {!editing && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEdit}
              aria-label="Modifier l'adresse Cloudflare"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Input
          id="poll-service-url"
          type="url"
          placeholder="https://votre-projet.pages.dev"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          disabled={!editing}
          className={!editing ? "bg-muted text-muted-foreground" : ""}
        />
        <p className="text-xs text-muted-foreground">
          Cette adresse est mémorisée localement et peut être remplacée par celle de votre déploiement.
        </p>
      </div>
    </section>
  );
}
