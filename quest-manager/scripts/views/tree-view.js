/**
 * Gestionnaire de la vue arbre avec interactions avancées
 */

import { QuestCRUD } from '../utils/crud.js';
import { QUEST_STATUS } from '../models/quest.js';

export class TreeView {
  constructor(app) {
    this.app = app; // Référence à QuestManagerApp
    this.draggedQuestId = null;
    this.draggedElement = null;
    this.dropTarget = null;
    this.expandAllActive = false;
  }

  /**
   * Initialise les interactions de la vue arbre
   * @param {jQuery} html - Element HTML de l'application
   */
  initialize(html) {
    this.html = html;
    this.setupDragAndDrop();
    this.setupKeyboardShortcuts();
    this.setupContextMenu();
    this.setupAnimations();
    this.setupTooltips();
  }

  /**
   * Configure le drag & drop avancé
   */
  setupDragAndDrop() {
    const questItems = this.html.find('.quest-item');
    
    questItems.each((i, element) => {
      const $element = $(element);
      const questId = $element.data('quest-id');
      
      // Rendre draggable
      element.setAttribute('draggable', true);
      
      // Events drag
      element.addEventListener('dragstart', this.onDragStart.bind(this));
      element.addEventListener('dragend', this.onDragEnd.bind(this));
      
      // Events drop
      element.addEventListener('dragenter', this.onDragEnter.bind(this));
      element.addEventListener('dragover', this.onDragOver.bind(this));
      element.addEventListener('dragleave', this.onDragLeave.bind(this));
      element.addEventListener('drop', this.onDrop.bind(this));
    });
  }

  /**
   * Handler: Début du drag
   */
  onDragStart(event) {
    this.draggedQuestId = $(event.currentTarget).data('quest-id');
    this.draggedElement = event.currentTarget;
    
    // Styling
    $(event.currentTarget).addClass('dragging');
    
    // Données pour le transfert
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.draggedQuestId);
    
    // Image de drag personnalisée
    const dragImage = event.currentTarget.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    // Ajouter une classe à tous les descendants pour les rendre non-droppable
    this.markDescendants(this.draggedQuestId);
  }

  /**
   * Handler: Fin du drag
   */
  onDragEnd(event) {
    // Nettoyer les classes
    this.html.find('.quest-item').removeClass('dragging drag-over drag-over-top drag-over-bottom not-droppable');
    this.draggedQuestId = null;
    this.draggedElement = null;
    this.dropTarget = null;
  }

  /**
   * Handler: Entrée dans une zone de drop
   */
  onDragEnter(event) {
    event.preventDefault();
    
    const targetElement = $(event.currentTarget);
    const targetId = targetElement.data('quest-id');
    
    // Ne pas permettre de drop sur soi-même ou ses descendants
    if (targetId === this.draggedQuestId || targetElement.hasClass('not-droppable')) {
      return;
    }
    
    targetElement.addClass('drag-over');
  }

  /**
   * Handler: Survol d'une zone de drop
   */
  onDragOver(event) {
    event.preventDefault();
    
    const targetElement = $(event.currentTarget);
    const targetId = targetElement.data('quest-id');
    
    // Ne pas permettre de drop sur soi-même ou ses descendants
    if (targetId === this.draggedQuestId || targetElement.hasClass('not-droppable')) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    
    event.dataTransfer.dropEffect = 'move';
    
    // Déterminer la position du drop (au-dessus, au-dessous, ou enfant)
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    
    targetElement.removeClass('drag-over-top drag-over-bottom');
    
    if (y < height * 0.25) {
      // Drop au-dessus (même niveau, avant)
      targetElement.addClass('drag-over-top');
      this.dropPosition = 'before';
    } else if (y > height * 0.75) {
      // Drop en-dessous (même niveau, après)
      targetElement.addClass('drag-over-bottom');
      this.dropPosition = 'after';
    } else {
      // Drop comme enfant
      this.dropPosition = 'child';
    }
  }

  /**
   * Handler: Sortie d'une zone de drop
   */
  onDragLeave(event) {
    const targetElement = $(event.currentTarget);
    
    // Vérifier qu'on quitte vraiment l'élément (pas juste un enfant)
    if (!event.currentTarget.contains(event.relatedTarget)) {
      targetElement.removeClass('drag-over drag-over-top drag-over-bottom');
    }
  }

  /**
   * Handler: Drop
   */
  async onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const targetElement = $(event.currentTarget);
    const targetId = targetElement.data('quest-id');
    
    // Ne pas permettre de drop sur soi-même ou ses descendants
    if (targetId === this.draggedQuestId || targetElement.hasClass('not-droppable')) {
      return;
    }
    
    const draggedQuest = QuestCRUD.getQuest(this.draggedQuestId);
    const targetQuest = QuestCRUD.getQuest(targetId);
    
    if (!draggedQuest || !targetQuest) return;
    
    // Effectuer l'action selon la position du drop
    if (this.dropPosition === 'child') {
      // Devenir enfant de la cible
      await this.moveQuestAsChild(this.draggedQuestId, targetId);
    } else if (this.dropPosition === 'before' || this.dropPosition === 'after') {
      // Devenir sibling de la cible
      await this.moveQuestAsSibling(this.draggedQuestId, targetId, this.dropPosition);
    }
    
    // Animation de succès
    this.animateDropSuccess(event.currentTarget);
  }

  /**
   * Déplace une quête comme enfant d'une autre
   */
  async moveQuestAsChild(questId, newParentId) {
    try {
      // Vérifier les dépendances circulaires
      if (window.questManager.questTree.wouldCreateCircularDependency(questId, newParentId)) {
        ui.notifications.error("Impossible: cela créerait une dépendance circulaire");
        return;
      }
      
      await QuestCRUD.updateQuest(questId, { parentId: newParentId });
      
      // Déplier automatiquement le nouveau parent
      this.app.expandedQuestIds.add(newParentId);
      
      this.app.render(false);
      ui.notifications.info("Quête déplacée");
      
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      ui.notifications.error("Erreur lors du déplacement de la quête");
    }
  }

  /**
   * Déplace une quête au même niveau qu'une autre (sibling)
   */
  async moveQuestAsSibling(questId, targetId, position) {
    try {
      const targetQuest = QuestCRUD.getQuest(targetId);
      const newParentId = targetQuest.parentId;
      
      // Vérifier les dépendances circulaires si nouveau parent
      if (newParentId && window.questManager.questTree.wouldCreateCircularDependency(questId, newParentId)) {
        ui.notifications.error("Impossible: cela créerait une dépendance circulaire");
        return;
      }
      
      // Mettre à jour le parent
      await QuestCRUD.updateQuest(questId, { parentId: newParentId });
      
      // Ajuster l'ordre de tri (sortOrder)
      const draggedQuest = QuestCRUD.getQuest(questId);
      const siblings = newParentId 
        ? window.questManager.questTree.getChildren(newParentId)
        : window.questManager.questTree.getRootQuests();
      
      // Réorganiser les sortOrder
      const targetIndex = siblings.findIndex(q => q.id === targetId);
      const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
      
      siblings.forEach((sibling, index) => {
        if (sibling.id === questId) return;
        
        let newOrder = index;
        if (index >= newIndex) newOrder++;
        
        sibling.sortOrder = newOrder;
      });
      
      draggedQuest.sortOrder = newIndex;
      
      await window.questManager.save();
      this.app.render(false);
      ui.notifications.info("Quête réorganisée");
      
    } catch (error) {
      console.error("Erreur lors de la réorganisation:", error);
      ui.notifications.error("Erreur lors de la réorganisation de la quête");
    }
  }

  /**
   * Marque tous les descendants d'une quête comme non-droppable
   */
  markDescendants(questId) {
    const quest = window.questManager.questTree.getQuest(questId);
    if (!quest) return;
    
    const markRecursive = (id) => {
      this.html.find(`.quest-item[data-quest-id="${id}"]`).addClass('not-droppable');
      
      const q = window.questManager.questTree.getQuest(id);
      if (q && q.childrenIds) {
        q.childrenIds.forEach(childId => markRecursive(childId));
      }
    };
    
    markRecursive(questId);
  }

  /**
   * Animation de succès après un drop
   */
  animateDropSuccess(element) {
    $(element).addClass('drop-success');
    setTimeout(() => {
      $(element).removeClass('drop-success');
    }, 600);
  }

  /**
   * Configure les raccourcis clavier
   */
  setupKeyboardShortcuts() {
    // Écouter les événements clavier uniquement quand l'app est focus
    this.html.on('keydown', (event) => {
      const target = $(event.target);
      
      // Ne pas intercepter si on tape dans un input/textarea
      if (target.is('input, textarea, select')) {
        return;
      }
      
      // Ctrl/Cmd + F : Focus sur la recherche
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        this.html.find('#quest-search').focus();
      }
      
      // Ctrl/Cmd + N : Nouvelle quête
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        this.html.find('#add-quest-btn').click();
      }
      
      // Ctrl/Cmd + E : Déplier/Replier tout
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        this.toggleExpandAll();
      }
      
      // Escape : Effacer la recherche
      if (event.key === 'Escape') {
        const searchInput = this.html.find('#quest-search');
        if (searchInput.val()) {
          event.preventDefault();
          this.html.find('#clear-search').click();
        }
      }
    });
  }

  /**
   * Déplier/Replier toutes les quêtes
   */
  toggleExpandAll() {
    this.expandAllActive = !this.expandAllActive;
    
    if (this.expandAllActive) {
      // Déplier tout
      const allQuestIds = Array.from(window.questManager.questTree.quests.keys());
      allQuestIds.forEach(id => this.app.expandedQuestIds.add(id));
      ui.notifications.info("Toutes les quêtes dépliées");
    } else {
      // Replier tout
      this.app.expandedQuestIds.clear();
      ui.notifications.info("Toutes les quêtes repliées");
    }
    
    this.app.render(false);
  }

  /**
   * Configure le menu contextuel (clic droit)
   */
  setupContextMenu() {
    this.html.find('.quest-item').on('contextmenu', async (event) => {
      event.preventDefault();
      
      const questId = $(event.currentTarget).data('quest-id');
      const quest = QuestCRUD.getQuest(questId);
      
      if (!quest) return;
      
      // Créer le menu contextuel
      const items = this.buildContextMenu(quest);
      
      // Utiliser le ContextMenu de Foundry
      new ContextMenu(this.html, '.quest-item', items);
      
      // Trigger manuel du menu
      $(event.currentTarget).trigger('contextmenu');
    });
  }

  /**
   * Construit les items du menu contextuel
   */
  buildContextMenu(quest) {
    const items = [];
    const permissions = window.questManager.permissions;
    const userId = game.user.id;
    
    // Voir les détails
    items.push({
      name: "Voir les détails",
      icon: '<i class="fas fa-eye"></i>',
      callback: () => {
        this.html.find(`.quest-item[data-quest-id="${quest.id}"] .quest-title`).click();
      }
    });
    
    // Éditer
    if (permissions.hasPermission(userId, 'edit')) {
      items.push({
        name: "Éditer",
        icon: '<i class="fas fa-edit"></i>',
        callback: () => {
          this.html.find(`.quest-item[data-quest-id="${quest.id}"] .quest-edit`).click();
        }
      });
    }
    
    // Changer le statut
    if (permissions.hasPermission(userId, 'changeStatus')) {
      items.push({
        name: "───────────", // Séparateur
        callback: () => {}
      });
      
      items.push({
        name: "Marquer comme connue",
        icon: '<i class="fas fa-circle"></i>',
        condition: quest.status !== QUEST_STATUS.KNOWN,
        callback: async () => {
          await QuestCRUD.changeQuestStatus(quest.id, QUEST_STATUS.KNOWN);
          this.app.render(false);
        }
      });
      
      items.push({
        name: "Marquer en cours",
        icon: '<i class="fas fa-circle-dot"></i>',
        condition: quest.status !== QUEST_STATUS.ACTIVE,
        callback: async () => {
          await QuestCRUD.changeQuestStatus(quest.id, QUEST_STATUS.ACTIVE);
          this.app.render(false);
        }
      });
      
      items.push({
        name: "Marquer comme terminée",
        icon: '<i class="fas fa-circle-check"></i>',
        condition: quest.status !== QUEST_STATUS.COMPLETED,
        callback: async () => {
          await QuestCRUD.changeQuestStatus(quest.id, QUEST_STATUS.COMPLETED);
          this.app.render(false);
        }
      });
    }
    
    // Ajouter une sous-quête
    if (permissions.hasPermission(userId, 'add')) {
      items.push({
        name: "───────────", // Séparateur
        callback: () => {}
      });
      
      items.push({
        name: "Ajouter une sous-quête",
        icon: '<i class="fas fa-plus"></i>',
        callback: () => {
          this.html.find(`.quest-item[data-quest-id="${quest.id}"] .add-child-quest`).click();
        }
      });
    }
    
    // Dupliquer
    if (permissions.hasPermission(userId, 'add')) {
      items.push({
        name: "Dupliquer",
        icon: '<i class="fas fa-copy"></i>',
        callback: async () => {
          await this.duplicateQuest(quest);
        }
      });
    }
    
    // Supprimer
    if (permissions.hasPermission(userId, 'delete')) {
      items.push({
        name: "───────────", // Séparateur
        callback: () => {}
      });
      
      items.push({
        name: "Supprimer",
        icon: '<i class="fas fa-trash" style="color: #e74c3c;"></i>',
        callback: () => {
          this.html.find(`.quest-item[data-quest-id="${quest.id}"] .quest-delete`).click();
        }
      });
    }
    
    return items;
  }

  /**
   * Duplique une quête
   */
  async duplicateQuest(quest) {
    try {
      const duplicateData = {
        ...quest.toJSON(),
        id: undefined, // Nouveau ID sera généré
        title: `${quest.title} (copie)`,
        childrenIds: [], // Ne pas copier les enfants
        createdAt: undefined,
        updatedAt: undefined
      };
      
      const newQuest = await QuestCRUD.createQuest(duplicateData);
      
      if (newQuest) {
        this.app.render(false);
        ui.notifications.info(`Quête "${newQuest.title}" créée`);
      }
      
    } catch (error) {
      console.error("Erreur lors de la duplication:", error);
      ui.notifications.error("Erreur lors de la duplication de la quête");
    }
  }

  /**
   * Configure les animations
   */
  setupAnimations() {
    // Animation d'apparition des quêtes
    this.html.find('.quest-item').each((i, element) => {
      $(element).css({
        'animation': `fadeInSlide 0.3s ease-out ${i * 0.02}s both`
      });
    });
  }

  /**
   * Configure les tooltips
   */
  setupTooltips() {
    // Tooltips pour les icônes de statut
    this.html.find('.status-badge').each((i, element) => {
      const $element = $(element);
      const status = $element.closest('.quest-item').data('status');
      
      const tooltips = {
        'connue': 'Quête découverte mais pas commencée',
        'en_cours': 'Quête en cours de réalisation',
        'terminee': 'Quête terminée'
      };
      
      $element.attr('title', tooltips[status] || status);
    });
    
    // Tooltips pour les relations
    this.html.find('.quest-item').each((i, element) => {
      const $element = $(element);
      const questId = $element.data('quest-id');
      const quest = QuestCRUD.getQuest(questId);
      
      if (!quest) return;
      
      const relations = [];
      
      if (quest.blockedByIds.length > 0) {
        relations.push(`🔒 Bloquée par ${quest.blockedByIds.length} quête(s)`);
      }
      
      if (quest.blocksIds.length > 0) {
        relations.push(`🚫 Bloque ${quest.blocksIds.length} quête(s)`);
      }
      
      if (quest.relatedIds.length > 0) {
        relations.push(`🔗 Liée à ${quest.relatedIds.length} quête(s)`);
      }
      
      if (relations.length > 0) {
        const title = $element.find('.quest-title');
        const currentTitle = title.attr('title') || '';
        title.attr('title', currentTitle + '\n\n' + relations.join('\n'));
      }
    });
  }

  /**
   * Highlight une quête (scroll + animation)
   */
  highlightQuest(questId) {
    const element = this.html.find(`.quest-item[data-quest-id="${questId}"]`);
    
    if (element.length === 0) return;
    
    // Déplier le chemin jusqu'à la quête
    this.expandPathToQuest(questId);
    
    // Attendre le render
    setTimeout(() => {
      // Scroll vers la quête
      element[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Animation de highlight
      element.addClass('quest-highlight');
      setTimeout(() => {
        element.removeClass('quest-highlight');
      }, 2000);
    }, 300);
  }

  /**
   * Déploie le chemin jusqu'à une quête
   */
  expandPathToQuest(questId) {
    const quest = window.questManager.questTree.getQuest(questId);
    if (!quest) return;
    
    let currentId = quest.parentId;
    while (currentId) {
      this.app.expandedQuestIds.add(currentId);
      const parent = window.questManager.questTree.getQuest(currentId);
      currentId = parent?.parentId;
    }
    
    this.app.render(false);
  }
}