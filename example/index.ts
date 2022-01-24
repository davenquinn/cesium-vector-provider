import "core-js/stable";
import "regenerator-runtime/runtime";
import "./main.css";
import "cesiumSource/Widgets/widgets.css";
import { render } from "react-dom";
import h from "@macrostrat/hyper";
import App from "./app";

const main = document.createElement("div");
main.className = "main";
document.body.appendChild(main);

render(h(App), main);

document.title = "Macrostrat Digital Globe";
