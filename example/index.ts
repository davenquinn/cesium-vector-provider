import "core-js/stable";
import "regenerator-runtime/runtime";
import "./main.css";
import "cesiumSource/Widgets/widgets.css";
import { render } from "react-dom";
import h from "@macrostrat/hyper";
import CesiumView from "./main";

const main = document.createElement("div");
main.className = "main";
document.body.appendChild(main);

render(h(CesiumView), main);

document.title = "Macrostrat Digital Globe";
