/**
 * Application principale Quest Manager
 * Fenêtre Foundry avec système d'onglets (Vue Arbre / Vue Graphe)
 */

import { QuestCRUD } from '../utils/crud.js';
import { PERMISSION_TYPES } from '../utils/permissions.js';
import { TreeView } from '../views/tree-view.js';
import { GraphView } from '../views/graph-view.js';

export class QuestManagerApp extends Application {
  constructor(options = {}) {
    super(options);
    
    this.currentView = game.settings.get("quest-manager", "defaultView") || "tree";
    this.showCompleted = game.settings.get("quest-manager", "showCompletedByDefault");
    this.searchQuery = "";
    this.expandedQuestIds = new Set(); // IDs des quêtes dépliées
    this.treeView = new TreeView(this);
    this.graphView = new GraphView(this);
  }

  /**
   * Configuration par défaut de l'application
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "quest-manager",
      title: "Gestionnaire de Quêtes",
      template: "modules/quest-manager/templates/quest-manager.html",
      classes: ["quest-manager"],
      width: 800,
      height: 600,
      resizable: true,
      scrollY: [".quest-content"],
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".tab-content",
          initial: "tree"
        }
      ]
    });
  }

  /**
   * Prépare les données pour le template
   */
  async getData() {
    const data = await super.getData();
    
    // Récupérer l'utilisateur actuel
    const userId = game.user.id;
    
    // Permissions de l'utilisateur
    data.permissions = {
      canView: window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.VIEW),
      canAdd: window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.ADD),
      canEdit: window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.EDIT),
      canChangeStatus: window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.CHANGE_STATUS),
      canDelete: window.questManager.permissions.hasPermission(userId, PERMISSION_TYPES.DELETE)
    };
    
    // Configuration
    data.currentView = this.currentView;
    data.showCompleted = this.showCompleted;
    data.searchQuery = this.searchQuery;
    data.isGM = game.user.isGM;
    
    // Statistiques
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    data.stats = {
      total: allQuests.length,
      active: allQuests.filter(q => q.status === 'en_cours').length,
      known: allQuests.filter(q => q.status === 'connue').length,
      completed: allQuests.filter(q => q.status === 'terminee').length
    };
    
    // Quêtes par statut (pour la vue arbre)
    const questsByStatus = QuestCRUD.getAllQuestsByStatus(userId);
    data.activeQuests = this.buildQuestTree(questsByStatus.active);
    data.knownQuests = this.buildQuestTree(questsByStatus.known);
    data.completedQuests = this.buildQuestTree(questsByStatus.completed);
    
    // Données pour la vue graphe (à développer en Phase 4)
    data.graphData = this.prepareGraphData(allQuests);
    
    return data;
  }

  /**
   * Construit l'arbre hiérarchique de quêtes
   * @param {Quest[]} quests - Liste de quêtes
   * @returns {Object[]} Arbre de quêtes
   */
  buildQuestTree(quests) {
    // Filtrer par recherche si nécessaire
    let filteredQuests = quests;
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredQuests = quests.filter(q => 
        q.title.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query)
      );
    }
    
    // Récupérer les quêtes racines (sans parent ou parent filtré)
    const rootQuests = filteredQuests.filter(q => 
      !q.parentId || !filteredQuests.find(fq => fq.id === q.parentId)
    );
    
    // Construire récursivement l'arbre
    return rootQuests.map(quest => this.buildQuestNode(quest, filteredQuests));
  }

  /**
   * Construit un nœud de quête avec ses enfants
   * @param {Quest} quest
   * @param {Quest[]} allQuests
   * @returns {Object}
   */
  buildQuestNode(quest, allQuests) {
    const children = allQuests
      .filter(q => q.parentId === quest.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(child => this.buildQuestNode(child, allQuests));
    
    return {
      ...quest.toJSON(),
      children,
      hasChildren: children.length > 0,
      isExpanded: this.expandedQuestIds.has(quest.id),
      // Métadonnées pour l'affichage
      statusIcon: this.getStatusIcon(quest.status),
      statusColor: this.getStatusColor(quest.status),
      statusLabel: this.getStatusLabel(quest.status)
    };
  }

  /**
   * Prépare les données pour la vue graphe
   * @param {Quest[]} quests
   * @returns {Object}
   */
  prepareGraphData(quests) {
    // Filtrer par recherche si nécessaire
    let filteredQuests = quests;
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredQuests = quests.filter(q => 
        q.title.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query)
      );
    }
    
    // Filtrer par visibilité des quêtes terminées
    if (!this.showCompleted) {
      filteredQuests = filteredQuests.filter(q => q.status !== 'terminee');
    }
    
    // Construire les nœuds
    const nodes = filteredQuests.map(quest => ({
      id: quest.id,
      label: quest.title,
      status: quest.status,
      color: this.getStatusColor(quest.status),
      shape: 'box',
      font: { color: quest.status === 'terminee' ? '#999' : '#000' }
    }));
    
    // Construire les arêtes (relations)
    const edges = [];
    
    filteredQuests.forEach(quest => {
      // Relations parent-enfant
      quest.childrenIds.forEach(childId => {
        if (filteredQuests.find(q => q.id === childId)) {
          edges.push({
            from: quest.id,
            to: childId,
            arrows: 'to',
            color: '#333333',
            label: 'contient',
            dashes: false
          });
        }
      });
      
      // Relations de blocage
      quest.blocksIds.forEach(blockedId => {
        if (filteredQuests.find(q => q.id === blockedId)) {
          edges.push({
            from: quest.id,
            to: blockedId,
            arrows: 'to',
            color: '#e74c3c',
            label: 'bloque',
            dashes: true
          });
        }
      });
      
      // Relations liées
      quest.relatedIds.forEach(relatedId => {
        if (filteredQuests.find(q => q.id === relatedId)) {
          // Éviter les doublons (relation bidirectionnelle)
          if (quest.id < relatedId) {
            edges.push({
              from: quest.id,
              to: relatedId,
              arrows: 'to,from',
              color: '#95a5a6',
              label: 'lié',
              dashes: [5, 5]
            });
          }
        }
      });
    });
    
    return { nodes, edges };
  }

  /**
   * Obtient l'icône FontAwesome pour un statut
   */
  getStatusIcon(status) {
    const icons = {
      'connue': 'fa-circle',
      'en_cours': 'fa-circle-dot',
      'terminee': 'fa-circle-check'
    };
    return icons[status] || 'fa-circle';
  }

  /**
   * Obtient la couleur pour un statut
   */
  getStatusColor(status) {
    const colors = {
      'connue': '#4a90e2',
      'en_cours': '#f5a623',
      'terminee': '#7ed321'
    };
    return colors[status] || '#333';
  }

  /**
   * Obtient le label traduit pour un statut
   */
  getStatusLabel(status) {
    const labels = {
      'connue': 'Connue',
      'en_cours': 'En cours',
      'terminee': 'Terminée'
    };
    return labels[status] || status;
  }

  /**
   * Active les listeners d'événements
   */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Onglets
    html.find('.tab-button').click(this._onTabChange.bind(this));
    
    // Recherche
    html.find('#quest-search').on('input', this._onSearch.bind(this));
    html.find('#clear-search').click(this._onClearSearch.bind(this));
    
    // Filtres
    html.find('#toggle-completed').change(this._onToggleCompleted.bind(this));
    
    // Actions globales
    html.find('#add-quest-btn').click(this._onAddQuest.bind(this));
    html.find('#refresh-btn').click(this._onRefresh.bind(this));
    html.find('#permissions-btn').click(this._onOpenPermissions.bind(this));
    html.find('#export-btn').click(this._onExport.bind(this));
    html.find('#import-btn').click(this._onImport.bind(this));
    
    // Actions sur les quêtes (Vue Arbre)
    html.find('.quest-toggle').click(this._onToggleQuest.bind(this));
    html.find('.quest-title').click(this._onViewQuest.bind(this));
    html.find('.quest-edit').click(this._onEditQuest.bind(this));
    html.find('.quest-delete').click(this._onDeleteQuest.bind(this));
    html.find('.quest-status-change').change(this._onChangeStatus.bind(this));
    html.find('.add-child-quest').click(this._onAddChildQuest.bind(this));
    
    // Vue Graphe (sera développé en Phase 4)
    // html.find('#graph-container') sera géré par vis.js
    
    // Initialiser la vue arbre avec interactions avancées
    if (this.currentView === 'tree') {
      this.treeView.initialize(html);
    } else if (this.currentView === 'graph') {
      this.graphView.initialize(html);
    }
  }

  // ========================================================================
  // HANDLERS D'ÉVÉNEMENTS
  // ========================================================================

  /**
   * Handler: Changement d'onglet
   */
  _onTabChange(event) {
    event.preventDefault();
    const tab = $(event.currentTarget).data('tab');
    this.currentView = tab;
    
    // Mettre à jour les boutons d'onglet
    $(event.currentTarget).siblings().removeClass('active');
    $(event.currentTarget).addClass('active');
    
    // Afficher le contenu correspondant
    const tabContent = this.element.find('.tab-content');
    tabContent.find('.tab-pane').removeClass('active');
    tabContent.find(`#${tab}-view`).addClass('active');
    
    // Initialiser la vue graphe si nécessaire
    if (tab === 'graph') {
      this.graphView.initialize(this.element);
    }
  }

  /**
   * Handler: Recherche
   */
  _onSearch(event) {
    this.searchQuery = $(event.currentTarget).val();
    this.render(false);
  }

  /**
   * Handler: Effacer la recherche
   */
  _onClearSearch(event) {
    event.preventDefault();
    this.searchQuery = "";
    this.element.find('#quest-search').val('');
    this.render(false);
  }

  /**
   * Handler: Toggle affichage des quêtes terminées
   */
  _onToggleCompleted(event) {
    this.showCompleted = $(event.currentTarget).is(':checked');
    this.render(false);
  }

  /**
   * Handler: Ajouter une quête racine
   */
  async _onAddQuest(event) {
    event.preventDefault();
    
    // Importer dynamiquement le formulaire
    const { QuestFormApp } = await import('./quest-form.js');
    
    // Ouvrir le formulaire en mode création
    new QuestFormApp({
      mode: 'create',
      parentApp: this
    }).render(true);
  }

  /**
   * Handler: Rafraîchir l'interface
   */
  _onRefresh(event) {
    event.preventDefault();
    this.render(false);
  }

  /**
 * Handler: Ouvrir la configuration des permissions
 */
  async _onOpenPermissions(event) {
    event.preventDefault();
    
    const { PermissionsConfigApp } = await import('./permissions-config.js');
    new PermissionsConfigApp().render(true);
  }

  /**
   * Handler: Exporter les données
   */
  async _onExport(event) {
    event.preventDefault();
    const { StorageManager } = await import('../utils/storage.js');
    await StorageManager.exportToFile();
  }

  /**
   * Handler: Importer les données
   */
  async _onImport(event) {
    event.preventDefault();
    const { StorageManager } = await import('../utils/storage.js');
    await StorageManager.importFromFile();
  }

  /**
   * Handler: Déplier/Replier une quête
   */
  _onToggleQuest(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const questId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    
    if (this.expandedQuestIds.has(questId)) {
      this.expandedQuestIds.delete(questId);
    } else {
      this.expandedQuestIds.add(questId);
    }
    
    this.render(false);
  }

  /**
   * Handler: Voir les détails d'une quête
   */
  _onViewQuest(event) {
    event.preventDefault();
    
    const questId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    const quest = QuestCRUD.getQuest(questId);
    
    if (!quest) return;
    
    // Afficher les détails dans une dialog
    new Dialog({
      title: quest.title,
      content: this._getQuestDetailsHTML(quest),
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Fermer"
        }
      },
      default: "close"
    }, {
      classes: ["quest-manager", "quest-details-dialog"],
      width: 600
    }).render(true);
  }

  /**
   * Handler: Éditer une quête
   */
  async _onEditQuest(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const questId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    const quest = QuestCRUD.getQuest(questId);
    
    if (!quest) return;
    
    // Importer dynamiquement le formulaire
    const { QuestFormApp } = await import('./quest-form.js');
    
    // Ouvrir le formulaire en mode édition
    new QuestFormApp({
      mode: 'edit',
      quest: quest,
      parentApp: this
    }).render(true);
  }

  /**
   * Handler: Supprimer une quête
   */
  async _onDeleteQuest(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const questId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    const success = await QuestCRUD.deleteQuest(questId);
    
    if (success) {
      this.render(false);
    }
  }

  /**
   * Handler: Changer le statut d'une quête
   */
  async _onChangeStatus(event) {
    event.stopPropagation();
    
    const questId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    const newStatus = $(event.currentTarget).val();
    
    await QuestCRUD.changeQuestStatus(questId, newStatus);
    this.render(false);
  }

  /**
   * Handler: Ajouter une sous-quête
   */
  async _onAddChildQuest(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const parentId = $(event.currentTarget).closest('.quest-item').data('quest-id');
    
    // Importer dynamiquement le formulaire
    const { QuestFormApp } = await import('./quest-form.js');
    
    // Ouvrir le formulaire en mode création avec parent prédéfini
    new QuestFormApp({
      mode: 'create',
      parentId: parentId,
      parentApp: this
    }).render(true);
  }

  /**
   * Génère le HTML des détails d'une quête
   */
  _getQuestDetailsHTML(quest) {
    return `
      <div class="quest-details">
        <div class="quest-status">
          <span class="status-badge" style="background-color: ${this.getStatusColor(quest.status)}">
            <i class="fas ${this.getStatusIcon(quest.status)}"></i>
            ${this.getStatusLabel(quest.status)}
          </span>
        </div>
        
        <div class="quest-description">
          <h3>Description</h3>
          <div class="description-content">
            ${TextEditor.enrichHTML(quest.description, { async: false })}
          </div>
        </div>
        
        ${quest.rewards ? `
          <div class="quest-rewards">
            <h3>Récompenses</h3>
            <div>${TextEditor.enrichHTML(quest.rewards, { async: false })}</div>
          </div>
        ` : ''}
        
        ${quest.location ? `
          <div class="quest-location">
            <h3>Lieu</h3>
            <div>${TextEditor.enrichHTML(quest.location, { async: false })}</div>
          </div>
        ` : ''}
        
        ${quest.npcs && quest.npcs.length > 0 ? `
          <div class="quest-npcs">
            <h3>PNJs</h3>
            <div>
              ${quest.npcs.map(npc => TextEditor.enrichHTML(npc, { async: false })).join(', ')}
            </div>
          </div>
        ` : ''}
        
        ${game.user.isGM && quest.notes ? `
          <div class="quest-notes">
            <h3>Notes (MJ uniquement)</h3>
            <div class="notes-content">${quest.notes}</div>
          </div>
        ` : ''}
        
        <div class="quest-metadata">
          <p><strong>Créée le:</strong> ${new Date(quest.createdAt).toLocaleString('fr-FR')}</p>
          <p><strong>Modifiée le:</strong> ${new Date(quest.updatedAt).toLocaleString('fr-FR')}</p>
        </div>
      </div>
    `;
  }

  // ========================================================================
  // DRAG & DROP
  // ========================================================================

  _onDragStart(event) {
    const questId = $(event.currentTarget).data('quest-id');
    event.dataTransfer.setData('text/plain', questId);
    $(event.currentTarget).addClass('dragging');
  }

  _onDragOver(event) {
    event.preventDefault();
    $(event.currentTarget).addClass('drag-over');
  }

  _onDrop(event) {
    event.preventDefault();
    $(event.currentTarget).removeClass('drag-over');
    
    const draggedId = event.dataTransfer.getData('text/plain');
    const targetId = $(event.currentTarget).data('quest-id');
    
    if (draggedId === targetId) return;
    
    // Déplacer la quête (changer son parent)
    this._moveQuest(draggedId, targetId);
  }

  _onDragEnd(event) {
    $('.quest-item').removeClass('dragging drag-over');
  }

  /**
   * Déplace une quête sous un nouveau parent
   */
  async _moveQuest(questId, newParentId) {
    await QuestCRUD.updateQuest(questId, { parentId: newParentId });
    this.render(false);
  }

  /**
   * Initialise/Rafraîchit le graphe (Vue Graphe)
   * Sera développé en Phase 4
   */
  _renderGraph() {
    console.log("Quest Manager | Rendu du graphe (à implémenter en Phase 4)");
    // TODO: Implémenter avec vis.js en Phase 4
  }
  
  /**
   * Fermeture de l'application
   */
  async close(options) {
    // Détruire le réseau vis.js
    if (this.graphView) {
      this.graphView.destroy();
    }
    
    return super.close(options);
  }
}