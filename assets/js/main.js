const printButton = document.querySelector("[data-print-cv]");

if (printButton) {
  printButton.addEventListener("click", () => {
    window.print();
  });
}
