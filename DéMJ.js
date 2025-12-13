// FOUNDRY VTT MACRO: GM NPC Roll Selector (Bonus ajouté)

// --- UTILITAIRES DE DONNÉES ---

// Mappage des noms d'attributs (ABRÉVIATIONS)
const abilityNames = {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "SAG", 
    cha: "CHA"
};

// Liste des attributs/compétences à afficher
const abilities = Object.keys(abilityNames);


// --- FONCTION DE JET FINAL (ÉTAPE 3) ---

/**
 * Effectue le jet de dés avec le modificateur et le bonus spécifiés.
 * @param {Actor} actor L'objet Acteur (PNJ) sélectionné.
 * @param {string} abilityKey La clé de l'attribut (ex: 'str').
 * @param {number} baseMod Le modificateur de l'attribut de l'acteur.
 * @param {number} bonus Le bonus/malus contextuel entré manuellement.
 */
function performFinalRoll(actor, abilityKey, baseMod, bonus) {
    const actorName = actor.name;
    const finalMod = baseMod + bonus;
    const abilityName = abilityNames[abilityKey];

    // Formule de jet de dés (ex: 1d20 + 3)
    const rollFormula = "1d20 + " + finalMod;
    const roll = new Roll(rollFormula);
    
    // Description du jet pour le chat
    let flavorText = `**Jet de ${abilityName}** pour **${actorName}** (Mod Base: ${baseMod}`;
    
    if (bonus !== 0) {
        // Ajout du bonus/malus à la description
        flavorText += `, Bonus Manuelle: ${bonus})`;
    } else {
        flavorText += `)`;
    }
    
    // Effectuer le jet et l'afficher dans le chat
    roll.evaluate({ async: true }).then(result => {
        result.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: flavorText
        });
    }).catch(error => {
        ui.notifications.error(`Erreur de jet pour ${actorName}: ${error.message}`);
        console.error("Erreur d'évaluation du jet:", error);
    });
}


// --- FONCTION DE SAISIE DU BONUS (ÉTAPE 2.5) ---

/**
 * Affiche la boîte de dialogue pour saisir un bonus/malus contextuel.
 * @param {Actor} actor L'objet Acteur (PNJ).
 * @param {string} abilityKey La clé de l'attribut (ex: 'str').
 * @param {number} baseMod Le modificateur de l'attribut de l'acteur.
 */
function showBonusDialog(actor, abilityKey, baseMod) {
    const abilityName = abilityNames[abilityKey];
    
    // Définition de la boîte de dialogue de saisie du bonus
    new Dialog({
        title: `Bonus/Malus pour ${abilityName}`,
        content: `
            <form>
                <p>Modificateur de base de ${actor.name} (${abilityName}) : **${baseMod >= 0 ? '+' : ''}${baseMod}**</p>
                <div class="form-group">
                    <label for="bonus-input">Entrer un Bonus / Malus (ex: 3, -2) :</label>
                    <input type="number" id="bonus-input" name="bonus-input" value="0" placeholder="0">
                </div>
            </form>
        `,
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice"></i>',
                label: "Lancer le Dé",
                callback: (html) => {
                    let bonus = parseInt(html.find('#bonus-input').val()) || 0;
                    
                    // Passer à l'étape finale du jet de dés
                    performFinalRoll(actor, abilityKey, baseMod, bonus);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Annuler"
            }
        },
        default: "roll"
    }).render(true);
}


// --- FONCTION DE SÉLECTION DE L'ATTRIBUT (ÉTAPE 2) ---

/**
 * Affiche la boîte de dialogue de sélection de l'attribut/compétence.
 * @param {Actor} actor L'objet Acteur (PNJ) sélectionné.
 */
function showAbilityDialog(actor) {
    const actorName = actor.name;

    const dialogButtons = abilities.reduce((obj, ab) => {
        obj[ab] = {
            label: abilityNames[ab],
            callback: () => {
                let baseMod = 0;
                let abilityData;

                // Récupération sécurisée des données de l'attribut
                if (actor.system?.abilities?.[ab]) {
                    abilityData = actor.system.abilities[ab];
                } else if (actor.data?.data?.abilities?.[ab]) {
                    abilityData = actor.data.data.abilities[ab];
                }

                // Récupération du modificateur ou de la valeur
                if (abilityData?.mod !== undefined) {
                    baseMod = abilityData.mod;
                } else if (abilityData?.value !== undefined) {
                    baseMod = abilityData.value;
                }
                
                if (typeof baseMod !== 'number') {
                    console.warn(`Could not find a valid modifier for ${ab} on ${actorName}. Defaulting to 0.`);
                    baseMod = 0;
                }

                // Passer à l'étape de saisie du bonus (Nouvelle étape)
                showBonusDialog(actor, ab, baseMod);
            }
        };
        return obj;
    }, {});

    // Afficher la boîte de dialogue de sélection de l'attribut
    new Dialog({
        title: `${actorName}: Quel Attribut ?`,
        content: `<p>Sélectionnez l'attribut que **${actorName}** doit utiliser :</p>`,
        buttons: dialogButtons,
        default: abilities[0],
        options: {
            width: 350
        }
    }).render(true);
}


// --- FONCTION PRINCIPALE (ÉTAPE 1) ---

/**
 * Affiche la première boîte de dialogue pour sélectionner le PNJ.
 */
function showNPCDialog() {
    // Filtrer pour n'obtenir que les acteurs qui ne sont PAS des PJ (détection simplifiée)
    const npcs = game.actors.filter(a => 
        a.type !== "Folder" && a.hasPlayerOwner === false
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (npcs.length === 0) {
        ui.notifications.warn("Aucun PNJ trouvé dans le répertoire des Acteurs.");
        return;
    }

    // Création du contenu HTML de la boîte de dialogue pour la sélection
    let content = `
        <form>
            <div class="form-group">
                <label>Sélectionner le PNJ :</label>
                <select id="npc-selector" name="npc-selector">
                    ${npcs.map(npc => `<option value="${npc.id}">${npc.name}</option>`).join('')}
                </select>
            </div>
        </form>
    `;

    // Définition de la première boîte de dialogue (Choix du PNJ)
    new Dialog({
        title: "Sélectionner un PNJ pour un Jet",
        content: content,
        buttons: {
            roll: {
                icon: '<i class="fas fa-arrow-right"></i>',
                label: "Continuer (Choix Attribut)",
                callback: (html) => {
                    const selectedActorId = html.find('#npc-selector').val();
                    const targetActor = game.actors.get(selectedActorId);

                    if (targetActor) {
                        showAbilityDialog(targetActor);
                    } else {
                        ui.notifications.error("Acteur sélectionné introuvable.");
                    }
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Annuler"
            }
        },
        default: "roll"
    }).render(true);
}


// --- EXÉCUTION DE LA MACRO ---

showNPCDialog();