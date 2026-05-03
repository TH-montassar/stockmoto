# 🔧 StockMoto — Gestion de Stock Pièces Moto & Vélo

## Installation rapide (Windows)

### Prérequis
- Node.js (télécharger sur https://nodejs.org — bouton LTS)

### Étapes

1. Extraire le dossier stockmoto sur ton PC (ex: Bureau)
2. Ouvrir CMD dans ce dossier :
   - Shift + Clic droit dans le dossier → "Ouvrir PowerShell ici"
3. Installer les dépendances :
   ```
   npm install
   ```
4. Lancer l'app :
   ```
   npm start
   ```

### Créer un .exe installable (optionnel)
```
npm run build
```
Le .exe sera dans le dossier `dist/`

## Où sont tes données ?
```
C:\Users\TON_NOM\Documents\StockMoto\stockmoto_data.json
```
- Sauvegarde automatique à chaque modification
- Backup quotidien dans Documents\StockMoto\backups\
- Transférable sur clé USB ou autre PC

