## Arcanes & Scénario 1.8.3

Mise à jour technique : l'application passe à Tailwind CSS 4, sans changement d'aspect. C'est aussi la première version que vous pouvez installer depuis l'application, à partir de la 1.8.2.

### Améliorations

- **Tailwind CSS 4.** Le moteur de styles est mis à jour. Toutes les pages, les fenêtres, les sept thèmes (en clair et en sombre), le mode table de jeu et l'affichage sur téléphone ont été comparés à la version précédente, élément par élément : l'aspect est le même, sans écart de mise en page ni de couleur mesuré (seul un séparateur de liste, dans Paramètres, est décalé d'un pixel).
- **Alertes de sécurité.** La chaîne de dépendances de l'ancien Tailwind, qui portait des alertes `npm audit`, disparaît.
- **Boutons.** Le curseur « main » est conservé sur tous les boutons.
- **Téléphone et tablette.** Les effets de survol ne s'appliquent plus qu'aux appareils qui ont une souris : après un appui, un bouton ne reste plus « survolé ».
- **Textes d'exemple.** La couleur du texte grisé des champs vides suit maintenant la couleur du texte du thème.

### Utilisation

- **Mettre à jour depuis l'application (Windows, à partir de la 1.8.2)** : **Paramètres › À propos › Vérifier les mises à jour**, puis **Télécharger et installer**.
- **Android** : installez le nouvel APK.

### Améliorations techniques

- La configuration de Tailwind est dans `src/index.css` (plus de `tailwind.config.js` ni de PostCSS), chargée par le plugin Vite `@tailwindcss/vite`.
- `stack-x-*` et `stack-y-*` remplacent `space-x-*` et `space-y-*` pour garder l'espacement de Tailwind 3 ; `cn()` les connaît.
- Les interlignes de Tailwind 3 sont conservés.
- Les règles qui doivent l'emporter sur les classes (mode table de jeu, animations réduites, page « rouleau ») restent hors des couches CSS.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.8.3.exe`, ou utilisez la mise à jour depuis la 1.8.2. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.8.3, `versionCode` 183).

### À venir

- Signature de l'installateur Windows (certificat de signature de code).
- Vérification de l'impression et du PDF avec le nouveau moteur de styles.
