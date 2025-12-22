/**
 * Quest Manager - Point d'entrée principal
 * Initialise le module et enregistre les hooks Foundry
 */

import { StorageManager } from './utils/storage.js';
import { QuestTree } from './models/quest-tree.js';
import { PermissionManager } from './utils/permissions.js';
import { SocketManager } from './utils/socket.js';

// Namespace global pour le module
class QuestManager {
  constructor() {
    this.questTree = null;
    this.permissions = null;
    this.initialized = false;
  }

  /**
   * Initialise le module
   */
  async initialize() {
    console.log("Quest Manager | Initialisation...");
    
    // Enregistrer les settings
    StorageManager.registerSettings();

    if (!window.questManagerSocket.initialized) {
      window.questManagerSocket.initialize();
    }
    
    // Charger les données
    try {
      this.questTree = await StorageManager.loadQuestTree();
      this.permissions = await StorageManager.loadPermissions();
      this.initialized = true;
      
      console.log(`Quest Manager | ${this.questTree.metadata.questCount} quêtes chargées`);
    } catch (error) {
      console.error("Quest Manager | Erreur lors du chargement:", error);
      
      // Initialiser avec des données vides en cas d'erreur
      this.questTree = new QuestTree();
      this.permissions = new PermissionManager();
      this.initialized = true;
    }
  }

  /**
   * Sauvegarde les données
   */
  async save() {
    if (!this.initialized) {
      console.warn("Quest Manager | Tentative de sauvegarde avant initialisation");
      return;
    }
    
    try {
      await StorageManager.saveQuestTree(this.questTree);
      await StorageManager.savePermissions(this.permissions);
      
      console.log("Quest Manager | Données sauvegardées");
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la sauvegarde:", error);
      ui.notifications.error("Erreur lors de la sauvegarde des quêtes");
    }
  }

  /**
   * Réinitialise toutes les données (avec confirmation)
   */
  async reset() {
    const confirm = await Dialog.confirm({
      title: "Réinitialiser Quest Manager",
      content: "<p>Êtes-vous sûr de vouloir supprimer toutes les quêtes ? Cette action est irréversible.</p>",
      yes: () => true,
      no: () => false
    });
    
    if (!confirm) return;
    
    this.questTree = new QuestTree();
    this.permissions = new PermissionManager();
    await this.save();
    
    ui.notifications.info("Quest Manager réinitialisé");
  }

  /**
   * Exporte les données en JSON
   * @returns {Object}
   */
  exportData() {
    return {
      questTree: this.questTree.toJSON(),
      permissions: this.permissions.toJSON(),
      exportedAt: new Date().toISOString(),
      foundryVersion: game.version,
      moduleVersion: game.modules.get("quest-manager").version
    };
  }

  /**
   * Importe des données JSON
   * @param {Object} data
   */
  async importData(data) {
    try {
      // Valider la structure
      if (!data.questTree || !data.permissions) {
        throw new Error("Format de données invalide");
      }
      
      // Demander confirmation
      const confirm = await Dialog.confirm({
        title: "Importer des données",
        content: `<p>Importer ${data.questTree.metadata?.questCount || 0} quêtes ?</p>
                  <p><strong>Attention :</strong> Cela remplacera toutes les données existantes.</p>`,
        yes: () => true,
        no: () => false
      });
      
      if (!confirm) return;
      
      // Charger les données
      this.questTree = QuestTree.fromJSON(data.questTree);
      this.permissions = PermissionManager.fromJSON(data.permissions);
      
      // Sauvegarder
      await this.save();
      
      ui.notifications.info(`${this.questTree.metadata.questCount} quêtes importées avec succès`);
    } catch (error) {
      console.error("Quest Manager | Erreur lors de l'import:", error);
      ui.notifications.error("Erreur lors de l'import des données");
    }
  }
}

// Instance globale
window.questManager = new QuestManager();

// ============================================================================
// HOOKS FOUNDRY
// ============================================================================

/**
 * Hook : Initialisation du module après le chargement de Foundry
 */
Hooks.once('init', () => {
  console.log("Quest Manager | Module chargé");
  
  // Enregistrer les settings supplémentaires (configuration)
  game.settings.register("quest-manager", "autoSave", {
    name: "Sauvegarde automatique",
    hint: "Sauvegarder automatiquement après chaque modification",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register("quest-manager", "saveInterval", {
    name: "Intervalle de sauvegarde (minutes)",
    hint: "Fréquence de sauvegarde automatique (0 = désactivé)",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: {
      min: 0,
      max: 60,
      step: 5
    }
  });
  
  game.settings.register("quest-manager", "defaultView", {
    name: "Vue par défaut",
    hint: "Vue affichée à l'ouverture du gestionnaire",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "tree": "Arbre",
      "graph": "Graphe"
    },
    default: "tree"
  });
  
  game.settings.register("quest-manager", "showCompletedByDefault", {
    name: "Afficher les quêtes terminées",
    hint: "Afficher les quêtes terminées par défaut",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register("quest-manager", "enableNotifications", {
    name: "Activer les notifications",
    hint: "Afficher des notifications lors des changements de quêtes",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
});

/**
 * Hook : Quand Foundry est prêt
 */
Hooks.once('ready', async () => {
  console.log("Quest Manager | Foundry prêt, initialisation du module");
  
  // Initialiser le module
  await window.questManager.initialize();
  
  if (!game.user.isGM) {
    setTimeout(() => {
      window.questManagerSocket.requestSync();
    }, 2000); // Attendre 2 secondes pour que tout soit bien initialisé
  }
  
  // Configurer la sauvegarde automatique par intervalle
  const saveInterval = game.settings.get("quest-manager", "saveInterval");
  if (saveInterval > 0) {
    setInterval(async () => {
      if (window.questManager.initialized) {
        await window.questManager.save();
        console.log("Quest Manager | Sauvegarde automatique effectuée");
      }
    }, saveInterval * 60 * 1000);
  }
  
  // Message de bienvenue pour le GM
  if (game.user.isGM) {
    ui.notifications.info("Quest Manager prêt !");
  }
});

/**
 * Macro globale pour ouvrir le gestionnaire de quêtes
 */
Hooks.on('getSceneControlButtons', (controls) => {
  // Ajouter un bouton dans la barre d'outils
  controls.push({
    name: "quest-manager",
    title: "Gestionnaire de Quêtes",
    icon: "fas fa-book-open",
    visible: true,
    onClick: () => {
      // Ouvrir ou focus l'application
      const existingApp = Object.values(ui.windows).find(
        w => w.constructor.name === "QuestManagerApp"
      );
      
      if (existingApp) {
        existingApp.bringToTop();
      } else {
        import('./apps/quest-manager-app.js').then(module => {
          new module.QuestManagerApp().render(true);
        });
      }
    },
    button: true
  });
});

// Alternative: Ajouter dans le menu des acteurs/items
Hooks.on('renderSidebarTab', (app, html) => {
  if (app.tabName === "chat") {
    // Ajouter un bouton dans le chat
    const button = $(`
      <button class="quest-manager-btn">
        <i class="fas fa-book-open"></i> Quêtes
      </button>
    `);
    
    button.click(() => {
      import('./apps/quest-manager-app.js').then(module => {
        new module.QuestManagerApp().render(true);
      });
    });
    
    html.find('.directory-footer').append(button);
  }
});

/**
 * Hook : Avant la fermeture du navigateur
 */
Hooks.on('closeApplication', async (app) => {
  // Sauvegarder avant la fermeture
  if (window.questManager.initialized) {
    await window.questManager.save();
  }
});