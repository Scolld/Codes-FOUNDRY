// ====================================================================
// GÉNÉRATEUR DE PNJ DIVERSIFIÉ – VERSION REFACTORISÉE
// SYSTÈME CIBLE : Starfinder RPG (SFRpg)
// ====================================================================

// ====================================================================
// I. CONFIGURATION (MODIFIÉ)
// ====================================================================

const CONFIG_NPC = {
    ACTOR_FOLDER_NAME: "NPC random",
    IMAGE_DIRECTORY: "assets/NPC",
    NPC_ACTOR_TYPE: "character",
    RACE_ITEM_TYPE: "race",
    CLASS_ITEM_TYPE: "class",
    DEFAULT_IMAGE: "icons/svg/mystery-man.svg",
    LEVEL_MIN: 1,
    LEVEL_MAX: 20,
    RECALC_DELAY_MS: 50,
    COUNT_MIN: 1,
    COUNT_MAX: 20,
    RANDOM_LEVEL_VALUE: 0,
    
    // Mapping des noms de races vers les dossiers d'images
    RACE_IMAGE_FOLDERS: {
        "Elfe": "Elf",
        "Ezi": "Ezi",
        "Fova": "Fova",
        "Humain": "Human",
        "Nain": "Dwarf",
        "Tan": "Tan"
    }
};

// ====================================================================
// II. DONNÉES NARRATIVES
// ====================================================================

const NARRATIVE_DATA = {
    names: [
        "Alistair","Elara","Bartholomé","Seraphine","Corbin","Lyra","Torvin",
        "Gretchen","Finnian","Maeve","Silas","Vivienne","Roric","Isolde","Joric",
        "Briar","Kaelen","Petra","Zenon","Myra","Caspian","Thora","Bran",
        "Lysandra","Aldric","Zylos","Kaelara","Jax","Ria Solari","Thane",
        "Xylia N'Doro","Aramis","Sydonia","Kryll","Varis Keth","Lyra-7","Vortan", 
        "Eris Valen","Corvus","Zephyrine","Talos Rin","Mirai","Faelan", 
        "Shira Zek","Orion-9","T'Vok","Liraël","Grakk",
        "Silvana Rex","Kez","Phaedra","Dred Rix", "Solan", "Jynx", "Vexia", 
        "Torak Morth", "Nyss", "Calypso", "Rokan", "Sybil Vox", "Zedd", 
        "Aethia", "Krellin", "Nara Sun", "Fenris", "Lykaon", "Jaxxus", 
        "Myrin", "Valcor", "Kethra", "Ryden Zero", "Caelan", "Dracius", 
        "Lexi Tars", "Yorik"
    ],
    
    ageCategories: [
        "Jeune adulte",
        "D'âge moyen",
        "Vieux/Vénérable",
        "Adolescent/Tôt dans la vingtaine",
        "Fin de la trentaine"
    ],
    
    motivations: [
        "Retrouver un héritage familial perdu.",
        "Rembourser une dette envers un seigneur local.",
        "Protéger sa famille des bandits ou créatures.",
        "Économiser pour acheter une ferme ou un commerce.",
        "Obtenir la reconnaissance d'un ordre ou d'une guilde.",
        "Venger un ami ou un parent assassiné.",
        "Échapper à une prophétie ou une sombre prédiction.",
        "Accumuler suffisamment de richesses pour prendre sa retraite.",
        "Étudier un phénomène magique ou naturel rare.",
        "Découvrir l'emplacement d'une ancienne cité extraterrestre.",
        "Sauver une colonie spatiale menacée par une maladie.",
        "Prouver l'innocence d'un(e) ami(e) accusé(e) à tort.",
        "Assembler un artefact technologique légendaire.",
        "Établir une nouvelle route commerciale sûre.",
        "Financer la construction d'un robot compagnon.",
        "Comprendre une anomalie du flux hyper-spatial.",
        "Collecter des échantillons de faune dangereuse pour la recherche.",
        "Se cacher d'un syndicat du crime galactique.",
        "Racheter une erreur passée ayant coûté des vies.",
        "Maîtriser une technique de combat oubliée.",
        "Transporter une cargaison sensible vers une zone de guerre.",
        "Retrouver un droïde d'information volé.",
        "Éliminer une menace biologique mutante.",
        "S'intégrer dans une société ultra-conservatrice.",
        "Déchiffrer le langage d'une espèce inconnue.",
        "Servir les intérêts d'une corporation secrète.",
        "Améliorer radicalement des implants cybernétiques.",
        "Mettre au jour une conspiration politique.",
        "Obtenir un visa de citoyenneté sur une planète riche.",
        "Tester les limites de ses pouvoirs psychiques.",
        "Protèger un jeune orphelin aux capacités uniques.",
        "Gagner le prochain grand tournoi de combat intergalactique.",
        "Faire face à une phobie ou une peur paralysante.",
        "Explorer la ceinture d'astéroïdes interdite."
    ],
    
    traits: [
        "Parle beaucoup trop vite.",
        "Excessivement superstitieux.",
        "Évite le regard.",
        "Cicatrice voyante.",
        "Obsédé par l'ordre.",
        "Tic nerveux.",
        "Menteur compulsif.",
        "Se méfie de la magie.",
        "Très généreux."
    ]
};

// ====================================================================
// III. UTILITAIRES GÉNÉRIQUES (MODIFIÉ)
// ====================================================================

const Utils = {
    /**
     * Sélectionne un élément aléatoire dans un tableau
     */
    randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    
    /**
     * Génère un entier aléatoire entre min et max (inclus)
     */
    randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Attend un délai en millisecondes
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Résout le niveau (aléatoire ou fixe)
     */
    resolveLevel(level) {
        if (level === CONFIG_NPC.RANDOM_LEVEL_VALUE) {
            return this.randomInteger(CONFIG_NPC.LEVEL_MIN, CONFIG_NPC.LEVEL_MAX);
        }
        return level;
    }
};

// ====================================================================
// IV. GESTION DES ATTRIBUTS
// ====================================================================

const AttributeManager = {
    /**
     * Génère les 6 attributs avec 3d6
     */
    async rollAttributes() {
        const keys = ["str","dex","con","int","wis","cha"];
        const abilities = {};

        for (const k of keys) {
            const roll = await (new Roll("3d6")).evaluate({ async: true });
            abilities[k] = {
                value: roll.total,
                mod: Math.floor((roll.total - 10) / 2)
            };
        }
        return { abilities };
    }
};

// ====================================================================
// V. GESTION DES IMAGES (MODIFIÉ)
// ====================================================================

const ImageManager = {
    /**
     * Récupère le dossier d'images pour une race donnée
     */
    getRaceFolderPath(raceName) {
        if (!raceName) return CONFIG_NPC.IMAGE_DIRECTORY;
        
        const folderName = CONFIG_NPC.RACE_IMAGE_FOLDERS[raceName];
        return folderName 
            ? `${CONFIG_NPC.IMAGE_DIRECTORY}/${folderName}`
            : CONFIG_NPC.IMAGE_DIRECTORY;
    },
    
    /**
     * Récupère les options d'images pour le sélecteur (pour une race spécifique)
     */
    async getImageOptions(directory) {
        const options = [
            { value: "random", label: "(Aléatoire)" },
            { value: CONFIG_NPC.DEFAULT_IMAGE, label: "(Icône Foundry)" }
        ];
        
        try {
            const browse = await FilePicker.browse("data", directory);
            browse.files
                .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
                .forEach(f => options.push({ 
                    value: f, 
                    label: f.split("/").pop() 
                }));
        } catch (e) {
            // Silencieux si le répertoire n'existe pas
            console.warn(`Dossier d'images introuvable: ${directory}`);
        }

        return options;
    },
    
    /**
     * Sélectionne une image aléatoire
     */
    async getRandomImage(directory) {
        try {
            const browse = await FilePicker.browse("data", directory);
            const images = browse.files.filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
            return images.length ? Utils.randomFrom(images) : CONFIG_NPC.DEFAULT_IMAGE;
        } catch (e) {
            console.warn(`Impossible de charger une image de: ${directory}`);
            return CONFIG_NPC.DEFAULT_IMAGE;
        }
    },
    
    /**
     * Résout le choix d'image (random ou spécifique) pour une race donnée
     */
    async resolveImage(selection, raceItem) {
        // Si la race est "random" ou "none", utiliser le dossier par défaut
        if (!raceItem) {
            return selection === "random" 
                ? await this.getRandomImage(CONFIG_NPC.IMAGE_DIRECTORY)
                : selection;
        }
        
        // Récupérer le dossier spécifique à la race
        const raceFolder = this.getRaceFolderPath(raceItem.name);
        
        return selection === "random" 
            ? await this.getRandomImage(raceFolder)
            : selection;
    }
};

// ====================================================================
// VI. GESTION DES ITEMS (MODIFIÉ)
// ====================================================================

const ItemManager = {
    /**
     * Récupère les options d'items pour le sélecteur
     */
    getItemOptions(type) {
        const items = game.items.filter(i => i.type === type);
        return [
            { id: "random", name: "(Aléatoire)" },
            { id: "none", name: "(Aucun)" },
            ...items.map(i => ({ id: i.id, name: i.name }))
        ];
    },
    
    /**
     * Résout le choix d'item (random, none, ou spécifique)
     */
    resolveItem(selection, type) {
        if (selection === "none") return null;
        
        const items = game.items.filter(i => i.type === type);
        
        if (selection === "random") {
            return items.length ? Utils.randomFrom(items) : null;
        }
        
        return game.items.get(selection);
    },
    
    /**
     * Prépare un item de classe avec le niveau
     */
    prepareClassItem(classItem, level) {
        if (!classItem) return null;
        
        const classObj = classItem.toObject();
        
        // Assigner le niveau selon la structure du système
        if (classObj.system && typeof classObj.system.levels !== 'undefined') {
            classObj.system.levels = level;
        } else if (classObj.system && typeof classObj.system.classLevel !== 'undefined') {
            classObj.system.classLevel = level;
        }
        
        return classObj;
    },
    
    /**
     * Récupère le prix d'un item
     */
    getItemPrice(item) {
        return item.system?.price || 0;
    },
    
    /**
     * Filtre les items par budget maximum
     */
    filterByBudget(items, maxBudget) {
        return items.filter(item => this.getItemPrice(item) <= maxBudget);
    },
    
    /**
     * Sélectionne le meilleur item dans le budget
     */
    selectBestInBudget(items, budget) {
        const affordable = this.filterByBudget(items, budget);
        if (affordable.length === 0) return null;
        
        // Trie par prix décroissant et prend un des 3 meilleurs
        affordable.sort((a, b) => this.getItemPrice(b) - this.getItemPrice(a));
        const topChoices = affordable.slice(0, Math.min(3, affordable.length));
        
        return Utils.randomFrom(topChoices);
    },
    
    /**
     * Génère l'équipement avec budget
     */
    generateGearWithBudget(level) {
        const totalBudget = 4000 * level;
        let remainingBudget = totalBudget;
        const gear = [];
        const itemsToEquip = []; // Items qui doivent être équipés
        
        const allItems = game.items.contents;
        
        console.log(`Budget total pour niveau ${level}: ${totalBudget} crédits`);
        
        // Priorité 1: ARME
        const weapons = allItems.filter(i => i.type === "weapon");
        if (weapons.length > 0) {
            const weapon = this.selectBestInBudget(weapons, remainingBudget * 0.4); // Max 40% du budget
            if (weapon) {
                const weaponObj = weapon.toObject();
                gear.push(weaponObj);
                itemsToEquip.push({ name: weapon.name, type: "weapon" });
                remainingBudget -= this.getItemPrice(weapon);
                console.log(`Arme ajoutée: ${weapon.name} (${this.getItemPrice(weapon)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        // Priorité 2: CONSOMMABLE
        const consumables = allItems.filter(i => i.type === "consumable");
        if (consumables.length > 0) {
            const consumable = this.selectBestInBudget(consumables, remainingBudget * 0.15); // Max 15% du budget restant
            if (consumable) {
                const consumableObj = consumable.toObject();
                gear.push(consumableObj);
                remainingBudget -= this.getItemPrice(consumable);
                console.log(`Consommable ajouté: ${consumable.name} (${this.getItemPrice(consumable)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        // Priorité 3: TECHNOLOGIE
        const tech = allItems.filter(i => i.type === "technological");
        if (tech.length > 0) {
            const techItem = this.selectBestInBudget(tech, remainingBudget * 0.2); // Max 20% du budget restant
            if (techItem) {
                const techObj = techItem.toObject();
                gear.push(techObj);
                remainingBudget -= this.getItemPrice(techItem);
                console.log(`Tech ajouté: ${techItem.name} (${this.getItemPrice(techItem)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        // Priorité 4: ARMURE
        const armors = allItems.filter(i => i.type === "equipment");
        if (armors.length > 0) {
            const armor = this.selectBestInBudget(armors, remainingBudget * 0.5); // Max 50% du budget restant
            if (armor) {
                const armorObj = armor.toObject();
                gear.push(armorObj);
                itemsToEquip.push({ name: armor.name, type: "equipment" });
                remainingBudget -= this.getItemPrice(armor);
                console.log(`Armure ajoutée: ${armor.name} (${this.getItemPrice(armor)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        // Priorité 5: DEUXIÈME ARME (si budget restant > 15%)
        if (weapons.length > 0 && remainingBudget > totalBudget * 0.15) {
            const weapon2 = this.selectBestInBudget(weapons, remainingBudget * 0.4);
            if (weapon2) {
                const weapon2Obj = weapon2.toObject();
                gear.push(weapon2Obj);
                remainingBudget -= this.getItemPrice(weapon2);
                console.log(`Arme secondaire ajoutée: ${weapon2.name} (${this.getItemPrice(weapon2)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        // Priorité 6: DEUXIÈME CONSOMMABLE (si budget restant > 10%)
        if (consumables.length > 0 && remainingBudget > totalBudget * 0.1) {
            const consumable2 = this.selectBestInBudget(consumables, remainingBudget * 0.3);
            if (consumable2) {
                const consumable2Obj = consumable2.toObject();
                gear.push(consumable2Obj);
                remainingBudget -= this.getItemPrice(consumable2);
                console.log(`Consommable secondaire ajouté: ${consumable2.name} (${this.getItemPrice(consumable2)} cr) - Reste: ${remainingBudget}`);
            }
        }
        
        console.log(`Équipement total: ${totalBudget - remainingBudget} cr`);
        console.log(`Crédits restants: ${remainingBudget} cr`);
        
        return { gear, remainingBudget: Math.max(0, Math.floor(remainingBudget)), itemsToEquip };
    }
};

// ====================================================================
// AJOUT : GESTION DES COMPÉTENCES
// ====================================================================

const SkillManager = {
    /**
     * Récupère le nombre de points de compétence par niveau de la classe
     */
    getSkillPointsPerLevel(classItem) {
        if (!classItem) return 0;
        
        // Dans SFRpg, c'est généralement dans system.skillRanks ou system.skillsPerLevel
        return classItem.system?.skillRanks?.value || 
               classItem.system?.skillsPerLevel || 
               4; // Valeur par défaut si non trouvée
    },
    
    /**
     * Calcule le total de points de compétence disponibles
     */
    calculateTotalSkillPoints(classItem, level) {
        const pointsPerLevel = this.getSkillPointsPerLevel(classItem);
        return pointsPerLevel * level;
    },
    
    /**
     * Récupère les compétences autorisées pour la classe
     */
    getClassSkills(actor, classItem) {
        if (!classItem) return [];
        
        const allSkills = actor.system?.skills || {};
        const classSkills = classItem.system?.csk || {}; // Class skills
        
        // Filtre les compétences qui sont des class skills
        const allowedSkillKeys = Object.keys(allSkills).filter(skillKey => {
            // Vérifie si c'est une class skill
            return classSkills[skillKey] === true || 
                   allSkills[skillKey]?.isClassSkill === true;
        });
        
        // Si aucune class skill n'est définie, on prend toutes les compétences
        return allowedSkillKeys.length > 0 
            ? allowedSkillKeys 
            : Object.keys(allSkills);
    },
    
    /**
     * Distribue aléatoirement les points de compétence
     */
    distributeSkillPoints(allowedSkills, totalPoints, maxPerSkill) {
        const distribution = {};
        
        // Initialiser toutes les compétences à 0
        allowedSkills.forEach(skill => distribution[skill] = 0);
        
        let remainingPoints = totalPoints;
        
        // Distribuer les points tant qu'il en reste
        while (remainingPoints > 0 && allowedSkills.length > 0) {
            // Choisir une compétence aléatoire
            const skillIndex = Math.floor(Math.random() * allowedSkills.length);
            const skill = allowedSkills[skillIndex];
            
            // Calculer combien de points on peut encore ajouter
            const currentPoints = distribution[skill];
            const maxAdditional = Math.min(
                maxPerSkill - currentPoints,  // Ne pas dépasser le max
                remainingPoints                // Ne pas dépasser les points restants
            );
            
            if (maxAdditional > 0) {
                // Ajouter un point aléatoire entre 1 et maxAdditional
                const pointsToAdd = Math.floor(Math.random() * maxAdditional) + 1;
                distribution[skill] += pointsToAdd;
                remainingPoints -= pointsToAdd;
            }
            
            // Si cette compétence est au max, la retirer des options
            if (distribution[skill] >= maxPerSkill) {
                allowedSkills.splice(skillIndex, 1);
            }
        }
        
        return distribution;
    },
    
    /**
     * Applique la distribution de compétences à l'acteur
     */
    async applySkillDistribution(actor, distribution) {
        const updates = {};
        
        Object.entries(distribution).forEach(([skillKey, points]) => {
            if (points > 0) {
                updates[`system.skills.${skillKey}.ranks`] = points;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await actor.update(updates);
        }
    },
    
    /**
     * Distribue automatiquement les compétences pour un acteur
     */
    async autoDistributeSkills(actor, classItem, level) {
        if (!classItem || level < 1) {
            console.log("Pas de classe ou niveau invalide, aucune compétence distribuée.");
            return;
        }
        
        // 1. Calculer le total de points
        const totalPoints = this.calculateTotalSkillPoints(classItem, level);
        
        if (totalPoints === 0) {
            console.log("Aucun point de compétence à distribuer.");
            return;
        }
        
        // 2. Récupérer les compétences autorisées
        const allowedSkills = this.getClassSkills(actor, classItem);
        
        if (allowedSkills.length === 0) {
            console.log("Aucune compétence disponible.");
            return;
        }
        
        // 3. Distribuer les points (max = niveau du personnage)
        const distribution = this.distributeSkillPoints(
            [...allowedSkills], // Copie pour ne pas modifier l'original
            totalPoints,
            level // Max par compétence = niveau
        );
        
        // 4. Appliquer la distribution
        await this.applySkillDistribution(actor, distribution);
        
        console.log(`Distribution des compétences pour ${actor.name}:`, distribution);
        console.log(`Points distribués: ${Object.values(distribution).reduce((a, b) => a + b, 0)}/${totalPoints}`);
    }
};

// ====================================================================
// VII. GESTION DE LA NARRATION
// ====================================================================

const NarrativeManager = {
    /**
     * Génère les données narratives aléatoires
     */
    generateNarrativeData() {
        const name = Utils.randomFrom(NARRATIVE_DATA.names);
        const age = Utils.randomFrom(NARRATIVE_DATA.ageCategories);
        const motivation = Utils.randomFrom(NARRATIVE_DATA.motivations);
        
        // Deux traits distincts
        let trait1 = Utils.randomFrom(NARRATIVE_DATA.traits);
        let trait2;
        do { 
            trait2 = Utils.randomFrom(NARRATIVE_DATA.traits); 
        } while (trait1 === trait2);
        
        return { name, age, motivation, trait1, trait2 };
    },
    
    /**
     * Construit la biographie HTML
     */
    buildBiography(narrativeData, raceItem, classItem, level) {
        let bio = `<h3>👤 Profil de ${narrativeData.name}</h3>`;
        
        if (raceItem) {
            bio += `<p><strong>Race :</strong> ${raceItem.name}</p>`;
        }
        
        if (classItem) {
            bio += `<p><strong>Classe :</strong> ${classItem.name} (Niv. ${level})</p>`;
        }
        
        bio += `
            <p><strong>Niveau :</strong> ${level}</p>
            <p><strong>Âge :</strong> ${narrativeData.age}</p>
            <h4>🎯 Motivation Profonde</h4>
            <p>${narrativeData.motivation}</p>
            <h4>🎭 Traits de Caractère</h4>
            <ul>
                <li>${narrativeData.trait1}</li>
                <li>${narrativeData.trait2}</li>
            </ul>
        `;
        
        return bio;
    }
};

// ====================================================================
// VIII. GESTION DES ACTEURS (MODIFIÉ)
// ====================================================================

const ActorManager = {
    /**
     * Trouve le dossier de destination
     */
    findFolder(folderName) {
        return game.folders.find(f => 
            f.name === folderName && f.type === "Actor"
        );
    },
    
    /**
     * Crée l'acteur de base
     */
    async createBaseActor(name, image, attributes, folder) {
        return await Actor.create({
            name,
            type: CONFIG_NPC.NPC_ACTOR_TYPE,
            img: image,
            folder: folder?.id ?? null,
            system: {
                details: { biography: { value: "" } },
                ...attributes
            },
            prototypeToken: { 
                name, 
                texture: { src: image } 
            }
        });
    },
    
    /**
     * Ajoute les items de race et classe
     */
    async addRaceAndClass(actor, raceItem, classObj) {
        const itemsToCreate = [];
        
        if (raceItem) {
            itemsToCreate.push(raceItem.toObject());
        }
        
        if (classObj) {
            itemsToCreate.push(classObj);
        }
        
        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemsToCreate);
        }
    },
    
    /**
     * Ajoute l'équipement
     */
    async addGear(actor, gear) {
        if (gear.length > 0) {
            await actor.createEmbeddedDocuments("Item", gear);
        }
    },
    
    /**
     * Équipe automatiquement les items spécifiés
     */
    async equipItems(actor, itemsToEquip) {
        // Attendre que les items soient bien créés
        await Utils.delay(100);
        
        for (const itemInfo of itemsToEquip) {
            // Chercher l'item dans l'inventaire de l'acteur par nom
            const item = actor.items.find(i => i.name === itemInfo.name);
            
            if (item) {
                try {
                    // Équiper l'item
                    await item.update({ "system.equipped": true });
                    console.log(`Item équipé: ${item.name}`);
                } catch (error) {
                    console.warn(`Impossible d'équiper ${item.name}:`, error);
                }
            }
        }
    },
    
    /**
     * Définit les crédits du personnage
     */
    async setCredits(actor, credits) {
        await actor.update({ "system.currency.credit": credits });
        console.log(`Crédits définis: ${credits}`);
    },
    
    /**
     * Met à jour les points de vie/endurance/résolution au maximum
     */
    async updateHealthPoints(actor) {
        // Attendre le recalcul du système
        await Utils.delay(CONFIG_NPC.RECALC_DELAY_MS);
        
        const updatedData = actor.system;
        
        const updatePoints = {
            "system.attributes.hp.value": updatedData.attributes.hp.max || 0,
            "system.attributes.sp.value": updatedData.attributes.sp.max || 0,
            "system.attributes.rp.value": updatedData.attributes.rp.max || 0
        };
        
        await actor.update(updatePoints);
    },
    
    /**
     * Met à jour la biographie
     */
    async updateBiography(actor, biography) {
        await actor.update({ 
            "system.details.biography.value": biography 
        });
    }
};

// ====================================================================
// IX. GESTION DU DIALOGUE (MODIFIÉ AVEC LOGIQUE DYNAMIQUE)
// ====================================================================

const DialogManager = {
    /**
     * Affiche le dialogue de sélection
     */
    async showDialog() {
        const races = ItemManager.getItemOptions(CONFIG_NPC.RACE_ITEM_TYPE);
        const classes = ItemManager.getItemOptions(CONFIG_NPC.CLASS_ITEM_TYPE);
        
        // Charger les images du dossier par défaut au début
        const defaultImages = await ImageManager.getImageOptions(CONFIG_NPC.IMAGE_DIRECTORY);

        const html = `
        <form>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; padding: 5px;">
                <label style="font-weight: bold;">Race</label>
                <select id="race">${races.map(o => 
                    `<option value="${o.id}">${o.name}</option>`
                ).join('')}</select>

                <label style="font-weight: bold;">Image</label>
                <select id="img">${defaultImages.map(o => 
                    `<option value="${o.value}">${o.label}</option>`
                ).join('')}</select>

                <label style="font-weight: bold;">Classe</label>
                <select id="class">${classes.map(o => 
                    `<option value="${o.id}">${o.name}</option>`
                ).join('')}</select>
            
                <label style="font-weight: bold; margin-top: 10px;">
                    Niveau du PNJ
                </label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="checkbox" id="randomLevel" style="width: auto;">
                    <label for="randomLevel" style="margin: 0; font-weight: normal;">Aléatoire (${CONFIG_NPC.LEVEL_MIN}-${CONFIG_NPC.LEVEL_MAX})</label>
                </div>
                <input type="number" id="level" value="1" 
                       min="${CONFIG_NPC.LEVEL_MIN}" 
                       max="${CONFIG_NPC.LEVEL_MAX}" 
                       style="text-align: center;"/>
                
                <label style="font-weight: bold; margin-top: 10px;">
                    Nombre de PNJ à créer (${CONFIG_NPC.COUNT_MIN}-${CONFIG_NPC.COUNT_MAX})
                </label>
                <input type="number" id="count" value="1" 
                       min="${CONFIG_NPC.COUNT_MIN}" 
                       max="${CONFIG_NPC.COUNT_MAX}" 
                       style="text-align: center;"/>
            </div>
        </form>`;

        return new Promise(resolve => {
            new Dialog({
                title: "Générateur de PNJ Aléatoire",
                content: html,
                buttons: {
                    generate: {
                        label: "Générer",
                        icon: '<i class="fas fa-magic"></i>',
                        callback: html => {
                            const randomLevel = html.find("#randomLevel").is(":checked");
                            const level = randomLevel 
                                ? CONFIG_NPC.RANDOM_LEVEL_VALUE 
                                : (parseInt(html.find("#level").val()) || 1);
                            
                            resolve({
                                image: html.find("#img").val(),
                                race: html.find("#race").val(),
                                class: html.find("#class").val(),
                                level: level,
                                count: parseInt(html.find("#count").val()) || 1
                            });
                        }
                    },
                    cancel: {
                        label: "Annuler",
                        icon: '<i class="fas fa-times"></i>',
                        callback: () => resolve(null)
                    }
                },
                default: "generate",
                close: () => resolve(null),
                render: async html => {
                    const raceSelect = html.find("#race");
                    const imageSelect = html.find("#img");
                    const checkbox = html.find("#randomLevel");
                    const levelInput = html.find("#level");
                    
                    // Gestion du niveau aléatoire
                    checkbox.on("change", function() {
                        if (this.checked) {
                            levelInput.prop("disabled", true).css("opacity", "0.5");
                        } else {
                            levelInput.prop("disabled", false).css("opacity", "1");
                        }
                    });
                    
                    // Gestion du changement de race
                    raceSelect.on("change", async function() {
                        const selectedRaceId = this.value;
                        
                        // Si "random" ou "none"
                        if (selectedRaceId === "random" || selectedRaceId === "none") {
                            imageSelect.val("random");
                            imageSelect.prop("disabled", true).css("opacity", "0.5");
                            return;
                        }
                        
                        // Récupérer l'item de race
                        const raceItem = game.items.get(selectedRaceId);
                        if (!raceItem) {
                            imageSelect.prop("disabled", false).css("opacity", "1");
                            return;
                        }
                        
                        // Récupérer le dossier spécifique à la race
                        const raceFolder = ImageManager.getRaceFolderPath(raceItem.name);
                        
                        // Charger les nouvelles options d'images
                        const raceImages = await ImageManager.getImageOptions(raceFolder);
                        
                        // Mettre à jour le sélecteur d'images
                        imageSelect.empty();
                        raceImages.forEach(img => {
                            imageSelect.append(`<option value="${img.value}">${img.label}</option>`);
                        });
                        
                        // Réactiver et sélectionner "random" par défaut
                        imageSelect.val("random");
                        imageSelect.prop("disabled", false).css("opacity", "1");
                        
                        console.log(`Race changée: ${raceItem.name} -> Dossier: ${raceFolder}`);
                    });
                    
                    // Trigger initial pour la race par défaut
                    raceSelect.trigger("change");
                }
            }).render(true);
        });
    }
};

// ====================================================================
// X. GESTION DES NOTIFICATIONS (MODIFIÉ)
// ====================================================================

const NotificationManager = {
    /**
     * Affiche une notification de succès pour un PNJ
     */
    success(name, level) {
        ui.notifications.info(`✅ PNJ **${name}** (Niv. ${level}) créé avec succès.`);
    },
    
    /**
     * Affiche une notification de succès pour plusieurs PNJ
     */
    batchSuccess(count, totalCount) {
        ui.notifications.info(`✅ ${count}/${totalCount} PNJ créés avec succès.`);
    },
    
    /**
     * Affiche une notification d'annulation
     */
    cancelled() {
        ui.notifications.info("Génération de PNJ annulée.");
    },
    
    /**
     * Affiche une notification d'erreur
     */
    error(message) {
        ui.notifications.error(message);
    },
    
    /**
     * Envoie un message dans le chat
     */
    sendChatMessage(biography) {
        ChatMessage.create({
            user: game.user.id,
            speaker: { alias: "Générateur PNJ" },
            content: biography,
            whisper: [game.user.id]
        });
    },
    
    /**
     * Envoie un message récapitulatif pour plusieurs PNJ
     */
    sendBatchSummary(npcList) {
        const content = `
            <h3>📋 Récapitulatif de génération</h3>
            <p><strong>${npcList.length} PNJ créés :</strong></p>
            <ul>
                ${npcList.map(npc => 
                    `<li>${npc.name} (${npc.raceName}, Niv. ${npc.level}) - ${npc.className || 'Sans classe'}</li>`
                ).join('')}
            </ul>
        `;
        
        ChatMessage.create({
            user: game.user.id,
            speaker: { alias: "Générateur PNJ" },
            content: content,
            whisper: [game.user.id]
        });
    }
};

// ====================================================================
// XI. ORCHESTRATEUR PRINCIPAL (MODIFIÉ)
// ====================================================================

const NPCGenerator = {
    /**
     * Génère un seul PNJ
     */
    async generateSingle(selection) {
        // 1. Résoudre le niveau (aléatoire ou fixe)
        const level = Utils.resolveLevel(selection.level);
        
        console.log(`Niveau résolu: ${level} (original: ${selection.level})`);
        
        // 2. Résoudre la race AVANT l'image
        const raceItem = ItemManager.resolveItem(
            selection.race, 
            CONFIG_NPC.RACE_ITEM_TYPE
        );
        
        // 3. Résoudre l'image en fonction de la race
        const image = await ImageManager.resolveImage(
            selection.image,
            raceItem
        );
        
        console.log(`Race: ${raceItem?.name || "Aucune"} -> Image: ${image}`);
        
        // 4. Résoudre la classe
        const classItem = ItemManager.resolveItem(
            selection.class, 
            CONFIG_NPC.CLASS_ITEM_TYPE
        );

        // 5. Générer les données (NOUVELLES à chaque appel)
        const narrativeData = NarrativeManager.generateNarrativeData();
        const attributes = await AttributeManager.rollAttributes();
        const folder = ActorManager.findFolder(CONFIG_NPC.ACTOR_FOLDER_NAME);

        // 6. Créer l'acteur de base
        const actor = await ActorManager.createBaseActor(
            narrativeData.name,
            image,
            attributes,
            folder
        );

        if (!actor) {
            throw new Error("Échec de la création de l'acteur.");
        }

        // 7. Ajouter race et classe
        const classObj = ItemManager.prepareClassItem(classItem, level);
        await ActorManager.addRaceAndClass(actor, raceItem, classObj);

        // 8. Générer l'équipement avec budget
        const { gear, remainingBudget, itemsToEquip } = ItemManager.generateGearWithBudget(level);
        await ActorManager.addGear(actor, gear);
        
        // 9. Équiper les items prioritaires
        await ActorManager.equipItems(actor, itemsToEquip);
        
        // 10. Définir les crédits restants
        await ActorManager.setCredits(actor, remainingBudget);

        // 11. Mettre à jour les points de vie
        await ActorManager.updateHealthPoints(actor);

        // 12. Distribuer automatiquement les compétences
        await SkillManager.autoDistributeSkills(actor, classItem, level);

        // 13. Construire et mettre à jour la biographie
        const biography = NarrativeManager.buildBiography(
            narrativeData,
            raceItem,
            classItem,
            level
        );
        await ActorManager.updateBiography(actor, biography);

        // Retourner les infos du PNJ créé
        return {
            name: narrativeData.name,
            level: level,
            raceName: raceItem?.name || "Sans race",
            className: classItem?.name || null,
            biography: biography
        };
    },
    
    /**
     * Point d'entrée principal - gère la création unique ou multiple
     */
    async generate() {
        // 1. Afficher le dialogue
        const selection = await DialogManager.showDialog();
        if (!selection) {
            NotificationManager.cancelled();
            return;
        }

        const count = Math.min(Math.max(selection.count, CONFIG_NPC.COUNT_MIN), CONFIG_NPC.COUNT_MAX);
        const isRandomLevel = selection.level === CONFIG_NPC.RANDOM_LEVEL_VALUE;
        
        console.log(`Génération de ${count} PNJ(s) - Niveau: ${isRandomLevel ? 'Aléatoire' : selection.level}`);
        
        try {
            const createdNPCs = [];
            
            // Boucle de création
            for (let i = 0; i < count; i++) {
                console.log(`\n=== Création du PNJ ${i + 1}/${count} ===`);
                
                try {
                    const npcInfo = await this.generateSingle(selection);
                    createdNPCs.push(npcInfo);
                    
                    // Notification individuelle uniquement si un seul PNJ
                    if (count === 1) {
                        NotificationManager.success(npcInfo.name, npcInfo.level);
                        NotificationManager.sendChatMessage(npcInfo.biography);
                    }
                    
                    // Petit délai entre chaque création pour éviter les problèmes
                    if (i < count - 1) {
                        await Utils.delay(200);
                    }
                    
                } catch (error) {
                    console.error(`Erreur lors de la création du PNJ ${i + 1}:`, error);
                    NotificationManager.error(`Erreur PNJ ${i + 1}: ${error.message}`);
                }
            }
            
            // Si plusieurs PNJ, notification groupée
            if (count > 1) {
                NotificationManager.batchSuccess(createdNPCs.length, count);
                NotificationManager.sendBatchSummary(createdNPCs);
            }

        } catch (error) {
            console.error("Erreur lors de la génération des PNJ:", error);
            NotificationManager.error(`Erreur: ${error.message}`);
        }
    }
};

// ====================================================================
// XII. EXÉCUTION
// ====================================================================

NPCGenerator.generate();