# Ajouter un système de jeu fourni

Les systèmes de la liste « Systèmes › Fourni » sont des fichiers JSON du dossier `src/data/systems/`. Pour en ajouter un, aucun code à écrire.

## Procédure

1. Dans l'application, construisez le système dans une campagne : modèle (caractéristiques, liens, dés), cases à cocher, champs de texte, mise en page, puis « Fond de feuille » avec votre propre PDF et « Placer les valeurs ».
2. Cliquez sur « Exporter ce système » (Fond de feuille ou Placer les valeurs) : vous obtenez un fichier `.json`.
3. Copiez-le dans `src/data/systems/` sous un nom sans espace, par exemple `cthulhu-7.json`. L'identifiant du système est `builtin-` suivi du nom du fichier (`builtin-cthulhu-7`) : ne le renommez plus ensuite, des campagnes pourraient s'y référer.
4. Lancez `npm test` : le test des systèmes fournis signale tout fichier inutilisable (JSON invalide, élément que le modèle n'accepte pas, identifiant en double).
5. Ouvrez l'application : le système apparaît dans Systèmes › Fourni.

## Ce qui est livré, ce qui ne l'est pas

- Livré : noms, liens entre statistiques, système de dés, cases à cocher, champs de texte, mises en page et positions des valeurs.
- Jamais livré : compétences et équipements du catalogue (ils sont retirés au chargement, même s'ils sont dans le fichier), fond de feuille, illustrations, texte de règles.
- Vérifiez les droits de l'éditeur du jeu avant d'ajouter un système.

## Mettre à jour un système fourni

Replacez les valeurs dans l'application, exportez de nouveau, et remplacez le fichier du même nom. Les campagnes qui ont déjà copié le système ne changent pas.
