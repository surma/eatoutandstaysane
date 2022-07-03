import styles from "./animation.module.css";

export function nextEvent(el, name) {
  return new Promise((resolve) => {
    el.addEventListener(name, function f(ev) {
      if (ev.target !== el) return;
      el.removeEventListener(name, f);
      resolve();
    });
  });
}

export async function fadeOut(el, { remove = false } = {}) {
  el.classList.add(styles.fadeOut);
  await nextEvent(el, "animationend");
  el.classList.remove(styles.fadeOut);
  if (remove) el.remove();
}

export async function fadeIn(el) {
  el.classList.add(styles.fadeIn);
  await nextEvent(el, "animationend");
  el.classList.remove(styles.fadeIn);
}

export async function fromTop(el, { padding = "0px" } = {}) {
  el.classList.add(styles.fromTop);
  el.style.setProperty("--extra", padding);
  await nextEvent(el, "animationend");
  el.classList.remove(styles.fromTop);
}
