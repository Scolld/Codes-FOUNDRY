import { QuestTree } from '../models/quest-tree.js';
import { PermissionManager } from './permissions.js';

/**
 * Clés de stockage
 */
export const STORAGE_KEYS = {
  QUEST_TREE: "quest-manager.questTree",
  PERMISSIONS: "quest-manager.permissions"
};

/**
 * Classe gérant le stockage des données dans Foundry
 */
export class StorageManager {
  
  /**
   * Initialise les settings Foundry
   */
  static registerSettings() {
    // Setting pour l'arbre de quêtes
    game.settings.register("quest-manager", "questTree", {
      name: "Quest Tree Data",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
    
    // Setting pour les permissions
    game.settings.register("quest-manager", "permissions", {
      name: "Permissions Data",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }

  /**
   * Charge l'arbre de quêtes
   * @returns {Promise<QuestTree>}
   */
  static async loadQuestTree() {
    const data = game.settings.get("quest-manager", "questTree");
    return QuestTree.fromJSON(data);
  }

  /**
   * Sauvegarde l'arbre de quêtes
   * @param {QuestTree} questTree
   * @returns {Promise<void>}
   */
  static async saveQuestTree(questTree) {
    await game.settings.set("quest-manager", "questTree", questTree.toJSON());
  }

  /**
   * Charge les permissions
   * @returns {Promise<PermissionManager>}
   */
  static async loadPermissions() {
    const data = game.settings.get("quest-manager", "permissions");
    return PermissionManager.fromJSON(data);
  }

  /**
   * Sauvegarde les permissions
   * @param {PermissionManager} permissions
   * @returns {Promise<void>}
   */
  static async savePermissions(permissions) {
    await game.settings.set("quest-manager", "permissions", permissions.toJSON());
  }
}