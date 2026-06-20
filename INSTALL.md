# MoniaGauf — Guide d'installation

## 📦 Étape 1 — Préparation (sur le PC du développeur)

Copiez le dossier complet `MoniaGauf` (incluant `backend/`, `frontend/`, et les `.bat`) sur une clé USB ou disque externe.

> ⚠️ **Important** : ne copiez PAS les dossiers `node_modules` (trop volumineux). Ils seront recréés à l'installation.

Avant de copier, vous pouvez supprimer ces dossiers pour gagner de la place :
- `MoniaGauf/backend/node_modules/`
- `MoniaGauf/frontend/node_modules/`
- `MoniaGauf/frontend/dist/`

---

## 💻 Étape 2 — Installation sur le PC de l'usine

### 1. Installer Node.js
Téléchargez la version **LTS** depuis https://nodejs.org/ et installez-la (cliquez "Suivant" pour tout).

### 2. Copier le dossier
Collez le dossier `MoniaGauf` à la racine du disque, par exemple : `C:\MoniaGauf\`.

### 3. Lancer l'installation
- Naviguez vers `C:\MoniaGauf\`
- **Double-cliquez sur `setup.bat`**
- Patientez 3-5 minutes (téléchargement des dépendances + construction)

À la fin, un raccourci **MoniaGauf** apparaît sur le Bureau.

---

## 🚀 Utilisation quotidienne

### Démarrer l'application
**Double-cliquez sur l'icône MoniaGauf** sur le Bureau.
- Le serveur démarre dans une fenêtre noire
- Le navigateur s'ouvre automatiquement sur `http://localhost:4000`

### Se connecter
| Champ | Valeur |
|---|---|
| Email | `xxxxxxxxxxf@moniagauf.com` |
| Mot de passe | `XXXXXX` |

### Arrêter l'application
- **Fermez la fenêtre noire** (cmd) — le serveur s'arrête
- Ou appuyez `Ctrl+C` dans la fenêtre

---

## 💾 Sauvegarde des données

Toutes vos données (clients, ventes, productions, stock...) sont stockées dans **un seul fichier** :

```
C:\MoniaGauf\backend\prisma\dev.db
```

### À sauvegarder régulièrement
Copiez ce fichier sur :
- Une clé USB
- Un disque externe
- Ou Google Drive / Dropbox

**Recommandation** : 1 sauvegarde par semaine minimum, ou après chaque grosse journée.

### Restaurer une sauvegarde
1. Arrêtez l'application
2. Remplacez `dev.db` par votre copie de sauvegarde
3. Relancez l'application

---

## 🆘 Problèmes courants

### "Le port 4000 est déjà utilisé"
Une autre instance de MoniaGauf est déjà ouverte. Fermez-la d'abord.
- Cherchez une fenêtre noire ouverte et fermez-la
- Ou redémarrez le PC

### Le navigateur n'ouvre pas automatiquement
- Ouvrez votre navigateur (Chrome, Firefox, Edge...)
- Tapez : `http://localhost:4000`

### "Stock insuffisant" lors d'une vente
- Vérifiez la page **Produits finis** : la quantité disponible y est affichée
- Si vous avez vraiment plus de stock, faites d'abord une **Production** pour mettre à jour

### Mot de passe oublié
Contactez le développeur — un script peut réinitialiser le compte.

---

## 📞 Support
En cas de problème, contactez le développeur avec :
- Une capture d'écran de l'erreur
- Une description de ce que vous faisiez
