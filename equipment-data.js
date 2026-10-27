const EQUIPMENT_ITEMS = {
  WAR: {
    af: {
      head: { name: "Pummeler's Mask", iconId: 27663 },
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
    : item?.name
      || EQUIPMENT_SLOTS.find(slot => slot.id === slotId)?.name
      || slotId;
}

function getEquipmentIconId(jobCode, setId, slotId) {
  const item = EQUIPMENT_ITEMS[jobCode]?.[setId]?.[slotId];

  return typeof item === "object" ? item.iconId : null;
}
