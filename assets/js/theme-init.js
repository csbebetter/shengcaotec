window.DEFAULT_THEME = "dark";

document.documentElement.dataset.theme =
  localStorage.getItem("theme") || window.DEFAULT_THEME;
