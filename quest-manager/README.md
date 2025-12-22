# Quest Manager for Foundry VTT

Un gestionnaire de quêtes avancé pour Foundry VTT avec visualisation en arbre et graphe réseau.

## Fonctionnalités

### Gestion des quêtes
- ✅ Création, édition, suppression de quêtes
- ✅ Statuts: Connue, En cours, Terminée
- ✅ Relations hiérarchiques (parent/enfant)
- ✅ Dépendances (bloque/bloqué par)
- ✅ Liens contextuels entre quêtes
- ✅ Support des liens Foundry (@Actor, @Item, @JournalEntry)

### Visualisation
- ✅ Vue arbre hiérarchique avec drag & drop
- ✅ Vue graphe réseau interactive (vis.js)
- ✅ Filtres et recherche
- ✅ Indicateurs visuels par statut

### Récompenses
- ✅ Ajout d'items de récompense
- ✅ Attribution à un acteur
- ✅ Distribution automatique dans l'inventaire
- ✅ Messages de chat élégants

### Système de notifications
- ✅ Notifications UI avec animations
- ✅ Messages dans le chat
- ✅ Sons personnalisables
- ✅ Détection automatique des quêtes débloquées
- ✅ Système d'achievements

### Permissions
- ✅ Gestion granulaire par joueur
- ✅ Presets prédéfinis
- ✅ Synchronisation temps réel

### Collaboration
- ✅ Synchronisation temps réel GM/Joueurs
- ✅ Sauvegardes automatiques
- ✅ Import/Export JSON

## Installation

### Méthode 1: Via Foundry
1. Ouvrir Foundry VTT
2. Aller dans "Add-on Modules"
3. Cliquer sur "Install Module"
4. Chercher "Quest Manager"
5. Cliquer sur "Install"

### Méthode 2: Manuel
1. Télécharger la dernière version depuis [Releases](https://github.com/votre-repo/quest-manager/releases)
2. Extraire dans `foundrydata/Data/modules/`
3. Redémarrer Foundry VTT
4. Activer le module dans votre monde

## Utilisation

### Ouvrir le gestionnaire
- Cliquer sur l'icône 📖 dans la barre d'outils
- Ou cliquer sur le bouton dans la sidebar du chat

### Créer une quête
1. Cliquer sur "Nouvelle quête"
2. Remplir les informations
3. Ajouter des relations si nécessaire
4. Ajouter des récompenses items (drag & drop)
5. Enregistrer

### Organiser les quêtes
- **Drag & Drop**: Déplacer les quêtes pour réorganiser
- **Trois positions**: Dessus (avant), Dessous (après), Enfant
- **Dépliage**: Cliquer sur la flèche pour déplier/replier

### Compléter une quête
1. Changer le statut à "Terminée"
2. Sélectionner l'acteur qui a complété
3. Cliquer sur "Distribuer les récompenses"

### Vue graphe
- Cliquer sur l'onglet "Vue Graphe"
- **Navigation**: Zoom, pan, drag des nœuds
- **Layouts**: Hiérarchique ou force dirigée
- **Actions**: Clic droit pour menu contextuel

## Configuration

### Paramètres généraux
- **Sauvegarde automatique**: Active/désactive
- **Intervalle de sauvegarde**: 0-60 minutes
- **Vue par défaut**: Arbre ou Graphe
- **Afficher les quêtes terminées**: Par défaut

### Notifications
- **Position**: 5 positions disponibles
- **Durée**: 1-30 secondes
- **Sons**: Activer/désactiver
- **Chat**: Afficher dans le chat

### Permissions (GM)
- Cliquer sur le bouton "Permissions"
- Configurer par joueur ou utiliser les presets
- 5 types: View, Add, Edit, Change Status, Delete

## Raccourcis clavier

- `Ctrl/Cmd + F`: Recherche
- `Ctrl/Cmd + N`: Nouvelle quête
- `Ctrl/Cmd + E`: Déplier/Replier tout
- `Escape`: Effacer la recherche

## Compatibilité

- **Foundry VTT**: v11-v12
- **Systèmes**: Tous (testé avec D&D 5e, Pathfinder, Starfinder)
- **Modules**: Compatible avec tous les modules standards

## Support

- **Issues**: [GitHub Issues](https://github.com/votre-repo/quest-manager/issues)
- **Discord**: [Serveur Foundry FR](https://discord.gg/foundry-fr)

## Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails

## Crédits

- Développé par Clément
- vis.js pour la visualisation graphe
- Icônes: Font Awesome

## Changelog

Voir [CHANGELOG.md](CHANGELOG.md)