/**
 * Interface de configuration des permissions (GM uniquement)
 */

import { PERMISSION_TYPES, PERMISSION_LABELS } from '../utils/permissions.js';
import { SOCKET_EVENTS } from '../utils/socket.js';

export class PermissionsConfigApp extends FormApplication {
  constructor(options = {}) {
    super({}, options);
  }

  /**
   * Configuration par défaut de l'application
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "quest-permissions-config",
      title: "Configuration des Permissions - Quest Manager",
      template: "modules/quest-manager/templates/permissions-config.html",
      classes: ["quest-manager", "permissions-config"],
      width: 700,
      height: 600,
      closeOnSubmit: true,
      submitOnClose: false,
      resizable: true,
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".tab-content",
          initial: "users"
        }
      ]
    });
  }

  /**
   * Prépare les données pour le template
   */
  async getData() {
    const data = await super.getData();
    
    // Vérifier que l'utilisateur est GM
    if (!game.user.isGM) {
      ui.notifications.error("Seul le MJ peut accéder à cette interface");
      this.close();
      return data;
    }
    
    // Permissions par défaut
    data.defaultPermissions = window.questManager.permissions.defaultPermissions;
    
    // Liste des types de permissions avec leurs labels
    data.permissionTypes = Object.entries(PERMISSION_TYPES).map(([key, value]) => ({
      key: value,
      label: game.i18n.localize(PERMISSION_LABELS[value]) || this._getPermissionLabel(value)
    }));
    
    // Liste des joueurs (non-GM)
    data.players = game.users
      .filter(user => !user.isGM)
      .map(user => {
        const userPerms = window.questManager.permissions.userPermissions[user.id] || {};
        
        return {
          id: user.id,
          name: user.name,
          active: user.active,
          color: user.color,
          permissions: {
            view: userPerms.view !== undefined ? userPerms.view : data.defaultPermissions.view,
            add: userPerms.add !== undefined ? userPerms.add : data.defaultPermissions.add,
            edit: userPerms.edit !== undefined ? userPerms.edit : data.defaultPermissions.edit,
            changeStatus: userPerms.changeStatus !== undefined ? userPerms.changeStatus : data.defaultPermissions.changeStatus,
            delete: userPerms.delete !== undefined ? userPerms.delete : data.defaultPermissions.delete
          },
          hasCustomPermissions: Object.keys(userPerms).length > 0
        };
      });
    
    // Statistiques
    data.stats = {
      totalPlayers: data.players.length,
      activePlayers: data.players.filter(p => p.active).length,
      playersWithCustomPerms: data.players.filter(p => p.hasCustomPermissions).length
    };
    
    return data;
  }

  /**
   * Obtient le label d'une permission (fallback si pas de traduction)
   */
  _getPermissionLabel(permType) {
    const labels = {
      'view': 'Voir les quêtes',
      'add': 'Ajouter des quêtes',
      'edit': 'Modifier des quêtes',
      'changeStatus': 'Changer le statut',
      'delete': 'Supprimer des quêtes'
    };
    return labels[permType] || permType;
  }

  /**
   * Active les listeners d'événements
   */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Permissions par défaut - Changement
    html.find('.default-permission').change(this._onDefaultPermissionChange.bind(this));
    
    // Bouton "Appliquer à tous"
    html.find('#apply-defaults-to-all').click(this._onApplyDefaultsToAll.bind(this));
    
    // Permissions utilisateur - Changement
    html.find('.user-permission').change(this._onUserPermissionChange.bind(this));
    
    // Boutons "Réinitialiser" pour un utilisateur
    html.find('.reset-user-permissions').click(this._onResetUserPermissions.bind(this));
    
    // Boutons "Tout autoriser" / "Tout interdire"
    html.find('.grant-all-user').click(this._onGrantAllToUser.bind(this));
    html.find('.deny-all-user').click(this._onDenyAllToUser.bind(this));
    
    // Presets rapides
    html.find('.apply-preset').click(this._onApplyPreset.bind(this));
  }

  /**
   * Handler: Changement d'une permission par défaut
   */
  _onDefaultPermissionChange(event) {
    const permType = $(event.currentTarget).data('permission');
    const value = $(event.currentTarget).is(':checked');
    
    window.questManager.permissions.defaultPermissions[permType] = value;
    
    // Ne pas sauvegarder immédiatement, on attend la soumission du formulaire
    console.log(`Permission par défaut "${permType}" changée: ${value}`);
  }

  /**
   * Handler: Appliquer les permissions par défaut à tous les joueurs
   */
  async _onApplyDefaultsToAll(event) {
    event.preventDefault();
    
    const confirm = await Dialog.confirm({
      title: "Appliquer à tous",
      content: `<p>Êtes-vous sûr de vouloir appliquer les permissions par défaut à <strong>tous les joueurs</strong> ?</p>
                <p>Cela écrasera toutes les permissions personnalisées.</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (!confirm) return;
    
    // Réinitialiser les permissions de tous les joueurs
    game.users.filter(u => !u.isGM).forEach(user => {
      window.questManager.permissions.userPermissions[user.id] = {};
    });
    
    ui.notifications.info("Permissions par défaut appliquées à tous les joueurs");
    
    // Rafraîchir l'interface
    this.render(false);
  }

  /**
   * Handler: Changement d'une permission utilisateur
   */
  _onUserPermissionChange(event) {
    const userId = $(event.currentTarget).data('user-id');
    const permType = $(event.currentTarget).data('permission');
    const value = $(event.currentTarget).is(':checked');
    
    if (!window.questManager.permissions.userPermissions[userId]) {
      window.questManager.permissions.userPermissions[userId] = {};
    }
    
    window.questManager.permissions.userPermissions[userId][permType] = value;
    
    console.log(`Permission "${permType}" pour utilisateur ${userId} changée: ${value}`);
    
    // Mettre à jour visuellement si l'utilisateur a des permissions custom
    const hasCustom = Object.keys(window.questManager.permissions.userPermissions[userId]).length > 0;
    $(event.currentTarget).closest('.user-permissions-row').toggleClass('has-custom', hasCustom);
  }

  /**
   * Handler: Réinitialiser les permissions d'un utilisateur
   */
  async _onResetUserPermissions(event) {
    event.preventDefault();
    
    const userId = $(event.currentTarget).data('user-id');
    const user = game.users.get(userId);
    
    if (!user) return;
    
    const confirm = await Dialog.confirm({
      title: "Réinitialiser les permissions",
      content: `<p>Réinitialiser les permissions de <strong>${user.name}</strong> ?</p>
                <p>Ses permissions reviendront aux valeurs par défaut.</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (!confirm) return;
    
    // Supprimer les permissions custom
    delete window.questManager.permissions.userPermissions[userId];
    
    ui.notifications.info(`Permissions de ${user.name} réinitialisées`);
    
    // Rafraîchir l'interface
    this.render(false);
  }

  /**
   * Handler: Tout autoriser pour un utilisateur
   */
  _onGrantAllToUser(event) {
    event.preventDefault();
    
    const userId = $(event.currentTarget).data('user-id');
    
    window.questManager.permissions.userPermissions[userId] = {
      view: true,
      add: true,
      edit: true,
      changeStatus: true,
      delete: true
    };
    
    // Rafraîchir l'interface
    this.render(false);
  }

  /**
   * Handler: Tout interdire pour un utilisateur
   */
  _onDenyAllToUser(event) {
    event.preventDefault();
    
    const userId = $(event.currentTarget).data('user-id');
    
    window.questManager.permissions.userPermissions[userId] = {
      view: false,
      add: false,
      edit: false,
      changeStatus: false,
      delete: false
    };
    
    // Rafraîchir l'interface
    this.render(false);
  }

  /**
   * Handler: Appliquer un preset de permissions
   */
  async _onApplyPreset(event) {
    event.preventDefault();
    
    const preset = $(event.currentTarget).data('preset');
    const target = $(event.currentTarget).data('target'); // 'default' ou userId
    
    const presets = {
      'view-only': {
        view: true,
        add: false,
        edit: false,
        changeStatus: false,
        delete: false
      },
      'player': {
        view: true,
        add: false,
        edit: false,
        changeStatus: true,
        delete: false
      },
      'contributor': {
        view: true,
        add: true,
        edit: false,
        changeStatus: true,
        delete: false
      },
      'editor': {
        view: true,
        add: true,
        edit: true,
        changeStatus: true,
        delete: false
      },
      'full': {
        view: true,
        add: true,
        edit: true,
        changeStatus: true,
        delete: true
      }
    };
    
    const permissions = presets[preset];
    if (!permissions) return;
    
    if (target === 'default') {
      // Appliquer au défaut
      Object.assign(window.questManager.permissions.defaultPermissions, permissions);
    } else {
      // Appliquer à un utilisateur spécifique
      window.questManager.permissions.userPermissions[target] = { ...permissions };
    }
    
    ui.notifications.info(`Preset "${preset}" appliqué`);
    
    // Rafraîchir l'interface
    this.render(false);
  }

  /**
   * Soumission du formulaire
   */
  async _updateObject(event, formData) {
    try {
      // Sauvegarder les permissions
      await window.questManager.save();
      
      // Émettre un événement socket pour tous les utilisateurs
      window.questManagerSocket.emit(SOCKET_EVENTS.PERMISSIONS_UPDATED, {});
      
      ui.notifications.info("Permissions sauvegardées et synchronisées");
      
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la sauvegarde des permissions:", error);
      ui.notifications.error("Erreur lors de la sauvegarde des permissions");
    }
  }
}