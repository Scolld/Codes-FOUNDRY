import { Quest } from './quest.js';

/**
 * Version du schéma de données (pour migrations futures)
 */
export const SCHEMA_VERSION = 1;

/**
 * Classe gérant l'arbre complet des quêtes
 */
export class QuestTree {
  constructor(data = {}) {
    this.schemaVersion = data.schemaVersion || SCHEMA_VERSION;
    
    // Map de toutes les quêtes indexées par ID
    this.quests = new Map();
    if (data.quests) {
      for (const [id, questData] of Object.entries(data.quests)) {
        this.quests.set(id, Quest.fromJSON(questData));
      }
    }
    
    // IDs des quêtes racines
    this.rootQuestIds = data.rootQuestIds || [];
    
    // Métadonnées
    this.metadata = {
      lastModified: data.metadata?.lastModified || new Date().toISOString(),
      questCount: data.metadata?.questCount || 0,
      version: data.metadata?.version || "0.1.0"
    };
  }

  /**
   * Ajoute une quête à l'arbre
   * @param {Quest} quest
   */
  addQuest(quest) {
    this.quests.set(quest.id, quest);
    
    // Si pas de parent, c'est une racine
    if (!quest.parentId && !this.rootQuestIds.includes(quest.id)) {
      this.rootQuestIds.push(quest.id);
    }
    
    this.updateMetadata();
  }

  /**
   * Récupère une quête par son ID
   * @param {string} id
   * @returns {Quest|null}
   */
  getQuest(id) {
    return this.quests.get(id) || null;
  }

  /**
   * Supprime une quête et met à jour les relations
   * @param {string} id
   */
  deleteQuest(id) {
    const quest = this.getQuest(id);
    if (!quest) return;
    
    // Retirer de la liste des racines si nécessaire
    this.rootQuestIds = this.rootQuestIds.filter(rootId => rootId !== id);
    
    // Supprimer les références dans les autres quêtes
    for (const [, otherQuest] of this.quests) {
      otherQuest.childrenIds = otherQuest.childrenIds.filter(childId => childId !== id);
      otherQuest.blockedByIds = otherQuest.blockedByIds.filter(blockId => blockId !== id);
      otherQuest.blocksIds = otherQuest.blocksIds.filter(blockId => blockId !== id);
      otherQuest.relatedIds = otherQuest.relatedIds.filter(relId => relId !== id);
    }
    
    // Supprimer la quête
    this.quests.delete(id);
    
    this.updateMetadata();
  }

  /**
   * Récupère toutes les quêtes racines
   * @returns {Quest[]}
   */
  getRootQuests() {
    return this.rootQuestIds
      .map(id => this.getQuest(id))
      .filter(q => q !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Récupère les enfants d'une quête
   * @param {string} parentId
   * @returns {Quest[]}
   */
  getChildren(parentId) {
    const parent = this.getQuest(parentId);
    if (!parent) return [];
    
    return parent.childrenIds
      .map(id => this.getQuest(id))
      .filter(q => q !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Vérifie si une dépendance circulaire serait créée
   * @param {string} questId
   * @param {string} potentialParentId
   * @returns {boolean}
   */
  wouldCreateCircularDependency(questId, potentialParentId) {
    if (questId === potentialParentId) return true;
    
    let currentId = potentialParentId;
    const visited = new Set();
    
    while (currentId) {
      if (visited.has(currentId)) return true; // Déjà un cycle
      if (currentId === questId) return true;  // Créerait un cycle
      
      visited.add(currentId);
      const current = this.getQuest(currentId);
      currentId = current?.parentId;
    }
    
    return false;
  }

  /**
   * Met à jour les métadonnées
   */
  updateMetadata() {
    this.metadata.lastModified = new Date().toISOString();
    this.metadata.questCount = this.quests.size;
  }

  /**
   * Convertit l'arbre en objet simple pour la sauvegarde
   * @returns {Object}
   */
  toJSON() {
    const questsObject = {};
    for (const [id, quest] of this.quests) {
      questsObject[id] = quest.toJSON();
    }
    
    return {
      schemaVersion: this.schemaVersion,
      quests: questsObject,
      rootQuestIds: [...this.rootQuestIds],
      metadata: { ...this.metadata }
    };
  }

  /**
   * Crée une instance QuestTree depuis des données JSON
   * @param {Object} data
   * @returns {QuestTree}
   */
  static fromJSON(data) {
    return new QuestTree(data);
  }
}