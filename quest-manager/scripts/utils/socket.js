/**
 * Gestionnaire de sockets pour la synchronisation temps réel
 * Permet la communication GM <-> Joueurs
 */

import { QuestCRUD } from './crud.js';

/**
 * Types d'événements socket
 */
export const SOCKET_EVENTS = {
  QUEST_CREATED: "questCreated",
  QUEST_UPDATED: "questUpdated",
  QUEST_DELETED: "questDeleted",
  QUEST_STATUS_CHANGED: "questStatusChanged",
  PERMISSIONS_UPDATED: "permissionsUpdated",
  REQUEST_SYNC: "requestSync",
  SYNC_DATA: "syncData"
};

/**
 * Classe gérant les communications socket
 */
export class SocketManager {
  constructor() {
    this.socketName = "module.quest-manager";
    this.initialized = false;
  }

  /**
   * Initialise le système de sockets
   */
  initialize() {
    if (this.initialized) {
      console.warn("Quest Manager | Socket déjà initialisé");
      return;
    }

    // Enregistrer le handler pour tous les messages
    game.socket.on(this.socketName, (data) => this.handleSocketEvent(data));
    
    this.initialized = true;
    console.log("Quest Manager | Socket initialisé");
  }

  /**
   * Gère la réception d'un événement socket
   * @param {Object} data - { event, payload, senderId }
   */
  async handleSocketEvent(data) {
    const { event, payload, senderId } = data;
    
    console.log(`Quest Manager | Socket reçu: ${event} de ${senderId}`);
    
    // Ne pas traiter ses propres messages
    if (senderId === game.user.id) {
      return;
    }

    try {
      switch (event) {
        case SOCKET_EVENTS.QUEST_CREATED:
          await this.onQuestCreated(payload);
          break;
          
        case SOCKET_EVENTS.QUEST_UPDATED:
          await this.onQuestUpdated(payload);
          break;
          
        case SOCKET_EVENTS.QUEST_DELETED:
          await this.onQuestDeleted(payload);
          break;
          
        case SOCKET_EVENTS.QUEST_STATUS_CHANGED:
          await this.onQuestStatusChanged(payload);
          break;
          
        case SOCKET_EVENTS.PERMISSIONS_UPDATED:
          await this.onPermissionsUpdated(payload);
          break;
          
        case SOCKET_EVENTS.REQUEST_SYNC:
          await this.onRequestSync(payload, senderId);
          break;
          
        case SOCKET_EVENTS.SYNC_DATA:
          await this.onSyncData(payload);
          break;
          
        default:
          console.warn(`Quest Manager | Événement socket inconnu: ${event}`);
      }
    } catch (error) {
      console.error(`Quest Manager | Erreur lors du traitement de ${event}:`, error);
    }
  }

  /**
   * Émet un événement socket à tous les utilisateurs
   * @param {string} event - Type d'événement
   * @param {Object} payload - Données à envoyer
   */
  emit(event, payload) {
    if (!this.initialized) {
      console.error("Quest Manager | Socket non initialisé");
      return;
    }

    const data = {
      event,
      payload,
      senderId: game.user.id,
      timestamp: new Date().toISOString()
    };

    game.socket.emit(this.socketName, data);
    console.log(`Quest Manager | Socket émis: ${event}`);
  }

  /**
   * Émet un événement vers un utilisateur spécifique
   * @param {string} userId - ID de l'utilisateur cible
   * @param {string} event - Type d'événement
   * @param {Object} payload - Données à envoyer
   */
  emitTo(userId, event, payload) {
    // Note: Foundry ne supporte pas nativement l'émission ciblée
    // On utilise donc un filtre côté récepteur
    const data = {
      event,
      payload: {
        ...payload,
        targetUserId: userId
      },
      senderId: game.user.id,
      timestamp: new Date().toISOString()
    };

    game.socket.emit(this.socketName, data);
  }

  // ========================================================================
  // HANDLERS DES ÉVÉNEMENTS REÇUS
  // ========================================================================

  /**
   * Handler: Quête créée
   */
  async onQuestCreated(payload) {
    const { questData } = payload;
    
    // Recharger les données depuis le serveur
    await window.questManager.initialize();
    
    // Rafraîchir l'interface si ouverte
    this.refreshUI();
    
    // Notification
    if (game.settings.get("quest-manager", "enableNotifications")) {
      const quest = window.questManager.questTree.getQuest(questData.id);
      if (quest) {
        ui.notifications.info(`Nouvelle quête: "${quest.title}"`);
      }
    }
  }

  /**
   * Handler: Quête mise à jour
   */
  async onQuestUpdated(payload) {
    const { questId, updates } = payload;
    
    // Recharger les données depuis le serveur
    await window.questManager.initialize();
    
    // Rafraîchir l'interface si ouverte
    this.refreshUI();
    
    // Notification
    if (game.settings.get("quest-manager", "enableNotifications")) {
      const quest = window.questManager.questTree.getQuest(questId);
      if (quest) {
        ui.notifications.info(`Quête mise à jour: "${quest.title}"`);
      }
    }
  }

  /**
   * Handler: Quête supprimée
   */
  async onQuestDeleted(payload) {
    const { questId, questTitle } = payload;
    
    // Recharger les données depuis le serveur
    await window.questManager.initialize();
    
    // Rafraîchir l'interface si ouverte
    this.refreshUI();
    
    // Notification
    if (game.settings.get("quest-manager", "enableNotifications")) {
      ui.notifications.info(`Quête supprimée: "${questTitle}"`);
    }
  }

  /**
   * Handler: Statut de quête changé
   */
  async onQuestStatusChanged(payload) {
    const { questId, oldStatus, newStatus } = payload;
    
    // Recharger les données depuis le serveur
    await window.questManager.initialize();
    
    // Rafraîchir l'interface si ouverte
    this.refreshUI();
    
    // Notification spéciale pour les changements de statut importants
    if (game.settings.get("quest-manager", "enableNotifications")) {
      const quest = window.questManager.questTree.getQuest(questId);
      if (quest) {
        const statusLabels = {
          'connue': 'découverte',
          'en_cours': 'en cours',
          'terminee': 'terminée'
        };
        
        ui.notifications.info(
          `"${quest.title}" est maintenant ${statusLabels[newStatus]}`
        );
      }
    }
  }

  /**
   * Handler: Permissions mises à jour
   */
  async onPermissionsUpdated(payload) {
    const { targetUserId } = payload;
    
    // Ne recharger que si ça concerne l'utilisateur actuel
    if (!targetUserId || targetUserId === game.user.id) {
      await window.questManager.initialize();
      this.refreshUI();
      
      if (game.settings.get("quest-manager", "enableNotifications")) {
        ui.notifications.info("Vos permissions ont été mises à jour");
      }
    }
  }

  /**
   * Handler: Demande de synchronisation (joueur -> GM)
   */
  async onRequestSync(payload, senderId) {
    // Seulement le GM peut répondre
    if (!game.user.isGM) return;
    
    console.log(`Quest Manager | Demande de sync de ${senderId}`);
    
    // Envoyer les données complètes à l'utilisateur
    const syncData = {
      questTree: window.questManager.questTree.toJSON(),
      permissions: window.questManager.permissions.toJSON()
    };
    
    this.emitTo(senderId, SOCKET_EVENTS.SYNC_DATA, syncData);
  }

  /**
   * Handler: Réception de données de synchronisation (GM -> joueur)
   */
  async onSyncData(payload) {
    const { targetUserId, questTree, permissions } = payload;
    
    // Vérifier que c'est bien pour nous
    if (targetUserId && targetUserId !== game.user.id) return;
    
    console.log("Quest Manager | Données de sync reçues");
    
    // Pas besoin de sauvegarder, juste charger en mémoire
    // (le GM est la source de vérité)
    if (questTree) {
      window.questManager.questTree = QuestTree.fromJSON(questTree);
    }
    if (permissions) {
      window.questManager.permissions = PermissionManager.fromJSON(permissions);
    }
    
    this.refreshUI();
  }

  /**
   * Rafraîchit l'interface utilisateur si ouverte
   */
  refreshUI() {
    // Rafraîchir l'application principale si elle est ouverte
    const app = Object.values(ui.windows).find(
      w => w.constructor.name === "QuestManagerApp"
    );
    
    if (app) {
      app.render(false); // false = ne pas faire défiler vers le haut
    }
  }

  /**
   * Demande une synchronisation complète au GM
   * Utile quand un joueur se connecte ou en cas de désynchronisation
   */
  requestSync() {
    if (game.user.isGM) {
      console.log("Quest Manager | GM n'a pas besoin de demander un sync");
      return;
    }
    
    console.log("Quest Manager | Demande de synchronisation au GM");
    this.emit(SOCKET_EVENTS.REQUEST_SYNC, {});
  }
}

// Instance globale
window.questManagerSocket = new SocketManager();