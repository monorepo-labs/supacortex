const CITY_NAMES = [
  "Tokyo", "Lisbon", "Oslo", "Cairo", "Seoul",
  "Milan", "Kyoto", "Zurich", "Lima", "Hanoi",
  "Porto", "Tbilisi", "Cusco", "Bruges", "Tallinn",
  "Bergen", "Fez", "Lucerne", "Jaipur", "Krakow",
  "Split", "Ghent", "Baku", "Busan", "Malaga",
  "Riga", "Plovdiv", "Chiang Mai", "Dubrovnik", "Kandy",
];

export function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 55%, 55%)`;
}

export function randomGroupName() {
  return CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
}
