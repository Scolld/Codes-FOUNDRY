import { Quest } from '../models/quest.js';
import { PERMISSION_TYPES } from './permissions.js';
import { SOCKET_EVENTS } from './socket.js';

/**
 * Classe avec méthodes CRUD pour les quêtes
 * Toutes les méthodes incluent la vérification des permissions, 
 * la sauvegarde automatique ET l'émission de sockets
 */
export class QuestCRUD {
  
  /**
   * Crée une nouvelle quête
   * @param {Object} questData - Données de la quête
   * @param {string} userId - ID de l'utilisateur qui crée
   * @returns {Promise<Quest|null>}
   */
  static async createQuest(questData, userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.ADD)) {
      ui.notifications.warn("Vous n'avez pas la permission de créer des quêtes");
      return null;
    }
    
    try {
      // Créer la quête
      const quest = new Quest({
        ...questData,
        createdBy: userId,
        updatedBy: userId
      });
      
      // Valider
      const validation = quest.validate();
      if (!validation.valid) {
        ui.notifications.error(`Erreur de validation: ${validation.errors.join(', ')}`);
        return null;
      }
      
      // Vérifier les dépendances circulaires si un parent est défini
      if (quest.parentId) {
        if (window.questManager.questTree.wouldCreateCircularDependency(quest.id, quest.parentId)) {
          ui.notifications.error("Impossible de créer cette relation: dépendance circulaire détectée");
          return null;
        }
      }
      
      // Ajouter à l'arbre
      window.questManager.questTree.addQuest(quest);
      
      // Sauvegarder si activé
      if (game.settings.get("quest-manager", "autoSave")) {
        await window.questManager.save();
      }
      
      // **NOUVEAU: Émettre l'événement socket**
      window.questManagerSocket.emit(SOCKET_EVENTS.QUEST_CREATED, {
        questData: quest.toJSON()
      });
      
      // Notification
      if (game.settings.get("quest-manager", "enableNotifications")) {
        ui.notifications.info(`Quête "${quest.title}" créée`);
      }
      
      console.log(`Quest Manager | Quête créée: ${quest.id}`);
      return quest;
      
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la création:", error);
      ui.notifications.error("Erreur lors de la création de la quête");
      return null;
    }
  }

  /**
   * Récupère une quête par son ID
   * @param {string} questId
   * @param {string} userId
   * @returns {Quest|null}
   */
  static getQuest(questId, userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.VIEW)) {
      ui.notifications.warn("Vous n'avez pas la permission de voir les quêtes");
      return null;
    }
    
    return window.questManager.questTree.getQuest(questId);
  }

  /**
   * Met à jour une quête
   * @param {string} questId
   * @param {Object} updates - Objet avec les champs à mettre à jour
   * @param {string} userId
   * @returns {Promise<Quest|null>}
   */
  static async updateQuest(questId, updates, userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.EDIT)) {
      ui.notifications.warn("Vous n'avez pas la permission de modifier des quêtes");
      return null;
    }
    
    try {
      const quest = window.questManager.questTree.getQuest(questId);
      if (!quest) {
        ui.notifications.error("Quête introuvable");
        return null;
      }
      
      // Sauvegarder l'ancien statut pour l'événement
      const oldStatus = quest.status;
      
      // Appliquer les mises à jour
      Object.assign(quest, updates);
      quest.touch(); // Mettre à jour le timestamp
      
      // Valider
      const validation = quest.validate();
      if (!validation.valid) {
        ui.notifications.error(`Erreur de validation: ${validation.errors.join(', ')}`);
        return null;
      }
      
      // Vérifier les dépendances circulaires si le parent a changé
      if (updates.parentId && quest.parentId) {
        if (window.questManager.questTree.wouldCreateCircularDependency(quest.id, quest.parentId)) {
          ui.notifications.error("Impossible de modifier cette relation: dépendance circulaire détectée");
          return null;
        }
      }
      
      // Sauvegarder si activé
      if (game.settings.get("quest-manager", "autoSave")) {
        await window.questManager.save();
      }
      
      // **NOUVEAU: Émettre l'événement socket approprié**
      if (updates.status && updates.status !== oldStatus) {
        // Changement de statut = événement spécial
        window.questManagerSocket.emit(SOCKET_EVENTS.QUEST_STATUS_CHANGED, {
          questId: quest.id,
          oldStatus,
          newStatus: quest.status
        });
      } else {
        // Mise à jour normale
        window.questManagerSocket.emit(SOCKET_EVENTS.QUEST_UPDATED, {
          questId: quest.id,
          updates
        });
      }
      
      // Notification
      if (game.settings.get("quest-manager", "enableNotifications")) {
        ui.notifications.info(`Quête "${quest.title}" mise à jour`);
      }
      
      console.log(`Quest Manager | Quête mise à jour: ${quest.id}`);
      return quest;
      
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la mise à jour:", error);
      ui.notifications.error("Erreur lors de la mise à jour de la quête");
      return null;
    }
  }

  /**
   * Change le statut d'une quête
   * @param {string} questId
   * @param {string} newStatus
   * @param {string} userId
   * @returns {Promise<Quest|null>}
   */
  static async changeQuestStatus(questId, newStatus, userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.CHANGE_STATUS)) {
      ui.notifications.warn("Vous n'avez pas la permission de changer le statut des quêtes");
      return null;
    }
    
    return await this.updateQuest(questId, { status: newStatus }, userId);
  }

  /**
   * Supprime une quête
   * @param {string} questId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  static async deleteQuest(questId, userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.DELETE)) {
      ui.notifications.warn("Vous n'avez pas la permission de supprimer des quêtes");
      return false;
    }
    
    try {
      const quest = window.questManager.questTree.getQuest(questId);
      if (!quest) {
        ui.notifications.error("Quête introuvable");
        return false;
      }
      
      // Sauvegarder le titre pour la notification
      const questTitle = quest.title;
      
      // Demander confirmation
      const confirm = await Dialog.confirm({
        title: "Supprimer la quête",
        content: `<p>Êtes-vous sûr de vouloir supprimer la quête "<strong>${quest.title}</strong>" ?</p>
                  ${quest.childrenIds.length > 0 ? `<p><strong>Attention :</strong> Cette quête a ${quest.childrenIds.length} sous-quête(s).</p>` : ''}`,
        yes: () => true,
        no: () => false
      });
      
      if (!confirm) return false;
      
      // Supprimer
      window.questManager.questTree.deleteQuest(questId);
      
      // Sauvegarder si activé
      if (game.settings.get("quest-manager", "autoSave")) {
        await window.questManager.save();
      }
      
      // **NOUVEAU: Émettre l'événement socket**
      window.questManagerSocket.emit(SOCKET_EVENTS.QUEST_DELETED, {
        questId,
        questTitle
      });
      
      // Notification
      if (game.settings.get("quest-manager", "enableNotifications")) {
        ui.notifications.info(`Quête "${questTitle}" supprimée`);
      }
      
      console.log(`Quest Manager | Quête supprimée: ${questId}`);
      return true;
      
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la suppression:", error);
      ui.notifications.error("Erreur lors de la suppression de la quête");
      return false;
    }
  }

  /**
   * Récupère toutes les quêtes triées par statut
   * @param {string} userId
   * @returns {Object} { active: Quest[], known: Quest[], completed: Quest[] }
   */
  static getAllQuestsByStatus(userId = game.user.id) {
    // Vérifier les permissions
    if (!window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.VIEW)) {
      return { active: [], known: [], completed: [] };
    }
    
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    
    return {
      active: allQuests.filter(q => q.status === 'en_cours'),
      known: allQuests.filter(q => q.status === 'connue'),
      completed: allQuests.filter(q => q.status === 'terminee')
    };
  }
}