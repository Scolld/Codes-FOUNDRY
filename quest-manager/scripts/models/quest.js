/**
 * Constantes pour les statuts de quête
 */
export const QUEST_STATUS = {
  KNOWN: "connue",
  ACTIVE: "en_cours",
  COMPLETED: "terminee"
};

export const QUEST_STATUS_ORDER = {
  "en_cours": 1,
  "connue": 2,
  "terminee": 3
};

export const QUEST_STATUS_COLORS = {
  "connue": "#4a90e2",
  "en_cours": "#f5a623",
  "terminee": "#7ed321"
};

export const QUEST_STATUS_ICONS = {
  "connue": "fa-circle",
  "en_cours": "fa-circle-dot",
  "terminee": "fa-circle-check"
};

/**
 * Constantes pour les types de relations
 */
export const QUEST_RELATION_TYPES = {
  PARENT: "parent",
  CHILD: "child",
  BLOCKS: "blocks",
  BLOCKED_BY: "blockedBy",
  RELATED: "related"
};

export const RELATION_COLORS = {
  "parent": "#333333",
  "child": "#333333",
  "blocks": "#e74c3c",
  "blockedBy": "#e74c3c",
  "related": "#95a5a6"
};

export const RELATION_STYLES = {
  "parent": "solid",
  "child": "solid",
  "blocks": "dashed",
  "blockedBy": "dashed",
  "related": "dotted"
};

/**
 * Règles de validation
 */
export const QUEST_VALIDATION_RULES = {
  required: ["id", "title", "status", "createdAt", "createdBy"],
  titleMaxLength: 200,
  descriptionMaxLength: 10000,
  notesMaxLength: 5000,
  allowedStatuses: ["connue", "en_cours", "terminee"],
  maxChildren: 50,
  maxRelations: 20,
  preventCircularDependencies: true
};

/**
 * Classe représentant une quête
 */
export class Quest {
  constructor(data = {}) {
    // Génération d'ID unique si non fourni
    this.id = data.id || foundry.utils.randomID();
    
    // Informations de base
    this.title = data.title || "";
    this.description = data.description || "";
    this.status = data.status || QUEST_STATUS.KNOWN;
    
    // Relations
    this.parentId = data.parentId || null;
    this.childrenIds = data.childrenIds || [];
    this.blockedByIds = data.blockedByIds || [];
    this.blocksIds = data.blocksIds || [];
    this.relatedIds = data.relatedIds || [];
    
    // Métadonnées
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy || game.user.id;
    this.updatedBy = data.updatedBy || game.user.id;
    
    // Données optionnelles
    this.notes = data.notes || "";
    this.rewards = data.rewards || ""; // Texte libre (conservé pour compatibilité)
    this.location = data.location || "";
    this.npcs = data.npcs || [];
    this.sortOrder = data.sortOrder || 0;
    
    // **NOUVEAU: Système de récompenses items**
    this.rewardItems = data.rewardItems || []; // Array de {itemId, itemUuid, itemName, quantity, itemImg}
    this.completedBy = data.completedBy || null; // ID de l'acteur qui a complété la quête
    this.completedAt = data.completedAt || null; // Timestamp de complétion
    this.rewardsDistributed = data.rewardsDistributed || false; // Les récompenses ont-elles été distribuées ?
  }

  /**
   * Valide la quête selon les règles définies
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];
    
    // Vérifier les champs obligatoires
    for (const field of QUEST_VALIDATION_RULES.required) {
      if (!this[field]) {
        errors.push(`Le champ ${field} est obligatoire`);
      }
    }
    
    // Vérifier les longueurs
    if (this.title.length > QUEST_VALIDATION_RULES.titleMaxLength) {
      errors.push(`Le titre ne peut pas dépasser ${QUEST_VALIDATION_RULES.titleMaxLength} caractères`);
    }
    
    if (this.description.length > QUEST_VALIDATION_RULES.descriptionMaxLength) {
      errors.push(`La description ne peut pas dépasser ${QUEST_VALIDATION_RULES.descriptionMaxLength} caractères`);
    }
    
    // Vérifier le statut
    if (!QUEST_VALIDATION_RULES.allowedStatuses.includes(this.status)) {
      errors.push(`Statut invalide: ${this.status}`);
    }
    
    // Vérifier le nombre de relations
    const totalRelations = this.childrenIds.length + this.blockedByIds.length + 
                          this.blocksIds.length + this.relatedIds.length;
    if (totalRelations > QUEST_VALIDATION_RULES.maxRelations) {
      errors.push(`Trop de relations (max ${QUEST_VALIDATION_RULES.maxRelations})`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Met à jour le timestamp de modification
   */
  touch() {
    this.updatedAt = new Date().toISOString();
    this.updatedBy = game.user.id;
  }

  /**
   * Ajoute un item de récompense
   * @param {Object} itemData - {itemId, itemUuid, itemName, quantity, itemImg}
   */
  addRewardItem(itemData) {
    this.rewardItems.push({
      itemId: itemData.itemId || itemData.itemUuid,
      itemUuid: itemData.itemUuid,
      itemName: itemData.itemName || "Item inconnu",
      quantity: itemData.quantity || 1,
      itemImg: itemData.itemImg || "icons/svg/item-bag.svg"
    });
    this.touch();
  }

  /**
   * Supprime un item de récompense
   * @param {number} index - Index de l'item à supprimer
   */
  removeRewardItem(index) {
    if (index >= 0 && index < this.rewardItems.length) {
      this.rewardItems.splice(index, 1);
      this.touch();
    }
  }

  /**
   * Marque la quête comme complétée par un acteur
   * @param {string} actorId - ID de l'acteur
   */
  markCompletedBy(actorId) {
    this.completedBy = actorId;
    this.completedAt = new Date().toISOString();
    this.status = QUEST_STATUS.COMPLETED;
    this.touch();
  }

  /**
   * Distribue les récompenses à l'acteur qui a complété la quête
   * @returns {Promise<boolean>}
   */
  async distributeRewards() {
    if (!this.completedBy) {
      ui.notifications.warn("Aucun acteur n'a été assigné comme complétant cette quête");
      return { success: false, items: [] };
    }

    if (this.rewardsDistributed) {
      ui.notifications.warn("Les récompenses ont déjà été distribuées");
      return { success: false, items: [] };
    }

    const actor = game.actors.get(this.completedBy);
    if (!actor) {
      ui.notifications.error("Acteur introuvable");
      return { success: false, items: [] };
    }

    try {
      const addedItems = [];

      for (const rewardItem of this.rewardItems) {
        let item;
        if (rewardItem.itemUuid) {
          item = await fromUuid(rewardItem.itemUuid);
        } else if (rewardItem.itemId) {
          item = game.items.get(rewardItem.itemId);
        }

        if (!item) {
          console.warn(`Quest Manager | Item introuvable: ${rewardItem.itemName}`);
          continue;
        }

        const itemData = item.toObject();
        
        if (itemData.system && 'quantity' in itemData.system) {
          itemData.system.quantity = rewardItem.quantity;
        } else if (itemData.data && 'quantity' in itemData.data) {
          itemData.data.quantity = rewardItem.quantity;
        }

        const createdItems = await actor.createEmbeddedDocuments("Item", [itemData]);
        addedItems.push(...createdItems);
      }

      this.rewardsDistributed = true;
      this.touch();

      // **MODIFIÉ: Retourner les items pour la notification**
      return { success: true, items: addedItems };

    } catch (error) {
      console.error("Quest Manager | Erreur lors de la distribution des récompenses:", error);
      ui.notifications.error("Erreur lors de la distribution des récompenses");
      return { success: false, items: [] };
    }
  }

  /**
   * Convertit la quête en objet simple pour la sauvegarde
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      parentId: this.parentId,
      childrenIds: [...this.childrenIds],
      blockedByIds: [...this.blockedByIds],
      blocksIds: [...this.blocksIds],
      relatedIds: [...this.relatedIds],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      notes: this.notes,
      rewards: this.rewards,
      location: this.location,
      npcs: [...this.npcs],
      sortOrder: this.sortOrder,
      // **NOUVEAU**
      rewardItems: this.rewardItems.map(item => ({...item})),
      completedBy: this.completedBy,
      completedAt: this.completedAt,
      rewardsDistributed: this.rewardsDistributed
    };
  }

  /**
   * Crée une instance Quest depuis des données JSON
   * @param {Object} data
   * @returns {Quest}
   */
  static fromJSON(data) {
    return new Quest(data);
  }
}