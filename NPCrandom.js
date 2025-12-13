// ====================================================================
// GÉNÉRATEUR DE PNJ DIVERSIFIÉ – VERSION REFACTORISÉE
// SYSTÈME CIBLE : Starfinder RPG (SFRpg)
// ====================================================================

// ====================================================================
// I. CONFIGURATION
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
    RECALC_DELAY_MS: 50
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
// III. UTILITAIRES GÉNÉRIQUES
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
// V. GESTION DES IMAGES
// ====================================================================

const ImageManager = {
    /**
     * Récupère les options d'images pour le sélecteur
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
            return CONFIG_NPC.DEFAULT_IMAGE;
        }
    },
    
    /**
     * Résout le choix d'image (random ou spécifique)
     */
    async resolveImage(selection, directory) {
        return selection === "random" 
            ? await this.getRandomImage(directory)
            : selection;
    }
};

// ====================================================================
// VI. GESTION DES ITEMS
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
     * Génère l'équipement aléatoire
     */
    generateGear() {
        const allItems = game.items.contents;
        
        const weapons = allItems.filter(i => i.type === "weapon");
        const armors = allItems.filter(i => i.type === "equipment");
        const consumables = allItems.filter(i => i.type === "consumable");
        const tech = allItems.filter(i => i.type === "technological");

        const gear = [];

        // 1. Armure (garanti)
        if (armors.length) {
            gear.push(Utils.randomFrom(armors).toObject());
        }

        // 2. Consommable (garanti + 50% pour un second)
        if (consumables.length) {
            gear.push(Utils.randomFrom(consumables).toObject());
            if (Math.random() < 0.5) {
                gear.push(Utils.randomFrom(consumables).toObject());
            }
        }

        // 3. Technologie (garanti)
        if (tech.length) {
            gear.push(Utils.randomFrom(tech).toObject());
        }
        
        // 4. Arme (75% de chance)
        if (weapons.length && Math.random() < 0.75) {
            gear.push(Utils.randomFrom(weapons).toObject());
        }

        return gear;
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
// VIII. GESTION DES ACTEURS
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
// IX. GESTION DE LA POPUP
// ====================================================================

const DialogManager = {
    /**
     * Affiche le popup de sélection
     */
    async showDialog() {
        const images = await ImageManager.getImageOptions(CONFIG_NPC.IMAGE_DIRECTORY);
        const races = ItemManager.getItemOptions(CONFIG_NPC.RACE_ITEM_TYPE);
        const classes = ItemManager.getItemOptions(CONFIG_NPC.CLASS_ITEM_TYPE);

        const html = `
        <form>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; padding: 5px;">
                <label style="font-weight: bold;">Image</label>
                <select id="img">${images.map(o => 
                    `<option value="${o.value}">${o.label}</option>`
                ).join('')}</select>

                <label style="font-weight: bold;">Race</label>
                <select id="race">${races.map(o => 
                    `<option value="${o.id}">${o.name}</option>`
                ).join('')}</select>

                <label style="font-weight: bold;">Classe</label>
                <select id="class">${classes.map(o => 
                    `<option value="${o.id}">${o.name}</option>`
                ).join('')}</select>
            
                <label style="font-weight: bold; margin-top: 10px;">
                    Niveau du PNJ (${CONFIG_NPC.LEVEL_MIN}-${CONFIG_NPC.LEVEL_MAX})
                </label>
                <input type="number" id="level" value="1" 
                       min="${CONFIG_NPC.LEVEL_MIN}" 
                       max="${CONFIG_NPC.LEVEL_MAX}" 
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
                        callback: html => resolve({
                            image: html.find("#img").val(),
                            race: html.find("#race").val(),
                            class: html.find("#class").val(),
                            level: parseInt(html.find("#level").val()) || 1
                        })
                    },
                    cancel: {
                        label: "Annuler",
                        icon: '<i class="fas fa-times"></i>',
                        callback: () => resolve(null)
                    }
                },
                default: "generate",
                close: () => resolve(null)
            }).render(true);
        });
    }
};

// ====================================================================
// X. GESTION DES NOTIFICATIONS
// ====================================================================

const NotificationManager = {
    /**
     * Affiche une notification de succès
     */
    success(name, level) {
        ui.notifications.info(`✅ PNJ **${name}** (Niv. ${level}) créé avec succès.`);
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
    }
};

// ====================================================================
// XI. ORCHESTRATEUR PRINCIPAL
// ====================================================================

const NPCGenerator = {
    /**
     * Point d'entrée principal
     */
    async generate() {
        // 1. Afficher le dialogue
        const selection = await DialogManager.showDialog();
        if (!selection) {
            NotificationManager.cancelled();
            return;
        }

        try {
            // 2. Résoudre les sélections
            const image = await ImageManager.resolveImage(
                selection.image, 
                CONFIG_NPC.IMAGE_DIRECTORY
            );
            
            const raceItem = ItemManager.resolveItem(
                selection.race, 
                CONFIG_NPC.RACE_ITEM_TYPE
            );
            
            const classItem = ItemManager.resolveItem(
                selection.class, 
                CONFIG_NPC.CLASS_ITEM_TYPE
            );
            
            const level = selection.level;

            // 3. Générer les données
            const narrativeData = NarrativeManager.generateNarrativeData();
            const attributes = await AttributeManager.rollAttributes();
            const folder = ActorManager.findFolder(CONFIG_NPC.ACTOR_FOLDER_NAME);

            // 4. Créer l'acteur de base
            const actor = await ActorManager.createBaseActor(
                narrativeData.name,
                image,
                attributes,
                folder
            );

            if (!actor) {
                NotificationManager.error("Échec de la création de l'acteur.");
                return;
            }

            // 5. Ajouter race et classe
            const classObj = ItemManager.prepareClassItem(classItem, level);
            await ActorManager.addRaceAndClass(actor, raceItem, classObj);

            // 6. Ajouter l'équipement
            const gear = ItemManager.generateGear();
            await ActorManager.addGear(actor, gear);

            // 7. Mettre à jour les points de vie
            await ActorManager.updateHealthPoints(actor);

            // 8. Construire et mettre à jour la biographie
            const biography = NarrativeManager.buildBiography(
                narrativeData,
                raceItem,
                classItem,
                level
            );
            await ActorManager.updateBiography(actor, biography);

            // 9. Notifications
            NotificationManager.success(narrativeData.name, level);
            NotificationManager.sendChatMessage(biography);

        } catch (error) {
            console.error("Erreur lors de la génération du PNJ:", error);
            NotificationManager.error(`Erreur: ${error.message}`);
        }
    }
};

// ====================================================================
// XII. EXÉCUTION
// ====================================================================

NPCGenerator.generate();