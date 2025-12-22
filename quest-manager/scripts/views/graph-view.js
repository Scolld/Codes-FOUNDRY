/**
 * Gestionnaire de la vue graphe avec vis.js
 */

import { QuestCRUD } from '../utils/crud.js';
import { QUEST_STATUS } from '../models/quest.js';

export class GraphView {
  constructor(app) {
    this.app = app; // Référence à QuestManagerApp
    this.network = null;
    this.container = null;
    this.selectedNode = null;
    this.isDragging = false;
  }

  /**
   * Initialise la vue graphe
   * @param {jQuery} html - Element HTML de l'application
   */
  initialize(html) {
    this.html = html;
    this.container = html.find('#graph-container')[0];
    
    if (!this.container) {
      console.warn("Quest Manager | Container du graphe introuvable");
      return;
    }
    
    // Vérifier que vis.js est chargé
    if (typeof vis === 'undefined') {
      console.error("Quest Manager | vis.js n'est pas chargé");
      this.showLibraryError();
      return;
    }
    
    this.render();
    this.setupControls();
    this.setupEvents();
  }

  /**
   * Affiche un message d'erreur si vis.js n'est pas chargé
   */
  showLibraryError() {
    $(this.container).html(`
      <div class="graph-error">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Bibliothèque vis.js non chargée</h3>
        <p>La vue graphe nécessite la bibliothèque vis-network.</p>
        <p>Veuillez l'ajouter au module ou contacter l'administrateur.</p>
      </div>
    `);
  }

  /**
   * Prépare les données pour le graphe
   */
  prepareData() {
    const allQuests = Array.from(window.questManager.questTree.quests.values());
    
    // Filtrer par recherche
    let filteredQuests = allQuests;
    if (this.app.searchQuery) {
      const query = this.app.searchQuery.toLowerCase();
      filteredQuests = allQuests.filter(q => 
        q.title.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query)
      );
    }
    
    // Filtrer par visibilité des quêtes terminées
    if (!this.app.showCompleted) {
      filteredQuests = filteredQuests.filter(q => q.status !== QUEST_STATUS.COMPLETED);
    }
    
    // Créer les nœuds
    const nodes = filteredQuests.map(quest => ({
      id: quest.id,
      label: this.truncateLabel(quest.title, 25),
      title: this.createTooltip(quest), // Tooltip HTML
      color: this.getNodeColor(quest),
      shape: 'box',
      font: {
        color: quest.status === QUEST_STATUS.COMPLETED ? '#999' : '#000',
        size: 14,
        face: 'Arial'
      },
      borderWidth: 2,
      borderWidthSelected: 4,
      margin: 10,
      level: this.getNodeLevel(quest),
      // Données custom pour les events
      questData: {
        id: quest.id,
        title: quest.title,
        status: quest.status,
        hasChildren: quest.childrenIds.length > 0
      }
    }));
    
    // Créer les arêtes
    const edges = [];
    
    filteredQuests.forEach(quest => {
      // Relations parent-enfant (hiérarchie)
      quest.childrenIds.forEach(childId => {
        if (filteredQuests.find(q => q.id === childId)) {
          edges.push({
            from: quest.id,
            to: childId,
            arrows: 'to',
            color: { color: '#333333', highlight: '#000000' },
            width: 2,
            smooth: { type: 'cubicBezier', roundness: 0.5 },
            label: 'contient',
            font: { size: 10, color: '#666', strokeWidth: 0 },
            relationType: 'parent-child'
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
            color: { color: '#e74c3c', highlight: '#c0392b' },
            width: 2,
            dashes: [5, 5],
            smooth: { type: 'curvedCW', roundness: 0.2 },
            label: 'bloque',
            font: { size: 10, color: '#e74c3c', strokeWidth: 0 },
            relationType: 'blocks'
          });
        }
      });
      
      // Relations liées (éviter les doublons)
      quest.relatedIds.forEach(relatedId => {
        if (filteredQuests.find(q => q.id === relatedId) && quest.id < relatedId) {
          edges.push({
            from: quest.id,
            to: relatedId,
            arrows: 'to;from',
            color: { color: '#95a5a6', highlight: '#7f8c8d' },
            width: 1,
            dashes: [2, 4],
            smooth: { type: 'curvedCW', roundness: 0.1 },
            label: 'lié',
            font: { size: 10, color: '#95a5a6', strokeWidth: 0 },
            relationType: 'related'
          });
        }
      });
    });
    
    return { nodes, edges };
  }

  /**
   * Tronque un label long
   */
  truncateLabel(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Crée le tooltip HTML pour un nœud
   */
  createTooltip(quest) {
    const statusLabels = {
      'connue': 'Connue',
      'en_cours': 'En cours',
      'terminee': 'Terminée'
    };
    
    let tooltip = `<div class="graph-tooltip">
      <strong>${quest.title}</strong><br>
      <span class="status-${quest.status}">📍 ${statusLabels[quest.status]}</span><br>
    `;
    
    if (quest.childrenIds.length > 0) {
      tooltip += `<br>👥 ${quest.childrenIds.length} sous-quête(s)`;
    }
    
    if (quest.blockedByIds.length > 0) {
      tooltip += `<br>🔒 Bloquée par ${quest.blockedByIds.length} quête(s)`;
    }
    
    if (quest.blocksIds.length > 0) {
      tooltip += `<br>🚫 Bloque ${quest.blocksIds.length} quête(s)`;
    }
    
    if (quest.relatedIds.length > 0) {
      tooltip += `<br>🔗 Liée à ${quest.relatedIds.length} quête(s)`;
    }
    
    tooltip += `</div>`;
    
    return tooltip;
  }

  /**
   * Obtient la couleur d'un nœud selon son statut
   */
  getNodeColor(quest) {
    const colors = {
      'connue': {
        background: '#4a90e2',
        border: '#3a7bc8',
        highlight: {
          background: '#5aa0f2',
          border: '#2a6bb8'
        }
      },
      'en_cours': {
        background: '#f5a623',
        border: '#e69500',
        highlight: {
          background: '#ffb733',
          border: '#d68500'
        }
      },
      'terminee': {
        background: '#7ed321',
        border: '#6ab821',
        highlight: {
          background: '#8ee331',
          border: '#5aa811'
        }
      }
    };
    
    return colors[quest.status] || colors['connue'];
  }

  /**
   * Obtient le niveau hiérarchique d'une quête (pour le layout)
   */
  getNodeLevel(quest) {
    let level = 0;
    let currentId = quest.parentId;
    
    while (currentId) {
      level++;
      const parent = window.questManager.questTree.getQuest(currentId);
      currentId = parent?.parentId;
      
      // Protection contre les boucles infinies
      if (level > 20) break;
    }
    
    return level;
  }

  /**
   * Rend le graphe avec vis.js
   */
  render() {
    // Préparer les données
    const { nodes, edges } = this.prepareData();
    
    // Créer les DataSets vis.js
    const nodesDataSet = new vis.DataSet(nodes);
    const edgesDataSet = new vis.DataSet(edges);
    
    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet
    };
    
    // Options du graphe
    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD', // Up-Down (Top to Bottom)
          sortMethod: 'directed',
          levelSeparation: 150,
          nodeSpacing: 200,
          treeSpacing: 250,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true
        }
      },
      physics: {
        enabled: true,
        hierarchicalRepulsion: {
          centralGravity: 0.0,
          springLength: 150,
          springConstant: 0.01,
          nodeDistance: 200,
          damping: 0.09
        },
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 50
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 300,
        navigationButtons: true,
        keyboard: {
          enabled: true,
          bindToWindow: false
        }
      },
      manipulation: {
        enabled: false
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'cubicBezier',
          roundness: 0.5
        }
      },
      nodes: {
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.2)',
          size: 10,
          x: 2,
          y: 2
        }
      }
    };
    
    // Détruire l'ancien réseau s'il existe
    if (this.network) {
      this.network.destroy();
    }
    
    // Créer le nouveau réseau
    try {
      this.network = new vis.Network(this.container, data, options);
      
      // Message de stabilisation
      this.showStabilizationProgress();
      
      console.log("Quest Manager | Graphe rendu avec succès");
    } catch (error) {
      console.error("Quest Manager | Erreur lors du rendu du graphe:", error);
      this.showLibraryError();
    }
  }

  /**
   * Affiche la progression de la stabilisation
   */
  showStabilizationProgress() {
    const progressDiv = $(`
      <div class="graph-stabilization">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Calcul du layout... <span class="progress">0%</span></span>
      </div>
    `);
    
    $(this.container).append(progressDiv);
    
    this.network.on('stabilizationProgress', (params) => {
      const progress = Math.round((params.iterations / params.total) * 100);
      progressDiv.find('.progress').text(`${progress}%`);
    });
    
    this.network.once('stabilizationIterationsDone', () => {
      progressDiv.fadeOut(300, () => progressDiv.remove());
      this.network.setOptions({ physics: { enabled: false } });
      console.log("Quest Manager | Stabilisation terminée");
    });
  }

  /**
   * Configure les contrôles de la vue graphe
   */
  setupControls() {
    const controlsHtml = `
      <div class="graph-controls">
        <div class="control-group">
          <button id="graph-fit" class="graph-btn" title="Ajuster la vue">
            <i class="fas fa-compress-arrows-alt"></i>
          </button>
          <button id="graph-zoom-in" class="graph-btn" title="Zoom +">
            <i class="fas fa-search-plus"></i>
          </button>
          <button id="graph-zoom-out" class="graph-btn" title="Zoom -">
            <i class="fas fa-search-minus"></i>
          </button>
        </div>
        
        <div class="control-group">
          <button id="graph-layout-toggle" class="graph-btn" title="Changer le layout">
            <i class="fas fa-sitemap"></i>
          </button>
          <button id="graph-physics-toggle" class="graph-btn" title="Activer/Désactiver la physique">
            <i class="fas fa-atom"></i>
          </button>
        </div>
        
        <div class="control-group">
          <button id="graph-export" class="graph-btn" title="Exporter en image">
            <i class="fas fa-camera"></i>
          </button>
          <button id="graph-refresh" class="graph-btn" title="Rafraîchir">
            <i class="fas fa-sync"></i>
          </button>
        </div>
      </div>
    `;
    
    $(this.container).before(controlsHtml);
    
    // Events des contrôles
    this.html.find('#graph-fit').click(() => this.fitView());
    this.html.find('#graph-zoom-in').click(() => this.zoomIn());
    this.html.find('#graph-zoom-out').click(() => this.zoomOut());
    this.html.find('#graph-layout-toggle').click(() => this.toggleLayout());
    this.html.find('#graph-physics-toggle').click(() => this.togglePhysics());
    this.html.find('#graph-export').click(() => this.exportAsImage());
    this.html.find('#graph-refresh').click(() => this.render());
  }

  /**
   * Configure les événements du graphe
   */
  setupEvents() {
    if (!this.network) return;
    
    // Click sur un nœud
    this.network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const questId = params.nodes[0];
        this.onNodeClick(questId);
      } else {
        this.deselectNode();
      }
    });
    
    // Double-click sur un nœud
    this.network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const questId = params.nodes[0];
        this.onNodeDoubleClick(questId);
      }
    });
    
    // Clic droit sur un nœud
    this.network.on('oncontext', (params) => {
      params.event.preventDefault();
      
      const nodeId = this.network.getNodeAt(params.pointer.DOM);
      if (nodeId) {
        this.onNodeRightClick(nodeId, params.event);
      }
    });
    
    // Hover sur un nœud
    this.network.on('hoverNode', (params) => {
      this.onNodeHover(params.node);
    });
    
    // Sortie du hover
    this.network.on('blurNode', (params) => {
      this.onNodeBlur(params.node);
    });
    
    // Drag d'un nœud
    this.network.on('dragStart', (params) => {
      if (params.nodes.length > 0) {
        this.isDragging = true;
      }
    });
    
    this.network.on('dragEnd', (params) => {
      this.isDragging = false;
    });
  }

  /**
   * Handler: Click sur un nœud
   */
  onNodeClick(questId) {
    this.selectedNode = questId;
    
    // Highlight le nœud et ses connexions
    this.highlightConnections(questId);
    
    // Afficher le panneau d'info
    this.showNodeInfo(questId);
  }

  /**
   * Handler: Double-click sur un nœud
   */
  async onNodeDoubleClick(questId) {
    const quest = QuestCRUD.getQuest(questId);
    if (!quest) return;
    
    // Ouvrir le formulaire d'édition
    const { QuestFormApp } = await import('../apps/quest-form.js');
    new QuestFormApp({
      mode: 'edit',
      quest: quest,
      parentApp: this.app
    }).render(true);
  }

  /**
   * Handler: Clic droit sur un nœud
   */
  onNodeRightClick(questId, event) {
    const quest = QuestCRUD.getQuest(questId);
    if (!quest) return;
    
    // Créer un menu contextuel custom
    this.showContextMenu(quest, event);
  }

  /**
   * Handler: Hover sur un nœud
   */
  onNodeHover(nodeId) {
    // Changer le curseur
    $(this.container).css('cursor', 'pointer');
    
    // Optionnel: highlight léger
    this.network.selectNodes([nodeId], false);
  }

  /**
   * Handler: Sortie du hover
   */
  onNodeBlur(nodeId) {
    $(this.container).css('cursor', 'default');
  }

  /**
   * Highlight les connexions d'un nœud
   */
  highlightConnections(questId) {
    const connectedNodes = this.network.getConnectedNodes(questId);
    const connectedEdges = this.network.getConnectedEdges(questId);
    
    // Opacifier tous les nœuds/arêtes sauf les connectés
    const allNodes = this.network.body.data.nodes.getIds();
    const allEdges = this.network.body.data.edges.getIds();
    
    allNodes.forEach(nodeId => {
      if (nodeId !== questId && !connectedNodes.includes(nodeId)) {
        this.network.body.data.nodes.update({
          id: nodeId,
          opacity: 0.2
        });
      }
    });
    
    allEdges.forEach(edgeId => {
      if (!connectedEdges.includes(edgeId)) {
        this.network.body.data.edges.update({
          id: edgeId,
          opacity: 0.1
        });
      }
    });
  }

  /**
   * Désélectionne le nœud actuel
   */
  deselectNode() {
    this.selectedNode = null;
    
    // Réinitialiser l'opacité
    const allNodes = this.network.body.data.nodes.getIds();
    const allEdges = this.network.body.data.edges.getIds();
    
    allNodes.forEach(nodeId => {
      this.network.body.data.nodes.update({
        id: nodeId,
        opacity: 1
      });
    });
    
    allEdges.forEach(edgeId => {
      this.network.body.data.edges.update({
        id: edgeId,
        opacity: 1
      });
    });
    
    // Cacher le panneau d'info
    this.hideNodeInfo();
  }

  /**
   * Affiche les informations d'un nœud
   */
  showNodeInfo(questId) {
    const quest = QuestCRUD.getQuest(questId);
    if (!quest) return;
    
    const statusLabels = {
      'connue': 'Connue',
      'en_cours': 'En cours',
      'terminee': 'Terminée'
    };
    
    const infoHtml = `
      <div class="graph-node-info">
        <div class="info-header">
          <h4>${quest.title}</h4>
          <button class="close-info"><i class="fas fa-times"></i></button>
        </div>
        <div class="info-body">
          <div class="info-status">
            <span class="status-badge" style="background-color: ${this.getNodeColor(quest).background}">
              ${statusLabels[quest.status]}
            </span>
          </div>
          
          ${quest.description ? `
            <div class="info-section">
              <strong>Description:</strong>
              <p>${quest.description.substring(0, 150)}${quest.description.length > 150 ? '...' : ''}</p>
            </div>
          ` : ''}
          
          <div class="info-relations">
            ${quest.childrenIds.length > 0 ? `
              <div>👥 ${quest.childrenIds.length} sous-quête(s)</div>
            ` : ''}
            ${quest.blockedByIds.length > 0 ? `
              <div>🔒 Bloquée par ${quest.blockedByIds.length} quête(s)</div>
            ` : ''}
            ${quest.blocksIds.length > 0 ? `
              <div>🚫 Bloque ${quest.blocksIds.length} quête(s)</div>
            ` : ''}
            ${quest.relatedIds.length > 0 ? `
              <div>🔗 Liée à ${quest.relatedIds.length} quête(s)</div>
            ` : ''}
          </div>
          
          <div class="info-actions">
            <button class="info-btn" data-action="view">
              <i class="fas fa-eye"></i> Détails
            </button>
            <button class="info-btn" data-action="edit">
              <i class="fas fa-edit"></i> Éditer
            </button>
            <button class="info-btn" data-action="tree">
              <i class="fas fa-sitemap"></i> Voir dans l'arbre
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Supprimer l'ancien panneau s'il existe
    this.html.find('.graph-node-info').remove();
    
    // Ajouter le nouveau panneau
    $(this.container).after(infoHtml);
    
    // Events du panneau
    this.html.find('.graph-node-info .close-info').click(() => {
      this.deselectNode();
    });
    
    this.html.find('.graph-node-info [data-action="view"]').click(() => {
      this.html.find(`.quest-item[data-quest-id="${questId}"] .quest-title`).click();
    });
    
    this.html.find('.graph-node-info [data-action="edit"]').click(async () => {
      const { QuestFormApp } = await import('../apps/quest-form.js');
      new QuestFormApp({
        mode: 'edit',
        quest: quest,
        parentApp: this.app
      }).render(true);
    });
    
    this.html.find('.graph-node-info [data-action="tree"]').click(() => {
      // Basculer vers la vue arbre et highlight la quête
      this.app.currentView = 'tree';
      this.app.render(false);
      
      setTimeout(() => {
        if (this.app.treeView) {
          this.app.treeView.highlightQuest(questId);
        }
      }, 300);
    });
  }

  /**
   * Cache le panneau d'info
   */
  hideNodeInfo() {
    this.html.find('.graph-node-info').fadeOut(200, function() {
      $(this).remove();
    });
  }

  /**
   * Affiche un menu contextuel custom
   */
  showContextMenu(quest, event) {
    const menuHtml = `
      <div class="graph-context-menu" style="left: ${event.pageX}px; top: ${event.pageY}px;">
        <div class="context-menu-item" data-action="view">
          <i class="fas fa-eye"></i> Voir les détails
        </div>
        <div class="context-menu-item" data-action="edit">
          <i class="fas fa-edit"></i> Éditer
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="focus">
          <i class="fas fa-crosshairs"></i> Centrer sur ce nœud
        </div>
        <div class="context-menu-item" data-action="expand">
          <i class="fas fa-expand-arrows-alt"></i> Montrer les connexions
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="tree">
          <i class="fas fa-sitemap"></i> Voir dans l'arbre
        </div>
      </div>
    `;
    
    // Supprimer l'ancien menu
    this.html.find('.graph-context-menu').remove();
    
    // Ajouter le nouveau menu
    $('body').append(menuHtml);
    
    const menu = $('.graph-context-menu');
    
    // Events du menu
    menu.find('[data-action="view"]').click(() => {
      this.onNodeDoubleClick(quest.id);
      menu.remove();
    });
    
    menu.find('[data-action="edit"]').click(async () => {
      const { QuestFormApp } = await import('../apps/quest-form.js');
      new QuestFormApp({
        mode: 'edit',
        quest: quest,
        parentApp: this.app
      }).render(true);
      menu.remove();
    });
    
    menu.find('[data-action="focus"]').click(() => {
      this.focusNode(quest.id);
      menu.remove();
    });
    
    menu.find('[data-action="expand"]').click(() => {
      this.highlightConnections(quest.id);
      menu.remove();
    });
    
    menu.find('[data-action="tree"]').click(() => {
      this.app.currentView = 'tree';
      this.app.render(false);
      
      setTimeout(() => {
        if (this.app.treeView) {
          this.app.treeView.highlightQuest(quest.id);
        }
      }, 300);
      
      menu.remove();
    });
    
    // Fermer au clic ailleurs
    $(document).one('click', () => menu.remove());
  }

  // ========================================================================
  // CONTRÔLES
  // ========================================================================

  /**
   * Ajuste la vue pour voir tous les nœuds
   */
  fitView() {
    if (!this.network) return;
    this.network.fit({
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad'
      }
    });
  }

  /**
   * Zoom avant
   */
  zoomIn() {
    if (!this.network) return;
    const scale = this.network.getScale() * 1.2;
    this.network.moveTo({ scale });
  }

  /**
   * Zoom arrière
   */
  zoomOut() {
    if (!this.network) return;
    const scale = this.network.getScale() * 0.8;
    this.network.moveTo({ scale });
  }

  /**
   * Change le layout (hiérarchique <-> force)
   */
  toggleLayout() {
    if (!this.network) return;
    
    const currentLayout = this.network.body.options.layout.hierarchical.enabled;
    
    if (currentLayout) {
      // Passer en mode force
      this.network.setOptions({
        layout: {
          hierarchical: {
            enabled: false
          }
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 200,
            springConstant: 0.08,
            damping: 0.4,
            avoidOverlap: 1
          },
          stabilization: {
            enabled: true,
            iterations: 1000
          }
        }
      });
      
      ui.notifications.info("Layout: Force dirigée");
    } else {
      // Passer en mode hiérarchique
      this.network.setOptions({
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'UD',
            sortMethod: 'directed'
          }
        },
        physics: {
          enabled: true,
          hierarchicalRepulsion: {
            centralGravity: 0.0,
            springLength: 150,
            springConstant: 0.01,
            nodeDistance: 200,
            damping: 0.09
          }
        }
      });
      
      ui.notifications.info("Layout: Hiérarchique");
    }
    
    this.showStabilizationProgress();
  }

  /**
   * Active/Désactive la physique
   */
  togglePhysics() {
    if (!this.network) return;
    
    const currentPhysics = this.network.body.options.physics.enabled;
    this.network.setOptions({
      physics: {
        enabled: !currentPhysics
      }
    });
    
    ui.notifications.info(currentPhysics ? "Physique désactivée" : "Physique activée");
  }

  /**
   * Centre la vue sur un nœud spécifique
   */
  focusNode(nodeId) {
    if (!this.network) return;
    
    this.network.focus(nodeId, {
      scale: 1.5,
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad'
      }
    });
  }

  /**
   * Exporte le graphe en image
   */
  async exportAsImage() {
    if (!this.network) return;
    
    try {
      // Obtenir le canvas du réseau
      const canvas = this.container.getElementsByTagName('canvas')[0];
      
      if (!canvas) {
        ui.notifications.error("Impossible d'exporter: canvas introuvable");
        return;
      }
      
      // Convertir en blob
      canvas.toBlob((blob) => {
        // Créer un lien de téléchargement
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quest-graph-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        
        URL.revokeObjectURL(url);
        ui.notifications.info("Graphe exporté en image");
      });
      
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      ui.notifications.error("Erreur lors de l'export du graphe");
    }
  }

  /**
   * Détruit le réseau
   */
  destroy() {
    if (this.network) {
      this.network.destroy();
      this.network = null;
    }
  }
}