import h from "@macrostrat/hyper";
import CesiumView from "./main";
import Map from "@macrostrat/map-panel";

function App() {
  const style = "mapbox://styles/jczaplewski/cjftzyqhh8o5l2rqu4k68soub";
  const accessToken = process.env.MAPBOX_API_TOKEN;
  return h("div.map-container", [
    h("div.cesium-panel", [h(CesiumView, { style, accessToken })]),
    h(Map, {
      style,
      accessToken,
    }),
  ]);
}

export default App;
