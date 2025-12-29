// Chess/Minecraft themed quotes
const SUCCESS_QUOTES = [
  "Schaakmat! +100 XP",
  "Achievement unlocked!",
  "Critical hit! GG",
  "Je hebt een Emerald verdiend!",
  "Legendary move!",
  "Victory Royale!",
  "Boss defeated!",
  "Level complete!",
  "Diamanten zet!",
  "Je bent een Grandmaster!",
  "Ender Dragon verslagen!",
  "Checkmate! Epic win!",
  "Je schaak-skill is nu level 99!",
  "Rare drop: Gouden Koning!",
  "Quest complete!",
];

const MISTAKE_QUOTES = [
  "Creeper? Aww man...",
  "Respawn en probeer opnieuw!",
  "Je hebt nog 2 hearts!",
  "Oops! Wrong move!",
  "De Koning is in gevaar!",
  "Probeer een andere zet!",
  "Miss! Try again!",
  "Game not over yet!",
  "Kijk uit voor de tegenstander!",
  "Hmm, welke zet wint?",
  "Nog een poging!",
  "Denk als een Redstone engineer!",
];

function getRandomQuote(isSuccess) {
  const quotes = isSuccess ? SUCCESS_QUOTES : MISTAKE_QUOTES;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export { SUCCESS_QUOTES, MISTAKE_QUOTES, getRandomQuote };
