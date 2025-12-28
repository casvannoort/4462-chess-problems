// Dutch motivational quotes for children
const SUCCESS_QUOTES = [
  "🎉 Super gedaan!",
  "⭐ Wat een slimmerik!",
  "🏆 Geweldig! Je bent een kampioen!",
  "🚀 Wauw, dat was snel!",
  "👏 Fantastisch gespeeld!",
  "🌟 Je wordt steeds beter!",
  "💪 Knap hoor!",
  "🎯 Precies goed!",
  "✨ Briljant!",
  "🦁 Jij bent een echte schaakkoning!",
  "🎊 Hoera! Goed gedaan!",
  "🌈 Magnifiek!",
  "🏅 Je bent een ster!",
  "👑 Koninklijke zet!",
  "🎮 Level up!",
];

const MISTAKE_QUOTES = [
  "🤔 Bijna! Probeer het nog eens!",
  "💭 Denk nog even na...",
  "🔍 Kijk nog eens goed!",
  "🧩 Dat was niet helemaal goed, maar je kunt het!",
  "🌱 Van fouten leer je!",
  "💪 Niet opgeven! Je kunt het!",
  "🎯 Net niet, probeer opnieuw!",
  "🤓 Hmm, welke zet geeft schaakmat?",
  "🌟 Je bent er bijna!",
  "🔄 Nog een keer proberen!",
  "🧠 Gebruik je slimme hoofd!",
  "🎪 Oeps! Nog een poging!",
];

function getRandomQuote(isSuccess) {
  const quotes = isSuccess ? SUCCESS_QUOTES : MISTAKE_QUOTES;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export { SUCCESS_QUOTES, MISTAKE_QUOTES, getRandomQuote };
