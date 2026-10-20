// === SECTION NPC DATA ===
// Données intégrées pour composer un PNJ : rôles par univers, traits, motivations et signes distinctifs communs.
// Le MJ peut les compléter ou les remplacer par campagne (voir generatorTables.js).
// Écriture inclusive : « Forgeron·ne », « Prêtre·sse » (comme les relations du Codex).

export const COMMON_DATA = {
  traits: [
    "Curieux·se", "Méfiant·e", "Généreux·se", "Cupide", "Loyal·e", "Rancunier·ère",
    "Jovial·e", "Taciturne", "Orgueilleux·se", "Craintif·ve", "Bavard·e", "Pragmatique",
    "Idéaliste", "Cynique", "Superstitieux·se", "Courageux·se", "Impulsif·ve", "Rusé·e",
    "Maladroit·e", "Perfectionniste", "Charmeur·se", "Solitaire", "Pieux·se", "Joueur·se",
  ],
  motivations: [
    "Venger un proche", "Rembourser une dette", "Protéger sa famille", "Faire fortune",
    "Retrouver un proche disparu", "Racheter une faute passée", "Gagner la reconnaissance de ses pairs",
    "Cacher un secret compromettant", "Prendre le pouvoir en coulisses", "Fuir un passé encombrant",
    "Découvrir la vérité sur un mystère", "Servir fidèlement une cause", "Obtenir justice",
    "Survivre un jour de plus", "Préserver une tradition menacée", "Se débarrasser d'un rival",
  ],
  appearances: [
    "Cicatrice visible sur la joue", "Regard perçant", "Mains abîmées par le travail",
    "Vêtements propres mais très rapiécés", "Démarche boitillante", "Voix rauque",
    "Tatouage visible à l'avant-bras", "Cheveux prématurément blanchis", "Dents manquantes",
    "Bijou voyant porté en permanence", "Tenue impeccable, presque trop soignée", "Yeux cernés par le manque de sommeil",
    "Grande carrure", "Silhouette frêle", "Odeur persistante de fumée",
    "Gestes lents et mesurés", "Regard fuyant", "Rire sonore", "Ongles rongés", "Posture très droite",
  ],
};

export const ROLE_DATA = {
  arcanes: [
    "Aubergiste", "Archiviste du Chapitre", "Alchimiste de quartier", "Colporteur·se de reliques", "Garde de nuit",
    "Cartographe", "Médium de foire", "Fossoyeur·se", "Copiste", "Passeur·se",
  ],
  heroic_fantasy: [
    "Forgeron·ne", "Capitaine de la garde", "Prêtre·sse du temple", "Maître·sse d'armes", "Barde itinérant·e",
    "Éclaireur·se", "Intendant·e du château", "Chasseur·se de primes", "Herboriste", "Marchand·e de la route",
  ],
  cosmic_horror: [
    "Bibliothécaire de l'université", "Médecin de campagne", "Shérif local·e", "Antiquaire", "Gardien·ne de phare",
    "Journaliste d'investigation", "Pêcheur·se du port", "Professeur·e d'anthropologie", "Employé·e de la morgue", "Détective privé·e",
  ],
  gothic: [
    "Majordome", "Gouvernante", "Comte·sse déchu·e", "Médecin aliéniste", "Libraire d'ouvrages rares",
    "Chanoine de l'abbaye", "Peintre de portraits", "Chasseur·se de vampires", "Cocher·ère de nuit", "Croque-mort",
  ],
  cyberpunk: [
    "Ripperdoc", "Fixer", "Netrunner indépendant·e", "Agent·e de sécurité corporatiste", "Tenancier·ère de bar clandestin",
    "Livreur·se de rue", "Contrebandier·ère de puces", "Journaliste de rue", "Mécanicien·ne de véhicules", "Cadre d'une mégacorporation",
  ],
  space_opera: [
    "Capitaine de cargo", "Mécanicien·ne de bord", "Diplomate de la Fédération", "Chasseur·se de primes", "Pilote de course",
    "Archéologue des ruines anciennes", "Contrebandier·ère", "Médecin de station", "Officier·ère de la patrouille", "Marchand·e itinérant·e",
  ],
  dark_fantasy: [
    "Bourreau", "Chasseur·se de sorcières", "Prêcheur·se fanatique", "Mercenaire sans solde", "Fossoyeur·se",
    "Apothicaire", "Seigneur·e de guerre", "Mendiant·e prophète", "Ancien·ne soldat·e", "Passeur·se du marais",
  ],
  wasteland_nucleaire: [
    "Marchand·e de ferraille", "Chef de convoi", "Mécanicien·ne", "Pillard·e repenti·e", "Gardien·ne de puits",
    "Soigneur·se de fortune", "Éclaireur·se des routes", "Contrebandier·ère d'eau", "Chasseur·se de reliques", "Chef de camp",
  ],
  effondrement_climatique: [
    "Pêcheur·se de la plateforme", "Navigateur·rice", "Ingénieur·e hydraulique", "Gardien·ne de digue", "Cultivateur·rice de serre",
    "Passeur·se de réfugiés", "Médecin du refuge", "Négociateur·rice de la flottille", "Récupérateur·rice d'épaves", "Météorologue de fortune",
  ],
  ruines_technologiques: [
    "Technicien·ne de maintenance", "Archiviste de données", "Chasseur·se de reliques numériques", "Réparateur·rice d'automates", "Garde du dôme",
    "Pilote de drones", "Éclaireur·se des zones mortes", "Ingénieur·e de laboratoire", "Chef de communauté", "Intelligence artificielle de quartier",
  ],
  peste_et_survie: [
    "Médecin de camp", "Pharmacien·ne", "Éclaireur·se", "Chef de camp", "Cultivateur·rice",
    "Mécanicien·ne", "Gardien·ne de refuge", "Négociateur·rice", "Ancien·ne militaire", "Instituteur·rice survivant·e",
  ],
  cataclysme_magique: [
    "Mage rescapé·e", "Gardien·ne du cercle de pierres", "Herboriste des forêts mutées", "Chasseur·se de créatures instables", "Archiviste de grimoires",
    "Guide des terres brisées", "Forgeron·ne de runes", "Ermite", "Prêtre·sse du culte du chaos", "Marchand·e de cristaux de mana",
  ],
};
