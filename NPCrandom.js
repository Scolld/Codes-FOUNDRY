// ====================================================================
// GÉNÉRATEUR DE PNJ DIVERSIFIÉ – VERSION STABLE (Dialog + Race/Classe/Image + Niveau CHOISI + ÉQUIPEMENT)
// SYSTÈME CIBLE : Starfinder RPG (SFRpg)
// ====================================================================

// ====================================================================
// I. CONFIGURATION CRITIQUE
// ====================================================================
// Nom du dossier Acteur où les PNJs seront créés (laissez null si vous n'en voulez pas)
const ACTOR_FOLDER_NAME = "NPC random";
// Chemin du répertoire contenant vos images PNJ (ex: "assets/NPC")
const IMAGE_DIRECTORY = "assets/NPC";

// Types d'Acteur/Item pour Starfinder RPG
const NPC_ACTOR_TYPE = "character";
const RACE_ITEM_TYPE = "race";
const CLASS_ITEM_TYPE = "class";

const DEFAULT_IMAGE = "icons/svg/mystery-man.svg";

// ====================================================================
// II. DONNÉES ALÉATOIRES (Inchangé)
// ====================================================================

const names = [
    "Alistair","Elara","Bartholomé","Seraphine","Corbin","Lyra","Torvin",
    "Gretchen","Finnian","Maeve","Silas","Vivienne","Roric","Isolde","Joric",
    "Briar","Kaelen","Petra","Zenon","Myra","Caspian","Thora","Bran",
    "Lysandra","Aldric"
];

const ageCategories = [
    "Jeune adulte (20-30 ans)",
    "D'âge moyen (40-55 ans)",
    "Vieux/Vénérable (65-80 ans)",
    "Adolescent/Tôt dans la vingtaine (16-25 ans)",
    "Fin de la trentaine (35-45 ans)"
];

const motivations = [
    "Retrouver un héritage familial perdu.",
    "Rembourser une dette envers un seigneur local.",
    "Protéger sa famille des bandits ou créatures.",
    "Économiser pour acheter une ferme ou un commerce.",
    "Obtenir la reconnaissance d'un ordre ou d'une guilde.",
    "Venger un ami ou un parent assassiné.",
    "Échapper à une prophétie ou une sombre prédiction.",
    "Accumuler suffisamment de richesses pour prendre sa retraite.",
    "Étudier un phénomène magique ou naturel rare."
];

const traits = [
    "Parle beaucoup trop vite.",
    "Excessivement superstitieux.",
    "Évite le regard.",
    "Cicatrice voyante.",
    "Obsédé par l'ordre.",
    "Tic nerveux.",
    "Menteur compulsif.",
    "Se méfie de la magie.",
    "Très généreux."
];

// ====================================================================
// III. FONCTIONS UTILITAIRES
// ====================================================================

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Retourne un entier aléatoire entre min (inclus) et max (inclus).
 */
const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Lance les 3d6 pour les six attributs (STR, DEX, CON, INT, WIS, CHA).
 */
async function rollAttributes() {
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

/**
 * Construit la liste des Items (Race ou Classe) disponibles pour le sélecteur.
 */
function getItemOptions(type) {
    const items = game.items.filter(i => i.type === type);
    return [
        { id: "random", name: "(Aléatoire)" },
        { id: "none", name: "(Aucun)" },
        ...items.map(i => ({ id: i.id, name: i.name }))
    ];
}

/**
 * Récupère les chemins d'images disponibles pour le sélecteur.
 */
async function getImageOptions(directory) {
    const options = [
        { value: "random", label: "(Aléatoire)" },
        { value: DEFAULT_IMAGE, label: "(Icône Foundry)" }
    ];
    
    try {
        const browse = await FilePicker.browse("data", directory);
        browse.files
            .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
            .forEach(f => options.push({ value: f, label: f.split("/").pop() }));
    } catch (e) {
         // Silencieux si le chemin n'existe pas
    }

    return options;
}

/**
 * Sélectionne un chemin d'image aléatoire dans le répertoire.
 */
async function getRandomImage(directory) {
    try {
        const browse = await FilePicker.browse("data", directory);
        const images = browse.files.filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
        return images.length ? randomFrom(images) : DEFAULT_IMAGE;
    } catch (e) {
        return DEFAULT_IMAGE;
    }
}


// ====================================================================
// IV. DIALOGUE
// ====================================================================

/**
 * Affiche la boîte de dialogue de sélection des options.
 */
async function showDialog() {

    const images = await getImageOptions(IMAGE_DIRECTORY);
    const races = getItemOptions(RACE_ITEM_TYPE);
    const classes = getItemOptions(CLASS_ITEM_TYPE);

    const html = `
    <form>
        <div style="display: grid; grid-template-columns: min-content; gap: 5px; padding: 5px;">
            <label style="font-weight: bold;">Image</label>
            <select id="img">${images.map(o => `<option value="${o.value}">${o.label}</option>`)}</select>

            <label style="font-weight: bold;">Race</label>
            <select id="race">${races.map(o => `<option value="${o.id}">${o.name}</option>`)}</select>

            <label style="font-weight: bold;">Classe</label>
            <select id="class">${classes.map(o => `<option value="${o.id}">${o.name}</option>`)}</select>
        
            <label style="font-weight: bold; margin-top: 10px;">Niveau du PNJ (1-20)</label>
            <input type="number" id="level" value="1" min="1" max="20" style="text-align: center;"/> 
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

// ====================================================================
// V. GÉNÉRATION PRINCIPALE
// ====================================================================

async function generateNPC() {

    const selection = await showDialog();
    if (!selection) {
        ui.notifications.info("Génération de PNJ annulée.");
        return;
    }

    // --- 1. Résolution des options ---
    
    const level = selection.level;

    // Image
    const image = selection.image === "random"
        ? await getRandomImage(IMAGE_DIRECTORY)
        : selection.image;

    // Items
    const races = game.items.filter(i => i.type === RACE_ITEM_TYPE);
    const classes = game.items.filter(i => i.type === CLASS_ITEM_TYPE);

    const raceItem =
        selection.race === "random" ? randomFrom(races) :
        selection.race === "none" ? null :
        game.items.get(selection.race);

    const classItem =
        selection.class === "random" ? randomFrom(classes) :
        selection.class === "none" ? null :
        game.items.get(selection.class);

    // --- 2. Génération des données aléatoires ---
    
    const name = randomFrom(names);
    const age = randomFrom(ageCategories);
    const motivation = randomFrom(motivations);
    let t1 = randomFrom(traits), t2;
    do { t2 = randomFrom(traits); } while (t1 === t2);

    const attributes = await rollAttributes();
    
    // Dossier
    const folder = game.folders.find(f => f.name === ACTOR_FOLDER_NAME && f.type === "Actor");

    // --- 3. Création de l'Acteur SEUL ---
    
    const actor = await Actor.create({
        name,
        type: NPC_ACTOR_TYPE,
        img: image,
        folder: folder?.id ?? null,
        system: {
            details: { biography: { value: "" } }, 
            ...attributes
        },
        prototypeToken: { name, texture: { src: image } }
    });
    
    if (!actor) {
        ui.notifications.error("Échec de la création de l'acteur.");
        return;
    }

    // --- 4. Ajout des Items (Race/Classe) ---
    
    let biography = `
        <h3>👤 Profil de ${name}</h3>
    `;

    if (raceItem || classItem) {

        const itemsToCreate = [];
        let bioAdd = "";

        if (raceItem) {
            itemsToCreate.push(raceItem.toObject());
            bioAdd += `<p><strong>Race :</strong> ${raceItem.name}</p>`;
        }

        if (classItem) {
            let classObj = classItem.toObject();
            
            // Assigner le niveau CHOISI (level) à l'Item de Classe
            if (classObj.system && typeof classObj.system.levels !== 'undefined') {
                classObj.system.levels = level; 
            } else if (classObj.system && typeof classObj.system.classLevel !== 'undefined') {
                classObj.system.classLevel = level; 
            }

            itemsToCreate.push(classObj);
            bioAdd += `<p><strong>Classe :</strong> ${classItem.name} (Niv. ${level})</p>`; 
        }
        
        // Ajout des Items à l'inventaire de l'Acteur
        await actor.createEmbeddedDocuments("Item", itemsToCreate);
        
        // Mise à jour de la biographie pour inclure Race/Classe après le titre
        biography += bioAdd;
    }

    // ------------------------------------------------------------
    // 4.5. ÉQUIPEMENT ALÉATOIRE (RÉINTRODUIT)
    // ------------------------------------------------------------

    const allItems = game.items.contents;

    // Filtre pour les types d'objets spécifiques à Starfinder (peut nécessiter d'ajuster les 'type' si besoin)
    const weapons = allItems.filter(i => i.type === "weapon");
    const armors = allItems.filter(i => i.type === "equipment");
    const consumables = allItems.filter(i => i.type === "consumable");
    const tech = allItems.filter(i => i.type === "technological");

    const gear = [];

    // 1. ARMURE (Garanti si disponible)
    if (armors.length) {
        gear.push(randomFrom(armors).toObject());
    }

    // 2. CONSOMMABLE (Garanti si disponible)
    if (consumables.length) {
        gear.push(randomFrom(consumables).toObject());
        // Possibilité d'un deuxième consommable (50% de chance)
        if (Math.random() < 0.5) gear.push(randomFrom(consumables).toObject());
    }

    // 3. TECHNOLOGIE (Garanti si disponible)
    if (tech.length) {
        gear.push(randomFrom(tech).toObject());
    }
    
    // 4. ARME (Aléatoire - 75% de chance)
    if (weapons.length && Math.random() < 0.75) {
        gear.push(randomFrom(weapons).toObject());
    }

    if (gear.length) await actor.createEmbeddedDocuments("Item", gear);


    // --- 5. Finalisation de la biographie et mise à jour de l'Acteur ---
    
    biography += `
        <p><strong>Niveau :</strong> ${level}</p>
        <p><strong>Âge :</strong> ${age}</p>
        <h4>🎯 Motivation Profonde</h4>
        <p>${motivation}</p>
        <h4>🎭 Traits de Caractère</h4>
        <ul><li>${t1}</li><li>${t2}</li></ul>
    `;
    
    // Mise à jour finale pour insérer la biographie complète et déclencher le recalcul SFRpg
    await actor.update({ "system.details.biography.value": biography });
    
    ui.notifications.info(`✅ PNJ **${name}** (Niv. ${classItem ? level : 0}) créé avec succès.`);

    // --- 6. Affichage dans le chat ---
    ChatMessage.create({
        user: game.user.id,
        speaker: { alias: "Générateur PNJ" },
        content: biography,
        whisper: [game.user.id]
    });
}

// ====================================================================
// EXÉCUTION
// ====================================================================

generateNPC();