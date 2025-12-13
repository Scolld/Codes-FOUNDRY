// ====================================================================
// GÉNÉRATEUR DE PNJ DIVERSIFIÉ – VERSION STABLE (Dialog + Race/Classe/Image)
// ====================================================================

// ====================================================================
// I. CONFIGURATION
// ====================================================================

const ACTOR_FOLDER_NAME = "NPC random";
const IMAGE_DIRECTORY = "assets/NPC";

const NPC_ACTOR_TYPE = "character";
const RACE_ITEM_TYPE = "race";
const CLASS_ITEM_TYPE = "class";

const DEFAULT_IMAGE = "icons/svg/mystery-man.svg";

// ====================================================================
// II. DONNÉES NARRATIVES
// ====================================================================

const names = [
  "Alistair","Elara","Bartholomé","Seraphine","Corbin","Lyra","Torvin",
  "Gretchen","Finnian","Maeve","Silas","Vivienne","Roric","Isolde","Joric",
  "Briar","Kaelen","Petra","Zenon","Myra","Caspian","Thora","Bran",
  "Lysandra","Aldric"
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
// III. ÂGE & PROFILS
// ====================================================================

const ageCategories = {
  young: { label: "Jeune adulte (16–25)", mods: { dex: +1 } },
  adult: { label: "Adulte (25–45)", mods: {} },
  middle: { label: "Âge mûr (40–55)", mods: { wis: +1 } },
  old: { label: "Âgé (60–75)", mods: { wis: +2, dex: -1, con: -1 } }
};

const npcProfiles = {
  "Commun": { roll: "3d6", priority: ["con","dex","wis","str","cha","int"], bonuses: {} },
  "Garde": { roll: "3d6+1", priority: ["str","con","dex","wis","cha","int"], bonuses: { con: +1 } },
  "Voyou": { roll: "4d6kh3", priority: ["dex","cha","wis","con","int","str"], bonuses: { dex: +1 } },
  "Savant": { roll: "4d6kh3", priority: ["int","wis","cha","con","dex","str"], bonuses: { int: +1 } },
  "Vétéran": { roll: "3d6+2", priority: ["str","con","wis","dex","cha","int"], bonuses: { wis: +1 } }
};

// ====================================================================
// IV. OUTILS
// ====================================================================

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

async function rollStat(formula) {
  const roll = await (new Roll(formula)).evaluate({ async: true });
  return roll.total;
}

async function generateAttributes(profile, ageKey) {
  const stats = ["str","dex","con","int","wis","cha"];
  const rolls = [];

  for (let i = 0; i < 6; i++) rolls.push(await rollStat(profile.roll));
  rolls.sort((a, b) => b - a);

  const base = {};
  profile.priority.forEach((s, i) => base[s] = rolls[i]);

  Object.entries(profile.bonuses).forEach(([k,v]) => base[k] += v);
  Object.entries(ageCategories[ageKey].mods).forEach(([k,v]) => base[k] += v);

  const abilities = {};
  stats.forEach(s => abilities[s] = {
    value: base[s],
    mod: Math.floor((base[s] - 10) / 2)
  });

  return { abilities };
}

function getItemOptions(type) {
  const items = game.items.filter(i => i.type === type);
  return [
    { id: "random", name: "(Aléatoire)" },
    { id: "none", name: "(Aucun)" },
    ...items.map(i => ({ id: i.id, name: i.name }))
  ];
}

async function getImageOptions(directory) {
  const options = [
    { value: "random", label: "(Aléatoire)" },
    { value: DEFAULT_IMAGE, label: "(Icône Foundry)" }
  ];

  const browse = await FilePicker.browse("data", directory);
  browse.files
    .filter(f => /(png|jpg|jpeg|webp|gif)$/i.test(f))
    .forEach(f => options.push({ value: f, label: f.split("/").pop() }));

  return options;
}

async function getRandomImage(directory) {
  const browse = await FilePicker.browse("data", directory);
  const images = browse.files.filter(f => /(png|jpg|jpeg|webp|gif)$/i.test(f));
  return images.length ? randomFrom(images) : DEFAULT_IMAGE;
}

// ====================================================================
// V. DIALOG
// ====================================================================

async function showDialog() {
  const images = await getImageOptions(IMAGE_DIRECTORY);
  const races = getItemOptions(RACE_ITEM_TYPE);
  const classes = getItemOptions(CLASS_ITEM_TYPE);

  const html = `
  <form>
    <label>Image</label>
    <select id="img">${images.map(o => `<option value="${o.value}">${o.label}</option>`)}</select>

    <label>Race</label>
    <select id="race">${races.map(o => `<option value="${o.id}">${o.name}</option>`)}</select>

    <label>Classe</label>
    <select id="class">${classes.map(o => `<option value="${o.id}">${o.name}</option>`)}</select>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: "Générateur de PNJ",
      content: html,
      buttons: {
        generate: {
          label: "Générer",
          callback: html => resolve({
            image: html.find("#img").val(),
            race: html.find("#race").val(),
            class: html.find("#class").val()
          })
        },
        cancel: { label: "Annuler", callback: () => resolve(null) }
      }
    }).render(true);
  });
}

// ====================================================================
// VI. GÉNÉRATION (ORDRE CORRECT)
// ====================================================================

async function generateNPC() {

  const selection = await showDialog();
  if (!selection) return;

  const image = selection.image === "random"
    ? await getRandomImage(IMAGE_DIRECTORY)
    : selection.image;

  const races = game.items.filter(i => i.type === RACE_ITEM_TYPE);
  const classes = game.items.filter(i => i.type === CLASS_ITEM_TYPE);

  const raceItem =
    selection.race === "random" ? randomFrom(races) :
    selection.race === "none" ? null : game.items.get(selection.race);

  const classItem =
    selection.class === "random" ? randomFrom(classes) :
    selection.class === "none" ? null : game.items.get(selection.class);

  const name = randomFrom(names);
  const ageKey = randomFrom(Object.keys(ageCategories));
  const age = ageCategories[ageKey].label;
  const profileName = randomFrom(Object.keys(npcProfiles));
  const profile = npcProfiles[profileName];

  const attributes = await generateAttributes(profile, ageKey);

  let t1 = randomFrom(traits), t2;
  do { t2 = randomFrom(traits); } while (t1 === t2);

  const motivation = randomFrom(motivations);

  const folder = game.folders.find(f => f.name === ACTOR_FOLDER_NAME && f.type === "Actor");

  let biography = `
    <h3>${name}</h3>
    <p><strong>Profil :</strong> ${profileName}</p>
    <p><strong>Âge :</strong> ${age}</p>
    <p><strong>Motivation :</strong> ${motivation}</p>
    <ul><li>${t1}</li><li>${t2}</li></ul>
  `;

  const actor = await Actor.create({
    name,
    type: NPC_ACTOR_TYPE,
    img: image,
    folder: folder?.id ?? null,
    system: {
      details: { biography: { value: biography } },
      ...attributes
    },
    prototypeToken: { name, texture: { src: image } }
  });

    const items = [];
  if (raceItem) items.push(raceItem.toObject());
  if (classItem) {
    classObj = classItem.toObject();
    if (classObj.system && typeof classObj.system.levels !== 'undefined') {
                classObj.system.levels = randomLevel;
            } else if (classObj.system && typeof classObj.system.classLevel !== 'undefined') {
                classObj.system.classLevel = randomLevel;
            }
    items.push(classObj);
} 
  if (items.length) await actor.createEmbeddedDocuments("Item", items);

  // ------------------------------------------------------------
  // ÉQUIPEMENT ALÉATOIRE (APRÈS CRÉATION ACTEUR)
  // Ajout garanti d'une Armure, un Consommable, et un élément Tech.
  // ------------------------------------------------------------

  const allItems = game.items.contents;
console.log(allItems);

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

  ui.notifications.info(`✅ PNJ ${name} (${profileName}) créé.`);
}

// ====================================================================
// EXÉCUTION
// ====================================================================

generateNPC();