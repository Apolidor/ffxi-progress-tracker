
const EQUIPMENT_SETS = [
  { id: "af", name: "Artifact Armor (AF)", max: 4 },
  { id: "relic", name: "Relic Armor", max: 4 },
  { id: "empyrean", name: "Empyrean Armor", max: 3 }
];

const EQUIPMENT_SLOTS = [
  { id: "head", name: "Head", icon: "🪖" },
  { id: "body", name: "Body", icon: "🥋" },
  { id: "hands", name: "Hands", icon: "🧤" },
  { id: "legs", name: "Legs", icon: "👖" },
  { id: "feet", name: "Feet", icon: "🥾" }
];

const EQUIPMENT_STAGES = [
  { id: "none", label: "Not obtained" },
  { id: "109", label: "Item Level 109" },
  { id: "119+1", label: "Item Level 119 +1" },
  { id: "119+2", label: "Item Level 119 +2" },
  { id: "119+3", label: "Item Level 119 +3" },
  { id: "119+4", label: "Item Level 119 +4" }
];

const EQUIPMENT_ITEMS = {
  WAR: {
    af: {
      head: {
        name: "Pummeler's Mask",
        iconId: 27663,
        iconIds: {
          "109": 27663,
          "119+1": 27684,
          "119+2": 23040,
          "119+3": 23375,
          "119+4": 23895,
        }
      },
      body: { name: "Pummeler's Lorica", iconId: 27807 },
      hands: { name: "Pummeler's Mufflers", iconId: 27943 },
      legs: { name: "Pummeler's Cuisses", iconId: null },
      feet: { name: "Pummeler's Calligae", iconId: 28223 }
    },
    relic: {
      head: { name: "Agoge Mask", iconId: 26624 },
      body: { name: "Agoge Lorica", iconId: 26800 },
      hands: { name: "Agoge Mufflers", iconId: 26976 },
      legs: { name: "Agoge Cuisses", iconId: null },
      feet: { name: "Agoge Calligae", iconId: null }
    },
    empyrean: {
      head: { name: "Boii Mask", iconId: 26740 },
      body: { name: "Boii Lorica", iconId: null },
      hands: { name: "Boii Mufflers", iconId: 27052 },
      legs: { name: "Boii Cuisses", iconId: 27237 },
      feet: { name: "Boii Calligae", iconId: 27411 }
    }
  }
};

function getEquipmentItemName(jobCode, setId, slotId) {
  const item = EQUIPMENT_ITEMS[jobCode]?.[setId]?.[slotId];

  return typeof item === "string"
    ? item
    : item?.name ||
      EQUIPMENT_SLOTS.find(slot => slot.id === slotId)?.name ||
      slotId;
}

function getEquipmentIconId(jobCode, setId, slotId, stageId) {
  const item = EQUIPMENT_ITEMS[jobCode]?.[setId]?.[slotId];

  if (!item || typeof item !== "object") return null;

  return item.iconIds?.[stageId] ?? item.iconId ?? null;
}
