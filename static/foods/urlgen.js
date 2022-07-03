FRUITS = "🍌 🧁 🍕 🍳 🍊 🍓 🍪 🍆 🍷 🍟 🥒 🍈".split(" ");
console.log(
  FRUITS.map((x) =>
    [...new TextEncoder("utf8").encode(x)].map((v) => v.toString(2))
  )
    .map(
      (v) =>
        v[0].slice(5) +
        v
          .slice(1)
          .map((v) => v.slice(2))
          .join("")
    )
    .map((v) => parseInt(v, 2).toString(16))
    .map(
      (v) =>
        `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u${v}.svg`
    )
    .join("\n")
);
