/**
 * Gestionnaire de notifications avancées pour Quest Manager
 */

import { QUEST_STATUS } from '../models/quest.js';

/**
 * Types de notifications
 */
export const NOTIFICATION_TYPES = {
  QUEST_CREATED: "quest-created",
  QUEST_UPDATED: "quest-updated",
  QUEST_DELETED: "quest-deleted",
  QUEST_STATUS_CHANGED: "quest-status-changed",
  QUEST_UNLOCKED: "quest-unlocked",
  REWARDS_DISTRIBUTED: "rewards-distributed",
  ACHIEVEMENT: "achievement"
};

/**
 * Paramètres de notification par défaut
 */
const DEFAULT_SETTINGS = {
  enabled: true,
  showInChat: true,
  showInUI: true,
  playSound: true,
  duration: 5000, // ms
  position: 'top-right' // top-right, top-left, bottom-right, bottom-left, center
};

/**
 * Classe gérant les notifications avancées
 */
export class NotificationManager {
  constructor() {
    this.notifications = [];
    this.notificationId = 0;
    this.container = null;
    this.soundEffects = {
      'quest-created': 'sounds/notify.wav',
      'quest-completed': 'sounds/drums.wav',
      'quest-unlocked': 'sounds/lock.wav',
      'rewards': 'sounds/coins.wav'
    };
  }

  /**
   * Initialise le système de notifications
   */
  initialize() {
    // Créer le container pour les notifications UI
    this.createContainer();
    
    // Enregistrer les settings
    this.registerSettings();
    
    console.log("Quest Manager | Notification Manager initialisé");
  }

  /**
   * Crée le container HTML pour les notifications
   */
  createContainer() {
    if (this.container) return;
    
    const position = game.settings.get("quest-manager", "notificationPosition") || 'top-right';
    
    this.container = $(`
      <div id="quest-notifications-container" class="quest-notifications-${position}">
      </div>
    `);
    
    $('body').append(this.container);
  }

  /**
   * Enregistre les settings pour les notifications
   */
  registerSettings() {
    game.settings.register("quest-manager", "notificationPosition", {
      name: "Position des notifications",
      hint: "Position où les notifications apparaissent à l'écran",
      scope: "client",
      config: true,
      type: String,
      choices: {
        "top-right": "Haut droite",
        "top-left": "Haut gauche",
        "bottom-right": "Bas droite",
        "bottom-left": "Bas gauche",
        "center": "Centre"
      },
      default: "top-right",
      onChange: (value) => {
        // Recréer le container avec la nouvelle position
        if (this.container) {
          this.container.remove();
          this.container = null;
          this.createContainer();
        }
      }
    });

    game.settings.register("quest-manager", "notificationDuration", {
      name: "Durée des notifications (secondes)",
      hint: "Durée d'affichage des notifications",
      scope: "client",
      config: true,
      type: Number,
      range: {
        min: 1,
        max: 30,
        step: 1
      },
      default: 5
    });

    game.settings.register("quest-manager", "notificationSound", {
      name: "Sons des notifications",
      hint: "Jouer un son lors des notifications",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("quest-manager", "notificationChat", {
      name: "Notifications dans le chat",
      hint: "Afficher les notifications importantes dans le chat",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });
  }

  /**
   * Affiche une notification
   * @param {Object} options - Options de la notification
   */
  show(options = {}) {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: game.settings.get("quest-manager", "enableNotifications"),
      showInChat: game.settings.get("quest-manager", "notificationChat"),
      playSound: game.settings.get("quest-manager", "notificationSound"),
      duration: game.settings.get("quest-manager", "notificationDuration") * 1000,
      ...options
    };

    if (!settings.enabled) return;

    // Notification UI
    if (settings.showInUI) {
      this.showUINotification(settings);
    }

    // Notification chat
    if (settings.showInChat && settings.chatMessage) {
      this.showChatNotification(settings);
    }

    // Son
    if (settings.playSound && settings.sound) {
      this.playSound(settings.sound);
    }
  }

  /**
   * Affiche une notification UI
   */
  showUINotification(settings) {
    const id = this.notificationId++;
    
    const notification = $(`
      <div class="quest-notification ${settings.type} ${settings.priority || 'normal'}" data-id="${id}">
        <div class="notification-header">
          <div class="notification-icon">
            <i class="fas ${settings.icon || 'fa-bell'}"></i>
          </div>
          <div class="notification-title">${settings.title || 'Quest Manager'}</div>
          <button class="notification-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="notification-body">
          ${settings.message || ''}
        </div>
        ${settings.actions ? `
          <div class="notification-actions">
            ${settings.actions.map(action => `
              <button class="notification-action-btn" data-action="${action.id}">
                ${action.icon ? `<i class="fas ${action.icon}"></i>` : ''}
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `);

    // Ajouter au container
    this.container.append(notification);

    // Animation d'entrée
    notification.addClass('show');

    // Events
    notification.find('.notification-close').click(() => {
      this.removeNotification(id);
    });

    notification.find('.notification-action-btn').click((e) => {
      const actionId = $(e.currentTarget).data('action');
      const action = settings.actions.find(a => a.id === actionId);
      if (action && action.callback) {
        action.callback();
      }
      this.removeNotification(id);
    });

    // Auto-suppression
    if (settings.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, settings.duration);
    }

    // Stocker
    this.notifications.push({ id, notification, settings });
  }

  /**
   * Supprime une notification
   */
  removeNotification(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (!notif) return;

    notif.notification.removeClass('show').addClass('hide');
    
    setTimeout(() => {
      notif.notification.remove();
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 300);
  }

  /**
   * Affiche une notification dans le chat
   */
  showChatNotification(settings) {
    ChatMessage.create({
      content: settings.chatMessage,
      speaker: { alias: settings.speaker || "Quest Manager" },
      whisper: settings.whisperTo || []
    });
  }

  /**
   * Joue un son
   */
  playSound(soundPath) {
    try {
      AudioHelper.play({ src: soundPath, volume: 0.8, autoplay: true });
    } catch (error) {
      console.warn("Quest Manager | Impossible de jouer le son:", error);
    }
  }

  // ========================================================================
  // NOTIFICATIONS PRÉDÉFINIES
  // ========================================================================

  /**
   * Notification : Quête créée
   */
  notifyQuestCreated(quest) {
    this.show({
      type: NOTIFICATION_TYPES.QUEST_CREATED,
      priority: 'low',
      icon: 'fa-plus-circle',
      title: 'Nouvelle Quête',
      message: `"${quest.title}" a été créée`,
      sound: this.soundEffects['quest-created'],
      chatMessage: `
        <div class="quest-notification-chat quest-created">
          <h3><i class="fas fa-plus-circle"></i> Nouvelle Quête</h3>
          <p><strong>${quest.title}</strong></p>
          ${quest.description ? `<p class="quest-description">${quest.description.substring(0, 150)}...</p>` : ''}
        </div>
      `
    });
  }

  /**
   * Notification : Quête mise à jour
   */
  notifyQuestUpdated(quest) {
    this.show({
      type: NOTIFICATION_TYPES.QUEST_UPDATED,
      priority: 'low',
      icon: 'fa-edit',
      title: 'Quête Mise à Jour',
      message: `"${quest.title}" a été modifiée`,
      sound: null, // Pas de son pour les mises à jour
      showInChat: false // Pas de message dans le chat
    });
  }

  /**
   * Notification : Quête supprimée
   */
  notifyQuestDeleted(questTitle) {
    this.show({
      type: NOTIFICATION_TYPES.QUEST_DELETED,
      priority: 'normal',
      icon: 'fa-trash',
      title: 'Quête Supprimée',
      message: `"${questTitle}" a été supprimée`,
      sound: null,
      showInChat: false
    });
  }

  /**
   * Notification : Changement de statut
   */
  notifyQuestStatusChanged(quest, oldStatus, newStatus) {
    const statusLabels = {
      'connue': 'Découverte',
      'en_cours': 'En Cours',
      'terminee': 'Terminée'
    };

    const icons = {
      'connue': 'fa-circle',
      'en_cours': 'fa-circle-dot',
      'terminee': 'fa-circle-check'
    };

    // Notification spéciale pour quête terminée
    if (newStatus === QUEST_STATUS.COMPLETED) {
      this.notifyQuestCompleted(quest);
      return;
    }

    this.show({
      type: NOTIFICATION_TYPES.QUEST_STATUS_CHANGED,
      priority: 'normal',
      icon: icons[newStatus],
      title: 'Statut de Quête Changé',
      message: `"${quest.title}" est maintenant <strong>${statusLabels[newStatus]}</strong>`,
      sound: this.soundEffects['quest-created'],
      chatMessage: `
        <div class="quest-notification-chat quest-status-changed">
          <h3><i class="fas ${icons[newStatus]}"></i> ${statusLabels[newStatus]}</h3>
          <p><strong>${quest.title}</strong></p>
        </div>
      `
    });
  }

  /**
   * Notification : Quête terminée
   */
  notifyQuestCompleted(quest) {
    const actor = quest.completedBy ? game.actors.get(quest.completedBy) : null;

    this.show({
      type: NOTIFICATION_TYPES.QUEST_STATUS_CHANGED,
      priority: 'high',
      icon: 'fa-trophy',
      title: '🎉 Quête Terminée !',
      message: `"${quest.title}" a été complétée${actor ? ` par ${actor.name}` : ''}`,
      sound: this.soundEffects['quest-completed'],
      duration: 8000,
      chatMessage: `
        <div class="quest-notification-chat quest-completed">
          <h3>🎉 Quête Terminée !</h3>
          <p><strong>${quest.title}</strong></p>
          ${actor ? `<p>Complétée par <strong>${actor.name}</strong></p>` : ''}
          ${quest.rewardItems.length > 0 ? `
            <p><em>${quest.rewardItems.length} récompense(s) disponible(s)</em></p>
          ` : ''}
        </div>
      `,
      actions: quest.rewardItems.length > 0 && !quest.rewardsDistributed ? [
        {
          id: 'distribute',
          label: 'Distribuer les récompenses',
          icon: 'fa-gift',
          callback: async () => {
            const success = await quest.distributeRewards();
            if (success) {
              await window.questManager.save();
            }
          }
        }
      ] : null
    });
  }

  /**
   * Notification : Quête débloquée
   */
  notifyQuestUnlocked(quest) {
    this.show({
      type: NOTIFICATION_TYPES.QUEST_UNLOCKED,
      priority: 'high',
      icon: 'fa-unlock',
      title: '🔓 Nouvelle Quête Disponible',
      message: `"${quest.title}" est maintenant disponible`,
      sound: this.soundEffects['quest-unlocked'],
      duration: 7000,
      chatMessage: `
        <div class="quest-notification-chat quest-unlocked">
          <h3>🔓 Nouvelle Quête Disponible</h3>
          <p><strong>${quest.title}</strong></p>
          ${quest.description ? `<p class="quest-description">${quest.description.substring(0, 200)}...</p>` : ''}
        </div>
      `,
      actions: [
        {
          id: 'view',
          label: 'Voir la quête',
          icon: 'fa-eye',
          callback: () => {
            // Ouvrir le quest manager et highlight la quête
            import('../apps/quest-manager-app.js').then(module => {
              const app = new module.QuestManagerApp();
              app.render(true);
              
              setTimeout(() => {
                if (app.treeView) {
                  app.treeView.highlightQuest(quest.id);
                }
              }, 500);
            });
          }
        }
      ]
    });
  }

  /**
   * Notification : Récompenses distribuées
   */
  notifyRewardsDistributed(quest, actor, items) {
    this.show({
      type: NOTIFICATION_TYPES.REWARDS_DISTRIBUTED,
      priority: 'high',
      icon: 'fa-gift',
      title: '🎁 Récompenses Reçues !',
      message: `${actor.name} a reçu ${items.length} récompense(s)`,
      sound: this.soundEffects['rewards'],
      duration: 8000,
      chatMessage: `
        <div class="quest-notification-chat rewards-distributed">
          <h3>🎁 Récompenses Distribuées</h3>
          <p><strong>${quest.title}</strong></p>
          <p>${actor.name} a reçu :</p>
          <ul>
            ${items.map(item => {
              const qty = item.system?.quantity || item.data?.quantity;
              return `<li>${item.name}${qty && qty > 1 ? ` (x${qty})` : ''}</li>`;
            }).join('')}
          </ul>
        </div>
      `
    });
  }

  /**
   * Notification : Achievement (jalons)
   */
  notifyAchievement(achievement) {
    this.show({
      type: NOTIFICATION_TYPES.ACHIEVEMENT,
      priority: 'high',
      icon: 'fa-star',
      title: '⭐ Achievement Débloqué !',
      message: achievement.message,
      sound: this.soundEffects['quest-completed'],
      duration: 10000,
      chatMessage: `
        <div class="quest-notification-chat achievement">
          <h3>⭐ Achievement Débloqué !</h3>
          <p><strong>${achievement.title}</strong></p>
          <p>${achievement.message}</p>
        </div>
      `
    });
  }

  /**
   * Vérifie et notifie les quêtes débloquées
   */
  checkUnlockedQuests(completedQuestId) {
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    
    // Trouver les quêtes qui étaient bloquées par cette quête
    const unlockedQuests = allQuests.filter(quest => {
      // La quête était bloquée par la quête terminée
      if (!quest.blockedByIds.includes(completedQuestId)) return false;
      
      // Vérifier que toutes les quêtes bloquantes sont terminées
      return quest.blockedByIds.every(blockerId => {
        const blocker = window.questManager.questTree.getQuest(blockerId);
        return blocker?.status === QUEST_STATUS.COMPLETED;
      });
    });

    // Notifier chaque quête débloquée
    unlockedQuests.forEach(quest => {
      this.notifyQuestUnlocked(quest);
    });
  }

  /**
   * Vérifie et notifie les achievements
   */
  checkAchievements() {
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    const completed = allQuests.filter(q => q.status === QUEST_STATUS.COMPLETED);
    
    const achievements = [
      {
        id: 'first-quest',
        title: 'Première Quête',
        message: 'Complétez votre première quête',
        check: () => completed.length === 1
      },
      {
        id: 'five-quests',
        title: 'Aventurier',
        message: 'Complétez 5 quêtes',
        check: () => completed.length === 5
      },
      {
        id: 'ten-quests',
        title: 'Héros',
        message: 'Complétez 10 quêtes',
        check: () => completed.length === 10
      },
      {
        id: 'twenty-quests',
        title: 'Légende',
        message: 'Complétez 20 quêtes',
        check: () => completed.length === 20
      },
      {
        id: 'all-quests',
        title: 'Perfectionniste',
        message: 'Complétez toutes les quêtes',
        check: () => allQuests.length > 0 && completed.length === allQuests.length
      }
    ];

    // Vérifier les achievements non encore débloqués
    const unlockedAchievements = game.settings.get("quest-manager", "unlockedAchievements") || [];
    
    achievements.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id) && achievement.check()) {
        this.notifyAchievement(achievement);
        unlockedAchievements.push(achievement.id);
      }
    });

    game.settings.set("quest-manager", "unlockedAchievements", unlockedAchievements);
  }

  /**
   * Nettoie toutes les notifications
   */
  clearAll() {
    this.notifications.forEach(notif => {
      notif.notification.remove();
    });
    this.notifications = [];
  }
}

// Instance globale
window.questNotifications = new NotificationManager();