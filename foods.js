const FOODS = Object.values(import.meta.globEager("./static/foods/*.svg")).map(
  (v) => v.default
);

function randomFoods() {
  const foods = FOODS.slice();
  foods.sort(() => (Math.random() > 0.5 ? 1 : -1));
  return foods;
}

function createFood() {
  const fruitContainer = document.createElement("aside");
  fruitContainer.classList.add("food");
  const foods = randomFoods();
  foods.push(...randomFoods());
  foods.forEach((food) => {
    const img = document.createElement("img");
    img.src = food;
    fruitContainer.append(img);
  });
  return fruitContainer;
}
["left", "right"].forEach((dir) => {
  const c = createFood();
  c.classList.add(dir);
  document.body.append(c);
});
