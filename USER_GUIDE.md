Guide d'utilisation MoniaGauf

Système de gestion de stock et de ventes

🚀 1. Installation (une seule fois)
Prérequis
Un PC sous Windows 10 ou une version plus récente.
Installer Node.js (version LTS) depuis le site officiel.
Étapes d'installation
Copier le dossier MoniaGauf dans :
C:\MoniaGauf\
Double-cliquer sur setup.bat.
Attendre entre 3 et 5 minutes.
Une icône MoniaGauf apparaît sur le bureau.
🎯 2. Utilisation quotidienne

Double-cliquer sur l’icône MoniaGauf du bureau.

Une fenêtre noire (terminal) s’ouvre.
Le navigateur s’ouvre automatiquement sur :
http://localhost:4000
Connexion

Email : messoudigauf@moniagauf.com

Mot de passe : hafid2026

Arrêt de l'application

Fermer simplement la fenêtre noire du terminal.

📊 3. Modules du logiciel
🏠 Tableau de bord

Affiche :

Les statistiques principales
Les alertes de stock faible
Les activités récentes
🌾 Matières premières

Gestion des matières premières :

Farine de blé
Sucre
Graisse végétale
Sel
Cacao
Arômes (Vanille, Fraise, Citron)
Emballages

Fonctionnalités :

Ajouter
Modifier
Supprimer
Rechercher
Filtrer les stocks faibles
📦 Achats

Permet d'enregistrer les achats de matières premières.

Procédure :
Cliquer sur Nouveau bon d'achat.
Sélectionner un fournisseur.
Ajouter les articles achetés.
Saisir la quantité et le prix.
Valider.
Résultat :
Mise à jour automatique du stock.
Génération d’un bon de réception PDF.
Téléchargement possible avec ou sans TVA.
🍪 Produits finis

Gestion des produits fabriqués :

Gaufrette Chocolat 40 g
Gaufrette Chocolat 150 g
Gaufrette Vanille
Gaufrette Citron
Gaufrette Fraise

Le stock augmente après la production et diminue après la vente.

🚚 Fournisseurs

Gestion des fournisseurs :

Nom
Téléphone
Email
Adresse
👤 Clients

Gestion des clients :

Nom
Adresse
RC
NIF
Siège social

Ces informations sont utilisées sur les factures et les bons de livraison.

🛒 Ventes

Permet d'enregistrer les ventes.

Procédure :
Cliquer sur Nouvelle vente.
Sélectionner un client.
Ajouter les produits vendus.
Saisir les quantités.
Indiquer la TVA, la remise et le montant payé.
Valider.
Résultat :
Déduction automatique du stock.
Génération du Bon de Livraison (BL).
Génération de la Facture PDF.
Possibilité de modifier une vente déjà enregistrée.
📜 Historique

Permet de consulter :

Toutes les ventes réalisées
Les produits vendus
Les clients
Les documents PDF générés

Fonctions supplémentaires :

Recherche par date
Recherche par client
Recherche par produit
Export CSV
Top 5 des produits les plus vendus
🏭 Production

Permet de fabriquer les produits finis à partir des matières premières.

Procédure :
Cliquer sur Nouvel ordre de production.
Choisir le produit à fabriquer.
Indiquer le nombre de cartons.
Vérifier les matières nécessaires.
Créer l’ordre.
Statuts possibles

Complétée :

Les matières premières sont déduites du stock.
Les produits finis sont ajoutés au stock.

Non complétée :

L’ordre est annulé sans modification du stock.
📖 Recettes (BOM)

Définissent les quantités de matières premières nécessaires à la fabrication d’un carton.

Exemple :

Farine : 714 g
Graisse : 238 g
Sucre : 209 g
Arôme ou cacao selon le produit

Les recettes sont utilisées automatiquement lors de la production.

💾 4. Sauvegarde des données

Toutes les données sont enregistrées dans :

C:\MoniaGauf\backend\prisma\dev.db
Sauvegarde recommandée

Chaque semaine :

Fermer l’application.
Copier le fichier dev.db.
Le sauvegarder sur :
Une clé USB
Google Drive
OneDrive
Un disque externe
Restauration
Fermer l’application.
Remplacer le fichier dev.db par la sauvegarde.
Relancer MoniaGauf.
🆘 5. Problèmes courants
Le port 4000 est déjà utilisé

Une autre instance du logiciel est déjà ouverte.

Solution :
Fermer les autres fenêtres du terminal ou redémarrer l’ordinateur.

Le navigateur ne s’ouvre pas

Ouvrir manuellement :

http://localhost:4000
Stock insuffisant

Vérifier le stock disponible dans :

Matières premières
Produits finis

Effectuer un achat ou une production si nécessaire.

Mot de passe oublié

Contacter le développeur pour réinitialiser le mot de passe.

L’icône ne fonctionne pas

Vérifier les propriétés du raccourci :

Cible :

C:\MoniaGauf\start.bat

Démarrer dans :

C:\MoniaGauf
🎨 6. Personnalisation

Les informations de l’entreprise affichées sur les PDF peuvent être modifiées dans :

C:\MoniaGauf\frontend\src\lib\company.js

Après modification :

cd C:\MoniaGauf\frontend
npm run build

pour reconstruire l’interface.

📞 Support

En cas de problème, fournir au développeur :

Une capture d’écran de l’erreur.
Une description du problème.
Une copie du fichier dev.db si nécessaire.
