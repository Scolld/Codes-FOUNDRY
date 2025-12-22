import { SOCKET_EVENTS } from './socket.js';

/**
 * Types de permissions
 */
export const PERMISSION_TYPES = {
  VIEW: "view",
  ADD: "add",
  EDIT: "edit",
  CHANGE_STATUS: "changeStatus",
  DELETE: "delete"
};

export const PERMISSION_LABELS = {
  "view": "QUEST_MANAGER.Permissions.View",
  "add": "QUEST_MANAGER.Permissions.Add",
  "edit": "QUEST_MANAGER.Permissions.Edit",
  "changeStatus": "QUEST_MANAGER.Permissions.ChangeStatus",
  "delete": "QUEST_MANAGER.Permissions.Delete"
};

/**
 * Classe gérant les permissions
 */
export class PermissionManager {
  constructor(data = {}) {
    this.defaultPermissions = data.defaultPermissions || {
      view: true,
      add: false,
      edit: false,
      changeStatus: false,
      delete: false
    };
    
    this.userPermissions = data.userPermissions || {};
    this.rolePermissions = data.rolePermissions || {};
  }

  /**
   * Vérifie si un utilisateur a une permission
   * @param {string} userId
   * @param {string} permissionType
   * @returns {boolean}
   */
  hasPermission(userId, permissionType) {
    // Le GM a toutes les permissions
    const user = game.users.get(userId);
    if (user?.isGM) return true;
    
    // Vérifier les permissions spécifiques de l'utilisateur
    if (this.userPermissions[userId]?.[permissionType] !== undefined) {
      return this.userPermissions[userId][permissionType];
    }
    
    // Sinon, utiliser les permissions par défaut
    return this.defaultPermissions[permissionType] || false;
  }

  /**
   * Définit une permission pour un utilisateur
   * @param {string} userId
   * @param {string} permissionType
   * @param {boolean} value
   * @param {boolean} emitSocket - Si true, émet un événement socket
   */
  setUserPermission(userId, permissionType, value, emitSocket = true) {
    if (!this.userPermissions[userId]) {
      this.userPermissions[userId] = {};
    }
    this.userPermissions[userId][permissionType] = value;
    
    // **NOUVEAU: Émettre l'événement socket**
    if (emitSocket && window.questManagerSocket?.initialized) {
      window.questManagerSocket.emit(SOCKET_EVENTS.PERMISSIONS_UPDATED, {
        targetUserId: userId
      });
    }
  }

  /**
   * Définit toutes les permissions pour un utilisateur
   * @param {string} userId
   * @param {Object} permissions
   */
  async setAllUserPermissions(userId, permissions) {
    this.userPermissions[userId] = { ...permissions };
    
    // Sauvegarder
    if (game.settings.get("quest-manager", "autoSave")) {
      await window.questManager.save();
    }
    
    // **NOUVEAU: Émettre l'événement socket**
    if (window.questManagerSocket?.initialized) {
      window.questManagerSocket.emit(SOCKET_EVENTS.PERMISSIONS_UPDATED, {
        targetUserId: userId
      });
    }
  }

  /**
   * Convertit en objet simple pour sauvegarde
   * @returns {Object}
   */
  toJSON() {
    return {
      defaultPermissions: { ...this.defaultPermissions },
      userPermissions: JSON.parse(JSON.stringify(this.userPermissions)),
      rolePermissions: JSON.parse(JSON.stringify(this.rolePermissions))
    };
  }

  /**
   * Crée une instance depuis JSON
   * @param {Object} data
   * @returns {PermissionManager}
   */
  static fromJSON(data) {
    return new PermissionManager(data);
  }
}