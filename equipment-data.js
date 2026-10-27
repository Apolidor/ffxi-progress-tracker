
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
  { id: "base", label: "Base version" },
  { id: "109", label: "Item Level 109" },
  { id: "119", label: "Item Level 119" },
  { id: "119+1", label: "Item Level 119 +1" },
  { id: "119+2", label: "Item Level 119 +2" },
  { id: "119+3", label: "Item Level 119 +3" },
  { id: "119+4", label: "Item Level 119 +4" }
];

// Verified item names currently entered for Warrior.
// Missing entries use the slot name until more item data is added.
const EQUIPMENT_ITEMS = {
  WAR: {
    af: {
      head: "Pummeler's Mask",
      body: "Pummeler's Lorica",
      hands: "Pummeler's Mufflers",
      legs: "Pummeler's Cuisses",
      feet: "Pummeler's Calligae"
    },
    relic: {
      head: "Agoge Mask",
      body: "Agoge Lorica",
      hands: "Agoge Mufflers",
      legs: "Agoge Cuisses",
      feet: "Agoge Calligae"
    },
    empyrean: {
      head: "Boii Mask",
      body: "Boii Lorica",
      hands: "Boii Mufflers",
      legs: "Boii Cuisses",
      feet: "Boii Calligae"
    }
  }
};

function getEquipmentItemName(jobCode, setId, slotId) {
  return EQUIPMENT_ITEMS[jobCode]?.[setId]?.[slotId]
    || EQUIPMENT_SLOTS.find(slot => slot.id === slotId)?.name
    || slotId;
}
