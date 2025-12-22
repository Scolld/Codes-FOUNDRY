/**
 * Formulaire de création/édition de quête
 */

import { Quest } from '../models/quest.js';
import { QuestCRUD } from '../utils/crud.js';
import { QUEST_STATUS } from '../models/quest.js';

export class QuestFormApp extends FormApplication {
  constructor(options = {}) {
    super({}, options);
    
    this.mode = options.mode || 'create'; // 'create' ou 'edit'
    this.quest = options.quest || null;
    this.parentId = options.parentId || null;
    this.parentApp = options.parentApp || null;
  }

  /**
   * Configuration par défaut du formulaire
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "quest-form",
      classes: ["quest-manager", "quest-form"],
      template: "modules/quest-manager/templates/quest-form.html",
      width: 700,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
      resizable: true,
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".tab-content",
          initial: "basic"
        }
      ]
    });
  }

  /**
   * Titre dynamique selon le mode
   */
  get title() {
    if (this.mode === 'edit') {
      return `Éditer: ${this.quest?.title || 'Quête'}`;
    }
    return "Nouvelle quête";
  }

  /**
   * Prépare les données pour le template
   */
  async getData() {
    const data = await super.getData();
    
    // Mode et quête
    data.mode = this.mode;
    data.isEdit = this.mode === 'edit';
    data.isCreate = this.mode === 'create';
    
    // Données de la quête (vide si création)
    if (this.quest) {
      data.quest = this.quest.toJSON();
    } else {
      data.quest = {
        id: null,
        title: "",
        description: "",
        status: QUEST_STATUS.KNOWN,
        parentId: this.parentId,
        childrenIds: [],
        blockedByIds: [],
        blocksIds: [],
        relatedIds: [],
        notes: "",
        rewards: "",
        location: "",
        npcs: []
      };
    }
    
    // Liste des statuts disponibles
    data.statuses = [
      { value: QUEST_STATUS.KNOWN, label: "Connue" },
      { value: QUEST_STATUS.ACTIVE, label: "En cours" },
      { value: QUEST_STATUS.COMPLETED, label: "Terminée" }
    ];
    
    // Listes des quêtes disponibles pour les relations
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    
    // Exclure la quête actuelle et ses descendants (pour éviter les boucles)
    const currentId = this.quest?.id;
    const excludedIds = currentId ? this._getDescendantIds(currentId) : [];
    excludedIds.push(currentId);
    
    data.availableParents = allQuests
      .filter(q => !excludedIds.includes(q.id))
      .map(q => ({
        id: q.id,
        title: q.title,
        selected: q.id === data.quest.parentId
      }));
    
    data.availableQuests = allQuests
      .filter(q => !excludedIds.includes(q.id))
      .map(q => ({
        id: q.id,
        title: q.title
      }));
    
    // Relations actuelles formatées
    data.blockedByQuests = this._getQuestsByIds(data.quest.blockedByIds);
    data.blocksQuests = this._getQuestsByIds(data.quest.blocksIds);
    data.relatedQuests = this._getQuestsByIds(data.quest.relatedIds);
    
    // NPCs actuels formatés
    data.npcsList = data.quest.npcs.join('\n');
    
    // Permissions
    data.isGM = game.user.isGM;
    
    return data;
  }

  /**
   * Récupère tous les descendants d'une quête (pour éviter les dépendances circulaires)
   */
  _getDescendantIds(questId, visited = new Set()) {
    if (visited.has(questId)) return [];
    visited.add(questId);
    
    const quest = window.questManager.questTree.getQuest(questId);
    if (!quest) return [];
    
    const descendants = [...quest.childrenIds];
    
    quest.childrenIds.forEach(childId => {
      descendants.push(...this._getDescendantIds(childId, visited));
    });
    
    return descendants;
  }

  /**
   * Récupère des quêtes par leurs IDs
   */
  _getQuestsByIds(ids) {
    return ids
      .map(id => window.questManager.questTree.getQuest(id))
      .filter(q => q !== null)
      .map(q => ({ id: q.id, title: q.title }));
  }

  /**
   * Active les listeners d'événements
   */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Boutons d'ajout de relations
    html.find('#add-blocked-by').click(this._onAddRelation.bind(this, 'blockedBy'));
    html.find('#add-blocks').click(this._onAddRelation.bind(this, 'blocks'));
    html.find('#add-related').click(this._onAddRelation.bind(this, 'related'));
    
    // Boutons de suppression de relations
    html.find('.remove-relation').click(this._onRemoveRelation.bind(this));
    
    // Enrichissement de texte (ProseMirror) pour la description
    // Note: Foundry gère automatiquement les textareas avec class="editor"
    
    // Validation en temps réel
    html.find('input[name="title"]').on('input', this._validateTitle.bind(this));
  }

  /**
   * Validation du titre
   */
  _validateTitle(event) {
    const title = $(event.currentTarget).val().trim();
    const submitBtn = this.element.find('button[type="submit"]');
    
    if (title.length === 0) {
      submitBtn.prop('disabled', true);
      $(event.currentTarget).addClass('invalid');
    } else if (title.length > 200) {
      submitBtn.prop('disabled', true);
      $(event.currentTarget).addClass('invalid');
    } else {
      submitBtn.prop('disabled', false);
      $(event.currentTarget).removeClass('invalid');
    }
  }

  /**
   * Handler: Ajouter une relation
   */
  _onAddRelation(relationType, event) {
    event.preventDefault();
    
    const selectId = `#${relationType}-select`;
    const selectedQuestId = this.element.find(selectId).val();
    
    if (!selectedQuestId) {
      ui.notifications.warn("Veuillez sélectionner une quête");
      return;
    }
    
    const quest = window.questManager.questTree.getQuest(selectedQuestId);
    if (!quest) return;
    
    // Ajouter à la liste affichée
    const listId = `#${relationType}-list`;
    const listHtml = `
      <li class="relation-item" data-quest-id="${quest.id}">
        <span>${quest.title}</span>
        <button type="button" class="remove-relation" data-relation-type="${relationType}" data-quest-id="${quest.id}">
          <i class="fas fa-times"></i>
        </button>
      </li>
    `;
    
    this.element.find(listId).append(listHtml);
    
    // Réinitialiser le select
    this.element.find(selectId).val('');
    
    // Réattacher les listeners
    this.element.find('.remove-relation').off('click').click(this._onRemoveRelation.bind(this));
  }

  /**
   * Handler: Supprimer une relation
   */
  _onRemoveRelation(event) {
    event.preventDefault();
    $(event.currentTarget).closest('.relation-item').remove();
  }

  /**
   * Récupère les données du formulaire
   */
  _getSubmitData(updateData = {}) {
    const formData = super._getSubmitData(updateData);
    
    // Parser les NPCs (un par ligne)
    const npcsText = formData.npcs || '';
    formData.npcs = npcsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Récupérer les relations depuis les listes affichées
    formData.blockedByIds = [];
    this.element.find('#blockedBy-list .relation-item').each((i, el) => {
      formData.blockedByIds.push($(el).data('quest-id'));
    });
    
    formData.blocksIds = [];
    this.element.find('#blocks-list .relation-item').each((i, el) => {
      formData.blocksIds.push($(el).data('quest-id'));
    });
    
    formData.relatedIds = [];
    this.element.find('#related-list .relation-item').each((i, el) => {
      formData.relatedIds.push($(el).data('quest-id'));
    });
    
    // Nettoyer les childrenIds (géré automatiquement, pas éditable directement)
    if (this.quest) {
      formData.childrenIds = this.quest.childrenIds;
    }
    
    return formData;
  }

  /**
   * Soumission du formulaire
   */
  async _updateObject(event, formData) {
    try {
      if (this.mode === 'create') {
        // Créer une nouvelle quête
        const quest = await QuestCRUD.createQuest(formData);
        
        if (quest) {
          ui.notifications.info(`Quête "${quest.title}" créée avec succès`);
          
          // Rafraîchir l'application parente si elle existe
          if (this.parentApp) {
            this.parentApp.render(false);
          }
        }
        
      } else if (this.mode === 'edit') {
        // Mettre à jour la quête existante
        const quest = await QuestCRUD.updateQuest(this.quest.id, formData);
        
        if (quest) {
          ui.notifications.info(`Quête "${quest.title}" mise à jour`);
          
          // Rafraîchir l'application parente si elle existe
          if (this.parentApp) {
            this.parentApp.render(false);
          }
        }
      }
      
    } catch (error) {
      console.error("Quest Manager | Erreur lors de la soumission:", error);
      ui.notifications.error("Erreur lors de l'enregistrement de la quête");
    }
  }
}