import { QuestTree } from '../models/quest-tree.js';
import { PermissionManager } from './permissions.js';

/**
 * Clés de stockage
 */
export const STORAGE_KEYS = {
  QUEST_TREE: "questTree",
  PERMISSIONS: "permissions"
};

/**
 * Classe gérant le stockage des données dans Foundry
 */
export class StorageManager {
  
  /**
   * Initialise les settings Foundry pour le stockage des données
   */
  static registerSettings() {
    // Setting pour l'arbre de quêtes
    game.settings.register("quest-manager", STORAGE_KEYS.QUEST_TREE, {
      name: "Quest Tree Data",
      hint: "Données de l'arbre de quêtes",
      scope: "world",  // Scope "world" = sauvegarde dans foundrydata/Data/worlds/[monde]/settings.db
      config: false,   // config: false = n'apparaît pas dans les paramètres de configuration
      type: Object,
      default: {
        schemaVersion: 1,
        quests: {},
        rootQuestIds: [],
        metadata: {
          lastModified: new Date().toISOString(),
          questCount: 0,
          version: "0.1.0"
        }
      },
      onChange: value => {
        console.log("Quest Manager | Données de l'arbre mises à jour");
      }
    });
    
    // Setting pour les permissions
    game.settings.register("quest-manager", STORAGE_KEYS.PERMISSIONS, {
      name: "Permissions Data",
      hint: "Données des permissions utilisateurs",
      scope: "world",
      config: false,
      type: Object,
      default: {
        defaultPermissions: {
          view: true,
          add: false,
          edit: false,
          changeStatus: false,
          delete: false
        },
        userPermissions: {},
        rolePermissions: {}
      },
      onChange: value => {
        console.log("Quest Manager | Permissions mises à jour");
      }
    });
    
    console.log("Quest Manager | Settings enregistrés");
  }

  /**
   * Charge l'arbre de quêtes depuis le stockage Foundry
   * @returns {Promise<QuestTree>}
   */
  static async loadQuestTree() {
    try {
      const data = game.settings.get("quest-manager", STORAGE_KEYS.QUEST_TREE);
      const questTree = QuestTree.fromJSON(data);
      
      console.log(`Quest Manager | Arbre chargé: ${questTree.metadata.questCount} quêtes`);
      return questTree;
    } catch (error) {
      console.error("Quest Manager | Erreur lors du chargement de l'arbre:", error);
      // Retourner un arbre vide en cas d'erreur
      return new QuestTree();
    }
  }

  /**
   * Sauvegarde l'arbre de quêtes dans le stockage Foundry
   * @param {QuestTree} questTree
   * @returns {Promise<void>}
   */
  static async saveQuestTree(questTree) {
    try {
      const data = questTree.toJSON();
      await game.settings.set("quest-manager", STORAGE_KEYS.QUEST_TREE, data);
      
      console.log(`Quest Manager | Arbre sauvegardé: ${questTree.metadata.questCount} quêtes`);
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la sauvegarde de l'arbre:", error);
      throw error;
    }
  }

  /**
   * Charge les permissions depuis le stockage Foundry
   * @returns {Promise<PermissionManager>}
   */
  static async loadPermissions() {
    try {
      const data = game.settings.get("quest-manager", STORAGE_KEYS.PERMISSIONS);
      const permissions = PermissionManager.fromJSON(data);
      
      console.log("Quest Manager | Permissions chargées");
      return permissions;
    } catch (error) {
      console.error("Quest Manager | Erreur lors du chargement des permissions:", error);
      // Retourner des permissions par défaut en cas d'erreur
      return new PermissionManager();
    }
  }

  /**
   * Sauvegarde les permissions dans le stockage Foundry
   * @param {PermissionManager} permissions
   * @returns {Promise<void>}
   */
  static async savePermissions(permissions) {
    try {
      const data = permissions.toJSON();
      await game.settings.set("quest-manager", STORAGE_KEYS.PERMISSIONS, data);
      
      console.log("Quest Manager | Permissions sauvegardées");
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la sauvegarde des permissions:", error);
      throw error;
    }
  }

  /**
   * Exporte toutes les données en fichier JSON téléchargeable
   */
  static async exportToFile() {
    try {
      const data = window.questManager.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `quest-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      saveDataToFile(json, 'application/json', filename);
      
      ui.notifications.info(`Données exportées vers ${filename}`);
    } catch (error) {
      console.error("Quest Manager | Erreur lors de l'export:", error);
      ui.notifications.error("Erreur lors de l'export des données");
    }
  }

  /**
   * Importe des données depuis un fichier JSON
   */
  static async importFromFile() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            await window.questManager.importData(data);
          } catch (error) {
            console.error("Quest Manager | Erreur lors du parsing JSON:", error);
            ui.notifications.error("Fichier JSON invalide");
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error("Quest Manager | Erreur lors de l'import:", error);
      ui.notifications.error("Erreur lors de l'import des données");
    }
  }

  /**
   * Crée une sauvegarde de backup
   * @returns {Promise<void>}
   */
  static async createBackup() {
    try {
      const backupKey = `questTree-backup-${Date.now()}`;
      const questTree = await this.loadQuestTree();
      
      // Stocker dans un setting temporaire
      await game.settings.set("quest-manager", backupKey, questTree.toJSON());
      
      console.log(`Quest Manager | Backup créé: ${backupKey}`);
      ui.notifications.info("Backup créé avec succès");
      
      return backupKey;
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la création du backup:", error);
      ui.notifications.error("Erreur lors de la création du backup");
    }
  }

  /**
   * Restaure depuis une sauvegarde de backup
   * @param {string} backupKey
   * @returns {Promise<void>}
   */
  static async restoreBackup(backupKey) {
    try {
      const data = game.settings.get("quest-manager", backupKey);
      const questTree = QuestTree.fromJSON(data);
      
      await this.saveQuestTree(questTree);
      
      console.log(`Quest Manager | Backup restauré: ${backupKey}`);
      ui.notifications.info("Backup restauré avec succès");
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la restauration du backup:", error);
      ui.notifications.error("Erreur lors de la restauration du backup");
    }
  }
}