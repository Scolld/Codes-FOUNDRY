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
  
    // Liste des acteurs disponibles
    data.availableActors = game.actors
      .filter(a => a.type === 'character' || a.type === 'npc') // Adapter selon votre système
      .map(a => ({
        id: a.id,
        name: a.name,
        img: a.img,
        selected: a.id === data.quest.completedBy
      }));

    // Récompenses items formatées
    data.rewardItemsList = data.quest.rewardItems || [];
    
    // Informations de complétion
    data.completionInfo = null;
    if (data.quest.completedBy) {
      const completedByActor = game.actors.get(data.quest.completedBy);
      data.completionInfo = {
        actorName: completedByActor?.name || "Acteur inconnu",
        actorImg: completedByActor?.img || "icons/svg/mystery-man.svg",
        completedAt: data.quest.completedAt ? new Date(data.quest.completedAt).toLocaleString('fr-FR') : null,
        rewardsDistributed: data.quest.rewardsDistributed
      };
    }
    
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
  
    // Gestion des récompenses items
    html.find('#add-reward-item').click(this._onAddRewardItem.bind(this));
    html.find('.remove-reward-item').click(this._onRemoveRewardItem.bind(this));
    html.find('.reward-item-drop-zone').on('drop', this._onDropRewardItem.bind(this));
    html.find('.reward-item-drop-zone').on('dragover', (e) => e.preventDefault());
    
    // Distribution des récompenses
    html.find('#distribute-rewards').click(this._onDistributeRewards.bind(this));
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
   * Handler: Ajouter un item de récompense (via sélection)
   */
  async _onAddRewardItem(event) {
    event.preventDefault();
    
    // Ouvrir un dialog pour sélectionner un item
    const items = game.items.contents;
    
    const itemOptions = items.map(item => 
      `<option value="${item.uuid}">${item.name}</option>`
    ).join('');
    
    const content = `
      <form>
        <div class="form-group">
          <label>Item:</label>
          <select id="item-select" style="width: 100%;">
            <option value="">-- Sélectionner un item --</option>
            ${itemOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Quantité:</label>
          <input type="number" id="item-quantity" value="1" min="1" style="width: 100%;">
        </div>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
          <i class="fas fa-info-circle"></i> Vous pouvez aussi glisser-déposer un item depuis votre compendium ou inventaire.
        </p>
      </form>
    `;
    
    new Dialog({
      title: "Ajouter une récompense",
      content: content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Ajouter",
          callback: async (html) => {
            const itemUuid = html.find('#item-select').val();
            const quantity = parseInt(html.find('#item-quantity').val()) || 1;
            
            if (!itemUuid) {
              ui.notifications.warn("Veuillez sélectionner un item");
              return;
            }
            
            const item = await fromUuid(itemUuid);
            if (!item) {
              ui.notifications.error("Item introuvable");
              return;
            }
            
            // Ajouter à la liste affichée
            this._addRewardItemToList({
              itemId: item.id,
              itemUuid: item.uuid,
              itemName: item.name,
              itemImg: item.img,
              quantity: quantity
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "add"
    }).render(true);
  }

  /**
   * Handler: Drop d'un item (drag & drop)
   */
  async _onDropRewardItem(event) {
    event.preventDefault();
    
    let data;
    try {
      data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }
    
    if (data.type !== 'Item') return;
    
    const item = await fromUuid(data.uuid);
    if (!item) {
      ui.notifications.error("Item introuvable");
      return;
    }
    
    // Demander la quantité
    const quantity = await new Promise((resolve) => {
      new Dialog({
        title: "Quantité",
        content: `
          <form>
            <div class="form-group">
              <label>Quantité de ${item.name}:</label>
              <input type="number" id="quantity-input" value="1" min="1" style="width: 100%;">
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "OK",
            callback: (html) => resolve(parseInt(html.find('#quantity-input').val()) || 1)
          },
          cancel: {
            label: "Annuler",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });
    
    if (quantity === null) return;
    
    this._addRewardItemToList({
      itemId: item.id,
      itemUuid: item.uuid,
      itemName: item.name,
      itemImg: item.img,
      quantity: quantity
    });
  }

  /**
   * Ajoute un item de récompense à la liste affichée
   */
  _addRewardItemToList(itemData) {
    const listHtml = `
      <li class="reward-item" data-item-uuid="${itemData.itemUuid}">
        <img src="${itemData.itemImg}" alt="${itemData.itemName}" />
        <div class="reward-item-info">
          <strong>${itemData.itemName}</strong>
          <span>Quantité: ${itemData.quantity}</span>
        </div>
        <button type="button" class="remove-reward-item" title="Supprimer">
          <i class="fas fa-times"></i>
        </button>
      </li>
    `;
    
    this.element.find('#reward-items-list').append(listHtml);
    
    // Réattacher les listeners
    this.element.find('.remove-reward-item').off('click').click(this._onRemoveRewardItem.bind(this));
  }

  /**
   * Handler: Supprimer un item de récompense
   */
  _onRemoveRewardItem(event) {
    event.preventDefault();
    $(event.currentTarget).closest('.reward-item').remove();
  }

  /**
   * Handler: Distribuer les récompenses
   */
  async _onDistributeRewards(event) {
    event.preventDefault();
    
    if (!this.quest) return;
    
    const success = await this.quest.distributeRewards();
    
    if (success) {
      // Sauvegarder
      await window.questManager.save();
      
      // Rafraîchir le formulaire
      this.render(false);
      
      // Rafraîchir l'app parente
      if (this.parentApp) {
        this.parentApp.render(false);
      }
    }
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
  
    // Récupérer les récompenses items depuis la liste affichée
    formData.rewardItems = [];
    this.element.find('#reward-items-list .reward-item').each((i, el) => {
      const $el = $(el);
      const itemUuid = $el.data('item-uuid');
      const itemName = $el.find('strong').text();
      const quantity = parseInt($el.find('span').text().match(/\d+/)?.[0]) || 1;
      const itemImg = $el.find('img').attr('src');
      
      formData.rewardItems.push({
        itemUuid: itemUuid,
        itemName: itemName,
        quantity: quantity,
        itemImg: itemImg
      });
    });
    
    // Acteur qui a complété
    formData.completedBy = formData.completedBy || null;
    
    // Conserver les champs existants si on ne les modifie pas
    if (this.quest) {
      formData.completedAt = this.quest.completedAt;
      formData.rewardsDistributed = this.quest.rewardsDistributed;
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