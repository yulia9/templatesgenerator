import "../styles/main.scss";

let css = require("../styles/main.scss");

console.log(css);

function getCss() {
  let style = document.querySelector("style");
  let css = style.innerHTML;

  console.log(css);
}

window.getCss = getCss;
